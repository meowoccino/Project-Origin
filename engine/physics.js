import { shaderCode } from './shaders.js';

export class PhysicsEngine {
    constructor(canvas, nodes) { 
        this.canvas = canvas;
        this.nodes = nodes; // Connect directly to the UI's node array
        this.nodeCount = nodes.length;
        this.device = null;
        this.context = null;
    }

    async init() {
        if (!navigator.gpu) return false;
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) return false;
            this.device = await adapter.requestDevice();
            this.context = this.canvas.getContext('webgpu');
            this.format = navigator.gpu.getPreferredCanvasFormat();
            
            this.context.configure({ device: this.device, format: this.format, alphaMode: 'premultiplied' });
            const module = this.device.createShaderModule({ code: shaderCode });

            // 8 Floats per particle (32 bytes aligned)
            const particleData = new Float32Array(this.nodeCount * 8);
            
            function hexToRgb(hex) {
                const big = parseInt(hex.replace('#', ''), 16);
                return [(big >> 16 & 255) / 255, (big >> 8 & 255) / 255, (big & 255) / 255];
            }

            for (let i = 0; i < this.nodeCount; i++) {
                const n = this.nodes[i];
                const idx = i * 8;
                particleData[idx] = n.initX;
                particleData[idx+1] = n.initY;
                particleData[idx+2] = n.initZ;
                
                const rgb = hexToRgb(n.color);
                particleData[idx+3] = rgb[0];
                particleData[idx+4] = rgb[1];
                particleData[idx+5] = rgb[2];
                
                particleData[idx+6] = n.size;
                particleData[idx+7] = n.ignitionAge || 0.0; 
            }
            
            this.particleBuffer = this.device.createBuffer({
                size: particleData.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.particleBuffer, 0, particleData);

            // Params Buffer (8 Floats)
            this.paramsBuffer = this.device.createBuffer({
                size: 32,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            this.bindGroupLayout = this.device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'storage' } },
                    { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }
                ]
            });

            this.bindGroup = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [
                    { binding: 0, resource: { buffer: this.particleBuffer } },
                    { binding: 1, resource: { buffer: this.paramsBuffer } }
                ]
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

            return true;
        } catch (err) {
            console.error("WebGPU Init failed:", err);
            return false;
        }
    }

    step(cameraState) {
        if (!this.device) return;

        const age = cameraState.currentAge || 0.0;
        const expFactor = Math.max(0.05, Math.min(2.5, 0.05 + (age * 0.12)));
        const aspect = this.canvas.width / this.canvas.height;

        const paramsData = new Float32Array([
            age, expFactor, cameraState.zoom, cameraState.rotX, cameraState.rotY, aspect, 0, 0
        ]);
        this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);

        const encoder = this.device.createCommandEncoder();
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
        renderPass.draw(6, this.nodeCount, 0, 0);
        renderPass.end();

        this.device.queue.submit([encoder.finish()]);
    }
}
