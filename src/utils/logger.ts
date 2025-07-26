/**
 * Environment-aware logging utility
 * Reduces console output in production environments while maintaining full logging for development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  function?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isLocalhost: boolean;
  private logLevel: LogLevel;

  constructor() {
    // Determine environment - browser-only checks
    this.isDevelopment = import.meta.env?.DEV === true ||
                        import.meta.env?.VITE_APP_ENV === 'development' ||
                        import.meta.env?.MODE === 'development';
    
    this.isLocalhost = typeof window !== 'undefined' && 
                      (window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost'));

    // Set log level based on environment - browser-only
    const envLogLevel = import.meta.env?.VITE_LOG_LEVEL || 'info';
    this.logLevel = this.isProduction() ? 'error' : envLogLevel as LogLevel;
  }

  private isProduction(): boolean {
    return !this.isDevelopment && !this.isLocalhost;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction()) {
      // In production, only log errors by default
      return level === 'error';
    }
    
    // In development, log everything by default
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[level];

    let formatted = `${emoji} [${timestamp}] ${message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      formatted += ` | ${contextStr}`;
    }
    
    return formatted;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error ? { 
        ...context, 
        error: error.message || error,
        stack: error.stack 
      } : context;
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // Convenience methods for common patterns
  apiRequest(method: string, url: string, context?: LogContext): void {
    this.debug(`API ${method} ${url}`, { component: 'api', ...context });
  }

  userAction(action: string, userId?: string, context?: LogContext): void {
    this.info(`User action: ${action}`, { component: 'user', userId, ...context });
  }

  authEvent(event: string, context?: LogContext): void {
    this.info(`Auth event: ${event}`, { component: 'auth', ...context });
  }

  aiOperation(operation: string, context?: LogContext): void {
    this.info(`AI operation: ${operation}`, { component: 'ai', ...context });
  }

  // Development-only logging
  devOnly(message: string, data?: any): void {
    if (!this.isProduction()) {
      console.log(`🚧 DEV: ${message}`, data);
    }
  }

  // Production-safe user info (no sensitive data)
  userInfo(message: string, safeContext?: Record<string, string | number | boolean>): void {
    this.info(message, { component: 'user', ...safeContext });
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions for easy migration
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | any, context?: LogContext) => logger.error(message, error, context),
  devOnly: (message: string, data?: any) => logger.devOnly(message, data),
  userAction: (action: string, userId?: string, context?: LogContext) => logger.userAction(action, userId, context),
  authEvent: (event: string, context?: LogContext) => logger.authEvent(event, context),
  aiOperation: (operation: string, context?: LogContext) => logger.aiOperation(operation, context),
  apiRequest: (method: string, url: string, context?: LogContext) => logger.apiRequest(method, url, context),
};

export default logger; 