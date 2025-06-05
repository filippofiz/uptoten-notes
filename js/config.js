// Configurazione Supabase
const SUPABASE_URL = 'https://cuuqdfrjqprdpvkyrvws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dXFkZnJqcXByZHB2a3lydndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NDk0ODAsImV4cCI6MjA2NDQyNTQ4MH0.72ZHZFBcU4h76bvFJRqYijcS_GeZCsbtQWnWutIgd8A';

// Variabili globali
let supabase = null;
let currentUser = null;
let currentProfile = null;
let currentStudent = null;
let currentSubjectId = null;
let isStudent = false;