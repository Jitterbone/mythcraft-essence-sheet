/**
 * mythcraft-essence-sheet | src/apps/talent-skill-dialog.mjs
 *
 * Interactive Dialog (ApplicationV2) for allocating talent-granted skill points
 * to matching skill categories, attributes, or skill tags.
 * Automates the resulting bonuses into native ActiveEffects.
 */

import { getTalentSkillPointGrant, normalizeSkillKey } from "../data/talent-skill-grants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "mythcraft-essence-sheet";

export default class TalentSkillAllocationDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} options
   * @param {Actor} options.actor
   * @param {Item} options.item
   * @param {object} [options.grant]
   * @param {Function} [options.resolve]
   */
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.item = options.item;
    this.grant = options.grant || getTalentSkillPointGrant(this.item) || {
      talentName: this.item?.name || "Talent",
      points: 3,
      label: "Skill Points",
      skills: [],
    };

    // Pre-populate existing allocation from item flags if already saved
    const existing = this.item?.flags?.[MODULE_ID]?.skillAllocation || {};
    this.allocated = { ...existing };
    this._resolve = options.resolve || (() => {});
  }

  static DEFAULT_OPTIONS = {
    id: "mythcraft-talent-skill-dialog",
    classes: ["mythcraft-essence", "talent-skill-dialog-window"],
    tag: "div",
    window: {
      title: "MythCraft — Skill Points Allocation",
      icon: "fa-solid fa-graduation-cap",
      resizable: true,
    },
    position: {
      width: 680,
      height: "auto",
    },
    actions: {
      increaseSkill: TalentSkillAllocationDialog.#onIncreaseSkill,
      decreaseSkill: TalentSkillAllocationDialog.#onDecreaseSkill,
      resetPoints: TalentSkillAllocationDialog.#onResetPoints,
      confirmAllocation: TalentSkillAllocationDialog.#onConfirmAllocation,
      cancelAllocation: TalentSkillAllocationDialog.#onCancelAllocation,
    },
  };

  static PARTS = {
    content: {
      template: "modules/mythcraft-essence-sheet/templates/apps/talent-skill-dialog.hbs",
    },
  };

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = (await super._prepareContext(options)) || {};

    const totalPoints = Number(this.grant.points) || 1;
    const spentPoints = Object.values(this.allocated).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const remainingPoints = Math.max(0, totalPoints - spentPoints);
    const isComplete = remainingPoints === 0;

    const formatSign = (val) => {
      const n = Number(val) || 0;
      return n >= 0 ? `+${n}` : `${n}`;
    };

    const actorSkills = this.actor?.system?.skills || {};

    const skills = (this.grant.skills || []).map(sk => {
      const skKey = sk.key || normalizeSkillKey(sk.name);
      const sData = actorSkills[skKey]
        || actorSkills[skKey.toLowerCase()]
        || actorSkills[sk.name?.toLowerCase()]
        || {};

      const currentScore = typeof sData === "number" ? sData : (Number(sData.bonus ?? sData.value ?? 0));
      const allocatedPts = Number(this.allocated[skKey] || 0);
      const newScore = currentScore + allocatedPts;

      return {
        name: sk.name,
        key: skKey,
        attribute: sk.attribute || "INT",
        category: sk.category || "General",
        currentScore,
        currentDisplay: formatSign(currentScore),
        allocated: allocatedPts,
        newScore,
        newDisplay: formatSign(newScore),
        canIncrease: remainingPoints > 0,
        canDecrease: allocatedPts > 0,
      };
    });

    context.talentName = this.item?.name || this.grant.talentName || "Talent";
    context.talentImg = this.item?.img || "icons/svg/book.svg";
    context.grantLabel = this.grant.label;
    context.totalPoints = totalPoints;
    context.spentPoints = spentPoints;
    context.remainingPoints = remainingPoints;
    context.isComplete = isComplete;
    context.hasSpent = spentPoints > 0;
    context.skills = skills;

    return context;
  }

  /**
   * Action handler: Increase points on a specific skill.
   */
  static #onIncreaseSkill(event, target) {
    const btn = target.closest("[data-skill-key]");
    const key = btn?.dataset?.skillKey;
    if (!key) return;

    const totalPoints = Number(this.grant.points) || 1;
    const spentPoints = Object.values(this.allocated).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (spentPoints >= totalPoints) return;

    this.allocated[key] = (Number(this.allocated[key]) || 0) + 1;
    this.render();
  }

  /**
   * Action handler: Decrease points on a specific skill.
   */
  static #onDecreaseSkill(event, target) {
    const btn = target.closest("[data-skill-key]");
    const key = btn?.dataset?.skillKey;
    if (!key) return;

    const cur = Number(this.allocated[key]) || 0;
    if (cur <= 0) return;

    if (cur === 1) {
      delete this.allocated[key];
    } else {
      this.allocated[key] = cur - 1;
    }
    this.render();
  }

  /**
   * Action handler: Reset all allocated points.
   */
  static #onResetPoints(event, target) {
    this.allocated = {};
    this.render();
  }

  /**
   * Action handler: Confirm allocation, save to item flags, and build ActiveEffect.
   */
  static async #onConfirmAllocation(event, target) {
    const spentPoints = Object.values(this.allocated).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (spentPoints === 0) {
      ui.notifications?.warn("Please allocate at least 1 skill point before confirming.");
      return;
    }

    try {
      // 1. Save allocation to item flags
      await this.item.update({
        [`flags.${MODULE_ID}.skillAllocation`]: this.allocated,
      });

      // 2. Automate ActiveEffect for skill bonuses
      await applySkillAllocationActiveEffect(this.actor, this.item, this.allocated);

      const count = Object.keys(this.allocated).length;
      ui.notifications?.info(`Allocated ${spentPoints} skill point(s) across ${count} skill(s) for ${this.item.name}!`);
    } catch (err) {
      console.error(`${MODULE_ID} | Error saving skill allocation:`, err);
      ui.notifications?.error("Failed to save skill point allocation.");
    }

    this._resolve({ confirmed: true, allocated: this.allocated });
    await this.close();
  }

  /**
   * Action handler: Cancel allocation dialog.
   */
  static async #onCancelAllocation(event, target) {
    this._resolve({ confirmed: false, allocated: null });
    await this.close();
  }

  /**
   * Prompts the skill allocation dialog for a talent item.
   * @param {Actor} actor
   * @param {Item} item
   * @param {object} [grant]
   * @returns {Promise<{ confirmed: boolean, allocated: object|null }>}
   */
  static promptAllocation(actor, item, grant = null) {
    return new Promise((resolve) => {
      const dialog = new TalentSkillAllocationDialog({
        actor,
        item,
        grant: grant || getTalentSkillPointGrant(item),
        resolve,
      });
      dialog.render({ force: true });
    });
  }
}

