## ADDED Requirements

### Requirement: Navigation Link Extraction
The system SHALL extract navigation links from a domain's homepage when sitemap is unavailable.

#### Scenario: Extract from nav element
- **GIVEN** a homepage with `<nav><a href="/products">Products</a></nav>`
- **WHEN** the system extracts navigation links
- **THEN** `/products` is included in the extracted link list

#### Scenario: Extract from header element
- **GIVEN** a homepage with `<header><a href="/contact">Contact</a></header>`
- **WHEN** the system extracts navigation links
- **THEN** `/contact` is included in the extracted link list

#### Scenario: Extract from footer for key pages
- **GIVEN** a footer containing `<a href="/about">About Us</a>` and `<a href="/privacy">Privacy</a>`
- **WHEN** the system extracts navigation links
- **THEN** `/about` is included (matches key page keywords)
- **AND** `/privacy` may be excluded (lower priority)

### Requirement: Link Filtering
The system SHALL filter extracted links to valid internal navigation links only.

#### Scenario: Exclude external links
- **GIVEN** a link `<a href="https://facebook.com/company">Facebook</a>`
- **WHEN** the system filters links
- **THEN** the external link is excluded

#### Scenario: Exclude anchor links
- **GIVEN** a link `<a href="#section">Jump to section</a>`
- **WHEN** the system filters links
- **THEN** the anchor link is excluded

#### Scenario: Exclude file downloads
- **GIVEN** a link `<a href="/brochure.pdf">Download Brochure</a>`
- **WHEN** the system filters links
- **THEN** the file link is excluded

#### Scenario: Exclude mailto and tel links
- **GIVEN** links `<a href="mailto:info@example.com">` and `<a href="tel:+1234567890">`
- **WHEN** the system filters links
- **THEN** both links are excluded

### Requirement: Navigation Relevance Scoring
The system SHALL score extracted links based on navigation text and URL keywords.

#### Scenario: High-value keyword in URL
- **GIVEN** a link with URL `/products/smart-valve`
- **WHEN** the system calculates relevance
- **THEN** the link receives a high score (contains "product")

#### Scenario: High-value keyword in link text
- **GIVEN** a link with text "Contact Sales Team"
- **WHEN** the system calculates relevance
- **THEN** the link receives a high score (contains "contact")

#### Scenario: Search keyword match
- **GIVEN** search keywords `["solenoid valve", "LoRaWAN"]`
- **AND** a link with URL `/products/lorawan-controller`
- **WHEN** the system calculates relevance
- **THEN** the link receives additional score for keyword match

### Requirement: Result Limiting
The system SHALL limit the number of extracted navigation links.

#### Scenario: Maximum paths limit
- **GIVEN** a homepage with 50 navigation links
- **WHEN** the system extracts and filters links
- **THEN** at most 15 paths are returned
- **AND** paths are sorted by relevance score

### Requirement: Fallback Failure Handling
The system SHALL return failure status when navigation extraction yields no valid links.

#### Scenario: No valid links found
- **GIVEN** a homepage with only external links and file downloads
- **WHEN** the system extracts navigation links
- **THEN** the result indicates failure
- **AND** an empty path list is returned
