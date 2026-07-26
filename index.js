// WI Quick Picker - stabil version

(function () {
    'use strict';

    const MODULE_NAME = 'wi-quick-picker';

    function createModal() {
        if (document.getElementById('wi-quick-picker-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'wi-quick-picker-modal';
        modal.style.cssText = `
            position: fixed;
            top: 12%;
            left: 50%;
            transform: translateX(-50%);
            width: 540px;
            max-height: 72vh;
            background: var(--SmartThemeBodyColor, #1e1e1e);
            border: 1px solid var(--SmartThemeBorderColor, #555);
            border-radius: 12px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.55);
            z-index: 10000;
            display: none;
            flex-direction: column;
            font-family: var(--mainFontFamily, system-ui);
            color: var(--SmartThemeBodyColor, #eee);
            overflow: hidden;
        `;

        modal.innerHTML = `
            <div style="padding: 14px 16px; border-bottom: 1px solid var(--SmartThemeBorderColor, #444); display: flex; gap: 10px; align-items: center;">
                <input id="wi-picker-input" type="text" placeholder="Filtrera på titel..." autocomplete="off"
                    style="flex: 1; padding: 9px 13px; background: var(--black30a, #2a2a2a); border: 1px solid var(--SmartThemeBorderColor, #555); border-radius: 8px; color: inherit; font-size: 14px;">
                <button id="wi-picker-close" class="menu_button" style="min-width: 60px;">Stäng</button>
            </div>
            <div id="wi-picker-results" style="overflow-y: auto; max-height: 58vh; padding: 6px 0;"></div>
        `;

        document.body.appendChild(modal);

        document.getElementById('wi-picker-close').addEventListener('click', closeModal);
    }

    function closeModal() {
        const modal = document.getElementById('wi-quick-picker-modal');
        if (modal) modal.style.display = 'none';
    }

    function getActiveTitles() {
        const titles = new Set();

        try {
            // Försök hämta via SillyTaverns interna data
            // Fungerar på de flesta versioner
            if (window.world_info && window.world_info.data) {
                const data = window.world_info.data;

                for (const bookName in data) {
                    const book = data[bookName];
                    if (!book || !book.entries) continue;

                    for (const uid in book.entries) {
                        const entry = book.entries[uid];
                        if (!entry) continue;

                        const title = (entry.comment || entry.title || '').trim();
                        if (title) titles.add(title);
                    }
                }
            }

            // Extra fallback via DOM om ovanstående ger noll
            if (titles.size === 0) {
                document.querySelectorAll('#WorldInfo textarea[name="comment"], #WorldInfo input[name="comment"]').forEach(el => {
                    const t = (el.value || '').trim();
                    if (t) titles.add(t);
                });
            }
        } catch (err) {
            console.error('[WI Quick Picker] Fel vid hämtning av titles:', err);
        }

        return Array.from(titles).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }

    function showPicker() {
        createModal();

        const modal = document.getElementById('wi-quick-picker-modal');
        const input = document.getElementById('wi-picker-input');
        const results = document.getElementById('wi-picker-results');

        const allTitles = getActiveTitles();

        function render(filter = '') {
            const q = filter.trim().toLowerCase();
            const filtered = q ? allTitles.filter(t => t.toLowerCase().includes(q)) : allTitles;

            results.
