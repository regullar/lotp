import React from 'react';

export type SignalLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'searching';

interface SignalQualityBadgeProps {
  level: SignalLevel;
  confidence?: number;
}

export const SignalQualityBadge: React.FC<SignalQualityBadgeProps> = ({ level, confidence }) => {
  const configs: Record<SignalLevel, { label: string; bg: string; border: string; text: string }> = {
    excellent: { label: 'Excellent Signal', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400' },
    good: { label: 'Good Signal', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    fair: { label: 'Fair Signal', bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400' },
    poor: { label: 'Poor Signal', bg: 'bg-rose-500/10', border: 'border-rose-500/40', text: 'text-rose-400' },
    searching: { label: 'Searching Matrix...', bg: 'bg-neutral-800', border: 'border-neutral-700', text: 'text-neutral-400' },
  };

  const cfg = configs[level];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
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
