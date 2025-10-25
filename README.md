# ANSI Automatic Clean Viewer

Automatically detects, hides ANSI escape codes and colorizes text in any text file with intelligent background processing and **full ANSI support**.

## Features

### Core Features
- **Smart ANSI Detection**: Automatically detects ANSI codes in any file type (.log, .txt, .ansi, etc.)
- **Full ANSI Support**:
  - ✨ 256 colors (codes 38;5;n and 48;5;n)
  - ✨ True color RGB (codes 38;2;r;g;b and 48;2;r;g;b)
  - ✨ Bold, italic, underline, strikethrough
  - ✨ Background colors
- **Automatic ANSI Code Hiding**: Escape codes are made invisible while preserving styling
- **Color Preservation**: Text colors and styles are displayed beautifully

### Copy Features
- **Clean Copy**: Ctrl+C (Cmd+C) automatically strips ANSI codes (configurable)
- **Middle-Click Paste** (Linux): Automatically strips ANSI codes when using mouse selection and middle-click paste (requires `xclip` or `xsel`)

### Performance
- **Smart Background Processing**: Large files are processed progressively without blocking VS Code
- **Viewport Optimization**: Visible area is colorized immediately, rest follows automatically
- **No File Modification**: All changes are visual only - your original file remains untouched
- **Memory Efficient**: Processes files in chunks to maintain good performance

### Customization
- **Configurable**: Control which features are enabled
- **Preview Mode**: Temporarily toggle ANSI visibility without changing settings
- **Attribute Control**: Choose which text attributes to display (bold, italic, underline, strikethrough)

## Usage

1. Open any text file containing ANSI escape codes (.log, .txt, .ansi, etc.)
2. ANSI codes are automatically detected and hidden, colors are applied
3. Large files are processed progressively in the background
4. Scroll freely - colorization happens smoothly in real-time
5. Use Ctrl+C (Cmd+C) to copy text without ANSI codes

## Commands

- **Copy Without ANSI Codes**: Copy selected text with ANSI codes automatically removed
  - `Ctrl+C` (Windows/Linux) or `Cmd+C` (macOS) - if `overrideCopyCommand` is enabled
  - Also available via: `Ctrl+Shift+P` → "ANSI Clean Viewer: Copy Without ANSI Codes"

- **Toggle ANSI Code Hiding**: Enable/disable ANSI code processing globally
  - `Ctrl+Shift+P` → "ANSI Clean Viewer: Toggle ANSI Code Hiding"

- **Toggle ANSI Codes Visibility (Preview)**: Temporarily show/hide ANSI codes without changing settings
  - `Ctrl+Shift+P` → "ANSI Clean Viewer: Toggle ANSI Codes Visibility (Preview)"

## Configuration

```json
{
  "ansiCleanViewer.enabled": true,
  "ansiCleanViewer.overrideCopyCommand": true,
  "ansiCleanViewer.enableMiddleClickPaste": true,
  "ansiCleanViewer.showAttributes": {
    "bold": true,
    "italic": true,
    "underline": true,
    "strikethrough": true
  }
}
```

### Configuration Options

- **`enabled`**: Enable/disable automatic ANSI code hiding (default: `true`)
- **`overrideCopyCommand`**: Override Ctrl+C/Cmd+C to copy without ANSI codes (default: `true`)
- **`enableMiddleClickPaste`**: Enable automatic ANSI stripping for Linux middle-click paste (default: `true`)
- **`showAttributes`**: Control which ANSI text attributes to display:
  - **`bold`**: Show bold text (default: `true`)
  - **`italic`**: Show italic text (default: `true`)
  - **`underline`**: Show underlined text (default: `true`)
  - **`strikethrough`**: Show strikethrough text (default: `true`)

## Supported ANSI Codes

### Colors
- **Standard foreground colors** (30-37): Black, Red, Green, Yellow, Blue, Magenta, Cyan, White
- **Bright foreground colors** (90-97): Bright variants of standard colors
- **Standard background colors** (40-47): Background variants
- **Bright background colors** (100-107): Bright background variants
- **256-color palette** (38;5;n for foreground, 48;5;n for background): Full xterm 256-color support
- **True color RGB** (38;2;r;g;b for foreground, 48;2;r;g;b for background): 24-bit true color

### Text Attributes
- **Bold** (code 1)
- **Italic** (code 3)
- **Underline** (code 4)
- **Strikethrough** (code 9)
- **Reset codes** (22, 23, 24, 29, 39, 49) to disable specific attributes

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
