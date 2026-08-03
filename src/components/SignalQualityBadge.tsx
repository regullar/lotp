import React from 'react';

export type SignalLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'searching';

interface SignalQualityBadgeProps {
  level: SignalLevel;
  confidence?: number;
}

export const SignalQualityBadge: React.FC<SignalQualityBadgeProps> = ({ level, confidence }) => {
  const configs: Record<SignalLevel, { label: string; text: string }> = {
    excellent: { label: 'Excellent Signal', text: 'text-emerald-400' },
    good: { label: 'Good Signal', text: 'text-cyan-400' },
    fair: { label: 'Fair Signal', text: 'text-amber-400' },
    poor: { label: 'Poor Signal', text: 'text-rose-400' },
    searching: { label: 'Searching QR...', text: 'text-neutral-400' },
  };

  const cfg = configs[level];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-950 text-xs font-mono font-medium ${cfg.text}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${level === 'searching' ? 'bg-neutral-400' : 'bg-current'}`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${level === 'searching' ? 'bg-neutral-400' : 'bg-current'}`}></span>
      </span>
      {cfg.label}
      {confidence !== undefined && level !== 'searching' && (
        <span className="opacity-70">({Math.round(confidence * 100)}%)</span>
      )}
    </div>
  );
};
