import React, { useState } from 'react';
import { Play, RefreshCw, BarChart3, CheckCircle2 } from 'lucide-react';
import { BenchmarkSuite, BenchmarkResult } from '../benchmark/suite';
import { useI18n } from '../hooks/useI18n';

export const BenchmarkPage: React.FC = () => {
  const { t } = useI18n();
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const runAllBenchmarks = async () => {
    setIsBenchmarking(true);
    setResults([]);

    const resReliable = await BenchmarkSuite.runProfileBenchmark('reliable', 100);
    const resBalanced = await BenchmarkSuite.runProfileBenchmark('balanced', 100);
    const resFast = await BenchmarkSuite.runProfileBenchmark('fast', 100);

    setResults([resReliable, resBalanced, resFast]);
    setIsBenchmarking(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.benchmark}</h2>
            <p className="text-xs text-neutral-400">Measure raw optical bitrate, useful payload bitrate, Reed-Solomon & LT fountain throughput</p>
          </div>
        </div>

        <button
          onClick={runAllBenchmarks}
          disabled={isBenchmarking}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
        >
          {isBenchmarking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isBenchmarking ? 'Running Protocol Benchmarks...' : 'Run Benchmark Suite'}
        </button>

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-400">
              Formula: <span className="text-emerald-400 font-bold">usefulBitrate = validPayloadBytes / totalTransmissionTime</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {results.map((res, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="font-bold text-white text-base">{res.profileName}</div>
                  <div className="space-y-1.5 text-xs font-mono text-neutral-300">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Useful Bitrate:</span>
                      <span className="text-emerald-400 font-bold">{(res.usefulBitrateBps / 1000).toFixed(1)} Kbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Payload Bitrate:</span>
                      <span className="text-cyan-400">{(res.payloadBitrateBps / 1000).toFixed(1)} Kbps</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Encoding Time:</span>
                      <span>{res.encodingTimeMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Recovery Time:</span>
                      <span>{res.recoveryTimeMs} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Efficiency Ratio:</span>
                      <span className="text-amber-400">{res.efficiencyRatio}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
