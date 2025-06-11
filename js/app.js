// Gestione principale dell'applicazione - VERSIONE PULITA

// Array di colori predefiniti per le materie
const SUBJECT_COLORS = [
    '#FF6B6B', // Rosso corallo
    '#4ECDC4', // Turchese
    '#45B7D1', // Blu cielo
    '#F7DC6F', // Giallo dorato
    '#BB8FCE', // Viola lavanda
    '#85C1E9', // Azzurro chiaro
    '#F8B500', // Arancione
    '#6C5CE7', // Viola elettrico
    '#A8E6CF', // Verde menta
    '#FDA7DF', // Rosa pastello
    '#4834D4', // Blu reale
    '#30336B'  // Blu scuro
];

// Funzione per ottenere un colore unico per la materia
function getUniqueColor(existingColors) {
    // Trova il primo colore non utilizzato
    for (let color of SUBJECT_COLORS) {
        if (!existingColors.includes(color)) {
            return color;
        }
    }
    // Se tutti i colori sono usati, genera un colore casuale
    return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// Nuova funzione per applicare il bordo colorato al canvas
function applyCanvasBorder(color) {
    const pageWrapper = document.querySelector(isStudent ? '#studentApp .page-wrapper' : '#tutorApp .page-wrapper');
    if (pageWrapper) {
        pageWrapper.classList.add('subject-border');
        pageWrapper.style.color = color;
    }
}

// === GESTIONE MATERIE ===
function createSubjectTab(subject) {
    const tab = document.createElement('button');
    tab.className = 'subject-tab';
    tab.setAttribute('data-subject-id', subject.id);
    tab.setAttribute('data-subject-name', subject.name);
    tab.setAttribute('data-subject-color', subject.color);
    tab.style.borderLeftColor = subject.color;
    tab.style.setProperty('--subject-color', subject.color);
    
    // Testo della materia
    const textNode = document.createTextNode(subject.name);
    tab.appendChild(textNode);
    
    // Bottone elimina (solo per tutor)
    if (!isStudent) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-subject-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => deleteSubject(subject.id, e);
        tab.appendChild(deleteBtn);
    }
    
    // Click handlers
    let clickTimer = null;
    tab.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-subject-btn')) {
            return;
        }
        
        if (!isStudent && clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
            renameSubject(subject.id, e);
        } else {
            if (!isStudent) {
                clickTimer = setTimeout(() => {
                    clickTimer = null;
                    selectSubject(subject.id, e);
                }, 250);
            } else {
                selectSubject(subject.id, e);
            }
        }
    });
    
    return tab;
}

async function addSubject() {
    const name = prompt('Nome della nuova materia:');
    if (!name || !name.trim()) return;
    
    // Controlla se esiste già
    const existingTabs = document.querySelectorAll('.subject-tab:not(.add-subject-tab)');
    for (let tab of existingTabs) {
        if (tab.getAttribute('data-subject-name') === name.trim()) {
            alert('Questa materia esiste già!');
            return;
        }
    }
    
    // Ottieni colori già usati
    const usedColors = Array.from(existingTabs).map(tab => 
        tab.getAttribute('data-subject-color')
    ).filter(Boolean);
    
    // Genera colore unico
    const uniqueColor = getUniqueColor(usedColors);
    
    const subject = await createSubject(name.trim(), uniqueColor);
    if (subject) {
        await loadStudentSubjects();
        selectSubject(subject.id);
    }
}

