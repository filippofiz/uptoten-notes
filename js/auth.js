// Gestione autenticazione con Supabase - VERSIONE SICURA FINALE

// Inizializza Supabase e auth
function initializeSupabase() {
    if (window.supabase && !supabase) {
        const { createClient } = window.supabase;
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase inizializzato');
        
        // Setup auth listener
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                checkAuth();
            }
        });
        
        // Check initial auth
        checkAuth();
    }
}

// Login con Google (solo per tutor)
async function loginWithGoogle(role) {
    try {
        if (!supabase) {
            console.error('Supabase non ancora inizializzato');
            return;
        }
        
        // Mostra loading
        const loginBtn = event.target;
        const originalText = loginBtn.innerHTML;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="loading-spinner"></span> Accesso in corso...';

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                    // Solo tutor con dominio uptoten.it
                    ...(role === 'tutor' && { hd: 'uptoten.it' })
                }
            }
        });

        if (error) throw error;

    } catch (error) {
        console.error('Errore login:', error);
        showError('Errore durante il login. Riprova.');
        const loginBtn = event.target;
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalText;
    }
}

// Controlla se l'utente è già loggato
async function checkAuth() {
    if (!supabase) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            currentUser = user;
            
            // Determina ruolo basato su email E metadati
            let userRole = 'student'; // Default studente
            
            // Se email @uptoten.it = tutor
            if (user.email && user.email.endsWith('@uptoten.it')) {
                userRole = 'tutor';
            }
            
            // Se user_metadata ha role = usa quello
            if (user.user_metadata && user.user_metadata.role) {
                userRole = user.user_metadata.role;
            }
            
            console.log('Utente loggato:', user.email, 'Ruolo:', userRole);
            
            // Recupera o crea il profilo
            let { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error || !profile) {
                console.log('Creando nuovo profilo...');
                
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        email: user.email,
                        full_name: user.user_metadata.full_name || user.email.split('@')[0],
                        avatar_url: user.user_metadata.avatar_url,
                        role: userRole
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                profile = newProfile;
            } else {
                // Aggiorna ruolo se necessario
                if (profile.role !== userRole) {
                    const { data: updatedProfile } = await supabase
                        .from('profiles')
                        .update({ role: userRole })
                        .eq('id', user.id)
                        .select()
                        .single();
                        
                    profile = updatedProfile || profile;
                }
            }

            currentProfile = profile;
            
            // Mostra l'app appropriata
            document.getElementById('loginScreen').style.display = 'none';
            
            // Nascondi eventuali form di registrazione sicura
            const secureForm = document.querySelector('.login-container:not(#loginScreen)');
            if (secureForm) secureForm.remove();
            
            if (profile.role === 'tutor') {
                await initTutorApp();
            } else {
                await initStudentApp();
            }
        }
    } catch (error) {
        console.error('Errore check auth:', error);
    }
}

// Logout
async function logout() {
    try {
        if (!supabase) return;
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Reset variabili
        currentUser = null;
        currentProfile = null;
        currentStudent = null;
        
        // Torna al login
        window.location.reload();
    } catch (error) {
        console.error('Errore logout:', error);
        showError('Errore durante il logout');
    }
}

// Inizializza app tutor
async function initTutorApp() {
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
    
    // Carica studenti del tutor
    await loadStudentSelector();
    
    // Crea il pulsante invito se non esiste
    setTimeout(() => {
        if (!document.getElementById('inviteBtn')) {
            createInviteButton();
        }
    }, 100);
    
    // Inizializza canvas dopo un attimo
    setTimeout(() => {
        initializeCanvas();
        showInfoMessage();
    }, 200);
}

// Inizializza app studente - VERSIONE SICURA
async function initStudentApp() {
    document.getElementById('studentApp').style.display = 'block';
    isStudent = true;
    
    // Mostra nome studente
    document.querySelector('#studentApp .user-info span').textContent = currentProfile.full_name;
    
    // Mostra avatar
    const avatarEl = document.querySelector('#studentApp .user-avatar');
    if (currentProfile.avatar_url) {
        avatarEl.innerHTML = `<img src="${currentProfile.avatar_url}" alt="Avatar">`;
    } else {
        avatarEl.textContent = getInitials(currentProfile.full_name);
    }
    
    // NUOVO: Collegamento automatico tramite sistema sicuro
    await connectStudentSecurely();
    
    // Carica materie dello studente
    await loadStudentSubjects();
    
    // Inizializza canvas studente
    setTimeout(() => {
        initializeStudentCanvas();
    }, 100);
}

