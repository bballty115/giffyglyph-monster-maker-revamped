export function registerHeaderListeners(sheet) {
        const nameInput = sheet.element.querySelector("[name='monsterName']");

        nameInput?.addEventListener('change', async (event) => {
            if (!sheet.editMode) return;

            const name = event.currentTarget.value.trim();

            if (!name) {
                ui.notifications.warn('Monster name cannot be empty.');

                event.currentTarget.value = sheet.document.name;
                return;
            }

            if (name === sheet.document.name) return;

            await sheet.document.update({ name });
        });
}

export async function editPortrait(event, target) {
        // Prevent portrait editing in View Mode.
        if (!this.editMode) return;

        const actor = this.document;

        const picker = new foundry.applications.apps.FilePicker.implementation({
            type: 'image',
            current: actor.img,

            callback: async (path) => {
                // Verify we're still editing before saving.
                if (!this.editMode) return;

                await actor.update({ img: path });
            },
        });

        await picker.render(true);
    }
