import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. TOUCH & GESTURE CAMERA CONTROLS ---
    const canvasContainer = document.getElementById('canvas-container');

    let isDragging = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDistance = null;
    let initialZoom = 1.0;

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    if (canvasContainer) {
        // Touch Start
        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
                initialZoom = cameraState.zoom;
            }
        }, { passive: true });

        // Touch Move (Rotate Orbit or Pinch Zoom)
        canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                const deltaX = e.touches[0].clientX - lastTouchX;
                const deltaY = e.touches[0].clientY - lastTouchY;

                cameraState.rotY += deltaX * 0.005;
                cameraState.rotX += deltaY * 0.005;

                // Clamp X rotation to prevent flipping upside down
                cameraState.rotX = Math.max(-1.4, Math.min(1.4, cameraState.rotX));

                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2 && initialPinchDistance) {
                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialPinchDistance;

                // Smooth pinch zoom clamping (0.1x to 15.0x zoom)
                cameraState.zoom = Math.max(0.1, Math.min(15.0, initialZoom * scale));
            }
        }, { passive: true });

        // Touch End
        canvasContainer.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialPinchDistance = null;
            }
            if (e.touches.length === 0) {
                isDragging = false;
            }
        }, { passive: true });
    }

    // --- 2. BOTTOM NAVBAR TAB NAVIGATION ---
    const btnExplore = document.getElementById('btn-explore');
    const btnEvents = document.getElementById('btn-events');
    const btnAi = document.getElementById('btn-ai');
    const btnTimeline = document.getElementById('btn-timeline');
    const btnProfile = document.getElementById('btn-profile');

    const viewEvents = document.getElementById('view-events');
    const viewAi = document.getElementById('view-ai');

    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnProfile];
    const allViews = [viewEvents, viewAi];

    function resetTabs() {
        allBtns.forEach(btn => btn?.classList.remove('active'));
        allViews.forEach(view => view?.classList.remove('active'));
    }

    btnExplore?.addEventListener('click', () => {
        resetTabs();
        btnExplore.classList.add('active');
    });

    btnEvents?.addEventListener('click', () => {
        resetTabs();
        btnEvents.classList.add('active');
        viewEvents?.classList.add('active');
    });

    btnAi?.addEventListener('click', () => {
        resetTabs();
        btnAi.classList.add('active');
        viewAi?.classList.add('active');
    });

    btnTimeline?.addEventListener('click', () => {
        resetTabs();
        btnTimeline?.classList.add('active');
    });

    btnProfile?.addEventListener('click', () => {
        resetTabs();
        btnProfile?.classList.add('active');
    });
});
