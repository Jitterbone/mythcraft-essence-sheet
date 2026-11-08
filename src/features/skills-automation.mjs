/**
 * mythcraft-essence-sheet | src/features/skills-automation.mjs
 *
 * Automates skill calculation lifecycle in MythCraft to ensure ActiveEffect bonuses
 * (both specific skill grants, allocated skill points, and global skill bonuses)
 * are properly incorporated into actor derived data, sheet presentation, and roll formulas
 * without being overwritten by the core prepareDerivedData loop.
 */

import { getActorActiveEffectBonuses, getSkillAeBonus, normalizeSkillNameOrKey } from "./active-effect-engine.mjs";

const MODULE_ID = "mythcraft-essence-sheet";

/**
 * Patches core MythCraft Actor DataModels (character & npc) to seamlessly apply
 * ActiveEffect skill bonuses onto system.skills[key].bonus during prepareDerivedData.
 */
export function patchSystemSkillsCalculation() {
  const models = [
    CONFIG.Actor?.dataModels?.character,
    CONFIG.Actor?.dataModels?.npc,
  ].filter(Boolean);

  for (const model of models) {
    if (!model || model._essenceSkillsPatched) continue;

    const originalPrepareDerivedData = model.prototype.prepareDerivedData;
    model.prototype.prepareDerivedData = function () {
      originalPrepareDerivedData.call(this);

      if (!this.skills || !this.parent) return;

      const aeBonuses = getActorActiveEffectBonuses(this.parent);
      if (!aeBonuses) return;

      const allSkillsBonus = Number(aeBonuses.allSkillsBonus || 0);
      const skillConfig = globalThis.mythcraft?.CONFIG?.skills?.list || {};

      // 1. Apply bonuses to all existing skills in this.skills
      for (const [sKey, sData] of Object.entries(this.skills)) {
        if (!sData || typeof sData !== "object") continue;
        const specific = getSkillAeBonus(sKey, aeBonuses);
        const totalAe = allSkillsBonus + specific;
        if (totalAe !== 0) {
          sData.bonus = (Number(sData.bonus) || 0) + totalAe;
        }
      }

      // 2. If an ActiveEffect grants bonus to an un-invested skill not yet initialized in this.skills,
      // initialize it so @skills.<key>.bonus works cleanly in formulas and rolls
      for (const [cfgKey, cfg] of Object.entries(skillConfig)) {
        const specific = getSkillAeBonus(cfgKey, aeBonuses);
        const totalAe = allSkillsBonus + specific;
        if (totalAe !== 0) {
          const existing = this.skills[cfgKey] 
            || this.skills[cfgKey.toLowerCase()]
            || Object.entries(this.skills).find(([k]) => normalizeSkillNameOrKey(k) === normalizeSkillNameOrKey(cfgKey))?.[1];

          if (!existing) {
            const attr = cfg.attribute || "str";
            const attrMod = Number(this.attributes?.[attr]?.mod ?? this.attributes?.[attr] ?? 0);
            this.skills[cfgKey] = {
              value: 0,
              bonus: attrMod + totalAe,
            };
          }
        }
      }
    };

    model._essenceSkillsPatched = true;
  }
}
