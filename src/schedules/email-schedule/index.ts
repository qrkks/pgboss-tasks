import type { PgBoss } from "pg-boss";

interface SendEmailJobData {
  email: string;
  subject: string;
  text: string;
}

const morningScheduleKey = "email-morning-9-58";
const afternoonScheduleKey = "email-afternoon-14-58";
const queueName = "send-email-queue";

/**
 * 取消注册邮件定时任务
 * 删除已存在的定时任务
 */
export async function unregisterEmailSchedule(boss: PgBoss) {
  console.log(`[Email Schedule] Unregistering email schedules...`);
  
  try {
    try {
      await (boss as any).unschedule(queueName, morningScheduleKey);
      console.log(`[Email Schedule] ✓ Unscheduled morning email job`);
    } catch (e: any) {
      if (e?.message?.includes("not found") || e?.code === "PGRST116") {
        console.log(`[Email Schedule] Morning job not found (may already be removed)`);
      } else {
        console.log(`[Email Schedule] Note: Could not unschedule morning job: ${e?.message || e}`);
      }
    }

    try {
      await (boss as any).unschedule(queueName, afternoonScheduleKey);
      console.log(`[Email Schedule] ✓ Unscheduled afternoon email job`);
    } catch (e: any) {
      if (e?.message?.includes("not found") || e?.code === "PGRST116") {
        console.log(`[Email Schedule] Afternoon job not found (may already be removed)`);
      } else {
        console.log(`[Email Schedule] Note: Could not unschedule afternoon job: ${e?.message || e}`);
      }
    }

    console.log(`[Email Schedule] Unregistration completed`);
  } catch (error) {
    console.error("Failed to unregister email schedule:", error);
    throw error;
  }
}

/**
 * 注册邮件定时任务
 * 每天上午 9:58 和下午 2:58 发送邮件
 * 定时任务会直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
 */
export async function registerEmailSchedule(boss: PgBoss) {
  // 记录当前时间，用于诊断
  const now = new Date();
  const nowStr = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  console.log(`[Email Schedule] Registering at ${nowStr} (Asia/Shanghai)`);

  // 邮件发送的数据
  const emailData: SendEmailJobData = {
    email: "34028312@qq.com",
    subject: "定时邮件：该去抢云服务器了",
    text: "这是一封定时发送的邮件，来自 PgBoss 任务队列系统。提醒该去抢云服务器了。",
  };

  try {
    // 确保 send-email-queue 队列存在（应该已经在 queues/index.ts 中创建了）
    await boss.createQueue(queueName);

    // 先尝试取消可能已存在的定时任务（避免重复创建）
    try {
      try {
        await (boss as any).unschedule(queueName, morningScheduleKey);
        console.log(`[Email Schedule] Removed existing morning email job before registration`);
      } catch (e) {
        // 如果不存在，忽略错误
      }

      try {
        await (boss as any).unschedule(queueName, afternoonScheduleKey);
        console.log(`[Email Schedule] Removed existing afternoon email job before registration`);
      } catch (e) {
        // 如果不存在，忽略错误
      }
    } catch (e) {
      // unschedule 方法可能不存在，忽略
      console.log("[Email Schedule] Note: unschedule method not available, continuing...");
    }

    // 上午 9:58 的定时任务
    // Cron 表达式: 分钟 小时 日 月 星期
    // '55 9 * * *' 表示每天 9:55（注意：实际是 9:58，但 cron 是 55）
    // 直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
    let morningScheduleId;
    let morningScheduleSuccess = false;
    try {
      console.log(`[Email Schedule] Creating morning schedule (9:58 AM, Asia/Shanghai)...`);
      // 在 options 中指定 key 来区分不同的定时任务
      // PgBoss 使用 (queue, key) 作为联合主键
      morningScheduleId = await (boss as any).schedule(
        queueName,
        "55 9 * * *", // 每天上午 9:58
        emailData,
        {
          tz: "Asia/Shanghai", // 使用中国时区
          key: morningScheduleKey, // 指定唯一 key（与 queue 一起构成联合主键）
        }
      );
      morningScheduleSuccess = true;
      console.log(`[Email Schedule] ✓ Morning schedule created successfully: ${morningScheduleId || "created"}`);
    } catch (e: any) {
      console.error(`[Email Schedule] ✗ Failed to create morning schedule: ${e?.message || e}`);
      throw e;
    }

    // 下午 2:58 的定时任务
    // '55 14 * * *' 表示每天 14:55（注意：实际是 14:58，但 cron 是 55）
    // 直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
    let afternoonScheduleId;
    let afternoonScheduleSuccess = false;
    try {
      console.log(`[Email Schedule] Creating afternoon schedule (2:58 PM, Asia/Shanghai)...`);
      // 在 options 中指定 key 来区分不同的定时任务
      // PgBoss 使用 (queue, key) 作为联合主键
      afternoonScheduleId = await (boss as any).schedule(
        queueName,
        "55 14 * * *", // 每天下午 2:58
        emailData,
        {
          tz: "Asia/Shanghai", // 使用中国时区
          key: afternoonScheduleKey, // 指定唯一 key（与 queue 一起构成联合主键）
        }
      );
      afternoonScheduleSuccess = true;
      console.log(`[Email Schedule] ✓ Afternoon schedule created successfully: ${afternoonScheduleId || "created"}`);
    } catch (e: any) {
      console.error(`[Email Schedule] ✗ Failed to create afternoon schedule: ${e?.message || e}`);
      throw e;
    }

    // 总结
    console.log(`[Email Schedule] ========================================`);
    console.log(`[Email Schedule] Schedule registration summary:`);
    console.log(`[Email Schedule]   Current time: ${nowStr} (Asia/Shanghai)`);
    console.log(`[Email Schedule]   Morning (9:58 AM): ${morningScheduleSuccess ? "✓ Created" : "✗ Failed"}`);
    console.log(`[Email Schedule]   Afternoon (2:58 PM): ${afternoonScheduleSuccess ? "✓ Created" : "✗ Failed"}`);
    console.log(`[Email Schedule] ========================================`);
    
    if (!morningScheduleSuccess || !afternoonScheduleSuccess) {
      throw new Error("Failed to create one or more scheduled jobs");
    }
    
    console.log("[Email Schedule] Email schedule registered successfully");
  } catch (error) {
    console.error("Failed to register email schedule:", error);
    throw error;
  }
}

/**
 * @deprecated 使用 registerEmailSchedule 和 unregisterEmailSchedule 代替
 * 为了向后兼容保留此函数
 */
export async function initEmailSchedule(boss: PgBoss) {
  await registerEmailSchedule(boss);
}

