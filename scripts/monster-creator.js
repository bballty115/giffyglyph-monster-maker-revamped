/**
 * Giffyglyph Monster Maker Revamped
 * Monster creation functionality.
 */

const MODULE_ID = 'giffyglyph-monster-maker-revamped';

export async function createScalingMonster() {
    try {
        const actor = await Actor.create({
            name: 'New Scaling Monster',
            type: 'npc',

            flags: {
                [MODULE_ID]: {
                    isScalingMonster: true,
                },

                core: {
                    sheetClass: `${MODULE_ID}.GiffyglyphMonsterSheet`,
                },
            },
        });

        if (!actor) {
            throw new Error('Actor creation failed.');
        }

        console.log('GMM | Monster created:', actor);

        await actor.sheet.render(true);
    } catch (error) {
        console.error('GMM | Monster creation failed:', error);

        ui.notifications.error('Failed to create Scaling Monster.');
    }
}
