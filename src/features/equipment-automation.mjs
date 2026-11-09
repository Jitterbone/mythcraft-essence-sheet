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
import { isDefaultIcon, resolveEquipmentIcon, resolveTalentIcon, resolveItemIcon, applyDefaultItemIcon } from "./equipment-icons.mjs";
import SecondSkinChoiceDialog, { isSecondSkinTalent } from "../apps/second-skin-dialog.mjs";
import {
  getActorActiveEffectBonuses,
  getCombinedDamageBonusFormula,
  getWeaponFilteredApcReduction,
} from "./active-effect-engine.mjs";

/**
 * Safely parse a signed or unsigned number from string or number inputs.
 * (e.g. "+2" -> 2, "-1" -> -1, "2" -> 2, 2 -> 2)
 * @param {any} val
 * @param {number} [defaultVal=0]
 * @returns {number}
 */
export function parseSignedNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === "") return defaultVal;
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  const match = str.match(/^[+\-]?\d+(\.\d+)?/);
  if (match) {
    const n = parseFloat(match[0]);
    return isNaN(n) ? defaultVal : n;
  }
  const clean = str.replace(/[^0-9\-+.]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Parse a resistance input (string, array, or object) into structured objects.
 * Handles formats like: "Sharp 2", "Necrotic 3, Corrosive 3, Toxic 3", "Sharp, Fire 2", "Sharp: 2", "2 Sharp"
 * @param {any} resistInput
 * @returns {Array<{ type: string, label: string, value: number }>}
 */
export function parseResistanceString(resistInput) {
  if (!resistInput) return [];
  const list = [];

  if (Array.isArray(resistInput)) {
    for (const item of resistInput) {
      if (!item) continue;
      if (typeof item === "string") {
        list.push(...parseResistanceString(item));
      } else if (typeof item === "object") {
        const type = String(item.type || item.key || item.name || item.id || "").trim().toLowerCase();
        const val = parseSignedNumber(item.value ?? item.val ?? item.amount, 1);
        if (type) {
          list.push({
            type,
            label: item.label || (type.charAt(0).toUpperCase() + type.slice(1)),
            value: val,
          });
        }
      }
    }
    return list;
  }

  if (typeof resistInput === "object") {
    for (const [key, val] of Object.entries(resistInput)) {
      const type = key.trim().toLowerCase();
      if (type) {
        list.push({
          type,
          label: type.charAt(0).toUpperCase() + type.slice(1),
          value: parseSignedNumber(val, 1),
        });
      }
    }
    return list;
  }

  if (typeof resistInput !== "string") return [];

  const parts = resistInput.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    // Check "2 Sharp" or "+2 Sharp"
    const prefixMatch = part.match(/^[+\-]?(\d+)\s*(?:x|:)?\s*([a-zA-Z\s]+)$/);
    if (prefixMatch) {
      const val = parseInt(prefixMatch[1], 10);
      const rawType = prefixMatch[2].trim();
      const lower = rawType.toLowerCase();
      const label = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      list.push({ type: lower, label, value: val });
      continue;
    }

    // Check "Sharp 2", "Sharp: 2", "Sharp +2", "Sharp (2)"
    const match = part.match(/^([a-zA-Z\s]+?)(?:[:\s\+\-\(]+(\d+)\)?)?$/);
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
 * Format resistance objects into a comma-separated display string.
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
 * Checks whether an item is an armor enhancement.
 * An enhancement is an armor item with category "enhancement" or the "Enhancement" tag.
 * @param {Item} item
 * @returns {boolean}
 */
export function isArmorEnhancement(item) {
  if (!item || item.type !== "armor") return false;

  // 1. Primary check: Armor category / armorType / type
  const cat = String(item.system?.category || item.system?.armorType || item.system?.type || item.system?.subType || "").toLowerCase().trim();
  if (cat === "enhancement" || cat.includes("enhancement") || cat === "armorenhancement") {
    return true;
  }

  // 2. Tag check (fallback)
  const rawTags = item.system?.tags || [];
  const tagList = Array.isArray(rawTags)
    ? rawTags
    : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "object" && rawTags !== null ? Object.keys(rawTags).concat(Object.values(rawTags)) : String(rawTags).split(",")));
  for (const t of tagList) {
    const str = typeof t === "string" ? t : (t?.name || t?.label || t?.value || t?.id || "");
    const clean = str.trim().replace(/^MYTHCRAFT\.Item\.[a-zA-Z0-9_]+\.tags\./i, "").toLowerCase();
    if (clean === "enhancement" || clean.includes("enhancement")) return true;
  }

  // 3. Flags check
  const flag = item.flags?.["mythcraft-essence-sheet"]?.isEnhancement;
  if (typeof flag === "boolean") return flag;

  return false;
}

/**
 * Checks whether an enhancement is currently equipped/worn.
 * @param {Item} item
 * @returns {boolean}
 */
export function isEnhancementEquipped(item) {
  if (!isArmorEnhancement(item)) return false;
  const flag = item.flags?.["mythcraft-essence-sheet"]?.isWorn ?? item.flags?.["mythcraft-essence-sheet"]?.isDonned;
  if (typeof flag === "boolean") return flag;
  return item.system?.equipped === true;
}

/**
 * Gets the single equipped enhancement for an actor.
 * @param {Actor} actor
 * @returns {Item|null}
 */
export function getEquippedEnhancement(actor) {
  if (!actor) return null;
  const armors = actor.itemTypes?.armor || (actor.items ? actor.items.filter(i => i.type === "armor") : []);
  return armors.find(item => isArmorEnhancement(item) && isEnhancementEquipped(item)) || null;
}

/**
 * Checks whether an item is a shield.
 * @param {Item} item
 * @returns {boolean}
 */
export function isShield(item) {
  if (!item || item.type !== "armor") return false;
  if (isArmorEnhancement(item)) return false;
  const cat = String(item.system?.category || item.system?.armorType || item.system?.type || "").toLowerCase().trim();
  if (cat === "shield" || cat.includes("shield")) return true;
  const nameLower = (item.name || "").toLowerCase();
  if (nameLower.includes("shield") || nameLower.includes("buckler") || nameLower.includes("targe") || nameLower.includes("pavise") || nameLower.includes("aegis")) {
    return true;
  }
  return false;
}

/**
 * Checks whether a shield is currently equipped.
 * @param {Item} item
 * @returns {boolean}
 */
export function isShieldEquipped(item) {
  if (!isShield(item)) return false;
  const flag = item.flags?.["mythcraft-essence-sheet"]?.isEquipped;
  if (typeof flag === "boolean") return flag;
  return item.system?.equipped === true;
}

/**
 * Gets the additional AR modifier provided by a shield.
 * @param {Item} item
 * @returns {number}
 */
export function getShieldArBonus(item) {
  if (!item) return 0;
  const sys = item.system || {};
  if (sys.ar !== undefined && sys.ar !== null && !isNaN(Number(sys.ar))) return Number(sys.ar);
  if (sys.arBonus !== undefined && sys.arBonus !== null && !isNaN(Number(sys.arBonus))) return Number(sys.arBonus);
  if (sys.defenses?.ar !== undefined && sys.defenses?.ar !== null && !isNaN(Number(sys.defenses.ar))) return Number(sys.defenses.ar);
  if (sys.armorModifier !== undefined && sys.armorModifier !== null && !isNaN(Number(sys.armorModifier))) return Number(sys.armorModifier);
  const parsed = parseInt(String(sys.ar || sys.arBonus || "").replace(/[^0-9\-]/g, ""), 10);
  return !isNaN(parsed) ? parsed : 1;
}

/**
 * Gets all equipped shields for an actor.
 * @param {Actor} actor
 * @returns {Array<Item>}
 */
export function getEquippedShields(actor) {
  if (!actor) return [];
  const armors = actor.itemTypes?.armor || (actor.items ? actor.items.filter(i => i.type === "armor") : []);
  return armors.filter(item => isShield(item) && isShieldEquipped(item));
}

/**
 * Get the currently donned (equipped) body armor for an actor (excluding shields and enhancements)
 * @param {Actor} actor
 * @returns {Item|null}
 */
export function getDonnedArmor(actor) {
  if (!actor) return null;
  const armors = actor.itemTypes?.armor || (actor.items ? actor.items.filter(i => i.type === "armor") : []);
  return armors.find(item => {
    if (isShield(item) || isArmorEnhancement(item)) return false;
    return item.system?.equipped === true || item.flags?.["mythcraft-essence-sheet"]?.isDonned === true;
  }) || null;
}

/**
 * Detects the category of an armor item ("light", "medium", "heavy", "shield", "enhancement", or "unknown").
 * @param {Item} item
 * @returns {"light"|"medium"|"heavy"|"shield"|"enhancement"|"unknown"}
 */
export function getArmorCategory(item) {
  if (!item || item.type !== "armor") return "unknown";
  if (isArmorEnhancement(item)) return "enhancement";
  if (isShield(item)) return "shield";

  // 1. Direct system fields (category, armorType, subType, type)
  const rawCat = String(
    item.system?.category ||
    item.system?.armorType ||
    item.system?.subType ||
    item.system?.type ||
    ""
  ).toLowerCase().trim();

  if (rawCat.includes("light")) return "light";
  if (rawCat.includes("medium") || rawCat.includes("med")) return "medium";
  if (rawCat.includes("heavy")) return "heavy";
  if (rawCat.includes("shield")) return "shield";

  // 2. Tags check
  const rawTags = item.system?.tags || [];
  const tagList = Array.isArray(rawTags)
    ? rawTags
    : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "object" && rawTags !== null ? Object.keys(rawTags).concat(Object.values(rawTags)) : String(rawTags).split(",")));
  for (const t of tagList) {
    const str = String(typeof t === "string" ? t : (t?.name || t?.label || t?.value || t?.id || "")).toLowerCase().trim();
    if (str.includes("light")) return "light";
    if (str.includes("medium") || str.includes("med")) return "medium";
    if (str.includes("heavy")) return "heavy";
    if (str.includes("shield")) return "shield";
  }

  // 3. Name heuristic matching MythCraft armor types
  const name = (item.name || "").toLowerCase();
  if (/\b(?:gambeson|padded|leather|studded|hide|silk|robes?)\b/.test(name)) return "light";
  if (/\b(?:brigandine|chain shirt|scale mail|scale|breastplate|half plate|cuirass)\b/.test(name)) return "medium";
  if (/\b(?:ring mail|chainmail|chain mail|splint|full plate|plate mail|field plate|plate)\b/.test(name)) return "heavy";
  if (/\b(?:buckler|targe|pavise|heater|kite|aegis|shield)\b/.test(name)) return "shield";

  return "unknown";
}

/**
 * Normalizes an armor name string for reliable matching.
 * @param {string} name
 * @returns {string}
 */
