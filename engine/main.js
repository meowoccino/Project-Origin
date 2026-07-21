import shaderCode from './shaders.wgsl?raw';
import { fetchCosmicState, subscribeToCosmicUpdates } from '../services/supabase.js';

let device, pipeline, particleBuffer, paramsBuffer, bindGroup;

// 1. Fixed VRAM Pool Ceiling (reserves memory once on GPU for up to 500k particles)
const MAX_PARTICLES = 500000;

// 2. Dynamic Active Particle Count (starts small and grows as cosmic time advances)
let activeParticleCount = 1000;
let cosmicAgeMyr = 0.0;

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    if (!navigator.gpu) {
        console.error("WebGPU is not supported on this device or browser.");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error("Failed to acquire WebGPU adapter.");
        return;
    }

    device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device, format });

    const shaderModule = device.createShaderModule({ code: shaderCode });

    // 64 Bytes per particle allocated for the full 500,000 particle pool (~32MB VRAM)
    particleBuffer = device.createBuffer({
        size: MAX_PARTICLES * 64,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Uniform Parameters Buffer (cosmic_age_myr, expansion_rate_h, delta_time, activeParticleCount)
    paramsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Main Physics Update Pipeline
    pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'update_physics' },
    });

    bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: paramsBuffer } },
        ],
    });

    // Big Bang Initialization Pipeline across the full pool
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

    // Write initial uniform params to initialize all particle seeds
    const initParamsArray = new Float32Array([0.0, 0.68, 0.016]);
    const initParamsUintArray = new Uint32Array(initParamsArray.buffer);
    initParamsUintArray[3] = MAX_PARTICLES;
    device.queue.writeBuffer(paramsBuffer, 0, initParamsArray.buffer);

    // Execute Big Bang Initialization Pass
    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(initPipeline);
    pass.setBindGroup(0, initBindGroup);
    pass.dispatchWorkgroups(Math.ceil(MAX_PARTICLES / 256));
    pass.end();

    device.queue.submit([commandEncoder.finish()]);

    // Connect Supabase Realtime Synchronization
    setupSupabaseSync();

    // Start 60 FPS Render & Physics Loop
    requestAnimationFrame(renderLoop);
}

function setupSupabaseSync() {
    // Fetch current state on startup
    fetchCosmicState().then(data => {
        if (data && data.cosmic_age_myr !== undefined) {
            cosmicAgeMyr = data.cosmic_age_myr;
        }
    });

    // Subscribe to continuous live updates
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
    card.className = 'event-card';
    card.innerHTML = `
        <div class="event-title">⚡ AI Action</div>
        <div class="event-desc">${logText}</div>
        <div class="event-time">Just now</div>
    `;
    container.prepend(card);
}

function renderLoop() {
    // Dynamic Particle Count Progression:
    // Starts at 1,000 active particles at Big Bang and scales dynamically up to 500,000 as universe ages
    activeParticleCount = Math.min(
        MAX_PARTICLES,
        Math.floor(1000 + cosmicAgeMyr * 15000)
    );

    // Write parameters to GPU Uniform Buffer
    const paramsArray = new Float32Array([cosmicAgeMyr, 0.68, 0.016]);
    const paramsUintArray = new Uint32Array(paramsArray.buffer);
    paramsUintArray[3] = activeParticleCount; // Dynamic active count passed to WGSL shader

    device.queue.writeBuffer(paramsBuffer, 0, paramsArray.buffer);

    // Dispatch WebGPU compute pass strictly for active particles
    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(activeParticleCount / 256));
    pass.end();

    device.queue.submit([commandEncoder.finish()]);

    // Update Universe Age HUD Display
    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
    }

    requestAnimationFrame(renderLoop);
}
