import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. TOUCH & GESTURE CAMERA CONTROLS ---
    const canvasContainer = document.getElementById('canvas-container');

    let isDragging = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDistance = null;
    let initialZoom = 1.0;

    let touchStartTime = 0;
    let startX = 0;
    let startY = 0;

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    if (canvasContainer) {
        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
                
                touchStartTime = Date.now();
                startX = lastTouchX;
                startY = lastTouchY;
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
                initialZoom = cameraState.zoom;
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                const deltaX = e.touches[0].clientX - lastTouchX;
                const deltaY = e.touches[0].clientY - lastTouchY;

                cameraState.rotY += deltaX * 0.005;
                cameraState.rotX += deltaY * 0.005;
                cameraState.rotX = Math.max(-1.4, Math.min(1.4, cameraState.rotX));

                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2 && initialPinchDistance) {
                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialPinchDistance;
                cameraState.zoom = Math.max(0.1, Math.min(15.0, initialZoom * scale));
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const touchDuration = Date.now() - touchStartTime;
                const dist = Math.hypot(e.changedTouches[0].clientX - startX, e.changedTouches[0].clientY - startY);
                
                if (touchDuration < 300 && dist < 15) {
                    if (window.selectParticleAt) {
                        window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                }
            }

            if (e.touches.length < 2) initialPinchDistance = null;
            if (e.touches.length === 0) isDragging = false;
        }, { passive: true });
    }

    // --- 2. BOTTOM NAVBAR & SCREEN MODALS ---
    const btnExplore = document.getElementById('btn-explore');
    const btnEvents = document.getElementById('btn-events');
    const btnAi = document.getElementById('btn-ai');
    const btnTimeline = document.getElementById('btn-timeline');
    const btnCatalog = document.getElementById('btn-catalog');

    const viewEvents = document.getElementById('view-events');
    const viewAi = document.getElementById('view-ai');
    const viewTimeline = document.getElementById('view-timeline');
    const viewCatalog = document.getElementById('view-catalog');
    const inspectModal = document.getElementById('modal-object-detail');

    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnCatalog];
    const allViews = [viewEvents, viewAi, viewTimeline, viewCatalog, inspectModal];

    function resetTabs() {
        allBtns.forEach(btn => btn?.classList.remove('active'));
        allViews.forEach(view => view?.classList.remove('active'));
    }

    function switchTab(targetBtn, targetView) {
        resetTabs();
        targetBtn?.classList.add('active');
        if (targetView) targetView.classList.add('active');
        
        const inspectorPreview = document.getElementById('inspector-preview');
        if (targetBtn !== btnExplore && inspectorPreview) {
            inspectorPreview.classList.remove('active');
        }
    }

    btnExplore?.addEventListener('click', () => switchTab(btnExplore, null));
    btnEvents?.addEventListener('click', () => switchTab(btnEvents, viewEvents));
    btnAi?.addEventListener('click', () => switchTab(btnAi, viewAi));
    btnTimeline?.addEventListener('click', () => switchTab(btnTimeline, viewTimeline));
    btnCatalog?.addEventListener('click', () => switchTab(btnCatalog, viewCatalog));

    // --- 3. OBJECT INSPECTION MODAL ---
    const inspectorPreview = document.getElementById('inspector-preview');
    const btnExpandInspect = document.getElementById('btn-expand-inspect');
    const btnCloseInspect = document.getElementById('btn-close-inspect');

    function openInspectModal() {
        resetTabs();
        inspectModal?.classList.add('active');
    }

    inspectorPreview?.addEventListener('click', openInspectModal);
    btnExpandInspect?.addEventListener('click', (e) => {
        e.stopPropagation();
        openInspectModal();
    });

    btnCloseInspect?.addEventListener('click', () => {
        inspectModal?.classList.remove('active');
        btnExplore?.classList.add('active');
    });

    // --- 4. LIVE SUPABASE SYNC ---
    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    let currentDisplayAge = 0;

    // COSMIC TIMELINE MILESTONES (In Years)
    const TIMELINE_EPOCHS = [
        { title: "🌌 Primordial Inflation", start: 0, end: 100000, desc: "Rapid metric expansion and quantum density fluctuations." },
        { title: "⭐ Cosmic Dark Ages", start: 100000, end: 100000000, desc: "Cooling neutral gas collapsing into dark matter haloes." },
        { title: "✨ First Stars & Reionization", start: 100000000, end: 1000000000, desc: "Population III supermassive stars ignite, ionizing primordial hydrogen." },
        { title: "🪐 Galactic Disk Formation", start: 1000000000, end: 10000000000, desc: "Spinning protogalaxies settle into flat disks with heavy metallicity." }
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
                <div class="timeline-node" style="opacity: ${isPassed ? '1' : '0.4'}; margin-bottom: 20px;">
                  <div class="node-marker" style="background: ${markerColor}; box-shadow: ${isActive ? '0 0 12px #7000ff' : 'none'};"></div>
                  <div class="node-content">
                    <div class="node-title">${epoch.title}${statusBadge}</div>
                    <div class="node-time" style="color: #a0a0c0; font-size: 12px;">${epoch.start.toLocaleString()} - ${epoch.end.toLocaleString()} Years</div>
                    <div class="node-desc" style="margin-top: 4px; font-size: 13px;">${epoch.desc}</div>
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
            if (hudAge) {
                hudAge.innerText = `${totalYears.toLocaleString()} Years`;
            }

            // Dynamically update timeline based on age
            updateTimelineUI(totalYears);
        }
    }
    window.setHudAge = setHudAge;

    // A. Sync Universe Age & AI Goal
    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const state = data[0];
                    if (state.age !== undefined) setHudAge(state.age);

                    if (state.goal) {
                        const goalElem = document.querySelector('#view-ai .panel-value-large');
                        if (goalElem) goalElem.innerText = state.goal;
                    }
                    if (state.reasoning) {
                        const reasonElem = document.querySelector('#view-ai .panel-desc');
                        if (reasonElem) reasonElem.innerText = state.reasoning;
                    }
                }
            }
        } catch (err) {}
    }

    // B. Sync Live Events Stream
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
                            <div class="event-card-rich">
                              <div class="event-thumb ${e.type || 'blackhole'}"></div>
                              <div class="event-content">
                                <div class="event-title-row">
                                  <span class="dot-icon purple">●</span>
                                  <span class="event-title">${e.title || 'Cosmic Event'}</span>
                                </div>
                                <div class="event-desc">${e.description || e.message || ''}</div>
                                <div class="event-time">${eventYears}</div>
                              </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (err) {}
    }

    // C. Sync Catalog Object Counts
    async function pollCatalog() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const stats = data[0];
                    const items = document.querySelectorAll('.catalog-item .catalog-count');
                    if (items.length >= 4) {
                        if (stats.stars !== undefined) items[0].innerText = Number(stats.stars).toLocaleString();
                        if (stats.black_holes !== undefined) items[1].innerText = Number(stats.black_holes).toLocaleString();
                        if (stats.neutron_stars !== undefined) items[2].innerText = Number(stats.neutron_stars).toLocaleString();
                        if (stats.planets !== undefined) items[3].innerText = Number(stats.planets).toLocaleString();
                    }
                }
            }
        } catch (err) {}
    }

    // D. Send User "God Directive" to Supabase
    const inputDirective = document.getElementById('input-directive');
    const btnSendDirective = document.getElementById('btn-send-directive');

    async function sendDirective() {
        const text = inputDirective?.value?.trim();
        if (!text) return;

        btnSendDirective.disabled = true;
        btnSendDirective.innerText = "Sending...";

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/user_commands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: text, status: 'pending' })
            });

            if (res.ok) {
                inputDirective.value = '';
                btnSendDirective.innerText = "Sent!";
                setTimeout(() => { btnSendDirective.innerText = "Send"; btnSendDirective.disabled = false; }, 2000);
            } else {
                btnSendDirective.innerText = "Error";
                btnSendDirective.disabled = false;
            }
        } catch (err) {
            btnSendDirective.innerText = "Error";
            btnSendDirective.disabled = false;
        }
    }

    btnSendDirective?.addEventListener('click', sendDirective);

    function pollAll() {
        pollUniverseState();
        pollEvents();
        pollCatalog();
    }

    setInterval(pollAll, 3000);
    pollAll();
});
