#!/bin/bash
set -e

echo "=== Deployment Started ==="
echo "User: $(whoami)"
echo "Home: $HOME"

export AWS_REGION=${{ secrets.AWS_REGION }}
export ECR_REGISTRY=${{ env.ECR_REGISTRY }}

APP_DIR="$HOME/quiz-app"
echo "App directory: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
  echo "Creating app directory..."
  mkdir -p "$APP_DIR/infra"
fi

cd "$APP_DIR/infra"

export COMPOSE_FILE=docker-compose.prod.yml

echo "=== Logging into ECR ==="
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ECR_REGISTRY

echo "=== Pull latest images ==="
docker pull $ECR_REGISTRY/quiz-api:latest
docker pull $ECR_REGISTRY/quiz-socket:latest
docker pull $ECR_REGISTRY/quiz-frontend:latest

echo "=== Restart services ==="
docker-compose down || true
docker-compose up -d

sleep 15
docker-compose ps
docker image prune -f
docker-compose logs --tail=30

echo "=== Deployment Complete ==="
EOF