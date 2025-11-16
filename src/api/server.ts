import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { PgBoss } from "pg-boss";
import { findAvailablePort, isPortAvailable } from "../utils/check-port.js";

// 启动服务器
export async function startApiServer(boss: PgBoss, port: number = 3001) {
  // 检查端口是否被占用，如果被占用则自动尝试下一个可用端口
  const isAvailable = await isPortAvailable(port);
  let actualPort = port;
  
  if (!isAvailable) {
    console.warn(`端口 ${port} 已被占用，正在查找下一个可用端口...`);
    try {
      actualPort = await findAvailablePort(port);
      console.info(`已找到可用端口：${actualPort}，将使用此端口启动服务器`);
    } catch (error) {
      // 如果找不到可用端口，直接抛出 findAvailablePort 的错误（已包含进程信息）
      throw error;
    }
  }
  
  const app = new Hono();

  // 健康检查
  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  // 发送 readme job
  app.post("/api/jobs/readme", async (c) => {
    try {
      const body = await c.req.json();
      
      const id = await boss.send("readme-queue", body);
      
      return c.json({ 
        success: true, 
        jobId: id,
        queue: "readme-queue"
      });
    } catch (error) {
      console.error("Failed to send job:", error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, 500);
    }
  });

  // 发送邮件 job
  app.post("/api/jobs/send-email", async (c) => {
    try {
      const body = await c.req.json();
      
      // 验证必需字段
      if (!body.email || !body.subject || !body.text) {
        return c.json({ 
          success: false, 
          error: "Missing required fields: email, subject, text" 
        }, 400);
      }
      
      const id = await boss.send("send-email-queue", {
        email: body.email,
        subject: body.subject,
        text: body.text,
      });
      
      return c.json({ 
        success: true, 
        jobId: id,
        queue: "send-email-queue"
      });
    } catch (error) {
      console.error("Failed to send email job:", error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, 500);
    }
  });
  
  serve({
    fetch: app.fetch,
    port: actualPort,
  }, (info) => {
    if (actualPort !== port) {
      console.info(`API server started on http://localhost:${info.port} (原计划使用端口 ${port}，但该端口已被占用)`);
    } else {
      console.info(`API server started on http://localhost:${info.port}`);
    }
  });
  
  // 注意：优雅关闭由调用方处理，这里不处理 boss.stop()
}

