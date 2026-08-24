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
  getWeaponDamageData,
  getTwoHandedBaseFormula,
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
} from "../features/equipment-automation.mjs";
import { getSetting } from "../settings.mjs";
import { findTagDefinition } from "../data/tags-library.mjs";
import { renderDefenseTargetBadgeHTML, getDefenseTargetConfig } from "../data/defense-config.mjs";
import {
  isItemContainer,
  moveItemToContainer,
  removeItemFromContainer,
} from "../features/container-utils.mjs";


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
  const rawTags = item.system?.tags ?? item.system?.tagList ?? item.system?.properties ?? [];
  let tagNames = [];
  if (Array.isArray(rawTags)) {
    tagNames = rawTags;
  } else if (rawTags instanceof Set) {
    tagNames = Array.from(rawTags);
  } else if (typeof rawTags === "object" && rawTags !== null) {
    tagNames = Object.values(rawTags);
  } else if (typeof rawTags === "string" && rawTags.trim()) {
    tagNames = rawTags.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
  }

  if (item.system?.aptitude) {
    tagNames.push(item.system.aptitude);
  }
  if (item.system?.magicType) {
    tagNames.push(item.system.magicType);
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
export async function rollItemDamage(actor, item, { isCrit = false, rollMode = null } = {}) {
  if (!actor || !item) return;

  const rollData = actor.getRollData();
  const isWeapon = item.type === "weapon";
  const isSpell = item.type === "spell";

  let weaponData = null;
  if (isWeapon) {
    weaponData = getWeaponDamageData(actor, item);
  }

  // 1. Collect raw damage definitions
  let damages = [];
  if (isWeapon && weaponData) {
    const defaultType = (Array.isArray(item.system?.damage) && item.system.damage[0]?.type) || item.system?.damageType || "sharp";
    damages = [{ formula: weaponData.baseFormula, type: defaultType }];
    if (Array.isArray(item.system?.damage) && item.system.damage.length > 1) {
      for (let i = 1; i < item.system.damage.length; i++) {
        if (item.system.damage[i]?.formula) damages.push(item.system.damage[i]);
      }
    }
  } else if (Array.isArray(item.system?.damage) && item.system.damage.length > 0) {
    damages = item.system.damage.filter(d => d && d.formula);
  } else if (item.system?.damageFormula) {
    damages = [{ formula: item.system.damageFormula, type: item.system.damageType || "sharp" }];
  }

  if (!damages.length) {
    ui.notifications.warn(`No damage formula found on ${item.name}.`);
    return;
  }

  // 2. Attribute modifier (weapons)
  const autoAttrMod = getSetting("weaponDamageAttrModifier", true);
  let attrMod = 0;
  let attrModLabel = "";
  let rawAttr = (item.system?.attr || "").toLowerCase().trim();
  if (rawAttr.startsWith("my")) rawAttr = rawAttr.replace(/^mythcraft\.attributes\./i, "");
  const validAttrs = new Set(["str", "dex", "end", "awr", "int", "cha", "luck", "cor"]);

  if (autoAttrMod && isWeapon && validAttrs.has(rawAttr)) {
    attrMod = Number(actor.system?.attributes?.[rawAttr] ?? 0);
    if (attrMod !== 0) {
      attrModLabel = `${attrMod > 0 ? "+" : ""}${attrMod} ${rawAttr.toUpperCase()}`;
    }
  }

  // 3. Affinity bonus (+3)
  const hasItemAffinity = item.system?.hasAffinity === true || 
                          item.flags?.["mythcraft-essence-sheet"]?.hasAffinity === true ||
                          item.system?.affinity === true;
  const affinityBonus = hasItemAffinity ? 3 : 0;

  // 4. Luck score (added on crits for weapons & spells)
  const luckScore = Number(actor.system?.attributes?.luck ?? 0);

  // 5. Evaluate rolls per damage entry
  const RollClass = mythcraft?.rolls?.DamageRoll || Roll;
  const rolls = [];

  for (let index = 0; index < damages.length; index++) {
    const d = damages[index];
    const dmgType = d.type || "sharp";
    const baseFormula = d.formula.trim();

    const currentAttrMod = (index === 0) ? attrMod : 0;
    const currentAffinity = (index === 0) ? affinityBonus : 0;

    let finalFormula = baseFormula;

    if (isCrit) {
      if (!isSpell) {
        // Weapon, Action & Feature Attack Crit Rule:
        // 1. Maximize normal damage (dice max + modifiers)
        // 2. Roll damage dice a second time
        // 3. Add LUCK score
        let diceMax = 0;
        let extraDiceFormula = "";

        try {
          const tempRoll = new Roll(baseFormula, rollData);
          for (const term of tempRoll.terms) {
            if (term.faces && term.number) {
              diceMax += term.number * term.faces;
              extraDiceFormula += (extraDiceFormula ? " + " : "") + `${term.number}d${term.faces}`;
            } else if (typeof term.total === "number") {
              diceMax += term.total;
            } else if (typeof term.number === "number" && !term.faces) {
              diceMax += term.number;
            }
          }
        } catch (e) {
          diceMax = 0;
        }

        if (!extraDiceFormula) extraDiceFormula = baseFormula;
        const maxNormalDamage = diceMax + currentAttrMod + currentAffinity;
        const luckBonus = (index === 0) ? luckScore : 0;

        finalFormula = `${maxNormalDamage} + ${extraDiceFormula}${luckBonus ? ` + ${luckBonus}` : ""}`;
      } else {
        // Spell Crit Rule: Add LUCK to damage
        const luckBonus = (index === 0) ? luckScore : 0;
        finalFormula = `${baseFormula}${luckBonus ? ` + ${luckBonus}` : ""}`;
      }
    } else {
      // Normal damage
      if (currentAttrMod !== 0) {
        finalFormula = `${finalFormula} + ${currentAttrMod}`;
      }
      if (currentAffinity !== 0) {
        finalFormula = `${finalFormula} + ${currentAffinity}`;
      }
    }

    const r = new RollClass(finalFormula, rollData, {
      type: dmgType,
      hasAffinity: hasItemAffinity,
      attrMod: currentAttrMod,
      isCrit,
    });
    await r.evaluate();
    rolls.push(r);
  }

  // 6. Build Chat Message
  const flavorPrefix = isCrit ? `💥 CRITICAL HIT: ${item.name}` : `${item.name}`;
  const notes = [];
  if (isCrit) notes.push("Critical Damage");
  if (isWeapon && weaponData?.isTwoHandedGrip) notes.push("2H Grip");
  if (attrModLabel) notes.push(attrModLabel);
  if (hasItemAffinity) notes.push("+3 Affinity");
  if (isCrit && luckScore) notes.push(`+${luckScore} LUCK`);
  const flavorSuffix = notes.length ? ` (Includes ${notes.join(", ")})` : "";

  const defaultMode = game.settings.settings.has("core.messageMode") 
    ? game.settings.get("core", "messageMode") 
    : game.settings.get("core", "rollMode");
  const activeRollMode = rollMode || defaultMode || "publicroll";

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
        isCrit,
        isDamage: true,
      },
    },
  };

  ChatMessage.applyRollMode(messageData, activeRollMode);
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
export async function rollSpellItem(actor, item, { rollMode = null } = {}) {
  if (!actor || !item || item.type !== "spell") return;

  const apc = Number(item.system?.apc ?? item.system?.ap ?? 0);
  if (apc > 0) {
    const allowed = await checkAndEnforceAp(actor, apc, item.name);
    if (!allowed) return;
  }

  const spellcastingAbility = actor.getFlag?.("mythcraft-essence-sheet", "magicAttribute") 
    || actor.system?.sp?.attribute 
    || "int";
  let abilityMod = Number(actor.system?.attributes?.[spellcastingAbility]?.value ?? actor.system?.attributes?.[spellcastingAbility] ?? 0);

  const powerLevels = actor.system?.powerLevel ?? {};
  const primarySource = Object.entries(powerLevels)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  const isPrimary = primarySource ? (item.system?.magicSource === primarySource) : true;
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
  const defenseTarget = item.system?.defenseTarget || item.system?.defense || "";
  const roll = new SpellRollClass(formula, actor.getRollData(), {
    spellName: item.name,
    source: item.system?.magicSource,
    isPrimary,
    critHit,
    flavor: `${item.name} - Spell Roll`,
    spc: item.system?.spc,
    range: item.system?.rangeLabel,
    duration: item.system?.durationLabel,
  });

  if (typeof roll.evaluate === "function" && !roll._evaluated) {
    await roll.evaluate();
  }

  const d20Term = roll.terms?.find(t => t.faces === 20);
  const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? roll.dice?.[0]?.total;
  const isCrit = typeof d20Result === "number" && d20Result >= critHit;
  const isFumble = typeof d20Result === "number" && d20Result <= critFail;

  const defBadgeHTML = defenseTarget ? renderDefenseTargetBadgeHTML(defenseTarget) : "";
  const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
  const resultLabel = isCrit ? "CRITICAL SUCCESS" : (isFumble ? "CRITICAL FAILURE" : "SPELL ROLL");

  const content = `
    <div class="mythcraft-statblock spell-card">
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
      </div>
    </div>
  `;

  const defaultMode = game.settings.settings.has("core.messageMode") 
    ? game.settings.get("core", "messageMode") 
    : game.settings.get("core", "rollMode");
  const activeRollMode = rollMode || defaultMode || "publicroll";

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
        isSpell: true,
        critHit,
        isCrit,
        isFumble,
      },
    },
  };

  ChatMessage.applyRollMode(msgData, activeRollMode);

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
  const critBonus = Number(actor.flags?.["mythcraft-essence-sheet"]?.critBonus ?? actor.flags?.["mythcraft"]?.critBonus ?? 0);
  return Math.max(16, baseHit - luckBonus - critBonus);
}

