// Gestione operazioni database Supabase

// Aspetta che Supabase sia inizializzato
function waitForSupabase() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (window.supabase && supabase) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

// === STUDENTI ===
async function loadTutorStudents() {
    // Questa funzione non è più necessaria
    // Usiamo loadStudentSelector in app.js
    return [];
}

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
        
        // IMPORTANTE: Usa il container giusto per tutor
        const tabsContainer = isStudent 
            ? document.getElementById('studentSubjectTabs')
            : document.getElementById('subjectTabs');
            
        if (!tabsContainer) {
            console.error('Container materie non trovato');
            return;
        }
        
        const addBtn = tabsContainer.querySelector('.add-subject-tab');
        
        // Rimuovi tutte le schede esistenti tranne il bottone +
        tabsContainer.querySelectorAll('.subject-tab:not(.add-subject-tab)').forEach(tab => {
            tab.remove();
        });
        
        // Se non ci sono materie, creane alcune di default
        if (subjects.length === 0 && !isStudent) {
            const defaultSubjects = ['Matematica', 'Fisica', 'Chimica', 'Inglese'];
            const colors = ['#2196F3', '#FF5722', '#9C27B0', '#4CAF50'];
            
            for (let i = 0; i < defaultSubjects.length; i++) {
                await createSubject(defaultSubjects[i], colors[i], i);
            }
            
            // Ricarica dopo aver creato le materie di default
            return loadStudentSubjects();
        }
        
        // Crea le schede per ogni materia
        subjects.forEach((subject, index) => {
            const tab = createSubjectTab(subject);
            if (addBtn) {
                tabsContainer.insertBefore(tab, addBtn);
            } else {
                tabsContainer.appendChild(tab);
            }
            
            // Seleziona la prima materia
            if (index === 0) {
                setTimeout(() => selectSubject(subject.id), 100);
            }
        });
        
    } catch (error) {
        console.error('Errore caricamento materie:', error);
    }
}

// Sostituisci la funzione createSubject in database.js con questa versione

async function createSubject(name, color = null, position = null) {
    try {
        await waitForSupabase();
        
        const studentId = isStudent ? currentStudent.id : currentStudent?.id;
        if (!studentId) return;
        
        // Se non viene fornito un colore, usa il sistema di colori predefiniti
        if (!color) {
            // Ottieni materie esistenti per vedere quali colori sono già usati
            const { data: existingSubjects } = await supabase
                .from('subjects')
                .select('color')
                .eq('student_id', studentId);
            
            const usedColors = existingSubjects ? existingSubjects.map(s => s.color) : [];
            
            // Array di colori predefiniti
            const defaultColors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', 
                '#BB8FCE', '#85C1E9', '#F8B500', '#6C5CE7',
                '#A8E6CF', '#FDA7DF', '#4834D4', '#30336B'
            ];
            
            // Trova il primo colore non utilizzato
            color = defaultColors.find(c => !usedColors.includes(c)) || 
                    '#' + Math.floor(Math.random()*16777215).toString(16);
        }
        
        // Trova la posizione massima se non specificata
        if (position === null) {
            const { data: subjects } = await supabase
                .from('subjects')
                .select('position')
                .eq('student_id', studentId)
                .order('position', { ascending: false })
                .limit(1);
            
            position = subjects && subjects.length > 0 ? subjects[0].position + 1 : 0;
        }
        
        const { data: subject, error } = await supabase
            .from('subjects')
            .insert({
                student_id: studentId,
                name: name,
                color: color,
                position: position
            })
            .select()
            .single();
        
        if (error) throw error;
        
        return subject;
    } catch (error) {
        console.error('Errore creazione materia:', error);
        showError('Errore nella creazione della materia');
        return null;
    }
}

// Aggiorna anche loadStudentSubjects per rimuovere la creazione automatica di materie
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
                // Per il tutor: mostra messaggio nel canvas
                if (canvas) {
                    canvas.clear();
                    canvas.isDrawingMode = false; // Disabilita disegno
                    
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
                
                // Rimuovi bordo colorato se non ci sono materie
                const pageWrapper = document.querySelector('#tutorApp .page-wrapper');
                if (pageWrapper) {
                    pageWrapper.classList.remove('subject-border');
                }
                
                showInfo('Clicca il bottone + per aggiungere la prima materia per questo studente');
            } else {
                // Per studenti senza materie
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
            }
            
            // Importante: reset currentSubjectId quando non ci sono materie
            currentSubjectId = null;
            return;
        }
        
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

