## 1. Infrastructure & Dependencies

- [x] 1.1 Install `fast-xml-parser` dependency
- [x] 1.2 Create `src/services/path-discovery/` directory structure

## 2. Sitemap Discovery Module

- [x] 2.1 Create `src/services/path-discovery/sitemap-fetcher.js`:
  - `fetchSitemap(domain, options)` - main entry
  - `parseSitemapXml(content)` - XML parsing with fast-xml-parser
  - `buildSitemapUrls(domain, sitemapsFromRobots)` - URL list builder
  - `fetchAndParseSitemap(url, options)` - single sitemap fetch with recursion
  - Support for sitemap index (recursive, max depth 2)
  - Support for text sitemap format

- [x] 2.2 Create tests for sitemap-fetcher:
  - Parse standard urlset XML
  - Parse sitemap index XML
  - Parse text sitemap
  - Handle HTTP errors gracefully
  - Handle malformed XML

## 3. URL Normalizer Module

- [x] 3.1 Create `src/services/path-discovery/url-normalizer.js`:
  - `removeTrackingParams(url)` - remove utm_*, session, ref, etc.
  - `groupUrlsByPattern(urls)` - group dynamic URLs
  - `generatePattern(basePath, params)` - create pattern signature
  - `selectRepresentatives(group, maxSelect)` - select 1-2 per group

- [x] 3.2 Create tests for url-normalizer:
  - Remove known tracking parameters
  - Group pagination URLs correctly
  - Group ID parameter URLs correctly
  - Identify RESTful numeric IDs
  - Identify RESTful semantic paths

## 4. Path Filter Module

- [x] 4.1 Create `src/services/path-discovery/path-filter.js`:
  - `PAGE_TYPES` constant with patterns, weights, and quotas
  - `classifyUrl(url)` - determine page type
  - `calculateRelevance(url, keywords)` - keyword matching score
  - `calculateDepthFactor(url)` - depth penalty
  - `calculateFinalScore(url, keywords, sitemapPriority)` - combined score
  - `filterUrls(urls, keywords, options)` - main entry with quota management

- [x] 4.2 Create tests for path-filter:
  - Classify various URL types correctly
  - Calculate relevance with keyword matching
  - Apply quota limits per page type
  - Sort by final score correctly

## 5. Navigation Extractor Module

- [x] 5.1 Create `src/services/path-discovery/nav-extractor.js`:
  - `extractNavLinks(page, domain, options)` - main entry
  - `isValidInternalLink(href, domain)` - filter external/invalid links
  - `calculateNavRelevance(link, keywords)` - nav-specific relevance
  - Extract from nav, header, menu elements
  - Extract from footer for contact/about

- [x] 5.2 Create tests for nav-extractor:
  - Extract links from nav elements
  - Filter external links
  - Filter file/anchor/mailto links
  - Score by nav text and URL keywords

## 6. Main Entry & Integration

- [x] 6.1 Create `src/services/path-discovery/index.js`:
  - `discoverPaths(domain, options)` - main orchestrator
  - Implement fallback chain: sitemap → navigation → skip
  - Logging for each stage

- [x] 6.2 Create integration tests:
  - End-to-end path discovery with mock sitemap
  - Fallback to navigation when sitemap fails
  - Skip domain when both fail

## 7. Codebase Integration

- [x] 7.1 Update `src/index.js`:
  - Import `discoverPaths` from path-discovery
  - Replace fixed `domainItem.paths` with `discoverPaths()` result
  - Add keywords parameter to evidence collection flow

- [x] 7.2 Update `src/services/domain-reader.js`:
  - Remove `EVIDENCE_PATHS` constant
  - Remove paths from domain queue items (discovered dynamically now)

- [x] 7.3 Update `src/services/evidence-fetcher.js` if needed:
  - Ensure compatibility with dynamic paths

## 8. Cleanup & Documentation

- [x] 8.1 Update `CLAUDE.md` with new path discovery architecture
- [x] 8.2 Update `package.json` if any scripts need changes
- [x] 8.3 Run full test suite and verify all tests pass
- [x] 8.4 Manual testing with real domains (sitemap available, no sitemap, mixed)
  - **Bug found & fixed:** `evidence-fetcher.js` was concatenating domain with full URL
  - Original: `https://${domain}${path}` when path is full URL like `https://www.matix.cloud/hardware`
  - Result: `https://www.matix.cloudhttps://www.matix.cloud/hardware` (broken URL)
  - **Fix:** Added `extractPathFromUrl()` helper, now handles both relative paths and full URLs
  - Added 7 regression tests for URL extraction logic
