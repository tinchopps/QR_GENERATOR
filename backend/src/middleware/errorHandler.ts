import { Response, NextFunction, Request } from 'express';
import logger from './logger';
import { RequestWithId } from './requestId';

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const httpErr = err instanceof HttpError ? err : undefined;
  const status = httpErr ? httpErr.status : 500;
  const message = httpErr ? httpErr.message : 'Internal Server Error';
  const details = httpErr?.details;
  const requestId = (req as RequestWithId).requestId;
  if (status === 500) {
    logger.error({ err, requestId }, 'Unhandled error');
  }
  res.status(status).json({ error: message, requestId, details });
};