async function selectSubject(subjectId, event) {
    // Rimuovi overlay se esiste
    removeNoSubjectsOverlay();
    
    if (event && event.target && event.target.classList.contains('delete-subject-btn')) {
        return;
    }
    
    // Salva pagina corrente prima di cambiare
    if (canvas && currentSubjectId && !isStudent) {
        await saveCurrentPage();
    }
    
    currentSubjectId = subjectId;
    
    // Riabilita il disegno quando c'è una materia selezionata
    if (canvas && !isStudent) {
        canvas.isDrawingMode = true;
    }
    
    // Aggiorna UI
    const containerSelector = isStudent ? '#studentSubjectTabs .subject-tab' : '.subject-tab';
    document.querySelectorAll(containerSelector).forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetTab = document.querySelector(`${containerSelector}[data-subject-id="${subjectId}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
        
        // Applica il colore della materia al bordo del canvas
        const subjectColor = targetTab.getAttribute('data-subject-color');
        applyCanvasBorder(subjectColor);
    }
    
    // Carica pagine della materia
    if (isStudent) {
        await loadStudentPages();
    } else {
        await loadSubjectPages();
    }
    
    // Salva stato dopo selezione materia
    if (!isStudent) {
        saveAppState();
    }
    
    // Salva ultima materia selezionata (solo se funzione disponibile)
    if (!isStudent && typeof saveUserSettings === 'function') {
        saveUserSettings({
            last_subject_id: subjectId,
            last_page_number: currentPage
        });
    }
}

async function renameSubject(subjectId, event) {
    if (isStudent) return;
    
    event.stopPropagation();
    event.preventDefault();
    
    const tab = document.querySelector(`[data-subject-id="${subjectId}"]`);
    const oldName = tab.getAttribute('data-subject-name');
    
    const newName = prompt('Rinomina materia:', oldName);
    if (!newName || !newName.trim() || newName === oldName) return;
    
    // Controlla se esiste già
    const existingTabs = document.querySelectorAll('.subject-tab:not(.add-subject-tab)');
    for (let otherTab of existingTabs) {
        if (otherTab !== tab && otherTab.getAttribute('data-subject-name') === newName.trim()) {
            alert('Una materia con questo nome esiste già!');
            return;
        }
    }
    
    const updated = await updateSubject(subjectId, { name: newName.trim() });
    if (updated) {
        tab.childNodes[0].textContent = newName.trim();
        tab.setAttribute('data-subject-name', newName.trim());
    }
}

async function deleteSubject(subjectId, event) {
    if (isStudent) return;
    
    event.stopPropagation();
    
    const tab = event.target.parentElement;
    const subjectName = tab.getAttribute('data-subject-name');
    
    if (confirm(`Sei sicuro di voler eliminare la materia "${subjectName}"? Tutte le pagine verranno perse!`)) {
        const deleted = await deleteSubjectFromDB(subjectId);
        
        if (deleted) {
            const wasActive = tab.classList.contains('active');
            tab.remove();
            
            // Conta le materie rimaste DOPO l'eliminazione
            const remainingSubjects = document.querySelectorAll('.subject-tab:not(.add-subject-tab)').length;
            
            // Se era attiva, seleziona un'altra materia
            if (wasActive) {
                if (remainingSubjects > 0) {
                    const firstTab = document.querySelector('.subject-tab:not(.add-subject-tab)');
                    const firstSubjectId = firstTab.getAttribute('data-subject-id');
                    selectSubject(firstSubjectId);
                } else {
                    // Se non ci sono più materie, pulisci il canvas
                    currentSubjectId = null;
                    if (canvas) {
                        canvas.clear();
                        canvas.isDrawingMode = false;
                        
                        // Rimuovi bordo colorato
                        const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
                        if (pageWrapper) {
                            pageWrapper.classList.remove('subject-border');
                        }
                        
                        const centerX = canvas.width / 2;
                        const centerY = canvas.height / 2;
                        
                        const welcomeText = new fabric.Text('Nessuna materia per questo studente\n\nClicca + per aggiungere la prima materia', {
                            left: centerX,
                            top: centerY,
                            originX: 'center',
                            originY: 'center',
                            fontSize: 20,
                            fill: '#666',
                            textAlign: 'center',
                            selectable: false,
                            evented: false
                        });
                        
                        canvas.add(welcomeText);
                        canvas.renderAll();
                    }
                }
            }
        }
    }
}

// === GESTIONE PAGINE ===
async function loadSubjectPages() {
    if (!currentSubjectId) return;
    
    // Ottieni numero massimo di pagine per questa materia
    const maxPage = await getMaxPageNumber(currentSubjectId);
    totalPages = maxPage > 0 ? maxPage : 1;
    currentPage = 1;
    
    // Carica la prima pagina
    await loadPage(currentSubjectId, currentPage);
    updatePageInfo();
    
    // Reset undo/redo
    undoStack = [];
    redoStack = [];
    
    // Avvia auto-save
    if (!isStudent) {
        startAutoSave();
    }
}

async function loadPage(subjectId, pageNumber) {
    if (!canvas) return;
    
    // Assicurati che il canvas sia abilitato per il disegno
    canvas.isDrawingMode = true;
    
    const page = await loadPageFromDB(subjectId, pageNumber);
    
    if (page) {
        currentBackground = page.background_type || 'lines';
        
        // Aggiorna bottoni sfondo
        document.querySelectorAll('.tool-btn').forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes('setBackground')) {
                btn.classList.remove('active');
                if (btn.onclick.toString().includes(`'${currentBackground}'`)) {
                    btn.classList.add('active');
                }
            }
        });
        
        canvas.clear();
        canvas.loadFromJSON(page.canvas_data, () => {
            drawBackground();
            canvas.renderAll();
        });
    } else {
        // Nuova pagina vuota
        canvas.clear();
        currentBackground = 'lines';
        drawBackground();
    }
    
    // Reset undo/redo per la nuova pagina
    undoStack = [];
    redoStack = [];
    setTimeout(() => saveToUndoStack(), 200);
}

async function newPage() {
    if (!currentSubjectId || isStudent || !canvas) return;
    
    await saveCurrentPage();
    
    totalPages++;
    currentPage = totalPages;
    updatePageInfo();
    
    canvas.clear();
    undoStack = [];
    redoStack = [];
    drawBackground();
    saveToUndoStack();
    
    // Salva subito la nuova pagina vuota
    debouncedSave();
}

async function previousPage() {
    if (!currentSubjectId) return;
    
    if (currentPage > 1) {
        if (!isStudent) await saveCurrentPage();
        currentPage--;
        
        if (isStudent) {
            await loadStudentPage(currentSubjectId, currentPage);
        } else {
            await loadPage(currentSubjectId, currentPage);
        }
        updatePageInfo();
        
        // Salva stato dopo cambio pagina
        if (!isStudent) saveAppState();
    }
}

async function nextPage() {
    if (!currentSubjectId) return;
    
    if (currentPage < totalPages) {
        if (!isStudent) await saveCurrentPage();
        currentPage++;
        
        if (isStudent) {
            await loadStudentPage(currentSubjectId, currentPage);
        } else {
            await loadPage(currentSubjectId, currentPage);
        }
        updatePageInfo();
        
        // Salva stato dopo cambio pagina
        if (!isStudent) saveAppState();
    }
}

// Funzioni separate per studenti
async function previousPageStudent() {
    if (currentPage > 1) {
        currentPage--;
        await loadStudentPage(currentSubjectId, currentPage);
        updatePageInfo();
    }
}

async function nextPageStudent() {
    if (currentPage < totalPages) {
        currentPage++;
        await loadStudentPage(currentSubjectId, currentPage);
        updatePageInfo();
    }
}

async function saveCurrentPage() {
    if (!canvas || !currentSubjectId || isStudent) return;
    
    const canvasData = canvas.toJSON(['excludeFromExport']);
    await savePage(currentPage, canvasData, currentBackground);
    
    // Feedback visivo
    const btn = document.querySelector('.tool-btn[onclick="saveCurrentPage()"]');
    if (btn) {
        btn.innerHTML = '💾<span class="tooltip">Salvato!</span>';
        setTimeout(() => {
            btn.innerHTML = '💾<span class="tooltip">Salva</span>';
        }, 1000);
    }
}

// Debounce per auto-save
let saveTimeout;
function debouncedSave() {
    if (isStudent) return;
    
    clearTimeout(saveTimeout);
    updateSyncStatus('syncing');
    
    saveTimeout = setTimeout(async () => {
        await saveCurrentPage();
    }, 2000); // Salva dopo 2 secondi di inattività
}

function updatePageInfo() {
    const pageInfoEl = document.getElementById(isStudent ? 'pageInfoStudent' : 'pageInfo');
    const prevBtn = document.getElementById(isStudent ? 'prevPageBtnStudent' : 'prevPageBtn');
    const nextBtn = document.getElementById(isStudent ? 'nextPageBtnStudent' : 'nextPageBtn');
    
    if (pageInfoEl) {
        pageInfoEl.textContent = `Pagina ${currentPage} di ${totalPages}`;
    }
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

// === GESTIONE VISTA STUDENTE ===
async function loadStudentSubjects() {
    try {
        await waitForSupabase();
        
        const studentId = isStudent ? currentStudent.id : currentStudent?.id;
        if (!studentId) {
            console.error('Nessuno studente selezionato');
            return;
        }
        
        const { data: subjects, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('student_id', studentId)
            .order('position');
        
        if (error) throw error;
        
        // Container giusto per tutor o studente
        const tabsContainer = isStudent 
            ? document.getElementById('studentSubjectTabs')
            : document.getElementById('subjectTabs');
            
        if (!tabsContainer) {
            console.error('Container materie non trovato');
            return;
        }
        
        const addBtn = !isStudent ? tabsContainer.querySelector('.add-subject-tab') : null;
        
        // Rimuovi tutte le schede esistenti tranne il bottone + (solo per tutor)
        if (isStudent) {
            tabsContainer.innerHTML = '';
        } else {
            tabsContainer.querySelectorAll('.subject-tab:not(.add-subject-tab)').forEach(tab => {
                tab.remove();
            });
        }
        
        // Se non ci sono materie, mostra messaggio informativo
        if (subjects.length === 0) {
            if (!isStudent) {
                // NUOVA IMPLEMENTAZIONE: usa overlay invece di scrivere nel canvas
                if (canvas) {
                    canvas.clear();
                    canvas.isDrawingMode = false;
                }
                
                // Rimuovi bordo colorato
                const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
                if (pageWrapper) {
                    pageWrapper.classList.remove('subject-border');
                }
                
                // Mostra overlay
                showNoSubjectsOverlay();
                
            } else {
                // Per studenti senza materie (questo rimane uguale)
                const noSubjectsDiv = document.createElement('div');
                noSubjectsDiv.style.cssText = `
                    padding: 20px; text-align: center; color: #666;
                    background: #f9f9f9; margin: 10px; border-radius: 10px;
                `;
                noSubjectsDiv.innerHTML = `
                    <h3>📚 Nessuna materia disponibile</h3>
                    <p>Il tuo tutor non ha ancora creato materie per te.</p>
                `;
                tabsContainer.appendChild(noSubjectsDiv);
                
                // Rimuovi bordo colorato anche per studenti
                const pageWrapper = document.querySelector('#studentApp .page-wrapper');
                if (pageWrapper) {
                    pageWrapper.classList.remove('subject-border');
                }
            }
            
            // Importante: reset currentSubjectId quando non ci sono materie
            currentSubjectId = null;
            return;
        }
        
        // IMPORTANTE: rimuovi overlay se c'è quando ci sono materie
        removeNoSubjectsOverlay();
        
        // Crea le schede per ogni materia
        subjects.forEach((subject, index) => {
            const tab = createSubjectTab(subject);
            if (addBtn && !isStudent) {
                tabsContainer.insertBefore(tab, addBtn);
            } else {
                tabsContainer.appendChild(tab);
            }
            
            // Seleziona la prima materia
            if (index === 0) {
                setTimeout(() => {
                    if (isStudent) {
                        selectStudentSubject(subject.id);
                    } else {
                        selectSubject(subject.id);
                    }
                }, 100);
            }
        });
        
    } catch (error) {
        console.error('Errore caricamento materie:', error);
    }
}

function showNoSubjectsOverlay() {
    // Rimuovi overlay esistente se c'è
    removeNoSubjectsOverlay();
    
    const pageArea = document.querySelector('#tutorApp .page-area');
    if (!pageArea) return;
    
    // Aggiungi blur al canvas
    const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
    if (pageWrapper) {
        pageWrapper.classList.add('blur-background');
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'noSubjectsOverlay';
    overlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        z-index: 100;
        max-width: 400px;
    `;
    
    overlay.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">📚</div>
        <h2 style="color: var(--primary-blue); margin-bottom: 15px;">
            Nessuna materia per questo studente
        </h2>
        <p style="color: #666; font-size: 16px; margin-bottom: 25px;">
            Inizia creando la prima materia per organizzare gli appunti
        </p>
        <button onclick="document.querySelector('.add-subject-tab').click()" 
                style="padding: 12px 30px; background: var(--primary-green); 
                       color: white; border: none; border-radius: 25px; 
                       font-size: 16px; cursor: pointer; font-weight: 600;
                       transition: all 0.3s;">
            ➕ Aggiungi Prima Materia
        </button>
    `;
    
    pageArea.appendChild(overlay);
}

function removeNoSubjectsOverlay() {
    const overlay = document.getElementById('noSubjectsOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Rimuovi blur dal canvas
    const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
    if (pageWrapper) {
        pageWrapper.classList.remove('blur-background');
    }
}

async function selectStudentSubject(subjectId) {
    currentSubjectId = subjectId;
    
    // Aggiorna UI
    document.querySelectorAll('#studentSubjectTabs .subject-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetTab = document.querySelector(`#studentSubjectTabs [data-subject-id="${subjectId}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
        
        // Applica il colore della materia al bordo del canvas
        const subjectColor = targetTab.getAttribute('data-subject-color');
        applyCanvasBorder(subjectColor);
    }
    
    // Inizializza canvas studente se non esiste
    if (!studentCanvas) {
        initializeStudentCanvas();
    }
    
    // Carica pagine
    await loadStudentPages();
}

