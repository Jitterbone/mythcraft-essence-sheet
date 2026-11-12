/**
 * mythcraft-essence-sheet | src/sheets/essence-character-sheet.mjs
 *
 * Extends the MythCraft CharacterSheet with completely custom templates
 * and the Essence dark-teal-gold aesthetic.
 *
 * Templates live in: modules/mythcraft-essence-sheet/templates/essence/character/
 * All system data-actions (rollAttribute, rollSkill, rollAttack, etc.) are
 * inherited from MythCraftActorSheet and still work — we only swap the view.
 */

import CharacterSheet from "/systems/mythcraft/module/applications/sheets/character-sheet.mjs";
import DamageModificationDialog from "../apps/damage-modification-dialog.mjs";
import MovementDialog from "../apps/movement-dialog.mjs";
import SensesDialog from "../apps/senses-dialog.mjs";
import ConditionsDialog from "../apps/conditions-dialog.mjs";
import LevelUpDialog from "../apps/level-up-dialog.mjs";
import CharacterCreationWizard from "../apps/character-creation-wizard.mjs";
import TalentTreeViewer from "../apps/talent-tree-viewer.mjs";
import TalentGrantDialog, { isTalentGrantFullySatisfied } from "../apps/talent-grant-dialog.mjs";
import { getTalentGrantsAndPicks } from "../data/talent-library.mjs";
import TalentSkillAllocationDialog from "../apps/talent-skill-dialog.mjs";
import { getTalentSkillPointGrant, SKILL_REGISTRY } from "../data/talent-skill-grants.mjs";
import SecondSkinChoiceDialog, { isSecondSkinTalent } from "../apps/second-skin-dialog.mjs";
import {
  CANONICAL_TALENTS,
  NORMALIZED_CANONICAL_TALENTS,
  SUBCLASS_TO_CLASS,
  DISCIPLINE_TO_MAGIC,
  SUBTRACK_TO_SPEC,
  MYTHCRAFT_CANONICAL_CLASSES,
  MYTHCRAFT_CANONICAL_SPECS,
  MYTHCRAFT_CANONICAL_MAGIC,
  normalizeTalentName,
  isDisallowedTalentItem,
  resolveTalentTrackInfo,
  extractTalentStructuredTags,
  parseExplicitItemTags,
} from "../features/talent-canonical-map.mjs";
import { parseTalentData } from "../features/compendium-parser.mjs";
import { RestDialog } from "../features/rest-automation.mjs";
import { getEnduranceThreshold } from "../features/hp-automation.mjs";
import WalletDialog, {
  getActiveCurrencies,
  getActorCurrencyCount,
  getActorCurrencyUpdates,
} from "../apps/wallet-dialog.mjs";
import ItemAcquisitionDialog, { parseItemCost, processItemPurchase } from "../apps/item-acquisition-dialog.mjs";
import {
  getDonnedArmor,
  isShield,
  isShieldEquipped,
  getShieldArBonus,
  getEquippedShields,
  isArmorEnhancement,
  isEnhancementEquipped,
  getEquippedEnhancement,
  calculateEffectiveResistances,
  hasSecondSkinForArmor,
  getArmorCategory,
  getWeaponDamageData,
  getTwoHandedBaseFormula,
  isBrassKnuckles,
  isUnarmedOrNaturalWeapon,
  actorHasActiveBrassKnuckles,
  applyEffectiveArmorAndDefenses,
  syncArmorStrConditions,
  isItemClothes,
  isItemWorn,
  toggleWearItem,
  getWeaponHandType,
  getWeaponEffectiveGrip,
  toggleHandAndHalfMode,
  isWeaponUnwieldy,
  isWeaponEquippable,
  isWeaponEquipped,
  toggleEquipWeapon,
  toggleEquipShield,
  evaluateApcFormula,
  getTwoHandedApcRule,
  getSafeWeaponApc,
  checkAndEnforceAp,
  getWeaponAttackModifier,
  getWeaponAttackModifierDetails,
  getWeaponDamageModifier,
} from "../features/equipment-automation.mjs";
import { getSetting } from "../settings.mjs";
import { findTagDefinition } from "../data/tags-library.mjs";
import { renderDefenseTargetBadgeHTML, getDefenseTargetConfig } from "../data/defense-config.mjs";
import {
  isItemContainer,
  moveItemToContainer,
  removeItemFromContainer,
} from "../features/container-utils.mjs";
import { applyMessageRollMode, getActiveRollMode } from "../features/roll-privacy.mjs";
import { getMagicAttributeOptions } from "../features/homebrew-attributes.mjs";
import {
  SPELL_LIBRARY,
  getSpellLibraryEntry,
  getSpellRequirementsBadges,
  checkSpellPrerequisite,
  evaluateSpellScalingAndUpcharge,
} from "../data/spell-library.mjs";
import {
  checkAndEnforceSp,
  deductAp,
  deductSp,
} from "../features/sp-ap-rolls.mjs";
import ActiveEffectManager from "../apps/active-effect-manager.mjs";
import {
  getActorActiveEffectBonuses,
  adjustDerivedSubmitData,
  getCombinedDamageBonusFormula,
  getAllActorEffectsWithMeta,
  syncActorTalentActiveEffects,
  getSkillAeBonus,
  normalizeSkillNameOrKey,
} from "../features/active-effect-engine.mjs";


const MODULE_PATH = (p) => `modules/mythcraft-essence-sheet/templates/essence/character/${p}`;

/**
 * Safe HTML enrichment across Foundry V11, V12, V13, V14+
 * @param {string} content
 * @param {object} [options={}]
 * @returns {Promise<string>}
 */
export async function enrichText(content, options = {}) {
  if (!content || typeof content !== "string") return "";
  const enricher = foundry?.applications?.ux?.TextEditor?.enrichHTML 
    ?? foundry?.applications?.ux?.TextEditor?.implementation?.enrichHTML 
    ?? globalThis.TextEditor?.enrichHTML;
  if (typeof enricher === "function") {
    return await enricher(content, { async: true, ...options });
  }
  return content;
}

/**
 * Extract and enrich structured item tags from MythCraft item
 * @param {Item} item
 * @returns {Array<object>}
 */
export function getEnrichedItemTags(item) {
  if (!item) return [];
  const isTalent = item.type === "talent";
  const isSpell = item.type === "spell";
  const spellLibEntry = isSpell ? getSpellLibraryEntry(item) : null;
  const structured = isTalent ? extractTalentStructuredTags(item) : { directTags: [] };
  let tagNames = structured.directTags.length > 0 ? [...structured.directTags] : [];
  if (spellLibEntry?.tags?.length) {
    tagNames.push(...spellLibEntry.tags);
  }
  if (spellLibEntry?.spellType && spellLibEntry.spellType !== "Spell") {
    tagNames.push(spellLibEntry.spellType);
  }
  if (spellLibEntry?.function) {
    tagNames.push(spellLibEntry.function);
  }

  const rawTags = item.system?.tags ?? item.system?.tagList ?? item.system?.properties ?? (isTalent ? item._synthesizedTags : []) ?? [];
  if (Array.isArray(rawTags)) {
    tagNames.push(...rawTags);
  } else if (rawTags instanceof Set) {
    tagNames.push(...Array.from(rawTags));
  } else if (typeof rawTags === "object" && rawTags !== null) {
    tagNames.push(...Object.values(rawTags));
  } else if (typeof rawTags === "string" && rawTags.trim()) {
    tagNames.push(...rawTags.split(/[,;\n]/).map(t => t.trim()).filter(Boolean));
  }

  if (item.system?.aptitude) {
    tagNames.push(item.system.aptitude);
  }
  if (item.system?.magicType) {
    tagNames.push(item.system.magicType);
  }

  // Critical Effects & Custom Crits extraction
  const extractCrit = (val) => {
    if (!val) return null;
    if (typeof val === "string" && val.trim()) {
      const clean = val.trim();
      return /^crit(?:ical)?\b/i.test(clean) ? clean : `Crit: ${clean}`;
    }
    if (typeof val === "object") {
      const text = val.effect || val.description || val.desc || val.value || val.label || val.name;
      if (text && typeof text === "string" && text.trim()) {
        const clean = text.trim();
        return /^crit(?:ical)?\b/i.test(clean) ? clean : `Crit: ${clean}`;
      }
    }
    return null;
  };

  const critSource = extractCrit(item.system?.critical) ||
                     extractCrit(item.system?.crit) ||
                     extractCrit(item.system?.critEffect) ||
                     extractCrit(item.system?.criticalEffect) ||
                     extractCrit(item.flags?.["mythcraft-essence-sheet"]?.crit) ||
                     extractCrit(item.flags?.["mythcraft-essence-sheet"]?.criticalEffect) ||
                     extractCrit(item.flags?.["mythcraft"]?.crit) ||
                     extractCrit(item.flags?.["mythcraft"]?.criticalEffect);
  if (critSource) {
    tagNames.push(critSource);
  }

  const seen = new Set();
  const result = [];

  for (const tagName of tagNames) {
    if (!tagName) continue;
    const str = String(tagName).trim();
    const def = findTagDefinition(str);
    if (!def) continue;
    const normKey = def.name.toLowerCase();
    if (seen.has(normKey)) continue;
    seen.add(normKey);

    const tooltipHTML = `<strong>${def.name}</strong> <span style="opacity:0.75;">(${def.categoryLabel})</span><br/><span style="font-size:11px; line-height:1.35; display:inline-block; margin-top:3px;">${def.description}</span>`;

    result.push({
      name: def.name,
      description: def.description,
      tooltipHTML,
      category: def.category,
      categoryLabel: def.categoryLabel,
      categoryMeta: def.categoryMeta || { color: "#2dd4bf", bg: "rgba(45, 212, 191, 0.18)", border: "rgba(45, 212, 191, 0.5)", icon: "fas fa-tag" },
    });
  }

  return result;
}

export { getSafeWeaponApc };

/**
 * Roll damage for a weapon or spell document, supporting MythCraft critical damage rules.
 * 
 * Weapon Crit Rule:
 * 1. Maximize the amount of damage normally dealt (dice maximum + modifiers + bonuses).
 * 2. Roll damage dice a second time.
 * 3. Add LUCK score to damage total.
 * 
 * Spell Crit Rule:
 * 1. Add LUCK score to damage total.
 * 
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [options={}]
 * @param {boolean} [options.isCrit=false]
 * @param {string|null} [options.rollMode=null]
 * @returns {Promise<ChatMessage|void>}
 */
export async function rollItemDamage(actor, item, { isCrit = false, rollMode = null, customFormula = null, customDamageType = null, isHeal = false, upchargeLabel = null } = {}) {
  if (!actor || !item) return;

  const rollData = actor.getRollData();
  const isWeapon = item.type === "weapon";
  const isSpell = item.type === "spell";

  let weaponData = null;
  if (isWeapon) {
    weaponData = getWeaponDamageData(actor, item);
  }

  // 1. Collect raw damage definitions
  const sys = item.system || {};
  const flags = item.flags?.["mythcraft-essence-sheet"] || {};

  const isSoul = Boolean(
    flags.isSoulDamage === true ||
    flags.damageType === "soul" ||
    sys.isSoulDamage === true ||
    sys.damageType === "soul" ||
    (typeof sys.damage?.type === "string" && sys.damage.type.toLowerCase() === "soul") ||
    (Array.isArray(sys.damage?.types) && sys.damage.types.some(t => String(t).toLowerCase() === "soul")) ||
    (Array.isArray(sys.damage) && sys.damage.some(d => String(d?.type || d?.types?.[0] || "").toLowerCase() === "soul")) ||
    (Array.isArray(sys.tags) ? sys.tags.some(t => /soul/i.test(t)) : (typeof sys.tags === "object" && sys.tags && Object.values(sys.tags).some(t => /soul/i.test(t))))
  );

  let defaultType = isSoul ? "soul" : null;
  if (!defaultType) {
    if (sys.damageType) defaultType = sys.damageType;
    else if (typeof sys.damage?.type === "string") defaultType = sys.damage.type;
    else if (Array.isArray(sys.damage?.types) && sys.damage.types.length > 0) defaultType = sys.damage.types[0];
    else if (Array.isArray(sys.damage) && sys.damage[0]?.type) defaultType = sys.damage[0].type;
    else if (Array.isArray(sys.damage) && sys.damage[0]?.types?.[0]) defaultType = sys.damage[0].types[0];
    else if (weaponData?.damageType) defaultType = weaponData.damageType;
    else defaultType = "sharp";
  }

  let damages = [];
  if (isWeapon && weaponData) {
    damages = [{ formula: weaponData.baseFormula, type: defaultType }];
    if (Array.isArray(sys.damage) && sys.damage.length > 1) {
      for (let i = 1; i < sys.damage.length; i++) {
        const extraFormula = String(sys.damage[i]?.formula || "").trim();
        if (extraFormula && !/^\*+$/.test(extraFormula)) {
          damages.push({ formula: extraFormula, type: isSoul ? "soul" : (sys.damage[i].type || defaultType) });
        }
      }
    }
  } else if (Array.isArray(sys.damage) && sys.damage.length > 0) {
    damages = sys.damage.filter(d => d && (d.formula || typeof d === "string")).map(d => ({
      formula: typeof d === "string" ? d : d.formula,
      type: isSoul ? "soul" : ((typeof d === "object" ? (d.type || d.types?.[0]) : null) || defaultType),
    }));
  } else if (sys.damage?.formula) {
    damages = [{ formula: sys.damage.formula, type: defaultType }];
  } else if (sys.damageFormula) {
    damages = [{ formula: sys.damageFormula, type: defaultType }];
  } else if (typeof sys.damage === "string" && sys.damage.trim()) {
    damages = [{ formula: sys.damage.trim(), type: defaultType }];
  }

  if (customFormula) {
    damages = [{
      formula: String(customFormula).trim(),
      type: customDamageType || (isHeal ? "heal" : defaultType),
      isHeal: Boolean(isHeal || customDamageType === "heal"),
    }];
  } else if (isSpell) {
    const spellScaling = evaluateSpellScalingAndUpcharge(actor, item);
    if (spellScaling.effectiveDamage?.length > 0) {
      damages = spellScaling.effectiveDamage.map(d => ({
        formula: d.formula,
        type: isSoul ? "soul" : (d.type || defaultType),
        isHeal: Boolean(d.isHeal || d.type === "heal"),
      }));
    }
  }

  if (!damages.length) {
    ui.notifications.warn(`No damage formula found on ${item.name}.`);
    return;
  }

  // 2. Attribute modifier (weapons)
  const autoAttrMod = getSetting("weaponDamageAttrModifier", true);
  let attrMod = 0;
  let attrModLabel = "";
  let rawAttr = (weaponData?.attrKey || item.system?.attr || "").toLowerCase().trim();
  if (rawAttr.startsWith("my")) rawAttr = rawAttr.replace(/^mythcraft\.attributes\./i, "");
  const validAttrs = new Set(["str", "dex", "end", "awr", "int", "cha", "luck", "cor"]);

  if (autoAttrMod && isWeapon && validAttrs.has(rawAttr)) {
    const rawAttrVal = actor.system?.attributes?.[rawAttr];
    attrMod = Number(typeof rawAttrVal === "object" && rawAttrVal !== null ? (rawAttrVal.value ?? 0) : (rawAttrVal ?? 0));
    if (attrMod !== 0) {
      attrModLabel = `${attrMod > 0 ? "+" : ""}${attrMod} ${rawAttr.toUpperCase()}`;
    }
  }

  // 2b. Weapon Damage Modifier (from weapon schema / bonus)
  const itemDmgMod = isWeapon ? (weaponData?.itemDmgMod ?? getWeaponDamageModifier(item, actor)) : 0;

  // 3. Affinity bonus (+3)
  const hasItemAffinity = item.system?.hasAffinity === true || 
                          item.flags?.["mythcraft-essence-sheet"]?.hasAffinity === true ||
                          item.system?.affinity === true;
  const affinityBonus = hasItemAffinity ? 3 : 0;

  // 4. Consumed Souls bonus (+X Damage, max +5)
  const enableClaimed = Boolean(
    item.flags?.["mythcraft-essence-sheet"]?.enableClaimedSouls ||
    item.flags?.["mythcraft-essence-sheet"]?.enableConsumedSouls ||
    item.system?.enableClaimedSouls ||
    item.system?.enableConsumedSouls
  );
  const claimedSouls = enableClaimed ? Math.min(5, Math.max(0, Number(
    item.flags?.["mythcraft-essence-sheet"]?.consumedSouls ??
    item.flags?.["mythcraft-essence-sheet"]?.claimedSouls ??
    item.system?.consumedSouls ??
    item.system?.claimedSouls ??
    0
  ))) : 0;

  // 5. Luck score (added on crits for weapons & spells)
  const luckScore = Number(actor.system?.attributes?.luck ?? 0);

  // 5b. Active Effect Damage Bonuses (flat + dice)
  const aeDmgBonus = actor ? getCombinedDamageBonusFormula(actor, isSpell ? "spell" : "weapon") : { flat: 0, dice: [], formulaSuffix: "" };
  // Note: evaluateSpellScalingAndUpcharge already appends aeSpellDmg.formulaSuffix to spell library base formulas
  const spellAlreadyHasAeSuffix = isSpell && !customFormula && Boolean(getSpellLibraryEntry(item));

  // 6. Evaluate rolls per damage entry
  const RollClass = mythcraft?.rolls?.DamageRoll || Roll;
  const rolls = [];

  for (let index = 0; index < damages.length; index++) {
    const d = damages[index];
    const dmgType = d.type || "sharp";
    let baseFormula = d.formula.trim();
    if (index === 0 && !d.isHeal && !spellAlreadyHasAeSuffix && aeDmgBonus.dice?.length) {
      baseFormula = `${baseFormula} + ${aeDmgBonus.dice.join(" + ")}`;
    }

    const currentAttrMod = (index === 0) ? attrMod : 0;
    const currentItemDmgMod = (index === 0) ? itemDmgMod : 0;
    const currentAffinity = (index === 0) ? affinityBonus : 0;
    const currentClaimedSouls = (index === 0) ? claimedSouls : 0;
    const currentAeFlat = (index === 0 && !d.isHeal && !spellAlreadyHasAeSuffix) ? (aeDmgBonus.flat || 0) : 0;
    const isAstounding = hasAstoundingCritical(actor);

    let finalFormula = baseFormula;

    if (isCrit) {
      if (!isSpell) {
        // Weapon, Action & Feature Attack Crit Rule:
        // 1. Maximize normal damage (dice max + modifiers)
        // 2. Roll damage dice a second time (exploding on max face if Astounding Critical)
        // 3. Add LUCK score
        let diceMax = 0;
        let extraDiceFormula = "";

        try {
          const tempRoll = new Roll(baseFormula, rollData);
          for (const term of tempRoll.terms) {
            if (term.faces && term.number) {
              diceMax += term.number * term.faces;
              const explodeSuffix = isAstounding ? "x" : "";
              extraDiceFormula += (extraDiceFormula ? " + " : "") + `${term.number}d${term.faces}${explodeSuffix}`;
            } else if (typeof term.total === "number") {
              diceMax += term.total;
            } else if (typeof term.number === "number" && !term.faces) {
              diceMax += term.number;
            }
          }
        } catch (e) {
          diceMax = 0;
        }

        if (!extraDiceFormula) {
          extraDiceFormula = isAstounding ? makeExplodingDiceFormula(baseFormula) : baseFormula;
        }
        const maxNormalDamage = diceMax + currentAttrMod + currentItemDmgMod + currentAffinity + currentClaimedSouls + currentAeFlat;
        const luckBonus = (index === 0) ? luckScore : 0;

        finalFormula = `${maxNormalDamage} + ${extraDiceFormula}${luckBonus ? ` + ${luckBonus}` : ""}`;
      } else {
        // Spell Crit Rule: Add LUCK to damage (exploding on max face if Astounding Critical)
        const luckBonus = (index === 0) ? luckScore : 0;
        const spellDiceFormula = isAstounding ? makeExplodingDiceFormula(baseFormula) : baseFormula;
        finalFormula = `${spellDiceFormula}${currentAeFlat ? ` + ${currentAeFlat}` : ""}${luckBonus ? ` + ${luckBonus}` : ""}`;
      }
    } else {
      // Normal damage
      if (currentAttrMod !== 0) {
        finalFormula = `${finalFormula} + ${currentAttrMod}`;
      }
      if (currentItemDmgMod !== 0) {
        finalFormula = `${finalFormula} ${currentItemDmgMod > 0 ? "+" : "-"} ${Math.abs(currentItemDmgMod)}`;
      }
      if (currentAffinity !== 0) {
        finalFormula = `${finalFormula} + ${currentAffinity}`;
      }
      if (currentClaimedSouls !== 0) {
        finalFormula = `${finalFormula} + ${currentClaimedSouls}`;
      }
      if (currentAeFlat !== 0) {
        finalFormula = `${finalFormula} ${currentAeFlat > 0 ? "+" : "-"} ${Math.abs(currentAeFlat)}`;
      }
    }

    const damageModifiers = [];
    if (currentAttrMod !== 0) {
      damageModifiers.push({
        label: `${rawAttr.toUpperCase()} Modifier`,
        value: currentAttrMod,
        text: currentAttrMod > 0 ? `+${currentAttrMod}` : `${currentAttrMod}`,
        cssClass: currentAttrMod >= 0 ? "positive" : "negative",
      });
    }
    if (currentItemDmgMod !== 0) {
      damageModifiers.push({
        label: `${item.name} Damage Mod`,
        value: currentItemDmgMod,
        text: currentItemDmgMod > 0 ? `+${currentItemDmgMod}` : `${currentItemDmgMod}`,
        cssClass: currentItemDmgMod >= 0 ? "positive" : "negative",
      });
    }
    if (currentAffinity !== 0) {
      damageModifiers.push({
        label: "Affinity Bonus",
        value: currentAffinity,
        text: `+${currentAffinity}`,
        cssClass: "positive",
      });
    }
    if (currentClaimedSouls !== 0) {
      damageModifiers.push({
        label: "Consumed Souls",
        value: currentClaimedSouls,
        text: `+${currentClaimedSouls}`,
        cssClass: "positive",
      });
    }
    if (currentAeFlat !== 0) {
      damageModifiers.push({
        label: "Damage Bonus",
        value: currentAeFlat,
        text: currentAeFlat > 0 ? `+${currentAeFlat}` : `${currentAeFlat}`,
        cssClass: currentAeFlat >= 0 ? "positive" : "negative",
      });
    }
    if (isCrit && luckScore) {
      damageModifiers.push({
        label: "Luck Bonus",
        value: luckScore,
        text: luckScore > 0 ? `+${luckScore}` : `${luckScore}`,
        cssClass: luckScore >= 0 ? "positive" : "negative",
      });
    }

    const totalDmgMod = currentAttrMod + currentItemDmgMod + currentAffinity + currentClaimedSouls + currentAeFlat + ((isCrit && luckScore) ? luckScore : 0);
    const totalDmgText = totalDmgMod >= 0 ? `+${totalDmgMod}` : `${totalDmgMod}`;

    const r = new RollClass(finalFormula, rollData, {
      type: dmgType,
      damageType: dmgType,
      hasAffinity: hasItemAffinity,
      attrMod: currentAttrMod,
      itemDmgMod: currentItemDmgMod,
      claimedSouls: currentClaimedSouls,
      isCrit,
      modifiers: damageModifiers,
      mythcraftBonusValue: totalDmgMod,
      mythcraftBonusText: totalDmgText,
    });
    if (r.options) {
      r.options.type = dmgType;
      r.options.damageType = dmgType;
      r.options.modifiers = damageModifiers;
      r.options.mythcraftBonusValue = totalDmgMod;
      r.options.mythcraftBonusText = totalDmgText;
    }
    await r.evaluate();
    rolls.push(r);
  }

  // 7. Build Chat Message
  const flavorPrefix = isCrit ? `💥 CRITICAL HIT: ${item.name}` : `${item.name}`;
  const notes = [];
  if (upchargeLabel) notes.push(upchargeLabel);
  if (isCrit) notes.push("Critical Damage");
  if (isCrit && hasAstoundingCritical(actor)) notes.push("Astounding Crit (Exploding Dice)");
  if (isWeapon && weaponData?.isTwoHandedGrip) notes.push("2H Grip");
  if (isWeapon && weaponData?.isBrassKnucklesBoosted && !isBrassKnuckles(item)) notes.push("Brass Knuckles (+1 Die Size)");
  if (attrModLabel) notes.push(attrModLabel);
  if (itemDmgMod !== 0) notes.push(`${itemDmgMod > 0 ? `+${itemDmgMod}` : itemDmgMod} ${item.name} Damage Mod`);
  if (hasItemAffinity) notes.push("+3 Affinity");
  if (claimedSouls > 0) notes.push(`+${claimedSouls} Consumed Souls`);
  if (isCrit && luckScore) notes.push(`+${luckScore} LUCK`);
  const flavorSuffix = notes.length ? ` (Includes ${notes.join(", ")})` : "";

  const primaryDamageType = damages[0]?.type || "sharp";

  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls,
    flavor: `${flavorPrefix} - ${game.i18n.localize("MYTHCRAFT.Roll.Damage")}${flavorSuffix}`,
    sound: CONFIG.sounds.dice,
    flags: {
      "mythcraft-essence-sheet": {
        itemId: item.id,
        itemUuid: item.uuid,
        itemName: item.name,
        damageType: primaryDamageType,
        damages: damages.map((d, i) => ({ type: d.type || "sharp", formula: d.formula, total: rolls[i]?.total })),
        type: "damage",
        isCrit,
        isDamage: true,
        isDamageRoll: true,
        apDeducted: true,
        claimedSouls,
        consumedSouls: claimedSouls,
        enableClaimedSouls: enableClaimed,
        enableConsumedSouls: enableClaimed,
        attackerActorId: actor.id,
        attackerActorUuid: actor.uuid,
      },
    },
  };

  const activeRollMode = applyMessageRollMode(messageData, rollMode);
  return ChatMessage.create(messageData, { rollMode: activeRollMode });
}

/**
 * Executes a full Spell Check / Spell Attack roll for an actor with magic source,
 * spellcasting ability, defense target, and critical thresholds.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [options={}]
 * @param {string|null} [options.rollMode=null]
 * @returns {Promise<ChatMessage|void>}
 */
/**
 * Combine a base dice formula (e.g. "2d12") with bonus dice per stack (e.g. "1d12" * stacks)
 * @param {string} baseFormula
 * @param {string} bonusDicePerStack
 * @param {number} stacks
 * @returns {string}
 */
