## ADDED Requirements

### Requirement: Tracking Parameter Removal
The system SHALL remove known tracking parameters from URLs before processing.

#### Scenario: Remove UTM parameters
- **GIVEN** a URL `/products?utm_source=google&utm_campaign=spring`
- **WHEN** the system cleans the URL
- **THEN** the result is `/products`

#### Scenario: Remove session parameters
- **GIVEN** a URL `/contact?session=abc123&ref=email`
- **WHEN** the system cleans the URL
- **THEN** the result is `/contact`

#### Scenario: Preserve content parameters
- **GIVEN** a URL `/products?id=123&page=2`
- **WHEN** the system cleans the URL
- **THEN** the parameters are preserved (`/products?id=123&page=2`)

### Requirement: URL Pattern Grouping
The system SHALL group URLs with similar dynamic patterns.

#### Scenario: Group pagination URLs
- **GIVEN** URLs `/products?page=1`, `/products?page=2`, `/products?page=3`
- **WHEN** the system groups URLs
- **THEN** all URLs are grouped under pattern `/products?page=*`

#### Scenario: Group ID parameter URLs
- **GIVEN** URLs `/product.php?id=1`, `/product.php?id=2`, `/product.php?id=500`
- **WHEN** the system groups URLs
- **THEN** all URLs are grouped under pattern `/product.php?id=*`

#### Scenario: Separate static and dynamic URLs
- **GIVEN** URLs `/contact`, `/about`, `/products?page=1`, `/products?page=2`
- **WHEN** the system groups URLs
- **THEN** `/contact` and `/about` are in separate "static" groups
- **AND** the pagination URLs are in one dynamic group

### Requirement: Representative Selection
The system SHALL select representative URLs from each dynamic pattern group.

#### Scenario: Select from pagination group
- **GIVEN** a pagination group with 20 URLs (`/products?page=1` through `page=20`)
- **WHEN** the system selects representatives (max 2)
- **THEN** the first page (`page=1`) is selected
- **AND** optionally one middle page is selected

#### Scenario: Select from ID parameter group
- **GIVEN** an ID group with 500 URLs (`/product.php?id=1` through `id=500`)
- **WHEN** the system selects representatives (max 1)
- **THEN** only one URL (e.g., `id=1`) is selected

#### Scenario: Keep all static URLs
- **GIVEN** static URLs `/contact`, `/about`, `/products`
- **WHEN** the system processes the group
- **THEN** all URLs are kept (no representative selection needed)

### Requirement: RESTful URL Handling
The system SHALL identify and handle RESTful URL patterns.

#### Scenario: Identify numeric RESTful IDs
- **GIVEN** URLs `/product/123`, `/product/456`, `/product/789`
- **WHEN** the system analyzes the pattern
- **THEN** the URLs are identified as RESTful numeric IDs
- **AND** only 1 representative is selected

#### Scenario: Identify semantic RESTful paths
- **GIVEN** URLs `/products/solenoid-valve`, `/products/water-pump`, `/products/controller-lorawan`
- **WHEN** the system analyzes the pattern
- **THEN** the URLs are identified as RESTful semantic paths
- **AND** representatives are selected by keyword relevance

### Requirement: Dynamic URL Penalty
The system SHALL apply lower weight to dynamic URLs in final scoring.

#### Scenario: Static URL full weight
- **GIVEN** a static URL `/contact`
- **WHEN** the system calculates weight
- **THEN** full weight (1.0) is applied

#### Scenario: RESTful semantic partial weight
- **GIVEN** a semantic RESTful URL `/products/solenoid-valve`
- **WHEN** the system calculates weight
- **THEN** reduced weight (0.8) is applied

#### Scenario: Pagination non-first page reduced weight
- **GIVEN** a pagination URL `/products?page=5`
- **WHEN** the system calculates weight
- **THEN** reduced weight (0.4) is applied

#### Scenario: ID parameter reduced weight
- **GIVEN** an ID parameter URL `/product.php?id=123`
- **WHEN** the system calculates weight
- **THEN** reduced weight (0.5) is applied
