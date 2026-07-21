import { shaderCode } from './shaders.js';
import { fetchCosmicState, subscribeToCosmicUpdates } from '../services/supabase.js';

let device, context, format;
let computePipeline, renderPipeline;
let particleBuffer, paramsBuffer, bindGroup, readBuffer;

const MAX_PARTICLES = 500000;
let activeParticleCount = 4000;
let cosmicAgeMyr = 0.0;

export const cameraState = {
    zoom: 1.0,
    rotX: 0.4,
    rotY: 0.6,
};

// Fallback 2D simulation state
let canvas2D, ctx2D, dpr;
let fallbackParticles = [];

function updateLiveBadge(mode) {
    const badges = document.querySelectorAll('.badge-live, .badge-live-sm');
    badges.forEach(badge => {
        badge.innerHTML = `<span class="badge-dot"></span> LIVE (${mode})`;
    });
}

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    container.appendChild(canvas);

    // 1. Try WebGPU Engine
    if (navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                device = await adapter.requestDevice();
                context = canvas.getContext('webgpu');
                format = navigator.gpu.getPreferredCanvasFormat();

                context.configure({
                    device,
                    format,
                    alphaMode: 'premultiplied',
                });

                const shaderModule = device.createShaderModule({ code: shaderCode });

                // Add COPY_SRC so we can read the physics buffer back to the CPU for raycasting
                particleBuffer = device.createBuffer({
                    size: MAX_PARTICLES * 64,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                });

                paramsBuffer = device.createBuffer({
                    size: 32,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });

                // Dedicated read-back buffer for touch selection
                readBuffer = device.createBuffer({
                    size: MAX_PARTICLES * 64,
                    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                });

                computePipeline = device.createComputePipeline({
                    layout: 'auto',
                    compute: { module: shaderModule, entryPoint: 'update_physics' },
                });

                bindGroup = device.createBindGroup({
                    layout: computePipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: { buffer: particleBuffer } },
                        { binding: 1, resource: { buffer: paramsBuffer } },
                    ],
                });

                renderPipeline = device.createRenderPipeline({
                    layout: 'auto',
                    vertex: { module: shaderModule, entryPoint: 'vs_main' },
                    fragment: {
                        module: shaderModule,
                        entryPoint: 'fs_main',
                        targets: [{
                            format: format,
                            blend: {
                                color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                                alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
                            }
                        }],
                    },
                    primitive: { topology: 'triangle-list' },
                });

                const initPipeline = device.createComputePipeline({
                    layout: 'auto',
                    compute: { module: shaderModule, entryPoint: 'init_big_bang' },
                });

                const initBindGroup = device.createBindGroup({
                    layout: initPipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: { buffer: particleBuffer } },
                        { binding: 1, resource: { buffer: paramsBuffer } },
                    ],
                });

                const initParams = new Float32Array([
                    0.0, 0.68, 0.016, 0,
                    cameraState.zoom, cameraState.rotX, cameraState.rotY,
                    window.innerWidth / window.innerHeight
                ]);
                new Uint32Array(initParams.buffer)[3] = MAX_PARTICLES;
                device.queue.writeBuffer(paramsBuffer, 0, initParams.buffer);

                const commandEncoder = device.createCommandEncoder();
                const initPass = commandEncoder.beginComputePass();
                initPass.setPipeline(initPipeline);
                initPass.setBindGroup(0, initBindGroup);
                initPass.dispatchWorkgroups(Math.ceil(MAX_PARTICLES / 256));
                initPass.end();

                device.queue.submit([commandEncoder.finish()]);

                window.addEventListener('resize', () => {
                    dpr = window.devicePixelRatio || 1;
                    canvas.width = window.innerWidth * dpr;
                    canvas.height = window.innerHeight * dpr;
                });

                updateLiveBadge('GPU');
                setupSupabaseSync();
                requestAnimationFrame(renderLoopGPU);
                return;
            }
        } catch (err) {
            console.warn("WebGPU initialization failed:", err);
        }
    }

    // 2. Fallback: High-Performance 2D Canvas Engine
    initFallback2DEngine(canvas);
}

