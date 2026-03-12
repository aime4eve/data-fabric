## Why

The current evidence page fetching strategy uses a fixed list of 8 predefined paths (`/`, `/products`, `/contact`, etc.) for all domains. This approach has significant limitations:

1. **Wasted requests**: Many websites don't have all these paths, resulting in 404 errors that waste resources and increase detection risk
2. **Missed content**: Real website structures vary significantly - some use `/products/item-name`, others use `/product.php?id=123`, and many have `/solutions` or `/services` instead of `/products`
3. **No intelligence**: The system doesn't learn from actual site structure or prioritize based on relevance to search keywords

Additionally, sitemaps (which many websites provide) contain the actual page structure but are completely ignored.

## What Changes

- **Sitemap-based Discovery**: Fetch and parse `sitemap.xml` to discover actual page URLs with priority metadata
- **Navigation Extraction Fallback**: When sitemap fails, extract links from homepage navigation elements
- **Intelligent Path Filtering**: Multi-stage filtering to select the most valuable 10-15 paths based on page type, keyword relevance, and sitemap priority
- **Dynamic URL Handling**: Normalize, deduplicate, and select representative URLs from dynamic patterns (pagination, ID parameters, RESTful paths)
- **Remove Fixed Paths**: Delete `EVIDENCE_PATHS` constant and rely entirely on discovered paths

## Capabilities

### New Capabilities
- `sitemap-discovery`: Fetch and parse sitemap.xml with support for sitemap index, recursive depth, and multiple formats (XML, text)
- `navigation-extraction`: Extract navigation links from homepage when sitemap is unavailable
- `dynamic-url-handling`: Clean tracking parameters, group URLs by pattern, and select representatives
- `path-filtering`: Multi-stage filtering with page type classification, relevance scoring, and quota management

### Modified Capabilities
- `evidence-fetching`: Updated to use discovered paths instead of fixed paths
- `domain-reader`: `EVIDENCE_PATHS` constant removed, path discovery integrated

## Impact

- **Codebase**:
  - New `src/services/path-discovery/` module with 4 sub-modules
  - Refactor `src/index.js` to integrate path discovery
  - Remove `EVIDENCE_PATHS` from `src/services/domain-reader.js`
- **Dependencies**:
  - Add `fast-xml-parser` for sitemap XML parsing
- **Performance**:
  - Reduced 404 requests and faster evidence collection
  - More relevant pages captured per domain
- **Reliability**:
  - Graceful fallback chain: sitemap → navigation → skip domain
