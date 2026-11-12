import { MODULE_ID } from './monster-data.js';

export function registerCombatListeners(sheet) {
        const combatInputs = sheet.element.querySelectorAll('.gmm-combat-input');

        for (const input of combatInputs) {
            input.addEventListener('change', (event) =>
                saveCombatStat.call(sheet, event),
            );
        }
}

export async function saveCombatStat(event) {
        if (!this.editMode) return;

        const input = event.currentTarget;
        const stat = input.dataset.stat;

        const allowedStats = [
            'ac',
            'hp',
            'hpMax',
            'attack',
            'dc',
            'damage',
            'reach',
            'range',
        ];

        if (!allowedStats.includes(stat)) return;

        // Reject empty or non-integer values.
        if (input.value.trim() === '') {
            ui.notifications.warn('Please enter a number.');
            await this.render();
            return;
        }

        const value = Number(input.value);

        if (!Number.isSafeInteger(value)) {
            ui.notifications.warn('Please enter a whole number.');
            await this.render();
            return;
        }

        // Basic validation.
        const minimum = stat === 'attack' ? -100 : 0;

        if (value < minimum) {
            ui.notifications.warn('That value is too low.');
            await this.render();
            return;
        }

        try {
            const actor = this.document;

            if (stat === 'ac') {
                await actor.update({
                    'system.attributes.ac.calc': 'flat',
                    'system.attributes.ac.flat': value,
                });
            } else if (stat === 'hp') {
                await actor.update({
                    'system.attributes.hp.value': value,
                });
            } else if (stat === 'hpMax') {
                await actor.update({
                    'system.attributes.hp.max': value,
                });
            } else {
                await actor.update({
                    [`flags.${MODULE_ID}.combat.${stat}`]: value,
                });
            }

            console.log(`GMM | Updated ${stat} to ${value}`);
        } catch (error) {
            console.error('GMM | Failed to save combat stat:', error);
            ui.notifications.error('Failed to save combat statistic.');
            await this.render();
        }
    }
