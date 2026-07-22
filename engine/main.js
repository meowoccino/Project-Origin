export const cameraState = { rotX: 0, rotY: 0, zoom: 1.0, currentAge: 0.0 };

let canvas, ctx;
let cosmicNodes = [];
let selectedNode = null;

const CREATIVE_NAME_PREFIXES = ["Aetheria", "Vespera", "Erebus", "Hyperion", "Chronos", "Ignis", "Thalassa", "Zephyrus", "Kaelum", "Onyx"];
const CREATIVE_NAME_SUFFIXES = ["Core", "Singularity", "Halo", "Filament", "Cluster", "Nebula", "Lobe", "Vortex", "Node", "Nursery"];

function getRealisticNodeStats(nodeIndex, currentAgeMyr) {
    const prefix = CREATIVE_NAME_PREFIXES[nodeIndex % CREATIVE_NAME_PREFIXES.length];
    const suffix = CREATIVE_NAME_SUFFIXES[(nodeIndex * 3) % CREATIVE_NAME_SUFFIXES.length];
    const designation = `${prefix} ${suffix} ${nodeIndex}`;

    let classification = "Dark Matter Halo Node";
    let temp = "15 K";
    let mass = "10^5 M_sun";
    let radius = "350 ly";

    if (currentAgeMyr < 0.38) {
        classification = "Primordial Plasma Fluctuation"; temp = "12,000 K"; mass = "Fluid Mass"; radius = "0.05 ly";
    } else if (currentAgeMyr >= 100.0 && currentAgeMyr < 500.0) {
        classification = "Population III Protostar Core"; temp = "85,000 K"; mass = "250 M_sun"; radius = "3.2 R_sun";
    } else if (currentAgeMyr >= 500.0) {
        classification = "Stellar System Node"; temp = "5,800 K"; mass = "1.2 M_sun"; radius = "1.0 R_sun";
    }

    const distCalc = Math.floor((nodeIndex * 17) % Math.max(500, currentAgeMyr * 600)) + 45;

    return {
        designation: designation,
        classification: classification,
        temp: temp,
        mass: mass,
        radius: radius,
        distOrigin: `${distCalc.toLocaleString()} ly`,
        age: `${Math.floor(currentAgeMyr * 0.85 * 1000000).toLocaleString()} Yrs`
    };
}

export async function initWebGPU() {
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

    // Generate procedural particle nodes
    cosmicNodes = [];
    const colors = ['#ffffff', '#FF8C00', '#00E5FF', '#FFD700', '#9932CC', '#8A2BE2'];
    for (let i = 0; i < 600; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 1.8) * 280;
        cosmicNodes.push({
            id: i,
            baseX: Math.cos(angle) * radius,
            baseY: Math.sin(angle) * radius,
            size: Math.random() * 3.5 + 1.5,
            color: colors[i % colors.length],
            pulseSpeed: 0.02 + Math.random() * 0.03,
            pulsePhase: Math.random() * Math.PI * 2,
            screenX: 0, screenY: 0
        });
    }

    let animTime = 0;

    function render2DHQ() {
        requestAnimationFrame(render2DHQ);
        animTime += 0.015;

        if (!ctx || !canvas) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const age = cameraState.currentAge || 0.0;

        // Clear Background with Deep Cosmic Gradient
        const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7);
        bgGrad.addColorStop(0, '#121426');
        bgGrad.addColorStop(0.5, '#0A0B14');
        bgGrad.addColorStop(1, '#05050A');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Core Cosmic Glow
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180 * window.devicePixelRatio);
        coreGrad.addColorStop(0, 'rgba(255, 140, 0, 0.15)');
        coreGrad.addColorStop(0.5, 'rgba(138, 43, 226, 0.08)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 180 * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();

        // Responsive Scale Factor so objects NEVER leave viewport
        const maxExtent = 320;
        const targetScale = (Math.min(w, h) * 0.38) / maxExtent;
        const viewScale = targetScale * cameraState.zoom;

        const cosR = Math.cos(cameraState.rotY);
        const sinR = Math.sin(cameraState.rotY);

        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            
            // Slow cosmic rotation
            const rx = p.baseX * cosR - p.baseY * sinR;
            const ry = p.baseX * sinR + p.baseY * cosR;

            p.screenX = cx + rx * viewScale;
            p.screenY = cy + ry * viewScale;

            const pulse = Math.sin(animTime * p.pulseSpeed * 100 + p.pulsePhase) * 0.3 + 1.0;
            const drawRadius = p.size * window.devicePixelRatio * pulse * cameraState.zoom;

            // Outer Radial Halo
            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, drawRadius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.25;
            ctx.fill();

            // Core Solid Particle
            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.95;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Selection Indicator
            if (selectedNode === p) {
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 2 * window.devicePixelRatio;
                ctx.beginPath();
                ctx.arc(p.screenX, p.screenY, drawRadius * 3 + 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    render2DHQ();

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
            const stats = getRealisticNodeStats(closest.id, cameraState.currentAge);
            
            if (document.getElementById('obj-name')) document.getElementById('obj-name').innerText = stats.designation;
            if (document.getElementById('inspect-title')) document.getElementById('inspect-title').innerText = stats.designation;
            if (document.getElementById('obj-sub')) document.getElementById('obj-sub').innerText = stats.classification;
            
            const specHTML = `
                <div class="spec-row"><span class="spec-label">Designation</span><span class="spec-value">${stats.designation}</span></div>
                <div class="spec-row"><span class="spec-label">Type</span><span class="spec-value">${stats.classification}</span></div>
                <div class="spec-row"><span class="spec-label">Mass</span><span class="spec-value">${stats.mass}</span></div>
                <div class="spec-row"><span class="spec-label">Radius</span><span class="spec-value">${stats.radius}</span></div>
                <div class="spec-row"><span class="spec-label">Temperature</span><span class="spec-value">${stats.temp}</span></div>
                <div class="spec-row"><span class="spec-label">Dist. from Origin</span><span class="spec-value">${stats.distOrigin}</span></div>
                <div class="spec-row" style="border-bottom:none;"><span class="spec-label">Local Age</span><span class="spec-value">${stats.age}</span></div>
            `;
            if (document.getElementById('spec-name')) document.getElementById('spec-name').innerHTML = specHTML;
            if (document.getElementById('inspector-preview')) document.getElementById('inspector-preview').classList.add('active');
        }
    };
}
