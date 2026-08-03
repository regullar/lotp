import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  accent?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  accent = 'neutral',
}) => {
  const accentClasses = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
    neutral: 'border-neutral-800 bg-neutral-900/60 text-neutral-200',
  };

  return (
    <div className={`p-4 rounded-xl border ${accentClasses[accent]} backdrop-blur-sm transition-all`}>
      <div className="flex items-center justify-between text-xs text-neutral-400 font-medium mb-1">
        <span>{label}</span>
        {Icon && <Icon className="w-4 h-4 text-neutral-400" />}
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight text-white">{value}</div>
      {subtext && <div className="text-xs text-neutral-500 mt-1 font-mono">{subtext}</div>}
    </div>
  );
};
