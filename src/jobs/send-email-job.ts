import {PgBoss} from "pg-boss";
import {init} from "../system/init.js";
import {createQueues} from "../queues/index.js";
import {isMainModule} from "../utils/is-main-module.js";

interface SendEmailJobData {
  email: string;
  subject: string;
  text: string;
}

export async function sendEmailJob(boss: PgBoss, data: SendEmailJobData) {
  const id = await boss.send("send-email-queue", data);
  console.log(`Created email job ${id} in queue send-email-queue`);
  return id;
}

// 只在直接运行此文件时执行（类似 Python 的 if __name__ == "__main__"）
if (isMainModule()) {
  async function main() {
    const boss = await init();

    // 发送邮件到指定邮箱
    await sendEmailJob(boss, {
      email: "34028312@qq.com",
      subject: "测试邮件",
      text: "这是一封测试邮件，来自 PgBoss 任务队列系统。",
    });

    await boss.stop();
  }

  main().catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
}
