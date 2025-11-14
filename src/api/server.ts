import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { PgBoss } from "pg-boss";

// 启动服务器
export async function startApiServer(boss: PgBoss, port: number = 3001) {
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
    port,
  }, (info) => {
    console.info(`API server started on http://localhost:${info.port}`);
  });
  
  // 注意：优雅关闭由调用方处理，这里不处理 boss.stop()
}

