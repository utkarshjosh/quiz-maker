# 🧠 AI-Powered Real-Time Quiz System

## 🎯 Project Overview

A fullstack scalable AI-powered quiz generation and delivery platform with:

- Prompt-based AI quiz generation (multi-step, agentic, research-capable)
- Real-time quiz hosting using Golang WebSocket service
- Redis-based write-through caching
- MongoDB/Postgres for persistence
- Frontend in Vue.js or MERN

Main goals:

- **Speed of development**
- **Scalability**
- **Showcase backend + system design skills**

---

## 🧱 Architecture

### 🔧 Tech Stack

| Layer         | Tech                      | Purpose                                     |
| ------------- | ------------------------- | ------------------------------------------- |
| Frontend      | Vue.js / React (MERN)     | Quiz UI, prompt input, dashboards           |
| API Gateway   | Node.js (Express/Fastify) | Auth, routing, input validation             |
| AI Generator  | Node.js (OpenAI SDK)      | Quiz generation using prompt-to-agent chain |
| Realtime Quiz | Golang + WebSocket        | Host real-time quiz, broadcast questions    |
| Cache         | Redis (write-through)     | Store quiz state, player answers, rooms     |
| Database      | MongoDB / Postgres        | Persistent quiz, user, leaderboard storage  |

---

## 🗂️ Redis Usage Plan

### 🔐 Key Schema

- `quiz:<quizId>:questions` → List of questions
- `quiz:<quizId>:state` → Current state (question\_no, time\_left)
- `quiz:<quizId>:players` → Hash of player scores
- `player:<sessionId>:answers` → Hash of their responses

### 🧠 Write-through Caching

- Write to Redis first, then DB
- TTL for ephemeral states (quiz state, player sessions)
- Batch flush via Golang worker (every X sec or on quiz end)

### 📡 Pub/Sub

- `quiz_channel:<quizId>` → Broadcasting questions, scores

---

## 🛠️ Component Plans

### 1. Quiz Generator (Node.js)

- Input prompt from host → topic, difficulty, type
- Agent flow:
  1. Understand → Breakdown into subtopics
  2. Generate questions with options, correct answers, and explanations
  3. Validate and structure → Save in DB
- Notify frontend when quiz ready (poll or WS)

### 2. Realtime Quiz Service (Go)

- WebSocket connection per player
- Create and manage rooms
- Push questions every `X` seconds
- Collect answers → Write to Redis
- Score calculation → Store in Redis and flush
- Send leaderboard

### 3. Database Design (MongoDB)

```json
// quizzes
{
  "_id": "quizId",
  "title": "Linux Basics",
  "questions": [...],
  "createdBy": "userId",
  "tags": ["linux", "beginner"],
  "createdAt": ISODate
}

// answers
{
  "quizId": "...",
  "playerId": "...",
  "answers": [
    { "question": "...", "selected": "B", "correct": true }
  ],
  "score": 8,
  "completedAt": ISODate
}
```

---

## 🧪 Development Timeline (4–6 Weeks)

### 📅 Week 1: Foundation

-

### 📅 Week 2: Quiz Generation

-

### 📅 Week 3: Quiz Taker UI

-

### 📅 Week 4: Realtime Engine (Go)

-

### 📅 Week 5: Leaderboard + Polishing

-

### 📅 Week 6: Deployment & Polish

-

---

## 📚 Resources

### Redis Caching & Pub/Sub:

- [Redis Caching Patterns](https://redis.io/learn/howtos/solutions/caching-architecture/write-through)
- [AWS Redis Caching Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html)
- [Go + Redis Pub/Sub Tutorial](https://reliasoftware.com/blog/golang-pub-sub)

### Go + WebSocket:

- [Real-time WebSocket + Redis in Go](https://codezup.com/building-real-time-web-applications-with-golang-websockets-and-redis/)
- [StackOverflow: WebSocket + Redis handler](https://stackoverflow.com/questions/71097866/golang-redis-websocket-handler)

### AI Agentic Generation:

- [LangChain Agentic Planning](https://python.langchain.com/docs/expression_language/how_to/agents)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

---

## 🧭 Final Self-Checks

-

---

> This plan is optimized for a **developer portfolio project** that showcases:
>
> - Real-time systems in Go
> - Redis caching strategies
> - AI agentic flows
> - Fullstack orchestration

