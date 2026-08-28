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
 * Calculate effective resistances for an actor by combining base resistances with donned armor, shield, and enhancement resistance specializations
 * Stacks matching resistance types across all equipped armor pieces (e.g. Armor Sharp 2 + Shield Sharp 2 + Enhancement Sharp 2 = Sharp 6)
 * @param {Actor} actor
 * @returns {{ list: Array<object>, combinedString: string, map: Record<string, number>, armorResists: Array<object>, baseResists: Array<object> }}
 */
export function calculateEffectiveResistances(actor) {
  const baseResistStr = actor?.system?.damage?.resist || "";
  const baseResists = parseResistanceString(baseResistStr);
  const armorResists = [];

  const armorResistAuto = getSetting("armorResistanceAutomation", true);
  if (armorResistAuto) {
    // 1. Donned Body Armor
    const donnedArmor = getDonnedArmor(actor);
    const armorRes = donnedArmor?.system?.resist || donnedArmor?.system?.resistances || donnedArmor?.system?.resistance || donnedArmor?.system?.damage?.resist || "";
    if (armorRes) {
      const parsedArmor = parseResistanceString(armorRes);
      for (const r of parsedArmor) {
        armorResists.push({
          ...r,
          sourceName: donnedArmor.name,
          sourceId: donnedArmor.id,
        });
      }
    }

    // 2. Equipped Shields (all active shields)
    const equippedShields = getEquippedShields(actor);
    for (const shield of equippedShields) {
      const shieldRes = shield?.system?.resist || shield?.system?.resistances || shield?.system?.resistance || shield?.system?.damage?.resist || "";
      if (shieldRes) {
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
/**
 * Extracts the base two-handed damage formula for a hand-and-a-half weapon from system data, tags, or description.
 * (e.g. "Hand-and-a-Half (1d10)", "Hand in a Half (1d10)", "1d10 when wielded with two hands" -> "1d10")
 * @param {Item} weapon
 * @returns {string|null}
 */
export function getTwoHandedBaseFormula(weapon) {
  if (!weapon) return null;

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
                    desc.match(/\(\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*(?:when|if)?\s*(?:two-handed|two handed|2h|in two hands)?\s*\)/i) ||
                    desc.match(/(?:deals|deal|damage:?)\s*([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)\s*(?:when|if)?\s*(?:wielded with two hands|wielded two-handed|two-handed|in two hands)/i) ||
                    desc.match(/(?:when|if)\s*(?:wielded with two hands|wielded two-handed|two-handed|in two hands)[^.]*?([0-9]+d[0-9]+(?:\s*[\+\-]\s*[0-9]+)?)/i);
  if (descMatch) return descMatch[1].trim();

  return null;
}

/**
 * Calculates effective weapon damage formula including assigned attribute modifiers, Affinity bonus, and 2H grip mode.
 * @param {Actor} actor
 * @param {Item} weapon
 * @returns {{ baseFormula: string, effectiveFormula: string, attrKey: string, attrMod: number, affinityBonus: number, totalMod: number, isTwoHandedGrip: boolean }}
 */
export function getWeaponDamageData(actor, weapon) {
  let baseFormula = weapon?.system?.damage?.formula || weapon?.system?.damageFormula || (Array.isArray(weapon?.system?.damage) && weapon.system.damage[0]?.formula) || "1d4";
  
  const effectiveGrip = getWeaponEffectiveGrip(weapon);
  const isTwoHandedGrip = effectiveGrip === "2h";

  if (isTwoHandedGrip) {
    const twoHandedFormula = getTwoHandedBaseFormula(weapon);
    if (twoHandedFormula) {
      baseFormula = twoHandedFormula;
    }
  }

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
    isTwoHandedGrip,
  };
}

/**
 * Applies all effective armor, defenses, speed, and restrictions directly to an actor's derived system data
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

      actor.system.defenses.ref = 10 + effectiveDex + bonusRef + refMod + shieldRefBonus + enhRefBonus;
      actor.system.defenses.fort = 10 + baseEnd + bonusFort + fortMod + shieldFortBonus + enhFortBonus;
      actor.system.defenses.ant = 10 + baseAwr + bonusAnt + antMod + shieldAntBonus + enhAntBonus;
      actor.system.defenses.log = 10 + baseInt + bonusLog + logMod + shieldLogBonus + enhLogBonus;
      actor.system.defenses.will = 10 + baseCha + bonusWill + willMod + shieldWillBonus + enhWillBonus;
    } else {
      // Unarmored: Recalculate baseline 10 + attributes + bonuses + shield & enhancement additional armor
      actor.system.defenses.ar = 10 + bonusAr + shieldArBonus + enhArBonus;
      actor.system.defenses.ref = 10 + effectiveDex + bonusRef + shieldRefBonus + enhRefBonus;
      actor.system.defenses.fort = 10 + baseEnd + bonusFort + shieldFortBonus + enhFortBonus;
      actor.system.defenses.ant = 10 + baseAwr + bonusAnt + shieldAntBonus + enhAntBonus;
      actor.system.defenses.log = 10 + baseInt + bonusLog + shieldLogBonus + enhLogBonus;
      actor.system.defenses.will = 10 + baseCha + bonusWill + shieldWillBonus + enhWillBonus;
    }
  }

  // 4. Speed & STR Minimum (Combine donned armor and enhancement STR min)
  const enhStrMin = parseSignedNumber(equippedEnhancement?.system?.strMin ?? equippedEnhancement?.system?.strMinMod, 0);
  const armorStrMin = donnedArmor ? parseSignedNumber(donnedArmor.system?.strMin, 0) : 0;
  const totalStrMin = Math.max(0, armorStrMin + enhStrMin);

  if (donnedArmor || equippedEnhancement) {
    const strMinAuto = getSetting("armorStrMinAutomation", true);
    const actorStr = Number(actor.system?.attributes?.str ?? 0);

    if (strMinAuto && totalStrMin > 0 && actorStr < totalStrMin) {
      if (actor.system.movement) actor.system.movement.walk = 0;
    } else {
      const speedPenaltyAuto = getSetting("armorSpeedPenaltyAutomation", true);
      const armorSpeedPenalty = donnedArmor ? parseSignedNumber(donnedArmor.system?.speedPenalty, 0) : 0;
      const enhSpeedPenalty = equippedEnhancement ? parseSignedNumber(equippedEnhancement.system?.speedPenalty ?? equippedEnhancement.system?.speedPenaltyMod, 0) : 0;
      const penalty = Math.max(0, armorSpeedPenalty + enhSpeedPenalty);
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
  const srcSys = item._source?.system || {};
  const flagFormula = item.flags?.["mythcraft-essence-sheet"]?.apcFormula;

  const rawCandidate = flagFormula || sys.apcFormula || srcSys.apcFormula || sys.apc || srcSys.apc || sys.ap || "";
  let baseApc = 3;

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

  return baseApc;
}

/**
 * Patches global evaluateFormula to safely handle "X-STR, min Y" formulas
 */
export function patchEvaluateFormula() {
  if (globalThis.mythcraft?.utils?.evaluateFormula) {
    const original = globalThis.mythcraft.utils.evaluateFormula;
    if (!original._essencePatched) {
      const patched = function(formula, rollData = {}, options = {}) {
        if (typeof formula === "string" && (formula.includes(",") || /min/i.test(formula) || /STR|DEX|END|INT|AWR|CHA/i.test(formula))) {
          try {
            const evaluated = evaluateApcFormula(formula, rollData);
            if (typeof evaluated === "number" && !isNaN(evaluated)) {
              return evaluated;
            }
          } catch (e) {}
        }
        return original.call(this, formula, rollData, options);
      };
      patched._essencePatched = true;
      globalThis.mythcraft.utils.evaluateFormula = patched;
    }
  }
}

/**
 * Patches core MythCraft WeaponModel prototype getter for `apc`
 */
export function patchWeaponApcGetter() {
  patchEvaluateFormula();

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
          return getSafeWeaponApc(this.parent, this.parent?.actor ?? this.parent);
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
    const confirmed = await new Promise((resolve) => {
      new Dialog({
        title: "Insufficient Action Points",
        content: `
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
        `,
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
