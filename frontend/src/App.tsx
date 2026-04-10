import React, { useState } from 'react';
import { Tab } from './core/domain/types';
import { RoutesTab } from './adapters/ui/RoutesTab';
import { CompareTab } from './adapters/ui/CompareTab';
import { BankingTab } from './adapters/ui/BankingTab';
import { PoolingTab } from './adapters/ui/PoolingTab';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'routes',  label: 'Routes',  icon: '⚓', desc: 'Route Registry' },
  { id: 'compare', label: 'Compare', icon: '📊', desc: 'GHG Analysis' },
  { id: 'banking', label: 'Banking', icon: '🏦', desc: 'Article 20' },
  { id: 'pooling', label: 'Pooling', icon: '🌊', desc: 'Article 21' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('routes');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ocean-800/50 bg-ocean-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 flex items-center justify-center text-lg shadow-lg shadow-ocean-900/50">
              ⛵
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-ocean-100 leading-none">
                FuelEU Maritime
              </h1>
              <p className="text-xs text-ocean-500 font-mono mt-0.5">Compliance Dashboard — Varuna Marine Services BV</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse-ring" />
            <span className="text-ocean-400">Reg. (EU) 2023/1805</span>
          </div>
        </div>

        {/* Tab Bar */}
        <nav className="max-w-7xl mx-auto px-6 flex gap-1 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-3 text-sm font-body font-medium transition-all duration-200
                border-b-2 -mb-px
                ${activeTab === tab.id
                  ? 'text-ocean-200 border-ocean-400 bg-ocean-800/30'
                  : 'text-ocean-500 border-transparent hover:text-ocean-300 hover:border-ocean-700'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-xs font-mono hidden md:inline ${activeTab === tab.id ? 'text-ocean-400' : 'text-ocean-700'}`}>
                {tab.desc}
              </span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'routes'  && <RoutesTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'banking' && <BankingTab />}
        {activeTab === 'pooling' && <PoolingTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-ocean-900 mt-16 py-6 text-center">
        <p className="text-xs font-mono text-ocean-700">
          FuelEU Maritime — Regulation (EU) 2023/1805 · Annexe IV · Articles 20–21 ·
          Built for Varuna Marine Services BV
        </p>
      </footer>
    </div>
  );
};

export default App;
