/**
 * mythcraft-essence-sheet | src/features/equipment-automation.mjs
 *
 * Comprehensive Equipment & Armor Automation Engine for MythCraft.
 * Handles:
 * • Weapon Damage Attribute Modifier auto-calculation (only on items with assigned attributes)
 * • Don / Doff Armor status management
 * • Armor Rating (AR) and Defense Modifiers (REF, FORT, ANT, LOG, WILL)
 * • Resistance Specialization parsing, stacking, and locking
 * • Strength Minimum enforcement (Speed 0 + Dazed condition)
 * • Dexterity Maximum clamp on Reflexes (REF)
 * • Armor Speed Penalty calculations
 */

import { getSetting } from "../settings.mjs";

/**
 * Parse a resistance string into structured objects
 * Handles formats like: "Sharp 2", "Necrotic 3, Corrosive 3, Toxic 3", "Sharp, Fire 2"
 * @param {string} resistString
 * @returns {Array<{ type: string, label: string, value: number }>}
 */
export function parseResistanceString(resistString) {
  if (!resistString || typeof resistString !== "string") return [];
  const list = [];
  const parts = resistString.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^([a-zA-Z\s]+?)(?:[:\s\+\-]+(\d+))?$/);
    if (match) {
      const rawType = match[1].trim();
      const lower = rawType.toLowerCase();
      const val = match[2] !== undefined ? parseInt(match[2], 10) : 1;
      const label = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      list.push({
        type: lower,
        label,
        value: val,
      });
    }
  }
  return list;
}

/**
 * Format a list of resistance objects back into a comma-separated string
 * @param {Array<{ type: string, label?: string, value: number }>} list
 * @returns {string}
 */
export function formatResistanceString(list) {
  if (!Array.isArray(list) || !list.length) return "";
  return list
    .map(item => {
      const label = item.label || (item.type.charAt(0).toUpperCase() + item.type.slice(1));
      return item.value > 1 ? `${label} ${item.value}` : label;
    })
    .join(", ");
}

/**
 * Get the currently donned (equipped) armor for an actor
 * @param {Actor} actor
 * @returns {Item|null}
 */
export function getDonnedArmor(actor) {
  if (!actor) return null;
  const armors = actor.itemTypes?.armor || (actor.items ? actor.items.filter(i => i.type === "armor") : []);
  return armors.find(item => {
    return item.system?.equipped === true || item.flags?.["mythcraft-essence-sheet"]?.isDonned === true;
  }) || null;
}

/**
 * Calculate effective resistances for an actor by combining base resistances with donned armor resistance specializations
 * Stacks matching resistance types (e.g. Sharp 1 + Sharp 2 = Sharp 3)
 * @param {Actor} actor
 * @returns {{ list: Array<object>, combinedString: string, map: Record<string, number>, armorResists: Array<object>, baseResists: Array<object> }}
 */
export function calculateEffectiveResistances(actor) {
  const baseResistStr = actor?.system?.damage?.resist || "";
  const baseResists = parseResistanceString(baseResistStr);
  const armorResists = [];

  const armorResistAuto = getSetting("armorResistanceAutomation", true);
  if (armorResistAuto) {
    const donnedArmor = getDonnedArmor(actor);
    if (donnedArmor?.system?.resist) {
      const parsedArmor = parseResistanceString(donnedArmor.system.resist);
      for (const r of parsedArmor) {
        armorResists.push({
          ...r,
          sourceName: donnedArmor.name,
          sourceId: donnedArmor.id,
        });
      }
    }
  }

  // Combine and stack resistances
  const resistMap = {};
  const labelMap = {};

  for (const r of baseResists) {
    resistMap[r.type] = (resistMap[r.type] || 0) + r.value;
    labelMap[r.type] = r.label;
  }

  for (const r of armorResists) {
    resistMap[r.type] = (resistMap[r.type] || 0) + r.value;
    labelMap[r.type] = r.label;
  }

  const list = Object.entries(resistMap).map(([type, value]) => ({
    type,
    label: labelMap[type] || (type.charAt(0).toUpperCase() + type.slice(1)),
    value,
    hasArmorBonus: armorResists.some(a => a.type === type),
    armorValue: armorResists.filter(a => a.type === type).reduce((sum, a) => sum + a.value, 0),
    baseValue: baseResists.filter(b => b.type === type).reduce((sum, b) => sum + b.value, 0),
  }));

  return {
    list,
    combinedString: formatResistanceString(list),
    map: resistMap,
    armorResists,
    baseResists,
  };
}

