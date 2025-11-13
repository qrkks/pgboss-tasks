import postgres from 'postgres';
import { getDatabaseUrl } from './init.js';

let dbClient: ReturnType<typeof postgres> | null = null;

/**
 * 获取数据库连接（单例模式）
 */
export function getDb() {
  if (!dbClient) {
    const databaseUrl = getDatabaseUrl();
    dbClient = postgres(databaseUrl, {
      // 连接配置
      max: 10, // 最大连接数
      idle_timeout: 20, // 空闲超时
    });
  }
  return dbClient;
}

/**
 * 关闭数据库连接（用于优雅关闭）
 */
export async function closeDb() {
  if (dbClient) {
    await dbClient.end();
    dbClient = null;
  }
}

