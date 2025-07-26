/**
 * Backend logging utility for AWS Lambda functions
 * Reduces CloudWatch log output in production environments
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  function?: string;
  userId?: string;
  requestId?: string;
  operation?: string;
  [key: string]: any;
}

class BackendLogger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;
  private amplifyEnv: string;

  constructor() {
    // Determine environment from Amplify environment variables
    this.amplifyEnv = process.env.AMPLIFY_ENV || 'dev';
    this.isDevelopment = this.amplifyEnv === 'dev' || 
                        this.amplifyEnv === 'development' ||
                        process.env.NODE_ENV === 'development';

    // Set log level based on environment
    const envLogLevel = process.env.LOG_LEVEL || (this.isProduction() ? 'error' : 'info');
    this.logLevel = envLogLevel as LogLevel;
  }

  private isProduction(): boolean {
    return this.amplifyEnv === 'prod' || 
           this.amplifyEnv === 'production' ||
           process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction()) {
      // In production, only log warnings and errors by default
      return level === 'warn' || level === 'error';
    }
    
    // In development, log based on configured level
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
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formatted = `[${timestamp}] ${levelStr} ${message}`;
    
    if (context) {
      // In production, sanitize sensitive data
      const sanitizedContext = this.isProduction() ? this.sanitizeContext(context) : context;
      const contextStr = Object.entries(sanitizedContext)
        .map(([key, value]) => `${key}=${this.safeStringify(value)}`)
        .join(' ');
      formatted += ` | ${contextStr}`;
    }
    
    return formatted;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {};
    
    // Only include safe fields in production
    const safeFields = ['component', 'function', 'operation', 'requestId', 'userId', 'retryCount', 'duration'];
    
    for (const [key, value] of Object.entries(context)) {
      if (safeFields.includes(key)) {
        sanitized[key] = value;
      } else if (key === 'error' && typeof value === 'string') {
        // Include error messages but not full stack traces in production
        sanitized[key] = value.split('\n')[0]; // First line only
      }
    }
    
    return sanitized;
  }

  private safeStringify(value: any): string {
    try {
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      return JSON.stringify(value);
    } catch {
      return '[unstringifiable]';
    }
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
        ...(this.isDevelopment && error.stack ? { stack: error.stack } : {})
      } : context;
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // Convenience methods for Lambda functions
  lambdaStart(functionName: string, event: any): void {
    this.info(`Lambda function started`, { 
      component: 'lambda', 
      function: functionName,
      ...(this.isDevelopment ? { eventType: typeof event } : {})
    });
  }

  lambdaEnd(functionName: string, duration: number): void {
    this.info(`Lambda function completed`, { 
      component: 'lambda', 
      function: functionName,
      duration 
    });
  }

  aiRequest(operation: string, context?: LogContext): void {
    this.info(`AI request: ${operation}`, { component: 'ai', operation, ...context });
  }

  aiResponse(operation: string, duration: number, context?: LogContext): void {
    this.info(`AI response: ${operation}`, { component: 'ai', operation, duration, ...context });
  }

  apiCall(method: string, url: string, status?: number, context?: LogContext): void {
    this.debug(`API ${method} ${url} ${status || ''}`, { component: 'api', method, ...context });
  }

  // Development-only logging
  devOnly(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`[DEV] ${message}`, data);
    }
  }
}

// Create singleton instance
export const backendLogger = new BackendLogger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => backendLogger.debug(message, context),
  info: (message: string, context?: LogContext) => backendLogger.info(message, context),
  warn: (message: string, context?: LogContext) => backendLogger.warn(message, context),
  error: (message: string, error?: Error | any, context?: LogContext) => backendLogger.error(message, error, context),
  devOnly: (message: string, data?: any) => backendLogger.devOnly(message, data),
  lambdaStart: (functionName: string, event: any) => backendLogger.lambdaStart(functionName, event),
  lambdaEnd: (functionName: string, duration: number) => backendLogger.lambdaEnd(functionName, duration),
  aiRequest: (operation: string, context?: LogContext) => backendLogger.aiRequest(operation, context),
  aiResponse: (operation: string, duration: number, context?: LogContext) => backendLogger.aiResponse(operation, duration, context),
  apiCall: (method: string, url: string, status?: number, context?: LogContext) => backendLogger.apiCall(method, url, status, context),
};

export default backendLogger; 