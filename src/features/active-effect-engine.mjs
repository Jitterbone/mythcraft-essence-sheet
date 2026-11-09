/**
 * mythcraft-essence-sheet | src/features/active-effect-engine.mjs
 *
 * Guided Active Effect Catalog, Presets, Human-Readable Summary Translator,
 * and Native Foundry VTT Evaluation Pipeline for the MythCraft Game System.
 *
 * Ensures all ActiveEffects (on Actors and transferred from Weapons, Armor,
 * Gear, Talents, Features, and Spells) seamlessly automate:
 * - Vitality & Pools: Max HP, Temp HP (Shield), Death Points, Soul Damage, Fear
 * - Action & Spell Economy: Reduce APC (All / Weapons / Spells), Reduce SPC,
 *   Max AP, Special AP, Max SP, Magic Power Levels, Essence Cap, Luck Points
 * - Defenses & Mitigation: AR, REF, FORT, ANT, LOG, WILL, All/Physical/Mental
 *   Defenses, Damage Reduction (DR), Damage Threshold (DT), Resistances,
 *   Immunities, Vulnerabilities, Elemental Affinities
 * - Combat, Attacks & Damage: Weapon/Spell/All Attack Bonuses, Weapon/Spell/All
 *   Damage Bonuses (flat or dice like +1d6), Crit Hit Range, Tactical Advantage/Disadvantage
 * - Attributes, Skills & Mobility: STR, DEX, END, AWR, INT, CHA, LUCK, COR, SAN,
 *   Walk/Climb/Swim/Fly/Burrow Speeds, Initiative Bonus, All Skills & Specific Skills
 */

import {
  getTalentLibraryEntry,
  getTalentActiveEffectsData,
} from "../data/talent-library.mjs";
import { isWeaponEquipped } from "./equipment-automation.mjs";

const MODULE_ID = "mythcraft-essence-sheet";

export const AE_MODES = {
  CUSTOM: 0,
  MULTIPLY: 1,
  ADD: 2,
  DOWNGRADE: 3,
  UPGRADE: 4,
  OVERRIDE: 5,
};

export const EFFECT_MODES = AE_MODES;

export const AE_MODE_LABELS = {
  2: { label: "Add / Subtract (+ / −)", short: "ADD", symbol: "+" },
  5: { label: "Set Exact Value (=)", short: "SET", symbol: "=" },
  1: { label: "Multiply (×)", short: "MULT", symbol: "×" },
  4: { label: "Minimum Floor (≥)", short: "MIN", symbol: "≥" },
  3: { label: "Maximum Cap (≤)", short: "MAX", symbol: "≤" },
  0: { label: "Custom Rule", short: "CUST", symbol: "★" },
};

export const MYTHCRAFT_DAMAGE_TYPES = [
  { key: "sharp", label: "Sharp", category: "Physical", icon: "fas fa-cut" },
  { key: "blunt", label: "Blunt", category: "Physical", icon: "fas fa-hammer" },
  { key: "fire", label: "Fire", category: "Elemental", icon: "fas fa-fire" },
  { key: "cold", label: "Cold", category: "Elemental", icon: "fas fa-snowflake" },
  { key: "lightning", label: "Lightning", category: "Elemental", icon: "fas fa-bolt" },
  { key: "corrosive", label: "Corrosive", category: "Elemental", icon: "fas fa-flask" },
  { key: "toxic", label: "Toxic", category: "Elemental", icon: "fas fa-biohazard" },
  { key: "radiant", label: "Radiant", category: "Energy", icon: "fas fa-sun" },
  { key: "necrotic", label: "Necrotic", category: "Energy", icon: "fas fa-skull" },
  { key: "psychic", label: "Psychic", category: "Energy", icon: "fas fa-brain" },
  { key: "sonic", label: "Sonic", category: "Energy", icon: "fas fa-volume-high" },
  { key: "soul", label: "Soul", category: "Metaphysical", icon: "fas fa-ghost" },
];

export const CURATED_EFFECT_ICONS = [
  { label: "Aura / Buff", path: "icons/svg/aura.svg", src: "icons/svg/aura.svg" },
  { label: "Shield / Defense", path: "icons/svg/shield.svg", src: "icons/svg/shield.svg" },
  { label: "Heart / Vitality", path: "icons/svg/regen.svg", src: "icons/svg/regen.svg" },
  { label: "Sword / Attack", path: "icons/svg/sword.svg", src: "icons/svg/sword.svg" },
  { label: "Fire / Damage", path: "icons/svg/fire.svg", src: "icons/svg/fire.svg" },
  { label: "Lightning / AP", path: "icons/svg/lightning.svg", src: "icons/svg/lightning.svg" },
  { label: "Mana / Spell", path: "icons/svg/daze.svg", src: "icons/svg/daze.svg" },
  { label: "Winged / Speed", path: "icons/svg/wing.svg", src: "icons/svg/wing.svg" },
  { label: "Eye / Senses", path: "icons/svg/eye.svg", src: "icons/svg/eye.svg" },
  { label: "Book / Talent", path: "icons/svg/book.svg", src: "icons/svg/book.svg" },
  { label: "Upgrade / Boost", path: "icons/svg/upgrade.svg", src: "icons/svg/upgrade.svg" },
  { label: "Skull / Penalty", path: "icons/svg/skull.svg", src: "icons/svg/skull.svg" },
];

/* ───────────────────────────────────────────────────────────────────────────
 *  1. Guided Sheet Region Categories
 * ─────────────────────────────────────────────────────────────────────────── */

export const MYTHCRAFT_EFFECT_CATEGORIES = [
  {
    id: "vitality",
    label: "Vitality & Pools",
    shortLabel: "Vitality",
    icon: "fas fa-heart-pulse",
    color: "#34d399",
    description: "Max HP, Temp HP (Shield), Death Point Thresholds, Soul Damage, and Fear.",
  },
  {
    id: "economy",
    label: "Action & Spell Economy",
    shortLabel: "AP / SP / Costs",
    icon: "fas fa-bolt",
    color: "#38bdf8",
    description: "Reduce APC, Reduce SPC, Max AP, Special AP, Max SP, Power Levels, Essence Cap, and Luck Points.",
  },
  {
    id: "defenses",
    label: "Defenses & Mitigation",
    shortLabel: "Defenses & DR",
    icon: "fas fa-shield-halved",
    color: "#FEEBB3",
    description: "AR, REF, FORT, ANT, LOG, WILL, Damage Reduction (DR), Damage Threshold (DT), Resistances & Immunities.",
  },
  {
    id: "combat",
    label: "Combat, Attacks & Damage",
    shortLabel: "Attacks & Damage",
    icon: "fas fa-crosshairs",
    color: "#f87171",
    description: "Attack Roll Bonuses, Weapon & Spell Damage Bonuses (flat or dice), Critical Hit Range, and Tactical Advantage.",
  },
  {
    id: "attributes",
    label: "Attributes, Skills & Mobility",
    shortLabel: "Stats, Skills & Speed",
    icon: "fas fa-person-running",
    color: "#c084fc",
    description: "Core Attributes (STR–COR), Movement Speeds, Initiative Bonus, and Skill Bonuses.",
  },
];

/* ───────────────────────────────────────────────────────────────────────────
 *  2. Comprehensive MythCraft Target Catalog
 * ─────────────────────────────────────────────────────────────────────────── */

