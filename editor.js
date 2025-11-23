// ARC-AGI Puzzle Editor
// Data structure to store puzzle state
const puzzleData = {
    numExamples: 3,
    defaultGridWidth: 8,
    defaultGridHeight: 8,
    examples: [],
    test: {
        input: [],
        output: [],
        width: 8,
        height: 8,
        outputWidth: 8,
        outputHeight: 8,
        showOutput: false // Default to hidden
    }
};

// Default ARC colors (0-9 as per ARC specification)
const ARC_COLORS = [
    { id: 0, name: 'black', hex: '#000000' },
    { id: 1, name: 'blue', hex: '#0074D9' },
    { id: 2, name: 'red', hex: '#FF4136' },
    { id: 3, name: 'green', hex: '#2ECC40' },
    { id: 4, name: 'yellow', hex: '#FFDC00' },
    { id: 5, name: 'gray', hex: '#AAAAAA' },
    { id: 6, name: 'magenta', hex: '#F012BE' },
    { id: 7, name: 'orange', hex: '#FF851B' },
    { id: 8, name: 'sky', hex: '#7FDBFF' },
    { id: 9, name: 'maroon', hex: '#800000' }
];

let selectedColor = 0; // Default to black
let isMouseDown = false; // Track mouse state for drag painting
let currentPaintingGrid = null; // Track which grid is currently being painted
let currentPaintingCallback = null; // Track the callback for the current grid

// Initialize the editor
function init() {
    setupColorPalette();
    setupControls();
    initializeExamples();
    initializeTest();
    renderAll();
}

// Setup color palette buttons
function setupColorPalette() {
    const container = document.getElementById('color-buttons');
    container.innerHTML = '';
    
    ARC_COLORS.forEach(color => {
        const button = document.createElement('div');
        button.className = 'color-button';
        button.style.backgroundColor = color.hex;
        button.dataset.colorId = color.id;
        button.title = `${color.name} (Press ${color.id})`;
        
        if (color.id === selectedColor) {
            button.classList.add('selected');
        }
        
        button.addEventListener('click', () => {
            selectColorById(color.id);
        });
        
        container.appendChild(button);
    });
}

// Setup control inputs
function setupControls() {
    const defaultGridWidthInput = document.getElementById('default-grid-width');
    const defaultGridHeightInput = document.getElementById('default-grid-height');
    const numExamplesInput = document.getElementById('num-examples');
    const showTestOutputInput = document.getElementById('show-test-output');
    const resetAllBtn = document.getElementById('reset-all-btn');
    
    defaultGridWidthInput.addEventListener('change', (e) => {
        const newWidth = parseInt(e.target.value);
        if (newWidth > 0 && newWidth <= 30) {
            puzzleData.defaultGridWidth = newWidth;
        }
    });
    
    defaultGridHeightInput.addEventListener('change', (e) => {
        const newHeight = parseInt(e.target.value);
        if (newHeight > 0 && newHeight <= 30) {
            puzzleData.defaultGridHeight = newHeight;
        }
    });
    
    numExamplesInput.addEventListener('change', (e) => {
        const newNum = parseInt(e.target.value);
        if (newNum > 0 && newNum <= 10) {
            puzzleData.numExamples = newNum;
            initializeExamples();
            renderAll();
        }
    });
    
    showTestOutputInput.addEventListener('change', (e) => {
        puzzleData.test.showOutput = e.target.checked;
        if (!puzzleData.test.showOutput && !puzzleData.test.output.length) {
            // Initialize output grid if it doesn't exist
            puzzleData.test.output = createEmptyGrid(puzzleData.test.outputWidth, puzzleData.test.outputHeight);
        }
        renderTest();
    });
    
    // Reset all button
    resetAllBtn.addEventListener('click', resetAllGrids);
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', exportPuzzle);
    
    // Import button
    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    importPuzzle(jsonData);
                    e.target.value = ''; // Reset file input
                } catch (error) {
                    alert('Error parsing JSON file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    });
    
    // Global mouse event handlers for drag painting
    document.addEventListener('mousedown', () => {
        isMouseDown = true;
    });
    
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        currentPaintingGrid = null;
        currentPaintingCallback = null;
    });
    
    // Prevent drag painting when leaving the window
    document.addEventListener('mouseleave', () => {
        isMouseDown = false;
        currentPaintingGrid = null;
        currentPaintingCallback = null;
    });
    
    // Keyboard shortcuts for color selection (0-9)
    document.addEventListener('keydown', (e) => {
        // Only handle if not typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const key = e.key;
        if (key >= '0' && key <= '9') {
            const colorId = parseInt(key);
            if (colorId >= 0 && colorId <= 9) {
                selectColorById(colorId);
            }
        }
    });
}