async function loadStudentPages() {
    if (!currentSubjectId || !studentCanvas) return;
    
    const maxPage = await getMaxPageNumber(currentSubjectId);
    totalPages = maxPage > 0 ? maxPage : 1;
    currentPage = 1;
    
    await loadStudentPage(currentSubjectId, currentPage);
    updatePageInfo();
}

async function loadStudentPage(subjectId, pageNumber) {
    if (!studentCanvas) return;
    
    const page = await loadPageFromDB(subjectId, pageNumber);
    
    if (page && page.canvas_data) {
        studentCanvas.clear();
        studentCanvas.loadFromJSON(page.canvas_data, () => {
            studentCanvas.renderAll();
        });
    } else {
        studentCanvas.clear();
        // Mostra messaggio "Nessun contenuto"
        const text = new fabric.Text('Nessun contenuto in questa pagina', {
            left: studentCanvas.width / 2,
            top: studentCanvas.height / 2,
            originX: 'center',
            originY: 'center',
            fontSize: 20,
            fill: '#999'
        });
        studentCanvas.add(text);
        studentCanvas.renderAll();
    }
}

// === GESTIONE STUDENTI (TUTOR) ===
async function loadStudentSelector() {
    if (isStudent) return;
    
    try {
        await waitForSupabase();
        
        const { data: students, error } = await supabase
            .from('students')
            .select('*')
            .eq('tutor_id', currentUser.id)
            .order('created_at');
        
        if (error) throw error;
        
        console.log('Studenti caricati:', students);
        
        const selector = document.getElementById('studentSelector');
        selector.innerHTML = '<option value="">Seleziona studente...</option>';
        
        // Mostra studenti in lista
        for (const student of students) {
            const option = document.createElement('option');
            option.value = student.id;
            
            let displayName = student.class_name || student.email || 'Studente senza nome';
            let isRegistered = false;
            
            // Verifica se lo studente si è registrato
            if (student.profile_id) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', student.profile_id)
                        .single();
                    
                    if (profile && profile.full_name) {
                        displayName = profile.full_name + ' ✅';
                        isRegistered = true;
                    }
                } catch (e) {
                    console.log('Profilo non trovato per student.profile_id:', student.profile_id);
                }
            }
            
            // Aggiungi emoji per stato
            if (!isRegistered) {
                displayName = '📧 ' + displayName;
            }
            
            option.textContent = displayName;
            option.dataset.registered = isRegistered;
            option.dataset.studentData = JSON.stringify(student);
            selector.appendChild(option);
        }
        
        // Seleziona il primo se esiste
        if (students.length > 0) {
            selector.value = students[0].id;
            await selectStudent(students[0].id);
        } else {
            selector.style.display = 'none';
        }
        
        // Event listener per cambio studente
        selector.onchange = async (e) => {
            if (e.target.value) {
                await selectStudent(e.target.value);
            }
        };
        
    } catch (error) {
        console.error('Errore caricamento studenti:', error);
        showError('Errore nel caricamento degli studenti');
    }
}

