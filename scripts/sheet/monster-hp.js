export async function adjustHP(event, target) {
        // This action is only available in View Mode.
        if (this.editMode) return;

        const actor = this.document;

        const currentHP = actor.system.attributes.hp.value ?? 0;
        const maxHP = actor.system.attributes.hp.max ?? 0;

        // Open a dialog to request the HP change.
        const result = await foundry.applications.api.DialogV2.input({
            window: {
                title: `Adjust HP: ${actor.name}`,
            },

            content: `
            <div class="gmm-hp-dialog">

                <p>
                    Current HP:
                    <strong>${currentHP} / ${maxHP}</strong>
                </p>

                <label for="gmm-hp-adjustment">
                    Enter HP Adjustment
                </label>

                <input
                    id="gmm-hp-adjustment"
                    type="text"
                    name="hpAdjustment"
                    placeholder="25, -5, or +10"
                    autocomplete="off"
                    autofocus
                >

                <p class="gmm-hp-help">
                    <strong>25</strong> sets HP to 25.<br>
                    <strong>-5</strong> deals 5 damage.<br>
                    <strong>+10</strong> heals 10 HP.
                </p>

            </div>
        `,

            ok: {
                label: 'Apply',
            },

            rejectClose: false,
        });

        // User canceled the dialog.
        if (!result) return;

        const input = String(result.hpAdjustment ?? '').trim();

        // Accept only whole numbers, with an optional + or -.
        if (!/^[+-]?\d+$/.test(input)) {
            ui.notifications.warn(
                'Enter a valid HP value, such as 25, -5, or +10.',
            );
            return;
        }

        const amount = Number(input);

        if (!Number.isSafeInteger(amount)) {
            ui.notifications.warn('HP adjustment is too large.');
            return;
        }

        // Read fresh HP in case it changed while the dialog was open.
        const hpData = actor.system.attributes.hp;

        const oldHP = hpData.value ?? 0;
        const maximum = hpData.max ?? 0;

        let newHP;

        if (input.startsWith('+') || input.startsWith('-')) {
            // Relative adjustment.
            newHP = oldHP + amount;
        } else {
            // Absolute HP value.
            newHP = amount;
        }

        // Clamp HP between 0 and maximum HP.
        newHP = Math.max(0, Math.min(maximum, newHP));

        try {
            await actor.update({
                'system.attributes.hp.value': newHP,
            });

            console.log(`GMM | ${actor.name}: HP ${oldHP} -> ${newHP}`);
        } catch (error) {
            console.error('GMM | HP adjustment failed:', error);

            ui.notifications.error('Failed to update monster HP.');
        }
    }
