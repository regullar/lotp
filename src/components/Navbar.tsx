import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Gauge, Globe, Asterisk } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { lang, toggleLanguage, t } = useI18n();

  const navItems = [
    { id: 'send', label: t.sendFile, icon: ArrowUpFromLine },
    { id: 'receive', label: t.receiveFile, icon: ArrowDownToLine },
    { id: 'calibrate', label: t.calibrate, icon: Gauge },
  ];

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="brand-lockup"
          aria-label="LumenLink home"
        >
          <span className="brand-mark" aria-hidden="true"><Asterisk /></span>
          <span className="brand-name">LumenLink</span>
        </button>

        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-button ${isActive ? 'is-active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="header-tools">
          <button
            type="button"
            onClick={toggleLanguage}
            className="language-button"
            aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
};
