import type { PgBoss } from "pg-boss";
import { getDb } from "../../system/db.js";
import type { BusinessData } from "../../types/db.js";

/**
 * 场景1：拉取今天的数据，转成定时任务
 */
export async function startSchedulerWorker(boss: PgBoss) {
  const db = getDb();

  await boss.work("scheduler-queue", async (jobs) => {
    const job = jobs[0];
    if (!job) return;

    try {
      // 查询今天需要处理的数据
      const todayData = await db`
        SELECT id, name, date, status, created_at, updated_at
        FROM business_data
        WHERE date = CURRENT_DATE
          AND status = 'pending'
      ` as BusinessData[];

      console.log(`Found ${todayData.length} items for today`);

      // 转成定时任务
      for (const item of todayData) {
        const jobId = await boss.send("process-queue", {
          businessId: item.id,
          name: item.name,
          data: item,
        });

        console.log(`Created job ${jobId} for business ${item.id}`);
      }
    } catch (error) {
      console.error("Scheduler worker error:", error);
      throw error; // 让 PgBoss 重试
    }
  });
}

