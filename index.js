// WI Quick Picker v1.1

(function () {
    'use strict';

    console.log('%c[WI Quick Picker] Startar...', 'color: #6f6');

    function createModal() {
        if (document.getElementById('wi-quick-picker-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'wi-quick-picker-modal';
        modal.style.cssText = `
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translateX(-50%);
            width: min(540px, 95vw);
            max-height: 75vh;
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
                    style="flex: 1; padding: 9px 13px; background: var(--black30a, #2a2a2a); border: 1px solid var(--SmartThemeBorderColor, #555); border-radius: 8px; color: inherit; font-size: 15px;">
                <button id="wi-picker-close" class="menu_button">Stäng</button>
            </div>
            <div id="wi-picker-results" style="overflow-y: auto; max-height: 60vh; padding: 6px 0;"></div>
        `;

        document.body.appendChild(modal);
        document.getElementById('wi-picker-close').onclick = closeModal;
    }

    function closeModal() {
        const modal = document.getElementById('wi-quick-picker-modal');
        if (modal) modal.style.display = 'none';
    }

 function getActiveTitles() {
    const titles = new Set();

    try {
        // Metod 1: Via window.world_info (vanligast)
        if (window.world_info && window.world_info.data) {
            for (const bookName in window.world_info.data) {
                const book = window.world_info.data[bookName];
                if (!book || !book.entries) continue;

                for (const uid in book.entries) {
                    const entry = book.entries[uid];
                    if (!entry) continue;

                    // Titeln ligger nästan alltid i "comment"
                    const title = (entry.comment || entry.title || entry.name || '').trim();
                    if (title.length > 1) {
                        titles.add(title);
                    }
                }
            }
        }

        // Metod 2: Via SillyTavern.getContext() (nyare versioner)
        if (titles.size === 0 && window.SillyTavern?.getContext) {
            const ctx = window.SillyTavern.getContext();
            if (ctx?.worldInfoData) {
                // Beroende på version
                console.log('Försöker via getContext...');
            }
        }

        // Metod 3: Läs direkt från World Info-panelen i DOM (fungerar även om den är stängd ibland)
        if (titles.size === 0) {
            document.querySelectorAll('#WorldInfo .world_entry, #WorldInfo .wi-entry, [data-uid]').forEach(el => {
                const commentEl = el.querySelector('textarea[name="comment"], input[name="comment"], .comment');
                if (commentEl) {
                    const t = (commentEl.value || commentEl.textContent || '').trim();
                    if (t) titles.add(t);
                }
            });
        }

        // Metod 4: Sista utväg – titta efter alla textareas som ser ut som WI-titlar
        if (titles.size === 0) {
            document.querySelectorAll('textarea').forEach(ta => {
                if (ta.name === 'comment' || ta.placeholder?.toLowerCase().includes('title') || ta.placeholder?.toLowerCase().includes('comment')) {
                    const t = ta.value.trim();
                    if (t.length > 2 && t.length < 120) {
                        titles.add(t);
                    }
                }
            });
        }

    } catch (err) {
        console.error('[WI Quick Picker] Fel:', err);
    }

    console.log('[WI Quick Picker] Hittade titlar:', titles.size);
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
}

    function showPicker() {
        createModal();
        const modal = document.getElementById('wi-quick-picker-modal');
        const input = document.getElementById('wi-picker-input');
        const results = document.getElementById('wi-picker-results');
        const allTitles = getActiveTitles();

        function render(filter = '') {
            const q = filter.toLowerCase().trim();
            const filtered = q ? allTitles.filter(t => t.toLowerCase().includes(q)) : allTitles;

            results.innerHTML = filtered.length
                ? filtered.map(title => 
                    `<div class="wi-item" style="padding:12px 18px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06)">${title}</div>`
                  ).join('')
                : `<div style="padding:24px;text-align:center;opacity:0.6">Inga träffar</div>`;

            results.querySelectorAll('.wi-item').forEach(el => {
                el.onmouseenter = () => el.style.background = 'rgba(255,255,255,0.08)';
                el.onmouseleave = () => el.style.background = 'transparent';
                el.onclick = () => {
                    insertIntoChat(el.textContent);
                    closeModal();
                };
            });
        }

        input.oninput = () => render(input.value);
        input.value = '';
        render();
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
    }

    function insertIntoChat(text) {
        const ta = document.getElementById('send_textarea');
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + text.length;
        ta.focus();
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // === Lägg till en synlig knapp ===
    function addButton() {
        if (document.getElementById('wi-picker-btn')) return;

        const btn = document.createElement('div');
        btn.id = 'wi-picker-btn';
        btn.title = 'World Info Quick Picker';
        btn.innerHTML = 'WI';
        btn.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 18px;
            width: 42px;
            height: 42px;
            background: #3a3a3a;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border: 1px solid #666;
        `;
        btn.onclick = showPicker;
        document.body.appendChild(btn);
    }

    // Genväg (fungerar bättre på dator)
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
            e.preventDefault();
            e.stopPropagation();
            showPicker();
        }
        if (e.key === 'Escape') closeModal();
    }, true);

    // Starta när sidan är redo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButton);
    } else {
        addButton();
    }

    // Extra säkerhet – försök igen efter en stund
    setTimeout(addButton, 2000);

    console.log('%c[WI Quick Picker] Redo – klicka på WI-knappen nere till höger eller Ctrl+Shift+F', 'color: #6f6');
})();