// NUOVO: Collegamento sicuro studente
async function connectStudentSecurely() {
    try {
        // 1. Cerca record studente esistente tramite email
        let { data: existingStudent, error: searchError } = await supabase
            .from('students')
            .select('*')
            .eq('email', currentUser.email)
            .maybeSingle();
        
        if (searchError) {
            console.error('Errore ricerca studente:', searchError);
        }
        
        if (existingStudent) {
            console.log('✅ Studente trovato - collegamento al tutor:', existingStudent);
            
            // Collega profilo se non già fatto
            if (!existingStudent.profile_id) {
                const { data: updatedStudent, error: updateError } = await supabase
                    .from('students')
                    .update({ profile_id: currentUser.id })
                    .eq('id', existingStudent.id)
                    .select()
                    .single();
                
                if (updateError) {
                    console.error('Errore collegamento:', updateError);
                } else {
                    console.log('🔗 Profilo collegato al tutor!');
                    existingStudent = updatedStudent;
                    
                    // Mostra messaggio di successo
                    showSuccessMessage('🎉 Collegamento riuscito! Ora puoi vedere i contenuti del tuo tutor!');
                }
            }
            
            currentStudent = existingStudent;
            
        } else {
            console.log('📝 Nessun tutor associato - studente indipendente');
            
            // Crea record studente indipendente
            const { data: newStudent, error: createError } = await supabase
                .from('students')
                .insert({
                    profile_id: currentUser.id,
                    email: currentUser.email,
                    class_name: currentProfile.full_name
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Errore creazione studente:', createError);
            } else {
                console.log('👨‍🎓 Studente indipendente creato');
                currentStudent = newStudent;
                
                showInfoMessage('👋 Benvenuto! Sei registrato come studente indipendente.');
            }
        }
        
    } catch (error) {
        console.error('Errore collegamento sicuro:', error);
    }
}

// === GESTIONE TOKEN SICURI ===

// Gestione token sicuri in arrivo
async function handleSecureInvite() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite_token');
    
    if (inviteToken) {
        try {
            console.log('🔍 Verificando token di invito sicuro...');
            
            // Aspetta che Supabase sia pronto
            await waitForSupabase();
            
            // Verifica token nel database
            const { data: tokenData, error } = await supabase
                .from('invitation_tokens')
                .select('*')
                .eq('token', inviteToken)
                .is('used_at', null) // Non ancora usato
                .gt('expires_at', new Date().toISOString()) // Non scaduto
                .single();
            
            if (error || !tokenData) {
                throw new Error('Token di invito non valido o scaduto');
            }
            
            console.log('✅ Token valido:', tokenData);
            
            // Mostra form di registrazione pre-compilato
            showSecureRegistrationForm(tokenData);
            return true;
            
        } catch (error) {
            console.error('❌ Errore token:', error);
            showInvalidTokenError();
            return false;
        }
    }
    return false;
}

