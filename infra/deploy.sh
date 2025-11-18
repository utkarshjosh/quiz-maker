#!/bin/bash
set -e

AWS_REGION="${1:-ap-south-1}"
ECR_REGISTRY="${2}"
AWS_ACCOUNT_ID="${3}"

if [ -z "$ECR_REGISTRY" ] || [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: Missing required parameters"
  exit 1
fi

echo "=== Deployment Started ==="
echo "Current user: $(whoami)"
echo "Current UID: $(id -u)"
echo "AWS Region: $AWS_REGION"

export AWS_REGION
export ECR_REGISTRY
export AWS_ACCOUNT_ID

# Force absolute path since HOME might be empty
if [ -d "/home/ubuntu/quiz-maker/infra" ]; then
  APP_DIR="/home/ubuntu/quiz-maker/infra"
elif [ -d "/home/ec2-user/quiz-maker/infra" ]; then
  APP_DIR="/home/ec2-user/quiz-maker/infra"
else
  echo "Error: Could not find quiz-maker/infra directory"
  echo "Checked: /home/ubuntu/quiz-maker/infra, /home/ec2-user/quiz-maker/infra"
  exit 1
fi

echo "App directory: $APP_DIR"
cd "$APP_DIR"

echo "=== Current directory ==="
pwd
ls -la

echo "=== Logging into ECR ==="
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "=== Pulling Latest Images ==="
docker pull "$ECR_REGISTRY/quiz-api:latest" || { echo "Failed to pull quiz-api"; exit 1; }
docker pull "$ECR_REGISTRY/quiz-socket:latest" || { echo "Failed to pull quiz-socket"; exit 1; }
docker pull "$ECR_REGISTRY/quiz-frontend:latest" || { echo "Failed to pull quiz-frontend"; exit 1; }

echo "=== Stopping Existing Containers ==="
docker-compose down 2>/dev/null || echo "No containers to stop"

echo "=== Starting New Containers ==="
docker-compose up -d

echo "=== Waiting for Services ==="
sleep 15

echo "=== Container Status ==="
docker-compose ps

echo "=== Cleaning Up ==="
docker image prune -f

echo "=== Recent Logs ==="
docker-compose logs --tail=30

echo "=== Deployment Complete ==="
EOF