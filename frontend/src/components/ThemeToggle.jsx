import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return document.documentElement.classList.contains('dark');
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((s) => !s)}
      className="px-3 py-1 rounded-md bg-white/40 dark:bg-gray-700/40 text-sm"
    >
      {isDark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
