# Change Log

All notable changes to the "ANSI Automatic Clean Viewer" extension will be documented in this file.

## [1.1.1] - 2025-10-18

### Changed
- Improved extension icon with rounded corners for better visual appearance

## [1.1.0] - 2025-10-18

### Added
- Extension icon showing ANSI code transformation
- Improved activation with `onStartupFinished` event for faster loading

### Changed
- Optimized extension activation to reduce delay when opening .ansi files
- Better visual identity with custom icon

## [1.0.0] - 2025-10-17

### Added
- Initial release
- Automatic ANSI escape code hiding
- Color preservation with ANSI color code support
- Background processing for large files
- Viewport-optimized rendering with 500-line buffer
- Smart throttling for smooth scrolling
- Toggle command to enable/disable ANSI processing
- Support for standard colors (30-37) and bright colors (90-97)
- Bold text support (code 1)
- Memory-efficient chunk processing (1000 lines per 100ms)

### Features
- Real-time colorization during scroll
- Progressive document processing without blocking UI
- Decoration accumulation for persistent colorization
- Memory monitoring and optimization
