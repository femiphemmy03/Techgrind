import { useEffect, useState } from 'react';

function getTimeLeft(target) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export default function CountdownTimer({ target }) {
  const [time, setTime] = useState(() => getTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!time) return <p className="text-tgamber font-semibold">Registration has closed for this cohort.</p>;

  const cells = [
    { label: 'Days', value: time.days },
    { label: 'Hours', value: time.hours },
    { label: 'Min', value: time.minutes },
    { label: 'Sec', value: time.seconds },
  ];

  return (
    <div className="flex gap-3">
      {cells.map((c) => (
        <div key={c.label} className="bg-surface border border-surfaceborder rounded-xl2 px-4 py-3 text-center min-w-[64px]">
          <div className="font-mono text-2xl font-bold text-tggreen">{String(c.value).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
