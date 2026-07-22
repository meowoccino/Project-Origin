export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0,
    currentAge: 0.0 // Age in Millions of Years (Myr)
};

let canvas, ctx;
let cosmicNodes = [];
const NODE_COUNT = 900;
let selectedNode = null;

// STRICT COSMOLOGICAL STATE CALCULATOR
function getRealisticNodeStats(nodeIndex, currentAgeMyr) {
    let stats = {
        designation: `Object-${nodeIndex}`,
        classification: "Unknown",
        temp: "0 K",
        mass: "0 M☉",
        notes: ""
    };

    if (currentAgeMyr < 0.38) {
        // Pre-Recombination: Photons trapped, super hot plasma
        stats.designation = `Plasma-Wave-${nodeIndex}`;
        stats.classification = "Primordial Plasma Perturbation";
        stats.temp = "4,000 - 10,000+ K";
        stats.mass = "Fluid State";
    } 
    else if (currentAgeMyr < 100.0) {
        // The Dark Ages: 380k to 100M Years. NO STARS.
        const isDarkMatter = nodeIndex % 3 === 0;
        stats.designation = isDarkMatter ? `DM-Halo-${nodeIndex}` : `H1-Region-${nodeIndex}`;
        stats.classification = isDarkMatter ? "Dark Matter Halo" : "Neutral Hydrogen Cloud";
        stats.temp = "10 - 300 K"; 
        stats.mass = "10^5 - 10^6 M☉"; 
    } 
    else if (currentAgeMyr < 500.0) {
        // Cosmic Dawn: 100M to 500M Years. First stars ignite.
        stats.designation = `PopIII-${nodeIndex}`;
        stats.classification = "Population III Hypermassive Star";
        stats.temp = "100,000+ K";
        stats.mass = "100 - 1000 M☉";
    } 
    else {
        // Stelliferous Era: 500M+ Years. Galaxies and modern stars form.
        stats.designation = `Star-${nodeIndex}`;
        stats.classification = "Main Sequence Star System";
        stats.temp = "3,000 - 30,000 K";
        stats.mass = "0.1 - 50 M☉";
    }

    return stats;
}

function createCosmicWeb() {
    cosmicNodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
        const isClusterCore = Math.random() < 0.15;
        let x, y, z;

        if (isClusterCore) {
            const r = Math.random() * 60;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);
        } else {
            const strand = i % 12;
            const t = (Math.random() - 0.5) * 500;
            x = Math.sin(strand) * t + (Math.random() - 0.5) * 40;
            y = Math.cos(strand) * t + (Math.random() - 0.5) * 40;
            z = t + (Math.random() - 0.5) * 30;
        }

        const colors = ['#ffffff', '#80d4ff', '#ffffff', '#ffd280', '#00e5ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 2.0 + 0.8;

        cosmicNodes.push({
            id: i,
            initX: x, initY: y, initZ: z,
            size,
            color,
            screenX: -999,
            screenY: -999
        });
    }
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
    if (!ctx) return;

    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resize);
    resize();

    createCosmicWeb();

    window.selectParticleAt = function(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const tapX = (clientX - rect.left) * window.devicePixelRatio;
        const tapY = (clientY - rect.top) * window.devicePixelRatio;

        let closest = null;
        let minDist = 45 * window.devicePixelRatio;

        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            if (p.screenX < 0) continue;
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }

        if (closest) {
            selectedNode = closest;
            
            // Get realistic stats based on current universe age
            const currentStats = getRealisticNodeStats(closest.id, cameraState.currentAge);

            const objName = document.getElementById('obj-name');
            const objSub = document.getElementById('obj-sub');
            const preview = document.getElementById('inspector-preview');
            const inspectTitle = document.getElementById('inspect-title');
            const specName = document.getElementById('spec-name');

            if (objName) objName.innerText = currentStats.designation;
            if (objSub) objSub.innerText = currentStats.classification;
            if (preview) preview.classList.add('active');
            
            if (inspectTitle) inspectTitle.innerText = currentStats.designation;
            if (specName) {
                // Using the specName area to display the dynamically generated stats
                specName.innerHTML = `${currentStats.classification}<br/>Temp: ${currentStats.temp}<br/>Mass: ${currentStats.mass}`;
            }
        }
    };

    render();
}

let autoRot = 0;

function render() {
    requestAnimationFrame(render);

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, width, height);

    const age = cameraState.currentAge || 0.0;

    // Big Bang Expansion
    const expansionFactor = Math.max(0.05, Math.min(2.5, 0.05 + (age * 0.12)));

    // Render Primordial Singularity Glow
    const singularityRadius = Math.max(4, (120 * cameraState.zoom) / (1.0 + age * 2.0));
    const coreGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, singularityRadius);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.3, 'rgba(112, 0, 255, 0.6)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, singularityRadius, 0, Math.PI * 2);
    ctx.fill();

    autoRot += 0.0006;
    const totalRotY = cameraState.rotY + autoRot;
    const cosY = Math.cos(totalRotY), sinY = Math.sin(totalRotY);
    const cosX = Math.cos(cameraState.rotX + 0.3), sinX = Math.sin(cameraState.rotX + 0.3);

    const zoomScale = Math.min(width, height) * 0.0035 * cameraState.zoom;

    for (let i = 0; i < cosmicNodes.length; i++) {
        const p = cosmicNodes[i];

        const expX = p.initX * expansionFactor;
        const expY = p.initY * expansionFactor;
        const expZ = p.initZ * expansionFactor;

        let x1 = expX * cosY - expZ * sinY;
        let z1 = expX * sinY + expZ * cosY;
        let y1 = expY * cosX - z1 * sinX;
        let z2 = expY * sinX + z1 * cosX;

        const cameraDist = 380;
        const perspective = cameraDist / (cameraDist + z2);

        if (perspective > 0) {
            p.screenX = cx + x1 * zoomScale * perspective;
            p.screenY = cy + y1 * zoomScale * perspective;
            let drawSize = p.size * perspective * (window.devicePixelRatio || 1);
            
            // DYNAMIC VISUAL PHYSICS BASED ON AGE
            let drawColor = p.color;
            let glowBlur = p.size > 2 ? 8 : 0;

            if (age < 0.38) {
                // Hot opaque plasma
                drawColor = 'rgba(255, 120, 50, 0.4)';
                drawSize *= 3;
                glowBlur = 15;
            } else if (age < 100.0) {
                // Dark ages: Faint, diffuse cold gas and dark matter halos
                const isDarkMatter = p.id % 3 === 0;
                drawColor = isDarkMatter ? 'rgba(40, 10, 60, 0.15)' : 'rgba(90, 20, 130, 0.2)';
                drawSize *= 4; 
                glowBlur = 12;
            }

            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, Math.max(0.6, drawSize), 0, Math.PI * 2);
            ctx.fillStyle = drawColor;
            ctx.shadowColor = drawColor;
            ctx.shadowBlur = glowBlur;
            ctx.fill();

            if (selectedNode === p) {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 0; // Reset shadow for selection ring
                ctx.beginPath();
                ctx.arc(p.screenX, p.screenY, drawSize * 2 + 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            p.screenX = -999;
        }
    }
}
