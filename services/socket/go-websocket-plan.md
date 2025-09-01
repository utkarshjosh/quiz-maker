# Goal

Build a standalone Golang WebSocket service that powers real‑time quiz sessions ("QuizHosted Session") with minimal REST dependencies, integrates with the existing Node.js app and shared Postgres, and optionally uses Redis for caching/presence/fan‑out.

---

## Tech Choices

- **Language/Runtime:** Go 1.22+
- **WS library:** `nhooyr.io/websocket` (lightweight, context‑aware, HTTP/2 friendly) or `github.com/gorilla/websocket` (battle‑tested). *This plan uses nhooyr.*
- **Router/HTTP:** `chi` (small, fast) or stdlib `net/http`. *Use chi for middlewares.*
- **Serialization:** JSON for client messages; internal structs in Go; optional CBOR/MessagePack later.
- **Persistence:** Postgres (shared with Node). Use `pgx` and `sqlc` for type‑safe queries.
- **Cache & Pub/Sub:** Redis (presence, rate limits, room fan‑out, host failover). Use `go-redis` v9.
- **Background jobs/time:** `context` + server monotonic time; no cron needed.
- **Observability:** OpenTelemetry (metrics, traces) + structured logs (zerolog/slog). Prometheus scraping.
- **Config & secrets:** env vars via `viper` or stdlib; JWT public key(s) from Node.

---

## High‑Level Architecture

```
[Client (Web/App)]
   ↕︎ WebSocket (wss)
[Go WS Service]
   ├─ Gateway: auth handshake, rate limits, protocol upgrade
   ├─ SessionHub: rooms, members, presence, routing
   ├─ GameEngine: state machine (Lobby → Question → Reveal → Intermission → Done)
   ├─ Scoring: latency‑weighted scoring per question
   ├─ Persistence: write‑through to Postgres (events/snapshots); Redis for hot state
   ├─ PubSub: Redis channel per room for multi‑instance fan‑out
   └─ Admin API (minimal REST): /health, /rooms/:id/close, /rooms/:id/kick

[Postgres]  [Redis]
```

- **Single instance (MVP)**: in‑memory room state + Redis for PIN reservation + rate limits.
- **Horizontal scale**: consistent hashing of `room_id → instance`; or stateless nodes using Redis Pub/Sub & distributed locks (Redlock) for host election.

---

## Data Model (DB) — aligns with Prisma, adaptable once schema arrives

> Use your existing Prisma tables where possible; if unavailable, create the following. `sqlc` will generate Go types. Node can continue reading these.

**Tables**

- `users(id, handle, ...)` — already exists via Node.
- `quizzes(id, title, settings_json, created_by, ...)` — the quiz template.
- `quiz_rooms(id UUID, pin CHAR(6), host_user_id, quiz_id, status, settings_json, created_at, closed_at)`
- `quiz_room_members(id, room_id, user_id, joined_at, left_at, role ENUM('HOST','PLAYER'), kicked_by, kick_reason)`
- `quiz_questions(id, quiz_id, index, question_json)` — source of truth for questions.
- `quiz_answers(id, room_id, question_index, user_id, answer, answer_ms, score_delta, created_at)`
- `quiz_room_scores(room_id, user_id, score, last_update)` — snapshot per room for fast leaderboards.
- `events(id, room_id, user_id NULL, type, payload_json, created_at)` — optional audit/event‑sourcing.

**Indexes/Constraints**

- Unique `(pin)` with partial index on `status='OPEN'` for fast join by PIN.
- Unique `(room_id, user_id)` active membership.
- FK cascades from `quiz_rooms` to `quizzes` and members.

---

## Redis Keys (hot state)

- `room:{room_id}:presence` — Set of user IDs online.
- `room:{room_id}:state` — Hash/JSON: phase, current\_question\_idx, phase\_deadline\_ms, host\_id.
- `room:{room_id}:answers:{q}` — Hash user\_id → {answer, answer\_ms}.
- `pin:{PIN}` — String → room\_id (TTL = room lifetime or 2h).
- `lim:user:{user_id}` — Sliding window counters for anti‑spam.
- Pub/Sub Channels: `ws:room:{room_id}` for multi‑instance broadcast.

