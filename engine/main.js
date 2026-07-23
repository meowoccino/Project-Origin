export const cameraState = { rotX: 0, rotY: 0, zoom: 1.0, currentAge: 0.0, panX: 0, panY: 0 };
export let isExploreActive = true;

let canvas, ctx;
export let cosmicNodes = [];
export let selectedNode = null;

let webHubs = [];
const NUM_HUBS = 30;
let globalNodeId = 0;
let maxWebRadius = 600;

const CATEGORY_STYLES = {
    nebulae: { color: '#00E5FF', glowColor: 'rgba(0, 229, 255, 0.4)', name: 'Nebula Cloud', size: 6.0 },
    stars: { color: '#FFD700', glowColor: 'rgba(255, 215, 0, 0.5)', name: 'Stellar Core', size: 3.0 },
    black_holes: { color: '#05050A', ringColor: '#FF8C00', name: 'Singularity', size: 4.0 },
    neutron_stars: { color: '#F000FF', glowColor: 'rgba(240, 0, 255, 0.7)', name: 'Neutron Core', size: 2.2 },
    planets: { color: '#10B981', glowColor: 'rgba(16, 185, 129, 0.3)', name: 'Planetary Body', size: 2.0 },
    moons: { color: '#8C8F9F', glowColor: 'rgba(140, 143, 159, 0.2)', name: 'Satellite Moon', size: 1.4 },
    asteroids_comets: { color: '#B0B0D0', name: 'Asteroid Fragment', size: 1.2 },
    quasars: { color: '#FF5722', glowColor: 'rgba(255, 87, 34, 0.8)', name: 'Active Quasar', size: 6.0 },
    exotic_objects: { color: '#FF007A', glowColor: 'rgba(255, 0, 122, 0.5)', name: 'Exotic Artifact', size: 3.5 },
    inhabited: { color: '#00FFB2', glowColor: 'rgba(0, 255, 178, 0.8)', name: 'Inhabited World', size: 3.5 }
};

function initWebHubs() {
    webHubs = [];
    maxWebRadius = Math.min(window.innerWidth, window.innerHeight) * 1.2;
    for (let i = 0; i < NUM_HUBS; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.8) * maxWebRadius;
        webHubs.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }
}

function createWebNode(category, id) {
    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.stars;
    const hubA = webHubs[Math.floor(Math.random() * webHubs.length)];
    const hubB = webHubs[Math.floor(Math.random() * webHubs.length)];
    
    const t = Math.random();
    let x = hubA.x + (hubB.x - hubA.x) * t;
    let y = hubA.y + (hubB.y - hubA.y) * t;

    const scatter = (Math.random() > 0.6) ? 70 : 15;
    x += (Math.random() - 0.5) * scatter;
    y += (Math.random() - 0.5) * scatter;

    return {
        id: id, category: category, designation: `${style.name} #${id}`,
        baseX: x, baseY: y, size: style.size, style: style,
        pulseSpeed: 0.02 + Math.random() * 0.03, pulsePhase: Math.random() * Math.PI * 2,
        screenX: 0, screenY: 0
    };
}

