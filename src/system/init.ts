import {PgBoss} from "pg-boss";
import "dotenv/config";

export function getDatabaseUrl(): string {
  // 如果直接提供了 DATABASE_URL，优先使用
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // 否则从 POSTGRES_* 环境变量组合生成
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;

  if (!host || !port || !user || !password || !database) {
    throw new Error("数据库连接信息未配置");
  }

  // URL 编码密码（处理特殊字符）
  const encodedPassword = encodeURIComponent(password);
  const encodedUser = encodeURIComponent(user);
  const encodedDatabase = encodeURIComponent(database);

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
}

export async function init(): Promise<PgBoss> {
  const databaseUrl = getDatabaseUrl();
  const boss: PgBoss = new PgBoss({
    connectionString: databaseUrl,
    schema: "test_schema",
  });

  // PgBoss 继承自 EventEmitter，但类型定义可能不完整，使用类型断言
  (boss as any).on("error", (error: Error) => {
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