// Select color by ID and update UI
function selectColorById(colorId) {
    selectedColor = colorId;
    
    // Update color button selection
    document.querySelectorAll('.color-button').forEach(btn => {
        btn.classList.remove('selected');
        const btnColorId = btn.dataset.colorId;
        if (btnColorId === colorId.toString()) {
            btn.classList.add('selected');
        }
    });
}

// Initialize examples array
function initializeExamples() {
    // Ensure existing examples have width/height properties
    puzzleData.examples.forEach(example => {
        if (!example.inputWidth) example.inputWidth = example.input?.[0]?.length || puzzleData.defaultGridWidth;
        if (!example.inputHeight) example.inputHeight = example.input?.length || puzzleData.defaultGridHeight;
        if (!example.outputWidth) example.outputWidth = example.output?.[0]?.length || puzzleData.defaultGridWidth;
        if (!example.outputHeight) example.outputHeight = example.output?.length || puzzleData.defaultGridHeight;
    });
    
    while (puzzleData.examples.length < puzzleData.numExamples) {
        puzzleData.examples.push({
            input: [],
            inputWidth: puzzleData.defaultGridWidth,
            inputHeight: puzzleData.defaultGridHeight,
            output: [],
            outputWidth: puzzleData.defaultGridWidth,
            outputHeight: puzzleData.defaultGridHeight
        });
        const example = puzzleData.examples[puzzleData.examples.length - 1];
        example.input = createEmptyGrid(example.inputWidth, example.inputHeight);
        example.output = createEmptyGrid(example.outputWidth, example.outputHeight);
    }
    while (puzzleData.examples.length > puzzleData.numExamples) {
        puzzleData.examples.pop();
    }
}

// Initialize test case
function initializeTest() {
    if (!puzzleData.test.width) puzzleData.test.width = puzzleData.defaultGridWidth;
    if (!puzzleData.test.height) puzzleData.test.height = puzzleData.defaultGridHeight;
    if (!puzzleData.test.outputWidth) puzzleData.test.outputWidth = puzzleData.defaultGridWidth;
    if (!puzzleData.test.outputHeight) puzzleData.test.outputHeight = puzzleData.defaultGridHeight;
    if (puzzleData.test.showOutput === undefined) puzzleData.test.showOutput = false;
    
    if (!puzzleData.test.input || 
        puzzleData.test.input.length !== puzzleData.test.height ||
        puzzleData.test.input[0]?.length !== puzzleData.test.width) {
        puzzleData.test.input = createEmptyGrid(puzzleData.test.width, puzzleData.test.height);
    }
    
    // Only initialize output if showOutput is true
    if (puzzleData.test.showOutput) {
        if (!puzzleData.test.output || 
            puzzleData.test.output.length !== puzzleData.test.outputHeight ||
            puzzleData.test.output[0]?.length !== puzzleData.test.outputWidth) {
            puzzleData.test.output = createEmptyGrid(puzzleData.test.outputWidth, puzzleData.test.outputHeight);
        }
    } else {
        // Initialize empty output grid for when it's enabled later
        puzzleData.test.output = createEmptyGrid(puzzleData.test.outputWidth, puzzleData.test.outputHeight);
    }
}

// Copy input grid to output grid
function copyInputToOutput(inputGrid, inputWidth, inputHeight, outputGridRef, outputWidth, outputHeight) {
    // Create new output grid with input dimensions
    const newOutputGrid = createEmptyGrid(inputWidth, inputHeight);
    
    // Copy input data to output
    for (let y = 0; y < inputHeight; y++) {
        for (let x = 0; x < inputWidth; x++) {
            const value = inputGrid[y]?.[x];
            newOutputGrid[y][x] = (value === null || value === undefined) ? 0 : value;
        }
    }
    
    // Replace output grid by copying all rows
    outputGridRef.length = 0;
    for (let y = 0; y < inputHeight; y++) {
        outputGridRef.push([...newOutputGrid[y]]);
    }
}

