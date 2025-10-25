const vscode = require('vscode');

let hideDecorationType = null;
let colorDecorationTypes = new Map();
let backgroundProcessing = new Map(); // Map<docUri, {currentLine, totalLines, intervalId}>
let allDecorations = new Map(); // Map<docUri, {hiddenRanges, coloredRanges}>
let ansiDetectionCache = new Map(); // Map<docUri, {hasAnsi: boolean, checkedRanges: Set<string>}>
let clipboardUtility = null; // Will be set to 'xclip', 'xsel', or null

// ANSI color code mapping
const ANSI_COLORS = {
    '30': '#000000', '31': '#cd0000', '32': '#00cd00', '33': '#cdcd00',
    '34': '#5c5cff', '35': '#cd00cd', '36': '#00cdcd', '37': '#e5e5e5',
    '90': '#7f7f7f', '91': '#ff0000', '92': '#00ff00', '93': '#ffff00',
    '94': '#5c5cff', '95': '#ff00ff', '96': '#00ffff', '97': '#ffffff'
};

const VIEWPORT_BUFFER = 500; // Lines before/after viewport for preloading
const CHUNK_SIZE = 1000; // Lines to process per background chunk
const ANSI_DETECTION_LINES = 50; // Number of lines to check for ANSI codes initially

/**
 * Check if document contains ANSI escape codes in a specific range
 */
