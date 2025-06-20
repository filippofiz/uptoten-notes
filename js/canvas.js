// Gestione Canvas e strumenti di disegno - VERSIONE SEMPLIFICATA CON CSS PATTERN

// Variabili globali del canvas
let canvas = null;
let studentCanvas = null;
let currentTool = 'pencil';
let currentColor = '#000000';
let currentPage = 1;
let totalPages = 1;
let currentBackground = 'lines';
let undoStack = [];
let redoStack = [];
let zoomLevel = 100;
let studentZoomLevel = 100;
let isLoadingPage = false;

// Debounce per auto-save
let saveTimeout;
function debouncedSave() {
    if (isStudent) return;
    
    if (!window.appFullyLoaded) {
        console.log('⏳ App non ancora pronta, salvataggio annullato');
        return;
    }
    
    if (!currentSubjectId) {
        console.log('⚠️ Nessuna materia selezionata, salvataggio annullato');
        return;
    }
    
    if (isLoadingPage) {
        console.log('⚠️ Caricamento in corso, salvataggio annullato');
        return;
    }
    
    clearTimeout(saveTimeout);
    updateSyncStatus('syncing');
    
    saveTimeout = setTimeout(async () => {
        console.log('🔄 Auto-save in corso...');
        await saveCurrentPage();
    }, 2000);
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
            backgroundColor: 'transparent' // Trasparente per mostrare il CSS pattern
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
            if (e.target) {
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

    // Applica lo sfondo CSS
    applyBackgroundPattern();
    setTimeout(() => saveToUndoStack(), 200);
}

// NUOVO: Applica pattern CSS invece di disegnare linee
function applyBackgroundPattern() {
    const pageWrapper = document.querySelector(isStudent ? '#studentApp .page-wrapper' : '#tutorApp .page-wrapper');
    if (!pageWrapper) return;
    
    // Rimuovi tutte le classi di sfondo
    pageWrapper.classList.remove('bg-lines', 'bg-grid-small', 'bg-grid-large');
    
    // Aggiungi la classe appropriata
    switch(currentBackground) {
        case 'lines':
            pageWrapper.classList.add('bg-lines');
            break;
        case 'grid-small':
            pageWrapper.classList.add('bg-grid-small');
            break;
        case 'grid-large':
            pageWrapper.classList.add('bg-grid-large');
            break;
        case 'none':
            // Nessuna classe, sfondo pulito
            break;
    }
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
    
    // Applica lo sfondo anche per lo studente
    applyBackgroundPattern();
}

// Cambia sfondo
function setBackground(type, event) {
    if (!currentSubjectId) return;
    
    currentBackground = type;
    applyBackgroundPattern();
    
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

// Aggiungi questa funzione PRIMA della funzione selectTool nel file canvas.js

// Funzione per pulire i listener della gomma
function cleanupEraserListeners() {
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // Riabilita la selezione di tutti gli oggetti
    canvas.forEachObject(function(obj) {
        obj.selectable = true;
        obj.evented = true;
    });
    
    // Ripristina cursori normali
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    
    // Pulisci il canvas superiore
    canvas.clearContext(canvas.contextTop);
}

// Seleziona strumento
function selectTool(tool, event) {
    if (!currentSubjectId) {
        return;
    }
    
   // AGGIUNGI QUESTA RIGA:
    if (currentTool === 'eraser' && tool !== 'eraser') {
        cleanupEraserListeners();
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
       // Soluzione più semplice: nel file canvas.js, sostituisci solo il caso 'eraser':

// Versione migliorata con cursore personalizzato per la gomma

// Sostituisci il caso 'eraser' con questa versione che cancella SOLO i path

case 'eraser':
    canvas.isDrawingMode = false;
    canvas.selection = false;
    
    // Disabilita la selezione di tutti gli oggetti durante l'uso della gomma
    canvas.forEachObject(function(obj) {
        obj.selectable = false;
        obj.evented = false;
    });
    
    let isErasing = false;
    
    // Rimuovi vecchi listener
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // Mouse down - inizia a cancellare
    canvas.on('mouse:down', function(options) {
        if (currentTool !== 'eraser') return;
        
        isErasing = true;
        const pointer = canvas.getPointer(options.e);
        erasePathsAt(pointer.x, pointer.y);
    });
    
    // Mouse move - cancella mentre muovi
    canvas.on('mouse:move', function(options) {
        if (!isErasing || currentTool !== 'eraser') return;
        
        const pointer = canvas.getPointer(options.e);
        erasePathsAt(pointer.x, pointer.y);
        
        // Mostra visivamente l'area della gomma
        canvas.clearContext(canvas.contextTop);
        const ctx = canvas.contextTop;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#cccccc';
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    
    // Mouse up - fine cancellazione
    canvas.on('mouse:up', function() {
        if (currentTool !== 'eraser') return;
        
        isErasing = false;
        canvas.clearContext(canvas.contextTop);
        
        // Riabilita la selezione degli oggetti (tranne i path)
        canvas.forEachObject(function(obj) {
            if (obj.type !== 'path') {
                obj.selectable = true;
                obj.evented = true;
            }
        });
        
        canvas.renderAll();
        saveToUndoStack();
        debouncedSave();
    });
    
    // Funzione che cancella SOLO i path nell'area della gomma
    function erasePathsAt(x, y) {
        const eraserRadius = 20;
        const objectsToRemove = [];
        
        canvas.forEachObject(function(obj) {
            // IMPORTANTE: Cancella SOLO oggetti di tipo 'path'
            if (obj.type !== 'path') return;
            
            // Controlla se il path è nell'area della gomma
            if (isPathInEraserRange(obj, x, y, eraserRadius)) {
                objectsToRemove.push(obj);
            }
        });
        
        // Rimuovi i path trovati
        objectsToRemove.forEach(function(obj) {
            canvas.remove(obj);
        });
        
        if (objectsToRemove.length > 0) {
            canvas.renderAll();
        }
    }
    
    // Funzione helper per verificare se un path è nel raggio della gomma
    function isPathInEraserRange(pathObj, eraserX, eraserY, radius) {
        if (!pathObj.path) return false;
        
        // Trasforma le coordinate della gomma nello spazio dell'oggetto
        const point = fabric.util.transformPoint(
            { x: eraserX, y: eraserY },
            fabric.util.invertTransform(pathObj.calcTransformMatrix())
        );
        
        // Controlla ogni segmento del path
        for (let i = 0; i < pathObj.path.length; i++) {
            const segment = pathObj.path[i];
            if (segment.length >= 3) {
                const px = segment[segment.length - 2];
                const py = segment[segment.length - 1];
                
                const distance = Math.sqrt(
                    Math.pow(px - point.x, 2) + 
                    Math.pow(py - point.y, 2)
                );
                
                if (distance <= radius) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Crea cursore personalizzato
    const eraserSize = 20;
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.width = eraserSize * 2;
    cursorCanvas.height = eraserSize * 2;
    const ctx = cursorCanvas.getContext('2d');
    
    // Cerchio tratteggiato per la gomma
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(eraserSize, eraserSize, eraserSize - 1, 0, Math.PI * 2);
    ctx.stroke();
    
    // Icona gomma al centro
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⌫', eraserSize, eraserSize);
    
    const cursorUrl = cursorCanvas.toDataURL();
    canvas.defaultCursor = `url(${cursorUrl}) ${eraserSize} ${eraserSize}, crosshair`;
    canvas.hoverCursor = canvas.defaultCursor;
    
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
    
    const state = canvas.toJSON();
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
    canvas.clear();
    canvas.loadFromJSON(state, () => {
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

// IMPORTANTE: Non più necessaria la funzione drawBackground()