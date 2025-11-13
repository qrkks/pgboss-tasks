import {init} from "./system/init.js";
import {createQueues} from "./queues/index.js";
import {startWorkers} from "./workers/index.js";
import {initScheduledJobs} from "./schedules/index.js";
import { closeDb } from "./system/db.js";

async function main() {
  const boss = await init();
  console.info("PgBoss initialized successfully");

  await createQueues(boss);
  console.info("Queues created successfully");

  // 初始化定时任务
  await initScheduledJobs(boss);
  console.info("Scheduled jobs initialized successfully");

  await startWorkers(boss);
  console.info("Workers started successfully");

  // 优雅关闭
  const shutdown = async () => {
    console.info("Shutting down...");
    await closeDb();
    await boss.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
