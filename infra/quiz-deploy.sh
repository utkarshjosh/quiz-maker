
#!/bin/bash
set -e

AWS_REGION="${1:-ap-south-1}"
ECR_REGISTRY="${2}"
AWS_ACCOUNT_ID="${3}"

if [ -z "$ECR_REGISTRY" ] || [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 <AWS_REGION> <ECR_REGISTRY> <AWS_ACCOUNT_ID>"
  exit 1
fi

echo "=== Deployment Started ==="
echo "Current user: $(whoami)"
echo "AWS Region: $AWS_REGION"
echo "ECR Registry: $ECR_REGISTRY"

export AWS_REGION
export ECR_REGISTRY
export AWS_ACCOUNT_ID

# Define compose file and project directory
COMPOSE_DIR="/home/ubuntu/quiz-maker/infra"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.prod.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Error: docker-compose.prod.yml not found: $COMPOSE_FILE"
  exit 1
fi

echo "=== Logging into ECR ==="
# Use full path to aws and pipe properly
/usr/local/bin/aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "=== Pulling Latest Images ==="
docker pull "$ECR_REGISTRY/quiz-api:latest" || { echo "Failed to pull quiz-api"; exit 1; }
docker pull "$ECR_REGISTRY/quiz-socket:latest" || { echo "Failed to pull quiz-socket"; exit 1; }
docker pull "$ECR_REGISTRY/quiz-frontend:latest" || { echo "Failed to pull quiz-frontend"; exit 1; }

echo "=== Stopping Existing Containers ==="
docker-compose -f "$COMPOSE_FILE" --project-directory "$COMPOSE_DIR" down 2>/dev/null || echo "No containers to stop"

echo "=== Starting New Containers ==="
docker-compose -f "$COMPOSE_FILE" --project-directory "$COMPOSE_DIR" up -d

echo "=== Waiting for Services ==="
sleep 15

echo "=== Container Status ==="
docker-compose -f "$COMPOSE_FILE" --project-directory "$COMPOSE_DIR" ps

echo "=== Cleaning Up ==="
docker image prune -f

echo "=== Recent Logs ==="
docker-compose -f "$COMPOSE_FILE" --project-directory "$COMPOSE_DIR" logs --tail=30

echo "=== Deployment Complete ==="
