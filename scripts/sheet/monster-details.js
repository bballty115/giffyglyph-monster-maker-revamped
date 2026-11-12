/** Languages, carried items, and experience points. */
import { MODULE_ID } from './monster-data.js';

const LISTS = {
    languages: { label: 'Languages', singular: 'Language' },
    items: { label: 'Items', singular: 'Item' },
};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function getDetails(actor) {
    const raw = actor.getFlag(MODULE_ID, 'details') ?? {};
    const cleanList = (key) => Array.isArray(raw[key])
        ? raw[key].filter((entry) => typeof entry === 'string' && entry.trim())
            .map((entry) => entry.trim())
        : [];
    const xp = raw.xp === undefined || raw.xp === null || raw.xp === ''
        ? null : Number(raw.xp);
    return {
        languages: cleanList('languages'),
        items: cleanList('items'),
        xp: Number.isSafeInteger(xp) && xp >= 0 ? xp : null,
    };
}

export function prepareDetailsData(actor) {
    const saved = getDetails(actor);
    const groups = Object.entries(LISTS).map(([key, config]) => ({
        key,
        label: config.label,
        entries: saved[key].map((value, index) => ({ value, index })),
    }));
    return {
        groups,
        languages: saved.languages.map((value, index) => ({ value, index })),
        items: saved.items.map((value, index) => ({ value, index })),
        hasLanguages: saved.languages.length > 0,
        hasItems: saved.items.length > 0,
        xp: saved.xp ?? '',
        hasXP: saved.xp !== null,
    };
}

async function updateDetails(sheet, key, value) {
    sheet.rememberScrollPosition();
    try {
        await sheet.document.update({ [`flags.${MODULE_ID}.details.${key}`]: value });
    } catch (error) {
        sheet.pendingScrollTop = null;
        console.error(`GMM | Failed to update ${key}:`, error);
        ui.notifications.error('Unable to save monster details.');
    }
}

export function registerDetailsListeners(sheet) {
    const root = sheet.element;
    const findEditor = (category) => root.querySelector(`.gmm-details-new[data-category="${category}"]`);
    const closeEditor = (editor) => {
        if (!editor) return;
        editor.hidden = true;
        const input = editor.querySelector('.gmm-details-input');
        if (input) input.value = '';
    };

    root.querySelectorAll('.gmm-details-add').forEach((button) => {
        button.addEventListener('click', (event) => {
            if (!sheet.editMode) return;
            const category = event.currentTarget.dataset.category;
            if (!Object.hasOwn(LISTS, category)) return;
            const editor = findEditor(category);
            if (!editor) return;
            root.querySelectorAll('.gmm-details-new').forEach((other) => {
                if (other !== editor) closeEditor(other);
            });
            editor.hidden = false;
            editor.querySelector('.gmm-details-input')?.focus({ preventScroll: true });
        });
    });

    root.querySelectorAll('.gmm-details-cancel').forEach((button) => {
        button.addEventListener('click', (event) => {
            closeEditor(findEditor(event.currentTarget.dataset.category));
        });
    });

    root.querySelectorAll('.gmm-details-save').forEach((button) => {
        button.addEventListener('click', async (event) => {
            if (!sheet.editMode) return;
            const category = event.currentTarget.dataset.category;
            if (!Object.hasOwn(LISTS, category)) return;
            const editor = findEditor(category);
            const value = editor?.querySelector('.gmm-details-input')?.value.trim() ?? '';
            if (!value || value.length > 100) {
                ui.notifications.warn('Enter a name between 1 and 100 characters.');
                return;
            }
            const values = getDetails(sheet.document)[category];
            if (values.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
                ui.notifications.warn(`This ${LISTS[category].singular.toLowerCase()} has already been added.`);
                return;
            }
            await updateDetails(sheet, category, [...values, value]);
        });
    });

    root.querySelectorAll('.gmm-details-remove').forEach((button) => {
        button.addEventListener('click', async (event) => {
            if (!sheet.editMode) return;
            const { category, index: rawIndex } = event.currentTarget.dataset;
            if (!Object.hasOwn(LISTS, category) || rawIndex === undefined || rawIndex === '') return;
            const index = Number(rawIndex);
            const values = getDetails(sheet.document)[category];
            if (!Number.isInteger(index) || index < 0 || index >= values.length) return;
            await updateDetails(sheet, category, values.filter((_, i) => i !== index));
        });
    });

    root.querySelectorAll('.gmm-details-xp').forEach((input) => {
        input.addEventListener('change', async (event) => {
            if (!sheet.editMode) return;
            const raw = event.currentTarget.value.trim();
            const xp = raw === '' ? null : Number(raw);
            if (raw !== '' && (!Number.isSafeInteger(xp) || xp < 0)) {
                ui.notifications.warn('XP must be a nonnegative whole number.');
                return;
            }
            await updateDetails(sheet, 'xp', xp);
        });
    });

    root.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.gmm-details-new, .gmm-details-add')) return;
        root.querySelectorAll('.gmm-details-new').forEach(closeEditor);
    });
}

export async function shareDetail(event, target) {
    const { category, index: rawIndex } = target.dataset;
    if (!Object.hasOwn(LISTS, category) || rawIndex === undefined || rawIndex === '') return;
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 0) return;
    const entry = getDetails(this.document)[category][index];
    if (!entry) return;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<p><strong>${escapeHTML(this.document.name)}</strong> — ${LISTS[category].singular}: ${escapeHTML(entry)}</p>`,
    });
}

export async function shareXP(event, target) {
    const xp = getDetails(this.document).xp;
    if (xp === null) return;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<p><strong>${escapeHTML(this.document.name)}</strong> — XP: ${xp}</p>`,
    });
}
