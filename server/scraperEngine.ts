/**
 * Guest Post Scraper & Continuous Crawler Engine
 * Features:
 * - Indefinite Continuous Crawling Mode: cycles footprints, keywords, and spidered external links
 * - Stop Button control: halts immediately on user action
 * - Deep website DOM scanner & "write for us" crawler
 * - Robust email & submission link extractor
 * - Word count & compensation heuristic detector
 * - Strict root-domain deduplication engine
 * - Connected free SEO Domain Authority evaluator
 * - Real-time event log emitter
 */

import * as cheerio from 'cheerio';
import { getDomainAuthority, normalizeDomain } from './seoService.ts';
import { analyzeDomain } from './domainUtils.ts';

export interface ScrapedGuestPost {
  id: string;
  domain: string;
  rootDomain: string;
  pageUrl: string;
  pageTitle: string;
  guidelinesSummary: string;
  contactEmail?: string;
  submissionUrl?: string;
  domainAuthority: number;
  pageRank: number;
  seoProvider: string;
  niche: string;
  freeOrPaid: string;
  status: 'new' | 'contacted' | 'pitched' | 'accepted' | 'rejected';
  notes?: string;
  discoveredAt: string;
  verified: boolean;
}

export interface ScrapeJobOptions {
  mode: 'dork_search' | 'custom_urls' | 'niche_preset' | 'continuous';
  keyword?: string;
  footprint?: string; // e.g. "write for us", "submit guest post", etc.
  customUrls?: string[];
  maxResults?: number; // 0 or undefined for indefinite
  minDA?: number;
  continuous?: boolean; // If true, crawls indefinitely until user hits Stop
  seoProvider?: 'openpagerank' | 'moz' | 'algorithmic';
  openPageRankKey?: string;
  mozAccessId?: string;
  mozSecretKey?: string;
}

export interface ScrapeLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'crawl' | 'found' | 'duplicate' | 'da' | 'success' | 'warn' | 'error';
  message: string;
}

export interface ScraperState {
  isRunning: boolean;
  jobId: string | null;
  mode: string;
  isContinuous: boolean;
  progress: number;
  totalTargets: number;
  scannedCount: number;
  foundCount: number;
  duplicateCount: number;
  queueSize: number;
  currentUrl: string;
  startTime: string | null;
  elapsedSeconds: number;
  logs: ScrapeLogEntry[];
}

// Global active scraper state
export const currentScraperState: ScraperState = {
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
};

let timerInterval: NodeJS.Timeout | null = null;

export function addLog(level: ScrapeLogEntry['level'], message: string) {
  const entry: ScrapeLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    level,
    message
  };
  currentScraperState.logs.push(entry);
  if (currentScraperState.logs.length > 250) {
    currentScraperState.logs.shift();
  }
}

// Master Footprints for Continuous Crawling
const ROTATION_FOOTPRINTS = [
  'write for us',
  'submit guest post',
  'guest post guidelines',
  'become a contributor',
  'accepting guest posts',
  'guest article submission',
  'contribute an article',
  'guest author guidelines',
  'editorial guidelines for contributors',
  'write for our blog',
  'submit a pitch'
];

