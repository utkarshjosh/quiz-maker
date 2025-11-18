#!/usr/bin/env bash
set -euo pipefail

cd /opt/quiz-maker || exit 1

docker compose -f infra/docker-compose.yml --env-file infra/docker.env pull







