import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { SendPage } from './pages/SendPage';
import { ReceivePage } from './pages/ReceivePage';
import { CalibratePage } from './pages/CalibratePage';
import { HistoryPage } from './pages/HistoryPage';
import { History } from 'lucide-react';
import { useI18n } from './hooks/useI18n';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const { t } = useI18n();

  return (
    <div className="app-shell min-h-screen flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="app-main flex-1">
        {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
        {activeTab === 'send' && <SendPage setActiveTab={setActiveTab} />}
        {activeTab === 'receive' && <ReceivePage setActiveTab={setActiveTab} />}
        {activeTab === 'calibrate' && <CalibratePage />}
        {activeTab === 'history' && <HistoryPage />}
      </main>

      <footer className="app-footer">
        <div>LumenLink · LOTP v1 · Zero-server optical transport</div>
        <div className="footer-actions">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' ? 'is-active' : ''}
          >
            <History className="w-3.5 h-3.5" />
            {t.history}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