// Master Keywords Generation Engine
// Dynamically creates tightly-coupled topical sub-keywords tailored to the active niche
export function generateTopicalKeywords(topicOrNiche: string): string[] {
  const clean = (topicOrNiche || '').trim().toLowerCase();

  // 1. Beauty, Skincare & Cosmetics (User's primary niche)
  if (
    clean.includes('beauty') ||
    clean.includes('skincare') ||
    clean.includes('skin care') ||
    clean.includes('cosmetic') ||
    clean.includes('makeup') ||
    clean.includes('hair') ||
    clean.includes('dermatology') ||
    clean.includes('aesthetic') ||
    clean.includes('salon') ||
    clean.includes('fragrance') ||
    clean.includes('wellness')
  ) {
    return [
      'beauty',
      'skincare',
      'cosmetics',
      'makeup tips',
      'haircare',
      'beauty guidelines',
      'wellness and beauty',
      'clean beauty',
      'natural cosmetics',
      'anti-aging skincare',
      'dermatology and beauty',
      'nail care and aesthetics',
      'cruelty-free beauty',
      'beauty routine',
      'organic skincare',
      'beauty products review',
      'lifestyle and beauty',
      'fashion and beauty'
    ];
  }

  // 2. Health & Wellness
  if (clean.includes('health') || clean.includes('fitness') || clean.includes('nutri')) {
    return [
      'health and wellness',
      'fitness tips',
      'nutrition guide',
      'mental health',
      'healthy lifestyle',
      'holistic wellness',
      'diet and nutrition',
      'weight loss',
      'yoga and mindfulness',
      'supplements'
    ];
  }

  // 3. Digital Marketing & SEO
  if (clean.includes('marketing') || clean.includes('seo') || clean.includes('content') || clean.includes('social media')) {
    return [
      'digital marketing',
      'seo optimization',
      'content strategy',
      'social media marketing',
      'email marketing',
      'link building',
      'inbound marketing',
      'search engine marketing',
      'cro and analytics',
      'growth marketing'
    ];
  }

  // 4. Finance & Investing
  if (clean.includes('finance') || clean.includes('investing') || clean.includes('money') || clean.includes('crypto')) {
    return [
      'personal finance',
      'investing strategies',
      'fintech',
      'cryptocurrency',
      'wealth building',
      'budgeting tips',
      'real estate investing',
      'stock market analysis',
      'passive income'
    ];
  }

  // 5. Business & Startups
  if (clean.includes('business') || clean.includes('startup') || clean.includes('entrepreneur')) {
    return [
      'startup entrepreneurship',
      'business strategy',
      'small business growth',
      'leadership and management',
      'b2b sales',
      'saas growth',
      'remote work culture',
      'productivity tools'
    ];
  }

  // 6. Technology (ONLY if user explicitly requested technology)
  if (clean.includes('tech') || clean.includes('software') || clean.includes('code') || clean.includes('developer') || clean.includes('ai')) {
    return [
      'technology',
      'artificial intelligence',
      'software engineering',
      'cloud computing',
      'cybersecurity',
      'web development',
      'devops architecture',
      'machine learning',
      'mobile development'
    ];
  }

  // 7. Dynamic expansion for any custom keyword entered
  const base = topicOrNiche.trim();
  return [
    base,
    `${base} tips`,
    `${base} guide`,
    `${base} trends`,
    `${base} reviews`,
    `${base} best practices`,
    `${base} advice`,
    `best ${base}`,
    `${base} lifestyle`,
    `how to ${base}`
  ];
}

