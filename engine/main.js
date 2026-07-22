import { PhysicsEngine } from './physics.js';

export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0,
    currentAge: 0.0
};

let canvas, ctx;
let cosmicNodes = [];
let selectedNode = null;

function getRealisticNodeStats(nodeIndex, currentAgeMyr) {
    let stats = { designation: `Object-${nodeIndex}`, classification: "Unknown", temp: "0 K", mass: "0 M☉" };
    if (currentAgeMyr < 0.38) {
        stats.designation = `Plasma-Wave-${nodeIndex}`; stats.classification = "Primordial Plasma Perturbation"; stats.temp = "4,000 - 10,000+ K"; stats.mass = "Fluid State";
    } else if (currentAgeMyr < 100.0) {
        const isDarkMatter = nodeIndex % 3 === 0;
        stats.designation = isDarkMatter ? `DM-Halo-${nodeIndex}` : `H1-Region-${nodeIndex}`; stats.classification = isDarkMatter ? "Dark Matter Halo" : "Neutral Hydrogen Cloud"; stats.temp = "10 - 300 K"; stats.mass = "10^5 - 10^6 M☉"; 
    } else if (currentAgeMyr < 500.0) {
        stats.designation = `PopIII-${nodeIndex}`; stats.classification = "Population III Hypermassive Star"; stats.temp = "100,000+ K"; stats.mass = "100 - 1000 M☉";
    } else {
        stats.designation = `Star-${nodeIndex}`; stats.classification = "Main Sequence Star System"; stats.temp = "3,000 - 30,000 K"; stats.mass = "0.1 - 50 M☉";
    }
    return stats;
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

    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resize);
    resize();

    // 1. ATTEMPT TRUE WEBGPU PHYSICS
    const gpuEngine = new PhysicsEngine(canvas, 10000);
    const isGpuActive = await gpuEngine.init();

    if (isGpuActive) {
        console.log("⚡ [ORIGIN]: WebGPU Active. True physics compute shaders running.");
        
        function renderGPU() {
            requestAnimationFrame(renderGPU);
            gpuEngine.step(cameraState);
        }
        renderGPU();

    } else {
        // 2. FALLBACK TO 2D ENGINE (If Mobile Browser fails WebGPU)
        console.warn("⚠️ [ORIGIN]: WebGPU rejected by mobile hardware. Falling back to 2D Canvas Engine.");
        
        ctx = canvas.getContext('2d');
        cosmicNodes = [];
        for (let i = 0; i < 900; i++) {
            const t = (Math.random() - 0.5) * 500;
            cosmicNodes.push({
                id: i,
                initX: Math.sin(i % 12) * t + (Math.random() - 0.5) * 40,
                initY: Math.cos(i % 12) * t + (Math.random() - 0.5) * 40,
                initZ: t + (Math.random() - 0.5) * 30,
                size: Math.random() * 2.0 + 0.8,
                screenX: -999, screenY: -999
            });
        }

        let autoRot = 0;
        function render2D() {
            requestAnimationFrame(render2D);
            const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
            ctx.fillStyle = '#030308';
            ctx.fillRect(0, 0, w, h);

            const age = cameraState.currentAge || 0.0;
            const exp = Math.max(0.05, Math.min(2.5, 0.05 + (age * 0.12)));
            autoRot += 0.0006;
            
            const zoomScale = Math.min(w, h) * 0.0035 * cameraState.zoom;
            const cosY = Math.cos(cameraState.rotY + autoRot), sinY = Math.sin(cameraState.rotY + autoRot);
            const cosX = Math.cos(cameraState.rotX + 0.3), sinX = Math.sin(cameraState.rotX + 0.3);

            for (let i = 0; i < cosmicNodes.length; i++) {
                const p = cosmicNodes[i];
                let x1 = (p.initX * exp) * cosY - (p.initZ * exp) * sinY;
                let z1 = (p.initX * exp) * sinY + (p.initZ * exp) * cosY;
                let y1 = (p.initY * exp) * cosX - z1 * sinX;
                let z2 = (p.initY * exp) * sinX + z1 * cosX;

                const persp = 380 / (380 + z2);
                if (persp > 0) {
                    p.screenX = cx + x1 * zoomScale * persp;
                    p.screenY = cy + y1 * zoomScale * persp;
                    let ds = p.size * persp * window.devicePixelRatio;
                    let clr = '#00e5ff', blur = 0;

                    if (age < 0.38) { clr = 'rgba(255, 120, 50, 0.4)'; ds *= 3; blur = 15; }
                    else if (age < 100.0) { clr = p.id % 3 === 0 ? 'rgba(40, 10, 60, 0.15)' : 'rgba(90, 20, 130, 0.2)'; ds *= 4; blur = 12; }

                    ctx.beginPath();
                    ctx.arc(p.screenX, p.screenY, Math.max(0.6, ds), 0, Math.PI * 2);
                    ctx.fillStyle = clr; ctx.shadowColor = clr; ctx.shadowBlur = blur;
                    ctx.fill();

                    if (selectedNode === p) {
                        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
                        ctx.beginPath(); ctx.arc(p.screenX, p.screenY, ds * 2 + 6, 0, Math.PI * 2); ctx.stroke();
                    }
                } else { p.screenX = -999; }
            }
        }
        render2D();
    }

    // Touch selection logic (Works for both GPU and 2D modes)
    window.selectParticleAt = function(clientX, clientY) {
        if (isGpuActive) return; // Touch picking is currently only configured for 2D mode
        const rect = canvas.getBoundingClientRect();
        const tapX = (clientX - rect.left) * window.devicePixelRatio;
        const tapY = (clientY - rect.top) * window.devicePixelRatio;

        let closest = null, minDist = 45 * window.devicePixelRatio;
        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            if (p.screenX < 0) continue;
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) { minDist = dist; closest = p; }
        }

        if (closest) {
            selectedNode = closest;
            const stats = getRealisticNodeStats(closest.id, cameraState.currentAge);
            const titles = ['obj-name', 'inspect-title'];
            titles.forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = stats.designation; });
            if (document.getElementById('obj-sub')) document.getElementById('obj-sub').innerText = stats.classification;
            if (document.getElementById('spec-name')) document.getElementById('spec-name').innerHTML = `${stats.classification}<br/>Temp: ${stats.temp}<br/>Mass: ${stats.mass}`;
            if (document.getElementById('inspector-preview')) document.getElementById('inspector-preview').classList.add('active');
        }
    };
}
