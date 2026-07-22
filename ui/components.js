import { initWebGPU, cameraState, updateCanvasFromCatalog, selectedNode } from '../engine/main.js';
import * as MainEngine from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    initWebGPU().catch(err => console.error("❌ [ENGINE INIT FAILED]:", err));

    const splash = document.getElementById('splash-screen');
    if (splash) splash.addEventListener('click', () => splash.classList.add('hidden'));

    const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
    const SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja";
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
                cameraState.panX += (e.touches[0].clientX - lastX) * window.devicePixelRatio;
                cameraState.panY += (e.touches[0].clientY - lastY) * window.devicePixelRatio;
                lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2 && initialPinchDist) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                
                // PHYSICS: Calculate Scale Factor a(t). The younger the universe, the smaller the maximum zoom-out limit.
                const expansionFactor = Math.max(0.01, Math.min(1.0, localCurrentAge / 13800.0));
                const minZoomAllowed = 0.8 * (1.05 - expansionFactor); 
                
                cameraState.zoom = Math.max(minZoomAllowed, Math.min(25.0, initialZoom * (dist / initialPinchDist)));
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1 && (Date.now() - touchStart < 250)) {
                if (window.selectParticleAt) window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
            if (e.touches.length < 2) initialPinchDist = null;
            if (e.touches.length === 0) isDragging = false;
        }, { passive: true });
    }

    const allBtns = ['btn-explore', 'btn-events', 'btn-ai', 'btn-timeline', 'btn-catalog'].map(id => document.getElementById(id));
    const allViews = ['view-events', 'view-ai', 'view-timeline', 'view-catalog', 'modal-object-detail'].map(id => document.getElementById(id));
    const hudContainer = document.getElementById('hud-age-container');
    const inspectModal = document.getElementById('modal-object-detail');

    function switchTab(btnId, viewId) {
        allBtns.forEach(b => b?.classList.remove('active'));
        allViews.forEach(v => v?.classList.remove('active'));
        document.getElementById(btnId)?.classList.add('active');
        if (viewId) document.getElementById(viewId)?.classList.add('active');
        
        hudContainer.style.opacity = (btnId === 'btn-explore') ? '1' : '0';
        
        // Pause Canvas rendering to fix visual glitching on other tabs
        MainEngine.isExploreActive = (btnId === 'btn-explore');

        if (btnId !== 'btn-explore') document.getElementById('inspector-preview')?.classList.remove('active');
    }

    document.getElementById('btn-explore')?.addEventListener('click', () => switchTab('btn-explore', null));
    document.getElementById('btn-events')?.addEventListener('click', () => switchTab('btn-events', 'view-events'));
    document.getElementById('btn-ai')?.addEventListener('click', () => switchTab('btn-ai', 'view-ai'));
    document.getElementById('btn-timeline')?.addEventListener('click', () => switchTab('btn-timeline', 'view-timeline'));
    document.getElementById('btn-catalog')?.addEventListener('click', () => switchTab('btn-catalog', 'view-catalog'));

    // Strict Procedural Physics Generation
    function generatePhysics(node, age) {
        let mass, radius, temp, extra;
        const seed = node.id * 13;
        
        switch (node.category) {
            case 'asteroids_comets':
                mass = (seed % 90 + 1) + " × 10^15 kg";
                radius = (seed % 150 + 5) + " km";
                temp = (seed % 100 + 40) + " K";
                extra = `<div class="spec-row"><span class="spec-label">Composition</span><span class="spec-value">Silicates / Nickel-Iron</span></div>`;
                break;
            case 'moons':
                mass = "0." + (seed % 99 + 1) + " M_lunar";
                radius = (seed % 2000 + 500) + " km";
                temp = (seed % 150 + 50) + " K";
                extra = `<div class="spec-row"><span class="spec-label">Tidal State</span><span class="spec-value">Tidally Locked</span></div>`;
                break;
            case 'planets':
            case 'inhabited':
                mass = (seed % 15 + 0.1).toFixed(2) + " M_earth";
                radius = (seed % 20000 + 4000) + " km";
                temp = node.category === 'inhabited' ? ((seed % 40) + 5) + " °C" : "-" + (seed % 150) + " °C";
                extra = node.category === 'inhabited' 
                    ? `<div class="spec-row"><span class="spec-label">Atmosphere</span><span class="spec-value">N2/O2 Rich</span></div><div class="spec-row"><span class="spec-label">Biosphere</span><span class="spec-value" style="color:#00E5FF">Confirmed</span></div>`
                    : `<div class="spec-row"><span class="spec-label">Atmosphere</span><span class="spec-value">CO2 / Methane</span></div>`;
                break;
            case 'stars':
                mass = (seed % 25 + 0.5).toFixed(2) + " M_sun";
                radius = (seed % 15 + 0.8).toFixed(2) + " R_sun";
                temp = (seed % 30000 + 3000).toLocaleString() + " K";
                extra = `<div class="spec-row"><span class="spec-label">Luminosity</span><span class="spec-value">${(seed % 1000 + 1).toFixed(1)} L_sun</span></div>`;
                break;
            case 'black_holes':
                mass = (seed % 50 + 5).toFixed(2) + " M_sun";
                radius = ((seed % 50 + 5) * 2.95).toFixed(1) + " km (Schwarzschild)";
                temp = "0.000" + (seed % 9 + 1) + " K (Hawking)";
                extra = `<div class="spec-row"><span class="spec-label">Accretion</span><span class="spec-value">${(seed % 5 * 0.1).toFixed(3)} M_sun/yr</span></div>`;
                break;
            case 'quasars':
                mass = (seed % 500 + 100) + " Million M_sun";
                radius = (seed % 50 + 10) + " AU (Accretion Disk)";
                temp = "Millions of K";
                extra = `<div class="spec-row"><span class="spec-label">Energy Output</span><span class="spec-value" style="color:#FFF066">10^40 Watts</span></div>`;
                break;
            default: // Nebulae & Dark Matter
                mass = (seed % 5000 + 1000) + " M_sun";
                radius = (seed % 150 + 10) + " Lightyears";
                temp = "10 - 50 K";
                extra = `<div class="spec-row"><span class="spec-label">Composition</span><span class="spec-value">H II Region / Plasma</span></div>`;
                break;
        }

        return `
            <div class="spec-row"><span class="spec-label">Designation</span><span class="spec-value" style="font-weight:bold; color:#fff;">${node.designation}</span></div>
            <div class="spec-row"><span class="spec-label">Mass</span><span class="spec-value">${mass}</span></div>
            <div class="spec-row"><span class="spec-label">Radius</span><span class="spec-value">${radius}</span></div>
            <div class="spec-row"><span class="spec-label">Surface Temp</span><span class="spec-value">${temp}</span></div>
            ${extra}
            <div class="spec-row" style="border-bottom:none;"><span class="spec-label">Formation Epoch</span><span class="spec-value">${age.toFixed(2)} Myr</span></div>
        `;
    }

    document.getElementById('btn-expand-inspect')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedNode) {
            document.getElementById('inspect-title').innerText = selectedNode.designation;
            document.getElementById('spec-name').innerHTML = generatePhysics(selectedNode, localCurrentAge);
            
            // Clean up the modal header by hiding "Deep Space Telemetry"
            const subTitle = document.querySelector('#modal-object-detail .modal-header div div:nth-child(2)');
            if (subTitle) subTitle.style.display = 'none';
            
            switchTab(null, 'modal-object-detail');
        }
    });

    document.getElementById('btn-close-inspect')?.addEventListener('click', () => switchTab('btn-explore', null));

    function formatAgeFormatted(ageMyr) {
        if (!ageMyr || ageMyr < 0.1) return "< 0.1 Myr";
        if (ageMyr >= 1000.0) return `${(ageMyr / 1000.0).toFixed(2)} Gyr`;
        return `${Number(ageMyr).toFixed(2)} Myr`;
    }

    async function pollUniverseState() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/universe_state?select=*&order=id.desc&limit=15`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) localCurrentAge = Math.max(localCurrentAge, Number(data[0].age));

                const container = document.getElementById('origin-actions-container');
                if (container) {
                    container.innerHTML = data.map(state => `
                        <div class="glass-panel" style="margin-bottom:12px; padding:16px; border-left:3px solid #FF8C00;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="font-size:9px; font-weight:bold; letter-spacing:1px; text-transform:uppercase; padding:3px 6px; border-radius:4px; background:rgba(255,140,0,0.15); color:#FF8C00;">Directive</span>
                                <span class="data-font" style="font-size:11px; color:#FF8C00; font-weight:bold;">${formatAgeFormatted(state.age)}</span>
                            </div>
                            <div style="font-size:13.5px; font-weight:bold; color:#fff; margin-bottom:8px;">${state.goal || 'Resolving Dynamic System'}</div>
                            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.04); border-radius:8px; padding:8px; font-size:11.5px; color:#b0b5c0; font-style:italic; margin-bottom:8px;">
                                "Deliberation: ${state.reasoning || 'Executing optimal thermodynamic state.'}"
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#8c8f9f;">
                                <span>Trajectory: <span style="color:#fff; font-weight:bold;">${state.epoch}</span></span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {}
    }

    async function pollCatalog() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_stats?select=*&limit=1`, { headers: FETCH_HEADERS });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) updateCanvasFromCatalog(data[0], localCurrentAge);
            }
        } catch (err) {}
    }

    setInterval(() => {
        localCurrentAge += 0.5;
        cameraState.currentAge = localCurrentAge;
        const totalYears = Math.floor(localCurrentAge * 1000000);
        const hudAge = document.getElementById('hud-age');
        if (hudAge) hudAge.innerText = totalYears >= 1000000000 ? `${(totalYears / 1000000000).toFixed(3)} Billion Years` : `${totalYears.toLocaleString()} Years`;
    }, 1000);

    function pollAll() { pollUniverseState(); pollCatalog(); }
    pollAll(); setInterval(pollAll, 2500);
});