// Reset all grids to default size
function resetAllGrids() {
    if (confirm('This will reset all grids to the default size and clear all content. Continue?')) {
        // Reset examples
        puzzleData.examples.forEach(example => {
            example.inputWidth = puzzleData.defaultGridWidth;
            example.inputHeight = puzzleData.defaultGridHeight;
            example.outputWidth = puzzleData.defaultGridWidth;
            example.outputHeight = puzzleData.defaultGridHeight;
            example.input = createEmptyGrid(example.inputWidth, example.inputHeight);
            example.output = createEmptyGrid(example.outputWidth, example.outputHeight);
        });
        
        // Reset test
        puzzleData.test.width = puzzleData.defaultGridWidth;
        puzzleData.test.height = puzzleData.defaultGridHeight;
        puzzleData.test.outputWidth = puzzleData.defaultGridWidth;
        puzzleData.test.outputHeight = puzzleData.defaultGridHeight;
        puzzleData.test.input = createEmptyGrid(puzzleData.test.width, puzzleData.test.height);
        puzzleData.test.output = createEmptyGrid(puzzleData.test.outputWidth, puzzleData.test.outputHeight);
        
        renderAll();
    }
}

// Create empty grid (filled with 0/black by default)
function createEmptyGrid(width, height) {
    return Array(height).fill(0).map(() => 
        Array(width).fill(0)
    );
}

// Resize a single grid
function resizeGrid(grid, newWidth, newHeight) {
    const newGrid = createEmptyGrid(newWidth, newHeight);
    const oldHeight = grid.length || 0;
    const oldWidth = grid[0]?.length || 0;
    
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            if (y < oldHeight && x < oldWidth) {
                // Convert null/undefined to 0 (black)
                const value = grid[y][x];
                newGrid[y][x] = (value === null || value === undefined) ? 0 : value;
            }
        }
    }
    
    return newGrid;
}

// Render all grids
function renderAll() {
    renderExamples();
    renderTest();
}

