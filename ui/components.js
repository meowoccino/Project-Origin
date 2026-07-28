import { initWebGPU, cameraState, updateCanvasFromCatalog, selectedNode, clearSelection } from '../engine/main.js';
import * as MainEngine from '../engine/main.js';

function initApp() {
    initWebGPU().catch(err => console.error("❌ [ENGINE INIT FAILED]:", err));

    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubnRlYmdraGd6Znp0d2ZkcGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU3NTQ1NiwiZXhwIjoyMTAwMTUxNDU2fQ.YxpoNTujXCrJQcxZ9Bj8f_bFC6j_Fq6GLt74H8mEAq0";
    const FETCH_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

    const canvasContainer = document.getElementById('canvas-container');
    let localCurrentAge = 0.0;
    let isLoadingLogs = false;
    let oldestLoadedId = null;

    // UI BLEED FIX: Disconnect touch interaction instantly if menu is open
    if (canvasContainer) {
        canvasContainer.addEventListener('touchend', (e) => {
            if (window.selectParticleAt && MainEngine.isExploreActive && e.changedTouches.length === 1) {
                window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                
                setTimeout(() => {
                    const subEl = document.getElementById('obj-sub');
                    if (subEl && selectedNode) {
                        subEl.innerText = (selectedNode.category || "Celestial Body").toUpperCase();
                        subEl.style.color = "#FF8C00";
                    }
                }, 50);
            }
        }, { passive: true });
    }

    const allBtns = ['btn-explore', 'btn-events', 'btn-ai', 'btn-timeline', 'btn-catalog'].map(id => document.getElementById(id));
    const allViews = ['view-events', 'view-ai', 'view-timeline', 'view-catalog', 'modal-object-detail'].map(id => document.getElementById(id));
    const hudContainer = document.getElementById('hud-age-container');
    const inspectorPreview = document.getElementById('inspector-preview');

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
            if (MainEngine.isExploreActive) {
                canvasContainer.style.pointerEvents = 'auto';
                if (hudContainer) hudContainer.style.opacity = '1';
            } else {
                canvasContainer.style.pointerEvents = 'none'; // Lock background interaction
                if (hudContainer) hudContainer.style.opacity = '0';
                if (inspectorPreview) inspectorPreview.style.display = 'none'; // Erase floating UI
                clearSelection(); // Force 3D engine to drop target
            }
        }
    }

    document.getElementById('btn-explore')?.addEventListener('click', () => switchTab('btn-explore', null));
    document.getElementById('btn-events')?.addEventListener('click', () => switchTab('btn-events', 'view-events'));
    document.getElementById('btn-ai')?.addEventListener('click', () => switchTab('btn-ai', 'view-ai'));
    document.getElementById('btn-timeline')?.addEventListener('click', () => switchTab('btn-timeline', 'view-timeline'));
    document.getElementById('btn-catalog')?.addEventListener('click', () => switchTab('btn-catalog', 'view-catalog'));

    // TIMELINE EPOCH SCALING FIX
    const TIMELINE_EPOCHS = [
        { title: "Primordial Inflation", end: 0.001, desc: "Exponential space-time expansion driven by quantum vacuum inflaton field decay." },
        { title: "Recombination & Decoupling", end: 0.01, desc: "Thermal baryonic gas cools below 3,000 K, releasing Cosmic Microwave Background radiation." },
        { title: "Pop-III Star Reionization", end: 0.1, desc: "Zero-metallicity primordial gas collapses into hypermassive stars, ionising neutral hydrogen." },
        { title: "Galactic Disk Accretion", end: 1.0, desc: "Angular momentum conservation forms flat spinning galactic disks with MHD turbulence." },
        { title: "Stellar & Deep Time Era", end: Infinity, desc: "Interstellar gas depletion, white dwarf dominance, and open-ended thermodynamic entropy decay." }
    ];

    function updateTimelineUI(ageGyr) {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        
        let html = '';
        let start = 0;
        TIMELINE_EPOCHS.forEach(epoch => {
            const isActive = ageGyr >= start && ageGyr < epoch.end;
            const actClass = isActive ? 'active' : '';
            const endStr = epoch.end === Infinity ? "∞" : `${epoch.end} Gyr`;
            html += `
                <div class="timeline-node" style="margin-bottom: 24px; border-left: 2px solid ${isActive ? '#FF8C00' : '#333'}; padding-left: 16px;">
                  <div class="node-title ${actClass}" style="color: ${isActive ? '#fff' : '#888'}; font-weight: bold; margin-bottom: 4px;">${epoch.title}</div>
                  <div class="node-time data-font ${actClass}" style="color: ${isActive ? '#FF8C00' : '#555'}; font-size: 11px; margin-bottom: 8px;">${start} - ${endStr}</div>
                  <div class="node-desc ${actClass}" style="color: ${isActive ? '#bbb' : '#666'}; font-size: 12px; line-height: 1.4;">${epoch.desc}</div>
                </div>
            `;
            start = epoch.end;
        });
        container.innerHTML = html;
    }

    // DESIGN 4 EVENT CARDS (Restored)
    function renderDesign4EventCard(e) {
        const title = e.title || 'Cosmic Telemetry Event';
        const desc = e.description || 'Thermodynamic equilibrium shift detected.';
        const ageFormatted = `${Number(e.age || 0).toFixed(3)} Gyr`;
        
        let hex = "#00E5FF", rgb = "0, 229, 255", tag = "COSMIC EVENT";
        let iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
        
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("nebula") || lowerTitle.includes("cloud")) {
            hex = "#00E5FF"; rgb = "0, 229, 255"; tag = "NEBULA CLOUD";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`;
        } else if (lowerTitle.includes("star") || lowerTitle.includes("class-o")) {
            hex = "#FFD700"; rgb = "255, 215, 0"; tag = "STELLAR CORE";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>`;
        } else if (lowerTitle.includes("black hole") || lowerTitle.includes("singularity")) {
            hex = "#B026FF"; rgb = "176, 38, 255"; tag = "SINGULARITY";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;
        } else if (lowerTitle.includes("asteroid") || lowerTitle.includes("belt")) {
            hex = "#FF8C00"; rgb = "255, 140, 0"; tag = "ASTEROID BELT";
            iconSvg = `<svg class="c-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`;
        }

        return `
            <div class="d4-card" style="--c-hex: ${hex}; --c-rgb: ${rgb}; margin-bottom: 12px;">
                <div class="d4-header">
                    <div class="d4-icon-box">${iconSvg}</div>
                    <span class="d4-tag data-font">${tag}</span>
                </div>
                <div class="d4-title">${title}</div>
                <div class="d4-desc">${desc}</div>
                <div class="d4-metrics-grid data-font">
                    <div class="m-item"><span class="m-lbl">AGE</span><span class="m-val">${ageFormatted}</span></div>
                    <div class="m-item"><span class="m-lbl">STATUS</span><span class="m-val">STABLE</span></div>
                    <div class="m-item"><span class="m-lbl">SECTOR</span><span class="m-val">SEC 04</span></div>
                </div>
            </div>
        `;
    }

    // EARTH CLOCK & OBSERVER LOGIC (Restored)
    function initEarthClock() {
        const clockEl = document.getElementById('earth-clock');
        if (!clockEl) return;
        setInterval(() => {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            clockEl.innerText = `UPLINK TIMESTAMP: ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} LOCAL`;
        }, 1000);
    }
    initEarthClock();

    function setObserverEyeState(mode) {
        const ui = document.getElementById('observer-ui');
        const label = document.getElementById('status-label');
        if (!ui || !label) return;
        ui.classList.remove('state-observe', 'state-intervene', 'state-error');
        const m = (mode || '').toUpperCase();
        if (m === 'INTERVENE') { ui.classList.add('state-intervene'); label.innerText = 'EXECUTING INTERVENTION'; }
        else if (m === 'ERROR' || m === 'OFFLINE') { ui.classList.add('state-error'); label.innerText = 'CONNECTION SEVERED'; }
        else { ui.classList.add('state-observe'); label.innerText = 'OBSERVER ONLINE'; }
    }

    async function loadNextBatch() {
        if (isLoadingLogs) return;
        isLoadingLogs = true;
        const btn = document.getElementById("btn-load-more");
        const container = document.getElementById("logs-container");
        if (btn) btn.innerText = "QUERYING ARCHIVE...";

        try {
            let url = `${SUPABASE_URL}/rest/v1/origin_logs?select=*&order=id.desc&limit=4`;
            if (oldestLoadedId) url += `&id=lt.${oldestLoadedId}`;
            const res = await fetch(url, { headers: FETCH_HEADERS });
            
            if (res.ok) {
                const logs = await res.json();
                if (logs.length === 0) {
                    if (btn) btn.innerText = "END OF TELEMETRY ARCHIVE";
                    isLoadingLogs = false; return;
                }
                if (!oldestLoadedId && logs.length > 0) setObserverEyeState(logs[0].mode);

                logs.forEach(log => {
                    oldestLoadedId = log.id;
                    const card = document.createElement("div");
                    card.className = `log-card log-${(log.mode || 'OBSERVE').toLowerCase()}`;
                    card.innerHTML = `
                        <div class="breadcrumb-bar data-font"><span class="bc-item">${log.sector || "Sector 04"}</span><span class="bc-sep">►</span><span class="bc-item">${log.subject || "Cosmic System"}</span><span class="bc-sep">►</span><span class="bc-tag">${log.type_tag || "Telemetry"}</span></div>
                        <div class="log-meta data-font"><span>LATENCY: ${Number(log.latency_myr || 1.0).toFixed(3)} MYR</span></div>
                        <div class="logic-step"><div class="logic-icon">▶</div><div class="logic-text"><strong>Data Analysis:</strong> ${log.data_analysis || 'Analyzing'}</div></div>
                        <div class="logic-step"><div class="logic-icon">▶</div><div class="logic-text"><strong>Simulation:</strong> ${log.temporal_simulation || 'Trajectories nominal'}</div></div>
                        <div class="logic-decision logic-step"><div class="logic-icon">■</div><div class="logic-text">${log.resolution || 'Standard progression'}</div></div>
                    `;
                    container?.appendChild(card);
                });
                if (btn) btn.innerText = "QUERY PAST TELEMETRY";
            }
        } catch (err) {
            setObserverEyeState('ERROR');
            if (btn) btn.innerText = "RETRY TELEMETRY QUERY";
        } finally { isLoadingLogs = false; }
    }

    document.getElementById("btn-load-more")?.addEventListener("click", loadNextBatch);
    loadNextBatch();

    // ANALYZE BUTTON FALLBACK FIX (Prevents frozen '--' screens)
    document.getElementById('btn-expand-inspect')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!selectedNode) return;
        
        switchTab(null, 'modal-object-detail');
        
        // Instant visual fallback - writes immediately before the fetch
        document.getElementById('inspect-title').innerText = selectedNode.designation || "Unknown Node";
        document.getElementById('det-class').innerText = (selectedNode.category || "Anomaly").toUpperCase();
        document.getElementById('det-mass').innerText = "CALCULATING...";
        document.getElementById('det-status').innerText = "ACTIVE";
        
        const typeMap = { 'stars': '*star*', 'planets': '*planet*', 'black_holes': '*hole*', 'neutron_stars': '*neutron*', 'nebulae': '*cloud*', 'asteroids_comets': '*asteroid*' };
        const queryType = typeMap[selectedNode.category] || '*';
        
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/celestial_objects?object_type=ilike.${queryType}&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    const dbObj = data[0];
                    document.getElementById('inspect-title').innerText = dbObj.designation || selectedNode.designation;
                    document.getElementById('det-class').innerText = dbObj.object_type || "Celestial Body";
                    document.getElementById('det-mass').innerText = dbObj.mass_solar ? `${dbObj.mass_solar} M_sun` : "1.0 M_sun";
                    document.getElementById('det-temp').innerText = dbObj.surface_temp ? `${dbObj.surface_temp} K` : "288 K";
                    document.getElementById('det-status').innerText = dbObj.is_dead ? "Dead Remnant" : "Active";
                    document.getElementById('det-coords').innerText = `[${dbObj.x_coord || 0}, ${dbObj.y_coord || 0}, ${dbObj.z_coord || 0}]`;
                    document.getElementById('det-hydrogen').innerText = dbObj.hydrogen_pct !== undefined ? `${dbObj.hydrogen_pct}%` : "100%";
                    document.getElementById('det-abio').innerText = dbObj.abiogenesis_index || "0.00";
                    document.getElementById('det-progress').innerText = dbObj.progress_index || "0.00";
                    document.getElementById('det-kardashev').innerText = dbObj.kardashev_scale || "Type 0";
                    document.getElementById('det-radio').innerText = dbObj.radio_sphere_ly ? `${dbObj.radio_sphere_ly} ly` : "0.0 ly";
                    document.getElementById('det-id').innerText = `OBJ-#${dbObj.id || '0000'}`;
                    return; 
                }
            }
        } catch (err) {}
        
        // If query fails, safely inject default numbers instead of locking up
        document.getElementById('det-mass').innerText = "1.0 M_sun";
        document.getElementById('det-temp').innerText = "--- K";
        document.getElementById('det-coords').innerText = "[0, 0, 0]";
        document.getElementById('det-id').innerText = "SIMULATED NODE";
    });

    document.getElementById('btn-close-inspect')?.addEventListener('click', () => switchTab('btn-explore', null));

    // POLLING ENGINES
    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    localCurrentAge = Number(data[0].age || 0.0);
                    cameraState.currentAge = localCurrentAge;
                    
                    const hudAge = document.getElementById('hud-age');
                    if (hudAge) hudAge.innerText = localCurrentAge >= 1.0 ? `${localCurrentAge.toFixed(3)} Billion Years` : `${Math.floor(localCurrentAge * 1000000000).toLocaleString()} Years`;
                    
                    updateTimelineUI(localCurrentAge);
                    
                    // CATALOG BAR WIDTH FIX
                    const de = data[0].de_pct || 68.3;
                    const dm = data[0].dm_pct || 26.8;
                    const bm = data[0].baryon_pct || 4.9;
                    
                    if (document.getElementById('bar-de')) document.getElementById('bar-de').style.width = `${de}%`;
                    if (document.getElementById('bar-dm')) document.getElementById('bar-dm').style.width = `${dm}%`;
                    if (document.getElementById('bar-baryon')) document.getElementById('bar-baryon').style.width = `${bm}%`;
                    
                    if (document.getElementById('cat-de-val')) document.getElementById('cat-de-val').innerText = `${de}%`;
                    if (document.getElementById('cat-dm-val')) document.getElementById('cat-dm-val').innerText = `${dm}%`;
                    if (document.getElementById('cat-baryon-val')) document.getElementById('cat-baryon-val').innerText = `${bm}%`;
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
                    
                    // CATALOG HTML ID MISMATCH FIX
                    const idMap = { neutron_stars: 'degenerate', black_holes: 'bh', asteroids_comets: 'asteroids' };
                    ['nebulae', 'stars', 'black_holes', 'neutron_stars', 'planets', 'moons', 'asteroids_comets', 'quasars', 'exotic_objects'].forEach(key => {
                        const elId = `cat-${idMap[key] || key}-val`;
                        const el = document.getElementById(elId);
                        if (el) el.innerText = (stats[key] || 0).toLocaleString();
                    });
                    
                    const inhabited = document.getElementById('cat-inhabited-val');
                    if (inhabited) inhabited.innerText = (stats.inhabited || 0).toLocaleString();
                }
            }
        } catch (err) {}
    }

    async function pollEvents() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=15`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const events = await res.json();
                const container = document.getElementById('events-container');
                if (container && events.length > 0) {
                    container.innerHTML = events.map(e => renderDesign4EventCard(e)).join('');
                }
            }
        } catch (err) {}
    }

    function pollAll() { pollUniverseState(); pollCatalog(); pollEvents(); }
    pollAll(); 
    setInterval(pollAll, 3000);
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } 
else { initApp(); }
