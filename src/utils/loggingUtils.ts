/**
 * Logging utility for the Book Collection App
 * Provides configurable log levels and consistent logging functionality throughout the application
 */

// Log levels in order of increasing verbosity
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

// Default configuration
const DEFAULT_CONFIG = {
  level: LogLevel.INFO,
  enableConsole: true,
  prefix: '[BookApp]',
  enableTimestamp: true
};

// Global logging configuration
let logConfig = { ...DEFAULT_CONFIG };

/**
 * Configure the logging utility
 * @param config Partial configuration to override defaults
 */
export function configureLogging(config: Partial<typeof DEFAULT_CONFIG>): void {
  logConfig = { ...DEFAULT_CONFIG, ...config };
}

/**
 * Reset logging configuration to defaults
 */
export function resetLoggingConfig(): void {
  logConfig = { ...DEFAULT_CONFIG };
}

/**
 * Get the current logging configuration
 */
export function getLoggingConfig(): typeof DEFAULT_CONFIG {
  return { ...logConfig };
}

/**
 * Format the log message with timestamp and prefix if enabled
 */
function formatLogMessage(message: string): string {
  let formattedMessage = '';
  
  if (logConfig.enableTimestamp) {
    formattedMessage += `[${new Date().toISOString()}] `;
  }
  
  if (logConfig.prefix) {
    formattedMessage += `${logConfig.prefix} `;
  }
  
  formattedMessage += message;
  return formattedMessage;
}

/**
 * Log a message if the current log level is at least the specified level
 * @param level The log level of this message
 * @param message The message to log
 * @param args Optional arguments to include in the log
 */
export function log(level: LogLevel, message: string, ...args: any[]): void {
  if (!logConfig.enableConsole || level > logConfig.level) {
    return;
  }

  const formattedMessage = formatLogMessage(message);
  
  switch (level) {
    case LogLevel.ERROR:
      console.error(formattedMessage, ...args);
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage, ...args);
      break;
    case LogLevel.INFO:
      console.info(formattedMessage, ...args);
      break;
    case LogLevel.DEBUG:
    case LogLevel.TRACE:
      console.debug(formattedMessage, ...args);
      break;
  }
}

// Convenience methods for each log level
export function error(message: string, ...args: any[]): void {
  log(LogLevel.ERROR, message, ...args);
}

export function warn(message: string, ...args: any[]): void {
  log(LogLevel.WARN, message, ...args);
}

export function info(message: string, ...args: any[]): void {
  log(LogLevel.INFO, message, ...args);
}

export function debug(message: string, ...args: any[]): void {
  log(LogLevel.DEBUG, message, ...args);
}

export function trace(message: string, ...args: any[]): void {
  log(LogLevel.TRACE, message, ...args);
}

/**
 * Create a logger instance with a specific context
 * @param context The context for this logger (will be added to log prefix)
 */
export function createLogger(context: string) {
  const contextualPrefix = logConfig.prefix ? `${logConfig.prefix}:${context}` : `[${context}]`;
  
  const logger = {
    error: (message: string, ...args: any[]) => {
      if (LogLevel.ERROR <= logConfig.level && logConfig.enableConsole) {
        const formattedMessage = formatLogMessage(`[ERROR][${context}] ${message}`);
        console.error(formattedMessage, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (LogLevel.WARN <= logConfig.level && logConfig.enableConsole) {
        const formattedMessage = formatLogMessage(`[WARN][${context}] ${message}`);
        console.warn(formattedMessage, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (LogLevel.INFO <= logConfig.level && logConfig.enableConsole) {
        const formattedMessage = formatLogMessage(`[INFO][${context}] ${message}`);
        console.info(formattedMessage, ...args);
      }
    },
    debug: (message: string, ...args: any[]) => {
      if (LogLevel.DEBUG <= logConfig.level && logConfig.enableConsole) {
        const formattedMessage = formatLogMessage(`[DEBUG][${context}] ${message}`);
        console.debug(formattedMessage, ...args);
      }
    },
    trace: (message: string, ...args: any[]) => {
      if (LogLevel.TRACE <= logConfig.level && logConfig.enableConsole) {
        const formattedMessage = formatLogMessage(`[TRACE][${context}] ${message}`);
        console.debug(formattedMessage, ...args);
      }
    }
  };
  
  return logger;
}

// Default logger
export default {
  error,
  warn,
  info,
  debug,
  trace,
  configure: configureLogging,
  reset: resetLoggingConfig,
  getConfig: getLoggingConfig
};
