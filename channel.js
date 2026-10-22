(() => {
    const STORE = 'studentos-notifications';
    const toggles = document.querySelectorAll('.switch input[data-key]');
    const toast = document.getElementById('toast');
    let timer;

    // Load saved state (falls back to defaults in HTML)
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) {}
    toggles.forEach(t => { if (t.dataset.key in saved) t.checked = saved[t.dataset.key]; });

    const labelOf = t => t.closest('.row').querySelector('strong').textContent;

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove('show'), 1800);
    }

    toggles.forEach(t => t.addEventListener('change', () => {
        saved[t.dataset.key] = t.checked;
        try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) {}
        showToast(`${labelOf(t)} ${t.checked ? 'turned on' : 'turned off'}`);
    }));

    // Settings sub-menu active state
    const links = document.querySelectorAll('#subnav a');
    links.forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        links.forEach(l => l.classList.remove('active'));
        a.classList.add('active');
    }));

    // ⌘K / Ctrl+K focuses search
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            document.getElementById('search').focus();
        }
    });
})();