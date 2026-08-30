/**
 * mythcraft-essence-sheet | src/settings.mjs
 *
 * Registers module settings under Quality of Life and Automations.
 * Formatted cleanly with themed headers and custom currency management.
 */

import CurrencyConfigDialog from "./apps/currency-config-dialog.mjs";
import TagsManagementDialog from "./apps/tags-dialog.mjs";
import HomebrewConfigDialog from "./apps/homebrew-config-dialog.mjs";
import { DEFAULT_TAGS_LIBRARY } from "./data/tags-library.mjs";

export const MODULE_ID = "mythcraft-essence-sheet";

export const DEFAULT_CURRENCY_CONFIG = [
  { key: "amber", label: "Amber", abbr: "a", rate: 1, icon: "fas fa-circle", color: "#d97706" },
  { key: "scillings", label: "Silver Coins", abbr: "sc", rate: 100, icon: "fas fa-circle-dot", color: "#cbd5e1" },
  { key: "qorn", label: "Qorn", abbr: "q", rate: 10000, icon: "fas fa-coins", color: "#f1c40f" },
  { key: "diamond", label: "Diamond Coins", abbr: "dc", rate: 100000, icon: "fas fa-gem", color: "#38bdf8" },
];

export const DEFAULT_CURRENCY_PRESETS = [
  { label: "Meal / Ale", amount: 1, curr: "scillings" },
  { label: "Inn Room", amount: 5, curr: "scillings" },
  { label: "Group Room of Four", amount: 15, curr: "scillings" },
];

/**
 * Register all module settings
 */
