import { create } from 'zustand';
import { QrConfigShared, QrResponseShared } from '../../../shared/qrTypes';

export interface QrConfig extends QrConfigShared {}

interface QrState {
  config: QrConfig;
  result?: QrResponseShared;
  history: Array<{ hash: string; config: QrConfig; timestamp: number }>;
  autoGenerate: boolean;
  setConfig: (c: Partial<QrConfig>) => void;
  setResult: (r: QrState['result']) => void;
  addHistory: (entry: { hash: string; config: QrConfig }) => void;
  loadHistory: () => void;
  setAutoGenerate: (v: boolean) => void;
}

const defaultConfig: QrConfig = {
  data: '',
  format: 'png',
  size: 256,
  colorDark: '#000000',
  colorLight: '#ffffff',
  errorCorrection: 'M',
  logoScale: 0.2
};

export const useQrStore = create<QrState>((set, get) => ({
  config: defaultConfig,
  history: [],
  autoGenerate: (() => {
    try { const saved = localStorage.getItem('qr_auto'); if (saved !== null) return saved === '1'; } catch { /* localStorage not available */ }
    return true;
  })(),
  setConfig: (c) => set({ config: { ...get().config, ...c } }),
  setResult: (r) => set({ result: r }),
  setAutoGenerate: (v) => {
    set({ autoGenerate: v });
    try { localStorage.setItem('qr_auto', v ? '1' : '0'); } catch { /* localStorage not available */ }
  },
  addHistory: ({ hash, config }) => {
  const existing = get().history;
  // Avoid duplicate consecutive hashes; if exists, move to top without duplication
  const filtered = existing.filter(h => h.hash !== hash);
    const newHistory = [{ hash, config: { ...config }, timestamp: Date.now() }, ...filtered].slice(0, 20);
    set({ history: newHistory });
    localStorage.setItem('qr_history', JSON.stringify(newHistory));
  },
  loadHistory: () => {
    const raw = localStorage.getItem('qr_history');
    if (raw) set({ history: JSON.parse(raw) });
  }
}));


// Helper (testing / manual rehydration) to re-read autoGenerate from localStorage
export function rehydrateAutoGenerate() {
  try {
    const saved = localStorage.getItem('qr_auto');
    useQrStore.setState({ autoGenerate: saved === null ? true : saved === '1' });
  } catch { /* localStorage not available */ }
}
