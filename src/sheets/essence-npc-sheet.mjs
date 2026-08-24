/**
 * mythcraft-essence-sheet | src/sheets/essence-npc-sheet.mjs
 *
 * Multi-tabbed, modern Essence Sheet for MythCraft NPCs.
 * Features dedicated tabs for Stats, Actions & Combat (with Action Economy rules),
 * Features & Traits, Spells, Effects, and Biography.
 */

import NPCSheet from "/systems/mythcraft/module/applications/sheets/npc-sheet.mjs";
import DamageModificationDialog from "../apps/damage-modification-dialog.mjs";
import MovementDialog from "../apps/movement-dialog.mjs";
import SensesDialog from "../apps/senses-dialog.mjs";
import ConditionsDialog from "../apps/conditions-dialog.mjs";
import TagsManagementDialog from "../apps/tags-dialog.mjs";
import ActorTagsAssignmentDialog from "../apps/actor-tags-dialog.mjs";

import { findTagDefinition, formatTagTitle } from "../data/tags-library.mjs";
import { enrichText, getEnrichedItemTags, rollItemDamage, rollSpellItem, getActorCritHit, getActorCritFail } from "./essence-character-sheet.mjs";
import { getDefenseTargetConfig, renderDefenseTargetBadgeHTML } from "../data/defense-config.mjs";



const MODULE_PATH = (p) => `modules/mythcraft-essence-sheet/templates/essence/${p}`;



