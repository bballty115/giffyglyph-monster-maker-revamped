import { MODULE_ID } from './monster-data.js';

export const DAMAGE_TYPES = [
    'acid',
    'bludgeoning',
    'cold',
    'fire',
    'force',
    'lightning',
    'necrotic',
    'piercing',
    'poison',
    'psychic',
    'radiant',
    'slashing',
    'thunder',
];

export const CONDITION_TYPES = [
    'blinded',
    'charmed',
    'deafened',
    'exhaustion',
    'frightened',
    'grappled',
    'incapacitated',
    'invisible',
    'paralyzed',
    'petrified',
    'poisoned',
    'prone',
    'restrained',
    'stunned',
    'unconscious',
];

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

const CATEGORIES = {
    resistances: DAMAGE_TYPES,
    damageImmunities: DAMAGE_TYPES,
    conditionImmunities: CONDITION_TYPES,
};

const LABELS = {
    resistances: 'Damage Resistances',
    damageImmunities: 'Damage Immunities',
    conditionImmunities: 'Condition Immunities',
};

function getDefenses(actor) {
    const saved = actor.getFlag(MODULE_ID, 'defenses') ?? {};

    return Object.fromEntries(
        Object.keys(CATEGORIES).map((category) => [
            category,
            Array.isArray(saved[category]) ? [...saved[category]] : [],
        ]),
    );
}

export function prepareDefenseData(actor) {
    const saved = getDefenses(actor);

    const groups = Object.entries(CATEGORIES).map(([key, types]) => {
        const values = saved[key];

        return {
            key,
            label: LABELS[key],
            entries: values.map((value, index) => ({
                index,
                label: capitalize(value),
            })),

            options: [
                ...types.map((value) => {
                    const alreadySelected = values.some(
                        (selected) =>
                            selected.toLowerCase() === value.toLowerCase(),
                    );

                    return {
                        value,
                        label: alreadySelected
                            ? `${capitalize(value)} (Already added)`
                            : capitalize(value),
                        disabled: alreadySelected,
                    };
                }),
                {
                    value: '__custom__',
                    label: 'Custom',
                    disabled: false,
                },
            ],
        };
    });

    return {
        groups,

        // Individual entries for clickable View Mode defenses.
        resistanceEntries: saved.resistances.map((value) => ({
            value,
            label: capitalize(value),
        })),
        damageImmunityEntries: saved.damageImmunities.map((value) => ({
            value,
            label: capitalize(value),
        })),
        conditionImmunityEntries: saved.conditionImmunities.map((value) => ({
            value,
            label: capitalize(value),
        })),

        resistances: saved.resistances.map(capitalize).join(', '),
        damageImmunities: saved.damageImmunities.map(capitalize).join(', '),
        conditionImmunities: saved.conditionImmunities
            .map(capitalize)
            .join(', '),

        hasResistances: saved.resistances.length > 0,
        hasDamageImmunities: saved.damageImmunities.length > 0,
        hasConditionImmunities: saved.conditionImmunities.length > 0,

        hasBothImmunities:
            saved.damageImmunities.length > 0 &&
            saved.conditionImmunities.length > 0,

        hasAnyImmunities:
            saved.damageImmunities.length > 0 ||
            saved.conditionImmunities.length > 0,
    };
}

async function saveDefenses(sheet, category, values) {
    sheet.rememberScrollPosition();

    try {
        await sheet.document.update({
            [`flags.${MODULE_ID}.defenses.${category}`]: values,
        });
    } catch (error) {
        sheet.pendingScrollTop = null;
        throw error;
    }
}

