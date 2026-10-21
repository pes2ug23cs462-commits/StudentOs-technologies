(() => {
    const STORE = 'studentos-ai';
    const toggles = document.querySelectorAll('.switch input[data-key]');
    const master = document.querySelector('[data-key="assistant"]');
    const readCard = document.getElementById('readCard');
    const toast = document.getElementById('toast');
    let timer;

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) {}
    toggles.forEach(t => { if (t.dataset.key in saved) t.checked = saved[t.dataset.key]; });

    // Data-access toggles are locked while the assistant is off
    function syncMaster() {
        const on = master.checked;
        readCard.classList.toggle('is-off', !on);
        readCard.querySelectorAll('input').forEach(i => { i.disabled = !on; });
    }
    syncMaster();

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
        if (t === master) syncMaster();
        showToast(`${labelOf(t)} ${t.checked ? 'turned on' : 'turned off'}`);
    }));

    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            document.getElementById('search').focus();
        }
    });
})();