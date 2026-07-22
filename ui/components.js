import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 0. SPLASH SCREEN DISMISS ---
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.addEventListener('click', () => {
            splash.classList.add('hidden');
        });
    }

    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    const SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja";
    const FETCH_HEADERS = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

    // --- 1. TOUCH CONTROLS ---
    const canvasContainer = document.getElementById('canvas-container');
    let isDragging = false, lastTouchX = 0, lastTouchY = 0, initialPinchDistance = null, initialZoom = 1.0, touchStartTime = 0, startX = 0, startY = 0;

    function getTouchDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    if (canvasContainer) {
        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true; lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
                touchStartTime = Date.now(); startX = lastTouchX; startY = lastTouchY;
            } else if (e.touches.length === 2) {
                isDragging = false; initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]); initialZoom = cameraState.zoom;
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                cameraState.rotY += (e.touches[0].clientX - lastTouchX) * 0.005;
                cameraState.rotX = Math.max(-1.4, Math.min(1.4, cameraState.rotX + (e.touches[0].clientY - lastTouchY) * 0.005));
                lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2 && initialPinchDistance) {
                cameraState.zoom = Math.max(0.1, Math.min(15.0, initialZoom * (getTouchDistance(e.touches[0], e.touches[1]) / initialPinchDistance)));
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1 && (Date.now() - touchStartTime < 300)) {
                if (Math.hypot(e.changedTouches[0].clientX - startX, e.changedTouches[0].clientY - startY) < 15) {
                    if (window.selectParticleAt) window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                }
            }
            if (e.touches.length < 2) initialPinchDistance = null;
            if (e.touches.length === 0) isDragging = false;
        }, { passive: true });
    }

    // --- 2. NAVIGATION VIEWS WITH HUD TAB-SCOPING ---
    const btnExplore = document.getElementById('btn-explore'), btnEvents = document.getElementById('btn-events'), btnAi = document.getElementById('btn-ai'), btnTimeline = document.getElementById('btn-timeline'), btnCatalog = document.getElementById('btn-catalog');
    const viewEvents = document.getElementById('view-events'), viewAi = document.getElementById('view-ai'), viewTimeline = document.getElementById('view-timeline'), viewCatalog = document.getElementById('view-catalog'), inspectModal = document.getElementById('modal-object-detail');
    const hudContainer = document.getElementById('hud-age-container');
    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnCatalog], allViews = [viewEvents, viewAi, viewTimeline, viewCatalog, inspectModal];

    function resetTabs() { 
        allBtns.forEach(b => b?.classList.remove('active')); 
        allViews.forEach(v => v?.classList.remove('active')); 
    }

    function switchTab(btn, view) {
        resetTabs(); 
        btn?.classList.add('active'); 
        if (view) view.classList.add('active');

        // Scope HUD strictly to Explore Tab to prevent glitches across swipes
        if (btn === btnExplore) {
            if (hudContainer) hudContainer.style.opacity = '1';
        } else {
            if (hudContainer) hudContainer.style.opacity = '0';
        }

        const inspectorPreview = document.getElementById('inspector-preview');
        if (btn !== btnExplore && inspectorPreview) inspectorPreview.classList.remove('active');
    }

    btnExplore?.addEventListener('click', () => switchTab(btnExplore, null));
    btnEvents?.addEventListener('click', () => switchTab(btnEvents, viewEvents));
    btnAi?.addEventListener('click', () => switchTab(btnAi, viewAi));
    btnTimeline?.addEventListener('click', () => switchTab(btnTimeline, viewTimeline));
    btnCatalog?.addEventListener('click', () => switchTab(btnCatalog, viewCatalog));

    const inspectorPreview = document.getElementById('inspector-preview'), btnExpandInspect = document.getElementById('btn-expand-inspect'), btnCloseInspect = document.getElementById('btn-close-inspect');
    function openInspectModal() { resetTabs(); inspectModal?.classList.add('active'); }
    inspectorPreview?.addEventListener('click', openInspectModal);
    btnExpandInspect?.addEventListener('click', (e) => { e.stopPropagation(); openInspectModal(); });
    btnCloseInspect?.addEventListener('click', () => { inspectModal?.classList.remove('active'); btnExplore?.classList.add('active'); switchTab(btnExplore, null); });

    // --- 3. TIMELINE ENGINE ---
    const TIMELINE_EPOCHS = [
        { title: "Primordial Inflation", start: 0, end: 100000, desc: "Exponential space-time expansion driven by quantum vacuum inflaton field decay." },
        { title: "Recombination & Decoupling", start: 100000, end: 100000000, desc: "Thermal baryonic gas cools below 3,000 K, releasing Cosmic Microwave Background radiation." },
        { title: "Pop-III Star Reionization", start: 100000000, end: 1000000000, desc: "Zero-metallicity primordial gas collapses into hypermassive stars, ionising neutral hydrogen." },
        { title: "Galactic Disk Accretion", start: 1000000000, end: 13800000000, desc: "Angular momentum conservation forms flat spinning galactic disks with MHD turbulence." },
        { title: "Degenerate Stellar Era", start: 13800000000, end: 100000000000, desc: "Interstellar gas depletion halts main sequence star formation; white dwarfs & black holes dominate." }
    ];

    function updateTimelineUI(totalYears) {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        container.innerHTML = TIMELINE_EPOCHS.map(epoch => {
            const isActive = totalYears >= epoch.start && totalYears < epoch.end;
            const activeClass = isActive ? 'active' : '';

            return `
                <div class="timeline-node">
                  <div class="node-marker ${activeClass}"></div>
                  <div class="node-title ${activeClass}">${epoch.title}</div>
                  <div class="node-time data-font ${activeClass}">${epoch.start.toLocaleString()} - ${epoch.end.toLocaleString()} Yrs</div>
                  <div class="node-desc ${activeClass}">${epoch.desc}</div>
                </div>
            `;
        }).join('');
    }

    // --- 4. REAL TELEMETRY SYNC ---
    let localCurrentAge = 0.0;

    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=5`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const latest = data[0];
                    if (latest.age !== undefined && latest.age >= localCurrentAge) localCurrentAge = Number(latest.age);
                    
                    const container = document.getElementById('origin-actions-container');
                    if (container) {
                        container.innerHTML = data.map(state => `
                            <div class="action-card">
                                <div class="action-card-title">${state.goal || 'Resolving Hydrodynamic Equations'}</div>
                                <div class="action-meta-row"><span class="label-catalyst">Catalyst:</span> ${state.reasoning || 'Calculating Jeans mass instability thresholds.'}</div>
                                <div class="action-meta-row"><span class="label-trajectory">Trajectory:</span> ${state.epoch || 'Standard Cosmological Sequence'}</div>
                            </div>
                        `).join('');
                    }
                }
            }
        } catch (err) {}
    }

    async function pollEvents() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=10`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const events = await res.json();
                const container = document.getElementById('events-container');
                if (container) {
                    if (Array.isArray(events) && events.length > 0) {
                        container.innerHTML = events.map(e => {
                            const eventYears = e.age ? Math.floor(e.age * 1000000).toLocaleString() + ' Yrs' : 'LIVE';
                            return `
                                <div class="glass-panel" style="margin-bottom: 12px; padding: 16px;">
                                  <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: bold; color: #fff; font-size: 14px;">${e.title || 'Cosmic Event'}</span>
                                    <span class="data-font" style="font-size: 11px; color: #FF8C00; font-weight: bold;">${eventYears}</span>
                                  </div>
                                  <div style="color: #b0b0d0; font-size: 13px; margin-top: 8px; line-height: 1.4;">${e.description || ''}</div>
                                </div>
                            `;
                        }).join('');
                    } else {
                        container.innerHTML = `<div style="color: #8c8f9f; font-size: 13px; text-align: center; padding: 20px;">No events logged at current epoch.</div>`;
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
                if (Array.isArray(data) && data.length > 0) {
                    const stats = data[0];
                    
                    // 1. Density & Energy States
                    if (document.getElementById('cat-dm')) {
                        const dmMass = (stats.dark_matter_structures || 0) * 100000;
                        document.getElementById('cat-dm').innerText = `26.8% | ${dmMass.toLocaleString()} M☉`;
                    }
                    if (document.getElementById('cat-de')) {
                        document.getElementById('cat-de').innerText = `68.3% Pressure`;
                    }
                    if (document.getElementById('cat-baryonic')) {
                        const baryonicMass = (stats.stars || 0) * 1.0 + (stats.nebulae || 0) * 500.0 + (stats.planets || 0) * 0.001;
                        document.getElementById('cat-baryonic').innerText = `${baryonicMass.toLocaleString()} M☉`;
                    }
                    if (document.getElementById('cat-antimatter')) {
                        document.getElementById('cat-antimatter').innerText = `< 0.001% Ratio`;
                    }

                    // 2. Concrete Physical Bodies
                    if (document.getElementById('cat-stars')) {
                        document.getElementById('cat-stars').innerText = `${(stats.stars || 0).toLocaleString()} Cores`;
                    }
                    if (document.getElementById('cat-bh')) {
                        document.getElementById('cat-bh').innerText = `${(stats.black_holes || 0).toLocaleString()} Singularities`;
                    }
                    if (document.getElementById('cat-degenerate')) {
                        const degenCount = (stats.neutron_stars || 0);
                        document.getElementById('cat-degenerate').innerText = `${degenCount.toLocaleString()} Cores`;
                    }
                    if (document.getElementById('cat-planets')) {
                        document.getElementById('cat-planets').innerText = `${(stats.planets || 0).toLocaleString()} Bodies`;
                    }
                    if (document.getElementById('cat-moons')) {
                        document.getElementById('cat-moons').innerText = `${(stats.moons || 0).toLocaleString()} Satellites`;
                    }
                    if (document.getElementById('cat-asteroids')) {
                        document.getElementById('cat-asteroids').innerText = `${(stats.asteroids_comets || 0).toLocaleString()} Fragments`;
                    }
                    if (document.getElementById('cat-nebulae')) {
                        document.getElementById('cat-nebulae').innerText = `${(stats.nebulae || 0).toLocaleString()} Clouds`;
                    }
                    if (document.getElementById('cat-quasars')) {
                        document.getElementById('cat-quasars').innerText = `${(stats.quasars || 0).toLocaleString()} Cores`;
                    }
                    if (document.getElementById('cat-exotic')) {
                        document.getElementById('cat-exotic').innerText = `${(stats.exotic_objects || 0).toLocaleString()} Relics`;
                    }
                }
            }
        } catch (err) {}
    }

    setInterval(() => {
        localCurrentAge += 0.03875;
        cameraState.currentAge = localCurrentAge;

        const totalYears = Math.floor(localCurrentAge * 1000000);
        const formattedAge = totalYears >= 1000000000 ? `${(totalYears / 1000000000).toFixed(3)} Billion Years` : `${totalYears.toLocaleString()} Years`;

        const hudAge = document.getElementById('hud-age');
        if (hudAge) hudAge.innerText = formattedAge;

        updateTimelineUI(totalYears);
    }, 1000);

    function pollAll() { pollUniverseState(); pollEvents(); pollCatalog(); }
    pollAll();
    setInterval(pollAll, 3000);
});
