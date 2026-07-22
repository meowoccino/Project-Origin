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

    // --- 2. BOTTOM NAVIGATION ---
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

    const inspectorPreview = document.getElementById('inspector-preview'), btnExpandInspect = document.getElementById('btn-expand-inspect'), btnCloseInspect = document.getElementById('btn-close-inspect');
    function openInspectModal() { resetTabs(); inspectModal?.classList.add('active'); }
    inspectorPreview?.addEventListener('click', openInspectModal);
    btnExpandInspect?.addEventListener('click', (e) => { e.stopPropagation(); openInspectModal(); });
    btnCloseInspect?.addEventListener('click', () => { inspectModal?.classList.remove('active'); btnExplore?.classList.add('active'); });

    // --- 3. TIMELINE ENGINE (WITH ACTIVE CSS CLASSES) ---
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
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const state = data[0];
                    if (state.age !== undefined && state.age >= localCurrentAge) localCurrentAge = Number(state.age);
                    
                    // Inject true server data into Origin tab (NO FAKE ILLUSIONS)
                    const container = document.getElementById('origin-actions-container');
                    if (container) {
                        container.innerHTML = `
                            <div class="action-card active-action">
                                <div class="action-card-header">
                                    <span class="action-card-title">${state.goal || 'Establishing Initial Physics Parameters'}</span>
                                    <span class="action-eta-badge data-font">Active</span>
                                </div>
                                <div class="action-meta-row"><span class="label-catalyst">Catalyst:</span> ${state.reasoning || 'Awaiting thermodynamic threshold...'}</div>
                                <div class="action-meta-row"><span class="label-trajectory">Trajectory:</span> Proceeding to next epochal transition constraint.</div>
                            </div>
                        `;
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
                        container.innerHTML = `<div style="color: #70748a; font-size: 13px; text-align: center; padding: 20px;">No events logged at current epoch.</div>`;
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
                    // The other 6 categories stay at 0 until the Python backend is upgraded
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
