import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. TOUCH & GESTURE NAVIGATION
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

    // 2. NAVBAR NAVIGATION
    const btnExplore = document.getElementById('btn-explore'), btnEvents = document.getElementById('btn-events'), btnAi = document.getElementById('btn-ai'), btnTimeline = document.getElementById('btn-timeline'), btnCatalog = document.getElementById('btn-catalog');
    const viewEvents = document.getElementById('view-events'), viewAi = document.getElementById('view-ai'), viewTimeline = document.getElementById('view-timeline'), viewCatalog = document.getElementById('view-catalog'), inspectModal = document.getElementById('modal-object-detail');
    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnCatalog], allViews = [viewEvents, viewAi, viewTimeline, viewCatalog, inspectModal];

    function resetTabs() { allBtns.forEach(b => b?.classList.remove('active')); allViews.forEach(v => v?.classList.remove('active')); }
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

    // 3. REAL-TIME SUPABASE TELEMETRY SYNC
    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    let currentDisplayAge = 0;

    const TIMELINE_EPOCHS = [
        { title: "🌌 Primordial Inflation", start: 0, end: 100000, desc: "Exponential expansion dominated by vacuum energy fluctuations." },
        { title: "⭐ Cosmic Dark Ages", start: 100000, end: 100000000, desc: "Cooling neutral gas collapses into dark matter halos." },
        { title: "✨ First Stars & Reionization", start: 100000000, end: 1000000000, desc: "Population III supermassive stars ignite, reionizing neutral hydrogen." },
        { title: "🪐 Disk Structure Accretion", start: 1000000000, end: 10000000000, desc: "Galactic disk formation and stellar metallicity enrichment." }
    ];

    function updateTimelineUI(totalYears) {
        const container = document.querySelector('.timeline-container');
        if (!container) return;

        container.innerHTML = TIMELINE_EPOCHS.map(epoch => {
            const isPassed = totalYears >= epoch.start;
            const isActive = totalYears >= epoch.start && totalYears < epoch.end;
            const markerColor = isActive ? '#7000ff' : (isPassed ? '#00e5ff' : 'rgba(255,255,255,0.2)');
            const statusBadge = isActive ? '<span style="color:#00e5ff; font-weight:bold; font-size:11px;"> [CURRENT EPOCH]</span>' : '';

            return `
                <div class="timeline-node" style="opacity: ${isPassed ? '1' : '0.35'}; margin-bottom: 20px;">
                  <div class="node-marker" style="background: ${markerColor}; box-shadow: ${isActive ? '0 0 10px #7000ff' : 'none'}; width: 12px; height: 12px; border-radius: 50%; float: left; margin-right: 12px; margin-top: 3px;"></div>
                  <div class="node-content" style="overflow: hidden;">
                    <div class="node-title" style="color: #fff; font-weight: bold; font-size: 14px;">${epoch.title}${statusBadge}</div>
                    <div class="node-time" style="color: #a0a0c0; font-size: 11px; margin-top: 2px;">${epoch.start.toLocaleString()} - ${epoch.end.toLocaleString()} Years</div>
                    <div class="node-desc" style="color: #d0d0e0; font-size: 12px; margin-top: 4px; line-height: 1.4;">${epoch.desc}</div>
                  </div>
                </div>
            `;
        }).join('');
    }

    function setHudAge(rawAge) {
        const numericAge = Number(rawAge);
        if (!isNaN(numericAge) && numericAge > currentDisplayAge) {
            currentDisplayAge = numericAge;
            const totalYears = Math.floor(currentDisplayAge * 1000000);
            const hudAge = document.getElementById('hud-age');
            if (hudAge) hudAge.innerText = `${totalYears.toLocaleString()} Years`;
            updateTimelineUI(totalYears);
        }
    }

    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const state = data[0];
                    if (state.age !== undefined) setHudAge(state.age);
                    
                    const goalElem = document.getElementById('ai-goal-text');
                    if (goalElem && state.goal) goalElem.innerText = state.goal;

                    const reasonElem = document.getElementById('ai-reasoning-text');
                    if (reasonElem && state.reasoning) reasonElem.innerText = state.reasoning;

                    const redshiftElem = document.getElementById('metric-redshift');
                    if (redshiftElem && state.redshift !== undefined) redshiftElem.innerText = `z = ${Number(state.redshift).toFixed(1)}`;

                    const entropyElem = document.getElementById('metric-entropy');
                    if (entropyElem && state.entropy !== undefined) entropyElem.innerText = `S = ${Number(state.entropy).toFixed(4)}`;
                }
            }
        } catch (err) {}
    }

    async function pollEvents() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=id.desc&limit=10`);
            if (res.ok) {
                const events = await res.json();
                const container = document.getElementById('events-container');
                if (container && Array.isArray(events) && events.length > 0) {
                    container.innerHTML = events.map(e => {
                        const eventYears = e.age ? Math.floor(e.age * 1000000).toLocaleString() + ' Years' : 'Live';
                        return `
                            <div class="event-card-rich" style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid #7000ff;">
                              <div class="event-content">
                                <div class="event-title-row" style="display: flex; justify-content: space-between; align-items: center;">
                                  <span class="event-title" style="font-weight: bold; color: #fff; font-size: 14px;">${e.title || 'Cosmic Event'}</span>
                                  <span class="event-time" style="font-size: 11px; color: #00e5ff; font-weight: bold;">${eventYears}</span>
                                </div>
                                <div class="event-desc" style="color: #c0c0e0; font-size: 12px; margin-top: 5px; line-height: 1.4;">${e.description || ''}</div>
                              </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (err) {}
    }

    async function pollCatalog() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const stats = data[0];
                    const cStars = document.getElementById('count-stars');
                    const cBh = document.getElementById('count-bh');
                    const cNeutron = document.getElementById('count-neutron');
                    const cPlanets = document.getElementById('count-planets');

                    if (cStars && stats.stars !== undefined) cStars.innerText = Number(stats.stars).toLocaleString();
                    if (cBh && stats.black_holes !== undefined) cBh.innerText = Number(stats.black_holes).toLocaleString();
                    if (cNeutron && stats.neutron_stars !== undefined) cNeutron.innerText = Number(stats.neutron_stars).toLocaleString();
                    if (cPlanets && stats.planets !== undefined) cPlanets.innerText = Number(stats.planets).toLocaleString();
                }
            }
        } catch (err) {}
    }

    function pollAll() { pollUniverseState(); pollEvents(); pollCatalog(); }
    setInterval(pollAll, 3000);
    pollAll();
});
