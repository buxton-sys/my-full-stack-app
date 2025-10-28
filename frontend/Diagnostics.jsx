import React, { useEffect, useState } from 'react';

export default function Diagnostics() {
  const [font, setFont] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [dashPresent, setDashPresent] = useState(false);
  const [dashColor, setDashColor] = useState('');

  useEffect(() => {
    try {
      const ff = getComputedStyle(document.documentElement).fontFamily;
      setFont(ff || 'unknown');
      setIsDark(document.documentElement.classList.contains('dark'));
      const d = document.getElementById('dashboard-title');
      setDashPresent(Boolean(d));
      if (d) setDashColor(getComputedStyle(d).color || '');
    } catch (e) {
      setFont('n/a');
    }
  }, []);

}
