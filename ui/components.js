import { cameraState } from '../engine/main.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. TOUCH & GESTURE CAMERA CONTROLS ---
    const canvasContainer = document.getElementById('canvas-container');

    let isDragging = false;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDistance = null;
    let initialZoom = 1.0;

    // Tap detection tracking
    let touchStartTime = 0;
    let startX = 0;
    let startY = 0;

    function getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    if (canvasContainer) {
        canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
                
                // Track for potential tap selection
                touchStartTime = Date.now();
                startX = lastTouchX;
                startY = lastTouchY;
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
                initialZoom = cameraState.zoom;
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                const deltaX = e.touches[0].clientX - lastTouchX;
                const deltaY = e.touches[0].clientY - lastTouchY;

                cameraState.rotY += deltaX * 0.005;
                cameraState.rotX += deltaY * 0.005;
                cameraState.rotX = Math.max(-1.4, Math.min(1.4, cameraState.rotX));

                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            } else if (e.touches.length === 2 && initialPinchDistance) {
                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialPinchDistance;
                cameraState.zoom = Math.max(0.1, Math.min(15.0, initialZoom * scale));
            }
        }, { passive: true });

        canvasContainer.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const touchDuration = Date.now() - touchStartTime;
                const dist = Math.hypot(e.changedTouches[0].clientX - startX, e.changedTouches[0].clientY - startY);
                
                // If it was a fast, stationary tap (under 300ms, moved less than 15px) -> Raycast!
                if (touchDuration < 300 && dist < 15) {
                    if (window.selectParticleAt) {
                        window.selectParticleAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                }
            }

            if (e.touches.length < 2) initialPinchDistance = null;
            if (e.touches.length === 0) isDragging = false;
        }, { passive: true });
    }

    // --- 2. SIDE DRAWER MENU NAVIGATION ---
    const sideDrawer = document.getElementById('side-drawer');
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const btnEventsMenu = document.getElementById('btn-events-menu');

    function openDrawer() { sideDrawer?.classList.add('active'); }
    function closeDrawer() { sideDrawer?.classList.remove('active'); }

    btnOpenDrawer?.addEventListener('click', openDrawer);
    btnEventsMenu?.addEventListener('click', openDrawer);
    btnCloseDrawer?.addEventListener('click', closeDrawer);

    // --- 3. BOTTOM NAVBAR & SCREEN MODALS ---
    const btnExplore = document.getElementById('btn-explore');
    const btnEvents = document.getElementById('btn-events');
    const btnAi = document.getElementById('btn-ai');
    const btnTimeline = document.getElementById('btn-timeline');
    const btnCatalog = document.getElementById('btn-catalog');

    const drawerExplore = document.getElementById('drawer-explore');
    const drawerEvents = document.getElementById('drawer-events');
    const drawerAi = document.getElementById('drawer-ai');
    const drawerTimeline = document.getElementById('drawer-timeline');
    const drawerCatalog = document.getElementById('drawer-catalog');

    const viewEvents = document.getElementById('view-events');
    const viewAi = document.getElementById('view-ai');
    const viewTimeline = document.getElementById('view-timeline');
    const viewCatalog = document.getElementById('view-catalog');
    const inspectModal = document.getElementById('modal-object-detail');

    const allBtns = [btnExplore, btnEvents, btnAi, btnTimeline, btnCatalog];
    const allViews = [viewEvents, viewAi, viewTimeline, viewCatalog, inspectModal];

    function resetTabs() {
        allBtns.forEach(btn => btn?.classList.remove('active'));
        allViews.forEach(view => view?.classList.remove('active'));
        closeDrawer();
    }

    function switchTab(targetBtn, targetView) {
        resetTabs();
        targetBtn?.classList.add('active');
        targetView?.classList.add('active');
    }

    btnExplore?.addEventListener('click', () => switchTab(btnExplore, null));
    btnEvents?.addEventListener('click', () => switchTab(btnEvents, viewEvents));
    btnAi?.addEventListener('click', () => switchTab(btnAi, viewAi));
    btnTimeline?.addEventListener('click', () => switchTab(btnTimeline, viewTimeline));
    btnCatalog?.addEventListener('click', () => switchTab(btnCatalog, viewCatalog));

    drawerExplore?.addEventListener('click', () => switchTab(btnExplore, null));
    drawerEvents?.addEventListener('click', () => switchTab(btnEvents, viewEvents));
    drawerAi?.addEventListener('click', () => switchTab(btnAi, viewAi));
    drawerTimeline?.addEventListener('click', () => switchTab(btnTimeline, viewTimeline));
    drawerCatalog?.addEventListener('click', () => switchTab(btnCatalog, viewCatalog));

    // --- 4. OBJECT INSPECTION MODAL ---
    const inspectorPreview = document.getElementById('inspector-preview');
    const btnExpandInspect = document.getElementById('btn-expand-inspect');
    const btnCloseInspect = document.getElementById('btn-close-inspect');

    function openInspectModal() {
        resetTabs();
        inspectModal?.classList.add('active');
    }

    inspectorPreview?.addEventListener('click', openInspectModal);
    btnExpandInspect?.addEventListener('click', (e) => {
        e.stopPropagation();
        openInspectModal();
    });

    btnCloseInspect?.addEventListener('click', () => {
        inspectModal?.classList.remove('active');
        btnExplore?.classList.add('active');
    });

    document.getElementById('btn-ai-back')?.addEventListener('click', () => switchTab(btnExplore, null));
    document.getElementById('btn-timeline-back')?.addEventListener('click', () => switchTab(btnExplore, null));
    document.getElementById('btn-catalog-back')?.addEventListener('click', () => switchTab(btnExplore, null));
});