export function registerSettings() {

  // ── HOMEBREW & CUSTOM ATTRIBUTES ──────────────────────────────────────────

  game.settings.registerMenu(MODULE_ID, "homebrewConfigMenu", {
    name: "Homebrew Rules & Custom Attributes",
    label: "Configure Homebrew & Attributes",
    hint: "Enable Sanity (SAN) attribute, Fear Threshold & resource meter, or create custom Physical, Mental, and Metaphysical attributes.",
    icon: "fas fa-flask-vial",
    type: HomebrewConfigDialog,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "enableSanity", {
    name: "Enable Sanity (SAN) Attribute",
    hint: "Adds Sanity as a 3rd Metaphysical attribute on character sheets.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "enableFear", {
    name: "Enable Fear Threshold & Resource Bar",
    hint: "Displays an automated Fear Threshold and resource tracker bar on character sheets.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "sanityOnNpc", {
    name: "Include Sanity on NPC Sheets",
    hint: "Displays the Sanity (SAN) attribute on NPC stat sheets when Sanity is enabled.",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "customAttributes", {
    name: "Custom Attributes",
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });

  game.settings.register(MODULE_ID, "customSkills", {
    name: "Custom Skills",
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });

  // ── QUALITY OF LIFE SETTINGS ──────────────────────────────────────────────

  game.settings.registerMenu(MODULE_ID, "tagsManagementMenu", {
    name: "MythCraft Tag & Keyword Library",
    label: "Manage Tags & Custom Keywords",
    hint: "Browse, customize, and add custom tags and rules descriptions for weapons, spells, creatures, and monster traits.",
    icon: "fas fa-tags",
    type: TagsManagementDialog,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "customTags", {
    name: "Custom Tags Library",
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_TAGS_LIBRARY,
  });

  game.settings.registerMenu(MODULE_ID, "currencyConfigMenu", {
    name: "Custom Currency & Exchange System",
    label: "Configure Currencies & Conversion",
    hint: "Customize currency names, abbreviations, icons, colors, base exchange values, and shopping presets.",
    icon: "fas fa-coins",
    type: CurrencyConfigDialog,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "customCurrencyConfig", {
    name: "Custom Currency Configurations",
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_CURRENCY_CONFIG,
  });

  game.settings.register(MODULE_ID, "customCurrencyPresets", {
    name: "Custom Currency Shopping Presets",
    scope: "world",
    config: false,
    type: Array,
    default: DEFAULT_CURRENCY_PRESETS,
  });

  game.settings.register(MODULE_ID, "enableResourceAnimations", {
    name: "Animated Resource Meter Transitions",
    hint: "Enable smooth 0.8s animated transitions when HP, AP, SP, and Essence meters shrink or grow across re-renders.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "npcShowMetaphysicalAttrs", {
    name: "Show Metaphysical Attributes on NPC Sheets",
    hint: "Display LUCK and COR (Corruption) attributes on NPC stat sheets. Disabled by default as most NPCs and creatures do not use these attributes.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(MODULE_ID, "npcTurnActionAvailability", {
    name: "NPC Combat Turn-Based Action States",
    hint: "In active combat encounters, gray out reactions on the creature's turn, and gray out Tier 1/2 actions when off-turn (unless called by a reaction, which highlights the action).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });


  game.settings.register(MODULE_ID, "autoAttunementEP", {
    name: "Essence Capacity & Attunement Tracking",
    hint: "Automatically calculate bound EP and display over-capacity warnings when attuning to items.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ── WEAPON AUTOMATIONS ───────────────────────────────────────────────────

  game.settings.register(MODULE_ID, "weaponDamageAttrModifier", {
    name: "Weapon Damage Attribute Modifier",
    hint: "Automatically calculate and add the weapon's attribute modifier (e.g. STR, DEX, INT) to damage formulas and damage rolls.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ── ARMOR AUTOMATIONS ────────────────────────────────────────────────────

  game.settings.register(MODULE_ID, "armorAutomation", {
    name: "Armor Rating (AR) & Defenses Automation",
    hint: "Automatically set the character's base Armor Rating (AR) and apply defense modifiers (REF, FORT, ANT, LOG, WILL) from donned armor.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "armorResistanceAutomation", {
    name: "Armor Resistance Specialization Automation",
    hint: "Automatically apply resistance specializations (e.g. Sharp 2, Physical 2) from donned armor into active damage defenses.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "armorStrMinAutomation", {
    name: "Armor Strength Minimum Enforcement",
    hint: "If a character dons armor with a STR Minimum higher than their STR, set their movement speed to 0 and automatically apply the Dazed condition.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "armorDexMaxAutomation", {
    name: "Armor Dexterity Maximum Clamp",
    hint: "While wearing armor with a DEX Maximum, reduce effective DEX to the maximum for calculating Reflexes (REF) defense.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "armorSpeedPenaltyAutomation", {
    name: "Armor Speed Penalty Calculation",
    hint: "Automatically deduct the donned armor's speed penalty from the character's movement speed.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ── AP & SP RESOURCE AUTOMATIONS ───────────────────────────────────────

  game.settings.register(MODULE_ID, "turnAPMode", {
    name: "Combat Turn AP Reset & Reactive Carryover",
    hint: "Automatically reset character AP at the start of their combat turn with reactive AP carryover (capped at half level + 1).",
    scope: "world",
    config: true,
    type: String,
    choices: {
      auto: "Automatic (Default)",
      prompt: "Prompt Confirmation Dialog",
      disabled: "Disabled",
    },
    default: "auto",
  });

  game.settings.register(MODULE_ID, "movementAPMode", {
    name: "Movement AP Deduction in Combat",
    hint: "Automatically track token movement in active combat and deduct Action Points based on character speed and strides.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      auto: "Automatic (Default)",
      prompt: "Prompt Confirmation Dialog",
      disabled: "Disabled",
    },
    default: "auto",
  });

  game.settings.register(MODULE_ID, "attackAPMode", {
    name: "Attack & Action AP Deduction",
    hint: "Automatically evaluate item APC formulas and deduct Action Points when weapons or actions are rolled in combat.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      auto: "Automatic (Default)",
      prompt: "Prompt Confirmation Dialog",
      disabled: "Disabled",
    },
    default: "auto",
  });

  game.settings.register(MODULE_ID, "spellSPMode", {
    name: "Spell SP Deduction",
    hint: "Automatically deduct Spell Points (SP) when spells or magical powers are cast in or out of combat.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      auto: "Automatic (Default)",
      prompt: "Prompt Confirmation Dialog",
      disabled: "Disabled",
    },
    default: "auto",
  });

  game.settings.register(MODULE_ID, "enforceSP", {
    name: "Enforce Spell Point (SP) Limits",
    hint: "Prompt or prevent player characters from casting spells if they lack sufficient Spell Points (GMs are exempt).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ── COMBAT & DAMAGE AUTOMATIONS ──────────────────────────────────────────

  game.settings.register(MODULE_ID, "damageDefenseAutomation", {
    name: "Damage Defense Automation",
    hint: "Automatically calculate Damage Threshold (DT), Damage Reduction (DR), Resistances (including Physical/Elemental/Energy), Vulnerabilities, Immunities, and Absorptions in chat damage cards.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "luckCritRangeAutomation", {
    name: "Luck Critical Range Scaling",
    hint: "Automatically scale Critical Hit range based on MythCraft Luck rules (6+ Luck gives +1 Crit Range, 12+ Luck gives +2 Crit Range).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(MODULE_ID, "insufficientApBehavior", {
    name: "Insufficient Action Points (AP) Enforcement",
    hint: "Select what occurs when a character attempts an action, weapon attack, spell, or ability costing more Action Points than currently available.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      confirm: "Ask for Confirmation (Default)",
      block: "Block Action",
      warn: "Allow & Post Warning to Chat",
      disabled: "Disabled",
    },
    default: "confirm",
  });

  // Render styled category headers in Settings Config
  Hooks.on("renderSettingsConfig", (app, html) => {
    const root = html instanceof HTMLElement ? html : (html[0] || html);
    if (!root) return;

    const mainHeaderStyle = "font-size: 1.15rem; font-weight: 700; border-bottom: 2px solid rgba(42, 122, 127, 0.85); color: #9bd7e5; margin: 20px 0 10px 0; padding-bottom: 4px; display: flex; align-items: center; gap: 8px; width: 100%; text-transform: uppercase; letter-spacing: 0.05em; grid-column: 1 / -1; flex-basis: 100%; clear: both;";
    const subHeaderStyle = "font-size: 0.92rem; font-weight: 700; color: #6ee7b7; margin: 14px 0 6px 0; padding: 3px 0 4px 8px; border-left: 3px solid #2a7a7f; border-bottom: 1px solid rgba(42, 122, 127, 0.35); background: rgba(42, 122, 127, 0.08); display: flex; align-items: center; gap: 6px; width: 100%; text-transform: uppercase; letter-spacing: 0.03em; grid-column: 1 / -1; flex-basis: 100%; clear: both;";

    // 0. HOMEBREW & CUSTOM ATTRIBUTES Header
    const targetHomebrewEl = root.querySelector('[data-key="mythcraft-essence-sheet.homebrewConfigMenu"]');
    const targetHomebrew = targetHomebrewEl?.closest('.form-group') || targetHomebrewEl?.closest('.setting') || targetHomebrewEl;
    if (targetHomebrew && !root.querySelector('.essence-homebrew-main-header')) {
      const hbHeader = document.createElement('h3');
      hbHeader.className = 'essence-homebrew-main-header';
      hbHeader.innerHTML = '<i class="fas fa-flask-vial" style="color: #a78bfa;"></i> Homebrew &amp; Alternate Rules';
      hbHeader.style.cssText = mainHeaderStyle;
      targetHomebrew.parentNode.insertBefore(hbHeader, targetHomebrew);
    }

    // 1. QUALITY OF LIFE Header
    const targetQoLEl = root.querySelector('[data-key="mythcraft-essence-sheet.currencyConfigMenu"]') ||
                        root.querySelector('[data-setting-id="mythcraft-essence-sheet.enableResourceAnimations"]') ||
                        root.querySelector('[name="mythcraft-essence-sheet.enableResourceAnimations"]');
    const targetQoL = targetQoLEl?.closest('.form-group') || targetQoLEl?.closest('.setting') || targetQoLEl;
    if (targetQoL && !root.querySelector('.essence-qol-main-header')) {
      const qolHeader = document.createElement('h3');
      qolHeader.className = 'essence-qol-main-header';
      qolHeader.innerHTML = '<i class="fas fa-sparkles" style="color: #f1c40f;"></i> Quality of Life';
      qolHeader.style.cssText = mainHeaderStyle;
      targetQoL.parentNode.insertBefore(qolHeader, targetQoL);
    }

    // 2. AUTOMATIONS Header
    const targetWeaponEl = root.querySelector('[data-setting-id="mythcraft-essence-sheet.weaponDamageAttrModifier"]') ||
                           root.querySelector('[name="mythcraft-essence-sheet.weaponDamageAttrModifier"]');
    const targetWeapon = targetWeaponEl?.closest('.form-group') || targetWeaponEl?.closest('.setting') || targetWeaponEl;
    if (targetWeapon && !root.querySelector('.essence-automations-main-header')) {
      const mainHeader = document.createElement('h3');
      mainHeader.className = 'essence-automations-main-header';
      mainHeader.innerHTML = '<i class="fas fa-robot" style="color: #6ee7b7;"></i> Automations';
      mainHeader.style.cssText = mainHeaderStyle;
      targetWeapon.parentNode.insertBefore(mainHeader, targetWeapon);
    }

    // Weapons Subheading
    if (targetWeapon && !root.querySelector('.essence-weapons-sub-header')) {
      const subHeader = document.createElement('h4');
      subHeader.className = 'essence-weapons-sub-header';
      subHeader.innerHTML = '<i class="fas fa-sword"></i> Weapon Automations';
      subHeader.style.cssText = subHeaderStyle;
      targetWeapon.parentNode.insertBefore(subHeader, targetWeapon);
    }

    // Armor Subheading
    const targetArmorEl = root.querySelector('[data-setting-id="mythcraft-essence-sheet.armorAutomation"]') ||
                          root.querySelector('[name="mythcraft-essence-sheet.armorAutomation"]');
    const targetArmor = targetArmorEl?.closest('.form-group') || targetArmorEl?.closest('.setting') || targetArmorEl;
    if (targetArmor && !root.querySelector('.essence-armor-sub-header')) {
      const subHeader = document.createElement('h4');
      subHeader.className = 'essence-armor-sub-header';
      subHeader.innerHTML = '<i class="fas fa-shield-halved"></i> Armor Automations';
      subHeader.style.cssText = subHeaderStyle;
      targetArmor.parentNode.insertBefore(subHeader, targetArmor);
    }

    // Resource Subheading
    const targetResourceEl = root.querySelector('[data-setting-id="mythcraft-essence-sheet.turnAPMode"]') ||
                             root.querySelector('[name="mythcraft-essence-sheet.turnAPMode"]');
    const targetResource = targetResourceEl?.closest('.form-group') || targetResourceEl?.closest('.setting') || targetResourceEl;
    if (targetResource && !root.querySelector('.essence-resource-sub-header')) {
      const subHeader = document.createElement('h4');
      subHeader.className = 'essence-resource-sub-header';
      subHeader.innerHTML = '<i class="fas fa-battery-bolt"></i> AP &amp; SP Resource Automations';
      subHeader.style.cssText = subHeaderStyle;
      targetResource.parentNode.insertBefore(subHeader, targetResource);
    }

    // Combat & Damage Subheading
    const targetCombatEl = root.querySelector('[data-setting-id="mythcraft-essence-sheet.damageDefenseAutomation"]') ||
                           root.querySelector('[name="mythcraft-essence-sheet.damageDefenseAutomation"]');
    const targetCombat = targetCombatEl?.closest('.form-group') || targetCombatEl?.closest('.setting') || targetCombatEl;
    if (targetCombat && !root.querySelector('.essence-combat-sub-header')) {
      const subHeader = document.createElement('h4');
      subHeader.className = 'essence-combat-sub-header';
      subHeader.innerHTML = '<i class="fas fa-bolt"></i> Combat &amp; Damage Automations';
      subHeader.style.cssText = subHeaderStyle;
      targetCombat.parentNode.insertBefore(subHeader, targetCombat);
    }
  });
}

/**
 * Get a setting value safely
 * @param {string} key
 * @param {any} [defaultValue=true]
 * @returns {any}
 */
export function getSetting(key, defaultValue = true) {
  try {
    return game.settings.get(MODULE_ID, key);
  } catch (err) {
    return defaultValue;
  }
}
