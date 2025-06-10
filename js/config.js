// Configurazione Supabase
const SUPABASE_URL = 'https://hgbhkfcddkvgidtpejoe.supabase.co';  // ← Sostituisci con il tuo nuovo URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnYmhrZmNkZGt2Z2lkdHBlam9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NDE1MTAsImV4cCI6MjA2NTExNzUxMH0.uiLHGf6rWNTChzGoMAzLNkO8B3ROT6hx1w5wl5TO584';  // ← Sostituisci con la tua nuova anon key

// Variabili globali
let supabase = null;
let currentUser = null;
let currentProfile = null;
let currentStudent = null;
let currentSubjectId = null;
let isStudent = false;