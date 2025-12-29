import React from 'react';

interface Props { theme: string; setTheme: (t: string) => void; }
export const ThemeToggle: React.FC<Props> = ({ theme, setTheme }) => (
  <select aria-label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} className="border rounded px-2 py-1 bg-white dark:bg-gray-800">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="system">System</option>
  </select>
);
