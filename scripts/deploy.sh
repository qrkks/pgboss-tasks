#!/bin/bash
set -e

# 部署脚本参数
DEPLOY_PATH="${1:-/home/$USER/pgboss-tasks}"
GIT_COMMIT="${2:-}"

echo "=========================================="
echo "Starting deployment..."
echo "Deploy path: $DEPLOY_PATH"
echo "Git commit: $GIT_COMMIT"
echo "=========================================="

# 检查部署路径是否存在
if [ ! -d "$DEPLOY_PATH" ]; then
  echo "Error: Deployment path does not exist: $DEPLOY_PATH"
  exit 1
fi

# 进入项目目录
cd "$DEPLOY_PATH"

# 检查 Docker 和 docker-compose 是否安装
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo "Error: docker-compose is not installed"
  exit 1
fi

# 使用 docker compose 或 docker-compose
if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

# 检查是否有权限执行 docker 命令
if ! docker ps &> /dev/null; then
  echo "Error: Cannot execute docker commands. You may need to add user to docker group:"
  echo "  sudo usermod -aG docker $USER"
  echo "  Then logout and login again"
  exit 1
fi

# 检查 docker-compose.yml 是否存在
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found in $DEPLOY_PATH"
  exit 1
fi

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
  echo "Warning: .env file not found. Please create it manually."
  echo "Continuing deployment, but services may fail without proper configuration."
fi

# 检查磁盘空间（至少需要 1GB 可用空间）
AVAILABLE_SPACE=$(df -BG "$DEPLOY_PATH" | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 1 ]; then
  echo "Warning: Low disk space. Available: ${AVAILABLE_SPACE}GB (recommended: at least 1GB)"
fi

# 加载 Docker 镜像
echo ""
echo "=== Loading Docker image ==="
if [ -f "/tmp/pgboss-tasks-image.tar.gz" ]; then
  echo "Loading image from /tmp/pgboss-tasks-image.tar.gz..."
  docker load < /tmp/pgboss-tasks-image.tar.gz || {
    echo "Error: Failed to load Docker image!"
    exit 1
  }
  echo "Image loaded successfully"
  
  # 清理压缩的镜像文件
  rm -f /tmp/pgboss-tasks-image.tar.gz
else
  echo "Warning: Image file not found. Using existing image if available."
fi

# 停止旧服务（优雅停止）
echo ""
echo "=== Stopping old services ==="
$DOCKER_COMPOSE down || true

# 清理旧镜像（可选，节省空间）
echo ""
echo "=== Cleaning up old images ==="
docker image prune -f || true

# 启动新服务
echo ""
echo "=== Starting new services ==="
$DOCKER_COMPOSE up -d || {
  echo "Error: Failed to start services!"
  echo "Please check the logs: $DOCKER_COMPOSE logs"
  exit 1
}

# 等待服务启动
echo ""
echo "=== Waiting for services to start ==="
sleep 10

# 检查服务状态
echo ""
echo "=== Service status ==="
$DOCKER_COMPOSE ps

# 清理未使用的 Docker 资源
echo ""
echo "=== Cleaning up unused Docker resources ==="
docker container prune -f || true

# 显示服务日志（最后几行）
echo ""
echo "=== Recent service logs ==="
$DOCKER_COMPOSE logs --tail=20 tasks || true

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "Git commit: $GIT_COMMIT"
echo "To view logs: cd $DEPLOY_PATH && $DOCKER_COMPOSE logs -f"
echo "To check status: cd $DEPLOY_PATH && $DOCKER_COMPOSE ps"
echo "=========================================="
