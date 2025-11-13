import {PgBoss} from "pg-boss";
import "dotenv/config";

export async function init(): Promise<PgBoss> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const boss: PgBoss = new PgBoss({
    connectionString: databaseUrl,
    schema: "test_schema",
  });

  boss.on("error", (error) => {
    console.error("PgBoss error:", error);
  });

  try {
    await boss.start();
  } catch (error) {
    console.error("PgBoss failed to start:", error);
    process.exit(1);
  }

  return boss;
}

