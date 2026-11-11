/**
 * Domain Intelligence & Public Suffix Normalizer
 * Enforces strict root-domain filtering, eliminates subdomains,
 * and collapses regional/ccTLD brand variations (e.g. yelp.ca, yelp.uk -> yelp.com).
 */

export const COMPOUND_TLDS = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'net.uk', 'ltd.uk', 'plc.uk',
  'co.jp', 'ne.jp', 'or.jp', 'go.jp', 'ac.jp',
  'co.nz', 'net.nz', 'org.nz', 'govt.nz',
  'co.za', 'org.za', 'gov.za',
  'co.in', 'net.in', 'org.in', 'gov.in', 'gen.in',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.mx', 'org.mx', 'gob.mx', 'edu.mx',
  'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg',
  'com.ph', 'net.ph', 'org.ph', 'gov.ph', 'edu.ph',
  'com.my', 'net.my', 'org.my', 'gov.my', 'edu.my',
  'co.id', 'web.id', 'or.id', 'go.id', 'ac.id',
  'com.tr', 'org.tr', 'edu.tr', 'gov.tr',
  'gc.ca', 'gov.ca', 'on.ca', 'qc.ca', 'bc.ca',
  'fed.us', 'state.us'
]);

export interface DomainAnalysis {
  host: string;
  apex: string;
  brandBase: string;
  isSubdomain: boolean;
  isGov: boolean;
  tld: string;
}

/**
 * Normalizes any URL, hostname, or domain string into a clean lowercase host
 */
export function cleanHostname(input: string): string {
  if (!input) return '';
  let str = input.trim().toLowerCase();
  str = str.replace(/^(https?:\/\/)?/, '').replace(/^www\./, '');
  str = str.split('/')[0].split('?')[0].split('#')[0].split(':')[0].trim();
  return str;
}

/**
 * Identifies if a domain is a government domain (.gov, .gov.xx, .govt.xx)
 */
export function isGovDomain(input: string): boolean {
  if (!input) return false;
  const host = cleanHostname(input).toLowerCase();
  return (
    host.endsWith('.gov') ||
    host.endsWith('.govt') ||
    host.includes('.gov.') ||
    host.includes('.govt.')
  );
}

/**
 * Analyzes a domain to identify:
 * - Registered apex root domain
 * - Subdomain status (true if there are sub-levels like app.*, docs.*, support.*, blog.*)
 * - Government status (.gov, .gov.uk, etc. strictly excluded)
 * - Brand base for ccTLD collapse (e.g. 'yelp' for yelp.ca, yelp.co.uk, yelp.com)
 */
export function analyzeDomain(input: string): DomainAnalysis {
  const host = cleanHostname(input);
  const isGov = isGovDomain(host);

  if (!host || !host.includes('.')) {
    return { host, apex: host, brandBase: host, isSubdomain: false, isGov, tld: '' };
  }

  const parts = host.split('.');
  if (parts.length < 2) {
    return { host, apex: host, brandBase: host, isSubdomain: false, isGov, tld: '' };
  }

  const lastTwo = parts.slice(-2).join('.');
  let apex: string;
  let isSubdomain: boolean;
  let brandBase: string;
  let tld: string;

  if (COMPOUND_TLDS.has(lastTwo)) {
    tld = lastTwo;
    if (parts.length > 3) {
      isSubdomain = true;
      apex = parts.slice(-3).join('.');
      brandBase = parts[parts.length - 3];
    } else {
      isSubdomain = false;
      apex = host;
      brandBase = parts[parts.length - 3] || parts[0];
    }
  } else {
    tld = parts[parts.length - 1];
    if (parts.length > 2) {
      isSubdomain = true;
      apex = parts.slice(-2).join('.');
      brandBase = parts[parts.length - 2];
    } else {
      isSubdomain = false;
      apex = host;
      brandBase = parts[0];
    }
  }

  return { host, apex, brandBase, isSubdomain, isGov, tld };
}

export function isSubdomain(input: string): boolean {
  return analyzeDomain(input).isSubdomain;
}

export function getApexDomain(input: string): string {
  return analyzeDomain(input).apex;
}

export function getBrandBase(input: string): string {
  return analyzeDomain(input).brandBase;
}

/**
 * Deduplicates and filters a list of opportunities:
 * 1. Discards all government domains (.gov, .gov.uk, etc.)
 * 2. Discards all subdomains (keeps only true apex root domains)
 * 3. Collapses multi-ccTLD / regional brand duplicates (yelp.ca, yelp.uk, yelp.com -> only 1 present, preferring .com or highest DA)
 */
export function filterAndDeduplicateOpportunities<T extends { domain: string; rootDomain?: string; domainAuthority?: number }>(
  items: T[]
): {
  filtered: T[];
  govRemoved: number;
  subdomainsRemoved: number;
  ccTldDuplicatesRemoved: number;
  totalRemoved: number;
} {
  const seenBrands = new Map<string, number>(); // brandBase -> index in filtered array
  const filtered: T[] = [];
  let govRemoved = 0;
  let subdomainsRemoved = 0;
  let ccTldDuplicatesRemoved = 0;

  for (const item of items) {
    const target = item.rootDomain || item.domain;
    const analysis = analyzeDomain(target);
    if (!analysis || !analysis.host) continue;

    // 1. FILTER OUT ALL GOVERNMENT DOMAINS (.gov, .gov.uk, etc.)
    if (analysis.isGov) {
      govRemoved++;
      continue;
    }

    // 2. FILTER OUT ALL SUBDOMAINS
    if (analysis.isSubdomain) {
      subdomainsRemoved++;
      continue;
    }

    // 3. CHECK REGIONAL / ccTLD BRAND DUPLICATES (e.g. yelp.ca, yelp.uk, yelp.com)
    if (seenBrands.has(analysis.brandBase)) {
      ccTldDuplicatesRemoved++;
      const existingIdx = seenBrands.get(analysis.brandBase)!;
      const existingItem = filtered[existingIdx];

      // Upgrade to .com if existing is not .com, or replace if this one has higher DA
      const currentIsCom = analysis.host.endsWith('.com');
      const existingIsCom = existingItem.domain.toLowerCase().endsWith('.com');
      const currentDA = item.domainAuthority || 0;
      const existingDA = existingItem.domainAuthority || 0;

      if ((currentIsCom && !existingIsCom) || (!existingIsCom && currentDA > existingDA)) {
        filtered[existingIdx] = {
          ...item,
          domain: analysis.apex,
          rootDomain: analysis.apex
        };
      }
      continue;
    }

    // New unique root domain brand
    seenBrands.set(analysis.brandBase, filtered.length);
    filtered.push({
      ...item,
      domain: analysis.apex,
      rootDomain: analysis.apex
    });
  }

  return {
    filtered,
    govRemoved,
    subdomainsRemoved,
    ccTldDuplicatesRemoved,
    totalRemoved: govRemoved + subdomainsRemoved + ccTldDuplicatesRemoved
  };
}
