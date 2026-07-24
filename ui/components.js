// --- CONFIGURATION ---
const SUPABASE_URL = "https://your-project.supabase.co"; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = "your-anon-public-key";      // Replace with your anon public key

// --- 10 SCIENTIFIC CATALOG CATEGORIES ---
const CATALOG_CATEGORIES = [
    { id: "nebulae", label: "Nebulae & Clouds", color: "#00E5FF" },
    { id: "active_stars", label: "Active Stars", color: "#FFD700" },
    { id: "black_holes", label: "Black Holes", color: "#B026FF" },
    { id: "neutron_stars", label: "Neutron Stars / Pulsars", color: "#FF3366" },
    { id: "planets", label: "Planets", color: "#00E676" },
    { id: "moons", label: "Moons", color: "#94A3B8" },
    { id: "asteroids", label: "Asteroids & Comets", color: "#CBD5E1" },
    { id: "quasars", label: "Quasars", color: "#FF8C00" },
    { id: "exotic", label: "Exotic Objects", color: "#E040FB" },
    { id: "inhabited", label: "Inhabited Worlds", color: "#00B0FF" }
];

// --- NAVIGATION & INSPECTOR AUTO-COLLAPSE ---
function switchTab(tabName) {
    const tabs = ['explore', 'events', 'origin', 'timeline', 'catalog'];
    
    tabs.forEach(t => {
        const view = document.getElementById(`view-${t}`);
        const btn = document.getElementById(`nav-${t}`);
        if (view) view.style.display = (t === tabName) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tabName);
    });

    // Auto-collapse bottom inspector bar if navigating away from Explore
    const inspectorBar = document.getElementById('inspector-bar');
    if (inspectorBar) {
        inspectorBar.style.display = (tabName === 'explore') ? 'flex' : 'none';
    }

    // Trigger tab data loads
    if (tabName === 'origin') {
        loadOriginLogs();
    } else if (tabName === 'catalog') {
        loadCatalogStats();
    }
}

// --- FETCH & RENDER ORIGIN TELEMETRY CARDS ---
async function loadOriginLogs() {
    const container = document.getElementById('origin-feed-container');
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
                <!-- TOP VECTOR BOX -->
                <div style="
                    border: 1px solid rgba(0, 229, 255, 0.25);
                    border-radius: 6px;
                    padding: 8px 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(0, 229, 255, 0.02);
                ">
                    <span style="font-family: 'Courier New', monospace; font-size: 11px; color: #E2E8F0;">
                        ${log.sector || 'VECTOR: [0.0, 0.0, 0.0] ly'}
                    </span>
                    <span style="font-family: 'Courier New', monospace; font-size: 10px; font-weight: 800; color: ${log.mode === 'INTERVENTION MENU' ? '#FFB300' : '#00E5FF'};">
                        ${log.mode || 'OBSERVE ONLY'}
                    </span>
                </div>

                <!-- CALCULATED LIGHT DELAY -->
                <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #00E5FF; font-weight: 700;">
                    LIGHT DELAY: ${log.latency_myr ? log.latency_myr.toFixed(3) : '0.000'} MYR
                </div>

                <!-- BULLETS (GOAL & ACTION) -->
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

                <!-- INNER REASONING & HOPED OUTCOME BOX -->
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

// --- FETCH & RENDER 10 CATALOG CATEGORIES ---
async function loadCatalogStats() {
    const container = document.getElementById('catalog-grid-container');
    if (!container) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&id=eq.1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const data = await response.json();
        const stats = (data && data[0]) ? data[0] : {};

        container.innerHTML = CATALOG_CATEGORIES.map(cat => `
            <div style="
                background: #0C121E;
                border: 1px solid #142238;
                border-left: 3px solid ${cat.color};
                border-radius: 8px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                gap: 6px;
            ">
                <div style="font-size: 10px; font-weight: 800; color: ${cat.color}; text-transform: uppercase; font-family: monospace;">
                    ${cat.label}
                </div>
                <div style="font-size: 20px; font-weight: 800; color: #FFF; font-family: monospace;">
                    ${stats[cat.id] || 0}
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('[CATALOG LOAD ERROR]', err);
    }
}

// Auto-poll Origin logs every 10 seconds
setInterval(loadOriginLogs, 10000);