async function restoreAppState(savedState) {
    try {
        console.log('🔄 Ripristinando stato:', savedState);
        
        // 1. Ripristina studente selezionato
        if (savedState.selectedStudentId) {
            const selector = document.getElementById('studentSelector');
            const option = selector.querySelector(`option[value="${savedState.selectedStudentId}"]`);
            
            if (option) {
                selector.value = savedState.selectedStudentId;
                await selectStudent(savedState.selectedStudentId);
                console.log('✅ Studente ripristinato:', savedState.selectedStudentId);
                
                // 2. Ripristina materia selezionata
                if (savedState.selectedSubjectId) {
                    // Aspetta che le materie siano caricate
                    await new Promise(resolve => setTimeout(resolve, 400));
                    
                    const subjectTab = document.querySelector(`[data-subject-id="${savedState.selectedSubjectId}"]`);
                    if (subjectTab) {
                        await selectSubject(savedState.selectedSubjectId);
                        console.log('✅ Materia ripristinata:', savedState.selectedSubjectId);
                        
                        // 3. Ripristina pagina corrente
                        if (savedState.currentPage && savedState.currentPage > 1) {
                            // Aspetta che la materia sia caricata
                            await new Promise(resolve => setTimeout(resolve, 600));
                            
                            // Naviga alla pagina salvata
                            const targetPage = Math.min(savedState.currentPage, totalPages);
                            if (targetPage !== currentPage) {
                                currentPage = targetPage;
                                await loadPage(currentSubjectId, currentPage);
                                updatePageInfo();
                                console.log('✅ Pagina ripristinata:', targetPage);
                            }
                        }
                        
                        // Aspetta un po' prima di nascondere il loading
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                    } else {
                        console.log('⚠️ Materia non trovata:', savedState.selectedSubjectId);
                    }
                } else {
                    console.log('⚠️ Nessuna materia da ripristinare');
                }
            } else {
                console.log('⚠️ Studente non trovato:', savedState.selectedStudentId);
                clearAppState();
            }
        }
        
        console.log('🎯 Ripristino stato completato');
        
    } catch (error) {
        console.error('❌ Errore ripristino stato:', error);
        clearAppState();
    }
}

