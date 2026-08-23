/**
 * mythcraft-essence-sheet | src/features/hp-automation.mjs
 *
 * Endurance Threshold calculations and HP progression formulas for MythCraft.
 *
 * Rules:
 * Total HP = 10 + (Level * HP_Die) + Level (when rolling)
 * Total HP = 10 + (Level * Set_HP) + Level (when taking flat average)
 */

export const ENDURANCE_THRESHOLDS = [
  {
    threshold: 1,
    label: "Threshold 1",
    rangeLabel: "-3",
    minEnd: -Infinity,
    maxEnd: -3,
    setHp: 0,
    die: null,
    dieFormula: "0",
    dieLabel: "-",
  },
  {
    threshold: 2,
    label: "Threshold 2",
    rangeLabel: "-2 to -1",
    minEnd: -2,
    maxEnd: -1,
    setHp: 1,
    die: "d2",
    dieFormula: "1d2",
    dieLabel: "1d2",
  },
  {
    threshold: 3,
    label: "Threshold 3",
    rangeLabel: "0 to 2",
    minEnd: 0,
    maxEnd: 2,
    setHp: 2,
    die: "d4",
    dieFormula: "1d4",
    dieLabel: "1d4",
  },
  {
    threshold: 4,
    label: "Threshold 4",
    rangeLabel: "3 to 5",
    minEnd: 3,
    maxEnd: 5,
    setHp: 3,
    die: "d6",
    dieFormula: "1d6",
    dieLabel: "1d6",
  },
  {
    threshold: 5,
    label: "Threshold 5",
    rangeLabel: "6 to 8",
    minEnd: 6,
    maxEnd: 8,
    setHp: 4,
    die: "d8",
    dieFormula: "1d8",
    dieLabel: "1d8",
  },
  {
    threshold: 6,
    label: "Threshold 6",
    rangeLabel: "9 to 11",
    minEnd: 9,
    maxEnd: 11,
    setHp: 5,
    die: "d10",
    dieFormula: "1d10",
    dieLabel: "1d10",
  },
  {
    threshold: 7,
    label: "Threshold 7",
    rangeLabel: "12",
    minEnd: 12,
    maxEnd: Infinity,
    setHp: 6,
    die: "d12",
    dieFormula: "1d12",
    dieLabel: "1d12",
  },
];

/**
 * Returns the Endurance Threshold configuration object for a given END stat.
 * @param {number} endValue - Endurance attribute score
 * @returns {object} Threshold object
 */
export function getEnduranceThreshold(endValue) {
  const end = Number(endValue) || 0;
  for (const th of ENDURANCE_THRESHOLDS) {
    if (end >= th.minEnd && end <= th.maxEnd) {
      return { ...th, currentEnd: end };
    }
  }
  return { ...ENDURANCE_THRESHOLDS[2], currentEnd: end }; // Default to Threshold 3 (0–2)
}

/**
 * Calculates full static Set HP total for a given level and Endurance score.
 * Formula: 10 + Level + (Level * Set_HP)
 * (Level 0 = 0 HP)
 * @param {number} level
 * @param {number} endValue
 * @returns {number}
 */
export function calculateSetHpTotal(level, endValue) {
  const lvl = Math.max(0, Number(level) || 0);
  if (lvl === 0) return 0;
  const th = getEnduranceThreshold(endValue);
  return 10 + lvl + (lvl * th.setHp);
}

/**
 * Calculates the incremental HP gain when gaining N levels with Set HP.
 * Formula per level: 1 + Set_HP
 * (If leveling from 0 -> L: 10 + L + (L * Set_HP))
 * @param {number} startLevel
 * @param {number} targetLevel
 * @param {number} endValue
 * @returns {number}
 */
export function calculateLevelUpSetHpGain(startLevel, targetLevel, endValue) {
  const start = Math.max(0, Number(startLevel) || 0);
  const target = Math.max(0, Number(targetLevel) || 0);
  if (target <= start) return 0;
  if (start === 0) {
    return calculateSetHpTotal(target, endValue);
  }
  const th = getEnduranceThreshold(endValue);
  const levelsGained = target - start;
  return levelsGained * (1 + th.setHp);
}

/**
 * Patches the core MythCraft character data model prepareDerivedData
 * to accurately respect user rolled/set HP instead of multiplying max die size.
 */
export function patchSystemHpCalculation() {
  const charModel = CONFIG.Actor?.dataModels?.character;
  if (!charModel || charModel._essenceHpPatched) return;

  const originalPrepareDerivedData = charModel.prototype.prepareDerivedData;
  charModel.prototype.prepareDerivedData = function() {
    originalPrepareDerivedData.call(this);

    // If character is level 0, default max HP to 0
    if (this.level === 0) {
      this.hp.max = 0;
      this.hp.bloodied = 0;
      return;
    }

    // Check if custom / rolled / calculated / manual Max HP is stored in flags or in source data
    const flagMaxHp = this.parent?.flags?.["mythcraft-essence-sheet"]?.maxHp;
    const sourceMaxHp = this._source?.hp?.max;

    if (flagMaxHp !== undefined && flagMaxHp !== null) {
      this.hp.max = Math.max(0, Number(flagMaxHp));
    } else if (sourceMaxHp !== undefined && sourceMaxHp !== null) {
      this.hp.max = Math.max(0, Number(sourceMaxHp));
    }
    this.hp.bloodied = Math.floor(this.hp.max / 2);
  };

  charModel._essenceHpPatched = true;
}

