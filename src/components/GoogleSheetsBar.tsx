import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  UploadCloud,
  DownloadCloud,
  PlusCircle,
  Link as LinkIcon,
  Key,
  Copy,
  Check
} from 'lucide-react';
import {
  createCentralizedSpreadsheet,
  syncAllToGoogleSheet,
  pullFromGoogleSheet
} from '../services/sheetsService.ts';
import { GuestPost } from '../types.ts';
import firebaseConfig from '../../firebase-applet-config.json';

interface GoogleSheetsBarProps {
  user: User | null;
  accessToken: string | null;
  centralizedSheetId: string;
  centralizedSheetUrl: string;
  posts: GuestPost[];
  isAutoSyncing?: boolean;
  autoSyncedCount?: number;
  lastAutoSyncedDomain?: string;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSheetConfigured: (id: string, url: string) => void;
  onDataPulledFromSheet: (pulledPosts: Partial<GuestPost>[]) => void;
  onDirectTokenConnect?: (token: string) => Promise<void>;
}

export const GoogleSheetsBar: React.FC<GoogleSheetsBarProps> = ({
  user,
  accessToken,
  centralizedSheetId,
  centralizedSheetUrl,
  posts,
  isAutoSyncing = false,
  autoSyncedCount = 0,
  lastAutoSyncedDomain = '',
  onSignIn,
  onSignOut,
  onSheetConfigured,
  onDataPulledFromSheet,
  onDirectTokenConnect
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [directToken, setDirectToken] = useState('');
  const [showOriginHelper, setShowOriginHelper] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-t5igoxahoj4amzfd4wxfyx-489945197747.asia-east1.run.app';

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 6000);
  };

  const handleCopyOrigin = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2500);
    }
  };

  const handleSignInClick = async () => {
    if (isSigningIn || isProcessing) return;
    setIsSigningIn(true);
    try {
      await onSignIn();
    } catch (err: any) {
      if (err?.message === 'ORIGIN_MISMATCH' || err?.message?.includes('origin_mismatch') || err?.message === 'UNAUTHORIZED_DOMAIN') {
        setShowOriginHelper(true);
      } else {
        showNotification('error', err?.message || 'Google Sign-In failed');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleConnectToken = async () => {
    if (!directToken.trim()) return;
    if (!onDirectTokenConnect) return;

    setIsProcessing(true);
    try {
      await onDirectTokenConnect(directToken.trim());
      setShowTokenInput(false);
      setShowOriginHelper(false);
      setDirectToken('');
      showNotification('success', 'Connected with Google Access Token! Auto-sync is active.');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to connect token');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!accessToken) {
      showNotification('error', 'Please sign in with Google first.');
      return;
    }

    setIsProcessing(true);
    try {
      const { spreadsheetId, spreadsheetUrl } = await createCentralizedSpreadsheet(
        accessToken,
        'GuestPost Radar — Centralized Opportunities Database'
      );

      // Push all current posts if any exist
      if (posts.length > 0) {
        await syncAllToGoogleSheet(accessToken, spreadsheetId, posts);
      }

      // Save to server
      await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centralizedSheetId: spreadsheetId,
          centralizedSheetUrl: spreadsheetUrl
        })
      });

      onSheetConfigured(spreadsheetId, spreadsheetUrl);
      showNotification('success', 'Centralized Google Sheet created and linked successfully!');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to create Google Sheet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLinkManual = async () => {
    let sheetId = manualSheetInput.trim();
    if (!sheetId) return;

    // Support full URL pasting
    if (sheetId.includes('/d/')) {
      const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      }
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

    setIsProcessing(true);
    try {
      await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centralizedSheetId: sheetId,
          centralizedSheetUrl: sheetUrl
        })
      });

      onSheetConfigured(sheetId, sheetUrl);
      setShowManualInput(false);
      showNotification('success', 'Existing Google Sheet linked as centralized database!');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to link Google Sheet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePushAll = async () => {
    if (!accessToken || !centralizedSheetId) return;

    // User confirmation for mutating/overwriting data per Workspace skill requirements
    const confirmed = window.confirm(
      `Push all ${posts.length} scraped opportunities to your centralized Google Sheet? This will update the rows in your spreadsheet.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await syncAllToGoogleSheet(accessToken, centralizedSheetId, posts);
      showNotification('success', `Synced ${posts.length} records to your centralized Google Sheet!`);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to sync to Google Sheet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullAll = async () => {
    if (!accessToken || !centralizedSheetId) return;

    setIsProcessing(true);
    try {
      const pulled = await pullFromGoogleSheet(accessToken, centralizedSheetId);
      onDataPulledFromSheet(pulled);
      showNotification('success', `Retrieved ${pulled.length} rows from your Google Sheet!`);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to pull from Google Sheet');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-xs shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Branding & Status */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white">Centralized Google Sheets Storage</h3>
              {centralizedSheetId && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Default Sheet Linked
                </span>
              )}
              {user ? (
                isAutoSyncing ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                    <span>Auto-syncing to Sheet...</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Auto-Sync: Active (Zero clicks needed)</span>
                    {autoSyncedCount > 0 && <span className="text-emerald-300 font-bold">({autoSyncedCount} synced)</span>}
                  </span>
                )
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/70 text-amber-300 border border-amber-800">
                  Auto-Sync Ready (Connect below)
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
              Default centralized spreadsheet is connected. Newly scanned websites automatically sync to your Google Sheet in real time without needing to click Sync.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
          {!user ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Official Google Sign In Button */}
              <button
                onClick={handleSignInClick}
                disabled={isSigningIn || isProcessing}
                className="inline-flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-md active:scale-95"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                    <span>Connecting Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span>Connect Google Sheets</span>
                  </>
                )}
              </button>

              {/* Direct Token Toggle Button */}
              <button
                onClick={() => setShowTokenInput(!showTokenInput)}
                className={`p-2 rounded-xl border transition-colors ${
                  showTokenInput
                    ? 'bg-cyan-950 border-cyan-800 text-cyan-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title="Connect directly using an Access Token"
              >
                <Key className="w-4 h-4" />
              </button>

              {/* Origin Helper Toggle Button */}
              <button
                onClick={() => setShowOriginHelper(!showOriginHelper)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 ${
                  showOriginHelper
                    ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title="Troubleshoot OAuth Error 400: origin_mismatch"
              >
                <span>OAuth Origin Guide</span>
              </button>
            </div>
          ) : !centralizedSheetId ? (
            /* User signed in, create or link sheet */
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateSheet}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-all shadow-md active:scale-95"
              >
                {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>Create Centralized Sheet</span>
              </button>

              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                title="Link existing Google Sheet ID"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onSignOut}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                title={`Signed in as ${user.email}. Click to sign out.`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Centralized Sheet Connected */
            <div className="flex items-center gap-2">
              <a
                href={centralizedSheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-xl transition-colors"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handlePushAll}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                title="Push all current opportunities to Google Sheets"
              >
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sync Now</span>
              </button>

              <button
                onClick={handlePullAll}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
                title="Pull rows and updates from Google Sheets"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pull from Sheet</span>
              </button>

              <button
                onClick={onSignOut}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
                title={`Connected as ${user.email}. Click to disconnect.`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Direct Token Input Drawer */}
      {showTokenInput && !user && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/60 p-3.5 rounded-xl border border-cyan-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-1.5 text-xs">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              Direct Google Access Token
            </span>
            <span className="text-[11px] text-slate-400">
              Immediate connection without GCP console authorization
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={directToken}
              onChange={(e) => setDirectToken(e.target.value)}
              placeholder="Paste Google Access Token (ya29....)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleConnectToken}
              disabled={!directToken.trim() || isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Connect</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Tip: You can generate an access token from Google OAuth 2.0 Playground or via <code className="text-cyan-400 font-mono">gcloud auth print-access-token</code> with Google Sheets scopes.
          </p>
        </div>
      )}

      {/* Origin Helper Guide (for Error 400: origin_mismatch) */}
      {showOriginHelper && !user && (
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 bg-amber-950/20 p-4 rounded-xl border border-amber-900/50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>How to Resolve Google OAuth "Error 400: origin_mismatch"</span>
            </div>
            <button
              onClick={() => setShowOriginHelper(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Google OAuth requires that the website's exact URL origin is registered in your Google Cloud Console project. Because preview URLs have specific domain origins, register the following origin in your Google Cloud Console:
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-400">Current App Origin (Copy this):</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentOrigin}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono select-all"
              />
              <button
                onClick={handleCopyOrigin}
                className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {copiedOrigin ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copy Origin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
            <p className="font-semibold text-white">Steps in Google Cloud Console:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>
                Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">Google Cloud Console &gt; APIs &amp; Services &gt; Credentials <ExternalLink className="w-2.5 h-2.5 inline" /></a> for project <strong className="text-slate-200">{firebaseConfig.projectId}</strong>.
              </li>
              <li>Under <strong className="text-slate-200">OAuth 2.0 Client IDs</strong>, click your client: <code className="text-slate-300 font-mono text-[10px] break-all">{firebaseConfig.oAuthClientId}</code></li>
              <li>Under <strong className="text-slate-200">Authorized JavaScript origins</strong>, click <em>+ ADD URI</em> and paste the copied URL above.</li>
              <li>Click <strong className="text-slate-200">Save</strong>. Within a few moments, click <strong className="text-slate-200">Connect Google Sheets</strong> above to complete sign-in.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Manual Sheet Link Input */}
      {showManualInput && !centralizedSheetId && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <input
            type="text"
            value={manualSheetInput}
            onChange={(e) => setManualSheetInput(e.target.value)}
            placeholder="Paste Google Sheet URL or ID (e.g. https://docs.google.com/spreadsheets/d/1BxiMVs...)"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleLinkManual}
            disabled={!manualSheetInput.trim() || isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-colors"
          >
            Link Sheet
          </button>
        </div>
      )}

      {/* Live Feedback */}
      {statusMsg && (
        <div
          className={`mt-3 p-3 rounded-xl border flex items-center gap-2 text-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};
