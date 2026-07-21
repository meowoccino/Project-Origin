import shaderCode from './shaders.wgsl?raw';
import { fetchCosmicState, subscribeToCosmicUpdates } from '../services/supabase.js';

let device, context, format;
let computePipeline, renderPipeline;
let particleBuffer, paramsBuffer, bindGroup;

// Reserved VRAM Pool Size
const MAX_PARTICLES = 500000;

// Dynamic active particle count and live cosmic age
let activeParticleCount = 1000;
let cosmicAgeMyr = 0.0;

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    
    // Scale canvas dynamically to mobile display pixel density
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
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
    context = canvas.getContext('webgpu');
    format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
    });

    const shaderModule = device.createShaderModule({ code: shaderCode });

    // 64 Bytes per particle stored in GPU memory (~32 MB VRAM allocation)
    particleBuffer = device.createBuffer({
        size: MAX_PARTICLES * 64,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Uniform Parameters Buffer (cosmic_age_myr, expansion_rate_h, delta_time, activeParticleCount)
    paramsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // --- COMPUTE PIPELINE SETUP ---
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

    // --- RENDER PIPELINE SETUP ---
    renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{
                format: format,
                blend: {
                    color: {
                        srcFactor: 'src-alpha',
                        dstFactor: 'one', // Additive blending for glowing cosmic particles
                        operation: 'add',
                    },
                    alpha: {
                        srcFactor: 'one',
                        dstFactor: 'one',
                        operation: 'add',
                    }
                }
            }],
        },
        primitive: {
            topology: 'point-list', // Render particles as individual point lights
        },
    });

    // Big Bang Initialization Pipeline
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

    // Write parameters to initialize all seeds across the full pool
    const initParamsArray = new Float32Array([0.0, 0.68, 0.016]);
    const initParamsUintArray = new Uint32Array(initParamsArray.buffer);
    initParamsUintArray[3] = MAX_PARTICLES;
    device.queue.writeBuffer(paramsBuffer, 0, initParamsArray.buffer);

    // Execute Big Bang Initialization Pass
    const commandEncoder = device.createCommandEncoder();
    const initPass = commandEncoder.beginComputePass();
    initPass.setPipeline(initPipeline);
    initPass.setBindGroup(0, initBindGroup);
    initPass.dispatchWorkgroups(Math.ceil(MAX_PARTICLES / 256));
    initPass.end();

    device.queue.submit([commandEncoder.finish()]);

    // Handle Window Resizing
    window.addEventListener('resize', () => {
        const newDpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * newDpr;
        canvas.height = window.innerHeight * newDpr;
    });

    // Connect Supabase Sync
    setupSupabaseSync();

    // Start 60 FPS Engine Render & Compute Loop
    requestAnimationFrame(renderLoop);
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
    card.className = 'event-card';
    card.innerHTML = `
        <div class="event-title">⚡ AI Action</div>
        <div class="event-desc">${logText}</div>
        <div class="event-time">Just now</div>
    `;
    container.prepend(card);
}

function renderLoop() {
    // Dynamically scale active particle count based on cosmic age
    activeParticleCount = Math.min(
        MAX_PARTICLES,
        Math.floor(1000 + cosmicAgeMyr * 15000)
    );

    // Update Uniform Parameters
    const paramsArray = new Float32Array([cosmicAgeMyr, 0.68, 0.016]);
    const paramsUintArray = new Uint32Array(paramsArray.buffer);
    paramsUintArray[3] = activeParticleCount;

    device.queue.writeBuffer(paramsBuffer, 0, paramsArray.buffer);

    const commandEncoder = device.createCommandEncoder();

    // --- PASS 1: COMPUTE PHYSICS UPDATE ---
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(activeParticleCount / 256));
    computePass.end();

    // --- PASS 2: RENDER PARTICLES TO CANVAS ---
    const renderPassDescriptor = {
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0.03, g: 0.02, b: 0.05, a: 1.0 }, // Dark deep-space background
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(activeParticleCount); // Draw all active particles to screen
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    // Update Cosmic Age HUD
    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
    }

    requestAnimationFrame(renderLoop);
}
