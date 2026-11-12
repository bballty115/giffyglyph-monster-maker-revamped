/**
 * Giffyglyph Monster Maker Revamped
 * Main module entry point.
 */

import { createScalingMonster } from './monster-creator.js';
import { GiffyglyphMonsterSheet } from './monster-sheet.js';

const MODULE_ID = 'giffyglyph-monster-maker-revamped';

// Register our custom NPC sheet.
Hooks.once('init', () => {
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
        Actor,
        MODULE_ID,
        GiffyglyphMonsterSheet,
        {
            types: ['npc'],
            makeDefault: false,
            label: 'Giffyglyph Monster Sheet',
        },
    );

    console.log('GMM | Custom monster sheet registered!');
});

// Add the sidebar button.
Hooks.on('renderActorDirectory', (app, element) => {
    const searchSection = element.querySelector('.directory-header search');

    if (!searchSection) return;

    if (element.querySelector('#gmm-create-scaling-monster')) return;

    const button = document.createElement('button');

    button.id = 'gmm-create-scaling-monster';
    button.type = 'button';

    button.innerHTML = `
        <i class="fas fa-dragon"></i>
        Create Scaling Monster
    `;

    button.addEventListener('click', createScalingMonster);

    searchSection.before(button);
});
