/**
 * 检查当前模块是否是直接运行的主模块
 * 类似 Python 的 if __name__ == "__main__"
 * 
 * @returns 如果是直接运行的文件，返回 true；如果作为模块被导入，返回 false
 */
export function isMainModule(): boolean {
  if (typeof import.meta.url === 'undefined' || !process.argv[1]) {
    return false;
  }
  
  // 将 import.meta.url 转换为文件路径
  const currentFile = import.meta.url.replace('file://', '').replace(/\\/g, '/');
  const mainFile = process.argv[1].replace(/\\/g, '/');
  
  // 比较文件路径（不区分大小写，处理 Windows 路径）
  return currentFile.toLowerCase() === mainFile.toLowerCase();
}

