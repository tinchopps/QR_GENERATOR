import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const points = Number(process.env.RATE_LIMIT || 30);
const limiter = new RateLimiterMemory({ points, duration: 60 });

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
  await limiter.consume((req.ip || '') as string);
    next();
  } catch (_err) {
    res.status(429).json({ error: 'Too Many Requests' });
  }
};
