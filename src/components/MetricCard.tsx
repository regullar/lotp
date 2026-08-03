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
  const valueClasses = {
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    neutral: 'text-white',
  };

  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between text-xs text-neutral-400 font-medium mb-1">
        <span>{label}</span>
        {Icon && <Icon className="w-4 h-4 text-neutral-400" />}
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${valueClasses[accent]}`}>{value}</div>
      {subtext && <div className="text-xs text-neutral-400 mt-1 font-mono">{subtext}</div>}
    </div>
  );
};
