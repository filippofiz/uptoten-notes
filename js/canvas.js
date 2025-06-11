// Gestione Canvas e strumenti di disegno

// Variabili globali del canvas
let canvas = null;
let studentCanvas = null;
let currentTool = 'pencil';
let currentColor = '#000000';
let currentPage = 1;
let totalPages = 1;
let currentBackground = 'lines';
let backgroundLines = [];
let undoStack = [];
let redoStack = [];
let zoomLevel = 100;
let studentZoomLevel = 100;
let isLoadingPage = false; // Flag per evitare salvataggi durante il caricamento

// Debounce per auto-save - DEVE ESSERE PRIMA DI initializeCanvas!

let saveTimeout;
function debouncedSave() {
    if (isStudent) return;
    
    // NUOVO: Non salvare se l'app non è completamente caricata
    if (!window.appFullyLoaded) {
        console.log('⏳ App non ancora pronta, salvataggio annullato');
        return;
    }
    
    if (!currentSubjectId) {
        console.log('⚠️ Nessuna materia selezionata, salvataggio annullato');
        return;
    }
    
    // NON salvare se stiamo caricando una pagina
    if (isLoadingPage) {
        console.log('⚠️ Caricamento in corso, salvataggio annullato');
        return;
    }
    
    clearTimeout(saveTimeout);
    updateSyncStatus('syncing');
    
    saveTimeout = setTimeout(async () => {
        console.log('🔄 Auto-save in corso...');
        await saveCurrentPage();
    }, 2000); // Salva dopo 2 secondi di inattività
}
// Inizializza canvas per tutor
function initializeCanvas() {
    const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
    if (!pageWrapper) return;
    
    const width = pageWrapper.offsetWidth;
    const height = pageWrapper.offsetHeight;

    if (!canvas) {
        canvas = new fabric.Canvas('noteCanvas', {
            width: width,
            height: height,
            backgroundColor: 'transparent'
        });
        
        // Enable drawing solo se c'è una materia selezionata
        canvas.isDrawingMode = currentSubjectId !== null;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 2;
        canvas.freeDrawingBrush.color = currentColor;

        // Track changes for undo/redo
        canvas.on('path:created', function() {
            saveToUndoStack();
            debouncedSave();
        });

        canvas.on('object:added', function(e) {
            if (e.target && !backgroundLines.includes(e.target) && !e.target.excludeFromExport) {
                setTimeout(() => {
                    saveToUndoStack();
                    debouncedSave();
                }, 100);
            }
        });

        canvas.on('object:modified', function() {
            saveToUndoStack();
            debouncedSave();
        });

        canvas.on('object:removed', function() {
            saveToUndoStack();
            debouncedSave();
        });
    } else {
        canvas.setDimensions({
            width: width,
            height: height
        });
    }

    drawBackground();
    setTimeout(() => saveToUndoStack(), 200);
}

// Inizializza canvas per studente (solo lettura)
function initializeStudentCanvas() {
    const pageWrapper = document.querySelector('#studentApp .page-wrapper');
    if (!pageWrapper) return;
    
    const width = pageWrapper.offsetWidth;
    const height = pageWrapper.offsetHeight;

    if (!studentCanvas) {
        studentCanvas = new fabric.StaticCanvas('studentCanvas', {
            width: width,
            height: height,
            backgroundColor: 'transparent'
        });
    } else {
        studentCanvas.setDimensions({
            width: width,
            height: height
        });
    }
}

// Sostituisci la funzione drawBackground nel file canvas.js con questa versione

// Versione finale per eliminare completamente il margine destro

function drawBackground() {
    if (!canvas) return;
    
    // Rimuovi vecchie linee di sfondo
    backgroundLines.forEach(line => canvas.remove(line));
    backgroundLines = [];

    const width = canvas.width;
    const height = canvas.height;

    switch(currentBackground) {
        case 'lines':
            // Righe orizzontali - ESTENDI OLTRE IL BORDO
            const lineSpacing = 30;
            for (let i = lineSpacing; i < height; i += lineSpacing) {
                const line = new fabric.Line([0, i, width + 10, i], { // +10 per sicurezza
                    stroke: '#e0e0e0',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true
                });
                canvas.add(line);
                canvas.sendToBack(line);
                backgroundLines.push(line);
            }
            break;

        case 'grid-small':
            // Griglia piccola (10px)
            const smallGrid = 10;
            // Linee verticali - parti da prima e vai oltre
            for (let i = 0; i <= width + smallGrid; i += smallGrid) {
                const vLine = new fabric.Line([i, 0, i, height + 10], {
                    stroke: '#f0f0f0',
                    strokeWidth: 0.5,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true
                });
                canvas.add(vLine);
                canvas.sendToBack(vLine);
                backgroundLines.push(vLine);
            }
            // Linee orizzontali - estendi ben oltre
            for (let i = 0; i <= height + smallGrid; i += smallGrid) {
                const hLine = new fabric.Line([0, i, width + 10, i], {
                    stroke: '#f0f0f0',
                    strokeWidth: 0.5,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true
                });
                canvas.add(hLine);
                canvas.sendToBack(hLine);
                backgroundLines.push(hLine);
            }
            break;

        case 'grid-large':
            // Griglia grande (20px)
            const largeGrid = 20;
            // Linee verticali - assicurati di coprire tutto
            for (let i = 0; i <= width + largeGrid; i += largeGrid) {
                const vLine = new fabric.Line([i, 0, i, height + 10], {
                    stroke: '#e0e0e0',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true
                });
                canvas.add(vLine);
                canvas.sendToBack(vLine);
                backgroundLines.push(vLine);
            }
            // Linee orizzontali - estendi oltre
            for (let i = 0; i <= height + largeGrid; i += largeGrid) {
                const hLine = new fabric.Line([0, i, width + 10, i], {
                    stroke: '#e0e0e0',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    excludeFromExport: true
                });
                canvas.add(hLine);
                canvas.sendToBack(hLine);
                backgroundLines.push(hLine);
            }
            break;

        case 'none':
            // Nessuno sfondo
            break;
    }

    canvas.renderAll();
}

