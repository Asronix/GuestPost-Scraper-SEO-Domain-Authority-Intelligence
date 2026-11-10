import React, { useState } from 'react';
import { AppSettings } from '../types.ts';
import {
  ShieldCheck,
  Key,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface SeoSettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onRefreshAllDA: () => Promise<number>;
}

export const SeoSettingsModal: React.FC<SeoSettingsModalProps> = ({
  settings,
  onSaveSettings,
  onRefreshAllDA
}) => {
  const [provider, setProvider] = useState<'algorithmic' | 'openpagerank' | 'moz'>(settings.seoProvider);
  const [openPageRankKey, setOpenPageRankKey] = useState(settings.openPageRankKey);
  const [mozAccessId, setMozAccessId] = useState(settings.mozAccessId);
  const [mozSecretKey, setMozSecretKey] = useState(settings.mozSecretKey);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isRefreshingDA, setIsRefreshingDA] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/seo/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: openPageRankKey,
          mozAccessId,
          mozSecretKey
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ valid: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveSettings({
      seoProvider: provider,
      openPageRankKey,
      mozAccessId,
      mozSecretKey
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleBulkRefresh = async () => {
    setIsRefreshingDA(true);
    setRefreshMessage(null);
    try {
      const count = await onRefreshAllDA();
      setRefreshMessage(`Successfully updated Domain Authority for ${count} websites!`);
    } catch (err: any) {
      setRefreshMessage('Error refreshing DA metrics');
    } finally {
      setIsRefreshingDA(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-xs">
      {/* Title Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Free SEO API & Domain Authority Integration</h2>
            <p className="text-slate-400 mt-0.5">
              Filter results by Domain Authority (DA 1-100) using 100% free SEO APIs and ranking models
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        {/* Provider Radio Cards */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-200 block">
            Select Active SEO Provider
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Algorithmic */}
            <div
              onClick={() => setProvider('algorithmic')}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                provider === 'algorithmic'
                  ? 'bg-cyan-950/30 border-cyan-500/80 text-white'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-200">Free Algorithmic DA</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  100% FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Calculates calibrated DA (1-100) instantly without API keys using Tranco top traffic approximations and TLD weightings.
              </p>
            </div>

            {/* 2. OpenPageRank */}
            <div
              onClick={() => setProvider('openpagerank')}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                provider === 'openpagerank'
                  ? 'bg-cyan-950/30 border-cyan-500/80 text-white'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-200">OpenPageRank API</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  FREE 10M REQ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Free API provided by DomCop. Gives authentic PageRank decimals (0-10) scaled directly to Domain Authority (0-100).
              </p>
            </div>

            {/* 3. Moz Free Tier */}
            <div
              onClick={() => setProvider('moz')}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                provider === 'moz'
                  ? 'bg-cyan-950/30 border-cyan-500/80 text-white'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-200">Moz Links API</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800 font-mono">
                  FREE TIER
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Official Mozscape URL Metrics endpoint for genuine Moz Domain Authority (DA) and Page Authority (PA).
              </p>
            </div>
          </div>
        </div>

        {/* Credentials Inputs */}
        {provider === 'openpagerank' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-300">OpenPageRank Free API Key</label>
              <a
                href="https://www.domcop.com/openpagerank/"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Get Free Key (10M requests)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="text"
              value={openPageRankKey}
              onChange={(e) => setOpenPageRankKey(e.target.value)}
              placeholder="e.g. 8k0wsogc... (Enter your free key)"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">
              Header passed: <code className="text-cyan-400 font-mono">API-OPR: [your-key]</code>
            </p>
          </div>
        )}

        {provider === 'moz' && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-medium text-slate-300">Moz Free Credentials</label>
              <a
                href="https://moz.com/products/api"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Moz Free Account</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Access ID</label>
                <input
                  type="text"
                  value={mozAccessId}
                  onChange={(e) => setMozAccessId(e.target.value)}
                  placeholder="moz-access-id"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Secret Key</label>
                <input
                  type="password"
                  value={mozSecretKey}
                  onChange={(e) => setMozSecretKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Key Test Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTestingKey}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isTestingKey ? 'Testing Connection...' : 'Test SEO API Connection'}</span>
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Settings Saved</span>
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border flex items-center gap-2 ${
              testResult.valid
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {testResult.valid ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </form>

      {/* Bulk Re-evaluate Section */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Re-evaluate Database Domain Authority</h3>
          <p className="text-slate-400 mt-0.5">
            Bulk-refresh the Domain Authority and PageRank scores of all saved websites using your active SEO provider.
          </p>
          {refreshMessage && (
            <p className="text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{refreshMessage}</span>
            </p>
          )}
        </div>

        <button
          onClick={handleBulkRefresh}
          disabled={isRefreshingDA}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshingDA ? 'animate-spin' : ''}`} />
          <span>{isRefreshingDA ? 'Updating DA Scores...' : 'Recalculate All DA'}</span>
        </button>
      </div>
    </div>
  );
};
