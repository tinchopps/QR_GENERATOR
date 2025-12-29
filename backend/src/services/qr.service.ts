// @ts-ignore - ambient types not available for qrcode in this setup
import QRCode from 'qrcode';
import crypto from 'crypto';
import sharp from 'sharp';
import { QrRequest } from '../utils/validation';
import logger from '../middleware/logger';

interface GenerateResult {
  mimeType: string;
  data: string; // base64
  meta: { size: number; format: 'png' | 'svg'; hash: string; ecc: 'L' | 'M' | 'Q' | 'H' };
}

export async function generateQRCode(params: QrRequest): Promise<GenerateResult> {
  const startTime = Date.now();
  const { data, format, size = 256, colorDark = '#000000', colorLight = '#ffffff', errorCorrection = 'M', logo, logoScale = 0.2 } = params;

  const ecc = logo ? 'H' : errorCorrection; // force H when logo present
  const hasLogo = !!logo;

  if (format === 'svg') {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      color: { dark: colorDark, light: colorLight },
      errorCorrection: ecc
    });
    // Logo embedding in SVG (simple <image> center) if logo is base64 SVG or PNG
    let finalSvg = svg;
    if (logo) {
      const encoded = logo.startsWith('data:') ? logo : `data:image/png;base64,${logo}`;
      // naive center placement: compute module size by viewBox (assuming 0 0 size size)
      const patch = `<image href="${encoded}" x="${size * (0.5 - logoScale / 2)}" y="${size * (0.5 - logoScale / 2)}" width="${size * logoScale}" height="${size * logoScale}" preserveAspectRatio="xMidYMid meet" />`;
      finalSvg = finalSvg.replace('</svg>', `${patch}</svg>`);
    }
    const hash = crypto.createHash('sha256').update(finalSvg).digest('hex').slice(0, 16);
    const duration = Date.now() - startTime;
    
    logger.info({
      operation: 'qr_generation',
      format,
      size,
      dataLength: data.length,
      hasLogo,
      logoScale: hasLogo ? logoScale : undefined,
      ecc,
      eccForced: hasLogo && errorCorrection !== 'H',
      hash,
      outputSize: Buffer.from(finalSvg).length,
      duration
    }, 'QR code generated (SVG)');
    
  return { mimeType: 'image/svg+xml', data: Buffer.from(finalSvg).toString('base64'), meta: { size, format, hash, ecc } };
  } else {
    const buffer = await QRCode.toBuffer(data, {
      color: { dark: colorDark, light: colorLight },
      errorCorrection: ecc,
      width: size
    });
    let composite = buffer;
    if (logo) {
      try {
        const logoBuf = logo.startsWith('data:') ? Buffer.from(logo.split(',')[1], 'base64') : Buffer.from(logo, 'base64');
        const qrImg = sharp(buffer);
  const { width } = await qrImg.metadata();
  const targetSize = Math.floor((width || size) * logoScale);
        const resizedLogo = await sharp(logoBuf).resize(targetSize, targetSize, { fit: 'contain' }).png().toBuffer();
        composite = await qrImg
          .composite([
            { input: resizedLogo, gravity: 'centre' }
          ])
          .png()
          .toBuffer();
      } catch (e) {
        // swallow logo errors but proceed
        logger.warn({
          operation: 'qr_generation',
          error: 'logo_processing_failed',
          message: e instanceof Error ? e.message : 'Unknown logo processing error'
        }, 'Logo processing failed, proceeding without logo');
      }
    }
    const hash = crypto.createHash('sha256').update(composite).digest('hex').slice(0, 16);
    const duration = Date.now() - startTime;
    
    logger.info({
      operation: 'qr_generation',
      format,
      size,
      dataLength: data.length,
      hasLogo,
      logoScale: hasLogo ? logoScale : undefined,
      ecc,
      eccForced: hasLogo && errorCorrection !== 'H',
      hash,
      outputSize: composite.length,
      duration
    }, 'QR code generated (PNG)');
    
  return { mimeType: 'image/png', data: composite.toString('base64'), meta: { size, format, hash, ecc } };
  }
}
