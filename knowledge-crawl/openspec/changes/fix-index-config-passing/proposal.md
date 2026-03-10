## Why

The `src/index.js` file incorrectly calls `getEffectiveConfig` with two arguments (`fileConfig`, `cliConfig`), while the function definition in `src/utils/config.js` only accepts one argument (`cliConfig`). This causes CLI arguments like `--keywords-file` to be ignored, preventing the user from specifying a keywords file and triggering a "No keyword source specified" warning.

## What Changes

- Modify `src/index.js` to correctly call `getEffectiveConfig(cliConfig)`.
- Remove the redundant `loadConfig()` call in `src/index.js` as `getEffectiveConfig` already handles configuration loading internally.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
    Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->

## Impact

- `src/index.js`: The main entry point will be updated to correctly initialize configuration.
