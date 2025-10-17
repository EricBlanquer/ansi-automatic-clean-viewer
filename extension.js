const vscode = require('vscode');

let hideDecorationType = null;
let colorDecorationTypes = new Map();
let backgroundProcessing = new Map(); // Map<docUri, {currentLine, totalLines, intervalId}>
let allDecorations = new Map(); // Map<docUri, {hiddenRanges, coloredRanges}>

// ANSI color code mapping
const ANSI_COLORS = {
    '30': '#000000', '31': '#cd0000', '32': '#00cd00', '33': '#cdcd00',
    '34': '#5c5cff', '35': '#cd00cd', '36': '#00cdcd', '37': '#e5e5e5',
    '90': '#7f7f7f', '91': '#ff0000', '92': '#00ff00', '93': '#ffff00',
    '94': '#5c5cff', '95': '#ff00ff', '96': '#00ffff', '97': '#ffffff'
};

const VIEWPORT_BUFFER = 500; // Lines before/after viewport for preloading
const CHUNK_SIZE = 1000; // Lines to process per background chunk

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

    console.log(`Starting background processing for ${totalLines} lines (starting after line ${visibleEnd})`);

    let currentLine = visibleEnd + 1;

    const intervalId = setInterval(() => {
        if (!editor || editor.document.uri.toString() !== docUri) {
            stopBackgroundProcessing(docUri);
            return;
        }

        if (currentLine >= totalLines) {
            stopBackgroundProcessing(docUri);
            console.log(`Background processing complete for ${docUri}`);
            return;
        }

        const endLine = Math.min(currentLine + CHUNK_SIZE - 1, totalLines - 1);
        const { hiddenRanges, coloredRanges } = processRange(editor, currentLine, endLine);
        addAndApplyDecorations(editor, hiddenRanges, coloredRanges);

        console.log(`Background processed lines ${currentLine}-${endLine} (${Math.round((endLine / totalLines) * 100)}%)`);

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
 * Update decorations for visible area and start background processing
 */
function updateDecorations(editor) {
    if (!editor) {
        return;
    }

    if (editor.document.languageId !== 'ansi') {
        return;
    }

    const config = vscode.workspace.getConfiguration('ansiCleanViewer');
    if (!config.get('enabled', true)) {
        return;
    }

    const docUri = editor.document.uri.toString();

    // Clear previous decorations for this document
    if (allDecorations.has(docUri)) {
        allDecorations.delete(docUri);
    }

    const visibleRange = getVisibleRange(editor);
    const { hiddenRanges, coloredRanges } = processRange(editor, visibleRange.start.line, visibleRange.end.line);
    addAndApplyDecorations(editor, hiddenRanges, coloredRanges);

    let totalColoredRanges = 0;
    coloredRanges.forEach(ranges => totalColoredRanges += ranges.length);

    const memUsage = process.memoryUsage();
    console.log(`ANSI Clean Viewer: Initial visible decorations - ${hiddenRanges.length} hidden, ${totalColoredRanges} colored ranges`);
    console.log(`Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB heap`);

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

function activate(context) {
    console.log('ANSI CLEAN VIEWER: Extension is now ACTIVE (cached mode)!');

    // Update decorations when active editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDecorations(editor);
        }
    }, null, context.subscriptions);

    // Update decorations when viewport changes (scroll)
    vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        if (event.textEditor.document.languageId === 'ansi') {
            scheduleUpdate(event.textEditor);
        }
    }, null, context.subscriptions);

    // Update when document changes
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document && editor.document.languageId === 'ansi') {
            const docUri = event.document.uri.toString();
            stopBackgroundProcessing(docUri);
            clearAllDecorations(docUri);
            scheduleUpdate(editor);
        }
    }, null, context.subscriptions);

    // Clean up when document is closed
    vscode.workspace.onDidCloseTextDocument(document => {
        const docUri = document.uri.toString();
        stopBackgroundProcessing(docUri);
        clearAllDecorations(docUri);
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
