export const cameraState = { rotX: 0, rotY: 0, zoom: 1.0, currentAge: 0.0 };

let canvas, ctx;
let cosmicNodes = [];
let selectedNode = null;
let currentCatalogData = null;

// Category Visual Definitions
const CATEGORY_STYLES = {
    nebulae: { color: '#9932CC', name: 'Nebula Gas Cloud', size: 4.5 },
    stars: { color: '#FFD700', name: 'Stellar Core', size: 2.5 },
    black_holes: { color: '#4A4D66', name: 'Singularity', size: 3.5, ring: true },
    neutron_stars: { color: '#00E5FF', name: 'Neutron Core', size: 2.0 },
    planets: { color: '#CD7F32', name: 'Planetary Body', size: 1.8 },
    moons: { color: '#8C8F9F', name: 'Satellite Moon', size: 1.2 },
    asteroids_comets: { color: '#B0B0D0', name: 'Asteroid Fragment', size: 1.0 },
    quasars: { color: '#FFFFFF', name: 'Active Quasar', size: 5.0, glow: true },
    exotic_objects: { color: '#FF69B4', name: 'Exotic Artifact', size: 3.0 },
    inhabited: { color: '#00E5FF', name: 'Inhabited World', size: 3.2, glow: true }
};

export function updateCanvasFromCatalog(stats, ageMyr) {
    currentCatalogData = stats;
    if (!ctx) return;

    // Calculate Inhabited Worlds
    const planets = stats.planets || 0;
    const inhabitedCount = (ageMyr > 500.0) ? Math.floor(planets * 0.012) : 0;

    const counts = {
        nebulae: stats.nebulae || 0,
        stars: stats.stars || 0,
        black_holes: stats.black_holes || 0,
        neutron_stars: stats.neutron_stars || 0,
        planets: stats.planets || 0,
        moons: stats.moons || 0,
        asteroids_comets: stats.asteroids_comets || 0,
        quasars: stats.quasars || 0,
        exotic_objects: stats.exotic_objects || 0,
        inhabited: inhabitedCount
    };

    // Calculate total objects in universe
    let totalObjects = Object.values(counts).reduce((a, b) => a + b, 0);
    
    // Cap visual particle pool for mobile rendering stability (up to 500,000 density scale)
    const MAX_VISUAL_NODES = 1200;
    const scaleFactor = totalObjects > 0 ? Math.min(1.0, MAX_VISUAL_NODES / Math.min(500000, totalObjects)) : 0;

    const newNodes = [];
    let nodeId = 0;

    Object.keys(counts).forEach(cat => {
        const rawCount = counts[cat];
        const visualCount = Math.round(rawCount * scaleFactor);
        const style = CATEGORY_STYLES[cat];

        for (let i = 0; i < visualCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.pow(Math.random(), 1.5) * 300;

            newNodes.push({
                id: nodeId++,
                category: cat,
                designation: `${style.name} #${nodeId}`,
                baseX: Math.cos(angle) * dist,
                baseY: Math.sin(angle) * dist,
                size: style.size,
                color: style.color,
                glow: style.glow || false,
                ring: style.ring || false,
                pulseSpeed: 0.02 + Math.random() * 0.03,
                pulsePhase: Math.random() * Math.PI * 2,
                screenX: 0, screenY: 0
            });
        }
    });

    cosmicNodes = newNodes;
}

export async function initWebGPU() {
    console.log("🌌 [ENGINE] Initializing State-Driven Canvas Engine...");
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resize);
    resize();

    let animTime = 0;

    function renderLoop() {
        requestAnimationFrame(renderLoop);
        animTime += 0.015;

        if (!ctx || !canvas) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Background Gradient
        const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, '#121426');
        bgGrad.addColorStop(0.5, '#0A0B14');
        bgGrad.addColorStop(1, '#05050A');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        const targetScale = (Math.min(w, h) * 0.38) / 320;
        const viewScale = targetScale * cameraState.zoom;

        const cosR = Math.cos(cameraState.rotY);
        const sinR = Math.sin(cameraState.rotY);

        // Draw State-Driven Nodes
        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            
            const rx = p.baseX * cosR - p.baseY * sinR;
            const ry = p.baseX * sinR + p.baseY * cosR;

            p.screenX = cx + rx * viewScale;
            p.screenY = cy + ry * viewScale;

            const pulse = Math.sin(animTime * p.pulseSpeed * 100 + p.pulsePhase) * 0.2 + 1.0;
            const drawRadius = p.size * window.devicePixelRatio * pulse * cameraState.zoom;

            // Halo / Glow
            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, drawRadius * (p.glow ? 3.5 : 2.0), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.glow ? 0.45 : 0.2;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.95;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Selection Circle
            if (selectedNode === p) {
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 2.5 * window.devicePixelRatio;
                ctx.beginPath();
                ctx.arc(p.screenX, p.screenY, drawRadius * 3 + 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    renderLoop();

    window.selectParticleAt = function(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const tapX = (clientX - rect.left) * window.devicePixelRatio;
        const tapY = (clientY - rect.top) * window.devicePixelRatio;

        let closest = null, minDist = 50 * window.devicePixelRatio;
        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) { minDist = dist; closest = p; }
        }

        if (closest) {
            selectedNode = closest;
            const style = CATEGORY_STYLES[closest.category];
            
            if (document.getElementById('obj-name')) document.getElementById('obj-name').innerText = closest.designation;
            if (document.getElementById('inspect-title')) document.getElementById('inspect-title').innerText = closest.designation;
            if (document.getElementById('obj-sub')) document.getElementById('obj-sub').innerText = style.name;
            
            const specHTML = `
                <div class="spec-row"><span class="spec-label">Designation</span><span class="spec-value">${closest.designation}</span></div>
                <div class="spec-row"><span class="spec-label">Classification</span><span class="spec-value">${style.name}</span></div>
                <div class="spec-row"><span class="spec-label">Status</span><span class="spec-value">Active Entity</span></div>
                <div class="spec-row" style="border-bottom:none;"><span class="spec-label">Local Age</span><span class="spec-value">${(cameraState.currentAge || 0).toFixed(2)} Myr</span></div>
            `;
            if (document.getElementById('spec-name')) document.getElementById('spec-name').innerHTML = specHTML;
            if (document.getElementById('inspector-preview')) document.getElementById('inspector-preview').classList.add('active');
        }
    };
}
