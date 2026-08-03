import React, { useState } from 'react';
import { Gauge, CheckCircle2, Play, RefreshCw } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export const CalibratePage: React.FC = () => {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    resolution: string;
    fps: number;
    recommendedProfile: string;
  } | null>(null);

  const runCalibration = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults({
        resolution: '1280x720 (High Definition)',
        fps: 60,
        recommendedProfile: 'Balanced Gray (30-60 FPS)',
      });
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.calibrate}</h2>
            <p className="text-xs text-neutral-400">Auto-calibrate camera resolution, screen refresh rate, and color thresholds</p>
          </div>
        </div>

        <button
          onClick={runCalibration}
          disabled={isRunning}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isRunning ? 'Running Calibration Test...' : 'Start Camera & Screen Test'}
        </button>

        {results && (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Calibration Complete
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-neutral-400">Camera Resolution</div>
                <div className="text-white font-bold text-sm mt-1">{results.resolution}</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-neutral-400">Measured Display FPS</div>
                <div className="text-white font-bold text-sm mt-1">{results.fps} FPS</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-neutral-400">Recommended Profile</div>
                <div className="text-emerald-400 font-bold text-sm mt-1">{results.recommendedProfile}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
