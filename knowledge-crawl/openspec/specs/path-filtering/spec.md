## ADDED Requirements

### Requirement: Page Type Classification
The system SHALL classify URLs into predefined page types based on URL patterns.

#### Scenario: Classify home page
- **GIVEN** a URL `/` or `/index` or `/home`
- **WHEN** the system classifies the page type
- **THEN** the type is `HOME` with weight 1.0

#### Scenario: Classify contact page
- **GIVEN** a URL `/contact` or `/contact-us` or `/get-in-touch`
- **WHEN** the system classifies the page type
- **THEN** the type is `CONTACT` with weight 0.95

#### Scenario: Classify about page
- **GIVEN** a URL `/about` or `/company` or `/who-we-are`
- **WHEN** the system classifies the page type
- **THEN** the type is `ABOUT` with weight 0.9

#### Scenario: Classify products list page
- **GIVEN** a URL `/products` or `/product` or `/catalog`
- **WHEN** the system classifies the page type
- **THEN** the type is `PRODUCTS_LIST` with weight 0.85

#### Scenario: Classify product detail page
- **GIVEN** a URL `/products/solenoid-valve` or `/product/123`
- **WHEN** the system classifies the page type
- **THEN** the type is `PRODUCT_DETAIL` with weight 0.7

#### Scenario: Classify solutions page
- **GIVEN** a URL `/solutions` or `/services` or `/industries`
- **WHEN** the system classifies the page type
- **THEN** the type is `SOLUTIONS` with weight 0.8

#### Scenario: Classify blog page
- **GIVEN** a URL `/blog/article-title` or `/news/update`
- **WHEN** the system classifies the page type
- **THEN** the type is `BLOG` with weight 0.3

### Requirement: Keyword Relevance Scoring
The system SHALL calculate relevance score based on search keyword matching.

#### Scenario: Exact keyword match
- **GIVEN** search keywords `["solenoid valve", "LoRaWAN"]`
- **AND** a URL `/products/solenoid-valve-controller`
- **WHEN** the system calculates relevance
- **THEN** the score reflects high relevance (multiple keyword matches)

#### Scenario: Partial keyword match
- **GIVEN** search keywords `["solenoid valve"]`
- **AND** a URL `/products/water-valve`
- **WHEN** the system calculates relevance
- **THEN** the score reflects partial relevance (valve match)

#### Scenario: No keyword match
- **GIVEN** search keywords `["solenoid valve"]`
- **AND** a URL `/about/company-history`
- **WHEN** the system calculates relevance
- **THEN** the score is 0 (no matches)

### Requirement: Combined Score Calculation
The system SHALL calculate a final score combining multiple factors.

#### Scenario: Score formula application
- **GIVEN** a URL with:
  - page type weight 0.7
  - keyword relevance 0.75
  - sitemap priority 0.8
  - depth factor 0.33 (2 levels deep)
- **WHEN** the system calculates the final score
- **THEN** the score = 0.7×0.35 + 0.75×0.30 + 0.8×0.20 + 0.67×0.15 ≈ 0.73

### Requirement: Quota Management
The system SHALL enforce minimum and maximum quotas per page type.

#### Scenario: Enforce minimum quotas
- **GIVEN** 100 URLs with only product pages (no contact, about, home)
- **WHEN** the system applies quotas
- **THEN** the system ensures at least 1 HOME, 1 CONTACT, 1 ABOUT, 1 PRODUCTS_LIST

#### Scenario: Enforce maximum quotas
- **GIVEN** 50 product detail URLs in the candidate list
- **WHEN** the system applies quotas (max 5 for PRODUCT_DETAIL)
- **THEN** at most 5 product detail URLs are selected

#### Scenario: Total output limit
- **GIVEN** 200 candidate URLs after scoring
- **WHEN** the system finalizes the path list
- **THEN** at most 15 URLs are returned

### Requirement: Path Deduplication
The system SHALL deduplicate URLs that resolve to the same path.

#### Scenario: Deduplicate with trailing slash
- **GIVEN** URLs `/products` and `/products/`
- **WHEN** the system deduplicates
- **THEN** only one path is kept

#### Scenario: Deduplicate after parameter removal
- **GIVEN** URLs `/contact?ref=nav` and `/contact?ref=footer`
- **WHEN** the system cleans and deduplicates
- **THEN** only one path `/contact` is kept
