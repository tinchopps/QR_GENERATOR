import { Response, NextFunction } from 'express';
import { RequestWithId } from './requestId';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const loggerMiddleware = (req: RequestWithId, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
  requestId: req.requestId
    });
  });
  next();
};

export default logger;
