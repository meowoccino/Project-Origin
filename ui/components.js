import { initWebGPU, updateCanvasFromCatalog, cameraState } from '../main.js';

// ==========================================
// 🔑 SUPABASE LIVE CREDENTIALS
// ==========================================
const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja";              

// Catalog mapping to index.html card IDs
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

// Helper for Supabase REST API
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

// --- TAB NAVIGATION & INSPECTOR AUTO-COLLAPSE ---
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

        if (btnEl) {
            btnEl.classList.toggle('active', key === tabName);
        }
    });

    // Auto-collapse bottom inspector preview when leaving Explore
    const inspectorPreview = document.getElementById('inspector-preview');
    if (inspectorPreview) {
        if (tabName !== 'explore') {
            inspectorPreview.classList.remove('active');
            inspectorPreview.style.display = 'none';
        }
    }

    // Load data for active tab
    if (tabName === 'origin') loadOriginLogs();
    else if (tabName === 'catalog') loadCatalogStats();
    else if (tabName === 'timeline') loadTimelineData();
    else if (tabName === 'events') loadEventsData();
}
window.switchTab = switchTab;

// --- FETCH & RENDER UNIVERSE AGE (HUD) ---
async function loadUniverseState() {
    try {
        const data = await dbFetch('universe_state?select=*&id=eq.1');
        if (data && data[0]) {
            const ageGyr = data[0].age_gyr || 0;
            cameraState.currentAge = ageGyr;
            const hudAge = document.getElementById('hud-age');
            if (hudAge) {
                hudAge.innerText = `${ageGyr.toFixed(3)} Gyr`;
            }
        }
    } catch (err) {
        console.error('[STATE LOAD ERROR]', err);
    }
}

// --- FETCH & RENDER ORIGIN TELEMETRY CARDS ---
async function loadOriginLogs() {
    const container = document.getElementById('logs-container');
    if (!container) return;

    try {
        const logs = await dbFetch('origin_logs?select=*&order=created_at.desc&limit=10');

        if (!logs || logs.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#64748B; padding:20px; font-family:'Space Mono', monospace; font-size:11px;">[ NO TELEMETRY LOGS RECORDED ]</div>`;
            return;
        }

        container.innerHTML = logs.map(log => `
            <article class="origin-card" style="
                background: #0C121E;
                border: 1px solid #142238;
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            ">
                <div style="
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    border-radius: 6px;
                    padding: 8px 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 229, 255, 0.02);
                ">
                    <span style="font-family: 'Space Mono', monospace; font-size: 11px; color: #E2E8F0;">
                        ${log.sector || 'VECTOR: [0.0, 0.0, 0.0] ly'}
                    </span>
                    <span style="font-family: 'Space Mono', monospace; font-size: 10px; font-weight: 800; color: ${log.mode === 'INTERVENTION MENU' ? '#FFB300' : '#00E5FF'};">
                        ${log.mode || 'OBSERVE ONLY'}
                    </span>
                </div>

                <div style="font-family: 'Space Mono', monospace; font-size: 11px; color: #00E5FF; font-weight: 700;">
                    LIGHT DELAY: ${log.latency_myr ? Number(log.latency_myr).toFixed(3) : '0.000'} MYR
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                    <div style="display: flex; gap: 8px;">
                        <span style="color: #00E5FF;">►</span>
                        <div><strong style="color: #FFF;">Goal:</strong> <span style="color: #CBD5E1;">${log.goal || 'none'}</span></div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="color: #00E5FF;">►</span>
                        <div><strong style="color: #FFF;">Action:</strong> <span style="color: #CBD5E1;">${log.action || 'No intervention'}</span></div>
                    </div>
                </div>

                <div style="
                    background: rgba(0, 229, 255, 0.03);
                    border: 1px solid rgba(0, 229, 255, 0.12);
                    border-radius: 6px;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #E2E8F0;
                ">
                    <div style="display: flex; gap: 8px;">
                        <span style="color: #00E5FF; font-size: 8px; margin-top: 3px;">■</span>
                        <div><strong style="color: #00E5FF;">Reasoning:</strong> ${log.reasoning || 'Grounded observation pass.'}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span style="color: #00E5FF; font-size: 8px; margin-top: 3px;">■</span>
                        <div><strong style="color: #00E5FF;">Hoped Outcome:</strong> ${log.hoped_outcome || 'none'}</div>
                    </div>
                </div>
            </article>
        `).join('');

    } catch (err) {
        console.error('[ORIGIN LOAD ERROR]', err);
    }
}

