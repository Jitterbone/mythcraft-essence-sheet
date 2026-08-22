/**
 * mythcraft-essence-sheet | src/data/defense-config.mjs
 *
 * Configuration and lookup utilities for MythCraft Defense Targets:
 * - Armor Rating (AR) — Blue Shield
 * - Reflexes (REF) — Green Running Man
 * - Fortitude (FORT) — Orange Vigor / Dumbbell
 * - Anticipation (ANT) — Purple Eye (Corrects system label from Antithesis to Anticipation)
 * - Logic (LOG) — Cyan Brain
 * - Willpower (WILL) — Gold Fire / Spark
 */

export const DEFENSE_TARGET_CONFIG = {
  ar: {
    key: "ar",
    abbr: "AR",
    label: "Armor Rating",
    icon: "fas fa-shield-halved",
    color: "#38bdf8",
    bg: "rgba(2, 132, 199, 0.22)",
    border: "rgba(56, 189, 248, 0.45)",
  },
  ref: {
    key: "ref",
    abbr: "REF",
    label: "Reflexes",
    icon: "fas fa-person-running",
    color: "#4ade80",
    bg: "rgba(34, 197, 94, 0.22)",
    border: "rgba(74, 222, 128, 0.45)",
  },
  fort: {
    key: "fort",
    abbr: "FORT",
    label: "Fortitude",
    icon: "fas fa-dumbbell",
    color: "#fb923c",
    bg: "rgba(249, 115, 22, 0.22)",
    border: "rgba(251, 146, 60, 0.45)",
  },
  ant: {
    key: "ant",
    abbr: "ANT",
    label: "Anticipation",
    icon: "fas fa-eye",
    color: "#c084fc",
    bg: "rgba(168, 85, 247, 0.22)",
    border: "rgba(192, 132, 252, 0.45)",
  },
  log: {
    key: "log",
    abbr: "LOG",
    label: "Logic",
    icon: "fas fa-brain",
    color: "#22d3ee",
    bg: "rgba(6, 182, 212, 0.22)",
    border: "rgba(34, 211, 238, 0.45)",
  },
  will: {
    key: "will",
    abbr: "WILL",
    label: "Willpower",
    icon: "fas fa-fire",
    color: "#facc15",
    bg: "rgba(234, 179, 8, 0.22)",
    border: "rgba(250, 204, 21, 0.45)",
  },
};

/**
 * Normalizes any raw defense string into a structured Defense Target configuration object.
 * Correctly classifies 'ant', 'antithesis', and 'anticipation' as Anticipation.
 *
 * @param {string} rawDefense - The raw defense string from item/roll data.
 * @returns {object} The matched defense target configuration object.
 */
export function getDefenseTargetConfig(rawDefense) {
  if (!rawDefense) return DEFENSE_TARGET_CONFIG.ar;
  const clean = String(rawDefense).trim().toLowerCase();
  
  if (clean.includes("ref")) return DEFENSE_TARGET_CONFIG.ref;
  if (clean.includes("fort")) return DEFENSE_TARGET_CONFIG.fort;
  // Classify ANT, Antithesis, and Anticipation as Anticipation
  if (clean.includes("ant") || clean.includes("anti")) return DEFENSE_TARGET_CONFIG.ant;
  if (clean.includes("log")) return DEFENSE_TARGET_CONFIG.log;
  if (clean.includes("will")) return DEFENSE_TARGET_CONFIG.will;
  
  return DEFENSE_TARGET_CONFIG.ar;
}

/**
 * Generates an HTML string for the VS Defense Target badge in chat cards.
 *
 * @param {string|object} defense - The raw defense key/string or a config object.
 * @returns {string} The formatted HTML badge markup.
 */
export function renderDefenseTargetBadgeHTML(defense) {
  const config = typeof defense === "object" && defense?.abbr ? defense : getDefenseTargetConfig(defense);
  return `
    <span class="chat-defense-target-badge" 
          style="--def-color: ${config.color}; --def-bg: ${config.bg}; --def-border: ${config.border};"
          title="Target Defense: ${config.label} (${config.abbr})"
          data-tooltip="Target Defense: <strong>${config.label} (${config.abbr})</strong>">
      <span class="vs-prefix">vs</span>
      <i class="${config.icon} def-icon"></i>
      <span class="def-abbr">${config.abbr}</span>
    </span>
  `;
}