---

## Security & Auth

- **JWT verification**: Accept `Authorization: Bearer <JWT>` in WS query or header. Verify with Node’s public JWKS (RS256/ES256). Claims needed: `sub` (user\_id), `handle`, `roles`.
- **Room access rules**:
  - Join by `pin` or `room_id` if invited. Host is either the creator or explicitly transferred.
  - Host must be present; auto‑host‑transfer if host disconnects (configurable)-—prefer explicit handover.
- **Validation**: strict schema validation on every inbound message (use `go-playground/validator` or hand‑rolled checks).
- **Rate limits**: per‑user and per‑room action buckets in Redis (e.g., 10 msgs/sec, 3 join attempts/30s, 10 PIN guesses/hour).
- **Replay protection**: Reject duplicate client `msg_id`s within a short window.
- **Kicking & bans**: Host can kick (soft ban via `room:{id}:bans` with TTL). Enforce server‑side.
- **Transport security**: wss only in prod, CORS/Origin checks, 60s ping/pong keep‑alive.

---

## Protocol (Client ⇄ Server)

JSON messages with envelope:

```json
{
  "v": 1,
  "type": "join|create_room|start|question|answer|reveal|kick|leave|ping|pong|error|state|score|end",
  "msg_id": "uuid",
  "room_id": "uuid-optional",
  "data": { /* type‑specific */ }
}
```

**Key Flows**

1. **Create Room (Host)**

   - Client→Server `create_room {quiz_id, settings}`
   - Server: auth check → allocate `room_id`, generate 6‑digit `pin` (no leading zeros issue) → persist `quiz_rooms` → broadcast `state:lobby`.

2. **Join**

   - Client→Server `join {pin, display_name}`
   - Server: validate pin → add to members → broadcast `state:joined` roster update.

3. **Start**

   - Host→Server `start {}` → state to `QUESTION` idx=0.

4. **Question**

   - Server→All `question {index, body, options, deadline_ms}` (deadline is absolute server epoch ms).

5. **Answer**

   - Player→Server `answer {index, choice}`; server stamps `received_at_ms` and computes `answer_ms = deadline_ms - received_at_ms` (non‑negative, clamp to 0) for scoring.

6. **Reveal**

   - Server→All `reveal {index, correct_choice, per_user_stats[], leaderboard[]}` → optional `intermission` or next `question`.

7. **Kick**

   - Host→Server `kick {user_id, reason}` → enforce and broadcast.

8. **End**

   - Host or engine marks done → persist final scores.

**Errors**

```json
{"type":"error","data":{"code":"FORBIDDEN|RATE_LIMIT|VALIDATION|STATE|UNKNOWN","msg":"..."}}
```

---

## Game State Machine

```
LOBBY → QUESTION(i) → REVEAL(i) → [QUESTION(i+1)] … → END
              ↘ (timeout) ↗
```

- **Deadlines**: server computes `deadline_ms = now() + duration_ms`. Clients must treat server’s absolute timestamps as source of truth.
- **Late answers**: if `now() > deadline_ms`, reject with `STATE` error (or accept with zero score if you prefer).

---

## Scoring Model (Latency‑Weighted)

- Base points per question: `P_base` (e.g., 1000)
- If correct: `score = round(P_base * f(t))` where `t` is fraction of time used.
- Example `f(t) = max(0, 1 - t^α)` with `α ∈ [0.8,1.5]` for tuning.
  - Let `t = (answer_time_ms) / (question_duration_ms)` bounded to [0,1]. Faster answers → higher points.
- Add **streak bonus** as future extension.

---

## Concurrency & Consistency

