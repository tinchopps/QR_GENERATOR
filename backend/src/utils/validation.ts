import { z } from 'zod';

const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const base64Regex = /^(data:)?[A-Za-z0-9+/=]+$/;

export const qrRequestSchema = z.object({
  data: z.string().transform(v => v.trim()).pipe(z.string().min(1)),
  format: z.enum(['png', 'svg']),
  size: z.number().int().min(128).max(1024).optional(),
  colorDark: z.string().regex(hexColor).optional(),
  colorLight: z.string().regex(hexColor).optional(),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional(),
  logo: z.string().optional().refine(v => {
    if (!v) return true;
    if (v.startsWith('http://') || v.startsWith('https://')) return true;
    // Check if it's a data URL or plain base64
    if (v.startsWith('data:')) {
      const base64Part = v.split(',')[1];
      if (base64Part && base64Regex.test(base64Part)) {
        const sizeBytes = Math.ceil((base64Part.length * 3) / 4);
        return sizeBytes <= 200 * 1024;
      }
      return false;
    }
    // Plain base64
    if (base64Regex.test(v)) {
      const sizeBytes = Math.ceil((v.length * 3) / 4);
      return sizeBytes <= 200 * 1024;
    }
    return false;
  }, { message: 'Logo must be URL (http/https) or base64 <=200KB' }),
  logoScale: z.number().min(0.05).max(0.4).optional()
}).superRefine((val, ctx) => {
  // sanitize URL input in data if it's a URL with unsupported protocol
  try {
    if (/^https?:\/\//i.test(val.data)) {
      const u = new URL(val.data);
      if (!['http:', 'https:'].includes(u.protocol)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['data'], message: 'Invalid URL protocol' });
      }
    }
  } catch {
    // if looks like URL but invalid
    if (/^\w+:\/\//.test(val.data)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['data'], message: 'Invalid URL' });
    }
  }
});

export type QrRequest = z.infer<typeof qrRequestSchema>;