/**
 * Calculate effective weapon damage data including attribute modifier and affinity bonus
 * STRICT: If the item has no attribute assigned or is not a weapon with an attack roll, it gets NO bonus!
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {{ baseFormula: string, effectiveFormula: string, attrKey: string, attrMod: number, affinityBonus: number, totalMod: number }}
 */
export function getWeaponDamageData(actor, weapon) {
  const baseFormula = weapon?.system?.damage?.formula || weapon?.system?.damageFormula || "1d4";

  // Check if weapon has an attribute explicitly assigned
  let rawAttr = (weapon?.system?.attr || "").toLowerCase().trim();
  if (rawAttr.startsWith("my")) rawAttr = rawAttr.replace(/^mythcraft\.attributes\./i, "");
  
  const validAttrs = new Set(["str", "dex", "end", "awr", "int", "cha", "luck", "cor"]);
  const hasValidAttr = validAttrs.has(rawAttr);

  const autoAttrMod = getSetting("weaponDamageAttrModifier", true);
  let attrMod = 0;
  if (autoAttrMod && weapon?.type === "weapon" && hasValidAttr) {
    const actorAttrs = actor?.system?.attributes || {};
    attrMod = Number(actorAttrs[rawAttr] ?? 0);
  }

  // Affinity bonus (+3) is ONLY applied if the weapon/spell explicitly has Affinity enabled on it
  const hasItemAffinity = weapon?.system?.hasAffinity === true || 
                          weapon?.flags?.["mythcraft-essence-sheet"]?.hasAffinity === true ||
                          weapon?.system?.affinity === true;
  const affinityBonus = hasItemAffinity ? 3 : 0;

  const totalMod = attrMod + affinityBonus;

  let effectiveFormula = baseFormula;
  if (totalMod > 0) {
    effectiveFormula = `${baseFormula} + ${totalMod}`;
  } else if (totalMod < 0) {
    effectiveFormula = `${baseFormula} - ${Math.abs(totalMod)}`;
  }

  return {
    baseFormula,
    effectiveFormula,
    attrKey: hasValidAttr ? rawAttr : "",
    attrMod,
    affinityBonus,
    totalMod,
  };
}

/**
 * Applies all effective armor, defenses, speed, and restrictions directly to an actor's derived system data
 * @param {Actor} actor
 */
