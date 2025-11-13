import {PgBoss} from "pg-boss";
import {init} from "../system/init.js";

export async function sendReadmeJob(boss: PgBoss) {
  const id = await boss.send("readme-queue", {arg1: "read me"});
  console.log(`created job ${id} in queue readme-queue`);
}

async function main() {
  const boss = await init();
  await sendReadmeJob(boss);
  await boss.stop();
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
