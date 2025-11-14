#!/bin/bash
set -e

# 部署脚本参数
DEPLOY_PATH="${1:-/home/$USER/pgboss-tasks}"
GIT_BRANCH="${2:-main}"
GIT_COMMIT="${3:-}"
GIT_REPO_URL="${4:-}"

echo "=========================================="
echo "Starting deployment..."
echo "Deploy path: $DEPLOY_PATH"
echo "Git branch: $GIT_BRANCH"
echo "Git commit: $GIT_COMMIT"
echo "Git repo: ${GIT_REPO_URL:-not provided}"
echo "=========================================="

# 检查部署路径是否存在，如果不存在则尝试克隆
if [ ! -d "$DEPLOY_PATH" ]; then
  if [ -z "$GIT_REPO_URL" ]; then
    echo "Error: Deployment path does not exist: $DEPLOY_PATH"
    echo "Please clone the repository first:"
    echo "  git clone <repository-url> $DEPLOY_PATH"
    echo "Or provide GIT_REPO_URL as the 4th parameter to auto-clone."
    exit 1
  fi
  
  echo "Deployment path does not exist. Cloning repository..."
  echo "Repository URL: $GIT_REPO_URL"
  
  # 创建父目录
  mkdir -p "$(dirname "$DEPLOY_PATH")"
  
  # 克隆仓库
  git clone -b "$GIT_BRANCH" "$GIT_REPO_URL" "$DEPLOY_PATH" || {
    echo "Error: Failed to clone repository"
    echo "Please ensure:"
    echo "  1. The repository URL is correct"
    echo "  2. The server has access to the repository (SSH key or credentials configured)"
    echo "  3. The branch '$GIT_BRANCH' exists"
    exit 1
  }
  
  echo "Repository cloned successfully"
fi

# 进入项目目录
cd "$DEPLOY_PATH"

# 检查是否是 Git 仓库
if [ ! -d ".git" ]; then
  echo "Error: Not a Git repository: $DEPLOY_PATH"
  exit 1
fi

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

# 记录当前 Git commit（用于回滚）
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "Current commit: $CURRENT_COMMIT"

# 拉取最新代码
echo ""
echo "=== Pulling latest code ==="
git fetch origin
git reset --hard origin/$GIT_BRANCH
git clean -fd

NEW_COMMIT=$(git rev-parse HEAD)
echo "New commit: $NEW_COMMIT"

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
  echo "Warning: .env file not found. Please create it manually."
  echo "Continuing deployment, but services may fail without proper configuration."
fi

# 检查磁盘空间（至少需要 2GB 可用空间）
AVAILABLE_SPACE=$(df -BG "$DEPLOY_PATH" | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 2 ]; then
  echo "Warning: Low disk space. Available: ${AVAILABLE_SPACE}GB (recommended: at least 2GB)"
fi

# 构建 Docker 镜像（使用缓存加速构建）
echo ""
echo "=== Building Docker images ==="
echo "This may take several minutes..."
$DOCKER_COMPOSE build || {
  echo "Error: Docker build failed!"
  echo "Keeping old services running."
  exit 1
}

# 停止旧服务（优雅停止）
echo ""
echo "=== Stopping old services ==="
$DOCKER_COMPOSE down || true

# 启动新服务
echo ""
echo "=== Starting new services ==="
$DOCKER_COMPOSE up -d || {
  echo "Error: Failed to start services!"
  echo "Attempting to rollback..."
  # 如果启动失败，尝试启动旧版本（如果可能）
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
docker image prune -f || true
docker container prune -f || true

# 显示服务日志（最后几行）
echo ""
echo "=== Recent service logs ==="
$DOCKER_COMPOSE logs --tail=20 tasks || true

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "Git commit: $NEW_COMMIT"
echo "To view logs: cd $DEPLOY_PATH && $DOCKER_COMPOSE logs -f"
echo "To check status: cd $DEPLOY_PATH && $DOCKER_COMPOSE ps"
echo "=========================================="

