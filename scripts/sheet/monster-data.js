export const MODULE_ID = 'giffyglyph-monster-maker-revamped';

export function prepareMonsterData(actor) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        const monster = {
            name: actor.name,
            img: actor.img,

            abilities: abilities.map((key) => {
                const ability = actor.system.abilities[key];

                return {
                    key,
                    label: key.toUpperCase(),
                    score: ability.value,
                    modifier:
                        ability.mod >= 0
                            ? `+${ability.mod}`
                            : String(ability.mod),
                };
            }),
        };

        return monster;
}

export function prepareCombatData(actor) {
        const combat = actor.getFlag(MODULE_ID, 'combat') ?? {};

        const hp = actor.system.attributes.hp;

        const combatData = {
            ac: actor.system.attributes.ac.value ?? 10,

            hp: {
                value: hp.value ?? 0,
                max: hp.max ?? 0,
                percentage:
                    hp.max > 0
                        ? Math.max(0, Math.min(100, (hp.value / hp.max) * 100))
                        : 0,
            },

            attack: combat.attack ?? 0,
            attackDisplay:
                (combat.attack ?? 0) >= 0
                    ? `+${combat.attack ?? 0}`
                    : String(combat.attack),

            dc: combat.dc ?? 10,
            damage: combat.damage ?? 0,
            reach: combat.reach ?? 5,
            range: combat.range ?? 30,
        };

        return combatData;
}
