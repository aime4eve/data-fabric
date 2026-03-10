## ADDED Requirements

### Requirement: Concurrent Task Execution
The system SHALL support executing a list of tasks concurrently with a configurable concurrency limit.

#### Scenario: Basic concurrency
- **WHEN** a list of 10 tasks is provided with a concurrency limit of 2
- **THEN** at most 2 tasks run simultaneously at any given time
- **AND** all tasks eventually complete

#### Scenario: Error handling in concurrency
- **WHEN** one task in the concurrent batch fails
- **THEN** the failure is caught and reported
- **AND** other tasks continue to execute without interruption

### Requirement: Browser Context Management
The system SHALL manage browser contexts efficiently during concurrent execution, supporting either a shared context or per-task contexts.

#### Scenario: Shared context
- **WHEN** configured to use a persistent context
- **THEN** multiple pages are created within the same browser context up to the concurrency limit

### Requirement: Rate Limiting
The system SHALL respect a minimum delay between task initiations to prevent overwhelming the target or local resources.

#### Scenario: Staggered start
- **WHEN** multiple tasks are queued
- **THEN** their start times are staggered by a random delay (e.g., 500-2000ms)
