// --- CONFIGURATION ---
const SUPABASE_URL = "https://your-project.supabase.co"; 
const SUPABASE_ANON_KEY = "your-anon-public-key";      

// --- 10 SCIENTIFIC CATALOG CATEGORIES (MAPPED TO INDEX.HTML IDs) ---
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

// --- 1. SPLASH SCREEN DISMISSAL ---
function dismissSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 400);
    }
}

// --- 2. TAB NAVIGATION & INSPECTOR CONTROL ---
export function switchTab(tabName) {
    // Tab mapping matching index.html IDs
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
                // Trigger transition animation
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

    // Auto-collapse bottom inspector preview if navigating away from Explore
    const inspectorPreview = document.getElementById('inspector-preview');
    if (inspectorPreview) {
        if (tabName !== 'explore') {
            inspectorPreview.classList.remove('active');
            inspectorPreview.style.display = 'none';
        }
    }

    // Trigger tab data loads
    if (tabName === 'origin') {
        loadOriginLogs();
    } else if (tabName === 'catalog') {
        loadCatalogStats();
    }
}

// --- 3. FETCH & RENDER ORIGIN TELEMETRY CARDS ---
async function loadOriginLogs() {
    // HTML ID is logs-container
    const container = document.getElementById('logs-container');
    if (!container) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/origin_logs?select=*&order=created_at.desc&limit=10`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const logs = await response.json();

        if (!logs || logs.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#64748B; padding:20px; font-family:monospace;">NO TELEMETRY LOGS RECORDED YET</div>`;
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
                    LIGHT DELAY: ${log.latency_myr ? log.latency_myr.toFixed(3) : '0.000'} MYR
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

// --- 4. FETCH & RENDER CATALOG STATS ---
async function loadCatalogStats() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&id=eq.1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const data = await response.json();
        const stats = (data && data[0]) ? data[0] : {};

        // Update each static card in index.html
        CATALOG_MAP.forEach(item => {
            const el = document.getElementById(item.elementId);
            if (el) {
                el.innerText = stats[item.dbKey] || 0;
            }
        });

    } catch (err) {
        console.error('[CATALOG LOAD ERROR]', err);
    }
}

// --- 5. INITIALIZATION & EVENT BINDING ---
document.addEventListener('DOMContentLoaded', () => {
    // Bind Splash Screen click/tap
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.addEventListener('click', dismissSplash);
        splash.addEventListener('pointerdown', dismissSplash);
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
        if (el) {
            el.addEventListener('click', () => switchTab(btn.tab));
        }
    });
});

// Auto-poll Origin logs every 10 seconds
setInterval(loadOriginLogs, 10000);
