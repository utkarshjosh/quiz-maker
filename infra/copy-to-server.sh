#!/bin/bash
# Script to copy deployment files to EC2 instance
# Usage: ./copy-to-server.sh <EC2_HOST_OR_IP>
# Example: ./copy-to-server.sh ubuntu@ec2-xx-xx-xx-xx.ap-south-1.compute.amazonaws.com

if [ -z "$1" ]; then
  echo "Error: EC2 host required"
  echo "Usage: $0 <EC2_HOST>"
  echo "Example: $0 ubuntu@ec2-xx-xx-xx-xx.ap-south-1.compute.amazonaws.com"
  exit 1
fi

EC2_HOST="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Copying deployment files to $EC2_HOST ==="

# 1. Copy quiz-deploy.sh to /usr/local/bin/
echo "1. Copying quiz-deploy.sh to /usr/local/bin/..."
scp "$SCRIPT_DIR/quiz-deploy.sh" "$EC2_HOST:/tmp/quiz-deploy.sh"
ssh "$EC2_HOST" "sudo mv /tmp/quiz-deploy.sh /usr/local/bin/quiz-deploy.sh && sudo chmod +x /usr/local/bin/quiz-deploy.sh"
echo "✓ quiz-deploy.sh installed"

# 2. Create directory structure on server
echo "2. Creating directory structure..."
ssh "$EC2_HOST" "mkdir -p /home/ubuntu/quiz-maker/infra/{api,frontend,socket}"
echo "✓ Directory structure created"

# 3. Copy docker-compose.prod.yml
echo "3. Copying docker-compose.prod.yml..."
scp "$SCRIPT_DIR/docker-compose.prod.yml" "$EC2_HOST:/home/ubuntu/quiz-maker/infra/docker-compose.prod.yml"
echo "✓ docker-compose.prod.yml copied"

# 4. Copy docker.env (if it exists)
if [ -f "$SCRIPT_DIR/docker.env" ]; then
  echo "4. Copying docker.env..."
  scp "$SCRIPT_DIR/docker.env" "$EC2_HOST:/home/ubuntu/quiz-maker/infra/docker.env"
  echo "✓ docker.env copied"
else
  echo "⚠ docker.env not found - you'll need to create it on the server"
fi

# 5. Copy docker.env.local (if it exists, otherwise create empty)
if [ -f "$SCRIPT_DIR/docker.env.local" ]; then
  echo "5. Copying docker.env.local..."
  scp "$SCRIPT_DIR/docker.env.local" "$EC2_HOST:/home/ubuntu/quiz-maker/infra/docker.env.local"
  echo "✓ docker.env.local copied"
else
  echo "5. Creating empty docker.env.local..."
  ssh "$EC2_HOST" "touch /home/ubuntu/quiz-maker/infra/docker.env.local"
  echo "✓ docker.env.local created (empty)"
fi

# 6. Create .env files in subdirectories (if they don't exist on server)
echo "6. Creating .env files in subdirectories..."
ssh "$EC2_HOST" "
  touch /home/ubuntu/quiz-maker/infra/api/.env
  touch /home/ubuntu/quiz-maker/infra/api/.env.local
  touch /home/ubuntu/quiz-maker/infra/frontend/.env
  touch /home/ubuntu/quiz-maker/infra/frontend/.env.local
  touch /home/ubuntu/quiz-maker/infra/socket/.env
  touch /home/ubuntu/quiz-maker/infra/socket/.env.local
"
echo "✓ .env files created (empty - configure as needed)"

# 7. Set proper permissions
echo "7. Setting permissions..."
ssh "$EC2_HOST" "chmod 644 /home/ubuntu/quiz-maker/infra/docker-compose.prod.yml && chmod 600 /home/ubuntu/quiz-maker/infra/docker.env* /home/ubuntu/quiz-maker/infra/*/.env* 2>/dev/null || true"
echo "✓ Permissions set"

echo ""
echo "=== Copy Complete ==="
echo ""
echo "Next steps on the server:"
echo "1. Configure environment files:"
echo "   - /home/ubuntu/quiz-maker/infra/docker.env"
echo "   - /home/ubuntu/quiz-maker/infra/docker.env.local"
echo "   - /home/ubuntu/quiz-maker/infra/api/.env"
echo "   - /home/ubuntu/quiz-maker/infra/api/.env.local"
echo "   - /home/ubuntu/quiz-maker/infra/frontend/.env"
echo "   - /home/ubuntu/quiz-maker/infra/frontend/.env.local"
echo "   - /home/ubuntu/quiz-maker/infra/socket/.env"
echo "   - /home/ubuntu/quiz-maker/infra/socket/.env.local"
echo ""
echo "2. Test the deployment script:"
echo "   /usr/local/bin/quiz-deploy.sh <AWS_REGION> <ECR_REGISTRY> <AWS_ACCOUNT_ID>"

