import React, { useEffect, useState } from 'react';
import { CapabilityChecker, BrowserCapabilities } from '../diagnostics/capabilityChecker';
import { Activity, CheckCircle2, AlertTriangle, Cpu, HardDrive, Video, ShieldCheck } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export const DiagnosticsPage: React.FC = () => {
  const { t } = useI18n();
  const [caps, setCaps] = useState<BrowserCapabilities | null>(null);

  useEffect(() => {
    CapabilityChecker.check().then(setCaps);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.diagnostics}</h2>
            <p className="text-xs text-neutral-400">Inspect web browser capabilities, hardware video pipelines, and storage quota</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {[
            { name: 'Web Workers Threading', desc: 'Offloads CV scanning to background thread', status: caps?.webWorkers },
            { name: 'OffscreenCanvas API', desc: 'Hardware-accelerated worker rendering', status: caps?.offscreenCanvas },
            { name: 'Web Crypto API (AES-256-GCM)', desc: 'Client-side hardware encryption', status: caps?.webCrypto },
            { name: 'requestVideoFrameCallback', desc: 'Zero-lag camera frame synchronization', status: caps?.requestVideoFrameCallback },
            { name: 'WebGL2 Acceleration', desc: 'High-speed pixel processing engine', status: caps?.webGL2 },
            { name: 'IndexedDB Session Storage', desc: 'Local session state & chunk storage', status: caps?.indexedDB },
            { name: 'Service Worker PWA', desc: 'Full offline application support', status: caps?.serviceWorker },
            { name: 'MediaDevices Camera', desc: 'Rear camera access & constraints', status: caps?.mediaDevices },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start justify-between">
              <div>
                <div className="font-bold text-white mb-0.5">{item.name}</div>
                <div className="text-neutral-400 text-xs">{item.desc}</div>
              </div>
              {item.status ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-300">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            Estimated Browser Storage Quota:
          </div>
          <div className="text-white font-bold">{caps?.estimatedStorageMB || 500} MB</div>
        </div>
      </div>
    </div>
  );
};