// Mostra errore token non valido
function showInvalidTokenError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
        background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
    `;
    errorDiv.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px;">
            <h2 style="color: #ff4444; margin-bottom: 15px;">❌ Invito Non Valido</h2>
            <p style="margin-bottom: 20px;">
                Il link di invito non è valido o è scaduto.<br>
                <small>Chiedi al tuo tutor di inviarti un nuovo link.</small>
            </p>
            <button onclick="window.location.href='${window.location.origin}'" 
                    style="padding: 10px 20px; background: var(--primary-green); color: white; border: none; border-radius: 25px; cursor: pointer;">
                🏠 Torna alla Home
            </button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// Form registrazione sicura
function showSecureRegistrationForm(tokenData) {
    // Nascondi login normale
    document.getElementById('loginScreen').style.display = 'none';
    
    // Crea form sicuro
    const secureForm = document.createElement('div');
    secureForm.className = 'login-container';
    secureForm.style.display = 'flex';
    secureForm.innerHTML = `
        <div class="login-box">
            <div class="logo">
                <div class="logo-icon">10</div>
                <div class="logo-text">UpToTen</div>
            </div>
            
            <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: var(--primary-green);">🎉 Invito Confermato!</h3>
                <p style="margin: 0; font-size: 14px;">
                    Ciao <strong>${tokenData.student_name || tokenData.student_email}</strong>!<br>
                    Completa la registrazione per iniziare.
                </p>
            </div>
            
            <h3 style="margin-bottom: 1.5rem; color: var(--primary-blue);">🔐 Registrazione Sicura</h3>
            
            <input type="text" value="${tokenData.student_name || ''}" readonly
                   style="width: 100%; padding: 12px; margin-bottom: 1rem; background: #f0f0f0; border: 2px solid #ddd; border-radius: 10px;">
            
            <input type="email" value="${tokenData.student_email}" readonly
                   style="width: 100%; padding: 12px; margin-bottom: 1rem; background: #f0f0f0; border: 2px solid #ddd; border-radius: 10px;">
            
            <input type="password" id="securePassword" class="modern-input" placeholder="Scegli una password sicura" 
                   style="width: 100%; margin-bottom: 1rem;" required minlength="6">
            
            <input type="password" id="secureConfirmPassword" class="modern-input" placeholder="Conferma password" 
                   style="width: 100%; margin-bottom: 1.5rem;" required>
            
            <button onclick="completeSecureRegistration('${tokenData.token}')" class="google-btn" 
                    style="width: 100%; background: var(--primary-green); border: none;">
                ✅ Completa Registrazione
            </button>
            
            <div style="margin-top: 1.5rem; text-align: center; font-size: 12px; color: #666;">
                🔒 I tuoi dati sono protetti e il link è utilizzabile una sola volta
            </div>
        </div>
    `;
    
    document.body.appendChild(secureForm);
}

// Completa registrazione sicura
async function completeSecureRegistration(token) {
    const password = document.getElementById('securePassword').value;
    const confirmPassword = document.getElementById('secureConfirmPassword').value;
    
    if (!password || !confirmPassword) {
        alert('Inserisci entrambe le password');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Le password non coincidono');
        return;
    }
    
    if (password.length < 6) {
        alert('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    try {
        // Recupera dati token
        const { data: tokenData } = await supabase
            .from('invitation_tokens')
            .select('*')
            .eq('token', token)
            .single();
        
        if (!tokenData) throw new Error('Token non trovato');
        
        // Registra utente
        const { data, error } = await supabase.auth.signUp({
            email: tokenData.student_email,
            password: password,
            options: {
                data: {
                    full_name: tokenData.student_name || tokenData.student_email.split('@')[0],
                    role: 'student'
                }
            }
        });
        
        if (error) throw error;
        
        // Marca token come usato
        await supabase
            .from('invitation_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', token);
        
        // Pulisci URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        alert('✅ Registrazione completata! Accesso in corso...');
        
        // L'auth listener gestirà il login automatico
        
    } catch (error) {
        console.error('Errore registrazione sicura:', error);
        alert('Errore: ' + error.message);
    }
}

// === FUNZIONI HELPER ===

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        background: var(--primary-green); color: white; padding: 15px;
        border-radius: 10px; max-width: 300px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => successDiv.remove(), 5000);
}

function showInfoMessage(message) {
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        background: var(--primary-blue); color: white; padding: 15px;
        border-radius: 10px; max-width: 350px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    infoDiv.textContent = message;
    document.body.appendChild(infoDiv);
    
    setTimeout(() => infoDiv.remove(), 8000);
}

// === INIZIALIZZAZIONE ===

// Inizializza quando tutto è pronto
window.addEventListener('load', async () => {
    // Prima gestisci token sicuri
    const hasSecureToken = await handleSecureInvite();
    
    // Se non c'è token sicuro, procedi normalmente
    if (!hasSecureToken) {
        setTimeout(initializeSupabase, 500);
    }
});