/**
 * mythcraft-essence-sheet | src/sheets/essence-siege-weapon-sheet.mjs
 *
 * Complete overhaul of the MythCraft Siege Weapon Actor Sheet (ApplicationV2)
 * in the unified Essence aesthetic with operational grids, health integrity meters,
 * visual ammo bars, and streamlined attack actions.
 */

import SiegeWeaponSheet from "/systems/mythcraft/module/applications/sheets/siege-weapon-sheet.mjs";
import enrichHTML from "/systems/mythcraft/module/utils/enrich-html.mjs";
import { getDefenseTargetConfig, renderDefenseTargetBadgeHTML } from "../data/defense-config.mjs";
import { rollItemDamage, getActorCritHit, getActorCritFail } from "./essence-character-sheet.mjs";
import DamageModificationDialog from "../apps/damage-modification-dialog.mjs";

const MODULE_PATH = (p) => `modules/mythcraft-essence-sheet/templates/essence/${p}`;

const DAMAGE_TYPE_CONFIG = {
  physical:   { label: "Physical", icon: "fas fa-shield" },
  blunt:      { label: "Blunt", icon: "fas fa-hammer" },
  sharp:      { label: "Sharp", icon: "fas fa-cut" },
  elemental:  { label: "Elemental", icon: "fas fa-fire-flame-curved" },
  cold:       { label: "Cold", icon: "fas fa-snowflake" },
  fire:       { label: "Fire", icon: "fas fa-fire" },
  corrosive:  { label: "Corrosive", icon: "fas fa-flask" },
  lightning:  { label: "Lightning", icon: "fas fa-bolt" },
  energy:     { label: "Energy", icon: "fas fa-sun" },
  toxic:      { label: "Toxic", icon: "fas fa-biohazard" },
  necrotic:   { label: "Necrotic", icon: "fas fa-skull" },
  psychic:    { label: "Psychic", icon: "fas fa-brain" },
  radiant:    { label: "Radiant", icon: "fas fa-sun" },
  sonic:      { label: "Sonic", icon: "fas fa-volume-high" },
  all:        { label: "All Damage", icon: "fas fa-asterisk" },
};