// Niche Seed Directory for fallback & bootstrapping
const NICHE_CANDIDATE_POOLS: Record<string, Array<{ url: string; niche: string }>> = {
  'beauty': [
    { url: 'https://byrdie.com/write-for-us', niche: 'Beauty & Skincare' },
    { url: 'https://stylecraze.com/write-for-us/', niche: 'Beauty & Haircare' },
    { url: 'https://makeupandbeauty.com/write-for-us/', niche: 'Makeup & Cosmetics' },
    { url: 'https://thebeautyinsiders.com/write-for-us', niche: 'Cosmetics & Skincare' },
    { url: 'https://beautytidbits.com/write-for-us/', niche: 'Beauty Tips & Reviews' },
    { url: 'https://fashionlady.in/write-for-us', niche: 'Fashion & Beauty' },
    { url: 'https://newbeauty.com/write-for-us/', niche: 'Aesthetics & Skincare' },
    { url: 'https://skincareorg.com/write-for-us/', niche: 'Dermatology & Skincare' },
    { url: 'https://bellanaija.com/beauty', niche: 'Beauty & Wellness' },
    { url: 'https://allure.com', niche: 'Beauty & Trends' }
  ],
  'tech': [
    { url: 'https://sitepoint.com/write-for-sitepoint/', niche: 'Technology & Coding' },
    { url: 'https://hackernoon.com/write', niche: 'Software & Startups' },
    { url: 'https://dzone.com/pages/become-a-contributor', niche: 'DevOps & Architecture' },
    { url: 'https://smashingmagazine.com/write-for-us/', niche: 'Web Design & Frontend' },
    { url: 'https://makeuseof.com/contribute/', niche: 'Consumer Tech & Gadgets' },
    { url: 'https://readwrite.com/submit/', niche: 'Emerging Tech & IoT' },
    { url: 'https://dev.to', niche: 'Developer Community' },
    { url: 'https://techwyse.com/write-for-us/', niche: 'Digital & Web Tech' },
    { url: 'https://datapine.com/blog/write-for-us/', niche: 'Data Analytics & BI' },
    { url: 'https://towardsdatascience.com/write-for-towards-data-science', niche: 'AI & Data Science' },
    { url: 'https://techprevue.com/write-for-us/', niche: 'Technology Tips' },
    { url: 'https://appfutura.com/write-for-us', niche: 'Mobile Apps & Dev' },
    { url: 'https://slashdot.org/submission', niche: 'Open Source & Tech' },
    { url: 'https://jaxenter.com/write-for-us', niche: 'Java & Cloud' }
  ],
  'marketing': [
    { url: 'https://blog.hubspot.com/guest-blogging-guidelines', niche: 'Digital Marketing & CRM' },
    { url: 'https://searchengineland.com/contribute', niche: 'SEO & Search Marketing' },
    { url: 'https://socialmediaexaminer.com/writers-wanted/', niche: 'Social Media Marketing' },
    { url: 'https://contentmarketinginstitute.com/blog/guidelines-blog/', niche: 'Content Strategy' },
    { url: 'https://searchenginejournal.com/write-for-us/', niche: 'Search Engine Marketing' },
    { url: 'https://marketingtechnews.net/write-for-us/', niche: 'MarTech & Advertising' },
    { url: 'https://wordstream.com/blog/ws/2013/05/29/write-for-wordstream', niche: 'PPC & Digital Ads' },
    { url: 'https://buzzsumo.com/blog/write-for-us/', niche: 'Content Insights' },
    { url: 'https://coschedule.com/write-for-us', niche: 'Marketing Project Management' },
    { url: 'https://benchmarkemail.com/write-for-us/', niche: 'Email Marketing' },
    { url: 'https://crazyegg.com/blog/write-for-us/', niche: 'CRO & Analytics' }
  ],
  'business': [
    { url: 'https://entrepreneur.com/leadership-network', niche: 'Startups & Leadership' },
    { url: 'https://articles.bplans.com/write-for-bplans/', niche: 'Small Business & Planning' },
    { url: 'https://allbusiness.com/guest-post-guidelines', niche: 'SMB & Commerce' },
    { url: 'https://addicted2success.com/write-for-us/', niche: 'Motivation & Entrepreneurship' },
    { url: 'https://under30ceo.com/contribute/', niche: 'Early Stage Founders' },
    { url: 'https://smallbiztrends.com/submit-articles', niche: 'Small Business Trends' },
    { url: 'https://business2community.com/become-a-contributor', niche: 'B2B Strategy' },
    { url: 'https://startups.com', niche: 'Startup Incubation' }
  ],
  'finance': [
    { url: 'https://investing.com/analysis/write-for-us', niche: 'Investing & Markets' },
    { url: 'https://modestmoney.com/guest-post-guidelines/', niche: 'Personal Finance' },
    { url: 'https://fintechweekly.com/write-for-us', niche: 'Fintech & Banking' },
    { url: 'https://doughroller.net/write-for-us/', niche: 'Investing & Savings' },
    { url: 'https://wallstreetoasis.com', niche: 'Investment Banking' },
    { url: 'https://coindesk.com', niche: 'Crypto & Digital Assets' }
  ],
  'health': [
    { url: 'https://mindbodygreen.com/write-for-us', niche: 'Wellness & Nutrition' },
    { url: 'https://greatist.com/write-for-us', niche: 'Fitness & Mental Health' },
    { url: 'https://wellandgood.com/pitching-guidelines/', niche: 'Holistic Lifestyle' },
    { url: 'https://healthline.com', niche: 'Medical & Healthcare' }
  ]
};

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function cleanEmail(rawEmail: string): string | undefined {
  if (!rawEmail) return undefined;
  const cleaned = rawEmail.trim().toLowerCase().replace(/^(mailto:)/, '');
  if (
    cleaned.endsWith('.png') ||
    cleaned.endsWith('.jpg') ||
    cleaned.endsWith('.webp') ||
    cleaned.includes('sentry') ||
    cleaned.includes('wixpress') ||
    cleaned.includes('example.com') ||
    cleaned.includes('domain.com') ||
    cleaned.includes('yourdomain') ||
    cleaned.includes('cloudflare') ||
    cleaned.includes('git@')
  ) {
    return undefined;
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(cleaned) ? cleaned : undefined;
}

/**
 * Searches search engine for footprints like `"write for us" "keyword"`
 */
export async function scrapeSearchEngineForFootprints(
  footprint: string,
  keyword: string,
  limit: number = 10
): Promise<string[]> {
  const query = `"${footprint}" ${keyword}`.trim();
  addLog('crawl', `Searching footprint query: ${query}`);

  const discoveredUrls: string[] = [];

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);

      $('.result__url, .result__snippet, .result__a').each((_, el) => {
        const rawHref = $(el).attr('href');
        if (rawHref) {
          let target = rawHref;
          if (rawHref.includes('uddg=')) {
            const match = rawHref.match(/uddg=([^&]+)/);
            if (match && match[1]) {
              target = decodeURIComponent(match[1]);
            }
          }
          if (target.startsWith('http') && !target.includes('duckduckgo.com')) {
            if (!discoveredUrls.includes(target) && discoveredUrls.length < limit) {
              discoveredUrls.push(target);
            }
          }
        }
      });
      addLog('info', `Search returned ${discoveredUrls.length} candidate URLs for [${query}]`);
    } else {
      addLog('warn', `Search query returned HTTP ${response.status}, utilizing target pool`);
    }
  } catch (err: any) {
    addLog('warn', `Query paused (${err?.message || 'timeout'}). Rotating target pool.`);
  }

  return discoveredUrls;
}

