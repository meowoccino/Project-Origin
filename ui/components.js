import { initWebGPU, cameraState, updateCanvasFromCatalog, selectedNode } from '../engine/main.js';
import * as MainEngine from '../engine/main.js';

function initApp() {
    initWebGPU().catch(err => console.error("❌ [ENGINE INIT FAILED]:", err));

    // Multi-event splash dismiss listener
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

        // Only allow object selection when actively viewing the Explore tab
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

    // Tab switcher with inspector preview auto-hiding
    function switchTab(btnId, viewId) {
        allBtns.forEach(b => b?.classList.remove('active'));
        allViews.forEach(v => v?.classList.remove('active'));
        document.getElementById(btnId)?.classList.add('active');
        if (viewId) document.getElementById(viewId)?.classList.add('active');
        
        if (hudContainer) hudContainer.style.opacity = (btnId === 'btn-explore') ? '1' : '0';
        MainEngine.isExploreActive = (btnId === 'btn-explore');

        const inspector = document.getElementById('inspector-preview');
        if (inspector && btnId !== 'btn-explore') {
            inspector.classList.remove('active');
        }
    }

    document.getElementById('btn-explore')?.addEventListener('click', () => switchTab('btn-explore', null));
    document.getElementById('btn-events')?.addEventListener('click', () => switchTab('btn-events', 'view-events'));
    document.getElementById('btn-ai')?.addEventListener('click', () => switchTab('btn-ai', 'view-ai'));
    document.getElementById('btn-timeline')?.addEventListener('click', () => switchTab('btn-timeline', 'view-timeline'));
    document.getElementById('btn-catalog')?.addEventListener('click', () => switchTab('btn-catalog', 'view-catalog'));

    // Local Device Earth Clock Fix
    function initEarthClock() {
        const clockEl = document.getElementById('earth-clock');
        if (!clockEl) return;
        const update = () => {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            clockEl.innerText = `UPLINK TIMESTAMP: ${y}-${m}-${d} ${h}:${min}:${s} LOCAL`;
        };
        setInterval(update, 1000);
        update();
    }
    initEarthClock();

    function setObserverEyeState(mode) {
        const ui = document.getElementById('observer-ui');
        const label = document.getElementById('status-label');
        if (!ui || !label) return;

        ui.classList.remove('state-observe', 'state-intervene', 'state-error');
        const m = (mode || '').toUpperCase();

        if (m === 'INTERVENE') {
            ui.classList.add('state-intervene');
            label.innerText = 'EXECUTING INTERVENTION';
        } else if (m === 'ERROR' || m === 'OFFLINE') {
            ui.classList.add('state-error');
            label.innerText = 'CONNECTION SEVERED';
        } else {
            ui.classList.add('state-observe');
            label.innerText = 'OBSERVER ONLINE';
        }
    }

    function createLogCard(log) {
        const mode = (log.mode || 'OBSERVE').toLowerCase();
        const sector = log.sector || "Sector 04";
        const title = log.subject || "Cosmic System";
        const typeTag = log.type_tag || "Telemetry Event";
        const timeLabel = log.latency_myr ? `LATENCY: ${log.latency_myr.toFixed(1)} MYR` : "LATENCY: 1.0 MYR";

        const card = document.createElement("div");
        card.className = `log-card log-${mode}`;
        
        card.innerHTML = `
            <div class="breadcrumb-bar data-font">
                <span class="bc-item" style="flex-shrink: 0;">${sector}</span>
                <span class="bc-sep">►</span>
                <span class="bc-item">${title}</span>
                <span class="bc-sep">►</span>
                <span class="bc-tag">${typeTag}</span>
            </div>
            <div class="log-meta data-font">
                <span>${timeLabel}</span>
            </div>
            <div class="logic-step">
                <div class="logic-icon">▶</div>
                <div class="logic-text"><strong>Data Analysis:</strong> ${log.data_analysis || 'Analyzing local thermodynamic density.'}</div>
            </div>
            <div class="logic-step">
                <div class="logic-icon">▶</div>
                <div class="logic-text"><strong>Simulation:</strong> ${log.temporal_simulation || 'Gravitational trajectories within normal distribution.'}</div>
            </div>
            <div class="logic-decision logic-step">
                <div class="logic-icon">■</div>
                <div class="logic-text">${log.resolution || 'Standard procedural evolution permitted.'}</div>
            </div>
        `;
        return card;
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
            let logs = [];
            if (res.ok) logs = await res.json();

            if (logs.length === 0) {
                if (btn) btn.innerText = "END OF TELEMETRY ARCHIVE";
                isLoadingLogs = false;
                return;
            }

            if (!oldestLoadedId && logs.length > 0) {
                setObserverEyeState(logs[0].mode);
            }

            logs.forEach(log => {
                oldestLoadedId = log.id;
                const card = createLogCard(log);
                container?.appendChild(card);
            });

            if (btn) btn.innerText = "QUERY PAST TELEMETRY";
        } catch (err) {
            console.error("Failed to fetch telemetry logs:", err);
            setObserverEyeState('ERROR');
            if (btn) btn.innerText = "RETRY TELEMETRY QUERY";
        } finally {
            isLoadingLogs = false;
        }
    }

    document.getElementById("btn-load-more")?.addEventListener("click", loadNextBatch);
    loadNextBatch();

    const TIMELINE_EPOCHS = [
        { title: "Primordial Inflation", start: 0, end: 100000, desc: "Exponential space-time expansion driven by quantum vacuum inflaton field decay." },
        { title: "Recombination & Decoupling", start: 100000, end: 100000000, desc: "Thermal baryonic gas cools below 3,000 K, releasing Cosmic Microwave Background radiation." },
        { title: "Pop-III Star Reionization", start: 100000000, end: 1000000000, desc: "Zero-metallicity primordial gas collapses into hypermassive stars, ionising neutral hydrogen." },
        { title: "Galactic Disk Accretion", start: 1000000000, end: 13800000000, desc: "Angular momentum conservation forms flat spinning galactic disks with MHD turbulence." },
        { title: "Degenerate & Far Cosmic Era", start: 13800000000, end: Infinity, desc: "Interstellar gas depletion, white dwarf dominance, and open-ended thermodynamic entropy decay." }
    ];

    function updateTimelineUI(totalYears) {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        container.innerHTML = TIMELINE_EPOCHS.map(epoch => {
            const isActive = totalYears >= epoch.start && totalYears < epoch.end;
            const actClass = isActive ? 'active' : '';
            const endLabel = (epoch.end === Infinity) ? "∞" : epoch.end.toLocaleString();
            return `
                <div class="timeline-node">
                  <div class="node-marker ${actClass}"></div>
                  <div class="node-title ${actClass}">${epoch.title}</div>
                  <div class="node-time data-font ${actClass}">${epoch.start.toLocaleString()} - ${endLabel} Yrs</div>
                  <div class="node-desc ${actClass}">${epoch.desc}</div>
                </div>
            `;
        }).join('');
    }

    function renderAgeHUD(ageGyr) {
        cameraState.currentAge = ageGyr;
        const totalYears = Math.floor(ageGyr * 1000000000);
        const hudAge = document.getElementById('hud-age');
        if (hudAge) {
            hudAge.innerText = totalYears >= 1000000000 
                ? `${(totalYears / 1000000000).toFixed(3)} Billion Years` 
                : `${totalYears.toLocaleString()} Years`;
        }
        updateTimelineUI(totalYears);
    }

    function generatePhysics(node, age) {
        let mass, radius, temp, extra;
        const seed = node.id * 13;
        
        const epochLabel = age < 0.1 
            ? `${(age * 1000).toFixed(2)} Myr` 
            : `${age.toFixed(3)} Gyr`;

        switch (node.category) {
            case 'asteroids_comets':
                mass = (seed % 90 + 1) + " × 10^15 kg"; radius = (seed % 150 + 5) + " km"; temp = (seed % 100 + 40) + " K";
                extra = `<div class="spec-row"><span class="spec-label">Composition</span><span class="spec-value">Silicates / Nickel-Iron</span></div>`;
                break;
            case 'moons':
                mass = "0." + (seed % 99 + 1) + " M_lunar"; radius = (seed % 2000 + 500) + " km"; temp = (seed % 150 + 50) + " K";
                extra = `<div class="spec-row"><span class="spec-label">Tidal State</span><span class="spec-value">Tidally Locked</span></div>`;
                break;
            case 'planets':
            case 'inhabited':
                mass = (seed % 15 + 0.1).toFixed(2) + " M_earth"; radius = (seed % 20000 + 4000) + " km";
                temp = node.category === 'inhabited' ? ((seed % 40) + 5) + " °C" : "-" + (seed % 150) + " °C";
                extra = node.category === 'inhabited' 
                    ? `<div class="spec-row"><span class="spec-label">Atmosphere</span><span class="spec-value">N2/O2 Rich</span></div><div class="spec-row"><span class="spec-label">Biosphere</span><span class="spec-value" style="color:#00E5FF">Confirmed</span></div>`
                    : `<div class="spec-row"><span class="spec-label">Atmosphere</span><span class="spec-value">CO2 / Methane</span></div>`;
                break;
            case 'stars':
                mass = (seed % 25 + 0.5).toFixed(2) + " M_sun"; radius = (seed % 15 + 0.8).toFixed(2) + " R_sun"; temp = (seed % 30000 + 3000).toLocaleString() + " K";
                extra = `<div class="spec-row"><span class="spec-label">Luminosity</span><span class="spec-value">${(seed % 1000 + 1).toFixed(1)} L_sun</span></div>`;
                break;
            case 'black_holes':
                mass = (seed % 50 + 5).toFixed(2) + " M_sun"; radius = ((seed % 50 + 5) * 2.95).toFixed(1) + " km (Schwarzschild)"; temp = "0.000" + (seed % 9 + 1) + " K (Hawking)";
                extra = `<div class="spec-row"><span class="spec-label">Accretion</span><span class="spec-value">${(seed % 5 * 0.1).toFixed(3)} M_sun/yr</span></div>`;
                break;
            case 'quasars':
                mass = (seed % 500 + 100) + " Million M_sun"; radius = (seed % 50 + 10) + " AU (Accretion Disk)"; temp = "Millions of K";
                extra = `<div class="spec-row"><span class="spec-label">Energy Output</span><span class="spec-value" style="color:#FFF066">10^40 Watts</span></div>`;
                break;
            default:
                mass = (seed % 5000 + 1000) + " M_sun"; radius = (seed % 150 + 10) + " Lightyears"; temp = "10 - 50 K";
                extra = `<div class="spec-row"><span class="spec-label">Composition</span><span class="spec-value">H II Region / Plasma</span></div>`;
                break;
        }

        return `
            <div class="spec-row"><span class="spec-label">Designation</span><span class="spec-value" style="font-weight:bold; color:#fff;">${node.designation}</span></div>
            <div class="spec-row"><span class="spec-label">Mass</span><span class="spec-value">${mass}</span></div>
            <div class="spec-row"><span class="spec-label">Radius</span><span class="spec-value">${radius}</span></div>
            <div class="spec-row"><span class="spec-label">Surface Temp</span><span class="spec-value">${temp}</span></div>
            ${extra}
            <div class="spec-row" style="border-bottom:none;"><span class="spec-label">Formation Epoch</span><span class="spec-value">${epochLabel}</span></div>
        `;
    }

    document.getElementById('btn-expand-inspect')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedNode) {
            document.getElementById('inspect-title').innerText = selectedNode.designation;
            document.getElementById('spec-name').innerHTML = generatePhysics(selectedNode, localCurrentAge);
            switchTab(null, 'modal-object-detail');
        }
    });

    document.getElementById('btn-close-inspect')?.addEventListener('click', () => switchTab('btn-explore', null));

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
                    renderAgeHUD(localCurrentAge);
                    
                    if (document.getElementById('cat-de-val')) document.getElementById('cat-de-val').innerText = `${data[0].de_pct || 68.5}%`;
                    if (document.getElementById('cat-dm-val')) document.getElementById('cat-dm-val').innerText = `${data[0].dm_pct || 26.4}%`;
                    if (document.getElementById('cat-baryon-val')) document.getElementById('cat-baryon-val').innerText = `${data[0].baryon_pct || 5.1}%`;
                    
                    const barDe = document.getElementById('bar-de'), barDm = document.getElementById('bar-dm'), barBaryon = document.getElementById('bar-baryon');
                    if(barDe) barDe.style.width = `${data[0].de_pct || 68.5}%`;
                    if(barDm) barDm.style.width = `${data[0].dm_pct || 26.4}%`;
                    if(barBaryon) barBaryon.style.width = `${data[0].baryon_pct || 5.1}%`;
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
                    
                    if (document.getElementById('cat-nebulae-val')) document.getElementById('cat-nebulae-val').innerText = (stats.nebulae || 0).toLocaleString();
                    if (document.getElementById('cat-stars-val')) document.getElementById('cat-stars-val').innerText = (stats.stars || 0).toLocaleString();
                    if (document.getElementById('cat-bh-val')) document.getElementById('cat-bh-val').innerText = (stats.black_holes || 0).toLocaleString();
                    if (document.getElementById('cat-degenerate-val')) document.getElementById('cat-degenerate-val').innerText = (stats.neutron_stars || 0).toLocaleString();
                    if (document.getElementById('cat-planets-val')) document.getElementById('cat-planets-val').innerText = (stats.planets || 0).toLocaleString();
                    if (document.getElementById('cat-moons-val')) document.getElementById('cat-moons-val').innerText = (stats.moons || 0).toLocaleString();
                    if (document.getElementById('cat-asteroids-val')) document.getElementById('cat-asteroids-val').innerText = (stats.asteroids_comets || 0).toLocaleString();
                    if (document.getElementById('cat-quasars-val')) document.getElementById('cat-quasars-val').innerText = (stats.quasars || 0).toLocaleString();
                    if (document.getElementById('cat-exotic-val')) document.getElementById('cat-exotic-val').innerText = (stats.exotic_objects || 0).toLocaleString();
                    if (document.getElementById('cat-inhabited-val')) {
                        const inhabited = (localCurrentAge > 0.5) ? Math.floor((stats.planets || 0) * 0.012) : 0;
                        document.getElementById('cat-inhabited-val').innerText = inhabited.toLocaleString();
                    }
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
                    container.innerHTML = events.map(e => `
                        <div class="glass-panel" style="margin-bottom: 12px; padding: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <span style="font-weight: bold; color: #fff; font-size: 14px; flex:1; padding-right:8px;">${e.title || 'Cosmic Event'}</span>
                            <span class="data-font" style="font-size: 11px; color: #FF8C00; font-weight: bold; white-space:nowrap;">${formatAgeFormatted(e.age)}</span>
                            </div>
                            <div style="color: #b0b0d0; font-size: 13px; margin-top: 8px; line-height: 1.4;">${e.description || ''}</div>
                        </div>
                    `).join('');
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
