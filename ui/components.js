// Static import re-established to fix object clicking and state sync
import { initWebGPU, updateCanvasFromCatalog, cameraState } from '../engine/main.js';

// ==========================================
// 🔑 SUPABASE LIVE CREDENTIALS
// ==========================================
const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja";              

const CATALOG_MAP = [
    { dbKey: "nebulae", elementId: "cat-nebulae-val" },
    { dbKey: "stars", elementId: "cat-stars-val" },
    { dbKey: "black_holes", elementId: "cat-bh-val" },
    { dbKey: "neutron_stars", elementId: "cat-degenerate-val" },
    { dbKey: "planets", elementId: "cat-planets-val" },
    { dbKey: "moons", elementId: "cat-moons-val" },
    { dbKey: "asteroids_comets", elementId: "cat-asteroids-val" },
    { dbKey: "quasars", elementId: "cat-quasars-val" },
    { dbKey: "exotic_objects", elementId: "cat-exotic-val" },
    { dbKey: "inhabited", elementId: "cat-inhabited-val" }
];

async function dbFetch(endpoint) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
    return await res.json();
}

// Helper to format raw AI output text
function formatText(str) {
    if (!str) return 'None';
    const cleanStr = str.trim();
    if (cleanStr.toLowerCase() === 'none') return 'None';
    return cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
}

// --- TAB NAVIGATION ---
export function switchTab(tabName) {
    const tabMap = {
        'explore': { view: null, btn: 'btn-explore' },
        'events': { view: 'view-events', btn: 'btn-events' },
        'origin': { view: 'view-ai', btn: 'btn-ai' },
        'timeline': { view: 'view-timeline', btn: 'btn-timeline' },
        'catalog': { view: 'view-catalog', btn: 'btn-catalog' }
    };

    Object.keys(tabMap).forEach(key => {
        const item = tabMap[key];
        const viewEl = item.view ? document.getElementById(item.view) : null;
        const btnEl = document.getElementById(item.btn);

        if (viewEl) {
            if (key === tabName) {
                viewEl.style.display = 'block';
                requestAnimationFrame(() => viewEl.classList.add('active'));
            } else {
                viewEl.classList.remove('active');
                viewEl.style.display = 'none';
            }
        }

        if (btnEl) btnEl.classList.toggle('active', key === tabName);
    });

    const inspectorPreview = document.getElementById('inspector-preview');
    if (inspectorPreview && tabName !== 'explore') {
        inspectorPreview.classList.remove('active');
        inspectorPreview.style.display = 'none';
    }

    if (tabName === 'origin') loadOriginLogs();
    else if (tabName === 'catalog') loadCatalogStats();
    else if (tabName === 'timeline') loadTimelineData();
    else if (tabName === 'events') loadEventsData();
}
window.switchTab = switchTab;

// --- DATA LOADERS ---
async function loadUniverseState() {
    try {
        const data = await dbFetch('universe_state?select=*&id=eq.1');
        if (data && data[0]) {
            const ageGyr = data[0].age_gyr || 0;
            cameraState.currentAge = ageGyr; // Syncs age directly to engine
            const hudAge = document.getElementById('hud-age');
            if (hudAge) hudAge.innerText = `${ageGyr.toFixed(3)} Gyr`;
        }
    } catch (err) {
        console.error('[STATE ERROR]', err);
    }
}

async function loadOriginLogs() {
    const container = document.getElementById('logs-container');
    if (!container) return;

    try {
        const logs = await dbFetch('origin_logs?select=*&order=created_at.desc&limit=10');
        if (!logs || logs.length === 0) return;

        container.innerHTML = logs.map(log => `
            <article style="background: #0C121E; border: 1px solid #142238; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                <div style="border: 1px solid rgba(0, 229, 255, 0.25); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(0, 229, 255, 0.02);">
                    <span style="font-family: 'Space Mono', monospace; font-size: 11px; color: #E2E8F0;">
                        ${log.sector.startsWith('VECTOR') ? log.sector : 'VECTOR: ' + log.sector}
                    </span>
                    <span style="font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 800; color: #00E5FF;">
                        ${log.mode || 'OBSERVE'}
                    </span>
                </div>
                <div style="font-family: 'Space Mono', monospace; font-size: 11px; color: #00E5FF; font-weight: 700; margin: 10px 0;">
                    LIGHT DELAY: ${log.latency_myr ? Number(log.latency_myr).toFixed(3) : '0.000'} MYR
                </div>
                <div style="font-size: 12px; margin-bottom: 10px;">
                    <div><span style="color: #00E5FF;">►</span> <strong style="color: #FFF;">Goal:</strong> <span style="color: #CBD5E1;">${formatText(log.goal)}</span></div>
                    <div><span style="color: #00E5FF;">►</span> <strong style="color: #FFF;">Action:</strong> <span style="color: #CBD5E1;">${formatText(log.action)}</span></div>
                </div>
                <div style="background: rgba(0, 229, 255, 0.03); border: 1px solid rgba(0, 229, 255, 0.12); border-radius: 6px; padding: 10px; font-size: 12px; color: #E2E8F0;">
                    <div><span style="color: #00E5FF; font-size: 8px;">■</span> <strong style="color: #00E5FF;">Reasoning:</strong> ${formatText(log.reasoning)}</div>
                    <div style="margin-top: 5px;"><span style="color: #00E5FF; font-size: 8px;">■</span> <strong style="color: #00E5FF;">Hoped Outcome:</strong> ${formatText(log.hoped_outcome)}</div>
                </div>
            </article>
        `).join('');
    } catch (err) {
        console.error('[ORIGIN ERROR]', err);
    }
}

