import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { SendPage } from './pages/SendPage';
import { ReceivePage } from './pages/ReceivePage';
import { CalibratePage } from './pages/CalibratePage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoryPage } from './pages/HistoryPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { BarChart3, History } from 'lucide-react';
import { useI18n } from './hooks/useI18n';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-16">
        {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
        {activeTab === 'send' && <SendPage setActiveTab={setActiveTab} />}
        {activeTab === 'receive' && <ReceivePage setActiveTab={setActiveTab} />}
        {activeTab === 'calibrate' && <CalibratePage />}
        {activeTab === 'diagnostics' && <DiagnosticsPage />}
        {activeTab === 'about' && <AboutPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'benchmark' && <BenchmarkPage />}
      </main>

      {/* Footer Navigation Bar */}
      <footer className="border-t border-neutral-900 bg-neutral-950/80 backdrop-blur-md py-4 px-4 text-center text-xs text-neutral-500 font-mono flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        <div>LumenLink Optical Transport Protocol (LOTP v1) — Zero Server Data Transmission</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('history')}
            className={`hover:text-white transition-colors flex items-center gap-1 ${activeTab === 'history' ? 'text-emerald-400' : ''}`}
          >
            <History className="w-3.5 h-3.5" />
            {t.history}
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`hover:text-white transition-colors flex items-center gap-1 ${activeTab === 'benchmark' ? 'text-emerald-400' : ''}`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {t.benchmark}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