async function selectStudent(studentId) {
    try {
        await waitForSupabase();
        
        const { data: student, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();
        
        if (error) throw error;
        
        currentStudent = student;
        console.log('Studente selezionato:', student);
        
        // Salva stato dopo selezione studente
        saveAppState();
        
        // Carica materie
        await loadStudentSubjects();
        
    } catch (error) {
        console.error('Errore selezione studente:', error);
        showError('Errore nella selezione dello studente');
    }
}

// === GESTIONE STUDENTI - MODAL ===
function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'flex';
    document.getElementById('newStudentEmail').value = '';
    document.getElementById('newStudentName').value = '';
    document.getElementById('newStudentEmail').focus();
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'none';
}

async function addStudent() {
    const email = document.getElementById('newStudentEmail').value.trim();
    const name = document.getElementById('newStudentName').value.trim();
    
    if (!email) {
        alert('Inserisci l\'email dello studente');
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        alert('Inserisci un\'email valida');
        return;
    }
    
    try {
        await waitForSupabase();
        
        // Controlla duplicati
        const { data: existing } = await supabase
            .from('students')
            .select('id')
            .eq('email', email)
            .eq('tutor_id', currentUser.id)
            .maybeSingle();
        
        if (existing) {
            alert('Questo studente è già nella tua lista');
            return;
        }
        
        console.log('Creando studente...');
        
        // Crea studente
        const { data: newStudent, error: studentError } = await supabase
            .from('students')
            .insert({
                tutor_id: currentUser.id,
                email: email,
                class_name: name || null
            })
            .select()
            .single();
        
        if (studentError) throw studentError;
        
        console.log('✅ Studente creato:', newStudent);
        
        // Ricarica lista
        await loadStudentSelector();
        
        if (newStudent) {
            document.getElementById('studentSelector').value = newStudent.id;
            await selectStudent(newStudent.id);
        }
        
        closeAddStudentModal();
        alert(`✅ Studente ${name || email} aggiunto con successo!`);
        
    } catch (error) {
        console.error('❌ Errore:', error);
        alert('Errore: ' + error.message);
    }
}