export function computeUpchargedFormula(baseFormula, bonusDicePerStack, stacks = 1) {
  const count = Math.max(1, Number(stacks) || 1);
  if (!bonusDicePerStack) return baseFormula || "1d6";
  const bonusMatch = String(bonusDicePerStack).trim().match(/^(\d+)d(\d+)$/i);
  const baseMatch = String(baseFormula || "").trim().match(/^(\d+)d(\d+)(.*)$/i);
  if (bonusMatch && baseMatch && bonusMatch[2] === baseMatch[2]) {
    const newNum = parseInt(baseMatch[1], 10) + parseInt(bonusMatch[1], 10) * count;
    return `${newNum}d${baseMatch[2]}${baseMatch[3] || ""}`;
  }
  if (bonusMatch) {
    const addedNum = parseInt(bonusMatch[1], 10) * count;
    return baseFormula ? `${baseFormula} + ${addedNum}d${bonusMatch[2]}` : `${addedNum}d${bonusMatch[2]}`;
  }
  return baseFormula ? `${baseFormula} + ${bonusDicePerStack}` : bonusDicePerStack;
}

/**
 * Build the HTML block for Spell Library details, Power Scaling notes, and Interactive Upcharge controls
 * @param {Actor} actor
 * @param {Item} item
 * @param {object|null} libEntry
 * @param {object} scalingInfo
 * @param {object} [options={}]
 * @returns {string}
 */
export function buildSpellLibraryChatControlsHTML(actor, item, libEntry, scalingInfo, { isCrit = false, includeBaseDamageBtn = false } = {}) {
  const prereqStatus = checkSpellPrerequisite(actor, libEntry || item);
  const prereqBannerHTML = (!prereqStatus.met && prereqStatus.note)
    ? `<div class="spell-chat-prereq-unmet" style="margin:6px 0; padding:5px 8px; background:rgba(220, 38, 38, 0.22); border:1px solid #ef4444; border-radius:4px; color:#fca5a5; font-size:11px; font-weight:700;">
        <i class="fas fa-exclamation-triangle"></i> ${prereqStatus.note}
       </div>`
    : "";

  const scalingBannerHTML = (scalingInfo?.activeScalingNotes?.length > 0)
    ? `<div class="spell-chat-scaling-banner" style="margin:6px 0; padding:5px 8px; background:rgba(36, 105, 117, 0.28); border:1px solid #38bdf8; border-radius:4px; color:#bae6fd; font-size:11px;">
        <strong style="color:#facc15;"><i class="fas fa-arrow-up-right-dots"></i> Active Power Scaling:</strong>
        <span>${scalingInfo.activeScalingNotes.join(" • ")}</span>
       </div>`
    : "";

  const manifestationBannerHTML = scalingInfo?.manifestationZeroSp
    ? `<div class="spell-chat-manifestation-banner" style="margin:4px 0; padding:3px 8px; background:rgba(155, 114, 207, 0.22); border:1px solid #9b72cf; border-radius:4px; color:#e9d5ff; font-size:11px;">
        <i class="fas fa-brain"></i> <strong>Manifestation:</strong> 0 SP base cost applied for Psionic Aptitude.
       </div>`
    : "";

  let baseDamageBtnHTML = "";
  const effectiveDmg = scalingInfo?.effectiveDamage || [];
  if (includeBaseDamageBtn && effectiveDmg.length > 0) {
    const primary = effectiveDmg[0];
    const isHeal = Boolean(primary.isHeal || primary.type === "heal");
    const dmgLabel = effectiveDmg.map(d => `${d.formula} ${d.type || ""}`.trim()).join(" + ");
    baseDamageBtnHTML = `
      <div class="chat-damage-action-wrap revealed" style="margin-top:6px;">
        <button type="button" class="essence-chat-damage-btn ${isCrit ? "crit-damage-btn" : ""}"
                data-action="rollEssenceDamage"
                data-is-crit="${isCrit ? "true" : "false"}"
                data-item-id="${item.id}"
                data-actor-id="${actor.id}">
          <i class="fas fa-${isHeal ? "heart-pulse" : (isCrit ? "burst" : "dice-d20")}"></i>
          <span>${isHeal ? `Roll Healing (${dmgLabel})` : `${isCrit ? "Roll Critical Damage" : "Roll Damage"} (${dmgLabel})`}</span>
        </button>
      </div>
    `;
  }

  let upchargeSectionHTML = "";
  const availUpcharges = scalingInfo?.availableUpcharges || [];
  const rawUpchargeText = libEntry?.upcharge || item.system?.upcharge || null;

  if (availUpcharges.length > 0) {
    const rowsHTML = availUpcharges.map(opt => {
      const costParts = [];
      if (opt.spCost > 0) costParts.push(`+${opt.spCost} SP`);
      if (opt.apCost > 0) costParts.push(`+${opt.apCost} AP`);
      const costLabel = costParts.length ? costParts.join(" / ") : "Free / Component";

      let stackSelectHTML = "";
      if (opt.repeatable && opt.maxStacks > 1) {
        const opts = [];
        for (let s = 1; s <= opt.maxStacks; s++) {
          const sCost = [];
          if (opt.spCost > 0) sCost.push(`-${opt.spCost * s} SP`);
          if (opt.apCost > 0) sCost.push(`-${opt.apCost * s} AP`);
          opts.push(`<option value="${s}">${s}x (${sCost.join(", ")})</option>`);
        }
        stackSelectHTML = `<select class="essence-upcharge-stacks" data-option-id="${opt.id}" style="background:#0f172a; color:#facc15; border:1px solid #3a7a7f; border-radius:4px; padding:3px 6px; font-size:11px; font-weight:700; width:auto !important; flex:0 0 auto; height:26px;">${opts.join("")}</select>`;
      }

      if (opt.isDamageUpcharge) {
        const previewFormula = opt.formulaOverride
          ? opt.formulaOverride
          : computeUpchargedFormula(opt.baseFormula, opt.bonusDicePerStack, 1);
        const btnActionLabel = opt.isHeal ? `Roll Upcharged Healing (${previewFormula})` : `Roll Upcharged Damage (${previewFormula})`;
        return `
          <div class="essence-upcharge-row" style="display:flex; flex-direction:column; gap:5px; margin-top:5px; padding:6px 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(250, 204, 21, 0.4); border-radius:4px; box-sizing:border-box; width:100%;">
            <div style="font-size:11.5px; color:#fef08a; line-height:1.3; width:100%; word-break:normal; overflow-wrap:break-word;">
              <strong>${opt.label}</strong> <span style="color:#94a3b8; font-weight:600;">(${costLabel})</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; width:100%; box-sizing:border-box;">
              ${stackSelectHTML}
              <button type="button" class="essence-upcharge-roll-btn"
                      data-action="rollSpellUpcharge"
                      data-actor-id="${actor.id}"
                      data-item-id="${item.id}"
                      data-option-id="${opt.id}"
                      data-is-crit="${isCrit ? "true" : "false"}"
                      style="flex:1 1 auto; min-width:0; width:auto !important; display:inline-flex; align-items:center; justify-content:center; gap:5px; background:linear-gradient(135deg, #b45309 0%, #78350f 100%); color:#fef3c7; border:1px solid #f59e0b; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; height:26px; box-sizing:border-box;">
                <i class="fas fa-${opt.isHeal ? "heart-circle-plus" : "fire-flame-curved"}" style="flex-shrink:0;"></i>
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${btnActionLabel}</span>
              </button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="essence-upcharge-row" style="display:flex; flex-direction:column; gap:5px; margin-top:5px; padding:6px 8px; background:rgba(15, 23, 42, 0.75); border:1px solid rgba(56, 189, 248, 0.4); border-radius:4px; box-sizing:border-box; width:100%;">
            <div style="font-size:11.5px; color:#e0f2fe; line-height:1.3; width:100%; word-break:normal; overflow-wrap:break-word;">
              <strong>${opt.label}</strong> <span style="color:#94a3b8; font-weight:600;">(${costLabel})</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; width:100%; box-sizing:border-box;">
              ${stackSelectHTML}
              <button type="button" class="essence-upcharge-apply-btn"
                      data-action="applySpellUpcharge"
                      data-actor-id="${actor.id}"
                      data-item-id="${item.id}"
                      data-option-id="${opt.id}"
                      style="flex:1 1 auto; min-width:0; width:auto !important; display:inline-flex; align-items:center; justify-content:center; gap:5px; background:linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%); color:#e0f2fe; border:1px solid #38bdf8; border-radius:4px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; height:26px; box-sizing:border-box;">
                <i class="fas fa-bolt" style="flex-shrink:0;"></i>
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Spend &amp; Upcharge</span>
              </button>
            </div>
          </div>
        `;
      }
    }).join("");

    upchargeSectionHTML = `
      <div class="spell-chat-upcharge-panel" style="margin-top:8px; padding:6px 8px; background:rgba(234, 179, 8, 0.1); border:1px solid rgba(250, 204, 21, 0.4); border-radius:6px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#facc15; letter-spacing:0.5px; margin-bottom:2px;">
          <i class="fas fa-bolt"></i> Upcharge Available (Requirements Met)
        </div>
        ${rawUpchargeText ? `<div style="font-size:11px; color:#cbd5e1; margin-bottom:4px;">${rawUpchargeText}</div>` : ""}
        ${rowsHTML}
      </div>
    `;
  } else if (rawUpchargeText) {
    upchargeSectionHTML = `
      <div class="spell-chat-upcharge-info" style="margin-top:6px; padding:4px 8px; background:rgba(15, 23, 42, 0.5); border-left:3px solid #64748b; border-radius:3px; font-size:11px; color:#94a3b8;">
        <strong style="color:#cbd5e1;">Upcharge / Special:</strong> ${rawUpchargeText}
      </div>
    `;
  }

  return `${prereqBannerHTML}${scalingBannerHTML}${manifestationBannerHTML}${baseDamageBtnHTML}${upchargeSectionHTML}`;
}

/**
 * Execute an interactive Spell Upcharge from a Chat Card button
 * @param {Actor} actor
 * @param {Item} item
 * @param {string} optionId
 * @param {number} [stacks=1]
 * @param {object} [options={}]
 */
export async function executeSpellUpchargeFromChat(actor, item, optionId, stacks = 1, { isCrit = false, rollMode = null } = {}) {
  if (!actor || !item) return;
  const libEntry = getSpellLibraryEntry(item);
  const scalingInfo = evaluateSpellScalingAndUpcharge(actor, libEntry || item, { afterBaseDeduction: true });
  const opt = (scalingInfo.allUpcharges || []).find(o => o.id === optionId);
  if (!opt) {
    ui.notifications.warn(`Upcharge option not found for ${item.name}.`);
    return;
  }

  const count = Math.max(1, Number(stacks) || 1);
  const totalSp = (opt.spCost || 0) * count;
  const totalAp = (opt.apCost || 0) * count;

  if (totalAp > 0) {
    const canAp = await checkAndEnforceAp(actor, totalAp, `${item.name} (Upcharge)`);
    if (!canAp) return;
  }
  if (totalSp > 0) {
    const canSp = await checkAndEnforceSp(actor, totalSp);
    if (!canSp) return;
  }

  if (totalAp > 0) await deductAp(actor, totalAp);
  if (totalSp > 0) await deductSp(actor, totalSp);

  const costSummary = [
    totalSp > 0 ? `-${totalSp} SP` : null,
    totalAp > 0 ? `-${totalAp} AP` : null,
  ].filter(Boolean).join(", ");

  if (opt.isDamageUpcharge) {
    const upchargedFormula = opt.formulaOverride
      ? opt.formulaOverride
      : computeUpchargedFormula(opt.baseFormula, opt.bonusDicePerStack, count);
    const upLabel = `Upcharge${count > 1 ? ` x${count}` : ""}: ${opt.label}${costSummary ? ` (${costSummary})` : ""}`;
    await rollItemDamage(actor, item, {
      isCrit,
      rollMode,
      customFormula: upchargedFormula,
      customDamageType: opt.baseDamageType,
      isHeal: opt.isHeal,
      upchargeLabel: upLabel,
    });
  } else {
    const content = `
      <div class="mythcraft chat-card spell-card essence-spell-chat-card" style="padding:8px 10px; background:rgba(15, 23, 42, 0.9); border:1px solid #38bdf8; border-radius:6px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <strong style="color:#facc15; font-family:'Cinzel', serif; font-size:13px;"><i class="fas fa-bolt"></i> ${item.name} — Upcharged!</strong>
          ${costSummary ? `<span style="font-size:11px; font-weight:700; color:#38bdf8; background:rgba(2,132,199,0.2); padding:2px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.4);">${costSummary}</span>` : ""}
        </div>
        <div style="margin-top:4px; font-size:12px; color:#e0f2fe;">
          Applied <strong>${count > 1 ? `${count}x ` : ""}${opt.label}</strong>
        </div>
      </div>
    `;
    const msgData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flavor: `${actor.name} upcharges ${item.name}`,
    };
    const activeRollMode = applyMessageRollMode(msgData, rollMode);
    await ChatMessage.create(msgData, { rollMode: activeRollMode });
  }
}

/**
 * Post a Spell's full card & description to Chat (used automatically for Non-Attack spells
 * and when clicking the Post Spell to Chat button).
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [options={}]
 * @param {boolean} [options.deductResources=false]
 * @param {string|null} [options.rollMode=null]
 */
export async function postSpellDescriptionCard(actor, item, { deductResources = false, rollMode = null } = {}) {
  if (!actor || !item) return;
  const sys = item.system || {};
  const libEntry = getSpellLibraryEntry(item);
  let scalingInfo = evaluateSpellScalingAndUpcharge(actor, libEntry || item, { afterBaseDeduction: false });

  const apcVal = libEntry
    ? (typeof libEntry.apc === "number" ? scalingInfo.effectiveApc : libEntry.apc)
    : (sys.apc ?? sys.ap ?? null);
  const spcVal = libEntry
    ? (typeof libEntry.spc === "number" ? scalingInfo.effectiveSpc : libEntry.spc)
    : (sys.spc ?? sys.sp ?? null);

  if (deductResources) {
    const numAp = typeof apcVal === "number" ? apcVal : Number(apcVal) || 0;
    const numSp = typeof spcVal === "number" ? spcVal : Number(spcVal) || 0;

    if (numAp > 0 && game.combat?.started) {
      const allowedAp = await checkAndEnforceAp(actor, numAp, item.name);
      if (!allowedAp) return;
    }
    if (numSp > 0) {
      const allowedSp = await checkAndEnforceSp(actor, numSp);
      if (!allowedSp) return;
    }

    if (numAp > 0 && game.combat?.started && getSetting("attackAPMode", "auto") !== "disabled") {
      await deductAp(actor, numAp);
    }
    if (numSp > 0 && getSetting("spellSPMode", "auto") !== "disabled") {
      await deductSp(actor, numSp);
    }

    scalingInfo = evaluateSpellScalingAndUpcharge(actor, libEntry || item, { afterBaseDeduction: true });
  }

  const magicSource = libEntry?.magicSource || (sys.magicSource ? (sys.magicSource.charAt(0).toUpperCase() + sys.magicSource.slice(1)) : "");
  const spellType = libEntry?.spellType || "Spell";
  const funcLabel = libEntry?.function || sys.function || null;
  const rangeLabel = libEntry?.range || sys.rangeLabel || (sys.range?.value ? `${sys.range.value} ${sys.range.unit || "ft"}` : null);
  const durationLabel = libEntry?.duration || sys.durationLabel || (sys.duration?.value ? `${sys.duration.value} ${sys.duration.unit || ""}` : null);
  const requiresLabel = libEntry?.requires || null;
  const castingTimeLabel = libEntry?.castingTime || sys.castingTime || null;
  const prereqLabel = libEntry?.prerequisite || sys.recharge || null;
  const materialsLabel = libEntry?.materials || null;
  const targetDefense = libEntry?.target || sys.defenseTarget || sys.defense || "";

  const description = await enrichText(sys.description?.value || sys.description || "", {
    rollData: actor.getRollData(),
  });

  const enrichedTags = getEnrichedItemTags(item);
  const tagsHTML = enrichedTags.length
    ? `<div class="chat-tags-strip expanded-tags-strip" style="display:flex; flex-wrap:wrap; gap:4px; margin: 6px 0 8px;">
        ${enrichedTags.map(tag => `
          <span class="tag-badge-pill ${tag.category}" 
                style="--cat-color: ${tag.categoryMeta.color}; --cat-bg: ${tag.categoryMeta.bg}; --cat-border: ${tag.categoryMeta.border};"
                data-tooltip="${tag.tooltipHTML.replace(/"/g, '&quot;')}"
                data-tooltip-direction="UP">
            <i class="${tag.categoryMeta.icon}"></i>
            <span class="tag-badge-name">${tag.name}</span>
          </span>
        `).join("")}
       </div>`
    : "";

  const details = [];
  if (magicSource) details.push(`<strong>Source:</strong> ${magicSource} ${spellType}`);
  if (funcLabel) details.push(`<strong>Function:</strong> ${funcLabel}`);
  if (apcVal !== undefined && apcVal !== null && apcVal !== "") details.push(`<strong>APC:</strong> ${apcVal}`);
  if (spcVal !== undefined && spcVal !== null && spcVal !== "") details.push(`<strong>SPC:</strong> ${spcVal}`);
  if (rangeLabel) details.push(`<strong>Range:</strong> ${rangeLabel}`);
  if (durationLabel) details.push(`<strong>Duration:</strong> ${durationLabel}`);
  if (requiresLabel) details.push(`<strong>Requires:</strong> ${requiresLabel}`);
  if (castingTimeLabel) details.push(`<strong>Casting Time:</strong> ${castingTimeLabel}`);
  if (prereqLabel) details.push(`<strong>Prerequisite:</strong> ${prereqLabel}`);
  if (materialsLabel) details.push(`<strong>Materials:</strong> ${materialsLabel}`);

  const detailsHTML = details.length
    ? `<div class="spell-chat-details" style="display:flex; flex-wrap:wrap; gap:6px 14px; margin:6px 0 8px; font-size:11px; color:#cbd5e1; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">
        ${details.map(d => `<span>${d}</span>`).join("")}
       </div>`
    : "";

  const defBadgeHTML = targetDefense ? renderDefenseTargetBadgeHTML(targetDefense) : "";
  const controlsHTML = buildSpellLibraryChatControlsHTML(actor, item, libEntry, scalingInfo, {
    isCrit: false,
    includeBaseDamageBtn: true,
  });

  const content = `
    <div class="mythcraft chat-card spell-card essence-spell-chat-card" data-non-attack-spell="true">
      <header class="card-header" style="display:flex; align-items:center; justify-content:space-between; gap:8px; border-bottom:1px solid rgba(241,196,15,0.3); padding-bottom:6px; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
          <img src="${item.img}" alt="${item.name}" style="width:32px; height:32px; border-radius:4px; border:1px solid rgba(241,196,15,0.4); object-fit:cover; flex-shrink:0;" />
          <div>
            <h3 style="margin:0; font-size:14px; font-family:'Cinzel', serif; font-weight:700; color:#f1c40f; text-shadow:0 0 4px rgba(241,196,15,0.3);">${item.name}</h3>
            <span style="font-size:10px; color:#58b2c0; font-weight:600; text-transform:uppercase;">${magicSource ? `${magicSource} ${spellType}` : spellType}${funcLabel ? ` • ${funcLabel}` : ""}</span>
          </div>
        </div>
        ${defBadgeHTML}
      </header>
      ${tagsHTML}
      ${detailsHTML}
      <div class="card-description" style="font-size:12px; line-height:1.45; color:#f1f5f9; margin-top:6px;">
        ${description || "<p><em>No description provided.</em></p>"}
      </div>
      ${controlsHTML}
    </div>
  `;

  const msgData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flavor: deductResources ? `${actor.name} casts ${item.name}` : `${actor.name} shares ${item.name}`,
    flags: {
      "mythcraft-essence-sheet": {
        itemId: item.id,
        itemUuid: item.uuid,
        itemName: item.name,
        defenseTarget: targetDefense || null,
        isNonAttackSpell: true,
      },
    },
  };
  const activeRollMode = applyMessageRollMode(msgData, rollMode);
  return await ChatMessage.create(msgData, { rollMode: activeRollMode });
}

export async function rollSpellItem(actor, item, { rollMode = null } = {}) {
  if (!actor || !item || item.type !== "spell") return;

  const libEntry = getSpellLibraryEntry(item);
  const isAttackSpell = libEntry
    ? Boolean(libEntry.isAttack)
    : Boolean(item.system?.isAttack ?? (item.system?.defenseTarget || item.system?.defense));

  // If the spell is NOT an attack spell (Column M = False), post its description & upcharge card to chat instead of rolling a d20 attack
  if (!isAttackSpell) {
    return await postSpellDescriptionCard(actor, item, { deductResources: true, rollMode });
  }

  const aeSpellBonuses = getActorActiveEffectBonuses(actor);
  let scalingInfo = evaluateSpellScalingAndUpcharge(actor, libEntry || item, { afterBaseDeduction: false });
  const rawSpellApc = Number(item.system?.apc ?? item.system?.ap ?? 0);
  const rawSpellSpc = Number(item.system?.spc ?? item.system?.sp ?? 0);
  const apc = libEntry
    ? (typeof libEntry.apc === "number" ? scalingInfo.effectiveApc : 0)
    : (rawSpellApc > 0 ? Math.max(1, rawSpellApc - (aeSpellBonuses.reduceApc || 0) - (aeSpellBonuses.reduceSpellApc || 0)) : 0);
  const spc = libEntry
    ? (typeof libEntry.spc === "number" ? scalingInfo.effectiveSpc : 0)
    : (rawSpellSpc > 0 ? Math.max(0, rawSpellSpc - (aeSpellBonuses.reduceSpc || 0)) : 0);

  if (apc > 0 && game.combat?.started) {
    const allowed = await checkAndEnforceAp(actor, apc, item.name);
    if (!allowed) return;
  }
  if (spc > 0) {
    const allowedSp = await checkAndEnforceSp(actor, spc);
    if (!allowedSp) return;
  }

  if (apc > 0 && game.combat?.started && getSetting("attackAPMode", "auto") !== "disabled") {
    await deductAp(actor, apc);
  }
  if (spc > 0 && getSetting("spellSPMode", "auto") !== "disabled") {
    await deductSp(actor, spc);
  }

  scalingInfo = evaluateSpellScalingAndUpcharge(actor, libEntry || item, { afterBaseDeduction: true });

  const actorSpellAttrs = actor.flags?.["mythcraft-essence-sheet"]?.spellAttributes || {};
  const spellItemAttr = actorSpellAttrs[item.id]
    || item.flags?.["mythcraft-essence-sheet"]?.spellcastingAttribute
    || item.system?.spellcastingAttribute
    || item.system?.attribute;
  const globalMagicAttr = actor.flags?.["mythcraft-essence-sheet"]?.magicAttribute
    || actor.system?.sp?.attribute
    || actor.system?.attributes?.magic
    || "int";
  const spellcastingAbility = String(spellItemAttr || globalMagicAttr).toLowerCase().trim();
  const rawAttrVal = actor.system?.attributes?.[spellcastingAbility]?.value 
    ?? actor.system?.attributes?.[spellcastingAbility] 
    ?? (spellcastingAbility === "luck" ? actor.system?.attributes?.lck : (spellcastingAbility === "lck" ? actor.system?.attributes?.luck : undefined))
    ?? 0;
  let abilityMod = Number(rawAttrVal || 0);

  const powerLevels = actor.system?.powerLevel ?? {};
  const primarySource = Object.entries(powerLevels)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  const spellSourceKey = libEntry?.sourceKey || String(item.system?.magicSource || "").toLowerCase();
  const isPrimary = primarySource ? (spellSourceKey === primarySource.toLowerCase()) : true;
  if (primarySource && !isPrimary) abilityMod = Math.ceil(abilityMod / 2);

  const critHit = getActorCritHit(actor);
  const critFail = getActorCritFail(actor);
  const luck = Number(actor.system?.attributes?.luck?.value ?? actor.system?.attributes?.luck ?? 0);

  // MythCraft Rule: If LUCK < 0, subtract LUCK from every d20 roll
  let formula = `1d20 + ${abilityMod}`;
  if (luck < 0) {
    formula = `${formula} - ${Math.abs(luck)}`;
  }

  const SpellRollClass = mythcraft?.rolls?.SpellRoll || Roll;
  const defenseTarget = libEntry?.target || item.system?.defenseTarget || item.system?.defense || "AR";
  const roll = new SpellRollClass(formula, actor.getRollData(), {
    spellName: item.name,
    source: libEntry?.magicSource || item.system?.magicSource,
    isPrimary,
    critHit,
    flavor: `${item.name} - Spell Attack`,
    spc: libEntry ? scalingInfo.effectiveSpc : item.system?.spc,
    range: libEntry?.range || item.system?.rangeLabel,
    duration: libEntry?.duration || item.system?.durationLabel,
    defenseTarget,
  });

  if (typeof roll.evaluate === "function" && !roll._evaluated) {
    await roll.evaluate();
  }

  const d20Term = roll.terms?.find(t => t.faces === 20);
  const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? roll.dice?.[0]?.total;
  const isCrit = typeof d20Result === "number" && d20Result >= critHit;
  const isFumble = typeof d20Result === "number" && d20Result <= critFail;

  const isAstounding = hasAstoundingCritical(actor);
  if (isFumble && isAstounding) {
    if (actor.system?.ap !== undefined) {
      await actor.update({ "system.ap.value": 0 });
    }
    if (game.combat?.started && game.combat?.combatant?.actorId === actor.id) {
      if (game.user.isGM || game.combat.combatant?.isOwner) {
        await game.combat.nextTurn();
      }
    }
    ui.notifications.warn(`${actor.name} suffered a Critical Failure! Turn ended immediately and remaining AP lost (Astounding Critical).`);
  }

  const defBadgeHTML = defenseTarget ? renderDefenseTargetBadgeHTML(defenseTarget) : "";
  const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
  const resultLabel = isCrit ? "CRITICAL SUCCESS" : (isFumble ? "CRITICAL FAILURE" : "SPELL ATTACK");

  const details = [];
  if (libEntry?.magicSource) details.push(`<strong>Source:</strong> ${libEntry.magicSource} ${libEntry.spellType || "Spell"}`);
  if (libEntry?.function) details.push(`<strong>Function:</strong> ${libEntry.function}`);
  if (libEntry?.apc !== null && libEntry?.apc !== undefined) details.push(`<strong>APC:</strong> ${scalingInfo.effectiveApc || libEntry.apc}`);
  if (libEntry?.spc !== null && libEntry?.spc !== undefined) details.push(`<strong>SPC:</strong> ${scalingInfo.effectiveSpc}`);
  if (libEntry?.range) details.push(`<strong>Range:</strong> ${libEntry.range}`);
  if (libEntry?.duration) details.push(`<strong>Duration:</strong> ${libEntry.duration}`);
  if (libEntry?.requires) details.push(`<strong>Requires:</strong> ${libEntry.requires}`);
  if (libEntry?.materials) details.push(`<strong>Materials:</strong> ${libEntry.materials}`);

  const detailsHTML = details.length
    ? `<div class="spell-chat-details" style="display:flex; flex-wrap:wrap; gap:5px 12px; margin:6px 0; font-size:11px; color:#cbd5e1; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); padding:4px 0;">
        ${details.map(d => `<span>${d}</span>`).join("")}
       </div>`
    : "";

  const controlsHTML = buildSpellLibraryChatControlsHTML(actor, item, libEntry, scalingInfo, {
    isCrit,
    includeBaseDamageBtn: true,
  });

  const content = `
    <div class="mythcraft-statblock spell-card essence-spell-chat-card">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <img src="${item.img}" style="border: 1px solid #a8d5e2; border-radius: 4px; height: 32px; width: 32px; object-fit: cover; margin-right: 8px; flex-shrink: 0;" />
          <span class="card-title" style="font-family: 'Cinzel', serif; font-size: 14px; color: #FEEBB3; font-weight: 700;">${item.name}</span>
        </div>
        ${defBadgeHTML}
      </div>
      ${detailsHTML}
      <div class="roll-result ${resultClass}">
        <div class="roll-label">${resultLabel}</div>
        <div class="roll-value">${roll.total}</div>
        <div class="roll-formula">${roll.formula}</div>
        ${(isFumble && isAstounding) ? '<div class="astounding-fumble-banner" style="margin-top: 6px; padding: 4px 8px; background: rgba(192, 57, 43, 0.35); border: 1px solid #e74c3c; border-radius: 4px; color: #ff9999; font-size: 11px; font-weight: 700; text-align: center;"><i class="fas fa-skull-crossbones"></i> Astounding Critical Failure: Turn Ended &amp; AP Lost!</div>' : ''}
      </div>
      ${controlsHTML}
    </div>
  `;

  const msgData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: item.name,
    content: content,
    rolls: [roll],
    flags: {
      "mythcraft-essence-sheet": {
        itemId: item.id,
        itemUuid: item.uuid,
        itemName: item.name,
        defenseTarget,
        isSpellCheck: true,
        isAttack: true,
        critHit,
        isCrit,
        isFumble,
      },
    },
  };

  const activeRollMode = applyMessageRollMode(msgData, rollMode);

  if (CONST.CHAT_MESSAGE_STYLES) {
    msgData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
  }

  return await ChatMessage.create(msgData, { rollMode: activeRollMode });
}

