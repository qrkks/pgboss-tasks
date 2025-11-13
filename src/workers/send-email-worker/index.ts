import {PgBoss} from "pg-boss";
import {Resend} from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailJobData {
  email: string;
  subject: string;
  text: string;
}

async function sendEmail(email: string, subject: string, text: string) {
  const {data, error} = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: subject,
    text: text,
  });
  if (error) {
    console.error(error);
    throw new Error(error.message);
  }
  console.log(data);
  return data;
}

export async function startSendEmailWorker(boss: PgBoss) {
  await boss.work("send-email-queue", async (jobs) => {
    const job = jobs[0];
    if (!job) return;

    try {
      // 类型安全的处理 job.data
      const jobData = job.data as SendEmailJobData;

      // 数据验证
      if (!jobData?.email || !jobData?.subject || !jobData?.text) {
        throw new Error(
          `Missing required fields: email=${!!jobData?.email}, subject=${!!jobData?.subject}, text=${!!jobData?.text}`
        );
      }

      // 记录任务开始
      console.log(`Processing job ${job.id} with data ${JSON.stringify(jobData)}`);

      // 发送邮件
      await sendEmail(jobData.email, jobData.subject, jobData.text);

      // 记录成功
      console.log(`Successfully sent email for job ${job.id} to ${jobData.email}`);
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      throw error; // 让 PgBoss 重试
    }
  });
}
