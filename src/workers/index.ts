import {PgBoss} from "pg-boss";
import {startReadmeWorker} from "./readme-worker/index.js";

export async function startWorkers(boss: PgBoss) {
  await startReadmeWorker(boss);
}