// Render examples section
function renderExamples() {
    const container = document.getElementById('examples-container');
    container.innerHTML = '';
    
    puzzleData.examples.forEach((example, index) => {
        const exampleDiv = document.createElement('div');
        exampleDiv.className = 'example-item';
        exampleDiv.innerHTML = `<h4>Example ${index + 1}</h4>`;
        
        const gridPair = document.createElement('div');
        gridPair.className = 'grid-pair';
        
        // Input grid
        const inputContainer = document.createElement('div');
        inputContainer.className = 'grid-container';
        const inputHeader = document.createElement('div');
        inputHeader.style.display = 'flex';
        inputHeader.style.gap = '10px';
        inputHeader.style.alignItems = 'center';
        inputHeader.style.marginBottom = '10px';
        inputHeader.innerHTML = '<h5 style="margin: 0;">Input</h5>';
        
        const inputWidthControl = document.createElement('input');
        inputWidthControl.type = 'number';
        inputWidthControl.min = '1';
        inputWidthControl.max = '30';
        inputWidthControl.value = example.inputWidth;
        inputWidthControl.style.width = '60px';
        inputWidthControl.style.padding = '4px';
        inputWidthControl.addEventListener('change', (e) => {
            const newWidth = parseInt(e.target.value);
            if (newWidth > 0 && newWidth <= 30) {
                example.inputWidth = newWidth;
                example.input = resizeGrid(example.input, example.inputWidth, example.inputHeight);
                renderAll();
            }
        });
        
        const inputHeightControl = document.createElement('input');
        inputHeightControl.type = 'number';
        inputHeightControl.min = '1';
        inputHeightControl.max = '30';
        inputHeightControl.value = example.inputHeight;
        inputHeightControl.style.width = '60px';
        inputHeightControl.style.padding = '4px';
        inputHeightControl.addEventListener('change', (e) => {
            const newHeight = parseInt(e.target.value);
            if (newHeight > 0 && newHeight <= 30) {
                example.inputHeight = newHeight;
                example.input = resizeGrid(example.input, example.inputWidth, example.inputHeight);
                renderAll();
            }
        });
        
        inputHeader.appendChild(document.createTextNode('W:'));
        inputHeader.appendChild(inputWidthControl);
        inputHeader.appendChild(document.createTextNode('H:'));
        inputHeader.appendChild(inputHeightControl);
        inputContainer.appendChild(inputHeader);
        inputContainer.appendChild(createGrid(example.input, example.inputWidth, example.inputHeight, (y, x, cellElement) => {
            handleCellClick(example.input, y, x, cellElement);
        }));
        gridPair.appendChild(inputContainer);
        
        // Output grid
        const outputContainer = document.createElement('div');
        outputContainer.className = 'grid-container';
        
        const outputHeader = document.createElement('div');
        outputHeader.style.display = 'flex';
        outputHeader.style.gap = '10px';
        outputHeader.style.alignItems = 'center';
        outputHeader.style.marginBottom = '10px';
        outputHeader.innerHTML = '<h5 style="margin: 0;">Output</h5>';
        
        // Copy button (in header row)
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Input';
        copyButton.className = 'copy-button';
        copyButton.style.padding = '4px 10px';
        copyButton.style.background = '#667eea';
        copyButton.style.color = 'white';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '4px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '0.85em';
        copyButton.addEventListener('click', () => {
            copyInputToOutput(example.input, example.inputWidth, example.inputHeight, 
                            example.output, example.outputWidth, example.outputHeight);
            example.outputWidth = example.inputWidth;
            example.outputHeight = example.inputHeight;
            renderAll();
        });
        outputHeader.appendChild(copyButton);
        
        const outputWidthControl = document.createElement('input');
        outputWidthControl.type = 'number';
        outputWidthControl.min = '1';
        outputWidthControl.max = '30';
        outputWidthControl.value = example.outputWidth;
        outputWidthControl.style.width = '60px';
        outputWidthControl.style.padding = '4px';
        outputWidthControl.addEventListener('change', (e) => {
            const newWidth = parseInt(e.target.value);
            if (newWidth > 0 && newWidth <= 30) {
                example.outputWidth = newWidth;
                example.output = resizeGrid(example.output, example.outputWidth, example.outputHeight);
                renderAll();
            }
        });
        
        const outputHeightControl = document.createElement('input');
        outputHeightControl.type = 'number';
        outputHeightControl.min = '1';
        outputHeightControl.max = '30';
        outputHeightControl.value = example.outputHeight;
        outputHeightControl.style.width = '60px';
        outputHeightControl.style.padding = '4px';
        outputHeightControl.addEventListener('change', (e) => {
            const newHeight = parseInt(e.target.value);
            if (newHeight > 0 && newHeight <= 30) {
                example.outputHeight = newHeight;
                example.output = resizeGrid(example.output, example.outputWidth, example.outputHeight);
                renderAll();
            }
        });
        
        outputHeader.appendChild(document.createTextNode('W:'));
        outputHeader.appendChild(outputWidthControl);
        outputHeader.appendChild(document.createTextNode('H:'));
        outputHeader.appendChild(outputHeightControl);
        outputContainer.appendChild(outputHeader);
        outputContainer.appendChild(createGrid(example.output, example.outputWidth, example.outputHeight, (y, x, cellElement) => {
            handleCellClick(example.output, y, x, cellElement);
        }));
        gridPair.appendChild(outputContainer);
        
        exampleDiv.appendChild(gridPair);
        container.appendChild(exampleDiv);
    });
}

