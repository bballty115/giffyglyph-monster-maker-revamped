/** Initiative bonus and active Combat Tracker integration. */
import { MODULE_ID } from './monster-data.js';

const signed = (value) => (value >= 0 ? `+${value}` : String(value));

export function prepareInitiativeData(actor) {
    const saved = actor.getFlag(MODULE_ID, 'initiativeBonus');
    const additional =
        Number.isInteger(Number(saved)) && saved !== null && saved !== undefined
            ? Number(saved)
            : 0;
    const dexterity = Number(actor.system.abilities?.dex?.mod ?? 0);
    const total = dexterity + additional;
    return {
        additional,
        additionalDisplay: signed(additional),
        total,
        totalDisplay: signed(total),
    };
}

export function registerInitiativeListeners(sheet) {
    sheet.element.querySelectorAll('.gmm-initiative-bonus').forEach((input) => {
        input.addEventListener('change', async (event) => {
            const value = Number(event.currentTarget.value);
            if (!Number.isInteger(value) || value < -100 || value > 100) {
                ui.notifications.warn(
                    'Enter an initiative bonus between -100 and 100.',
                );
                return;
            }
            sheet.rememberScrollPosition();
            try {
                await sheet.document.update({
                    [`flags.${MODULE_ID}.initiativeBonus`]: value,
                    'system.attributes.init.bonus': String(value),
                });
            } catch (error) {
                sheet.pendingScrollTop = null;
                console.error('GMM | Could not save initiative bonus:', error);
                ui.notifications.error('Unable to save initiative bonus.');
            }
        });
    });
}

/**
 * Choose a token belonging to this actor in the encounter's scene.
 * Prefer a controlled token; otherwise use an existing matching scene token.
 * If no token exists, create an actor-only combatant.
 */
function findEncounterToken(actor, combat) {
    const sceneId = combat.scene?.id ?? combat.sceneId;
    const scene = game.scenes.get(sceneId);
    if (!scene) return null;
    const tokens = Array.from(scene.tokens ?? []).filter(
        (token) => token.actorId === actor.id,
    );
    const controlledIds = new Set(
        canvas?.tokens?.controlled?.map((token) => token.id) ?? [],
    );
    return (
        tokens.find((token) => controlledIds.has(token.id)) ?? tokens[0] ?? null
    );
}

/** Add to the active encounter if necessary, then roll the configured initiative. */
export async function rollMonsterInitiative(event, target) {
    const actor = this.document;
    const combat = game.combat;
    if (!combat || !combat.active) {
        ui.notifications.warn(
            'Start an active encounter in the Combat Tracker before rolling initiative.',
        );
        return;
    }
    if (!game.user.isGM) {
        ui.notifications.warn(
            'A GM must add monsters to the encounter and roll their initiative.',
        );
        return;
    }

    const token = findEncounterToken(actor, combat);

    try {
        // Reuse an existing matching combatant, rather than adding duplicates.
        let combatant = token
            ? combat.combatants.find(
                  (entry) =>
                      entry.tokenId === token.id && entry.actorId === actor.id,
              )
            : combat.combatants.find((entry) => entry.actorId === actor.id);

        // Actor-only combatants are supported for actors without a scene token.
        if (!combatant) {
            const created = await combat.createEmbeddedDocuments('Combatant', [
                {
                    actorId: actor.id,
                    tokenId: token?.id ?? null,
                    sceneId: token?.parent?.id ?? combat.scene?.id ?? null,
                    hidden: token?.hidden ?? false,
                },
            ]);
            combatant = created[0];
        }
        if (!combatant) throw new Error('No combatant was created.');

        // Delegate to native initiative, which includes the saved bonus.
        await combat.rollInitiative([combatant.id], {
            updateTurn: true,
        });
    } catch (error) {
        console.error('GMM | Could not roll encounter initiative:', error);
        ui.notifications.error(
            'Unable to add or roll this monster in the active encounter.',
        );
    }
}
