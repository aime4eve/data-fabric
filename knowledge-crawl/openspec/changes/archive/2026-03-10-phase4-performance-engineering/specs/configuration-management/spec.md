## ADDED Requirements

### Requirement: Environment Variable Loading
The system SHALL load configuration from `.env` files if present, overriding default values.

#### Scenario: Loading .env
- **WHEN** a `.env` file exists with `LOG_LEVEL=debug`
- **THEN** the configuration system returns `debug` for `logLevel`

### Requirement: Centralized Configuration Access
The system SHALL provide a singleton configuration object that validates and exposes all application settings.

#### Scenario: Default values
- **WHEN** a configuration key is not present in environment variables or CLI args
- **THEN** the system returns the defined default value

#### Scenario: CLI override
- **WHEN** a configuration value is provided via CLI argument (e.g., `--timeout 5000`)
- **THEN** it overrides both the default and the environment variable value