export function applyEffectiveArmorAndDefenses(actor) {
  if (!actor || !actor.system) return;

  const donnedArmor = getDonnedArmor(actor);
  const armorAuto = getSetting("armorAutomation", true);

  if (armorAuto) {
    if (!actor.system.defenses) actor.system.defenses = {};

    const baseDex = Number(actor.system.attributes?.dex ?? 0);
    const baseEnd = Number(actor.system.attributes?.end ?? 0);
    const baseAwr = Number(actor.system.attributes?.awr ?? 0);
    const baseInt = Number(actor.system.attributes?.int ?? 0);
    const baseCha = Number(actor.system.attributes?.cha ?? 0);

    const bonusAr = Number(actor.system.bonuses?.ar) || 0;
    const bonusRef = Number(actor.system.bonuses?.ref) || 0;
    const bonusFort = Number(actor.system.bonuses?.fort) || 0;
    const bonusAnt = Number(actor.system.bonuses?.ant) || 0;
    const bonusLog = Number(actor.system.bonuses?.log) || 0;
    const bonusWill = Number(actor.system.bonuses?.will) || 0;

    if (donnedArmor) {
      const armorSys = donnedArmor.system || {};

      // 1. Armor Rating (AR)
      const armorAR = Number.isNumeric(armorSys.ar) ? Number(armorSys.ar) : 10;
      actor.system.defenses.ar = armorAR + bonusAr;

      // 2. DEX Maximum Clamp on REF
      const dexMaxAuto = getSetting("armorDexMaxAutomation", true);
      const dexMax = Number(armorSys.dexMax);
      let effectiveDex = baseDex;
      if (dexMaxAuto && Number.isNumeric(dexMax) && effectiveDex > dexMax) {
        effectiveDex = dexMax;
      }

      // 3. Defense Modifiers (REF, FORT, ANT, LOG, WILL)
      const armorDefs = armorSys.defenses || {};
      const refMod = Number(armorDefs.ref) || 0;
      const fortMod = Number(armorDefs.fort) || 0;
      const antMod = Number(armorDefs.ant) || 0;
      const logMod = Number(armorDefs.log) || 0;
      const willMod = Number(armorDefs.will) || 0;

      actor.system.defenses.ref = 10 + effectiveDex + bonusRef + refMod;
      actor.system.defenses.fort = 10 + baseEnd + bonusFort + fortMod;
      actor.system.defenses.ant = 10 + baseAwr + bonusAnt + antMod;
      actor.system.defenses.log = 10 + baseInt + bonusLog + logMod;
      actor.system.defenses.will = 10 + baseCha + bonusWill + willMod;
    } else {
      // Unarmored: Recalculate baseline 10 + attributes + bonuses
      actor.system.defenses.ar = 10 + bonusAr;
      actor.system.defenses.ref = 10 + baseDex + bonusRef;
      actor.system.defenses.fort = 10 + baseEnd + bonusFort;
      actor.system.defenses.ant = 10 + baseAwr + bonusAnt;
      actor.system.defenses.log = 10 + baseInt + bonusLog;
      actor.system.defenses.will = 10 + baseCha + bonusWill;
    }
  }

  // 4. Speed & STR Minimum
  if (donnedArmor) {
    const strMinAuto = getSetting("armorStrMinAutomation", true);
    const strMin = Number(donnedArmor.system?.strMin);
    const actorStr = Number(actor.system?.attributes?.str ?? 0);

    if (strMinAuto && Number.isNumeric(strMin) && strMin > 0 && actorStr < strMin) {
      if (actor.system.movement) actor.system.movement.walk = 0;
    } else {
      const speedPenaltyAuto = getSetting("armorSpeedPenaltyAutomation", true);
      const penalty = Number(donnedArmor.system?.speedPenalty) || 0;
      if (speedPenaltyAuto && penalty > 0 && actor.system.movement) {
        const baseWalk = Number(actor.system.movement.walk) || 20;
        actor.system.movement.walk = Math.max(0, baseWalk - penalty);
      }
    }
  }
}

/**
 * Check and enforce armor strength requirements
 * @param {Actor} actor
 * @param {Item|null} donnedArmor
 */
export async function syncArmorStrConditions(actor, donnedArmor) {
  if (!actor || !getSetting("armorStrMinAutomation", true)) return;

  const strMin = Number(donnedArmor?.system?.strMin);
  const actorStr = Number(actor.system?.attributes?.str ?? 0);
  const isStrFailed = !!(donnedArmor && Number.isNumeric(strMin) && strMin > 0 && actorStr < strMin);

  const hasDazed = actor.statuses?.has?.("dazed") || actor.effects?.some?.(e => e.statuses?.has("dazed"));
  if (isStrFailed && !hasDazed) {
    await actor.toggleStatusEffect?.("dazed", { active: true });
    await actor.setFlag?.("mythcraft-essence-sheet", "armorDazedApplied", true);
  } else if (!isStrFailed && hasDazed && actor.flags?.["mythcraft-essence-sheet"]?.armorDazedApplied) {
    await actor.toggleStatusEffect?.("dazed", { active: false });
    await actor.unsetFlag?.("mythcraft-essence-sheet", "armorDazedApplied");
  }
}