function containsAnsiCodes(document, startLine = 0, endLine = null) {
    const startTime = performance.now();
    const docUri = document.uri.toString();

    if (!ansiDetectionCache.has(docUri)) {
        ansiDetectionCache.set(docUri, {
            hasAnsi: false,
            checkedRanges: new Set()
        });
    }

    const cache = ansiDetectionCache.get(docUri);

    // If already found ANSI codes, return immediately
    if (cache.hasAnsi) {
        const elapsed = (performance.now() - startTime).toFixed(2);
        console.log(`[ANSI CLEAN VIEWER] ANSI detection (cached): ${elapsed}ms - ANSI codes present`);
        return true;
    }

    if (endLine === null) {
        endLine = Math.min(startLine + ANSI_DETECTION_LINES - 1, document.lineCount - 1);
    }

    const rangeKey = `${startLine}-${endLine}`;

    // Skip if already checked this range
    if (cache.checkedRanges.has(rangeKey)) {
        const elapsed = (performance.now() - startTime).toFixed(2);
        console.log(`[ANSI CLEAN VIEWER] ANSI detection (already checked range ${rangeKey}): ${elapsed}ms - No ANSI codes`);
        return false;
    }

    const ansiRegex = /\x1b\[([0-9;]*)m/;

    for (let i = startLine; i <= endLine; i++) {
        const lineText = document.lineAt(i).text;
        if (ansiRegex.test(lineText)) {
            cache.hasAnsi = true;
            const elapsed = (performance.now() - startTime).toFixed(2);
            console.log(`[ANSI CLEAN VIEWER] ANSI detection (lines ${startLine}-${endLine}): ${elapsed}ms - ANSI codes FOUND at line ${i}`);
            return true;
        }
    }

    cache.checkedRanges.add(rangeKey);
    const elapsed = (performance.now() - startTime).toFixed(2);
    console.log(`[ANSI CLEAN VIEWER] ANSI detection (lines ${startLine}-${endLine}): ${elapsed}ms - No ANSI codes`);
    return false;
}

/**
 * Get visible range with buffer
 */
function getVisibleRange(editor) {
    const visibleRanges = editor.visibleRanges;
    if (!visibleRanges || visibleRanges.length === 0) {
        return new vscode.Range(0, 0, Math.min(200, editor.document.lineCount - 1), 0);
    }

    const firstVisible = visibleRanges[0].start.line;
    const lastVisible = visibleRanges[visibleRanges.length - 1].end.line;

    const startLine = Math.max(0, firstVisible - VIEWPORT_BUFFER);
    const endLine = Math.min(editor.document.lineCount - 1, lastVisible + VIEWPORT_BUFFER);

    return new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
}

/**
 * Process decorations for a specific range
 */
function processRange(editor, startLine, endLine) {
    const range = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
    const startOffset = editor.document.offsetAt(range.start);
    const text = editor.document.getText(range);

    const hiddenRanges = [];
    const coloredRanges = new Map();

    let currentColor = null;
    let isBold = false;
    let textStart = 0;

    const ansiRegex = /\x1b\[([0-9;]*)m/g;
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
        const codeStart = match.index;
        const codeEnd = match.index + match[0].length;

        if (currentColor && textStart < codeStart) {
            const absoluteStart = startOffset + textStart;
            const absoluteEnd = startOffset + codeStart;
            const startPos = editor.document.positionAt(absoluteStart);
            const endPos = editor.document.positionAt(absoluteEnd);
            const colorRange = new vscode.Range(startPos, endPos);

            const key = `${currentColor}|${isBold}`;
            if (!coloredRanges.has(key)) {
                coloredRanges.set(key, []);
            }
            coloredRanges.get(key).push(colorRange);
        }

        const absoluteStart = startOffset + codeStart;
        const absoluteEnd = startOffset + codeEnd;
        const hideStartPos = editor.document.positionAt(absoluteStart);
        const hideEndPos = editor.document.positionAt(absoluteEnd);
        hiddenRanges.push(new vscode.Range(hideStartPos, hideEndPos));

        const codes = match[1].split(';').filter(c => c);
        if (codes.length === 0 || codes[0] === '0') {
            currentColor = null;
            isBold = false;
        } else {
            for (const code of codes) {
                if (code === '1') {
                    isBold = true;
                } else if (ANSI_COLORS[code]) {
                    currentColor = ANSI_COLORS[code];
                }
            }
        }

        textStart = codeEnd;
    }

    if (currentColor && textStart < text.length) {
        const absoluteStart = startOffset + textStart;
        const absoluteEnd = startOffset + text.length;
        const startPos = editor.document.positionAt(absoluteStart);
        const endPos = editor.document.positionAt(absoluteEnd);
        const colorRange = new vscode.Range(startPos, endPos);

        const key = `${currentColor}|${isBold}`;
        if (!coloredRanges.has(key)) {
            coloredRanges.set(key, []);
        }
        coloredRanges.get(key).push(colorRange);
    }

    return { hiddenRanges, coloredRanges };
}

/**
 * Add decorations to accumulated cache and apply all
 */
function addAndApplyDecorations(editor, hiddenRanges, coloredRanges) {
    const docUri = editor.document.uri.toString();

    // Initialize cache for this document
    if (!allDecorations.has(docUri)) {
        allDecorations.set(docUri, {
            hiddenRanges: [],
            coloredRanges: new Map()
        });
    }

    const cache = allDecorations.get(docUri);

    // Add new hidden ranges
    cache.hiddenRanges.push(...hiddenRanges);

    // Add new colored ranges
    coloredRanges.forEach((ranges, key) => {
        if (!cache.coloredRanges.has(key)) {
            cache.coloredRanges.set(key, []);
        }
        cache.coloredRanges.get(key).push(...ranges);
    });

    // Apply ALL accumulated decorations
    if (!hideDecorationType) {
        hideDecorationType = vscode.window.createTextEditorDecorationType({
            opacity: '0',
            letterSpacing: '-100px'
        });
    }

    editor.setDecorations(hideDecorationType, cache.hiddenRanges);

    cache.coloredRanges.forEach((ranges, key) => {
        const [color, bold] = key.split('|');

        if (!colorDecorationTypes.has(key)) {
            const decorationType = vscode.window.createTextEditorDecorationType({
                color: color,
                fontWeight: bold === 'true' ? 'bold' : 'normal'
            });
            colorDecorationTypes.set(key, decorationType);
        }

        editor.setDecorations(colorDecorationTypes.get(key), ranges);
    });
}

/**
 * Start background processing for entire document
 */
function startBackgroundProcessing(editor) {
    const docUri = editor.document.uri.toString();

    // Stop existing processing for this document
    stopBackgroundProcessing(docUri);

    const totalLines = editor.document.lineCount;
    const visibleRange = getVisibleRange(editor);
    const visibleEnd = visibleRange.end.line;

    console.log(`[ANSI CLEAN VIEWER] Starting background processing for ${totalLines} lines (starting after line ${visibleEnd})`);

    let currentLine = visibleEnd + 1;

    const intervalId = setInterval(() => {
        if (!editor || editor.document.uri.toString() !== docUri) {
            stopBackgroundProcessing(docUri);
            return;
        }

        if (currentLine >= totalLines) {
            stopBackgroundProcessing(docUri);
            console.log(`[ANSI CLEAN VIEWER] Background processing complete for ${docUri}`);
            return;
        }

        const endLine = Math.min(currentLine + CHUNK_SIZE - 1, totalLines - 1);
        const { hiddenRanges, coloredRanges } = processRange(editor, currentLine, endLine);
        addAndApplyDecorations(editor, hiddenRanges, coloredRanges);

        console.log(`[ANSI CLEAN VIEWER] Background processed lines ${currentLine}-${endLine} (${Math.round((endLine / totalLines) * 100)}%)`);

        currentLine = endLine + 1;
    }, 100); // Process chunk every 100ms

    backgroundProcessing.set(docUri, { currentLine, totalLines, intervalId });
}

/**
 * Stop background processing for a document
 */
function stopBackgroundProcessing(docUri) {
    if (backgroundProcessing.has(docUri)) {
        const { intervalId } = backgroundProcessing.get(docUri);
        clearInterval(intervalId);
        backgroundProcessing.delete(docUri);
    }
}

/**
 * Clear all decorations for a document
 */
function clearAllDecorations(docUri) {
    if (allDecorations.has(docUri)) {
        allDecorations.delete(docUri);
    }
}

/**
 * Clear ANSI detection cache for a document
 */
function clearAnsiDetectionCache(docUri) {
    if (ansiDetectionCache.has(docUri)) {
        ansiDetectionCache.delete(docUri);
    }
}

/**
 * Update decorations for visible area and start background processing
 */
function updateDecorations(editor) {
    if (!editor) {
        return;
    }

    const config = vscode.workspace.getConfiguration('ansiCleanViewer');
    if (!config.get('enabled', true)) {
        return;
    }

    // Get visible range for detection
    const visibleRange = getVisibleRange(editor);
    const startLine = visibleRange.start.line;
    const endLine = Math.min(visibleRange.end.line, editor.document.lineCount - 1);

    // Check if document contains ANSI codes in visible area (works for any file type)
    if (!containsAnsiCodes(editor.document, startLine, endLine)) {
        return;
    }

    const docUri = editor.document.uri.toString();

    // Clear previous decorations for this document
    if (allDecorations.has(docUri)) {
        allDecorations.delete(docUri);
    }

    const { hiddenRanges, coloredRanges } = processRange(editor, startLine, endLine);
    addAndApplyDecorations(editor, hiddenRanges, coloredRanges);

    let totalColoredRanges = 0;
    coloredRanges.forEach(ranges => totalColoredRanges += ranges.length);

    const memUsage = process.memoryUsage();
    console.log(`[ANSI CLEAN VIEWER] Initial visible decorations - ${hiddenRanges.length} hidden, ${totalColoredRanges} colored ranges`);
    console.log(`[ANSI CLEAN VIEWER] Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB heap`);

    // Start background processing for the rest of the document
    startBackgroundProcessing(editor);
}


/**
 * Throttled update - limits calls but doesn't wait for scroll to stop
 */
let isUpdating = false;
function scheduleUpdate(editor) {
    if (isUpdating) {
        return; // Skip if already updating
    }

    isUpdating = true;

    // Use setImmediate for smooth updates during scroll (Node.js compatible)
    setImmediate(() => {
        updateDecorations(editor);
        isUpdating = false;
    });
}

/**
 * Detect which clipboard utility is available (Linux only)
 */
function detectClipboardUtility() {
    return new Promise((resolve) => {
        if (process.platform !== 'linux') {
            resolve(null);
            return;
        }

        const { exec } = require('child_process');

        // Try xclip first
        exec('which xclip', (error) => {
            if (!error) {
                console.log('[ANSI CLEAN VIEWER] Using xclip for primary selection');
                resolve('xclip');
            } else {
                // Try xsel as fallback
                exec('which xsel', (error2) => {
                    if (!error2) {
                        console.log('[ANSI CLEAN VIEWER] Using xsel for primary selection');
                        resolve('xsel');
                    } else {
                        console.log('[ANSI CLEAN VIEWER] No clipboard utility found (xclip/xsel). Middle-click paste will include ANSI codes.');
                        resolve(null);
                    }
                });
            }
        });
    });
}

async function activate(context) {
    console.log('[ANSI CLEAN VIEWER] Extension is now ACTIVE (cached mode)!');
    console.log('[ANSI CLEAN VIEWER] To see detection logs, check View > Output > Extension Host');

    // Detect which clipboard utility is available on Linux
    clipboardUtility = await detectClipboardUtility();

    // Update decorations when active editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    // Update decorations when viewport changes (scroll)
    vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        scheduleUpdate(event.textEditor);
    }, null, context.subscriptions);

    // Update when document changes
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            const docUri = event.document.uri.toString();
            stopBackgroundProcessing(docUri);
            clearAllDecorations(docUri);
            clearAnsiDetectionCache(docUri);
            scheduleUpdate(editor);
        }
    }, null, context.subscriptions);

    // Clean up when document is closed
    vscode.workspace.onDidCloseTextDocument(document => {
        const docUri = document.uri.toString();
        stopBackgroundProcessing(docUri);
        clearAllDecorations(docUri);
        clearAnsiDetectionCache(docUri);
    }, null, context.subscriptions);

    // Update decorations when document is opened
    vscode.workspace.onDidOpenTextDocument(document => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    // Command to toggle ANSI processing
    const toggleCommand = vscode.commands.registerCommand('ansiCleanViewer.toggle', () => {
        const config = vscode.workspace.getConfiguration('ansiCleanViewer');
        const currentValue = config.get('enabled', true);
        config.update('enabled', !currentValue, vscode.ConfigurationTarget.Global);

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!currentValue) {
                updateDecorations(editor);
            } else {
                if (hideDecorationType) {
                    hideDecorationType.dispose();
                    hideDecorationType = null;
                }
                colorDecorationTypes.forEach(dt => dt.dispose());
                colorDecorationTypes.clear();
            }
        }
    });

    context.subscriptions.push(toggleCommand);

    // Command to copy text without ANSI codes
    const copyCommand = vscode.commands.registerCommand('ansiCleanViewer.copy', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const selection = editor.selection;
        let textToCopy = '';

        if (selection.isEmpty) {
            // If no selection, copy the entire line (default VS Code behavior)
            const line = editor.document.lineAt(selection.start.line);
            textToCopy = line.text + '\n';
        } else {
            // Copy selected text
            textToCopy = editor.document.getText(selection);
        }

        // Strip ANSI escape codes
        const cleanText = textToCopy.replace(/\x1b\[([0-9;]*)m/g, '');

        // Copy to clipboard
        await vscode.env.clipboard.writeText(cleanText);
    });

    context.subscriptions.push(copyCommand);

    // Auto-copy selection without ANSI codes to primary clipboard (Linux middle-click)
    vscode.window.onDidChangeTextEditorSelection(async (event) => {
        // Only process if a clipboard utility is available
        if (!clipboardUtility) {
            return;
        }

        const editor = event.textEditor;
        const selection = event.selections[0];

        // Only process if there's actual text selected
        if (!selection || selection.isEmpty) {
            return;
        }

        // Get selected text
        const selectedText = editor.document.getText(selection);

        // Check if text contains ANSI codes
        if (!/\x1b\[([0-9;]*)m/.test(selectedText)) {
            return; // No ANSI codes, no need to clean
        }

        // Strip ANSI codes
        const cleanText = selectedText.replace(/\x1b\[([0-9;]*)m/g, '');

        // Copy to primary selection using detected utility
        try {
            const { exec } = require('child_process');
            const command = clipboardUtility === 'xclip'
                ? 'xclip -selection primary'
                : 'xsel --primary --input';

            const proc = exec(command, (err) => {
                if (err) {
                    console.error(`[ANSI CLEAN VIEWER] Failed to copy to primary selection with ${clipboardUtility}:`, err);
                }
            });
            proc.stdin.write(cleanText);
            proc.stdin.end();
        } catch (error) {
            console.error('[ANSI CLEAN VIEWER] Error accessing clipboard utility:', error);
        }
    }, null, context.subscriptions);

    // Update current editor if it's already open
    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor);
    }
}

function deactivate() {
    if (hideDecorationType) {
        hideDecorationType.dispose();
    }
    colorDecorationTypes.forEach(dt => dt.dispose());
    colorDecorationTypes.clear();
}

module.exports = {
    activate,
    deactivate
};