- Per‑room goroutine owns state (mailbox pattern) — avoids locks; all room ops are messages to that goroutine.
- Cross‑instance: publish room events over Redis and have only the owning instance process mutations; others are read‑replicas for fan‑out.
- Use Postgres transactions for critical commits (room create, question advance, final scoreboard). Redis is cache, Postgres is truth.

---

## Pin & Room ID

- **Room ID**: UUIDv7.
- **PIN**: 6 digits, avoid easily guessable sequences (e.g., reject in a set, or generate uniformly). Reserve in Redis `SETNX pin:{PIN} room_id` with short TTL during creation, then persist.
- Brute‑force mitigation: rate‑limit `join` by IP/user; shadow‑ban excessive guessers.

---

## Minimal REST Endpoints (for Node/Admin)

- `POST /internal/rooms/:id/close` — authenticated with service token.
- `POST /internal/rooms/:id/kick` — optional, mirrors WS action.
- `GET /healthz`, `/readyz`, `/metrics` — for k8s/Prometheus.

---

## Directory Layout

```
ws-quiz/
  cmd/server/main.go
  internal/
    gateway/        # HTTP→WS upgrade, auth handshake, origin checks
    protocol/       # message schemas, validation
    hub/            # SessionHub, room registry, routing
    room/           # room goroutine, state machine, timers
    scoring/        # scoring funcs, tunables
    store/          # postgres repos (sqlc) + redis adapters
    auth/           # JWT, permissions
    admin/          # minimal REST admin handlers
    telemetry/      # logs, metrics, tracing
    config/         # config loading
  migrations/       # SQL (golang-migrate)
  sqlc.yaml         # generate typed repos
```

---

## Code Sketches

**WebSocket handler (simplified)**

```go
func (s *Server) wsHandler(w http.ResponseWriter, r *http.Request) {
  ctx := r.Context()
  user, err := s.auth.FromRequest(r)
  if err != nil { http.Error(w, "unauthorized", http.StatusUnauthorized); return }

  c, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: s.cfg.AllowedOrigins})
  if err != nil { return }
  defer c.Close(websocket.StatusNormalClosure, "bye")

  conn := gateway.NewConn(c, user)
  s.hub.Attach(conn)
  conn.Run(ctx) // read loop → validate → dispatch to room goroutine
}
```

**Room goroutine pattern**

```go
type Room struct {
  id uuid.UUID; host string; members map[string]*Member; state State; bus chan Msg
}

func (r *Room) run() {
  ticker := time.NewTicker(time.Second)
  for {
    select {
    case m := <-r.bus:
      r.handle(m)
    case <-ticker.C:
      r.tick()
    }
  }
}
```

**Advancing question**

```go
func (r *Room) startQuestion(i int) {
  dur := r.state.Settings.QuestionDuration
  deadline := time.Now().Add(dur)
  r.state.Phase = PhaseQuestion
  r.state.QIndex = i
  r.state.Deadline = deadline
  r.broadcast(protocol.Question{Index: i, DeadlineMS: deadline.UnixMilli(), Body: r.q[i]})
}
```

---

## Validations & Rules

- Schema validation per message: lengths, enums, numeric bounds.
- State guards: only host can `start`, `kick`, `next`, `end`.
- Anti‑cheat: server is time source; disregard client timestamps; throttle answer edits (first answer wins or allow updates until deadline — choose one).
- Disconnection: if a player disconnects mid‑question, allow rejoin; answers persist in Redis until reveal.
- Host disconnect: pause automatically (config) or transfer host to `cohosts` list.

---

## Observability & Monitoring

- Metrics: active\_rooms, connected\_clients, msg\_rate, dropped\_msgs, question\_duration, answer\_count, ws\_errors\_by\_code.
- Traces: join → question → answer → reveal path.
- Logs: structured with room\_id, user\_id, msg\_type; PII‑safe.
- Admin dashboard (future): lightweight SSE or read‑only WS to watch room state.

---

## Deployment

- Containerize with multi‑stage Dockerfile; run as non‑root; enable HTTP/2 and compression.
- K8s HPA on CPU & RPS; st