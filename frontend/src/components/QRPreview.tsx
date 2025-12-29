import React from 'react';
import { QrResponseShared } from '../../../shared/qrTypes';

interface Props { result?: QrResponseShared; }
export const QRPreview: React.FC<Props> = ({ result }) => (
  <div className="border rounded p-4 bg-white dark:bg-gray-800 flex flex-col items-center justify-center min-h-[320px]" aria-live="polite">
    {result ? (
      <>
        <img src={`data:${result.mimeType};base64,${result.data}`} alt="QR preview" className="shadow" />
        <p className="text-xs mt-2 text-gray-500">Hash: {result.meta.hash}</p>
      </>
    ) : (
      <p className="text-sm text-gray-500">Enter data to generate QR...</p>
    )}
  </div>
);
