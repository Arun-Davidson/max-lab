import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import config from './index';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, requestId, ...meta } = info;
    let log = `${timestamp} [${level}]`;
    if (requestId) {
      log += ` [${requestId}]`;
    }
    log += `: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  }),
);

// Define transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: config.env === 'production' ? logFormat : consoleFormat,
  }),
);

// File transports (if enabled)
if (config.logging.fileEnabled) {
  // All logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.logging.dir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
  );

  // Error logs
  transports.push(
    new DailyRotateFile({
      level: 'error',
      filename: path.join(config.logging.dir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),
  );

  // HTTP logs
  transports.push(
    new DailyRotateFile({
      level: 'http',
      filename: path.join(config.logging.dir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
    }),
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