// Cambia sfondo
function setBackground(type, event) {
    if (!currentSubjectId) return;
    
    currentBackground = type;
    drawBackground();
    
    // Aggiorna bottone attivo
    document.querySelectorAll('.tool-btn').forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes('setBackground')) {
            btn.classList.remove('active');
        }
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    debouncedSave();
}

// Seleziona strumento
function selectTool(tool, event) {
    // Non permettere la selezione di strumenti se non c'è una materia
    if (!currentSubjectId) {
        return;
    }
    
    currentTool = tool;
    
    // Aggiorna bottone attivo
    document.querySelectorAll('.tool-btn').forEach(btn => {
        if (!btn.onclick || !btn.onclick.toString().includes('setBackground')) {
            btn.classList.remove('active');
        }
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    if (!canvas) return;
    
    switch(tool) {
        case 'pencil':
            canvas.isDrawingMode = true;
            canvas.selection = false;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = 2;
            canvas.freeDrawingBrush.color = currentColor;
            break;
        case 'eraser':
            canvas.isDrawingMode = true;
            canvas.selection = false;
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.width = 20;
            canvas.freeDrawingBrush.color = '#FFFEF5';
            break;
        case 'text':
            canvas.isDrawingMode = false;
            canvas.selection = true;
            addText();
            break;
        case 'rect':
        case 'circle':
        case 'arrow':
            canvas.isDrawingMode = false;
            canvas.selection = true;
            drawShape(tool);
            break;
    }
}

// Cambia colore
function changeColor(color) {
    if (!currentSubjectId) return;
    
    currentColor = color;
    if (canvas && canvas.freeDrawingBrush) {
        if (currentTool === 'eraser') {
            selectTool('pencil');
        } else {
            canvas.freeDrawingBrush.color = color;
        }
    }
}

// Aggiungi testo
function addText() {
    if (!currentSubjectId || !canvas) return;
    
    const text = new fabric.IText('Clicca per modificare', {
        left: 100,
        top: 100,
        fontFamily: 'Arial',
        fontSize: 20,
        fill: currentColor
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
}

// Disegna forma
function drawShape(shape) {
    if (!currentSubjectId || !canvas) return;
    
    let shapeObj;
    const center = canvas.getCenter();
    
    switch(shape) {
        case 'rect':
            shapeObj = new fabric.Rect({
                left: center.left - 50,
                top: center.top - 30,
                width: 100,
                height: 60,
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: 2
            });
            break;
        case 'circle':
            shapeObj = new fabric.Circle({
                left: center.left - 40,
                top: center.top - 40,
                radius: 40,
                fill: 'transparent',
                stroke: currentColor,
                strokeWidth: 2
            });
            break;
        case 'arrow':
            const line = new fabric.Line([center.left - 50, center.top, center.left + 50, center.top], {
                stroke: currentColor,
                strokeWidth: 2
            });
            const triangle = new fabric.Triangle({
                left: center.left + 40,
                top: center.top - 10,
                width: 20,
                height: 20,
                fill: currentColor,
                angle: 90
            });
            shapeObj = new fabric.Group([line, triangle]);
            break;
    }
    
    if (shapeObj) {
        canvas.add(shapeObj);
        canvas.setActiveObject(shapeObj);
        canvas.renderAll();
    }
}

// Aggiungi forma speciale
function addSpecialShape(type) {
    if (!currentSubjectId || !canvas) return;
    
    const colors = {
        important: { bg: '#FFF8DC', border: '#FFA500' },
        formula: { bg: '#E3F2FD', border: '#2196F3' },
        remember: { bg: '#FFE5E5', border: '#FF4444' }
    };

    const rect = new fabric.Rect({
        width: 300,
        height: 100,
        fill: colors[type].bg,
        stroke: colors[type].border,
        strokeWidth: 3,
        rx: 10,
        ry: 10,
        opacity: 0.9
    });

    const labels = {
        important: '⚡ IMPORTANTE',
        formula: '∑ FORMULA',
        remember: '💡 RICORDA'
    };

    const text = new fabric.Textbox(labels[type] + '\n\nClicca per scrivere...', {
        width: 280,
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#333',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        splitByGrapheme: true
    });

    const group = new fabric.Group([rect, text], {
        left: 100,
        top: 100,
        lockScalingFlip: true
    });

    group.shapeType = type;

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
}

// OCR
function performOCR() {
    if (!currentSubjectId || !canvas) return;
    
    const btn = event.currentTarget;
    
    if (typeof Tesseract === 'undefined') {
        alert('La funzione OCR non è disponibile al momento. Riprova più tardi.');
        return;
    }
    
    btn.classList.add('processing');
    
    const dataURL = canvas.toDataURL('image/png');
    
    Tesseract.recognize(
        dataURL,
        'ita',
        { 
            logger: m => console.log(m),
            errorHandler: err => console.error(err)
        }
    ).then(({ data: { text } }) => {
        btn.classList.remove('processing');
        
        if (text.trim()) {
            const recognizedText = new fabric.IText(text, {
                left: 100,
                top: 200,
                fontFamily: 'Arial',
                fontSize: 18,
                fill: '#2196F3',
                backgroundColor: '#E3F2FD',
                padding: 10
            });
            canvas.add(recognizedText);
            canvas.renderAll();
            
            showInfo('Testo riconosciuto e aggiunto alla pagina!');
        } else {
            showInfo('Nessun testo riconosciuto. Prova a scrivere più chiaramente.');
        }
    }).catch(err => {
        btn.classList.remove('processing');
        showError('Errore nel riconoscimento del testo');
        console.error('OCR Error:', err);
    });
}

// Upload immagine
function uploadImage() {
    if (!currentSubjectId || !canvas) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            fabric.Image.fromURL(event.target.result, function(img) {
                img.scale(0.5);
                img.set({
                    left: 100,
                    top: 100
                });
                canvas.add(img);
                canvas.renderAll();
            });
        };
        
        reader.readAsDataURL(file);
    };
    input.click();
}

// Undo/Redo
function saveToUndoStack() {
    if (!canvas) return;
    
    const state = canvas.toJSON(['excludeFromExport']);
    state.objects = state.objects.filter(obj => !obj.excludeFromExport);
    
    undoStack.push(state);
    redoStack = [];
    
    if (undoStack.length > 50) {
        undoStack.shift();
    }
}

function undo() {
    if (!currentSubjectId || !canvas) return;
    
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        const state = undoStack[undoStack.length - 1];
        loadCanvasState(state);
    }
}

function redo() {
    if (!currentSubjectId || !canvas) return;
    
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        undoStack.push(state);
        loadCanvasState(state);
    }
}