/**
 * Automates the skill allocation into an ActiveEffect on the Actor or Item.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} allocatedMap - { [skillKey]: points }
 */
export async function applySkillAllocationActiveEffect(actor, item, allocatedMap) {
  if (!actor || !item) return;

  const changes = [];
  for (const [skKey, pts] of Object.entries(allocatedMap || {})) {
    const num = Number(pts) || 0;
    if (num > 0) {
      changes.push({
        key: `system.skills.${skKey}.bonus`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: String(num),
      });
    }
  }

  if (changes.length === 0) return;

  const effectData = {
    name: `${item.name}: Skill Allocation`,
    img: item.img || "icons/svg/book.svg",
    origin: item.uuid,
    transfer: true,
    disabled: false,
    changes,
    flags: {
      [MODULE_ID]: {
        isCanonicalTalentEffect: true,
        isSkillAllocationEffect: true,
        sourceItemUuid: item.uuid,
        canonicalTalentId: item.flags?.[MODULE_ID]?.canonicalTalentId || item.id,
        allocatedSkills: { ...allocatedMap },
      },
    },
  };

  // Check if an existing skill allocation effect exists on item or actor
  const existingItemEffect = (item.effects || []).find(e =>
    e.flags?.[MODULE_ID]?.isSkillAllocationEffect
    || (e.name && e.name.includes(`${item.name}: Skill Allocation`))
  );

  if (existingItemEffect) {
    await existingItemEffect.update({ changes, flags: effectData.flags });
  } else {
    await item.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  // Also update or sync any existing embedded effects on actor
  const parentActor = actor || item.parent || item.actor;
  if (parentActor) {
    const staleActorEffects = (parentActor.effects || []).filter(e =>
      e.flags?.[MODULE_ID]?.isSkillAllocationEffect
      && (e.flags?.[MODULE_ID]?.sourceItemUuid === item.uuid || e.name === effectData.name)
    );
    for (const eff of staleActorEffects) {
      await eff.update({ changes, flags: effectData.flags });
    }

    try {
      parentActor.prepareData?.();
    } catch (_) {}

    for (const app of Object.values(ui.windows || {})) {
      if (app.actor?.id === parentActor.id) {
        app.render?.(false);
      }
    }
  }
}
