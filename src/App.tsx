import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { GuestPost, ScraperState, DashboardStats, AppSettings } from './types.ts';
import { Header } from './components/Header.tsx';
import { StatsBar } from './components/StatsBar.tsx';
import { OpportunitiesView } from './components/OpportunitiesView.tsx';
import { LiveConsole } from './components/LiveConsole.tsx';
import { ScraperModal } from './components/ScraperModal.tsx';
import { ManualAddModal } from './components/ManualAddModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { OpportunityDrawer } from './components/OpportunityDrawer.tsx';
import { SeoSettingsModal } from './components/SeoSettingsModal.tsx';
import { SeleniumExportView } from './components/SeleniumExportView.tsx';
import { GoogleSheetsBar } from './components/GoogleSheetsBar.tsx';
import { DownloadAppModal } from './components/DownloadAppModal.tsx';
import { initAuth, googleSignIn, logout, setAccessTokenInMemory, connectWithDirectToken } from './services/firebaseAuth.ts';
import { appendToGoogleSheet, pullFromGoogleSheet } from './services/sheetsService.ts';
import { CheckCircle2, ShieldCheck, AlertCircle, Square, Clock, Terminal } from 'lucide-react';

const DEFAULT_SHEET_ID = '1e7_9mm7FtQJJnlG-oVOaRjS7JJeRoa0ROZSMCc9BMX4';
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1e7_9mm7FtQJJnlG-oVOaRjS7JJeRoa0ROZSMCc9BMX4/edit?gid=1626117545#gid=1626117545';

