import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
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

    // --- 2. DRAWER & NAVIGATION ---
    const sideDrawer = document.getElementById('side-drawer');
    const btnOpenMenu = document.getElementById('btn-open-menu');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');

    btnOpenMenu?.addEventListener('click', () => sideDrawer?.classList.add('open'));
    btnCloseDrawer?.addEventListener('click', () => sideDrawer?.classList.remove('open'));

    const btnExplore = document.getElementById('btn-explore'), btnEvents = document.getElementById('btn-events'), btnAi = document.getElementById('btn-ai'), btnTimeline = document.getElementById('btn-timeline'), btnCatalog = document.getElementById('btn-catalog');
    const viewEvents = document.getElementById('view-events'), viewAi = document.getElementById('view-ai'), viewTimeline = document.getElementById('view-timeline'), viewCatalog = document.getElementById('view-catalog'), inspectModal = document.getElementById('modal-object-detail');
    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnCatalog], allViews = [viewEvents, viewAi, viewTimeline, viewCatalog, inspectModal];

    function resetTabs() { 
        allBtns.forEach(b => b?.classList.remove('active')); 
        allViews.forEach(v => v?.classList.remove('active')); 
        sideDrawer?.classList.remove('open');
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

    document.getElementById('dmenu-explore')?.addEventListener('click', () => switchTab(btnExplore, null));
    document.getElementById('dmenu-events')?.addEventListener('click', () => switchTab(btnEvents, viewEvents));
    document.getElementById('dmenu-ai')?.addEventListener('click', () => switchTab(btnAi, viewAi));
    document.getElementById('dmenu-timeline')?.addEventListener('click', () => switchTab(btnTimeline, viewTimeline));
    document.getElementById('dmenu-catalog')?.addEventListener('click', () => switchTab(btnCatalog, viewCatalog));

    const inspectorPreview = document.getElementById('inspector-preview'), btnExpandInspect = document.getElementById('btn-expand-inspect'), btnCloseInspect = document.getElementById('btn-close-inspect');
    function openInspectModal() { resetTabs(); inspectModal?.classList.add('active'); }
    inspectorPreview?.addEventListener('click', openInspectModal);
    btnExpandInspect?.addEventListener('click', (e) => { e.stopPropagation(); openInspectModal(); });
    btnCloseInspect?.addEventListener('click', () => { inspectModal?.classList.remove('active'); btnExplore?.classList.add('active'); });

    // --- 3. TIMELINE ENGINE ---
    const TIMELINE_EPOCHS = [
        { title: "🌌 Primordial Inflation", start: 0, end: 100000, desc: "Exponential space expansion driven by quantum vacuum density fluctuations." },
        { title: "⭐ Cosmic Dark Ages", start: 100000, end: 100000000, desc: "Neutral gas cools and collapses into early dark matter halos." },
        { title: "✨ First Stars & Reionization", start: 100000000, end: 1000000000, desc: "Population III supermassive stars ignite, reionizing neutral hydrogen." },
        { title: "🪐 Galactic Disk Accretion", start: 1000000000, end: 10000000000, desc: "Flat spinning galaxy disks form with heavy metal nucleosynthesis." }
    ];

    function updateTimelineUI(totalYears) {
        const container = document.querySelector('.timeline-container');
        if (!container) return;

        container.innerHTML = TIMELINE_EPOCHS.map(epoch => {
            const isPassed = totalYears >= epoch.start;
            const isActive = totalYears >= epoch.start && totalYears < epoch.end;
            const markerColor = isActive ? '#7000ff' : (isPassed ? '#00e5ff' : 'rgba(255,255,255,0.25)');
            const statusBadge = isActive ? '<span style="color:#00e5ff; font-weight:bold; font-size:11px;"> [CURRENT EPOCH]</span>' : '';

            return `
                <div class="timeline-node" style="opacity: ${isPassed ? '1' : '0.45'}; margin-bottom: 22px; clear: both;">
                  <div class="node-marker" style="background: ${markerColor}; box-shadow: ${isActive ? '0 0 12px #7000ff' : 'none'}; width: 12px; height: 12px; border-radius: 50%; float: left; margin-right: 12px; margin-top: 3px;"></div>
                  <div class="node-content" style="overflow: hidden;">
                    <div class="node-title" style="color: #fff; font-weight: bold; font-size: 15px;">${epoch.title}${statusBadge}</div>
                    <div class="node-time" style="color: #a0a0c0; font-size: 12px; margin-top: 2px;">${epoch.start.toLocaleString()} - ${epoch.end.toLocaleString()} Years</div>
                    <div class="node-desc" style="color: #d0d0e0; font-size: 13px; margin-top: 4px; line-height: 1.4;">${epoch.desc}</div>
                  </div>
                </div>
            `;
        }).join('');
    }

    // --- 4. REAL TELEMETRY SYNC ---
    let localCurrentAge = 0.0;

    function renderActiveActions(age) {
        const container = document.getElementById('origin-actions-container');
        const badge = document.getElementById('ai-action-badge');
        if (!container) return;

        const totalYears = Math.floor(age * 1000000);

        // Pool of potential physical actions
        const actionPool = [
            {
                object: `Object-${Math.floor(100 + age * 12)} (Molecular Cloud)`,
                action: "Collapsing gravitational potential well",
                why: "Gas density reached Jeans Instability threshold in Sector 4",
                goal: "Igniting Population III Protostar",
                etaOffset: 150000
            },
            {
                object: `Object-${Math.floor(250 + age * 8)} (Dark Matter Halo)`,
                action: "Channeling baryonic filament gas streams",
                why: "Higher mass concentration reduces thermal pressure",
                goal: "Accelerating protogalactic disk accretion",
                etaOffset: 320000
            },
            {
                object: `Object-${Math.floor(50 + age * 5)} (Primordial Core)`,
                action: "Stabilizing circumstellar radiation zone",
                why: "Heavy element metallicity threshold reached",
                goal: "Testing prebiotic molecular formation",
                etaOffset: 500000
            },
            {
                object: `Object-${Math.floor(410 + age * 15)} (Accretion Disk)`,
                action: "Resolving magnetohydrodynamic turbulence",
                why: "Angular momentum dissipation required for core collapse",
                goal: "Triggering stellar core ignition",
                etaOffset: 210000
            },
            {
                object: `Object-${Math.floor(88 + age * 3)} (Singularity Halo)`,
                action: "Mapping quantum event horizon geodesics",
                why: "Evaluating local Hawking radiation entropy loss",
                goal: "Measuring black hole mass evaporation",
                etaOffset: 750000
            }
        ];

        // Dynamic count (1 to 4 active items) based on age cycle
        const cycleStep = Math.floor(age * 100) % 4;
        const count = 1 + cycleStep; // Dynamic count: 1, 2, 3, or 4 actions!

        const activeItems = actionPool.slice(0, count);

        if (badge) {
            badge.innerText = `${count} ${count === 1 ? 'action' : 'actions'} active`;
            badge.style.background = "rgba(0, 229, 255, 0.12)";
            badge.style.color = "#00e5ff";
            badge.style.border = "1px solid rgba(0, 229, 255, 0.3)";
            badge.style.padding = "2px 8px";
            badge.style.borderRadius = "6px";
            badge.style.fontSize = "11px";
            badge.style.fontWeight = "bold";
        }

        container.innerHTML = activeItems.map(act => {
            const etaYears = Math.floor(totalYears + act.etaOffset);
            return `
                <div class="action-card">
                  <div class="action-card-header">
                    <span class="action-card-title">● ${act.object}</span>
                    <span class="action-eta-badge">ETA: ${etaYears.toLocaleString()} Yrs</span>
                  </div>
                  <div class="action-body-text">${act.action}</div>
                  <div class="action-meta-row"><strong>Why:</strong> ${act.why}</div>
                  <div class="action-meta-row" style="color: #a680ff; font-weight: 600; margin-top: 3px;"><strong>Goal:</strong> ${act.goal}</div>
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
                    if (state.age !== undefined && state.age >= localCurrentAge) {
                        localCurrentAge = Number(state.age);
                    }
                    if (state.goal) {
                        const goalElem = document.getElementById('ai-goal-text');
                        if (goalElem) goalElem.innerText = state.goal;
                    }
                    if (state.reasoning) {
                        const reasonElem = document.getElementById('ai-reasoning-text');
                        if (reasonElem) reasonElem.innerText = state.reasoning;
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
                            const eventYears = e.age ? Math.floor(e.age * 1000000).toLocaleString() + ' Years' : 'Live';
                            return `
                                <div class="glass-panel" style="margin-bottom: 10px; padding: 12px;">
                                  <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: bold; color: #fff; font-size: 14px;">● ${e.title || 'Cosmic Event'}</span>
                                    <span style="font-size: 11px; color: #00e5ff; font-weight: bold;">${eventYears}</span>
                                  </div>
                                  <div style="color: #b0b0d0; font-size: 12px; margin-top: 6px;">${e.description || ''}</div>
                                </div>
                            `;
                        }).join('');
                    } else {
                        container.innerHTML = `<div style="color: #8080a0; font-size: 13px; text-align: center; padding: 20px;">No events logged at current epoch.</div>`;
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
                    const cStars = document.getElementById('cat-stars');
                    const cBh = document.getElementById('cat-bh');
                    const cNeutron = document.getElementById('cat-neutron');
                    const cPlanets = document.getElementById('cat-planets');

                    if (cStars && stats.stars !== undefined) cStars.innerText = Number(stats.stars).toLocaleString();
                    if (cBh && stats.black_holes !== undefined) cBh.innerText = Number(stats.black_holes).toLocaleString();
                    if (cNeutron && stats.neutron_stars !== undefined) cNeutron.innerText = Number(stats.neutron_stars).toLocaleString();
                    if (cPlanets && stats.planets !== undefined) cPlanets.innerText = Number(stats.planets).toLocaleString();
                }
            }
        } catch (err) {}
    }

    setInterval(() => {
        localCurrentAge += 0.0001;
        cameraState.currentAge = localCurrentAge;

        const totalYears = Math.floor(localCurrentAge * 1000000);
        const formattedAge = totalYears >= 1000000000 ? `${(totalYears / 1000000000).toFixed(3)} Billion Years` : `${totalYears.toLocaleString()} Years`;

        const hudAge = document.getElementById('hud-age');
        const drawerAge = document.getElementById('drawer-hud-age');
        if (hudAge) hudAge.innerText = formattedAge;
        if (drawerAge) drawerAge.innerText = formattedAge;

        updateTimelineUI(totalYears);
        renderActiveActions(localCurrentAge);
    }, 1000);

    // --- 5. ANIMATED CONSTELLATION SPHERE ---
    const aiCanvas = document.getElementById('ai-constellation-canvas');
    if (aiCanvas) {
        const actx = aiCanvas.getContext('2d');
        let sphereRot = 0;

        function animateAISphere() {
            requestAnimationFrame(animateAISphere);
            actx.clearRect(0, 0, 180, 180);

            const cx = 90, cy = 90, r = 60;
            sphereRot += 0.01;

            const nodes = [];
            for (let i = 0; i < 28; i++) {
                const phi = Math.acos(-1 + (2 * i) / 28);
                const theta = Math.sqrt(28 * Math.PI) * phi + sphereRot;

                const x = cx + r * Math.sin(phi) * Math.cos(theta);
                const y = cy + r * Math.sin(phi) * Math.sin(theta);
                const z = r * Math.cos(phi);

                nodes.push({ x, y, z });
            }

            actx.strokeStyle = 'rgba(112, 0, 255, 0.35)';
            actx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
                    if (dist < 40) {
                        actx.beginPath();
                        actx.moveTo(nodes[i].x, nodes[i].y);
                        actx.lineTo(nodes[j].x, nodes[j].y);
                        actx.stroke();
                    }
                }
            }

            for (let i = 0; i < nodes.length; i++) {
                actx.fillStyle = nodes[i].z > 0 ? '#00e5ff' : '#7000ff';
                actx.beginPath();
                actx.arc(nodes[i].x, nodes[i].y, nodes[i].z > 0 ? 2.5 : 1.5, 0, Math.PI * 2);
                actx.fill();
            }
        }

        animateAISphere();
    }

    function pollAll() {
        pollUniverseState();
        pollEvents();
        pollCatalog();
    }

    pollAll();
    setInterval(pollAll, 3000);
});
