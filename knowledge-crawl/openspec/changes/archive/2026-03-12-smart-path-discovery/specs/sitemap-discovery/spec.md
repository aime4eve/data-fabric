## ADDED Requirements

### Requirement: Sitemap URL Discovery
The system SHALL discover sitemap URLs from multiple sources in order of priority.

#### Scenario: Sitemap from robots.txt
- **GIVEN** a domain with robots.txt containing `Sitemap: https://example.com/sitemap.xml`
- **WHEN** the system fetches sitemap information
- **THEN** the sitemap URL is extracted from robots.txt

#### Scenario: Default sitemap path fallback
- **GIVEN** a domain without sitemap declaration in robots.txt
- **WHEN** the system fetches sitemap information
- **THEN** the system attempts `/sitemap.xml` and `/sitemap_index.xml`

### Requirement: Sitemap XML Parsing
The system SHALL parse sitemap XML content and extract URL entries.

#### Scenario: Standard urlset parsing
- **GIVEN** a sitemap with `<urlset>` containing multiple `<url>` entries
- **WHEN** the system parses the sitemap
- **THEN** all URLs are extracted with their `loc`, `priority`, `lastmod`, and `changefreq` values

#### Scenario: Sitemap index parsing
- **GIVEN** a sitemap index with `<sitemapindex>` containing child sitemap references
- **WHEN** the system parses the sitemap
- **THEN** child sitemap URLs are extracted for recursive fetching

#### Scenario: Text sitemap parsing
- **GIVEN** a plain text sitemap with one URL per line
- **WHEN** the system parses the sitemap
- **THEN** all URLs are extracted with default priority (0.5)

### Requirement: Recursive Sitemap Index Handling
The system SHALL recursively fetch child sitemaps from sitemap index files with depth limit.

#### Scenario: Sitemap index recursion
- **GIVEN** a sitemap index referencing 3 child sitemaps
- **WHEN** the system processes the index
- **THEN** all child sitemaps are fetched and parsed
- **AND** URLs from all children are merged into the result

#### Scenario: Depth limit enforcement
- **GIVEN** a nested sitemap index structure deeper than the max depth (2)
- **WHEN** the system processes the sitemaps
- **THEN** fetching stops at the configured depth limit
- **AND** a warning is logged for truncated recursion

### Requirement: Error Handling
The system SHALL handle sitemap errors gracefully without failing the entire discovery.

#### Scenario: HTTP error on sitemap
- **GIVEN** a sitemap URL returning HTTP 404
- **WHEN** the system attempts to fetch the sitemap
- **THEN** the error is logged as a warning
- **AND** the system falls back to navigation extraction

#### Scenario: Malformed XML
- **GIVEN** a sitemap with invalid XML structure
- **WHEN** the system parses the sitemap
- **THEN** the error is logged as a warning
- **AND** the system attempts regex fallback extraction for `<loc>` tags
