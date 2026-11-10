import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GuestPost } from '../types.ts';
import { analyzeDomain } from '../utils/domainUtils.ts';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPosts: GuestPost[];
  onImportSuccess: (result: { addedCount: number; duplicatesSkipped: number; updatedCount: number }) => void;
}

interface ParsedImportRow {
  domain: string;
  rootDomain: string;
  domainAuthority?: number;
  pageRank?: number;
  niche?: string;
  pageUrl?: string;
  contactEmail?: string;
  submissionUrl?: string;
  freeOrPaid?: string;
  status?: GuestPost['status'];
  discoveredAt?: string;
  guidelinesSummary?: string;
  isDuplicate: boolean;
  isSubdomain: boolean;
  isCcTldDuplicate: boolean;
  isGov: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  existingPosts,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const existingDomainSet = new Set(existingPosts.map(p => p.rootDomain.toLowerCase()));

  // Robust CSV parser supporting quotes, commas and newlines
  const parseCSV = (csvText: string): Record<string, string>[] => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        if (currentLine.trim()) lines.push(currentLine);
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine);

    if (lines.length < 2) return [];

    // Parse headers
    const parseLineToCells = (line: string): string[] => {
      const cells: string[] = [];
      let cell = '';
      let inside = false;
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        const next = line[j + 1];
        if (c === '"' && inside && next === '"') {
          cell += '"';
          j++;
        } else if (c === '"') {
          inside = !inside;
        } else if (c === ',' && !inside) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += c;
        }
      }
      cells.push(cell.trim());
      return cells;
    };

    const headerCells = parseLineToCells(lines[0]).map(h => h.trim().toLowerCase());
    const records: Record<string, string>[] = [];

    for (let k = 1; k < lines.length; k++) {
      const cells = parseLineToCells(lines[k]);
      if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;
      const row: Record<string, string> = {};
      headerCells.forEach((header, idx) => {
        row[header] = cells[idx] || '';
      });
      records.push(row);
    }

    return records;
  };

  const processRecords = (records: any[]) => {
    const existingBrandSet = new Set(existingPosts.map(p => analyzeDomain(p.rootDomain).brandBase));
    const seenBrands = new Set<string>();
    const results: ParsedImportRow[] = [];

    for (const raw of records) {
      // Flexible key lookups matching user's screenshot & standard variants
      const domainVal =
        raw.domain ||
        raw['root domain'] ||
        raw.rootdomain ||
        raw.url ||
        raw['page url'] ||
        raw.pageurl ||
        raw.website ||
        '';

      if (!domainVal || typeof domainVal !== 'string') continue;

      let rawHost = domainVal.trim().toLowerCase();
      rawHost = rawHost.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();
      if (!rawHost || !rawHost.includes('.')) continue;

      const analysis = analyzeDomain(rawHost);
      const isSub = analysis.isSubdomain;
      const cleanDomain = analysis.apex;
      const brand = analysis.brandBase;

      // Extract DA
      let da: number | undefined;
      const daVal = raw['domain authority'] || raw['domain a'] || raw.da || raw.authority;
      if (daVal !== undefined && daVal !== '') {
        const parsedDA = parseInt(String(daVal), 10);
        if (!isNaN(parsedDA) && parsedDA > 0) da = parsedDA;
      }

      // Extract PageRank
      let pageRank: number | undefined;
      const prVal = raw.pagerank || raw['page rank'] || raw.pr;
      if (prVal !== undefined && prVal !== '') {
        const parsedPR = parseFloat(String(prVal));
        if (!isNaN(parsedPR)) pageRank = parsedPR;
      }

      // Extract Niche
      const niche = raw.niche || raw.category || raw.topic || 'General Tech';

      // Extract Page URL
      const pageUrl = raw['page url'] || raw.pageurl || raw.url || raw.link || `https://${cleanDomain}/write-for-us/`;

      // Extract Contact Email
      const contactEmail = raw['contact email'] || raw.contactemail || raw.email || raw['editor email'] || undefined;

      // Extract Submission URL
      const submissionUrl = raw['submission url'] || raw.submissio || raw.submissionurl || raw.form || pageUrl;

      // Extract Fee
      const freeOrPaid = raw['free or paid'] || raw['free or pa'] || raw.fee || raw.compensation || 'Free Submission';

      // Extract Status
      let status: GuestPost['status'] = 'new';
      const statusVal = String(raw.status || '').toLowerCase();
      if (['new', 'contacted', 'pitched', 'accepted', 'rejected'].includes(statusVal)) {
        status = statusVal as GuestPost['status'];
      }

      // Extract Guidelines
      const guidelinesSummary = raw.guidelines || raw.guidelinessummary || raw.summary || raw.notes || 'Accepts guest contributions.';

      // Extract Discovered At
      const discoveredAt = raw['discovered at'] || raw.discovere || raw.discoveredat || new Date().toISOString();

      const isDuplicate = existingDomainSet.has(cleanDomain);
      const isCcTldDuplicate = !isSub && !isDuplicate && (existingBrandSet.has(brand) || seenBrands.has(brand));

      if (!isSub && !isDuplicate && !isCcTldDuplicate) {
        seenBrands.add(brand);
      }

      results.push({
        domain: rawHost,
        rootDomain: cleanDomain,
        domainAuthority: da,
        pageRank,
        niche,
        pageUrl,
        contactEmail: contactEmail && contactEmail.includes('@') ? contactEmail : undefined,
        submissionUrl,
        freeOrPaid,
        status,
        discoveredAt,
        guidelinesSummary,
        isDuplicate,
        isSubdomain: isSub,
        isCcTldDuplicate,
        isGov: analysis.isGov
      });
    }

    setParsedRows(results);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsParsing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          const array = Array.isArray(json) ? json : json.data || [];
          processRecords(array);
        } else {
          // Parse CSV
          const records = parseCSV(content);
          if (records.length === 0) {
            throw new Error('No valid rows found in CSV file. Please check format.');
          }
          processRecords(records);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to parse file. Ensure it is a valid CSV or JSON file.');
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error reading uploaded file.');
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const handlePasteParse = () => {
    if (!pastedText.trim()) return;
    setErrorMsg(null);
    setIsParsing(true);
    try {
      const trimmed = pastedText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const json = JSON.parse(trimmed);
        const array = Array.isArray(json) ? json : json.data || [];
        processRecords(array);
      } else {
        const records = parseCSV(trimmed);
        if (records.length === 0) {
          throw new Error('Could not parse valid CSV headers or rows. Check data formatting.');
        }
        processRecords(records);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid CSV or JSON text format.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => !r.isGov && !r.isSubdomain && !r.isCcTldDuplicate);
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/guestposts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validRows,
          updateDuplicates
        })
      });

      const data = await res.json();
      if (res.ok) {
        onImportSuccess({
          addedCount: data.addedCount || 0,
          duplicatesSkipped: data.duplicatesSkipped || 0,
          updatedCount: data.updatedCount || 0
        });
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to import sites');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error during import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const govCount = parsedRows.filter(r => r.isGov).length;
  const subdomainCount = parsedRows.filter(r => !r.isGov && r.isSubdomain).length;
  const ccTldDuplicateCount = parsedRows.filter(r => !r.isGov && !r.isSubdomain && r.isCcTldDuplicate).length;
  const duplicateCount = parsedRows.filter(r => !r.isGov && !r.isSubdomain && r.isDuplicate).length;
  const newCount = parsedRows.filter(r => !r.isGov && !r.isSubdomain && !r.isDuplicate && !r.isCcTldDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Import Previously Scraped Sites</h3>
              <p className="text-xs text-slate-400">Upload CSV/JSON spreadsheet or paste previous scraper data with automatic deduplication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg border bg-rose-950/50 border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Switcher */}
          {parsedRows.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`pb-1 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'border-cyan-400 text-cyan-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Upload CSV or JSON File</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`pb-1 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'border-cyan-400 text-cyan-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Raw CSV / JSON</span>
                </button>
              </div>

              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-cyan-400 mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    {fileName ? fileName : 'Click or drag & drop CSV file to import'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Supports spreadsheets with columns: Domain, Root Domain, Domain Authority, PageRank, Niche, Page URL, Email, Guidelines.
                  </p>
                  <span className="inline-block mt-3 px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px] font-mono">
                    .CSV or .JSON accepted
                  </span>
                </div>
              )}

              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Domain,Root Domain,Domain Authority,PageRank,Niche,Page URL,Contact Email,Guidelines\neugenecascadescoast.bookdirect.net,eugenecascadescoast.bookdirect.net,59,5.8,Small Business,https://eugenecascadescoast.bookdirect.net/write-for-us,editor@eugene.net,Accepts articles...`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-[11px] placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasteParse}
                      disabled={!pastedText.trim() || isParsing}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Parse & Preview</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Summary Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span className="font-semibold text-slate-200 text-xs">
                    Found {parsedRows.length} records in {fileName || 'pasted data'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                  <span className="text-emerald-400 font-medium">
                    {newCount} New Sites
                  </span>
                  {govCount > 0 && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-rose-400 font-medium">
                        {govCount} .gov Excluded
                      </span>
                    </>
                  )}
                  {subdomainCount > 0 && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-rose-400 font-medium">
                        {subdomainCount} Subdomains Excluded
                      </span>
                    </>
                  )}
                  {ccTldDuplicateCount > 0 && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-amber-400 font-medium">
                        {ccTldDuplicateCount} ccTLD Duplicates
                      </span>
                    </>
                  )}
                  {duplicateCount > 0 && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-amber-300 font-medium">
                        {duplicateCount} Duplicates
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setFileName(null);
                      setPastedText('');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 ml-2 underline"
                  >
                    Change file
                  </button>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              {duplicateCount > 0 && (
                <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-amber-200">
                      {duplicateCount} domains are already in your database.
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={updateDuplicates}
                      onChange={(e) => setUpdateDuplicates(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-cyan-400"
                    />
                    <span>Update existing info</span>
                  </label>
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3 text-center">DA / PR</th>
                      <th className="py-2.5 px-3">Niche</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3 text-right">Duplicate Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-semibold text-slate-200 truncate max-w-[180px]">
                          {row.domain}
                          {row.isSubdomain && (
                            <span className="block text-[10px] text-rose-400 font-normal">subdomain (excluded)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums">
                          {row.domainAuthority !== undefined ? (
                            <span className="text-cyan-400">DA {row.domainAuthority}</span>
                          ) : (
                            <span className="text-slate-500 italic">Auto-calc</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-sans truncate max-w-[140px]">
                          {row.niche}
                        </td>
                        <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]">
                          {row.contactEmail || '—'}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {row.isGov ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-950/60 text-rose-300 border border-rose-800">
                              .gov (Excluded)
                            </span>
                          ) : row.isSubdomain ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-rose-950/60 text-rose-300 border border-rose-800">
                              Subdomain (Excluded)
                            </span>
                          ) : row.isCcTldDuplicate ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                              ccTLD Duplicate (Excluded)
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                              {updateDuplicates ? 'Will Update' : 'Duplicate (Skip)'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                              Ready to Add
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <div className="text-[11px] text-slate-500 text-center">
                  Showing first 50 rows of {parsedRows.length} total records.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={isSubmitting || (newCount === 0 && !updateDuplicates)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 rounded-xl transition-all shadow-md active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Sites...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Import {newCount} {newCount === 1 ? 'Site' : 'Sites'}
                    {updateDuplicates && duplicateCount > 0 ? ` & Update ${duplicateCount}` : ''}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
