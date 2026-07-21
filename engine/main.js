export const cameraState = {
    rotX: 0,
    rotY: 0,
    zoom: 1.0
};

let particles = [];
const PARTICLE_COUNT = 600;

const CELESTIAL_TYPES = [
    { category: 'star', type: 'O-Type Blue Supergiant', temp: '32,000 K', mass: '18.4 M☉', coreColor: '#ffffff', auraColor: 'rgba(0, 191, 255, 0.85)' },
    { category: 'star', type: 'G-Type Yellow Star', temp: '5,780 K', mass: '1.0 M☉', coreColor: '#fff5cc', auraColor: 'rgba(255, 170, 0, 0.85)' },
    { category: 'star', type: 'M-Type Red Dwarf', temp: '3,100 K', mass: '0.3 M☉', coreColor: '#ffcccc', auraColor: 'rgba(255, 50, 80, 0.75)' },
    { category: 'blackhole', type: 'Primordial Black Hole', temp: '0.0001 K', mass: '30.0 M☉', coreColor: '#000000', auraColor: 'rgba(112, 0, 255, 0.95)' },
    { category: 'neutron', type: 'Magnetar / Neutron Star', temp: '600,000 K', mass: '1.4 M☉', coreColor: '#ffffff', auraColor: 'rgba(0, 255, 230, 0.95)' },
    { category: 'planet', type: 'Terrestrial Protoplanet', temp: '288 K', mass: '0.8 M⊕', coreColor: '#4d88ff', auraColor: 'rgba(64, 224, 208, 0.45)' }
];

function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 280;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        const objData = CELESTIAL_TYPES[Math.floor(Math.random() * CELESTIAL_TYPES.length)];
        const baseSize = objData.category === 'blackhole' ? 4.5 : (Math.random() * 2.5 + 1.2);

        particles.push({
            id: `OBJ-${Math.floor(10000 + Math.random() * 90000)}`,
            name: `${objData.category.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
            x, y, z,
            baseSize,
            category: objData.category,
            type: objData.type,
            temp: objData.temp,
            mass: objData.mass,
            coreColor: objData.coreColor,
            auraColor: objData.auraColor,
            distanceOrigin: Math.floor(r * 150 + 200),
            screenX: -999,
            screenY: -999
        });
    }
}

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
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

    // DIRECT ID MAPPER FOR TAP INSPECTION
    window.selectParticleAt = function(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const tapX = (clientX - rect.left) * window.devicePixelRatio;
        const tapY = (clientY - rect.top) * window.devicePixelRatio;

        let closest = null;
        let minDist = 50 * window.devicePixelRatio;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.screenX < 0) continue;
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        }

        if (closest) {
            // Floating Preview Card
            const objName = document.getElementById('obj-name');
            const objSub = document.getElementById('obj-sub');
            const preview = document.getElementById('inspector-preview');

            if (objName) objName.innerText = closest.name;
            if (objSub) objSub.innerText = `${closest.type} | ${closest.distanceOrigin.toLocaleString()} ly from Core`;
            if (preview) preview.classList.add('active');

            // Modal Title & Explicit Element ID Updates
            const modalTitle = document.getElementById('modal-obj-title');
            const modalSub = document.getElementById('modal-obj-sub');
            if (modalTitle) modalTitle.innerText = closest.name;
            if (modalSub) modalSub.innerText = closest.type;

            const elId = document.getElementById('spec-id');
            const elClass = document.getElementById('spec-class');
            const elMass = document.getElementById('spec-mass');
            const elTemp = document.getElementById('spec-temp');
            const elDist = document.getElementById('spec-dist');

            if (elId) elId.innerText = closest.id;
            if (elClass) elClass.innerText = closest.type;
            if (elMass) elMass.innerText = closest.mass;
            if (elTemp) elTemp.innerText = closest.temp;
            if (elDist) elDist.innerText = `${closest.distanceOrigin.toLocaleString()} ly`;
        }
    };

    function render() {
        requestAnimationFrame(render);

        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;

        ctx.fillStyle = '#030208';
        ctx.fillRect(0, 0, width, height);

        autoRotation += 0.0006;
        const totalRotY = cameraState.rotY + autoRotation;
        const totalRotX = cameraState.rotX;

        const cosY = Math.cos(totalRotY), sinY = Math.sin(totalRotY);
        const cosX = Math.cos(totalRotX), sinX = Math.sin(totalRotX);

        const zoomScale = Math.min(width, height) * 0.0032 * cameraState.zoom;

        particles.sort((a, b) => b.z - a.z);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.x * sinY + p.z * cosY;
            let y1 = p.y * cosX - z1 * sinX;
            let z2 = p.y * sinX + z1 * cosX;

            const cameraDistance = 380;
            const perspective = cameraDistance / (cameraDistance + z2);

            if (perspective > 0) {
                p.screenX = cx + x1 * zoomScale * perspective;
                p.screenY = cy + y1 * zoomScale * perspective;
                const size = p.baseSize * perspective * (window.devicePixelRatio || 1);

                ctx.save();

                if (p.category === 'blackhole') {
                    const diskGrad = ctx.createRadialGradient(p.screenX, p.screenY, size * 0.5, p.screenX, p.screenY, size * 2.8);
                    diskGrad.addColorStop(0, 'rgba(180, 70, 255, 0.95)');
                    diskGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.5)');
                    diskGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = diskGrad;
                    ctx.beginPath();
                    ctx.arc(p.screenX, p.screenY, size * 2.8, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(p.screenX, p.screenY, size * 0.9, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    const auraGrad = ctx.createRadialGradient(p.screenX, p.screenY, size * 0.2, p.screenX, p.screenY, size * 2.5);
                    auraGrad.addColorStop(0, p.coreColor);
                    auraGrad.addColorStop(0.4, p.auraColor);
                    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');

                    ctx.fillStyle = auraGrad;
                    ctx.beginPath();
                    ctx.arc(p.screenX, p.screenY, size * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            } else {
                p.screenX = -999;
            }
        }
    }

    render();
}
