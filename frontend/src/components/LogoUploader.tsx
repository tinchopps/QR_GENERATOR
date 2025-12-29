import React from 'react';

interface Props { logo?: string; onLogo: (b64: string | undefined) => void; }
export const LogoUploader: React.FC<Props> = ({ logo, onLogo }) => {
  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 200 * 1024) return alert('Logo too large (max 200KB)');
    // Convert to base64 (strip data:* prefix later if needed)
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    onLogo(b64);
  };
  return (
    <div>
  <label htmlFor="logoFile" className="block text-sm">Logo (PNG/SVG, max 200KB)</label>
  <input id="logoFile" type="file" accept="image/png,image/svg+xml" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
      }} />
      {logo && <button type="button" className="ml-2 text-xs underline" onClick={() => onLogo(undefined)}>Remove</button>}
    </div>
  );
};