// Render test section
function renderTest() {
    const container = document.getElementById('test-container');
    container.innerHTML = '';
    
    const testDiv = document.createElement('div');
    testDiv.className = 'test-item';
    testDiv.innerHTML = '<h4>Test Case</h4>';
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-container';
    const testHeader = document.createElement('div');
    testHeader.style.display = 'flex';
    testHeader.style.gap = '10px';
    testHeader.style.alignItems = 'center';
    testHeader.style.marginBottom = '10px';
    testHeader.innerHTML = '<h5 style="margin: 0;">Input</h5>';
    
    const testWidthControl = document.createElement('input');
    testWidthControl.type = 'number';
    testWidthControl.min = '1';
    testWidthControl.max = '30';
    testWidthControl.value = puzzleData.test.width;
    testWidthControl.style.width = '60px';
    testWidthControl.style.padding = '4px';
    testWidthControl.addEventListener('change', (e) => {
        const newWidth = parseInt(e.target.value);
        if (newWidth > 0 && newWidth <= 30) {
            puzzleData.test.width = newWidth;
            puzzleData.test.input = resizeGrid(puzzleData.test.input, puzzleData.test.width, puzzleData.test.height);
            renderAll();
        }
    });
    
    const testHeightControl = document.createElement('input');
    testHeightControl.type = 'number';
    testHeightControl.min = '1';
    testHeightControl.max = '30';
    testHeightControl.value = puzzleData.test.height;
    testHeightControl.style.width = '60px';
    testHeightControl.style.padding = '4px';
    testHeightControl.addEventListener('change', (e) => {
        const newHeight = parseInt(e.target.value);
        if (newHeight > 0 && newHeight <= 30) {
            puzzleData.test.height = newHeight;
            puzzleData.test.input = resizeGrid(puzzleData.test.input, puzzleData.test.width, puzzleData.test.height);
            renderAll();
        }
    });
    
    testHeader.appendChild(document.createTextNode('W:'));
    testHeader.appendChild(testWidthControl);
    testHeader.appendChild(document.createTextNode('H:'));
    testHeader.appendChild(testHeightControl);
    gridContainer.appendChild(testHeader);
    gridContainer.appendChild(createGrid(puzzleData.test.input, puzzleData.test.width, puzzleData.test.height, (y, x, cellElement) => {
        handleCellClick(puzzleData.test.input, y, x, cellElement);
    }));
    
    const gridPair = document.createElement('div');
    gridPair.className = 'grid-pair';
    gridPair.appendChild(gridContainer);
    
    // Output grid (only if enabled)
    if (puzzleData.test.showOutput) {
        const outputContainer = document.createElement('div');
        outputContainer.className = 'grid-container';
        
        const outputHeader = document.createElement('div');
        outputHeader.style.display = 'flex';
        outputHeader.style.gap = '10px';
        outputHeader.style.alignItems = 'center';
        outputHeader.style.marginBottom = '10px';
        outputHeader.innerHTML = '<h5 style="margin: 0;">Output</h5>';
        
        // Copy button (in header row)
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Input';
        copyButton.className = 'copy-button';
        copyButton.style.padding = '4px 10px';
        copyButton.style.background = '#667eea';
        copyButton.style.color = 'white';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '4px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '0.85em';
        copyButton.addEventListener('click', () => {
            copyInputToOutput(puzzleData.test.input, puzzleData.test.width, puzzleData.test.height,
                            puzzleData.test.output, puzzleData.test.outputWidth, puzzleData.test.outputHeight);
            puzzleData.test.outputWidth = puzzleData.test.width;
            puzzleData.test.outputHeight = puzzleData.test.height;
            renderTest();
        });
        outputHeader.appendChild(copyButton);
        
        const outputWidthControl = document.createElement('input');
        outputWidthControl.type = 'number';
        outputWidthControl.min = '1';
        outputWidthControl.max = '30';
        outputWidthControl.value = puzzleData.test.outputWidth;
        outputWidthControl.style.width = '60px';
        outputWidthControl.style.padding = '4px';
        outputWidthControl.addEventListener('change', (e) => {
            const newWidth = parseInt(e.target.value);
            if (newWidth > 0 && newWidth <= 30) {
                puzzleData.test.outputWidth = newWidth;
                puzzleData.test.output = resizeGrid(puzzleData.test.output, puzzleData.test.outputWidth, puzzleData.test.outputHeight);
                renderTest();
            }
        });
        
        const outputHeightControl = document.createElement('input');
        outputHeightControl.type = 'number';
        outputHeightControl.min = '1';
        outputHeightControl.max = '30';
        outputHeightControl.value = puzzleData.test.outputHeight;
        outputHeightControl.style.width = '60px';
        outputHeightControl.style.padding = '4px';
        outputHeightControl.addEventListener('change', (e) => {
            const newHeight = parseInt(e.target.value);
            if (newHeight > 0 && newHeight <= 30) {
                puzzleData.test.outputHeight = newHeight;
                puzzleData.test.output = resizeGrid(puzzleData.test.output, puzzleData.test.outputWidth, puzzleData.test.outputHeight);
                renderTest();
            }
        });
        
        outputHeader.appendChild(document.createTextNode('W:'));
        outputHeader.appendChild(outputWidthControl);
        outputHeader.appendChild(document.createTextNode('H:'));
        outputHeader.appendChild(outputHeightControl);
        outputContainer.appendChild(outputHeader);
        outputContainer.appendChild(createGrid(puzzleData.test.output, puzzleData.test.outputWidth, puzzleData.test.outputHeight, (y, x, cellElement) => {
            handleCellClick(puzzleData.test.output, y, x, cellElement);
        }));
        gridPair.appendChild(outputContainer);
    }
    
    testDiv.appendChild(gridPair);
    container.appendChild(testDiv);
}

