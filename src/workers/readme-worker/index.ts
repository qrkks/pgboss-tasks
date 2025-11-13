import {PgBoss} from "pg-boss";

export async function startReadmeWorker(boss: PgBoss) {
  await boss.work("readme-queue", async (jobs) => {
    const job = jobs[0];
    if (!job) return;
    console.log(`received job ${job.id} with data ${JSON.stringify(job.data)}`);
  });
}

