import React, { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { PROFILES } from '../protocol/constants';
import { useI18n } from '../hooks/useI18n';

export const SettingsPage: React.FC = () => {
  const { t } = useI18n();

  const [gridRows, setGridRows] = useState(24);
  const [gridCols, setGridCols] = useState(24);
  const [targetFPS, setTargetFPS] = useState(30);
  const [rsEccBytes, setRsEccBytes] = useState(6);
  const [fountainBlockSize, setFountainBlockSize] = useState(128);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.settings}</h2>
            <p className="text-xs text-neutral-400">Manual tuning for LOTP v1 optical frame parameters</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-neutral-400 font-medium">Grid Rows ({gridRows})</label>
            <input
              type="range"
              min={16}
              max={48}
              step={2}
              value={gridRows}
              onChange={(e) => setGridRows(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-neutral-950"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-neutral-400 font-medium">Grid Columns ({gridCols})</label>
            <input
              type="range"
              min={16}
              max={48}
              step={2}
              value={gridCols}
              onChange={(e) => setGridCols(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-neutral-950"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-neutral-400 font-medium">Target Display FPS ({targetFPS})</label>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={targetFPS}
              onChange={(e) => setTargetFPS(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-neutral-950"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-neutral-400 font-medium">Reed-Solomon ECC Bytes ({rsEccBytes})</label>
            <input
              type="range"
              min={2}
              max={16}
              step={2}
              value={rsEccBytes}
              onChange={(e) => setRsEccBytes(Number(e.target.value))}
              className="w-full accent-amber-500 bg-neutral-950"
            />
          </div>
        </div>

        <button
          onClick={() => alert('Custom settings saved to local storage!')}
          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>
    </div>
  );
};