export function normalizeArmorName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s*armor$/i, "")
    .replace(/\s*shield$/i, "")
    .replace(/[()[\]\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether an armor item matches a selected Second Skin armor specialization name.
 * @param {Item} armorItem
 * @param {string} chosenName
 * @returns {boolean}
 */
export function matchArmorName(armorItem, chosenName) {
  if (!armorItem || !chosenName) return false;
  const itemRaw = String(armorItem.name || "").toLowerCase().trim();
  const chosenRaw = String(chosenName).toLowerCase().trim();

  // 1. Exact match
  if (itemRaw === chosenRaw) return true;

  // 2. Normalized match
  const normItem = normalizeArmorName(itemRaw);
  const normChosen = normalizeArmorName(chosenRaw);
  if (normItem === normChosen) return true;
  if (normItem.includes(normChosen) || normChosen.includes(normItem)) return true;

  // 3. Compact whitespace match (e.g. "chain mail" / "chainmail")
  const compactItem = itemRaw.replace(/[^a-z0-9]/g, "");
  const compactChosen = chosenRaw.replace(/[^a-z0-9]/g, "");
  if (compactItem && compactChosen && (compactItem.includes(compactChosen) || compactChosen.includes(compactItem))) return true;

  return false;
}

/**
 * Checks whether an actor possesses the Second Skin talent required to unlock an armor piece's resistance specialization.
 * Supports three rule variants configured via `secondSkinRuleVariant`:
 * 1. "raw" (Rules as Written - Default): Requires choosing one specific armor type per talent.
 * 2. "category" (Second Skin Armor Type): Unlocks all armors within that category.
 * 3. "sturdyBones" (Jitterbone's Sturdy Bones): Always unlocked for all armors without needing talents.
 *
 * @param {Actor} actor
 * @param {Item} armorItem
 * @returns {boolean}
 */
export function hasSecondSkinForArmor(actor, armorItem) {
  if (!actor || !armorItem) return false;

  // Enhancements do not require Second Skin
  if (isArmorEnhancement(armorItem)) return true;

  // Check rule variant setting
  const variant = getSetting("secondSkinRuleVariant", "raw");

  // Variant 3: "sturdyBones" -> Always active without talents!
  if (variant === "sturdyBones") {
    return true;
  }

  // NPCs without talents / monster statblocks gain armor resists directly
  if (actor.type === "npc") {
    const hasTalents = (actor.itemTypes?.talent?.length ?? 0) > 0;
    if (!hasTalents) return true;
  }

  const category = getArmorCategory(armorItem);
  const armorName = (armorItem.name || "").toLowerCase().trim();

  // Check ActiveEffect Second Skin / Shield Resist unlock flags
  const aeBonuses = getActorActiveEffectBonuses(actor);
  if (aeBonuses.kiteHeaterShieldResist && category === "shield" && /\b(?:kite|heater)\b/i.test(armorName)) {
    return true;
  }
  if (variant === "category") {
    if (category === "light" && aeBonuses.secondSkinLight) return true;
    if (category === "medium" && aeBonuses.secondSkinMedium) return true;
    if (category === "heavy" && aeBonuses.secondSkinHeavy) return true;
    if (category === "shield" && aeBonuses.secondSkinShields) return true;
  }

  // Collect talent, feature, and specialization items from actor
  const talentItems = (actor.items || []).filter(i => {
    const t = i.type?.toLowerCase();
    return t === "talent" || t === "feature" || t === "specialization";
  });

  for (const item of talentItems) {
    const name = (item.name || "").toLowerCase().trim();
    const desc = String(item.system?.description?.value || item.system?.description || "").toLowerCase();

    // Check if this item represents a Second Skin talent
    const isSecondSkin = isSecondSkinTalent(item);
    if (!isSecondSkin) continue;

    // Check if talent category matches armor category
    let talentCat = "unknown";
    if (name.includes("light") || desc.includes("light armor")) talentCat = "light";
    else if (name.includes("medium") || name.includes("med ") || name.includes("med:") || desc.includes("medium armor")) talentCat = "medium";
    else if (name.includes("heavy") || desc.includes("heavy armor")) talentCat = "heavy";
    else if (name.includes("shield") || desc.includes("shield")) talentCat = "shield";

    if (category !== "unknown" && talentCat !== "unknown" && category !== talentCat) {
      continue;
    }

    // Variant 2: "category" -> Any Second Skin of matching category unlocks ALL armors in that category
    if (variant === "category") {
      return true;
    }

    // Variant 1: "raw" (Rules as Written) -> Must match specific chosen armor
    const chosenArmor = item.flags?.["mythcraft-essence-sheet"]?.secondSkinArmor;
    if (chosenArmor) {
      if (matchArmorName(armorItem, chosenArmor)) {
        return true;
      }
    } else {
      // Check if talent name itself contains specific armor in parentheses, e.g. "Second Skin: Light Armor (Leather)"
      const parentheticalMatch = (item.name || "").match(/\(([^)]+)\)/);
      if (parentheticalMatch && matchArmorName(armorItem, parentheticalMatch[1])) {
        return true;
      }
      // If no armor chosen yet, check direct name match
      if (matchArmorName(armorItem, item.name)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate effective resistances for an actor by combining base resistances with donned armor, shield, and enhancement resistance specializations
 * Stacks matching resistance types across all equipped armor pieces (e.g. Armor Sharp 2 + Shield Sharp 2 + Enhancement Sharp 2 = Sharp 6)
 * Armor and shield resistances strictly require the corresponding Second Skin talent (Light, Medium, Heavy, Shields).
 * @param {Actor} actor
 * @returns {{ list: Array<object>, combinedString: string, map: Record<string, number>, armorResists: Array<object>, baseResists: Array<object> }}
 */
export function calculateEffectiveResistances(actor) {
  const aeBonuses = actor ? getActorActiveEffectBonuses(actor) : null;
  const hasAeResists = (aeBonuses?.resistStrings?.length ?? 0) > 0;
  const baseResistStr = hasAeResists
    ? (actor?.system?._source?.damage?.resist ?? actor?._source?.system?.damage?.resist ?? "")
    : (actor?.system?.damage?.resist || "");
  const baseResists = parseResistanceString(baseResistStr);
  if (hasAeResists) {
    for (const rStr of aeBonuses.resistStrings) {
      baseResists.push(...parseResistanceString(rStr));
    }
  }

  // For NPCs, resistances are fixed directly on their statblock and do not use Second Skin or equipment stacking
  if (actor?.type === "npc") {
    const list = baseResists.map(r => ({
      ...r,
      hasArmorBonus: false,
      armorValue: 0,
      baseValue: r.value,
    }));
    return {
      list,
      combinedString: baseResistStr,
      map: Object.fromEntries(baseResists.map(r => [r.type, r.value])),
      armorResists: [],
      baseResists,
    };
  }

  const armorResists = [];

  const armorResistAuto = getSetting("armorResistanceAutomation", true);
  if (armorResistAuto) {
    // 1. Donned Body Armor (Requires Second Skin talent for that armor category)
    const donnedArmor = getDonnedArmor(actor);
    const armorRes = donnedArmor?.system?.resist || donnedArmor?.system?.resistances || donnedArmor?.system?.resistance || donnedArmor?.system?.damage?.resist || "";
    if (armorRes && hasSecondSkinForArmor(actor, donnedArmor)) {
      const parsedArmor = parseResistanceString(armorRes);
      for (const r of parsedArmor) {
        armorResists.push({
          ...r,
          sourceName: donnedArmor.name,
          sourceId: donnedArmor.id,
        });
      }
    }

    // 2. Equipped Shields (Requires Second Skin: Shields talent)
    const equippedShields = getEquippedShields(actor);
    for (const shield of equippedShields) {
      const shieldRes = shield?.system?.resist || shield?.system?.resistances || shield?.system?.resistance || shield?.system?.damage?.resist || "";
      if (shieldRes && hasSecondSkinForArmor(actor, shield)) {
        const parsedShield = parseResistanceString(shieldRes);
        for (const r of parsedShield) {
          armorResists.push({
            ...r,
            sourceName: shield.name,
            sourceId: shield.id,
          });
        }
      }
    }

    // 3. Equipped Enhancement
    const equippedEnhancement = getEquippedEnhancement(actor);
    const enhRes = equippedEnhancement?.system?.resist || equippedEnhancement?.system?.resistances || equippedEnhancement?.system?.resistance || equippedEnhancement?.system?.damage?.resist || "";
    if (enhRes) {
      const parsedEnh = parseResistanceString(enhRes);
      for (const r of parsedEnh) {
        armorResists.push({
          ...r,
          sourceName: equippedEnhancement.name,
          sourceId: equippedEnhancement.id,
        });
      }
    }
  }

  const allowStacking = getSetting("allowResistanceStacking", false);

  // Combine and calculate resistances
  const resistMap = {};
  const labelMap = {};

  if (allowStacking) {
    // Alternative / House Rule: Additively stack matching resistances across all sources
    for (const r of baseResists) {
      resistMap[r.type] = (resistMap[r.type] || 0) + r.value;
      labelMap[r.type] = r.label;
    }
    for (const r of armorResists) {
      resistMap[r.type] = (resistMap[r.type] || 0) + r.value;
      labelMap[r.type] = r.label;
    }
  } else {
    // Rules as Written (RAW - Default): Take the highest value among all sources of the same resistance type
    for (const r of baseResists) {
      resistMap[r.type] = Math.max(resistMap[r.type] || 0, r.value);
      labelMap[r.type] = r.label;
    }
    for (const r of armorResists) {
      resistMap[r.type] = Math.max(resistMap[r.type] || 0, r.value);
      labelMap[r.type] = r.label;
    }
  }

  const list = Object.entries(resistMap).map(([type, value]) => ({
    type,
    label: labelMap[type] || (type.charAt(0).toUpperCase() + type.slice(1)),
    value,
    hasArmorBonus: armorResists.some(a => a.type === type),
    armorValue: allowStacking
      ? armorResists.filter(a => a.type === type).reduce((sum, a) => sum + a.value, 0)
      : armorResists.filter(a => a.type === type).reduce((max, a) => Math.max(max, a.value), 0),
    baseValue: allowStacking
      ? baseResists.filter(b => b.type === type).reduce((sum, b) => sum + b.value, 0)
      : baseResists.filter(b => b.type === type).reduce((max, b) => Math.max(max, b.value), 0),
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
 * Standard MythCraft unarmed / natural weapon die size progression ladder (max 1d12).
 */
export const UNARMED_DIE_LADDER = [4, 6, 8, 10, 12];

/**
 * Extracts a primary dice term (e.g. "1d4", "d6", "2d8") from a formula string, ignoring example parentheticals.
 * @param {string} formula
 * @returns {{ count: number, faces: number, raw: string }|null}
 */
export function parseDieTerm(formula) {
  if (!formula || typeof formula !== "string") return null;
  const cleaned = formula
    .replace(/\([^)]*(?:e\.g\.|for example|max\s+1d\d+|from\s+1d\d+)[^)]*\)/gi, "")
    .trim();
  const match = cleaned.match(/\b(\d*)d(\d+)\b/i);
  if (!match) return null;
  const count = match[1] ? Math.max(1, parseInt(match[1], 10)) : 1;
  const faces = parseInt(match[2], 10);
  if (isNaN(faces) || faces <= 0) return null;
  return { count, faces, raw: match[0] };
}

/**
 * Increases a damage die formula by `steps` die sizes along the MythCraft die ladder
 * (none/1 -> 1d4 -> 1d6 -> 1d8 -> 1d10 -> 1d12, max 1d12).
 *
 * Per MythCraft *Brass Knuckles rule:
 * "Your unarmed and natural weapon damage increases by one die size (e.g., from 1d4 to 1d6, max 1d12).
 *  If you did not have an unarmed damage die, it becomes 1d4."
 *
 * @param {string|null|undefined} formula
 * @param {number} [steps=1]
 * @returns {string}
 */
export function stepUpDieFormula(formula, steps = 1) {
  const numSteps = Math.max(0, Number(steps) || 0);
  const die = parseDieTerm(formula);

  if (!die || die.faces < 4) {
    if (numSteps <= 0) {
      return (formula && String(formula).trim() && !/^\*+$/.test(String(formula).trim()))
        ? String(formula).trim()
        : "1d4";
    }
    // Step 1 turns "no unarmed damage die" (or < d4) into 1d4; additional steps climb [4, 6, 8, 10, 12]
    const targetIdx = Math.min(UNARMED_DIE_LADDER.length - 1, numSteps - 1);
    const count = die ? die.count : 1;
    return `${count}d${UNARMED_DIE_LADDER[targetIdx]}`;
  }

  if (numSteps <= 0) {
    return `${die.count}d${Math.min(12, die.faces)}`;
  }

  // Find current position in [4, 6, 8, 10, 12]
  let currentIdx = 0;
  for (let i = 0; i < UNARMED_DIE_LADDER.length; i++) {
    if (die.faces >= UNARMED_DIE_LADDER[i]) {
      currentIdx = i;
    }
  }
  const nextIdx = Math.min(UNARMED_DIE_LADDER.length - 1, currentIdx + numSteps);
  const nextFaces = UNARMED_DIE_LADDER[nextIdx];

  const cleanBase = String(formula)
    .replace(/\*/g, "")
    .trim();
  if (/^\d*d\d+$/i.test(cleanBase)) {
    return `${die.count}d${nextFaces}`;
  }
  return cleanBase.replace(/\b\d*d\d+\b/i, `${die.count}d${nextFaces}`);
}

/**
 * Checks whether an item is Brass Knuckles.
 * @param {Item|object} item
 * @returns {boolean}
 */
export function isBrassKnuckles(item) {
  if (!item) return false;
  if (item.flags?.["mythcraft-essence-sheet"]?.isBrassKnuckles === true) return true;
  const name = String(item.name || "").toLowerCase().trim();
  if (/\bbrass\s*knuckles?\b/i.test(name) || /\bknuckle\s*dusters?\b/i.test(name)) {
    return true;
  }
  if (item.type === "weapon" || item.type === "gear" || item.type === "equipment") {
    const desc = String(item.system?.description?.value ?? item.system?.description ?? "");
    if (/\*?\s*brass\s*knuckles/i.test(desc) && /unarmed\s+and\s+natural\s+weapon\s+damage\s+increases\s+by\s+one\s+die\s+size/i.test(desc)) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts normalized lowercase tag strings from an item.
 * @param {Item|object} item
 * @returns {string[]}
 */
function extractNormalizedItemTags(item) {
  if (!item) return [];
  const rawTags = item.system?.tags ?? item.system?.tagList ?? item.system?.properties ?? [];
  const tagList = Array.isArray(rawTags)
    ? rawTags
    : (rawTags instanceof Set
      ? Array.from(rawTags)
      : (typeof rawTags === "object" && rawTags !== null
        ? Object.keys(rawTags).concat(Object.values(rawTags))
        : String(rawTags).split(",")));
  const result = [];
  for (const t of tagList) {
    if (!t) continue;
    const str = typeof t === "string" ? t : (t.name || t.label || t.id || t.key || t.value || "");
    if (str && typeof str === "string") {
      result.push(str.trim().replace(/^MYTHCRAFT\.Item\.[a-zA-Z0-9_]+\.tags\./i, "").toLowerCase());
    }
  }
  return result;
}

/**
 * Checks whether a weapon has the "Light" tag (allowing DEX or STR).
 * @param {Item|object} item
 * @returns {boolean}
 */
export function isWeaponLight(item) {
  if (!item) return false;
  if (isBrassKnuckles(item)) return true;
  const tags = extractNormalizedItemTags(item);
  return tags.some(t => t === "light" || t.includes("light") || t === "natural" || t.includes("natural") || t === "unarmed");
}

/**
 * Checks whether an item is an Unarmed attack or Natural Weapon (excluding Brass Knuckles itself).
 * @param {Item|object} item
 * @returns {boolean}
 */
export function isUnarmedOrNaturalWeapon(item) {
  if (!item || isBrassKnuckles(item)) return false;

  const tags = extractNormalizedItemTags(item);
  if (tags.some(t => t === "unarmed" || t === "natural" || t === "natural-weapon" || t === "naturalweapon" || t.includes("natural weapon"))) {
    return true;
  }

  const name = String(item.name || "").toLowerCase().trim();
  if (item.type === "weapon" || item.type === "feature") {
    if (/\b(?:unarmed|natural\s+weapon|claws?|bite|talons?|horns?|hooves|tail(?:\s+slap|\s+swipe|\s+strike|\s+spike|\s+stinger)?|gore|tusks?|fangs?|stinger|slam|fist|iron\s+fist|martial\s+arts|mandibles|pincers|tentacles?)\b/i.test(name)) {
      return true;
    }
  }

  if (item.type === "weapon") {
    const desc = String(item.system?.description?.value ?? item.system?.description ?? "");
    if (/\b(?:unarmed\s+(?:attack|strike|damage|weapon)|natural\s+weapon)\b/i.test(desc)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an actor owns and has active (equipped or not explicitly stowed) Brass Knuckles.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function actorHasActiveBrassKnuckles(actor) {
  if (!actor?.items) return false;
  const bkItems = actor.items.filter(i => isBrassKnuckles(i));
  if (!bkItems.length) return false;
  return bkItems.some(bk => {
    const explicitEquipFlag = bk.flags?.["mythcraft-essence-sheet"]?.isEquipped;
    if (explicitEquipFlag === false) return false;
    return true;
  });
}

/**
 * Reads the untouched original damage formula from a weapon (before any derived-data overrides),
 * stripping invalid placeholder characters like "*" or "Special" and redundant @ATTR tokens.
 * @param {Item|object} weapon
 * @returns {string}
 */
export function getCleanWeaponRawFormula(weapon) {
  if (!weapon) return "";
  const rawSource =
    weapon._essenceOriginalDamageFormula !== undefined
      ? weapon._essenceOriginalDamageFormula
      : (weapon._source?.system?.damage?.[0]?.formula ??
         weapon._source?.system?.damage?.formula ??
         weapon._source?.system?.damageFormula ??
         weapon.system?.damage?.formula ??
         weapon.system?.damageFormula ??
         (Array.isArray(weapon.system?.damage) ? weapon.system.damage[0]?.formula : "") ??
         "");

  let str = String(rawSource || "").trim();
  if (!str) return "";

  // Strip parenthetical examples and invalid non-dice placeholders (like "*" on Brass Knuckles)
  str = str
    .replace(/\([^)]*\)/g, "")
    .replace(/^\*+.*$/g, "")
    .replace(/\*/g, "")
    .replace(/\b(?:special|see\s+text|none|n\/a)\b/gi, "")
    .trim();

  // If weaponDamageAttrModifier is active, strip redundant "+ @STR" / "+ @DEX" tokens from the base formula
  if (getSetting("weaponDamageAttrModifier", true)) {
    str = str
      .replace(/[\+\-]\s*@(?:attributes\.)?(?:str|dex|end|awr|int|cha|luck|cor)(?:\.value)?\b/gi, "")
      .replace(/^@(?:attributes\.)?(?:str|dex|end|awr|int|cha|luck|cor)(?:\.value)?\s*[\+\-]?\s*/gi, "")
      .trim();
  }

  return str;
}

/**
 * Determines the actor's base unarmed or natural weapon damage die (e.g. "1d4", "1d6", "1d8", "1d10", "1d12"),
 * or null if the actor does not have an unarmed damage die, by inspecting other unarmed/natural weapons,
 * lineage traits, class features, and talents on the actor (excluding Brass Knuckles itself).
 *
 * @param {Actor} actor
 * @param {Item|null} [excludeItem=null]
 * @returns {string|null}
 */
export function getActorBaseUnarmedDie(actor, excludeItem = null) {
  if (!actor?.items) return null;

  let traitBaseDie = null;
  let traitBaseFaces = 0;
  let traitStepUps = 0;

  let otherWeaponDie = null;
  let otherWeaponFaces = 0;

  for (const item of actor.items) {
    if (!item || (excludeItem && item.id === excludeItem.id)) continue;
    if (isBrassKnuckles(item)) continue;

    // 1. Check other Unarmed or Natural Weapon items on the actor
    if (item.type === "weapon" && isUnarmedOrNaturalWeapon(item)) {
      const rawF = getCleanWeaponRawFormula(item);
      const die = parseDieTerm(rawF);
      if (die && die.faces >= 4 && die.faces > otherWeaponFaces) {
        otherWeaponFaces = die.faces;
        otherWeaponDie = `${die.count}d${Math.min(12, die.faces)}`;
      }
      continue;
    }

    // 2. Check Talents, Features, Lineages, Ancestries, Classes, Specializations
    const itemType = String(item.type || "").toLowerCase();
    if (!["talent", "feature", "lineage", "ancestry", "class", "specialization"].includes(itemType)) {
      continue;
    }

    // Check if feature/talent has a direct system.damage die and is an unarmed/natural weapon feature
    if (isUnarmedOrNaturalWeapon(item)) {
      const featRawF = getCleanWeaponRawFormula(item);
      const featDie = parseDieTerm(featRawF);
      if (featDie && featDie.faces >= 4 && featDie.faces > traitBaseFaces) {
        traitBaseFaces = featDie.faces;
        traitBaseDie = `${featDie.count}d${Math.min(12, featDie.faces)}`;
      }
    }

    const rawDesc = String(item.system?.description?.value ?? item.system?.description ?? "");
    if (!rawDesc) continue;

    const plainDesc = rawDesc
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Check if this talent/feature steps up unarmed/natural weapon damage by one die size
    const isStepUpTalent =
      /(?:unarmed|natural\s+weapon)[^.!?\n]*?increases?\s+by\s+(?:one|1|a)\s+(?:die\s+)?size/i.test(plainDesc) ||
      /increases?\s+(?:the\s+die\s+size\s+of\s+)?(?:your\s+)?(?:unarmed|natural\s+weapon)[^.!?\n]*?(?:by\s+(?:one|1|a)\s+(?:die\s+)?size|die\s+size)/i.test(plainDesc) ||
      /unarmed\s+damage\s+die\s+increases/i.test(plainDesc);

    if (isStepUpTalent) {
      traitStepUps += 1;
    }

    // Strip step-up example parentheticals and fallback clauses before searching for static base dice
    const descWithoutExamples = plainDesc
      .replace(/\([^)]*(?:e\.g\.|for example|from\s+1d\d+\s+to\s+1d\d+|max\s+1d\d+)[^)]*\)/gi, "")
      .replace(/if\s+you\s+(?:did|do)\s+not\s+have\s+an\s+unarmed\s+damage\s+die[^.!?]*/gi, "")
      .replace(/[^.!?]*increases?\s+by\s+(?:one|1|a)\s+(?:die\s+)?size[^.!?]*/gi, "");

    const staticDieMatch =
      descWithoutExamples.match(/(?:unarmed(?:\s+strike|\s+attack|\s+damage)?|natural\s+weapon|claws?|bite|talons?|horns?|hooves|tusks?|fangs?|gore)[^.!?\n]{0,80}?\b(?:deals?|is|becomes?|equal\s+to)\s+(\d*d(?:4|6|8|10|12))\b/i) ||
      descWithoutExamples.match(/\b(\d*d(?:4|6|8|10|12))\s+(?:blunt|sharp|physical|unarmed|natural)?\s*damage\s+(?:with|on|for)\s+(?:your\s+)?(?:unarmed|natural\s+weapon|claws?|bite|talons?|horns?|hooves|tusks?)/i);

    if (staticDieMatch) {
      const d = parseDieTerm(staticDieMatch[1]);
      if (d && d.faces >= 4 && d.faces > traitBaseFaces) {
        traitBaseFaces = d.faces;
        traitBaseDie = `${d.count}d${Math.min(12, d.faces)}`;
      }
    }
  }

  // Combine trait base die + any non-Brass-Knuckles step-up talents / Active Effects
  const aeUnarmedStep = Number(getActorActiveEffectBonuses(actor)?.unarmedDieStep || 0);
  const totalStepUps = Math.max(traitStepUps, aeUnarmedStep);
  let effectiveTraitDie = traitBaseDie;
  if (totalStepUps > 0) {
    const startDie = traitBaseDie || (otherWeaponFaces === 4 ? otherWeaponDie : null);
    effectiveTraitDie = stepUpDieFormula(startDie, totalStepUps);
  }

  const traitParsed = parseDieTerm(effectiveTraitDie);
  const weaponParsed = parseDieTerm(otherWeaponDie);

  if (traitParsed && weaponParsed) {
    return traitParsed.faces >= weaponParsed.faces ? effectiveTraitDie : otherWeaponDie;
  }
  return effectiveTraitDie || otherWeaponDie || null;
}

/**
 * Extracts the base two-handed damage formula for a hand-and-a-half weapon from system data, tags, or description.
 * (e.g. "Hand-and-a-Half (1d10)", "Hand in a Half (1d10)", "1d10 when wielded with two hands" -> "1d10")
 * @param {Item} weapon
 * @returns {string|null}
 */
export function getTwoHandedBaseFormula(weapon) {
  if (!weapon || isBrassKnuckles(weapon) || isUnarmedOrNaturalWeapon(weapon)) return null;

  // 1. Direct system/flag fields
  if (weapon.system?.twoHandedDamage) return String(weapon.system.twoHandedDamage).trim();
  if (weapon.system?.versatileDamage) return String(weapon.system.versatileDamage).trim();
  if (weapon.system?.twoHandDamage) return String(weapon.system.twoHandDamage).trim();
  if (weapon.system?.twoHanded) return String(weapon.system.twoHanded).trim();
  if (weapon.flags?.["mythcraft-essence-sheet"]?.twoHandedDamage) return String(weapon.flags["mythcraft-essence-sheet"].twoHandedDamage).trim();

  // 2. Check tags (objects or strings)
  const rawTags = weapon.system?.tags || [];
  const tagList = Array.isArray(rawTags)
    ? rawTags
    : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "object" && rawTags !== null ? Object.keys(rawTags).concat(Object.values(rawTags)) : String(rawTags).split(",")));
  
  for (const t of tagList) {
    const str = typeof t === "string" ? t : (t?.name || t?.label || t?.value || t?.id || "");
    const match = str.match(/(?:hand(?:-|\s*)(?:and|in)(?:-|\s*)a(?:-|\s*)half|handhalf|1\.5h|two-handed|versatile)[^\(]*\(\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*\)/i) || 
                  str.match(/\(\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*\)/i);
    if (match) return match[1].trim();
  }

  // 3. Check weapon description
  const desc = String(weapon.system?.description?.value ?? weapon.system?.description ?? "");
  const descMatch = desc.match(/(?:hand(?:-|\s*)(?:and|in)(?:-|\s*)a(?:-|\s*)half|handhalf|1\.5h|two-handed|versatile)[^\(]*\(\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*\)/i) ||
                    desc.match(/\(\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*(?:when|if)\s*(?:two-handed|two handed|2h|in two hands)\s*\)/i) ||
                    desc.match(/(?:deals|deal|damage:?)\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*(?:when|if)?\s*(?:wielded with two hands|wielded two-handed|two-handed|in two hands)/i) ||
                    desc.match(/(?:when|if)\s*(?:wielded with two hands|wielded two-handed|two-handed|in two hands)[^.]*?([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)/i);
  if (descMatch) return descMatch[1].trim();

  return null;
}

/**
 * Safely extracts and resolves the weapon attack modifier (from item schema, formulas, flags, or fallbacks).
 * @param {Item} item
 * @param {Actor} [actor=null]
 * @returns {number}
 */
/**
 * Safely extracts and resolves the weapon attack modifier breakdown (item-level and active-effect/actor-level).
 * @param {Item} item
 * @param {Actor} [actor=null]
 * @returns {{ itemMod: number, aeMod: number, total: number, itemLabel: string, aeLabel: string }}
 */
export function getWeaponAttackModifierDetails(item, actor = null) {
  if (!item) {
    return { itemMod: 0, aeMod: 0, total: 0, itemLabel: "Weapon Attack Mod", aeLabel: "Attack Bonus" };
  }

  const effectiveActor = actor || item.actor || item.parent || null;
  let itemMod = 0;

  // 1. Evaluated attackModifierValue from system data model
  if (typeof item.system?.attackModifierValue === "number" && !isNaN(item.system.attackModifierValue) && item.system.attackModifierValue !== 0) {
    itemMod = item.system.attackModifierValue;
  }

  // 2. Raw attackModifier field
  if (itemMod === 0) {
    const rawMod = item.system?.attackModifier ?? item.flags?.["mythcraft-essence-sheet"]?.attackModifier;
    if (typeof rawMod === "number" && !isNaN(rawMod)) {
      itemMod = rawMod;
    } else if (typeof rawMod === "string" && rawMod.trim()) {
      const clean = rawMod.trim();
      const num = parseSignedNumber(clean, NaN);
      if (!isNaN(num) && num !== 0) {
        itemMod = num;
      } else if (globalThis.mythcraft?.utils?.evaluateFormula && effectiveActor) {
        try {
          const evaled = Number(mythcraft.utils.evaluateFormula(clean, effectiveActor.getRollData?.() || {}));
          if (!isNaN(evaled) && evaled !== 0) itemMod = evaled;
        } catch (e) {}
      }
    }
  }

  // 3. System attackBonus / toHit / attackMod / modifier / bonus fallbacks
  if (itemMod === 0) {
    const fallbacks = [
      item.system?.attackBonus,
      item.system?.toHit,
      item.system?.attackMod,
      item.system?.modifier,
      item.system?.bonus,
      item.flags?.["mythcraft-essence-sheet"]?.attackBonus,
      item.flags?.["mythcraft-essence-sheet"]?.attackModifier,
      item.flags?.["mythcraft"]?.attackBonus,
      item.flags?.["mythcraft"]?.attackModifier,
    ];
    for (const fb of fallbacks) {
      if (fb !== undefined && fb !== null && fb !== "") {
        const parsed = parseSignedNumber(fb, NaN);
        if (!isNaN(parsed) && parsed !== 0) {
          itemMod = parsed;
          break;
        }
      }
    }
  }

  // 4. Embedded Active Effects on the item itself (if any modify attack)
  if (item.effects?.size || (Array.isArray(item.effects) && item.effects.length)) {
    for (const eff of item.effects) {
      if (eff.disabled) continue;
      for (const change of eff.changes || []) {
        const k = String(change.key || "").toLowerCase();
        if (k.includes("attack") && !k.includes("damage") && !k.includes("spell")) {
          const val = parseSignedNumber(change.value, 0);
          if (val !== 0) itemMod += val;
        }
      }
    }
  }

  // 5. Active Effects & Actor-level weapon attack bonuses
  let aeMod = 0;
  if (effectiveActor) {
    const aeBonuses = getActorActiveEffectBonuses(effectiveActor);
    const weaponAe = Number(aeBonuses?.weaponAttackBonus || 0);
    const allAe = Number(aeBonuses?.allAttackBonus || 0);
    aeMod = weaponAe + allAe;

    // Direct actor system attack bonuses (if not already handled in aeBonuses)
    if (!weaponAe && !allAe) {
      const sysBonuses = [
        effectiveActor.system?.bonuses?.attack?.weapon,
        effectiveActor.system?.bonuses?.weapon?.attack,
        effectiveActor.system?.bonuses?.attack?.all,
        effectiveActor.system?.bonuses?.attack,
        effectiveActor.system?.attackBonus,
      ];
      for (const sb of sysBonuses) {
        if (sb !== undefined && sb !== null && sb !== "") {
          const num = parseSignedNumber(sb, 0);
          if (num !== 0) {
            aeMod += num;
            break;
          }
        }
      }
    }
  }

  const itemLabel = item.name ? `${item.name} Attack Mod` : "Weapon Attack Mod";
  const aeLabel = "Attack Bonus";

  return {
    itemMod,
    aeMod,
    total: itemMod + aeMod,
    itemLabel,
    aeLabel,
  };
}

/**
 * Safely extracts and resolves the weapon attack modifier (from item schema, formulas, flags, active effects, or fallbacks).
 * @param {Item} item
 * @param {Actor} [actor=null]
 * @returns {number}
 */
export function getWeaponAttackModifier(item, actor = null) {
  return getWeaponAttackModifierDetails(item, actor).total;
}

/**
 * Safely extracts and resolves the weapon damage modifier (from item schema, formulas, flags, or fallbacks).
 * @param {Item} item
 * @param {Actor} [actor=null]
 * @returns {number}
 */
export function getWeaponDamageModifier(item, actor = null) {
  if (!item) return 0;

  // 1. Evaluated damageModifierValue
  if (typeof item.system?.damageModifierValue === "number" && !isNaN(item.system.damageModifierValue) && item.system.damageModifierValue !== 0) {
    return item.system.damageModifierValue;
  }

  const effectiveActor = actor || item.actor || item.parent || null;

  // 2. Raw damageModifier field
  const rawMod = item.system?.damageModifier ?? item.flags?.["mythcraft-essence-sheet"]?.damageModifier;
  if (typeof rawMod === "number" && !isNaN(rawMod)) return rawMod;
  if (typeof rawMod === "string" && rawMod.trim()) {
    const parsed = parseSignedNumber(rawMod.trim(), NaN);
    if (!isNaN(parsed) && parsed !== 0) return parsed;
    if (globalThis.mythcraft?.utils?.evaluateFormula && effectiveActor) {
      try {
        const evaled = Number(mythcraft.utils.evaluateFormula(rawMod, effectiveActor.getRollData?.() || {}));
        if (!isNaN(evaled)) return evaled;
      } catch (e) {}
    }
  }

  // 3. Fallbacks: damageBonus, damageMod, modifier, bonus
  const fallbacks = [
    item.system?.damageBonus,
    item.system?.damageMod,
    item.system?.modifier,
    item.system?.bonus,
    item.flags?.["mythcraft-essence-sheet"]?.damageBonus,
    item.flags?.["mythcraft"]?.damageBonus,
  ];
  for (const fb of fallbacks) {
    if (fb !== undefined && fb !== null && fb !== "") {
      const parsed = parseSignedNumber(fb, NaN);
      if (!isNaN(parsed) && parsed !== 0) return parsed;
    }
  }

  return 0;
}

/**
 * Calculates effective weapon damage formula including Brass Knuckles unarmed/natural weapon die progression,
 * assigned attribute modifiers, Affinity bonus, and 2H grip mode.
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {{ baseFormula: string, effectiveFormula: string, damageType: string, attrKey: string, attrMod: number, itemDmgMod: number, affinityBonus: number, totalMod: number, isTwoHandedGrip: boolean, isBrassKnucklesBoosted: boolean }}
 */
export function getWeaponDamageData(actor, weapon) {
  const isBK = isBrassKnuckles(weapon);
  const isUnarmedOrNat = !isBK && isUnarmedOrNaturalWeapon(weapon);
  const rawCleanFormula = getCleanWeaponRawFormula(weapon);

  let baseFormula = rawCleanFormula || "1d4";
  let isBrassKnucklesBoosted = false;

  if (isBK) {
    // *Brass Knuckles:
    // "Your unarmed and natural weapon damage increases by one die size (e.g., from 1d4 to 1d6, max 1d12).
    //  If you did not have an unarmed damage die, it becomes 1d4."
    const actorBaseDie = getActorBaseUnarmedDie(actor, weapon);
    const steppedDie = stepUpDieFormula(actorBaseDie, 1); // null -> "1d4", "1d4" -> "1d6", ..., max "1d12"

    // If user manually entered a higher die (> 1d4) directly onto the Brass Knuckles item, respect whichever is higher
    const ownDie = parseDieTerm(rawCleanFormula);
    const steppedParsed = parseDieTerm(steppedDie);
    if (ownDie && ownDie.faces > 4 && steppedParsed && ownDie.faces > steppedParsed.faces) {
      baseFormula = `${ownDie.count}d${Math.min(12, ownDie.faces)}`;
    } else {
      baseFormula = steppedDie;
    }
    isBrassKnucklesBoosted = true;
  } else if (isUnarmedOrNat) {
    // Unarmed or Natural Weapon item on the actor
    const actorBaseDie = getActorBaseUnarmedDie(actor, weapon);
    const ownDie = parseDieTerm(rawCleanFormula);
    const traitDie = parseDieTerm(actorBaseDie);

    let preBkFormula = rawCleanFormula;
    if (traitDie && (!ownDie || traitDie.faces > ownDie.faces)) {
      preBkFormula = actorBaseDie;
    }

    if (actorHasActiveBrassKnuckles(actor)) {
      baseFormula = stepUpDieFormula(preBkFormula, 1);
      isBrassKnucklesBoosted = true;
    } else {
      baseFormula = preBkFormula || "1d4";
    }
  } else {
    const effectiveGrip = getWeaponEffectiveGrip(weapon);
    if (effectiveGrip === "2h") {
      const twoHandedFormula = getTwoHandedBaseFormula(weapon);
      if (twoHandedFormula) {
        baseFormula = twoHandedFormula;
      }
    }
  }

  const effectiveGrip = getWeaponEffectiveGrip(weapon);
  const isTwoHandedGrip = !isBK && !isUnarmedOrNat && effectiveGrip === "2h";

  // Determine weapon damage type (Brass Knuckles and Unarmed default to "blunt")
  const sys = weapon?.system || {};
  const rawDmgType =
    sys.damageType ||
    (typeof sys.damage?.type === "string" ? sys.damage.type : null) ||
    (Array.isArray(sys.damage?.types) && sys.damage.types[0]) ||
    (Array.isArray(sys.damage) && (sys.damage[0]?.type || sys.damage[0]?.types?.[0])) ||
    null;
  const defaultDmgType = (isBK || /\b(?:unarmed|fist|knuckle|slam|hooves|club|mace|hammer|staff|quarterstaff|flail|sling)\b/i.test(weapon?.name || ""))
    ? "blunt"
    : "sharp";
  const damageType = String(rawDmgType || defaultDmgType).toLowerCase().trim();

  // Check if weapon has an attribute explicitly assigned (or resolve STR/DEX for Brass Knuckles / Unarmed / Light)
  let rawAttr = (weapon?._essenceOriginalAttr !== undefined ? weapon._essenceOriginalAttr : (weapon?.system?.attr || "")).toLowerCase().trim();
  if (rawAttr.startsWith("my")) rawAttr = rawAttr.replace(/^mythcraft\.attributes\./i, "");

  const validAttrs = new Set(["str", "dex", "end", "awr", "int", "cha", "luck", "cor"]);
  if (!validAttrs.has(rawAttr) && (isBK || isUnarmedOrNat || isWeaponLight(weapon))) {
    const actorAttrs = actor?.system?.attributes || {};
    const strVal = Number(actorAttrs.str?.value ?? actorAttrs.str ?? 0);
    const dexVal = Number(actorAttrs.dex?.value ?? actorAttrs.dex ?? 0);
    rawAttr = dexVal > strVal ? "dex" : "str";
  }

  const hasValidAttr = validAttrs.has(rawAttr);

  const autoAttrMod = getSetting("weaponDamageAttrModifier", true);
  let attrMod = 0;
  if (autoAttrMod && weapon?.type === "weapon" && hasValidAttr) {
    const actorAttrs = actor?.system?.attributes || {};
    const rawVal = actorAttrs[rawAttr];
    attrMod = Number(typeof rawVal === "object" && rawVal !== null ? (rawVal.value ?? 0) : (rawVal ?? 0));
  }

  // Weapon's own damage modifier (damageModifier / damageBonus)
  const itemDmgMod = getWeaponDamageModifier(weapon, actor);

  // Affinity bonus (+3) is ONLY applied if the weapon/spell explicitly has Affinity enabled on it
  const hasItemAffinity = weapon?.system?.hasAffinity === true || 
                          weapon?.flags?.["mythcraft-essence-sheet"]?.hasAffinity === true ||
                          weapon?.system?.affinity === true;
  const affinityBonus = hasItemAffinity ? 3 : 0;

  const aeDmg = actor ? getCombinedDamageBonusFormula(actor, "weapon") : { flat: 0, dice: [], formulaSuffix: "" };
  const totalMod = attrMod + itemDmgMod + affinityBonus + (aeDmg.flat || 0);

  let effectiveFormula = baseFormula;
  if (totalMod > 0) {
    effectiveFormula = `${baseFormula} + ${totalMod}`;
  } else if (totalMod < 0) {
    effectiveFormula = `${baseFormula} - ${Math.abs(totalMod)}`;
  }
  if (aeDmg.dice?.length) {
    effectiveFormula = `${effectiveFormula} + ${aeDmg.dice.join(" + ")}`;
  }

  return {
    baseFormula,
    effectiveFormula,
    damageType,
    attrKey: hasValidAttr ? rawAttr : "",
    attrMod,
    itemDmgMod,
    affinityBonus,
    aeDamageBonus: aeDmg,
    totalMod,
    isTwoHandedGrip,
    isBrassKnucklesBoosted,
  };
}

/**
 * Evaluates an actor's defense formula (e.g. "10 + @DEX", "10 + @INT", "15", "10 + max(@INT, @DEX)").
 * Supports @ATTR tokens for any standard or custom attribute, flat numbers, and arithmetic expressions.
 * @param {string|number} formula
 * @param {object} rollData
 * @param {string} [defaultFormula="10"]
 * @returns {number}
 */
export function evaluateDefenseFormula(formula, rollData = {}, defaultFormula = "10") {
  if (formula === null || formula === undefined || String(formula).trim() === "") {
    formula = defaultFormula;
  }
  const str = String(formula).trim();
  if (/^-?\d+$/.test(str)) return Number(str);

  let normalized = str;

  // Replace @ATTR references with their numeric values
  normalized = normalized.replace(/@([a-zA-Z0-9_.]+)/g, (match, key) => {
    const lowerKey = key.toLowerCase();
    const upperKey = key.toUpperCase();

    if (rollData[upperKey] !== undefined) return String(rollData[upperKey]);
    if (rollData[lowerKey] !== undefined) return String(rollData[lowerKey]);
    if (rollData[key] !== undefined) return String(rollData[key]);

    if (rollData.attributes) {
      if (rollData.attributes[lowerKey] !== undefined) {
        const val = rollData.attributes[lowerKey];
        return String(typeof val === "object" && val !== null ? (val.value ?? 0) : val);
      }
      if (rollData.attributes[upperKey] !== undefined) {
        const val = rollData.attributes[upperKey];
        return String(typeof val === "object" && val !== null ? (val.value ?? 0) : val);
      }
    }

    const nested = foundry?.utils?.getProperty ? foundry.utils.getProperty(rollData, key) : undefined;
    if (nested !== undefined) return String(nested);

    return "0";
  });

  try {
    const sanitized = normalized
      .replace(/max\(/g, "Math.max(")
      .replace(/min\(/g, "Math.min(")
      .replace(/floor\(/g, "Math.floor(")
      .replace(/ceil\(/g, "Math.ceil(")
      .replace(/abs\(/g, "Math.abs(");
    if (/^[0-9+\-*/().,\sMathmaxinflecb]+$/.test(sanitized)) {
      const result = new Function("return (" + sanitized + ");")();
      return typeof result === "number" && !isNaN(result) ? result : 10;
    }
  } catch (err) {
    console.warn(`[MythCraft Essence] Failed to evaluate defense formula: "${formula}"`, err);
  }

  return 10;
}

/**
 * Calculates and applies effective Armor Rating (AR), Defenses (REF, FORT, ANT, LOG, WILL),
 * and Movement speeds based on donned armor, shields, and equipped enhancements.
 * @param {Actor} actor
 */
export function applyEffectiveArmorAndDefenses(actor) {
  if (!actor || !actor.system) return;

  const donnedArmor = getDonnedArmor(actor);
  const equippedEnhancement = getEquippedEnhancement(actor);
  const armorAuto = getSetting("armorAutomation", true);

  if (armorAuto) {
    if (!actor.system.defenses) actor.system.defenses = {};

    const baseDex = Number(actor.system.attributes?.dex ?? 0);

    const aeBonuses = getActorActiveEffectBonuses(actor);
    const allDefDelta = Number(aeBonuses.allDefensesDelta || 0);
    const physDefDelta = Number(aeBonuses.physicalDefensesDelta || 0);
    const mentDefDelta = Number(aeBonuses.mentalDefensesDelta || 0);

    const bonusAr = (Number(actor.system.bonuses?.ar) || 0) + (aeBonuses.directDefenses?.ar || 0) + (aeBonuses.formulaDefenseBonuses?.ar || 0) + allDefDelta + physDefDelta;
    const bonusRef = (Number(actor.system.bonuses?.ref) || 0) + (aeBonuses.directDefenses?.ref || 0) + (aeBonuses.formulaDefenseBonuses?.ref || 0) + allDefDelta + physDefDelta;
    const bonusFort = (Number(actor.system.bonuses?.fort) || 0) + (aeBonuses.directDefenses?.fort || 0) + (aeBonuses.formulaDefenseBonuses?.fort || 0) + allDefDelta + physDefDelta;
    const bonusAnt = (Number(actor.system.bonuses?.ant) || 0) + (aeBonuses.directDefenses?.ant || 0) + (aeBonuses.formulaDefenseBonuses?.ant || 0) + allDefDelta + mentDefDelta;
    const bonusLog = (Number(actor.system.bonuses?.log) || 0) + (aeBonuses.directDefenses?.log || 0) + (aeBonuses.formulaDefenseBonuses?.log || 0) + allDefDelta + mentDefDelta;
    const bonusWill = (Number(actor.system.bonuses?.will) || 0) + (aeBonuses.directDefenses?.will || 0) + (aeBonuses.formulaDefenseBonuses?.will || 0) + allDefDelta + mentDefDelta;

    // Calculate equipped shields additional armor and defense modifiers
    const equippedShields = getEquippedShields(actor);
    let shieldArBonus = 0;
    let shieldRefBonus = 0;
    let shieldFortBonus = 0;
    let shieldAntBonus = 0;
    let shieldLogBonus = 0;
    let shieldWillBonus = 0;

    for (const shield of equippedShields) {
      shieldArBonus += getShieldArBonus(shield);
      const sDefs = shield.system?.defenses || {};
      if (sDefs.ref) shieldRefBonus += parseSignedNumber(sDefs.ref);
      if (sDefs.fort) shieldFortBonus += parseSignedNumber(sDefs.fort);
      if (sDefs.ant) shieldAntBonus += parseSignedNumber(sDefs.ant);
      if (sDefs.log) shieldLogBonus += parseSignedNumber(sDefs.log);
      if (sDefs.will) shieldWillBonus += parseSignedNumber(sDefs.will);
    }

    // Calculate equipped enhancement defense bonuses and penalties
    let enhArBonus = 0;
    let enhRefBonus = 0;
    let enhFortBonus = 0;
    let enhAntBonus = 0;
    let enhLogBonus = 0;
    let enhWillBonus = 0;
    let enhDexMaxPenalty = 0;

    if (equippedEnhancement) {
      const eSys = equippedEnhancement.system || {};
      enhArBonus = parseSignedNumber(eSys.ar ?? eSys.arBonus, 0);
      const eDefs = eSys.defenses || {};
      if (eDefs.ref) enhRefBonus += parseSignedNumber(eDefs.ref);
      if (eDefs.fort) enhFortBonus += parseSignedNumber(eDefs.fort);
      if (eDefs.ant) enhAntBonus += parseSignedNumber(eDefs.ant);
      if (eDefs.log) enhLogBonus += parseSignedNumber(eDefs.log);
      if (eDefs.will) enhWillBonus += parseSignedNumber(eDefs.will);
      enhDexMaxPenalty = parseSignedNumber(eSys.dexMax ?? eSys.dexMaxPenalty ?? eSys.dexMaxMod, 0);
    }

    // DEX Max calculation:
    // "Add your enhancement’s defense bonuses, STR mins, and DEX max penalties to your suit of armor. If your armor had no DEX max, then subtract the enhancement’s DEX max from 12."
    let effectiveDexMax = null;
    if (donnedArmor && donnedArmor.system?.dexMax !== undefined && donnedArmor.system?.dexMax !== null && String(donnedArmor.system.dexMax).trim() !== "") {
      const baseArmorDexMax = parseSignedNumber(donnedArmor.system.dexMax, 0);
      effectiveDexMax = Math.max(0, baseArmorDexMax - enhDexMaxPenalty);
    } else if (enhDexMaxPenalty > 0) {
      effectiveDexMax = Math.max(0, 12 - enhDexMaxPenalty);
    }

    const dexMaxAuto = getSetting("armorDexMaxAutomation", true);
    let effectiveDex = baseDex;
    if (dexMaxAuto && effectiveDexMax !== null && effectiveDex > effectiveDexMax) {
      effectiveDex = effectiveDexMax;
    }

    // Prepare isolated roll data for defense formula evaluation
    const rawRollData = typeof actor.getRollData === "function" ? actor.getRollData() : (actor.system || {});
    const defenseRollData = { ...rawRollData, attributes: {} };

    for (const [k, v] of Object.entries(actor.system.attributes || {})) {
      const num = typeof v === "object" && v !== null ? Number(v.value ?? 0) : Number(v ?? 0);
      const lower = k.toLowerCase();
      const upper = k.toUpperCase();
      defenseRollData[lower] = num;
      defenseRollData[upper] = num;
      defenseRollData.attributes[lower] = num;
      defenseRollData.attributes[upper] = num;
    }

    // Apply effective (clamped) DEX for Reflexes formula evaluation (or LUCK if refUseLuck is active and higher)
    let refDexVal = effectiveDex;
    if (aeBonuses.refUseLuck) {
      const luckVal = Number(defenseRollData.luck ?? 0);
      const clampedLuck = (dexMaxAuto && effectiveDexMax !== null && luckVal > effectiveDexMax) ? effectiveDexMax : luckVal;
      if (clampedLuck > refDexVal) refDexVal = clampedLuck;
    }
    defenseRollData.dex = refDexVal;
    defenseRollData.DEX = refDexVal;
    defenseRollData.attributes.dex = refDexVal;
    defenseRollData.attributes.DEX = refDexVal;

    // Retrieve the base formula/value stored in actor _source
    const sourceDefs = actor.system._source?.defenses || actor._source?.system?.defenses || actor.system.defenses || {};
    const refFormula = sourceDefs.ref ?? "10 + @DEX";
    const fortFormula = sourceDefs.fort ?? "10 + @END";
    const antFormula = sourceDefs.ant ?? "10 + @AWR";
    const logFormula = sourceDefs.log ?? "10 + @INT";
    const willFormula = sourceDefs.will ?? "10 + @CHA";
    const arFormula = sourceDefs.ar ?? "10";

    const baseRef = evaluateDefenseFormula(refFormula, defenseRollData, "10 + @DEX");
    const baseFort = evaluateDefenseFormula(fortFormula, defenseRollData, "10 + @END");
    const baseAnt = evaluateDefenseFormula(antFormula, defenseRollData, "10 + @AWR");
    const baseLog = evaluateDefenseFormula(logFormula, defenseRollData, "10 + @INT");
    const baseWill = evaluateDefenseFormula(willFormula, defenseRollData, "10 + @CHA");

    if (donnedArmor) {
      const armorSys = donnedArmor.system || {};

      // 1. Armor Rating (AR)
      const armorAR = armorSys.ar !== undefined && armorSys.ar !== null ? parseSignedNumber(armorSys.ar, 10) : 10;
      actor.system.defenses.ar = armorAR + bonusAr + shieldArBonus + enhArBonus;

      // 2. Defense Modifiers (REF, FORT, ANT, LOG, WILL)
      const armorDefs = armorSys.defenses || {};
      const refMod = parseSignedNumber(armorDefs.ref, 0);
      const fortMod = parseSignedNumber(armorDefs.fort, 0);
      const antMod = parseSignedNumber(armorDefs.ant, 0);
      const logMod = parseSignedNumber(armorDefs.log, 0);
      const willMod = parseSignedNumber(armorDefs.will, 0);

      actor.system.defenses.ref = baseRef + bonusRef + refMod + shieldRefBonus + enhRefBonus;
      actor.system.defenses.fort = baseFort + bonusFort + fortMod + shieldFortBonus + enhFortBonus;
      actor.system.defenses.ant = baseAnt + bonusAnt + antMod + shieldAntBonus + enhAntBonus;
      actor.system.defenses.log = baseLog + bonusLog + logMod + shieldLogBonus + enhLogBonus;
      actor.system.defenses.will = baseWill + bonusWill + willMod + shieldWillBonus + enhWillBonus;
    } else {
      // Unarmored: Recalculate baseline 10 + attributes + bonuses + shield & enhancement additional armor
      let baseAR = evaluateDefenseFormula(arFormula, defenseRollData, "10");
      if (Array.isArray(aeBonuses.unarmoredArSub) && aeBonuses.unarmoredArSub.length > 0 && String(arFormula).trim() === "10") {
        let bestSub = 0;
        for (const subAttr of aeBonuses.unarmoredArSub) {
          const val = Number(defenseRollData[subAttr.toLowerCase()] ?? 0);
          if (val > bestSub) bestSub = val;
        }
        baseAR += bestSub;
      }
      actor.system.defenses.ar = baseAR + bonusAr + shieldArBonus + enhArBonus;
      actor.system.defenses.ref = baseRef + bonusRef + shieldRefBonus + enhRefBonus;
      actor.system.defenses.fort = baseFort + bonusFort + shieldFortBonus + enhFortBonus;
      actor.system.defenses.ant = baseAnt + bonusAnt + shieldAntBonus + enhAntBonus;
      actor.system.defenses.log = baseLog + bonusLog + shieldLogBonus + enhLogBonus;
      actor.system.defenses.will = baseWill + bonusWill + shieldWillBonus + enhWillBonus;
    }

    // Apply any explicit Active Effect overrides on individual defenses
    for (const defKey of ["ar", "ref", "fort", "ant", "log", "will"]) {
      if (aeBonuses.directDefenseOverrides?.[defKey] !== null && aeBonuses.directDefenseOverrides?.[defKey] !== undefined) {
        actor.system.defenses[defKey] = aeBonuses.directDefenseOverrides[defKey];
      }
    }
  }

  // 4. Speed & STR Minimum (Combine donned armor, enhancement STR min, and Active Effect speed modifiers)
  const aeSpeed = getActorActiveEffectBonuses(actor);
  const enhStrMin = parseSignedNumber(equippedEnhancement?.system?.strMin ?? equippedEnhancement?.system?.strMinMod, 0);
  const armorStrMin = donnedArmor ? parseSignedNumber(donnedArmor.system?.strMin, 0) : 0;
  const totalStrMin = Math.max(0, armorStrMin + enhStrMin);

  if (actor.system?.movement) {
    if (typeof actor.system.movement === "object" && actor.system.movement !== null) {
      const rawSourceWalk = actor.system._source?.movement?.walk ?? actor._source?.system?.movement?.walk;
      let computedWalk = (rawSourceWalk !== undefined && rawSourceWalk !== null && !isNaN(Number(rawSourceWalk)))
        ? Number(rawSourceWalk)
        : (Number(actor.system.movement.walk) || 20);

      if (aeSpeed.walkOverride !== null && aeSpeed.walkOverride !== undefined) {
        computedWalk = aeSpeed.walkOverride;
      } else {
        computedWalk = (computedWalk + (aeSpeed.walkAdd || 0)) * (aeSpeed.walkMultiply ?? 1);
      }
      if (aeSpeed.walkUpgrade !== null && aeSpeed.walkUpgrade !== undefined) {
        computedWalk = Math.max(computedWalk, aeSpeed.walkUpgrade);
      }
      if (aeSpeed.walkDowngrade !== null && aeSpeed.walkDowngrade !== undefined) {
        computedWalk = Math.min(computedWalk, aeSpeed.walkDowngrade);
      }

      if (donnedArmor || equippedEnhancement) {
        const strMinAuto = getSetting("armorStrMinAutomation", true);
        const rawAttrStr = actor.system?.attributes?.str;
        const actorStr = typeof rawAttrStr === "object" && rawAttrStr !== null ? Number(rawAttrStr.value ?? 0) : Number(rawAttrStr ?? 0);

        if (strMinAuto && totalStrMin > 0 && actorStr < totalStrMin) {
          computedWalk = 0;
        } else {
          const speedPenaltyAuto = getSetting("armorSpeedPenaltyAutomation", true);
          const isHeavy = donnedArmor && getArmorCategory(donnedArmor) === "heavy";
          const armorSpeedPenalty = (donnedArmor && !(isHeavy && aeSpeed.ignoreHeavyArmorPenalty))
            ? parseSignedNumber(donnedArmor.system?.speedPenalty, 0)
            : 0;
          const enhSpeedPenalty = equippedEnhancement ? parseSignedNumber(equippedEnhancement.system?.speedPenalty ?? equippedEnhancement.system?.speedPenaltyMod, 0) : 0;
          const penalty = Math.max(0, armorSpeedPenalty + enhSpeedPenalty);
          if (speedPenaltyAuto && penalty > 0) {
            computedWalk = Math.max(0, computedWalk - penalty);
          }
        }
      }

      actor.system.movement.walk = Math.max(0, Math.round(computedWalk));
    } else if (typeof actor.system.movement === "string") {
      // NPC movement string format (e.g. "Walk 20 ft.", "30 ft.")
      const match = actor.system.movement.match(/(\d+)\s*ft/i);
      if (match) {
        const baseSpeed = Number(match[1]);
        let computed = baseSpeed;
        if (aeSpeed.walkOverride !== null && aeSpeed.walkOverride !== undefined) {
          computed = aeSpeed.walkOverride;
        } else {
          computed = (computed + (aeSpeed.walkAdd || 0)) * (aeSpeed.walkMultiply ?? 1);
        }
        if (aeSpeed.walkUpgrade !== null && aeSpeed.walkUpgrade !== undefined) {
          computed = Math.max(computed, aeSpeed.walkUpgrade);
        }
        if (aeSpeed.walkDowngrade !== null && aeSpeed.walkDowngrade !== undefined) {
          computed = Math.min(computed, aeSpeed.walkDowngrade);
        }
        if (computed !== baseSpeed) {
          actor.system.movement = actor.system.movement.replace(/\d+\s*ft/i, `${Math.max(0, Math.round(computed))} ft`);
        }
      }
    }
  }
}

/**
 * Check and enforce armor strength requirements
 * @param {Actor} actor
 * @param {Item|null} [donnedArmor]
 * @param {Item|null} [equippedEnhancement]
 */
export async function syncArmorStrConditions(actor, donnedArmor, equippedEnhancement) {
  if (!actor || !getSetting("armorStrMinAutomation", true)) return;

  const armor = donnedArmor !== undefined ? donnedArmor : getDonnedArmor(actor);
  const enh = equippedEnhancement !== undefined ? equippedEnhancement : getEquippedEnhancement(actor);

  const armorStrMin = armor ? parseSignedNumber(armor.system?.strMin, 0) : 0;
  const enhStrMin = enh ? parseSignedNumber(enh.system?.strMin ?? enh.system?.strMinMod, 0) : 0;
  const totalStrMin = Math.max(0, armorStrMin + enhStrMin);

  const actorStr = Number(actor.system?.attributes?.str ?? 0);
  const isStrFailed = !!((armor || enh) && totalStrMin > 0 && actorStr < totalStrMin);

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
 * Synchronizes in-memory damage formulas and attributes for Brass Knuckles and Unarmed / Natural Weapons
 * during Actor.prepareDerivedData so that external HUDs, macros, and system rolls see the valid formula.
 * @param {Actor} actor
 */
export function applyEffectiveBrassKnucklesDamage(actor) {
  if (!actor?.items) return;
  for (const item of actor.items) {
    if (!item || item.type !== "weapon") continue;
    if (!isBrassKnuckles(item) && !isUnarmedOrNaturalWeapon(item)) continue;

    if (item._essenceOriginalDamageFormula === undefined) {
      item._essenceOriginalDamageFormula =
        item._source?.system?.damage?.[0]?.formula ??
        item._source?.system?.damage?.formula ??
        item._source?.system?.damageFormula ??
        item.system?.damage?.formula ??
        item.system?.damageFormula ??
        (Array.isArray(item.system?.damage) ? (item.system.damage[0]?.formula ?? "") : "");
    }
    if (item._essenceOriginalAttr === undefined) {
      item._essenceOriginalAttr = item._source?.system?.attr ?? item.system?.attr ?? "";
    }

    const wData = getWeaponDamageData(actor, item);
    if (item.system) {
      if (!item.system.attr && wData.attrKey) {
        item.system.attr = wData.attrKey;
      }
      if (Array.isArray(item.system.damage)) {
        if (item.system.damage.length === 0) {
          item.system.damage = [{ formula: wData.baseFormula, type: wData.damageType }];
        } else {
          item.system.damage[0] = {
            ...item.system.damage[0],
            formula: wData.baseFormula,
            type: item.system.damage[0]?.type || wData.damageType,
          };
        }
      }
    }
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
        applyEffectiveBrassKnucklesDamage(this);
        // Ensure starting, equipment, and talent items have mapped icons instead of default placeholders
        if (this.items) {
          for (const item of this.items) {
            if (isDefaultIcon(item.img)) {
              const resolved = resolveItemIcon(item, item.img, item.type);
              if (resolved && resolved !== item.img) {
                item.img = resolved;
              }
            }
          }
        }
      }
    };
  };

  // Automatically overwrite generic default placeholder icons on created items
  Hooks.on("preCreateItem", (itemDoc, data, options, userId) => {
    if (isDefaultIcon(itemDoc.img)) {
      const resolved = resolveItemIcon(itemDoc, itemDoc.img, itemDoc.type);
      if (resolved && !isDefaultIcon(resolved)) {
        itemDoc.updateSource({ img: resolved });
      }
    }
  });

  // Prompt Second Skin choice dialog when a Second Skin talent is created on a character sheet
  Hooks.on("createItem", (itemDoc, options, userId) => {
    if (userId !== game.user?.id) return;
    if (itemDoc.parent?.type !== "character") return;
    if (getSetting("secondSkinRuleVariant", "raw") !== "raw") return;

    if (isSecondSkinTalent(itemDoc) && !itemDoc.flags?.["mythcraft-essence-sheet"]?.secondSkinArmor) {
      setTimeout(() => {
        SecondSkinChoiceDialog.promptChoice(itemDoc);
      }, 150);
    }
  });

  patchWeaponApcGetter();
  patchActorDerivedData(CONFIG.Actor?.documentClass);
}

/**
 * Robustly patch WeaponModel.prototype.apc across all registries
/**
 * Safely and accurately evaluates weapon APC formulas including math expressions
 * like "max(2, 4-@STR)", "4-STR, min 2", "max(2, 4-@attributes.str)", or plain numbers.
 * @param {string|number} formula
 * @param {Actor|object} [actorOrRollData]
 * @returns {number}
 */
export function evaluateApcFormula(formula, actorOrRollData) {
  if (typeof formula === "number") return formula;
  if (!formula || typeof formula !== "string") return 0;
  let trimmed = formula.trim().replace(/^(?:apc|ap)\s*[:=]?\s*/i, "").trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  // Convert "X - STR, min Y" or "X - STR (min Y)" or "X - STR, min: Y" format to "max(Y, X - @STR)"
  const minMatch = trimmed.match(/^(.+?)(?:,|\()?\s*min(?:imum)?\s*[:=]?\s*(\d+)\)?$/i);
  if (minMatch) {
    trimmed = `max(${minMatch[2]}, ${minMatch[1].replace(/\($/, "").trim()})`;
  }

  // Get rollData object
  let rollData = {};
  if (actorOrRollData) {
    if (typeof actorOrRollData.getRollData === "function") {
      rollData = actorOrRollData.getRollData();
    } else {
      rollData = actorOrRollData;
    }
  }

  // Add uppercase and lowercase aliases for attributes in rollData
  const attrs = rollData?.attributes || {};
  const data = {
    ...rollData,
    STR: attrs?.str?.value ?? attrs?.str ?? rollData?.str ?? 0,
    DEX: attrs?.dex?.value ?? attrs?.dex ?? rollData?.dex ?? 0,
    END: attrs?.end?.value ?? attrs?.end ?? rollData?.end ?? 0,
    AWR: attrs?.awr?.value ?? attrs?.awr ?? rollData?.awr ?? 0,
    INT: attrs?.int?.value ?? attrs?.int ?? rollData?.int ?? 0,
    CHA: attrs?.cha?.value ?? attrs?.cha ?? rollData?.cha ?? 0,
    LUCK: attrs?.luck?.value ?? attrs?.luck ?? rollData?.luck ?? 0,
    COR: attrs?.cor?.value ?? attrs?.cor ?? rollData?.cor ?? 0,
    str: attrs?.str?.value ?? attrs?.str ?? rollData?.str ?? 0,
    dex: attrs?.dex?.value ?? attrs?.dex ?? rollData?.dex ?? 0,
    end: attrs?.end?.value ?? attrs?.end ?? rollData?.end ?? 0,
    awr: attrs?.awr?.value ?? attrs?.awr ?? rollData?.awr ?? 0,
    int: attrs?.int?.value ?? attrs?.int ?? rollData?.int ?? 0,
    cha: attrs?.cha?.value ?? attrs?.cha ?? rollData?.cha ?? 0,
    luck: attrs?.luck?.value ?? attrs?.luck ?? rollData?.luck ?? 0,
    cor: attrs?.cor?.value ?? attrs?.cor ?? rollData?.cor ?? 0,
  };

  // Replace @attributes.<attr>.value, @attributes.<attr>, @STR, and standalone STR / DEX words
  const formatVal = (v) => (typeof v === "number" && v < 0 ? `(${v})` : String(v));
  let replaced = trimmed.replace(/@attributes\.([a-zA-Z]+)(?:\.value)?/gi, (m, k) => {
    const key = k.toUpperCase();
    return formatVal(data[key] ?? 0);
  });
  replaced = replaced.replace(/@([a-zA-Z]+)/gi, (m, k) => {
    const key = k.toUpperCase();
    return formatVal(data[key] ?? 0);
  });
  replaced = replaced.replace(/\b(STR|DEX|END|AWR|INT|CHA|LUCK|COR)\b/gi, (match) => {
    const key = match.toUpperCase();
    return formatVal(data[key] ?? 0);
  });

  if (globalThis.Roll?.replaceFormulaData) {
    replaced = globalThis.Roll.replaceFormulaData(replaced, data);
  }

  // Evaluate mathematical expression (support max, min, floor, ceil, abs, +, -, *, /)
  try {
    const mathExpr = replaced
      .replace(/\bmax\s*\(/gi, "Math.max(")
      .replace(/\bmin\s*\(/gi, "Math.min(")
      .replace(/\bfloor\s*\(/gi, "Math.floor(")
      .replace(/\bceil\s*\(/gi, "Math.ceil(")
      .replace(/\bround\s*\(/gi, "Math.round(");

    // Sanitize string to allow only numbers, Math methods, operators, commas, parentheses, and spaces
    if (/^[0-9\s\+\-\*\/\,\(\)\.\Mathmaxinfloeclrud]+$/.test(mathExpr)) {
      const fn = new Function(`"use strict"; return (${mathExpr});`);
      const result = Number(fn());
      if (!isNaN(result)) return Math.max(0, Math.round(result));
    }
  } catch (err) {
    // Fallback if evaluation fails
  }

  return Number(trimmed) || 0;
}

/**
 * Extracts two-handed APC reduction rules for a Hand-and-a-Half weapon.
 * Handles formats like:
 * • "STR Weapon, Hand-and-a-Half (reduce APC by 1, min 2)"
 * • "Hand-and-a-Half (reduce APC by 1, min 2)"
 * • "Hand-and-a-Half (reduce APC by 1, min 1)"
 * • "Hand-and-a-Half (-1 APC, min 2)"
 * • "Hand-and-a-Half (APC -1, min 2)"
 * • "When wielded with two hands, reduce APC by 1 (min 2)"
 * • "Hand-and-a-Half (2 APC)"
 * @param {Item} weapon
 * @returns {{ reduction: number, minApc: number, overrideApc: number|null }|null}
 */
export function getTwoHandedApcRule(weapon) {
  if (!weapon) return null;

  // 1. Direct flags/system fields
  const flagReduction = weapon.flags?.["mythcraft-essence-sheet"]?.twoHandedApcReduction;
  const flagMin = weapon.flags?.["mythcraft-essence-sheet"]?.twoHandedApcMin;
  const flagOverride = weapon.flags?.["mythcraft-essence-sheet"]?.twoHandedApc;
  if (flagOverride !== undefined && flagOverride !== null && !isNaN(Number(flagOverride))) {
    return { reduction: 0, minApc: 0, overrideApc: Number(flagOverride) };
  }
  if (flagReduction !== undefined && flagReduction !== null && !isNaN(Number(flagReduction))) {
    return { reduction: Number(flagReduction), minApc: Number(flagMin || 2), overrideApc: null };
  }

  // 2. Search tags and description strings
  const rawTags = weapon.system?.tags || [];
  const tagList = Array.isArray(rawTags)
    ? rawTags
    : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "object" && rawTags !== null ? Object.keys(rawTags).concat(Object.values(rawTags)) : String(rawTags).split(",")));
  
  const searchTexts = [];
  for (const t of tagList) {
    const str = typeof t === "string" ? t : (t?.name || t?.label || t?.value || t?.id || "");
    if (str) searchTexts.push(str);
  }

  const desc = String(weapon.system?.description?.value ?? weapon.system?.description ?? "");
  if (desc) searchTexts.push(desc);

  for (const text of searchTexts) {
    // Check "reduce APC by X, min Y" or "reduce APC by X (min Y)" or "reduce the APC by X, min Y"
    const reduceMatch = text.match(/(?:reduce|lower)\s*(?:the\s*)?apc\s*(?:by\s*)?(\d+)?(?:.*?min(?:imum)?\s*[:=]?\s*(\d+))?/i) ||
                        text.match(/(?:reduce|lower)\s*(?:the\s*)?ap\s*(?:cost)?\s*(?:by\s*)?(\d+)?(?:.*?min(?:imum)?\s*[:=]?\s*(\d+))?/i);
    if (reduceMatch) {
      const reduction = reduceMatch[1] ? parseInt(reduceMatch[1], 10) : 1;
      const minApc = reduceMatch[2] ? parseInt(reduceMatch[2], 10) : 2;
      return { reduction, minApc, overrideApc: null };
    }

    // Check "-X APC, min Y" or "APC -X, min Y" or "-X APC (min Y)"
    const minusMatch = text.match(/[+\-]\s*(\d+)\s*(?:apc|ap)(?:.*?min(?:imum)?\s*[:=]?\s*(\d+))?/i) ||
                       text.match(/(?:apc|ap)\s*[+\-]\s*(\d+)(?:.*?min(?:imum)?\s*[:=]?\s*(\d+))?/i);
    if (minusMatch) {
      const reduction = parseInt(minusMatch[1], 10);
      const minApc = minusMatch[2] ? parseInt(minusMatch[2], 10) : 2;
      return { reduction, minApc, overrideApc: null };
    }

    // Check "Hand-and-a-Half (X APC)"
    const directMatch = text.match(/(?:hand(?:-|\s*)(?:and|in)(?:-|\s*)a(?:-|\s*)half|handhalf|1\.5h|two-handed|versatile)[^\(]*\(\s*(\d+)\s*apc\s*\)/i) ||
                        text.match(/(?:hand(?:-|\s*)(?:and|in)(?:-|\s*)a(?:-|\s*)half|handhalf|1\.5h|two-handed|versatile)[^\(]*\(\s*apc\s*[:=]?\s*(\d+)\s*\)/i);
    if (directMatch) {
      const override = parseInt(directMatch[1], 10);
      return { reduction: 0, minApc: 0, overrideApc: override };
    }
  }

  return null;
}

/**
 * Safely parse weapon APC cost, handling base formulas and Hand-and-a-Half 2H APC reductions.
 * @param {Item} item
 * @param {Actor} [actor]
 * @returns {number}
 */
export function getSafeWeaponApc(item, actor) {
  if (!item) return 3;
  const sys = item.system || {};
  const srcSys = item._source?.system || sys._source || {};
  const defaultApc = (isBrassKnuckles(item) || isUnarmedOrNaturalWeapon(item)) ? 2 : 3;

  // Re-entrancy guard to prevent infinite recursion when WeaponModel.prototype.apc getter calls getSafeWeaponApc
  if (item._computingSafeApc || sys._computingSafeApc) {
    const rawSrc = Number(srcSys.apc ?? srcSys.ap);
    return (!isNaN(rawSrc) && rawSrc > 0) ? rawSrc : defaultApc;
  }

  item._computingSafeApc = true;
  if (typeof sys === "object" && sys !== null) sys._computingSafeApc = true;

  try {
    const flagFormula = item.flags?.["mythcraft-essence-sheet"]?.apcFormula;
    // Read own data property on `sys` rather than triggering `WeaponModel.prototype.apc` getter
    const ownSysApcDesc = Object.getOwnPropertyDescriptor(sys, "apc");
    const ownSysApc = ownSysApcDesc && "value" in ownSysApcDesc ? ownSysApcDesc.value : undefined;

    const rawCandidate =
      flagFormula ||
      sys.apcFormula ||
      srcSys.apcFormula ||
      ownSysApc ||
      srcSys.apc ||
      sys.ap ||
      srcSys.ap ||
      "";
    let baseApc = defaultApc;

    if (typeof rawCandidate === "string" && rawCandidate.trim().length > 0) {
      const evaluated = evaluateApcFormula(rawCandidate, actor || item.actor || item.parent);
      if (evaluated > 0) baseApc = evaluated;
    } else if (typeof rawCandidate === "number" && rawCandidate > 0) {
      baseApc = rawCandidate;
    } else {
      // Check description for standard APC formula (e.g. "4-STR, min 3")
      const desc = String(sys.description?.value ?? sys.description ?? "");
      const apcDescMatch = desc.match(/(?:apc|ap)\s*[:=]?\s*([0-9\s\+\-\*\/\@a-zA-Z_.]+(?:,\s*min\s*\d+)?)/i);
      if (apcDescMatch) {
        const evaluated = evaluateApcFormula(apcDescMatch[1], actor || item.actor || item.parent);
        if (evaluated > 0) baseApc = evaluated;
      }
    }

    // Hand-and-a-Half 2H grip APC reduction
    const grip = getWeaponEffectiveGrip(item);
    if (grip === "2h") {
      const apcRule = getTwoHandedApcRule(item);
      if (apcRule) {
        if (apcRule.overrideApc !== null && apcRule.overrideApc > 0) {
          baseApc = apcRule.overrideApc;
        } else if (apcRule.reduction > 0) {
          const minVal = apcRule.minApc ?? 1;
          baseApc = Math.max(minVal, baseApc - apcRule.reduction);
        }
      }
    }

    // Active Effect Weapon APC reduction (Global + Tag/Name Filtered)
    const targetActor = actor || item.actor || item.parent;
    if (targetActor && baseApc > 0) {
      const aeBonuses = getActorActiveEffectBonuses(targetActor);
      const { reduction, minApc } = getWeaponFilteredApcReduction(item, aeBonuses);
      if (reduction !== 0) {
        baseApc = Math.max(Math.min(baseApc, minApc), baseApc - reduction);
      }
    }

    return baseApc;
  } finally {
    delete item._computingSafeApc;
    if (typeof sys === "object" && sys !== null) delete sys._computingSafeApc;
  }
}

/**
 * Robustly patch WeaponModel.prototype.apc across all data model registries.
 */
export function patchWeaponApcGetter() {
  const models = [
    CONFIG.Item?.dataModels?.weapon,
    globalThis.mythcraft?.data?.Item?.WeaponModel,
    globalThis.mythcraft?.data?.Item?.config?.weapon,
    globalThis.CONFIG?.Item?.systemDataModels?.weapon,
  ].filter(Boolean);

  for (const model of models) {
    if (!model?.prototype) continue;
    try {
      Object.defineProperty(model.prototype, "apc", {
        get() {
          if (this._computingSafeApc || this.parent?._computingSafeApc) {
            const raw = Number(this._source?.apc ?? this.parent?._source?.system?.apc);
            return (!isNaN(raw) && raw > 0) ? raw : 2;
          }
          return getSafeWeaponApc(this.parent, this.parent?.actor ?? this.parent);
        },
        configurable: true,
        enumerable: true,
      });
    } catch (error) {
      // Ignore models whose APC getter cannot be redefined.
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
  if (!item || !isWeaponEquippable(item)) return null;

  // Check tags across all possible data shapes (Arrays, Sets, Objects)
  const rawTags = item.system?.tags || [];
  const tagList = Array.isArray(rawTags)
    ? rawTags
    : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "object" && rawTags !== null ? Object.keys(rawTags).concat(Object.values(rawTags)) : String(rawTags).split(",")));

  const tagStrings = [];
  for (const t of tagList) {
    if (!t) continue;
    if (typeof t === "string") tagStrings.push(t);
    else if (typeof t === "object") {
      if (t.id) tagStrings.push(t.id);
      if (t.name) tagStrings.push(t.name);
      if (t.label) tagStrings.push(t.label);
      if (t.key) tagStrings.push(t.key);
      if (t.value && typeof t.value === "string") tagStrings.push(t.value);
    }
  }

  const normalized = tagStrings.map(s => String(s).toLowerCase().replace(/[^a-z0-9]/g, ""));

  if (normalized.some(t => t.includes("twohanded") || t === "2h" || t === "twohand")) return "two-handed";
  if (normalized.some(t => t.includes("handandahalf") || t.includes("handinahalf") || t.includes("versatile") || t === "15h" || t === "handhalf")) return "hand-and-a-half";
  if (normalized.some(t => t.includes("onehanded") || t === "1h" || t === "onehand")) return "one-handed";

  // Description heuristic
  const desc = String(item.system?.description?.value ?? item.system?.description ?? "").toLowerCase();
  if (desc.includes("hand-and-a-half") || desc.includes("hand and a half") || desc.includes("hand-in-a-half") || desc.includes("hand in a half") || desc.includes("handhalf") || desc.includes("1.5h")) {
    return "hand-and-a-half";
  }
  if (desc.includes("two-handed") || desc.includes("two handed") || desc.includes("2h weapon")) {
    return "two-handed";
  }

  // Name heuristic
  const nameLower = (item.name || "").toLowerCase();
  if (nameLower.includes("greatsword") || nameLower.includes("greataxe") || nameLower.includes("greatclub") || nameLower.includes("longbow") || nameLower.includes("heavy crossbow") || nameLower.includes("halberd") || nameLower.includes("pike") || nameLower.includes("polearm") || nameLower.includes("quarterstaff") || nameLower.includes("maul") || nameLower.includes("tetsubo") || nameLower.includes("scythe")) {
    return "two-handed";
  }
  if (nameLower.includes("bastard sword") || nameLower.includes("spear") || nameLower.includes("warhammer") || nameLower.includes("battleaxe") || nameLower.includes("katana") || nameLower.includes("lance")) {
    return "hand-and-a-half";
  }

  return "one-handed";
}

/**
 * Returns the effective grip mode ("1h" or "2h") for a weapon.
 * @param {Item} item
 * @returns {"1h" | "2h"}
 */
export function getWeaponEffectiveGrip(item) {
  const handType = getWeaponHandType(item);
  if (handType === "two-handed") return "2h";
  if (handType === "hand-and-a-half") {
    return item.flags?.["mythcraft-essence-sheet"]?.gripMode === "2h" ? "2h" : "1h";
  }
  return "1h";
}

/**
 * Toggles a Hand-and-a-Half weapon between 1H and 2H grip modes.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function toggleHandAndHalfMode(actor, item) {
  if (!actor || !item) return;
  const currentGrip = getWeaponEffectiveGrip(item);
  const nextGrip = currentGrip === "2h" ? "1h" : "2h";

  const isEquipped = isWeaponEquipped(item);
  if (isEquipped && nextGrip === "2h") {
    // 2H grip: Stow any other equipped weapons AND shields
    const otherEquippedWeapons = actor.items.filter(i => i.type === "weapon" && i.id !== item.id && isWeaponEquipped(i));
    for (const other of otherEquippedWeapons) {
      await other.update({
        "flags.mythcraft-essence-sheet.isEquipped": false,
        "flags.mythcraft-essence-sheet.equippedHand": null,
        "system.equipped": false,
      });
    }
    const equippedShields = actor.items.filter(i => isShield(i) && isShieldEquipped(i));
    for (const shield of equippedShields) {
      await shield.update({
        "flags.mythcraft-essence-sheet.isEquipped": false,
        "flags.mythcraft-essence-sheet.equippedHand": null,
        "system.equipped": false,
      });
    }

    await item.update({
      "flags.mythcraft-essence-sheet.gripMode": "2h",
      "flags.mythcraft-essence-sheet.equippedHand": "both",
    });
    ui.notifications.info(`${item.name} is now gripped Two-Handed (occupies both hands).`);
  } else if (isEquipped && nextGrip === "1h") {
    await item.update({
      "flags.mythcraft-essence-sheet.gripMode": "1h",
      "flags.mythcraft-essence-sheet.equippedHand": "main",
    });
    ui.notifications.info(`${item.name} is now gripped One-Handed (freeing off-hand).`);
  } else {
    await item.update({
      "flags.mythcraft-essence-sheet.gripMode": nextGrip,
    });
  }

  applyEffectiveArmorAndDefenses(actor);
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
  const cleanTags = rawTags.map(t => String(t?.name || t?.label || t?.id || t).toLowerCase().replace(/^mythcraft\.item\.weapon\.tags\./i, ""));
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
  if (isBrassKnuckles(item)) return true;
  return item.system?.equipped === true;
}

/**
 * Toggles weapon equip/stow state, enforcing hand slot rules (1 for 2H, 2 for 1H)
 * and calculating AP cost during active combat turns.
 * @param {Actor} actor
 * @param {Item} item
 * @param {"main"|"off"|null} [targetHand=null]
 * @returns {Promise<void>}
 */
export async function toggleEquipWeapon(actor, item, targetHand = null) {
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
      "flags.mythcraft-essence-sheet.equippedHand": null,
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
    const effectiveGrip = getWeaponEffectiveGrip(item);
    const otherEquippedWeapons = actor.items.filter(i => i.type === "weapon" && i.id !== item.id && isWeaponEquipped(i));
    const equippedShields = actor.items.filter(i => isShield(i) && isShieldEquipped(i));

    if (effectiveGrip === "2h") {
      // 2H occupies both hands: stow all other equipped weapons and shields
      for (const other of otherEquippedWeapons) {
        await other.update({
          "flags.mythcraft-essence-sheet.isEquipped": false,
          "flags.mythcraft-essence-sheet.equippedHand": null,
          "system.equipped": false,
        });
      }
      for (const shield of equippedShields) {
        await shield.update({
          "flags.mythcraft-essence-sheet.isEquipped": false,
          "flags.mythcraft-essence-sheet.equippedHand": null,
          "system.equipped": false,
        });
      }

      await item.update({
        "flags.mythcraft-essence-sheet.isEquipped": true,
        "flags.mythcraft-essence-sheet.equippedHand": "both",
        "system.equipped": true,
      });
    } else {
      // 1H weapon: Stow any 2H weapon currently equipped
      for (const other of otherEquippedWeapons) {
        if (getWeaponEffectiveGrip(other) === "2h") {
          await other.update({
            "flags.mythcraft-essence-sheet.isEquipped": false,
            "flags.mythcraft-essence-sheet.equippedHand": null,
            "system.equipped": false,
          });
        }
      }

      // Collect all occupied hand items
      const allHandItems = [...otherEquippedWeapons, ...equippedShields];
      let assignedHand = targetHand;

      if (!assignedHand) {
        const hasMain = allHandItems.some(i => (i.flags?.["mythcraft-essence-sheet"]?.equippedHand || "main") === "main");
        assignedHand = hasMain ? "off" : "main";
      }

      // If an item is already in assignedHand, or 2 items are already equipped, stow it
      for (const other of allHandItems) {
        const otherHand = other.flags?.["mythcraft-essence-sheet"]?.equippedHand || "main";
        if (otherHand === assignedHand || allHandItems.length >= 2) {
          await other.update({
            "flags.mythcraft-essence-sheet.isEquipped": false,
            "flags.mythcraft-essence-sheet.equippedHand": null,
            "system.equipped": false,
          });
          break;
        }
      }

      await item.update({
        "flags.mythcraft-essence-sheet.isEquipped": true,
        "flags.mythcraft-essence-sheet.equippedHand": assignedHand,
        "system.equipped": true,
      });
    }
  }

  applyEffectiveArmorAndDefenses(actor);
}

/**
 * Toggles shield equip/stow state, enforcing hand slot rules alongside equipped weapons.
 * @param {Actor} actor
 * @param {Item} item
 * @param {"main"|"off"|null} [targetHand=null]
 * @returns {Promise<void>}
 */
export async function toggleEquipShield(actor, item, targetHand = null) {
  if (!actor || !item || !isShield(item)) return;

  const inCombat = Boolean(game.combat?.started && actor.inCombat);
  const combatKey = (game.combat && inCombat) ? `${game.combat.id}-${game.combat.round}-${game.combat.turn}` : null;
  const lastSwapKey = actor.flags?.["mythcraft-essence-sheet"]?.lastWeaponSwapKey;
  const isSameTurn = Boolean(inCombat && combatKey && lastSwapKey === combatKey);

  const currentlyEquipped = isShieldEquipped(item);

  if (currentlyEquipped) {
    // STOW SHIELD
    if (inCombat && combatKey) {
      await actor.setFlag("mythcraft-essence-sheet", "lastWeaponSwapKey", combatKey);
    }
    await item.update({
      "flags.mythcraft-essence-sheet.isEquipped": false,
      "flags.mythcraft-essence-sheet.equippedHand": null,
      "system.equipped": false,
    });
    ui.notifications.info(`Stowed ${item.name}.`);
  } else {
    // EQUIP SHIELD
    let apCost = isSameTurn ? 1 : 0;
    if (inCombat && apCost > 0) {
      const curAp = Number(actor.system?.ap?.value ?? 0);
      const newAp = Math.max(0, curAp - apCost);
      await actor.update({ "system.ap.value": newAp });
      ui.notifications.info(`Equipped ${item.name} (${apCost} AP consumed for weapon/shield swap. Remaining: ${newAp} AP).`);
    } else {
      ui.notifications.info(`Equipped ${item.name}.`);
    }

    if (inCombat && combatKey) {
      await actor.setFlag("mythcraft-essence-sheet", "lastWeaponSwapKey", combatKey);
    }

    // Stow any 2H weapon currently equipped
    const equippedWeapons = actor.items.filter(i => i.type === "weapon" && isWeaponEquipped(i));
    for (const w of equippedWeapons) {
      if (getWeaponEffectiveGrip(w) === "2h") {
        await w.update({
          "flags.mythcraft-essence-sheet.isEquipped": false,
          "flags.mythcraft-essence-sheet.equippedHand": null,
          "system.equipped": false,
        });
      }
    }

    // Determine target hand (default to off-hand / Left Hand)
    let assignedHand = targetHand;
    const allHandItems = actor.items.filter(i => (i.id !== item.id) && (isWeaponEquipped(i) || isShieldEquipped(i)));

    if (!assignedHand) {
      const isOffOccupied = allHandItems.some(i => (i.flags?.["mythcraft-essence-sheet"]?.equippedHand === "off"));
      assignedHand = isOffOccupied ? "main" : "off";
    }

    // Stow whatever was in that hand slot
    for (const other of allHandItems) {
      const otherHand = other.flags?.["mythcraft-essence-sheet"]?.equippedHand || "main";
      if (otherHand === assignedHand || allHandItems.length >= 2) {
        await other.update({
          "flags.mythcraft-essence-sheet.isEquipped": false,
          "flags.mythcraft-essence-sheet.equippedHand": null,
          "system.equipped": false,
        });
        break;
      }
    }

    await item.update({
      "flags.mythcraft-essence-sheet.isEquipped": true,
      "flags.mythcraft-essence-sheet.equippedHand": assignedHand,
      "system.equipped": true,
    });
  }

  // Recalculate effective defenses
  applyEffectiveArmorAndDefenses(actor);
}

/**
 * Checks whether a character has sufficient Action Points (AP + SAP) for an action.
 * Enforces behavior based on the insufficientApBehavior module setting:
 * - "confirm": Asks for confirmation before proceeding (Default)
 * - "block": Blocks the action and shows a warning notification
 * - "warn": Allows the action and posts a warning card to chat
 * - "disabled": Disables the check completely
 * 
 * @param {Actor} actor
 * @param {number} cost - Required AP cost
 * @param {string} [actionName="Action"] - Name of the action, item, or spell
 * @returns {Promise<boolean>} - True if action is allowed to proceed, false if blocked/cancelled
 */
export async function checkAndEnforceAp(actor, cost, actionName = "Action") {
  if (!actor || actor.type !== "character" || cost <= 0) return true;

  const setting = getSetting("insufficientApBehavior", "confirm");
  if (setting === "disabled") return true;

  const currentAp = Number(actor.system?.ap?.value ?? 0);
  const specialAp = Number(actor.system?.ap?.special ?? 0);
  const totalAvailableAp = currentAp + specialAp;

  if (totalAvailableAp >= cost) {
    return true;
  }

  // 1. Block Action
  if (setting === "block") {
    ui.notifications.warn(`Not enough Action Points! ${actionName} requires ${cost} AP, but you only have ${totalAvailableAp} AP available (${currentAp} AP${specialAp > 0 ? ` + ${specialAp} SAP` : ""}).`);
    return false;
  }

  // 2. Ask for Confirmation (Default)
  if (setting === "confirm") {
    const deficit = cost - totalAvailableAp;
    const modalContent = `
      <div class="insufficient-ap-modal-content">
        <div class="ap-modal-banner">
          <div class="ap-modal-icon"><i class="fas fa-bolt-lightning"></i></div>
          <div class="ap-modal-text">
            <p class="ap-modal-actor"><strong>${actor.name}</strong> has insufficient Action Points to use <strong class="ap-modal-action-name">${actionName}</strong>.</p>
          </div>
        </div>
        <div class="ap-modal-breakdown">
          <div class="ap-modal-row">
            <span class="ap-modal-label"><i class="fas fa-bolt"></i> Required Cost:</span>
            <span class="ap-modal-val cost">${cost} AP</span>
          </div>
          <div class="ap-modal-row">
            <span class="ap-modal-label"><i class="fas fa-shield-halved"></i> Available:</span>
            <span class="ap-modal-val avail">${totalAvailableAp} AP <small>(${currentAp} AP${specialAp > 0 ? ` + ${specialAp} SAP` : ""})</small></span>
          </div>
          <div class="ap-modal-row deficit-row">
            <span class="ap-modal-label"><i class="fas fa-triangle-exclamation"></i> Deficit:</span>
            <span class="ap-modal-val deficit">-${deficit} AP</span>
          </div>
        </div>
        <p class="ap-modal-question">Do you wish to proceed and perform this action anyway?</p>
      </div>
    `;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    if (DialogV2?.confirm) {
      const confirmed = await DialogV2.confirm({
        window: { title: "Insufficient Action Points" },
        content: modalContent,
        yes: { label: "Proceed Anyway", icon: "fas fa-check" },
        no: { label: "Cancel", icon: "fas fa-times", default: true },
        rejectClose: false,
      });
      return Boolean(confirmed);
    }
    if (typeof globalThis.Dialog !== "undefined") {
      const confirmed = await new Promise((resolve) => {
        new globalThis.Dialog({
          title: "Insufficient Action Points",
          content: modalContent,
          buttons: {
            proceed: {
              icon: '<i class="fas fa-check"></i>',
              label: "Proceed Anyway",
              callback: () => resolve(true),
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              callback: () => resolve(false),
            },
          },
          default: "cancel",
          close: () => resolve(false),
        }, {
          classes: ["dialog", "essence-dialog", "insufficient-ap-dialog"],
          width: 420,
        }).render(true);
      });
      return Boolean(confirmed);
    }
    return true;
  }

  // 3. Allow & Post Warning to Chat
  if (setting === "warn") {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="mythcraft-statblock ap-exceeded-notice" style="border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 6px 10px; margin: 4px 0; border-radius: 4px;">
          <div style="display:flex; align-items:center; gap:6px; color:#fbbf24; font-weight:700; font-size:12px;">
            <i class="fas fa-triangle-exclamation"></i>
            <span>Action Points Exceeded</span>
          </div>
          <p style="margin: 4px 0 0; font-size: 11px; color: #fee2e2;">
            <strong>${actor.name}</strong> used <strong>${actionName}</strong> (${cost} AP), exceeding available AP (${totalAvailableAp} AP).
          </p>
        </div>
      `,
    });
    return true;
  }

  return true;
}
