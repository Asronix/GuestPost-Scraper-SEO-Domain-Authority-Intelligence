import React, { useState } from 'react';
import { GuestPost, PitchData } from '../types.ts';
import {
  X,
  ExternalLink,
  Mail,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  Send,
  Loader2,
  Trash2
} from 'lucide-react';

interface OpportunityDrawerProps {
  post: GuestPost | null;
  onClose: () => void;
  onStatusChange: (id: string, status: GuestPost['status']) => void;
  onNotesChange: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
  initialPitchModal?: boolean;
}

export const OpportunityDrawer: React.FC<OpportunityDrawerProps> = ({
  post,
  onClose,
  onStatusChange,
  onNotesChange,
  onDelete
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(post?.notes || '');
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [isGeneratingPitch, setIsGeneratingPitch] = useState<boolean>(false);
  const [pitchError, setPitchError] = useState<string | null>(null);

  if (!post) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleSaveNotes = () => {
    onNotesChange(post.id, notes);
  };

  const handleGeneratePitch = async () => {
    setIsGeneratingPitch(true);
    setPitchError(null);
    try {
      const res = await fetch('/api/ai/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: post.rootDomain,
          pageTitle: post.pageTitle,
          niche: post.niche,
          guidelines: post.guidelinesSummary,
          authorBio: 'Specialist content creator and software practitioner'
        })
      });

      if (!res.ok) throw new Error('Failed to generate pitch');
      const data = await res.json();
      setPitchData({
        pitchAngles: data.pitchAngles || [],
        subjectLine: data.subjectLine || `Guest post submission for ${post.rootDomain}`,
        emailBody: data.emailBody || ''
      });
    } catch (err: any) {
      setPitchError(err?.message || 'Could not generate pitch');
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Top Drawer Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={`https://www.google.com/s2/favicons?domain=${post.rootDomain}&sz=32`}
              alt=""
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-sm"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h3 className="text-base font-bold text-white font-sans">{post.rootDomain}</h3>
              <p className="text-xs text-slate-400">Verified Guest Post Opportunity</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(post.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Delete record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* SEO Authority Scorecard */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Domain Authority</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-cyan-400 mt-1 block">
                {post.domainAuthority}/100
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{post.seoProvider} SEO</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">PageRank Scale</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-indigo-400 mt-1 block">
                {post.pageRank}
              </span>
              <span className="text-[10px] text-slate-500">Scale 0 - 10</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Compensation</span>
              <span className="text-sm font-semibold text-emerald-400 mt-2 block truncate">
                {post.freeOrPaid}
              </span>
              <span className="text-[10px] text-slate-500">Verified Term</span>
            </div>
          </div>

          {/* Core Info Details */}
          <div className="space-y-3 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
            <div>
              <span className="text-slate-400 block mb-1">Page Title</span>
              <div className="text-slate-200 font-medium text-sm leading-snug">
                {post.pageTitle}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
              <div>
                <span className="text-slate-400 block mb-1">Niche Category</span>
                <span className="text-slate-200 font-semibold">{post.niche}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Outreach Status</span>
                <select
                  value={post.status}
                  onChange={(e) => onStatusChange(post.id, e.target.value as GuestPost['status'])}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 capitalize focus:outline-none focus:border-cyan-400"
                >
                  <option value="new">New (Uncontacted)</option>
                  <option value="contacted">Contacted</option>
                  <option value="pitched">Pitched Topics</option>
                  <option value="accepted">Accepted / In Draft</option>
                  <option value="rejected">Rejected / Inactive</option>
                </select>
              </div>
            </div>

            {/* Direct Links */}
            <div className="pt-2 border-t border-slate-800/60 space-y-2">
              <div>
                <span className="text-slate-400 block mb-1">Guidelines URL</span>
                <div className="flex items-center gap-2">
                  <a
                    href={post.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline truncate font-mono text-[11px] flex-1"
                  >
                    {post.pageUrl}
                  </a>
                  <button
                    onClick={() => handleCopy(post.pageUrl, 'pageUrl')}
                    className="text-slate-400 hover:text-slate-200 p-1"
                    title="Copy URL"
                  >
                    {copiedField === 'pageUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={post.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {post.submissionUrl && post.submissionUrl !== post.pageUrl && (
                <div>
                  <span className="text-slate-400 block mb-1">Direct Submission Form</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={post.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline truncate font-mono text-[11px] flex-1"
                    >
                      {post.submissionUrl}
                    </a>
                    <a
                      href={post.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Email */}
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-400 block mb-1">Editorial Contact Email</span>
              {post.contactEmail ? (
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono text-slate-200 text-xs">{post.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(post.contactEmail!, 'email')}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 transition-colors"
                    >
                      {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={`mailto:${post.contactEmail}?subject=${encodeURIComponent(`Guest post pitch for ${post.rootDomain}`)}`}
                      className="px-2 py-1 text-[11px] font-medium bg-cyan-950 text-cyan-400 border border-cyan-800 rounded hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              ) : (
                <span className="text-slate-500 italic">No email found on page. Check submission form.</span>
              )}
            </div>
          </div>

          {/* Extracted Guidelines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Extracted Contributor Guidelines</span>
              </span>
              <button
                onClick={() => handleCopy(post.guidelinesSummary, 'guidelines')}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
              >
                {copiedField === 'guidelines' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Summary</span>
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-300 leading-relaxed text-xs">
              {post.guidelinesSummary}
            </div>
          </div>

          {/* AI Pitch Generator Section */}
          <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-cyan-900/40 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">AI Pitch & Outreach Generator</h4>
                  <p className="text-[11px] text-slate-400">Generates 3 customized topic angles & editor email</p>
                </div>
              </div>

              <button
                onClick={handleGeneratePitch}
                disabled={isGeneratingPitch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isGeneratingPitch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Pitch</span>
                  </>
                )}
              </button>
            </div>

            {pitchError && (
              <div className="p-2 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {pitchError}
              </div>
            )}

            {pitchData && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                {/* 3 Pitch Angles */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-cyan-300">Suggested Pitch Angles:</span>
                  {pitchData.pitchAngles.map((angle, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                      <div className="font-semibold text-slate-100 flex items-start gap-1.5">
                        <span className="text-cyan-400 font-mono">0{idx + 1}.</span>
                        <span>{angle.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] pl-4">{angle.synopsis}</p>
                      <p className="text-slate-500 text-[10px] pl-4">Key Value: {angle.takeaways}</p>
                    </div>
                  ))}
                </div>

                {/* Email Subject */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Recommended Subject:</span>
                    <button
                      onClick={() => handleCopy(pitchData.subjectLine, 'subject')}
                      className="text-slate-400 hover:text-cyan-400 text-[10px] flex items-center gap-1"
                    >
                      {copiedField === 'subject' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-200">
                    {pitchData.subjectLine}
                  </div>
                </div>

                {/* Email Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 font-medium">Outreach Email Draft:</span>
                    <button
                      onClick={() => handleCopy(pitchData.emailBody, 'emailBody')}
                      className="text-slate-400 hover:text-cyan-400 text-[10px] flex items-center gap-1"
                    >
                      {copiedField === 'emailBody' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Full Email</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {pitchData.emailBody}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Notes & Progress Tracker */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Outreach Notes & Log</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Record notes on editorial response, proposed topics, or follow-up dates..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Auto-saved on blur</span>
              <span>Discovered {new Date(post.discoveredAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
