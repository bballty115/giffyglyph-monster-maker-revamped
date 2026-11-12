/** Main Foundry sheet class: coordinates feature modules. */
import {
    MODULE_ID,
    prepareMonsterData,
    prepareCombatData,
} from './sheet/monster-data.js';
import {
    registerHeaderListeners,
    editPortrait,
} from './sheet/monster-header.js';
import {
    registerAbilityListeners,
    rollAbility,
} from './sheet/monster-abilities.js';
import { registerCombatListeners } from './sheet/monster-combat.js';
import { adjustHP } from './sheet/monster-hp.js';
import {
    prepareDefenseData,
    registerDefenseListeners,
    shareDefenses,
} from './sheet/monster-defenses.js';

import { prepareProficiencyData, registerProficiencyListeners, rollSavingThrow, rollSkill, shareProficiency } from './sheet/monster-proficiencies.js';

import { prepareMovementData, registerMovementListeners, shareMovement } from './sheet/monster-movement.js';
import { prepareSensesData, registerSensesListeners, shareSense, sharePassivePerception } from './sheet/monster-senses.js';
import { prepareDetailsData, registerDetailsListeners, shareDetail, shareXP } from './sheet/monster-details.js';
import { prepareInitiativeData, registerInitiativeListeners, rollMonsterInitiative } from './sheet/monster-initiative.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class GiffyglyphMonsterSheet extends HandlebarsApplicationMixin(
    ActorSheetV2,
) {
    editMode = false;

    pendingScrollTop = null;

    static DEFAULT_OPTIONS = {
        classes: ['gmm-monster-sheet'],
        position: { width: 480, height: 540 },
        window: { resizable: true },
        actions: {
            toggleEditMode: GiffyglyphMonsterSheet.prototype.toggleEditMode,
            editPortrait,
            rollAbility,
            adjustHP,
            shareDefenses,
            rollSavingThrow,
            rollSkill,
            shareProficiency,
            shareMovement,
            shareSense,
            sharePassivePerception,
            shareDetail,
            shareXP,
            rollMonsterInitiative,
        },
    };

    static PARTS = {
        body: {
            template: `modules/${MODULE_ID}/templates/monster-sheet.hbs`,
            scrollable: ['.gmm-sheet-body'],
        },
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.isEditMode = this.editMode;
        context.monster = prepareMonsterData(this.document);
        context.combat = prepareCombatData(this.document);
        context.defenses = prepareDefenseData(this.document);
        context.proficiencies = prepareProficiencyData(this.document);
        context.movement = prepareMovementData(this.document);
        context.senses = prepareSensesData(this.document, context.proficiencies);
        context.details = prepareDetailsData(this.document);
        context.initiative = prepareInitiativeData(this.document);
        return context;
    }

    async toggleEditMode(event, target) {
        this.editMode = !this.editMode;
        console.log(`GMM | Mode: ${this.editMode ? 'Edit' : 'View'}`);
        await this.render();
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        // Restore the scroll position after Foundry renders.
        this.restoreScrollPosition();

        if (!this.editMode) return;

        registerHeaderListeners(this);
        registerAbilityListeners(this);
        registerCombatListeners(this);
        registerDefenseListeners(this);
        registerProficiencyListeners(this);
        registerMovementListeners(this);
        registerSensesListeners(this);
        registerDetailsListeners(this);
        registerInitiativeListeners(this);
    }

    /**
     * Remember the sheet's current scroll position.
     * Called before an Actor update.
     */
    rememberScrollPosition() {
        const body = this.element?.querySelector('.gmm-sheet-body');

        if (!body) return;

        this.pendingScrollTop = body.scrollTop;
    }

    /**
     * Restore the scroll position after a render.
     */
    restoreScrollPosition() {
        if (this.pendingScrollTop === null) return;

        const body = this.element?.querySelector('.gmm-sheet-body');

        if (!body) return;

        body.scrollTop = this.pendingScrollTop;
        this.pendingScrollTop = null;
    }
}
