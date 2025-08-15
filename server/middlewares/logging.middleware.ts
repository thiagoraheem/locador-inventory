// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

const SENSITIVE_FIELDS = ['password', 'email'];

function maskSensitive(value: any): any {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) =>
        SENSITIVE_FIELDS.includes(key.toLowerCase())
          ? [key, '***']
          : [key, maskSensitive(val)]
      ),
    );
  }
  return value;
}

const detailedLogs =
  process.env.DETAILED_LOGS === 'true' || process.env.DETAILED_LOGS === '1';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  if (detailedLogs) {
    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any[]) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    } as any;
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${res.statusCode} ${req.method} ${path} in ${duration}ms`;

      if (detailedLogs) {
        const payload = maskSensitive({
          request: req.body,
          response: capturedJsonResponse,
        });
        logLine += ` :: ${JSON.stringify(payload)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
}