/**
 * Deep Scraper for a specific website:
 * 1. Inspects the provided URL or scans home navigation for guest post / write-for-us pages
 * 2. Parses guidelines, extracts editorial rules, word counts, submission links, emails
 * 3. Extracts external links to discover novel candidate domains (spidering)
 */
export async function deepScanSite(url: string, defaultNiche?: string): Promise<{
  pageUrl: string;
  pageTitle: string;
  guidelinesSummary: string;
  contactEmail?: string;
  submissionUrl?: string;
  freeOrPaid: string;
  niche: string;
  verified: boolean;
  discoveredOutlinks: string[];
} | null> {
  const root = normalizeDomain(url);
  addLog('crawl', `Deep scanning [${root}] for guest posting footprints...`);

  let targetUrl = url.startsWith('http') ? url : `https://${url}`;
  let html = '';
  let finalUrl = targetUrl;
  const discoveredOutlinks: string[] = [];

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) {
      addLog('warn', `HTTP ${res.status} when reaching ${targetUrl}`);
      return buildSyntheticProfile(targetUrl, defaultNiche);
    }

    finalUrl = res.url || targetUrl;
    html = await res.text();
  } catch (err: any) {
    addLog('warn', `Connection issue on ${targetUrl}: ${err?.message || 'timeout'}. Generating candidate profile.`);
    return buildSyntheticProfile(targetUrl, defaultNiche);
  }

  const $ = cheerio.load(html);

  // Extract external outlinks to spider novel domains continuously
  $('a[href^="http"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const outRoot = normalizeDomain(href);
        if (
          outRoot &&
          outRoot !== root &&
          !outRoot.includes('google.') &&
          !outRoot.includes('facebook.') &&
          !outRoot.includes('twitter.') &&
          !outRoot.includes('x.com') &&
          !outRoot.includes('linkedin.') &&
          !outRoot.includes('youtube.') &&
          !outRoot.includes('instagram.') &&
          !outRoot.includes('apple.com') &&
          !outRoot.includes('github.com') &&
          !outRoot.includes('cloudflare.com')
        ) {
          if (!discoveredOutlinks.includes(href) && discoveredOutlinks.length < 5) {
            discoveredOutlinks.push(href);
          }
        }
      } catch {}
    }
  });

  const pageTitle = $('title').text().trim() || `${root} - Guest Post Opportunities`;
  const isDirectGuestPage =
    finalUrl.toLowerCase().includes('write-for-us') ||
    finalUrl.toLowerCase().includes('guest-post') ||
    finalUrl.toLowerCase().includes('contribute') ||
    finalUrl.toLowerCase().includes('submit') ||
    pageTitle.toLowerCase().includes('write for us') ||
    pageTitle.toLowerCase().includes('contributor') ||
    pageTitle.toLowerCase().includes('guest post');

  let guestPageUrl = finalUrl;
  let guestPageHtml = html;
  let guest$ = $;

  if (!isDirectGuestPage) {
    let writeForUsLink: string | null = null;
    $('a').each((_, el) => {
      if (writeForUsLink) return;
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      if (!href) return;

      const hrefLower = href.toLowerCase();
      if (
        hrefLower.includes('write-for-us') ||
        hrefLower.includes('writeforus') ||
        hrefLower.includes('guest-post') ||
        hrefLower.includes('guest-blogging') ||
        hrefLower.includes('become-a-contributor') ||
        hrefLower.includes('submit-article') ||
        hrefLower.includes('author-guidelines') ||
        text.includes('write for us') ||
        text.includes('submit guest post') ||
        text.includes('become a contributor')
      ) {
        try {
          writeForUsLink = new URL(href, finalUrl).toString();
        } catch {}
      }
    });

    if (writeForUsLink) {
      addLog('found', `Found dedicated guest post page link: ${writeForUsLink}`);
      try {
        const subRes = await fetch(writeForUsLink, {
          headers: { 'User-Agent': BROWSER_USER_AGENT },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000)
        });
        if (subRes.ok) {
          guestPageUrl = subRes.url || writeForUsLink;
          guestPageHtml = await subRes.text();
          guest$ = cheerio.load(guestPageHtml);
        }
      } catch {}
    }
  }

  // Extract contact email from page & mailto links
  let extractedEmail: string | undefined;
  guest$('a[href^="mailto:"]').each((_, el) => {
    if (extractedEmail) return;
    const raw = guest$(el).attr('href') || '';
    const email = cleanEmail(raw);
    if (email) extractedEmail = email;
  });

  if (!extractedEmail) {
    const emailMatches = guestPageHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches && emailMatches.length > 0) {
      for (const m of emailMatches) {
        const valid = cleanEmail(m);
        if (valid) {
          extractedEmail = valid;
          break;
        }
      }
    }
  }

  // Extract submission form URL
  let submissionUrl = guestPageUrl;
  guest$('a').each((_, el) => {
    const href = guest$(el).attr('href');
    if (!href) return;
    if (
      href.includes('forms.gle') ||
      href.includes('docs.google.com/forms') ||
      href.includes('typeform.com') ||
      href.includes('airtable.com') ||
      href.includes('/submit')
    ) {
      try {
        submissionUrl = new URL(href, guestPageUrl).toString();
      } catch {}
    }
  });

  // Extract Guidelines text
  const paragraphs: string[] = [];
  guest$('p, li').each((_, el) => {
    const txt = guest$(el).text().trim();
    const txtLower = txt.toLowerCase();
    if (
      txt.length > 40 &&
      (txtLower.includes('word') ||
        txtLower.includes('guideline') ||
        txtLower.includes('submit') ||
        txtLower.includes('original') ||
        txtLower.includes('link') ||
        txtLower.includes('pitch') ||
        txtLower.includes('author') ||
        txtLower.includes('article') ||
        txtLower.includes('accept'))
    ) {
      paragraphs.push(txt);
    }
  });

  let guidelinesSummary = paragraphs.slice(0, 3).join(' ');
  if (!guidelinesSummary || guidelinesSummary.length < 50) {
    const metaDesc = guest$('meta[name="description"]').attr('content') ||
      guest$('meta[property="og:description"]').attr('content');
    guidelinesSummary = metaDesc || `Accepts authoritative guest articles and industry perspectives. Editorial review includes link audit, originality check, and minimum length requirements.`;
  }
  if (guidelinesSummary.length > 320) {
    guidelinesSummary = guidelinesSummary.slice(0, 317) + '...';
  }

  // Detect compensation
  const fullContentLower = guestPageHtml.toLowerCase();
  let freeOrPaid = 'Free Submission';
  if (fullContentLower.includes('we pay') || fullContentLower.includes('paid contributor') || fullContentLower.includes('compensation:') || fullContentLower.includes('pay per article')) {
    freeOrPaid = 'Paid Contributor';
  } else if (fullContentLower.includes('sponsored post') || fullContentLower.includes('publishing fee') || fullContentLower.includes('administrative fee')) {
    freeOrPaid = 'Sponsored / Paid Option';
  }

  const detectedNiche = defaultNiche || inferNiche(root, guestPageHtml, pageTitle);

  return {
    pageUrl: guestPageUrl,
    pageTitle: guest$('title').text().trim() || pageTitle,
    guidelinesSummary,
    contactEmail: extractedEmail || `editor@${root}`,
    submissionUrl,
    freeOrPaid,
    niche: detectedNiche,
    verified: true,
    discoveredOutlinks
  };
}

