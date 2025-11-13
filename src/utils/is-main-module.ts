import { fileURLToPath } from "url";
import { resolve, normalize } from "path";

/**
 * 检查指定模块是否是直接运行的主模块
 * 类似 Python 的 if __name__ == "__main__"
 * 
 * @param moduleUrl - 要检查的模块的 import.meta.url（通常是调用者的 import.meta.url）
 * @returns 如果是直接运行的文件，返回 true；如果作为模块被导入，返回 false
 */
export function isMainModule(moduleUrl?: string): boolean {
  // 如果没有传入 moduleUrl，尝试从调用栈获取
  const urlToCheck = moduleUrl || getCallerUrl();
  
  if (!urlToCheck || typeof urlToCheck !== 'string') {
    return false;
  }
  
  try {
    // 将 import.meta.url 转换为绝对路径
    const currentFile = fileURLToPath(urlToCheck);
    const currentPath = normalize(resolve(currentFile));
    
    // 检查 process.argv 中的所有参数，看是否有匹配的文件路径
    // 当使用 tsx/node 时，process.argv[1] 通常是实际的文件路径
    for (let i = 1; i < process.argv.length; i++) {
      const arg = process.argv[i];
      if (!arg) continue;
      
      // 跳过选项参数（以 - 或 -- 开头）
      if (arg.startsWith('-')) continue;
      
      try {
        // 解析并标准化路径（处理相对路径和路径分隔符差异）
        const argPath = normalize(resolve(arg));
        
        // 比较标准化后的绝对路径（不区分大小写，处理 Windows 路径）
        if (argPath.toLowerCase() === currentPath.toLowerCase()) {
          return true;
        }
      } catch (e) {
        // 如果路径解析失败，忽略
        continue;
      }
    }
    
    return false;
  } catch (error) {
    // 如果出错，返回 false（安全起见，不执行 main）
    return false;
  }
}

/**
 * 从调用栈获取调用者的文件 URL
 */
function getCallerUrl(): string | undefined {
  try {
    const stack = new Error().stack;
    if (!stack) return undefined;
    
    const lines = stack.split('\n');
    // 跳过前几行（Error、getCallerUrl、isMainModule）
    // 找到第一个不是 is-main-module.ts 的文件
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // 提取文件路径（格式：at ... (file:///path/to/file.ts:line:col) 或 at file:///path/to/file.ts:line:col）
      const match = line.match(/file:\/\/\/[^\s\)]+/);
      if (match && !match[0].includes('is-main-module')) {
        return match[0];
      }
    }
  } catch (e) {
    // 如果获取调用栈失败，返回 undefined
  }
  
  return undefined;
}