export default class EssenceSiegeWeaponSheet extends SiegeWeaponSheet {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["mythcraft", "actor", "siege-weapon", "sheet", "essence-sheet", "essence-siege-sheet"],
    position: {
      width: 680,
      height: 780,
    },
    actions: {
      adjustAmmo: this.#adjustAmmo,
      editImage: this.#editImage,
      editDamageMod: this.#editDamageMod,
      createDoc: this.#createDoc,
      deleteDoc: this.#deleteDoc,
      viewDoc: this.#viewDoc,
      toggleItemEmbed: this.#toggleItemEmbed,
      rollFeature: this.#rollFeature,
      rollDamage: this.#rollDamage,
      createEffect: this.#createEffect,
      toggleEffect: this.#toggleEffect,
      toggleEffectEmbed: this.#toggleEffectEmbed,
      editEffect: this.#editEffect,
      deleteEffect: this.#deleteEffect,
    },
  };

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "stats", label: "Operations & Combat", icon: "fas fa-shield-halved" },
        { id: "effects", label: "Conditions & Effects", icon: "fas fa-bolt" },
      ],
      initial: "stats",
    },
  };

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: MODULE_PATH("siege/header.hbs"),
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    stats: {
      template: MODULE_PATH("siege/main.hbs"),
      scrollable: [""],
    },
    effects: {
      template: MODULE_PATH("siege/effects.hbs"),
      scrollable: [""],
    },
  };

  /* ─────────────────────────────────────────────────────────────────────────
   *  State Tracking
   * ──────────────────────────────────────────────────────────────────────── */

  expandedItems = new Set();
  expandedEffects = new Set();

  /* ─────────────────────────────────────────────────────────────────────────
   *  Form Submission Handling
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  _prepareSubmitData(event, form, formData) {
    const data = super._prepareSubmitData(event, form, formData);
    // Ensure img is not submitted with an invalid empty/non-string value that fails FilePathField validation
    if (!data.img || typeof data.img !== "string" || !data.img.includes(".")) {
      delete data.img;
    }
    return data;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Context Preparation
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;

    // Structural Integrity (HP) calculations
    const hpVal = Number(sys.hp?.value ?? 0);
    const hpMax = Number(sys.hp?.max ?? 0);
    context.hpPct = hpMax > 0 ? Math.min(100, Math.max(0, Math.round((hpVal / hpMax) * 100))) : 0;
    context.isBloodied = hpVal > 0 && hpVal <= Math.floor(hpMax / 2);

    // Ammunition Bar percentage
    const ammoVal = Number(sys.ammunition?.value ?? 0);
    const ammoMax = Number(sys.ammunition?.max ?? 0);
    context.ammoPct = ammoMax > 0 ? Math.min(100, Math.max(0, Math.round((ammoVal / ammoMax) * 100))) : 0;

    return context;
  }

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    if (partId === "stats") {
      context.enrichedDescription = await enrichHTML(this.actor.system.description?.value || "", { relativeTo: this.actor });
      context.enrichedGMNotes = await enrichHTML(this.actor.system.description?.gm || "", { relativeTo: this.actor });

      // Damage Modifications Summary (Unified with DamageModificationDialog)
      const sysRes = this.actor.system?.resistances ?? {};
      const immunities = Array.from(sysRes.immune || []).map(k => {
        const lower = String(k).toLowerCase();
        const cfg = DAMAGE_TYPE_CONFIG[lower];
        return {
          key: lower,
          label: cfg?.label || (k.charAt(0).toUpperCase() + k.slice(1)),
          icon: cfg?.icon || "fas fa-shield-alt",
        };
      });

      const parseModString = (val) => {
        if (!val) return [];
        const arr = Array.isArray(val) || val instanceof Set ? Array.from(val) : String(val).split(",");
        const list = [];
        for (const raw of arr) {
          const s = String(raw).trim();
          if (!s) continue;
          const match = s.match(/^([a-zA-Z\s]+?)(?:\s+(\d+))?$/);
          if (match) {
            const rawType = match[1].trim();
            const lower = rawType.toLowerCase();
            const num = match[2] !== undefined ? parseInt(match[2], 10) : 1;
            const cfg = DAMAGE_TYPE_CONFIG[lower];
            list.push({
              type: lower,
              label: cfg?.label || (rawType.charAt(0).toUpperCase() + rawType.slice(1)),
              icon: cfg?.icon || "fas fa-shield-alt",
              value: num,
            });
          }
        }
        return list;
      };

      const resistList = parseModString(sysRes.resist);
      const vulnList = parseModString(sysRes.vulnerable);
      const drValue = Number(this.actor.system?.reduction?.value ?? 0);
      const threshold = Number(this.actor.system?.threshold?.value ?? 0);

      context.damageSummary = {
        immunities,
        resistList,
        vulnList,
        drValue,
        threshold,
        hasAny: immunities.length > 0 || resistList.length > 0 || vulnList.length > 0 || drValue > 0 || threshold > 0,
      };

      // Format Actions list
      const rawFeatures = this.actor.itemTypes.feature || [];
      const sorted = rawFeatures.toSorted((a, b) => (a.sort || 0) - (b.sort || 0));

      context.actions = await Promise.all(sorted.map(async (item) => {
        const expanded = this.expandedItems.has(item.id);
        const defTarget = item.system?.defenseTarget || item.system?.defense || "";
        const defenseTargetBadge = defTarget ? renderDefenseTargetBadgeHTML(defTarget) : "";

        const ctx = {
          item,
          expanded,
          atkDisplay: item.system?.hasAttack ? (item.system?.evaluatedAttackBonus ?? "+0") : null,
          hasAtk: Boolean(item.system?.hasAttack),
          damageFirst: item.system?.damage?.[0]?.formula ?? null,
          defenseTargetBadge,
          isRollable: Boolean(item.system?.isRollable),
        };

        if (expanded && typeof item.system?.toEmbed === "function") {
          try {
            ctx.embed = await item.system.toEmbed({});
          } catch (e) {
            ctx.embed = null;
          }
        }
        return ctx;
      }));
    }

    if (partId === "effects") {
      const categories = {
        temporary: {
          type: "temporary",
          label: game.i18n.localize("MYTHCRAFT.Effect.Temporary") || "Temporary Effects",
          effects: [],
        },
        passive: {
          type: "passive",
          label: game.i18n.localize("MYTHCRAFT.Effect.Passive") || "Passive Effects",
          effects: [],
        },
        inactive: {
          type: "inactive",
          label: game.i18n.localize("MYTHCRAFT.Effect.Inactive") || "Inactive / Disabled",
          effects: [],
        },
      };

      for (const effect of this.actor.allApplicableEffects()) {
        const expanded = this.expandedEffects.has(effect.id);
        const ctx = { effect, expanded };
        if (expanded && typeof effect.toEmbed === "function") {
          try {
            ctx.embed = await effect.toEmbed({ inline: true });
          } catch (e) {
            ctx.embed = null;
          }
        }
        if (effect.disabled) categories.inactive.effects.push(ctx);
        else if (effect.isTemporary) categories.temporary.effects.push(ctx);
        else categories.passive.effects.push(ctx);
      }

      for (const c of Object.values(categories)) {
        c.effects.sort((a, b) => (a.effect.sort || 0) - (b.effect.sort || 0));
      }
      context.effects = categories;
    }

    return context;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Interactive Action Handlers
   * ───────────────────────────────────────────────────────────────────────── */

  static async #adjustAmmo(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const delta = Number(target.dataset?.delta || 0);
    if (!delta) return;

    const cur = Number(this.actor.system?.ammunition?.value ?? 0);
    const max = Number(this.actor.system?.ammunition?.max ?? 0);
    const next = Math.max(0, max > 0 ? Math.min(max, cur + delta) : cur + delta);
    await this.actor.update({ "system.ammunition.value": next });
  }

  static async #editImage(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const attr = target.dataset.edit || "img";
    const current = foundry.utils.getProperty(this.actor, attr);
    const fp = new FilePicker({
      type: "image",
      current: current,
      callback: (path) => {
        this.actor.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  static async #createDoc(event, target) {
    event?.preventDefault?.();
    const docClass = target.dataset?.documentClass || "Item";
    const type = target.dataset?.type || "feature";
    const category = target.dataset?.systemCategory || "action";

    const itemData = {
      name: "New Siege Action",
      type,
      img: "icons/svg/sword.svg",
      system: {
        category,
      },
    };
    const created = await this.actor.createEmbeddedDocuments(docClass, [itemData]);
    if (created?.[0]) created[0].sheet?.render(true);
  }

  static async #deleteDoc(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const confirmed = await Dialog.confirm({
      title: "Delete Action",
      content: `<p>Are you sure you want to delete <strong>${item.name}</strong> from this siege engine?</p>`,
    });
    if (confirmed) await item.delete();
  }

  static async #viewDoc(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (item) item.sheet?.render(true);
  }

  static #toggleItemEmbed(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    if (!itemId) return;

    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
    } else {
      this.expandedItems.add(itemId);
    }
    this.render(false);
  }

  static async #rollFeature(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const itemId = target.dataset?.itemId || target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Siege Weapon crit failure is 1–2 per rules
    const critHit = getActorCritHit(this.actor);
    const critFail = 2;

    const bonus = Number(item.system?.attackBonus ?? 0);
    const formula = `1d20 + ${bonus}`;

    const roll = new Roll(formula, this.actor.getRollData());
    await roll.evaluate();

    const d20Term = roll.terms?.find(t => t.faces === 20);
    const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? roll.dice?.[0]?.total;
    const isCrit = typeof d20Result === "number" && d20Result >= critHit;
    const isFumble = typeof d20Result === "number" && d20Result <= critFail;

    const defTarget = item.system?.defenseTarget || item.system?.defense || "ar";
    const defBadgeHTML = defTarget ? renderDefenseTargetBadgeHTML(defTarget) : "";
    const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
    const resultLabel = isCrit ? "CRITICAL HIT" : (isFumble ? "CRITICAL FAILURE (JAMMED / MISFIRE)" : "ATTACK ROLL");

    const content = `
      <div class="mythcraft-statblock siege-attack-card">
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
    const activeRollMode = defaultMode || "publicroll";

    const msgData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${this.actor.name} - ${item.name}`,
      content: content,
      rolls: [roll],
      flags: {
        "mythcraft-essence-sheet": {
          itemId: item.id,
          itemUuid: item.uuid,
          itemName: item.name,
          isSiegeAttack: true,
          critHit,
          critFail,
          isCrit,
          isFumble,
        },
      },
    };

    ChatMessage.applyRollMode(msgData, activeRollMode);
    if (CONST.CHAT_MESSAGE_STYLES) msgData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
    return await ChatMessage.create(msgData, { rollMode: activeRollMode });
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

  static async #createEffect(event, target) {
    event?.preventDefault?.();
    const effectData = {
      name: "New Effect",
      img: "icons/svg/aura.svg",
      origin: this.actor.uuid,
      duration: { rounds: 1 },
    };
    const created = await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    if (created?.[0]) created[0].sheet?.render(true);
  }

  static async #toggleEffect(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectId = target.dataset?.effectId || target.closest("[data-effect-id]")?.dataset?.effectId;
    const effect = this.actor.effects.get(effectId);
    if (effect) await effect.update({ disabled: !effect.disabled });
  }

  static #toggleEffectEmbed(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectId = target.dataset?.effectId || target.closest("[data-effect-id]")?.dataset?.effectId;
    if (!effectId) return;

    if (this.expandedEffects.has(effectId)) {
      this.expandedEffects.delete(effectId);
    } else {
      this.expandedEffects.add(effectId);
    }
    this.render(false);
  }

  static async #editEffect(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectId = target.dataset?.effectId || target.closest("[data-effect-id]")?.dataset?.effectId;
    const effect = this.actor.effects.get(effectId);
    if (effect) effect.sheet?.render(true);
  }

  static #editDamageMod(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    new DamageModificationDialog({ document: this.actor }).render(true);
  }

  static async #deleteEffect(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const effectId = target.dataset?.effectId || target.closest("[data-effect-id]")?.dataset?.effectId;
    const effect = this.actor.effects.get(effectId);
    if (!effect) return;

    const confirmed = await Dialog.confirm({
      title: "Delete Effect",
      content: `<p>Are you sure you want to delete effect <strong>${effect.name}</strong>?</p>`,
    });
    if (confirmed) await effect.delete();
  }
}
