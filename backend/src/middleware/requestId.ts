import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface RequestWithId extends Request { requestId?: string }

function genId(len = 12) {
  return randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

export const requestIdMiddleware = (req: RequestWithId, _res: Response, next: NextFunction): void => {
  req.requestId = genId();
  next();
};
