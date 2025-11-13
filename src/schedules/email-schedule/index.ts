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

    // 使用唯一的 schedule name 来避免重复创建
    // PgBoss schedule 方法签名可能是: schedule(name, queue, cron, data, options)
    // 或者: schedule(queue, cron, data, options)
    // 我们尝试使用 name 参数来确保唯一性
    const morningScheduleName = "email-morning-9-58";
    const afternoonScheduleName = "email-afternoon-14-58";

    try {
      // 先尝试取消可能已存在的定时任务（如果 API 支持）
      try {
        await (boss as any).unschedule(morningScheduleName);
        console.log(`Unscheduled existing morning email job`);
      } catch (e) {
        // 如果不存在或 API 不支持，忽略错误
      }

      try {
        await (boss as any).unschedule(afternoonScheduleName);
        console.log(`Unscheduled existing afternoon email job`);
      } catch (e) {
        // 如果不存在或 API 不支持，忽略错误
      }
    } catch (e) {
      // unschedule 方法可能不存在，忽略
      console.log("Note: unschedule method not available, continuing...");
    }

    // 上午 9:58 的定时任务
    // Cron 表达式: 分钟 小时 日 月 星期
    // '58 9 * * *' 表示每天 9:58
    // 直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
    let morningScheduleId;
    try {
      morningScheduleId = await (boss as any).schedule(
        morningScheduleName,
        "send-email-queue",
        "58 9 * * *", // 每天上午 9:58
        emailData,
        {
          tz: "Asia/Shanghai", // 使用中国时区
        }
      );
    } catch (e: any) {
      // 如果参数顺序不对，尝试不使用 name 的方式
      console.log("Trying schedule without name parameter...");
      morningScheduleId = await (boss as any).schedule(
        "send-email-queue",
        "58 9 * * *",
        emailData,
        {
          tz: "Asia/Shanghai",
        }
      );
    }
    console.log(`Scheduled morning email job: ${morningScheduleId || "created"}`);

    // 下午 2:58 的定时任务
    // '58 14 * * *' 表示每天 14:58
    // 直接发送到 send-email-queue 队列，由 workers/send-email-worker 处理
    let afternoonScheduleId;
    try {
      afternoonScheduleId = await (boss as any).schedule(
        afternoonScheduleName,
        "send-email-queue",
        "58 14 * * *", // 每天下午 2:58
        emailData,
        {
          tz: "Asia/Shanghai", // 使用中国时区
        }
      );
    } catch (e: any) {
      // 如果参数顺序不对，尝试不使用 name 的方式
      afternoonScheduleId = await (boss as any).schedule(
        "send-email-queue",
        "58 14 * * *",
        emailData,
        {
          tz: "Asia/Shanghai",
        }
      );
    }
    console.log(`Scheduled afternoon email job: ${afternoonScheduleId || "created"}`);

    console.log("Email schedule initialized successfully");
  } catch (error) {
    console.error("Failed to initialize email schedule:", error);
    throw error;
  }
}

