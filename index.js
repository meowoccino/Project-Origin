// Root Entry Point - Connects UI and WebGPU Engine
import './ui/components.js';
import { initWebGPU } from './engine/main.js';

// Safe execution trigger
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWebGPU());
} else {
    initWebGPU();
}
