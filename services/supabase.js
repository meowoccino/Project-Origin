// Import Supabase JS Client from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Active Supabase credentials
const SUPABASE_URL = 'https://nnntebgkhgzfztwfdphw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch initial universe state
export async function fetchCosmicState() {
    const { data, error } = await supabase
        .from('cosmic_state')
        .select('*')
        .eq('id', 1)
        .single();
    
    if (error) console.error('Error fetching state:', error);
    return data;
}

// Fetch AI thought journal (Legacy)
export async function fetchAIJournal(limit = 10) {
    const { data, error } = await supabase
        .from('ai_journal')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
        
    if (error) console.error('Error fetching AI journal:', error);
    return data;
}

// Fetch Origin Logs in 4-Card Batches
export async function fetchOriginLogsBatch(limit = 4, oldestId = null) {
    let query = supabase
        .from('origin_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(limit);

    if (oldestId) {
        query = query.lt('id', oldestId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching origin_logs:', error);
        return [];
    }
    return data || [];
}

// Subscribe to real-time updates from cloud server
export function subscribeToCosmicUpdates(onStateUpdate, onNewThought) {
    supabase
        .channel('public:cosmic_state')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cosmic_state' }, payload => {
            onStateUpdate(payload.new);
        })
        .subscribe();

    supabase
        .channel('public:ai_journal')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_journal' }, payload => {
            onNewThought(payload.new);
        })
        .subscribe();
}
