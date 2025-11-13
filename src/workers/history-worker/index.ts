import type { PgBoss } from "pg-boss";
import { getDb } from "../../system/db.js";
import type { OperationHistoryInsert } from "../../types/db.js";

/**
 * 场景2：写操作历史给业务看
 */
export async function startHistoryWorker(boss: PgBoss) {
  const db = getDb();

  await boss.work("history-queue", async (jobs) => {
    const job = jobs[0];
    if (!job) return;

    try {
      // 类型安全的处理 job.data
      const jobData = job.data as Record<string, unknown> | string;
      
      // 确保 details 始终是字符串
      const detailsString: string = typeof jobData === "string" 
        ? jobData 
        : JSON.stringify(jobData);
      
      const historyData: OperationHistoryInsert = {
        job_id: job.id,
        action: (typeof jobData === "object" && jobData !== null && "action" in jobData 
          ? String(jobData.action) 
          : "unknown"),
        user_id: (typeof jobData === "object" && jobData !== null && "userId" in jobData
          ? Number(jobData.userId) || 0
          : 0),
        details: detailsString,
      };

      // 插入操作历史
      const inserted = await db`
        INSERT INTO operation_history (
          job_id,
          action,
          user_id,
          details,
          created_at
        ) VALUES (
          ${historyData.job_id},
          ${historyData.action},
          ${historyData.user_id},
          ${detailsString},
          NOW()
        )
        RETURNING id
      ` as Array<{ id: number }>;

      const historyId = inserted[0]?.id;
      if (historyId) {
        console.log(
          `History recorded: job ${job.id}, action ${historyData.action}, history_id ${historyId}`
        );
      }
    } catch (error) {
      console.error("History worker error:", error);
      throw error; // 让 PgBoss 重试
    }
  });
}