// --- RAYCASTING / TOUCH SELECTION PIPELINE ---
let isMappingBuffer = false;

window.selectParticleAt = async function(clientX, clientY) {
    if (isMappingBuffer) return;

    if (navigator.gpu && device && readBuffer) {
        isMappingBuffer = true;
        try {
            const commandEncoder = device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(particleBuffer, 0, readBuffer, 0, activeParticleCount * 64);
            device.queue.submit([commandEncoder.finish()]);

            await readBuffer.mapAsync(GPUMapMode.READ, 0, activeParticleCount * 64);
            const arrayBuffer = readBuffer.getMappedRange(0, activeParticleCount * 64);
            const data = new Float32Array(arrayBuffer);
            const uintData = new Uint32Array(arrayBuffer);

            let closestId = -1;
            let minDistSq = Infinity;
            let bestData = null;
            const aspect = window.innerWidth / window.innerHeight;

            for (let i = 0; i < activeParticleCount; i++) {
                const base = i * 16;
                const px = data[base];
                const py = data[base + 1];
                const pz = data[base + 2];

                const cx = Math.cos(cameraState.rotX), sx = Math.sin(cameraState.rotX);
                const cy = Math.cos(cameraState.rotY), sy = Math.sin(cameraState.rotY);

                let rx = px * cy + pz * sy;
                let rz = -px * sy + pz * cy;
                let ry = py * cx - rz * sx;
                rz = py * sx + rz * cx;

                let cameraDist = 60.0 / Math.max(cameraState.zoom, 0.1);
                let depth = rz + cameraDist;
                
                if (depth < 0.1) continue; 

                let proj = 1.6 / depth;
                let ndcX = (rx * proj) / aspect;
                let ndcY = ry * proj;

                let screenX = (ndcX + 1.0) * 0.5 * window.innerWidth;
                let screenY = (1.0 - ndcY) * 0.5 * window.innerHeight;

                let dx = screenX - clientX;
                let dy = screenY - clientY;
                let distSq = dx * dx + dy * dy;

                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestId = i;
                    bestData = {
                        mass: data[base + 3],
                        type: uintData[base + 13],
                        dist: Math.sqrt(px * px + py * py + pz * pz)
                    };
                }
            }

            readBuffer.unmap();

            if (minDistSq < 2500) { 
                updateInspectorUI(closestId, bestData);
            }
        } catch (e) {
            console.error("Raycast mapping error:", e);
        }
        isMappingBuffer = false;
    } else if (fallbackParticles && fallbackParticles.length > 0) {
        // Fallback 2D Raycasting
        let closestId = -1;
        let minDistSq = Infinity;
        let bestData = null;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const cx = w / 2;
        const cy = h / 2;

        const cosY = Math.cos(cameraState.rotY), sinY = Math.sin(cameraState.rotY);
        const cosX = Math.cos(cameraState.rotX), sinX = Math.sin(cameraState.rotX);

        for (let i = 0; i < fallbackParticles.length; i++) {
            let p = fallbackParticles[i];
            let rx = p.x * cosY - p.z * sinY;
            let rz = p.x * sinY + p.z * cosY;
            let ry = p.y * cosX - rz * sinX;
            rz = p.y * sinX + rz * cosX;

            const scale = (400 / (400 + rz)) * cameraState.zoom;
            const screenX = cx + rx * scale;
            const screenY = cy + ry * scale;

            let dx = screenX - clientX;
            let dy = screenY - clientY;
            let distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestId = i;
                bestData = {
                    mass: p.radius * 6.5,
                    type: p.type === 'gold' ? 2 : (p.type === 'cyan' ? 1 : 0),
                    dist: Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
                };
            }
        }
        
        if (minDistSq < 2500) {
            updateInspectorUI(closestId, bestData);
        }
    }
};

