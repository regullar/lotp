import React, { useEffect, useState } from 'react';
import { History, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { SessionStore, SavedSession } from '../storage/sessionStore';
import { useI18n } from '../hooks/useI18n';

export const HistoryPage: React.FC = () => {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    // Load local history from IndexedDB
    // For demonstration, render local session list
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t.history}</h2>
            <p className="text-xs text-neutral-400">Transient session recovery records stored in IndexedDB</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950/60 rounded-2xl border border-neutral-800 text-xs text-neutral-500 font-mono">
            No active transient sessions found. All completed data is automatically purged after download for security.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.sessionId} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-white font-bold">{s.sessionId}</div>
                  <div className="text-neutral-400 mt-1">{s.receivedBlocks} / {s.totalBlocks} blocks</div>
                </div>
                <button
                  onClick={() => SessionStore.clearSession(s.sessionId)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
