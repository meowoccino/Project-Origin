import { supabase } from '../services/supabase.js';

export class PhysicsEngine {
    constructor(particleCount = 500000) {
        this.particleCount = particleCount;
        this.device = null;
        this.computePipeline = null;
        this.particleBuffer = null;
        this.paramsBuffer = null;
        this.bindGroup = null;
        this.cosmicAge = 0.0; // In Million Years (Myr)
    }

    async init() {
        if (!navigator.gpu) {
            console.warn("WebGPU not supported on this browser. Falling back to passive viewing mode.");
            return false;
        }

        const adapter = await navigator.gpu.requestAdapter();
        this.device = await adapter.requestDevice();

        // Fetch shader code
        const shaderResponse = await fetch('./engine/shaders.wgsl');
        const shaderCode = await shaderResponse.text();

        const shaderModule = this.device.createShaderModule({ code: shaderCode });

        // Initialize particle array (x, y, z, mass, vx, vy, vz, padding)
        const particleData = new Float32Array(this.particleCount * 8);
        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 8;
            particleData[idx]     = (Math.random() - 0.5) * 1000; // X
            particleData[idx + 1] = (Math.random() - 0.5) * 1000; // Y
            particleData[idx + 2] = (Math.random() - 0.5) * 1000; // Z
            particleData[idx + 3] = 1.0;                          // Mass
            particleData[idx + 4] = (Math.random() - 0.5) * 2.0;  // Vx
            particleData[idx + 5] = (Math.random() - 0.5) * 2.0;  // Vy
            particleData[idx + 6] = (Math.random() - 0.5) * 2.0;  // Vz
            particleData[idx + 7] = 0.0;                          // Alignment padding
        }

        // GPU Buffers
        this.particleBuffer = this.device.createBuffer({
            size: particleData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.particleBuffer.getMappedRange()).set(particleData);
        this.particleBuffer.unmap();

        // Params Buffer: delta_time, gravity_const, expansion_rate, speed_of_light
        const paramsData = new Float32Array([0.016, 0.5, 67.4, 299.7]);
        this.paramsBuffer = this.device.createBuffer({
            size: paramsData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);

        // Compute Pipeline
        this.computePipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: { module: shaderModule, entryPoint: 'main' }
        });

        this.bindGroup = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.particleBuffer } },
                { binding: 1, resource: { buffer: this.paramsBuffer } }
            ]
        });

        return true;
    }

    step() {
        if (!this.device || !this.computePipeline) return;

        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.computePipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);

        // Advance cosmic time
        this.cosmicAge += 0.01;
    }
}