/**
 * Initialize Equipment Automation by hooking into MythCraft actor lifecycle
 */
export function initEquipmentAutomation() {
  console.log("mythcraft-essence-sheet | Initializing Equipment Automation Engine.");

  // Hook into Actor prepareDerivedData
  const patchActorDerivedData = (actorClass) => {
    if (!actorClass?.prototype) return;
    const original = actorClass.prototype.prepareDerivedData;
    actorClass.prototype.prepareDerivedData = function() {
      original?.call(this);
      if (this.type === "character" || this.type === "npc") {
        applyEffectiveArmorAndDefenses(this);
      }
    };
  };

  patchWeaponApcGetter();
  patchActorDerivedData(CONFIG.Actor?.documentClass);
}

/**
 * Robustly patch WeaponModel.prototype.apc across all registries
 */
export function patchWeaponApcGetter() {
  const models = [
    CONFIG.Item?.dataModels?.weapon,
    globalThis.mythcraft?.data?.Item?.WeaponModel,
    globalThis.mythcraft?.data?.Item?.config?.weapon,
  ].filter(Boolean);

  for (const model of models) {
    if (!model?.prototype) continue;
    try {
      Object.defineProperty(model.prototype, "apc", {
        get() {
          const raw = this.apcFormula;
          if (typeof raw === "number") return raw;
          if (!raw || typeof raw !== "string") return 0;
          const trimmed = raw.trim();
          if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

          // Min/max formula e.g. "8-STR, min 4"
          const minMatch = trimmed.match(/^([0-9\s\+\-\*\/\@a-zA-Z_.]+?)(?:,\s*min\s*(\d+))$/i);
          if (minMatch) {
            const expr = minMatch[1].trim();
            const minVal = parseInt(minMatch[2], 10);
            const rollData = this.parent?.getRollData?.() ?? {};
            const actorStr = Number(rollData?.attributes?.str?.value ?? rollData?.attributes?.str ?? rollData?.str ?? 0);
            const numParts = expr.match(/^(\d+)\s*-\s*(@?STR|@?attributes\.str)/i);
            if (numParts) {
              return Math.max(minVal, parseInt(numParts[1], 10) - actorStr);
            }
            return minVal;
          }

          // Simple arithmetic "8-3"
          const mathMatch = trimmed.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)$/);
          if (mathMatch) {
            const a = parseInt(mathMatch[1], 10);
            const op = mathMatch[2];
            const b = parseInt(mathMatch[3], 10);
            if (op === "+") return a + b;
            if (op === "-") return a - b;
            if (op === "*") return a * b;
            if (op === "/") return b !== 0 ? Math.floor(a / b) : 0;
          }

          return Number(trimmed) || 0;
        },
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      // Ignore if cannot redefine
    }
  }
}

// ── CLOTHES & WEARABLES AUTOMATION ──────────────────────────────────────────

export const DEFAULT_CLOTHES_NAMES = new Set([
  "clothes",
  "clothes (fine)",
  "clothes (simple)",
  "clothes (traveler's)",
  "robes",
  "cloak",
  "boots",
  "hat",
  "vest",
  "tunic",
  "coat",
  "gloves",
  "belt",
  "hood",
  "cap",
  "sandals",
  "shoes",
]);

/**
 * Checks whether an item is configured or recognized as wearable clothing.
 * @param {Item} item
 * @returns {boolean}
 */
export function isItemClothes(item) {
  if (!item || item.type !== "gear") return false;
  const flagVal = item.flags?.["mythcraft-essence-sheet"]?.isClothes;
  if (typeof flagVal === "boolean") return flagVal;
  const cleanName = (item.name || "").trim().toLowerCase();
  return DEFAULT_CLOTHES_NAMES.has(cleanName);
}

/**
 * Checks whether clothing is currently worn.
 * @param {Item} item
 * @returns {boolean}
 */
export function isItemWorn(item) {
  if (!isItemClothes(item)) return false;
  return item.flags?.["mythcraft-essence-sheet"]?.isWorn === true || item.system?.equipped === true;
}

