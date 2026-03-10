## Why

Current data collection (Phase 1 & Phase 3) operates sequentially, limiting throughput for non-Google targets. As the target list grows, collection time becomes a bottleneck. Additionally, the system lacks structured logging and centralized configuration management, making monitoring and maintenance difficult in production environments. This change addresses these technical debt items to support larger-scale operations.

## What Changes

- **Parallel Execution Engine**: Implement concurrency control for Phase 1 evidence fetching and Phase 3 offline archiving to improve speed by 5-10x.
- **Structured Logging**: Replace `console.log` with a structured logging library (e.g., `winston`) supporting log levels and file rotation.
- **Centralized Configuration**: Introduce `dotenv` and a unified configuration module to manage settings and secrets securely.
- **Data Robustness**: Enhance CSV read/write operations with validation and error handling to prevent data corruption.

## Capabilities

### New Capabilities
- `concurrency-control`: Mechanisms to manage parallel browser contexts and limit concurrent requests.
- `structured-logging`: A centralized logging service with levels, formatting, and transport management.
- `configuration-management`: A unified interface for accessing runtime configuration and secrets.

### Modified Capabilities
- `evidence-fetching`: Updated to utilize concurrency control for fetching evidence pages.
- `offline-archiving`: Updated to utilize concurrency control for downloading offline pages.

## Impact

- **Codebase**: 
  - Refactoring `src/services/serp-collector.js`, `src/services/evidence-fetcher.js`, and `src/services/offline-archiver.js`.
  - New modules in `src/utils/` for logging and config.
- **Dependencies**: 
  - Add `p-limit` for concurrency.
  - Add `winston` for logging.
  - Add `dotenv` for environment variables.
- **Performance**: Significant reduction in total collection time for Phase 1 and Phase 3.
- **Observability**: Improved debugging and monitoring capabilities via log files.
