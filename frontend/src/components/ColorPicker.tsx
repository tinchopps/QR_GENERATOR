import React from 'react';

interface Props { label: string; value: string; onChange: (v: string) => void; }
export const ColorPicker: React.FC<Props> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm">{label}</label>
    <input aria-label={label} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);