// Handle cell click with toggle behavior
function handleCellClick(gridData, y, x, cellElement) {
    const currentColor = gridData[y]?.[x];
    // Normalize null/undefined to 0
    const normalizedCurrent = (currentColor === null || currentColor === undefined) ? 0 : currentColor;
    const normalizedSelected = (selectedColor === null || selectedColor === undefined) ? 0 : selectedColor;
    
    // If clicking the same color, set to 0 (black) - toggle behavior
    if (normalizedCurrent === normalizedSelected) {
        gridData[y][x] = 0;
        updateCellVisual(cellElement, 0);
    } else {
        // Otherwise, set the selected color (0 if erase is selected)
        gridData[y][x] = normalizedSelected;
        updateCellVisual(cellElement, normalizedSelected);
    }
}

// Update cell visual appearance without re-rendering
function updateCellVisual(cellElement, colorValue) {
    // Normalize null/undefined to 0 (black)
    const normalizedValue = (colorValue === null || colorValue === undefined) ? 0 : colorValue;
    cellElement.classList.remove('empty');
    const color = ARC_COLORS.find(c => c.id === normalizedValue);
    if (color) {
        cellElement.style.backgroundColor = color.hex;
    } else {
        // Fallback to black if color not found
        cellElement.style.backgroundColor = '#000000';
    }
}

// Create a grid element
function createGrid(gridData, width, height, onClickCallback) {
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    
    // Track which cells have been painted in this drag operation to avoid duplicates
    const paintedCells = new Set();
    let isDragging = false;
    let mouseDownTime = 0;
    
    // Mouse move handler for drag painting
    const handleMouseMove = (e) => {
        if (!isMouseDown || currentPaintingGrid !== grid) return;
        
        // Mark as dragging if mouse has moved
        isDragging = true;
        
        // Find the cell under the mouse cursor
        let cell = e.target;
        if (!cell.classList.contains('cell')) {
            // If the target isn't a cell, try to find the cell from coordinates
            const rect = grid.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left - 10) / ((rect.width - 20) / width));
            const y = Math.floor((e.clientY - rect.top - 10) / ((rect.height - 20) / height));
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                const cells = grid.querySelectorAll('.cell');
                const cellIndex = y * width + x;
                if (cellIndex < cells.length) {
                    cell = cells[cellIndex];
                } else {
                    return;
                }
            } else {
                return;
            }
        }
        
        if (cell.classList.contains('cell')) {
            const y = parseInt(cell.dataset.y);
            const x = parseInt(cell.dataset.x);
            const cellKey = `${y},${x}`;
            
            // Only paint if we haven't painted this cell in this drag operation
            if (!paintedCells.has(cellKey)) {
                paintedCells.add(cellKey);
                onClickCallback(y, x, cell);
            }
        }
    };
    
    // Mouse down handler
    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only handle left mouse button
        e.preventDefault();
        isMouseDown = true;
        isDragging = false;
        mouseDownTime = Date.now();
        currentPaintingGrid = grid;
        currentPaintingCallback = onClickCallback;
        paintedCells.clear();
        
        const cell = e.target;
        if (cell.classList.contains('cell')) {
            const y = parseInt(cell.dataset.y);
            const x = parseInt(cell.dataset.x);
            const cellKey = `${y},${x}`;
            paintedCells.add(cellKey);
            onClickCallback(y, x, cell);
        }
    };
    
    // Mouse up handler
    const handleMouseUp = () => {
        if (currentPaintingGrid === grid) {
            paintedCells.clear();
            isDragging = false;
        }
    };
    
    // Mouse leave handler
    const handleMouseLeave = () => {
        paintedCells.clear();
    };
    
    grid.addEventListener('mousedown', handleMouseDown);
    grid.addEventListener('mousemove', handleMouseMove);
    grid.addEventListener('mouseup', handleMouseUp);
    grid.addEventListener('mouseleave', handleMouseLeave);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.y = y;
            cell.dataset.x = x;
            
            const colorValue = gridData[y]?.[x];
            // Normalize null/undefined to 0 (black)
            const normalizedValue = (colorValue === null || colorValue === undefined) ? 0 : colorValue;
            cell.classList.remove('empty');
            const color = ARC_COLORS.find(c => c.id === normalizedValue);
            if (color) {
                cell.style.backgroundColor = color.hex;
            } else {
                // Fallback to black if color not found
                cell.style.backgroundColor = '#000000';
            }
            
            // Click handler (for single clicks) - handled by mousedown now
            // Removed to avoid conflicts with drag painting
            
            grid.appendChild(cell);
        }
    }
    
    return grid;
}

