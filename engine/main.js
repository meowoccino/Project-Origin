// Export camera state so ui/components.js touch gestures can update it
export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0
};

let particles = [];
const PARTICLE_COUNT = 700;

function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Distribute particles in a 3D spherical galaxy cloud
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 260;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        // Stellar spectrum colors
        const colors = ['#ffffff', '#80d4ff', '#ffd280', '#ff80a0', '#a680ff', '#40e0d0'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 2.2 + 0.8;

        particles.push({ x, y, z, color, size });
    }
}

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Check for WebGPU browser capability
    if ('gpu' in navigator) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                const device = await adapter.requestDevice();
                if (device) {
                    // WebGPU initialized successfully
                }
            }
        } catch (e) {
            console.warn("WebGPU not available on this browser, using 2D fallback renderer.", e);
        }
    }

    // Mobile-friendly 2D/3D projected fallback engine
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

    function render() {
        requestAnimationFrame(render);

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        // Cosmic space background gradient
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

        // Render particles with 3D projection
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Y Axis Rotation
            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.x * sinY + p.z * cosY;

            // X Axis Rotation
            let y1 = p.y * cosX - z1 * sinX;
            let z2 = p.y * sinX + z1 * cosX;

            // Perspective math
            const cameraDistance = 350;
            const perspective = cameraDistance / (cameraDistance + z2);

            if (perspective > 0) {
                const screenX = cx + x1 * zoomScale * perspective;
                const screenY = cy + y1 * zoomScale * perspective;
                const drawSize = p.size * perspective * (window.devicePixelRatio || 1);

                ctx.beginPath();
                ctx.arc(screenX, screenY, Math.max(0.5, drawSize), 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.size > 2 ? 8 : 0;
                ctx.fill();
            }
        }
    }

    render();
}
