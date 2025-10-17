# ANSI Automatic Clean Viewer

Automatically hides ANSI escape codes and colorizes text in `.ansi` files with intelligent background processing.

## Features

- **Automatic ANSI Code Hiding**: Escape codes like `\x1b[1;34m` are made invisible
- **Color Preservation**: Text colors are preserved and displayed beautifully
- **Smart Background Processing**: Large files are processed progressively without blocking VS Code
- **Viewport Optimization**: Visible area is colorized immediately, rest follows automatically
- **No File Modification**: All changes are visual only - your original file remains untouched
- **Memory Efficient**: Processes files in chunks to maintain good performance

## Usage

1. Open any file with `.ansi` extension
2. ANSI codes are automatically hidden and colors are applied
3. Large files are processed progressively in the background
4. Scroll freely - colorization happens smoothly in real-time

## Commands

- **Toggle ANSI Code Hiding**: Enable/disable ANSI code processing
  - `Ctrl+Shift+P` → "ANSI Clean Viewer: Toggle ANSI Code Hiding"

## Configuration

```json
{
  "ansiCleanViewer.enabled": true
}
```

## Supported ANSI Colors

- Standard colors (30-37): Black, Red, Green, Yellow, Blue, Magenta, Cyan, White
- Bright colors (90-97): Bright variants of standard colors
- Bold text (code 1)

## How It Works

The extension uses VS Code's **TextEditorDecorationType API** to:
1. Hide ANSI codes by setting opacity to 0 and collapsing letter spacing
2. Apply colors to text based on ANSI color codes
3. Process large files progressively (1000 lines per 100ms) in the background
4. Maintain decorations across the entire document

## Performance

- **Viewport Buffer**: 500 lines before/after visible area for smooth scrolling
- **Chunk Processing**: 1000 lines per background iteration
- **Throttled Updates**: Smart throttling prevents UI blocking during scroll
- **Memory Management**: Accumulates decorations efficiently without memory leaks

## Requirements

- VS Code 1.60.0 or higher

## License

MIT
