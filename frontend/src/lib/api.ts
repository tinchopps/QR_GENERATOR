import axios from 'axios';

function resolveBaseURL(): string {
  let base = '';
  // 1. Try Vite env (runtime-safe)
  try {
    // eslint-disable-next-line no-new-func
    base = new Function('try{return import.meta.env&&import.meta.env.VITE_API_BASE||""}catch{return ""}')();
  } catch {}
  // 2. Try process.env (tests / build time)
  if (!base && typeof process !== 'undefined') base = process.env.VITE_API_BASE || '';
  // 3. Auto-detect dev: frontend on 5173, backend likely on 4000 (concurrently script)
  if (!base && typeof window !== 'undefined' && window.location && window.location.port) {
    const port = window.location.port;
    // Avoid overriding when already served by backend (4000) or during tests (about:blank)
    if (port !== '4000' && window.location.hostname === 'localhost' && window.location.protocol.startsWith('http')) {
      // Heuristic: if running on Vite default 5173 (or any other), assume backend 4000
      base = `${window.location.protocol}//${window.location.hostname}:4000`;
    }
  }
  return base;
}

const baseURL = resolveBaseURL();
const ax: any = axios as any;
const api = ax.create ? ax.create({ baseURL }) : ax;

if (typeof window !== 'undefined') {
  // Minimal debug hook (no console spam in production if not needed)
  if (!baseURL) {
    // eslint-disable-next-line no-console
    console.warn('[api] No baseURL resolved; requests will use relative /api path');
  } else {
    // eslint-disable-next-line no-console
    console.debug('[api] Using baseURL', baseURL);
  }
}

export function postQR<T = any>(body: any) {
  return api.post('/api/qr', body) as Promise<{ data: T }>;
}