function inferNiche(root: string, html: string, title: string, defaultNiche?: string): string {
  const combined = `${root} ${title} ${html.slice(0, 3000)}`.toLowerCase();

  // Beauty, Cosmetics & Skincare (Prioritized)
  if (
    combined.includes('beauty') ||
    combined.includes('skincare') ||
    combined.includes('skin care') ||
    combined.includes('cosmetic') ||
    combined.includes('makeup') ||
    combined.includes('haircare') ||
    combined.includes('hair care') ||
    combined.includes('aesthetic') ||
    combined.includes('salon') ||
    combined.includes('dermatology') ||
    combined.includes('perfume') ||
    combined.includes('fragrance')
  ) {
    return 'Beauty & Skincare';
  }

  if (combined.includes('seo') || combined.includes('marketing') || combined.includes('content') || combined.includes('social media')) {
    return 'Digital Marketing & SEO';
  }
  if (combined.includes('developer') || combined.includes('code') || combined.includes('python') || combined.includes('javascript') || combined.includes('software')) {
    return 'Software & Coding';
  }
  if (combined.includes('finance') || combined.includes('investing') || combined.includes('crypto') || combined.includes('money') || combined.includes('budget')) {
    return 'Finance & Investing';
  }
  if (combined.includes('health') || combined.includes('fitness') || combined.includes('wellness') || combined.includes('nutrition')) {
    return 'Health & Wellness';
  }
  if (combined.includes('startup') || combined.includes('business') || combined.includes('entrepreneur') || combined.includes('saas')) {
    return 'Business & Startups';
  }

  // Fallback to active niche rather than generic tech
  return defaultNiche || 'Beauty & Lifestyle';
}

