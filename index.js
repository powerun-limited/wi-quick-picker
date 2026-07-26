import { eventSource, event_types } from '../../../script.js';
import { world_info, getSortedEntries } from '../../world-info.js';

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
        font-family: var(--mainFontFamily);
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
    if (modal) {
        modal.style.display = 'none';
    }
}

function getActiveTitles() {
    const titles = new Set();

    try {
        // Hämta alla entries från aktiva böcker via SillyTaverns egna funktion
        const entries = getSortedEntries();

        for (const entry of entries) {
            // Endast entries som faktiskt är aktiva/laddade
            if (!entry) continue;

            const title = (entry.comment || entry.title || '').trim();
            if (title.length > 0) {
                titles.add(title);
            }
        }
    } catch (err) {
        console.error('[WI Quick Picker] Kunde inte hämta entries:', err);
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
        const filtered = q
            ? allTitles.filter(t => t.toLowerCase().includes(q))
            : allTitles;

        results.innerHTML = '';

        if (filtered.length === 0) {
            results.innerHTML = `<div style="padding: 24px; text-align: center; opacity: 0.6;">Inga träffar</div>`;
            return;
        }

        filtered.forEach(title => {
            const item = document.createElement('div');
            item.className = 'wi-picker-item';
            item.textContent = title;
            item.style.cssText = `
                padding: 11px 18px;
                cursor: pointer;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                font-size: 14px;
                transition: background 0.12s;
            `;

            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255,255,255,0.08)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });

            item.addEventListener('click', () => {
                insertIntoChat(title);
                closeModal();
            });

            results.appendChild(item);
        });
    }

    input.oninput = () => render(input.value);
    input.value = '';
    render();

    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 30);
}

function insertIntoChat(text) {
    const textarea = document.getElementById('send_textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    textarea.value = value.slice(0, start) + text + value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();

    // Meddela SillyTavern att innehållet ändrats
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// === Hotkey: Ctrl + Shift + F ===
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'F') {
        // Förhindra webbläsarens egna sök
        e.preventDefault();
        e.stopPropagation();

        const modal = document.getElementById('wi-quick-picker-modal');
        if (modal && modal.style.display === 'flex') {
            closeModal();
        } else {
            showPicker();
        }
    }

    // Stäng med Escape
    if (e.key === 'Escape') {
        closeModal();
    }
}, true);

// Init
console.log('[WI Quick Picker] Extension laddad – Ctrl+Shift+F');