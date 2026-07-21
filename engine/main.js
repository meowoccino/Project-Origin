export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0,
    currentAge: 0.0
};

let canvas, ctx;
let cosmicNodes = [];
const NODE_COUNT = 900;
let selectedNode = null;

// Generate 3D Cosmic Web Filaments & Galaxy Nodes
function createCosmicWeb() {
    cosmicNodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
        // Filamental clustering math
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
            // Intergalactic filament strands
            const strand = i % 12;
            const t = (Math.random() - 0.5) * 500;
            x = Math.sin(strand) * t + (Math.random() - 0.5) * 40;
            y = Math.cos(strand) * t + (Math.random() - 0.5) * 40;
            z = t + (Math.random() - 0.5) * 30;
        }

        // Monochromatic scientific astro-spectrum colors (deep space white, cyan, gold)
        const colors = ['#ffffff', '#80d4ff', '#ffffff', '#ffd280', '#00e5ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 2.0 + 0.8;

        cosmicNodes.push({
            id: `NODE-${Math.floor(10000 + Math.random() * 90000)}`,
            name: `Cluster-${Math.floor(100 + Math.random() * 900)}`,
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

    // Tap Selection Raycast Listener
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

            const objName = document.getElementById('obj-name');
            const objSub = document.getElementById('obj-sub');
            const preview = document.getElementById('inspector-preview');

            if (objName) objName.innerText = closest.name;
            if (objSub) objSub.innerText = `Cosmic Filament Node | Mass Density: Active`;
            if (preview) preview.classList.add('active');

            renderThumbStarCanvas(closest.color);

            const inspectTitle = document.getElementById('inspect-title');
            const specName = document.getElementById('spec-name');
            if (inspectTitle) inspectTitle.innerText = closest.name;
            if (specName) specName.innerText = closest.name;

            renderDetailStarCanvas(closest.color);
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

    // Dynamic Space Expansion Factor based on Cosmological Age
    // Starts dense at t = 0 (Big Bang), expands outward continuously
    const expansionFactor = Math.max(0.12, Math.min(2.5, 0.15 + (cameraState.currentAge * 0.08)));

    // Cosmic Origin Glow (Singularity at t=0)
    const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, (80 * cameraState.zoom) / expansionFactor);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(0.3, 'rgba(112, 0, 255, 0.3)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, (80 * cameraState.zoom) / expansionFactor, 0, Math.PI * 2);
    ctx.fill();

    autoRot += 0.0006;
    const totalRotY = cameraState.rotY + autoRot;
    const cosY = Math.cos(totalRotY), sinY = Math.sin(totalRotY);
    const cosX = Math.cos(cameraState.rotX + 0.3), sinX = Math.sin(cameraState.rotX + 0.3);

    const zoomScale = Math.min(width, height) * 0.0035 * cameraState.zoom;

    for (let i = 0; i < cosmicNodes.length; i++) {
        const p = cosmicNodes[i];

        // Apply Expansion Math
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
            const drawSize = p.size * perspective * (window.devicePixelRatio || 1);

            ctx.beginPath();
            ctx.arc(p.screenX, p.screenY, Math.max(0.6, drawSize), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size > 2 ? 8 : 0;
            ctx.fill();

            if (selectedNode === p) {
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.screenX, p.screenY, drawSize * 4 + 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            p.screenX = -999;
        }
    }
}

function renderThumbStarCanvas(color) {
    const thumbCanvas = document.getElementById('thumb-star-canvas');
    if (!thumbCanvas) return;
    const tctx = thumbCanvas.getContext('2d');
    tctx.clearRect(0, 0, 48, 48);

    const grad = tctx.createRadialGradient(24, 24, 2, 24, 24, 20);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    tctx.fillStyle = grad;
    tctx.beginPath();
    tctx.arc(24, 24, 20, 0, Math.PI * 2);
    tctx.fill();
}

function renderDetailStarCanvas(color) {
    const detailCanvas = document.getElementById('detail-star-canvas');
    if (!detailCanvas) return;
    const dctx = detailCanvas.getContext('2d');
    dctx.clearRect(0, 0, 340, 220);

    const cx = 170, cy = 110;

    const auraGrad = dctx.createRadialGradient(cx, cy, 30, cx, cy, 90);
    auraGrad.addColorStop(0, '#ffffff');
    auraGrad.addColorStop(0.4, color);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');

    dctx.fillStyle = auraGrad;
    dctx.beginPath();
    dctx.arc(cx, cy, 90, 0, Math.PI * 2);
    dctx.fill();
}
