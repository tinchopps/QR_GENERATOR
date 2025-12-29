import React from 'react';

export const Toast: React.FC<{ message: string | null }> = ({ message }) => (
  <div aria-live="polite" className="fixed bottom-4 right-4 z-50">
    {message && (
      <div role="alert" className="bg-gray-900 text-white px-3 py-2 rounded shadow text-sm animate-fade-in">
        {message}
      </div>
    )}
  </div>
);