// --- FETCH & RENDER CATALOG STATS ---
async function loadCatalogStats() {
    try {
        const data = await dbFetch('catalog_stats?select=*&id=eq.1');
        const stats = (data && data[0]) ? data[0] : {};

        // Update static cards in index.html
        CATALOG_MAP.forEach(item => {
            const el = document.getElementById(item.elementId);
            if (el) el.innerText = (stats[item.dbKey] || 0).toLocaleString();
        });

        // Update particle canvas nodes
        updateCanvasFromCatalog(stats, cameraState.currentAge || 0);

    } catch (err) {
        console.error('[CATALOG LOAD ERROR]', err);
    }
}

// --- FETCH & RENDER TIMELINE TAB (SUPABASE "timeline" TABLE) ---
async function loadTimelineData() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    try {
        const timelineEntries = await dbFetch('timeline?select=*&order=timestamp_gyr.asc');
        const currentAge = Number(cameraState.currentAge || 0);

        if (!timelineEntries || timelineEntries.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #64748B; padding: 40px 20px; font-family: 'Space Mono', monospace; font-size: 11px;">
                    [ TIMELINE EMPTY — AWAITING DATABASE ROWS ]
                </div>
            `;
            return;
        }

        container.innerHTML = timelineEntries.map(item => {
            const itemAge = Number(item.timestamp_gyr || 0);
            const isActive = itemAge <= currentAge;

            return `
                <div class="timeline-node ${isActive ? 'active' : ''}">
                    <div class="node-marker ${isActive ? 'active' : ''}"></div>
                    <div class="node-title ${isActive ? 'active' : ''}">${item.title || 'Cosmic Epoch'}</div>
                    <div class="node-time data-font ${isActive ? 'active' : ''}">${itemAge.toFixed(4)} Gyr</div>
                    <div class="node-desc ${isActive ? 'active' : ''}">${item.description || ''}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('[TIMELINE LOAD ERROR]', err);
    }
}

// --- FETCH & RENDER EVENTS TAB (SUPABASE "events" TABLE) ---
async function loadEventsData() {
    const container = document.getElementById('events-container');
    if (!container) return;

    try {
        const eventsList = await dbFetch('events?select=*&order=created_at.desc&limit=15');

        if (!eventsList || eventsList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #64748B; padding: 40px 20px; font-family: 'Space Mono', monospace; font-size: 11px;">
                    [ NO RECENT EVENTS RECORDED ]
                </div>
            `;
            return;
        }

        container.innerHTML = eventsList.map(evt => `
            <div class="d4-card" style="--c-rgb: 0, 229, 255; --c-hex: #00E5FF; margin-bottom: 12px;">
                <div class="d4-header">
                    <span class="d4-tag data-font">${evt.type || 'COSMIC EVENT'}</span>
                    <span style="font-size: 10px; color: var(--text-muted);">${Number(evt.timestamp_gyr || 0).toFixed(3)} Gyr</span>
                </div>
                <div class="d4-title">${evt.title || 'Phenomenon Detected'}</div>
                <div class="d4-desc">${evt.description || ''}</div>
            </div>
        `).join('');

    } catch (err) {
        console.error('[EVENTS LOAD ERROR]', err);
    }
}

// --- SAFE APP INITIALIZATION ---
function initApp() {
    // Start WebGPU 2D Canvas Engine
    try {
        initWebGPU();
    } catch (e) {
        console.error('[CANVAS INIT ERROR]', e);
    }

    // Bind Navigation Buttons
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

    // Initial load
    loadUniverseState();
    loadCatalogStats();
}

// GUARANTEED BOOTSTRAP (Runs immediately if DOM is ready, or waits for DOMContentLoaded)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Periodic background polling (every 5 seconds)
setInterval(() => {
    loadUniverseState();
    loadCatalogStats();
}, 5000);