export function registerDefenseListeners(sheet) {
    const root = sheet.element;

    /**
     * Close an Add editor and clear its inputs.
     */
    function closeEditor(editor) {
        if (!editor) return;

        editor.hidden = true;

        const select = editor.querySelector('.gmm-defense-select');
        const custom = editor.querySelector('.gmm-defense-custom');

        if (select) select.value = '';

        if (custom) {
            custom.value = '';
            custom.hidden = true;
        }
    }

    /**
     * Find an editor by category.
     */
    function findEditor(category) {
        return root.querySelector(
            `.gmm-defense-new[data-category="${category}"]`,
        );
    }

    /**
     * Open the selected defense editor.
     */
    root.querySelectorAll('.gmm-defense-add').forEach((button) => {
        button.addEventListener('click', (event) => {
            if (!sheet.editMode) return;

            const category = event.currentTarget.dataset.category;
            if (!CATEGORIES[category]) return;

            const editor = findEditor(category);
            if (!editor) return;

            // Only one editor should be open at a time.
            root.querySelectorAll('.gmm-defense-new').forEach((other) => {
                if (other !== editor) closeEditor(other);
            });

            editor.hidden = false;

            editor.querySelector('select')?.focus({
                preventScroll: true,
            });
        });
    });

    /**
     * Dropdown selection.
     */
    root.querySelectorAll('.gmm-defense-select').forEach((select) => {
        select.addEventListener('change', (event) => {
            const category = event.currentTarget.dataset.category;
            const editor = findEditor(category);

            const custom = editor?.querySelector('.gmm-defense-custom');

            if (!custom) return;

            custom.hidden = event.currentTarget.value !== '__custom__';

            if (!custom.hidden) custom.focus();
        });
    });

    /**
     * Cancel buttons.
     */
    root.querySelectorAll('.gmm-defense-cancel').forEach((button) => {
        button.addEventListener('click', (event) => {
            const category = event.currentTarget.dataset.category;
            closeEditor(findEditor(category));
        });
    });

    /**
     * Save buttons.
     */
    root.querySelectorAll('.gmm-defense-save').forEach((button) => {
        button.addEventListener('click', async (event) => {
            if (!sheet.editMode) return;

            const category = event.currentTarget.dataset.category;
            if (!CATEGORIES[category]) return;

            const editor = findEditor(category);
            if (!editor) return;

            const selection = editor.querySelector('select')?.value;

            const value =
                selection === '__custom__'
                    ? editor.querySelector('.gmm-defense-custom').value.trim()
                    : selection;

            if (!value) {
                ui.notifications.warn(
                    'Select or enter an immunity or resistance.',
                );
                return;
            }

            if (value.length > 100) {
                ui.notifications.warn(
                    'Custom entries must be 100 characters or fewer.',
                );
                return;
            }

            const saved = getDefenses(sheet.document);
            const values = saved[category];

            if (
                values.some(
                    (item) => item.toLowerCase() === value.toLowerCase(),
                )
            ) {
                ui.notifications.warn('This entry has already been added.');
                return;
            }

            if (
                selection === '__custom__' &&
                CATEGORIES[category].includes(value.toLowerCase())
            ) {
                ui.notifications.warn(
                    'This is already a standard option. Please select it from the dropdown.',
                );
                return;
            }

            try {
                await saveDefenses(sheet, category, [...values, value]);
            } catch (error) {
                console.error('GMM | Failed to add defense:', error);
                ui.notifications.error('Unable to add defense.');
            }
        });
    });

    /**
     * Remove buttons.
     */
    root.querySelectorAll('.gmm-defense-remove').forEach((button) => {
        button.addEventListener('click', async (event) => {
            if (!sheet.editMode) return;

            const category = event.currentTarget.dataset.category;
            const rawIndex = event.currentTarget.dataset.index;
            const index = Number(rawIndex);

            if (
                !CATEGORIES[category] ||
                rawIndex === undefined ||
                rawIndex === '' ||
                !Number.isInteger(index)
            ) {
                return;
            }

            const saved = getDefenses(sheet.document);
            const values = saved[category];

            if (index < 0 || index >= values.length) return;

            values.splice(index, 1);

            try {
                await saveDefenses(sheet, category, values);
            } catch (error) {
                console.error('GMM | Failed to remove defense:', error);
                ui.notifications.error('Unable to remove defense.');
            }
        });
    });

    /**
     * Close editors when clicking elsewhere.
     *
     * Attach this to the sheet itself rather than document,
     * so it is automatically discarded when Foundry rerenders.
     */
    root.addEventListener('pointerdown', (event) => {
        const clickedInsideEditor = event.target.closest('.gmm-defense-new');

        const clickedAddButton = event.target.closest('.gmm-defense-add');

        if (clickedInsideEditor || clickedAddButton) return;

        root.querySelectorAll('.gmm-defense-new').forEach(closeEditor);
    });
}

/**
 * Share one selected resistance or immunity to Foundry chat.
 * Called by the View Mode buttons via data-action="shareDefenses".
 */
export async function shareDefenses(event, target) {
    const category = target.dataset.category;
    const value = target.dataset.value;

    const labels = {
        resistances: 'Resistance',
        damageImmunities: 'Damage Immunity',
        conditionImmunities: 'Condition Immunity',
    };

    if (!Object.hasOwn(labels, category)) return;

    // Only allow sharing an entry currently saved on this Actor.
    const defenses = getDefenses(this.document);
    if (!defenses[category].includes(value)) return;

    const actor = this.document;
    const content = `
        <div class="gmm-defense-chat">
            <h3>${escapeHTML(actor.name)}</h3>
            <p><strong>${labels[category]}:</strong> ${escapeHTML(capitalize(value))}</p>
        </div>
    `;

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
    });
}

/**
 * Escape user-provided text before inserting it into chat HTML.
 */
function escapeHTML(value) {
    return String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character],
    );
}
