import { createServer } from "net";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 检查端口是否被占用
 * @param port 要检查的端口号
 * @returns Promise<boolean> true 表示端口可用，false 表示端口被占用
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.once("close", () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        // 其他错误也视为端口不可用
        resolve(false);
      }
    });
  });
}

/**
 * 获取占用指定端口的进程信息（Windows系统）
 * @param port 端口号
 * @returns Promise<string | null> 进程信息字符串，如果无法获取则返回 null
 */
export async function getPortProcessInfo(port: number): Promise<string | null> {
  try {
    // Windows 系统：使用 netstat 查找占用端口的 PID
    const { stdout: netstatOutput } = await execAsync(
      `netstat -ano | findstr :${port}`
    );
    
    if (!netstatOutput.trim()) {
      return null;
    }
    
    // 提取 PID（最后一列）
    const lines = netstatOutput.trim().split("\n");
    const pids = new Set<string>();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0" && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    }
    
    if (pids.size === 0) {
      return null;
    }
    
    // 使用 tasklist 获取进程详细信息
    const processInfos: string[] = [];
    for (const pid of pids) {
      try {
        const { stdout: tasklistOutput } = await execAsync(
          `tasklist /FI "PID eq ${pid}" /FO CSV /NH`
        );
        
        if (tasklistOutput.trim()) {
          // CSV 格式：映像名称,PID,会话名,会话#,内存使用
          const parts = tasklistOutput.trim().split(",");
          if (parts.length >= 2 && parts[0]) {
            const processName = parts[0].replace(/"/g, "");
            const memory = parts.length >= 5 && parts[4] ? parts[4].replace(/"/g, "") : "未知";
            processInfos.push(`PID ${pid}: ${processName} (内存: ${memory})`);
          }
        }
      } catch {
        processInfos.push(`PID ${pid}: 无法获取详细信息`);
      }
    }
    
    return processInfos.length > 0 ? processInfos.join(", ") : null;
  } catch (error) {
    // 如果命令执行失败，返回 null（不影响主要功能）
    return null;
  }
}

/**
 * 查找下一个可用的端口
 * @param startPort 起始端口号
 * @param maxPort 最大端口号，默认 65535（系统最大端口号）
 * @returns Promise<number> 可用的端口号
 * @throws Error 如果找不到可用端口（包含进程信息）
 */
export async function findAvailablePort(
  startPort: number,
  maxPort: number = 65535
): Promise<number> {
  // 确保起始端口不超过最大端口
  if (startPort > maxPort) {
    throw new Error(`起始端口 ${startPort} 超过了最大端口号 ${maxPort}`);
  }
  
  // 从起始端口开始，一直查找到最大端口
  for (let port = startPort; port <= maxPort; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  
  // 如果所有端口都被占用，获取第一个端口的进程信息作为参考
  const processInfo = await getPortProcessInfo(startPort);
  let errorMessage = `在 ${startPort} 到 ${maxPort} 范围内找不到可用端口。`;
  
  if (processInfo) {
    errorMessage += `\n示例：端口 ${startPort} 被以下进程占用：${processInfo}`;
  }
  
  errorMessage += `\n请使用环境变量 PORT 指定其他端口，或关闭占用端口的进程。`;
  
  throw new Error(errorMessage);
}

/**
 * 检查端口占用情况，如果被占用则抛出错误（包含进程信息）
 * @param port 要检查的端口号
 * @throws Error 如果端口被占用
 */
export async function ensurePortAvailable(port: number): Promise<void> {
  const available = await isPortAvailable(port);
  if (!available) {
    // 尝试获取占用端口的进程信息
    const processInfo = await getPortProcessInfo(port);
    
    let errorMessage = `端口 ${port} 已被占用。`;
    
    if (processInfo) {
      errorMessage += `\n占用该端口的进程：${processInfo}`;
    }
    
    errorMessage += `\n请使用环境变量 PORT 指定其他端口，或关闭占用该端口的进程。`;
    
    throw new Error(errorMessage);
  }
}

