import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 0. SPLASH SCREEN DISMISS ---
    const splash = document.getElementById('splash-screen');
    if (splash) {
        // Will stay forever until the user taps anywhere on the screen
        splash.addEventListener('click', () => {
            splash.classList.add('hidden');
        });
    }

    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    const SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja";

    const FETCH_HEADERS = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
    };

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

    // --- 2. BOTTOM NAVIGATION VIEWS ---
    const btnExplore = document.getElementById('btn-explore'), btnEvents = document.getElementById('btn-events'), btnAi = document.getElementById('btn-ai'), btnTimeline = document.getElementById('btn-timeline'), btnCatalog = document.getElementById('btn-catalog');
    const viewEvents = document.getElementById('view-events'), viewAi = document.getElementById('view-ai'), viewTimeline = document.getElementById('view-timeline'), viewCatalog = document.getElementById('view-catalog'), inspectModal = document.getElementById('modal-object-detail');
    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnCatalog], allViews = [viewEvents, viewAi, viewTimeline, viewCatalog, inspectModal];

    function resetTabs() { 
        allBtns.forEach(b => b?.classList.remove('active')); 
        allViews.forEach(v => v?.classList.remove('active')); 
    }

    function switchTab(btn, view) {
        resetTabs(); btn?.classList.add('active'); if (view) view.classList.add('active');
        const inspectorPreview = document.getElementById('inspector-preview');
        if (btn !== btnExplore && inspectorPreview) inspectorPreview.classList.remove('active');
    }

    btnExplore?.addEventListener('click', () => switchTab(btnExplore, null));
    btnEvents?.addEventListener('click', () => switchTab(btnEvents, viewEvents));
    btnAi?.addEventListener('click', () => switchTab(btnAi, viewAi));
    btnTimeline?.addEventListener('click', () => switchTab(btnTimeline, viewTimeline));
    btnCatalog?.addEventListener('click', () => switchTab(btnCatalog, viewCatalog));

    // Inspector Modal specific toggles
    const inspectorPreview = document.getElementById('inspector-preview'), btnExpandInspect = document.getElementById('btn-expand-inspect'), btnCloseInspect = document.getElementById('btn-close-inspect');
    function openInspectModal() { resetTabs(); inspectModal?.classList.add('active'); }
    inspectorPreview?.addEventListener('click', openInspectModal);
    btnExpandInspect?.addEventListener('click', (e) => { e.stopPropagation(); openInspectModal(); });
    btnCloseInspect?.addEventListener('click', () => { inspectModal?.classList.remove('active'); btnExplore?.classList.add('active'); });

    // --- 3. TIMELINE ENGINE ---
    const TIMELINE_EPOCHS = [
        { title: "Primordial Inflation", start: 0, end: 100000, desc: "Exponential space expansion driven by quantum vacuum density fluctuations." },
        { title: "Cosmic Dark Ages", start: 100000, end: 100000000, desc: "Neutral gas cools and collapses into early dark matter halos." },
        { title: "First Stars & Reionization", start: 100000000, end: 1000000000, desc: "Population III supermassive stars ignite, reionizing neutral hydrogen." },
        { title: "Galactic Disk Accretion", start: 1000000000, end: 10000000000, desc: "Flat spinning galaxy disks form with heavy metal nucleosynthesis." }
    ];

    function updateTimelineUI(totalYears) {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        container.innerHTML = TIMELINE_EPOCHS.map(epoch => {
            const isPassed = totalYears >= epoch.start;
            const isActive = totalYears >= epoch.start && totalYears < epoch.end;
            const markerColor = isActive ? '#00e5ff' : (isPassed ? '#4a4d66' : 'rgba(255,255,255,0.1)');
            const opacity = isActive ? '1' : (isPassed ? '0.7' : '0.2');

            return `
                <div class="timeline-node" style="opacity: ${opacity};">
                  <div class="node-marker" style="background: ${markerColor}; box-shadow: ${isActive ? '0 0 16px #00e5ff' : 'none'};"></div>
                  <div class="node-title" style="color: #fff; font-weight: bold; font-size: 16px;">${epoch.title}</div>
                  <div class="node-time data-font" style="color: #8c8f9f; font-size: 12px; margin-top: 4px;">${epoch.start.toLocaleString()} - ${epoch.end.toLocaleString()} Yrs</div>
                  <div class="node-desc" style="color: #b0b0d0; font-size: 13px; margin-top: 6px; line-height: 1.5;">${epoch.desc}</div>
                </div>
            `;
        }).join('');
    }

    // --- 4. REAL TELEMETRY SYNC ---
    let localCurrentAge = 0.0;

    function renderActiveActions(age) {
        const container = document.getElementById('origin-actions-container');
        if (!container) return;

        const actionPool = [
            { object: `Object-${Math.floor(100 + age * 12)} (Molecular Cloud)`, action: "Collapsing gravitational potential well", why: "Gas density reached Jeans Instability threshold in Sector 4", goal: "Igniting Population III Protostar", etaOffset: 150000 },
            { object: `Object-${Math.floor(250 + age * 8)} (Dark Matter Halo)`, action: "Channeling baryonic filament gas streams", why: "Higher mass concentration reduces thermal pressure", goal: "Accelerating protogalactic disk accretion", etaOffset: 320000 },
            { object: `Object-${Math.floor(50 + age * 5)} (Primordial Core)`, action: "Stabilizing circumstellar radiation zone", why: "Heavy element metallicity threshold reached", goal: "Testing prebiotic molecular formation", etaOffset: 500000 },
            { object: `Object-${Math.floor(410 + age * 15)} (Accretion Disk)`, action: "Resolving magnetohydrodynamic turbulence", why: "Angular momentum dissipation required for core collapse", goal: "Triggering stellar core ignition", etaOffset: 210000 }
        ];

        const cycleStep = Math.floor(age * 100) % 4;
        const count = 1 + cycleStep;
        const activeItems = actionPool.slice(0, count);

        container.innerHTML = activeItems.map(act => {
            return `
                <div class="action-card">
                  <div class="action-card-header">
                    <span class="action-card-title">${act.object}</span>
                    <span class="action-eta-badge data-font">In ${act.etaOffset.toLocaleString()} Yrs</span>
                  </div>
                  <div class="action-body-text">${act.action}</div>
                  <div class="action-meta-row">Why: <span style="color:#50536b;">${act.why}</span></div>
                  <div class="action-meta-row">Goal: <span style="color:#50536b;">${act.goal}</span></div>
                </div>
            `;
        }).join('');
    }

    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const state = data[0];
                    if (state.age !== undefined && state.age >= localCurrentAge) localCurrentAge = Number(state.age);
                    if (state.goal && document.getElementById('ai-goal-text')) document.getElementById('ai-goal-text').innerText = state.goal;
                    if (state.reasoning && document.getElementById('ai-reasoning-text')) document.getElementById('ai-reasoning-text').innerText = state.reasoning;
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
                                    <span class="data-font" style="font-size: 11px; color: #00e5ff; font-weight: bold;">${eventYears}</span>
                                  </div>
                                  <div style="color: #b0b0d0; font-size: 13px; margin-top: 8px; line-height: 1.4;">${e.description || ''}</div>
                                </div>
                            `;
                        }).join('');
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
                    if (document.getElementById('cat-stars') && stats.stars !== undefined) document.getElementById('cat-stars').innerText = Number(stats.stars).toLocaleString();
                    if (document.getElementById('cat-bh') && stats.black_holes !== undefined) document.getElementById('cat-bh').innerText = Number(stats.black_holes).toLocaleString();
                    if (document.getElementById('cat-neutron') && stats.neutron_stars !== undefined) document.getElementById('cat-neutron').innerText = Number(stats.neutron_stars).toLocaleString();
                    if (document.getElementById('cat-planets') && stats.planets !== undefined) document.getElementById('cat-planets').innerText = Number(stats.planets).toLocaleString();
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
        renderActiveActions(localCurrentAge);
    }, 1000);

    function pollAll() { pollUniverseState(); pollEvents(); pollCatalog(); }
    pollAll();
    setInterval(pollAll, 3000);
});
