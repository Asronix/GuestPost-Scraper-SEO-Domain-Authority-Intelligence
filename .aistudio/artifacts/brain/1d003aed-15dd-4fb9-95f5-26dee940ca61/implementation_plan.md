# Country-Targeted Crawling & Virtual Location Geo-Emulation

A location-intelligent guest post crawling system that focuses discovery on specific countries (defaulting to Singapore, with support for the Philippines, Malaysia, Indonesia, the US, UK, Australia, and Global), emulates **virtual geolocation** (via localized regional request headers, regional search engine locales, and optional proxy tunneling), and automatically rotates to the next regional territory when results for the active country are exhausted.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Key decisions confirmed and updated in this revision:
> - **Virtual Location Emulation**: The crawler will emulate a virtual location matching the target country using regional search engine locales (e.g. `kl=sg-en` for Singapore, `kl=ph-en` for Philippines), localized `Accept-Language` headers, regional IP simulation headers (`X-Forwarded-For`, `CF-IPCountry`), and support for optional custom regional proxy configurations.
> - **Initial Target Location**: **Singapore (SG)** is preset by default.
> - **Exhaustion Behavior**: **Auto-rotate when exhausted** — when Singapore candidates are exhausted, the scraper seamlessly rotates both the target country and the virtual location parameters to the next regional market (Philippines, Malaysia, Indonesia, followed by Global).
> - **Country Footprint Strategy**: Combines country topical search dorks with regional ccTLDs (`.sg`, `.com.sg`, `.ph`, `.my`) and verified country seed candidate directories.

---

## 1. Overview & Core Concept

Currently, the crawler operates on broad topical footprints from cloud container IPs without regional context. This update introduces **Geo-Targeted Intelligence & Virtual Location**:
1. **Target Location Selector**: Choose a target country in the Scraper modal (Singapore by default).
2. **Virtual Location Engine**:
   - Emulates browsing from the target country by dispatching requests with country-specific locale parameters (e.g. DuckDuckGo regional parameters `kl=sg-en`, Yahoo regional engines `sg.search.yahoo.com`), localized languages (`en-SG,en;q=0.9`), and simulated regional routing headers.
   - Allows users to specify an optional custom proxy (HTTP/SOCKS5) if they wish to route traffic through real residential/datacenter nodes in Singapore, Philippines, etc.
3. **Dynamic Virtual Location Auto-Rotation**: When candidate pools for the active country deplete, the crawler automatically updates both its search scope AND its virtual location headers to the next regional country.
4. **Location Tagging & Centralized Sync**: Opportunities are labeled by country and synced to a dedicated "Country" column in the centralized Google Sheet.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Configuring Virtual Location & Scraper**:
   - The user opens the **Launch Scraper** modal.
   - The **Search Location / Country** dropdown defaults to **Singapore (SG)**.
   - A **Virtual Location Emulation** indicator shows `Active (Emulating SG - Singapore Locale)`.
   - An expandable **Advanced Proxy / Virtual IP** setting allows configuring a custom regional proxy if desired.
   - The user clicks **Start Scraper**.

2. **Live Scraping with Geo-Emulation Feedback**:
   - The **Live Console** logs virtual location events:
     `[GEO] Virtual Location: Singapore (SG) | Locale: sg-en | Accept-Language: en-SG`
     `[QUERY] "Singapore beauty write for us" via regional endpoint`
   - When the Singapore pool depletes:
     `[ROTATION] Singapore queue exhausted -> Rotating virtual location to Philippines (PH)`
     `[GEO] New Virtual Location: Philippines (PH) | Locale: ph-en`

3. **Managing & Syncing Geo-Tagged Results**:
   - In the **Opportunities Table**, each opportunity displays a clean country indicator (`SG · Singapore`, `PH · Philippines`).
   - A **Country Filter** dropdown allows instant client-side filtering by region.
   - The **Google Sheets Centralized Database** includes a new `Country` column so spreadsheets are cleanly partitioned by geography.

### Visual Identity & Theme Tokens

- **Dominant Canvas**: Dark slate `#020617` (Tailwind `slate-950`) with structural cards in `#0f172a` (`slate-900/60`) and 1px hairline borders in `slate-800/80`.
- **Accent Palette**: High-contrast cyan (`#06b6d4`) for primary actions, emerald (`#10b981`) for verified links and Google Sheet auto-sync, and violet (`#8b5cf6`) for geographic tags, virtual location flags, and country filters.
- **Typography**: `Plus Jakarta Sans` for clean titles, labels, and modals; `JetBrains Mono` (`font-mono`) with `tabular-nums` for domain names, metrics, timestamps, and country codes (`SG`, `PH`, `MY`).
- **Anti-AI Slop Restraint**: Virtual location indicators are presented as quiet inline text (`Virtual Location: SG · Singapore`), avoiding gaudy flashing badges.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Multi-Tier Virtual Location Architecture
- **Chosen Approach**:
  1. *Layer 1 (Built-In)*: Regional search engine locales (`kl=sg-en`, `kl=ph-en`), country-specific search queries (`"Singapore"`, `"PH"`), localized `Accept-Language` headers, and regional header emulation (`X-Forwarded-For` with valid country subnet simulation, `CF-IPCountry`).
  2. *Layer 2 (Optional Tunneling)*: Configurable custom proxy URL for users who have dedicated proxy pools in specific countries.
