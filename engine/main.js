import shaderCode from './shaders.wgsl?raw';
import { fetchCosmicState, subscribeToCosmicUpdates } from '../services/supabase.js';

let device, context, format;
let computePipeline, renderPipeline;
let particleBuffer, paramsBuffer, bindGroup;

const MAX_PARTICLES = 500000;
let activeParticleCount = 2000; // Visible immediately on load
let cosmicAgeMyr = 0.0;

// Camera State (Manipulated by finger gestures)
export const cameraState = {
    zoom: 1.0,
    rotX: 0.3,
    rotY: 0.5,
};

export async function initWebGPU() {
    const container = document.getElementById('canvas-container');
    const canvas = document.createElement('canvas');
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    if (!navigator.gpu) {
        console.error("WebGPU is not supported on this device/browser.");
        return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;

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

    // 32 Bytes Uniform Buffer (age, H, dt, count, zoom, rotX, rotY, aspect)
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
                        dstFactor: 'one',
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
            topology: 'point-list',
        },
    });

    // Big Bang Init Pass
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
    // If Supabase isn't ticking yet, run a gentle local time progression so universe advances
    cosmicAgeMyr += 0.0001;

    activeParticleCount = Math.min(
        MAX_PARTICLES,
        Math.floor(2000 + cosmicAgeMyr * 15000)
    );

    const aspect = window.innerWidth / window.innerHeight;
    const paramsArray = new Float32Array([
        cosmicAgeMyr, 0.68, 0.016, 0,
        cameraState.zoom, cameraState.rotX, cameraState.rotY, aspect
    ]);
    new Uint32Array(paramsArray.buffer)[3] = activeParticleCount;

    device.queue.writeBuffer(paramsBuffer, 0, paramsArray.buffer);

    const commandEncoder = device.createCommandEncoder();

    // 1. Physics Compute Pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(Math.ceil(activeParticleCount / 256));
    computePass.end();

    // 2. Particle Render Pass
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
    renderPass.draw(activeParticleCount);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    const hudAgeElement = document.getElementById('hud-age');
    if (hudAgeElement) {
        // Format cosmic age nicely (Millions -> Billions format matching your design)
        if (cosmicAgeMyr >= 1000) {
            hudAgeElement.textContent = `${(cosmicAgeMyr / 1000).toFixed(3)} Billion Years`;
        } else {
            hudAgeElement.textContent = `${cosmicAgeMyr.toFixed(5)} Myr`;
        }
    }

    requestAnimationFrame(renderLoop);
}
