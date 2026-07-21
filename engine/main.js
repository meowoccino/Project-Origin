// ============================================================================
// PROJECT ORIGIN: WEBGPU ENGINE & UI BRIDGE (main.js)
// ============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- SUPABASE CLIENT SETUP ---
const SUPABASE_URL = "https://nnntebgkhgzfztwfdphw.supabase.co";
const SUPABASE_KEY = "sb_publishable_O5qr-6UD-6wTzi51j3tYtw_00N9Q4ja";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL ENGINE STATE ---
let device, pipeline, particleBuffer, paramsBuffer, bindGroup;
const PARTICLE_COUNT = 50000; // Scalable particle count for mobile
let cosmicAgeMyr = 0.0;

// --- 1. WEBGPU INITIALIZATION ---
async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    container.appendChild(canvas);

    if (!navigator.gpu) {
        console.error("WebGPU not supported on this browser/device.");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device, format });

    // Fetch WGSL Shader Code
    const shaderResponse = await fetch('./shaders.wgsl');
    const shaderCode = await shaderResponse.text();

    const shaderModule = device.createShaderModule({ code: shaderCode });

    // 64 Bytes per particle (matches 8 WGSL physical attributes)
    const particleBufferSize = PARTICLE_COUNT * 64; 
    particleBuffer = device.createBuffer({
        size: particleBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Cosmic Parameters Uniform Buffer
    paramsBuffer = device.createBuffer({
        size: 16, // 4 x f32/u32 values
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Compute Pipeline Setup
    pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: shaderModule,
            entryPoint: 'update_physics',
        },
    });

    bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: paramsBuffer } },
        ],
    });

    // Run Big Bang Initialization
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

    // Connect Supabase Realtime Sync
    setupSupabaseSync();

    // Start 60 FPS Engine Render & HUD Loop
    requestAnimationFrame(renderLoop);
}

// --- 2. SUPABASE REALTIME SYNC ---
function setupSupabaseSync() {
    // Listen for Cosmic Age updates from server
    supabase
        .channel('public:cosmic_state')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cosmic_state' }, payload => {
            if (payload.new && payload.new.cosmic_age_myr) {
                cosmicAgeMyr = payload.new.cosmic_age_myr;
            }
        })
        .subscribe();

    // Listen for live AI Journal events
    supabase
        .channel('public:ai_journal')
        .on('INSERT', schema => {
            const newLog = schema.new.thought_log;
            prependEventFeed(newLog);
        })
        .subscribe();
}

// Update UI Feed dynamically
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

// --- 3. MAIN RENDER & PHYSICS LOOP ---
function renderLoop() {
    // 1. Update Uniform Parameters (Cosmic Time & Expansion)
    const paramsArray = new Float32Array([
        cosmicAgeMyr, // cosmic_age_myr
        0.68,         // expansion_rate_h
        0.016,        // delta_time (dt = ~16ms)
    ]);
    const paramsUintArray = new Uint32Array(paramsArray.buffer);
    paramsUintArray[3] = PARTICLE_COUNT;

    device.queue.writeBuffer(paramsBuffer, 0, paramsArray.buffer);

    // 2. Dispatch Compute Shader Pass
    const commandEncoder = device.createCommandEncoder();
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
    pass.end();

    device.queue.submit([commandEncoder.finish()]);

    // 3. Update HUD Display
    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
    }

    requestAnimationFrame(renderLoop);
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initWebGPU();
});
