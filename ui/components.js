import { initWebGPU, cameraState, updateCanvasFromCatalog, selectedNode } from '../engine/main.js';
import * as MainEngine from '../engine/main.js';

function initApp() {
    initWebGPU().catch(err => console.error("❌ [ENGINE INIT FAILED]:", err));

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
                cameraState.zoom = Math.max(0.35, Math.min(12.0, initialZoom * (dist / initialPinchDist)));
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

    const allBtns = ['btn-explore', 'btn-events', 'btn-ai', 'btn-timeline', 'btn-catalog'].map(id => document.getElementById(id));
    const allViews = ['view-events', 'view-ai', 'view-timeline', 'view-catalog', 'modal-object-detail'].map(id => document.getElementById(id));
    const hudContainer = document.getElementById('hud-age-container');

    function switchTab(btnId, viewId) {
        allBtns.forEach(b => b?.classList.remove('active'));
        allViews.forEach(v => {
            if (v) {
                v.classList.remove('active');
                v.style.display = 'none';
            }
        });
        
        if (btnId) document.getElementById(btnId)?.classList.add('active');
        if (viewId) {
            const view = document.getElementById(viewId);
            if (view) {
                view.style.display = 'block';
                requestAnimationFrame(() => view.classList.add('active'));
            }
        }
        
        MainEngine.isExploreActive = (btnId === 'btn-explore');
        
        if (canvasContainer) {
            if (MainEngine.isExploreActive) {
                canvasContainer.classList.remove('canvas-locked');
                if (hudContainer) hudContainer.style.opacity = '1';
            } else {
                canvasContainer.classList.add('canvas-locked');
                if (hudContainer) hudContainer.style.opacity = '0';
            }
        }

        const inspector = document.getElementById('inspector-preview');
        if (inspector) {
            inspector.classList.remove('active');
            inspector.style.display = 'none';
        }
    }

    document.getElementById('btn-explore')?.addEventListener('click', () => switchTab('btn-explore', null));
    document.getElementById('btn-events')?.addEventListener('click', () => switchTab('btn-events', 'view-events'));
    document.getElementById('btn-ai')?.addEventListener('click', () => switchTab('btn-ai', 'view-ai'));
    document.getElementById('btn-timeline')?.addEventListener('click', () => switchTab('btn-timeline', 'view-timeline'));
    document.getElementById('btn-catalog')?.addEventListener('click', () => switchTab('btn-catalog', 'view-catalog'));

    // TIMELINE UI ENGINE
    const TIMELINE_EPOCHS = [
        { title: "Primordial Inflation", start: 0, end: 0.001, desc: "Exponential space-time expansion driven by quantum vacuum inflaton field decay." },
        { title: "Recombination & Decoupling", start: 0.001, end: 0.01, desc: "Thermal baryonic gas cools below 3,000 K, releasing Cosmic Microwave Background radiation." },
        { title: "Pop-III Star Reionization", start: 0.01, end: 0.1, desc: "Zero-metallicity primordial gas collapses into hypermassive stars, ionising neutral hydrogen." },
        { title: "Galactic Disk Accretion", start: 0.1, end: 1.0, desc: "Angular momentum conservation forms flat spinning galactic disks with MHD turbulence." },
        { title: "Stellar & Deep Time Era", start: 1.0, end: Infinity, desc: "Interstellar gas depletion, white dwarf dominance, and open-ended thermodynamic entropy decay." }
    ];

    function updateTimelineUI(ageGyr) {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        container.innerHTML = TIMELINE_EPOCHS.map(epoch => {
            const isActive = ageGyr >= epoch.start && ageGyr < epoch.end;
            const actClass = isActive ? 'active' : '';
            const endLabel = (epoch.end === Infinity) ? "∞" : `${epoch.end} Gyr`;
            return `
                <div class="timeline-node">
                  <div class="node-marker ${actClass}"></div>
                  <div class="node-title ${actClass}">${epoch.title}</div>
                  <div class="node-time data-font ${actClass}">${epoch.start} - ${endLabel}</div>
                  <div class="node-desc ${actClass}">${epoch.desc}</div>
                </div>
            `;
        }).join('');
    }

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

    function updatePingLatency(latencyMs, isSuccess) {
        const pingDot = document.getElementById('ping-dot');
        if (!pingDot) return;
        if (!isSuccess || latencyMs > 1500) { pingDot.style.background = '#FF1744'; pingDot.style.boxShadow = '0 0 8px #FF1744'; }
        else if (latencyMs > 500) { pingDot.style.background = '#FFEA00'; pingDot.style.boxShadow = '0 0 8px #FFEA00'; }
        else { pingDot.style.background = '#00E676'; pingDot.style.boxShadow = '0 0 8px #00E676'; }
    }

    let oldestLoadedId = null;
    let isLoadingLogs = false;

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

    // INSPECTOR DATA FETCH WITH FALLBACK
    async function fetchRealObjectData(category) {
        const fallback = {
            designation: selectedNode ? selectedNode.designation : "Simulated Node",
            object_type: category ? category.toUpperCase() : "COSMIC BODY",
            mass_solar: "1.00", surface_temp: "288.0", is_dead: false,
            x_coord: 0.0, y_coord: 0.0, z_coord: 0.0,
            hydrogen_pct: 100.0, abiogenesis_index: 0.0, progress_index: 0.0,
            kardashev_scale: 0.0, radio_sphere_ly: 0.0, id: selectedNode ? selectedNode.id : "0"
        };

        const typeMap = {
            'stars': '*star*', 'planets': '*planet*', 'black_holes': '*hole*',
            'neutron_stars': '*neutron*', 'nebulae': '*cloud*', 'asteroids_comets': '*asteroid*'
        };
        const queryType = typeMap[category] || '*';
        
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/celestial_objects?object_type=ilike.${queryType}&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) return { ...fallback, ...data[0] };
            }
        } catch (err) {}
        
        return fallback;
    }

    document.getElementById('btn-expand-inspect')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (selectedNode) {
            switchTab(null, 'modal-object-detail');
            document.getElementById('inspect-title').innerText = selectedNode.designation;
            
            const dbObj = await fetchRealObjectData(selectedNode.category);
            
            document.getElementById('inspect-title').innerText = dbObj.designation || dbObj.name || selectedNode.designation;
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
        }
    });

    document.getElementById('btn-close-inspect')?.addEventListener('click', () => switchTab('btn-explore', null));

    // DESIGN 4 EVENT CARDS RENDERER
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
            hex = "#FFD700"; rgb = "255, 215, 0"; tag = "CLASS-O STAR";
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

    // POLLING ENGINES
    async function pollUniverseState() {
        const t0 = performance.now();
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1`, { headers: FETCH_HEADERS });
            updatePingLatency(Math.round(performance.now() - t0), res.ok);

            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    localCurrentAge = Number(data[0].age || 0.0);
                    cameraState.currentAge = localCurrentAge;
                    
                    const hudAge = document.getElementById('hud-age');
                    if (hudAge) {
                        hudAge.innerText = localCurrentAge >= 1.0 
                            ? `${localCurrentAge.toFixed(3)} Billion Years` 
                            : `${Math.floor(localCurrentAge * 1000000000).toLocaleString()} Years`;
                    }
                    
                    updateTimelineUI(localCurrentAge);
                    
                    if (document.getElementById('cat-de-val')) document.getElementById('cat-de-val').innerText = `${data[0].de_pct || 68.3}%`;
                    if (document.getElementById('cat-dm-val')) document.getElementById('cat-dm-val').innerText = `${data[0].dm_pct || 26.8}%`;
                    if (document.getElementById('cat-baryon-val')) document.getElementById('cat-baryon-val').innerText = `${data[0].baryon_pct || 4.9}%`;
                }
            }
        } catch (err) { updatePingLatency(9999, false); }
    }

    async function pollCatalog() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    const stats = data[0];
                    updateCanvasFromCatalog(stats, localCurrentAge);
                    
                    ['nebulae', 'stars', 'black_holes', 'neutron_stars', 'planets', 'moons', 'asteroids_comets', 'quasars', 'exotic_objects'].forEach(key => {
                        const el = document.getElementById(`cat-${key === 'neutron_stars' ? 'degenerate' : key === 'black_holes' ? 'bh' : key}-val`);
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
