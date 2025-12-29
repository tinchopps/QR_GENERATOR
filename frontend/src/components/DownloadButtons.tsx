import React from 'react';
import { QrConfig } from '../store/qrStore';
import { QrResponseShared } from '../../../shared/qrTypes';

interface Props { result?: QrResponseShared; config: QrConfig; }
export const DownloadButtons: React.FC<Props> = ({ result, config }) => {
  if (!result) return null;
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = `data:${result.mimeType};base64,${result.data}`;
    a.download = `qr-${result.meta.hash}.${config.format}`;
    a.click();
  };
  const handleCopyEmbed = () => {
    const tag = `<img src="data:${result.mimeType};base64,${result.data}" alt="QR" />`;
    navigator.clipboard.writeText(tag);
  };
  return (
    <div className="flex gap-2 flex-wrap" aria-label="Download and copy actions">
      <button onClick={handleDownload} className="px-3 py-1 rounded bg-primary-600 text-white text-sm" aria-label="Download QR code">Download</button>
      <button onClick={() => navigator.clipboard.writeText(config.data)} className="px-3 py-1 rounded bg-gray-700 text-white text-sm" aria-label="Copy QR data">Copy Data</button>
      <button onClick={handleCopyEmbed} className="px-3 py-1 rounded bg-gray-500 text-white text-sm" aria-label="Copy HTML image tag">Copy <span aria-hidden="true">&lt;img/&gt;</span></button>
    </div>
  );
};
