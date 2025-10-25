# Change Log

## [1.4.0] - 2025-10-25

### Added
- **Full ANSI Support**:
  - 256-color palette (codes 38;5;n and 48;5;n)
  - True color RGB support (codes 38;2;r;g;b and 48;2;r;g;b)
  - Background colors (codes 40-47, 100-107)
  - Italic text attribute (code 3)
  - Underline text attribute (code 4)
  - Strikethrough text attribute (code 9)
  - Reset codes for individual attributes (22, 23, 24, 29, 39, 49)
- **Configuration Options**:
  - `overrideCopyCommand`: Control whether Ctrl+C strips ANSI codes (default: true)
  - `enableMiddleClickPaste`: Enable/disable middle-click paste cleaning (default: true)
  - `showAttributes`: Granular control over which attributes to display (bold, italic, underline, strikethrough)
- **Preview Mode**: New command to temporarily toggle ANSI visibility without changing settings
- **Linux Notification**: Smart notification to install xclip/xsel when missing, with helpful install instructions

### Changed
- Refactored ANSI parsing to support complex color codes and multiple attributes simultaneously
- Improved decoration handling to support foreground + background color combinations
- Enhanced configuration system with more granular control

### Performance
- Optimized attribute parsing for better performance with complex ANSI sequences
- Improved memory efficiency with better decoration key management

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
