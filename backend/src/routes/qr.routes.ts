import { Router } from 'express';
import { generateQrController } from '../controllers/qr.controller';

const router = Router();
router.post('/', generateQrController);
export default router;
