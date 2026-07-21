// Root Entry Point - Connects UI and Engine
import './ui/components.js';
import { initWebGPU } from './engine/main.js';

// Boot up WebGPU engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initWebGPU();
});
