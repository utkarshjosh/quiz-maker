# Quiz Maker Infrastructure

This directory contains the Docker-based infrastructure used to run the Quiz Maker stack on a single EC2 instance. The goal is to keep the footprint minimal while still supporting separate public domains and AWS CodeDeploy deployments.

## Service Topology

| Service    | Image                                                   | Port | Domain                              | Notes                                                                            |
| ---------- | ------------------------------------------------------- | ---- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `postgres` | `postgres:15-alpine`                                    | 5432 | private                             | Primary relational store shared by API + realtime services                       |
| `api`      | built from `infra/Dockerfile.api`                       | 3000 | `https://quiz-api.utkarshjoshi.com` | Express + Prisma backend, exposes REST API and Auth routes                       |
| `socket`   | built from `infra/Dockerfile.socket`                    | 5000 | `wss://quiz-ws.utkarshjoshi.com`    | Go websocket service. Requires access to Postgres and an external Redis endpoint |
| `frontend` | built from `infra/Dockerfile.frontend` → `nginx:alpine` | 80   | `https://quiz.utkarshjoshi.com`     | Static Vite build served by Nginx with SPA routing                               |

All containers share the `quiz-network` bridge network so they can communicate using their service names (e.g. `postgres`, `api`).

## Environment Configuration

Shared defaults live in `infra/docker.env`. Copy this file if you need local overrides across the stack:

```bash
cp infra/docker.env infra/docker.env.local
```

Service-specific configuration is layered on top:

- `infra/api/.env` (+ `.env.local`): API-only values such as `PORT`
- `infra/frontend/.env` (+ `.env.local`): Web runtime values like `VITE_API_BASE_URL`
- `infra/socket/.env` (+ `.env.local`): WebSocket settings including `SERVER_ADDRESS` and Redis coordinates

The most important shared values are:

- **Postgres:** `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- **Service URLs:** `API_BASE_URL`, `FRONTEND_URL`, `SOCKET_URL`
- **Auth0:** `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`
- **Secrets:** `JWT_SECRET`

> **Tip:** When running `docker compose`, pass the env file via `--env-file` so shared values are available for interpolation; service definitions automatically load their layered env files.

## Running Locally

```bash
cd infra
docker compose --env-file docker.env up -d --build
```

Useful commands:

- `docker compose ps` – verify the four services are healthy
- `docker compose logs -f api` – stream API logs
- `docker compose down -v` – stop and remove containers + the Postgres volume

## Domain Routing Strategy

The containers listen on different host ports (`80`, `3000`, `5000`). To expose them under the requested domains on a single EC2 host:

1. Attach an Elastic IP to the instance.
2. Terminate TLS with a lightweight reverse proxy (Nginx, Caddy, or Traefik) either on the host or as an additional container.
3. Create three server blocks/virtual hosts that proxy requests to the corresponding container ports:
   - `quiz.utkarshjoshi.com` → `http://127.0.0.1:80`
   - `quiz-api.utkarshjoshi.com` → `http://127.0.0.1:3000`
   - `quiz-ws.utkarshjoshi.com` (websocket) → `http://127.0.0.1:5000`
4. Point the DNS `A` records for each domain to the EC2 instance.

If you prefer AWS-native routing, place an Application Load Balancer in front of the instance and forward path-based listeners to the exposed ports.

## AWS CodeDeploy Workflow (Single EC2)

1. **Prepare the Instance**
   - Install Docker and the Docker Compose plugin.
   - Install and register the CodeDeploy agent (`codedeploy-agent` service must be running).
   - Store a copy of `infra/docker.env` on the host (`/opt/quiz-maker/docker.env` recommended).

2. **Build & Push (CI/CD)**  
   In your CI pipeline:

   ```bash
   docker compose --env-file infra/docker.env build
   docker tag api <aws-account>.dkr.ecr.<region>.amazonaws.com/quiz-api:latest
   docker tag socket <aws-account>.dkr.ecr.<region>.amazonaws.com/quiz-socket:latest
   docker tag frontend <aws-account>.dkr.ecr.<region>.amazonaws.com/quiz-frontend:latest
   docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/quiz-api:latest
   # repeat for realtime + frontend
   ```

   (Postgres uses the public image so no push is required.)

3. **Create Deployment Artifact**  
   Package the following into a zip file for CodeDeploy:

   ```
   infra/
     docker-compose.yml
     docker.env      # optional stub; real secrets live on the instance
     scripts/
       before_install.sh
       after_install.sh
       application_start.sh
   appspec.yml
   ```

   Example `appspec.yml`:

   ```yaml
   version: 0.0
   os: linux
   files:
     - source: /
       destination: /opt/quiz-maker
   hooks:
     BeforeInstall:
       - location: infra/scripts/before_install.sh
     AfterInstall:
       - location: infra/scripts/after_install.sh
     ApplicationStart:
       - location: infra/scripts/application_start.sh
   ```

   Suggested hook script responsibilities:
   - `before_install.sh`: stop the running stack (`docker compose down`)
   - `after_install.sh`: pull latest images (`docker compose pull`)
   - `application_start.sh`: `docker compose --env-file docker.env up -d`

4. **Create CodeDeploy Application & Deployment Group**
   - Compute platform: **EC2/On-Premises**
   - Deployment type: **In-place**
   - Tag the target EC2 instance and associate it with the deployment group.

5. **Deploy**
   - Upload the artifact to S3 or GitHub.
   - Start a CodeDeploy deployment. The hooks will orchestrate the Compose lifecycle on the instance.

## Additional Notes & Risks

- The realtime websocket service still depends on Redis for room state; configure `REDIS_ADDRESS` to point at a managed Redis instance.
- Prisma migrations are **not** executed automatically. Run `docker compose exec api npx prisma migrate deploy` during deployments as required.
- For production traffic, enable HTTPS at the reverse proxy/load balancer layer and tighten security groups to expose only ports 80/443.
- Keep the `infra/docker.env` file out of version control and manage secrets through AWS Systems Manager Parameter Store or Secrets Manager for production deployments.
