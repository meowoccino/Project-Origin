
// Bottom Navigation Bar Handler
document.addEventListener('DOMContentLoaded', () => {
    const btnExplore = document.getElementById('btn-explore');
    const btnEvents = document.getElementById('btn-events');
    const btnAi = document.getElementById('btn-ai');

    const viewEvents = document.getElementById('view-events');
    const viewAi = document.getElementById('view-ai');

    function resetTabs() {
        [btnExplore, btnEvents, btnAi].forEach(btn => btn?.classList.remove('active'));
        [viewEvents, viewAi].forEach(view => view?.classList.remove('active'));
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
});