// Convert grid to JSON format (nulls become 0)
function gridToJSON(grid) {
    return grid.map(row => 
        row.map(cell => cell === null || cell === undefined ? 0 : cell)
    );
}

// Convert JSON grid to internal format (0 stays as 0, which is black)
function jsonToGrid(jsonGrid) {
    return jsonGrid.map(row => row.map(cell => cell));
}

// Export puzzle to JSON format
function exportPuzzle() {
    const exportData = {
        train: puzzleData.examples.map(example => ({
            input: gridToJSON(example.input),
            output: gridToJSON(example.output)
        })),
        test: []
    };
    
    // Add test case(s)
    const testCase = {
        input: gridToJSON(puzzleData.test.input)
    };
    
    if (puzzleData.test.showOutput && puzzleData.test.output.length > 0) {
        testCase.output = gridToJSON(puzzleData.test.output);
    }
    
    exportData.test.push(testCase);
    
    // Create and download JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arc-puzzle.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import puzzle from JSON format
function importPuzzle(jsonData) {
    try {
        // Clear current puzzle
        puzzleData.examples = [];
        puzzleData.test = {
            input: [],
            output: [],
            width: 8,
            height: 8,
            outputWidth: 8,
            outputHeight: 8,
            showOutput: false
        };
        
        // Import train examples
        if (jsonData.train && Array.isArray(jsonData.train)) {
            puzzleData.numExamples = jsonData.train.length;
            jsonData.train.forEach((example, index) => {
                if (example.input && example.output) {
                    const inputGrid = jsonToGrid(example.input);
                    const outputGrid = jsonToGrid(example.output);
                    
                    puzzleData.examples.push({
                        input: inputGrid,
                        inputWidth: inputGrid[0]?.length || 8,
                        inputHeight: inputGrid.length || 8,
                        output: outputGrid,
                        outputWidth: outputGrid[0]?.length || 8,
                        outputHeight: outputGrid.length || 8
                    });
                }
            });
        }
        
        // Import test case
        if (jsonData.test && Array.isArray(jsonData.test) && jsonData.test.length > 0) {
            const testCase = jsonData.test[0];
            if (testCase.input) {
                const inputGrid = jsonToGrid(testCase.input);
                puzzleData.test.input = inputGrid;
                puzzleData.test.width = inputGrid[0]?.length || 8;
                puzzleData.test.height = inputGrid.length || 8;
                
                if (testCase.output) {
                    const outputGrid = jsonToGrid(testCase.output);
                    puzzleData.test.output = outputGrid;
                    puzzleData.test.outputWidth = outputGrid[0]?.length || 8;
                    puzzleData.test.outputHeight = outputGrid.length || 8;
                    puzzleData.test.showOutput = true;
                    document.getElementById('show-test-output').checked = true;
                } else {
                    puzzleData.test.output = createEmptyGrid(8, 8);
                    puzzleData.test.showOutput = false;
                    document.getElementById('show-test-output').checked = false;
                }
            }
        }
        
        // Update UI
        document.getElementById('num-examples').value = puzzleData.numExamples;
        initializeExamples();
        initializeTest();
        renderAll();
        
    } catch (error) {
        alert('Error importing puzzle: ' + error.message);
        throw error;
    }
}

// Legacy export function (for backward compatibility)
function exportPuzzleData() {
    return JSON.parse(JSON.stringify(puzzleData));
}

// Legacy import function (for backward compatibility)
function importPuzzleData(data) {
    Object.assign(puzzleData, data);
    renderAll();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally for future import/export
window.ARC_Editor = {
    exportPuzzleData,
    importPuzzleData,
    getPuzzleData: () => puzzleData
};

