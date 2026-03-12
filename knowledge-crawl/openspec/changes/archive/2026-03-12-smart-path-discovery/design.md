## Context

Phase 1 evidence fetching currently uses a hardcoded list of 8 paths (`EVIDENCE_PATHS`) for all domains. This brute-force approach:
- Generates many 404 errors on sites with different structures
- Misses valuable pages not in the predefined list
- Ignores sitemap.xml which most professional websites provide

The goal is to discover the actual page structure of each domain before fetching evidence pages.

## Goals / Non-Goals

**Goals:**
- Discover actual page URLs from sitemap.xml or homepage navigation
- Filter and prioritize URLs based on relevance to search keywords
- Handle dynamic URL patterns (pagination, ID parameters) intelligently
- Reduce wasted 404 requests and improve evidence quality

**Non-Goals:**
- Full-site crawling (we only need 10-15 representative pages)
- Real-time page analysis (discovery happens before fetching)
- Machine learning-based relevance (keyword matching is sufficient)

## Decisions

### 1. Path Discovery Strategy

**Decision:** Three-tier fallback chain: sitemap → navigation → skip

**Rationale:**
- Sitemap is the most authoritative source when available
- Navigation extraction covers sites without sitemap
- Skipping (rather than using fixed paths) avoids wasted 404s

```
Domain → Sitemap? → Use sitemap paths
              ↓ No
         Navigation? → Use nav links
              ↓ No
         Skip domain (log warning)
```

### 2. Sitemap Processing

**Decision:** Use `fast-xml-parser` with recursive depth limit of 2

**Rationale:**
- `fast-xml-parser` is lightweight and handles XML edge cases well
- Depth limit of 2 covers sitemap index → sub-sitemaps without explosion
- Large sites with thousands of URLs are handled by path filtering

### 3. Dynamic URL Handling

**Decision:** Three-stage processing: clean → group → select

**Rationale:**
- Tracking parameters (utm_*, session, etc.) should be removed
- URLs with same pattern (/product.php?id=*) should be grouped
- Select 1-2 representatives per group to avoid over-fetching

**Dynamic URL types and handling:**
| Type | Example | Strategy | Max Selected |
|------|---------|----------|--------------|
| Pagination | /products?page=* | First page + one middle | 2 |
| ID parameter | /product.php?id=* | One representative | 1 |
| RESTful numeric | /product/123 | One representative | 1 |
| RESTful semantic | /products/valve-name | By keyword relevance | 3-5 |

### 4. Path Filtering

**Decision:** Four-stage pipeline: classify → score → sort → quota

**Rationale:**
- Page type classification ensures coverage of key pages (contact, about, products)
- Relevance scoring prioritizes pages matching search keywords
- Quota system guarantees diversity (not all product pages)

**Scoring formula:**
```
finalScore = typeWeight × 0.35
           + relevanceScore × 0.30
           + sitemapPriority × 0.20
           + (1 - depthFactor) × 0.15
```

**Quota allocation (total 15):**
| Page Type | Min | Max |
|-----------|-----|-----|
| HOME | 1 | 1 |
| CONTACT | 1 | 2 |
| ABOUT | 1 | 2 |
| PRODUCTS_LIST | 1 | 2 |
| PRODUCT_DETAIL | 0 | 5 |
| SOLUTIONS | 0 | 2 |
| OTHER | 0 | remaining |

### 5. Multi-language Handling

**Decision:** Prefer English paths, accept others as fallback

**Rationale:**
- Search keywords are typically in English
- /en/, /en-us/, or no prefix = English (preferred)
- Other language paths are lower priority but not excluded

## Architecture

```
src/services/path-discovery/
├── index.js                 # Main entry: discoverPaths()
├── sitemap-fetcher.js       # Sitemap fetching and parsing
├── nav-extractor.js         # Homepage navigation extraction
├── path-filter.js           # URL filtering and scoring
└── url-normalizer.js        # URL cleaning and grouping
```

**Data flow:**
```
                    ┌─────────────────┐
                    │     Domain      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             │
     ┌─────────────────┐                    │
     │  robots.txt     │                    │
     │  (sitemap URLs) │                    │
     └────────┬────────┘                    │
              │                             │
              ▼                             │
     ┌─────────────────┐    Fail    ┌───────┴───────┐
     │ Sitemap Fetcher │───────────▶│ Nav Extractor │
     │  + Parser       │            │  (fallback)   │
     └────────┬────────┘            └───────┬───────┘
              │ Success                    │ Success
              │                            │
              └──────────┬─────────────────┘
                         ▼
                ┌─────────────────┐
                │  URL Normalizer │
                │  (clean, group) │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Path Filter    │
                │  (classify,     │
                │   score, quota) │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  10-15 paths    │
                └─────────────────┘
```

## Risks / Trade-offs

- **Risk:** Sitemap not available on many sites
  - **Mitigation:** Navigation extraction fallback covers most professional sites

- **Risk:** Navigation extraction may miss important pages
  - **Mitigation:** This is acceptable; we prefer accuracy over coverage

- **Risk:** Increased latency from discovery phase
  - **Mitigation:** Sitemap fetch is fast (HTTP); nav extraction reuses the homepage visit

- **Risk:** Dynamic URL patterns may vary widely
  - **Mitigation:** Conservative grouping and representative selection

## Migration Plan

1. Add `fast-xml-parser` dependency
2. Create `path-discovery/` module with all sub-modules
3. Create unit tests for each sub-module
4. Integrate `discoverPaths()` into `collectPhase1Evidence()`
5. Remove `EVIDENCE_PATHS` from `domain-reader.js`
6. Update `index.js` to use new path discovery flow
7. End-to-end testing with real domains
