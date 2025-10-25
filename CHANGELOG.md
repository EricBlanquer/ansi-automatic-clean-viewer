# Change Log

## [1.3.0] - 2025-10-25

### Added
- Copy without ANSI codes feature - Ctrl+C (Cmd+C) now automatically strips ANSI escape codes when copying text
- New command "Copy Without ANSI Codes" available via command palette
- Keybinding for copy command that replaces default copy behavior
- Middle-click paste support (Linux) - Automatically strips ANSI codes when using mouse selection and middle-click paste
- Auto-detection of clipboard utilities (xclip/xsel) at startup for optimal performance

### Changed
- Updated documentation to reflect support for all file types, not just .ansi files
- Optimized clipboard utility detection to run once at startup instead of on every selection

## [1.2.0] - 2025-10-25

### Added
- Automatic ANSI code detection for all file types (.log, .txt, etc.)
- Performance timing logs for ANSI detection
- Smart caching system to avoid redundant detection checks
- Detection on scroll for better performance
- Detailed logging with `[ANSI CLEAN VIEWER]` prefix

### Changed
- Extension now activates only when ANSI codes are detected in files
- Reduced initial detection from 100 to 50 lines (viewport size)
- Detection now checks visible range instead of entire document initially
- All logs now use consistent `[ANSI CLEAN VIEWER]` prefix

### Fixed
- Extension no longer interferes with non-ANSI files
- Fixed duplicate variable declaration error
- Improved memory usage with smarter detection caching

## [1.1.1] - 2024-10-17

### Added
- Custom icon for the extension
- Improved extension activation

### Changed
- Renamed extension to "ANSI Automatic Clean Viewer"

## [1.0.0] - Initial Release

### Added
- Automatic ANSI escape code hiding
- Text colorization based on ANSI color codes
- Background processing for large files
- Viewport-based rendering for performance
- Toggle command to enable/disable ANSI processing