export function updateCanvasFromCatalog(stats, ageGyr) {
    if (!ctx) return;
    if (webHubs.length === 0) initWebHubs();

    const inhabitedCount = (ageGyr > 0.5) ? Math.floor((stats.planets || 0) * 0.012) : 0;
    const counts = {
        nebulae: stats.nebulae || 0, stars: stats.stars || 0,
        black_holes: stats.black_holes || 0, neutron_stars: stats.neutron_stars || 0,
        planets: stats.planets || 0, moons: stats.moons || 0,
        asteroids_comets: stats.asteroids_comets || 0, quasars: stats.quasars || 0,
        exotic_objects: stats.exotic_objects || 0, inhabited: inhabitedCount
    };

    let totalObjects = Object.values(counts).reduce((a, b) => a + b, 0);
    const MAX_VISUAL_NODES = 1200;
    const scaleFactor = totalObjects > 0 ? Math.min(1.0, MAX_VISUAL_NODES / Math.min(500000, totalObjects)) : 0;

    Object.keys(counts).forEach(cat => {
        const targetCount = Math.round(counts[cat] * scaleFactor);
        const currentNodes = cosmicNodes.filter(n => n.category === cat);

        if (currentNodes.length < targetCount) {
            const toAdd = targetCount - currentNodes.length;
            for (let i = 0; i < toAdd; i++) cosmicNodes.push(createWebNode(cat, ++globalNodeId));
        } else if (currentNodes.length > targetCount) {
            const toRemove = currentNodes.length - targetCount;
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

export function clearSelection() {
    selectedNode = null;
    const preview = document.getElementById('inspector-preview');
    if (preview) {
        preview.classList.remove('active');
        preview.style.display = 'none';
    }
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
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
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
        const dpr = window.devicePixelRatio || 1;

        ctx.fillStyle = '#05070B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const driftAngle = animTime * 0.02;
        const cosD = Math.cos(driftAngle);
        const sinD = Math.sin(driftAngle);

        // Dynamic Physics-based Camera Zoom Limits
        const minDimension = Math.min(canvas.width, canvas.height);
        const minZoomFloor = (minDimension * 0.45) / maxWebRadius;
        cameraState.zoom = Math.max(minZoomFloor, Math.min(12.0, cameraState.zoom));

        const maxPanOffset = maxWebRadius * cameraState.zoom * 1.0;
        cameraState.panX = Math.max((canvas.width / 2) - maxPanOffset, Math.min((canvas.width / 2) + maxPanOffset, cameraState.panX));
        cameraState.panY = Math.max((canvas.height / 2) - maxPanOffset, Math.min((canvas.height / 2) + maxPanOffset, cameraState.panY));

        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            
            const rx = p.baseX * cosD - p.baseY * sinD;
            const ry = p.baseX * sinD + p.baseY * cosD;

            p.screenX = cameraState.panX + (rx * cameraState.zoom * dpr);
            p.screenY = cameraState.panY + (ry * cameraState.zoom * dpr);

            if (p.screenX < -100 || p.screenX > canvas.width + 100 || p.screenY < -100 || p.screenY > canvas.height + 100) continue;

            const pulse = Math.sin(animTime * p.pulseSpeed * 100 + p.pulsePhase) * 0.15 + 1.0;
            const radius = Math.max(1.0, p.size * dpr * pulse * Math.sqrt(cameraState.zoom));

            if (p.category === 'black_holes') {
                const grad = ctx.createRadialGradient(p.screenX, p.screenY, radius * 0.5, p.screenX, p.screenY, radius * 3.0);
                grad.addColorStop(0, 'rgba(255, 140, 0, 0.9)');
                grad.addColorStop(0.5, 'rgba(138, 43, 226, 0.4)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, radius * 3.0, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, radius * 1.1, 0, Math.PI * 2); ctx.fill();
            } else {
                if (p.style.glowColor) {
                    const glowGrad = ctx.createRadialGradient(p.screenX, p.screenY, 0, p.screenX, p.screenY, radius * 3.2);
                    glowGrad.addColorStop(0, p.style.glowColor);
                    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath(); ctx.arc(p.screenX, p.screenY, radius * 3.2, 0, Math.PI * 2); ctx.fill();
                }

                ctx.fillStyle = p.style.color;
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, radius, 0, Math.PI * 2); ctx.fill();
            }

            if (selectedNode === p) {
                ctx.strokeStyle = '#FF8C00'; 
                ctx.lineWidth = 2.0 * dpr;
                ctx.beginPath(); ctx.arc(p.screenX, p.screenY, radius * 3.5 + 8, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }

    renderLoop();

    window.selectParticleAt = function(clientX, clientY) {
        const dpr = window.devicePixelRatio || 1;
        const tapX = clientX * dpr;
        const tapY = clientY * dpr;

        let closest = null, minDist = 40 * dpr;
        for (let i = 0; i < cosmicNodes.length; i++) {
            const p = cosmicNodes[i];
            const dist = Math.hypot(tapX - p.screenX, tapY - p.screenY);
            if (dist < minDist) { minDist = dist; closest = p; }
        }

        const preview = document.getElementById('inspector-preview');
        if (closest) {
            selectedNode = closest;
            const styleName = CATEGORY_STYLES[closest.category].name;
            
            // Duplicate Naming Fix Logic
            let titleText = closest.designation;
            let subText = styleName;
            
            if (titleText.toLowerCase() === subText.toLowerCase()) {
                titleText = `${styleName} #${closest.id}`;
            }

            document.getElementById('obj-name').innerText = titleText;
            document.getElementById('obj-sub').innerText = subText;
            preview.style.display = 'flex';
            preview.classList.add('active');

            const driftAngle = animTime * 0.02;
            const cosD = Math.cos(driftAngle);
            const sinD = Math.sin(driftAngle);
            const rx = closest.baseX * cosD - closest.baseY * sinD;
            const ry = closest.baseX * sinD + closest.baseY * cosD;

            cameraState.panX = (canvas.width / 2) - (rx * cameraState.zoom * dpr);
            cameraState.panY = (canvas.height / 2) - (ry * cameraState.zoom * dpr) - (90 * dpr);
            
        } else {
            clearSelection();
        }
    };
}
