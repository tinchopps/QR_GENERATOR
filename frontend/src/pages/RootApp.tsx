import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { useQrStore, QrConfig } from '../store/qrStore';
import { QrResponseShared } from '../../../shared/qrTypes';
import { useDebounce } from '../hooks/useDebounce';
import { useTheme } from '../hooks/useTheme';
import { postQR } from '../lib/api';
import { QRPreview } from '../components/QRPreview';
import { DownloadButtons } from '../components/DownloadButtons';
import { HistoryPanel } from '../components/HistoryPanel';
import { ThemeToggle } from '../components/ThemeToggle';
import { Toast } from '../components/Toast';
import { LogoUploader } from '../components/LogoUploader';

const App = (): JSX.Element => {
  const { config, setConfig, result, setResult, addHistory, loadHistory, autoGenerate, setAutoGenerate } = useQrStore();
  const [toast, setToast] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const lastManualRef = useRef<{ cfg: string; used: boolean } | null>(null);
  const debouncedConfig = useDebounce(config, 300);
  const { theme, setTheme } = useTheme();

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!autoGenerate) {
          e.preventDefault();
          void handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [autoGenerate, config]);

  useEffect(() => {
    if (!debouncedConfig.data || !autoGenerate) return;
    const serialized = JSON.stringify(debouncedConfig);
    if (lastManualRef.current && lastManualRef.current.used && lastManualRef.current.cfg === serialized) {
      lastManualRef.current.used = false;
      return;
    }
    (async () => {
      try {
	  const res = await postQR<QrResponseShared>(debouncedConfig);
        setResult(res.data);
      } catch (e:any) {
        if (axios.isAxiosError(e)) {
          if (e.message.includes('Network')) setToast('Backend no accesible (verifica que el servidor corre en :4000)');
          else setToast((e.response?.data as any)?.error || 'Error generando QR');
        } else {
          setToast('Error generando QR');
        }
      }
    })();
  }, [debouncedConfig, setResult, autoGenerate]);

  useEffect(() => {
    if (result?.meta.hash) {
      addHistory({ hash: result.meta.hash, config });
    }
  }, [result, addHistory, config]);

  const handleGenerate = async () => {
    if (!config.data || loading) return;
    setLoading(true);
    const serialized = JSON.stringify(config);
    lastManualRef.current = { cfg: serialized, used: true };
    try {
	  const res = await postQR<QrResponseShared>(config);
      setResult(res.data);
    } catch (e:any) {
      if (axios.isAxiosError(e)) {
        if (e.message.includes('Network')) setToast('Backend no accesible (verifica que el servidor corre en :4000)');
        else setToast((e.response?.data as any)?.error || 'Error generando QR');
      } else {
        setToast('Error generando QR');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">QR Generator</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <label className="flex items-center gap-1 text-xs select-none" title="Alternar generación automática">
            <input type="checkbox" checked={autoGenerate} onChange={(e) => setAutoGenerate(e.target.checked)} aria-label="Auto generate" />
            Auto
          </label>
          <button className="text-sm underline" onClick={() => {
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'qr-config.json';
            a.click();
            setToast('Configuración exportada');
          }}>Export</button>
          <label className="text-sm underline cursor-pointer">
            Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              file.text().then(t => {
                try { setConfig(JSON.parse(t)); setToast('Configuración importada'); } catch { setToast('JSON inválido'); }
              });
            }} />
          </label>
          <button className="text-sm underline" onClick={() => {
            if (!result) return;
            const url = window.location.origin;
            const shareData: ShareData = { title: 'QR', text: config.data, url };
            if (navigator.share) {
              navigator.share(shareData).catch(() => {});
            } else {
              navigator.clipboard.writeText(url);
              setToast('URL copiada');
            }
          }}>Share</button>
        </div>
      </header>
      <main className="grid md:grid-cols-2 gap-8">
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()} aria-label="QR configuration form">
          <div>
            <label htmlFor="data" className="block text-sm font-medium">Data / URL</label>
            <input id="data" value={config.data} onChange={(e) => setConfig({ data: e.target.value })} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="format" className="block text-sm">Format</label>
              <select id="format" value={config.format} onChange={(e) => setConfig({ format: e.target.value as QrConfig['format'] })} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800">
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
            <div>
              <label htmlFor="size" className="block text-sm">Size</label>
              <input id="size" type="number" value={config.size} min={128} max={1024} onChange={(e) => setConfig({ size: Number(e.target.value) })} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="colorDark" className="block text-sm">Color Dark</label>
              <input id="colorDark" type="color" value={config.colorDark} onChange={(e) => setConfig({ colorDark: e.target.value })} />
            </div>
            <div>
              <label htmlFor="colorLight" className="block text-sm">Color Light</label>
              <input id="colorLight" type="color" value={config.colorLight} onChange={(e) => setConfig({ colorLight: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="errorCorrection" className="block text-sm">Error Correction</label>
            <select id="errorCorrection" value={config.errorCorrection} onChange={(e) => setConfig({ errorCorrection: e.target.value as QrConfig['errorCorrection'] })} className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-800">
              <option value="L">L</option>
              <option value="M">M</option>
              <option value="Q">Q</option>
              <option value="H">H</option>
            </select>
            {config.logo && config.errorCorrection !== 'H' && (
              <p role="note" className="text-xs text-amber-600 mt-1">Logo presente: el backend forzará nivel H para asegurar legibilidad.</p>
            )}
          </div>
          <LogoUploader logo={config.logo} onLogo={(b64) => setConfig({ logo: b64 })} />
          <div>
            <label htmlFor="logoScale" className="block text-sm">Logo Scale {config.logoScale}</label>
            <input id="logoScale" type="range" min={0.05} max={0.4} step={0.01} value={config.logoScale} onChange={(e) => setConfig({ logoScale: Number(e.target.value) })} className="w-full" />
          </div>
        </form>
        <div className="space-y-4">
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={handleGenerate} disabled={!config.data || loading} className="px-4 py-1.5 rounded bg-blue-600 disabled:opacity-50 text-white text-sm font-medium" aria-label="Generate QR code">
              {loading ? 'Generating…' : 'Generate'}
            </button>
            <p className="text-xs text-gray-500" aria-live="polite">{loading && 'Please wait…'}</p>
          </div>
          <QRPreview result={result} />
          <DownloadButtons result={result} config={config} />
          <HistoryPanel onLoad={(hash) => {
            const entry = useQrStore.getState().history.find(h => h.hash === hash);
            if (entry) setConfig(entry.config);
          }} />
        </div>
      </main>
      <Toast message={toast} />
    </div>
  );
};

export default App;