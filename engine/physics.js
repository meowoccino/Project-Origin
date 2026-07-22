import { shaderCode } from './shaders.js';

export class PhysicsEngine {
    constructor(canvas, particleCount = 10000) { 
        // 10,000 particles is the sweet spot for mobile WebGPU survival
        this.canvas = canvas;
        this.particleCount = particleCount;
        this.device = null;
        this.context = null;
    }

    async init() {
        if (!navigator.gpu) {
            console.warn("WebGPU not supported on this browser.");
            return false;
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) return false;
            this.device = await adapter.requestDevice();
            this.context = this.canvas.getContext('webgpu');
            this.format = navigator.gpu.getPreferredCanvasFormat();
            
            this.context.configure({
                device: this.device,
                format: this.format,
                alphaMode: 'premultiplied'
            });

            const module = this.device.createShaderModule({ code: shaderCode });

            // 64 Bytes per particle = 16 floats (Fixed memory alignment mismatch)
            const particleData = new Float32Array(this.particleCount * 16);
            
            this.particleBuffer = this.device.createBuffer({
                size: particleData.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });

            // Params Buffer (8 floats = 32 bytes)
            this.paramsBuffer = this.device.createBuffer({
                size: 32,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            this.bindGroupLayout = this.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: 'storage' } },
                    { binding: 1, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }
                ]
            });

            this.bindGroup = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.particleBuffer } },
                    { binding: 1, resource: { buffer: this.paramsBuffer } }
                ]
            });

            // Compile the 3 pipelines from shaders.js
            this.initPipeline = this.device.createComputePipeline({
                layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
                compute: { module, entryPoint: 'init_big_bang' }
            });

            this.computePipeline = this.device.createComputePipeline({
                layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
                compute: { module, entryPoint: 'update_physics' }
            });

            this.renderPipeline = this.device.createRenderPipeline({
                layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
                vertex: { module, entryPoint: 'vs_main' },
                fragment: {
                    module, entryPoint: 'fs_main',
                    targets: [{
                        format: this.format,
                        blend: {
                            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' }
                        }
                    }]
                },
                primitive: { topology: 'triangle-list' }
            });

            // Execute the Big Bang Initialization Compute Pass immediately
            const encoder = this.device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            pass.setPipeline(this.initPipeline);
            pass.setBindGroup(0, this.bindGroup);
            pass.dispatchWorkgroups(Math.ceil(this.particleCount / 256));
            pass.end();
            this.device.queue.submit([encoder.finish()]);

            return true;
        } catch (err) {
            console.error("WebGPU Initialization failed:", err);
            return false;
        }
    }

    step(cameraState) {
        if (!this.device) return;

        // Push real-time telemetry from UI into the GPU shaders
        const paramsData = new Float32Array([
            cameraState.currentAge, 
            67.4,                   
            0.016,                  
            this.particleCount,     
            cameraState.zoom,       
            cameraState.rotX,       
            cameraState.rotY,       
            this.canvas.width / this.canvas.height 
        ]);
        this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);

        const encoder = this.device.createCommandEncoder();

        // 1. Compute Pass (Gravity & Hydrodynamics)
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.bindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.particleCount / 256));
        computePass.end();

        // 2. Render Pass (Draw the instances)
        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.01, g: 0.01, b: 0.03, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        renderPass.setPipeline(this.renderPipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        // Draw 6 vertices per particle (a quad)
        renderPass.draw(6, this.particleCount, 0, 0);
        renderPass.end();

        this.device.queue.submit([encoder.finish()]);
    }
}