/**
 * Toggles whether clothing is worn or removed.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<Item>}
 */
export async function toggleWearItem(actor, item) {
  if (!item) return;
  const nextWorn = !isItemWorn(item);
  await item.update({
    "flags.mythcraft-essence-sheet.isWorn": nextWorn,
    "system.equipped": nextWorn,
  });
  ui.notifications.info(`${item.name} is now ${nextWorn ? "worn" : "taken off"}.`);
  return item;
}

// ── WEAPON EQUIPMENT & HAND RULES & COMBAT AP AUTOMATION ────────────────────

/**
 * Checks whether an item is a physical equippable weapon rather than an innate class power/feature.
 * @param {Item} item
 * @returns {boolean}
 */
export function isWeaponEquippable(item) {
  if (!item || item.type !== "weapon") return false;
  const name = (item.name || "").toLowerCase();
  if (name.includes("sneak attack") || name.includes("arcana") || name.includes("unarmed") || name.includes("scorn") || name.includes("smite") || name.includes("spell") || item.system?.isFeature) {
    return false;
  }
  return true;
}

/**
 * Checks whether a weapon has an explicit hand tag or is an equippable weapon.
 * @param {Item} item
 * @returns {boolean}
 */
export function weaponHasHandTag(item) {
  return isWeaponEquippable(item);
}

/**
 * Determines weapon hand classification (two-handed, hand-and-a-half, one-handed), or null if not equippable.
 * @param {Item} item
 * @returns {"two-handed" | "hand-and-a-half" | "one-handed" | null}
 */
export function getWeaponHandType(item) {
  if (!isWeaponEquippable(item)) return null;

  const rawTags = Array.isArray(item.system?.tags)
    ? item.system.tags
    : (item.system?.tags && typeof item.system.tags === "object" ? Object.values(item.system.tags) : []);
  
  const cleanTags = rawTags.map(t => String(t).toLowerCase().replace(/^mythcraft\.item\.weapon\.tags\./i, "").replace(/[-_]/g, " "));

  if (cleanTags.some(t => t.includes("two handed") || t.includes("two-handed") || t === "2h")) return "two-handed";
  if (cleanTags.some(t => t.includes("hand and a half") || t.includes("hand and a-half") || t === "1.5h")) return "hand-and-a-half";
  if (cleanTags.some(t => t.includes("one handed") || t.includes("one-handed") || t === "1h")) return "one-handed";

  // Name heuristic
  const nameLower = (item.name || "").toLowerCase();
  if (nameLower.includes("greatsword") || nameLower.includes("greataxe") || nameLower.includes("greatclub") || nameLower.includes("longbow") || nameLower.includes("heavy crossbow") || nameLower.includes("halberd") || nameLower.includes("pike") || nameLower.includes("polearm") || nameLower.includes("quarterstaff") || nameLower.includes("maul")) {
    return "two-handed";
  }
  if (nameLower.includes("bastard sword") || nameLower.includes("spear") || nameLower.includes("warhammer") || nameLower.includes("battleaxe") || nameLower.includes("katana")) {
    return "hand-and-a-half";
  }

  // All other physical equippable weapons default to one-handed
  return "one-handed";
}

/**
 * Checks whether a weapon has the Unwieldy tag or flag.
 * @param {Item} item
 * @returns {boolean}
 */
export function isWeaponUnwieldy(item) {
  if (!item) return false;
  if (item.flags?.["mythcraft-essence-sheet"]?.isUnwieldy === true) return true;
  const rawTags = Array.isArray(item.system?.tags)
    ? item.system.tags
    : (item.system?.tags && typeof item.system.tags === "object" ? Object.values(item.system.tags) : []);
  const cleanTags = rawTags.map(t => String(t).toLowerCase().replace(/^mythcraft\.item\.weapon\.tags\./i, ""));
  return cleanTags.some(t => t.includes("unwieldy"));
}

/**
 * Checks whether an equippable weapon is currently equipped.
 * @param {Item} item
 * @returns {boolean}
 */