export const MYTHCRAFT_EFFECT_CATALOG = [
  // ── VITALITY & POOLS ─────────────────────────────────────────────────────
  {
    id: "hp_max",
    category: "vitality",
    label: "Maximum Hit Points (Max HP)",
    shortLabel: "Max HP",
    key: "system.hp.max",
    altKeys: [`flags.${MODULE_ID}.bonuses.hpMax`, "system.bonuses.hp.max"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "5",
    unit: "HP",
    icon: "fas fa-heart",
    description: "Increases or reduces the character's Maximum Hit Points. Supports numbers (e.g. 5) or formulas like @level or 2 * @level.",
    hint: "Use +5 for a flat HP boost, or @level for +1 Max HP per Character Level (like the Hardy talent).",
  },
  {
    id: "hp_shield",
    category: "vitality",
    label: "Temporary HP / Shield Points",
    shortLabel: "Temp HP (Shield)",
    key: "system.hp.shield",
    altKeys: [`flags.${MODULE_ID}.bonuses.hpShield`, "system.bonuses.hp.shield"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "10",
    unit: "Temp HP",
    icon: "fas fa-shield-heart",
    description: "Grants Temporary HP (Shield Points in MythCraft), which absorb incoming damage before regular HP.",
    hint: "When enabled, automatically grants Shield/Temp HP on the character header.",
  },
  {
    id: "death_max",
    category: "vitality",
    label: "Maximum Death Points Threshold",
    shortLabel: "Max Death Pts",
    key: "system.death.max",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Death Pts",
    icon: "fas fa-skull",
    description: "Modifies how many Death Points the character can suffer before dying.",
    hint: "Positive values make the character harder to kill when downed.",
  },
  {
    id: "death_value",
    category: "vitality",
    label: "Current Death Points (Fatigue / Wounds)",
    shortLabel: "Death Points",
    key: "system.death.value",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Death Pts",
    icon: "fas fa-skull-crossbones",
    description: "Adds or removes active Death Points (used by Fatigue or lingering injuries).",
    hint: "Example: Fatigued adds +1 Death Point while active.",
  },
  {
    id: "soul_damage",
    category: "vitality",
    label: "Soul Damage",
    shortLabel: "Soul Damage",
    key: `flags.${MODULE_ID}.soulDamage`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "2",
    unit: "Soul Dmg",
    icon: "fas fa-ghost",
    description: "Modifies accumulated Soul Damage (when the optional Soul Damage rule is enabled).",
    hint: "Reduces effective survival threshold without lowering Max HP.",
  },
  {
    id: "fear_threshold",
    category: "vitality",
    label: "Fear Threshold Bonus",
    shortLabel: "Fear Threshold",
    key: `flags.${MODULE_ID}.bonuses.fearThreshold`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Fear",
    icon: "fas fa-face-grimace",
    description: "Increases the character's Fear Threshold (how many Fear levels they can endure).",
    hint: "Example: +1 Fear Threshold from courage or resolve talents.",
  },
  {
    id: "bloodied_ratio",
    category: "vitality",
    label: "Bloodied HP Ratio Threshold",
    shortLabel: "Bloodied Ratio",
    key: `flags.${MODULE_ID}.bonuses.bloodiedRatio`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "0.25",
    unit: "Ratio",
    icon: "fas fa-droplet",
    description: "Overrides the fraction of Max HP at which the character is considered Bloodied (default 0.5).",
    hint: "Example: 0.25 means only Bloodied at 1/4 Max HP or below.",
  },

  // ── ACTION & SPELL ECONOMY ───────────────────────────────────────────────
  {
    id: "reduce_spc",
    category: "economy",
    label: "Reduce Spell Point Cost (Reduce SPC)",
    shortLabel: "Reduce SPC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpc`,
    altKeys: ["system.bonuses.spcReduction", "system.bonuses.reduceSpc"],
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "SPC",
    icon: "fas fa-wand-magic-sparkles",
    description: "Reduces the Spell Point Cost (SPC) of spells cast by this character (down to a minimum of 0 SP).",
    hint: "Enter a positive number (e.g. 1) to reduce spell SP costs by 1.",
  },
  {
    id: "reduce_spc_arcane",
    category: "economy",
    label: "Reduce Arcane Spell SPC",
    shortLabel: "Reduce Arcane SPC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpcBySource.arcane`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "SPC",
    icon: "fas fa-book-sparkles",
    description: "Reduces the Spell Point Cost (SPC) of Arcane spells.",
    hint: "Enter a positive number (e.g. 1) to reduce Arcane SPC.",
  },
  {
    id: "reduce_spc_divine",
    category: "economy",
    label: "Reduce Divine Spell SPC",
    shortLabel: "Reduce Divine SPC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpcBySource.divine`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "SPC",
    icon: "fas fa-sun",
    description: "Reduces the Spell Point Cost (SPC) of Divine spells.",
    hint: "Enter a positive number (e.g. 1) to reduce Divine SPC.",
  },
  {
    id: "reduce_spc_occult",
    category: "economy",
    label: "Reduce Occult Spell SPC",
    shortLabel: "Reduce Occult SPC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpcBySource.occult`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "SPC",
    icon: "fas fa-moon",
    description: "Reduces the Spell Point Cost (SPC) of Occult spells.",
    hint: "Enter a positive number (e.g. 1) to reduce Occult SPC.",
  },
  {
    id: "reduce_spc_primal",
    category: "economy",
    label: "Reduce Primal Spell SPC",
    shortLabel: "Reduce Primal SPC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpcBySource.primal`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "SPC",
    icon: "fas fa-leaf",
    description: "Reduces the Spell Point Cost (SPC) of Primal spells.",
    hint: "Enter a positive number (e.g. 1) to reduce Primal SPC.",
  },
  {
    id: "reduce_spc_psionic",
    category: "economy",
    label: "Reduce Psionic Spell SPC",
    shortLabel: "Reduce Psionic SPC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpcBySource.psionic`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "SPC",
    icon: "fas fa-brain",
    description: "Reduces the Spell Point Cost (SPC) of Psionic manifestations and spells.",
    hint: "Enter a positive number (e.g. 1) to reduce Psionic SPC.",
  },
  {
    id: "reduce_apc_all",
    category: "economy",
    label: "Reduce Action Point Cost — All Actions (Reduce APC)",
    shortLabel: "Reduce APC (All)",
    key: `flags.${MODULE_ID}.bonuses.reduceApc`,
    altKeys: ["system.bonuses.apcReduction", "system.bonuses.reduceApc"],
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "APC",
    icon: "fas fa-bolt",
    description: "Reduces the Action Point Cost (APC) of all weapons, spells, and actions (minimum 1 AP).",
    hint: "Enter a positive number (e.g. 1) to reduce all action AP costs by 1.",
  },
  {
    id: "reduce_apc_weapon",
    category: "economy",
    label: "Reduce Weapon APC Only",
    shortLabel: "Reduce Weapon APC",
    key: `flags.${MODULE_ID}.bonuses.reduceWeaponApc`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "APC",
    icon: "fas fa-gavel",
    description: "Reduces the Action Point Cost (APC) of weapon attacks only (minimum 1 AP).",
    hint: "Ideal for weapon mastery talents or lightweight weapon enchantments.",
  },
  {
    id: "reduce_apc_weapon_ranged",
    category: "economy",
    label: "Reduce Ranged Weapon APC",
    shortLabel: "Reduce Ranged APC",
    key: `flags.${MODULE_ID}.bonuses.reduceWeaponApcByTag.ranged`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "APC",
    icon: "fas fa-bow-arrow",
    description: "Reduces the Action Point Cost (APC) of ranged weapon attacks.",
    hint: "Applies to bows, crossbows, slings, and ranged weapons.",
  },
  {
    id: "reduce_apc_weapon_twohanded",
    category: "economy",
    label: "Reduce Two-Handed Weapon APC",
    shortLabel: "Reduce 2H APC",
    key: `flags.${MODULE_ID}.bonuses.reduceWeaponApcByTag.twoHanded`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "APC",
    icon: "fas fa-hammer",
    description: "Reduces the Action Point Cost (APC) of two-handed weapon attacks.",
    hint: "Applies to weapons with the Two-Handed tag.",
  },
  {
    id: "reduce_apc_weapon_thrown",
    category: "economy",
    label: "Reduce Thrown Weapon APC",
    shortLabel: "Reduce Thrown APC",
    key: `flags.${MODULE_ID}.bonuses.reduceWeaponApcByTag.thrown`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "APC",
    icon: "fas fa-bullseye",
    description: "Reduces the Action Point Cost (APC) of thrown weapon attacks.",
    hint: "Applies to weapons with the Thrown tag.",
  },
  {
    id: "min_weapon_apc",
    category: "economy",
    label: "Minimum Weapon APC Floor",
    shortLabel: "Min Weapon APC",
    key: `flags.${MODULE_ID}.bonuses.minWeaponApc`,
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "1",
    unit: "Min AP",
    icon: "fas fa-lock",
    description: "Sets the minimum Action Point Cost floor for weapon APC reductions (e.g. min 1 or min 2).",
    hint: "Ensures weapon APC reductions cannot drop below this threshold.",
  },
  {
    id: "reduce_apc_spell",
    category: "economy",
    label: "Reduce Spell APC Only",
    shortLabel: "Reduce Spell APC",
    key: `flags.${MODULE_ID}.bonuses.reduceSpellApc`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "APC",
    icon: "fas fa-hat-wizard",
    description: "Reduces the Action Point Cost (APC) of spells only (minimum 1 AP).",
    hint: "Ideal for quickened casting talents or arcane focuses.",
  },
  {
    id: "ap_max",
    category: "economy",
    label: "Maximum Action Points (Max AP)",
    shortLabel: "Max AP",
    key: "system.ap.max",
    altKeys: [`flags.${MODULE_ID}.bonuses.apMax`, "system.bonuses.ap.max"],
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "AP",
    icon: "fas fa-bolt-lightning",
    description: "Increases or reduces Maximum Action Points per round on top of Coordination & Level progression.",
    hint: "Example: +1 Max AP grants 1 extra Action Point every round.",
  },
  {
    id: "ap_special",
    category: "economy",
    label: "Special / Reactive Action Points (Special AP)",
    shortLabel: "Special AP",
    key: "system.ap.special",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Special AP",
    icon: "fas fa-star-of-life",
    description: "Grants bonus Special Action Points (spent before regular AP).",
    hint: "Used by talents that grant free movement, reactive AP, or combat maneuvers.",
  },
  {
    id: "sp_max",
    category: "economy",
    label: "Maximum Spell Points (Max SP)",
    shortLabel: "Max SP",
    key: "system.sp.max",
    altKeys: [`flags.${MODULE_ID}.bonuses.spMax`, "system.bonuses.sp.max"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "5",
    unit: "SP",
    icon: "fas fa-fire-flame-curved",
    description: "Increases or reduces the character's Maximum Spell Points pool.",
    hint: "Supports flat numbers (5) or formulas like @level.",
  },
  {
    id: "essence_max",
    category: "economy",
    label: "Essence Binding Capacity (Max EP)",
    shortLabel: "Max Essence (EP)",
    key: `flags.${MODULE_ID}.bonuses.essenceMax`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "20",
    unit: "EP",
    icon: "fas fa-gem",
    description: "Increases the character's maximum Essence Binding Point capacity (default 100 EP).",
    hint: "Allows binding more magical equipment and essence-cost talents.",
  },
  {
    id: "power_arcane",
    category: "economy",
    label: "Arcane Power Level",
    shortLabel: "Arcane Power",
    key: "system.powerLevel.arcane",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Power",
    icon: "fas fa-book-sparkles",
    description: "Modifies the character's Arcane Magic Power Level for spell scaling and prerequisites.",
    hint: "Increases effective Arcane tier for cantrips and spells.",
  },
  {
    id: "power_divine",
    category: "economy",
    label: "Divine Power Level",
    shortLabel: "Divine Power",
    key: "system.powerLevel.divine",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Power",
    icon: "fas fa-sun",
    description: "Modifies the character's Divine Magic Power Level for prayers and divine spells.",
    hint: "Increases effective Divine tier for prayers and divine spells.",
  },
  {
    id: "power_occult",
    category: "economy",
    label: "Occult Power Level",
    shortLabel: "Occult Power",
    key: "system.powerLevel.occult",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Power",
    icon: "fas fa-moon",
    description: "Modifies the character's Occult Magic Power Level for chants and occult rituals.",
    hint: "Increases effective Occult tier.",
  },
  {
    id: "power_primal",
    category: "economy",
    label: "Primal Power Level",
    shortLabel: "Primal Power",
    key: "system.powerLevel.primal",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Power",
    icon: "fas fa-leaf",
    description: "Modifies the character's Primal Magic Power Level.",
    hint: "Increases effective Primal tier.",
  },
  {
    id: "power_psionic",
    category: "economy",
    label: "Psionic Power Level",
    shortLabel: "Psionic Power",
    key: "system.powerLevel.psionic",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Power",
    icon: "fas fa-brain",
    description: "Modifies the character's Psionic Power Level for manifestations and psionic spells.",
    hint: "Increases effective Psionic tier.",
  },
  {
    id: "luck_points",
    category: "economy",
    label: "Luck Points (LP)",
    shortLabel: "Luck Points",
    key: "system.lp.value",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "LP",
    icon: "fas fa-clover",
    description: "Modifies current Luck Points.",
    hint: "Used for fortune favors or temporary luck blessings.",
  },

  // ── DEFENSES & MITIGATION ────────────────────────────────────────────────
  {
    id: "dr_value",
    category: "defenses",
    label: "Damage Reduction (DR)",
    shortLabel: "DR",
    key: "system.damage.reduction.value",
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "3",
    unit: "DR",
    icon: "fas fa-shield-virus",
    description: "Reduces incoming physical/applicable damage by this flat amount in the damage pipeline.",
    hint: "Automatically applied when taking damage with DR active.",
  },
  {
    id: "dr_bypasses",
    category: "defenses",
    label: "Damage Reduction Bypasses",
    shortLabel: "DR Bypasses",
    key: "system.damage.reduction.bypasses",
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "string",
    defaultValue: "Silver, Magical",
    unit: "",
    icon: "fas fa-ban",
    description: "Specifies damage types or weapon qualities that bypass this character's Damage Reduction.",
    hint: "Example: Silver, Magical, Radiant.",
  },
  {
    id: "dt_value",
    category: "defenses",
    label: "Damage Threshold (DT)",
    shortLabel: "Damage Threshold",
    key: "system.damage.threshold",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "5",
    unit: "DT",
    icon: "fas fa-chess-rook",
    description: "Ignores any single instance of damage strictly lower than the Damage Threshold.",
    hint: "Hits dealing less than DT deal 0 damage.",
  },
  {
    id: "def_ar",
    category: "defenses",
    label: "Armor Rating (AR)",
    shortLabel: "AR",
    key: "system.bonuses.ar",
    altKeys: ["system.defenses.ar"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "AR",
    icon: "fas fa-shield-halved",
    description: "Adds a bonus or penalty to Armor Rating (AR), stacking with worn armor and shields.",
    hint: "Works whether the character is armored or unarmored.",
  },
  {
    id: "def_ref",
    category: "defenses",
    label: "Reflexes Defense (REF)",
    shortLabel: "REF",
    key: "system.bonuses.ref",
    altKeys: ["system.defenses.ref"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "REF",
    icon: "fas fa-wind",
    description: "Adds a bonus or penalty to Reflexes (REF) defense.",
    hint: "Stacks with base 10 + DEX + armor modifiers.",
  },
  {
    id: "def_fort",
    category: "defenses",
    label: "Fortitude Defense (FORT)",
    shortLabel: "FORT",
    key: "system.bonuses.fort",
    altKeys: ["system.defenses.fort"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "FORT",
    icon: "fas fa-mountain",
    description: "Adds a bonus or penalty to Fortitude (FORT) defense.",
    hint: "Stacks with base 10 + END + armor modifiers.",
  },
  {
    id: "def_ant",
    category: "defenses",
    label: "Anticipation Defense (ANT)",
    shortLabel: "ANT",
    key: "system.bonuses.ant",
    altKeys: ["system.defenses.ant"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "ANT",
    icon: "fas fa-eye",
    description: "Adds a bonus or penalty to Anticipation (ANT) defense.",
    hint: "Stacks with base 10 + AWR + armor modifiers.",
  },
  {
    id: "def_log",
    category: "defenses",
    label: "Logic Defense (LOG)",
    shortLabel: "LOG",
    key: "system.bonuses.log",
    altKeys: ["system.defenses.log"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "LOG",
    icon: "fas fa-brain",
    description: "Adds a bonus or penalty to Logic (LOG) defense.",
    hint: "Stacks with base 10 + INT + armor modifiers.",
  },
  {
    id: "def_will",
    category: "defenses",
    label: "Willpower Defense (WILL)",
    shortLabel: "WILL",
    key: "system.bonuses.will",
    altKeys: ["system.defenses.will"],
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "WILL",
    icon: "fas fa-crown",
    description: "Adds a bonus or penalty to Willpower (WILL) defense.",
    hint: "Stacks with base 10 + CHA + armor modifiers.",
  },
  {
    id: "def_all",
    category: "defenses",
    label: "All Defenses (AR, REF, FORT, ANT, LOG, WILL)",
    shortLabel: "All Defenses",
    key: `flags.${MODULE_ID}.bonuses.defenses.all`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "1",
    unit: "Defenses",
    icon: "fas fa-shield",
    description: "Simultaneously modifies all 6 MythCraft defenses (AR, REF, FORT, ANT, LOG, and WILL).",
    hint: "Great for protective auras, cloaks of protection, or defensive stances.",
  },
  {
    id: "def_physical",
    category: "defenses",
    label: "Physical Defenses (AR, REF, FORT)",
    shortLabel: "Physical Defs",
    key: `flags.${MODULE_ID}.bonuses.defenses.physical`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "Phys Def",
    icon: "fas fa-user-shield",
    description: "Simultaneously modifies AR, Reflexes (REF), and Fortitude (FORT).",
    hint: "Matches the Protected condition or physical ward spells.",
  },
  {
    id: "def_mental",
    category: "defenses",
    label: "Mental Defenses (ANT, LOG, WILL)",
    shortLabel: "Mental Defs",
    key: `flags.${MODULE_ID}.bonuses.defenses.mental`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "Mental Def",
    icon: "fas fa-head-side-virus",
    description: "Simultaneously modifies Anticipation (ANT), Logic (LOG), and Willpower (WILL).",
    hint: "Ideal for mental wards and psionic shields.",
  },
  {
    id: "dmg_resist",
    category: "defenses",
    label: "Damage Resistance (e.g. Fire 3, Sharp 2)",
    shortLabel: "Resistance",
    key: `flags.${MODULE_ID}.bonuses.resist`,
    altKeys: ["system.damage.resist"],
    defaultMode: AE_MODES.ADD,
    valueType: "damageTypeAmount",
    defaultValue: "Fire 3",
    unit: "",
    icon: "fas fa-fire-extinguisher",
    description: "Grants Damage Resistance to a specific damage type (e.g. 'Fire 3' or 'Sharp 2'). Stacks with existing resistances.",
    hint: "Select a damage type and amount, or enter comma-separated resistances like 'Fire 3, Cold 3'.",
  },
  {
    id: "dmg_immune",
    category: "defenses",
    label: "Damage Immunity",
    shortLabel: "Immunity",
    key: "system.damage.immune",
    defaultMode: AE_MODES.ADD,
    valueType: "damageType",
    defaultValue: "fire",
    unit: "",
    icon: "fas fa-ban",
    description: "Grants complete Immunity (0 damage taken) to a damage type.",
    hint: "Choose a damage type such as fire, cold, toxic, necrotic, or psychic.",
  },
  {
    id: "dmg_affinity",
    category: "defenses",
    label: "Elemental / Damage Affinity (Halves Damage Taken)",
    shortLabel: "Affinity",
    key: "system.damage.affinity",
    defaultMode: AE_MODES.ADD,
    valueType: "damageType",
    defaultValue: "fire",
    unit: "",
    icon: "fas fa-yin-yang",
    description: "Grants Affinity with a damage type (halves incoming damage of that type).",
    hint: "Choose a damage type such as fire, cold, lightning, or radiant.",
  },
  {
    id: "dmg_vulnerable",
    category: "defenses",
    label: "Damage Vulnerability (e.g. Cold 2)",
    shortLabel: "Vulnerability",
    key: `flags.${MODULE_ID}.bonuses.vulnerable`,
    altKeys: ["system.damage.vulnerable"],
    defaultMode: AE_MODES.ADD,
    valueType: "damageTypeAmount",
    defaultValue: "Cold 2",
    unit: "",
    icon: "fas fa-heart-crack",
    description: "Increases incoming damage taken from a specific damage type.",
    hint: "Example: 'Cold 2' or 'Radiant 4'.",
  },
  {
    id: "dmg_absorb",
    category: "defenses",
    label: "Damage Absorption (e.g. Fire 3)",
    shortLabel: "Absorb",
    key: `flags.${MODULE_ID}.bonuses.absorb`,
    defaultMode: AE_MODES.ADD,
    valueType: "damageTypeAmount",
    defaultValue: "Fire 3",
    unit: "",
    icon: "fas fa-circle-dot",
    description: "Grants Damage Absorption for a damage type.",
    hint: "Example: 'Fire 3' or 'Lightning 5'.",
  },
  {
    id: "second_skin_light",
    category: "defenses",
    label: "Second Skin: Light Armor (Unlock Armor Resist)",
    shortLabel: "Second Skin (Light)",
    key: `flags.${MODULE_ID}.bonuses.secondSkinLight`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "1",
    unit: "",
    icon: "fas fa-vest",
    description: "Unlocks innate armor resistances while wearing Light Armor.",
    hint: "Automatically granted by the Second Skin: Light Armor talent.",
  },
  {
    id: "second_skin_medium",
    category: "defenses",
    label: "Second Skin: Medium Armor (Unlock Armor Resist)",
    shortLabel: "Second Skin (Medium)",
    key: `flags.${MODULE_ID}.bonuses.secondSkinMedium`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "1",
    unit: "",
    icon: "fas fa-shirt",
    description: "Unlocks innate armor resistances while wearing Medium Armor.",
    hint: "Automatically granted by the Second Skin: Medium Armor talent.",
  },
  {
    id: "second_skin_heavy",
    category: "defenses",
    label: "Second Skin: Heavy Armor (Unlock Armor Resist)",
    shortLabel: "Second Skin (Heavy)",
    key: `flags.${MODULE_ID}.bonuses.secondSkinHeavy`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "1",
    unit: "",
    icon: "fas fa-helmet-battle",
    description: "Unlocks innate armor resistances while wearing Heavy Armor.",
    hint: "Automatically granted by the Second Skin: Heavy Armor talent.",
  },
  {
    id: "second_skin_shields",
    category: "defenses",
    label: "Second Skin: Shields (Unlock Shield Resist)",
    shortLabel: "Second Skin (Shields)",
    key: `flags.${MODULE_ID}.bonuses.secondSkinShields`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "1",
    unit: "",
    icon: "fas fa-shield-halved",
    description: "Unlocks innate shield resistances while wielding a Shield.",
    hint: "Automatically granted by the Second Skin: Shields talent.",
  },
  {
    id: "unarmored_ar_sub",
    category: "defenses",
    label: "Unarmored AR Attribute Bonus (e.g. dex, awr, luck)",
    shortLabel: "Unarmored AR Sub",
    key: `flags.${MODULE_ID}.bonuses.unarmoredArSub`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "string",
    defaultValue: "dex",
    unit: "",
    icon: "fas fa-person-rays",
    description: "Adds an attribute (such as dex, awr, end, or luck) to Unarmored Armor Rating (10 + Attr).",
    hint: "Used by Pugilist, Acrobat, and unarmored defense talents.",
  },
  {
    id: "ref_use_luck",
    category: "defenses",
    label: "Reflexes Uses LUCK Instead of DEX",
    shortLabel: "REF Uses LUCK",
    key: `flags.${MODULE_ID}.bonuses.refUseLuck`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "1",
    unit: "",
    icon: "fas fa-clover",
    description: "Allows Reflexes (REF) defense to use LUCK in place of DEX when higher.",
    hint: "Used by Lucky Placement and fortune defense talents.",
  },

  // ── COMBAT, ATTACKS & DAMAGE ─────────────────────────────────────────────
  {
    id: "atk_weapon",
    category: "combat",
    label: "Weapon Attack Roll Bonus",
    shortLabel: "Weapon Attack",
    key: `flags.${MODULE_ID}.bonuses.attack.weapon`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "1",
    unit: "Atk",
    icon: "fas fa-sword",
    description: "Adds a bonus or penalty to all Weapon Attack d20 rolls and updates the Equipment tab display.",
    hint: "Example: +1 for a masterwork/enchanted weapon buff or combat stance.",
  },
  {
    id: "atk_spell",
    category: "combat",
    label: "Spell Attack Roll Bonus",
    shortLabel: "Spell Attack",
    key: `flags.${MODULE_ID}.bonuses.attack.spell`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "1",
    unit: "Spell Atk",
    icon: "fas fa-wand-sparkles",
    description: "Adds a bonus or penalty to all Spell Attack d20 rolls.",
    hint: "Example: +1 from an Arcane Focus, Wand, or Prayer.",
  },
  {
    id: "atk_all",
    category: "combat",
    label: "All Attack Rolls Bonus (Weapons & Spells)",
    shortLabel: "All Attacks",
    key: `flags.${MODULE_ID}.bonuses.attack.all`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "1",
    unit: "All Atk",
    icon: "fas fa-crosshairs",
    description: "Adds a bonus or penalty to both Weapon and Spell attack rolls.",
    hint: "Applies to all offensive attack rolls without affecting skill checks.",
  },
  {
    id: "rolls_all",
    category: "combat",
    label: "All d20 Rolls Bonus (Attacks, Skills & Checks)",
    shortLabel: "All d20 Rolls",
    key: "system.bonuses.rolls.all",
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "1",
    unit: "d20",
    icon: "fas fa-dice-d20",
    description: "Modifies every d20 roll made by the character (Attacks, Skill Checks, and Attribute Checks).",
    hint: "Used by global blessings (+1) or conditions like Shaken (-2).",
  },
  {
    id: "dmg_weapon",
    category: "combat",
    label: "Weapon Damage Bonus (Flat or Dice)",
    shortLabel: "Weapon Damage",
    key: `flags.${MODULE_ID}.bonuses.damage.weapon`,
    defaultMode: AE_MODES.ADD,
    valueType: "diceOrNumber",
    defaultValue: "2",
    unit: "Dmg",
    icon: "fas fa-fire-flame-simple",
    description: "Adds flat damage (e.g. 2) OR bonus dice (e.g. 1d6) to all Weapon damage rolls and weapon cards.",
    hint: "Enter a number like 2, a formula like @str, or dice like 1d6.",
  },
  {
    id: "dmg_spell",
    category: "combat",
    label: "Spell Damage Bonus (Flat or Dice)",
    shortLabel: "Spell Damage",
    key: `flags.${MODULE_ID}.bonuses.damage.spell`,
    defaultMode: AE_MODES.ADD,
    valueType: "diceOrNumber",
    defaultValue: "2",
    unit: "Spell Dmg",
    icon: "fas fa-explosion",
    description: "Adds flat damage (e.g. 2) OR bonus dice (e.g. 1d6) to all Spell damage rolls.",
    hint: "Enter a number like 2 or dice like 1d6.",
  },
  {
    id: "dmg_all",
    category: "combat",
    label: "All Damage Rolls Bonus (Weapons & Spells)",
    shortLabel: "All Damage",
    key: `flags.${MODULE_ID}.bonuses.damage.all`,
    defaultMode: AE_MODES.ADD,
    valueType: "diceOrNumber",
    defaultValue: "2",
    unit: "All Dmg",
    icon: "fas fa-burst",
    description: "Adds flat damage or bonus dice to every Weapon and Spell damage roll.",
    hint: "Enter a number like 2 or dice like 1d4.",
  },
  {
    id: "crit_bonus",
    category: "combat",
    label: "Critical Hit Range Expansion (+Crit Range)",
    shortLabel: "Crit Range",
    key: `flags.${MODULE_ID}.critBonus`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Crit Range",
    icon: "fas fa-star",
    description: "Expands the d20 Critical Hit threshold (e.g. +1 changes a 20 crit threshold to 19–20).",
    hint: "Stacks with Luck and Astounding Critical.",
  },
  {
    id: "tactical_advantage",
    category: "combat",
    label: "Tactical Advantage (TA)",
    shortLabel: "Tactical Adv (TA)",
    key: "system.bonuses.ta",
    altKeys: ["system.rollModes.ta"],
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "TA",
    icon: "fas fa-angles-up",
    description: "Grants stacks of Tactical Advantage on rolls.",
    hint: "Used by Flanking, Concealed, Unseen, and tactical talents.",
  },
  {
    id: "tactical_disadvantage",
    category: "combat",
    label: "Tactical Disadvantage (TD)",
    shortLabel: "Tactical Disadv (TD)",
    key: "system.bonuses.td.all",
    altKeys: ["system.rollModes.td"],
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "TD",
    icon: "fas fa-angles-down",
    description: "Applies stacks of Tactical Disadvantage on rolls.",
    hint: "Used by Prone, Frightened, or Pinned.",
  },
  {
    id: "sneak_attack_dice",
    category: "combat",
    label: "Sneak Attack Bonus Dice (d6)",
    shortLabel: "Sneak Attack",
    key: `flags.${MODULE_ID}.bonuses.sneakAttackDice`,
    defaultMode: AE_MODES.ADD,
    valueType: "diceOrNumber",
    defaultValue: "1d6",
    unit: "Sneak",
    icon: "fas fa-user-ninja",
    description: "Adds Sneak Attack dice (e.g. 1d6) to qualifying Rogue/stealth attacks.",
    hint: "Automatically granted by Sneak Attack talents.",
  },
  {
    id: "unarmed_die_step",
    category: "combat",
    label: "Unarmed / Improvised Damage Die Step-Up",
    shortLabel: "Unarmed Die Step",
    key: `flags.${MODULE_ID}.bonuses.unarmedDieStep`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "Die Step",
    icon: "fas fa-hand-fist",
    description: "Steps up the damage die of Unarmed / Fist / Improvised attacks along the MythCraft progression.",
    hint: "Example: +1 steps 1 -> 1d4 -> 1d6 -> 1d8 -> 1d10 -> 1d12.",
  },
  {
    id: "ignore_resist",
    category: "combat",
    label: "Ignore Enemy Resistance (Type or All)",
    shortLabel: "Ignore Resist",
    key: `flags.${MODULE_ID}.bonuses.ignoreResist`,
    defaultMode: AE_MODES.ADD,
    valueType: "string",
    defaultValue: "Fire",
    unit: "",
    icon: "fas fa-bolt-slash",
    description: "Allows your attacks/spells to ignore enemy Resistance of the specified damage type.",
    hint: "Example: Fire, Cold, Sharp, or All.",
  },

  // ── ATTRIBUTES, SKILLS & MOBILITY ────────────────────────────────────────
  {
    id: "attr_str",
    category: "attributes",
    label: "Strength (STR)",
    shortLabel: "STR",
    key: "system.attributes.str",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "STR",
    icon: "fas fa-dumbbell",
    description: "Modifies Strength (STR), automatically updating STR-based weapon attacks/damage, skills, and armor requirements.",
    hint: "In MythCraft, the attribute score is the modifier directly.",
  },
  {
    id: "attr_dex",
    category: "attributes",
    label: "Dexterity (DEX)",
    shortLabel: "DEX",
    key: "system.attributes.dex",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "DEX",
    icon: "fas fa-feather-pointed",
    description: "Modifies Dexterity (DEX), automatically updating Reflexes (REF), DEX weapons, and DEX skills.",
    hint: "Respects worn armor DEX Max caps on REF.",
  },
  {
    id: "attr_end",
    category: "attributes",
    label: "Endurance (END)",
    shortLabel: "END",
    key: "system.attributes.end",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "END",
    icon: "fas fa-heart-circle-bolt",
    description: "Modifies Endurance (END), automatically updating Fortitude (FORT) and END skills.",
    hint: "Directly boosts Fortitude defense.",
  },
  {
    id: "attr_awr",
    category: "attributes",
    label: "Awareness (AWR)",
    shortLabel: "AWR",
    key: "system.attributes.awr",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "AWR",
    icon: "fas fa-eye",
    description: "Modifies Awareness (AWR), automatically updating Anticipation (ANT) and AWR skills.",
    hint: "Directly boosts Anticipation defense and observation skills.",
  },
  {
    id: "attr_int",
    category: "attributes",
    label: "Intellect (INT)",
    shortLabel: "INT",
    key: "system.attributes.int",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "INT",
    icon: "fas fa-graduation-cap",
    description: "Modifies Intellect (INT), automatically updating Logic (LOG), INT spellcasting, and knowledge skills.",
    hint: "Directly boosts Logic defense.",
  },
  {
    id: "attr_cha",
    category: "attributes",
    label: "Charisma (CHA)",
    shortLabel: "CHA",
    key: "system.attributes.cha",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "CHA",
    icon: "fas fa-comments",
    description: "Modifies Charisma (CHA), automatically updating Willpower (WILL), CHA spellcasting, and social skills.",
    hint: "Directly boosts Willpower defense.",
  },
  {
    id: "attr_luck",
    category: "attributes",
    label: "Luck Attribute (LCK)",
    shortLabel: "LUCK",
    key: "system.attributes.luck",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "LUCK",
    icon: "fas fa-clover",
    description: "Modifies the Luck (LCK) attribute, affecting critical hit damage and max Luck Points.",
    hint: "Negative Luck penalizes d20 rolls; positive Luck boosts crit damage.",
  },
  {
    id: "attr_cor",
    category: "attributes",
    label: "Coordination (COR)",
    shortLabel: "COR",
    key: "system.attributes.cor",
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "1",
    unit: "COR",
    icon: "fas fa-hands-asl-interpreting",
    description: "Modifies Coordination (COR), which governs Maximum Action Points (3 + floor(COR / 2)).",
    hint: "Every +2 COR increases base Max AP by +1.",
  },
  {
    id: "move_walk",
    category: "attributes",
    label: "Walking Speed (ft)",
    shortLabel: "Walk Speed",
    key: "system.movement.walk",
    altKeys: [`flags.${MODULE_ID}.bonuses.speed`],
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "10",
    unit: "ft",
    icon: "fas fa-shoe-prints",
    description: "Modifies Walking Speed in feet (default 20 ft). Supports Add (+10), Multiply (×0.5 for Slowed), or Set (=0).",
    hint: "Works seamlessly alongside armor speed penalties.",
  },
  {
    id: "move_fly",
    category: "attributes",
    label: "Flying Speed (ft)",
    shortLabel: "Fly Speed",
    key: "system.movement.fly",
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "30",
    unit: "ft",
    icon: "fas fa-feather",
    description: "Grants or modifies Flying Speed in feet.",
    hint: "Use Minimum Floor (≥ 30) to grant a 30 ft Fly speed or Add (+10) to boost existing flight.",
  },
  {
    id: "move_swim",
    category: "attributes",
    label: "Swimming Speed (ft)",
    shortLabel: "Swim Speed",
    key: "system.movement.swim",
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "20",
    unit: "ft",
    icon: "fas fa-person-swimming",
    description: "Grants or modifies Swimming Speed in feet.",
    hint: "Use Minimum Floor (≥ 20) to grant a 20 ft Swim speed.",
  },
  {
    id: "move_climb",
    category: "attributes",
    label: "Climbing Speed (ft)",
    shortLabel: "Climb Speed",
    key: "system.movement.climb",
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "20",
    unit: "ft",
    icon: "fas fa-mountain-sun",
    description: "Grants or modifies Climbing Speed in feet.",
    hint: "Use Minimum Floor (≥ 20) to grant a 20 ft Climb speed.",
  },
  {
    id: "move_burrow",
    category: "attributes",
    label: "Burrowing Speed (ft)",
    shortLabel: "Burrow Speed",
    key: "system.movement.burrow",
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "15",
    unit: "ft",
    icon: "fas fa-mound",
    description: "Grants or modifies Burrowing Speed in feet.",
    hint: "Use Minimum Floor (≥ 15) to grant a 15 ft Burrow speed.",
  },
  {
    id: "init_bonus",
    category: "attributes",
    label: "Initiative Bonus",
    shortLabel: "Initiative",
    key: "system.initiative.bonus",
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "2",
    unit: "Init",
    icon: "fas fa-stopwatch",
    description: "Adds a bonus or penalty to Initiative rolls.",
    hint: "Stacks with base Initiative.",
  },
  {
    id: "skills_all",
    category: "attributes",
    label: "All Skill Checks Bonus",
    shortLabel: "All Skills",
    key: `flags.${MODULE_ID}.bonuses.skills.all`,
    defaultMode: AE_MODES.ADD,
    valueType: "formula",
    defaultValue: "1",
    unit: "Skills",
    icon: "fas fa-award",
    description: "Adds a bonus or penalty to every Skill Check rolled on the character sheet.",
    hint: "Does not modify attack rolls—only Skill Checks.",
  },
  {
    id: "skill_points_bonus",
    category: "attributes",
    label: "Bonus Skill Points",
    shortLabel: "Skill Points",
    key: `flags.${MODULE_ID}.bonuses.skillPoints`,
    defaultMode: AE_MODES.ADD,
    valueType: "number",
    defaultValue: "2",
    unit: "Skill Pts",
    icon: "fas fa-graduation-cap",
    description: "Grants bonus Skill Points for character advancement and skill rank training.",
    hint: "Used by Skill Stack and polymath talents.",
  },
  {
    id: "ignore_heavy_armor_penalty",
    category: "attributes",
    label: "Ignore Heavy Armor Speed / Skill Penalty",
    shortLabel: "Ignore Heavy Penalty",
    key: `flags.${MODULE_ID}.bonuses.ignoreHeavyArmorPenalty`,
    defaultMode: AE_MODES.OVERRIDE,
    valueType: "number",
    defaultValue: "1",
    unit: "",
    icon: "fas fa-weight-hanging",
    description: "Ignores movement speed penalties from wearing Heavy Armor.",
    hint: "Automatically granted by heavy armor mobility talents.",
  },
  {
    id: "sense_darkvision",
    category: "attributes",
    label: "Darkvision Range (ft)",
    shortLabel: "Darkvision",
    key: `flags.${MODULE_ID}.senses.darkvision`,
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "30",
    unit: "ft",
    icon: "fas fa-eye",
    description: "Grants or expands Darkvision range in feet.",
    hint: "Use Minimum Floor (≥ 30) to grant 30 ft Darkvision or Add (+30) to extend it.",
  },
  {
    id: "sense_blindsight",
    category: "attributes",
    label: "Blindsight Range (ft)",
    shortLabel: "Blindsight",
    key: `flags.${MODULE_ID}.senses.blindsight`,
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "15",
    unit: "ft",
    icon: "fas fa-ear-listen",
    description: "Grants or expands Blindsight range in feet.",
    hint: "Allows perceiving surroundings without relying on sight.",
  },
  {
    id: "sense_tremorsense",
    category: "attributes",
    label: "Tremorsense Range (ft)",
    shortLabel: "Tremorsense",
    key: `flags.${MODULE_ID}.senses.tremorsense`,
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "20",
    unit: "ft",
    icon: "fas fa-wave-square",
    description: "Grants or expands Tremorsense range in feet.",
    hint: "Detects vibrations through solid surfaces.",
  },
  {
    id: "sense_truesight",
    category: "attributes",
    label: "Truesight Range (ft)",
    shortLabel: "Truesight",
    key: `flags.${MODULE_ID}.senses.truesight`,
    defaultMode: AE_MODES.UPGRADE,
    valueType: "number",
    defaultValue: "30",
    unit: "ft",
    icon: "fas fa-sun",
    description: "Grants or expands Truesight range in feet.",
    hint: "Reveals illusions, invisible creatures, and true forms.",
  },
];

/* ───────────────────────────────────────────────────────────────────────────
 *  3. One-Click Guided MythCraft Effect Presets
 * ─────────────────────────────────────────────────────────────────────────── */

export const MYTHCRAFT_EFFECT_PRESETS = [
  {
    id: "preset_temp_hp",
    name: "Arcane / Protective Barrier (Temp HP)",
    category: "vitality",
    icon: "icons/svg/shield.svg",
    img: "icons/svg/shield.svg",
    badge: "+10 Temp HP",
    description: "Grants 10 Temporary HP (Shield Points) that absorb damage before regular HP.",
    isTemporary: true,
    rounds: 10,
    changes: [
      { key: "system.hp.shield", mode: AE_MODES.ADD, value: "10" },
    ],
  },
  {
    id: "preset_max_hp",
    name: "Vitality Blessing (+Max HP)",
    category: "vitality",
    icon: "icons/svg/regen.svg",
    img: "icons/svg/regen.svg",
    badge: "+5 Max HP",
    description: "Increases Maximum Hit Points by +5 while active.",
    isTemporary: false,
    changes: [
      { key: "system.hp.max", mode: AE_MODES.ADD, value: "5" },
    ],
  },
  {
    id: "preset_hardy_level_hp",
    name: "Hardy Endurance (+1 Max HP / Level)",
    category: "vitality",
    icon: "icons/svg/upgrade.svg",
    img: "icons/svg/upgrade.svg",
    badge: "+@level Max HP",
    description: "Automatically grants +1 Maximum HP per Character Level (scales dynamically as you level up).",
    isTemporary: false,
    changes: [
      { key: "system.hp.max", mode: AE_MODES.ADD, value: "@level" },
    ],
  },
  {
    id: "preset_reduce_spc",
    name: "Channeler's Focus (Reduce SPC -1)",
    category: "economy",
    icon: "icons/svg/daze.svg",
    img: "icons/svg/daze.svg",
    badge: "−1 SPC",
    description: "Reduces the Spell Point Cost (SPC) of all spells by 1 (minimum 0 SP).",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.reduceSpc`, mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_reduce_apc",
    name: "Tactical Celerity (Reduce APC -1)",
    category: "economy",
    icon: "icons/svg/lightning.svg",
    img: "icons/svg/lightning.svg",
    badge: "−1 APC",
    description: "Reduces the Action Point Cost (APC) of all weapons, spells, and actions by 1 (minimum 1 AP).",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.reduceApc`, mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_reduce_weapon_apc",
    name: "Swift Strikes (−1 Weapon APC)",
    category: "economy",
    icon: "icons/svg/sword.svg",
    img: "icons/svg/sword.svg",
    badge: "−1 Weapon APC",
    description: "Reduces the Action Point Cost (APC) of weapon attacks by 1 (minimum 1 AP).",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.reduceWeaponApc`, mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_extra_ap",
    name: "Surge of Action (+1 Max AP)",
    category: "economy",
    icon: "icons/svg/lightning.svg",
    img: "icons/svg/lightning.svg",
    badge: "+1 Max AP",
    description: "Increases Maximum Action Points per round by +1.",
    isTemporary: false,
    changes: [
      { key: "system.ap.max", mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_dr",
    name: "Ironskin Mitigation (+3 DR)",
    category: "defenses",
    icon: "icons/svg/shield.svg",
    img: "icons/svg/shield.svg",
    badge: "+3 DR",
    description: "Grants 3 Damage Reduction (DR) against incoming damage.",
    isTemporary: false,
    changes: [
      { key: "system.damage.reduction.value", mode: AE_MODES.ADD, value: "3" },
    ],
  },
  {
    id: "preset_ar_boost",
    name: "Guardian's Ward (+2 AR)",
    category: "defenses",
    icon: "icons/svg/shield.svg",
    img: "icons/svg/shield.svg",
    badge: "+2 AR",
    description: "Increases Armor Rating (AR) by +2, stacking with worn armor and shields.",
    isTemporary: false,
    changes: [
      { key: "system.bonuses.ar", mode: AE_MODES.ADD, value: "2" },
    ],
  },
  {
    id: "preset_all_defenses",
    name: "Mantle of Protection (+1 All Defenses)",
    category: "defenses",
    icon: "icons/svg/aura.svg",
    img: "icons/svg/aura.svg",
    badge: "+1 All Defs",
    description: "Increases AR, REF, FORT, ANT, LOG, and WILL by +1.",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.defenses.all`, mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_fire_resist",
    name: "Elemental Ward (Fire Resist 3)",
    category: "defenses",
    icon: "icons/svg/fire.svg",
    img: "icons/svg/fire.svg",
    badge: "Fire Resist 3",
    description: "Grants Fire 3 Damage Resistance.",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.resist`, mode: AE_MODES.ADD, value: "Fire 3" },
    ],
  },
  {
    id: "preset_weapon_enchant",
    name: "Masterwork / Magic Weapon (+1 Atk, +1 Dmg)",
    category: "combat",
    icon: "icons/svg/sword.svg",
    img: "icons/svg/sword.svg",
    badge: "+1 Atk / +1 Dmg",
    description: "Grants +1 to Weapon Attack rolls and +1 to Weapon Damage rolls.",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.attack.weapon`, mode: AE_MODES.ADD, value: "1" },
      { key: `flags.${MODULE_ID}.bonuses.damage.weapon`, mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_flaming_weapon",
    name: "Elemental Weapon Infusion (+1d6 Weapon Dmg)",
    category: "combat",
    icon: "icons/svg/fire.svg",
    img: "icons/svg/fire.svg",
    badge: "+1d6 Dmg",
    description: "Adds +1d6 bonus dice to Weapon Damage rolls.",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.bonuses.damage.weapon`, mode: AE_MODES.ADD, value: "1d6" },
    ],
  },
  {
    id: "preset_keen_crit",
    name: "Keen Edge (+1 Crit Hit Range)",
    category: "combat",
    icon: "icons/svg/upgrade.svg",
    img: "icons/svg/upgrade.svg",
    badge: "+1 Crit Range",
    description: "Expands Critical Hit threshold by 1 (e.g., 20 becomes 19–20).",
    isTemporary: false,
    changes: [
      { key: `flags.${MODULE_ID}.critBonus`, mode: AE_MODES.ADD, value: "1" },
    ],
  },
  {
    id: "preset_speed_boost",
    name: "Windstrider (+10 ft Walk Speed)",
    category: "attributes",
    icon: "icons/svg/wing.svg",
    img: "icons/svg/wing.svg",
    badge: "+10 ft Speed",
    description: "Increases Walking Speed by +10 feet.",
    isTemporary: false,
    changes: [
      { key: "system.movement.walk", mode: AE_MODES.ADD, value: "10" },
    ],
  },
];

/* ───────────────────────────────────────────────────────────────────────────
 *  4. Dynamic Catalog Builder (Includes Actor's Skills & Custom Attributes)
 * ─────────────────────────────────────────────────────────────────────────── */

export function getCatalogTargetsForDocument(doc = null) {
  const actor = doc?.documentName === "Actor" ? doc : (doc?.parent?.documentName === "Actor" ? doc.parent : null);
  const targets = [...MYTHCRAFT_EFFECT_CATALOG];

  // Add optional Sanity attribute if enabled or present
  let sanEnabled = false;
  try {
    sanEnabled = Boolean(globalThis.game?.settings?.get?.(MODULE_ID, "enableSanity")) || (actor?.system?.attributes?.san !== undefined);
  } catch (_) {}
  if (sanEnabled && !targets.some(t => t.key === "system.attributes.san")) {
    targets.push({
      id: "attr_san",
      category: "attributes",
      label: "Sanity (SAN)",
      shortLabel: "SAN",
      key: "system.attributes.san",
      defaultMode: AE_MODES.ADD,
      valueType: "number",
      defaultValue: "1",
      unit: "SAN",
      icon: "fas fa-brain",
      description: "Modifies the Sanity (SAN) metaphysical attribute.",
      hint: "Optional MythCraft horror/sanity rule.",
    });
  }

  // Add any custom attributes configured in settings
  let customAttrs = [];
  try {
    const rawCustom = globalThis.game?.settings?.get?.(MODULE_ID, "customAttributes");
    if (Array.isArray(rawCustom)) customAttrs = rawCustom;
    else if (typeof rawCustom === "string" && rawCustom.trim().startsWith("[")) {
      customAttrs = JSON.parse(rawCustom);
    }
  } catch (_) {
    customAttrs = [];
  }
  if (Array.isArray(customAttrs)) {
    for (const ca of customAttrs) {
      if (!ca?.key) continue;
      const keyPath = `system.attributes.${ca.key}`;
      if (!targets.some(t => t.key === keyPath)) {
        targets.push({
          id: `attr_custom_${ca.key}`,
          category: "attributes",
          label: `${ca.name || ca.key.toUpperCase()} (${(ca.abbr || ca.key).toUpperCase()})`,
          shortLabel: (ca.abbr || ca.key).toUpperCase(),
          key: keyPath,
          defaultMode: AE_MODES.ADD,
          valueType: "number",
          defaultValue: "1",
          unit: (ca.abbr || ca.key).toUpperCase(),
          icon: "fas fa-star",
          description: `Modifies the custom attribute ${ca.name || ca.key}.`,
          hint: "Custom attribute.",
        });
      }
    }
  }

  // Add system skills so users can pick any specific skill from the dropdown
  const skillEntries = new Map();
  const sysSkillList = globalThis.mythcraft?.CONFIG?.skills?.list || globalThis.CONFIG?.mythcraft?.skills?.list || {};
  for (const [skKey, skDef] of Object.entries(sysSkillList)) {
    const rawLabel = skDef?.label ? (globalThis.game?.i18n?.localize?.(skDef.label) || skDef.label) : skKey;
    const cleanLabel = String(rawLabel).replace(/^MYTHCRAFT\..*\./, "");
    const formatted = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
    skillEntries.set(skKey, formatted);
  }

  if (actor?.system?.skills && typeof actor.system.skills === "object") {
    for (const skKey of Object.keys(actor.system.skills)) {
      if (!skillEntries.has(skKey)) {
        const formatted = skKey.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).trim();
        skillEntries.set(skKey, formatted);
      }
    }
  }

  // Common fallback MythCraft skills if system config isn't populated yet
  const fallbackSkills = [
    ["acrobatics", "Acrobatics"],
    ["animalHandling", "Animal Handling"],
    ["arcana", "Arcana"],
    ["athletics", "Athletics"],
    ["brewing", "Brewing"],
    ["calligraphy", "Calligraphy"],
    ["carpentry", "Carpentry"],
    ["cartography", "Cartography"],
    ["cobbling", "Cobbling"],
    ["cooking", "Cooking"],
    ["dancing", "Dancing"],
    ["deceiving", "Deceiving"],
    ["disguising", "Disguising"],
    ["dungeoneering", "Dungeoneering"],
    ["empathizing", "Empathizing"],
    ["engineering", "Engineering"],
    ["entertaining", "Entertaining"],
    ["evading", "Evading"],
    ["forging", "Forging"],
    ["FORTITUDE", "Fortitude (Skill)"],
    ["glassblowing", "Glassblowing"],
    ["gossiping", "Gossiping"],
    ["history", "History"],
    ["intimidating", "Intimidating"],
    ["investigating", "Investigating"],
    ["jeweling", "Jeweling"],
    ["leatherworking", "Leatherworking"],
    ["lockpicking", "Lockpicking"],
    ["masonry", "Masonry"],
    ["medicine", "Medicine"],
    ["menacing", "Menacing"],
    ["metalworking", "Metalworking"],
    ["nature", "Nature"],
    ["navigating", "Navigating"],
    ["painting", "Painting"],
    ["perceiving", "Perceiving"],
    ["persuading", "Persuading"],
    ["pocketpicking", "Pocketpicking"],
    ["pottery", "Pottery"],
    ["religion", "Religion"],
    ["savoirFaire", "Savoir-Faire"],
    ["sleightOfHand", "Sleight of Hand"],
    ["smithing", "Smithing"],
    ["sneaking", "Sneaking"],
    ["sprinting", "Sprinting"],
    ["stealth", "Stealth"],
    ["survival", "Survival"],
    ["tracking", "Tracking"],
    ["vehiclesLand", "Vehicles (Land)"],
    ["vehiclesWater", "Vehicles (Water)"],
    ["weaving", "Weaving"],
    ["woodcarving", "Woodcarving"],
  ];
  for (const [k, lbl] of fallbackSkills) {
    if (!skillEntries.has(k)) skillEntries.set(k, lbl);
  }

  const sortedSkills = Array.from(skillEntries.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  for (const [skKey, skLabel] of sortedSkills) {
    targets.push({
      id: `skill_${skKey}`,
      category: "attributes",
      label: `Skill: ${skLabel}`,
      shortLabel: skLabel,
      key: `system.skills.${skKey}.bonus`,
      defaultMode: AE_MODES.ADD,
      valueType: "number",
      defaultValue: "2",
      unit: skLabel,
      icon: "fas fa-Scroll",
      description: `Adds a rank/bonus modifier to ${skLabel} skill checks.`,
      hint: `Automatically included when rolling ${skLabel}.`,
    });
  }

  return targets;
}

/**
 * Finds the catalog entry matching a given ActiveEffect change key.
 */
export function findCatalogEntryByKey(key, doc = null) {
  if (!key) return null;
  const cleanKey = String(key).trim();
  const list = doc ? getCatalogTargetsForDocument(doc) : MYTHCRAFT_EFFECT_CATALOG;

  for (const entry of list) {
    if (entry.key === cleanKey) return entry;
    if (Array.isArray(entry.altKeys) && entry.altKeys.includes(cleanKey)) return entry;
  }

  // Dynamic match for system.skills.<name>.bonus
  const skillMatch = cleanKey.match(/^system\.skills\.([a-zA-Z0-9_-]+)(?:\.(?:bonus|value|ranks|mod))?$/);
  if (skillMatch) {
    const skId = skillMatch[1];
    const skLabel = skId.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).trim();
    return {
      id: `skill_${skId}`,
      category: "attributes",
      label: `Skill: ${skLabel}`,
      shortLabel: skLabel,
      key: cleanKey,
      defaultMode: AE_MODES.ADD,
      valueType: "number",
      defaultValue: "2",
      unit: skLabel,
      icon: "fas fa-award",
      description: `Modifies ${skLabel} skill checks.`,
    };
  }

  // Dynamic match for filtered weapon/spell APC and SPC keys
  const prefix = `flags.${MODULE_ID}.`;
  if (cleanKey.startsWith(prefix)) {
    const sub = cleanKey.slice(prefix.length);
    const fmtName = (s) => String(s || "").replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).trim();

    if (sub.startsWith("bonuses.reduceWeaponApcByTag.")) {
      const tag = fmtName(sub.slice("bonuses.reduceWeaponApcByTag.".length));
      return {
        id: `reduce_weapon_apc_tag_${tag}`,
        category: "economy",
        label: `Reduce ${tag} Weapon APC`,
        shortLabel: `${tag} Weapon APC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "APC",
        icon: "fas fa-gavel",
      };
    }
    if (sub.startsWith("bonuses.reduceWeaponApcByName.")) {
      const wName = fmtName(sub.slice("bonuses.reduceWeaponApcByName.".length));
      return {
        id: `reduce_weapon_apc_name_${wName}`,
        category: "economy",
        label: `Reduce ${wName} APC`,
        shortLabel: `${wName} APC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "APC",
        icon: "fas fa-sword",
      };
    }
    if (sub.startsWith("bonuses.reduceSpellApcByTag.")) {
      const tag = fmtName(sub.slice("bonuses.reduceSpellApcByTag.".length));
      return {
        id: `reduce_spell_apc_tag_${tag}`,
        category: "economy",
        label: `Reduce ${tag} Spell APC`,
        shortLabel: `${tag} Spell APC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "APC",
        icon: "fas fa-hat-wizard",
      };
    }
    if (sub.startsWith("bonuses.reduceSpellApcBySpell.")) {
      const spName = fmtName(sub.slice("bonuses.reduceSpellApcBySpell.".length));
      return {
        id: `reduce_spell_apc_name_${spName}`,
        category: "economy",
        label: `Reduce ${spName} APC`,
        shortLabel: `${spName} APC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "APC",
        icon: "fas fa-hat-wizard",
      };
    }
    if (sub.startsWith("bonuses.reduceSpellApcBySource.")) {
      const srcName = fmtName(sub.slice("bonuses.reduceSpellApcBySource.".length));
      return {
        id: `reduce_spell_apc_source_${srcName}`,
        category: "economy",
        label: `Reduce ${srcName} Spell APC`,
        shortLabel: `${srcName} Spell APC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "APC",
        icon: "fas fa-hat-wizard",
      };
    }
    if (sub.startsWith("bonuses.reduceSpcBySource.")) {
      const srcName = fmtName(sub.slice("bonuses.reduceSpcBySource.".length));
      return {
        id: `reduce_spc_source_${srcName}`,
        category: "economy",
        label: `Reduce ${srcName} SPC`,
        shortLabel: `${srcName} SPC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "SPC",
        icon: "fas fa-wand-magic-sparkles",
      };
    }
    if (sub.startsWith("bonuses.reduceSpcByTag.")) {
      const tag = fmtName(sub.slice("bonuses.reduceSpcByTag.".length));
      return {
        id: `reduce_spc_tag_${tag}`,
        category: "economy",
        label: `Reduce ${tag} SPC`,
        shortLabel: `${tag} SPC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "SPC",
        icon: "fas fa-wand-magic-sparkles",
      };
    }
    if (sub.startsWith("bonuses.reduceSpcBySpell.")) {
      const spName = fmtName(sub.slice("bonuses.reduceSpcBySpell.".length));
      return {
        id: `reduce_spc_spell_${spName}`,
        category: "economy",
        label: `Reduce ${spName} SPC`,
        shortLabel: `${spName} SPC`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: "SPC",
        icon: "fas fa-wand-magic-sparkles",
      };
    }
    if (sub.startsWith("bonuses.freeSpell.")) {
      const spName = fmtName(sub.slice("bonuses.freeSpell.".length));
      return {
        id: `free_spell_${spName}`,
        category: "economy",
        label: `0 SP Cost: ${spName}`,
        shortLabel: `0 SP: ${spName}`,
        key: cleanKey,
        defaultMode: AE_MODES.OVERRIDE,
        valueType: "number",
        defaultValue: "1",
        unit: "",
        icon: "fas fa-sparkles",
      };
    }
    if (sub.startsWith("bonuses.attrCap.")) {
      const attr = sub.slice("bonuses.attrCap.".length).toUpperCase();
      return {
        id: `attr_cap_${attr.toLowerCase()}`,
        category: "attributes",
        label: `${attr} Maximum Cap`,
        shortLabel: `${attr} Cap`,
        key: cleanKey,
        defaultMode: AE_MODES.ADD,
        valueType: "number",
        defaultValue: "1",
        unit: attr,
        icon: "fas fa-arrow-up-right-dots",
      };
    }
    if (sub.startsWith("senses.")) {
      const senseName = fmtName(sub.slice("senses.".length));
      return {
        id: `sense_${senseName.toLowerCase()}`,
        category: "attributes",
        label: `${senseName} Range (ft)`,
        shortLabel: senseName,
        key: cleanKey,
        defaultMode: AE_MODES.UPGRADE,
        valueType: "number",
        defaultValue: "30",
        unit: "ft",
        icon: "fas fa-eye",
      };
    }
  }

  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
 *  5. Human-Readable Summary Translator for Sheet Rows & Cards
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Translates a single `{ key, mode, value }` change into a human-readable summary pill.
 */
export function summarizeEffectChange(change, doc = null) {
  if (!change || !change.key) return null;
  const entry = findCatalogEntryByKey(change.key, doc);
  const mode = Number(change.mode ?? AE_MODES.ADD);
  const rawVal = String(change.value ?? "").trim();

  const label = entry ? entry.shortLabel : change.key.replace(/^system\./, "").replace(/^flags\.mythcraft-essence-sheet\./, "");
  const category = entry ? entry.category : "vitality";
  const icon = entry ? entry.icon : "fas fa-sliders";
  const isReductionBenefit = Boolean(entry?.id?.startsWith("reduce_"));

  let valueDisplay = rawVal;
  if (entry?.id?.startsWith("free_spell_")) {
    valueDisplay = "Free";
  } else if (isReductionBenefit) {
    const num = Number(rawVal);
    if (!Number.isNaN(num)) {
      valueDisplay = num >= 0 ? `−${num}` : `+${Math.abs(num)}`;
    }
  } else if (mode === AE_MODES.ADD) {
    const num = Number(rawVal);
    if (!Number.isNaN(num) && rawVal !== "") {
      valueDisplay = num >= 0 ? `+${num}` : `−${Math.abs(num)}`;
    } else if (rawVal && !rawVal.startsWith("+") && !rawVal.startsWith("-")) {
      valueDisplay = `+${rawVal}`;
    }
  } else if (mode === AE_MODES.MULTIPLY) {
    valueDisplay = `×${rawVal}`;
  } else if (mode === AE_MODES.OVERRIDE) {
    valueDisplay = `= ${rawVal}`;
  } else if (mode === AE_MODES.UPGRADE) {
    valueDisplay = `≥ ${rawVal}`;
  } else if (mode === AE_MODES.DOWNGRADE) {
    valueDisplay = `≤ ${rawVal}`;
  }

  const badgeText = `${label} ${valueDisplay}`;
  const isNegativeDisplay = String(valueDisplay).startsWith("−") || String(valueDisplay).startsWith("-");
  const isPositive = isReductionBenefit ? isNegativeDisplay : !isNegativeDisplay;

  return {
    key: change.key,
    mode,
    rawValue: rawVal,
    label,
    fullLabel: entry ? entry.label : change.key,
    valueDisplay,
    badgeText,
    text: badgeText,
    isPositive,
    category,
    icon,
  };
}

/**
 * Produces an array of readable summary pills for an ActiveEffect document.
 */
export function summarizeActiveEffect(effect, doc = null) {
  if (!effect) return [];
  const changes = Array.isArray(effect.changes) ? effect.changes : [];
  return changes.map(c => summarizeEffectChange(c, doc)).filter(Boolean);
}

/* ───────────────────────────────────────────────────────────────────────────
 *  6. Item Effect Activation Requirement Helpers
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Checks whether an Item owned by an Actor currently satisfies an effect's
 * activation requirement ("always", "conditional", "equipped", or "attuned").
 */
export function isItemEffectRequirementMet(item, effect) {
  if (!item) return true;
  const req =
    effect?.flags?.[MODULE_ID]?.itemRequirement ||
    effect?.flags?.[MODULE_ID]?.activationRequirement ||
    "always";
  if (req === "always" || req === "conditional") return true;

  const flags = item.flags?.[MODULE_ID] || {};
  if (req === "attuned") {
    return Boolean(flags.isAttuned ?? flags.attuned ?? true);
  }

  if (req === "equipped") {
    if (item.type === "weapon") {
      const isEq = typeof isWeaponEquipped === "function" ? isWeaponEquipped(item) : false;
      return isEq || Boolean(flags.isEquipped ?? flags.equipped ?? item.system?.equipped ?? false);
    }
    if (item.type === "armor") {
      return Boolean(
        flags.donned ||
        flags.isDonned ||
        flags.isEquipped ||
        flags.equipped ||
        flags.worn ||
        flags.isWorn ||
        item.system?.equipped
      );
    }
    if (item.type === "gear" || item.type === "equipment") {
      if (flags.isClothes) return Boolean(flags.worn || flags.isWorn || item.system?.equipped);
      return Boolean(flags.isEquipped ?? flags.equipped ?? flags.worn ?? flags.isWorn ?? true);
    }
  }

  return true;
}

/**
 * Returns all ActiveEffect documents on an Actor (both direct `actor.effects`
 * and transferred `item.effects` across `actor.items`) with metadata for UI display.
 */
export function getAllActorEffectsWithMeta(actor) {
  if (!actor) return [];
  const results = [];
  const seenIds = new Set();

  const getDocList = (coll) => {
    if (!coll) return [];
    if (Array.isArray(coll)) return coll;
    if (typeof coll.values === "function") return Array.from(coll.values());
    if (typeof coll[Symbol.iterator] === "function") {
      const arr = Array.from(coll);
      if (arr.length > 0 && Array.isArray(arr[0]) && arr[0].length === 2 && arr[0][1] && typeof arr[0][1] === "object") {
        return arr.map(e => e[1]);
      }
      return arr;
    }
    return [];
  };

  // 1. Direct Actor Effects
  for (const effect of getDocList(actor.effects)) {
    if (!effect || !effect.id) continue;
    seenIds.add(effect.id);
    const summaries = summarizeActiveEffect(effect, actor);
    const isTemporary = Boolean(
      effect.isTemporary ||
      Number(effect.duration?.rounds) > 0 ||
      Number(effect.duration?.turns) > 0 ||
      Number(effect.duration?.seconds) > 0
    );

    let parentItem = null;
    if (effect.origin && typeof effect.origin === "string") {
      const match = effect.origin.match(/Item\.([a-zA-Z0-9]+)/);
      if (match && actor.items?.get) {
        parentItem = actor.items.get(match[1]);
      }
      if (!parentItem && typeof globalThis.fromUuidSync === "function") {
        try {
          const doc = globalThis.fromUuidSync(effect.origin);
          if (doc?.documentName === "Item") parentItem = doc;
          else if (doc?.parent?.documentName === "Item") parentItem = doc.parent;
        } catch (_) {}
      }
    }

    const isFromItem = Boolean(parentItem);
    const effName = effect.name || effect.label || "";
    let sourceLabel = parentItem?.name || effName;
    if (!sourceLabel || ["Effect", "New Effect", "Active Effect"].includes(sourceLabel)) {
      sourceLabel = "Character Sheet";
    }

    results.push({
      effect,
      id: effect.id,
      uuid: effect.uuid,
      name: effName || (parentItem ? parentItem.name : "Effect"),
      img: effect.img || (parentItem ? parentItem.img : "icons/svg/aura.svg"),
      disabled: Boolean(effect.disabled),
      isTemporary,
      parentItem,
      parentItemId: parentItem?.id || null,
      isFromItem,
      isItemEffect: isFromItem,
      sourceLabel,
      sourceTypeLabel: parentItem ? String(parentItem.type || "item").toUpperCase() : "Sheet",
      activationRequirement: "always",
      itemRequirement: "always",
      isConditionalTalent: false,
      conditionHint: "",
      isRequirementMet: true,
      isEffectivelyActive: !effect.disabled,
      summaries,
      summaryText: summaries.map(s => s.text).join(" • ") || "No automated modifiers",
    });
  }

  // 2. Transferred Item Effects (Weapons, Armor, Gear, Talents, Features, Spells)
  for (const item of getDocList(actor.items)) {
    if (!item || !item.id) continue;
    for (const effect of getDocList(item.effects)) {
      if (!effect || !effect.id) continue;
      const effFlags = effect.flags?.[MODULE_ID] || {};
      const isEquipmentType = ["weapon", "armor", "gear", "talent", "feature"].includes(item.type);
      if (effect.transfer === false && !effFlags.managedByAem && !isEquipmentType) continue;
      const key = `${item.id}:${effect.id}`;
      if (seenIds.has(key)) continue;
      seenIds.add(key);

      const req =
        effFlags.itemRequirement ||
        effFlags.activationRequirement ||
        "always";
      const reqMet = isItemEffectRequirementMet(item, effect);
      const summaries = summarizeActiveEffect(effect, actor);
      const isTemporary = Boolean(
        effect.isTemporary ||
        Number(effect.duration?.rounds) > 0 ||
        Number(effect.duration?.turns) > 0 ||
        Number(effect.duration?.seconds) > 0
      );

      const isCanonicalTalent = Boolean(effFlags.isCanonicalTalentEffect || effFlags.canonicalTalentId);
      let talentAutomationEnabled = false;
      try {
        talentAutomationEnabled = Boolean(globalThis.game?.settings?.get(MODULE_ID, "talentAutomation"));
      } catch (_) {
        talentAutomationEnabled = false;
      }

      // An item effect is active only if:
      // 1) It is not disabled on the document
      // 2) Its item activation requirement (e.g. equipped / attuned) is met
      // 3) Talent automation setting allows canonical talent effects
      let effectiveDisabled = Boolean(effect.disabled || !reqMet);
      if (isCanonicalTalent && !talentAutomationEnabled) {
        effectiveDisabled = true;
      }

      const summaryText = (isCanonicalTalent && !talentAutomationEnabled)
        ? "(Talent Automation Disabled in Settings)"
        : (summaries.map(s => s.text).join(" • ") || "No automated modifiers");

      results.push({
        effect,
        id: effect.id,
        uuid: effect.uuid,
        name: effect.name || item.name || "Item Effect",
        img: effect.img || item.img || "icons/svg/aura.svg",
        disabled: effectiveDisabled,
        isTemporary,
        parentItem: item,
        parentItemId: item.id,
        isFromItem: true,
        isItemEffect: true,
        sourceLabel: item.name,
        sourceTypeLabel: String(item.type || "item").toUpperCase(),
        activationRequirement: req,
        itemRequirement: req,
        isConditionalTalent: Boolean(effFlags.isConditionalTalent || req === "conditional"),
        conditionHint: String(effFlags.conditionHint || ""),
        isRequirementMet: reqMet && !(isCanonicalTalent && !talentAutomationEnabled),
        isEffectivelyActive: !effectiveDisabled,
        summaries,
        summaryText,
      });
    }
  }

  return results;
}

/* ───────────────────────────────────────────────────────────────────────────
 *  7. Deterministic Formula & Bonus Evaluator for Actor Active Effects
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Evaluates a numeric or `@attr` / `@level` formula string against an Actor.
 */
export function evaluateEffectFormulaValue(rawValue, actor) {
  if (rawValue === null || rawValue === undefined) return 0;
  if (typeof rawValue === "number") return Number.isFinite(rawValue) ? rawValue : 0;

  const str = String(rawValue).trim();
  if (!str) return 0;
  if (/^[+-]?\d+(\.\d+)?$/.test(str)) return Number(str);

  // If it contains dice notation like 1d6, return NaN so caller treats it as dice
  if (/\d*d\d+/i.test(str)) return Number.NaN;

  const level = Number(actor?.system?.level ?? 1);
  const attrs = actor?.system?.attributes || {};
  const getAttr = (k) => {
    const v = attrs[k];
    return Number(typeof v === "object" && v !== null ? (v.value ?? 0) : (v ?? 0));
  };

  let expr = str
    .replace(/@level\b/gi, String(level))
    .replace(/@lvl\b/gi, String(level))
    .replace(/@str\b/gi, String(getAttr("str")))
    .replace(/@dex\b/gi, String(getAttr("dex")))
    .replace(/@end\b/gi, String(getAttr("end")))
    .replace(/@awr\b/gi, String(getAttr("awr")))
    .replace(/@int\b/gi, String(getAttr("int")))
    .replace(/@cha\b/gi, String(getAttr("cha")))
    .replace(/@luck\b/gi, String(getAttr("luck")))
    .replace(/@lck\b/gi, String(getAttr("luck")))
    .replace(/@cor\b/gi, String(getAttr("cor")))
    .replace(/@san\b/gi, String(getAttr("san")));

  expr = expr
    .replace(/floor\(/gi, "Math.floor(")
    .replace(/ceil\(/gi, "Math.ceil(")
    .replace(/max\(/gi, "Math.max(")
    .replace(/min\(/gi, "Math.min(")
    .replace(/abs\(/gi, "Math.abs(");

  try {
    if (/^[0-9+\-*/().,\sMathfloorceimaxnbs]+$/.test(expr)) {
      const res = new Function(`return (${expr});`)();
      return typeof res === "number" && Number.isFinite(res) ? res : 0;
    }
  } catch (_) {}

  return 0;
}

/**
 * Normalizes a skill key or name into a clean lowercase alphanumeric string
 * with canonical alias resolution (e.g. empathizing -> empathy).
 * @param {string} str
 * @returns {string}
 */
export function normalizeSkillNameOrKey(str) {
  if (!str) return "";
  let s = String(str).trim().toLowerCase().replace(/[\*\[\]]/g, "");
  if (s === "empathizing") s = "empathy";
  return s.replace(/[^a-z0-9]/g, "");
}

/**
 * Retrieves the total specific ActiveEffect bonus for a skill key,
 * handling camelCase, lowercase, slug, and alias variants.
 * @param {string} skillKey
 * @param {object} aeBonuses
 * @returns {number}
 */
export function getSkillAeBonus(skillKey, aeBonuses) {
  if (!skillKey || !aeBonuses?.skills) return 0;
  if (typeof aeBonuses.skills[skillKey] === "number") return aeBonuses.skills[skillKey];
  const lower = skillKey.toLowerCase();
  if (typeof aeBonuses.skills[lower] === "number") return aeBonuses.skills[lower];
  const clean = normalizeSkillNameOrKey(skillKey);
  if (typeof aeBonuses.skills[clean] === "number") return aeBonuses.skills[clean];
  for (const [k, v] of Object.entries(aeBonuses.skills)) {
    if (normalizeSkillNameOrKey(k) === clean) return Number(v) || 0;
  }
  return 0;
}

/**
 * Computes all active effect modifiers on an Actor deterministically from its
 * active `ActiveEffect` documents so that `prepareDerivedData`, `_prepareContext`,
 * weapon/spell rolls, and damage calculations never clobber or double-count them.
 */
export function getActorActiveEffectBonuses(actor) {
  const bonuses = {
    // Vitality & Fear
    hpMaxDelta: 0,
    hpMaxOverride: null,
    hpShieldBonus: 0,
    bloodiedRatio: null,
    fearThreshold: 0,
    fearThresholdAttr: null,
    // Economy (Global & Filtered APC / SPC)
    apMaxDelta: 0,
    apSpecialDelta: 0,
    spMaxDelta: 0,
    essenceMaxBonus: 0,
    reduceApc: 0,
    reduceWeaponApc: 0,
    reduceWeaponApcByTag: {},
    reduceWeaponApcByName: {},
    minWeaponApc: 1,
    reduceSpellApc: 0,
    reduceSpellApcByTag: {},
    reduceSpellApcBySpell: {},
    reduceSpellApcBySource: {},
    reduceSpc: 0,
    reduceSpcBySource: {},
    reduceSpcByTag: {},
    reduceSpcBySpell: {},
    freeSpells: {},
    // Defenses & Mitigation
    directDefenses: { ar: 0, ref: 0, fort: 0, ant: 0, log: 0, will: 0 },
    directDefenseOverrides: { ar: null, ref: null, fort: null, ant: null, log: null, will: null },
    formulaDefenseBonuses: { ar: 0, ref: 0, fort: 0, ant: 0, log: 0, will: 0 },
    allDefensesDelta: 0,
    physicalDefensesDelta: 0,
    mentalDefensesDelta: 0,
    drDelta: 0,
    dtDelta: 0,
    resistStrings: [],
    vulnerableStrings: [],
    immuneStrings: [],
    affinityStrings: [],
    absorbStrings: [],
    ignoreResistStrings: [],
    secondSkinLight: false,
    secondSkinMedium: false,
    secondSkinHeavy: false,
    secondSkinShields: false,
    kiteHeaterShieldResist: false,
    unarmoredArSub: [],
    refUseLuck: false,
    // Combat, Attacks, Crit, Sneak & Unarmed
    attackWeaponDelta: 0,
    attackSpellDelta: 0,
    attackAllDelta: 0,
    rollsAllDelta: 0,
    weaponAttackBonus: 0,
    weaponAttackSources: [],
    spellAttackBonus: 0,
    allAttackBonus: 0,
    allRollsBonus: 0,
    damageWeaponFlat: 0,
    damageWeaponDice: [],
    damageSpellFlat: 0,
    damageSpellDice: [],
    damageAllFlat: 0,
    damageAllDice: [],
    critBonusDelta: 0,
    critBonus: 0,
    sneakAttackDice: [],
    unarmedDieStep: 0,
    // Attributes, Caps, Mobility, Senses & Skills
    attrCaps: {},
    walkAdd: 0,
    walkMultiply: 1,
    walkOverride: null,
    walkUpgrade: null,
    walkDowngrade: null,
    climbAdd: 0,
    climbUpgrade: null,
    swimAdd: 0,
    swimUpgrade: null,
    flyAdd: 0,
    flyUpgrade: null,
    burrowAdd: 0,
    burrowUpgrade: null,
    ignoreHeavyArmorPenalty: false,
    ignoreTowerShieldSpeedPenalty: false,
    senses: {},
    initiativeBonus: 0,
    skillPointsBonus: 0,
    allSkillsDelta: 0,
    allSkillsBonus: 0,
    skills: {}, // { [skillKey]: number } individual skill bonuses from ActiveEffects
  };

  if (!actor) return bonuses;

  const allMeta = getAllActorEffectsWithMeta(actor);
  const flagPrefix = `flags.${MODULE_ID}.`;

  const addDamageTerm = (rawVal, mode, targetType) => {
    const str = String(rawVal ?? "").trim();
    if (!str) return;
    const num = evaluateEffectFormulaValue(str, actor);
    if (!Number.isNaN(num)) {
      const signed = mode === AE_MODES.ADD ? num : num;
      if (targetType === "weapon") bonuses.damageWeaponFlat += signed;
      else if (targetType === "spell") bonuses.damageSpellFlat += signed;
      else bonuses.damageAllFlat += signed;
    } else {
      if (targetType === "weapon") bonuses.damageWeaponDice.push(str);
      else if (targetType === "spell") bonuses.damageSpellDice.push(str);
      else bonuses.damageAllDice.push(str);
    }
  };

  const resolveEffectSourceName = (meta, effect) => {
    let src = meta.parentItem?.name || meta.sourceLabel;
    if (src === "Character Sheet") src = "";
    if (!src && effect.origin && typeof globalThis.fromUuidSync === "function") {
      try {
        const originDoc = globalThis.fromUuidSync(effect.origin);
        if (originDoc?.name) src = originDoc.name;
        else if (originDoc?.parent?.name) src = originDoc.parent.name;
      } catch (_) {}
    }
    if (!src && effect.name) {
      const effName = String(effect.name || effect.label || "").trim();
      if (effName && !["Effect", "New Effect", "Active Effect", "Weapon Attack Roll Bonus", "Attack Bonus"].includes(effName)) {
        src = effName;
      }
    }
    if (!src) src = effect.name || effect.label || "Attack Bonus";
    src = src.replace(/\s*\((?:Active|Passive|Triggered|Active\s*\/\s*Triggered)\)$/i, "").trim();
    return src || "Attack Bonus";
  };

  for (const meta of allMeta) {
    if (!meta.isEffectivelyActive) continue;
    const effect = meta.effect;
    const effFlags = effect.flags?.[MODULE_ID] || {};
    const isSkillAllocation = Boolean(effFlags.isSkillAllocationEffect);
    const isCanonicalTalent = Boolean(effFlags.isCanonicalTalentEffect || effFlags.canonicalTalentId);
    if (isCanonicalTalent && !isSkillAllocation) {
      let talentAutomationEnabled = false;
      try {
        talentAutomationEnabled = Boolean(globalThis.game?.settings?.get(MODULE_ID, "talentAutomation"));
      } catch (_) {}
      if (!talentAutomationEnabled) continue;
    }
    const changes = Array.isArray(effect.changes) ? effect.changes : [];

    for (const ch of changes) {
      const key = String(ch.key || "").trim();
      const mode = Number(ch.mode ?? AE_MODES.ADD);
      const rawVal = ch.value;
      const numVal = evaluateEffectFormulaValue(rawVal, actor);
      const isFormulaString = typeof rawVal === "string" && /@/.test(rawVal);

      // 1. Vitality & Fear
      if (key === "system.hp.max" || key === `${flagPrefix}bonuses.hpMax` || key === "system.bonuses.hp.max") {
        if (mode === AE_MODES.OVERRIDE) bonuses.hpMaxOverride = numVal;
        else if (mode === AE_MODES.ADD) bonuses.hpMaxDelta += numVal;
        else if (mode === AE_MODES.UPGRADE) bonuses.hpMaxOverride = Math.max(bonuses.hpMaxOverride ?? 0, numVal);
      }
      else if (key === "system.hp.shield" || key === `${flagPrefix}bonuses.hpShield` || key === "system.bonuses.hp.shield") {
        if (mode === AE_MODES.ADD || mode === AE_MODES.UPGRADE || mode === AE_MODES.OVERRIDE) {
          bonuses.hpShieldBonus += Math.max(0, numVal);
        }
      }
      else if (key === `${flagPrefix}bonuses.bloodiedRatio`) {
        if (numVal > 0 && numVal < 1) bonuses.bloodiedRatio = numVal;
      }
      else if (key === `${flagPrefix}bonuses.fearThreshold`) {
        bonuses.fearThreshold += numVal;
      }
      else if (key === `${flagPrefix}bonuses.fearThresholdAttr`) {
        if (rawVal) bonuses.fearThresholdAttr = String(rawVal).trim().toLowerCase();
      }

      // 2. Max AP / Special AP / Max SP / Max Essence
      else if (key === "system.ap.max" || key === `${flagPrefix}bonuses.apMax` || key === "system.bonuses.ap.max") {
        if (mode === AE_MODES.ADD) bonuses.apMaxDelta += numVal;
      }
      else if (key === "system.ap.special") {
        if (mode === AE_MODES.ADD) bonuses.apSpecialDelta += numVal;
      }
      else if (key === "system.sp.max" || key === `${flagPrefix}bonuses.spMax` || key === "system.bonuses.sp.max") {
        if (mode === AE_MODES.ADD) bonuses.spMaxDelta += numVal;
      }
      else if (key === `${flagPrefix}bonuses.essenceMax`) {
        if (mode === AE_MODES.ADD) bonuses.essenceMaxBonus += numVal;
      }

      // 3. Reduce APC & Reduce SPC (Global & Filtered)
      else if (key === `${flagPrefix}bonuses.reduceApc` || key === "system.bonuses.apcReduction" || key === "system.bonuses.reduceApc") {
        bonuses.reduceApc += numVal;
      }
      else if (key === `${flagPrefix}bonuses.reduceWeaponApc`) {
        bonuses.reduceWeaponApc += numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceWeaponApcByTag.`)) {
        const tag = key.slice(`${flagPrefix}bonuses.reduceWeaponApcByTag.`.length);
        if (tag) bonuses.reduceWeaponApcByTag[tag] = (bonuses.reduceWeaponApcByTag[tag] || 0) + numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceWeaponApcByName.`)) {
        const wKey = key.slice(`${flagPrefix}bonuses.reduceWeaponApcByName.`.length);
        if (wKey) bonuses.reduceWeaponApcByName[wKey] = (bonuses.reduceWeaponApcByName[wKey] || 0) + numVal;
      }
      else if (key === `${flagPrefix}bonuses.minWeaponApc`) {
        if (numVal > 1) bonuses.minWeaponApc = Math.max(bonuses.minWeaponApc, numVal);
      }
      else if (key === `${flagPrefix}bonuses.reduceSpellApc`) {
        bonuses.reduceSpellApc += numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceSpellApcByTag.`)) {
        const tag = key.slice(`${flagPrefix}bonuses.reduceSpellApcByTag.`.length);
        if (tag) bonuses.reduceSpellApcByTag[tag] = (bonuses.reduceSpellApcByTag[tag] || 0) + numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceSpellApcBySpell.`)) {
        const spKey = key.slice(`${flagPrefix}bonuses.reduceSpellApcBySpell.`.length);
        if (spKey) bonuses.reduceSpellApcBySpell[spKey] = (bonuses.reduceSpellApcBySpell[spKey] || 0) + numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceSpellApcBySource.`)) {
        const src = key.slice(`${flagPrefix}bonuses.reduceSpellApcBySource.`.length).toLowerCase();
        if (src) bonuses.reduceSpellApcBySource[src] = (bonuses.reduceSpellApcBySource[src] || 0) + numVal;
      }
      else if (key === `${flagPrefix}bonuses.reduceSpc` || key === "system.bonuses.spcReduction" || key === "system.bonuses.reduceSpc") {
        bonuses.reduceSpc += numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceSpcBySource.`)) {
        const src = key.slice(`${flagPrefix}bonuses.reduceSpcBySource.`.length).toLowerCase();
        if (src) bonuses.reduceSpcBySource[src] = (bonuses.reduceSpcBySource[src] || 0) + numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceSpcByTag.`)) {
        const tag = key.slice(`${flagPrefix}bonuses.reduceSpcByTag.`.length);
        if (tag) bonuses.reduceSpcByTag[tag] = (bonuses.reduceSpcByTag[tag] || 0) + numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.reduceSpcBySpell.`)) {
        const spKey = key.slice(`${flagPrefix}bonuses.reduceSpcBySpell.`.length);
        if (spKey) bonuses.reduceSpcBySpell[spKey] = (bonuses.reduceSpcBySpell[spKey] || 0) + numVal;
      }
      else if (key.startsWith(`${flagPrefix}bonuses.freeSpell.`)) {
        const spKey = key.slice(`${flagPrefix}bonuses.freeSpell.`.length);
        if (spKey && Number(rawVal) !== 0) bonuses.freeSpells[spKey] = true;
      }

      // 4. Defenses, DR, DT, Resistances & Second Skin
      else if (key.startsWith("system.defenses.")) {
        const defKey = key.slice("system.defenses.".length).toLowerCase();
        if (defKey in bonuses.directDefenses) {
          if (mode === AE_MODES.OVERRIDE) bonuses.directDefenseOverrides[defKey] = numVal;
          else if (mode === AE_MODES.ADD) bonuses.directDefenses[defKey] += numVal;
        }
      }
      else if (key.startsWith("system.bonuses.")) {
        const subKey = key.slice("system.bonuses.".length).toLowerCase();
        if (subKey in bonuses.formulaDefenseBonuses && isFormulaString && mode === AE_MODES.ADD) {
          bonuses.formulaDefenseBonuses[subKey] += numVal;
        } else if (subKey === "rolls.all" && mode === AE_MODES.ADD) {
          bonuses.rollsAllDelta += numVal;
        }
      }
      else if (key === `${flagPrefix}bonuses.defenses.all`) {
        bonuses.allDefensesDelta += numVal;
      }
      else if (key === `${flagPrefix}bonuses.defenses.physical`) {
        bonuses.physicalDefensesDelta += numVal;
      }
      else if (key === `${flagPrefix}bonuses.defenses.mental`) {
        bonuses.mentalDefensesDelta += numVal;
      }
      else if (key === "system.damage.reduction.value" || key === "system.dr" || key === `${flagPrefix}bonuses.dr`) {
        bonuses.drDelta += numVal;
      }
      else if (key === "system.damage.threshold" || key === "system.dt" || key === `${flagPrefix}bonuses.dt`) {
        bonuses.dtDelta += numVal;
      }
      else if (key === `${flagPrefix}bonuses.resist` || key === "system.damage.resist") {
        if (rawVal && String(rawVal).trim()) bonuses.resistStrings.push(String(rawVal).trim());
      }
      else if (key === `${flagPrefix}bonuses.vulnerable` || key === "system.damage.vulnerable") {
        if (rawVal && String(rawVal).trim()) bonuses.vulnerableStrings.push(String(rawVal).trim());
      }
      else if (key === "system.damage.immune" || key === `${flagPrefix}bonuses.immune`) {
        if (rawVal && String(rawVal).trim()) bonuses.immuneStrings.push(String(rawVal).trim());
      }
      else if (key === "system.damage.affinity" || key === `${flagPrefix}bonuses.affinity`) {
        if (rawVal && String(rawVal).trim()) bonuses.affinityStrings.push(String(rawVal).trim());
      }
      else if (key === `${flagPrefix}bonuses.absorb`) {
        if (rawVal && String(rawVal).trim()) bonuses.absorbStrings.push(String(rawVal).trim());
      }
      else if (key === `${flagPrefix}bonuses.ignoreResist`) {
        if (rawVal && String(rawVal).trim()) bonuses.ignoreResistStrings.push(String(rawVal).trim());
      }
      else if (key === `${flagPrefix}bonuses.secondSkinLight`) {
        if (Number(rawVal) !== 0) bonuses.secondSkinLight = true;
      }
      else if (key === `${flagPrefix}bonuses.secondSkinMedium`) {
        if (Number(rawVal) !== 0) bonuses.secondSkinMedium = true;
      }
      else if (key === `${flagPrefix}bonuses.secondSkinHeavy`) {
        if (Number(rawVal) !== 0) bonuses.secondSkinHeavy = true;
      }
      else if (key === `${flagPrefix}bonuses.secondSkinShields`) {
        if (Number(rawVal) !== 0) bonuses.secondSkinShields = true;
      }
      else if (key === `${flagPrefix}bonuses.kiteHeaterShieldResist`) {
        if (Number(rawVal) !== 0) bonuses.kiteHeaterShieldResist = true;
      }
      else if (key === `${flagPrefix}bonuses.unarmoredArSub`) {
        const subAttr = String(rawVal || "").trim().toLowerCase();
        if (subAttr && !bonuses.unarmoredArSub.includes(subAttr)) bonuses.unarmoredArSub.push(subAttr);
      }
      else if (key === `${flagPrefix}bonuses.refUseLuck`) {
        if (Number(rawVal) !== 0) bonuses.refUseLuck = true;
      }

      // 5. Combat Attacks, Crit, Sneak Attack, Unarmed & Damage
      else if (
        key === `${flagPrefix}bonuses.attack.weapon` ||
        key === "flags.mythcraft.bonuses.attack.weapon" ||
        key === "system.bonuses.attack.weapon" ||
        key === "system.bonuses.weapon.attack" ||
        key === "system.attackBonus" ||
        key === "system.attackModifier" ||
        key === "system.bonuses.attackBonus" ||
        key === "system.bonuses.attack"
      ) {
        bonuses.attackWeaponDelta += numVal;
        if (numVal !== 0) {
          const sourceName = resolveEffectSourceName(meta, effect);
          bonuses.weaponAttackSources.push({
            name: sourceName,
            label: sourceName,
            value: numVal,
          });
        }
      }
      else if (
        key === `${flagPrefix}bonuses.attack.spell` ||
        key === "flags.mythcraft.bonuses.attack.spell" ||
        key === "system.bonuses.attack.spell" ||
        key === "system.bonuses.spell.attack"
      ) {
        bonuses.attackSpellDelta += numVal;
      }
      else if (
        key === `${flagPrefix}bonuses.attack.all` ||
        key === "flags.mythcraft.bonuses.attack.all" ||
        key === "system.bonuses.attack.all" ||
        key === `${flagPrefix}bonuses.attack` ||
        key === "flags.mythcraft.bonuses.attack"
      ) {
        bonuses.attackAllDelta += numVal;
        if (numVal !== 0) {
          const sourceName = resolveEffectSourceName(meta, effect);
          bonuses.weaponAttackSources.push({
            name: sourceName,
            label: sourceName,
            value: numVal,
          });
        }
      }
      else if (
        key === "system.bonuses.rolls.all" ||
        key === `${flagPrefix}bonuses.rolls.all` ||
        key === "flags.mythcraft.bonuses.rolls.all"
      ) {
        bonuses.rollsAllDelta += numVal;
      }
      else if (key === `${flagPrefix}critBonus`) {
        bonuses.critBonusDelta += numVal;
      }
      else if (key === `${flagPrefix}bonuses.damage.weapon`) {
        addDamageTerm(rawVal, mode, "weapon");
      }
      else if (key === `${flagPrefix}bonuses.damage.spell`) {
        addDamageTerm(rawVal, mode, "spell");
      }
      else if (key === `${flagPrefix}bonuses.damage.all`) {
        addDamageTerm(rawVal, mode, "all");
      }
      else if (key === `${flagPrefix}bonuses.sneakAttackDice`) {
        if (rawVal && String(rawVal).trim()) bonuses.sneakAttackDice.push(String(rawVal).trim());
      }
      else if (key === `${flagPrefix}bonuses.unarmedDieStep`) {
        bonuses.unarmedDieStep += numVal;
      }

      // 6. Attributes, Caps, Mobility, Senses & Skills
      else if (key.startsWith(`${flagPrefix}bonuses.attrCap.`)) {
        const attrKey = key.slice(`${flagPrefix}bonuses.attrCap.`.length).toLowerCase();
        if (attrKey) {
          if (mode === AE_MODES.OVERRIDE || mode === AE_MODES.UPGRADE) {
            bonuses.attrCaps[attrKey] = Math.max(bonuses.attrCaps[attrKey] ?? 0, numVal);
          } else {
            bonuses.attrCaps[attrKey] = (bonuses.attrCaps[attrKey] || 0) + numVal;
          }
        }
      }
      else if (key === "system.movement.walk" || key === `${flagPrefix}bonuses.speed`) {
        if (mode === AE_MODES.OVERRIDE) bonuses.walkOverride = numVal;
        else if (mode === AE_MODES.MULTIPLY) bonuses.walkMultiply *= (Number(rawVal) || 1);
        else if (mode === AE_MODES.UPGRADE) bonuses.walkUpgrade = bonuses.walkUpgrade === null ? numVal : Math.max(bonuses.walkUpgrade, numVal);
        else if (mode === AE_MODES.DOWNGRADE) bonuses.walkDowngrade = bonuses.walkDowngrade === null ? numVal : Math.min(bonuses.walkDowngrade, numVal);
        else bonuses.walkAdd += numVal;
      }
      else if (key === "system.movement.climb") {
        if (mode === AE_MODES.UPGRADE || mode === AE_MODES.OVERRIDE) bonuses.climbUpgrade = Math.max(bonuses.climbUpgrade ?? 0, numVal);
        else bonuses.climbAdd += numVal;
      }
      else if (key === "system.movement.swim") {
        if (mode === AE_MODES.UPGRADE || mode === AE_MODES.OVERRIDE) bonuses.swimUpgrade = Math.max(bonuses.swimUpgrade ?? 0, numVal);
        else bonuses.swimAdd += numVal;
      }
      else if (key === "system.movement.fly") {
        if (mode === AE_MODES.UPGRADE || mode === AE_MODES.OVERRIDE) bonuses.flyUpgrade = Math.max(bonuses.flyUpgrade ?? 0, numVal);
        else bonuses.flyAdd += numVal;
      }
      else if (key === "system.movement.burrow") {
        if (mode === AE_MODES.UPGRADE || mode === AE_MODES.OVERRIDE) bonuses.burrowUpgrade = Math.max(bonuses.burrowUpgrade ?? 0, numVal);
        else bonuses.burrowAdd += numVal;
      }
      else if (key === `${flagPrefix}bonuses.ignoreHeavyArmorPenalty`) {
        if (Number(rawVal) !== 0) bonuses.ignoreHeavyArmorPenalty = true;
      }
      else if (key === `${flagPrefix}bonuses.ignoreTowerShieldSpeedPenalty`) {
        if (Number(rawVal) !== 0) bonuses.ignoreTowerShieldSpeedPenalty = true;
      }
      else if (key.startsWith(`${flagPrefix}senses.`)) {
        const senseKey = key.slice(`${flagPrefix}senses.`.length);
        if (senseKey) {
          if (mode === AE_MODES.UPGRADE || mode === AE_MODES.OVERRIDE) {
            bonuses.senses[senseKey] = Math.max(bonuses.senses[senseKey] || 0, numVal);
          } else {
            bonuses.senses[senseKey] = (bonuses.senses[senseKey] || 0) + numVal;
          }
        }
      }
      else if (key === "system.initiative.bonus") {
        bonuses.initiativeBonus += numVal;
      }
      else if (key === `${flagPrefix}bonuses.skillPoints`) {
        bonuses.skillPointsBonus += numVal;
      }
      else if (key === `${flagPrefix}bonuses.skills.all` || key === "system.bonuses.skills.all") {
        bonuses.allSkillsDelta += numVal;
      }
      else if (key.startsWith("system.skills.") || key.startsWith(`${flagPrefix}bonuses.skills.`)) {
        const parts = key.split(".");
        let skKey = "";
        if (key.startsWith("system.skills.")) {
          skKey = parts[2];
        } else {
          skKey = parts[4] || parts[parts.length - 1];
        }
        if (skKey && skKey !== "all" && skKey !== "bonus" && skKey !== "value") {
          const cleanKey = normalizeSkillNameOrKey(skKey);
          const lowerKey = skKey.toLowerCase();
          const targetKeys = new Set([skKey, lowerKey, cleanKey].filter(Boolean));
          for (const tk of targetKeys) {
            bonuses.skills[tk] = (bonuses.skills[tk] || 0) + numVal;
          }
        }
      }
    }
  }

  // Sync property aliases used across sheets and automation engines
  bonuses.weaponAttackBonus = bonuses.attackWeaponDelta;
  bonuses.spellAttackBonus = bonuses.attackSpellDelta;
  bonuses.allAttackBonus = bonuses.attackAllDelta;
  bonuses.allRollsBonus = bonuses.rollsAllDelta;
  bonuses.critBonus = bonuses.critBonusDelta;
  bonuses.allSkillsBonus = bonuses.allSkillsDelta;

  // Group and aggregate weaponAttackSources by source name
  const groupedSources = [];
  const sourceMap = new Map();
  for (const src of bonuses.weaponAttackSources) {
    if (!src || !src.value) continue;
    if (!sourceMap.has(src.name)) {
      const entry = { name: src.name, label: src.label || src.name, value: src.value };
      sourceMap.set(src.name, entry);
      groupedSources.push(entry);
    } else {
      sourceMap.get(src.name).value += src.value;
    }
  }
  bonuses.weaponAttackSources = groupedSources.filter(s => s.value !== 0);

  return bonuses;
}

/**
 * Formats combined bonus damage dice + flat modifier for appending to a damage formula.
 */
export function getCombinedDamageBonusFormula(actor, type = "weapon") {
  const b = getActorActiveEffectBonuses(actor);
  const flat = b.damageAllFlat + (type === "weapon" ? b.damageWeaponFlat : type === "spell" ? b.damageSpellFlat : 0);
  const dice = [...b.damageAllDice, ...(type === "weapon" ? b.damageWeaponDice : type === "spell" ? b.damageSpellDice : [])];

  const parts = [];
  if (dice.length > 0) parts.push(...dice);
  if (flat > 0) parts.push(String(flat));
  else if (flat < 0) parts.push(`- ${Math.abs(flat)}`);

  return {
    flat,
    dice,
    formulaSuffix: parts.length > 0 ? parts.join(" + ").replace(/\+\s*-\s*/g, "- ") : "",
  };
}

/**
 * Computes the total filtered APC reduction and minimum APC floor for a specific Weapon item
 * based on `aeBonuses.reduceWeaponApcByTag`, `aeBonuses.reduceWeaponApcByName`, and `aeBonuses.minWeaponApc`.
 */
export function getWeaponFilteredApcReduction(weapon, aeBonuses) {
  if (!weapon || !aeBonuses) return { reduction: 0, minApc: 1 };
  let reduction = (aeBonuses.reduceApc || 0) + (aeBonuses.reduceWeaponApc || 0);
  const minApc = Math.max(1, Number(aeBonuses.minWeaponApc || 1));

  const nameLower = String(weapon.name || "").toLowerCase();
  const rawTags = weapon.system?.tags ?? weapon.system?.properties ?? "";
  const tagsStr = Array.isArray(rawTags) ? rawTags.join(" ").toLowerCase() : String(rawTags || "").toLowerCase();
  const subtype = String(weapon.system?.subtype || weapon.system?.category || weapon.system?.type || "").toLowerCase();
  const rangeStr = String(weapon.system?.range || "").toLowerCase();
  const combined = `${nameLower} ${tagsStr} ${subtype} ${rangeStr}`;
  const compactName = combined.replace(/[^a-z0-9]/g, "");

  const byTag = aeBonuses.reduceWeaponApcByTag || {};
  if (byTag.twoHanded && (/two[-\s]?hand|2h\b/i.test(combined) || weapon.flags?.[MODULE_ID]?.twoHanded)) {
    reduction += byTag.twoHanded;
  }
  if (byTag.ranged && (/ranged|bow|crossbow|sling|blowgun|arquebus|firearm|\d+\s*ft/i.test(combined) && !/melee\s+only/i.test(combined))) {
    reduction += byTag.ranged;
  }
  if (byTag.thrown && /thrown/i.test(combined)) {
    reduction += byTag.thrown;
  }
  if (byTag.light && /\blight\b/i.test(combined)) {
    reduction += byTag.light;
  }
  if (byTag.unarmed && (/unarmed|fist|brawl|claw|bite|natural|brass\s*knuckle|cestus/i.test(combined))) {
    reduction += byTag.unarmed;
  }
  if (byTag.shield && /shield/i.test(combined)) {
    reduction += byTag.shield;
  }
  if (byTag.dualWield && (/dual|two[-\s]?weapon|off[-\s]?hand/i.test(combined) || weapon.flags?.[MODULE_ID]?.offHand)) {
    reduction += byTag.dualWield;
  }

  const byName = aeBonuses.reduceWeaponApcByName || {};
  for (const [wKey, val] of Object.entries(byName)) {
    if (!val) continue;
    const normKey = String(wKey).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normKey && compactName.includes(normKey)) {
      reduction += val;
    }
  }

  return { reduction, minApc };
}

/**
 * Computes the total filtered APC/SPC reductions and 0-SP overrides for a Spell item or SPELL_LIBRARY entry.
 */
export function getSpellFilteredCostModifiers(spellOrEntry, aeBonuses) {
  if (!spellOrEntry || !aeBonuses) return { apcReduction: 0, spcReduction: 0, isFreeSpell: false };

  let apcReduction = (aeBonuses.reduceApc || 0) + (aeBonuses.reduceSpellApc || 0);
  let spcReduction = aeBonuses.reduceSpc || 0;
  let isFreeSpell = false;

  const rawName = String(spellOrEntry.name || "");
  const spellCamel = rawName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
  const compactSpell = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Check freeSpell overrides
  if (aeBonuses.freeSpells) {
    if (aeBonuses.freeSpells[spellCamel]) isFreeSpell = true;
    else {
      for (const k of Object.keys(aeBonuses.freeSpells)) {
        if (k.toLowerCase() === compactSpell) {
          isFreeSpell = true;
          break;
        }
      }
    }
  }

  // Check spell-specific SPC and APC reductions
  for (const [k, val] of Object.entries(aeBonuses.reduceSpcBySpell || {})) {
    if (val && (k === spellCamel || k.toLowerCase() === compactSpell)) spcReduction += val;
  }
  for (const [k, val] of Object.entries(aeBonuses.reduceSpellApcBySpell || {})) {
    if (val && (k === spellCamel || k.toLowerCase() === compactSpell)) apcReduction += val;
  }

  // Check magic source (arcane, divine, occult, primal, psionic)
  const rawSource = String(
    spellOrEntry.source ||
    spellOrEntry.system?.source ||
    spellOrEntry.system?.school ||
    ""
  ).toLowerCase();
  for (const [src, val] of Object.entries(aeBonuses.reduceSpcBySource || {})) {
    if (val && rawSource.includes(src.toLowerCase())) spcReduction += val;
  }
  for (const [src, val] of Object.entries(aeBonuses.reduceSpellApcBySource || {})) {
    if (val && rawSource.includes(src.toLowerCase())) apcReduction += val;
  }

  // Check tags / function / category (enchanting, warding, evoking, ritual, invocation, chant, prayer, etc.)
  const rawTags = spellOrEntry.tags || spellOrEntry.system?.tags || "";
  const tagsCombined = `${Array.isArray(rawTags) ? rawTags.join(" ") : String(rawTags)} ${spellOrEntry.func || ""} ${spellOrEntry.category || ""} ${spellOrEntry.subCategory || ""}`.toLowerCase();
  for (const [tag, val] of Object.entries(aeBonuses.reduceSpcByTag || {})) {
    if (val && tagsCombined.includes(tag.toLowerCase())) spcReduction += val;
  }
  for (const [tag, val] of Object.entries(aeBonuses.reduceSpellApcByTag || {})) {
    if (val && tagsCombined.includes(tag.toLowerCase())) apcReduction += val;
  }

  return { apcReduction, spcReduction, isFreeSpell };
}

/**
 * Synchronizes canonical ActiveEffect documents onto all Talent items owned by an Actor
 * using `TALENT_LIBRARY` (`getTalentActiveEffectsData`).
 * Preserves any custom user-created ActiveEffects while adding missing canonical effects.
 *
 * @param {Actor} actor
 * @param {object} [options]
 * @param {boolean} [options.notify=false]
 * @param {boolean} [options.overwriteCanonical=false]
 * @param {boolean} [options.force=false]
 * @returns {Promise<{ syncedTalents: number, effectsCreated: number }>}
 */
export async function syncActorTalentActiveEffects(actor, { notify = false, overwriteCanonical = false, force = false } = {}) {
  const summary = { syncedTalents: 0, effectsCreated: 0 };
  if (!actor || !actor.items) return summary;

  let talentAutomationEnabled = false;
  try {
    talentAutomationEnabled = Boolean(game.settings?.get(MODULE_ID, "talentAutomation"));
  } catch (_) {
    talentAutomationEnabled = false;
  }

  if (!force && !talentAutomationEnabled) {
    // When talent automation is disabled, purge any lingering canonical talent ActiveEffects
    // from this actor's items so sheets do not have unwanted automated effects.
    let purgedCount = 0;
    for (const item of actor.items) {
      if (item.type !== "talent" && item.type !== "feature") continue;
      const canonicalEffectIds = [];
      for (const eff of (item.effects || [])) {
        const f = eff.flags?.[MODULE_ID] || {};
        if (f.isCanonicalTalentEffect || f.canonicalTalentId) {
          canonicalEffectIds.push(eff.id);
        }
      }
      if (canonicalEffectIds.length > 0) {
        try {
          await item.deleteEmbeddedDocuments("ActiveEffect", canonicalEffectIds);
          purgedCount += canonicalEffectIds.length;
        } catch (e) {
          console.warn(`${MODULE_ID} | Failed to purge canonical effect from ${item.name}:`, e);
        }
      }
    }
    if (purgedCount > 0) {
      console.log(`${MODULE_ID} | Purged ${purgedCount} canonical talent ActiveEffect(s) from ${actor.name} because talent automation is disabled.`);
    }
    if (notify && globalThis.ui?.notifications) {
      globalThis.ui.notifications.warn(
        "Talent Active Effect automation is currently disabled. You can enable it in Module Settings or the What's New dialog."
      );
    }
    return summary;
  }

  for (const item of actor.items) {
    if (item.type !== "talent" && item.type !== "feature") continue;
    const entry = getTalentLibraryEntry(item);
    if (!entry) continue;

    // Stamp canonical metadata flags if missing
    const curFlags = item.flags?.[MODULE_ID] || {};
    if (curFlags.canonicalId !== entry.id) {
      try {
        await item.update({
          [`flags.${MODULE_ID}.canonicalId`]: entry.id,
          [`flags.${MODULE_ID}.canonicalCategory`]: entry.category,
          [`flags.${MODULE_ID}.canonicalClass`]: entry.class,
          [`flags.${MODULE_ID}.canonicalStack`]: entry.stack,
        });
      } catch (_) {}
    }

    if (!entry.automatable || !Array.isArray(entry.activeEffects) || entry.activeEffects.length === 0) {
      continue;
    }

    const existingEffects = Array.from(item.effects || []);
    const existingCanonical = existingEffects.filter(
      e => e.flags?.[MODULE_ID]?.isCanonicalTalentEffect || e.flags?.[MODULE_ID]?.canonicalTalentId === entry.id
    );

    if (existingCanonical.length > 0 && !overwriteCanonical) {
      continue;
    }

    if (existingCanonical.length > 0 && overwriteCanonical) {
      try {
        await item.deleteEmbeddedDocuments("ActiveEffect", existingCanonical.map(e => e.id));
      } catch (_) {}
    }

    const aeDataList = getTalentActiveEffectsData(item, actor);
    if (aeDataList.length > 0) {
      try {
        await item.createEmbeddedDocuments("ActiveEffect", aeDataList);
        summary.syncedTalents += 1;
        summary.effectsCreated += aeDataList.length;
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to attach canonical ActiveEffects to talent "${item.name}":`, err);
      }
    }
  }

  if (notify && globalThis.ui?.notifications) {
    if (summary.effectsCreated > 0) {
      globalThis.ui.notifications.info(
        `Synced ${summary.effectsCreated} canonical Active Effect(s) across ${summary.syncedTalents} Talent(s) on ${actor.name}.`
      );
    } else {
      globalThis.ui.notifications.info(`All Talents on ${actor.name} are already up to date with canonical Active Effects.`);
    }
  }

  return summary;
}

/**
 * Synchronizes item-transferred ActiveEffects that have an `itemRequirement` / `activationRequirement`
 * ("equipped" or "attuned") whenever an item is updated on an Actor, automatically attaches
 * canonical ActiveEffects when Talent items are added to an Actor, and handles
 * instant Shield/Temp HP grants when an effect targeting `system.hp.shield` is enabled.
 */
export function initActiveEffectEngine() {
  // 0. Automatically embed canonical ActiveEffects when a Talent item is created on an Actor
  Hooks.on("preCreateItem", (item, data, options, userId) => {
    try {
      if (globalThis.game?.user?.id && userId && globalThis.game.user.id !== userId) return;
      const actor = item.parent;
      if (!actor || actor.documentName !== "Actor") return;
      if (item.type !== "talent" && item.type !== "feature") return;

      const entry = getTalentLibraryEntry(item);
      if (!entry) return;

      const flagUpdates = {
        [`flags.${MODULE_ID}.canonicalId`]: entry.id,
        [`flags.${MODULE_ID}.canonicalCategory`]: entry.category,
        [`flags.${MODULE_ID}.canonicalClass`]: entry.class,
        [`flags.${MODULE_ID}.canonicalStack`]: entry.stack,
      };

      const existingEffects = Array.isArray(data?.effects) ? data.effects : Array.from(item.effects || []);
      const hasCanonical = existingEffects.some(
        e => e?.flags?.[MODULE_ID]?.isCanonicalTalentEffect || e?.flags?.[MODULE_ID]?.canonicalTalentId === entry.id
      );

      // Only attach canonical ActiveEffects if talentAutomation is enabled in settings
      const talentAutomationEnabled = Boolean(globalThis.game?.settings?.get(MODULE_ID, "talentAutomation"));

      if (talentAutomationEnabled && !hasCanonical && entry.automatable && Array.isArray(entry.activeEffects) && entry.activeEffects.length > 0) {
        const aeDataList = getTalentActiveEffectsData(item, actor);
        if (aeDataList.length > 0) {
          flagUpdates.effects = [...existingEffects.map(e => (typeof e.toObject === "function" ? e.toObject() : e)), ...aeDataList];
        }
      }

      item.updateSource(flagUpdates);
    } catch (err) {
      console.warn(`${MODULE_ID} | preCreateItem talent effect attachment warning:`, err);
    }
  });

  // Safety-net on createItem in case preCreateItem effects were stripped by system creation logic
  Hooks.on("createItem", async (item, options, userId) => {
    try {
      if (globalThis.game?.user?.id !== userId) return;
      const actor = item.parent;
      if (!actor || actor.documentName !== "Actor") return;
      if (item.type !== "talent" && item.type !== "feature") return;

      // Only attach canonical ActiveEffects if talentAutomation is enabled in settings
      const talentAutomationEnabled = Boolean(globalThis.game?.settings?.get(MODULE_ID, "talentAutomation"));
      if (!talentAutomationEnabled) return;

      const entry = getTalentLibraryEntry(item);
      if (!entry || !entry.automatable || !Array.isArray(entry.activeEffects) || entry.activeEffects.length === 0) return;

      const existingEffects = Array.from(item.effects || []);
      if (existingEffects.length > 0) return;

      const aeDataList = getTalentActiveEffectsData(item, actor);
      if (aeDataList.length > 0) {
        await item.createEmbeddedDocuments("ActiveEffect", aeDataList);
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | createItem talent effect attachment warning:`, err);
    }
  });

  // 1. When an ActiveEffect is created or enabled on an Actor, if it grants Temp HP (Shield),
  //    ensure `system.hp.shield` on the Actor is updated so `damage-automation` can deduct from it.
  Hooks.on("createActiveEffect", async (effect, options, userId) => {
    if (globalThis.game?.user?.id !== userId) return;
    if (effect.disabled) return;
    const actor = effect.parent?.documentName === "Actor" ? effect.parent : effect.parent?.parent;
    if (!actor || actor.documentName !== "Actor") return;

    await syncShieldGrantFromEffect(actor, effect, true);
  });

  Hooks.on("updateActiveEffect", async (effect, changes, options, userId) => {
    if (globalThis.game?.user?.id !== userId) return;
    if (changes.disabled === undefined) return;
    const actor = effect.parent?.documentName === "Actor" ? effect.parent : effect.parent?.parent;
    if (!actor || actor.documentName !== "Actor") return;

    await syncShieldGrantFromEffect(actor, effect, !changes.disabled);
  });

  // 2. When an Item's equipped/donned/worn/attuned state changes, automatically sync
  //    the `disabled` state of any ActiveEffects on that item that use `itemRequirement` / `activationRequirement`.
  Hooks.on("updateItem", async (item, changes, options, userId) => {
    if (globalThis.game?.user?.id !== userId) return;
    if (!item.effects || item.effects.size === 0) return;

    const updates = [];
    for (const eff of item.effects) {
      const req = eff.flags?.[MODULE_ID]?.itemRequirement || eff.flags?.[MODULE_ID]?.activationRequirement;
      if (!req || req === "always" || req === "conditional") continue;
      const shouldBeActive = isItemEffectRequirementMet(item, eff);
      if (eff.disabled === shouldBeActive) {
        updates.push({ _id: eff.id, disabled: !shouldBeActive });
      }
    }
    if (updates.length > 0) {
      try {
        await item.updateEmbeddedDocuments("ActiveEffect", updates);
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to sync item effect activation requirements:`, err);
      }
    }
  });
}

async function syncShieldGrantFromEffect(actor, effect, isEnabling) {
  try {
    const changes = Array.isArray(effect.changes) ? effect.changes : [];
    let shieldGrant = 0;
    for (const ch of changes) {
      if (ch.key === "system.hp.shield" || ch.key === `flags.${MODULE_ID}.bonuses.hpShield` || ch.key === "system.bonuses.hp.shield") {
        shieldGrant += Math.max(0, evaluateEffectFormulaValue(ch.value, actor));
      }
    }
    if (shieldGrant <= 0) return;

    const currentSourceShield = Number(actor._source?.system?.hp?.shield ?? actor.system?._source?.hp?.shield ?? 0);
    if (isEnabling) {
      const newShield = Math.max(currentSourceShield, shieldGrant);
      if (newShield !== currentSourceShield) {
        await actor.update({ "system.hp.shield": newShield });
      }
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Failed to sync Shield/Temp HP from effect:`, err);
  }
}

