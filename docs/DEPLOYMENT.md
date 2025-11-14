# 部署文档

## GitHub Actions CI/CD 部署指南

### 前置要求

#### 服务器端准备

1. **安装必要软件**
   ```bash
   # 安装 Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # 安装 docker-compose（或使用 Docker Compose 插件）
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   # 或者
   sudo apt-get install docker-compose
   
   # 安装 Git
   sudo apt-get install git
   ```

2. **配置 Docker 权限**
   ```bash
   # 将当前用户添加到 docker 组
   sudo usermod -aG docker $USER
   # 重新登录使权限生效
   ```

3. **克隆项目仓库**
   ```bash
   # 创建项目目录（如果使用默认路径）
   mkdir -p ~/pgboss-tasks
   cd ~/pgboss-tasks
   
   # 克隆仓库
   git clone <your-repository-url> .
   
   # 或者使用自定义路径
   git clone <your-repository-url> /opt/pgboss-tasks
   ```

4. **创建 .env 文件**
   ```bash
   cd ~/pgboss-tasks  # 或你的项目路径
   cp .env.example .env  # 如果有示例文件
   # 编辑 .env 文件，配置数据库连接等信息
   nano .env
   ```

5. **确保 SSH 密码登录已启用**
   ```bash
   # 检查 SSH 配置
   sudo nano /etc/ssh/sshd_config
   # 确保 PasswordAuthentication yes
   # 重启 SSH 服务
   sudo systemctl restart sshd
   ```

### GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加以下 Secrets：

#### 必需配置

1. **`SSH_HOST`**
   - 服务器 IP 地址或域名
   - 示例：`192.168.1.100` 或 `example.com`

2. **`SSH_USER`**
   - SSH 登录用户名
   - 示例：`root` 或 `ubuntu`

3. **`SSH_PASSWORD`**
   - SSH 登录密码
   - ⚠️ 注意：密码会加密存储，但建议后续改用 SSH 密钥

#### 可选配置

4. **`SSH_PORT`**
   - SSH 端口号
   - 默认：`22`
   - 如果使用默认端口可以不设置

5. **`SERVER_DEPLOY_PATH`**
   - 服务器上项目部署路径
   - 默认：`/home/$SSH_USER/pgboss-tasks`
   - 示例：如果 SSH_USER 是 `ubuntu`，默认路径为 `/home/ubuntu/pgboss-tasks`
   - 如果使用默认路径可以不设置

### 部署流程

#### 自动部署

1. **推送到 main/master 分支**
   - 推送到 `main` 或 `master` 分支时自动触发部署
   - GitHub Actions 会先验证构建，验证通过后自动部署

2. **手动触发部署**
   - 在 GitHub 仓库的 Actions 页面
   - 选择 "Deploy to Server" 工作流
   - 点击 "Run workflow" 手动触发

#### 部署步骤

1. **验证构建阶段**
   - 在 GitHub Actions 中构建 Docker 镜像
   - 验证代码能否成功编译
   - 如果构建失败，部署不会执行

2. **部署阶段**
   - 通过 SSH 连接到服务器
   - 拉取最新代码
   - 在服务器上构建 Docker 镜像
   - 重启服务
   - 验证部署成功

### 查看部署状态

1. **GitHub Actions 日志**
   - 在 GitHub 仓库的 Actions 页面查看部署日志
   - 可以看到完整的构建和部署过程

2. **服务器端检查**
   ```bash
   cd ~/pgboss-tasks  # 或你的项目路径
   
   # 查看服务状态
   docker-compose ps
   
   # 查看服务日志
   docker-compose logs -f tasks
   
   # 查看所有服务日志
   docker-compose logs -f
   ```

### 故障排查

#### 常见问题

1. **SSH 连接失败**
   - 检查 SSH_HOST、SSH_USER、SSH_PASSWORD 是否正确
   - 检查服务器 SSH 服务是否运行
   - 检查防火墙是否允许 SSH 连接

2. **Docker 权限错误**
   - 确保用户已添加到 docker 组
   - 重新登录使权限生效

3. **构建失败**
   - 查看 GitHub Actions 日志了解具体错误
   - 检查代码是否有语法错误
   - 检查依赖是否正确

4. **服务启动失败**
   - 检查 .env 文件配置是否正确
   - 查看服务日志：`docker-compose logs tasks`
   - 检查端口是否被占用

5. **健康检查失败**
   - 等待更长时间让服务完全启动
   - 检查服务日志查看错误信息
   - 手动测试健康检查端点

### 回滚

如果部署失败，可以手动回滚到之前的版本：

```bash
cd ~/pgboss-tasks  # 或你的项目路径

# 查看 Git 历史
git log --oneline

# 回滚到指定 commit
git reset --hard <commit-hash>

# 重新构建和启动
docker-compose build
docker-compose up -d
```

### 安全建议

1. **使用 SSH 密钥替代密码**
   - 更安全的方式是使用 SSH 密钥
   - 在 GitHub Secrets 中配置 `SSH_PRIVATE_KEY` 而不是 `SSH_PASSWORD`

2. **限制 SSH 访问**
   - 使用防火墙限制 SSH 访问来源
   - 禁用 root 用户 SSH 登录

3. **定期更新**
   - 定期更新服务器系统和 Docker
   - 定期更新项目依赖

### 监控和维护

1. **日志管理**
   - 定期清理 Docker 日志
   - 使用日志轮转工具

2. **资源监控**
   - 监控服务器 CPU、内存、磁盘使用情况
   - 监控 Docker 容器资源使用

3. **备份**
   - 定期备份数据库
   - 备份 .env 配置文件

