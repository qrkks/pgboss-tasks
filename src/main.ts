import {init} from "./system/init.js";
import {createQueues} from "./queues/index.js";
import {startWorkers} from "./workers/index.js";

async function main() {
  const boss = await init();
  console.info("PgBoss initialized successfully");

  await createQueues(boss);
  console.info("Queues created successfully");

  await startWorkers(boss);
  console.info("Workers started successfully");
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
