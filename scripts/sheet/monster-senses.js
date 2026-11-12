/** Senses editing, individual sense chat sharing, and passive perception. */
import { MODULE_ID } from './monster-data.js';
import { prepareProficiencyData } from './monster-proficiencies.js';

const CATEGORY = 'senses';
const TYPES = ['blindsight', 'darkvision', 'tremorsense', 'truesight'];
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
    return `${capitalize(entry.type)} ${distance}`;
}

export function prepareSensesData(actor, proficiencies) {
    const saved = getSaved(actor);
    const group = {
        key: CATEGORY,
        label: 'Senses',
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
    const perception = proficiencies.skills.find((entry) => entry.key === 'prc');
    const perceptionModifier = perception
        ? Number(perception.modifier)
        : Number(actor.system.abilities?.wis?.mod ?? 0);
    return { group, entries: group.entries, hasEntries: saved.length > 0, passivePerception: 10 + perceptionModifier };
}

async function save(sheet, values) {
    sheet.rememberScrollPosition();
    try {
        await sheet.document.update({ [`flags.${MODULE_ID}.movement.${CATEGORY}`]: values });
    } catch (error) {
        sheet.pendingScrollTop = null;
        console.error('GMM | Senses update failed:', error);
        ui.notifications.error('Unable to save sense.');
    }
}

export function registerSensesListeners(sheet) {
    const root = sheet.element;
    const editor = root.querySelector('.gmm-senses-new');
    const close = () => {
        if (!editor) return;
        editor.hidden = true;
        const select = editor.querySelector('.gmm-senses-select');
        if (select) select.value = '';
        const custom = editor.querySelector('.gmm-senses-custom');
        if (custom) { custom.value = ''; custom.hidden = true; }
    };
    root.querySelector('.gmm-senses-add')?.addEventListener('click', () => {
        if (!sheet.editMode || !editor) return;
        editor.hidden = false;
        editor.querySelector('select')?.focus({ preventScroll: true });
    });
    root.querySelector('.gmm-senses-select')?.addEventListener('change', (event) => {
        const custom = editor?.querySelector('.gmm-senses-custom');
        if (!custom) return;
        custom.hidden = event.currentTarget.value !== '__custom__';
        if (!custom.hidden) custom.focus({ preventScroll: true });
    });
    root.querySelector('.gmm-senses-cancel')?.addEventListener('click', close);
    root.querySelector('.gmm-senses-save')?.addEventListener('click', async () => {
        if (!sheet.editMode || !editor) return;
        const selected = editor.querySelector('.gmm-senses-select')?.value;
        const type = (selected === '__custom__' ? editor.querySelector('.gmm-senses-custom')?.value.trim() : selected) ?? '';
        const rawDistance = editor.querySelector('.gmm-senses-distance')?.value;
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
            ui.notifications.warn('This sense has already been added.');
            return;
        }
        await save(sheet, [...saved, { type, distance }]);
    });
    root.querySelectorAll('.gmm-senses-remove').forEach((button) => button.addEventListener('click', async (event) => {
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
        if (event.target.closest('.gmm-senses-new, .gmm-senses-add')) return;
        close();
    });
}

export async function shareSense(event, target) {
    const rawIndex = target.dataset.index;
    const index = Number(rawIndex);
    if (rawIndex === undefined || rawIndex === '' || !Number.isInteger(index)) return;
    const entry = getSaved(this.document)[index];
    if (!entry) return;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<p><strong>${escapeHTML(this.document.name)}</strong> — Senses: ${escapeHTML(formatEntry(entry))}</p>`,
    });
}

export async function sharePassivePerception(event, target) {
    const value = prepareSensesData(this.document, prepareProficiencyData(this.document)).passivePerception;
    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<p><strong>${escapeHTML(this.document.name)}</strong> — Passive Perception: ${value}</p>`,
    });
}

