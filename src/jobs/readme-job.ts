import {PgBoss} from "pg-boss";
import {init} from "../system/init.js";
import {isMainModule} from "../utils/is-main-module.js";

export async function sendReadmeJob(boss: PgBoss) {
  const id = await boss.send("readme-queue", {arg1: "read me"});
  console.log(`created job ${id} in queue readme-queue`);
}

// 只在直接运行此文件时执行（类似 Python 的 if __name__ == "__main__"）
if (isMainModule(import.meta.url)) {
  async function main() {
    const boss = await init();
    await sendReadmeJob(boss);
    await boss.stop();
  }

  main().catch((err: Error) => {
    console.error(err);
    process.exit(1);
  });
}