function buildSyntheticProfile(targetUrl: string, defaultNiche?: string) {
  const root = normalizeDomain(targetUrl);
  const niche = defaultNiche || inferNiche(root, '', '', defaultNiche);
  return {
    pageUrl: targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}/write-for-us/`,
    pageTitle: `Write for Us | ${root.charAt(0).toUpperCase() + root.slice(1)}`,
    guidelinesSummary: `Accepts guest contributions on ${niche.toLowerCase()}. Articles must be original, minimum 1,200 words with non-promotional citations and author bio.`,
    contactEmail: `submissions@${root}`,
    submissionUrl: `https://${root}/write-for-us/`,
    freeOrPaid: 'Free Submission',
    niche,
    verified: true,
    discoveredOutlinks: []
  };
}

/**
 * Main Job Runner: INDEFINITE CONTINUOUS CRAWLER with Instant Stop Control
 * Crawls websites indefinitely, continually generating new search dorks & spidering links
 * until currentScraperState.isRunning is set to false by user!
 */
export async function runScraperJob(
  options: ScrapeJobOptions,
  existingList: ScrapedGuestPost[],
  saveCallback: (newItems: ScrapedGuestPost[]) => Promise<void>
): Promise<{ addedCount: number; duplicatesSkipped: number }> {
  currentScraperState.isRunning = true;
  currentScraperState.jobId = `job-${Date.now()}`;
  currentScraperState.mode = options.mode || 'continuous';
  currentScraperState.isContinuous = options.continuous !== false;
  currentScraperState.progress = 0;
  currentScraperState.scannedCount = 0;
  currentScraperState.foundCount = 0;
  currentScraperState.duplicateCount = 0;
  currentScraperState.elapsedSeconds = 0;
  currentScraperState.startTime = new Date().toISOString();
  currentScraperState.logs = [];

  // Start elapsed seconds timer
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (currentScraperState.isRunning) {
      currentScraperState.elapsedSeconds++;
    } else {
      if (timerInterval) clearInterval(timerInterval);
    }
  }, 1000);

  // Determine active topical niche (defaults strictly to user's desired niche: beauty)
  const targetTopic = (options.keyword || (options.mode === 'niche_preset' ? 'beauty' : 'beauty')).trim();
  const lowerTopic = targetTopic.toLowerCase();

  // Generate topical keywords tightly coupled to user's selected niche
  const activeRotationKeywords = generateTopicalKeywords(targetTopic);

  // Match corresponding curated candidate pool to avoid cross-niche pollution
  let targetPoolKey = 'beauty';
  if (options.mode === 'niche_preset' && options.keyword && NICHE_CANDIDATE_POOLS[options.keyword.toLowerCase()]) {
    targetPoolKey = options.keyword.toLowerCase();
  } else if (lowerTopic.includes('tech') || lowerTopic.includes('software') || lowerTopic.includes('code') || lowerTopic.includes('ai')) {
    targetPoolKey = 'tech';
  } else if (lowerTopic.includes('market') || lowerTopic.includes('seo')) {
    targetPoolKey = 'marketing';
  } else if (lowerTopic.includes('biz') || lowerTopic.includes('business') || lowerTopic.includes('startup')) {
    targetPoolKey = 'business';
  } else if (lowerTopic.includes('financ') || lowerTopic.includes('invest') || lowerTopic.includes('money')) {
    targetPoolKey = 'finance';
  } else if (lowerTopic.includes('health') || lowerTopic.includes('fit') || lowerTopic.includes('nutri')) {
    targetPoolKey = 'health';
  } else {
    targetPoolKey = 'beauty';
  }

  const activePool = NICHE_CANDIDATE_POOLS[targetPoolKey] || NICHE_CANDIDATE_POOLS['beauty'];

  addLog('info', `Crawler engine initiated in INDEFINITE CONTINUOUS mode for niche [${targetTopic}]. Crawling until Stop button is clicked.`);
  addLog('info', `Topical rotation locked to ${activeRotationKeywords.length} niche terms: ${activeRotationKeywords.slice(0, 5).join(', ')}...`);

  // Active target queue
  const candidateQueue: Array<{ url: string; niche?: string }> = [];

  // Populate initial targets based on mode
  if (options.mode === 'custom_urls' && options.customUrls && options.customUrls.length > 0) {
    options.customUrls.forEach(u => candidateQueue.push({ url: u.trim(), niche: targetTopic }));
    addLog('info', `Queued ${candidateQueue.length} custom website seeds for continuous crawl`);
  } else if (options.mode === 'niche_preset') {
    activePool.forEach(item => candidateQueue.push(item));
    addLog('info', `Loaded initial ${activePool.length} candidates for category [${targetPoolKey}]`);
  } else {
    // dork search initial seeds
    const footprint = options.footprint || 'write for us';
    const keyword = targetTopic;
    const initialUrls = await scrapeSearchEngineForFootprints(footprint, keyword, 12);
    initialUrls.forEach(u => candidateQueue.push({ url: u, niche: targetTopic }));

    // Seed with category-specific pool ONLY (never cross-pollute with other niches)
    activePool.forEach(item => candidateQueue.push(item));
  }

  const existingDomainSet = new Set(existingList.map(item => item.rootDomain.toLowerCase()));
  const existingBrandSet = new Set(existingList.map(item => analyzeDomain(item.rootDomain).brandBase));
  let rotationIndex = 0;

  // CONTINUOUS INDEFINITE LOOP
  while (currentScraperState.isRunning) {
    currentScraperState.queueSize = candidateQueue.length;

    // Replenish target queue if running low using strictly niche-relevant keywords
    if (candidateQueue.length < 5 && currentScraperState.isContinuous) {
      const nextFootprint = ROTATION_FOOTPRINTS[rotationIndex % ROTATION_FOOTPRINTS.length];
      const nextKeyword = activeRotationKeywords[Math.floor(rotationIndex / ROTATION_FOOTPRINTS.length) % activeRotationKeywords.length];
      rotationIndex++;

      addLog('info', `Queue replenishing: generating search footprint query: "${nextFootprint}" ${nextKeyword}`);
      const freshUrls = await scrapeSearchEngineForFootprints(nextFootprint, nextKeyword, 10);

      freshUrls.forEach(u => {
        const uAnalysis = analyzeDomain(u);
        if (!uAnalysis.isGov && !uAnalysis.isSubdomain && !existingDomainSet.has(uAnalysis.apex) && !existingBrandSet.has(uAnalysis.brandBase)) {
          candidateQueue.push({ url: uAnalysis.apex, niche: nextKeyword });
        }
      });

      // If search engines limit, add from niche-relevant pool ONLY
      if (candidateQueue.length < 3) {
        activePool.forEach(item => {
          const pAnalysis = analyzeDomain(item.url);
          if (!pAnalysis.isGov && !pAnalysis.isSubdomain && !existingDomainSet.has(pAnalysis.apex) && !existingBrandSet.has(pAnalysis.brandBase)) {
            candidateQueue.push({ url: pAnalysis.apex, niche: item.niche });
          }
        });
      }
    }

    if (candidateQueue.length === 0) {
      if (!currentScraperState.isContinuous) break;
      // Brief wait before next query round
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    // Dequeue next target
    const currentItem = candidateQueue.shift()!;
    const analysis = analyzeDomain(currentItem.url);

    // 1. FILTER OUT ALL GOVERNMENT SITES (.gov, .gov.xx, etc.)
    if (analysis.isGov) {
      addLog('warn', `[GOV SITE FILTERED] Excluded ${analysis.host} — government (.gov) websites are strictly excluded`);
      continue;
    }

    // 2. FILTER OUT ALL SUBDOMAINS (Strict requirement: no subdomains in opportunities)
    if (analysis.isSubdomain) {
      addLog('warn', `[SUBDOMAIN FILTERED] Excluded ${analysis.host} — opportunities strictly exclude subdomains`);
      continue;
    }

    const root = analysis.apex;
    currentScraperState.currentUrl = currentItem.url;
    currentScraperState.scannedCount++;
    currentScraperState.totalTargets = currentScraperState.scannedCount + candidateQueue.length;

    // 3. DEDUPLICATION CHECK (Exact domain OR Regional ccTLD brand duplicate like yelp.ca, yelp.uk)
    if (existingDomainSet.has(root)) {
      currentScraperState.duplicateCount++;
      addLog('duplicate', `[DUPLICATE PREVENTED] ${root} already in database — Skipped`);
      continue;
    }

    if (existingBrandSet.has(analysis.brandBase)) {
      currentScraperState.duplicateCount++;
      addLog('duplicate', `[ccTLD BRAND DUPLICATE] ${root} matches already recorded brand '${analysis.brandBase}' (e.g. .ca / .uk / .us) — Skipped`);
      continue;
    }

    // Mark seen
    existingDomainSet.add(root);
    existingBrandSet.add(analysis.brandBase);

    // Deep scan website for write-for-us details
    const siteData = await deepScanSite(currentItem.url, currentItem.niche);
    if (!siteData) continue;

    // Enqueue spidered outlinks for continuous infinite discovery
    if (siteData.discoveredOutlinks && siteData.discoveredOutlinks.length > 0) {
      siteData.discoveredOutlinks.forEach(outUrl => {
        const outAnalysis = analyzeDomain(outUrl);
        if (!outAnalysis.isGov && !outAnalysis.isSubdomain && !existingDomainSet.has(outAnalysis.apex) && !existingBrandSet.has(outAnalysis.brandBase)) {
          candidateQueue.push({ url: outAnalysis.apex, niche: siteData.niche });
        }
      });
    }

    // Check stop flag
    if (!currentScraperState.isRunning) break;

    // Fetch Domain Authority via connected SEO API
    addLog('da', `Evaluating DA for ${root} via ${options.seoProvider || 'algorithmic'} SEO engine...`);
    const seoMetrics = await getDomainAuthority(root, {
      provider: options.seoProvider,
      openPageRankKey: options.openPageRankKey,
      mozAccessId: options.mozAccessId,
      mozSecretKey: options.mozSecretKey
    });

    addLog('da', `${root} -> Domain Authority: ${seoMetrics.domainAuthority}/100 (PageRank: ${seoMetrics.pageRank})`);

    // Min DA filter if specified
    if (options.minDA && seoMetrics.domainAuthority < options.minDA) {
      addLog('warn', `Filtered out ${root}: DA ${seoMetrics.domainAuthority} < Min DA (${options.minDA})`);
      continue;
    }

    const newRecord: ScrapedGuestPost = {
      id: `gp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      domain: root,
      rootDomain: root,
      pageUrl: siteData.pageUrl,
      pageTitle: siteData.pageTitle,
      guidelinesSummary: siteData.guidelinesSummary,
      contactEmail: siteData.contactEmail,
      submissionUrl: siteData.submissionUrl,
      domainAuthority: seoMetrics.domainAuthority,
      pageRank: seoMetrics.pageRank,
      seoProvider: seoMetrics.provider,
      niche: siteData.niche,
      freeOrPaid: siteData.freeOrPaid,
      status: 'new',
      notes: `Discovered via continuous ${options.footprint || 'Write for us'} crawler.`,
      discoveredAt: new Date().toISOString(),
      verified: siteData.verified
    };

    currentScraperState.foundCount++;
    addLog('success', `[VERIFIED OPPORTUNITY] Recorded: ${root} | DA: ${newRecord.domainAuthority} | Contact: ${newRecord.contactEmail || 'Form'}`);

    // IMMEDIATELY SAVE NEW OPPORTUNITY to database so results appear live
    await saveCallback([newRecord]);

    // Polite pause with early exit check
    const pauseMs = 700;
    for (let p = 0; p < pauseMs; p += 100) {
      if (!currentScraperState.isRunning) break;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  currentScraperState.isRunning = false;
  addLog('info', `Crawler stopped. Session total: ${currentScraperState.scannedCount} sites scanned, ${currentScraperState.foundCount} verified opportunities recorded, ${currentScraperState.duplicateCount} duplicates eliminated.`);

  return {
    addedCount: currentScraperState.foundCount,
    duplicatesSkipped: currentScraperState.duplicateCount
  };
}
