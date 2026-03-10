## Context

The current system performs web scraping sequentially for both Phase 1 (evidence collection) and Phase 3 (offline archiving). This was an initial design choice to mimic human behavior and avoid detection. However, for non-Google targets (vendor sites), this restriction is overly conservative and severely limits throughput. The codebase also relies on `console.log` for debugging and scattered configuration logic, which hinders maintainability and observability in production-like scenarios.

## Goals / Non-Goals

**Goals:**
- Implement a concurrency control mechanism to allow parallel processing of vendor sites.
- Integrate a structured logging library to standardize log output and support file persistence.
- Centralize configuration management to handle environment variables and defaults consistently.
- Ensure data integrity during concurrent operations (though file writes will remain sequential or locked).

**Non-Goals:**
- Distributed crawling across multiple machines (out of scope for Phase 4).
- Complex database integration (CSV remains the data layer).
- Bypassing Google's anti-bot measures (concurrency applies only to vendor sites).

## Decisions

### 1. Concurrency Management
- **Decision:** Use `p-limit` to control concurrency level.
- **Rationale:** `p-limit` is lightweight, easy to integrate with existing `Promise.all` or loop structures, and sufficient for single-machine parallelism. It avoids the complexity of full-blown job queues like BullMQ for this scale.
- **Constraint:** Google search (Phase 0) will remain sequential to strictly adhere to anti-bot policies. Concurrency is enabled only for Phase 1 and Phase 3.

### 2. Logging Library
- **Decision:** Use `winston`.
- **Rationale:** `winston` is the industry standard for Node.js logging, offering flexible transports (Console, File), log levels, and formatting. It supports log rotation out-of-the-box.
- **Alternative:** `pino` is faster but `winston`'s ecosystem and ease of configuration for file rotation make it a better fit for this project's needs.

### 3. Configuration Management
- **Decision:** Use `dotenv` combined with a singleton `config` module.
- **Rationale:** Standard practice for Node.js applications. A singleton module allows validation of config values at startup and provides a single source of truth.

## Risks / Trade-offs

- **Risk:** Concurrency might trigger rate limiting on vendor sites.
  - **Mitigation:** Default concurrency will be conservative (e.g., 5). Add per-domain rate limiting if multiple URLs from the same domain are in the queue (though current logic mostly targets unique domains).
- **Risk:** Logs might grow indefinitely.
  - **Mitigation:** Configure `winston-daily-rotate-file` to limit log retention (e.g., 14 days) and file size.
- **Risk:** Concurrent file writes to CSV.
  - **Mitigation:** Ensure the CSV writing utility uses a mutex or queue to serialize writes, preventing data corruption.

## Migration Plan

1. Introduce `Logger` and `Config` modules first.
2. Replace `console.log` and direct `process.env` access throughout the codebase.
3. Refactor `evidence-fetcher.js` to accept a concurrency limit.
4. Refactor `offline-archiver.js` to accept a concurrency limit.
5. Verify data integrity with test runs.
