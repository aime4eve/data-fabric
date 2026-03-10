## 1. Code Modification

- [x] 1.1 Update `src/index.js` to correct the `getEffectiveConfig` function call, removing the redundant `loadConfig` call and passing only `cliConfig`.

## 2. Verification

- [x] 2.1 Verify the fix by running the command `node src/index.js --keywords-file "./keywords.csv"` and ensuring no warning about missing keyword source is displayed.
