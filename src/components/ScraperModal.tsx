import React, { useState } from 'react';
import { X, Terminal, Search, Globe, Layers, Play, Infinity as InfinityIcon } from 'lucide-react';

interface ScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScraper: (options: {
    mode: 'dork_search' | 'custom_urls' | 'niche_preset';
    keyword?: string;
    footprint?: string;
    customUrls?: string[];
    minDA?: number;
    continuous?: boolean;
  }) => void;
  isLoading: boolean;
}

export const ScraperModal: React.FC<ScraperModalProps> = ({
  isOpen,
  onClose,
  onStartScraper,
  isLoading
}) => {
  const [mode, setMode] = useState<'dork_search' | 'custom_urls' | 'niche_preset'>('dork_search');
  const [footprint, setFootprint] = useState<string>('write for us');
  const [keyword, setKeyword] = useState<string>('technology');
  const [customUrlsText, setCustomUrlsText] = useState<string>('');
  const [nichePreset, setNichePreset] = useState<string>('tech');
  const [minDA, setMinDA] = useState<number>(30);
  const [isContinuous, setIsContinuous] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'custom_urls') {
      const urls = customUrlsText
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0);
      if (urls.length === 0) return;
      onStartScraper({
        mode: 'custom_urls',
        customUrls: urls,
        minDA,
        continuous: isContinuous
      });
    } else if (mode === 'niche_preset') {
      onStartScraper({
        mode: 'niche_preset',
        keyword: nichePreset,
        minDA,
        continuous: isContinuous
      });
    } else {
      onStartScraper({
        mode: 'dork_search',
        footprint,
        keyword,
        minDA,
        continuous: isContinuous
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Start Indefinite Guest Post Crawler</h3>
              <p className="text-xs text-slate-400">Crawls continuously until stopped, records all unique sites, checks DA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Continuous Crawling Banner */}
          <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-900/60 text-cyan-300 shrink-0">
              <InfinityIcon className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-cyan-200">Indefinite Crawl Mode Active</div>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                The crawler will run continuously in the background, rotating search footprints, spidering outbound links, extracting author guidelines and contacts, and filtering by DA. Click the <span className="text-rose-400 font-semibold">Stop Crawler</span> button at any time to halt.
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Crawl Strategy Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('dork_search')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                  mode === 'dork_search'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span className="font-semibold">Search Dorks</span>
                </div>
                <span className="text-[10px] opacity-75">"Write for us" + keyword</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom_urls')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                  mode === 'custom_urls'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="font-semibold">Target Websites</span>
                </div>
                <span className="text-[10px] opacity-75">Paste custom URLs</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('niche_preset')}
                className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                  mode === 'niche_preset'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="font-semibold">Niche Presets</span>
                </div>
                <span className="text-[10px] opacity-75">Curated target pools</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Dork Search Fields */}
          {mode === 'dork_search' && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Starting Footprint Pattern
                </label>
                <select
                  value={footprint}
                  onChange={(e) => setFootprint(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="write for us">"write for us" (Standard)</option>
                  <option value="submit guest post">"submit guest post"</option>
                  <option value="guest post guidelines">"guest post guidelines"</option>
                  <option value="become a contributor">"become a contributor"</option>
                  <option value="guest article submission">"guest article submission"</option>
                  <option value="accepting guest posts">"accepting guest posts"</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Starting Topic / Niche Keyword
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. artificial intelligence, software, marketing, finance..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  The crawler begins with <code className="text-cyan-400 font-mono font-semibold">"{footprint}" {keyword}</code> and automatically rotates related footprints and niches as it crawls indefinitely.
                </span>
              </div>
            </div>
          )}

          {/* Mode 2: Custom URLs Fields */}
          {mode === 'custom_urls' && (
            <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <label className="text-xs font-medium text-slate-300 block">
                Target URLs or Domain List (one per line)
              </label>
              <textarea
                rows={5}
                value={customUrlsText}
                onChange={(e) => setCustomUrlsText(e.target.value)}
                placeholder="techcrunch.com&#10;searchenginejournal.com&#10;smashingmagazine.com&#10;https://example.com/write-for-us"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] text-slate-500 block">
                The crawler will inspect each domain, spider internal and outbound guest post links, and continue searching.
              </span>
            </div>
          )}

          {/* Mode 3: Niche Presets Fields */}
          {mode === 'niche_preset' && (
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Select Initial Industry Category
              </label>
              <select
                value={nichePreset}
                onChange={(e) => setNichePreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="tech">Technology, Coding & DevOps (SitePoint, HackerNoon, DZone, etc.)</option>
                <option value="marketing">Digital Marketing, SEO & MarTech (HubSpot, SearchEngineLand, etc.)</option>
                <option value="business">Startups, Business & Leadership (Entrepreneur, Bplans, etc.)</option>
                <option value="finance">Finance, Investing & Fintech (Investing.com, ModestMoney, etc.)</option>
                <option value="health">Health, Nutrition & Wellness (MindBodyGreen, Greatist, etc.)</option>
              </select>
            </div>
          )}

          {/* Minimum DA Filter */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Minimum Domain Authority Filter
            </label>
            <select
              value={minDA}
              onChange={(e) => setMinDA(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={0}>No Minimum (Record All Discovered Sites)</option>
              <option value={30}>Min DA 30+ (Standard)</option>
              <option value={50}>Min DA 50+ (High Authority Only)</option>
              <option value={70}>Min DA 70+ (Elite Tier Only)</option>
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Sites below this threshold are filtered out before being recorded.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLoading ? 'Crawler Running...' : 'Start Continuous Crawl'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
