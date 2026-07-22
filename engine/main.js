export const cameraState = { rotX: 0, rotY: 0, zoom: 1.0, currentAge: 0.0, panX: 0, panY: 0 };
export let isExploreActive = true;

let canvas, ctx;
export let cosmicNodes = [];
export let selectedNode = null;

let webHubs = [];
const NUM_HUBS = 35;
let globalNodeId = 0;

const CATEGORY_STYLES = {
    nebulae: { color: '#9932CC', name: 'Nebula Gas Cloud', size: 4.5 },
    stars: { color: '#FFD700', name: 'Stellar Core', size: 2.5 },
    black_holes: { color: '#4A4D66', name: 'Singularity', size: 3.5, ring: true },
    neutron_stars: { color: '#00E5FF', name: 'Neutron Core', size: 2.0 },
    planets: { color: '#CD7F32', name: 'Planetary Body', size: 1.8 },
    moons: { color: '#8C8F9F', name: 'Satellite Moon', size: 1.2 },
    asteroids_comets: { color: '#B0B0D0', name: 'Asteroid Fragment', size: 1.0 },
    quasars: { color: '#FFFFFF', name: 'Active Quasar', size: 5.0, glow: true },
    exotic_objects: { color: '#FF69B4', name: 'Exotic Artifact', size: 3.0 },
    inhabited: { color: '#00E5FF', name: 'Inhabited World', size: 3.2, glow: true }
};

function initWebHubs() {
    webHubs = [];
    const bounds = Math.max(window.innerWidth, window.innerHeight) * 2.5; 
    for (let i = 0; i < NUM_HUBS; i++) {
        webHubs.push({
            x: (Math.random() - 0.5) * bounds,
            y: (Math.random() - 0.5) * bounds
        });
    }
}

function createWebNode(category, id) {
    const style = CATEGORY_STYLES[category];
    const hubA = webHubs[Math.floor(Math.random() * webHubs.length)];
    const hubB = webHubs[Math.floor(Math.random() * webHubs.length)];
    
    const t = Math.random();
    let x = hubA.x + (hubB.x - hubA.x) * t;
    let y = hubA.y + (hubB.y - hubA.y) * t;

    const scatter = (Math.random() > 0.6) ? 120 : 20;
    x += (Math.random() - 0.5) * scatter;
    y += (Math.random() - 0.5) * scatter;

    return {
        id: id, category: category, designation: `${style.name} #${id}`,
        baseX: x, baseY: y, size: style.size, color: style.color, glow: style.glow || false,
        pulseSpeed: 0.02 + Math.random() * 0.03, pulsePhase: Math.random() * Math.PI * 2,
        screenX: 0, screenY: 0
    };
}

export function updateCanvasFromCatalog(stats, ageMyr) {
    if (!ctx) return;
    if (webHubs.length === 0) initWebHubs();

    const inhabitedCount = (ageMyr > 500.0) ? Math.floor((stats.planets || 0) * 0.012) : 0;
    const counts = {
        nebulae: stats.nebulae || 0, stars: stats.stars || 0,
        black_holes: stats.black_holes || 0, neutron_stars: stats.neutron_stars || 0,
        planets: stats.planets || 0, moons: stats.moons || 0,
        asteroids_comets: stats.asteroids_comets || 0, quasars: stats.quasars || 0,
        exotic_objects: stats.exotic_objects || 0, inhabited: inhabitedCount
    };

    let totalObjects = Object.values(counts).reduce((a, b) => a + b, 0);
    const MAX_VISUAL_NODES = 1500;
    const scaleFactor = totalObjects > 0 ? Math.min(1.0, MAX_VISUAL_NODES / Math.min(500000, totalObjects)) : 0;

    Object.keys(counts).forEach(cat => {
        const targetVisualCount = Math.round(counts[cat] * scaleFactor);
        const currentVisualNodes = cosmicNodes.filter(n => n.category === cat);

        if (currentVisualNodes.length < targetVisualCount) {
            const toAdd = targetVisualCount - currentVisualNodes.length;
            for (let i = 0; i < toAdd; i++) cosmicNodes.push(createWebNode(cat, ++globalNodeId));
        } else if (currentVisualNodes.length > targetVisualCount) {
            const toRemove = currentVisualNodes.length - targetVisualCount;
            for (let i = 0; i < toRemove; i++) {
                const index = cosmicNodes.findIndex(n => n.category === cat);
                if (index > -1) {
                    if (selectedNode && cosmicNodes[index].id === selectedNode.id) {
                        selectedNode = null;
                        document.getElementById('inspector-preview')?.classList.remove('active');
                    }
                    cosmicNodes.splice(index, 1);
                }
            }
        }
    });
}

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    container.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        if (!selectedNode) {
            cameraState.panX = canvas.width / 2;
            cameraState.panY = canvas.height / 2;
        }
    }
    window.addEventListener('resize', resize);
    resize();

    let animTime = 0;

    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        if (!isExploreActive) return;

        animTime += 0.015;
        ctx.fillStyle = '#0A0B14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            
            p.screenX = cameraState.panX + (p.baseX * cameraState.zoom);
            p.screenY = cameraState.panY + (p.baseY * cameraState.zoom);

            if (p.screenX < -50 || p.screenX > canvas.width + 50 || p.screenY < -50 || p.screenY > canvas.height + 50) continue;

            const pulse = Math.sin(animTime * p.pulseSpeed * 100 + p.pulsePhase) * 0.2 + 1.0;
            const drawRadius = Math.max(0.5, p.size * window.devicePixelRatio * pulse * Math.sqrt(cameraState.zoom));

            if (p.glow) {
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, drawRadius * 3.5, 0, Math.PI * 2);
                ctx.fillStyle = p.color; ctx.globalAlpha = 0.3; ctx.fill();
            }

            ctx.beginPath(); ctx.arc(p.screenX, p.screenY, drawRadius, 0, Math.PI * 2);
            ctx.fillStyle = p.color; ctx.globalAlpha = 0.95; ctx.fill();
            
            if (selectedNode === p) {
                ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 2.5 * window.devicePixelRatio;
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, drawRadius * 3 + 10, 0, Math.PI * 2); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1.0;
    }

    renderLoop();

    window.selectParticleAt = function(clientX, clientY) {
        const tapX = clientX * window.devicePixelRatio;
        const tapY = clientY * window.devicePixelRatio;

        let closest = null, minDist = 40 * window.devicePixelRatio;
        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) { minDist = dist; closest = p; }
        }

        const preview = document.getElementById('inspector-preview');
        if (closest) {
            selectedNode = closest;
            document.getElementById('obj-name').innerText = closest.designation;
            document.getElementById('obj-sub').innerText = CATEGORY_STYLES[closest.category].name;
            preview.classList.add('active');

            cameraState.panX = (canvas.width / 2) - (closest.baseX * cameraState.zoom);
            cameraState.panY = (canvas.height / 2) - (closest.baseY * cameraState.zoom) - (80 * window.devicePixelRatio);
            
        } else {
            selectedNode = null;
            preview.classList.remove('active');
        }
    };
}