/**
 * Calculates effective critical failure threshold based on actor settings (default 1).
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorCritFail(actor) {
  if (!actor) return 1;
  return Number(actor.system?.critical?.fail ?? 1);
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

  /**
   * Strip GM-only fields for non-GM players to prevent Foundry sanitization errors.
   * @override
   */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    if (!game.user?.isGM) {
      sanitizeGmOnlyFields(data);
    }
    return data;
  };

  static DEFAULT_OPTIONS = {
    classes: ["mythcraft", "actor", "sheet", "essence-sheet"],
    position: { width: 920, height: 890 },
    actions: {
      editDamageMod: this.#editDamageMod,
      editMovement: this.#editMovement,
      editSenses: this.#editSenses,
      editConditions: this.#editConditions,
      openWalletDialog: this.#openWalletDialog,
      openLevelUpDialog: this.#openLevelUpDialog,
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
      editImage: this._onEditImage,
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
      toggleJournalCard: this.#toggleJournalCard,
      addAdditionalInfo: this.#addAdditionalInfo,
      addJournalEntry: this.#addJournalEntry,
      addContact: this.#addContact,
      addResource: this.#addResource,
      openTalentTreeViewer: this.#openTalentTreeViewer,
      openCharacterCreationWizard: this.#openCharacterCreationWizard,
    },
  };

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

    let doc = null;
    if (docClass === "ActiveEffect" || effectId) {
      doc = this.actor.effects.get(effectId || itemId);
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

    const apc = getSafeWeaponApc(item, this.actor);
    const allowed = await checkAndEnforceAp(this.actor, apc, item.name);
    if (!allowed) return;

    const attr = item.system?.attr || "str";
    const attrValue = Number(this.actor.system?.attributes?.[attr] ?? 0);
    const critHit = getActorCritHit(this.actor);
    const critFail = Number(this.actor.system?.critical?.effectiveFail ?? this.actor.system?.critical?.fail ?? 1);
    const modifier = Number(item.system?.attackModifierValue ?? item.system?.attackModifier ?? 0);
    const luck = Number(this.actor.system?.attributes?.luck?.value ?? this.actor.system?.attributes?.luck ?? 0);

    // MythCraft Rule: If LUCK < 0, subtract LUCK from every d20 roll
    let formula = `1d20 + ${attrValue + modifier}`;
    if (luck < 0) {
      formula = `${formula} - ${Math.abs(luck)}`;
    }

    const AttackRollClass = mythcraft.rolls?.AttackRoll || Roll;
    const roll = new AttackRollClass(formula, this.actor.getRollData(), {
      weaponName: item.name,
      weaponAttr: attr,
      flavor: `${item.name} - Attack Roll`,
      defenseTarget: item.system?.defenseTarget || "ar",
      critHit,
      critFail,
      damage: item.system?.damage || [],
    });

    if (typeof roll.evaluate === "function" && !roll._evaluated) {
      await roll.evaluate();
    }

    const d20Term = roll.terms?.find(t => t.faces === 20);
    const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? roll.dice?.[0]?.total;
    const isCrit = typeof d20Result === "number" && d20Result >= critHit;
    const isFumble = typeof d20Result === "number" && d20Result <= critFail;

    const defenseTarget = item.system?.defenseTarget || item.system?.defense || "ar";
    const defBadgeHTML = renderDefenseTargetBadgeHTML(defenseTarget);
    const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
    const resultLabel = isCrit ? "CRITICAL HIT" : (isFumble ? "CRITICAL FAILURE" : "ATTACK ROLL");

    // Standardized MythCraft Statblock Attack Card Layout (Matches MythCraft HUD & Sheet Design)
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
        </div>
      </div>
    `;

    const msgData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
          critHit,
          isCrit,
          isFumble,
        },
      },
    };

    if (CONST.CHAT_MESSAGE_STYLES) {
      msgData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
    }

    return await ChatMessage.create(msgData);
  }


  static async #rollSpell(event, target) {
    event.stopPropagation();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "spell") return;
    return await rollSpellItem(this.actor, item);
  }


  /**
   * Edit image using native Foundry DocumentSheet handler (compatible with Tokenizer and image picker modules).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditImage(event, target) {
    if (!this.isEditable) return;
    const parentFn = super._onEditImage 
      || Object.getPrototypeOf(EssenceCharacterSheet)?._onEditImage
      || foundry.applications?.sheets?.ActorSheetV2?._onEditImage
      || foundry.applications?.sheets?.DocumentSheetV2?._onEditImage;
    if (typeof parentFn === "function" && parentFn !== EssenceCharacterSheet._onEditImage) {
      return parentFn.call(this, event, target);
    }
    const attr = target?.dataset?.edit || "img";
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } = this.document.constructor?.getDefaultArtwork?.(this.document.toObject()) ?? {};
    const fp = new FilePicker({
      type: "image",
      current,
      redirectToRoot: img ? [img] : [],
      callback: path => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Instance method for image editing.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  async _onEditImage(event, target) {
    if (!this.isEditable) return;
    const parentFn = super._onEditImage 
      || Object.getPrototypeOf(this)?._onEditImage
      || foundry.applications?.sheets?.ActorSheetV2?.prototype?._onEditImage
      || foundry.applications?.sheets?.DocumentSheetV2?.prototype?._onEditImage;
    if (typeof parentFn === "function") {
      return parentFn.call(this, event, target);
    }
    return this.constructor._onEditImage.call(this, event, target);
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

  static async #openTalentTreeViewer(event, target) {
    event?.preventDefault?.();
    new TalentTreeViewer(this.actor).render(true);
  }

  static async #openCharacterCreationWizard(event, target) {
    event?.preventDefault?.();
    new CharacterCreationWizard(this.actor).render(true);
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

    // Recalculate and persist effective defenses to the actor document
    applyEffectiveArmorAndDefenses(this.actor);
    await this.actor.update({
      "system.defenses.ar": this.actor.system.defenses.ar,
      "system.defenses.ref": this.actor.system.defenses.ref,
      "system.defenses.fort": this.actor.system.defenses.fort,
      "system.defenses.ant": this.actor.system.defenses.ant,
      "system.defenses.log": this.actor.system.defenses.log,
      "system.defenses.will": this.actor.system.defenses.will,
    });

    const stateLabel = newDonState ? "Donned" : "Doffed";
    ui.notifications.info(`${item.name} is now ${stateLabel}. (AR: ${this.actor.system.defenses.ar})`);
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

    // Recalculate and persist effective defenses to the actor document
    applyEffectiveArmorAndDefenses(this.actor);
    await this.actor.update({
      "system.defenses.ar": this.actor.system.defenses.ar,
      "system.defenses.ref": this.actor.system.defenses.ref,
      "system.defenses.fort": this.actor.system.defenses.fort,
      "system.defenses.ant": this.actor.system.defenses.ant,
      "system.defenses.log": this.actor.system.defenses.log,
      "system.defenses.will": this.actor.system.defenses.will,
    });

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

  static async #openLevelUpDialog(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    new LevelUpDialog(this.actor).render(true);
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

    const sys = item.system || {};
    const magicSource = sys.magicSource ? (sys.magicSource.charAt(0).toUpperCase() + sys.magicSource.slice(1)) : "";
    const description = await enrichText(sys.description?.value || sys.description || "", { 
      rollData: this.actor.getRollData(), 
    });

    // Collect enriched tags with interactive tooltips
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
    if (magicSource) details.push(`<strong>Source:</strong> ${magicSource}`);
    if (sys.apc !== undefined && sys.apc !== null) details.push(`<strong>APC:</strong> ${sys.apc}`);
    if (sys.spc !== undefined && sys.spc !== null) details.push(`<strong>SPC:</strong> ${sys.spc}`);
    if (sys.rangeLabel || (sys.range?.value)) details.push(`<strong>Range:</strong> ${sys.rangeLabel || `${sys.range.value} ${sys.range.unit || "ft"}`}`);
    if (sys.durationLabel || (sys.duration?.value)) details.push(`<strong>Duration:</strong> ${sys.durationLabel || `${sys.duration.value} ${sys.duration.unit || ""}`}`);
    if (sys.castingTime) details.push(`<strong>Casting Time:</strong> ${sys.castingTime}`);
    if (sys.recharge) details.push(`<strong>Recharge:</strong> ${sys.recharge}`);

    const detailsHTML = details.length 
      ? `<div class="spell-chat-details" style="display:flex; flex-wrap:wrap; gap:6px 14px; margin:6px 0 8px; font-size:11px; color:#cbd5e1; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">
          ${details.map(d => `<span>${d}</span>`).join("")}
         </div>` 
      : "";

    const content = `
      <div class="mythcraft chat-card spell-card essence-spell-chat-card">
        <header class="card-header" style="display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(241,196,15,0.3); padding-bottom:6px; margin-bottom:6px;">
          <img src="${item.img}" alt="${item.name}" style="width:32px; height:32px; border-radius:4px; border:1px solid rgba(241,196,15,0.4); object-fit:cover;" />
          <div>
            <h3 style="margin:0; font-size:14px; font-family:'Cinzel', serif; font-weight:700; color:#f1c40f; text-shadow:0 0 4px rgba(241,196,15,0.3);">${item.name}</h3>
            ${magicSource ? `<span style="font-size:10px; color:#58b2c0; font-weight:600; text-transform:uppercase;">${magicSource} Spell</span>` : ""}
          </div>
        </header>
        ${tagsHTML}
        ${detailsHTML}
        <div class="card-description" style="font-size:12px; line-height:1.45; color:#f1f5f9; margin-top:6px;">
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

    let effect = this.actor.effects.get(effectId);
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
  #hasPromptedCreation = false;

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Prompt Character Creation Wizard for Level 0 characters
    if (!this.#hasPromptedCreation && Number(this.actor.system?.level ?? 0) === 0 && this.isEditable) {
      this.#hasPromptedCreation = true;
      CharacterCreationWizard.promptStartup(this.actor, this);
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

    // Max HP manual input listener (ensures true manual Max HP persists)
    const maxHpInput = this.element.querySelector("input[name='system.hp.max']");
    if (maxHpInput) {
      maxHpInput.addEventListener("change", async (event) => {
        const val = Math.max(0, parseInt(event.target.value, 10) || 0);
        await this.actor.update({
          "system.hp.max": val,
          "flags.mythcraft-essence-sheet.maxHp": val,
        });
      });
    }

    // Direct attribute score change listener for standard, Sanity, and custom attributes
    const attrInputs = this.element.querySelectorAll(".attr-num-input");
    attrInputs.forEach(input => {
      input.addEventListener("change", async (event) => {
        const name = event.target.name;
        const val = parseInt(event.target.value, 10);
        if (!isNaN(val) && name) {
          await this.actor.update({ [name]: val });
        }
      });
    });

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
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    for (const key of Object.keys(data)) {
      if (key.startsWith("_conditions-")) delete data[key];
      // Prevent empty or invalid img from being passed to document update
      if (key === "img" && (!data[key] || typeof data[key] !== "string" || !data[key].trim())) {
        delete data[key];
      }
    }
    return data;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Context preparation — call super to get all the system's prepared data,
   *  then augment with Essence-specific additions.
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  _prepareSubmitData(event, form, formData) {
    const submitData = super._prepareSubmitData ? super._prepareSubmitData(event, form, formData) : (formData?.object ?? {});

    // If user edited system.hp.max in the form, ensure flags.mythcraft-essence-sheet.maxHp matches
    if (submitData["system.hp.max"] !== undefined && submitData["system.hp.max"] !== null) {
      submitData["flags.mythcraft-essence-sheet.maxHp"] = Number(submitData["system.hp.max"]);
    }

    return submitData;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
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
      {
        type: "profession",
        label: "Profession",
        item: this.actor.itemTypes.profession?.[0] ?? null,
      },
    ];

    // Resource percentages for HUD meters
    const hp = this.actor.system.hp;
    context.hpPct = hp.max > 0 ? Math.round(Math.min(100, Math.max(0, (hp.value / hp.max) * 100))) : 0;

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
    const baseFail = Number(this.actor.system?.critical?.fail ?? 1);
    context.critFail = Math.max(1, baseFail);

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

    const getSkillsForAttr = (attrKey) => {
      const list = [];
      for (const [id, cfg] of Object.entries(skillConfig)) {
        if (cfg.attribute === attrKey && id in allSkills) {
          const sData = allSkills[id];
          let rawLabel = id;
          if (cfg.specialized) {
            rawLabel = game.i18n.format(cfg.specialized, sData);
          } else if (cfg.label) {
            const loc = game.i18n.localize(cfg.label);
            rawLabel = loc && !loc.startsWith("MYTHCRAFT.") ? loc : (cfg.label || id);
          }
          list.push({
            id,
            label: rawLabel || id,
            bonus: sData.bonus ?? 0,
            bonusDisplay: formatBonus(sData.bonus ?? 0),
          });
        }
      }
      return list;
    };

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
        defense: { key: "ref", label: "REF", name: "Reflexes", value: defenses.ref ?? 10 },
        skills: getSkillsForAttr("dex"),
      },
      {
        key: "end",
        label: "END",
        name: "Endurance",
        value: attrs.end ?? 0,
        bonusDisplay: formatBonus(attrs.end ?? 0),
        defense: { key: "fort", label: "FORT", name: "Fortitude", value: defenses.fort ?? 10 },
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
        defense: { key: "ant", label: "ANT", name: "Anticipation", value: defenses.ant ?? 10 },
        skills: getSkillsForAttr("awr"),
      },
      {
        key: "int",
        label: "INT",
        name: "Intellect",
        value: attrs.int ?? 0,
        bonusDisplay: formatBonus(attrs.int ?? 0),
        defense: { key: "log", label: "LOG", name: "Logic", value: defenses.log ?? 10 },
        skills: getSkillsForAttr("int"),
      },
      {
        key: "cha",
        label: "CHA",
        name: "Charisma",
        value: attrs.cha ?? 0,
        bonusDisplay: formatBonus(attrs.cha ?? 0),
        defense: { key: "will", label: "WILL", name: "Willpower", value: defenses.will ?? 10 },
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
      const sources = mythcraft.CONFIG?.spells?.sources || {
        arcane: { label: "Arcane" },
        divine: { label: "Divine" },
        occult: { label: "Occult" },
        primal: { label: "Primal" },
        psionic: { label: "Psionic" },
      };
      const powerLevels = this.actor.system?.powerLevel || {};
      const spellItems = this.actor.itemTypes.spell || [];

      // Count known spells per magic source
      const sourceCounts = {};
      for (const spell of spellItems) {
        const raw = typeof spell.system?.magicSource === "string" ? spell.system.magicSource : "";
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

      context.magicAttribute = this.actor.getFlag?.("mythcraft-essence-sheet", "magicAttribute") || this.actor.system?.sp?.attribute || "int";

      // Group/Sort spells by magic type (Arcane, Divine, Occult, Primal, Psionic) and then alphabetically
      const SOURCE_ORDER = {
        arcane: 1,
        divine: 2,
        occult: 3,
        primal: 4,
        psionic: 5,
      };

      const sortedSpells = [...spellItems].sort((a, b) => {
        const srcA = cleanSourceKey(typeof a.system?.magicSource === "string" ? a.system.magicSource : "");
        const srcB = cleanSourceKey(typeof b.system?.magicSource === "string" ? b.system.magicSource : "");
        const orderA = SOURCE_ORDER[srcA] ?? 99;
        const orderB = SOURCE_ORDER[srcB] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });

      // Filter spells if any magic source filters are active
      const filteredSpells = (this.activeMagicFilters.size > 0)
        ? sortedSpells.filter(item => {
            const raw = typeof item.system?.magicSource === "string" ? item.system.magicSource : "";
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
        const rawSource = typeof item.system?.magicSource === "string" ? item.system.magicSource : "";
        const sourceKey = cleanSourceKey(rawSource);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";

        // Extract raw tags from Set, Array, or Object
        let rawTags = [];
        if (item.system?.tags) {
          if (item.system.tags instanceof Set) {
            rawTags = Array.from(item.system.tags);
          } else if (Array.isArray(item.system.tags)) {
            rawTags = item.system.tags;
          } else if (typeof item.system.tags === "object") {
            rawTags = Object.values(item.system.tags);
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

        return {
          item,
          expanded,
          magicSourceKey: sourceKey,
          magicSourceLabel: cleanSourceLabel(rawSource),
          inlineTags,
          allTags,
          tags,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));
    }

    if (partId === "equipment") {
      // 1. Calculate Essence Data (Full by default, decreases as attuned essence is spent on items)
      const maxEssence = 100;
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

        // Attack modifier (only if weapon has an attribute assigned or defense target or attack modifier)
        let rawAttr = (item.system?.attr || "").toLowerCase().trim();
        if (rawAttr.startsWith("my")) rawAttr = rawAttr.replace(/^mythcraft\.attributes\./i, "");
        const validAttrs = new Set(["str", "dex", "end", "awr", "int", "cha", "luck", "cor"]);
        const hasAttackAttr = validAttrs.has(rawAttr);
        const rawDefense = (item.system?.defense || item.system?.defenseTarget || item.system?.targetDefense || "").trim();
        const hasDefenseTarget = Boolean(rawDefense);
        const itemAtkMod = Number(item.system?.attackModifierValue ?? item.system?.attackModifier ?? 0);

        const hasAttackRoll = hasAttackAttr || hasDefenseTarget || itemAtkMod !== 0;

        const attrVal = hasAttackAttr ? Number(this.actor.system?.attributes?.[rawAttr] ?? 0) : 0;
        
        let atkBonusDisplay = "";
        if (hasAttackRoll) {
          const totalAtk = attrVal + itemAtkMod;
          atkBonusDisplay = totalAtk >= 0 ? `+${totalAtk}` : `${totalAtk}`;
        }

        // Damage formula & type (with attribute modifier & affinity check)
        const weaponData = getWeaponDamageData(this.actor, item);
        const damages = (item.system?.damage ?? []).filter(d => d.formula);
        const damageParts = damages.map((d, idx) => {
          const dmgType = String(d.type || "sharp").trim();
          let formulaDisplay = (idx === 0) ? weaponData.baseFormula : d.formula;
          if (idx === 0 && weaponData.attrMod !== 0) {
            formulaDisplay = `${formulaDisplay} ${weaponData.attrMod > 0 ? "+" : "-"} ${Math.abs(weaponData.attrMod)}`;
          }
          if (weaponData.affinityBonus !== 0) {
            formulaDisplay = `${formulaDisplay} + 3`;
          }
          const typeLabel = dmgType.charAt(0).toUpperCase() + dmgType.slice(1);
          return `${formulaDisplay} ${typeLabel}`;
        });
        const damageDisplay = damageParts.length ? damageParts.join(" + ") : `${weaponData.effectiveFormula} Sharp`;

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
        const isEquipped = requiresEquip ? isWeaponEquipped(item) : Boolean(item.system?.equipped);
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
      context.talents = await Promise.all((this.actor.itemTypes.talent || []).map(async (item) => {
        const isFavorite = isItemFavorite(item);
        const expanded = this.collapsedItems.has(item.id)
          ? false
          : (this.expandedItems.has(item.id) || isFavorite);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const essenceCost = Number(item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? item.system?.essenceCost ?? 0);
        const isAttuned = item.flags?.["mythcraft-essence-sheet"]?.isAttuned ?? true;
        return {
          item,
          isFavorite,
          expanded,
          essenceCost,
          isAttuned,
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
        return {
          item,
          isFavorite,
          expanded,
          essenceCost,
          isAttuned,
          descriptionHTML: expanded ? await enrichText(descVal, { rollData: this.actor.getRollData() }) : "",
        };
      }));

      // Sort talents: Favorites pinned to top, then alphabetical
      context.talents.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.item.name.localeCompare(b.item.name);
      });

      // Sort features: Favorites pinned to top, then alphabetical
      context.features.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.item.name.localeCompare(b.item.name);
      });
    }

    if (partId === "effects") {
      const allEffects = Array.from(this.actor.effects || []);
      const enrichEffect = async (effect) => {
        const expanded = this.expandedEffects.has(effect.id);
        const desc = effect.description || effect.flags?.mythcraft?.description || "";
        return {
          effect,
          expanded,
          descriptionHTML: expanded ? await enrichText(desc, { rollData: this.actor.getRollData() }) : "",
        };
      };

      const temporary = [];
      const passive = [];
      const inactive = [];

      for (const effect of allEffects) {
        const enriched = await enrichEffect(effect);
        if (effect.disabled) inactive.push(enriched);
        else if (effect.isTemporary) temporary.push(enriched);
        else passive.push(enriched);
      }

      context.effects = {
        temporary: { label: "Temporary Effects", effects: temporary },
        passive: { label: "Passive Effects", effects: passive },
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
    return createdItems;
  }
}

