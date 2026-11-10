import React from 'react';
import { Terminal, Square, Plus, ShieldCheck, Upload, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: 'opportunities' | 'console' | 'selenium' | 'settings';
  setActiveTab: (tab: 'opportunities' | 'console' | 'selenium' | 'settings') => void;
  onOpenScraperModal: () => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenDownloadModal: () => void;
  onDeduplicate: () => void;
  onStopScraper: () => void;
  isDeduplicating: boolean;
  isScraperRunning: boolean;
  elapsedSeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenScraperModal,
  onOpenAddModal,
  onOpenImportModal,
  onOpenDownloadModal,
  onDeduplicate,
  onStopScraper,
  isDeduplicating,
  isScraperRunning,
  elapsedSeconds = 0
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTab('opportunities'); }}
            className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 font-sans flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block"></span>
            GuestPost Radar
          </a>
        </div>

        {/* Zone 2: 4 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeTab === 'opportunities'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Opportunities Directory
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'console'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Live Scraper Console</span>
            {isScraperRunning && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('selenium')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeTab === 'selenium'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Selenium Scraper Script
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Free SEO API & Filters
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDeduplicate}
            disabled={isDeduplicating}
            title="Scan database and remove any duplicate root domains"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isDeduplicating ? 'Checking...' : 'Audit Duplicates'}</span>
          </button>

          <button
            onClick={onOpenImportModal}
            title="Import previously scraped sites from CSV or JSON spreadsheet"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Sites</span>
          </button>

          <button
            onClick={onOpenDownloadModal}
            title="Download the full-stack application as a ZIP archive with all features intact"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download App</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single</span>
          </button>

          {isScraperRunning ? (
            <button
              onClick={onStopScraper}
              title="Stop continuous crawling immediately"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 animate-pulse hover:animate-none"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Crawler ({formatTime(elapsedSeconds)})</span>
            </button>
          ) : (
            <button
              onClick={onOpenScraperModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Start Continuous Crawl</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
