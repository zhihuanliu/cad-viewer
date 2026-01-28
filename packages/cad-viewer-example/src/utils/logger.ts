/**
 * 日志工具类
 * 用于追踪标注功能的操作
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000 // 最多保存1000条日志

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    }

    this.logs.push(entry)
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 输出到控制台
    const consoleMethod = level === LogLevel.ERROR ? 'error' : 
                          level === LogLevel.WARN ? 'warn' : 
                          level === LogLevel.DEBUG ? 'debug' : 'log'
    
    console[consoleMethod](`[${level}] [${entry.timestamp}] ${message}`, data || '')
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data)
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 获取指定级别的日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = []
  }

  /**
   * 导出日志为JSON字符串
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// 导出单例
export const logger = new Logger()
