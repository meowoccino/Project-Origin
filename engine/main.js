// Export camera state so touch gestures in ui/components.js can rotate/zoom
export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0
};

let particles = [];
const PARTICLE_COUNT = 700;

// Spectral classifications for tapped object metadata
const STAR_TYPES = [
    { type: 'O-Type Blue Supergiant', temp: '32,000 K', mass: '18.4 M☉', color: '#80d4ff' },
    { type: 'B-Type Main Sequence', temp: '18,500 K', mass: '7.2 M☉', color: '#a680ff' },
    { type: 'G-Type Yellow Star', temp: '5,780 K', mass: '1.0 M☉', color: '#ffd280' },
    { type: 'M-Type Red Dwarf', temp: '3,100 K', mass: '0.3 M☉', color: '#ff80a0' },
    { type: 'Neutron Star', temp: '600,000 K', mass: '1.4 M☉', color: '#40e0d0' },
    { type: 'Primordial Black Hole', temp: '0.0001 K', mass: '30.0 M☉', color: '#ffffff' }
];

function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 260;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const typeInfo = STAR_TYPES[Math.floor(Math.random() * STAR_TYPES.length)];
        const size = Math.random() * 2.2 + 0.8;

        particles.push({
            id: Math.floor(10000 + Math.random() * 90000),
            name: `Object-${Math.floor(100 + Math.random() * 900)}`,
            x, y, z,
            size,
            type: typeInfo.type,
            temp: typeInfo.temp,
            mass: typeInfo.mass,
            color: typeInfo.color,
            distanceLy: (Math.random() * 45000 + 500).toFixed(0),
            // Projected screen coordinates updated inside render loop
            screenX: -999,
            screenY: -999,
            renderSize: 0
        });
    }
}

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    if ('gpu' in navigator) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                const device = await adapter.requestDevice();
                if (device) {
                    // WebGPU context available
                }
            }
        } catch (e) {
            console.warn("WebGPU not available, fallback to 2D/3D canvas engine.", e);
        }
    }

    initCanvasFallback(container);
}

function initCanvasFallback(container) {
    container.innerHTML = ''; 
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', resize);
    resize();

    createParticles();

    let autoRotation = 0;

    // --- RAYCASTING / TAP SELECTION ---
    window.selectParticleAt = function(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const tapX = (clientX - rect.left) * window.devicePixelRatio;
        const tapY = (clientY - rect.top) * window.devicePixelRatio;

        let closestParticle = null;
        let minDistance = 45 * window.devicePixelRatio; // Touch hit radius in pixels

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.screenX < 0 || p.screenY < 0) continue;

            const dx = tapX - p.screenX;
            const dy = tapY - p.screenY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDistance) {
                minDistance = dist;
                closestParticle = p;
            }
        }

        if (closestParticle) {
            // Update Floating Inspector Preview Card
            const objName = document.getElementById('obj-name');
            const objSub = document.getElementById('obj-sub');
            const inspectorPreview = document.getElementById('inspector-preview');

            if (objName) objName.innerText = `${closestParticle.name}`;
            if (objSub) objSub.innerText = `${closestParticle.type} | ${Number(closestParticle.distanceLy).toLocaleString()} ly`;
            if (inspectorPreview) inspectorPreview.classList.add('active');

            // Update Modal Stats
            const modalTitle = document.querySelector('#modal-object-detail h2');
            const modalSubtitle = document.querySelector('#modal-object-detail .subtitle');
            if (modalTitle) modalTitle.innerText = closestParticle.name;
            if (modalSubtitle) modalSubtitle.innerText = closestParticle.type;
        }
    };

    function render() {
        requestAnimationFrame(render);

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(width, height) * 0.7);
        bgGrad.addColorStop(0, '#0a0818');
        bgGrad.addColorStop(1, '#020205');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        autoRotation += 0.0008;
        const totalRotY = cameraState.rotY + autoRotation;
        const totalRotX = cameraState.rotX;

        const cosY = Math.cos(totalRotY);
        const sinY = Math.sin(totalRotY);
        const cosX = Math.cos(totalRotX);
        const sinX = Math.sin(totalRotX);

        const zoomScale = Math.min(width, height) * 0.0035 * cameraState.zoom;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.x * sinY + p.z * cosY;

            let y1 = p.y * cosX - z1 * sinX;
            let z2 = p.y * sinX + z1 * cosX;

            const cameraDistance = 350;
            const perspective = cameraDistance / (cameraDistance + z2);

            if (perspective > 0) {
                p.screenX = cx + x1 * zoomScale * perspective;
                p.screenY = cy + y1 * zoomScale * perspective;
                p.renderSize = p.size * perspective * (window.devicePixelRatio || 1);

                ctx.beginPath();
                ctx.arc(p.screenX, p.screenY, Math.max(0.5, p.renderSize), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.size > 2 ? 8 : 0;
                ctx.fill();
            } else {
                p.screenX = -999;
                p.screenY = -999;
            }
        }
    }

    render();
}
