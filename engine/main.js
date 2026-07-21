export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0
};

let canvas, ctx;
let galaxyParticles = [];
const PARTICLE_COUNT = 1100;
let selectedParticle = null;

function createSpiralGalaxy() {
    galaxyParticles = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const isCore = Math.random() < 0.2;
        let r, theta;

        if (isCore) {
            r = Math.random() * 45;
            theta = Math.random() * Math.PI * 2;
        } else {
            // Logarithmic spiral math
            r = 35 + Math.random() * 220;
            const arms = 2;
            const armOffset = (Math.floor(Math.random() * arms) * (2 * Math.PI / arms));
            theta = (r * 0.025) + armOffset + (Math.random() * 0.4 - 0.2);
        }

        const x = r * Math.cos(theta);
        const y = (Math.random() - 0.5) * (isCore ? 30 : 15);
        const z = r * Math.sin(theta);

        const colors = ['#ffffff', '#80d4ff', '#ffd280', '#ff80a0', '#a680ff', '#00e5ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 2.2 + 0.8;

        galaxyParticles.push({
            id: `OBJ-${Math.floor(10000 + Math.random() * 90000)}`,
            name: `Helion-${Math.floor(100 + Math.random() * 900)}`,
            x, y, z,
            size,
            color,
            distanceLy: Math.floor(r * 120 + 200),
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

    createSpiralGalaxy();

    // Tap selector Raycast logic
    window.selectParticleAt = function(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const tapX = (clientX - rect.left) * window.devicePixelRatio;
        const tapY = (clientY - rect.top) * window.devicePixelRatio;

        let closest = null;
        let minDist = 45 * window.devicePixelRatio;

        for (let i = 0; i < galaxyParticles.length; i++) {
            const p = galaxyParticles[i];
            if (p.screenX < 0) continue;
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }

        if (closest) {
            selectedParticle = closest;

            // Update bottom preview card
            const objName = document.getElementById('obj-name');
            const objSub = document.getElementById('obj-sub');
            const preview = document.getElementById('inspector-preview');

            if (objName) objName.innerText = closest.name;
            if (objSub) objSub.innerText = `Type: Star | Distance: ${closest.distanceLy.toLocaleString()} ly`;
            if (preview) preview.classList.add('active');

            // Render mini star preview canvas
            renderThumbStarCanvas(closest.color);

            // Update Detail Modal
            const inspectTitle = document.getElementById('inspect-title');
            const specName = document.getElementById('spec-name');
            const specDist = document.getElementById('spec-dist');

            if (inspectTitle) inspectTitle.innerText = closest.name;
            if (specName) specName.innerText = closest.name;
            if (specDist) specDist.innerText = `${closest.distanceLy.toLocaleString()} ly`;

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

    ctx.fillStyle = '#05050b';
    ctx.fillRect(0, 0, width, height);

    // Galaxy Core Glow Luminescence
    const coreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 120 * cameraState.zoom);
    coreGrad.addColorStop(0, 'rgba(255, 235, 200, 0.9)');
    coreGrad.addColorStop(0.3, 'rgba(112, 0, 255, 0.4)');
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120 * cameraState.zoom, 0, Math.PI * 2);
    ctx.fill();

    autoRot += 0.0008;
    const totalRotY = cameraState.rotY + autoRot;
    const cosY = Math.cos(totalRotY), sinY = Math.sin(totalRotY);
    const cosX = Math.cos(cameraState.rotX + 0.6), sinX = Math.sin(cameraState.rotX + 0.6);

    const zoomScale = Math.min(width, height) * 0.0035 * cameraState.zoom;

    for (let i = 0; i < galaxyParticles.length; i++) {
        const p = galaxyParticles[i];

        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;
        let y1 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;

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

            // Render Selection Target Ring around tapped star
            if (selectedParticle === p) {
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

    // Glowing Solar Flares Aura
    const auraGrad = dctx.createRadialGradient(cx, cy, 30, cx, cy, 90);
    auraGrad.addColorStop(0, '#ffffff');
    auraGrad.addColorStop(0.4, color);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');

    dctx.fillStyle = auraGrad;
    dctx.beginPath();
    dctx.arc(cx, cy, 90, 0, Math.PI * 2);
    dctx.fill();

    // Companion Orbiting Planet
    dctx.fillStyle = '#4d88ff';
    dctx.beginPath();
    dctx.arc(cx + 110, cy + 20, 8, 0, Math.PI * 2);
    dctx.fill();
}
