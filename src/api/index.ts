import { init } from "../system/init.js";
import { startApiServer } from "./server.js";
import { closeDb } from "../system/db.js";

const port = parseInt(process.env.PORT || "3001", 10);

async function main() {
  const boss = await init();
  await startApiServer(boss, port);

  // 优雅关闭
  const shutdown = async () => {
    console.info("Shutting down API server...");
    await closeDb();
    await boss.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Failed to start API server:", err);
  process.exit(1);
});

