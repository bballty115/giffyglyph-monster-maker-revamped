export function registerAbilityListeners(sheet) {
        const abilityInputs =
            sheet.element.querySelectorAll('.gmm-ability-input');

        for (const input of abilityInputs) {
            input.addEventListener('change', async (event) => {
                if (!sheet.editMode) return;

                const field = event.currentTarget;
                const abilityKey = field.dataset.ability;

                const validAbilities = [
                    'str',
                    'dex',
                    'con',
                    'int',
                    'wis',
                    'cha',
                ];

                if (!validAbilities.includes(abilityKey)) return;

                const score = Number(field.value);

                // Validate the entered score.
                if (!Number.isInteger(score) || score < 1 || score > 30) {
                    ui.notifications.warn(
                        'Ability scores must be between 1 and 30.',
                    );

                    field.value =
                        sheet.document.system.abilities[abilityKey].value;

                    return;
                }

                // Don't update if nothing changed.
                const currentScore =
                    sheet.document.system.abilities[abilityKey].value;

                if (score === currentScore) return;

                try {
                    // Save the new score to the D&D 5e Actor.
                    await sheet.document.update({
                        [`system.abilities.${abilityKey}.value`]: score,
                    });

                    console.log(
                        `GMM | Updated ${abilityKey.toUpperCase()} to ${score}`,
                    );
                } catch (error) {
                    console.error('GMM | Failed to update ability:', error);

                    ui.notifications.error('Failed to update ability score.');

                    field.value =
                        sheet.document.system.abilities[abilityKey].value;
                }
            });
        }
}

export async function rollAbility(event, target) {
        // Never roll abilities while editing.
        if (this.editMode) return;

        // Determine which ability was clicked.
        const abilityKey = target.dataset.ability;

        // Validate the ability.
        const validAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        if (!validAbilities.includes(abilityKey)) return;

        try {
            const actor = this.document;

            // Roll using the D&D 5e system API.
            await actor.rollAbilityCheck({
                ability: abilityKey,
            });
        } catch (error) {
            console.error('GMM | Ability roll failed:', error);

            ui.notifications.error(
                'Unable to roll ability check. See console.',
            );
        }
    }