/**
 * Execute a full Weapon Attack roll for an actor, matching the Essence Sheet chat card format
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [options={}]
 * @param {string|null} [options.rollMode=null]
 * @param {number} [options.ta=0]
 * @param {number} [options.td=0]
 * @param {number} [options.bonus=0]
 * @param {number} [options.apReduce=0]
 * @param {string|null} [options.extraDice=null]
 * @param {string|null} [options.extraType=null]
 */
export async function rollWeaponItem(actor, item, { rollMode = null, ta = 0, td = 0, bonus = 0, apReduce = 0, extraDice = null, extraType = null } = {}) {
  if (!actor || !item || item.type !== "weapon") return;

  const baseApc = getSafeWeaponApc(item, actor);
  const apc = Math.max(0, baseApc - (Number(apReduce) || 0));
  if (apc > 0 && game.combat?.started) {
    const allowed = await checkAndEnforceAp(actor, apc, item.name);
    if (!allowed) return;
  }

  if (apc > 0 && game.combat?.started && getSetting("attackAPMode", "auto") !== "disabled") {
    await deductAp(actor, apc);
  }

  const weaponData = getWeaponDamageData(actor, item);
  const attr = weaponData.attrKey || item.system?.attr || "str";
  const attrValue = Number(actor.system?.attributes?.[attr]?.value ?? actor.system?.attributes?.[attr] ?? 0);
  const critHit = getActorCritHit(actor);
  const critFail = getActorCritFail(actor);
  const details = getWeaponAttackModifierDetails(item, actor);
  const itemAtkMod = details.itemMod;
  const aeAtkBonus = details.aeMod;
  const luck = Number(actor.system?.attributes?.luck?.value ?? actor.system?.attributes?.luck ?? 0);

  // Consumed Souls Modifier only affects damage, not attack modifier
  const enableClaimed = Boolean(
    item.flags?.["mythcraft-essence-sheet"]?.enableClaimedSouls ||
    item.flags?.["mythcraft-essence-sheet"]?.enableConsumedSouls ||
    item.system?.enableClaimedSouls ||
    item.system?.enableConsumedSouls
  );
  const claimedSouls = enableClaimed ? Math.min(5, Math.max(0, Number(
    item.flags?.["mythcraft-essence-sheet"]?.consumedSouls ??
    item.flags?.["mythcraft-essence-sheet"]?.claimedSouls ??
    item.system?.consumedSouls ??
    item.system?.claimedSouls ??
    0
  ))) : 0;

  // Build formula and structured modifiers for both Essence cards and MythCraft HUD
  const attrLabel = attr.toUpperCase();
  const formulaParts = ["1d20"];
  const modifiers = [];

  // 1. Attribute modifier
  if (attrValue !== 0) {
    formulaParts.push(attrValue > 0 ? `+ ${attrValue}` : `- ${Math.abs(attrValue)}`);
    modifiers.push({
      label: `${attrLabel} Modifier`,
      value: attrValue,
      text: attrValue > 0 ? `+${attrValue}` : `${attrValue}`,
      cssClass: attrValue >= 0 ? "positive" : "negative",
    });
  }

  // 2. Weapon item-level attack modifier
  if (itemAtkMod !== 0) {
    const itemLabel = details.itemLabel || (item.name ? `${item.name} Attack Mod` : "Weapon Attack Mod");
    formulaParts.push(itemAtkMod > 0 ? `+ ${itemAtkMod}` : `- ${Math.abs(itemAtkMod)}`);
    modifiers.push({
      label: itemLabel,
      value: itemAtkMod,
      text: itemAtkMod > 0 ? `+${itemAtkMod}` : `${itemAtkMod}`,
      cssClass: itemAtkMod >= 0 ? "positive" : "negative",
    });
  }

  // 3. Active Effect / Actor-level attack bonus (by talent/feature source)
  if (Array.isArray(details.aeSources) && details.aeSources.length > 0) {
    for (const src of details.aeSources) {
      if (!src || src.value === 0) continue;
      formulaParts.push(src.value > 0 ? `+ ${src.value}` : `- ${Math.abs(src.value)}`);
      modifiers.push({
        label: src.label || "Attack Bonus",
        value: src.value,
        text: src.value > 0 ? `+${src.value}` : `${src.value}`,
        cssClass: src.value >= 0 ? "positive" : "negative",
      });
    }
  } else if (aeAtkBonus !== 0) {
    const aeLabel = details.aeLabel || "Attack Bonus";
    formulaParts.push(aeAtkBonus > 0 ? `+ ${aeAtkBonus}` : `- ${Math.abs(aeAtkBonus)}`);
    modifiers.push({
      label: aeLabel,
      value: aeAtkBonus,
      text: aeAtkBonus > 0 ? `+${aeAtkBonus}` : `${aeAtkBonus}`,
      cssClass: aeAtkBonus >= 0 ? "positive" : "negative",
    });
  }

  // 4. Situational Bonus (e.g. from dialog or roll data)
  const situationalBonus = Number(bonus) || 0;
  if (situationalBonus !== 0) {
    formulaParts.push(situationalBonus > 0 ? `+ ${situationalBonus}` : `- ${Math.abs(situationalBonus)}`);
    modifiers.push({
      label: "Situational Bonus",
      value: situationalBonus,
      text: situationalBonus > 0 ? `+${situationalBonus}` : `${situationalBonus}`,
      cssClass: situationalBonus >= 0 ? "positive" : "negative",
    });
  }

  // 5. MythCraft Rule: If LUCK < 0, subtract LUCK from every d20 roll
  if (luck < 0) {
    formulaParts.push(`- ${Math.abs(luck)}`);
    modifiers.push({
      label: "Luck Penalty",
      value: luck,
      text: `${luck}`,
      cssClass: "negative",
    });
  }

  // 6. Tactical Advantage / Disadvantage
  const taVal = Number(ta) || 0;
  const tdVal = Number(td) || 0;
  if (taVal > 0) {
    modifiers.push({
      label: "Tactical Advantage",
      value: taVal,
      text: `+${taVal}`,
      cssClass: "positive",
    });
  }
  if (tdVal > 0) {
    modifiers.push({
      label: "Tactical Disadvantage",
      value: -tdVal,
      text: `-${tdVal}`,
      cssClass: "negative",
    });
  }

  let formula = formulaParts.join(" ");
  if (formula === "1d20") {
    formula = "1d20 + 0";
  }

  const rollData = actor.getRollData ? actor.getRollData() : {};
  rollData.rollModes = {
    ...(rollData.rollModes || {}),
    ta: (rollData.rollModes?.ta || 0) + taVal,
    td: (rollData.rollModes?.td || 0) + tdVal,
    bonus: (rollData.rollModes?.bonus || 0) + situationalBonus,
  };

  const totalModBonus = attrValue + itemAtkMod + aeAtkBonus + situationalBonus + (luck < 0 ? luck : 0);
  const totalModText = totalModBonus >= 0 ? `+${totalModBonus}` : `${totalModBonus}`;

  // Damage array (plus extra dice if rolled from Tactical Dialog)
  const damages = [{ formula: weaponData.effectiveFormula, type: weaponData.damageType || "blunt" }];
  if (extraDice && String(extraDice).trim()) {
    damages.push({ formula: String(extraDice).trim(), type: extraType || weaponData.damageType || "blunt" });
  }

  const AttackRollClass = mythcraft?.rolls?.AttackRoll || Roll;
  const roll = new AttackRollClass(formula, rollData, {
    weaponName: item.name,
    weaponAttr: attr,
    flavor: `${item.name} - Attack Roll`,
    defenseTarget: item.system?.defenseTarget || "ar",
    critHit,
    critFail,
    damage: damages,
    modifiers,
    mythcraftBonusValue: totalModBonus,
    mythcraftBonusText: totalModText,
  });

  roll.options.modifiers = modifiers;
  roll.options.mythcraftBonusValue = totalModBonus;
  roll.options.mythcraftBonusText = totalModText;

  if (typeof roll.evaluate === "function" && !roll._evaluated) {
    await roll.evaluate();
  }

  const d20Term = roll.terms?.find(t => t.faces === 20);
  const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? roll.dice?.[0]?.total;
  const isCrit = typeof d20Result === "number" && d20Result >= critHit;
  const isFumble = typeof d20Result === "number" && d20Result <= critFail;

  const isAstounding = hasAstoundingCritical(actor);
  if (isFumble && isAstounding) {
    if (actor.system?.ap !== undefined) {
      await actor.update({ "system.ap.value": 0 });
    }
    if (game.combat?.started && game.combat?.combatant?.actorId === actor.id) {
      if (game.user.isGM || game.combat.combatant?.isOwner) {
        await game.combat.nextTurn();
      }
    }
    ui.notifications.warn(`${actor.name} suffered a Critical Failure! Turn ended immediately and remaining AP lost (Astounding Critical).`);
  }

  const defenseTarget = item.system?.defenseTarget || item.system?.defense || "ar";
  const defBadgeHTML = renderDefenseTargetBadgeHTML(defenseTarget);
  const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
  const resultLabel = isCrit ? "CRITICAL HIT" : (isFumble ? "CRITICAL FAILURE" : "ATTACK ROLL");

  const aePillsHTML = (Array.isArray(details.aeSources) && details.aeSources.length > 0)
    ? details.aeSources.filter(s => s && s.value !== 0).map(s => `
        <span class="breakdown-part ae-mod-part" style="padding: 2px 6px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.45); border-radius: 4px; color: #93c5fd; font-weight: 600;"><i class="fas fa-sparkles"></i> ${s.value > 0 ? `+${s.value}` : s.value} (${s.label})</span>
      `).join("")
    : (aeAtkBonus !== 0
      ? `<span class="breakdown-part ae-mod-part" style="padding: 2px 6px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.45); border-radius: 4px; color: #93c5fd; font-weight: 600;"><i class="fas fa-sparkles"></i> ${aeAtkBonus > 0 ? `+${aeAtkBonus}` : aeAtkBonus} (${details.aeLabel})</span>`
      : "");

  const rollHTML = (typeof roll.render === "function") ? await roll.render() : "";

  const content = `
    <div class="mythcraft-statblock attack-card">
      <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <img src="${item.img}" style="border: 1px solid #a8d5e2; border-radius: 4px; height: 32px; width: 32px; object-fit: cover; margin-right: 8px; flex-shrink: 0;" />
          <span class="card-title" style="font-family: 'Cinzel', serif; font-size: 14px; color: #FEEBB3; font-weight: 700;">${item.name}</span>
        </div>
        ${defBadgeHTML}
      </div>
      <div class="roll-result ${resultClass}">
        <div class="roll-label">${resultLabel}</div>
        <div class="roll-value">${roll.total}</div>
        <div class="roll-formula">${roll.formula}</div>
        <div class="roll-breakdown-details" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; margin-top: 6px; padding-top: 5px; border-top: 1px dashed rgba(255, 255, 255, 0.15); font-size: 11px;">
          <span class="breakdown-part d20-part" style="padding: 2px 6px; background: rgba(0,0,0,0.35); border-radius: 4px; color: #cbd5e1;"><i class="fas fa-dice-d20"></i> ${d20Result} (Base d20)</span>
          ${attrValue !== 0 ? `<span class="breakdown-part attr-part" style="padding: 2px 6px; background: rgba(0,0,0,0.35); border-radius: 4px; color: #cbd5e1;">${attrValue > 0 ? `+${attrValue}` : attrValue} (${attrLabel})</span>` : ""}
          ${itemAtkMod !== 0 ? `<span class="breakdown-part weapon-mod-part" style="padding: 2px 6px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.45); border-radius: 4px; color: #6ee7b7; font-weight: 600;"><i class="fas fa-crosshairs"></i> ${itemAtkMod > 0 ? `+${itemAtkMod}` : itemAtkMod} (${details.itemLabel})</span>` : ""}
          ${aePillsHTML}
          ${situationalBonus !== 0 ? `<span class="breakdown-part sit-mod-part" style="padding: 2px 6px; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 4px; color: #fcd34d; font-weight: 600;">${situationalBonus > 0 ? `+${situationalBonus}` : situationalBonus} (Situational Bonus)</span>` : ""}
          ${taVal > 0 ? `<span class="breakdown-part ta-part" style="padding: 2px 6px; background: rgba(16, 185, 129, 0.2); border-radius: 4px; color: #6ee7b7;">+${taVal} (TA)</span>` : ""}
          ${tdVal > 0 ? `<span class="breakdown-part td-part" style="padding: 2px 6px; background: rgba(239, 68, 68, 0.2); border-radius: 4px; color: #fca5a5;">-${tdVal} (TD)</span>` : ""}
          ${luck < 0 ? `<span class="breakdown-part luck-part" style="padding: 2px 6px; background: rgba(239, 68, 68, 0.2); border-radius: 4px; color: #fca5a5;">${luck} (Luck Penalty)</span>` : ""}
        </div>
        ${(isFumble && isAstounding) ? '<div class="astounding-fumble-banner" style="margin-top: 6px; padding: 4px 8px; background: rgba(192, 57, 43, 0.35); border: 1px solid #e74c3c; border-radius: 4px; color: #ff9999; font-size: 11px; font-weight: 700; text-align: center;"><i class="fas fa-skull-crossbones"></i> Astounding Critical Failure: Turn Ended &amp; AP Lost!</div>' : ''}
      </div>
      ${rollHTML ? `<div class="essence-embedded-roll-html" style="margin-top: 4px;">${rollHTML}</div>` : ""}
    </div>
  `;

  const msgData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: item.name,
    content: content,
    rolls: [roll],
    flags: {
      "mythcraft-essence-sheet": {
        itemId: item.id,
        itemUuid: item.uuid,
        itemName: item.name,
        defenseTarget,
        isAttack: true,
        claimedSouls,
        enableClaimedSouls: enableClaimed,
        critHit,
        isCrit,
        isFumble,
      },
    },
  };

  const activeRollMode = applyMessageRollMode(msgData, rollMode);

  if (CONST.CHAT_MESSAGE_STYLES) {
    msgData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
  }

  return await ChatMessage.create(msgData, { rollMode: activeRollMode });
}

/**
 * Calculates effective critical hit threshold based on actor Luck and Damage Modification settings.
 * MythCraft Rule: If LUCK < 0, you can NEVER critically hit.
 * Base Hit (default 20) - Luck Bonus (1 for Luck 6-11, 2 for Luck 12+) - Ability Crit Bonus (min 16).
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorCritHit(actor) {
  if (!actor) return 20;
  const luck = Number(actor.system?.attributes?.luck?.value ?? actor.system?.attributes?.luck ?? 0);
  if (luck < 0) return 999; // Never critically hit

  const luckBonus = luck >= 12 ? 2 : (luck >= 6 ? 1 : 0);
  const baseHit = Number(actor.system?.critical?.hit ?? 20);
  const flagCrit = Number(actor.flags?.["mythcraft-essence-sheet"]?.critBonus ?? actor.flags?.["mythcraft"]?.critBonus ?? 0);
  const aeCrit = Number(getActorActiveEffectBonuses(actor)?.critBonus ?? 0);
  const critBonus = Math.max(flagCrit, aeCrit);
  return Math.max(16, baseHit - luckBonus - critBonus);
}

/**
 * Checks whether an actor possesses the "Astounding Critical" talent or benefits from the "Jitterbone's Bonebreaker" rule variant.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function hasAstoundingCritical(actor) {
  if (!actor) return false;

  // 1. Community House Rule: "Jitterbone's Bonebreaker" variant gives it to all character actors by default
  if (getSetting("jitterboneBonebreakerRule", false)) {
    if (actor.type === "character" || !actor.type) {
      return true;
    }
  }

  // 2. Check items on actor for Astounding Critical talent or feature
  const items = actor.items || [];
  return items.some(item => {
    const name = (item.name || "").toLowerCase().trim();
    if (name.includes("astounding critical")) return true;
    const desc = String(item.system?.description?.value || item.system?.description || "").toLowerCase();
    return desc.includes("astounding critical") ||
      (desc.includes("max damage on a damage die") && desc.includes("set that die aside"));
  });
}

/**
 * Converts standard dice terms (e.g. "1d6", "2d8", "d12") into exploding dice terms ("1d6x", "2d8x", "d12x")
 * @param {string} formula
 * @returns {string}
 */
export function makeExplodingDiceFormula(formula) {
  if (!formula || typeof formula !== "string") return formula;
  return formula.replace(/(\d*d\d+)(?!x)/gi, (m) => `${m}x`);
}

/**
 * Calculates effective critical failure threshold based on actor settings (default 1).
 * If the actor has the Astounding Critical talent (or Jitterbone's Bonebreaker rule),
 * the critical failure range doubles (e.g. 1 -> 2, 2 -> 4).
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorCritFail(actor) {
  if (!actor) return 1;
  const baseFail = Number(actor.system?.critical?.effectiveFail ?? actor.system?.critical?.fail ?? 1);
  if (hasAstoundingCritical(actor)) {
    return Math.max(1, baseFail * 2);
  }
  return Math.max(1, baseFail);
}

/**
 * Checks whether an item is marked as favorite
 * @param {Item} item
 * @returns {boolean}
 */
export function isItemFavorite(item) {
  if (!item) return false;
  return !!(
    item.system?.favorite ||
    item.flags?.["mythcraft-essence-sheet"]?.favorite ||
    item.flags?.mythcraft?.favorite ||
    item.flags?.core?.favorite
  );
}

export default class EssenceCharacterSheet extends CharacterSheet {

  expandedItems = new Set();
  collapsedItems = new Set();
  expandedEffects = new Set();
  activeMagicFilters = new Set();

  /**
   * Players who own their actor document can always edit their sheet.
   * @override
   */
  get isEditable() {
    return Boolean(this.document?.isOwner || game.user?.isGM);
  }

  static DEFAULT_OPTIONS = {
    classes: ["mythcraft", "actor", "sheet", "essence-sheet"],
    position: { width: 920, height: 890 },
    actions: {
      editDamageMod: this.#editDamageMod,
      editMovement: this.#editMovement,
      editSenses: this.#editSenses,
      editConditions: this.#editConditions,
      openWalletDialog: this.#openWalletDialog,
      openRestDialog: this.#openRestDialog,
      openLevelUpDialog: this.#openLevelUpDialog,
      openCharacterCreationWizard: this.#openCharacterCreationWizard,
      openTalentTreeViewer: this.#openTalentTreeViewer,
      openTab: this.#openTab,
      toggleItemEmbed: this.#toggleItemEmbed,
      toggleEffectEmbed: this.#toggleEffectEmbed,
      toggleAffinity: this.#toggleAffinity,
      toggleImmunity: this.#toggleImmunity,
      deleteDoc: this.#deleteDoc,
      removeCondition: this.#removeCondition,
      removeAdditionalInfo: this.#removeAdditionalInfo,
      removeJournalEntry: this.#removeJournalEntry,
      removeContact: this.#removeContact,
      removeResource: this.#removeResource,
      rollDamage: this.#rollDamage,
      rollAttack: this.#rollAttack,
      rollSpell: this.#rollSpell,
      postSpellToChat: this.#postSpellToChat,
      postItemToChat: this.#postItemToChat,
      editImage: this.#editImage,
      showImage: this.#showImage,
      toggleAttunement: this.#toggleAttunement,
      toggleDonArmor: this.#toggleDonArmor,
      toggleWearEnhancement: this.#toggleWearEnhancement,
      toggleEquipShield: this.#toggleEquipShield,
      openArmorPicker: this.#openArmorPicker,
      adjustAp: this.#adjustAp,
      adjustLp: this.#adjustLp,
      createDoc: this.#createDoc,
      toggleContainer: this.#toggleContainer,
      removeFromContainer: this.#removeFromContainer,
      openContainerTab: this.#openContainerTab,
      toggleWearClothes: this.#toggleWearClothes,
      toggleEquipWeapon: this.#toggleEquipWeapon,
      toggleHandAndHalfMode: this.#toggleHandAndHalfMode,
      openHandEquipPicker: this.#openHandEquipPicker,
      toggleSideDrawer: this.#toggleSideDrawer,
      closeSideDrawer: this.#closeSideDrawer,
      toggleFavorite: this.#toggleFavorite,
      toggleEffect: this.#toggleEffect,
      createEffect: this.#createEffect,
      openActiveEffectManager: this.#openActiveEffectManager,
      syncTalentEffects: this.#syncTalentEffects,
      toggleJournalCard: this.#toggleJournalCard,
      addAdditionalInfo: this.#addAdditionalInfo,
      addJournalEntry: this.#addJournalEntry,
      addContact: this.#addContact,
      addResource: this.#addResource,
      configureSecondSkin: this.#configureSecondSkin,
      allocateTalentSkills: this.#allocateTalentSkills,
      configureTalentGrants: this.#configureTalentGrants,
      viewDoc: this.#viewDoc,
    },
  };