// === OVERLAY CARICAMENTO ===
function showLoadingOverlay(message = "Caricamento in corso...") {
    // Rimuovi overlay esistente se presente
    hideLoadingOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="width: 60px; height: 60px; margin: 0 auto 20px auto; position: relative;">
                <div style="
                    width: 60px; height: 60px; border: 4px solid #f3f3f3;
                    border-top: 4px solid #4CAF50; border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            </div>
            <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">
                ${message}
            </h3>
            <p style="color: #666; margin: 0; font-size: 14px;">
                Un momento, stiamo preparando tutto...
            </p>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }
}

// === GESTIONE STATO PERSISTENTE ===
function saveAppState() {
    if (isStudent) return;
    
    const state = {
        selectedStudentId: currentStudent?.id || null,
        selectedSubjectId: currentSubjectId || null,
        currentPage: currentPage || 1,
        timestamp: Date.now()
    };
    
    localStorage.setItem('uptoten_app_state', JSON.stringify(state));
    console.log('💾 Stato salvato:', state);
}

function loadAppState() {
    if (isStudent) return null;
    
    try {
        const saved = localStorage.getItem('uptoten_app_state');
        if (!saved) return null;
        
        const state = JSON.parse(saved);
        
        // Verifica che non sia troppo vecchio (max 24 ore)
        const maxAge = 24 * 60 * 60 * 1000; // 24 ore in millisecondi
        if (Date.now() - state.timestamp > maxAge) {
            localStorage.removeItem('uptoten_app_state');
            return null;
        }
        
        console.log('📥 Stato caricato:', state);
        return state;
    } catch (error) {
        console.error('Errore caricamento stato:', error);
        localStorage.removeItem('uptoten_app_state');
        return null;
    }
}