export default class EssenceNPCSheet extends NPCSheet {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["mythcraft", "actor", "sheet", "essence-sheet", "essence-npc-sheet"],
    position: {
      width: 780,
      height: 740,
    },
    actions: {
      rollAttribute: this.#rollAttribute,
      editAttribute: this.#editAttribute,
      rollSkill: this.#rollSkill,
      rollInitiative: this.#rollInitiative,
      rollAttack: this.#rollAttack,
      rollDamage: this.#rollDamage,
      rollSpell: this.#rollSpell,
      rollFeature: this.#rollFeature,
      postItemToChat: this.#postItemToChat,
      postSpellToChat: this.#postSpellToChat,
      createTierAction: this.#createTierAction,
      createReaction: this.#createReaction,
      createPassiveFeature: this.#createPassiveFeature,
      createSpell: this.#createSpell,
      createDoc: this.#createDoc,
      createEffect: this.#createEffect,
      toggleEffect: this.#toggleEffect,
      editEffect: this.#editEffect,
      viewDoc: this.#viewDoc,
      deleteDoc: this.#deleteDoc,
      toggleItemEmbed: this.#toggleItemEmbed,
      toggleEffectEmbed: this.#toggleEffectEmbed,
      editDamageMod: this.#editDamageMod,
      editMovement: this.#editMovement,
      editSenses: this.#editSenses,
      editConditions: this.#editConditions,
      editTags: this.#editTags,
      removeTag: this.#removeTag,
      filterMagicSource: this.#filterMagicSource,
      editImage: "_onEditImage",
    },
  };

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "stats", label: "Stats", icon: "fas fa-shield-alt" },
        { id: "actions", label: "Actions", icon: "fas fa-fist-raised" },
        { id: "spells", label: "Spells", icon: "fas fa-wand-magic-sparkles" },
        { id: "effects", label: "Effects", icon: "fas fa-bolt" },
        { id: "biography", label: "Biography", icon: "fas fa-book-open" },
      ],
      initial: "stats",
    },
  };

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: MODULE_PATH("npc/header.hbs"),
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    stats: {
      template: MODULE_PATH("npc/stats.hbs"),
      scrollable: [""],
    },
    actions: {
      template: MODULE_PATH("npc/actions.hbs"),
      scrollable: [""],
    },
    spells: {
      template: MODULE_PATH("npc/spells.hbs"),
      scrollable: [""],
    },
    effects: {
      template: MODULE_PATH("npc/effects.hbs"),
      scrollable: [""],
    },
    biography: {
      template: MODULE_PATH("npc/biography.hbs"),
      scrollable: [""],
    },
  };


  /** Expanded state tracking */
  expandedItems = new Set();
  expandedEffects = new Set();
  activeSourceFilter = "all";

  /**
   * Cache of previous meter values to smoothly animate meter bar width shrinking and growing
   * @type {Map<string, string>}
   */
  #meterValues = new Map();

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static async #confirmDeletion(title, message) {
    if (foundry.applications?.api?.DialogV2?.confirm) {
      return await foundry.applications.api.DialogV2.confirm({
        window: { title },
        content: `<p style="margin-bottom: 8px; font-size: 13px;">${message}</p><p style="font-size: 11px; opacity: 0.7;">This action cannot be undone.</p>`,
        yes: { label: "Delete", icon: "fas fa-trash", callback: () => true },
        no: { label: "Cancel", icon: "fas fa-times", callback: () => false },
        defaultYes: false,
        modal: true,
      });
    }
    return true;
  }

  /**
   * Edit image using native Foundry DocumentSheet handler (compatible with Tokenizer and image picker modules).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  async _onEditImage(event, target) {
    if (!this.isEditable) return;
    if (typeof super._onEditImage === "function") {
      return super._onEditImage(event, target);
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

  static async #rollAttribute(event, target) {
    const attribute = target.dataset.attribute;
    if (attribute) this.actor.rollAttribute(attribute);
  }

  static #editAttribute(event, target) {
    const attribute = target.dataset.attribute;
    if (attribute && this.actor.editAttribute) this.actor.editAttribute(attribute);
  }

  static async #rollSkill(event, target) {
    const skill = target.dataset.skill;
    if (skill) this.actor.rollSkill(skill);
  }

  static async #rollInitiative(event, target) {
    await this.actor.rollInitiative({ createCombatants: true });
  }

  static async #rollAttack(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Direct MythCraft NPC Attack Check Evaluation
    const attackBonus = Number(item.system?.attackBonus ?? item.system?.toHit ?? item.system?.attackModifier ?? 0);
    const defenseTarget = (item.system?.defense || item.system?.defenseTarget || "ar").toLowerCase();
    const formula = attackBonus !== 0 ? (attackBonus > 0 ? `1d20 + ${attackBonus}` : `1d20 - ${Math.abs(attackBonus)}`) : "1d20";

    const critHit = getActorCritHit(this.actor);
    const critFail = getActorCritFail(this.actor);

    const AttackRollClass = globalThis.mythcraft?.rolls?.AttackRoll || Roll;
    const roll = new AttackRollClass(formula, this.actor.getRollData(), {
      weaponName: item.name,
      flavor: `${item.name} - Attack Roll (vs ${defenseTarget.toUpperCase()})`,
      defenseTarget,
      critHit,
      critFail,
    });

    if (typeof roll.evaluate === "function" && !roll._evaluated) {
      await roll.evaluate();
    }

    const d20Term = roll.terms?.find(t => t.faces === 20);
    const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? roll.dice?.[0]?.total;
    const isCrit = typeof d20Result === "number" && d20Result >= critHit;
    const isFumble = typeof d20Result === "number" && d20Result <= critFail;

    const defBadgeHTML = renderDefenseTargetBadgeHTML(defenseTarget);
    const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
    const resultLabel = isCrit ? "CRITICAL HIT" : (isFumble ? "CRITICAL FAILURE" : "ATTACK ROLL");

    // Standardized MythCraft Statblock Attack Card Layout (Matches MythCraft HUD & Character Sheet Design)
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
      content,
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

    return await ChatMessage.create(msgData);
  }

  static async #rollDamage(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const isCrit = event?.shiftKey || target.dataset?.isCrit === "true";
    return await rollItemDamage(this.actor, item, { isCrit });
  }



  static async #rollSpell(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    return await rollSpellItem(this.actor, item);
  }

  static async #rollFeature(event, target) {
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    if (typeof item.roll === "function") {
      return await item.roll();
    }
  }

  static async #postItemToChat(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    if (!itemId) return;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const desc = item.system?.description?.value ?? item.system?.description ?? "";
    const enriched = await enrichText(desc, { rollData: this.actor.getRollData() });
    const content = `
      <div class="mythcraft chat-card essence-chat-card">
        <header class="card-header flexrow">
          <img src="${item.img}" title="${item.name}" width="36" height="36" style="border-radius: 4px; border: 1px solid #3a7a7f; margin-right: 8px; flex-shrink: 0;" />
          <div style="flex: 1;">
            <h3 style="margin: 0; font-family: 'Cinzel', serif; color: #FEEBB3; font-size: 15px;">${item.name}</h3>
            <span style="font-size: 11px; color: #9bd7e5; text-transform: uppercase;">${item.type.toUpperCase()}${item.system?.category ? ` • ${item.system.category}` : ''}</span>
          </div>
        </header>
        <div class="card-content" style="margin-top: 8px; font-size: 12px; line-height: 1.5; color: #fdfaf3;">
          ${enriched || '<p style="font-style: italic; opacity: 0.7;">No description provided.</p>'}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      flags: { "mythcraft-essence-sheet": { itemUuid: item.uuid, itemId: item.id } },
    });
  }

  static async #postSpellToChat(event, target) {
    await EssenceNPCSheet.#postItemToChat.call(this, event, target);
  }

  static async #createTierAction(event, target) {
    event?.preventDefault?.();
    const tier = Number(target.dataset?.tier || target.closest("[data-tier]")?.dataset?.tier || 1);
    const itemData = {
      name: `New Tier ${tier} Action`,
      type: "feature",
      img: "icons/svg/sword.svg",
      system: {
        category: "action",
        tier: tier,
      },
    };
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (created?.[0]) created[0].sheet?.render(true);
  }

  static async #createReaction(event, target) {
    event?.preventDefault?.();
    const itemData = {
      name: "New Reaction",
      type: "feature",
      img: "icons/svg/lightning.svg",
      system: {
        category: "reaction",
      },
    };
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (created?.[0]) created[0].sheet?.render(true);
  }

  static async #createPassiveFeature(event, target) {
    event?.preventDefault?.();
    const itemData = {
      name: "New Feature",
      type: "feature",
      img: "icons/svg/aura.svg",
      system: {
        category: "passive",
      },
    };
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (created?.[0]) created[0].sheet?.render(true);
  }

  static async #createSpell(event, target) {
    event?.preventDefault?.();
    const itemData = {
      name: "New Spell",
      type: "spell",
      img: "icons/svg/daze.svg",
      system: {
        magicSource: "arcane",
        powerLevel: 1,
      },
    };
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (created?.[0]) created[0].sheet?.render(true);
  }

  static async #createDoc(event, target) {
    event?.preventDefault?.();
    const type = target?.dataset?.type || "spell";
    if (type === "spell") return this.#createSpell(event, target);
    const itemData = {
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      img: "icons/svg/item-bag.svg",
    };
    const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    if (created?.[0]) created[0].sheet?.render(true);
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
      flags: { mythcraft: { type: effectType } },
    };
    const created = await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    if (created?.[0]) created[0].sheet?.render(true);
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
    }
  }

  static #editEffect(event, target) {
    const effectId = target.dataset?.effectId || target.closest("[data-effect-id]")?.dataset?.effectId;
    const effect = effectId ? this.actor.effects.get(effectId) : null;
    effect?.sheet?.render(true);
  }

  static #viewDoc(event, target) {
    const docRow = target.closest("[data-document-class]");
    if (!docRow) return;
    const { itemId, effectId } = docRow.dataset;
    if (itemId) {
      const item = this.actor.items.get(itemId);
      item?.sheet?.render(true);
    } else if (effectId) {
      const effect = this.actor.effects.get(effectId);
      effect?.sheet?.render(true);
    }
  }

  static async #deleteDoc(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const docRow = target.closest("[data-document-class]");
    if (!docRow) return;
    const { itemId, effectId } = docRow.dataset;

    if (itemId) {
      const item = this.actor.items.get(itemId);
      if (!item) return;
      const confirmed = await EssenceNPCSheet.#confirmDeletion(
        "Delete Action / Feature",
        `Are you sure you want to delete <strong>${item.name}</strong>?`
      );
      if (confirmed) await item.delete();
    } else if (effectId) {
      const effect = this.actor.effects.get(effectId);
      if (!effect) return;
      const confirmed = await EssenceNPCSheet.#confirmDeletion(
        "Delete Active Effect",
        `Are you sure you want to delete <strong>${effect.name}</strong>?`
      );
      if (confirmed) await effect.delete();
    }
  }

  static #toggleItemEmbed(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemEl = target.closest(".item") || target.closest("[data-item-id]");
    if (!itemEl) return;
    const itemId = itemEl.dataset.itemId;
    if (!itemId) return;

    const isExpanded = this.expandedItems.has(itemId);
    if (isExpanded) {
      this.expandedItems.delete(itemId);
      itemEl.classList.remove("expanded");
    } else {
      this.expandedItems.add(itemId);
      itemEl.classList.add("expanded");
    }

    // Direct DOM toggle of drawer and chevron without re-rendering the whole window
    const drawer = itemEl.querySelector(".item-drawer-content, .action-drawer-content, .reaction-drawer-content, .feature-drawer-content, .spell-embed, .item-embed-card");
    const chevron = itemEl.querySelector(".expand-btn i, .item-control.expand-btn i, .feature-ctrl-btn.expand-btn i");
    if (drawer) {
      drawer.style.display = isExpanded ? "none" : "block";
    }
    if (chevron) {
      chevron.className = isExpanded ? "fas fa-chevron-down" : "fas fa-chevron-up";
    }

    // Re-render sheet to ensure template conditionals (e.g. {{#if spell.expanded}}) render properly
    if (!drawer) {
      this.render(false);
    }
  }


  static #toggleEffectEmbed(event, target) {
    event?.preventDefault?.();
    const effectEl = target.closest(".effect") || target.closest("[data-effect-id]");
    if (!effectEl) return;
    const effectId = effectEl.dataset.effectId;
    if (!effectId) return;

    if (this.expandedEffects.has(effectId)) this.expandedEffects.delete(effectId);
    else this.expandedEffects.add(effectId);

    this.render({ parts: ["effects"] });
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

  static #editTags(event, target) {
    new ActorTagsAssignmentDialog({ document: this.actor }).render(true);
  }

  static async #removeTag(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const tagId = target.dataset.tagId;
    if (!tagId || !this.actor) return;
    const rawTags = this.actor.system?.tags || [];
    const tagArray = Array.isArray(rawTags)
      ? [...rawTags]
      : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "string" ? rawTags.split(",").map(t => t.trim()).filter(Boolean) : []));
    const norm = tagId.toLowerCase().replace(/[^a-z0-9]/g, "");
    const index = tagArray.findIndex(t => t.toLowerCase().replace(/[^a-z0-9]/g, "") === norm);
    if (index >= 0) {
      const removed = tagArray.splice(index, 1)[0];
      await this.actor.update({ "system.tags": tagArray });
      ui.notifications.info(`Removed tag "${removed}" from ${this.actor.name}.`);
    }
  }

  static #filterMagicSource(event, target) {
    const source = target.dataset.source || "all";
    this.activeSourceFilter = source;
    this.render({ parts: ["spells"] });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Context Preparation
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isPlay = Boolean(this.isPlay);
    context.isGM = game.user.isGM;

    // Proportional HP & Shield Calculations (shared track) matching Character Sheet
    const hp = this.actor.system?.hp || {};
    const hpMax = Math.max(1, hp.max || 1);
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

    context.isBloodied = hpVal > 0 && hpVal <= Math.floor(hpMax / 2);
    context.deathVal = Number(this.actor.system?.death?.value ?? 0);
    context.deathMax = Number(this.actor.system?.death?.max || Math.max(1, (this.actor.system?.attributes?.end ?? 0) + 8));

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

    const rawSize = String(this.actor.system?.size || "medium")
      .replace(/^MYTHCRAFT\.Sizes\./i, "")
      .trim()
      .toLowerCase();

    context.sizeOptions = Object.entries(SIZES_MAP).map(([key, label]) => ({
      key,
      value: key,
      label,
      selected: rawSize === key.toLowerCase() || rawSize === label.toLowerCase(),
    }));

    return context;
  }

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    // ── Header Part ──
    if (partId === "header") {
      await this._prepareHeader(context, options);

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

      const rawSize = String(this.actor.system?.size || "medium")
        .replace(/^MYTHCRAFT\.Sizes\./i, "")
        .trim()
        .toLowerCase();

      context.sizeOptions = Object.entries(SIZES_MAP).map(([key, label]) => ({
        key,
        value: key,
        label,
        selected: rawSize === key.toLowerCase() || rawSize === label.toLowerCase(),
      }));


      // Tags with dictionary lookups for rich hover tooltips
      const rawTags = this.actor.system.tags || [];
      const tagArray = Array.isArray(rawTags)
        ? rawTags
        : (rawTags instanceof Set ? Array.from(rawTags) : (typeof rawTags === "string" ? rawTags.split(",").map(t => t.trim()).filter(Boolean) : []));

      context.tagsList = tagArray.map(t => {
        const def = findTagDefinition(t);
        const label = def?.name || (CONFIG.MYTHCRAFT?.monster?.tags?.[t]?.label ? game.i18n.localize(CONFIG.MYTHCRAFT.monster.tags[t].label) : formatTagTitle(t)) || t;
        const desc = def?.description || (CONFIG.MYTHCRAFT?.monster?.tags?.[t]?.description ? game.i18n.localize(CONFIG.MYTHCRAFT.monster.tags[t].description) : "");
        const catLabel = def?.categoryLabel || "Monster Tag";
        const tooltip = desc 
          ? `<strong>${label}</strong> (${catLabel})<br><span style="font-size: 11px; line-height: 1.35; display: inline-block; margin-top: 3px;">${desc}</span>` 
          : `<strong>${label}</strong>`;
        return {
          id: t,
          label,
          tooltip,
        };
      });
      // ── Header: HP, Defenses, Movement, Senses ──────────────────────────
      const sys = this.actor.system;
      const hp = sys.hp || {};
      const hpMax = Math.max(1, hp.max || 1);
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
      context.isBloodied = hpVal > 0 && hpVal <= Math.floor(hpMax / 2);
      context.deathVal = Number(sys.death?.value ?? 0);
      context.deathMax = Number(sys.death?.max || Math.max(1, (sys.attributes?.end ?? 0) + 8));

      // Defenses for header strip
      context.headerDefenses = [
        { key: "ref",  label: "REF",  name: "Reflex",      value: sys.defenses?.ref  ?? 10 },
        { key: "fort", label: "FORT", name: "Fortitude",   value: sys.defenses?.fort ?? 10 },
        { key: "ant",  label: "ANT",  name: "Anticipation",value: sys.defenses?.ant  ?? 10 },
        { key: "log",  label: "LOG",  name: "Logic",       value: sys.defenses?.log  ?? 10 },
        { key: "will", label: "WILL", name: "Willpower",   value: sys.defenses?.will ?? 10 },
      ];

      // Movement speeds for header
      const rawMovement = sys.movement;
      const speedDefs = {
        walk: { label: "Walk", icon: "fas fa-walking" },
        fly:  { label: "Fly",  icon: "fas fa-feather-alt" },
        swim: { label: "Swim", icon: "fas fa-swimmer" },
        burrow: { label: "Burrow", icon: "fas fa-mountain" },
        climb: { label: "Climb", icon: "fas fa-mountain" },
        hover: { label: "Hover", icon: "fas fa-cloud" },
      };
      const activeSpeeds = [];
      if (typeof rawMovement === "string" && rawMovement.trim()) {
        for (const part of rawMovement.split(",").map(p => p.trim()).filter(Boolean)) {
          const lower = part.toLowerCase();
          let matchedKey = "walk";
          for (const k of Object.keys(speedDefs)) {
            if (lower.includes(k)) { matchedKey = k; break; }
          }
          activeSpeeds.push({
            id: matchedKey,
            label: speedDefs[matchedKey]?.label || "Walk",
            icon: speedDefs[matchedKey]?.icon || "fas fa-walking",
            display: part.replace(/ft\.?/i, "ft"),
          });
        }
      } else if (rawMovement && typeof rawMovement === "object") {
        for (const [mKey, mVal] of Object.entries(rawMovement)) {
          const val = typeof mVal === "number" ? mVal : Number(mVal?.value ?? 0);
          if (val > 0) {
            activeSpeeds.push({
              id: mKey, label: speedDefs[mKey]?.label || mKey.toUpperCase(),
              icon: speedDefs[mKey]?.icon || "fas fa-running",
              display: `${speedDefs[mKey]?.label || mKey} ${val} ft`,
            });
          }
        }
      }
      context.movementInfo = { activeSpeeds };

      // Senses for header
      const rawSenses = sys.senses;
      const senseDefs = {
        darkvision:  { label: "Darkvision", icon: "fas fa-moon" },
        blindsight:  { label: "Blindsight", icon: "fas fa-eye-slash" },
        tremorsense: { label: "Tremorsense", icon: "fas fa-wave-square" },
        truesight:   { label: "Truesight",  icon: "fas fa-sun" },
      };
      const activeSenses = [];
      if (typeof rawSenses === "string" && rawSenses.trim()) {
        for (const part of rawSenses.split(",").map(p => p.trim()).filter(Boolean)) {
          const lower = part.toLowerCase();
          let matchedKey = "darkvision";
          for (const k of Object.keys(senseDefs)) {
            if (lower.includes(k)) { matchedKey = k; break; }
          }
          activeSenses.push({
            id: matchedKey,
            label: senseDefs[matchedKey]?.label || matchedKey.toUpperCase(),
            icon: senseDefs[matchedKey]?.icon || "fas fa-eye",
            description: part,
            display: part.replace(/ft\.?/i, "ft"),
          });
        }
      } else if (rawSenses && typeof rawSenses === "object") {
        for (const [sKey, sVal] of Object.entries(rawSenses)) {
          if (sVal) {
            const num = typeof sVal === "number" ? sVal : (sVal.distance || sVal.value || 30);
            activeSenses.push({
              id: sKey, label: senseDefs[sKey]?.label || sKey.toUpperCase(),
              icon: senseDefs[sKey]?.icon || "fas fa-eye",
              description: `${senseDefs[sKey]?.label || sKey} ${num} ft`,
              display: `${senseDefs[sKey]?.label || sKey} ${num} ft`,
            });
          }
        }
      }
      // Homebrew: Fear calculation on NPC Header
      const enableSanity = game.settings.get("mythcraft-essence-sheet", "enableSanity") ?? false;
      const showMetaSetting = game.settings.get("mythcraft-essence-sheet", "npcShowMetaphysicalAttrs") ?? false;
      const sanityOnNpcSetting = game.settings.get("mythcraft-essence-sheet", "sanityOnNpc") ?? false;
      const showSanityOnNpc = enableSanity && (showMetaSetting || sanityOnNpcSetting);

      const enableFearSetting = enableSanity && (game.settings.get("mythcraft-essence-sheet", "enableFear") ?? false);
      const showFearOnNpc = enableFearSetting && (showMetaSetting || sanityOnNpcSetting);

      context.enableFear = showFearOnNpc;
      if (showFearOnNpc) {
        const sanVal = Number(sys.attributes?.san ?? 0);
        const fearThreshold = sanVal >= 0 ? (1 + Math.floor(sanVal / 2)) : (1 + sanVal);
        const fearVal = Number(this.actor.system?.fear?.value ?? this.actor.flags?.["mythcraft-essence-sheet"]?.fear ?? 0);
        context.fearValue = fearVal;
        context.fearThreshold = fearThreshold;
        context.displayFearThreshold = Math.max(0, fearThreshold);
        context.isFearExceeded = fearVal > fearThreshold;
        context.fearPct = fearThreshold > 0 ? Math.round(Math.min(100, Math.max(0, (fearVal / fearThreshold) * 100))) : (fearVal > 0 ? 100 : 0);
      }
    }

    // ── Stats Tab ──
    if (partId === "stats") {
      await this._prepareStatsTab(context, options);
    }

    // ── Unified Actions & Features Tab ──
    if (partId === "actions") {
      const allFeatures = this.actor.itemTypes.feature || [];
      const rawTier1 = [];
      const rawTier2 = [];
      const reactions = [];
      const passives = [];

      // Detect combat & turn state
      const enableTurnStates = game.settings.get("mythcraft-essence-sheet", "npcTurnActionAvailability") ?? true;
      const combat = game.combat;
      const combatant = combat?.combatants?.find(c => c.actorId === this.actor.id);
      const inActiveCombat = Boolean(enableTurnStates && combat?.started && combatant);
      const isMyTurn = inActiveCombat && combat.combatant?.actorId === this.actor.id;

      for (const feat of allFeatures) {
        const cat = (feat.system?.category || "").toLowerCase();
        const expanded = this.expandedItems.has(feat.id);
        const descVal = feat.system?.description?.value ?? feat.system?.description ?? "";
        const descHTML = await enrichText(descVal, { rollData: this.actor.getRollData() });
        
        // Attack/Damage Info
        const attackBonusRaw = feat.system?.attackBonus ?? feat.system?.toHit ?? feat.system?.attackModifier ?? feat.system?.attack;
        const hasAttack = Boolean(attackBonusRaw !== undefined && attackBonusRaw !== null && attackBonusRaw !== "" && attackBonusRaw !== false);
        const attackBonus = Number(attackBonusRaw ?? 0);
        const attackBonusDisplay = attackBonus >= 0 ? `+${attackBonus}` : `${attackBonus}`;
        
        const damageFormula = feat.system?.damageFormula || (Array.isArray(feat.system?.damage) ? feat.system.damage.map(d => d?.formula).filter(Boolean).join(" + ") : "") || (typeof feat.system?.damage === "string" ? feat.system.damage : "") || "";
        const hasDamage = Boolean(damageFormula && damageFormula.trim().length > 0);
        const defenseTarget = (feat.system?.defense || feat.system?.defenseTarget || "AR").toUpperCase();

        const entry = {
          item: feat,
          expanded,
          descriptionHTML: descHTML,
          hasAttack,
          hasDamage,
          attackBonusDisplay,
          damageFormula,
          defenseTarget,
          isGrayedOut: false,
          isHighlighted: false,
        };

        const featNameLower = (feat.name || "").trim().toLowerCase();
        const isMoveAction = featNameLower === "move" || featNameLower === "movement";

        if (cat === "action" || (!cat && (feat.system?.tier || feat.system?.attack || feat.system?.damage))) {
          const tier = Number(feat.system?.tier || 1);
          // Exclude generic movement actions from the tier action lists (declared in Turn Action Economy header)
          if (!isMoveAction) {
            if (tier === 2) rawTier2.push(entry);
            else rawTier1.push(entry);
          }
        } else if (cat === "reaction") {
          reactions.push(entry);
        } else {
          passives.push(entry);
        }
      }

      // Collect all reaction descriptions, names, and triggers to detect calls to Tier 1/2 actions or exploit reactions
      const reactionTexts = reactions.map(r => {
        const n = (r.item.name || "").toLowerCase();
        const d = (r.item.system?.description?.value ?? r.item.system?.description ?? "").toLowerCase();
        const t = (r.item.system?.trigger ?? "").toLowerCase();
        return `${n} ${d} ${t}`;
      }).join(" ");

      // Check if any reaction grants exploit / opportunity actions
      const hasExploitReaction = /\b(exploit|opportunity)\b/i.test(reactionTexts);

      // Evaluate turn-based graying out and reaction call highlighting
      for (const action of [...rawTier1, ...rawTier2]) {
        const actionName = (action.item.name || "").toLowerCase().trim();
        const isCalledByReaction = hasExploitReaction || (actionName.length > 2 && reactionTexts.includes(actionName));

        if (inActiveCombat) {
          if (isMyTurn) {
            action.isGrayedOut = false;
            action.isHighlighted = false;
          } else {
            // Not my turn
            if (isCalledByReaction) {
              action.isGrayedOut = false;
              action.isHighlighted = true;
            } else {
              action.isGrayedOut = true;
              action.isHighlighted = false;
            }
          }
        } else {
          action.isGrayedOut = false;
          action.isHighlighted = false;
        }
      }

      for (const r of reactions) {
        if (inActiveCombat) {
          // Reactions are taken off-turn, so gray out on active creature's turn
          r.isGrayedOut = isMyTurn;
        } else {
          r.isGrayedOut = false;
        }
      }

      context.tier1Actions = rawTier1;
      context.tier2Actions = rawTier2;
      context.reactions = reactions;
      context.passives = passives;
      context.hasTier1Actions = rawTier1.length > 0;
      context.hasTier2Actions = rawTier2.length > 0;
      context.hasReactions = reactions.length > 0;
      context.hasPassives = passives.length > 0;
      context.inActiveCombat = inActiveCombat;
      context.isMyTurn = isMyTurn;
      context.enrichedActions = await enrichText(this.actor.system.actions || "", { rollData: this.actor.getRollData() });
    }


    // ── Spells Tab ──
    if (partId === "spells") {
      const allSpells = this.actor.itemTypes.spell || [];
      const cleanSourceLabel = (raw) => {
        if (!raw) return "";
        const loc = game.i18n.localize(raw);
        if (loc && loc !== raw && !loc.startsWith("MYTHCRAFT.")) return loc;
        const s = String(raw).trim().toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
      };

      const SPECIAL_TAG_PATTERNS = [
        { pattern: /cantrip/i, label: "Cantrip", color: "arcane" },
        { pattern: /prayer/i, label: "Prayer", color: "divine" },
        { pattern: /ritual/i, label: "Ritual", color: "occult" },
        { pattern: /hex/i, label: "Hex", color: "occult" },
        { pattern: /curse/i, label: "Curse", color: "occult" },
        { pattern: /ward/i, label: "Ward", color: "divine" },
        { pattern: /enchantment/i, label: "Enchantment", color: "arcane" },
        { pattern: /evocation/i, label: "Evocation", color: "arcane" },
        { pattern: /illusion/i, label: "Illusion", color: "arcane" },
        { pattern: /necromancy/i, label: "Necromancy", color: "occult" },
        { pattern: /telepathy/i, label: "Telepathy", color: "psionic" },
        { pattern: /telekinesis/i, label: "Telekinesis", color: "psionic" },
      ];

      const tagConfig = CONFIG.MYTHCRAFT?.tags || {};

      context.spells = await Promise.all(allSpells.map(async (item) => {
        const expanded = this.expandedItems.has(item.id);
        const descVal = item.system?.description?.value ?? item.system?.description ?? "";
        const rawSource = item.system?.magicSource || "arcane";
        const sourceKey = String(rawSource).trim().toLowerCase();

        const rawTags = item.system?.tags || [];
        const tagArray = Array.isArray(rawTags) ? rawTags : (typeof rawTags === "string" ? rawTags.split(",").map(t => t.trim()).filter(Boolean) : []);
        
        const allTags = [];
        const inlineTags = [];
        const seenInline = new Set();

        for (const tag of tagArray) {
          const tStr = typeof tag === "string" ? tag : (tag?.name || tag?.label || tag?.id || "");
          if (!tStr) continue;
          const tClean = tStr.toLowerCase().trim();
          const conf = tagConfig[tClean] || tagConfig[tStr];
          let displayLabel = conf ? game.i18n.localize(conf.label) : (tStr.charAt(0).toUpperCase() + tStr.slice(1));
          
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

    // ── Effects Tab ──
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

    // ── Biography Tab ──
    if (partId === "biography") {
      context.enrichedBiography = await enrichText(this.actor.system?.biography?.value || "", { rollData: this.actor.getRollData() });
      context.enrichedGMNotes = await enrichText(this.actor.system?.biography?.gm || "", { rollData: this.actor.getRollData() });
    }

    return context;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Stats Tab Data Preparation
   * ──────────────────────────────────────────────────────────────────────── */

  async _prepareStatsTab(context, options) {
    const sys = this.actor.system;

    // Proportional HP & Shield Calculations (shared track) matching Character Sheet
    const hp = sys.hp || {};
    const hpMax = Math.max(1, hp.max || 1);
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

    context.isBloodied = hpVal > 0 && hpVal <= Math.floor(hpMax / 2);
    context.deathVal = Number(sys.death?.value ?? 0);
    context.deathMax = Number(sys.death?.max || Math.max(1, (sys.attributes?.end ?? 0) + 8));

    const allSkills = sys.skills || {};
    const skillConfig = globalThis.mythcraft?.CONFIG?.skills?.list || CONFIG.MYTHCRAFT?.skills?.list || {};

    const formatBonus = (val) => {
      const n = Number(val) || 0;
      return n >= 0 ? `+${n}` : `${n}`;
    };

    const hasSpecificSkills = Object.keys(allSkills).length > 0;
    const getSkillsForAttr = (attrKey) => {
      const list = [];
      for (const [id, cfg] of Object.entries(skillConfig)) {
        if (cfg.attribute === attrKey) {
          const sData = allSkills[id];
          if (!hasSpecificSkills || sData !== undefined) {
            const rawLabel = cfg.specialized && sData?.specialization 
              ? game.i18n.format(cfg.specialized, sData) 
              : (cfg.label ? game.i18n.localize(cfg.label) : id);
            const bonus = sData?.bonus ?? sData?.override ?? sData?.calculated ?? (sys.attributes?.[attrKey] ?? 0);
            list.push({
              id,
              label: rawLabel || id,
              bonus,
              bonusDisplay: formatBonus(bonus),
            });
          }
        }
      }
      return list;
    };

    const buildAttr = (key, name, label, defKey, defName, defLabel) => {
      const val = sys.attributes?.[key] ?? 0;
      const bonus = Math.floor(val);
      const bonusDisplay = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      const defenseVal = defKey ? sys.defenses?.[defKey] : null;

      return {
        key,
        name,
        label,
        value: val,
        bonusDisplay,
        defense: defKey ? { key: defKey, name: defName, label: defLabel, value: defenseVal } : null,
        skills: getSkillsForAttr(key),
      };
    };

    context.physicalAttrs = [
      buildAttr("str", "Strength", "STR", null, null, null),
      buildAttr("dex", "Dexterity", "DEX", "ref", "Reflex", "REF"),
      buildAttr("end", "Endurance", "END", "fort", "Fortitude", "FORT"),
    ];

    context.mentalAttrs = [
      buildAttr("awr", "Awareness", "AWR", "ant", "Anticipation", "ANT"),
      buildAttr("int", "Intelligence", "INT", "log", "Logic", "LOG"),
      buildAttr("cha", "Charisma", "CHA", "will", "Willpower", "WILL"),
    ];

    context.metaAttrs = [
      buildAttr("luck", "Luck", "LUCK", null, null, null),
      buildAttr("cor", "Corruption", "COR", null, null, null),
    ];

    // Homebrew: Sanity (SAN) Metaphysical Attribute on NPCs
    const enableSanity = game.settings.get("mythcraft-essence-sheet", "enableSanity") ?? false;
    const showSetting = game.settings.get("mythcraft-essence-sheet", "npcShowMetaphysicalAttrs") ?? false;
    const sanityOnNpcSetting = game.settings.get("mythcraft-essence-sheet", "sanityOnNpc") ?? false;
    const showSanityOnNpc = enableSanity && (showSetting || sanityOnNpcSetting);
    if (showSanityOnNpc) {
      context.metaAttrs.push(buildAttr("san", "Sanity", "SAN", null, null, null));
    }

    // Homebrew: Custom Attributes Engine for NPCs
    const customAttrs = game.settings.get("mythcraft-essence-sheet", "customAttributes") ?? [];
    let hasMetaCustom = false;
    for (const cAttr of customAttrs) {
      if (!cAttr.key || !cAttr.name || !cAttr.includeInNpc) continue;
      const attrObj = buildAttr(
        cAttr.key,
        cAttr.name,
        cAttr.abbr || cAttr.key.toUpperCase(),
        null,
        null,
        null
      );
      attrObj.footnote = cAttr.footnote || null;
      attrObj.isCustom = true;

      if (cAttr.category === "physical") {
        context.physicalAttrs.push(attrObj);
      } else if (cAttr.category === "mental") {
        context.mentalAttrs.push(attrObj);
      } else {
        context.metaAttrs.push(attrObj);
        hasMetaCustom = true;
      }
    }

    // Module setting: show metaphysical attributes (LUCK/COR/SAN/Custom Meta) on NPC sheets
    context.showMetaAttrs = Boolean(showSetting || showSanityOnNpc || hasMetaCustom);

    // Senses parser for NPC (handles StringField "Darkvision 60 ft." or object)
    const rawSenses = sys.senses;
    const senseDefs = {
      darkvision: { label: "Darkvision", icon: "fas fa-moon" },
      blindsight: { label: "Blindsight", icon: "fas fa-eye-slash" },
      tremorsense: { label: "Tremorsense", icon: "fas fa-wave-square" },
      truesight: { label: "Truesight", icon: "fas fa-sun" },
    };
    const activeSenses = [];
    if (typeof rawSenses === "string" && rawSenses.trim()) {
      const parts = rawSenses.split(",").map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        const lower = part.toLowerCase();
        let matchedKey = "darkvision";
        for (const k of Object.keys(senseDefs)) {
          if (lower.includes(k)) {
            matchedKey = k;
            break;
          }
        }
        activeSenses.push({
          id: matchedKey,
          label: senseDefs[matchedKey]?.label || matchedKey.toUpperCase(),
          icon: senseDefs[matchedKey]?.icon || "fas fa-eye",
          description: part,
          display: part.replace(/ft\.?/i, "ft"),
        });
      }
    } else if (rawSenses && typeof rawSenses === "object") {
      for (const [sKey, sVal] of Object.entries(rawSenses)) {
        if (sVal) {
          const num = typeof sVal === "number" ? sVal : (sVal.distance || sVal.value || 30);
          activeSenses.push({
            id: sKey,
            label: senseDefs[sKey]?.label || sKey.toUpperCase(),
            icon: senseDefs[sKey]?.icon || "fas fa-eye",
            description: `${senseDefs[sKey]?.label || sKey} ${num} ft`,
            display: `${senseDefs[sKey]?.label || sKey} ${num} ft`,
          });
        }
      }
    }
    context.senseInfo = { activeSenses };

    // Movement parser for NPC (handles StringField "Walk 30 ft., Fly 60 ft." or object)
    const rawMovement = sys.movement;
    const speedDefs = {
      walk: { label: "Walk", icon: "fas fa-walking" },
      fly: { label: "Fly", icon: "fas fa-feather-alt" },
      swim: { label: "Swim", icon: "fas fa-swimmer" },
      burrow: { label: "Burrow", icon: "fas fa-mountain" },
      climb: { label: "Climb", icon: "fas fa-mountain" },
      hover: { label: "Hover", icon: "fas fa-cloud" },
    };
    const activeSpeeds = [];
    if (typeof rawMovement === "string" && rawMovement.trim()) {
      const parts = rawMovement.split(",").map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        const lower = part.toLowerCase();
        let matchedKey = "walk";
        for (const k of Object.keys(speedDefs)) {
          if (lower.includes(k)) {
            matchedKey = k;
            break;
          }
        }
        activeSpeeds.push({
          id: matchedKey,
          label: speedDefs[matchedKey]?.label || "Walk",
          icon: speedDefs[matchedKey]?.icon || "fas fa-walking",
          display: part.replace(/ft\.?/i, "ft"),
        });
      }
    } else if (rawMovement && typeof rawMovement === "object") {
      for (const [mKey, mVal] of Object.entries(rawMovement)) {
        const val = typeof mVal === "number" ? mVal : Number(mVal?.value ?? 0);
        if (val > 0) {
          activeSpeeds.push({
            id: mKey,
            label: speedDefs[mKey]?.label || mKey.toUpperCase(),
            icon: speedDefs[mKey]?.icon || "fas fa-running",
            display: `${speedDefs[mKey]?.label || mKey}: ${val} ft`,
          });
        }
      }
    }
    context.movementInfo = { activeSpeeds };

    // Damage summary for the compact Damage Modifications card on the sheet (matching character sheet)
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

    const sysDmg = sys.damage || {};
    const affinities = Array.from(sysDmg.affinity || []).map(k => {
      const lower = String(k).toLowerCase();
      const cfg = DAMAGE_TYPE_CONFIG[lower];
      return {
        key: lower,
        label: cfg?.label || (k.charAt(0).toUpperCase() + k.slice(1)),
        icon: cfg?.icon || "fas fa-shield-alt",
      };
    });

    const immunities = Array.from(sysDmg.immune || []).map(k => {
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

    const resistList = parseModString(sysDmg.resist);
    const vulnList = parseModString(sysDmg.vulnerable);

    context.damageSummary = {
      affinities,
      immunities,
      resist: sysDmg.resist || "",
      resistList,
      vulnerable: sysDmg.vulnerable || "",
      vulnList,
      drValue: Number(sysDmg.reduction?.value) || 0,
      drBypasses: sysDmg.reduction?.bypasses || "",
      threshold: Number(sysDmg.threshold?.threshold ?? sysDmg.threshold) || 0,
      hasAny: affinities.length > 0 || immunities.length > 0 || resistList.length > 0 || vulnList.length > 0 || !!sysDmg.resist || !!sysDmg.vulnerable || (Number(sysDmg.reduction?.value) > 0) || (Number(sysDmg.threshold?.threshold ?? sysDmg.threshold) > 0),
    };


    // Active Conditions
    const activeConds = [];
    for (const eff of this.actor.effects) {
      if (!eff.disabled && (eff.flags?.["mythcraft-hud"]?.isCondition || eff.statuses?.size > 0)) {
        activeConds.push({
          id: eff.id,
          label: eff.name,
          icon: eff.img,
          description: eff.description || "",
        });
      }
    }
    context.activeConditions = activeConds;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Rendering Listeners
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Fix window resize handle: position it cleanly in the bottom-right corner so it
    // never clips over item row controls. The handle is a direct child of this.element (the application),
    // not inside .window-content, so it needs JS targeting.
    requestAnimationFrame(() => {
      const handle = this.element.querySelector('.window-resizable-handle');
      if (handle) {
        handle.style.position = 'absolute';
        handle.style.bottom = '2px';
        handle.style.right = '2px';
        handle.style.zIndex = '1000';
        handle.style.pointerEvents = 'auto';
      }
      // Add bottom + right clearance to the window-content so item rows never slide under the handle
      const windowContent = this.element.querySelector('.window-content');
      if (windowContent) {
        windowContent.style.paddingRight = '0';
        windowContent.style.boxSizing = 'border-box';
      }
    });


    const meterBars = this.element.querySelectorAll(".meter-fill, .essence-bar-fill, .npc-meter-fill");
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

    // Right-click Image Popout for NPC Portrait & all Item Images on Sheet
    const ImagePopoutApp = foundry.applications.apps.ImagePopout || globalThis.ImagePopout;
    const portraitEl = this.element.querySelector(".npc-portrait-box, .portrait-img, img[data-edit='img']");
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

    const itemImages = this.element.querySelectorAll(".action-img, .reaction-img, .feature-img, .spell-img, .item-img, [data-item-id] img");
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


    // Live auto-saving on vital inputs (HP, Shield, Max, AR, Level, Death Points)
    const liveInputs = this.element.querySelectorAll(".npc-sheet-header input[name], .npc-stats-tab input[name]");
    liveInputs.forEach(input => {
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

    // Live fluid meter bar animation when modifying HP or Shield inputs in the header
    const hpInput = this.element.querySelector("input[name='system.hp.value']");
    const hpMaxInput = this.element.querySelector("input[name='system.hp.max']");
    const shieldInput = this.element.querySelector("input[name='system.hp.shield']");
    const hpBar = this.element.querySelector(".npc-header-hp-card .hp-bar-fill, .npc-hp-meter-card .hp-bar-fill");
    const shieldBar = this.element.querySelector(".npc-header-hp-card .shield-bar-fill, .npc-hp-meter-card .shield-bar-fill");

    const updateLiveHpBars = () => {
      const hpVal = Math.max(0, Number(hpInput?.value ?? 0));
      const hpMax = Math.max(1, Number(hpMaxInput?.value ?? 1));
      const hpShield = Math.max(0, Number(shieldInput?.value ?? 0));
      const totalHp = hpVal + hpShield;

      let hpPct = 0;
      let shieldPct = 0;
      if (totalHp > hpMax && totalHp > 0) {
        hpPct = Math.round((hpVal / totalHp) * 100);
        shieldPct = 100 - hpPct;
      } else if (hpMax > 0) {
        hpPct = Math.round((hpVal / hpMax) * 100);
        shieldPct = Math.round((hpShield / hpMax) * 100);
      }

      if (hpBar) {
        hpBar.style.transition = "width 0.8s cubic-bezier(0.25, 1, 0.5, 1)";
        hpBar.style.width = `${hpPct}%`;
      }
      if (shieldBar) {
        shieldBar.style.transition = "width 0.8s cubic-bezier(0.25, 1, 0.5, 1)";
        shieldBar.style.width = `${shieldPct}%`;
      }
    };

    hpInput?.addEventListener("input", updateLiveHpBars);
    hpMaxInput?.addEventListener("input", updateLiveHpBars);
    shieldInput?.addEventListener("input", updateLiveHpBars);

    // Expandable Action and Feature Rows
    const rows = this.element.querySelectorAll(".npc-action-card, .npc-feature-card, .npc-spell-card, .npc-reaction-card");
    rows.forEach(row => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("button, input, select, textarea, a, .action-img, .feature-img, .spell-img, .reaction-img, [data-action='viewDoc'], [data-action='deleteDoc'], [data-action='postItemToChat'], [data-action='postSpellToChat'], [data-action='rollAttack'], [data-action='rollDamage'], [data-action='rollSpell']")) {
          return;
        }
        const itemId = row.dataset.itemId;
        if (itemId) {
          EssenceNPCSheet.#toggleItemEmbed.call(this, e, row);
        }
      });
    });
  }
}
