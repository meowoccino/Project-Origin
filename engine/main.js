export let cameraState = { currentAge: 0 };
export let selectedNode = null;
export let isExploreActive = true;

let canvas, ctx, particles = [], dpr = 1;
const visualStyles = {
    'nebulae': { color: '#00E5FF', size: 4.5, glow: 15 },
    'protostars': { color: '#FFD700', size: 2.5, glow: 10 },
    'stars': { color: '#FFF8E7', size: 2.0, glow: 8 },
    'giants_supergiants': { color: '#FF4500', size: 5.0, glow: 20 },
    'brown_dwarfs': { color: '#8B4513', size: 1.5, glow: 4 },
    'white_dwarfs': { color: '#FFFFFF', size: 1.2, glow: 6 },
    'neutron_stars': { color: '#FF1493', size: 1.5, glow: 12 },
    'black_holes': { color: '#000000', size: 3.5, glow: 8, ring: '#4B0082' },
    'quasars': { color: '#FFFFFF', size: 4.0, glow: 25, ring: '#B026FF' },
    'planets': { color: '#4CAF50', size: 1.0, glow: 2 },
    'gas_giants': { color: '#FFB6C1', size: 1.8, glow: 3 },
    'sterile_planets': { color: '#A0AEC0', size: 1.0, glow: 1 },
    'active_biospheres': { color: '#00FF64', size: 1.2, glow: 8 },
    'moons': { color: '#D3D3D3', size: 0.8, glow: 0 },
    'asteroids_comets': { color: '#888888', size: 0.5, glow: 0 }
};

export function clearSelection() { selectedNode = null; }

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    container.appendChild(canvas);

    function resize() {
        dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
    }
    window.addEventListener('resize', resize);
    resize();
    renderLoop();
}

export function updateCanvasFromCatalog(stats) {
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const spread = Math.min(canvas.width, canvas.height) * 0.8;

    Object.keys(visualStyles).forEach(category => {
        const targetCount = Math.min(stats[category] || 0, 150);
        let currentCount = particles.filter(p => p.category === category).length;
        
        while (currentCount < targetCount) {
            particles.push({
                x: centerX + (Math.random() - 0.5) * spread, y: centerY + (Math.random() - 0.5) * spread,
                baseX: centerX + (Math.random() - 0.5) * spread, baseY: centerY + (Math.random() - 0.5) * spread,
                style: visualStyles[category], category: category, speed: Math.random() * 0.05 + 0.01, angle: Math.random() * Math.PI * 2
            });
            currentCount++;
        }
    });
}

window.selectParticleAt = function(clientX, clientY) {
    if (!isExploreActive || particles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = (clientX - rect.left) * (canvas.width / rect.width);
    const touchY = (clientY - rect.top) * (canvas.height / rect.height);
    
    let closest = null, minDist = 40 * dpr;
    particles.forEach(p => {
        const dist = Math.sqrt((p.x - touchX)**2 + (p.y - touchY)**2);
        if (dist < minDist) { minDist = dist; closest = p; }
    });
    selectedNode = closest || null;
};

function renderLoop() {
    if (ctx && canvas) {
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (isExploreActive) {
            const cx = canvas.width / 2, cy = canvas.height / 2;
            particles.forEach(p => {
                p.angle += p.speed * 0.05;
                const r = Math.sqrt((p.baseX - cx)**2 + (p.baseY - cy)**2);
                p.x = cx + Math.cos(p.angle) * r;
                p.y = cy + Math.sin(p.angle) * r;

                ctx.shadowBlur = p.style.glow * dpr;
                ctx.shadowColor = p.style.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.style.size * dpr, 0, Math.PI * 2);
                ctx.fillStyle = p.style.color; ctx.fill();

                if (p.style.ring) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, (p.style.size + 2) * dpr, 0, Math.PI * 2);
                    ctx.strokeStyle = p.style.ring; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
                }
            });
            ctx.shadowBlur = 0;
            if (selectedNode) {
                ctx.beginPath(); ctx.arc(selectedNode.x, selectedNode.y, (selectedNode.style.size + 10) * dpr, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 2 * dpr; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
            }
        }
    }
    requestAnimationFrame(renderLoop);
}
