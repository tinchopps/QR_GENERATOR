// Shared QR request/response types derived from backend Zod schema.
// Keep in sync with backend/src/utils/validation.ts

export interface QrRequestShared {
  data: string;
  format: 'png' | 'svg';
  size?: number; // 128-1024
  colorDark?: string;
  colorLight?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  logo?: string; // base64 or http(s) URL
  logoScale?: number; // 0.05 - 0.4
}

export interface QrResponseShared {
  mimeType: string;
  data: string; // base64
  meta: { size: number; format: 'png' | 'svg'; hash: string; ecc: 'L' | 'M' | 'Q' | 'H' };
}

// Frontend normalized config (ensures required fields with defaults applied)
export interface QrConfigShared {
  data: string;
  format: 'png' | 'svg';
  size: number;
  colorDark: string;
  colorLight: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  logo?: string;
  logoScale: number;
}
