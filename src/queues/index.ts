import {PgBoss} from "pg-boss";

export const queues = ["readme-queue"];

export async function createQueues(boss: PgBoss) {
  for (const queue of queues) {
    await boss.createQueue(queue);
  }
}
