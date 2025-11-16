import type { PgBoss } from "pg-boss";

interface SendEmailJobData {
  email: string;
  subject: string;
  text: string;
}

/**
 * 初始化邮件定时任务
 * 每天上午 9:58 和下午 2:58 发送邮件
 * 定时任务会直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
 */
export async function initEmailSchedule(boss: PgBoss) {
  // 记录当前时间，用于诊断
  const now = new Date();
  const nowStr = now.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  console.log(`[Email Schedule] Initializing at ${nowStr} (Asia/Shanghai)`);

  // 邮件发送的数据
  const emailData: SendEmailJobData = {
    email: "34028312@qq.com",
    subject: "定时邮件：该去抢云服务器了",
    text: "这是一封定时发送的邮件，来自 PgBoss 任务队列系统。提醒该去抢云服务器了。",
  };

  try {
    // 确保 send-email-queue 队列存在（应该已经在 queues/index.ts 中创建了）
    await boss.createQueue("send-email-queue");

    // 注意：PgBoss 的 schedule 方法在创建定时任务时，如果定时任务已存在（相同的队列名和 cron），
    // 可能会立即触发一次执行。为了避免启动时自动发送邮件，我们需要：
    // 1. 先尝试取消已存在的定时任务
    // 2. 或者使用环境变量控制是否在启动时创建定时任务
    
    // 方案：使用环境变量控制是否在启动时创建定时任务
    // 如果已经创建过，可以设置 SKIP_SCHEDULE_INIT=true 来跳过
    const skipInit = process.env.SKIP_SCHEDULE_INIT === "true";
    
    if (skipInit) {
      console.log("Skipping schedule initialization (SKIP_SCHEDULE_INIT=true)");
      return;
    }

    // 注意：PgBoss 的 schedule 方法签名是: schedule(queue, cron, data, options)
    // 如果同一个队列有多个 schedule，需要在 options 中指定唯一的 name 来区分它们
    // 否则后面的 schedule 可能会覆盖前面的（PgBoss 可能认为它们是同一个任务）
    // unschedule 方法也支持通过 name 来取消任务
    const morningScheduleName = "email-morning-9-58";
    const afternoonScheduleName = "email-afternoon-14-58";

    // 先尝试取消可能已存在的定时任务（避免重复创建）
    // unschedule 方法支持通过 name 来识别任务
    try {
      try {
        await (boss as any).unschedule(morningScheduleName);
        console.log(`[Email Schedule] Unscheduled existing morning email job`);
      } catch (e) {
        // 如果不存在或 API 不支持，忽略错误
      }

      try {
        await (boss as any).unschedule(afternoonScheduleName);
        console.log(`[Email Schedule] Unscheduled existing afternoon email job`);
      } catch (e) {
        // 如果不存在或 API 不支持，忽略错误
      }
    } catch (e) {
      // unschedule 方法可能不存在，忽略
      console.log("[Email Schedule] Note: unschedule method not available, continuing...");
    }

    // 上午 9:58 的定时任务
    // Cron 表达式: 分钟 小时 日 月 星期
    // '58 9 * * *' 表示每天 9:58
    // 直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
    let morningScheduleId;
    let morningScheduleSuccess = false;
    try {
      console.log(`[Email Schedule] Creating morning schedule (9:58 AM, Asia/Shanghai)...`);
      // 在 options 中指定 name 来区分不同的定时任务
      morningScheduleId = await (boss as any).schedule(
        "send-email-queue",
        "58 9 * * *", // 每天上午 9:58
        emailData,
        {
          tz: "Asia/Shanghai", // 使用中国时区
          name: morningScheduleName, // 指定唯一名称
        }
      );
      morningScheduleSuccess = true;
      console.log(`[Email Schedule] ✓ Morning schedule created successfully: ${morningScheduleId || "created"}`);
    } catch (e: any) {
      console.error(`[Email Schedule] ✗ Failed to create morning schedule: ${e?.message || e}`);
      throw e;
    }

    // 下午 2:58 的定时任务
    // '58 14 * * *' 表示每天 14:58
    // 直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
    let afternoonScheduleId;
    let afternoonScheduleSuccess = false;
    try {
      console.log(`[Email Schedule] Creating afternoon schedule (2:58 PM, Asia/Shanghai)...`);
      // 在 options 中指定 name 来区分不同的定时任务
      afternoonScheduleId = await (boss as any).schedule(
        "send-email-queue",
        "58 14 * * *", // 每天下午 2:58
        emailData,
        {
          tz: "Asia/Shanghai", // 使用中国时区
          name: afternoonScheduleName, // 指定唯一名称
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
    console.log(`[Email Schedule] Schedule initialization summary:`);
    console.log(`[Email Schedule]   Current time: ${nowStr} (Asia/Shanghai)`);
    console.log(`[Email Schedule]   Morning (9:58 AM): ${morningScheduleSuccess ? "✓ Created" : "✗ Failed"}`);
    console.log(`[Email Schedule]   Afternoon (2:58 PM): ${afternoonScheduleSuccess ? "✓ Created" : "✗ Failed"}`);
    console.log(`[Email Schedule] ========================================`);
    
    if (!morningScheduleSuccess || !afternoonScheduleSuccess) {
      throw new Error("Failed to create one or more scheduled jobs");
    }
    
    console.log("[Email Schedule] Email schedule initialized successfully");
  } catch (error) {
    console.error("Failed to initialize email schedule:", error);
    throw error;
  }
}