function updateInspectorUI(id, data) {
    let typeName = "Dark Matter Filament";
    let subType = "Exotic Structure";
    let colorClass = "purple";
    let hexColor = "#8b5cf6";
    
    if (data.type === 2) {
        typeName = "G-Type Main Sequence Star";
        subType = "Star";
        colorClass = "gold";
        hexColor = "#f59e0b";
    } else if (data.type === 1) {
        typeName = "O-Type Blue Giant";
        subType = "Star";
        colorClass = "cyan";
        hexColor = "#06b6d4";
    }

    const distanceLy = (data.dist * 1342.3).toLocaleString('en-US', {maximumFractionDigits: 0});
    const massM = (data.mass / 12).toFixed(2);
    
    // Update bottom floating preview card
    const previewTitle = document.getElementById('obj-name');
    const previewSub = document.getElementById('obj-sub');
    const thumbGlow = document.querySelector('.thumb-glow');
    
    if (previewTitle) previewTitle.textContent = `OBJECT ${id.toLocaleString()}`;
    if (previewSub) previewSub.textContent = `Type: ${subType} | Distance: ${distanceLy} ly`;
    
    if (thumbGlow) {
        thumbGlow.style.boxShadow = `0 0 16px ${hexColor}, 0 0 30px ${hexColor}`;
        thumbGlow.style.backgroundColor = hexColor;
    }

    // Update deep inspector modal
    const modalTitle = document.querySelector('.modal-title-group h2');
    const modalSub = document.querySelector('.modal-title-group .subtitle');
    const heroGlow = document.querySelector('.hero-star-glow');
    
    if (modalTitle) modalTitle.textContent = `OBJECT ${id.toLocaleString()}`;
    if (modalSub) modalSub.textContent = subType;
    
    if (heroGlow) {
        heroGlow.style.background = `radial-gradient(circle, ${hexColor} 0%, rgba(0,0,0,0) 70%)`;
        heroGlow.style.boxShadow = `0 0 50px ${hexColor}`;
    }

    // Update modal data grid details
    const dataValues = document.querySelectorAll('.data-value');
    if (dataValues.length >= 6) {
        const hashStr = id.toString().padStart(4, '0');
        dataValues[0].textContent = `Helion-${hashStr.substring(0, 3)}`;
        dataValues[1].textContent = typeName;
        dataValues[2].textContent = `${massM} M☉`;
        dataValues[3].textContent = `${(data.mass / 18).toFixed(2)} R☉`;
        dataValues[4].textContent = `${Math.floor(data.mass * 480)} K`;
        dataValues[5].textContent = `${distanceLy} ly`;
    }

    // Show the hidden floating inspector card!
    const inspectorCard = document.getElementById('inspector-preview');
    if (inspectorCard) {
        inspectorCard.classList.add('active');
    }
}

// --- ENGINE LOOPS & RENDER LOGIC ---

function initFallback2DEngine(canvas) {
    canvas2D = canvas;
    ctx2D = canvas.getContext('2d');
    
    ctx2D.scale(dpr, dpr);
    fallbackParticles = [];
    
    for (let i = 0; i < 800; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (window.innerWidth * 0.4);
        fallbackParticles.push({
            x: Math.cos(angle) * dist,
            y: (Math.random() - 0.5) * 50,
            z: Math.sin(angle) * dist,
            vx: -Math.sin(angle) * (0.5 + Math.random()),
            vz: Math.cos(angle) * (0.5 + Math.random()),
            type: Math.random() > 0.85 ? 'gold' : (Math.random() > 0.4 ? 'cyan' : 'purple'),
            radius: 2.0 + Math.random() * 3.5 
        });
    }

    window.addEventListener('resize', () => {
        dpr = window.devicePixelRatio || 1;
        canvas2D.width = window.innerWidth * dpr;
        canvas2D.height = window.innerHeight * dpr;
        ctx2D.scale(dpr, dpr);
    });

    updateLiveBadge('2D');
    setupSupabaseSync();
    requestAnimationFrame(renderLoop2D);
}

