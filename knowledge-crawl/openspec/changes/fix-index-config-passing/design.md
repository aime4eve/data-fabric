## Context

The `src/index.js` file currently calls `getEffectiveConfig` with two arguments: `fileConfig` and `cliConfig`. However, the function definition in `src/utils/config.js` only accepts a single argument, `cliConfig`. This mismatch causes the `cliConfig` passed as the second argument to be ignored, leading to issues where CLI parameters (like `--keywords-file`) are not respected.

## Goals / Non-Goals

**Goals:**
- Fix the call to `getEffectiveConfig` in `src/index.js` to match its function signature.
- Ensure CLI arguments are correctly merged into the configuration.
- Remove redundant code related to `loadConfig`.

**Non-Goals:**
- Refactoring the entire configuration system.
- Adding new configuration options.

## Decisions

- **Modify `src/index.js`**:
  - Remove `const fileConfig = loadConfig();`.
  - Update `const config = getEffectiveConfig(fileConfig, cliConfig);` to `const config = getEffectiveConfig(cliConfig);`.
  - This leverages the existing logic within `getEffectiveConfig` which internally calls `loadConfig()`, ensuring proper merging of CLI arguments and file configuration.

## Risks / Trade-offs

- **Risk**: Potential regression if `getEffectiveConfig` implementation changes.
  - **Mitigation**: Verify the implementation of `getEffectiveConfig` in `src/utils/config.js` confirms it handles `loadConfig` internally. (Already verified during exploration).
