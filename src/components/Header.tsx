import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Square,
  Plus,
  ShieldCheck,
  Upload,
  Download,
  MoreHorizontal,
  ChevronDown,
  Menu,
  X,
  FileSpreadsheet
} from 'lucide-react';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { id: 'opportunities' as const, label: 'Opportunities' },
    {
      id: 'console' as const,
      label: 'Live Console',
      badge: isScraperRunning
    },
    { id: 'selenium' as const, label: 'Selenium Export' },
    { id: 'settings' as const, label: 'SEO Settings' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('opportunities');
              setIsMobileNavOpen(false);
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block shadow-sm"></span>
            <span>GuestPost Radar</span>
          </a>
        </div>

        {/* Zone 2: Navigation Links (Compact & Single-Line) */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs sm:text-sm font-medium">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === item.id
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: Streamlined Actions (No Overflow) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Add Button */}
          <button
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/90 hover:bg-slate-700/90 hover:text-white border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Manually add a website to database"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Site</span>
          </button>

          {/* More Actions Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/90 hover:bg-slate-700/90 hover:text-white border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="More actions: Audit Duplicates, Import Sites, Download App"
            >
              <span>Actions</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 text-xs">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDeduplicate();
                  }}
                  disabled={isDeduplicating}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Audit Duplicates</span>
                  </div>
                  {isDeduplicating && <span className="text-[10px] text-cyan-400">Auditing...</span>}
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenImportModal();
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Import Sites</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">CSV / JSON</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenDownloadModal();
                  }}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors border-t border-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Download App</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">.ZIP</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action Button (Start / Stop Crawler) */}
          {isScraperRunning ? (
            <button
              onClick={onStopScraper}
              title="Stop continuous crawling immediately"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 animate-pulse hover:animate-none"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop ({formatTime(elapsedSeconds)})</span>
            </button>
          ) : (
            <button
              onClick={onOpenScraperModal}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 active:scale-95"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Start Crawler</span>
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title="Toggle navigation menu"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-slate-900/98 px-4 py-3 space-y-2 text-xs">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-between ${
                  activeTab === item.id
                    ? 'bg-slate-800 text-cyan-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] text-cyan-400 font-mono">Running</span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <button
              onClick={() => {
                setIsMobileNavOpen(false);
                onOpenAddModal();
              }}
              className="flex-1 py-2 px-3 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium"
            >
              + Add Site
            </button>
            <button
              onClick={() => {
                setIsMobileNavOpen(false);
                onOpenImportModal();
              }}
              className="flex-1 py-2 px-3 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium"
            >
              Import
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
