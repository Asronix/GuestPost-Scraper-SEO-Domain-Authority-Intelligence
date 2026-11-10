import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Terminal, ExternalLink, ShieldCheck, Play } from 'lucide-react';

export const SeleniumExportView: React.FC = () => {
  const [scriptCode, setScriptCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/export/selenium-script')
      .then(res => res.text())
      .then(code => {
        setScriptCode(code);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.location.href = '/api/export/selenium-script';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-xs">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Standalone Python Selenium Scraper</h2>
              <p className="text-slate-400 mt-0.5">
                Run automated headless Chrome locally or on a VPS to crawl "write for us" websites with zero duplicate records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Script' : 'Copy Script'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py Script</span>
            </button>
          </div>
        </div>

        {/* 3 Quick Step Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-800/60">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-cyan-400 font-mono font-bold">01. Install Dependencies</span>
            <p className="text-slate-400 text-[11px] mt-1 font-mono">
              pip install selenium webdriver-manager beautifulsoup4 requests
            </p>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-cyan-400 font-mono font-bold">02. Run Script</span>
            <p className="text-slate-400 text-[11px] mt-1 font-mono">
              python guestpost_selenium_scraper.py
            </p>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-cyan-400 font-mono font-bold">03. Automated Output</span>
            <p className="text-slate-400 text-[11px] mt-1">
              Exports clean <code className="text-cyan-300">.csv</code> & <code className="text-cyan-300">.json</code> with 0 duplicate root domains and calculated DA.
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            <span className="text-xs font-mono text-slate-300 ml-2">guestpost_selenium_scraper.py</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Python 3 + Selenium 4</span>
        </div>

        <div className="p-4 max-h-[550px] overflow-y-auto select-text">
          {loading ? (
            <div className="text-slate-500 italic py-12 text-center">Loading script...</div>
          ) : (
            <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre overflow-x-auto">
              {scriptCode}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