function clearAppState() {
    localStorage.removeItem('uptoten_app_state');
    console.log('🗑️ Stato cancellato');
}

// === INIZIALIZZAZIONE TUTOR ===
window.initTutorApp = async function() {
    document.getElementById('tutorApp').style.display = 'block';
    isStudent = false;
    
    // Mostra nome tutor
    document.querySelector('#tutorApp .user-info span').textContent = currentProfile.full_name;
    
    // Mostra avatar se disponibile
    const avatarEl = document.querySelector('#tutorApp .user-avatar');
    if (currentProfile.avatar_url) {
        avatarEl.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Avatar">`;
    } else {
        avatarEl.textContent = getInitials(currentProfile.full_name);
    }
    
    // Carica stato precedente
    const savedState = loadAppState();
    
    // Se c'è uno stato da ripristinare, mostra loading
    if (savedState && savedState.selectedStudentId) {
        showLoadingOverlay("Ripristinando la tua sessione...");
    }
    
    // Carica lista studenti
    await loadStudentSelector();
    
    // Ripristina stato se disponibile
    if (savedState && savedState.selectedStudentId) {
        await restoreAppState(savedState);
        // Nascondi loading dopo ripristino
        hideLoadingOverlay();
    }
    
    // Inizializza canvas
    setTimeout(() => {
        initializeCanvas();
        // Mostra messaggio info solo se non abbiamo ripristinato uno stato
        if (!savedState) showInfoMessage();
    }, 200);
}

// === MESSAGGI E HELPER ===
function showInfoMessage() {
    const message = document.createElement('div');
    message.className = 'info-message';
    message.innerHTML = `
        <strong>✨ UpToTen Notes</strong><br>
        • Usa <strong>+</strong> per aggiungere studenti e materie<br>
        • <strong>Doppio click</strong> per rinominare materie<br>
        • Tutto si salva automaticamente
    `;
    message.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 9999;
        background: rgba(0, 0, 0, 0.8); color: white; padding: 15px;
        border-radius: 10px; font-size: 12px; max-width: 300px;
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => message.remove(), 500);
    }, 6000);
}

function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-message';
    infoDiv.textContent = message;
    infoDiv.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; z-index: 9999;
        background: rgba(0, 0, 0, 0.8); color: white; padding: 10px 15px;
        border-radius: 5px; font-size: 12px; max-width: 300px;
    `;
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        infoDiv.style.opacity = '0';
        setTimeout(() => infoDiv.remove(), 500);
    }, 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: #ff4444; color: white; padding: 15px;
        border-radius: 10px; max-width: 300px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Helper functions
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Cleanup
window.addEventListener('beforeunload', async (e) => {
    if (!isStudent && canvas && currentSubjectId) {
        await saveCurrentPage();
        stopAutoSave();
        saveAppState(); // Salva stato prima di chiudere
    }
});

// Salva stato anche quando la finestra perde il focus
window.addEventListener('blur', () => {
    if (!isStudent) {
        saveAppState();
    }
});

// Salva stato periodicamente (ogni 30 secondi)
if (!isStudent) {
    setInterval(() => {
        saveAppState();
    }, 30000);
}

console.log('📝 App.js caricato - Gestione principale attiva!');