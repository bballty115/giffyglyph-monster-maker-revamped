/** Saving throws, skill training and proficiency bonus. */
import { MODULE_ID } from './monster-data.js';

const ABILITIES = { str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha' };
const SKILLS = {
    acr: ['Acrobatics', 'dex'], ani: ['Animal Handling', 'wis'], arc: ['Arcana', 'int'],
    ath: ['Athletics', 'str'], dec: ['Deception', 'cha'], his: ['History', 'int'],
    ins: ['Insight', 'wis'], itm: ['Intimidation', 'cha'], inv: ['Investigation', 'int'],
    med: ['Medicine', 'wis'], nat: ['Nature', 'int'], prc: ['Perception', 'wis'],
    prf: ['Performance', 'cha'], per: ['Persuasion', 'cha'], rel: ['Religion', 'int'],
    slt: ['Sleight of Hand', 'dex'], ste: ['Stealth', 'dex'], sur: ['Survival', 'wis'],
};

const signed = (value) => value >= 0 ? `+${value}` : String(value);
const getSaved = (actor) => actor.getFlag(MODULE_ID, 'proficiencies') ?? {};

export function prepareProficiencyData(actor) {
    const saved = getSaved(actor);
    const proficiency = Number.isFinite(Number(saved.bonus)) ? Number(saved.bonus ?? 2) : 2;
    const saves = saved.saves ?? {};
    const skills = saved.skills ?? {};
    const savingThrows = Object.entries(ABILITIES).map(([key, label]) => {
        const trained = saves[key] === true;
        const modifier = Number(actor.system.abilities?.[key]?.mod ?? 0) + (trained ? proficiency : 0);
        return { key, label, trained, modifier: signed(modifier) };
    });
    const skillEntries = Object.entries(SKILLS).map(([key, [label, ability]]) => {
        const rank = [0, 1, 2].includes(Number(skills[key])) ? Number(skills[key]) : 0;
        const modifier = Number(actor.system.abilities?.[ability]?.mod ?? 0) + rank * proficiency;
        return { key, label, ability, rank, none: rank === 0, proficient: rank === 1,
            expertise: rank === 2, modifier: signed(modifier) };
    });
    return {
        bonus: proficiency, bonusDisplay: signed(proficiency),
        savingThrows, trainedSaves: savingThrows.filter((entry) => entry.trained),
        skills: skillEntries, trainedSkills: skillEntries.filter((entry) => entry.rank > 0),
    };
}

async function updateFlag(sheet, path, value) {
    sheet.rememberScrollPosition();
    try {
        await sheet.document.update({ [`flags.${MODULE_ID}.proficiencies.${path}`]: value });
    } catch (error) {
        sheet.pendingScrollTop = null;
        console.error('GMM | Failed to save proficiency:', error);
        ui.notifications.error('Unable to save proficiency settings.');
    }
}

export function registerProficiencyListeners(sheet) {
    const root = sheet.element;
    root.querySelectorAll('.gmm-save-trained').forEach((input) => {
        input.addEventListener('change', (event) => {
            const key = event.currentTarget.dataset.ability;
            if (Object.hasOwn(ABILITIES, key)) updateFlag(sheet, `saves.${key}`, event.currentTarget.checked);
        });
    });
    root.querySelectorAll('.gmm-skill-rank').forEach((select) => {
        select.addEventListener('change', (event) => {
            const key = event.currentTarget.dataset.skill;
            if (Object.hasOwn(SKILLS, key)) updateFlag(sheet, `skills.${key}`, Number(event.currentTarget.value));
        });
    });
    root.querySelectorAll('.gmm-proficiency-bonus').forEach((input) => {
        input.addEventListener('change', (event) => {
            const value = Number(event.currentTarget.value);
            if (!Number.isInteger(value) || value < -20 || value > 30) {
                ui.notifications.warn('Enter a proficiency bonus between -20 and 30.');
                return;
            }
            updateFlag(sheet, 'bonus', value);
        });
    });
}

async function rollProficiency(sheet, label, modifier) {
    const roll = await new Roll('1d20 + @mod', { mod: modifier }).evaluate();
    const escaped = String(label).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: sheet.document }),
        flavor: `${escaped} (${signed(modifier)})` });
}

export async function rollSavingThrow(event, target) {
    const key = target.dataset.ability;
    if (!Object.hasOwn(ABILITIES, key)) return;
    const data = prepareProficiencyData(this.document);
    const entry = data.savingThrows.find((save) => save.key === key);
    if (!entry?.trained) return;
    await rollProficiency(this, `${entry.label} Saving Throw`, Number(entry.modifier));
}

export async function rollSkill(event, target) {
    const key = target.dataset.skill;
    if (!Object.hasOwn(SKILLS, key)) return;
    const data = prepareProficiencyData(this.document);
    const entry = data.skills.find((skill) => skill.key === key);
    if (!entry || entry.rank === 0) return;
    await rollProficiency(this, `${entry.label} Check`, Number(entry.modifier));
}

export async function shareProficiency(event, target) {
    const data = prepareProficiencyData(this.document);
    const name = String(this.document.name).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.document }),
        content: `<p><strong>${name}</strong> — Proficiency Bonus ${data.bonusDisplay}</p>` });
}
