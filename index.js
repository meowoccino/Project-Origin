
// Vite Entry Point - Connects UI, Services, and Engine
import './ui/styles.css';
import './ui/components.js';
import { initWebGPU } from './engine/main.js';

// Boot up WebGPU when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    initWebGPU();
});
