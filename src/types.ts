export interface GuestPost {
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
  seoProvider: 'openpagerank' | 'moz' | 'algorithmic' | string;
  niche: string;
  freeOrPaid: string;
  status: 'new' | 'contacted' | 'pitched' | 'accepted' | 'rejected';
  notes?: string;
  discoveredAt: string;
  verified: boolean;
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

export interface DashboardStats {
  total: number;
  uniqueDomains: number;
  highDA: number;
  withEmail: number;
  paidCount: number;
  freeCount: number;
  filteredCount: number;
}

export interface AppSettings {
  seoProvider: 'openpagerank' | 'moz' | 'algorithmic';
  openPageRankKey: string;
  mozAccessId: string;
  mozSecretKey: string;
  crawlerUserAgent: string;
  autoDeduplicate: boolean;
  centralizedSheetId?: string;
  centralizedSheetUrl?: string;
}

export interface PitchAngle {
  title: string;
  synopsis: string;
  takeaways: string;
}

export interface PitchData {
  pitchAngles: PitchAngle[];
  subjectLine: string;
  emailBody: string;
}
