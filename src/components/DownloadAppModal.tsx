import React, { useState } from 'react';
import {
  Download,
  X,
  Check,
  Copy,
  Terminal,
  FolderArchive,
  Layers,
  Database,
  FileSpreadsheet,
  Globe,
  Bot,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const quickStartCommands = `# 1. Extract downloaded application zip
unzip guestpost-scraper-app.zip -d guestpost-scraper
cd guestpost-scraper

# 2. Install dependencies (React, Vite, Express, Archiver, etc.)
npm install

# 3. Start full-stack development server
npm run dev

# 4. Open in browser: http://localhost:3000`;

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(quickStartCommands);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    // Direct browser download
    const link = document.createElement('a');
    link.href = '/api/export/app-zip';
    link.setAttribute('download', 'guestpost-scraper-app.zip');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Download GuestPost Radar Application</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Download the complete, self-contained full-stack codebase with all features intact.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-300 text-xs">
          {/* Highlight Callout */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-white text-sm flex items-center gap-2">
                <span>Everything Included in One ZIP Package</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider">
                  Ready to Run
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Zero setup friction: Express server, Vite React frontend, Selenium crawler scripts, free SEO domain authority filter, and Google Sheets sync are all bundled together.
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-all shadow-lg shadow-cyan-950/40 active:scale-95 shrink-0"
            >
              <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Preparing ZIP...' : 'Download App (.ZIP)'}</span>
            </button>
          </div>

          {/* Feature Pillars Included in the Package */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Continuous Live Crawler</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Crawls indefinitely until you press the Stop button. Auto-extracts 'write for us' footprints, guidelines, and emails.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Duplicates & Free SEO DA</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Normalizes root domains to eliminate duplicates and scores domain authority for 100% free with algorithmic heuristics and OpenPageRank.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Centralized Google Sheets</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Connect your Google Account to push, pull, or automatically synchronize your opportunity records into a centralized Google Spreadsheet.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Database className="w-4 h-4 text-amber-400" />
                <span>Zero Data Loss on Refresh</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                All scraped sites and user imports are saved to server disk in data/guest_posts.json. No sample data—only your genuine records.
              </p>
            </div>
          </div>

          {/* Local Run Terminal Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>How to Run Locally (Mac / Linux / Windows)</span>
              </span>
              <button
                onClick={handleCopyCommands}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Commands'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {quickStartCommands}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-slate-500 text-xs">
            Package size: ~150KB (unpacked with full source code & README)
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
