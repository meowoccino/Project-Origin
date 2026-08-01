import { initWebGPU, cameraState, updateCanvasFromCatalog, selectedNode, clearSelection } from '../engine/main.js';
import * as MainEngine from '../engine/main.js';

function initApp() {
    initWebGPU().catch(err => console.log(err));

    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzU0NTYsImV4cCI6MjEwMDE1MTQ1Nn0.vq5vMGPl2poA37JLT34nKAiC4MzaQzlHdEJ600X-3O8";
    const FETCH_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

    const canvasContainer = document.getElementById('canvas-container');
    let localCurrentAge = 0.0;

    if (canvasContainer) {
        canvasContainer.addEventListener('touchend', (e) => {
            if (window.selectParticleAt && MainEngine.isExploreActive && e.changedTouches.length === 1) {
                window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                if (selectedNode) {
                    const subEl = document.getElementById('obj-sub');
                    if (subEl) subEl.innerText = selectedNode.category.toUpperCase().replace('_', ' ');
                }
            }
        }, { passive: true });
    }

    const allBtns = ['btn-explore', 'btn-events', 'btn-ai', 'btn-timeline', 'btn-catalog'].map(id => document.getElementById(id));
    const allViews = ['view-events', 'view-ai', 'view-timeline', 'view-catalog', 'modal-object-detail'].map(id => document.getElementById(id));
    const hudContainer = document.getElementById('hud-age-container');

    function switchTab(btnId, viewId) {
        allBtns.forEach(b => b?.classList.remove('active'));
        allViews.forEach(v => { if (v) { v.classList.remove('active'); v.style.display = 'none'; }});
        if (btnId) document.getElementById(btnId)?.classList.add('active');
        if (viewId) {
            const view = document.getElementById(viewId);
            if (view) { view.style.display = 'block'; requestAnimationFrame(() => view.classList.add('active')); }
        }
        MainEngine.isExploreActive = (btnId === 'btn-explore');
        if (canvasContainer) {
            canvasContainer.style.pointerEvents = MainEngine.isExploreActive ? 'auto' : 'none';
            if (hudContainer) hudContainer.style.opacity = MainEngine.isExploreActive ? '1' : '0';
            if (!MainEngine.isExploreActive) clearSelection(); 
        }
    }

    document.getElementById('btn-explore')?.addEventListener('click', () => switchTab('btn-explore', null));
    document.getElementById('btn-events')?.addEventListener('click', () => switchTab('btn-events', 'view-events'));
    document.getElementById('btn-ai')?.addEventListener('click', () => switchTab('btn-ai', 'view-ai'));
    document.getElementById('btn-timeline')?.addEventListener('click', () => switchTab('btn-timeline', 'view-timeline'));
    document.getElementById('btn-catalog')?.addEventListener('click', () => switchTab('btn-catalog', 'view-catalog'));

    function renderDesign4EventCard(e) {
        const title = e.title || 'Event';
        const desc = e.description || 'Data missing.';
        const secMatch = desc.match(/SEC \[[-\d\s,]+\]/);
        const sectorStr = secMatch ? secMatch[0] : "UNKNOWN SEC";

        let hex = "#00E5FF", tag = "COSMIC EVENT";
        let iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
        
        const cat = (e.category || "").toLowerCase();
        if (cat.includes("star")) { hex = "#FFD700"; tag = "STELLAR CORE"; iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`; } 
        else if (cat.includes("black_hole") || cat.includes("quasar")) { hex = "#B026FF"; tag = "SINGULARITY"; iconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/></svg>`; } 
        else if (cat.includes("planet")) { hex = "#4CAF50"; tag = "PLANETARY BODY"; }

        return `
            <div class="d4-card" style="--c-hex: ${hex}; margin-bottom: 12px; background:rgba(20,22,35,0.8); border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:8px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; color:${hex};">
                    ${iconSvg} <span style="font-size:10px; font-weight:700; letter-spacing:1px;">${tag}</span>
                </div>
                <div style="color:#fff; font-weight:600; font-size:14px; margin-bottom:4px;">${title}</div>
                <div style="color:#8892b0; font-size:12px; line-height:1.4; margin-bottom:12px;">${desc}</div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#555;">
                    <div>AGE: <span style="color:#d0d2e0;">${Number(e.age || 0).toFixed(3)} Gyr</span></div>
                    <div>SECTOR: <span style="color:#d0d2e0;">${sectorStr}</span></div>
                </div>
            </div>
        `;
    }

    document.getElementById('btn-expand-inspect')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!selectedNode) return;
        switchTab(null, 'modal-object-detail');
        
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/celestial_objects?category=eq.${selectedNode.category}&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    const dbObj = data[0];
                    document.getElementById('inspect-title').innerText = dbObj.designation || selectedNode.category;
                    document.getElementById('det-class').innerText = dbObj.object_type || "Celestial Body";
                    document.getElementById('det-mass').innerText = dbObj.mass_solar ? `${dbObj.mass_solar} M_sun` : "N/A";
                    document.getElementById('det-temp').innerText = dbObj.hydrogen_pct !== undefined ? `${dbObj.hydrogen_pct}%` : "Stable";
                    document.getElementById('det-status').innerText = dbObj.is_dead ? "Dead Remnant" : "Active";
                    document.getElementById('det-coords').innerText = `[${dbObj.x_coord || 0}, ${dbObj.y_coord || 0}, ${dbObj.z_coord || 0}]`;
                }
            }
        } catch (err) {}
    });

    document.getElementById('btn-close-inspect')?.addEventListener('click', () => switchTab('btn-explore', null));

    async function pollAll() { 
        try {
            const [stateRes, catalogRes, eventsRes] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&limit=1`, { headers: FETCH_HEADERS }),
                fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1`, { headers: FETCH_HEADERS }),
                fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=15`, { headers: FETCH_HEADERS })
            ]);

            if (stateRes.ok) {
                const stateData = await stateRes.json();
                if (stateData.length > 0) {
                    localCurrentAge = Number(stateData[0].age || 0.0);
                    const hudAge = document.getElementById('hud-age');
                    if (hudAge) hudAge.innerText = localCurrentAge >= 1.0 ? `${localCurrentAge.toFixed(3)} Billion Years` : `${Math.floor(localCurrentAge * 1000000000).toLocaleString()} Years`;
                    const hudEpoch = document.getElementById('hud-epoch');
                    if (hudEpoch) hudEpoch.innerText = stateData[0].epoch || "Epoch...";
                }
            }

            if (catalogRes.ok) {
                const catalogData = await catalogRes.json();
                if (catalogData.length > 0 && typeof updateCanvasFromCatalog === 'function') {
                    updateCanvasFromCatalog(catalogData[0]);
                    ['nebulae', 'stars', 'giants_supergiants', 'white_dwarfs', 'neutron_stars', 'black_holes', 'quasars', 'planets', 'active_biospheres', 'dark_matter_structures'].forEach(key => {
                        const el = document.getElementById(`cat-${key}-val`);
                        if (el) el.innerText = (catalogData[0][key] || 0).toLocaleString();
                    });
                }
            }

            if (eventsRes.ok) {
                const events = await eventsRes.json();
                const container = document.getElementById('events-container');
                if (container && events.length > 0) container.innerHTML = events.map(e => renderDesign4EventCard(e)).join('');
            }
        } catch(e) {}
    }
    
    pollAll(); 
    setInterval(pollAll, 3000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); 
else initApp();
