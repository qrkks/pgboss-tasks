# PgBoss Tasks

基于 PgBoss 的分布式任务队列系统，提供 HTTP API 接口和 Worker 处理能力。

## 功能特性

- ✅ 基于 PostgreSQL 的可靠任务队列
- ✅ HTTP API 接口，支持跨服务调用
- ✅ Worker 自动处理任务
- ✅ TypeScript 支持
- ✅ 容器化友好，支持独立部署
- ✅ 优雅关闭和错误处理

## 项目结构

```
src/
  ├── api/              # API 服务器
  │   ├── index.ts      # API 单独启动入口
  │   └── server.ts     # API 服务器实现
  ├── jobs/             # 任务发送函数（可选，用于命令行脚本）
  │   └── readme-job.ts
  ├── queues/           # 队列定义
  │   └── index.ts
  ├── system/           # 系统初始化
  │   └── init.ts       # PgBoss 初始化
  ├── workers/          # Worker 处理逻辑
  │   ├── index.ts
  │   └── readme-worker/
  │       └── index.ts
  ├── combined.ts       # 合并部署启动入口（推荐）
  └── main.ts           # Worker 单独启动入口
```

## 安装

```bash
# 安装依赖
pnpm install
```

## 配置

创建 `.env` 文件：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
PORT=3001  # API 服务器端口（可选，默认 3001）
```

## 使用方法

### 推荐：合并部署（初期）

同时运行 API 服务器和 Worker 服务（共享同一个 PgBoss 实例）：

```bash
pnpm dev
# 或
pnpm start
```

这会：
- 初始化 PgBoss 连接
- 创建队列
- 启动所有 Workers 监听队列
- 启动 API 服务器（默认端口 3001）

**优势：**
- 资源节省：共享同一个 boss 实例
- 部署简单：只需一个容器
- 适合初期和小规模应用

### 可选：分开部署（生产环境）

如果需要独立扩展，可以分开运行：

#### 1. 启动 Worker 服务

```bash
pnpm dev:worker
```

Worker 服务会：
- 初始化 PgBoss 连接
- 创建队列
- 启动所有 Workers 监听队列

#### 2. 启动 API 服务器

```bash
pnpm dev:api
```

API 服务器默认运行在 `http://localhost:3001`

## API 文档

### 健康检查

```http
GET /health
```

**响应：**
```json
{
  "status": "ok"
}
```

### 发送任务

```http
POST /api/jobs/readme
Content-Type: application/json

{
  "arg1": "read me",
  "arg2": "any data"
}
```

**响应：**
```json
{
  "success": true,
  "jobId": "job-id-here",
  "queue": "readme-queue"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "Error message"
}
```

## 开发指南

### 添加新队列

1. 在 `src/queues/index.ts` 中添加队列名称：

```typescript
export const queues = ["readme-queue", "new-queue"];
```

2. 在 Worker 启动时会自动创建所有队列

### 添加新 Worker

1. 创建 Worker 文件 `src/workers/new-worker/index.ts`：

```typescript
import { PgBoss } from "pg-boss";

export async function startNewWorker(boss: PgBoss) {
  await boss.work("new-queue", async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    
    // 处理任务逻辑
    console.log(`Processing job ${job.id}`, job.data);
  });
}
```

2. 在 `src/workers/index.ts` 中注册：

```typescript
import { startNewWorker } from "./new-worker/index.js";

export async function startWorkers(boss: PgBoss) {
  await startReadmeWorker(boss);
  await startNewWorker(boss);  // 添加新 Worker
}
```

### 添加新的 API 端点

在 `src/api/server.ts` 中添加新的路由：

```typescript
app.post("/api/jobs/new-job", async (c) => {
  try {
    const body = await c.req.json();
    const id = await boss.send("new-queue", body);
    
    return c.json({ 
      success: true, 
      jobId: id,
      queue: "new-queue"
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, 500);
  }
});
```

## 容器化部署

项目已包含优化的 Dockerfile 和 docker-compose.yml 文件。

### 快速开始

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### Dockerfile 特性

- ✅ **多阶段构建**：减小镜像大小
- ✅ **Alpine 基础镜像**：轻量级
- ✅ **健康检查**：自动监控服务状态
- ✅ **生产优化**：编译 TypeScript，只安装生产依赖

### Docker Compose 配置

项目包含完整的 `docker-compose.yml`，包括：

- 健康检查配置
- 服务依赖管理
- 资源限制
- 数据持久化

### 手动构建

```bash
# 构建镜像
docker build -t pgboss-tasks .

# 运行容器
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:password@host:5432/database \
  pgboss-tasks
```

### 从其他服务调用

在应用容器中调用 API：

```typescript
const response = await fetch('http://tasks-api:3001/api/jobs/readme', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ arg1: 'data' })
});

const result = await response.json();
```

## 架构说明

### 部署方案

#### 合并部署（推荐初期）

- **单一容器**：API 服务器和 Worker 服务运行在一起
- **共享资源**：共享同一个 PgBoss 实例，节省内存
- **简单部署**：只需一个容器，适合小规模应用

**适用场景：**
- 初期开发和小规模应用
- 请求量和任务处理量都不大
- 资源有限，需要节省成本

#### 分开部署（生产环境）

- **API 服务器**：接收 HTTP 请求，发送任务到队列
- **Worker 服务**：处理队列中的任务，执行具体业务逻辑

**适用场景：**
- 需要独立扩展 API 或 Worker
- 请求量和任务处理量差异大
- 需要高可用性和故障隔离

### 为什么可以合并？

1. **资源节省**：共享同一个 boss 实例，减少内存占用
2. **简单部署**：一个容器即可，降低运维复杂度
3. **初期足够**：小规模应用不需要独立扩展

### 什么时候需要分开？

1. **负载不均衡**：API 请求多但任务少，或反之
2. **需要独立扩展**：API 需要 10 个实例，Worker 只需要 2 个
3. **故障隔离**：需要 API 和 Worker 互不影响

## 技术栈

- [PgBoss](https://github.com/timgit/pg-boss) - PostgreSQL 任务队列
- [Hono](https://hono.dev/) - 轻量级 Web 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [tsx](https://github.com/esbuild-kit/tsx) - TypeScript 执行器

## License

ISC