function loadCanvasState(state) {
    const tempBackground = currentBackground;
    canvas.clear();
    
    canvas.loadFromJSON(state, () => {
        currentBackground = tempBackground;
        drawBackground();
        canvas.renderAll();
    });
}

// Zoom
function zoomIn() {
    if (isStudent) {
        studentZoomLevel = Math.min(studentZoomLevel + 10, 200);
        applyStudentZoom();
    } else {
        zoomLevel = Math.min(zoomLevel + 10, 200);
        applyZoom();
    }
}

function zoomOut() {
    if (isStudent) {
        studentZoomLevel = Math.max(studentZoomLevel - 10, 50);
        applyStudentZoom();
    } else {
        zoomLevel = Math.max(zoomLevel - 10, 50);
        applyZoom();
    }
}

function resetZoom() {
    if (isStudent) {
        studentZoomLevel = 100;
        applyStudentZoom();
    } else {
        zoomLevel = 100;
        applyZoom();
    }
}

function applyZoom() {
    const scale = zoomLevel / 100;
    canvas.setZoom(scale);
    canvas.renderAll();
    document.getElementById('zoomLevel').textContent = zoomLevel + '%';
}

function applyStudentZoom() {
    const scale = studentZoomLevel / 100;
    studentCanvas.setZoom(scale);
    studentCanvas.renderAll();
    document.getElementById('zoomLevelStudent').textContent = studentZoomLevel + '%';
}

// Funzioni zoom studente
function zoomInStudent() {
    studentZoomLevel = Math.min(studentZoomLevel + 10, 200);
    applyStudentZoom();
}

function zoomOutStudent() {
    studentZoomLevel = Math.max(studentZoomLevel - 10, 50);
    applyStudentZoom();
}

function resetZoomStudent() {
    studentZoomLevel = 100;
    applyStudentZoom();
}

// Gestione resize finestra
window.addEventListener('resize', function() {
    if (canvas && !isStudent) {
        const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
        if (pageWrapper) {
            const width = pageWrapper.offsetWidth;
            const height = pageWrapper.offsetHeight;
            
            canvas.setDimensions({
                width: width,
                height: height
            });
            
            drawBackground();
        }
    }
    
    if (studentCanvas && isStudent) {
        const pageWrapper = document.querySelector('#studentApp .page-wrapper');
        if (pageWrapper) {
            const width = pageWrapper.offsetWidth;
            const height = pageWrapper.offsetHeight;
            
            studentCanvas.setDimensions({
                width: width,
                height: height
            });
        }
    }
});