- **Why**: Delivers instant out-of-the-box virtual location targeting for 100% of users without requiring them to purchase third-party proxies, while still supporting advanced proxy tunneling.

### Decision 2: Synchronized Country & Header Rotation
- **Chosen Approach**: When the crawler detects that the candidate queue and search yields for the active country have dropped below threshold, it advances the `activeCountry` index and immediately updates the request header generator and search engine locale parameters.
- **Why**: Keeps discovery culturally and geographically coherent, discovering Singapore targets first, then Philippines, Malaysia, Indonesia, and finally global publications.

### Decision 3: Centralized Google Sheet Integration
- **Chosen Approach**: Add `Country` to `SHEET_HEADERS` in `src/services/sheetsService.ts`.
- **Why**: Ensures that all auto-synced rows immediately record the discovered country for easy spreadsheet sorting and client filtering.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interface                                │
│                                                                        │
│   ┌────────────────────────────────┐    ┌──────────────────────────┐   │
│   │  ScraperModal.tsx              │    │  OpportunitiesView.tsx   │   │
│   │  - Target Country (default SG) │    │  - Country Filter        │   │
│   │  - Virtual Location Mode       │    │  - Geo Badges in Rows    │   │
│   │  - Auto-Rotate Toggle          │    │  - OpportunityDrawer     │   │
│   └───────────────┬────────────────┘    └─────────────▲────────────┘   │
└───────────────────┼───────────────────────────────────┼────────────────┘
                    │ POST /api/scraper/start           │ GET /api/guestposts
                    ▼                                   │
┌───────────────────────────────────────────────────────┴────────────────┐
│                    Express Backend & Scraper Engine                    │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │  server/scraperEngine.ts                                       │   │
│   │  - COUNTRY_REGISTRY (SG, PH, MY, ID, US, UK, AU, Global)       │   │
│   │  - getVirtualLocationHeaders(country)                          │   │
│   │  - getRegionalSearchLocale(country)                            │   │
│   │  - COUNTRY_SEED_POOLS (100+ verified regional blogs)           │   │
│   │  - detectCountry(domain, html, activeCountry)                  │   │
│   │  - handleCountryRotation() (updates virtual headers + queries) │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Storage & Google Sheets Sync                         │
│                                                                        │
│   - data/guest_posts.json (persists 'country' field)                   │
│   - src/services/sheetsService.ts (appends 'Country' column)           │
│   - Centralized Sheet 1e7_9mm7FtQJJnlG-oVOaRjS7JJeRoa0ROZSMCc9BMX4     │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/types.ts`**:
   - Add `country?: string` and `countryCode?: string` to `GuestPost`.
   - Add `targetCountry: string`, `autoRotateCountry: boolean`, `virtualLocationEnabled: boolean`, and optional `proxyUrl?: string` to `ScraperJobConfig` and `ScraperState`.
2. **`server/scraperEngine.ts`**:
   - Implement `COUNTRY_REGISTRY` with:
     - Singapore (SG, `.sg`, `kl=sg-en`, `en-SG,en;q=0.9`, SG subnets)
     - Philippines (PH, `.ph`, `kl=ph-en`, `en-PH,fil-PH;q=0.9`, PH subnets)
     - Malaysia (MY, `.my`, `kl=my-en`, `en-MY,ms-MY;q=0.9`, MY subnets)
     - Indonesia (ID, `.id`, `kl=id-id`, `id-ID,en;q=0.9`, ID subnets)
     - United States, United Kingdom, Australia, and Global.
   - Implement `getVirtualLocationHeaders(countryCode)` to apply localized `Accept-Language`, `CF-IPCountry`, and simulated regional client IP headers to all crawler and footprint requests.
   - Populate `COUNTRY_SEED_POOLS` with verified blogs for Singapore and regional neighbors.
   - Implement seamless country and virtual header rotation when active pool is exhausted.
3. **`src/components/ScraperModal.tsx`**:
   - Add the Location dropdown (default: **Singapore**), the **Virtual Location Emulation** toggle, and optional proxy input.
4. **`src/components/OpportunitiesView.tsx` & `OpportunityDrawer.tsx`**:
   - Add Country dropdown filter and country indicators on each row.
5. **`src/services/sheetsService.ts`**:
   - Update `SHEET_HEADERS` to include `Country` so all synced rows include the country attribute.
