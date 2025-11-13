import type { PgBoss } from "pg-boss";
import { initEmailSchedule } from "./email-schedule/index.js";

/**
 * 初始化所有定时任务
 * 定时任务会直接发送到相应的队列，由 workers 文件夹中的 worker 处理
 */
export async function initScheduledJobs(boss: PgBoss) {
  await initEmailSchedule(boss);
}

