import React, { useRef, useEffect } from 'react';
import { ScraperState } from '../types.ts';
import { Terminal, Square, Play, Clock, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LiveConsoleProps {
  scraperState: ScraperState;
  onStopScraper: () => void;
  onLaunchClick: () => void;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({
  scraperState,
  onStopScraper,
  onLaunchClick
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scraperState.isRunning) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scraperState.logs.length, scraperState.isRunning]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const getLogBadge = (level: string) => {
    switch (level) {
      case 'crawl':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80';
      case 'found':
        return 'text-teal-300 bg-teal-950/60 border-teal-800/80';
      case 'duplicate':
        return 'text-amber-400 bg-amber-950/60 border-amber-800/80';
      case 'da':
        return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/80';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80';
      case 'warn':
        return 'text-orange-400 bg-orange-950/60 border-orange-800/80';
      case 'error':
        return 'text-rose-400 bg-rose-950/60 border-rose-800/80';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Status & Controls */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${scraperState.isRunning ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20' : 'bg-slate-600'}`}></div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-white">
                  {scraperState.isRunning ? 'Continuous Scraper Engine (Crawling Indefinitely)' : 'Continuous Crawler Engine (Standby)'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${scraperState.isRunning ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {scraperState.isRunning ? 'Crawling Non-Stop' : 'Idle'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl truncate">
                {scraperState.isRunning
                  ? `Active target: ${scraperState.currentUrl || 'Analyzing and spidering guest post footprints...'}`
                  : 'Crawler runs indefinitely, automatically rotating footprints and keywords until you press the Stop button.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {scraperState.isRunning ? (
              <button
                onClick={onStopScraper}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-900/30 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Crawler</span>
              </button>
            ) : (
              <button
                onClick={onLaunchClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl shadow-lg shadow-cyan-950/40 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Continuous Crawl</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Telemetry Grid */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* 1. Elapsed Time */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Elapsed Run Time</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1.5">
              {formatElapsed(scraperState.elapsedSeconds || 0)}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {scraperState.isRunning ? 'Active session' : 'Last session'}
            </span>
          </div>

          {/* 2. Total Scanned */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Websites Inspected</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-1.5">
              {scraperState.scannedCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              Queue: {scraperState.queueSize || 0} pending
            </span>
          </div>

          {/* 3. Verified Opportunities Found */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Verified Sites Saved</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1.5">
              {scraperState.foundCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">Live in dashboard</span>
          </div>

          {/* 4. Duplicates Blocked */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <div className="text-slate-400 flex items-center justify-between">
              <span>Duplicates Prevented</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1.5">
              {scraperState.duplicateCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">100% unique root domains</span>
          </div>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        {/* Terminal Header */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
            </div>
            <span className="text-xs font-mono text-slate-400 ml-2">crawler_stream.log</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-500">
              {scraperState.logs.length} events logged
            </span>
            {scraperState.isRunning && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Streaming live</span>
              </span>
            )}
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 font-mono text-xs max-h-96 overflow-y-auto space-y-2 select-text">
          {scraperState.logs.length === 0 ? (
            <div className="text-slate-600 italic py-10 text-center">
              No crawler events recorded yet. Start a continuous crawl to inspect pages, extract guidelines and emails, and score domain authorities indefinitely.
            </div>
          ) : (
            scraperState.logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-600 shrink-0 text-[11px] tabular-nums">
                  {log.timestamp}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 border ${getLogBadge(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
                <span
                  className={
                    log.level === 'duplicate'
                      ? 'text-amber-300'
                      : log.level === 'success'
                      ? 'text-emerald-300'
                      : log.level === 'warn'
                      ? 'text-orange-300'
                      : log.level === 'error'
                      ? 'text-rose-300'
                      : log.level === 'da'
                      ? 'text-indigo-300'
                      : 'text-slate-300'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
