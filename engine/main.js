import { shaderCode } from './shaders.js';
import { fetchCosmicState, subscribeToCosmicUpdates } from '../services/supabase.js';

let device, context, format;
let computePipeline, renderPipeline;
let particleBuffer, paramsBuffer, bindGroup;

const MAX_PARTICLES = 500000;
let activeParticleCount = 4000;
let cosmicAgeMyr = 0.0;

export const cameraState = {
    zoom: 1.0,
    rotX: 0.4,
    rotY: 0.6,
};

// Fallback 2D simulation state
let canvas2D, ctx2D;
let fallbackParticles = [];

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    container.appendChild(canvas);

    // If WebGPU is supported, initialize WebGPU
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

                particleBuffer = device.createBuffer({
                    size: MAX_PARTICLES * 64,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                });

                paramsBuffer = device.createBuffer({
                    size: 32,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
                    const newDpr = window.devicePixelRatio || 1;
                    canvas.width = window.innerWidth * newDpr;
                    canvas.height = window.innerHeight * newDpr;
                });

                setupSupabaseSync();
                requestAnimationFrame(renderLoop);
                return;
            }
        } catch (err) {
            console.warn("WebGPU initialization failed. Switching to high-performance 2D Canvas engine:", err);
        }
    }

    // Fallback: 2D Canvas Engine
    initFallback2DEngine(canvas);
}

function initFallback2DEngine(canvas) {
    canvas2D = canvas;
    ctx2D = canvas.getContext('2d');

    // Create 450 glowing particles
    fallbackParticles = [];
    for (let i = 0; i < 450; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.4;
        fallbackParticles.push({
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            z: (Math.random() - 0.5) * 200,
            vx: -Math.sin(angle) * (1.5 + Math.random() * 2.0),
            vy: Math.cos(angle) * (1.5 + Math.random() * 2.0),
            type: Math.random() > 0.8 ? 'gold' : (Math.random() > 0.3 ? 'cyan' : 'purple'),
            radius: 1.5 + Math.random() * 3.0
        });
    }

    setupSupabaseSync();
    requestAnimationFrame(renderLoop2D);
}

function renderLoop2D() {
    cosmicAgeMyr += 0.0001;

    const w = canvas2D.width;
    const h = canvas2D.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx2D.fillStyle = '#07060b';
    ctx2D.fillRect(0, 0, w, h);

    const cosY = Math.cos(cameraState.rotY);
    const sinY = Math.sin(cameraState.rotY);

    for (let p of fallbackParticles) {
        // Orbit rotation
        p.x += p.vx * 0.2;
        p.y += p.vy * 0.2;

        const rx = p.x * cosY - p.z * sinY;
        const rz = p.x * sinY + p.z * cosY;

        const scale = (300 / (300 + rz)) * cameraState.zoom;
        const screenX = cx + rx * scale;
        const screenY = cy + p.y * scale;

        if (screenX > 0 && screenX < w && screenY > 0 && screenY < h) {
            ctx2D.beginPath();
            ctx2D.arc(screenX, screenY, p.radius * scale, 0, Math.PI * 2);

            if (p.type === 'gold') {
                ctx2D.fillStyle = '#f59e0b';
                ctx2D.shadowColor = '#f59e0b';
            } else if (p.type === 'cyan') {
                ctx2D.fillStyle = '#06b6d4';
                ctx2D.shadowColor = '#06b6d4';
            } else {
                ctx2D.fillStyle = '#8b5cf6';
                ctx2D.shadowColor = '#8b5cf6';
            }
            ctx2D.shadowBlur = 8;
            ctx2D.fill();
        }
    }

    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        if (cosmicAgeMyr >= 1000) {
            hudAgeElement.textContent = `${(cosmicAgeMyr / 1000).toFixed(3)} Billion Years`;
        } else {
            hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
        }
    }

    requestAnimationFrame(renderLoop2D);
}

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

function renderLoop() {
    cosmicAgeMyr += 0.0001;

    activeParticleCount = Math.min(
        MAX_PARTICLES,
        Math.floor(4000 + cosmicAgeMyr * 20000)
    );

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
            clearValue: { r: 0.03, g: 0.02, b: 0.06, a: 1.0 },
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

    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        if (cosmicAgeMyr >= 1000) {
            hudAgeElement.textContent = `${(cosmicAgeMyr / 1000).toFixed(3)} Billion Years`;
        } else {
            hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
        }
    }

    requestAnimationFrame(renderLoop);
}
