// Sistema inviti sicuri - Gestione completa inviti studenti

// === GENERAZIONE TOKEN SICURO ===
function generateSecureToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token + '_' + Date.now();
}

// === GESTIONE PULSANTE INVITO ===
function updateInviteButton() {
    const selector = document.getElementById('studentSelector');
    const inviteBtn = document.getElementById('inviteBtn');
    
    if (!inviteBtn) {
        createInviteButton();
        return;
    }
    
    const selectedOption = selector.options[selector.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        inviteBtn.style.display = 'none';
        return;
    }
    
    const isRegistered = selectedOption.dataset.registered === 'true';
    inviteBtn.style.display = 'block';
    
    if (isRegistered) {
        inviteBtn.innerHTML = '✅';
        inviteBtn.title = 'Studente già registrato';
        inviteBtn.style.background = '#28a745';
        inviteBtn.onclick = () => showInfo('Questo studente è già registrato! ✅');
    } else {
        inviteBtn.innerHTML = '📧';
        inviteBtn.title = 'Invia invito sicuro allo studente';
        inviteBtn.style.background = '#ff9500';
        inviteBtn.onclick = () => {
            const studentData = JSON.parse(selectedOption.dataset.studentData);
            showSecureInviteModal(studentData, currentProfile);
        };
    }
}

function createInviteButton() {
    const container = document.querySelector('.header-left > div');
    
    const inviteBtn = document.createElement('button');
    inviteBtn.id = 'inviteBtn';
    inviteBtn.style.cssText = `
        width: 35px; height: 35px; border-radius: 50%; 
        color: white; border: none; cursor: pointer; 
        font-size: 16px; margin-left: 5px;
        transition: all 0.3s; display: none;
    `;
    
    container.appendChild(inviteBtn);
    updateInviteButton();
}

// === GENERAZIONE LINK SICURO ===
async function generateSecureInviteLink(studentId) {
    try {
        // Recupera token esistente o crea nuovo
        let { data: existingToken } = await supabase
            .from('invitation_tokens')
            .select('*')
            .eq('student_id', studentId)
            .is('used_at', null) // Non ancora usato
            .gt('expires_at', new Date().toISOString()) // Non scaduto
            .single();
        
        if (!existingToken) {
            // Crea nuovo token se non esiste o è scaduto
            const student = await supabase
                .from('students')
                .select('*')
                .eq('id', studentId)
                .single();
            
            if (student.error) throw student.error;
            
            const secureToken = generateSecureToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            
            const { data: newToken, error } = await supabase
                .from('invitation_tokens')
                .insert({
                    token: secureToken,
                    student_id: studentId,
                    student_email: student.data.email,
                    student_name: student.data.class_name,
                    tutor_id: currentUser.id,
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            existingToken = newToken;
        }
        
        // Genera link sicuro
        return `${window.location.origin}?invite_token=${existingToken.token}`;
        
    } catch (error) {
        console.error('Errore generazione link sicuro:', error);
        throw error;
    }
}

// === MODAL INVITO SICURO ===
async function showSecureInviteModal(student, tutor) {
    try {
        const secureLink = await generateSecureInviteLink(student.id);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal" style="max-width: 600px;">
                <h2 style="color: var(--primary-green); margin-bottom: 1.5rem;">
                    🔐 Invito Sicuro per ${student.class_name || student.email}
                </h2>
                
                <div style="background: #f0f8ff; border: 2px solid #4CAF50; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #2196F3;">🛡️ Link Sicuro e Univoco</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        ✅ Solo <strong>${student.email}</strong> può usare questo link<br>
                        ✅ Scade automaticamente in 7 giorni<br>
                        ✅ Utilizzabile una sola volta
                    </p>
                </div>
                
                <div style="position: relative; margin-bottom: 20px;">
                    <input type="text" value="${secureLink}" readonly id="secureInviteLink"
                           style="width: 100%; padding: 15px; border: 2px solid #4CAF50; border-radius: 10px; font-family: monospace; font-size: 11px; background: #f8f9fa;">
                    <button onclick="copySecureInviteLink()" id="copySecureBtn"
                            style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        📋 Copia
                    </button>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">📱 Istruzioni per ${student.class_name || 'lo studente'}:</h4>
                    <ol style="margin: 0; color: #856404; font-size: 14px;">
                        <li>Clicca sul link ricevuto (SOLO per ${student.email})</li>
                        <li>Il sistema riconoscerà automaticamente i tuoi dati</li>
                        <li>Inserisci solo la password per completare la registrazione</li>
                        <li>Accedi e inizia a studiare!</li>
                    </ol>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: space-between;">
                    <button onclick="shareSecureViaEmail('${student.email}', '${encodeURIComponent(secureLink)}', '${student.class_name}', '${tutor.full_name}')"
                            style="flex: 1; padding: 12px; background: #007bff; color: white; border: none; border-radius: 25px; cursor: pointer;">
                        📧 Invia Email
                    </button>
                    <button onclick="shareSecureViaWhatsApp('${encodeURIComponent(secureLink)}', '${student.class_name}', '${tutor.full_name}')"
                            style="flex: 1; padding: 12px; background: #25d366; color: white; border: none; border-radius: 25px; cursor: pointer;">
                        📱 WhatsApp
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="flex: 1; padding: 12px; border: 2px solid #ddd; background: white; border-radius: 25px; cursor: pointer;">
                        ✅ Fatto
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        showError('Errore nella generazione del link sicuro: ' + error.message);
    }
}

// === FUNZIONI CONDIVISIONE ===
function copySecureInviteLink() {
    const input = document.getElementById('secureInviteLink');
    const btn = document.getElementById('copySecureBtn');
    
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        btn.textContent = '✅ Copiato!';
        btn.style.background = '#28a745';
        setTimeout(() => {
            btn.textContent = '📋 Copia';
            btn.style.background = '#4CAF50';
        }, 2000);
    });
}

