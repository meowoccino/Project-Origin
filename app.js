// =============================================================
// SUPABASE CREDENTIALS (UPDATED)
// =============================================================
const SUPABASE_URL = 'https://nnntebgkhgzfztwfdphw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja';

// Initialize Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const ageEl = document.getElementById('age');
const hubbleEl = document.getElementById('hubble');
const logsEl = document.getElementById('journal-logs');

// 1. Fetch initial universe state & recent logs on page load
async function initUniverse() {
    try {
        // Fetch current cosmic state
        const { data: state, error: stateError } = await supabaseClient
            .from('cosmic_state')
            .select('*')
            .eq('id', 1)
            .single();

        if (state) {
            ageEl.textContent = Number(state.cosmic_age_myr).toFixed(1);
            hubbleEl.textContent = Number(state.expansion_rate).toFixed(1);
        } else if (stateError) {
            console.error('Error fetching cosmic state:', stateError);
        }

        // Fetch past AI journal logs
        const { data: logs, error: logsError } = await supabaseClient
            .from('ai_journal')
            .select('*')
            .order('id', { ascending: false })
            .limit(10);

        if (logs) {
            logsEl.innerHTML = '';
            logs.forEach(log => addLogToFeed(log.thought_log, log.cosmic_age_myr));
        } else if (logsError) {
            console.error('Error fetching AI journal:', logsError);
        }
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

// 2. Realtime listener for live updates from Godot & AI
supabaseClient
    .channel('cosmic-realtime')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cosmic_state' }, payload => {
        if (payload.new) {
            ageEl.textContent = Number(payload.new.cosmic_age_myr).toFixed(1);
            hubbleEl.textContent = Number(payload.new.expansion_rate).toFixed(1);
        }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_journal' }, payload => {
        if (payload.new) {
            addLogToFeed(payload.new.thought_log, payload.new.cosmic_age_myr);
        }
    })
    .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            const systemLog = document.querySelector('.log-entry.system');
            if (systemLog) systemLog.textContent = 'Connected to live cosmic stream.';
        }
    });

// Helper: Append new log entry to feed
function addLogToFeed(text, age) {
    const entry = document.createElement('p');
    entry.className = 'log-entry ai';
    entry.textContent = `[t+${Number(age).toFixed(1)} Myr] ${text}`;
    logsEl.prepend(entry);
}

// Start app
initUniverse();

