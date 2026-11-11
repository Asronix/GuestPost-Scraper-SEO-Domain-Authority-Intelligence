import React, { useState } from 'react';
import { X, Plus, Globe, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { analyzeDomain } from '../utils/domainUtils.ts';

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSite: (data: {
    url: string;
    niche: string;
    contactEmail?: string;
    guidelines?: string;
    feeStatus?: string;
  }) => Promise<{ success: boolean; message?: string }>;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  isOpen,
  onClose,
  onAddSite
}) => {
  const [url, setUrl] = useState('');
  const [niche, setNiche] = useState('Beauty & Skincare');
  const [contactEmail, setContactEmail] = useState('');
  const [feeStatus, setFeeStatus] = useState('Free Submission');
  const [guidelines, setGuidelines] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string; suggestedApex?: string } | null>(null);

  if (!isOpen) return null;

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (!val.trim()) {
      setFeedback(null);
      return;
    }
    const analysis = analyzeDomain(val.trim());
    if (analysis && analysis.isGov) {
      setFeedback({
        type: 'error',
        message: `Government websites (.gov) do not accept commercial guest posts and are not permitted.`
      });
    } else if (analysis && analysis.isSubdomain) {
      setFeedback({
        type: 'error',
        message: `Subdomains are not permitted. Opportunities only accept apex root domains.`,
        suggestedApex: analysis.apex
      });
    } else {
      if (feedback?.type === 'error') {
        setFeedback(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const analysis = analyzeDomain(url.trim());
    if (analysis && analysis.isGov) {
      setFeedback({
        type: 'error',
        message: `The domain '${analysis.host}' is a government website (.gov). Government sites do not accept guest posts and are excluded.`
      });
      return;
    }

    if (analysis && analysis.isSubdomain) {
      setFeedback({
        type: 'error',
        message: `The domain '${analysis.host}' is a subdomain. Subdomains are filtered out—please use apex root domain '${analysis.apex}'.`,
        suggestedApex: analysis.apex
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await onAddSite({
      url: url.trim(),
      niche,
      contactEmail: contactEmail.trim() || undefined,
      feeStatus,
      guidelines: guidelines.trim() || undefined
    });

    setIsSubmitting(false);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Website added and verified!' });
      setTimeout(() => {
        setUrl('');
        setContactEmail('');
        setGuidelines('');
        setFeedback(null);
        onClose();
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: result.message || 'Failed to add website' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Add Guest Post Website</h3>
              <p className="text-xs text-slate-400">Auto-evaluates Domain Authority & blocks duplicate domains</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {feedback && (
            <div
              className={`p-3 rounded-lg border flex flex-col gap-2 ${
                feedback.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                <span>{feedback.message}</span>
              </div>
              {feedback.suggestedApex && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl(feedback.suggestedApex!);
                    setFeedback(null);
                  }}
                  className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-700/80 rounded-md transition-colors"
                >
                  <span>Use apex root domain: <strong>{feedback.suggestedApex}</strong></span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Website URL or Guidelines Page *
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="e.g. techcrunch.com or https://site.com/write-for-us"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Niche / Category
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Beauty & Skincare">Beauty & Skincare</option>
                <option value="Technology & Software">Technology & Software</option>
                <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                <option value="Business & Startups">Business & Startups</option>
                <option value="Finance & Investing">Finance & Investing</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Web Design & UX">Web Design & UX</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Author Compensation
              </label>
              <select
                value={feeStatus}
                onChange={(e) => setFeeStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Free Submission">Free Submission</option>
                <option value="Paid Contributor">Paid Contributor</option>
                <option value="Sponsored Post">Sponsored Post</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Editorial Contact Email (Optional)
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="editor@domain.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Editorial Guidelines Summary (Optional)
            </label>
            <textarea
              rows={3}
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder="e.g. 1500+ words, non-promotional do-follow backlink in bio..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Evaluating...' : 'Save & Check DA'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
