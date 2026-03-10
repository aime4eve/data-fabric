## ADDED Requirements

### Requirement: CLI Argument Parsing
The system SHALL respect CLI arguments for configuration, ensuring that parameters passed via the command line override defaults and environment variables.

#### Scenario: User provides keywords file
- **WHEN** user runs `node src/index.js --keywords-file "./keywords.csv"`
- **THEN** the system uses the specified keywords file for keyword extraction.
- **THEN** no "No keyword source specified" warning is displayed.
