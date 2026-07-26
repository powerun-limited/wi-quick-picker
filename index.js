// WI Quick Picker v1.2

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
            width: min(560px, 96vw);
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

    // Returnerar lista med objekt: { title, bookName, uid }
    async function getActiveEntries() {
        const entries = [];

        try {
            const ctx = window.SillyTavern?.getContext?.();
            if (!ctx) return [];

            const select = document.getElementById('world_info');
            const activeBooks = [];

            if (select) {
                for (const option of select.options) {
                    if (option.selected) {
                        activeBooks.push(option.textContent.trim());
                    }
                }
            }

            console.log('[WI Quick Picker] Aktiva böcker:', activeBooks);

            for (const bookName of activeBooks) {
                try {
                    const data = await ctx.loadWorldInfo(bookName);
                    if (data?.entries) {
                        for (const uid in data.entries) {
                            const entry = data.entries[uid];
                            const title = (entry.comment || entry.title || '').trim();
                            if (title) {
                                entries.push({
                                    title,
                                    bookName,
                                    uid
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn(`Kunde inte ladda "${bookName}":`, err);
                }
            }
        } catch (err) {
            console.error('[WI Quick Picker] Fel:', err);
        }

        // Sortera efter titel
        entries.sort((a, b) => a.title.localeCompare(b.title));
        console.log('[WI Quick Picker] Hittade entries:', entries.length);
        return entries;
    }

    async function openWorldInfoEntry(bookName, uid) {
        try {
            // Öppna World Info-panelen om den är stängd
            const wiButton = document.querySelector('#WI_Button, [title*="World Info"], [title*="Lorebook"], #world_info_button');
            if (wiButton) {
                wiButton.click();
            }

            // Vänta lite så panelen hinner öppnas
            await new Promise(r => setTimeout(r, 300));

            // Välj rätt bok i selecten
            const select = document.getElementById('world_info');
            if (select) {
                for (const option of select.options) {
                    if (option.textContent.trim() === bookName) {
                        // Avmarkera alla och markera bara den här
                        for (const opt of select.options) opt.selected = false;
                        option.selected = true;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            }

            // Försök hitta och expandera entryn
            await new Promise(r => setTimeout(r, 400));

            // Leta efter entry med rätt uid
            const entryEl = document.querySelector(`[data-uid="${uid}"], .world_entry[data-uid="${uid}"]`);
            if (entryEl) {
                entryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Försök klicka för att expandera
                const header = entryEl.querySelector('.inline-drawer-toggle, .world_entry_form, .entry-header, summary');
                if (header) header.click();
            } else {
                // Fallback: ladda om editorn
                const ctx = window.SillyTavern?.getContext?.();
                if (ctx?.reloadWorldInfoEditor) {
                    ctx.reloadWorldInfoEditor(bookName, true);
                }
            }

            closeModal();
        } catch (err) {
            console.error('Kunde inte öppna entry:', err);
            alert('Kunde inte öppna entryt automatiskt. Öppna World Info manuellt.');
        }
    }

    async function showPicker() {
        createModal();
        const modal = document.getElementById('wi-quick-picker-modal');
        const input = document.getElementById('wi-picker-input');
        const results = document.getElementById('wi-picker-results');

        results.innerHTML = `<div style="padding:20px;text-align:center;opacity:0.7">Laddar World Info...</div>`;
        modal.style.display = 'flex';

        const allEntries = await getActiveEntries();

        function render(filter = '') {
            const q = filter.toLowerCase().trim();
            const filtered = q
                ? allEntries.filter(e => e.title.toLowerCase().includes(q))
                : allEntries;

            if (filtered.length === 0) {
                results.innerHTML = `<div style="padding:24px;text-align:center;opacity:0.6">Inga träffar</div>`;
                return;
            }

            results.innerHTML = filtered.map(entry => `
                <div class="wi-item" style="display:flex; align-items:center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); gap: 10px;">
                    <div class="wi-title" style="flex:1; cursor:pointer; padding: 4px 0;">${entry.title}</div>
                    <button class="wi-edit-btn menu_button" data-book="${entry.bookName}" data-uid="${entry.uid}" 
                        style="padding: 4px 10px; font-size: 12px; min-width: auto; white-space: nowrap;" title="Öppna i World Info">
                        ✎
                    </button>
                </div>
            `).join('');

            // Klick på titel = infoga
            results.querySelectorAll('.wi-title').forEach(el => {
                el.onclick = () => {
                    insertIntoChat(el.textContent);
                    closeModal();
                };
            });

            // Klick på redigera-knapp
            results.querySelectorAll('.wi-edit-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    openWorldInfoEntry(btn.dataset.book, btn.dataset.uid);
                };
            });
        }

        input.oninput = () => render(input.value);
        input.value = '';
        render();
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

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
            e.preventDefault();
            e.stopPropagation();
            showPicker();
        }
        if (e.key === 'Escape') closeModal();
    }, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButton);
    } else {
        addButton();
    }
    setTimeout(addButton, 2000);

    console.log('%c[WI Quick Picker] v1.2 redo', 'color: #6f6');
})();
