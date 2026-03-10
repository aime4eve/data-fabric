## 1. Infrastructure & Core Services

- [x] 1.1 Install dependencies: `dotenv`, `p-limit@3`.
- [x] 1.2 Create `src/utils/logger.js`: Implement structured logging (console + file).
- [x] 1.3 Create `src/utils/config.js`: Implement centralized configuration loading from `.env` and CLI args.
- [x] 1.4 Refactor `src/utils/context.js`: Use the new Logger and Config modules.
- [x] 1.5 Replace `console.log` in `src/index.js` with Logger.

## 2. Phase 1 Concurrency (Evidence Fetching)

- [x] 2.1 Create `src/utils/concurrency.js`: Implement `pLimit`, `retryWithBackoff`, `parallel` utilities.
- [x] 2.2 Update `src/index.js`: Integrate concurrency module for Phase 1 evidence fetching.
- [x] 2.3 Verify robots.txt compliance under concurrency (stateless checkers).
- [x] 2.4 Test Phase 1 collection with multiple domains to verify speedup and stability.

## 3. Phase 3 Concurrency (Offline Archiving)

- [x] 3.1 Refactor `src/services/offline-archiver.js`: Use `p-limit` for concurrent downloads.
- [x] 3.2 Implement safe CSV appending for `download_history.csv`.
- [x] 3.3 Test Phase 3 downloading with a list of URLs to verify concurrency.

## 4. Cleanup & Documentation

- [x] 4.1 Remove direct `process.env` usage across the codebase (use `config.js` instead).
- [x] 4.2 Update documentation with new configuration options and environment variable documentation.
- [x] 4.3 Verify all tests pass (39 tests, 0 failures).
