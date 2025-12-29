import { Response, NextFunction } from 'express';
import { qrRequestSchema } from '../utils/validation';
import { generateQRCode } from '../services/qr.service';
import { HttpError } from '../middleware/errorHandler';
import logger from '../middleware/logger';
import { RequestWithId } from '../middleware/requestId';

export const generateQrController = async (req: RequestWithId, res: Response, next: NextFunction) => {
  try {
    const parseResult = qrRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn({
        operation: 'qr_validation_failed',
        requestId: req.requestId,
        errors: parseResult.error.flatten()
      }, 'QR request validation failed');
      throw new HttpError(400, 'Validation failed', parseResult.error.flatten());
    }
    
    logger.debug({
      operation: 'qr_request',
      requestId: req.requestId,
      data: parseResult.data.data.slice(0, 100), // truncate data for privacy
      format: parseResult.data.format,
      size: parseResult.data.size,
      hasLogo: !!parseResult.data.logo
    }, 'Processing QR generation request');
    
    const result = await generateQRCode(parseResult.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
