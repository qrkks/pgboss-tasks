import { init } from "./system/init.js";
import { createQueues } from "./queues/index.js";
import { startWorkers } from "./workers/index.js";
import { startApiServer } from "./api/server.js";

async function main() {
  // 初始化 PgBoss（共享实例）
  const boss = await init();
  console.info("PgBoss initialized successfully");

  // 创建队列
  await createQueues(boss);
  console.info("Queues created successfully");

  // 启动 Workers
  await startWorkers(boss);
  console.info("Workers started successfully");

  // 启动 API 服务器（共享同一个 boss 实例）
  const port = parseInt(process.env.PORT || "3001", 10);
  await startApiServer(boss, port);
  console.info("API server and Workers running together");

  // 优雅关闭
  const shutdown = async () => {
    console.info("Shutting down...");
    await boss.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

