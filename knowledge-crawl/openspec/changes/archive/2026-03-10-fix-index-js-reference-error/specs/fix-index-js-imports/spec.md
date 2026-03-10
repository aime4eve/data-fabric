## ADDED Requirements

### Requirement: Correct Import of Logger Functions
The `src/index.js` file SHALL import all used logger functions, specifically `setLogLevel`.

#### Scenario: Verify setLogLevel Availability
- **WHEN** running `node src/index.js`
- **THEN** it does not throw `ReferenceError: setLogLevel is not defined`