export default function App() {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'console' | 'selenium' | 'settings'>('opportunities');

  // Opportunities & Stats State
  const [posts, setPosts] = useState<GuestPost[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    uniqueDomains: 0,
    highDA: 0,
    withEmail: 0,
    paidCount: 0,
    freeCount: 0,
    filteredCount: 0
  });
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNiche, setSelectedNiche] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [minDA, setMinDA] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hasEmailOnly, setHasEmailOnly] = useState<boolean>(false);
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('da_desc');

  // Modals & Drawers
  const [isScraperModalOpen, setIsScraperModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<GuestPost | null>(null);

  // Google Sheets & Centralized Storage State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [centralizedSheetId, setCentralizedSheetId] = useState<string>(DEFAULT_SHEET_ID);
  const [centralizedSheetUrl, setCentralizedSheetUrl] = useState<string>(DEFAULT_SHEET_URL);

  // Auto-Sync Engine State & Refs
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [autoSyncedCount, setAutoSyncedCount] = useState<number>(0);
  const [lastAutoSyncedDomain, setLastAutoSyncedDomain] = useState<string>('');
  const syncedDomainsRef = useRef<Set<string>>(new Set());
  const isAutoSyncInProgressRef = useRef<boolean>(false);

  // Scraper State & Poller
  const [scraperState, setScraperState] = useState<ScraperState>({
    isRunning: false,
    jobId: null,
    mode: 'idle',
    isContinuous: true,
    progress: 0,
    totalTargets: 0,
    scannedCount: 0,
    foundCount: 0,
    duplicateCount: 0,
    queueSize: 0,
    currentUrl: '',
    startTime: null,
    elapsedSeconds: 0,
    logs: []
  });

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    seoProvider: 'algorithmic',
    openPageRankKey: '',
    mozAccessId: '',
    mozSecretKey: '',
    crawlerUserAgent: '',
    autoDeduplicate: true
  });

  // Notification Banner
  const [banner, setBanner] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState<boolean>(false);

  const showBanner = (type: 'success' | 'info' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4500);
  };

  // Fetch Opportunities
  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedNiche !== 'all') params.append('niche', selectedNiche);
      if (selectedCountry !== 'all') params.append('country', selectedCountry);
      if (minDA > 0) params.append('minDA', minDA.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (hasEmailOnly) params.append('hasEmail', 'true');
      if (freeOnly) params.append('feeStatus', 'free');
      if (sortBy) params.append('sortBy', sortBy);

      const res = await fetch(`/api/guestposts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.data || []);
        setStats(data.stats || {
          total: 0,
          uniqueDomains: 0,
          highDA: 0,
          withEmail: 0,
          paidCount: 0,
          freeCount: 0,
          filteredCount: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [searchQuery, selectedNiche, selectedCountry, minDA, statusFilter, hasEmailOnly, freeOnly, sortBy]);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {}
  };

  // Poll Scraper Status
  const pollScraperStatus = async () => {
    try {
      const res = await fetch('/api/scraper/status');
      if (res.ok) {
        const data: ScraperState = await res.json();
        setScraperState(data);
      }
    } catch {}
  };

  // Fetch Centralized Google Sheets Config
  const fetchSheetsConfig = async () => {
    try {
      const res = await fetch('/api/sheets/config');
      if (res.ok) {
        const data = await res.json();
        setCentralizedSheetId(data.centralizedSheetId || '');
        setCentralizedSheetUrl(data.centralizedSheetUrl || '');
      }
    } catch {}
  };

  // Google Sign-In & Disconnect Handlers
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setAuthUser(res.user);
        setGoogleAccessToken(res.accessToken);
        showBanner('success', `Signed in as ${res.user.email}. Google Sheets storage connected!`);
      }
    } catch (err: any) {
      if (err?.message === 'ORIGIN_MISMATCH' || err?.message === 'UNAUTHORIZED_DOMAIN') {
        showBanner('error', 'Google OAuth Origin Mismatch: please see the setup details in the Google Sheets panel below.');
      } else {
        showBanner('error', err?.message || 'Google Sign-In failed');
      }
    }
  };

  const handleDirectTokenConnect = async (token: string) => {
    try {
      const res = await connectWithDirectToken(token);
      setAuthUser(res.user);
      setGoogleAccessToken(res.accessToken);
      showBanner('success', `Connected with Google Access Token! Google Sheets auto-sync is active.`);
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to authenticate with direct token');
      throw err;
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setAuthUser(null);
      setGoogleAccessToken(null);
      showBanner('info', 'Disconnected Google Account.');
    } catch {}
  };

  const handleDataPulledFromSheet = async (pulledPosts: Partial<GuestPost>[]) => {
    if (!pulledPosts || pulledPosts.length === 0) {
      showBanner('info', 'Google Sheet has no opportunity rows.');
      return;
    }
    try {
      const res = await fetch('/api/guestposts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: pulledPosts,
          updateDuplicates: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        fetchPosts();
        showBanner('success', `Synchronized with Google Sheets! Merged ${data.addedCount} new sites (${data.updatedCount} updated).`);
      }
    } catch (err: any) {
      showBanner('error', 'Failed to merge data from Google Sheet');
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchSettings();
    fetchSheetsConfig();

    // Initialize Firebase Auth listener
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthUser(user);
        setGoogleAccessToken(token);
      },
      () => {
        setAuthUser(null);
        setGoogleAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, [fetchPosts]);

  // Dynamic Polling for Scraper Status
  useEffect(() => {
    pollScraperStatus();
    const interval = setInterval(() => {
      pollScraperStatus();
      if (scraperState.isRunning) {
        fetchPosts(); // Refresh database live during active crawling
      }
    }, scraperState.isRunning ? 1000 : 3500);

    return () => clearInterval(interval);
  }, [scraperState.isRunning, fetchPosts]);

  // 1. Initial Google Sheets Sync State: Read existing rows from Sheet to prevent duplicates
  useEffect(() => {
    if (!googleAccessToken || !centralizedSheetId) return;

    let isSubscribed = true;
    const fetchExistingSheetDomains = async () => {
      try {
        const sheetRows = await pullFromGoogleSheet(googleAccessToken, centralizedSheetId);
        if (!isSubscribed) return;
        sheetRows.forEach(row => {
          if (row.domain) syncedDomainsRef.current.add(row.domain.toLowerCase());
          if (row.rootDomain) syncedDomainsRef.current.add(row.rootDomain.toLowerCase());
        });
      } catch (err: any) {
        console.warn('Initial sheet domain check notice:', err?.message);
      }
    };

    fetchExistingSheetDomains();
    return () => {
      isSubscribed = false;
    };
  }, [googleAccessToken, centralizedSheetId]);

  // 2. Real-time Background Auto-Sync: Automatically streams newly scanned sites to Google Sheets
  useEffect(() => {
    if (!googleAccessToken || !centralizedSheetId || posts.length === 0) return;

    // Filter posts that are not yet marked as synced to the Google Sheet
    const unsyncedPosts = posts.filter(p => {
      const root = p.rootDomain.toLowerCase();
      const dom = p.domain.toLowerCase();
      return !syncedDomainsRef.current.has(root) && !syncedDomainsRef.current.has(dom);
    });

    if (unsyncedPosts.length === 0 || isAutoSyncInProgressRef.current) return;

    const performAutoSync = async () => {
      isAutoSyncInProgressRef.current = true;
      setIsAutoSyncing(true);

      // Pre-mark domains to avoid redundant parallel calls while append fetch is pending
      unsyncedPosts.forEach(p => {
        syncedDomainsRef.current.add(p.rootDomain.toLowerCase());
        syncedDomainsRef.current.add(p.domain.toLowerCase());
      });

      try {
        await appendToGoogleSheet(googleAccessToken, centralizedSheetId, unsyncedPosts);
        setAutoSyncedCount(prev => prev + unsyncedPosts.length);
        setLastAutoSyncedDomain(unsyncedPosts[0]?.domain || '');
      } catch (err: any) {
        console.warn('Auto-sync append error:', err?.message);
        // Unmark so they can retry on subsequent scan cycles
        unsyncedPosts.forEach(p => {
          syncedDomainsRef.current.delete(p.rootDomain.toLowerCase());
          syncedDomainsRef.current.delete(p.domain.toLowerCase());
        });
      } finally {
        setIsAutoSyncing(false);
        isAutoSyncInProgressRef.current = false;
      }
    };

    performAutoSync();
  }, [posts, googleAccessToken, centralizedSheetId]);

  // Handle Start Scraper
  const handleStartScraper = async (options: any) => {
    try {
      const res = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await res.json();
      if (res.ok) {
        setIsScraperModalOpen(false);
        setActiveTab('console');
        showBanner('info', 'Continuous crawler started! Crawling indefinitely until you click Stop.');
        pollScraperStatus();
      } else {
        showBanner('error', data.error || 'Failed to start scraper');
      }
    } catch (err: any) {
      showBanner('error', err?.message || 'Network error starting scraper');
    }
  };

  // Handle Stop Scraper
  const handleStopScraper = async () => {
    try {
      await fetch('/api/scraper/stop', { method: 'POST' });
      showBanner('info', 'Stop command sent. Crawler halted.');
      pollScraperStatus();
      fetchPosts();
    } catch {}
  };

  // Handle Deduplicate Audit Action
  const handleDeduplicate = async () => {
    setIsDeduplicating(true);
    try {
      const res = await fetch('/api/guestposts/deduplicate', { method: 'POST' });
      const data = await res.json();
      if (data.duplicatesRemoved > 0) {
        showBanner('success', `Deduplication complete! Removed ${data.duplicatesRemoved} duplicate root domains. All records now 100% unique.`);
      } else {
        showBanner('success', `Database integrity verified: 0 duplicates found across all ${data.uniqueCount} root domains.`);
      }
      fetchPosts();
    } catch (err) {
      showBanner('error', 'Error running deduplication audit');
    } finally {
      setIsDeduplicating(false);
    }
  };

  // Handle Manual Add Site
  const handleAddSite = async (payload: {
    url: string;
    niche: string;
    contactEmail?: string;
    guidelines?: string;
    feeStatus?: string;
  }) => {
    try {
      const res = await fetch('/api/guestposts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        fetchPosts();
        return { success: true };
      } else {
        return { success: false, message: data.message || data.error };
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error' };
    }
  };

  // Handle Status Change
  const handleStatusChange = async (id: string, newStatus: GuestPost['status']) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    if (selectedPost && selectedPost.id === id) {
      setSelectedPost(prev => prev ? { ...prev, status: newStatus } : null);
    }
    try {
      await fetch(`/api/guestposts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchPosts();
    } catch {}
  };

  // Handle Notes Change
  const handleNotesChange = async (id: string, notes: string) => {
    try {
      await fetch(`/api/guestposts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      fetchPosts();
    } catch {}
  };

  // Handle Delete Post
  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Remove this guest post site from your database?')) return;
    try {
      await fetch(`/api/guestposts/${id}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
      fetchPosts();
      showBanner('info', 'Opportunity removed.');
    } catch {}
  };

  // Handle Save Settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        showBanner('success', 'SEO settings updated.');
      }
    } catch {}
  };

  // Handle Bulk DA Refresh
  const handleRefreshAllDA = async () => {
    const res = await fetch('/api/seo/refresh-all', { method: 'POST' });
    const data = await res.json();
    fetchPosts();
    return data.updatedCount || 0;
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    window.location.href = '/api/export/csv';
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white pb-20 sm:pb-6">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScraperModal={() => setIsScraperModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onDeduplicate={handleDeduplicate}
        onStopScraper={handleStopScraper}
        isDeduplicating={isDeduplicating}
        isScraperRunning={scraperState.isRunning}
        elapsedSeconds={scraperState.elapsedSeconds}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Banner Alert if any */}
        {banner && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all shadow-md ${
              banner.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : banner.type === 'error'
                ? 'bg-rose-950/70 border-rose-800 text-rose-200'
                : 'bg-cyan-950/70 border-cyan-800 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : banner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
              )}
              <span>{banner.message}</span>
            </div>
            <button
              onClick={() => setBanner(null)}
              className="text-slate-400 hover:text-white text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Centralized Google Sheets Integration Bar */}
        <GoogleSheetsBar
          user={authUser}
          accessToken={googleAccessToken}
          centralizedSheetId={centralizedSheetId}
          centralizedSheetUrl={centralizedSheetUrl}
          posts={posts}
          isAutoSyncing={isAutoSyncing}
          autoSyncedCount={autoSyncedCount}
          lastAutoSyncedDomain={lastAutoSyncedDomain}
          onSignIn={handleGoogleSignIn}
          onSignOut={handleGoogleSignOut}
          onSheetConfigured={(id, url) => {
            setCentralizedSheetId(id);
            setCentralizedSheetUrl(url);
          }}
          onDataPulledFromSheet={handleDataPulledFromSheet}
          onDirectTokenConnect={handleDirectTokenConnect}
        />

        {/* Stats Strip */}
        <StatsBar stats={stats} seoProvider={settings.seoProvider} />

        {/* View Content depending on activeTab */}
        {activeTab === 'opportunities' && (
          <OpportunitiesView
            posts={posts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedNiche={selectedNiche}
            setSelectedNiche={setSelectedNiche}
            minDA={minDA}
            setMinDA={setMinDA}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            hasEmailOnly={hasEmailOnly}
            setHasEmailOnly={setHasEmailOnly}
            freeOnly={freeOnly}
            setFreeOnly={setFreeOnly}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onSelectPost={(post) => setSelectedPost(post)}
            onStatusChange={handleStatusChange}
            onDeletePost={handleDeletePost}
            onOpenPitchModal={(post) => setSelectedPost(post)}
            onExportCSV={handleExportCSV}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          />
        )}

        {activeTab === 'console' && (
          <LiveConsole
            scraperState={scraperState}
            onStopScraper={handleStopScraper}
            onLaunchClick={() => setIsScraperModalOpen(true)}
          />
        )}

        {activeTab === 'selenium' && <SeleniumExportView />}

        {activeTab === 'settings' && (
          <SeoSettingsModal
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onRefreshAllDA={handleRefreshAllDA}
          />
        )}
      </main>

      {/* Floating Bottom Bar when Scraper is Running */}
      {scraperState.isRunning && (
        <aside 
          aria-label="Active crawler controller"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-rose-500/40 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 text-xs max-w-xl w-[94%] justify-between"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <div className="truncate">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>Crawling Indefinitely</span>
                <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                  ({formatSeconds(scraperState.elapsedSeconds)})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {scraperState.foundCount} verified sites saved · {scraperState.duplicateCount} duplicates blocked
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('console')}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Console</span>
            </button>

            <button
              onClick={handleStopScraper}
              title="Click to stop crawling now"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Crawler</span>
            </button>
          </div>
        </aside>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>GuestPost Scraper & SEO Intelligence — 100% Free Domain Authority & Duplicate Filtering</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Algorithmic DA + OpenPageRank + Moz APIs</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Pill Anti-Slop Interface</span>
          </div>
        </div>
      </footer>

      {/* Scraper Configuration Modal */}
      <ScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
        onStartScraper={handleStartScraper}
        isLoading={scraperState.isRunning}
      />

      {/* Manual Add Modal */}
      <ManualAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSite={handleAddSite}
      />

      {/* Import Previously Scraped Sites Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingPosts={posts}
        onImportSuccess={(res) => {
          fetchPosts();
          showBanner(
            'success',
            `Import complete! Added ${res.addedCount} new sites${
              res.updatedCount > 0 ? `, updated ${res.updatedCount}` : ''
            }. ${res.duplicatesSkipped > 0 ? `${res.duplicatesSkipped} duplicates skipped.` : ''}`
          );
        }}
      />

      {/* Opportunity Detail & AI Pitch Drawer */}
      <OpportunityDrawer
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onStatusChange={handleStatusChange}
        onNotesChange={handleNotesChange}
        onDelete={handleDeletePost}
      />

      {/* Download Entire App Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
}
