import { PhysicsEngine } from './physics.js';

export const cameraState = { rotX: 0, rotY: 0, zoom: 1.0, currentAge: 0.0 };

let canvas, ctx;
let cosmicNodes = [];
let selectedNode = null;

function getRealisticNodeStats(nodeIndex, currentAgeMyr) {
    let stats = { designation: `OBJ-${nodeIndex}`, classification: "Unknown", temp: "0 K", mass: "0 M☉", radius: "0 km", distOrigin: "0 ly", age: "0 Yrs" };
    
    const distCalc = Math.floor(Math.random() * currentAgeMyr * 800) + 120;
    stats.distOrigin = `${distCalc.toLocaleString()} ly`;
    stats.age = `${Math.floor((currentAgeMyr * 0.8) * 1000000).toLocaleString()} Yrs`;

    if (currentAgeMyr < 0.38) {
        stats.designation = `PLASMA-${nodeIndex}`; stats.classification = "Primordial Plasma Perturbation"; stats.temp = "10,000+ K"; stats.mass = "Fluid State"; stats.radius = "Sub-atomic";
    } else if (currentAgeMyr < 100.0) {
        const isDarkMatter = nodeIndex % 3 === 0;
        stats.designation = isDarkMatter ? `DM-HALO-${nodeIndex}` : `H1-CLOUD-${nodeIndex}`; stats.classification = isDarkMatter ? "Dark Matter Halo" : "Neutral Hydrogen Cloud"; stats.temp = "10 - 300 K"; stats.mass = "10^6 M☉"; stats.radius = "400 ly";
    } else if (currentAgeMyr < 500.0) {
        stats.designation = `POP-III-${nodeIndex}`; stats.classification = "Population III Protostar"; stats.temp = "100,000 K"; stats.mass = "300 M☉"; stats.radius = "4.5 R☉";
    } else {
        stats.designation = `SEQ-A-${nodeIndex}`; stats.classification = "Main Sequence Star System"; stats.temp = "5,780 K"; stats.mass = "1.0 M☉"; stats.radius = "1.0 R☉";
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

    cosmicNodes = [];
    const colors = ['#ffffff', '#FF8C00', '#ffffff', '#FFD700', '#FF8C00', '#9932CC'];
    for (let i = 0; i < 2000; i++) {
        const t = (Math.random() - 0.5) * 400;
        cosmicNodes.push({
            id: i,
            initX: Math.sin(i % 12) * t + (Math.random() - 0.5) * 30,
            initY: Math.cos(i % 12) * t + (Math.random() - 0.5) * 30,
            initZ: t + (Math.random() - 0.5) * 20,
            size: Math.random() * 2.5 + 1.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            ignitionAge: Math.random() * 0.2,
            screenX: -999, screenY: -999
        });
    }

    let autoRot = 0;
    function updateScreenCoordinates() {
        const w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2;
        const age = cameraState.currentAge || 0.0;
        
        // Controlled expansion bounds so nodes remain centered on screen
        const exp = Math.max(0.1, Math.min(1.0, 0.1 + (age * 0.005)));
        autoRot += 0.0006;
        
        const zoomScale = Math.min(w, h) * 0.004 * cameraState.zoom;
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

    const gpuEngine = new PhysicsEngine(canvas, cosmicNodes);
    const isGpuActive = await gpuEngine.init();

    if (isGpuActive) {
        console.log("⚡ [ORIGIN]: WebGPU Active.");
        function renderGPU() {
            requestAnimationFrame(renderGPU);
            updateScreenCoordinates(); 
            gpuEngine.step(cameraState);
        }
        renderGPU();
    } else {
        console.warn("⚠️ [ORIGIN]: WebGPU fallback to 2D Canvas.");
        ctx = canvas.getContext('2d');
        function render2D() {
            requestAnimationFrame(render2D);
            updateScreenCoordinates();
            
            // Deep space background
            ctx.fillStyle = '#0A0B14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const age = cameraState.currentAge || 0.0;
            for (let i = 0; i < cosmicNodes.length; i++) {
                const p = cosmicNodes[i];
                if (p.screenX < 0 || p.screenX > canvas.width || p.screenY < 0 || p.screenY > canvas.height) continue;
                
                let clr = p.color, blur = 10;
                let ds = Math.max(2.0, p.drawSize);

                if (age < 0.38) { 
                    clr = 'rgba(255, 140, 0, 0.8)'; 
                    ds *= 2.5; 
                    blur = 16; 
                } else if (age < 100.0) { 
                    clr = p.id % 3 === 0 ? 'rgba(180, 80, 255, 0.6)' : 'rgba(255, 180, 100, 0.7)'; 
                    ds *= 2.0; 
                    blur = 12; 
                }

                ctx.beginPath(); 
                ctx.arc(p.screenX, p.screenY, ds, 0, Math.PI * 2);
                ctx.fillStyle = clr; 
                ctx.shadowColor = clr; 
                ctx.shadowBlur = blur; 
                ctx.fill();
                ctx.shadowBlur = 0; // Reset for performance

                if (selectedNode === p) {
                    ctx.strokeStyle = '#FF8C00'; 
                    ctx.lineWidth = 2; 
                    ctx.beginPath(); 
                    ctx.arc(p.screenX, p.screenY, ds * 2 + 6, 0, Math.PI * 2); 
                    ctx.stroke();
                }
            }
        }
        render2D();
    }

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
            
            if (document.getElementById('obj-name')) document.getElementById('obj-name').innerText = stats.designation;
            if (document.getElementById('inspect-title')) document.getElementById('inspect-title').innerText = stats.designation;
            if (document.getElementById('obj-sub')) document.getElementById('obj-sub').innerText = stats.classification;
            
            const specHTML = `
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
