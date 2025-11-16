#!/usr/bin/env bash
set -euo pipefail

cd /opt/quiz-maker || exit 1

if command -v docker >/dev/null 2>&1; then
  if [ -f "infra/docker-compose.yml" ]; then
    docker compose -f infra/docker-compose.yml --env-file infra/docker.env down || true
  fi
fi






