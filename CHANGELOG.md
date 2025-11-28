# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2025-11-28

### Added
- **Multiline support**: Status bar now wraps to multiple lines when terminal width is exceeded, ensuring all widgets are visible
- Proper ANSI color reset at line breaks to prevent background color bleeding

### Changed
- **Files widget**: Now shows number of changed files instead of lines added/removed (git widget already shows lines)
- `fitSegmentsToWidth` no longer truncates widgets - all segments are rendered

### Fixed
- ANSI escape code corruption when status bar wraps to multiple lines

## [1.2.1] - 2025-11-27

### Fixed
- Initial stable release with async rendering support

## [1.2.0] - 2025-11-26

### Added
- Async Git information fetching for improved performance
- Widget caching system
- Internationalization support (English/Korean)

## [1.1.0] - 2025-11-25

### Added
- Context window usage widget
- Todo progress widget
- Memory usage widget
- Files widget

## [1.0.0] - 2025-11-24

### Added
- Initial release
- Powerline-style status bar
- 6 core widgets: model, git, tokens, cost, session, cwd
- 3 themes: powerline-dark, powerline-light, minimal
- Interactive TUI configuration
