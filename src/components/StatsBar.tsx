import React from 'react';
import { DashboardStats } from '../types.ts';
import { Globe, Shield, TrendingUp, Mail, DollarSign, CheckCircle2 } from 'lucide-react';

interface StatsBarProps {
  stats: DashboardStats;
  seoProvider: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, seoProvider }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Opportunities */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Total Opportunities</span>
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">{stats.total}</span>
          <span className="text-xs text-slate-500 font-sans">verified</span>
        </div>
      </div>

      {/* 2. Unique Root Domains */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Unique Domains</span>
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">{stats.uniqueDomains}</span>
          <span className="text-xs text-slate-500 font-sans">0 duplicates</span>
        </div>
      </div>

      {/* 3. High Authority (DA 60+) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>High Authority (DA 60+)</span>
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-indigo-400">{stats.highDA}</span>
          <span className="text-xs text-slate-500 font-sans">{stats.total > 0 ? Math.round((stats.highDA / stats.total) * 100) : 0}% ratio</span>
        </div>
      </div>

      {/* 4. Direct Emails Extracted */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Contact Emails</span>
          <Mail className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-amber-400">{stats.withEmail}</span>
          <span className="text-xs text-slate-500 font-sans">actionable</span>
        </div>
      </div>

      {/* 5. Free Submissions */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Free Submissions</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">{stats.freeCount}</span>
          <span className="text-xs text-slate-500 font-sans">no author fee</span>
        </div>
      </div>

      {/* 6. Active SEO Provider */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>SEO API Mode</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        </div>
        <div className="mt-2 flex flex-col">
          <span className="text-sm font-semibold capitalize text-cyan-300 truncate">
            {seoProvider === 'openpagerank' ? 'OpenPageRank' : seoProvider === 'moz' ? 'Mozscape' : 'Algorithmic'}
          </span>
          <span className="text-xs text-slate-500">100% Free Tier</span>
        </div>
      </div>
    </div>
  );
};
