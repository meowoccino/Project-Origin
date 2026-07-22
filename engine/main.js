import { PhysicsEngine } from './physics.js';

export const cameraState = { rotX: 0, rotY: 0, zoom: 1.0, currentAge: 0.0 };

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

    // Generate Nodes
    cosmicNodes = [];
    const colors = ['#ffffff', '#80d4ff', '#ffffff', '#ffd280', '#00e5ff'];
    for (let i = 0; i < 2500; i++) {
        const t = (Math.random() - 0.5) * 500;
        cosmicNodes.push({
            id: i,
            initX: Math.sin(i % 12) * t + (Math.random() - 0.5) * 40,
            initY: Math.cos(i % 12) * t + (Math.random() - 0.5) * 40,
            initZ: t + (Math.random() - 0.5) * 30,
            size: Math.random() * 2.0 + 0.8,
            color: colors[Math.floor(Math.random() * colors.length)],
            ignitionAge: Math.random() * 0.5,
            screenX: -999, screenY: -999
        });
    }

    // Calculate invisible touch math for JS picking
    let autoRot = 0;
    function updateScreenCoordinates() {
        const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
        const age = cameraState.currentAge || 0.0;
        const exp = Math.max(0.05, Math.min(2.5, 0.05 + (age * 0.12)));
        autoRot += 0.0006;
        
        const zoomScale = Math.min(w, h) * 0.0035 * cameraState.zoom;
        const cosY = Math.cos(cameraState.rotY + autoRot), sinY = Math.sin(cameraState.rotY + autoRot);
        const cosX = Math.cos(cameraState.rotX + 0.3), sinX = Math.sin(cameraState.rotX + 0.3);

        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            if (age < p.ignitionAge) { p.screenX = -999; continue; }
            let x1 = (p.initX * exp) * cosY - (p.initZ * exp) * sinY;
            let z1 = (p.initX * exp) * sinY + (p.initZ * exp) * cosY;
            let y1 = (p.initY * exp) * cosX - z1 * sinX;
            let z2 = (p.initY * exp) * sinX + z1 * cosX;

            const persp = 380 / (380 + z2);
            if (persp > 0) {
                p.screenX = cx + x1 * zoomScale * persp;
                p.screenY = cy + y1 * zoomScale * persp;
                p.drawSize = p.size * persp * window.devicePixelRatio;
            } else { p.screenX = -999; }
        }
    }

    // Init Engine
    const gpuEngine = new PhysicsEngine(canvas, cosmicNodes);
    const isGpuActive = await gpuEngine.init();

    if (isGpuActive) {
        console.log("⚡ [ORIGIN]: WebGPU Active (Dumb Renderer Mode).");
        function renderGPU() {
            requestAnimationFrame(renderGPU);
            updateScreenCoordinates(); // JS calculates where nodes are for touch!
            gpuEngine.step(cameraState); // GPU handles all the heavy drawing!
        }
        renderGPU();
    } else {
        console.warn("⚠️ [ORIGIN]: WebGPU fallback to 2D Canvas.");
        ctx = canvas.getContext('2d');
        function render2D() {
            requestAnimationFrame(render2D);
            updateScreenCoordinates();
            ctx.fillStyle = '#030308';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const age = cameraState.currentAge || 0.0;
            for (let i = 0; i < cosmicNodes.length; i++) {
                const p = cosmicNodes[i];
                if (p.screenX < 0) continue;
                
                let clr = p.color, blur = 0, ds = p.drawSize;
                if (age < 0.38) { clr = 'rgba(255, 120, 50, 0.4)'; ds *= 3; blur = 15; }
                else if (age < 100.0) { clr = p.id % 3 === 0 ? 'rgba(40, 10, 60, 0.15)' : 'rgba(90, 20, 130, 0.2)'; ds *= 4; blur = 12; }

                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, Math.max(0.6, ds), 0, Math.PI * 2);
                ctx.fillStyle = clr; ctx.shadowColor = clr; ctx.shadowBlur = blur; ctx.fill();

                if (selectedNode === p) {
                    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.arc(p.screenX, p.screenY, ds * 2 + 6, 0, Math.PI * 2); ctx.stroke();
                }
            }
        }
        render2D();
    }

    // Universal Touch Picking (Works for both GPU and 2D!)
    window.selectParticleAt = function(clientX, clientY) {
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
