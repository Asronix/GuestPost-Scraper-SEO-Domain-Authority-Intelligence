import React, { useState } from 'react';
import { GuestPost } from '../types.ts';
import {
  Search,
  ExternalLink,
  Mail,
  Copy,
  Check,
  Sparkles,
  SlidersHorizontal,
  Download,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  Filter,
  ArrowUpDown,
  Upload
} from 'lucide-react';

interface OpportunitiesViewProps {
  posts: GuestPost[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedNiche: string;
  setSelectedNiche: (n: string) => void;
  minDA: number;
  setMinDA: (da: number) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  hasEmailOnly: boolean;
  setHasEmailOnly: (v: boolean) => void;
  freeOnly: boolean;
  setFreeOnly: (v: boolean) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  onSelectPost: (post: GuestPost) => void;
  onStatusChange: (id: string, newStatus: GuestPost['status']) => void;
  onDeletePost: (id: string) => void;
  onOpenPitchModal: (post: GuestPost) => void;
  onExportCSV: () => void;
  onOpenImportModal: () => void;
  onOpenDownloadModal?: () => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  posts,
  searchQuery,
  setSearchQuery,
  selectedNiche,
  setSelectedNiche,
  minDA,
  setMinDA,
  statusFilter,
  setStatusFilter,
  hasEmailOnly,
  setHasEmailOnly,
  freeOnly,
  setFreeOnly,
  sortBy,
  setSortBy,
  onSelectPost,
  onStatusChange,
  onDeletePost,
  onOpenPitchModal,
  onExportCSV,
  onOpenImportModal,
  onOpenDownloadModal
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getDaBadgeColor = (da: number) => {
    if (da >= 80) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
    if (da >= 60) return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60';
    if (da >= 40) return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
    return 'text-slate-400 bg-slate-900 border-slate-800';
  };

  const getStatusBadge = (status: GuestPost['status']) => {
    switch (status) {
      case 'accepted':
        return 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30';
      case 'pitched':
        return 'text-indigo-400 border-indigo-800/50 bg-indigo-950/30';
      case 'contacted':
        return 'text-cyan-400 border-cyan-800/50 bg-cyan-950/30';
      case 'rejected':
        return 'text-rose-400 border-rose-800/50 bg-rose-950/30';
      case 'new':
      default:
        return 'text-slate-400 border-slate-800 bg-slate-900/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by domain, topic keyword, guidelines, or editor email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Actions & View Switch */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
              title="Import previously scraped sites from CSV or JSON file"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Sites</span>
            </button>

            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
              title="Export all filtered opportunities as a CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 rounded-lg transition-colors whitespace-nowrap"
                title="Download the entire self-contained app as a ZIP file"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download App</span>
              </button>
            )}

            {/* Table / Grid Switch */}
            <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Card grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Domain Authority Slider */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 whitespace-nowrap">Min DA:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={minDA}
              onChange={(e) => setMinDA(parseInt(e.target.value, 10))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono tabular-nums font-semibold text-cyan-300 w-6">
              {minDA > 0 ? `${minDA}+` : 'All'}
            </span>
          </div>

          {/* Niche Selector */}
          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Niches</option>
            <option value="Tech">Technology & Software</option>
            <option value="Marketing">Marketing & SEO</option>
            <option value="Business">Business & Startups</option>
            <option value="Finance">Finance & Investing</option>
            <option value="Health">Health & Wellness</option>
            <option value="Design">Web Design & UX</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Outreach Status</option>
            <option value="new">New (Uncontacted)</option>
            <option value="contacted">Contacted</option>
            <option value="pitched">Pitched</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="da_desc">Domain Authority: High to Low</option>
              <option value="da_asc">Domain Authority: Low to High</option>
              <option value="domain_asc">Domain Name (A-Z)</option>
              <option value="date_desc">Discovery Date: Newest First</option>
            </select>
          </div>

          {/* Quick Toggles */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={hasEmailOnly}
              onChange={(e) => setHasEmailOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-cyan-400 focus:ring-0"
            />
            <span>Has Email</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-cyan-400 focus:ring-0"
            />
            <span>Free Only</span>
          </label>
        </div>
      </div>

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No guest post sites match your filters</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Try adjusting your search keyword, lowering the minimum Domain Authority filter, or launch the scraper to discover fresh guest blogging opportunities.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setMinDA(0);
                setSelectedNiche('all');
                setStatusFilter('all');
                setHasEmailOnly(false);
                setFreeOnly(false);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Table View */}
      {posts.length > 0 && viewMode === 'table' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-4">Domain & Page</th>
                  <th className="py-3 px-4 text-center">Domain Authority</th>
                  <th className="py-3 px-4">Niche</th>
                  <th className="py-3 px-4">Contact / Submission</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Outreach Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => onSelectPost(post)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Domain & Title */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${post.rootDomain}&sz=32`}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-sm shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                          {post.rootDomain}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5" title={post.pageTitle}>
                        {post.pageTitle}
                      </p>
                    </td>

                    {/* Domain Authority Gauge */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums border ${getDaBadgeColor(post.domainAuthority)}`}>
                          DA {post.domainAuthority}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                          PR {post.pageRank}
                        </span>
                      </div>
                    </td>

                    {/* Niche */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                      <span>{post.niche}</span>
                    </td>

                    {/* Contact Email / Form */}
                    <td className="py-3 px-4 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                      {post.contactEmail ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-300 truncate text-[11px]" title={post.contactEmail}>
                            {post.contactEmail}
                          </span>
                          <button
                            onClick={(e) => handleCopy(post.contactEmail!, post.id, e)}
                            className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                            title="Copy email address"
                          >
                            {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <a
                          href={post.submissionUrl || post.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>Submission Form</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>

                    {/* Free or Paid */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] text-slate-400">
                        {post.freeOrPaid}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={post.status}
                        onChange={(e) => onStatusChange(post.id, e.target.value as GuestPost['status'])}
                        className={`text-[11px] font-medium rounded px-2 py-1 border focus:outline-none capitalize ${getStatusBadge(post.status)}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="pitched">Pitched</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenPitchModal(post)}
                          className="px-2 py-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/60 rounded flex items-center gap-1 transition-colors"
                          title="Generate AI Outreach Pitch for this site"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Pitch</span>
                        </button>

                        <a
                          href={post.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Open Write For Us page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => onDeletePost(post.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete opportunity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards View */}
      {posts.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-colors cursor-pointer group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${post.rootDomain}&sz=32`}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-sm shrink-0"
                    />
                    <h4 className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                      {post.rootDomain}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums border shrink-0 ${getDaBadgeColor(post.domainAuthority)}`}>
                    DA {post.domainAuthority}
                  </span>
                </div>

                {/* Title */}
                <p className="text-xs text-slate-300 font-medium mt-1.5 line-clamp-1">
                  {post.pageTitle}
                </p>

                {/* Metadata row */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                  <span>{post.niche}</span>
                  <span aria-hidden="true">·</span>
                  <span>{post.freeOrPaid}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">PR {post.pageRank}</span>
                </div>

                {/* Guidelines Snippet */}
                <p className="text-xs text-slate-400 mt-2.5 line-clamp-3 leading-relaxed">
                  {post.guidelinesSummary}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <select
                    value={post.status}
                    onChange={(e) => onStatusChange(post.id, e.target.value as GuestPost['status'])}
                    className={`text-[11px] font-medium rounded px-2 py-0.5 border focus:outline-none capitalize ${getStatusBadge(post.status)}`}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="pitched">Pitched</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {post.contactEmail && (
                    <button
                      onClick={(e) => handleCopy(post.contactEmail!, post.id, e)}
                      className="text-slate-400 hover:text-cyan-400 p-1"
                      title="Copy email"
                    >
                      {copiedId === post.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Mail className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenPitchModal(post)}
                    className="px-2 py-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/60 rounded flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Pitch</span>
                  </button>

                  <a
                    href={post.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-slate-200"
                    title="Open guidelines"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