export function isWeaponEquipped(item) {
  if (!item || item.type !== "weapon") return false;
  if (!isWeaponEquippable(item)) return false;
  const flag = item.flags?.["mythcraft-essence-sheet"]?.isEquipped;
  if (typeof flag === "boolean") return flag;
  return item.system?.equipped === true;
}

/**
 * Toggles weapon equip/stow state, enforcing hand slot rules (1 for 2H, 2 for 1H)
 * and calculating AP cost during active combat turns.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function toggleEquipWeapon(actor, item) {
  if (!actor || !item) return;

  const inCombat = Boolean(game.combat?.started && actor.inCombat);
  const combatKey = (game.combat && inCombat) ? `${game.combat.id}-${game.combat.round}-${game.combat.turn}` : null;
  const lastSwapKey = actor.flags?.["mythcraft-essence-sheet"]?.lastWeaponSwapKey;
  const isSameTurn = Boolean(inCombat && combatKey && lastSwapKey === combatKey);

  const currentlyEquipped = isWeaponEquipped(item);

  if (currentlyEquipped) {
    // STOW WEAPON
    const apCost = isWeaponUnwieldy(item) ? 1 : 0;
    if (inCombat && apCost > 0) {
      const curAp = Number(actor.system?.ap?.value ?? 0);
      const newAp = Math.max(0, curAp - apCost);
      await actor.update({ "system.ap.value": newAp });
      ui.notifications.info(`Stowed unwieldy ${item.name} (${apCost} AP consumed. Remaining: ${newAp} AP).`);
    } else {
      ui.notifications.info(`Stowed ${item.name}.`);
    }

    if (inCombat && combatKey) {
      await actor.setFlag("mythcraft-essence-sheet", "lastWeaponSwapKey", combatKey);
    }

    await item.update({
      "flags.mythcraft-essence-sheet.isEquipped": false,
      "system.equipped": false,
    });
  } else {
    // EQUIP WEAPON
    let apCost = 0;
    let costReason = "";
    if (isWeaponUnwieldy(item)) {
      apCost = 1;
      costReason = "unwieldy weapon";
    } else if (isSameTurn) {
      apCost = 1;
      costReason = "same-turn weapon swap";
    }

    if (inCombat && apCost > 0) {
      const curAp = Number(actor.system?.ap?.value ?? 0);
      const newAp = Math.max(0, curAp - apCost);
      await actor.update({ "system.ap.value": newAp });
      ui.notifications.info(`Equipped ${item.name} (${apCost} AP consumed for ${costReason}. Remaining: ${newAp} AP).`);
    } else {
      ui.notifications.info(`Equipped ${item.name}.`);
    }

    if (inCombat && combatKey) {
      await actor.setFlag("mythcraft-essence-sheet", "lastWeaponSwapKey", combatKey);
    }

    // Hand Slots Enforcement
    const handType = getWeaponHandType(item);
    const otherEquipped = actor.items.filter(i => i.type === "weapon" && i.id !== item.id && isWeaponEquipped(i));

    if (handType === "two-handed") {
      // 2H occupies both hands: stow all other equipped weapons
      for (const other of otherEquipped) {
        await other.update({
          "flags.mythcraft-essence-sheet.isEquipped": false,
          "system.equipped": false,
        });
      }
    } else {
      // 1H or 1.5H: max 2 equipped
      for (const other of otherEquipped) {
        if (getWeaponHandType(other) === "two-handed") {
          await other.update({
            "flags.mythcraft-essence-sheet.isEquipped": false,
            "system.equipped": false,
          });
        }
      }
      const remainingEquipped = actor.items.filter(i => i.type === "weapon" && i.id !== item.id && isWeaponEquipped(i));
      if (remainingEquipped.length >= 2) {
        // Stow first equipped weapon to make room
        await remainingEquipped[0].update({
          "flags.mythcraft-essence-sheet.isEquipped": false,
          "system.equipped": false,
        });
      }
    }

    await item.update({
      "flags.mythcraft-essence-sheet.isEquipped": true,
      "system.equipped": true,
    });
  }
}
