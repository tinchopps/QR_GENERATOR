import React from 'react';
import { useQrStore } from '../store/qrStore';

export const HistoryPanel: React.FC<{ onLoad: (hash: string) => void }> = ({ onLoad }) => {
  const history = useQrStore(s => s.history);
  return (
    <section>
      <h2 className="font-semibold mb-2">History</h2>
      <ul className="space-y-1 max-h-48 overflow-auto text-xs">
        {history.map(h => (
          <li key={h.hash} className="flex justify-between items-center border rounded px-2 py-1">
            <span>{h.hash}</span>
            <button className="underline" onClick={() => onLoad(h.hash)}>Load</button>
          </li>
        ))}
      </ul>
    </section>
  );
};
