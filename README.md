# ANSI Automatic Clean Viewer

Automatically detects, hides ANSI escape codes and colorizes text in any text file with intelligent background processing.

## Features

- **Smart ANSI Detection**: Automatically detects ANSI codes in any file type (.log, .txt, .ansi, etc.)
- **Automatic ANSI Code Hiding**: Escape codes like `\x1b[1;34m` are made invisible
- **Color Preservation**: Text colors are preserved and displayed beautifully
- **Clean Copy**: Copy text without ANSI codes - Ctrl+C (Cmd+C) automatically strips escape codes
- **Middle-Click Paste** (Linux): Automatically strips ANSI codes when using mouse selection and middle-click paste (requires `xclip` or `xsel`)
- **Smart Background Processing**: Large files are processed progressively without blocking VS Code
- **Viewport Optimization**: Visible area is colorized immediately, rest follows automatically
- **No File Modification**: All changes are visual only - your original file remains untouched
- **Memory Efficient**: Processes files in chunks to maintain good performance

## Usage

1. Open any text file containing ANSI escape codes (.log, .txt, .ansi, etc.)
2. ANSI codes are automatically detected and hidden, colors are applied
3. Large files are processed progressively in the background
4. Scroll freely - colorization happens smoothly in real-time
5. Use Ctrl+C (Cmd+C) to copy text without ANSI codes

## Commands

- **Copy Without ANSI Codes**: Copy selected text with ANSI codes automatically removed
  - `Ctrl+C` (Windows/Linux) or `Cmd+C` (macOS)
  - Also available via: `Ctrl+Shift+P` → "ANSI Clean Viewer: Copy Without ANSI Codes"

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

### Optional (Linux only)

For middle-click paste without ANSI codes, install one of the following:

```bash
# Ubuntu/Debian
sudo apt install xclip

# Or alternatively
sudo apt install xsel
```

Without these utilities, middle-click paste will include ANSI codes (default X11 behavior).

## License

MIT