function renderLoop2D() {
    cosmicAgeMyr += 0.0001;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    ctx2D.fillStyle = '#07060b';
    ctx2D.fillRect(0, 0, w, h);

    const cosY = Math.cos(cameraState.rotY), sinY = Math.sin(cameraState.rotY);
    const cosX = Math.cos(cameraState.rotX), sinX = Math.sin(cameraState.rotX);

    for (let p of fallbackParticles) {
        p.x += p.vx;
        p.z += p.vz;

        let rx = p.x * cosY - p.z * sinY;
        let rz = p.x * sinY + p.z * cosY;
        let ry = p.y * cosX - rz * sinX;
        rz = p.y * sinX + rz * cosX;

        const scale = (400 / (400 + rz)) * cameraState.zoom;
        const screenX = cx + rx * scale;
        const screenY = cy + ry * scale;

        if (screenX > -20 && screenX < w + 20 && screenY > -20 && screenY < h + 20 && scale > 0) {
            ctx2D.beginPath();
            ctx2D.arc(screenX, screenY, p.radius * scale, 0, Math.PI * 2);

            if (p.type === 'gold') {
                ctx2D.fillStyle = 'rgba(245, 158, 11, 0.9)';
                ctx2D.shadowColor = '#f59e0b';
            } else if (p.type === 'cyan') {
                ctx2D.fillStyle = 'rgba(6, 182, 212, 0.9)';
                ctx2D.shadowColor = '#06b6d4';
            } else {
                ctx2D.fillStyle = 'rgba(139, 92, 246, 0.7)';
                ctx2D.shadowColor = '#8b5cf6';
            }
            
            ctx2D.shadowBlur = 10 * scale;
            ctx2D.fill();
        }
    }

    updateUIClock();
    requestAnimationFrame(renderLoop2D);
}

function renderLoopGPU() {
    cosmicAgeMyr += 0.0001;

    activeParticleCount = Math.min(MAX_PARTICLES, Math.floor(4000 + cosmicAgeMyr * 20000));

    const aspect = window.innerWidth / window.innerHeight;
    const paramsArray = new Float32Array([
        cosmicAgeMyr, 0.68, 0.016, 0,
        cameraState.zoom, cameraState.rotX, cameraState.rotY, aspect
    ]);
    new Uint32Array(paramsArray.buffer)[3] = activeParticleCount;

    device.queue.writeBuffer(paramsBuffer, 0, paramsArray.buffer);

    const commandEncoder = device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(activeParticleCount / 256));
    computePass.end();

    const renderPassDescriptor = {
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.03, g: 0.02, b: 0.04, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6, activeParticleCount);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    updateUIClock();
    requestAnimationFrame(renderLoopGPU);
}

function updateUIClock() {
    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        if (cosmicAgeMyr >= 1000) {
            hudAgeElement.textContent = `${(cosmicAgeMyr / 1000).toFixed(3)} Billion Years`;
        } else {
            hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(4)} Million Years`;
        }
    }
}

// --- Supabase Networking ---
function setupSupabaseSync() {
    fetchCosmicState().then(data => {
        if (data && data.cosmic_age_myr !== undefined) {
            cosmicAgeMyr = data.cosmic_age_myr;
        }
    });

    subscribeToCosmicUpdates(
        (newState) => {
            if (newState && newState.cosmic_age_myr !== undefined) {
                cosmicAgeMyr = newState.cosmic_age_myr;
            }
        },
        (newThought) => {
            if (newThought && newThought.thought_log) {
                prependEventFeed(newThought.thought_log);
            }
        }
    );
}

function prependEventFeed(logText) {
    const container = document.getElementById('events-container');
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'event-card-rich';
    card.innerHTML = `
        <div class="event-thumb blackhole"></div>
        <div class="event-content">
          <div class="event-title-row">
            <span class="dot-icon purple">●</span>
            <span class="event-title">Origin AI Intervention</span>
          </div>
          <div class="event-desc">${logText}</div>
          <div class="event-time">Just now</div>
        </div>
    `;
    container.prepend(card);
}
