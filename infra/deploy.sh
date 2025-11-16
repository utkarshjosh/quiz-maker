#!/bin/bash
# Deployment script for EC2
# Location: ~/quiz-app/deploy.sh
# This script will be called by SSM with environment variables passed as arguments

set -e

# Parse arguments (passed from SSM)
AWS_REGION="${1:-ap-south-1}"
ECR_REGISTRY="${2}"
AWS_ACCOUNT_ID="${3}"

# Validate required parameters
if [ -z "$ECR_REGISTRY" ] || [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: Missing required parameters"
  echo "Usage: $0 <AWS_REGION> <ECR_REGISTRY> <AWS_ACCOUNT_ID>"
  exit 1
fi

echo "=== Deployment Started ==="
echo "User: $(whoami)"
echo "Home: $HOME"
echo "AWS Region: $AWS_REGION"
echo "ECR Registry: $ECR_REGISTRY"

# Set environment variables
export AWS_REGION
export ECR_REGISTRY
export AWS_ACCOUNT_ID

# Navigate to app directory
APP_DIR="$HOME/quiz-app"
echo "App directory: $APP_DIR"

if [ ! -d "$APP_DIR" ]; then
  echo "Creating app directory..."
  mkdir -p "$APP_DIR/infra"
fi

cd "$APP_DIR/infra"

# Login to ECR
echo "=== Logging into ECR ==="
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Pull latest images
echo "=== Pulling Latest Images ==="
docker pull "$ECR_REGISTRY/quiz-api:latest" || { echo "Failed to pull API image"; exit 1; }
docker pull "$ECR_REGISTRY/quiz-socket:latest" || { echo "Failed to pull Socket image"; exit 1; }
docker pull "$ECR_REGISTRY/quiz-frontend:latest" || { echo "Failed to pull Frontend image"; exit 1; }

# Stop existing containers
echo "=== Stopping Existing Containers ==="
docker-compose down 2>/dev/null || echo "No existing containers to stop"

# Start new containers
echo "=== Starting New Containers ==="
docker-compose up -d

# Wait for services
echo "=== Waiting for Services to Start ==="
sleep 15

# Show status
echo "=== Container Status ==="
docker-compose ps

# Clean up old images
echo "=== Cleaning Up Old Images ==="
docker image prune -f

# Show recent logs
echo "=== Recent Container Logs ==="
docker-compose logs --tail=30

echo "=== Deployment Complete ==="