function shareSecureViaEmail(studentEmail, secureLink, studentName, tutorName) {
    const subject = `🔐 ${tutorName} ti ha invitato su UpToTen Notes (Link Sicuro)`;
    const body = `Ciao ${studentName || 'studente'}!

${tutorName} ti ha invitato a usare UpToTen Notes.

🔐 LINK SICURO PERSONALE (solo per te):
${decodeURIComponent(secureLink)}

🛡️ IMPORTANTE:
- Questo link funziona SOLO con la tua email: ${studentEmail}
- È valido per 7 giorni
- Può essere usato una sola volta

📝 COSA FARE:
1. Clicca il link sopra
2. I tuoi dati saranno già compilati
3. Scegli una password sicura
4. Inizia a studiare!

Ci vediamo su UpToTen Notes! 🎓

---
Invito sicuro inviato tramite UpToTen Notes`;

    const mailtoLink = `mailto:${studentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
}

function shareSecureViaWhatsApp(secureLink, studentName, tutorName) {
    const message = `🎓 Ciao ${studentName || 'studente'}!

${tutorName} ti ha invitato su *UpToTen Notes*!

🔐 *LINK SICURO PERSONALE:*
${decodeURIComponent(secureLink)}

🛡️ *SICUREZZA:*
• Link valido solo per 7 giorni
• Utilizzabile una sola volta
• I tuoi dati sono già compilati

📱 *FACILISSIMO:*
1. Clicca il link
2. Scegli password
3. Inizia a studiare!

Ci vediamo online! 📚✨`;

    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
}

// === INTEGRAZIONE CON APP PRINCIPALE ===

// Funzione per inizializzare il sistema inviti
function initInviteSystem() {
    console.log('🔐 Sistema inviti sicuri inizializzato');
    
    // Crea il pulsante invito se non esiste
    setTimeout(() => {
        if (!document.getElementById('inviteBtn')) {
            createInviteButton();
        }
    }, 100);
}

// Funzione per aggiornare il pulsante dopo il caricamento studenti
function onStudentsLoaded() {
    updateInviteButton();
}

// Funzione per aggiornare il pulsante dopo la selezione studente
function onStudentSelected() {
    updateInviteButton();
}

// === GESTIONE TOKEN DA URL ===

// Funzione per processare token di invito dall'URL
async function processInviteToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite_token');
    
    if (!inviteToken) return false;
    
    try {
        console.log('🔐 Processando token di invito:', inviteToken);
        
        await waitForSupabase();
        
        // Verifica token
        const { data: tokenData, error: tokenError } = await supabase
            .from('invitation_tokens')
            .select('*')
            .eq('token', inviteToken)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .single();
        
        if (tokenError || !tokenData) {
            showError('❌ Link di invito non valido o scaduto');
            // Rimuovi token dall'URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return false;
        }
        
        console.log('✅ Token valido trovato:', tokenData);
        
        // Pre-compila form di registrazione
        const emailField = document.getElementById('signupEmail');
        const nameField = document.getElementById('signupName');
        
        if (emailField) emailField.value = tokenData.student_email;
        if (nameField && tokenData.student_name) nameField.value = tokenData.student_name;
        
        // Mostra form di registrazione
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
        
        // Mostra messaggio di benvenuto
        showInviteWelcomeMessage(tokenData);
        
        // Salva token per uso successivo
        window.currentInviteToken = tokenData;
        
        return true;
        
    } catch (error) {
        console.error('❌ Errore processamento token:', error);
        showError('Errore nel processamento dell\'invito');
        return false;
    }
}

// Mostra messaggio di benvenuto per invito
function showInviteWelcomeMessage(tokenData) {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white; padding: 20px; border-radius: 15px; margin-bottom: 20px;
        text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    
    welcomeDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">🎓 Benvenuto su UpToTen Notes!</h3>
        <p style="margin: 0; opacity: 0.9;">
            Sei stato invitato${tokenData.student_name ? ` come <strong>${tokenData.student_name}</strong>` : ''}<br>
            Completa la registrazione per iniziare a studiare
        </p>
    `;
    
    const signupForm = document.getElementById('signupForm');
    signupForm.insertBefore(welcomeDiv, signupForm.firstChild);
}

// Funzione per marcare token come usato dopo registrazione riuscita
async function markTokenAsUsed(tokenData) {
    try {
        await supabase
            .from('invitation_tokens')
            .update({ 
                used_at: new Date().toISOString(),
                registered_user_id: currentUser.id 
            })
            .eq('id', tokenData.id);
        
        console.log('✅ Token marcato come usato');
        
        // Rimuovi token dall'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
    } catch (error) {
        console.error('❌ Errore marcatura token:', error);
    }
}

// === EXPORT FUNZIONI PER INTEGRAZIONE ===
window.inviteSystem = {
    init: initInviteSystem,
    updateButton: updateInviteButton,
    onStudentsLoaded: onStudentsLoaded,
    onStudentSelected: onStudentSelected,
    processInviteToken: processInviteToken,
    markTokenAsUsed: markTokenAsUsed
};

console.log('🔐 Sistema inviti sicuri caricato!');