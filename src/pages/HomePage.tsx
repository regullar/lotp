import React, { useEffect, useState } from 'react';
import { Zap, Shield, Gauge, Activity, Info, Lock, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { CapabilityChecker, BrowserCapabilities } from '../diagnostics/capabilityChecker';

interface HomePageProps {
  setActiveTab: (tab: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();
  const [caps, setCaps] = useState<BrowserCapabilities | null>(null);

  useEffect(() => {
    CapabilityChecker.check().then(setCaps);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 px-4">
      {/* Notice Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
        <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="leading-relaxed">{t.opticalOnlyNotice}</p>
      </div>

      {/* Main Dual Hero Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setActiveTab('send')}
          className="group relative p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-900 transition-all text-left overflow-hidden shadow-2xl flex flex-col justify-between h-64"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
            <Zap className="w-7 h-7 fill-emerald-400/20" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-between">
              {t.sendFile}
              <span className="text-sm font-mono text-emerald-400 group-hover:translate-x-1 transition-transform">→</span>
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Encode any file into a high-speed LOTP optical light matrix stream. Zero network needed.
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('receive')}
          className="group relative p-8 rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/50 hover:bg-neutral-900 transition-all text-left overflow-hidden shadow-2xl flex flex-col justify-between h-64"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors" />
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
            <Shield className="w-7 h-7 fill-cyan-400/20" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-between">
              {t.receiveFile}
              <span className="text-sm font-mono text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Scan optical matrix stream with your camera and reconstruct files with fountain error correction.
            </p>
          </div>
        </button>
      </div>

      {/* Browser API Capabilities Card */}
      <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Browser API Compatibility Checklist
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Web Workers', supported: caps?.webWorkers },
            { label: 'MediaDevices Camera', supported: caps?.mediaDevices },
            { label: 'Web Crypto API', supported: caps?.webCrypto },
            { label: 'requestVideoFrameCallback', supported: caps?.requestVideoFrameCallback },
            { label: 'WebGL2 Acceleration', supported: caps?.webGL2 },
            { label: 'OffscreenCanvas', supported: caps?.offscreenCanvas },
            { label: 'IndexedDB Session Storage', supported: caps?.indexedDB },
            { label: 'Service Worker PWA', supported: caps?.serviceWorker },
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between">
              <span className="text-neutral-300 font-medium">{item.label}</span>
              {item.supported ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