async function loadCatalogStats() {
    try {
        const data = await dbFetch('catalog_stats?select=*&id=eq.1');
        const stats = (data && data[0]) ? data[0] : {};

        CATALOG_MAP.forEach(item => {
            const el = document.getElementById(item.elementId);
            if (el) el.innerText = (stats[item.dbKey] || 0).toLocaleString();
        });

        updateCanvasFromCatalog(stats, cameraState.currentAge || 0);
    } catch (err) {
        console.error('[CATALOG ERROR]', err);
    }
}

async function loadTimelineData() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    try {
        // Reads from EVENTS, but sorted OLD to NEW to create a chronological timeline
        const eventsList = await dbFetch('events?select=*&order=timestamp_gyr.asc');
        const currentAge = Number(cameraState.currentAge || 0);

        if (!eventsList || eventsList.length === 0) return;

        container.innerHTML = eventsList.map(item => {
            const itemAge = Number(item.timestamp_gyr || 0);
            const isActive = itemAge <= currentAge;

            return `
                <div class="timeline-node ${isActive ? 'active' : ''}">
                    <div class="node-marker ${isActive ? 'active' : ''}"></div>
                    <div class="node-title ${isActive ? 'active' : ''}">${item.title || 'Cosmic Event'}</div>
                    <div class="node-time data-font ${isActive ? 'active' : ''}">${itemAge.toFixed(4)} Gyr</div>
                    <div class="node-desc ${isActive ? 'active' : ''}">${item.description || ''}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('[TIMELINE ERROR]', err);
    }
}

async function loadEventsData() {
    const container = document.getElementById('events-container');
    if (!container) return;

    try {
        // Reads from EVENTS, sorted NEW to OLD (Recent activity feed)
        const eventsList = await dbFetch('events?select=*&order=timestamp_gyr.desc&limit=15');
        if (!eventsList || eventsList.length === 0) return;

        container.innerHTML = eventsList.map(evt => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-family: 'Space Mono', monospace; font-size: 10px; color: #00E5FF; border: 1px solid rgba(0,229,255,0.3); padding: 2px 6px; border-radius: 4px;">
                        ${evt.type || 'COSMIC EVENT'}
                    </span>
                    <span style="font-family: 'Space Mono', monospace; font-size: 10px; color: #94A3B8;">
                        ${Number(evt.timestamp_gyr || 0).toFixed(3)} Gyr
                    </span>
                </div>
                <div style="font-weight: 700; color: #F8FAFC; margin-bottom: 4px; font-size: 14px;">${evt.title || 'Event Detected'}</div>
                <div style="color: #CBD5E1; font-size: 12px; line-height: 1.4;">${evt.description || ''}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('[EVENTS ERROR]', err);
    }
}

function initApp() {
    try { initWebGPU(); } catch (e) { console.error('[CANVAS INIT ERROR]', e); }

    const navButtons = [
        { id: 'btn-explore', tab: 'explore' },
        { id: 'btn-events', tab: 'events' },
        { id: 'btn-ai', tab: 'origin' },
        { id: 'btn-timeline', tab: 'timeline' },
        { id: 'btn-catalog', tab: 'catalog' }
    ];
    navButtons.forEach(btn => {
        const el = document.getElementById(btn.id);
        if (el) el.addEventListener('click', () => switchTab(btn.tab));
    });

    loadUniverseState();
    loadCatalogStats();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

setInterval(() => {
    loadUniverseState();
    loadCatalogStats();
}, 5000);
