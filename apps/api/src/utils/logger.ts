import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

interface LogMeta {
  customer?: string;
  customer_email?: string;
  [key: string]: unknown;
}

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp, level, message, ...meta }) => {
    // Obfuscate PII in metadata stringified output
    const safeMeta = maskPii(meta as LogMeta);
    const metaStr = Object.keys(safeMeta).length ? ` ${JSON.stringify(safeMeta)}` : '';
    return `${timestamp as string} [${level}]: ${message as string}${metaStr}`;
  })
);

function maskPii(obj: LogMeta): LogMeta {
  if (!obj) return obj;
  const clone = { ...obj };
  // Mask email addresses
  if (clone.customer) {
    clone.customer = maskEmail(clone.customer);
  }
  if (clone.customer_email) {
    clone.customer_email = maskEmail(clone.customer_email);
  }
  return clone;
}

function maskEmail(email: string): string {
  if (typeof email !== 'string') return email;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name!.length <= 2) return `***@${domain}`;
  return `${name![0]}***${name![name!.length - 1]}@${domain}`;
}

const prodFormat = combine(
  timestamp(),
  winston.format((info) => {
    // Mask PII before passing to json formatter
    return maskPii(info as LogMeta) as winston.Logform.TransformableInfo;
  })(),
  json()
);

const logger = winston.createLogger({
  level: config.isDev ? 'debug' : 'info',
  format: config.isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(config.isProd
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  silent: config.isTest,
});

export default logger;
