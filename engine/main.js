export let cameraState = { currentAge: 0 };
export let selectedNode = null;
export let isExploreActive = true;

let canvas, ctx;
let particles = [];
let dpr = 1;

// 1. Map all 14 new database categories to visual styles
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
    'asteroids_comets': { color: '#888888', size: 0.5, glow: 0 },
    // Dark matter acts as gravity, it should be invisible on the visual spectrum
    'dark_matter_structures': { hidden: true }
};

export function clearSelection() {
    selectedNode = null;
}

export async function initWebGPU() {
    console.log("🌌 [ENGINE] Initializing Visual Engine...");
    
    const container = document.getElementById('canvas-container');
    if (!container) return;

    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    container.appendChild(canvas);

    // FIX: Mobile Retina Display Scaling
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

export function updateCanvasFromCatalog(stats, age) {
    if (!canvas) return;
    
    let targetParticleCount = 0;
    const categoryCounts = {};

    // Calculate how many of each object we need to draw based on the real database stats
    Object.keys(visualStyles).forEach(key => {
        if (!visualStyles[key].hidden) {
            const count = Math.min(stats[key] || 0, 500); // Cap visuals at 500 per category to save mobile battery
            categoryCounts[key] = count;
            targetParticleCount += count;
        }
    });

    // Rebuild the particle array if the universe has expanded
    if (particles.length !== targetParticleCount) {
        particles = [];
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const spread = Math.min(canvas.width, canvas.height) * 0.8;

        Object.keys(categoryCounts).forEach(category => {
            const style = visualStyles[category];
            for (let i = 0; i < categoryCounts[category]; i++) {
                particles.push({
                    x: centerX + (Math.random() - 0.5) * spread,
                    y: centerY + (Math.random() - 0.5) * spread,
                    baseX: centerX + (Math.random() - 0.5) * spread,
                    baseY: centerY + (Math.random() - 0.5) * spread,
                    style: style,
                    category: category,
                    designation: `${category.toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
                    speed: Math.random() * 0.05 + 0.01,
                    angle: Math.random() * Math.PI * 2
                });
            }
        });
    }
}

// FIX: Touch controls mapped perfectly to mobile pixels
window.selectParticleAt = function(clientX, clientY) {
    if (!isExploreActive || particles.length === 0) return;
    
    // Convert the physical screen tap into retina-scaled canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const touchX = (clientX - rect.left) * scaleX;
    const touchY = (clientY - rect.top) * scaleY;
    
    let closest = null;
    let minDist = 30 * dpr; // 30-pixel generous touch radius

    particles.forEach(p => {
        const dx = p.x - touchX;
        const dy = p.y - touchY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            closest = p;
        }
    });

    if (closest) {
        selectedNode = closest;
    } else {
        clearSelection();
    }
};

function renderLoop() {
    if (ctx && canvas) {
        // Deep space background
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (isExploreActive) {
            const time = Date.now() * 0.001;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            particles.forEach(p => {
                // Gentle orbital drift
                p.angle += p.speed * 0.05;
                const orbitRadius = Math.sqrt(Math.pow(p.baseX - centerX, 2) + Math.pow(p.baseY - centerY, 2));
                p.x = centerX + Math.cos(p.angle) * orbitRadius;
                p.y = centerY + Math.sin(p.angle) * orbitRadius;

                // Draw glow
                if (p.style.glow > 0) {
                    ctx.shadowBlur = p.style.glow * dpr;
                    ctx.shadowColor = p.style.color;
                } else {
                    ctx.shadowBlur = 0;
                }

                // Draw Particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.style.size * dpr, 0, Math.PI * 2);
                ctx.fillStyle = p.style.color;
                ctx.fill();

                // Draw specialized rings for Black Holes & Quasars
                if (p.style.ring) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, (p.style.size + 2) * dpr, 0, Math.PI * 2);
                    ctx.strokeStyle = p.style.ring;
                    ctx.lineWidth = 1.5 * dpr;
                    ctx.stroke();
                }
            });

            ctx.shadowBlur = 0; // Reset shadow

            // Highlight the selected object
            if (selectedNode) {
                ctx.beginPath();
                ctx.arc(selectedNode.x, selectedNode.y, (selectedNode.style.size + 8) * dpr, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 2 * dpr;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
    requestAnimationFrame(renderLoop);
}