async function updateSubject(subjectId, updates) {
    try {
        await waitForSupabase();
        
        const { data, error } = await supabase
            .from('subjects')
            .update(updates)
            .eq('id', subjectId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Errore aggiornamento materia:', error);
        showError('Errore nell\'aggiornamento della materia');
        return null;
    }
}

async function deleteSubjectFromDB(subjectId) {
    try {
        await waitForSupabase();
        
        // Prima elimina tutte le pagine della materia
        await supabase
            .from('pages')
            .delete()
            .eq('subject_id', subjectId);
        
        // Poi elimina la materia
        const { error } = await supabase
            .from('subjects')
            .delete()
            .eq('id', subjectId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Errore eliminazione materia:', error);
        showError('Errore nell\'eliminazione della materia');
        return false;
    }
}

// === PAGINE ===
async function savePage(pageNumber, canvasData, backgroundType) {
    try {
        await waitForSupabase();
        
        // 1. CATTURA TUTTO SUBITO (non usare variabili globali dopo)
        const saveData = {
            subjectId: currentSubjectId,
            studentId: currentStudent?.id,
            pageNum: pageNumber,
            canvasStr: typeof canvasData === 'object' ? JSON.stringify(canvasData) : canvasData,
            background: backgroundType,
            timestamp: Date.now()
        };
        
        // 2. VALIDAZIONE TOTALE
        if (!saveData.subjectId || !saveData.studentId || !saveData.canvasStr) {
            console.error('❌ Dati incompleti, salvataggio annullato');
            return null;
        }
        
        // 3. LOCK DI SICUREZZA - previeni salvataggi simultanei
        if (window.savingInProgress) {
            console.warn('⏳ Salvataggio già in corso, annullato');
            return null;
        }
        window.savingInProgress = true;
        
        updateSyncStatus('syncing');
        
        try {
            // 4. VERIFICA DOPPIA che la materia sia dello studente
            const { data: verify, error: verifyError } = await supabase
                .from('subjects')
                .select('id, name, student_id')
                .eq('id', saveData.subjectId)
                .single();
            
            if (verifyError || !verify || verify.student_id !== saveData.studentId) {
                console.error('❌ Materia non valida o non dello studente');
                return null;
            }
            
            console.log('✅ Salvataggio verificato per:', verify.name, 'Pagina:', saveData.pageNum);
            
            // 5. CERCA LA PAGINA SPECIFICA (no upsert!)
            const { data: existing } = await supabase
                .from('pages')
                .select('id, canvas_data')
                .eq('subject_id', saveData.subjectId)
                .eq('page_number', saveData.pageNum)
                .maybeSingle();
            
            let result;
            
            if (existing) {
                // 6. UPDATE SOLO SE DIVERSO
                if (existing.canvas_data === saveData.canvasStr) {
                    console.log('↔️ Contenuto identico, skip salvataggio');
                    return existing;
                }
                
                const { data, error } = await supabase
                    .from('pages')
                    .update({
                        canvas_data: saveData.canvasStr,
                        background_type: saveData.background,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
                console.log('📝 Pagina aggiornata');
                
            } else {
                // 7. INSERT NUOVO con tutti i campi espliciti
                const { data, error } = await supabase
                    .from('pages')
                    .insert({
                        subject_id: saveData.subjectId,
                        page_number: saveData.pageNum,
                        canvas_data: saveData.canvasStr,
                        background_type: saveData.background
                    })
                    .select()
                    .single();
                
                if (error) throw error;
                result = data;
                console.log('📄 Nuova pagina creata');
            }
            
            updateSyncStatus('synced');
            return result;
            
        } finally {
            // 8. SEMPRE rilascia il lock
            window.savingInProgress = false;
        }
        
    } catch (error) {
        console.error('❌ Errore critico salvataggio:', error);
        updateSyncStatus('error');
        window.savingInProgress = false;
        return null;
    }
}
async function loadPageFromDB(subjectId, pageNumber) {
    try {
        await waitForSupabase();
        
        const { data: page, error } = await supabase
            .from('pages')
            .select('*')
            .eq('subject_id', subjectId)
            .eq('page_number', pageNumber)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        
        return page;
    } catch (error) {
        console.error('Errore caricamento pagina:', error);
        return null;
    }
}

async function getMaxPageNumber(subjectId) {
    try {
        await waitForSupabase();
        
        const { data, error } = await supabase
            .from('pages')
            .select('page_number')
            .eq('subject_id', subjectId)
            .order('page_number', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        return data && data.length > 0 ? data[0].page_number : 0;
    } catch (error) {
        console.error('Errore recupero numero pagine:', error);
        return 0;
    }
}

// === IMPOSTAZIONI ===
async function saveUserSettings(settings) {
    try {
        await waitForSupabase();
        
        const { data, error } = await supabase
            .from('user_settings')
            .upsert({
                profile_id: currentUser.id,
                ...settings
            }, {
                onConflict: 'profile_id'
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Errore salvataggio impostazioni:', error);
        return null;
    }
}

async function loadUserSettings() {
    try {
        await waitForSupabase();
        
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('profile_id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        return data;
    } catch (error) {
        console.error('Errore caricamento impostazioni:', error);
        return null;
    }
}

// === UTILITY ===
function updateSyncStatus(status) {
    const statusEl = document.querySelector('.sync-status');
    if (!statusEl) return;
    
    statusEl.className = `sync-status ${status}`;
    
    const messages = {
        synced: 'Salvato',
        syncing: 'Salvataggio...',
        error: 'Errore'
    };
    
    statusEl.innerHTML = `<span class="sync-dot"></span> ${messages[status]}`;
}

// Auto-save ogni 30 secondi
let autoSaveInterval;
function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    
    autoSaveInterval = setInterval(() => {
        if (canvas && currentSubjectId && !isStudent) {
            savePage(currentPage, canvas.toJSON(['excludeFromExport']), currentBackground);
        }
    }, 30000); // 30 secondi
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}