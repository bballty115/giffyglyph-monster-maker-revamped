/** Speed editing and individual speed chat sharing. */
import { MODULE_ID } from './monster-data.js';


const CATEGORY = 'speeds';
const TYPES = ['walk', 'fly', 'climb', 'swim', 'burrow'];
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);

function getSaved(actor) {
    const raw = actor.getFlag(MODULE_ID, 'movement') ?? {};
    return Array.isArray(raw[CATEGORY])
        ? raw[CATEGORY].filter((entry) => entry && typeof entry.type === 'string' && entry.type.trim() && entry.distance !== '' && entry.distance !== null && Number.isFinite(Number(entry.distance)))
            .map((entry) => ({ type: entry.type, distance: Number(entry.distance) }))
        : [];
}

function formatEntry(entry) {
    const distance = `${entry.distance} ft`;
    return entry.type.toLowerCase() === 'walk' ? distance : `${capitalize(entry.type)} ${distance}`;
}

export function prepareMovementData(actor) {
    const saved = getSaved(actor);
    const group = {
        key: CATEGORY,
        label: 'Speed',
        entries: saved.map((entry, index) => ({ index, label: formatEntry(entry) })),
        options: [
            ...TYPES.map((type) => ({
                value: type,
                label: capitalize(type),
                disabled: saved.some((entry) => entry.type.toLowerCase() === type),
            })),
            { value: '__custom__', label: 'Custom', disabled: false },
        ],
    };
    return { group, entries: group.entries, hasEntries: saved.length > 0 };
}

async function save(sheet, values) {
    sheet.rememberScrollPosition();
    try {
        await sheet.document.update({ [`flags.${MODULE_ID}.movement.${CATEGORY}`]: values });
    } catch (error) {
        sheet.pendingScrollTop = null;
        console.error('GMM | Speed update failed:', error);
        ui.notifications.error('Unable to save speed.');
    }
}

export function registerMovementListeners(sheet) {
    const root = sheet.element;
    const editor = root.querySelector('.gmm-movement-new');
    const close = () => {
        if (!editor) return;
        editor.hidden = true;
        const select = editor.querySelector('.gmm-movement-select');
        if (select) select.value = '';
        const custom = editor.querySelector('.gmm-movement-custom');
        if (custom) { custom.value = ''; custom.hidden = true; }
    };
    root.querySelector('.gmm-movement-add')?.addEventListener('click', () => {
        if (!sheet.editMode || !editor) return;
        editor.hidden = false;
        editor.querySelector('select')?.focus({ preventScroll: true });
    });
    root.querySelector('.gmm-movement-select')?.addEventListener('change', (event) => {
        const custom = editor?.querySelector('.gmm-movement-custom');
        if (!custom) return;
        custom.hidden = event.currentTarget.value !== '__custom__';
        if (!custom.hidden) custom.focus({ preventScroll: true });
    });
    root.querySelector('.gmm-movement-cancel')?.addEventListener('click', close);
    root.querySelector('.gmm-movement-save')?.addEventListener('click', async () => {
        if (!sheet.editMode || !editor) return;
        const selected = editor.querySelector('.gmm-movement-select')?.value;
        const type = (selected === '__custom__' ? editor.querySelector('.gmm-movement-custom')?.value.trim() : selected) ?? '';
        const rawDistance = editor.querySelector('.gmm-movement-distance')?.value;
        const distance = Number(rawDistance);
        if (!type || type.length > 100 || !rawDistance || !Number.isInteger(distance) || distance < 0 || distance > 99999) {
            ui.notifications.warn('Choose a type and enter a whole-number distance from 0 to 99999 feet.');
            return;
        }
        if (selected === '__custom__' && TYPES.includes(type.toLowerCase())) {
            ui.notifications.warn('Choose that type from the dropdown instead.');
            return;
        }
        const saved = getSaved(sheet.document);
        if (saved.some((entry) => entry.type.toLowerCase() === type.toLowerCase())) {
            ui.notifications.warn('This speed has already been added.');
            return;
        }
        await save(sheet, [...saved, { type, distance }]);
    });
    root.querySelectorAll('.gmm-movement-remove').forEach((button) => button.addEventListener('click', async (event) => {
        if (!sheet.editMode) return;
        const rawIndex = event.currentTarget.dataset.index;
        const index = Number(rawIndex);
        if (rawIndex === undefined || rawIndex === '' || !Number.isInteger(index)) return;
        const saved = getSaved(sheet.document);
        if (index < 0 || index >= saved.length) return;
        saved.splice(index, 1);
        await save(sheet, saved);
    }));
    root.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.gmm-movement-new, .gmm-movement-add')) return;
        close();
    });
}

export async function shareMovement(event, target) {
    const rawIndex = target.dataset.index;
    const index = Number(rawIndex);
    if (rawIndex === undefined || rawIndex === '' || !Number.isInteger(index)) return;
    const entry = getSaved(this.document)[index];
    if (!entry) return;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<p><strong>${escapeHTML(this.document.name)}</strong> — Speed: ${escapeHTML(formatEntry(entry))}</p>`,
    });
}

