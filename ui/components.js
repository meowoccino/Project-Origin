import { initWebGPU, cameraState, updateCanvasFromCatalog, selectedNode, clearSelection } from '../engine/main.js';
import * as MainEngine from '../engine/main.js';

function initApp() {
    initWebGPU().catch(err => console.error("❌ [ENGINE INIT FAILED]:", err));

    const splash = document.getElementById('splash-screen');
    if (splash) {
        const hideSplash = (e) => {
            if (e) e.preventDefault();
            splash.classList.add('hidden');
        };
        splash.addEventListener('pointerdown', hideSplash);
        splash.addEventListener('touchstart', hideSplash);
        splash.addEventListener('click', hideSplash);
    }

    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0";
    const FETCH_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

    const canvasContainer = document.getElementById('canvas-container');
    let isDragging = false, lastX = 0, lastY = 0, initialPinchDist = null, initialZoom = 1.0, touchStart = 0;
    let localCurrentAge = 0.0;

    if (canvasContainer) {
        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
                touchStart = Date.now();
            } else if (e.touches.length === 2) {
                isDragging = false; 
                initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                initialZoom = cameraState.zoom;
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                const dpr = window.devicePixelRatio || 1;
                cameraState.panX += (e.touches[0].clientX - lastX) * dpr;
                cameraState.panY += (e.touches[0].clientY - lastY) * dpr;
                lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2 && initialPinchDist) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const minZoom = 0.35; 
                const maxZoom = 12.0; 
                cameraState.zoom = Math.max(minZoom, Math.min(maxZoom, initialZoom * (dist / initialPinchDist)));
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1 && (Date.now() - touchStart < 250)) {
                if (window.selectParticleAt && MainEngine.isExploreActive) {
                    window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                }
            }
            if (e.touches.length < 2) initialPinchDist = null;
            if (e.touches.length === 0) isDragging = false;
        }, { passive: true });
    }

    // 🔭 BACKLOG FIX: Global Tab Switcher (hooks correctly into your backup HTML)
    window.switchTab = function(tabName) {
        // Reset all buttons and views
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Activate specific tab (targeting your specific HTML IDs: tab-explore, tab-events, etc.)
        const targetTab = document.getElementById(`tab-${tabName}`);
        if (targetTab) targetTab.classList.add('active');

        // Highlight matching button
        const navMap = { 'explore': 0, 'events': 1, 'origin': 2, 'timeline': 3, 'catalog': 4 };
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[navMap[tabName]]) navItems[navMap[tabName]].classList.add('active');

        // Manage Explore State
        const hudContainer = document.querySelector('.universe-age-pill');
        if (hudContainer) hudContainer.style.opacity = (tabName === 'explore') ? '1' : '0';
        MainEngine.isExploreActive = (tabName === 'explore');

        // 🔭 BACKLOG FIX: Unselect active object when switching tabs
        if (tabName !== 'explore') {
            MainEngine.clearSelection();
        }
    };

    function formatAgeFormatted(ageGyr) {
        if (!ageGyr || ageGyr < 0.001) return "< 0.001 Gyr";
        return `${Number(ageGyr).toFixed(3)} Gyr`;
    }

    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    localCurrentAge = Number(data[0].age || 0.0);
                    const totalYears = Math.floor(localCurrentAge * 1000000000);
                    const hudAge = document.getElementById('universe-age-val');
                    if (hudAge) {
                        hudAge.innerText = totalYears >= 1000000000 
                            ? `${(totalYears / 1000000000).toFixed(3)} Billion Years` 
                            : `${totalYears.toLocaleString()} Years`;
                    }
                }
            }
        } catch (err) {}
    }

    async function pollCatalog() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    const stats = data[0];
                    updateCanvasFromCatalog(stats, localCurrentAge);
                }
            }
        } catch (err) {}
    }

    // 🎨 BACKLOG FIX: Dynamic Parser to render REAL stats + Fixed Colors for Neutron/Nebulae
    function renderDesign4EventCard(e) {
        const title = e.title || 'Cosmic Telemetry Event';
        const desc = e.description || 'Thermodynamic equilibrium shift detected in local space-time region.';
        const ageFormatted = formatAgeFormatted(e.age);
        
        let hex = "#FF8C00", rgb = "255, 140, 0", tag = "COSMIC EVENT";
        let iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
        
        const lowerTitle = title.toLowerCase();

        // Color and Icon Assignments
        if (lowerTitle.includes("nebula") || lowerTitle.includes("cloud") || lowerTitle.includes("gas")) {
            hex = "#00E5FF"; rgb = "0, 229, 255"; tag = "NEBULA CLOUD";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`;
        } else if (lowerTitle.includes("star") || lowerTitle.includes("protostar") || lowerTitle.includes("dwarf") || lowerTitle.includes("giant")) {
            hex = "#FFD700"; rgb = "255, 215, 0"; tag = "CLASS-O STAR";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>`;
        } else if (lowerTitle.includes("black hole") || lowerTitle.includes("singularity")) {
            hex = "#B026FF"; rgb = "176, 38, 255"; tag = "SINGULARITY";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
        } else if (lowerTitle.includes("pulsar") || lowerTitle.includes("neutron")) {
            // UNIQUE PURPLE NEUTRON COLOR SO IT DOESN'T BLEND WITH NEBULAE
            hex = "#FF3366"; rgb = "255, 51, 102"; tag = "NEUTRON CORE";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`;
        } else if (lowerTitle.includes("planet") || lowerTitle.includes("world")) {
            hex = "#10B981"; rgb = "16, 185, 129"; tag = "PLANETARY BODY";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>`;
        }

        // Dynamic Parsing
        let m1 = { lbl: "EPOCH", val: ageFormatted };
        let m2 = { lbl: "STATUS", val: "STABLE" };
        let m3 = { lbl: "SECTOR", val: "SEC 04" };

        const specsMatch = desc.match(/Specs:\s*(.*)/i);
        if (specsMatch && specsMatch[1]) {
            const rawSpecs = specsMatch[1].split(",");
            const parsed = [];
            rawSpecs.forEach(part => {
                const kv = part.split(":");
                if (kv.length === 2) {
                    parsed.push({ lbl: kv[0].trim().toUpperCase(), val: kv[1].trim() });
                }
            });
            if (parsed.length >= 1) m1 = parsed[0];
            if (parsed.length >= 2) m2 = parsed[1];
            if (parsed.length >= 3) m3 = parsed[2];
        }

        return `
            <div class="d4-card" style="--c-hex: ${hex}; --c-rgb: ${rgb};">
                <div class="d4-header">
                    <div class="d4-icon-box">${iconSvg}</div>
                    <span class="d4-tag mono">${tag}</span>
                </div>
                <div class="d4-title">${title}</div>
                <div class="d4-desc">${desc}</div>
                <div class="d4-metrics-grid mono">
                    <div class="m-item"><span class="m-lbl">${m1.lbl}</span><span class="m-val">${m1.val}</span></div>
                    <div class="m-item"><span class="m-lbl">${m2.lbl}</span><span class="m-val">${m2.val}</span></div>
                    <div class="m-item"><span class="m-lbl">${m3.lbl}</span><span class="m-val">${m3.val}</span></div>
                </div>
            </div>
        `;
    }

    async function pollEvents() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=15`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const events = await res.json();
                const container = document.getElementById('tab-events'); // TARGETING YOUR BACKUP HTML ID
                if (container && events.length > 0) {
                    container.innerHTML = `<div class="catalog-container">` + events.map(e => renderDesign4EventCard(e)).join('') + `</div>`;
                }
            }
        } catch (err) {}
    }

    function pollAll() { pollUniverseState(); pollCatalog(); pollEvents(); }
    pollAll(); 
    setInterval(pollAll, 2500);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
