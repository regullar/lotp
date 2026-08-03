import React from 'react';
import { Shield, Zap, Info, Activity, Gauge, Globe } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { lang, toggleLanguage, t } = useI18n();

  const navItems = [
    { id: 'send', label: t.sendFile, icon: Zap },
    { id: 'receive', label: t.receiveFile, icon: Shield },
    { id: 'calibrate', label: t.calibrate, icon: Gauge },
    { id: 'diagnostics', label: t.diagnostics, icon: Activity },
    { id: 'about', label: t.about, icon: Info },
  ];

  return (
    <header className="bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('send')}
          className="flex items-center gap-2 cursor-pointer group text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-emerald-400/20" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide flex items-center gap-1.5">
              LumenLink <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono font-normal border border-neutral-700">LOTP v1</span>
            </h1>
            <p className="text-xs text-neutral-400 hidden sm:block">{t.tagline}</p>
          </div>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium text-neutral-300 hover:text-white bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
};
