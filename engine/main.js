import shaderCode from './shaders.wgsl?raw';
import { fetchCosmicState, subscribeToCosmicUpdates } from '../services/supabase.js';

let device, pipeline, particleBuffer, paramsBuffer, bindGroup;
const PARTICLE_COUNT = 50000;
let cosmicAgeMyr = 0.0;

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    if (!navigator.gpu) {
        console.error("WebGPU not supported on this device/browser.");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device, format });

    const shaderModule = device.createShaderModule({ code: shaderCode });

    // 64 Bytes per particle (matches 8 WGSL physical attributes)
    particleBuffer = device.createBuffer({
        size: PARTICLE_COUNT * 64,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    paramsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

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

    // Run Big Bang Initialization Pass
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

    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(initPipeline);
    pass.setBindGroup(0, initBindGroup);
    pass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
    pass.end();

    device.queue.submit([commandEncoder.finish()]);

    // Connect Supabase Sync
    setupSupabaseSync();

    // Start 60 FPS Engine Render & HUD Loop
    requestAnimationFrame(renderLoop);
}

function setupSupabaseSync() {
    // 1. Fetch initial state on boot
    fetchCosmicState().then(data => {
        if (data && data.cosmic_age_myr) {
            cosmicAgeMyr = data.cosmic_age_myr;
        }
    });

    // 2. Subscribe to live stream updates
    subscribeToCosmicUpdates(
        (newState) => {
            if (newState && newState.cosmic_age_myr) {
                cosmicAgeMyr = newState.cosmic_age_myr;
            }
        },
        (newThought) => {
            prependEventFeed(newThought.thought_log);
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
    const paramsArray = new Float32Array([cosmicAgeMyr, 0.68, 0.016]);
    const paramsUintArray = new Uint32Array(paramsArray.buffer);
    paramsUintArray[3] = PARTICLE_COUNT;

    device.queue.writeBuffer(paramsBuffer, 0, paramsArray.buffer);

    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
    pass.end();

    device.queue.submit([commandEncoder.finish()]);

    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
    }

    requestAnimationFrame(renderLoop);
}