  /**
   * Action handler to open the Second Skin specialization choice dialog for a talent.
   */
  static async #configureSecondSkin(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    SecondSkinChoiceDialog.promptChoice(item);
  }

  /**
   * Action handler to open the Skill Allocation dialog for a talent item.
   */
  static async #allocateTalentSkills(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const res = await TalentSkillAllocationDialog.promptAllocation(this.actor, item);
    if (res?.confirmed) {
      this.render(false);
    }
  }

  /**
   * Action handler to open the Talent Grant / Track Picks dialog for a talent item.
   */
  static async #configureTalentGrants(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await TalentGrantDialog.processTalentGrantsAndPicks(this.actor, item);
    this.render(false);
  }

  /**
   * Helper to prompt a confirmation dialog before deletion.
   */
  static async #confirmDeletion(title, message) {
    if (foundry.applications?.api?.DialogV2?.confirm) {
      return await foundry.applications.api.DialogV2.confirm({
        window: { title },
        content: `<p style="margin-bottom: 8px; font-size: 13px;">${message}</p><p style="font-size: 11px; opacity: 0.7;">This action cannot be undone.</p>`,
        yes: { label: "Delete", icon: "fas fa-trash", callback: () => true },
        no: { label: "Cancel", icon: "fas fa-times", callback: () => false },
        defaultYes: false,
        rejectClose: false,
      });
    } else {
      return await Dialog.confirm({
        title,
        content: `<p style="margin-bottom: 8px; font-size: 13px;">${message}</p><p style="font-size: 11px; opacity: 0.7;">This action cannot be undone.</p>`,
        yes: () => true,
        no: () => false,
        defaultYes: false,
      });
    }
  }

  static async #deleteDoc(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const docClass = target.dataset.documentClass || target.closest("[data-document-class]")?.dataset.documentClass || "Item";
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const effectId = target.dataset.effectId || target.closest("[data-effect-id]")?.dataset.effectId;
    const parentItemId = target.dataset.parentItemId || target.closest("[data-parent-item-id]")?.dataset.parentItemId;

    let doc = null;
    if (docClass === "ActiveEffect" || effectId) {
      if (parentItemId) {
        doc = this.actor.items.get(parentItemId)?.effects?.get(effectId || itemId);
      }
      if (!doc) {
        doc = this.actor.effects.get(effectId || itemId);
      }
      if (!doc) {
        for (const it of this.actor.items || []) {
          doc = it.effects?.get(effectId || itemId);
          if (doc) break;
        }
      }
    } else {
      doc = this.actor.items.get(itemId);
    }

    if (!doc) return;

    const docName = doc.name || doc.label || "this item";
    const docTypeName = doc.type ? (doc.type.charAt(0).toUpperCase() + doc.type.slice(1)) : (docClass === "ActiveEffect" ? "Effect" : "Item");

    const confirmed = await EssenceCharacterSheet.#confirmDeletion(
      `Delete ${docTypeName}?`,
      `Are you sure you want to delete <strong>${docName}</strong>?`
    );

    if (confirmed) {
      await doc.delete();
    }
  }

  static async #removeCondition(event, target) {
    const effectId = target.dataset.effectId;
    if (!effectId) return;
    const effect = this.actor.effects.get(effectId);
    if (!effect) return;

    const name = effect.name || effect.label || "this condition";
    const confirmed = await EssenceCharacterSheet.#confirmDeletion(
      "Remove Condition?",
      `Are you sure you want to remove <strong>${name}</strong>?`
    );
    if (confirmed) {
      await effect.delete();
    }
  }

  static async #removeAdditionalInfo(event, target) {
    const entryId = target.dataset.entryId;
    if (!entryId) return;
    const entry = this.actor.system?.additionalInfo?.[entryId];
    const name = entry?.name || "this entry";

    const confirmed = await EssenceCharacterSheet.#confirmDeletion(
      "Delete Entry?",
      `Are you sure you want to delete <strong>${name}</strong>?`
    );
    if (confirmed) {
      await this.actor.update({ [`system.additionalInfo.-=${entryId}`]: null });
    }
  }

  static async #removeJournalEntry(event, target) {
    const entryId = target.dataset.entryId;
    if (!entryId) return;
    const entry = this.actor.system?.journal?.[entryId];
    const name = entry?.name || "this journal entry";

    const confirmed = await EssenceCharacterSheet.#confirmDeletion(
      "Delete Journal Entry?",
      `Are you sure you want to delete <strong>${name}</strong>?`
    );
    if (confirmed) {
      await this.actor.update({ [`system.journal.-=${entryId}`]: null });
    }
  }

  static async #removeContact(event, target) {
    const entryId = target.dataset.entryId;
    if (!entryId) return;
    const entry = this.actor.system?.contacts?.[entryId];
    const name = entry?.name || "this contact";

    const confirmed = await EssenceCharacterSheet.#confirmDeletion(
      "Delete Contact?",
      `Are you sure you want to delete <strong>${name}</strong>?`
    );
    if (confirmed) {
      await this.actor.update({ [`system.contacts.-=${entryId}`]: null });
    }
  }

  static async #removeResource(event, target) {
    const entryId = target.dataset.entryId;
    if (!entryId) return;
    const entry = this.actor.system?.resources?.[entryId];
    const name = entry?.name || "this resource";

    const confirmed = await EssenceCharacterSheet.#confirmDeletion(
      "Delete Resource?",
      `Are you sure you want to delete <strong>${name}</strong>?`
    );
    if (confirmed) {
      await this.actor.update({ [`system.resources.-=${entryId}`]: null });
    }
  }

  static async #rollDamage(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    const isCrit = event.shiftKey || target.dataset.isCrit === "true";
    return rollItemDamage(this.actor, item, { isCrit });
  }

  static async #rollAttack(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "weapon") return;
    return await rollWeaponItem(this.actor, item);
  }


  static async #rollSpell(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "spell") return;
    return await rollSpellItem(this.actor, item);
  }


  static async #editImage(event, target) {
    if (!this.isEditable) return;

    // Resolve the actual IMG element for Foundry's native #onEditImage handler
    const imgElement = target.tagName === "IMG" 
      ? target 
      : (target.querySelector("img") || target.closest(".portrait-box, .npc-portrait-box")?.querySelector("img") || target);

    // Check if upstream DocumentSheet / ActorSheet provides an editImage action
    const superAction = super.constructor?.DEFAULT_OPTIONS?.actions?.editImage
      || foundry?.applications?.sheets?.ActorSheet?.DEFAULT_OPTIONS?.actions?.editImage
      || foundry?.applications?.sheets?.DocumentSheetV2?.DEFAULT_OPTIONS?.actions?.editImage
      || foundry?.applications?.api?.DocumentSheetV2?.DEFAULT_OPTIONS?.actions?.editImage;

    if (typeof superAction === "function") {
      try {
        return await superAction.call(this, event, imgElement);
      } catch (err) {
        // Fallback to direct FilePicker if superAction fails
      }
    }

    const attr = imgElement.dataset.edit || "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const fp = new FilePicker({
      type: "image",
      current,
      callback: path => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  static async #showImage(event, target) {
    event.stopPropagation();
    const attr = target.dataset.edit || "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const ImagePopoutApp = foundry.applications.apps.ImagePopout || globalThis.ImagePopout;
    const ip = new ImagePopoutApp({
      src: current,
      window: { title: this.document.name },
      shareable: true,
      uuid: this.document.uuid,
    });
    ip.render(true);
  }

  static #viewDoc(event, target) {
    if (event) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    const el = target || event?.currentTarget || event?.target;
    const itemId = el?.dataset?.itemId 
      || el?.dataset?.talentId
      || el?.closest?.("[data-item-id]")?.dataset?.itemId 
      || el?.closest?.("[data-talent-id]")?.dataset?.talentId
      || el?.closest?.(".item")?.dataset?.itemId;
    const effectId = el?.dataset?.effectId 
      || el?.closest?.("[data-effect-id]")?.dataset?.effectId;
    const parentItemId = el?.dataset?.parentItemId
      || el?.closest?.("[data-parent-item-id]")?.dataset?.parentItemId;

    if (itemId && !effectId) {
      const item = this.actor.items.get(itemId);
      if (item) return item.sheet.render(true);
    }
    if (effectId) {
      let effect = parentItemId
        ? this.actor.items.get(parentItemId)?.effects?.get(effectId)
        : this.actor.effects.get(effectId);
      if (!effect) {
        for (const it of this.actor.items || []) {
          effect = it.effects?.get(effectId);
          if (effect) break;
        }
      }
      if (effect) return effect.sheet.render(true);
    }

    const docRow = el?.closest?.("[data-document-class]");
    if (docRow) {
      const cls = docRow.dataset.documentClass;
      const id = docRow.dataset.itemId || docRow.dataset.id;
      if (cls === "Item" && id) return this.actor.items.get(id)?.sheet?.render(true);
      if (cls === "ActiveEffect" && id) return this.actor.effects.get(id)?.sheet?.render(true);
    }
  }

  static async #toggleAttunement(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const current = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;
    const nextState = !current;
    await item.setFlag("mythcraft-essence-sheet", "isAttuned", nextState);
    
    const cost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
    if (nextState) {
      ui.notifications.info(`Bound ${cost} Essence to ${item.name}`);
    } else {
      ui.notifications.info(`Released ${cost} Essence from ${item.name}`);
    }
  }

  static async #toggleDonArmor(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "armor") return;

    if (isArmorEnhancement(item)) {
      return EssenceCharacterSheet.#toggleWearEnhancement.call(this, event, target);
    }

    if (isShield(item)) {
      return EssenceCharacterSheet.#toggleEquipShield.call(this, event, target);
    }

    const isCurrentlyDonned = item.system?.equipped === true || item.flags?.["mythcraft-essence-sheet"]?.isDonned === true;
    const newDonState = !isCurrentlyDonned;

    // If donning this armor, un-don all other body armor items on the actor (excluding shields and enhancements)
    if (newDonState) {
      const otherArmors = this.actor.itemTypes.armor.filter(a => a.id !== item.id && !isShield(a) && !isArmorEnhancement(a) && (a.system?.equipped || a.flags?.["mythcraft-essence-sheet"]?.isDonned));
      for (const other of otherArmors) {
        await other.update({
          "system.equipped": false,
          "flags.mythcraft-essence-sheet.isDonned": false,
        });
      }
    }

    await item.update({
      "system.equipped": newDonState,
      "flags.mythcraft-essence-sheet.isDonned": newDonState,
    });

    // Check STR requirements and update Dazed condition
    await syncArmorStrConditions(this.actor);

    // Recalculate effective defenses in memory
    applyEffectiveArmorAndDefenses(this.actor);

    const stateLabel = newDonState ? "Donned" : "Doffed";
    ui.notifications.info(`${item.name} is now ${stateLabel}. (AR: ${this.actor.system.defenses.ar})`);
    this.render(false);
  }

  static async #toggleWearEnhancement(event, target) {
    event.stopPropagation();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "armor") return;

    const isCurrentlyWorn = isEnhancementEquipped(item);
    const newWearState = !isCurrentlyWorn;

    // Only one enhancement may be equipped at a time
    if (newWearState) {
      const otherEnhancements = this.actor.itemTypes.armor.filter(a => a.id !== item.id && isArmorEnhancement(a) && isEnhancementEquipped(a));
      for (const other of otherEnhancements) {
        await other.update({
          "system.equipped": false,
          "flags.mythcraft-essence-sheet.isWorn": false,
          "flags.mythcraft-essence-sheet.isDonned": false,
        });
      }
    }

    await item.update({
      "system.equipped": newWearState,
      "flags.mythcraft-essence-sheet.isWorn": newWearState,
      "flags.mythcraft-essence-sheet.isDonned": newWearState,
    });

    // Check STR requirements and update Dazed condition
    await syncArmorStrConditions(this.actor);

    // Recalculate effective defenses in memory
    applyEffectiveArmorAndDefenses(this.actor);

    const stateLabel = newWearState ? "Worn" : "Removed";
    ui.notifications.info(`${item.name} enhancement is now ${stateLabel}. (AR: ${this.actor.system.defenses.ar})`);
    this.render(false);
  }

  static async #toggleEquipShield(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const targetHand = target.dataset.hand || null;
    const item = this.actor.items.get(itemId);
    if (item) {
      await toggleEquipShield(this.actor, item, targetHand);
      this.render(false);
    }
  }

  static async #adjustAp(event, target) {
    event.stopPropagation();
    event.preventDefault();
    const delta = Number(target.dataset.delta || 0);
    if (!delta) return;

    const currentAp = Number(this.actor.system?.ap?.value ?? 0);
    const newAp = Math.max(0, currentAp + delta);

    await this.actor.update({ "system.ap.value": newAp });
    this.render(false);
  }

  static async #adjustLp(event, target) {
    event.stopPropagation();
    event.preventDefault();
    const delta = Number(target.dataset.delta || 0);
    if (!delta) return;

    const currentLp = Number(this.actor.system?.lp?.value ?? 0);
    const luck = Number(this.actor.system?.attributes?.luck?.value ?? this.actor.system?.attributes?.luck ?? 0);
    const maxLp = Math.max(0, Math.floor(luck / 2));
    const newLp = Math.max(0, Math.min(maxLp || 999, currentLp + delta));

    await this.actor.update({ "system.lp.value": newLp });
    this.render(false);
  }

  static async #createDoc(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const docClass = target.dataset.documentClass || "Item";
    const type = target.dataset.type || "weapon";

    if (docClass === "Item") {
      const defaultTypeNames = {
        weapon: "New Weapon",
        armor: "New Armor",
        equipment: "New Equipment",
        spell: "New Spell",
        talent: "New Talent",
        feature: "New Feature",
        lineage: "New Lineage",
        background: "New Background",
        profession: "New Profession",
        class: "New Class",
      };
      const name = defaultTypeNames[type] || `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const itemData = {
        name,
        type,
        img: "icons/svg/item-bag.svg",
      };

      for (const [key, val] of Object.entries(target.dataset)) {
        if (["action", "documentClass", "type"].includes(key)) continue;
        foundry.utils.setProperty(itemData, key, val);
      }

      if (type === "spell" && !itemData["system.magicSource"] && !itemData.system?.magicSource) {
        foundry.utils.setProperty(itemData, "system.magicSource", "arcane");
      }

      const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      if (created?.[0]) {
        created[0].sheet?.render(true);
      }
      return created;
    } else if (docClass === "ActiveEffect") {
      return this.#createEffect(event, target);
    }
  }

  static async #openArmorPicker(event, target) {
    event.stopPropagation();
    const armorType = target.dataset.armorType || "body"; // "body" or "shield"
    
    if (armorType === "shield") {
      const availableShields = (this.actor.itemTypes?.armor || []).filter(a => isShield(a) && !isShieldEquipped(a));
      if (!availableShields.length) {
        ui.notifications.info("No unequipped shields available in inventory.");
        return;
      }

      const optionsHtml = availableShields.map(s => {
        const bonus = getShieldArBonus(s);
        return `<button type="button" class="equip-picker-option" data-item-id="${s.id}" style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:6px; padding:6px 10px; background:#14171a; border:1px solid #3a7a7f; border-radius:4px; color:#FEEBB3; cursor:pointer; text-align:left;">
          <img src="${s.img}" style="width:24px; height:24px; object-fit:cover; border-radius:3px;" />
          <span style="flex:1; font-weight:600; font-size:12px;">${s.name}</span>
          <span style="font-size:10px; padding:2px 5px; background:rgba(46,139,154,0.3); border-radius:3px; color:#9bd7e5;">Shield</span>
          <span style="font-size:10px; padding:2px 5px; background:rgba(254,235,179,0.15); border-radius:3px; color:#FEEBB3;">+${bonus} AR</span>
        </button>`;
      }).join("");

      const dialogContent = `<div class="hand-equip-picker-dialog" style="max-height:280px; overflow-y:auto; padding:4px;">
        <p style="margin:0 0 8px; font-size:12px; color:#9bd7e5;">Select a shield to equip:</p>
        <div class="equip-options-container">${optionsHtml}</div>
      </div>`;

      const d = new Dialog({
        title: "Equip Shield",
        content: dialogContent,
        buttons: { cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" } },
        render: (html) => {
          html.find(".equip-picker-option").on("click", async (e) => {
            const pickedId = e.currentTarget.dataset.itemId;
            const pickedItem = this.actor.items.get(pickedId);
            if (pickedItem) {
              await toggleEquipShield(this.actor, pickedItem);
              this.render(false);
            }
            d.close();
          });
        },
      });
      d.render(true);
    } else if (armorType === "enhancement") {
      const availableEnhancements = (this.actor.itemTypes?.armor || []).filter(a => isArmorEnhancement(a) && !isEnhancementEquipped(a));
      if (!availableEnhancements.length) {
        ui.notifications.info("No un-worn armor enhancements in inventory.");
        return;
      }

      const optionsHtml = availableEnhancements.map(a => {
        const ar = a.system?.ar || a.system?.arBonus || 0;
        return `<button type="button" class="equip-picker-option" data-item-id="${a.id}" style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:6px; padding:6px 10px; background:#14171a; border:1px solid #d97706; border-radius:4px; color:#FEEBB3; cursor:pointer; text-align:left;">
          <img src="${a.img}" style="width:24px; height:24px; object-fit:cover; border-radius:3px;" />
          <span style="flex:1; font-weight:600; font-size:12px;">${a.name}</span>
          <span style="font-size:10px; padding:2px 5px; background:rgba(217,119,6,0.3); border-radius:3px; color:#fde68a;">Enhancement</span>
          ${ar ? `<span style="font-size:10px; padding:2px 5px; background:rgba(254,235,179,0.15); border-radius:3px; color:#FEEBB3;">+${ar} AR</span>` : ""}
        </button>`;
      }).join("");

      const dialogContent = `<div class="hand-equip-picker-dialog" style="max-height:280px; overflow-y:auto; padding:4px;">
        <p style="margin:0 0 8px; font-size:12px; color:#fde68a;">Select armor enhancement to wear:</p>
        <div class="equip-options-container">${optionsHtml}</div>
      </div>`;

      const d = new Dialog({
        title: "Wear Armor Enhancement",
        content: dialogContent,
        buttons: { cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" } },
        render: (html) => {
          html.find(".equip-picker-option").on("click", async (e) => {
            const pickedId = e.currentTarget.dataset.itemId;
            const pickedItem = this.actor.items.get(pickedId);
            if (pickedItem) {
              await EssenceCharacterSheet.#toggleWearEnhancement.call(this, e, e.currentTarget);
              this.render(false);
            }
            d.close();
          });
        },
      });
      d.render(true);
    } else {
      // Body armor
      const availableArmors = (this.actor.itemTypes?.armor || []).filter(a => !isShield(a) && !isArmorEnhancement(a) && !a.system?.equipped && !a.flags?.["mythcraft-essence-sheet"]?.isDonned);
      if (!availableArmors.length) {
        ui.notifications.info("No un-donned body armor in inventory.");
        return;
      }

      const optionsHtml = availableArmors.map(a => {
        const ar = a.system?.ar || 10;
        return `<button type="button" class="equip-picker-option" data-item-id="${a.id}" style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:6px; padding:6px 10px; background:#14171a; border:1px solid #3a7a7f; border-radius:4px; color:#FEEBB3; cursor:pointer; text-align:left;">
          <img src="${a.img}" style="width:24px; height:24px; object-fit:cover; border-radius:3px;" />
          <span style="flex:1; font-weight:600; font-size:12px;">${a.name}</span>
          <span style="font-size:10px; padding:2px 5px; background:rgba(58,122,127,0.3); border-radius:3px; color:#9bd7e5;">Armor</span>
          <span style="font-size:10px; padding:2px 5px; background:rgba(254,235,179,0.15); border-radius:3px; color:#FEEBB3;">AR ${ar}</span>
        </button>`;
      }).join("");

      const dialogContent = `<div class="hand-equip-picker-dialog" style="max-height:280px; overflow-y:auto; padding:4px;">
        <p style="margin:0 0 8px; font-size:12px; color:#9bd7e5;">Select body armor to don:</p>
        <div class="equip-options-container">${optionsHtml}</div>
      </div>`;

      const d = new Dialog({
        title: "Don Body Armor",
        content: dialogContent,
        buttons: { cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" } },
        render: (html) => {
          html.find(".equip-picker-option").on("click", async (e) => {
            const pickedId = e.currentTarget.dataset.itemId;
            const pickedItem = this.actor.items.get(pickedId);
            if (pickedItem) {
              await EssenceCharacterSheet.#toggleDonArmor.call(this, e, e.currentTarget);
              this.render(false);
            }
            d.close();
          });
        },
      });
      d.render(true);
    }
  }

  static async #toggleContainer(event, target) {
    event.stopPropagation();
    const containerId = target.dataset.containerId || target.dataset.itemId || target.closest("[data-container-id]")?.dataset.containerId || target.closest("[data-item-id]")?.dataset.itemId;
    if (containerId) {
      const key = `container-${containerId}`;
      if (this.expandedItems.has(key)) {
        this.expandedItems.delete(key);
      } else {
        this.expandedItems.add(key);
      }
      this.render(false);
    }
  }

  static async #removeFromContainer(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      await removeItemFromContainer(item);
      this.render(false);
    }
  }

  static async #openContainerTab(event, target) {
    event.stopPropagation();
    const containerId = target.dataset.containerId || target.closest("[data-container-id]")?.dataset.containerId;
    if (!containerId) return;

    if (typeof this.changeTab === "function") {
      await this.changeTab("equipment", "primary");
    }

    this.expandedItems.add(`container-${containerId}`);
    await this.render(false);

    requestAnimationFrame(() => {
      const containerRow = this.element.querySelector(`[data-container-id="${containerId}"]`);
      if (containerRow) {
        containerRow.scrollIntoView({ behavior: "smooth", block: "center" });
        containerRow.classList.add("container-highlight-flash");
        setTimeout(() => containerRow.classList.remove("container-highlight-flash"), 1600);
      }
    });
  }

  static async #toggleWearClothes(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      await toggleWearItem(this.actor, item);
      this.render(false);
    }
  }

  static async #toggleEquipWeapon(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const targetHand = target.dataset.hand || null;
    const item = this.actor.items.get(itemId);
    if (item) {
      await toggleEquipWeapon(this.actor, item, targetHand);
      this.render(false);
    }
  }

  static async #toggleHandAndHalfMode(event, target) {
    event.stopPropagation();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (item) {
      await toggleHandAndHalfMode(this.actor, item);
      this.render(false);
    }
  }

  static async #openHandEquipPicker(event, target) {
    event.stopPropagation();
    const hand = target.dataset.hand || "main";
    const handTitle = hand === "main" ? "Right Hand" : "Left Hand";

    const availableWeapons = (this.actor.itemTypes?.weapon || []).filter(w => isWeaponEquippable(w) && !isWeaponEquipped(w));
    const availableShields = (this.actor.itemTypes?.armor || []).filter(a => isShield(a) && !isShieldEquipped(a));

    if (!availableWeapons.length && !availableShields.length) {
      ui.notifications.info("No unequipped weapons or shields available to equip.");
      return;
    }

    const weaponOptionsHtml = availableWeapons.map(w => {
      const handType = getWeaponHandType(w);
      const handLabel = handType === "two-handed" ? "2H" : (handType === "hand-and-a-half" ? "1.5H" : "1H");
      const apc = getSafeWeaponApc(w, this.actor);
      return `<button type="button" class="equip-picker-option" data-item-id="${w.id}" data-item-type="weapon" style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:6px; padding:6px 10px; background:#14171a; border:1px solid #3a7a7f; border-radius:4px; color:#FEEBB3; cursor:pointer; text-align:left;">
        <img src="${w.img}" style="width:24px; height:24px; object-fit:cover; border-radius:3px;" />
        <span style="flex:1; font-weight:600; font-size:12px;">${w.name}</span>
        <span style="font-size:10px; padding:2px 5px; background:rgba(58,122,127,0.3); border-radius:3px; color:#9bd7e5;">${handLabel}</span>
        <span style="font-size:10px; padding:2px 5px; background:rgba(254,235,179,0.15); border-radius:3px; color:#FEEBB3;">${apc} AP</span>
      </button>`;
    }).join("");

    const shieldOptionsHtml = availableShields.map(s => {
      const shieldBonus = getShieldArBonus(s);
      return `<button type="button" class="equip-picker-option" data-item-id="${s.id}" data-item-type="shield" style="display:flex; align-items:center; gap:8px; width:100%; margin-bottom:6px; padding:6px 10px; background:#14171a; border:1px solid #3a7a7f; border-radius:4px; color:#FEEBB3; cursor:pointer; text-align:left;">
        <img src="${s.img}" style="width:24px; height:24px; object-fit:cover; border-radius:3px;" />
        <span style="flex:1; font-weight:600; font-size:12px;">${s.name}</span>
        <span style="font-size:10px; padding:2px 5px; background:rgba(46,139,154,0.3); border-radius:3px; color:#9bd7e5;">Shield</span>
        <span style="font-size:10px; padding:2px 5px; background:rgba(254,235,179,0.15); border-radius:3px; color:#FEEBB3;">+${shieldBonus} AR</span>
      </button>`;
    }).join("");

    const dialogContent = `<div class="hand-equip-picker-dialog" style="max-height:280px; overflow-y:auto; padding:4px;">
      <p style="margin:0 0 8px; font-size:12px; color:#9bd7e5;">Select an item to equip to <strong>${handTitle}</strong>:</p>
      <div class="equip-options-container">
        ${weaponOptionsHtml}
        ${shieldOptionsHtml}
      </div>
    </div>`;

    const d = new Dialog({
      title: `Equip to ${handTitle}`,
      content: dialogContent,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
        },
      },
      render: (html) => {
        html.find(".equip-picker-option").on("click", async (e) => {
          const pickedId = e.currentTarget.dataset.itemId;
          const itemType = e.currentTarget.dataset.itemType;
          const pickedItem = this.actor.items.get(pickedId);
          if (pickedItem) {
            if (itemType === "shield" || isShield(pickedItem)) {
              await toggleEquipShield(this.actor, pickedItem, hand);
            } else {
              await toggleEquipWeapon(this.actor, pickedItem, hand);
            }
            this.render(false);
          }
          d.close();
        });
      },
    });
    d.render(true);
  }

  static async #toggleSideDrawer(event, target) {
    event.stopPropagation();
    const drawerTab = target.dataset.drawerTab || target.closest("[data-drawer-tab]")?.dataset.drawerTab;
    if (this.activeSideDrawerTab === drawerTab) {
      this.activeSideDrawerTab = null;
    } else {
      this.activeSideDrawerTab = drawerTab;
    }
    this.render({ parts: ["header"] });
  }

  static async #closeSideDrawer(event, target) {
    event.stopPropagation();
    this.activeSideDrawerTab = null;
    this.render({ parts: ["header"] });
  }

  static async #openWalletDialog(event, target) {
    event.stopPropagation();
    new WalletDialog({ document: this.actor }).render(true);
  }

  static async #openRestDialog(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    new RestDialog({ document: this.actor }).render(true);
  }

  static async #openCharacterCreationWizard(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    new CharacterCreationWizard(this.actor).render(true);
  }

  static async #openLevelUpDialog(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const curLvl = Number(this.actor.system?.level ?? 0);
    if (curLvl === 0) {
      new CharacterCreationWizard(this.actor).render(true);
      return;
    }
    new LevelUpDialog(this.actor).render(true);
  }

  static async #openTalentTreeViewer(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    new TalentTreeViewer(this.actor).render(true);
  }

  static async #openTab(event, target) {
    event.stopPropagation();
    const tab = target.dataset.tab;
    if (tab && typeof this.changeTab === "function") {
      this.changeTab(tab, "primary");
    }
  }

  static async #postSpellToChat(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    return await postSpellDescriptionCard(this.actor, item, { deductResources: false });
  }

  static async #postItemToChat(event, target) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const btn = target || event?.currentTarget || event?.target?.closest("[data-action='postItemToChat']");
    const itemId = btn?.dataset?.itemId || btn?.closest("[data-item-id]")?.dataset?.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const sys = item.system || {};
    const itemTypeLabel = (item.type || "talent").charAt(0).toUpperCase() + (item.type || "talent").slice(1);
    const description = await enrichText(sys.description?.value || sys.description || "", { 
      rollData: this.actor.getRollData(), 
    });

    const enrichedTags = getEnrichedItemTags(item);
    const tagsHTML = enrichedTags.length 
      ? `<div class="chat-tags-strip expanded-tags-strip" style="display:flex; flex-wrap:wrap; gap:4px; margin: 6px 0 8px;">
          ${enrichedTags.map(tag => `
            <span class="tag-badge-pill ${tag.category}" 
                  style="--cat-color: ${tag.categoryMeta.color}; --cat-bg: ${tag.categoryMeta.bg}; --cat-border: ${tag.categoryMeta.border};"
                  data-tooltip="${tag.tooltipHTML.replace(/"/g, '&quot;')}"
                  data-tooltip-direction="UP">
              <i class="${tag.categoryMeta.icon}"></i>
              <span class="tag-badge-name">${tag.name}</span>
            </span>
          `).join("")}
         </div>`
      : "";

    const details = [];
    const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? sys.essenceCost ?? 0);
    if (essenceCost > 0) details.push(`<strong>Essence:</strong> ${essenceCost} EP`);
    if (sys.source) details.push(`<strong>Source:</strong> ${sys.source}`);
    if (sys.apc !== undefined && sys.apc !== null && sys.apc !== "") details.push(`<strong>APC:</strong> ${sys.apc}`);
    if (sys.recharge) details.push(`<strong>Recharge:</strong> ${sys.recharge}`);

    const detailsHTML = details.length 
      ? `<div class="spell-chat-details" style="display:flex; flex-wrap:wrap; gap:6px 14px; margin:6px 0 8px; font-size:11px; color:#cbd5e1; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">
          ${details.map(d => `<span>${d}</span>`).join("")}
         </div>` 
      : "";

    const content = `
      <div class="mythcraft chat-card essence-talent-chat-card" style="background:linear-gradient(135deg, rgba(23, 67, 69, 0.85) 0%, rgba(15, 42, 43, 0.95) 100%); border:1px solid #3a7a7f; border-bottom:2px solid #d3c4a3; border-radius:8px; padding:10px 12px; box-shadow:0 4px 14px rgba(0,0,0,0.5);">
        <header class="card-header" style="display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(58,122,127,0.4); padding-bottom:6px; margin-bottom:6px;">
          <img src="${item.img}" alt="${item.name}" style="width:32px; height:32px; border-radius:4px; border:1px solid #3a7a7f; object-fit:cover;" />
          <div>
            <h3 style="margin:0; font-size:14px; font-family:'Cinzel', serif; font-weight:700; color:#FEEBB3; text-shadow:0 0 4px rgba(254,235,179,0.3);">${item.name}</h3>
            <span style="font-size:10px; color:#9bd7e5; font-weight:600; text-transform:uppercase;">${itemTypeLabel}</span>
          </div>
        </header>
        ${tagsHTML}
        ${detailsHTML}
        <div class="card-description" style="font-size:12px; line-height:1.45; color:#fdfaf3; margin-top:6px;">
          ${description || "<p><em>No description provided.</em></p>"}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      flavor: `${this.actor.name} shares ${item.name}`,
      flags: {
        "mythcraft-essence-sheet": {
          itemId: item.id,
          itemUuid: item.uuid,
          itemName: item.name,
        },
      },
    });
  }

  static #toggleMagicFilter(event, target) {
    if (event.target.tagName === "INPUT") return;
    const sourceKey = target.dataset.sourceKey?.toLowerCase();
    if (!sourceKey) return;

    if (this.activeMagicFilters.has(sourceKey)) {
      this.activeMagicFilters.delete(sourceKey);
    } else {
      this.activeMagicFilters.add(sourceKey);
    }

    this.render({ parts: ["spells"] });
  }

  static async #toggleItemEmbed(event, target) {
    event.preventDefault();
    const itemEl = target.closest(".item") || target.closest("[data-item-id]");
    if (!itemEl) return;
    const itemId = itemEl.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    const isContainer = isItemContainer(item);
    const expandKey = isContainer ? `container-${itemId}` : itemId;
    const isFavorite = isItemFavorite(item);

    const isCurrentlyExpanded = this.collapsedItems.has(expandKey)
      ? false
      : (this.expandedItems.has(expandKey) || isFavorite);

    if (isCurrentlyExpanded) {
      this.expandedItems.delete(expandKey);
      this.collapsedItems.add(expandKey);
    } else {
      this.collapsedItems.delete(expandKey);
      this.expandedItems.add(expandKey);
    }

    const partEl = target.closest("[data-application-part]");
    const part = partEl?.dataset.applicationPart;
    if (part) this.render({ parts: [part] });
    else this.render();
  }

  static async #toggleFavorite(event, target) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const btn = target || event?.currentTarget || event?.target?.closest(".favorite-btn, [data-action='toggleFavorite']");
    const itemId = btn?.dataset?.itemId || btn?.closest("[data-item-id]")?.dataset?.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const current = isItemFavorite(item);
    const next = !current;

    // Reset collapse state when favoriting so it expands by default
    if (next) {
      this.collapsedItems.delete(itemId);
      this.expandedItems.add(itemId);
    } else {
      this.expandedItems.delete(itemId);
      this.collapsedItems.add(itemId);
    }

    const updates = {
      "flags.mythcraft-essence-sheet.favorite": next,
      "flags.mythcraft.favorite": next
    };
    if (item.system && typeof item.system === "object" && "favorite" in item.system) {
      updates["system.favorite"] = next;
    }
    await item.update(updates);

    const partEl = btn?.closest("[data-application-part]");
    const part = partEl?.dataset.applicationPart;
    if (part) this.render({ parts: [part] });
    else this.render(false);
  }

  static async #toggleEffectEmbed(event, target) {
    event.preventDefault();
    const effectEl = target.closest(".effect") || target.closest("[data-effect-id]");
    if (!effectEl) return;
    const effectId = effectEl.dataset.effectId;
    if (!effectId) return;

    if (this.expandedEffects.has(effectId)) this.expandedEffects.delete(effectId);
    else this.expandedEffects.add(effectId);

    const partEl = target.closest("[data-application-part]");
    const part = partEl?.dataset.applicationPart;
    if (part) this.render({ parts: [part] });
    else this.render();
  }

  static async #toggleEffect(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectEl = target?.closest?.("[data-effect-id]");
    const effectId = target?.dataset?.effectId || effectEl?.dataset?.effectId;
    if (!effectId) return;

    const parentItemId = target?.dataset?.parentItemId || effectEl?.dataset?.parentItemId;
    let effect = parentItemId ? this.actor.items.get(parentItemId)?.effects?.get(effectId) : this.actor.effects.get(effectId);
    if (!effect) {
      effect = this.actor.effects.get(effectId);
    }
    if (!effect) {
      for (const item of this.actor.items) {
        effect = item.effects?.get(effectId);
        if (effect) break;
      }
    }
    if (!effect && this.actor.allApplicableEffects) {
      effect = Array.from(this.actor.allApplicableEffects()).find(e => e.id === effectId);
    }

    if (effect) {
      const newDisabled = !effect.disabled;
      await effect.update({ disabled: newDisabled });
      ui.notifications.info(`${effect.name} is now ${newDisabled ? "Disabled" : "Active"}.`);
      this.render();
    } else {
      ui.notifications.warn(`Could not find effect ${effectId} to toggle.`);
    }
  }

  static async #createEffect(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectType = target?.dataset?.effectType || target?.closest("[data-effect-type]")?.dataset?.effectType || "passive";
    const isTemporary = effectType === "temporary";
    const isInactive = effectType === "inactive";
    const effectData = {
      name: isTemporary ? "New Temporary Effect" : isInactive ? "New Inactive Effect" : "New Passive Effect",
      icon: "icons/svg/aura.svg",
      img: "icons/svg/aura.svg",
      disabled: isInactive,
      duration: isTemporary ? { rounds: 1 } : {},
      flags: {
        mythcraft: {
          type: effectType,
        },
      },
    };
    const created = await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    if (created?.[0]) {
      created[0].sheet?.render(true);
    }
  }

  static #openActiveEffectManager(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectId = target?.dataset?.effectId || target?.closest?.("[data-effect-id]")?.dataset?.effectId;
    const parentItemId = target?.dataset?.parentItemId || target?.closest?.("[data-parent-item-id]")?.dataset?.parentItemId;
    let effect = null;
    if (effectId) {
      if (parentItemId) {
        effect = this.actor.items.get(parentItemId)?.effects?.get(effectId) || null;
      }
      if (!effect) {
        effect = this.actor.effects.get(effectId) || null;
      }
      if (!effect) {
        for (const it of this.actor.items || []) {
          effect = it.effects?.get(effectId);
          if (effect) break;
        }
      }
    }
    new ActiveEffectManager({ document: this.actor, effect }).render(true);
  }

  static async #syncTalentEffects(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    await syncActorTalentActiveEffects(this.actor, { notify: true });
    this.render(false);
  }

  static #toggleJournalCard(event, target) {
    const entryId = target.dataset?.entryId || target.closest("[data-entry-id]")?.dataset?.entryId;
    if (!entryId) return;
    const key = `journal-${entryId}`;
    if (this.expandedItems.has(key)) this.expandedItems.delete(key);
    else this.expandedItems.add(key);
    this.render({ parts: ["journal"] });
  }

  static async #addAdditionalInfo(event, target) {
    event?.preventDefault?.();
    const id = foundry.utils.randomID();
    this.expandedItems.add(`journal-${id}`);
    await this.actor.update({ [`system.additionalInfo.${id}`]: { name: "New Entry", category: "", description: "" } });
  }

  static async #addJournalEntry(event, target) {
    event?.preventDefault?.();
    const id = foundry.utils.randomID();
    this.expandedItems.add(`journal-${id}`);
    await this.actor.update({ [`system.journal.${id}`]: { name: "New Log", date: "", content: "" } });
  }

  static async #addContact(event, target) {
    event?.preventDefault?.();
    const id = foundry.utils.randomID();
    this.expandedItems.add(`journal-${id}`);
    await this.actor.update({ [`system.contacts.${id}`]: { name: "New Contact", location: "", description: "" } });
  }

  static async #addResource(event, target) {
    event?.preventDefault?.();
    const id = foundry.utils.randomID();
    await this.actor.update({ [`system.resources.${id}`]: { name: "New Resource", value: 0, max: 0 } });
  }

  static #editDamageMod(event, target) {
    new DamageModificationDialog({ document: this.actor }).render(true);
  }

  static #editMovement(event, target) {
    new MovementDialog({ document: this.actor }).render(true);
  }

  static #editSenses(event, target) {
    new SensesDialog({ document: this.actor }).render(true);
  }

  static #editConditions(event, target) {
    new ConditionsDialog({ document: this.actor }).render(true);
  }

  static async #toggleAffinity(event, target) {
    const type = target.dataset.type;
    if (!type) return;
    const current = new Set(this.actor.system.damage?.affinity || []);
    if (current.has(type)) current.delete(type);
    else current.add(type);
    await this.actor.update({ "system.damage.affinity": Array.from(current) });
  }

  static async #toggleImmunity(event, target) {
    const type = target.dataset.type;
    if (!type) return;
    const current = new Set(this.actor.system.damage?.immune || []);
    if (current.has(type)) current.delete(type);
    else current.add(type);
    await this.actor.update({ "system.damage.immune": Array.from(current) });
  }

  /** @inheritdoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const toggleBtn = frame.querySelector?.('[data-action="toggleMode"]') || this.element?.querySelector?.('[data-action="toggleMode"]');
    if (toggleBtn) toggleBtn.remove();
    return frame;
  }

  /**
   * Override TABS to keep the same logical tabs but remove "features" which
   * we fold into "talents", and remove "spells" if the system puts it there.
   * @inheritdoc
   */
  static TABS = {
    primary: {
      tabs: [
        { id: "stats", label: "Stats", icon: "fas fa-dumbbell" },
        { id: "spells", label: "Spells", icon: "fas fa-hat-wizard" },
        { id: "equipment", label: "Equipment", icon: "fas fa-shield-alt" },
        { id: "talents", label: "Talents", icon: "fas fa-award" },
        { id: "effects", label: "Effects", icon: "fas fa-magic" },
        { id: "biography", label: "Biography", icon: "fas fa-book" },
        { id: "journal", label: "Journal", icon: "fas fa-scroll" },
      ],
      initial: "stats",
      labelPrefix: "MYTHCRAFT.SHEET.Tabs",
    },
  };

  /**
   * Override PARTS to point every template to our custom Handlebars files.
   * The "tabs" part still uses the generic Foundry template (tab navigation bar).
   * @inheritdoc
   */
  static PARTS = {
    header: {
      template: MODULE_PATH("header.hbs"),
    },
    tabs: {
      // Reuse Foundry's generic tab navigation template — it just needs context.tabs
      template: "templates/generic/tab-navigation.hbs",
    },
    stats: {
      template: MODULE_PATH("stats.hbs"),
      scrollable: [""],
    },
    spells: {
      template: MODULE_PATH("spells.hbs"),
      scrollable: [""],
    },
    equipment: {
      template: MODULE_PATH("equipment.hbs"),
      templates: [
        // Pre-register any partials used inside equipment.hbs if needed
      ],
      scrollable: [""],
    },
    talents: {
      template: MODULE_PATH("talents.hbs"),
      scrollable: [""],
    },
    effects: {
      template: MODULE_PATH("effects.hbs"),
      scrollable: [""],
    },
    biography: {
      template: MODULE_PATH("biography.hbs"),
      scrollable: [""],
    },
    journal: {
      template: MODULE_PATH("journal.hbs"),
      scrollable: [""],
    },
  };

  /**
   * Cache of previous meter values to smoothly animate meter bar width shrinking and growing
   * @type {Map<string, string>}
   */
  #meterValues = new Map();
  #lastHasSpellcasting = null;

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Auto-prompt Character Creation Wizard on Level 0 / unbuilt characters when the sheet is opened
    const curLevel = Number(this.actor.system?.level ?? 0);
    const hasLineage = this.actor.items.some(i => i.type === "lineage" || String(i.name || "").toLowerCase().endsWith(" lineage"));
    const isUnbuilt = curLevel === 0 || (!hasLineage && curLevel <= 1);

    if (this.actor.type === "character" && isUnbuilt) {
      if (!this._hasPromptedWizard) {
        this._hasPromptedWizard = true;
        setTimeout(() => {
          CharacterCreationWizard.promptStartup(this.actor, this);
        }, 150);
      }
    } else if (this.actor.type === "character" && this.isEditable && !this._hasSyncedTalentEffects) {
      this._hasSyncedTalentEffects = true;
      setTimeout(() => {
        syncActorTalentActiveEffects(this.actor, { notify: false }).catch(() => {});
      }, 250);
    }

    // Magical dissolve / expand animation for Resource Meters Panel & SP Meter
    const spMeter = this.element.querySelector(".sp-meter");
    const currentHasSpellcasting = spMeter?.classList.contains("has-sp") ?? false;

    if (this.#lastHasSpellcasting !== null && this.#lastHasSpellcasting !== currentHasSpellcasting) {
      if (currentHasSpellcasting && spMeter) {
        // Just gained spellcasting: animate SP dissolving in like a magic spell
        spMeter.classList.add("magic-dissolve-enter");
        setTimeout(() => {
          spMeter.classList.remove("magic-dissolve-enter");
        }, 700);
      } else if (!currentHasSpellcasting && spMeter) {
        // Just lost spellcasting: animate SP dissolving away like smoke/fade
        spMeter.classList.add("magic-dissolve-exit");
        setTimeout(() => {
          spMeter.classList.remove("magic-dissolve-exit");
        }, 600);
      }
    }
    this.#lastHasSpellcasting = currentHasSpellcasting;

    // Character sheet window overflow and folder tab positioning are handled cleanly via CSS (:not(.minimized))

    // Smooth animated shrink/grow for all resource meter bars across re-renders
    const meterBars = this.element.querySelectorAll(".meter-fill, .essence-bar-fill");
    for (const bar of meterBars) {
      const key = bar.dataset.meterKey || bar.className;
      const targetWidth = bar.style.width;
      if (!targetWidth) continue;

      const prevWidth = this.#meterValues.get(key);
      if (prevWidth !== undefined && prevWidth !== targetWidth) {
        bar.style.transition = "none";
        bar.style.width = prevWidth;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bar.style.transition = "width 0.8s cubic-bezier(0.25, 1, 0.5, 1)";
            bar.style.width = targetWidth;
          });
        });
      }
      this.#meterValues.set(key, targetWidth);
    }

    // Intercept Level input changes to open Level Up & HP Calculator
    const levelInput = this.element.querySelector("input[name='system.level']");
    if (levelInput) {
      levelInput.addEventListener("change", (event) => {
        const newLvl = parseInt(event.target.value, 10);
        const curLvl = this.actor.system.level || 0;
        if (!isNaN(newLvl) && newLvl !== curLvl) {
          event.preventDefault();
          event.stopPropagation();
          event.target.value = curLvl;
          if (curLvl === 0) {
            new CharacterCreationWizard(this.actor).render(true);
            return;
          }
          new LevelUpDialog(this.actor, { targetLevel: newLvl }).render(true);
        }
      });
    }

    // Endurance Threshold change detection: prompt HP recalculation
    const endInput = this.element.querySelector("input[name='system.attributes.end']");
    if (endInput) {
      endInput.addEventListener("change", async (event) => {
        const oldEnd = Number(this.actor.system.attributes?.end ?? 0);
        const newEnd = parseInt(event.target.value, 10);
        if (isNaN(newEnd)) return;

        const oldTh = getEnduranceThreshold(oldEnd);
        const newTh = getEnduranceThreshold(newEnd);

        if (oldTh.threshold !== newTh.threshold) {
          const level = Math.max(1, this.actor.system.level || 1);
          setTimeout(() => {
            new LevelUpDialog(this.actor, {
              mode: "recalculate",
              targetLevel: level,
            }).render(true);
          }, 250);
        }
      });
    }

    // Fear tracker input listener
    const fearInput = this.element.querySelector("input[name='flags.mythcraft-essence-sheet.fear'], input[name='fear.value']");
    if (fearInput) {
      fearInput.addEventListener("change", async (event) => {
        const val = Math.max(0, parseInt(event.target.value, 10) || 0);
        await this.actor.update({ "flags.mythcraft-essence-sheet.fear": val });
      });
    }

    // Soul Damage input listener
    const soulDamageInput = this.element.querySelector("input[name='flags.mythcraft-essence-sheet.soulDamage'], input[name='soulDamage.value'], input[name='system.soulDamage']");
    if (soulDamageInput) {
      soulDamageInput.addEventListener("change", async (event) => {
        const val = Math.max(0, parseInt(event.target.value, 10) || 0);
        await this.actor.update({
          "flags.mythcraft-essence-sheet.soulDamage": val,
          "system.soulDamage": val,
        });
      });
    }

    // Magic Attribute selector listener
    const magicAttrSelect = this.element.querySelector(".magic-attr-dropdown, #magic-attr-select");
    if (magicAttrSelect) {
      magicAttrSelect.addEventListener("change", async (event) => {
        event.stopPropagation();
        const val = event.target.value;
        await this.actor.update({
          "flags.mythcraft-essence-sheet.magicAttribute": val,
          "system.sp.attribute": val,
          "system.attributes.magic": val,
        });
      });
    }

    // Per-Spell Attribute dropdown listener
    const spellAttrSelects = this.element.querySelectorAll(".spell-attribute-dropdown, [data-spell-attribute]");
    spellAttrSelects.forEach(sel => {
      sel.addEventListener("change", async (event) => {
        event.stopPropagation();
        event.preventDefault();
        const itemId = event.currentTarget.dataset.itemId;
        const val = event.currentTarget.value || "";
        if (itemId) {
          const currentFlags = foundry.utils.deepClone(this.actor.flags?.["mythcraft-essence-sheet"]?.spellAttributes || {});
          if (val) {
            currentFlags[itemId] = val;
          } else {
            delete currentFlags[itemId];
          }
          await this.actor.update({
            "flags.mythcraft-essence-sheet.spellAttributes": currentFlags,
          });
        }
      });
      sel.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });

    // Max HP and .attr-num-input are handled by submitOnChange -> _prepareSubmitData -> adjustDerivedSubmitData
    // so Active Effect deltas are subtracted cleanly without concurrent update races.

    // Right-click to Delete Origin Items (Lineage, Background, Profession)
    const originFilledChips = this.element.querySelectorAll(".origin-chip.origin-filled");
    originFilledChips.forEach(chip => {
      chip.addEventListener("contextmenu", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const itemId = chip.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        const confirmed = await EssenceCharacterSheet.#confirmDeletion(
          `Delete ${item.name}?`,
          `Are you sure you want to remove <strong>${item.name}</strong> (${item.type}) from this character?`
        );
        if (confirmed) {
          await item.delete();
        }
      });
    });

    // Right-click Image Popout for Actor Portrait & all Item Images on Sheet
    const ImagePopoutApp = foundry.applications.apps.ImagePopout || globalThis.ImagePopout;
    const portraitEl = this.element.querySelector(".portrait-box, .portrait-img, img[data-edit='img']");
    if (portraitEl) {
      portraitEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const img = this.document.img;
        if (img) {
          new ImagePopoutApp({
            src: img,
            window: { title: this.document.name },
            shareable: true,
            uuid: this.document.uuid,
          }).render(true);
        }
      });
    }

    const itemImages = this.element.querySelectorAll(".item-img, .nested-item-img, .talent-img, .feature-img, .spell-img, .drawer-item-img, [data-item-id] img");
    itemImages.forEach(imgEl => {
      imgEl.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const itemId = imgEl.dataset.itemId || imgEl.closest("[data-item-id]")?.dataset.itemId;
        const item = itemId ? this.actor.items.get(itemId) : null;
        if (item?.img) {
          new ImagePopoutApp({
            src: item.img,
            window: { title: item.name },
            shareable: true,
            uuid: item.uuid,
          }).render(true);
        }
      });
    });


    // Live Auto-Update for Currency Inputs on the Character Sheet
    const sheetCurrencyInputs = this.element.querySelectorAll(".currency-input");
    sheetCurrencyInputs.forEach(input => {
      let sheetCurrDebounce = null;
      const saveSheetCurrency = async () => {
        const key = input.dataset.key || input.name.replace(/^system\.currency\./, "");
        const val = Math.max(0, parseInt(input.value) || 0);
        const currencies = getActiveCurrencies();
        const matchCurr = currencies.find(c => c.key === key || c.abbr === key);

        const currentVal = getActorCurrencyCount(this.actor, matchCurr || { key });
        if (currentVal === val) return;

        const currencyCounts = {};
        for (const c of currencies) {
          currencyCounts[c.key] = getActorCurrencyCount(this.actor, c);
        }
        currencyCounts[matchCurr?.key || key] = val;

        const updates = getActorCurrencyUpdates(currencyCounts, currencies);
        await this.actor.update(updates);
        ui.notifications.info(`Updated ${matchCurr?.label || key} to ${val}.`);
      };

      input.addEventListener("change", saveSheetCurrency);
      input.addEventListener("input", () => {
        clearTimeout(sheetCurrDebounce);
        sheetCurrDebounce = setTimeout(saveSheetCurrency, 500);
      });
    });

    // Allow clicking anywhere on an item/spell/feature/effect/armor card to expand/collapse details
    const expandableRows = this.element.querySelectorAll(".item-row, .spell-card, .feature-row, .talent-card, .effect-row, .armor-row, .weapon-row, .gear-row, .trait-card");
    for (const row of expandableRows) {
      row.addEventListener("click", (e) => {
        // Ignore clicks on buttons, inputs, selects, links, or specific action triggers
        if (e.target.closest("button, input, select, textarea, a, .item-img, .item-name, [data-action='viewDoc'], [data-action='deleteDoc'], [data-action='toggleDonArmor'], [data-action='toggleAttunement'], [data-action='toggleFavorite'], [data-action='postItemToChat'], [data-action='rollAttack'], [data-action='rollDamage'], [data-action='postSpellToChat'], [data-action='editEffect']")) {
          return;
        }
        const itemId = row.dataset.itemId;
        const effectId = row.dataset.effectId;
        if (itemId) {
          EssenceCharacterSheet.#toggleItemEmbed.call(this, e, row);
        } else if (effectId) {
          EssenceCharacterSheet.#toggleEffectEmbed.call(this, e, row);
        }
      });
    }

    // Dedicated listener for favorite toggle buttons
    const favButtons = this.element.querySelectorAll(".favorite-btn, [data-action='toggleFavorite']");
    favButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        EssenceCharacterSheet.#toggleFavorite.call(this, e, btn);
      });
    });

    // Dedicated listener for posting items (talents, features, etc.) to chat
    const postItemBtns = this.element.querySelectorAll("[data-action='postItemToChat']");
    postItemBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        EssenceCharacterSheet.#postItemToChat.call(this, e, btn);
      });
    });

    // Dedicated listener for toggleEffect buttons
    const toggleEffectBtns = this.element.querySelectorAll("[data-action='toggleEffect']");
    toggleEffectBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        EssenceCharacterSheet.#toggleEffect.call(this, e, btn);
      });
    });

    // Dedicated listener for createEffect buttons
    const createEffectBtns = this.element.querySelectorAll("[data-action='createEffect']");
    createEffectBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        EssenceCharacterSheet.#createEffect.call(this, e, btn);
      });
    });

    // Dedicated listener for toggleJournalCard buttons & rows
    const journalCards = this.element.querySelectorAll("[data-action='toggleJournalCard']");
    journalCards.forEach(el => {
      el.addEventListener("click", (e) => {
        // Ignore clicks on inner inputs, buttons, or editors
        if (e.target.closest("input, button.remove-btn, .card-description, prose-mirror")) return;
        e.preventDefault();
        e.stopPropagation();
        EssenceCharacterSheet.#toggleJournalCard.call(this, e, el);
      });
    });

    // Live Auto-Update for Journal, Additional Info, Contacts, and Resources
    const journalInputs = this.element.querySelectorAll(".journal-tab input[name], .journal-tab textarea[name]");
    journalInputs.forEach(input => {
      let debounce = null;
      const saveInput = async () => {
        const name = input.name;
        if (!name) return;
        let value = input.value;
        if (input.type === "number") {
          value = Number(value) || 0;
        }
        await this.actor.update({ [name]: value });
      };

      input.addEventListener("change", saveInput);
      input.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(saveInput, 600);
      });
    });

    // Live Auto-Update for Personality and Appearance fields
    const bioInputs = this.element.querySelectorAll(".biography-tab input[name], .biography-tab textarea[name]");
    bioInputs.forEach(input => {
      let debounce = null;
      const saveBioInput = async () => {
        const name = input.name;
        if (!name) return;
        await this.actor.update({ [name]: input.value });
      };

      input.addEventListener("change", saveBioInput);
      input.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(saveBioInput, 600);
      });
    });
  }

  /** @inheritdoc */
  async close(options = {}) {
    this._hasPromptedWizard = false;
    return super.close(options);
  }

  /** @inheritdoc */
  _processFormData(event, form, formData) {
    if (formData?.object && typeof formData.object.img === "string") {
      const v = formData.object.img.trim();
      if (!v || !v.includes(".")) {
        delete formData.object.img;
        delete formData.object["img"];
      }
    }
    const data = super._processFormData(event, form, formData);
    for (const key of Object.keys(data)) {
      if (key.startsWith("_conditions-")) delete data[key];
      // Prevent empty or invalid img from being passed to document update
      if (key === "img") {
        const v = typeof data[key] === "string" ? data[key].trim() : "";
        if (!v || !v.includes(".")) {
          delete data[key];
          delete data["img"];
        }
      }
    }
    if (!game.user?.isGM) {
      sanitizeGmOnlyFields(data);
    }
    return data;
  }

  /** @inheritdoc */
  _prepareSubmitData(event, form, formData) {
    if (formData?.object && "img" in formData.object) {
      const v = typeof formData.object.img === "string" ? formData.object.img.trim() : "";
      if (!v || !v.includes(".")) {
        delete formData.object.img;
        delete formData.object["img"];
      }
    }
    if (typeof formData?.delete === "function") {
      const rawImg = formData.get("img");
      if (!rawImg || typeof rawImg !== "string" || !rawImg.trim() || !rawImg.includes(".")) {
        formData.delete("img");
      }
    }

    const submitData = super._prepareSubmitData ? super._prepareSubmitData(event, form, formData) : (formData?.object ?? {});

    if ("img" in submitData) {
      const v = typeof submitData.img === "string" ? submitData.img.trim() : "";
      if (!v || !v.includes(".")) {
        delete submitData.img;
        delete submitData["img"];
      }
    }

    adjustDerivedSubmitData(this.actor, submitData, { syncMaxHpFlag: true });

    return submitData;
  }

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    if (this.actor?.system?.movement && typeof this.actor.system.movement === "object") {
      if ("speed" in this.actor.system.movement) {
        delete this.actor.system.movement.speed;
      }
    }
    return super._preparePartContext(partId, context, options);
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    if (this.actor?.system?.movement && typeof this.actor.system.movement === "object") {
      if ("speed" in this.actor.system.movement) {
        delete this.actor.system.movement.speed;
      }
    }
    // Ensure effective armor, AR, defenses, and restrictions are calculated
    applyEffectiveArmorAndDefenses(this.actor);

    const context = await super._prepareContext(options);

    // Re-apply to ensure context.system and actor.system match computed values
    applyEffectiveArmorAndDefenses(this.actor);

    // Ensure actor and document are always available in all templates
    context.actor = this.actor;
    context.document = this.actor;
    context.source = this.actor._source;

    // Ensure sheet is ALWAYS in progression/editable mode (no toggle sheet lock)
    context.isPlay = false;
    context.isEditable = true;
    context.editable = true;
    context.isEditMode = true;

    // Attach the module ID so templates can reference it if needed
    context.moduleId = "mythcraft-essence-sheet";

    // Format classes display string (e.g., "Adventurer 1")
    context.classesDisplay = this.actor.system.classes || "Adventurer";

    // Prepare Origins items (Lineage, Background, Profession)
    const profItems = this.actor.itemTypes.profession ?? [];
    context.originsList = [
      {
        type: "lineage",
        label: "Lineage",
        item: this.actor.itemTypes.lineage?.[0] ?? null,
      },
      {
        type: "background",
        label: "Background",
        item: this.actor.itemTypes.background?.[0] ?? null,
      },
      ...profItems.map((p, idx) => ({
        type: "profession",
        label: profItems.length > 1 ? `Profession ${idx + 1}` : "Profession",
        item: p,
      })),
    ];
    if (profItems.length === 0) {
      context.originsList.push({
        type: "profession",
        label: "Profession",
        item: null,
      });
    }

    // Resource percentages for HUD meters
    const hp = this.actor.system.hp || {};
    context.hpPct = hp.max > 0 ? Math.round(Math.min(100, Math.max(0, (hp.value / hp.max) * 100))) : 0;

    // Soul Damage calculation (Homebrew / Optional Rules)
    const enableSoulDamageSetting = Boolean(getSetting("enableSoulDamage", false));
    const soulDamageVal = Number(this.actor.flags?.["mythcraft-essence-sheet"]?.soulDamage ?? this.actor.system?.soulDamage ?? 0);
    context.enableSoulDamage = enableSoulDamageSetting;
    context.soulDamage = soulDamageVal;
    context.soulPct = (hp.max > 0) ? Math.min(100, Math.round((soulDamageVal / hp.max) * 100)) : 0;
    context.isSoulLethal = (Number(hp.value) > 0) && (soulDamageVal >= Number(hp.value));

    const ap = this.actor.system.ap;
    context.apPct = ap.max > 0 ? Math.round(Math.min(100, Math.max(0, (ap.value / ap.max) * 100))) : 0;

    const sp = this.actor.system.sp;
    context.spPct = (sp?.max > 0) ? Math.round(Math.min(100, Math.max(0, (sp.value / sp.max) * 100))) : 0;

    // Bloodied threshold display
    context.isBloodied = hp.value > 0 && hp.value <= (hp.bloodied || Math.floor(hp.max / 2));

    // Death indicator (Max death points reached)
    const deathVal = Number(this.actor.system?.death?.value ?? 0);
    const deathMax = Number(this.actor.system?.death?.max ?? 0);
    context.isDead = deathMax > 0 && deathVal >= deathMax;

    // Calculate official MythCraft critical ranges matching Damage Modification settings
    const luck = Number(this.actor.system?.attributes?.luck?.value ?? this.actor.system?.attributes?.luck ?? 0);
    context.luckScore = luck;
    context.hasNegativeLuck = luck < 0;
    context.luckPenalty = Math.abs(luck);
    context.maxLp = Math.max(0, Math.floor(luck / 2));
    context.critHit = getActorCritHit(this.actor);
    context.critFail = getActorCritFail(this.actor);

    // Power levels collected from Spells tab
    const powerLevels = this.actor.system?.powerLevel || {};
    const MAGIC_SOURCES = [
      { key: "arcane", abbr: "ARC", label: "Arcane", color: "#aed6f1", bg: "rgba(93, 173, 226, 0.2)", border: "#5dade2" },
      { key: "divine", abbr: "DIV", label: "Divine", color: "#f9e79f", bg: "rgba(223, 177, 91, 0.2)", border: "#dfb15b" },
      { key: "occult", abbr: "OCC", label: "Occult", color: "#f5b7b1", bg: "rgba(201, 104, 104, 0.2)", border: "#c96868" },
      { key: "primal", abbr: "PRI", label: "Primal", color: "#a9dfbf", bg: "rgba(95, 163, 122, 0.2)", border: "#5fa37a" },
      { key: "psionic", abbr: "PSI", label: "Psionic", color: "#d7bde2", bg: "rgba(155, 114, 207, 0.2)", border: "#9b72cf" },
    ];
    context.magicPowerPills = MAGIC_SOURCES
      .map(s => ({
        ...s,
        value: Number(powerLevels[s.key] ?? 0),
      }))
      .filter(s => s.value > 0);
    context.hasMagicPower = context.magicPowerPills.length > 0;

    // Spellcasting presence check (Spells, Spell Points > 0, or Power Level > 0)
    const spellCount = this.actor.itemTypes?.spell?.length ?? this.actor.items.filter(i => i.type === "spell").length;
    const spVal = Number(sp?.value ?? 0);
    const spMax = Number(sp?.max ?? 0);
    context.hasSpellcasting = (spellCount > 0) || (spMax > 0) || (spVal > 0) || context.hasMagicPower;

    // Prepare structured attribute and skill groups
    this._prepareEssenceAttributes(context);

    // Prepare Damage Modification categories
    const affinitySet = new Set(this.actor.system.damage?.affinity || []);
    const immuneSet = new Set(this.actor.system.damage?.immune || []);

    const rawDamageCategories = [
      {
        name: "Physical",
        types: [
          { key: "blunt", label: "Blunt", icon: "fas fa-hammer" },
          { key: "sharp", label: "Sharp", icon: "fas fa-cut" },
        ],
      },
      {
        name: "Elemental",
        types: [
          { key: "cold", label: "Cold", icon: "fas fa-snowflake" },
          { key: "corrosive", label: "Corrosive", icon: "fas fa-flask" },
          { key: "fire", label: "Fire", icon: "fas fa-fire" },
          { key: "lightning", label: "Lightning", icon: "fas fa-bolt" },
          { key: "toxic", label: "Toxic", icon: "fas fa-biohazard" },
        ],
      },
      {
        name: "Energy",
        types: [
          { key: "necrotic", label: "Necrotic", icon: "fas fa-skull" },
          { key: "psychic", label: "Psychic", icon: "fas fa-brain" },
          { key: "radiant", label: "Radiant", icon: "fas fa-sun" },
          { key: "sonic", label: "Sonic", icon: "fas fa-volume-high" },
        ],
      },
    ];

    context.damageCategories = rawDamageCategories.map(cat => ({
      ...cat,
      types: cat.types.map(t => ({
        ...t,
        hasAffinity: affinitySet.has(t.key),
        hasImmunity: immuneSet.has(t.key),
      })),
    }));

    // Damage summary for the compact Damage Modifications card on the sheet
    const DAMAGE_TYPE_CONFIG = {
      blunt: { label: "Blunt", icon: "fas fa-hammer" },
      sharp: { label: "Sharp", icon: "fas fa-cut" },
      cold: { label: "Cold", icon: "fas fa-snowflake" },
      corrosive: { label: "Corrosive", icon: "fas fa-flask" },
      fire: { label: "Fire", icon: "fas fa-fire" },
      lightning: { label: "Lightning", icon: "fas fa-bolt" },
      toxic: { label: "Toxic", icon: "fas fa-biohazard" },
      necrotic: { label: "Necrotic", icon: "fas fa-skull" },
      psychic: { label: "Psychic", icon: "fas fa-brain" },
      radiant: { label: "Radiant", icon: "fas fa-sun" },
      sonic: { label: "Sonic", icon: "fas fa-volume-high" },
      all: { label: "All Damage", icon: "fas fa-asterisk" },
    };

    const sysDmg = this.actor.system?.damage || {};
    const affinities = Array.from(affinitySet).map(k => {
      const lower = String(k).toLowerCase();
      const cfg = DAMAGE_TYPE_CONFIG[lower];
      return {
        key: lower,
        label: cfg?.label || (k.charAt(0).toUpperCase() + k.slice(1)),
        icon: cfg?.icon || "fas fa-shield-alt",
      };
    });

    const immunities = Array.from(immuneSet).map(k => {
      const lower = String(k).toLowerCase();
      const cfg = DAMAGE_TYPE_CONFIG[lower];
      return {
        key: lower,
        label: cfg?.label || (k.charAt(0).toUpperCase() + k.slice(1)),
        icon: cfg?.icon || "fas fa-shield-alt",
      };
    });

    const parseModString = (str) => {
      if (!str || typeof str !== "string") return [];
      const list = [];
      const parts = str.split(",").map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const match = part.match(/^([a-zA-Z\s]+?)(?:\s+(\d+))?$/);
        if (match) {
          const rawType = match[1].trim();
          const lower = rawType.toLowerCase();
          const val = match[2] !== undefined ? parseInt(match[2], 10) : 1;
          const cfg = DAMAGE_TYPE_CONFIG[lower];
          list.push({
            type: lower,
            label: cfg?.label || (rawType.charAt(0).toUpperCase() + rawType.slice(1)),
            icon: cfg?.icon || "fas fa-shield-alt",
            value: val,
          });
        }
      }
      return list;
    };

    const effectiveResistData = calculateEffectiveResistances(this.actor);
    const resistList = effectiveResistData.list.map(item => {
      const cfg = DAMAGE_TYPE_CONFIG[item.type];
      return {
        type: item.type,
        label: cfg?.label || item.label,
        icon: cfg?.icon || "fas fa-shield-alt",
        value: item.value,
        hasArmorBonus: item.hasArmorBonus,
        armorValue: item.armorValue,
        baseValue: item.baseValue,
      };
    });
    const vulnList = parseModString(sysDmg.vulnerable);

    context.damageSummary = {
      affinities,
      immunities,
      resist: effectiveResistData.combinedString || sysDmg.resist || "",
      resistList,
      vulnerable: sysDmg.vulnerable || "",
      vulnList,
      drValue: Number(sysDmg.reduction?.value) || 0,
      drBypasses: sysDmg.reduction?.bypasses || "",
      threshold: Number(sysDmg.threshold) || 0,
      hasAny: affinities.length > 0 || immunities.length > 0 || resistList.length > 0 || vulnList.length > 0 || !!sysDmg.resist || !!sysDmg.vulnerable || (Number(sysDmg.reduction?.value) > 0) || (Number(sysDmg.threshold) > 0),
      armorResists: effectiveResistData.armorResists,
    };

    // Enrich active conditions with rich descriptions for tooltips
    const CONDITION_DESCRIPTIONS = {
      bleeding: "Takes physical damage at the start of each turn until treated.",
      bloodied: "Health is at or below half maximum HP.",
      burning: "Takes fire damage at the start of each turn until extinguished.",
      broken: "Suffering severe morale failure; disadvantage on attacks and checks.",
      charmed: "Cannot harm the charmer and the charmer has advantage on social checks against you.",
      chilled: "Movement speed is reduced and cold penalties apply.",
      concealed: "Hard to see; attackers suffer disadvantage or situational TD.",
      partialCover: "+2 bonus to Armor Rating against ranged attacks.",
      totalCover: "Cannot be targeted directly by attacks or spells.",
      dazed: "Can take an Action or Move on turn, but not both; cannot take Reactions.",
      deafened: "Cannot hear and automatically fails checks that require hearing.",
      fatigued: "Suffering from exhaustion; penalties to physical attributes and stamina.",
      frightened: "Disadvantage on ability checks and attack rolls while source of fear is in line of sight.",
      grappled: "Movement speed is reduced to 0.",
      incapacitated: "Cannot take actions or reactions.",
      invisible: "Impossible to see without special senses; advantage on attacks against targets.",
      paralyzed: "Incapacitated and cannot move or speak. Attacks against have advantage.",
      petrified: "Transformed into solid inanimate substance. Weight increases ten-fold.",
      poisoned: "Disadvantage on attack rolls and ability checks.",
      prone: "Lying on the ground. Crawling costs double movement. Melee attacks against have advantage.",
      restrained: "Speed becomes 0. Attacks against have advantage, own attacks have disadvantage.",
      shaken: "Disadvantage on mental checks.",
      sickened: "Penalties to stamina and physical fortitude.",
      slowed: "All movement speeds are halved.",
      stunned: "Incapacitated, cannot move, and speak falteringly.",
      surprised: "Cannot move or take actions on the first round of combat.",
      unconscious: "Incapacitated, drops what holding, falls prone, unaware of surroundings.",
      vulnerable: "Takes additional damage from specified damage types.",
    };

    if (context.activeConditions) {
      context.activeConditions = context.activeConditions.map(c => ({
        ...c,
        description: CONDITION_DESCRIPTIONS[c.id] || `${c.label} condition.`,
      }));
    }

    // Sanitize any legacy comma corruption in appearance fields
    const app = this.actor.system?.appearance || {};
    for (const key of ["height", "weight", "age"]) {
      if (typeof app[key] === "string" && app[key].includes(",")) {
        app[key] = app[key].replace(/,/g, "").trim();
      }
    }

    // Size Dropdown Options
    const SIZES_MAP = {
      fine: "Fine",
      diminutive: "Diminutive",
      tiny: "Tiny",
      small: "Small",
      medium: "Medium",
      large: "Large",
      largeLong: "Large (long)",
      largeTall: "Large (tall)",
      huge: "Huge",
      hugeLong: "Huge (long)",
      hugeTall: "Huge (tall)",
      gargantuan: "Gargantuan",
      gargantuanLong: "Gargantuan (long)",
      gargantuanTall: "Gargantuan (tall)",
      colossal: "Colossal",
      colossalLong: "Colossal (long)",
      colossalTall: "Colossal (tall)",
      titan: "Titan",
    };

    const currentSize = (this.actor.system?.size || "medium").toLowerCase();
    context.sizeOptions = Object.entries(SIZES_MAP).map(([key, label]) => ({
      key,
      label,
      selected: currentSize === key.toLowerCase(),
    }));

    return context;
  }

  /**
   * Builds clean, template-ready attribute and skill structures for Physical, Mental, and Metaphysical groups.
   * @param {object} context
   */
  _prepareEssenceAttributes(context) {
    const sys = this.actor.system;
    const attrs = sys.attributes ?? {};
    const defenses = sys.defenses ?? {};
    const allSkills = sys.skills ?? {};
    const skillConfig = mythcraft.CONFIG?.skills?.list ?? {};

    const formatBonus = (val) => {
      const n = Number(val) || 0;
      return n >= 0 ? `+${n}` : `${n}`;
    };

    const aeSkillBonuses = getActorActiveEffectBonuses(this.actor);
    const allSkillsAeBonus = Number(aeSkillBonuses.allSkillsBonus || 0);

    const getSkillsForAttr = (attrKey) => {
      const list = [];
      for (const [id, cfg] of Object.entries(skillConfig)) {
        if (cfg.attribute === attrKey) {
          const sData = allSkills[id]
            || allSkills[id.toLowerCase()]
            || allSkills[id.replace(/[^a-zA-Z0-9]/g, "")]
            || Object.entries(allSkills).find(([k]) => normalizeSkillNameOrKey(k) === normalizeSkillNameOrKey(id))?.[1];
          
          const investedVal = typeof sData === "number" ? sData : Number(sData?.value ?? 0);
          const specificAe = getSkillAeBonus(id, aeSkillBonuses);
          const totalAe = allSkillsAeBonus + specificAe;

          // If sData exists and has derived bonus:
          let bonus = 0;
          if (sData !== undefined && sData !== null) {
            bonus = typeof sData === "number" ? sData : Number(sData?.bonus ?? (investedVal + (attrs[attrKey] ?? 0)));
          } else {
            // Un-invested skill
            bonus = (Number(attrs[attrKey]) || 0) + totalAe;
          }

          // Fallback if prepareDerivedData didn't add totalAe to sData.bonus
          const baseDerived = investedVal + (Number(attrs[attrKey]) || 0);
          if (bonus === baseDerived && totalAe !== 0) {
            bonus += totalAe;
          }

          // Only display trained skills (investedVal > 0) OR skills boosted by ActiveEffects (totalAe !== 0)
          if (investedVal === 0 && totalAe === 0) continue;

          let rawLabel = id;
          if (cfg.specialized) {
            rawLabel = game.i18n.format(cfg.specialized, sData || {});
          } else if (cfg.label) {
            const loc = game.i18n.localize(cfg.label);
            rawLabel = loc && !loc.startsWith("MYTHCRAFT.") ? loc : (cfg.label || id);
          }
          list.push({
            id,
            label: rawLabel || id,
            bonus,
            bonusDisplay: formatBonus(bonus),
          });
        }
      }
      return list;
    };

    const sourceDefs = this.actor.system._source?.defenses || this.actor._source?.system?.defenses || this.actor.system.defenses || {};

    context.physicalAttrs = [
      {
        key: "str",
        label: "STR",
        name: "Strength",
        value: attrs.str ?? 0,
        bonusDisplay: formatBonus(attrs.str ?? 0),
        defense: null,
        skills: getSkillsForAttr("str"),
      },
      {
        key: "dex",
        label: "DEX",
        name: "Dexterity",
        value: attrs.dex ?? 0,
        bonusDisplay: formatBonus(attrs.dex ?? 0),
        defense: { key: "ref", label: "REF", name: "Reflexes", value: defenses.ref ?? 10, formula: sourceDefs.ref || "10 + @DEX" },
        skills: getSkillsForAttr("dex"),
      },
      {
        key: "end",
        label: "END",
        name: "Endurance",
        value: attrs.end ?? 0,
        bonusDisplay: formatBonus(attrs.end ?? 0),
        defense: { key: "fort", label: "FORT", name: "Fortitude", value: defenses.fort ?? 10, formula: sourceDefs.fort || "10 + @END" },
        skills: getSkillsForAttr("end"),
      },
    ];

    context.mentalAttrs = [
      {
        key: "awr",
        label: "AWR",
        name: "Awareness",
        value: attrs.awr ?? 0,
        bonusDisplay: formatBonus(attrs.awr ?? 0),
        defense: { key: "ant", label: "ANT", name: "Anticipation", value: defenses.ant ?? 10, formula: sourceDefs.ant || "10 + @AWR" },
        skills: getSkillsForAttr("awr"),
      },
      {
        key: "int",
        label: "INT",
        name: "Intellect",
        value: attrs.int ?? 0,
        bonusDisplay: formatBonus(attrs.int ?? 0),
        defense: { key: "log", label: "LOG", name: "Logic", value: defenses.log ?? 10, formula: sourceDefs.log || "10 + @INT" },
        skills: getSkillsForAttr("int"),
      },
      {
        key: "cha",
        label: "CHA",
        name: "Charisma",
        value: attrs.cha ?? 0,
        bonusDisplay: formatBonus(attrs.cha ?? 0),
        defense: { key: "will", label: "WILL", name: "Willpower", value: defenses.will ?? 10, formula: sourceDefs.will || "10 + @CHA" },
        skills: getSkillsForAttr("cha"),
      },
    ];

    context.metaAttrs = [
      {
        key: "luck",
        label: "LUCK",
        name: "Luck",
        value: attrs.luck ?? 0,
        bonusDisplay: formatBonus(attrs.luck ?? 0),
        defense: null,
        skills: getSkillsForAttr("luck"),
      },
      {
        key: "cor",
        label: "COR",
        name: "Coordination",
        value: attrs.cor ?? 0,
        bonusDisplay: formatBonus(attrs.cor ?? 0),
        defense: null,
        skills: getSkillsForAttr("cor"),
      },
    ];

    // Homebrew: Sanity (SAN) Metaphysical Attribute
    const enableSanity = game.settings.get("mythcraft-essence-sheet", "enableSanity") ?? false;
    if (enableSanity) {
      context.metaAttrs.push({
        key: "san",
        label: "SAN",
        name: "Sanity",
        value: attrs.san ?? 0,
        bonusDisplay: formatBonus(attrs.san ?? 0),
        defense: null,
        skills: getSkillsForAttr("san"),
        footnote: "Ability to endure terror. Modifies Sanity checks and increases Fear Threshold (+1 per 2 SAN; negative SAN subtracts). Gain +1 Attribute Point at creation, and at levels 5, 10, 15, 20, 25, and 29.",
        isSanity: true,
      });
    }

    // Homebrew: Custom Attributes Engine
    const customAttrs = game.settings.get("mythcraft-essence-sheet", "customAttributes") ?? [];
    for (const cAttr of customAttrs) {
      if (!cAttr.key || !cAttr.name) continue;
      const attrObj = {
        key: cAttr.key,
        label: cAttr.abbr || cAttr.key.toUpperCase(),
        name: cAttr.name,
        value: attrs[cAttr.key] ?? 0,
        bonusDisplay: formatBonus(attrs[cAttr.key] ?? 0),
        defense: null,
        skills: getSkillsForAttr(cAttr.key),
        footnote: cAttr.footnote || null,
        isCustom: true,
      };
      if (cAttr.category === "physical") context.physicalAttrs.push(attrObj);
      else if (cAttr.category === "mental") context.mentalAttrs.push(attrObj);
      else context.metaAttrs.push(attrObj);
    }
  }

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    // Keep editable/progression active on all parts
    context.isPlay = false;
    context.isEditable = true;
    context.editable = true;
    context.isEditMode = true;

    // Recalculate per-render so bars always reflect current HP/AP/SP state
    const hp = this.actor.system.hp || {};
    const ap = this.actor.system.ap || {};
    const sp = this.actor.system.sp || {};
    const hpMax = hp.max || 0;
    const apMax = ap.max || 0;
    const spMax = sp.max || 0;

    // Proportional scaling for HP & Shield Points
    const hpVal = Math.max(0, hp.value || 0);
    const hpShield = Math.max(0, hp.shield || 0);
    const totalHp = hpVal + hpShield;

    if (totalHp > hpMax && totalHp > 0) {
      context.hpPct = Math.round((hpVal / totalHp) * 100);
      context.shieldPct = 100 - context.hpPct;
    } else if (hpMax > 0) {
      context.hpPct = Math.round((hpVal / hpMax) * 100);
      context.shieldPct = Math.round((hpShield / hpMax) * 100);
    } else {
      context.hpPct = 0;
      context.shieldPct = 0;
    }

    // Proportional scaling for AP & Special Action Points (SAP)
    const apVal = Math.max(0, ap.value || 0);
    const apSpecial = Math.max(0, ap.special || 0);
    const totalAp = apVal + apSpecial;

    if (totalAp > apMax && totalAp > 0) {
      context.apPct = Math.round((apVal / totalAp) * 100);
      context.sapPct = 100 - context.apPct;
    } else if (apMax > 0) {
      context.apPct = Math.round((apVal / apMax) * 100);
      context.sapPct = Math.round((apSpecial / apMax) * 100);
    } else {
      context.apPct = 0;
      context.sapPct = 0;
    }

    context.spPct = spMax > 0 ? Math.round(Math.min(100, Math.max(0, (sp.value / spMax) * 100))) : 0;
    context.isBloodied = hpVal > 0 && hpVal <= (hp.bloodied || Math.floor(hpMax / 2));

    // Homebrew: Soul Damage calculation
    const enableSoulDamageSetting = Boolean(getSetting("enableSoulDamage", false));
    const soulDamageVal = Number(this.actor.flags?.["mythcraft-essence-sheet"]?.soulDamage ?? this.actor.system?.soulDamage ?? 0);
    context.enableSoulDamage = enableSoulDamageSetting;
    context.soulDamage = soulDamageVal;
    context.soulPct = (hpMax > 0) ? Math.min(100, Math.round((soulDamageVal / hpMax) * 100)) : 0;
    context.isSoulLethal = (hpVal > 0) && (soulDamageVal >= hpVal);

    // Homebrew: Fear Threshold & Fear Resource calculation
    const enableSanitySetting = game.settings.get("mythcraft-essence-sheet", "enableSanity") ?? false;
    const enableFearSetting = enableSanitySetting && (game.settings.get("mythcraft-essence-sheet", "enableFear") ?? false);
    context.enableFear = enableFearSetting;
    if (enableFearSetting) {
      const sanVal = Number(this.actor.system?.attributes?.san ?? 0);
      const fearThreshold = sanVal >= 0 ? (1 + Math.floor(sanVal / 2)) : (1 + sanVal);
      const fearVal = Number(this.actor.system?.fear?.value ?? this.actor.flags?.["mythcraft-essence-sheet"]?.fear ?? 0);
      context.fearValue = fearVal;
      context.fearThreshold = fearThreshold;
      context.displayFearThreshold = Math.max(0, fearThreshold);
      context.isFearExceeded = fearVal > fearThreshold;
      context.fearPct = fearThreshold > 0 ? Math.round(Math.min(100, Math.max(0, (fearVal / fearThreshold) * 100))) : (fearVal > 0 ? 100 : 0);
    }

    // ── 4 Dedicated Quick-Access Side Tabs & Drawer System ──
    const allContainers = this.actor.items.filter(i => isItemContainer(i));
    const containerDrawerList = allContainers.map(c => {
      const storedItems = this.actor.items.filter(i => {
        const cId = i.flags?.["mythcraft-essence-sheet"]?.containerId;
        return cId === c.id && i.id !== c.id;
      });
      return {
        id: c.id,
        name: c.name,
        img: c.img,
        contentsCount: storedItems.length,
        isOpen: this.expandedItems.has(`container-${c.id}`),
        contents: storedItems.map(si => ({
          id: si.id,
          name: si.name,
          img: si.img,
          quantity: si.system?.quantity ?? 1,
        })),
      };
    });
    const totalStoredCount = containerDrawerList.reduce((acc, c) => acc + c.contentsCount, 0);

    // Clothes
    const allClothes = this.actor.items.filter(i => isItemClothes(i));
    const clothesList = allClothes.map(item => ({
      id: item.id,
      name: item.name,
      img: item.img,
      isWorn: isItemWorn(item),
      quantity: item.system?.quantity ?? 1,
    }));
    const wornClothesList = clothesList.filter(c => c.isWorn);

    // Donned Body Armor (excluding shields and enhancements)
    const donnedBodyArmorItem = getDonnedArmor(this.actor);
    const equippedShieldItem = (this.actor.itemTypes?.armor || []).find(item => isShield(item) && isShieldEquipped(item));
    const equippedEnhancementItem = getEquippedEnhancement(this.actor);

    const bodyArmorCard = donnedBodyArmorItem ? {
      id: donnedBodyArmorItem.id,
      name: donnedBodyArmorItem.name,
      img: donnedBodyArmorItem.img,
      ar: donnedBodyArmorItem.system?.ar || 10,
      resist: donnedBodyArmorItem.system?.resist || "",
    } : null;

    const shieldCard = equippedShieldItem ? {
      id: equippedShieldItem.id,
      name: equippedShieldItem.name,
      img: equippedShieldItem.img,
      shieldArBonus: getShieldArBonus(equippedShieldItem),
      handSlot: equippedShieldItem.flags?.["mythcraft-essence-sheet"]?.equippedHand || "off",
    } : null;

    const enhancementCard = equippedEnhancementItem ? {
      id: equippedEnhancementItem.id,
      name: equippedEnhancementItem.name,
      img: equippedEnhancementItem.img,
      arBonus: Number(equippedEnhancementItem.system?.ar || equippedEnhancementItem.system?.arBonus || 0),
      resist: equippedEnhancementItem.system?.resist || "",
    } : null;

    const donnedArmors = (this.actor.itemTypes?.armor || []).filter(item => {
      if (isShield(item) || isArmorEnhancement(item)) return false;
      return item.system?.equipped === true || item.flags?.["mythcraft-essence-sheet"]?.isDonned === true;
    }).map(item => ({
      id: item.id,
      name: item.name,
      img: item.img,
      ar: item.system?.ar || 10,
      resist: item.system?.resist || "",
    }));

    // Equipped Weapons & Shields for Dual-Hand Layout (Right Hand / Main & Left Hand / Off)
    const rawEquippedWeapons = (this.actor.itemTypes?.weapon || []).filter(item => isWeaponEquipped(item));
    const rawEquippedShields = (this.actor.itemTypes?.armor || []).filter(item => isShield(item) && isShieldEquipped(item));

    let mainHandItem = null;
    let offHandItem = null;
    let twoHandedWeapon = null;

    const equippedHandList = [];

    for (const item of rawEquippedWeapons) {
      const weaponData = getWeaponDamageData(this.actor, item);
      const handType = getWeaponHandType(item);
      const effectiveGrip = getWeaponEffectiveGrip(item);
      const handLabel = handType === "two-handed" ? "2H" : (handType === "hand-and-a-half" ? `1.5H (${effectiveGrip.toUpperCase()})` : "1H");
      const apc = getSafeWeaponApc(item, this.actor);
      const handSlot = item.flags?.["mythcraft-essence-sheet"]?.equippedHand || "main";

      const formatted = {
        id: item.id,
        name: item.name,
        img: item.img,
        apc,
        isShield: false,
        isHandAndHalf: handType === "hand-and-a-half",
        handType,
        effectiveGrip,
        handLabel,
        handSlot,
        damageDisplay: weaponData.effectiveFormula,
      };

      if (effectiveGrip === "2h" || handSlot === "both") {
        twoHandedWeapon = formatted;
        mainHandItem = formatted;
        offHandItem = formatted;
      } else if (handSlot === "off") {
        offHandItem = formatted;
      } else {
        mainHandItem = formatted;
      }

      equippedHandList.push(formatted);
    }

    for (const item of rawEquippedShields) {
      const shieldBonus = getShieldArBonus(item);
      const handSlot = item.flags?.["mythcraft-essence-sheet"]?.equippedHand || "off";

      const formatted = {
        id: item.id,
        name: item.name,
        img: item.img,
        isShield: true,
        shieldArBonus: shieldBonus,
        handLabel: "Shield",
        handSlot,
      };

      if (handSlot === "main") {
        mainHandItem = formatted;
      } else {
        offHandItem = formatted;
      }

      equippedHandList.push(formatted);
    }

    // Build custom compendium maps for homebrew tracks
    const customCompendiums = globalThis.game?.settings?.get("mythcraft-essence-sheet", "customTalentCompendiums") || [];
    const customPackMap = new Map();
    const customTalentMap = new Map();

    for (const c of customCompendiums) {
      if (!c.pack) continue;
      const packKey = c.pack.toLowerCase().trim();
      customPackMap.set(packKey, c);
      const p = game.packs.get(c.pack) || game.packs.find(pack => (pack.metadata?.id || pack.collection || "").toLowerCase() === packKey || (pack.metadata?.label || pack.title || "").toLowerCase() === packKey);
      if (p?.index) {
        for (const entry of p.index) {
          const norm = normalizeTalentName(entry.name);
          const low = entry.name.toLowerCase().trim();
          const info = {
            category: c.category,
            parentName: c.parentName,
            trackName: c.trackName,
            packTitle: p.metadata?.label || p.title,
            packId: p.metadata?.id || p.collection,
          };
          customTalentMap.set(norm, info);
          customTalentMap.set(low, info);
        }
      }
    }

    // Build followed tracks for side drawer
    const drawerTalentItems = (this.actor.items || []).filter(i => {
      if (isDisallowedTalentItem(i)) return false;
      if (i.type === "talent") return true;
      if (i.type === "feature") {
        const rawName = String(i.name || "").trim();
        const norm = normalizeTalentName(rawName);
        if (NORMALIZED_CANONICAL_TALENTS[norm] || CANONICAL_TALENTS[rawName.toLowerCase()]) return true;
        if (customTalentMap.has(norm) || customTalentMap.has(rawName.toLowerCase())) return true;
        const itemPack = (i.flags?.core?.sourceId || i._stats?.compendiumSource || i.pack || "").toLowerCase();
        if (Array.from(customPackMap.keys()).some(k => itemPack.includes(k))) return true;
      }
      return false;
    });

    // Helper function to build tiered flowchart graph for a talent list
    function buildTiersForDrawerTalents(talentList) {
      const nodeMap = new Map();
      for (const t of talentList) {
        const parsed = parseTalentData(t.item);
        nodeMap.set(t.name.toLowerCase().trim(), {
          ...t,
          prerequisites: parsed.prerequisites || [],
          parents: [],
          children: [],
          tier: 1,
        });
      }

      for (const node of nodeMap.values()) {
        for (const prereq of node.prerequisites) {
          const pKey = String(prereq ?? "").toLowerCase().trim();
          const pClean = normalizeTalentName(pKey);
          let pNode = nodeMap.get(pKey);
          if (!pNode) {
            for (const other of nodeMap.values()) {
              if (other.name.toLowerCase().trim() === pKey || normalizeTalentName(other.name) === pClean) {
                pNode = other;
                break;
              }
            }
          }
          if (pNode && pNode !== node && !node.parents.includes(pNode)) {
            pNode.children.push(node);
            node.parents.push(pNode);
          }
        }

        // Link parent if granted by another talent
        const parentName = node.item?.flags?.["mythcraft-essence-sheet"]?.parentTalentName;
        const parentId = node.item?.flags?.["mythcraft-essence-sheet"]?.parentTalentId;
        if (parentId || parentName) {
          node.isGrantedByParent = true;
          node.parentTalentName = parentName;
          let pNode = parentName ? nodeMap.get(parentName.toLowerCase().trim()) : null;
          if (!pNode && parentId) {
            for (const other of nodeMap.values()) {
              if (other.item?.id === parentId || other.id === parentId) {
                pNode = other;
                break;
              }
            }
          }
          if (!pNode && parentName) {
            const pClean = normalizeTalentName(parentName);
            for (const other of nodeMap.values()) {
              if (normalizeTalentName(other.name) === pClean) {
                pNode = other;
                break;
              }
            }
          }
          if (pNode && pNode !== node && !node.parents.includes(pNode)) {
            pNode.children.push(node);
            node.parents.push(pNode);
          }
        }
      }

      function computeTier(node, visited = new Set()) {
        if (visited.has(node.id)) return node.tier;
        visited.add(node.id);
        if (node.parents.length === 0) {
          node.tier = 1;
        } else {
          let maxParentTier = 0;
          for (const p of node.parents) {
            maxParentTier = Math.max(maxParentTier, computeTier(p, visited));
          }
          node.tier = maxParentTier + 1;
        }
        if (/\bIII\b/i.test(node.name)) node.tier = Math.max(node.tier, 3);
        else if (/\bII\b/i.test(node.name)) node.tier = Math.max(node.tier, 2);
        return node.tier;
      }

      for (const node of nodeMap.values()) {
        computeTier(node);
      }

      const allNodes = Array.from(nodeMap.values());
      const tierMap = new Map();
      for (const n of allNodes) {
        const tNum = n.tier || 1;
        if (!tierMap.has(tNum)) tierMap.set(tNum, []);
        tierMap.get(tNum).push(n);
      }

      return Array.from(tierMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([tierNumber, nodes]) => ({
          tierNumber,
          nodes: nodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        }));
    }

    function cleanClassName(name) {
      if (!name) return "";
      let s = String(name).trim();
      s = s.replace(/\s*entry\s*talents?$/i, "")
           .replace(/\s*entry$/i, "")
           .replace(/\s*talents?$/i, "")
           .replace(/\s*class$/i, "")
           .trim();
      return s || name;
    }

    // Gather active class entry names / class identities on the actor
    const actorEntryClasses = [];
    for (const item of drawerTalentItems) {
      const rawName = String(item.name || "").trim();
      const norm = normalizeTalentName(rawName);
      if (/entry\b/i.test(rawName) || /entry\b/i.test(norm)) {
        const cls = cleanClassName(rawName);
        if (cls && !actorEntryClasses.some(c => c.toLowerCase() === cls.toLowerCase())) {
          actorEntryClasses.push(cls);
        }
      }
    }
    const actorDetailClass = cleanClassName(String(this.actor.system?.details?.class || this.actor.system?.class || "").trim());
    if (actorDetailClass && !actorEntryClasses.some(c => c.toLowerCase() === actorDetailClass.toLowerCase())) {
      actorEntryClasses.push(actorDetailClass);
    }

    const classTreeMap = new Map();
    const otherTrackMap = new Map();

    for (const item of drawerTalentItems) {
      const trackInfo = resolveTalentTrackInfo(item, { customTalentMap, customPackMap });
      const category = trackInfo.category;
      let rootName = trackInfo.rootName;
      let trackName = trackInfo.trackName;
      const isEntry = trackInfo.isEntry || /entry\b/i.test(item.name);

      const talentEntry = {
        id: item.id,
        item,
        name: item.name,
        img: item.img || "icons/svg/aura.svg",
        essenceCost: Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0),
        isEntry,
      };

      if (category === "class") {
        let finalClassName = cleanClassName(rootName);
        let finalSubclassName = trackName;

        // If rootName is generic (e.g. "Class", "Classes", "General") or matches an entry class
        const isGenericRoot = !finalClassName || /^(class|classes|general|specialization|class\s*talents?)$/i.test(finalClassName.trim());
        if (isGenericRoot) {
          if (actorEntryClasses.length > 0) {
            finalClassName = actorEntryClasses[0];
          } else {
            finalClassName = "Class";
          }
        }

        if (isEntry || /entry\b/i.test(item.name)) {
          finalClassName = cleanClassName(item.name) || finalClassName;
          finalSubclassName = `${finalClassName} Entry`;
        } else {
          // Check explicit item tags or direct tags for subclass name (e.g. "Spellblade")
          const explicitTags = parseExplicitItemTags(item);
          const { directTags } = extractTalentStructuredTags(item);
          const subclassTag = explicitTags.track || directTags.find(t => {
            const tLow = t.toLowerCase().trim();
            return !/^(class|classes|talent|talents|feature|features|crb|heroic|entry|specialization|general)$/i.test(tLow) && tLow !== finalClassName.toLowerCase();
          });

          if (subclassTag) {
            finalSubclassName = subclassTag;
          } else if (actorEntryClasses.some(c => c.toLowerCase() === finalClassName.toLowerCase())) {
            // finalClassName is already the class (e.g. "Mage")
          } else if (actorEntryClasses.length > 0 && finalClassName && !/^(class|classes)$/i.test(finalClassName)) {
            // finalClassName was actually the subclass name
            finalSubclassName = finalClassName;
            finalClassName = actorEntryClasses[0];
          }

          // If subclassName is generic or identical to className, resolve from folders or prerequisites
          const isGenericSub = !finalSubclassName || /^(class|classes|general|class\s*talents?|specialization)$/i.test(finalSubclassName.trim()) || finalSubclassName.toLowerCase() === finalClassName.toLowerCase();
          if (isGenericSub) {
            const rawChain = item._folderChain || (typeof item.folder === "object" ? [item.folder?.name] : []);
            const validFolder = (Array.isArray(rawChain) ? rawChain : [])
              .map(f => String(f || "").trim())
              .find(f => f && !/^(compendiums?|items?|core\s*rulebook|crb|talents?|class\s*talents?|classes?|subclasses?|specializations?|magic\s*talents?|magic|disciplines?|features?)$/i.test(f) && f.toLowerCase() !== finalClassName.toLowerCase());

            if (validFolder) {
              finalSubclassName = validFolder;
            } else {
              const parsed = parseTalentData(item);
              if (parsed.prerequisites && parsed.prerequisites.length > 0) {
                finalSubclassName = parsed.prerequisites[0];
              } else {
                finalSubclassName = item.name;
              }
            }
          }
        }

        const clsKey = finalClassName.toUpperCase();
        if (!classTreeMap.has(clsKey)) {
          classTreeMap.set(clsKey, {
            className: finalClassName,
            entryTalents: [],
            subclassMap: new Map(),
            talents: [],
          });
        }
        const classObj = classTreeMap.get(clsKey);
        classObj.talents.push(talentEntry);

        if (isEntry || /entry\b/i.test(item.name) || /entry\b/i.test(finalSubclassName)) {
          classObj.entryTalents.push(talentEntry);
        } else {
          const subKey = finalSubclassName.toUpperCase();
          if (!classObj.subclassMap.has(subKey)) {
            classObj.subclassMap.set(subKey, {
              subclassName: finalSubclassName,
              talents: [],
            });
          }
          classObj.subclassMap.get(subKey).talents.push(talentEntry);
        }
      } else {
        let groupKey;
        if (category === "magic") {
          groupKey = rootName.toUpperCase();
        } else if (trackName && trackName.toLowerCase() !== "general" && trackName.toLowerCase() !== rootName.toLowerCase()) {
          groupKey = `${rootName} — ${trackName}`.toUpperCase();
        } else {
          groupKey = rootName.toUpperCase();
        }

        if (!otherTrackMap.has(groupKey)) {
          otherTrackMap.set(groupKey, {
            groupKey,
            rootName: rootName.toUpperCase(),
            trackName: trackName.toUpperCase(),
            category,
            talents: [],
          });
        }
        otherTrackMap.get(groupKey).talents.push(talentEntry);
      }
    }

    // Unify subclass clusters if multiple fragments share a common root talent
    for (const classObj of classTreeMap.values()) {
      const nonEntryTalents = classObj.talents.filter(t => !t.isEntry);
      if (nonEntryTalents.length > 0 && classObj.subclassMap.size > 1) {
        // Find if all non-entry talents connect to a single root node or tag
        const allParsed = nonEntryTalents.map(t => ({ talent: t, parsed: parseTalentData(t.item) }));
        const rootCandidate = allParsed.find(p => p.parsed.prerequisites.length === 0);
        if (rootCandidate) {
          const unifiedName = rootCandidate.talent.name;
          const unifiedTalents = Array.from(classObj.subclassMap.values()).flatMap(s => s.talents);
          classObj.subclassMap.clear();
          classObj.subclassMap.set(unifiedName.toUpperCase(), {
            subclassName: unifiedName,
            talents: unifiedTalents,
          });
        }
      }
    }

    const classTrees = Array.from(classTreeMap.values())
      .sort((a, b) => a.className.localeCompare(b.className))
      .map(c => {
        const subclasses = Array.from(c.subclassMap.values())
          .sort((a, b) => a.subclassName.localeCompare(b.subclassName))
          .map(sub => ({
            subclassName: sub.subclassName,
            talents: sub.talents,
            tiers: buildTiersForDrawerTalents(sub.talents),
          }));
        return {
          className: c.className,
          entryTalents: c.entryTalents.sort((a, b) => a.name.localeCompare(b.name)),
          subclasses,
          totalTalentsCount: c.talents.length,
        };
      });

    const otherTrees = Array.from(otherTrackMap.values())
      .sort((a, b) => a.groupKey.localeCompare(b.groupKey))
      .map(track => ({
        ...track,
        tiers: buildTiersForDrawerTalents(track.talents),
      }));

    const drawerFollowedTracks = [...otherTrees];

    context.sideDrawer = {
      activeTab: this.activeSideDrawerTab || null,
      storage: {
        containers: containerDrawerList,
        containerCount: containerDrawerList.length,
        totalItems: totalStoredCount,
      },
      clothes: {
        items: wornClothesList,
        wornCount: wornClothesList.length,
        totalCount: clothesList.length,
      },
      armor: {
        bodyArmor: bodyArmorCard,
        shield: shieldCard,
        enhancement: enhancementCard,
        items: donnedArmors,
        count: (bodyArmorCard ? 1 : 0) + (shieldCard ? 1 : 0) + (enhancementCard ? 1 : 0),
        ar: this.actor.system?.defenses?.ar || 10,
      },
      weapons: {
        items: equippedHandList,
        count: equippedHandList.length,
        mainHand: mainHandItem,
        offHand: offHandItem,
        twoHanded: twoHandedWeapon,
        isTwoHanded: Boolean(twoHandedWeapon),
        hasAny: equippedHandList.length > 0,
      },
      talents: {
        classTrees,
        otherTrees,
        followedTracks: drawerFollowedTracks,
        count: drawerTalentItems.length,
        tracksCount: classTrees.length + otherTrees.length,
      },
    };

    // Backward compatibility for containerSideTabs
    context.containerSideTabs = containerDrawerList;

    // Size Dropdown Options
    const SIZES_MAP = {
      fine: "Fine",
      diminutive: "Diminutive",
      tiny: "Tiny",
      small: "Small",
      medium: "Medium",
      large: "Large",
      largeLong: "Large (long)",
      largeTall: "Large (tall)",
      huge: "Huge",
      hugeLong: "Huge (long)",
      hugeTall: "Huge (tall)",
      gargantuan: "Gargantuan",
      gargantuanLong: "Gargantuan (long)",
      gargantuanTall: "Gargantuan (tall)",
      colossal: "Colossal",
      colossalLong: "Colossal (long)",
      colossalTall: "Colossal (tall)",
      titan: "Titan",
    };

    const currentSize = String(this.actor.system?.size || "medium").replace(/^MYTHCRAFT\.Sizes\./i, "").toLowerCase();
    context.sizeOptions = Object.entries(SIZES_MAP).map(([key, label]) => ({
      key,
      label,
      selected: currentSize === key.toLowerCase() || currentSize === label.toLowerCase(),
    }));

    const cleanSourceLabel = (raw) => {
      if (!raw || typeof raw !== "string") return "";
      let loc = raw;
      try {
        if (typeof game?.i18n?.localize === "function") {
          loc = game.i18n.localize(raw);
        }
      } catch (e) {}
      if (loc && loc !== raw && typeof loc === "string" && !loc.startsWith("MYTHCRAFT.")) return loc;
      const stripped = String(raw).replace(/^MYTHCRAFT\.(ITEM|Item)\.spell\.source\./i, "").toLowerCase();
      const map = {
        arcane: "Arcane",
        divine: "Divine",
        occult: "Occult",
        primal: "Primal",
        psionic: "Psionic",
      };
      return map[stripped] || (stripped ? (stripped.charAt(0).toUpperCase() + stripped.slice(1)) : "");
    };

    const cleanSourceKey = (raw) => {
      if (!raw || typeof raw !== "string") return "";
      return String(raw).replace(/^MYTHCRAFT\.(ITEM|Item)\.spell\.source\./i, "").toLowerCase();
    };

    if (partId === "spells") {
      const curMagicAttr = this.actor.flags?.["mythcraft-essence-sheet"]?.magicAttribute
        || this.actor.system?.sp?.attribute
        || this.actor.system?.attributes?.magic
        || "int";
      context.magicAttribute = curMagicAttr;
      context.magicAttributeOptions = getMagicAttributeOptions(curMagicAttr);

      const sources = mythcraft.CONFIG?.spells?.sources || {
        arcane: { label: "Arcane" },
        divine: { label: "Divine" },
        occult: { label: "Occult" },
        primal: { label: "Primal" },
        psionic: { label: "Psionic" },
      };
      const powerLevels = this.actor.system?.powerLevel || {};
      const spellItems = this.actor.itemTypes.spell || [];

      // Count known spells per magic source (preferring Spell Library source)
      const sourceCounts = {};
      for (const spell of spellItems) {
        const lib = getSpellLibraryEntry(spell);
        const raw = lib?.sourceKey || (typeof spell.system?.magicSource === "string" ? spell.system.magicSource : "");
        const k = cleanSourceKey(raw);
        if (k) sourceCounts[k] = (sourceCounts[k] || 0) + 1;
      }

      context.magicLevels = Object.entries(sources).map(([key, sourceInfo]) => {
        const k = key.toLowerCase();
        const count = sourceCounts[k] || 0;
        const levelVal = powerLevels[key] ?? 0;
        const hasSpells = count > 0 || levelVal > 0;
        const rawLabel = typeof sourceInfo?.label === "string" ? sourceInfo.label : (typeof sourceInfo === "string" ? sourceInfo : key);
        return {
          key: k,
          colorKey: k,
          name: `system.powerLevel.${key}`,
          value: levelVal,
          label: cleanSourceLabel(rawLabel || key),
          hasSpells,
          spellCount: count,
          isActive: this.activeMagicFilters.has(k),
        };
      });

      // Group/Sort spells by magic type (Arcane, Divine, Occult, Primal, Psionic) and then alphabetically
      const SOURCE_ORDER = {
        arcane: 1,
        divine: 2,
        occult: 3,
        primal: 4,
        psionic: 5,
      };

      const sortedSpells = [...spellItems].sort((a, b) => {
        const libA = getSpellLibraryEntry(a);
        const libB = getSpellLibraryEntry(b);
        const srcA = libA?.sourceKey || cleanSourceKey(typeof a.system?.magicSource === "string" ? a.system.magicSource : "");
        const srcB = libB?.sourceKey || cleanSourceKey(typeof b.system?.magicSource === "string" ? b.system.magicSource : "");
        const orderA = SOURCE_ORDER[srcA] ?? 99;
        const orderB = SOURCE_ORDER[srcB] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });

      // Filter spells if any magic source filters are active
      const filteredSpells = (this.activeMagicFilters.size > 0)
        ? sortedSpells.filter(item => {
            const lib = getSpellLibraryEntry(item);
            const raw = lib?.sourceKey || (typeof item.system?.magicSource === "string" ? item.system.magicSource : "");
            const k = cleanSourceKey(raw);
            return this.activeMagicFilters.has(k);
          })
        : sortedSpells;

      const SPECIAL_TAG_PATTERNS = [
        { pattern: /cantrip/i, label: "Cantrip", color: "arcane" },
        { pattern: /prayer/i, label: "Prayer", color: "divine" },
        { pattern: /ritual/i, label: "Ritual", color: "occult" },
        { pattern: /chant/i, label: "Chant", color: "primal" },
        { pattern: /invocation/i, label: "Invocation", color: "psionic" },
      ];

      const tagConfig = mythcraft.CONFIG?.spells?.tags || {};

      context.spells = await Promise.all(filteredSpells.map(async (item) => {
        const expanded = this.expandedItems.has(item.id);
        const libEntry = getSpellLibraryEntry(item);
        const scalingInfo = evaluateSpellScalingAndUpcharge(this.actor, libEntry || item);
        const prereqStatus = checkSpellPrerequisite(this.actor, libEntry || item);
        const requirementBadges = getSpellRequirementsBadges(libEntry || item);

        const rawSource = libEntry?.magicSource || (typeof item.system?.magicSource === "string" ? item.system.magicSource : "");
        const sourceKey = libEntry?.sourceKey || cleanSourceKey(rawSource);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";

        // Extract raw tags from Library + Item Set, Array, or Object
        let rawTags = [];
        if (libEntry?.tags?.length) {
          rawTags.push(...libEntry.tags);
        }
        if (libEntry?.spellType && libEntry.spellType !== "Spell") {
          rawTags.push(libEntry.spellType);
        }
        if (item.system?.tags) {
          if (item.system.tags instanceof Set) {
            rawTags.push(...Array.from(item.system.tags));
          } else if (Array.isArray(item.system.tags)) {
            rawTags.push(...item.system.tags);
          } else if (typeof item.system.tags === "object") {
            rawTags.push(...Object.values(item.system.tags));
          }
        }

        const allTags = [];
        const inlineTags = [];
        const seenInline = new Set();

        for (const rawTag of rawTags) {
          if (!rawTag) continue;
          const tStr = String(rawTag).trim();
          const tClean = tStr.replace(/^MYTHCRAFT\.Item\.spell\.tags\./i, "").toLowerCase();
          const conf = tagConfig[tClean] || tagConfig[tStr];
          
          let displayLabel = conf ? game.i18n.localize(conf.label) : (tStr.charAt(0).toUpperCase() + tStr.slice(1));
          
          // Check if this tag matches any special tag pattern
          const special = SPECIAL_TAG_PATTERNS.find(p => p.pattern.test(tClean) || p.pattern.test(displayLabel));

          const tagObj = {
            key: tClean,
            label: displayLabel,
            colorClass: special?.color || (conf?.sources ? Array.from(conf.sources)[0] : "default"),
          };

          allTags.push(tagObj);

          if (special && !seenInline.has(special.label)) {
            seenInline.add(special.label);
            inlineTags.push({
              key: special.label.toLowerCase(),
              label: special.label,
              colorClass: special.color,
            });
          }
        }

        const tags = getEnrichedItemTags(item);
        const actorSpellAttrs = this.actor.flags?.["mythcraft-essence-sheet"]?.spellAttributes || {};
        const spellAttr = actorSpellAttrs[item.id]
          || item.flags?.["mythcraft-essence-sheet"]?.spellcastingAttribute
          || item.system?.spellcastingAttribute
          || item.system?.attribute
          || "";

        const spellAttributeOptions = getMagicAttributeOptions(spellAttr).map(opt => ({
          key: opt.key,
          abbr: opt.abbr,
          name: opt.name,
          label: opt.label,
          selected: opt.key === spellAttr || (opt.key === "luck" && spellAttr === "lck") || (opt.key === "lck" && spellAttr === "luck"),
        }));

        const displayApc = libEntry
          ? (typeof libEntry.apc === "number" ? scalingInfo.effectiveApc : libEntry.apc)
          : (item.system?.apc ?? null);
        const displaySpc = libEntry
          ? (typeof libEntry.spc === "number" ? scalingInfo.effectiveSpc : libEntry.spc)
          : (item.system?.spc ?? null);
        const isAttack = libEntry
          ? Boolean(libEntry.isAttack)
          : Boolean(item.system?.isAttack ?? (item.system?.defenseTarget || item.system?.defense));
        const targetDefense = libEntry?.target || item.system?.defenseTarget || item.system?.defense || null;
        const targetDefenseConfig = targetDefense ? getDefenseTargetConfig(targetDefense) : null;

        return {
          item,
          libEntry,
          expanded,
          magicSourceKey: sourceKey,
          magicSourceLabel: libEntry?.magicSource || cleanSourceLabel(rawSource),
          spellTypeLabel: libEntry?.spellType || "Spell",
          functionLabel: libEntry?.function || null,
          displayApc,
          displaySpc,
          rangeLabel: libEntry?.range || item.system?.rangeLabel || null,
          durationLabel: libEntry?.duration || item.system?.durationLabel || null,
          castingTimeLabel: libEntry?.castingTime || item.system?.castingTime || null,
          requiresLabel: libEntry?.requires || null,
          requirementBadges,
          prereqUnmet: !prereqStatus.met,
          prereqText: prereqStatus.prerequisiteText,
          prereqNote: prereqStatus.note,
          isAttack,
          targetDefense,
          targetDefenseConfig,
          upchargeText: libEntry?.upcharge || null,
          materialsText: libEntry?.materials || null,
          activeScalingNotes: scalingInfo.activeScalingNotes || [],
          spellcastingAttribute: spellAttr,
          spellAttributeOptions,
          inlineTags,
          allTags,
          tags,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));
    }

    if (partId === "equipment") {
      // 1. Calculate Essence Data (Full by default, decreases as attuned essence is spent on items)
      const aeEquipBonuses = getActorActiveEffectBonuses(this.actor);
      const maxEssence = Math.max(0, 100 + (aeEquipBonuses.essenceMaxBonus || 0));
      let usedEssence = 0;
      for (const item of this.actor.items) {
        const cost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;
        if (cost > 0 && isAttuned) {
          usedEssence += cost;
        }
      }
      const remainingEssence = Math.max(0, maxEssence - usedEssence);
      const isOverCapacity = usedEssence > maxEssence;
      const overAmount = isOverCapacity ? (usedEssence - maxEssence) : 0;
      
      // Bar is full (100%) by default and empties as essence is bound
      const remainingPercent = isOverCapacity ? 100 : Math.min(100, Math.max(0, Math.round((remainingEssence / maxEssence) * 100)));

      let tier = "high";
      if (isOverCapacity) tier = "over";
      else if (remainingPercent === 0) tier = "empty";
      else if (remainingPercent < 35) tier = "low";
      else if (remainingPercent < 70) tier = "mid";

      context.essenceData = {
        used: usedEssence,
        max: maxEssence,
        remaining: remainingEssence,
        percent: remainingPercent,
        tier,
        isOverCapacity,
        overAmount,
      };

      const affinitySet = new Set(
        Array.from(this.actor.system?.damage?.affinity || []).map(k => String(k).toLowerCase().trim())
      );

      // Container hierarchy preparation
      const allContainers = this.actor.items.filter(i => isItemContainer(i));
      const containerIds = new Set(allContainers.map(c => c.id));

      const enrichContainerContents = async (containerId) => {
        const storedItems = this.actor.items.filter(i => {
          const cId = i.flags?.["mythcraft-essence-sheet"]?.containerId;
          return cId === containerId && i.id !== containerId;
        });
        return await Promise.all(storedItems.map(async (ci) => {
          const cExpanded = this.expandedItems.has(ci.id);
          const cDesc = ci.system?.description?.value ?? ci.system?.description ?? "";
          return {
            item: ci,
            id: ci.id,
            name: ci.name,
            img: ci.img,
            type: ci.type,
            quantity: ci.system?.quantity ?? 1,
            expanded: cExpanded,
            tags: getEnrichedItemTags(ci),
            descriptionHTML: cExpanded ? await enrichText(cDesc, { rollData: this.actor.getRollData() }) : "",
          };
        }));
      };

      const isNestedItem = (item) => {
        const cId = item.flags?.["mythcraft-essence-sheet"]?.containerId;
        return Boolean(cId && containerIds.has(cId) && item.id !== cId);
      };

      // 2. Prepare Weapons
      context.weapons = await Promise.all((this.actor.itemTypes.weapon || []).filter(item => !isNestedItem(item)).map(async (item) => {
        const expanded = this.expandedItems.has(item.id);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;

        // Damage formula & type (with attribute modifier, affinity check, & Brass Knuckles automation)
        const weaponData = getWeaponDamageData(this.actor, item);
        const isBK = isBrassKnuckles(item);
        const isUnarmedOrNat = isUnarmedOrNaturalWeapon(item);

        // Attack modifier (only if weapon has an attribute assigned or defense target or attack modifier)
        let rawAttr = (weaponData.attrKey || item.system?.attr || "").toLowerCase().trim();
        if (rawAttr.startsWith("my")) rawAttr = rawAttr.replace(/^mythcraft\.attributes\./i, "");
        const validAttrs = new Set(["str", "dex", "end", "awr", "int", "cha", "luck", "cor"]);
        const hasAttackAttr = validAttrs.has(rawAttr);
        const rawDefense = (item.system?.defense || item.system?.defenseTarget || item.system?.targetDefense || "").trim();
        const hasDefenseTarget = Boolean(rawDefense);
        const itemAtkMod = getWeaponAttackModifier(item, this.actor);

        const hasAttackRoll = hasAttackAttr || hasDefenseTarget || itemAtkMod !== 0 || isBK || isUnarmedOrNat;

        const rawAttrObj = hasAttackAttr ? this.actor.system?.attributes?.[rawAttr] : 0;
        const attrVal = Number(typeof rawAttrObj === "object" && rawAttrObj !== null ? (rawAttrObj.value ?? 0) : (rawAttrObj ?? 0));
        
        let atkBonusDisplay = "";
        if (hasAttackRoll) {
          const totalAtk = attrVal + itemAtkMod;
          atkBonusDisplay = totalAtk >= 0 ? `+${totalAtk}` : `${totalAtk}`;
        }

        const damages = (item.system?.damage ?? []).filter(d => d && d.formula && !/^\*+$/.test(String(d.formula).trim()));
        const damageParts = damages.map((d, idx) => {
          const dmgType = String(d.type || weaponData.damageType || "sharp").trim();
          let formulaDisplay = (idx === 0) ? weaponData.baseFormula : d.formula;
          const totalFlatMod = (idx === 0) ? weaponData.totalMod : 0;
          if (totalFlatMod > 0) {
            formulaDisplay = `${formulaDisplay} + ${totalFlatMod}`;
          } else if (totalFlatMod < 0) {
            formulaDisplay = `${formulaDisplay} - ${Math.abs(totalFlatMod)}`;
          }
          if (idx === 0 && weaponData.aeDamageBonus?.dice?.length) {
            formulaDisplay = `${formulaDisplay} + ${weaponData.aeDamageBonus.dice.join(" + ")}`;
          }
          const typeLabel = dmgType.charAt(0).toUpperCase() + dmgType.slice(1);
          return `${formulaDisplay} ${typeLabel}`;
        });
        const defaultTypeLabel = (weaponData.damageType || "sharp").charAt(0).toUpperCase() + (weaponData.damageType || "sharp").slice(1);
        const damageDisplay = damageParts.length ? damageParts.join(" + ") : `${weaponData.effectiveFormula} ${defaultTypeLabel}`;

        // APC
        const apc = getSafeWeaponApc(item, this.actor);

        // Range
        let rangeDisplay = "";
        if (item.system?.range) {
          const r = item.system.range;
          if (typeof r === "string") rangeDisplay = r;
          else if (r.value) rangeDisplay = `${r.value} ${r.unit || "ft"}`;
          else if (r.type) rangeDisplay = String(r.type).charAt(0).toUpperCase() + String(r.type).slice(1);
        }

        const tags = getEnrichedItemTags(item);
        const isContainer = isItemContainer(item);
        const contents = isContainer ? await enrichContainerContents(item.id) : [];
        const containerExpanded = this.expandedItems.has(`container-${item.id}`);

        const handType = getWeaponHandType(item);
        const effectiveGrip = getWeaponEffectiveGrip(item);
        const requiresEquip = Boolean(handType);
        const handLabel = handType === "two-handed" ? "2H" : (handType === "hand-and-a-half" ? "1.5H" : (handType === "one-handed" ? "1H" : ""));
        const currentGripLabel = effectiveGrip.toUpperCase();
        const isHandAndHalf = handType === "hand-and-a-half";
        const isEquipped = requiresEquip ? isWeaponEquipped(item) : (isUnarmedOrNat ? true : Boolean(item.system?.equipped));
        const isUnwieldy = isWeaponUnwieldy(item);
        const defenseTarget = (item.system?.defenseTarget || item.system?.defense || "").toUpperCase();

        return {
          item,
          expanded,
          requiresEquip,
          isEquipped,
          hasAttackRoll,
          defenseTarget,
          handType,
          effectiveGrip,
          currentGripLabel,
          isHandAndHalf,
          handLabel,
          isUnwieldy,
          essenceCost,
          isAttuned,
          atkBonusDisplay,
          damageDisplay,
          apc,
          rangeDisplay,
          tags,
          isContainer,
          contents,
          contentsCount: contents.length,
          containerExpanded,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));

      // 3. Prepare Armor
      context.armor = await Promise.all((this.actor.itemTypes.armor || []).filter(item => !isNestedItem(item)).map(async (item) => {
        const expanded = this.expandedItems.has(item.id);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;

        const isShieldItem = isShield(item);
        const isEnhancementItem = isArmorEnhancement(item);
        const isEquipped = isShieldItem ? isShieldEquipped(item) : (isEnhancementItem ? isEnhancementEquipped(item) : false);
        const isDonned = !isShieldItem && !isEnhancementItem && (item.system?.equipped === true || item.flags?.["mythcraft-essence-sheet"]?.isDonned === true);
        const isWorn = isEnhancementItem && isEnhancementEquipped(item);
        const shieldArBonus = isShieldItem ? getShieldArBonus(item) : 0;
        const enhArBonus = isEnhancementItem ? Number(item.system?.ar || item.system?.arBonus || 0) : 0;
        const ar = Number.isNumeric(item.system?.ar) ? Number(item.system.ar) : 10;
        const resist = item.system?.resist || "";
        const hasSecondSkin = hasSecondSkinForArmor(this.actor, item);
        const armorCategory = getArmorCategory(item);
        const strMin = item.system?.strMin;
        const actorStr = this.actor.system?.attributes?.str ?? 0;
        const isStrFailed = (isDonned || isEquipped || isWorn) && Number.isNumeric(strMin) && strMin > 0 && actorStr < strMin;

        const dexMax = item.system?.dexMax;
        const actorDex = this.actor.system?.attributes?.dex ?? 0;
        const isDexClamped = isDonned && Number.isNumeric(dexMax) && actorDex > dexMax;

        const speedPenalty = Number(item.system?.speedPenalty) || 0;

        // Collect non-zero defense bonuses/penalties
        const defBonuses = [];
        const defs = item.system?.defenses || {};
        for (const [defKey, val] of Object.entries(defs)) {
          const num = Number(val) || 0;
          if (num !== 0) {
            defBonuses.push({
              key: defKey,
              label: defKey.toUpperCase(),
              value: num,
              display: num > 0 ? `+${num}` : `${num}`,
            });
          }
        }

        const tags = getEnrichedItemTags(item);
        const isContainer = isItemContainer(item);
        const contents = isContainer ? await enrichContainerContents(item.id) : [];
        const containerExpanded = this.expandedItems.has(`container-${item.id}`);

        let donStatusLabel = "Doffed";
        if (isEnhancementItem) {
          donStatusLabel = isWorn ? "Worn" : "Wear";
        } else if (isShieldItem) {
          donStatusLabel = isEquipped ? "Equipped" : "Stowed";
        } else {
          donStatusLabel = isDonned ? "Donned" : "Doffed";
        }

        return {
          item,
          expanded,
          essenceCost,
          isAttuned,
          isShield: isShieldItem,
          isEnhancement: isEnhancementItem,
          isEquipped,
          isDonned,
          isWorn,
          shieldArBonus,
          enhArBonus,
          donStatusLabel,
          ar,
          resist,
          hasSecondSkin,
          armorCategory,
          strMin,
          isStrFailed,
          dexMax,
          isDexClamped,
          speedPenalty,
          defBonuses,
          tags,
          isContainer,
          contents,
          contentsCount: contents.length,
          containerExpanded,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));

      // 4. Prepare Gear
      context.gear = await Promise.all((this.actor.itemTypes.gear || []).filter(item => !isNestedItem(item)).map(async (item) => {
        const expanded = this.expandedItems.has(item.id);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;
        const tags = getEnrichedItemTags(item);
        const isContainer = isItemContainer(item);
        const contents = isContainer ? await enrichContainerContents(item.id) : [];
        const containerExpanded = this.expandedItems.has(`container-${item.id}`);
        const isClothes = isItemClothes(item);
        const isWorn = isItemWorn(item);

        return {
          item,
          expanded,
          essenceCost,
          isAttuned,
          isClothes,
          isWorn,
          quantity: item.system?.quantity ?? 1,
          tags,
          isContainer,
          contents,
          contentsCount: contents.length,
          containerExpanded,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));

      // Sort gear so containers are always pinned to the top
      context.gear.sort((a, b) => {
        if (a.isContainer && !b.isContainer) return -1;
        if (!a.isContainer && b.isContainer) return 1;
        return a.item.name.localeCompare(b.item.name);
      });

      // 5. Configured Campaign Currencies
      const activeCurrencies = getActiveCurrencies();
      context.configuredCurrencies = activeCurrencies.map(c => ({
        ...c,
        value: getActorCurrencyCount(this.actor, c),
      }));
    }

    if (partId === "talents") {
      const customCompendiums = globalThis.game?.settings?.get("mythcraft-essence-sheet", "customTalentCompendiums") || [];
      const customPackMap = new Map();
      const customTalentMap = new Map();

      for (const c of customCompendiums) {
        if (!c.pack) continue;
        const packKey = c.pack.toLowerCase().trim();
        customPackMap.set(packKey, c);
        const p = game.packs.get(c.pack) || game.packs.find(pack => (pack.metadata?.id || pack.collection || "").toLowerCase() === packKey || (pack.metadata?.label || pack.title || "").toLowerCase() === packKey);
        if (p?.index) {
          for (const entry of p.index) {
            const norm = normalizeTalentName(entry.name);
            const low = entry.name.toLowerCase().trim();
            const info = {
              category: c.category,
              parentName: c.parentName,
              trackName: c.trackName,
              packTitle: p.metadata?.label || p.title,
              packId: p.metadata?.id || p.collection,
            };
            customTalentMap.set(norm, info);
            customTalentMap.set(low, info);
          }
        }
      }

      const isRawSecondSkin = getSetting("secondSkinRuleVariant", "raw") === "raw";

      // Track repetition counts across all owned talents and features
      const talentCountMap = new Map();
      for (const item of (this.actor.itemTypes.talent || [])) {
        const norm = normalizeTalentName(item.name);
        talentCountMap.set(norm, (talentCountMap.get(norm) || 0) + 1);
      }
      for (const item of (this.actor.itemTypes.feature || [])) {
        const norm = normalizeTalentName(item.name);
        talentCountMap.set(norm, (talentCountMap.get(norm) || 0) + 1);
      }

      context.talents = await Promise.all((this.actor.itemTypes.talent || []).map(async (item) => {
        const isFavorite = isItemFavorite(item);
        const expanded = this.collapsedItems.has(item.id)
          ? false
          : (this.expandedItems.has(item.id) || isFavorite);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;
        const isSecondSkin = isRawSecondSkin && isSecondSkinTalent(item);
        const secondSkinArmor = item.flags?.["mythcraft-essence-sheet"]?.secondSkinArmor || "";
        const parentTalentName = item.flags?.["mythcraft-essence-sheet"]?.parentTalentName || null;
        const parentTalentId = item.flags?.["mythcraft-essence-sheet"]?.parentTalentId || null;
        const isGrantedTalent = Boolean(item.flags?.["mythcraft-essence-sheet"]?.isGrantedTalent || parentTalentName);
        const grantedTalentNames = Array.from(item.flags?.["mythcraft-essence-sheet"]?.grantedTalentNames || []);
        const talentGrants = getTalentGrantsAndPicks(item);
        const hasTalentGrants = Array.isArray(talentGrants) && talentGrants.length > 0 && !isTalentGrantFullySatisfied(this.actor, item);
        const skillGrant = getTalentSkillPointGrant(item);
        const hasSkillGrant = Boolean(skillGrant);
        const allocatedMap = item.flags?.["mythcraft-essence-sheet"]?.skillAllocation || {};
        const allocatedEntries = Object.entries(allocatedMap).filter(([_, pts]) => Number(pts) > 0);
        let skillAllocationSummary = "";
        if (hasSkillGrant) {
          if (allocatedEntries.length > 0) {
            skillAllocationSummary = allocatedEntries.map(([k, pts]) => {
              const reg = SKILL_REGISTRY.get(k);
              return `+${pts} ${reg?.name || k}`;
            }).join(", ");
          } else {
            skillAllocationSummary = `${skillGrant.points} unallocated`;
          }
        }
        const norm = normalizeTalentName(item.name);
        const repeatCount = talentCountMap.get(norm) || 1;
        const showRepeatBadge = repeatCount > 1;
        return {
          item,
          isFavorite,
          expanded,
          essenceCost,
          isAttuned,
          isSecondSkin,
          secondSkinArmor,
          parentTalentName,
          parentTalentId,
          isGrantedTalent,
          grantedTalentNames,
          hasTalentGrants,
          hasSkillGrant,
          skillGrant,
          skillAllocationSummary,
          repeatCount,
          showRepeatBadge,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));

      context.features = await Promise.all((this.actor.itemTypes.feature || []).map(async (item) => {
        const isFavorite = isItemFavorite(item);
        const expanded = this.collapsedItems.has(item.id)
          ? false
          : (this.expandedItems.has(item.id) || isFavorite);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;
        const isSecondSkin = isRawSecondSkin && isSecondSkinTalent(item);
        const secondSkinArmor = item.flags?.["mythcraft-essence-sheet"]?.secondSkinArmor || "";
        const parentTalentName = item.flags?.["mythcraft-essence-sheet"]?.parentTalentName || null;
        const parentTalentId = item.flags?.["mythcraft-essence-sheet"]?.parentTalentId || null;
        const isGrantedTalent = Boolean(item.flags?.["mythcraft-essence-sheet"]?.isGrantedTalent || parentTalentName);
        const grantedTalentNames = Array.from(item.flags?.["mythcraft-essence-sheet"]?.grantedTalentNames || []);
        const talentGrants = getTalentGrantsAndPicks(item);
        const hasTalentGrants = Array.isArray(talentGrants) && talentGrants.length > 0 && !isTalentGrantFullySatisfied(this.actor, item);
        const skillGrant = getTalentSkillPointGrant(item);
        const hasSkillGrant = Boolean(skillGrant);
        const allocatedMap = item.flags?.["mythcraft-essence-sheet"]?.skillAllocation || {};
        const allocatedEntries = Object.entries(allocatedMap).filter(([_, pts]) => Number(pts) > 0);
        let skillAllocationSummary = "";
        if (hasSkillGrant) {
          if (allocatedEntries.length > 0) {
            skillAllocationSummary = allocatedEntries.map(([k, pts]) => {
              const reg = SKILL_REGISTRY.get(k);
              return `+${pts} ${reg?.name || k}`;
            }).join(", ");
          } else {
            skillAllocationSummary = `${skillGrant.points} unallocated`;
          }
        }
        const norm = normalizeTalentName(item.name);
        const repeatCount = talentCountMap.get(norm) || 1;
        const showRepeatBadge = repeatCount > 1;
        return {
          item,
          isFavorite,
          expanded,
          essenceCost,
          isAttuned,
          isSecondSkin,
          secondSkinArmor,
          parentTalentName,
          parentTalentId,
          isGrantedTalent,
          grantedTalentNames,
          hasTalentGrants,
          hasSkillGrant,
          skillGrant,
          skillAllocationSummary,
          repeatCount,
          showRepeatBadge,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));

      // Group owned talents strictly into followed tracks with progression sorting
      const trackGroups = new Map();
      for (const tObj of context.talents) {
        const item = tObj.item;
        const trackInfo = resolveTalentTrackInfo(item, { customTalentMap, customPackMap });
        const category = trackInfo.category;
        const rootName = trackInfo.rootName;
        const trackName = trackInfo.trackName;
        const isEntry = trackInfo.isEntry;

        let groupKey;
        if (category === "class" || category === "magic") {
          groupKey = rootName.toUpperCase();
        } else if (trackName && trackName.toLowerCase() !== "general" && trackName.toLowerCase() !== rootName.toLowerCase()) {
          groupKey = `${rootName} — ${trackName}`.toUpperCase();
        } else {
          groupKey = rootName.toUpperCase();
        }

        if (!trackGroups.has(groupKey)) {
          trackGroups.set(groupKey, {
            groupKey,
            rootName: rootName.toUpperCase(),
            trackName: trackName.toUpperCase(),
            category,
            talents: [],
          });
        }
        tObj.isEntry = isEntry;
        trackGroups.get(groupKey).talents.push(tObj);
      }

      // Sort talents within each track by progression order (entry first, then tier/number, then alphabetical)
      for (const group of trackGroups.values()) {
        group.talents.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          if (a.isEntry && !b.isEntry) return -1;
          if (!a.isEntry && b.isEntry) return 1;
          return a.item.name.localeCompare(b.item.name, undefined, { numeric: true });
        });
      }

      context.followedTracks = Array.from(trackGroups.values()).sort((a, b) => a.groupKey.localeCompare(b.groupKey));
      context.totalTalentsCount = context.talents.length;
      context.activeTracksCount = context.followedTracks.length;

      // Sort features: Favorites pinned to top, then alphabetical
      context.features.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.item.name.localeCompare(b.item.name);
      });
    }

    if (partId === "effects") {
      const allEffectsMeta = getAllActorEffectsWithMeta(this.actor);
      const enrichEffect = async (metaEntry) => {
        const effect = metaEntry.effect;
        const expanded = this.expandedEffects.has(effect.id);
        const desc = effect.description || effect.flags?.["mythcraft-essence-sheet"]?.description || effect.flags?.mythcraft?.description || "";
        return {
          ...metaEntry,
          effect,
          expanded,
          descriptionHTML: expanded ? await enrichText(desc, { rollData: this.actor.getRollData() }) : "",
        };
      };

      const temporary = [];
      const passive = [];
      const inactive = [];

      for (const metaEntry of allEffectsMeta) {
        const enriched = await enrichEffect(metaEntry);
        if (metaEntry.disabled) inactive.push(enriched);
        else if (metaEntry.isTemporary) temporary.push(enriched);
        else passive.push(enriched);
      }

      context.effects = {
        temporary: { label: "Temporary Effects", effects: temporary },
        passive: { label: "Passive & Item Effects", effects: passive },
        inactive: { label: "Inactive Effects", effects: inactive },
      };
    }

    if (partId === "biography") {
      context.enrichedBiography = await enrichText(this.actor.system?.biography?.value || "", { rollData: this.actor.getRollData() });
      context.enrichedGMNotes = await enrichText(this.actor.system?.biography?.gm || "", { rollData: this.actor.getRollData() });
    }

    if (partId === "journal") {
      const enrichEntries = async (fieldKey, contentKey) => {
        const raw = this.actor.system[fieldKey] ?? {};
        const entries = {};
        for (const [k, v] of Object.entries(raw)) {
          const expanded = this.expandedItems.has(`journal-${k}`);
          entries[k] = {
            ...v,
            expanded,
            enrichedHTML: expanded ? await enrichText(v[contentKey] || "", { rollData: this.actor.getRollData() }) : "",
          };
        }
        return {
          field: this.actor.system.schema?.fields?.[fieldKey]?.element?.fields?.[contentKey],
          entries,
        };
      };

      context.additionalInfo = await enrichEntries("additionalInfo", "description");
      context.journal = await enrichEntries("journal", "content");
      context.contacts = await enrichEntries("contacts", "description");
      context.resources = this.actor.system.resources ?? {};
    }

    if (partId === "stats") {
      this._prepareEssenceAttributes(context);
    }

    return context;
  }

  /** @inheritdoc */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);

    // Safeguard document name so it never causes schema validation errors
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      data.name = this.actor.name || "Character";
    }

    // Preserve existing document img if none is provided
    if (!data.img) {
      data.img = this.actor.img;
    }

    // Clean any array or comma-delimited values in appearance fields
    for (const key of ["system.appearance.height", "system.appearance.weight", "system.appearance.age"]) {
      if (Array.isArray(data[key])) {
        data[key] = (data[key].find(v => v !== "" && v !== null && v !== undefined) || "").toString().replace(/,/g, "").trim();
      } else if (typeof data[key] === "string" && data[key].includes(",")) {
        data[key] = data[key].replace(/,/g, "").trim();
      }
    }

    // Map custom currency inputs to schema keys
    const activeCurrencies = getActiveCurrencies();
    const currCounts = {};
    let hasCurrencyInput = false;
    for (const c of activeCurrencies) {
      if (`system.currency.${c.key}` in data) {
        currCounts[c.key] = Number(data[`system.currency.${c.key}`]) || 0;
        delete data[`system.currency.${c.key}`];
        hasCurrencyInput = true;
      }
    }
    if (hasCurrencyInput) {
      const currUpdates = getActorCurrencyUpdates(currCounts, activeCurrencies);
      Object.assign(data, currUpdates);
    }

    return data;
  }

  /** @inheritdoc */
  async _onDropItem(event, data) {
    if (!this.isEditable) return false;

    // Detect if dropped onto a container row or container drop zone
    const containerEl = event.target?.closest?.("[data-container-id]") || event.target?.closest?.(".container-row, .container-drop-zone");
    const targetContainerId = containerEl?.dataset?.containerId || (containerEl?.classList?.contains("container-row") ? containerEl.dataset.itemId : null);

    const item = await Item.implementation.fromDropData(data);
    if (!item) return super._onDropItem(event, data);

    // If item is already owned by this actor
    if (item.parent?.id === this.actor.id) {
      if (targetContainerId && targetContainerId !== item.id) {
        await moveItemToContainer(item, targetContainerId);
        this.expandedItems.add(`container-${targetContainerId}`);
        this.render(false);
        return [item];
      }
      return super._onDropItem(event, data);
    }

    const costData = parseItemCost(item);
    if (costData && costData.amount > 0) {
      const choice = await ItemAcquisitionDialog.prompt({
        actor: this.actor,
        item,
        costData,
      });

      if (choice === "cancel") return false;
      if (choice === "purchase") {
        const success = await processItemPurchase(this.actor, costData, item);
        if (!success) return false;
      }
    }

    const createdItems = await super._onDropItem(event, data);
    if (targetContainerId && Array.isArray(createdItems) && createdItems.length) {
      for (const ci of createdItems) {
        if (ci && typeof ci.update === "function") {
          await moveItemToContainer(ci, targetContainerId);
        }
      }
      this.expandedItems.add(`container-${targetContainerId}`);
      this.render(false);
    }

    if (Array.isArray(createdItems)) {
      for (const ci of createdItems) {
        if (ci && (ci.type === "talent" || ci.type === "feature")) {
          TalentGrantDialog.processTalentGrantsAndPicks(this.actor, ci).catch(err => {
            console.error("mythcraft-essence-sheet | Error processing talent grants on drop:", err);
          });
        }
      }
    }

    return createdItems;
  }
}

