/**
 * mythcraft-essence-sheet | src/features/rest-automation.mjs
 *
 * Core rest automation and recovery mechanics for Catch Breath, Recoup, and Take a Rest.
 */

import { calculateMaxLuckPoints } from "./luck-points.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

/**
 * Executes a rest type on an actor
 * @param {Actor} actor
 * @param {"breath"|"recoup"|"rest"} mode
 * @returns {Promise<{hp: number, sp: number, lp: number, death: number}>}
 */
export async function executeRest(actor, mode = "rest") {
  if (!actor) return null;

  const currentHp = Number(actor.system?.hp?.value ?? 0);
  const maxHp = Number(actor.system?.hp?.max ?? 0);
  const currentSp = Number(actor.system?.sp?.value ?? 0);
  const maxSp = Number(actor.system?.sp?.max ?? 0);
  const currentDeath = Number(actor.system?.death?.value ?? 0);
  const isFatigued = actor.statuses?.has("fatigued");

  const updates = {};
  let chatSummary = "";

  switch (mode) {
    case "breath": {
      // Catch Breath: If at 0 HP, recover to 1 HP
      let newHp = currentHp;
      if (currentHp <= 0) {
        newHp = 1;
        updates["system.hp.value"] = 1;
      }
      // Ends bleeding if active
      if (actor.statuses?.has("bleeding")) {
        try {
          await actor.toggleStatusEffect("bleeding", { active: false });
        } catch (e) {
          console.warn("[MythCraft Essence] Could not toggle bleeding off on breath:", e);
        }
      }
      chatSummary = `<strong>${actor.name}</strong> caught their breath and stabilized${newHp === 1 ? " to 1 HP" : ""}.`;
      break;
    }

    case "recoup": {
      // Recoup: Heals half max HP + END modifier (min 1)
      const endMod = Number(actor.system?.attributes?.end ?? 0);
      const healAmount = Math.max(1, Math.floor(maxHp / 2) + endMod);
      const newHp = Math.min(maxHp, currentHp + healAmount);
      updates["system.hp.value"] = newHp;

      // Reduce 1 Death Point if not Fatigued
      if (!isFatigued && currentDeath > 0) {
        updates["system.death.value"] = Math.max(0, currentDeath - 1);
      }

      // Ends bleeding
      if (actor.statuses?.has("bleeding")) {
        try {
          await actor.toggleStatusEffect("bleeding", { active: false });
        } catch (e) {}
      }

      chatSummary = `<strong>${actor.name}</strong> took a Recoup, regaining <strong>${healAmount} HP</strong> (now ${newHp}/${maxHp})${!isFatigued && currentDeath > 0 ? " and removed 1 Death Point" : ""}.`;
      break;
    }

    case "rest":
    default: {
      // Take a Rest: Full recovery
      updates["system.hp.value"] = maxHp;
      updates["system.sp.value"] = maxSp;
      
      const luckScore = Number(actor.system?.attributes?.luck ?? 0);
      const maxLp = calculateMaxLuckPoints(luckScore);
      updates["system.lp.value"] = maxLp;

      if (!isFatigued) {
        updates["system.death.value"] = 0;
      }

      // Remove Fatigued condition on full rest
      if (isFatigued) {
        try {
          await actor.toggleStatusEffect("fatigued", { active: false });
        } catch (e) {}
      }

      // Remove Bleeding & Burning
      if (actor.statuses?.has("bleeding")) {
        try { await actor.toggleStatusEffect("bleeding", { active: false }); } catch (e) {}
      }
      if (actor.statuses?.has("burning")) {
        try { await actor.toggleStatusEffect("burning", { active: false }); } catch (e) {}
      }

      chatSummary = `<strong>${actor.name}</strong> took a Full Rest, restoring all <strong>HP (${maxHp})</strong>, <strong>SP (${maxSp})</strong>, and <strong>Luck Points (${maxLp})</strong>.`;
      break;
    }
  }

  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
  }

  if (chatSummary) {
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="mythcraft-chat-card rest-card"><i class="fas fa-bed"></i> ${chatSummary}</div>`
    });
  }

  ui.notifications.info(`Completed ${mode.toUpperCase()} for ${actor.name}`);
  return updates;
}

/**
 * Rest Dialog Application for standalone character sheet resting
 */
export class RestDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "essence-rest-dialog",
    classes: ["mythcraft", "essence-dialog", "rest-dialog"],
    tag: "div",
    window: {
      title: "Rest & Recovery",
      icon: "fas fa-bed",
      resizable: false,
    },
    position: { width: 420, height: "auto" },
    actions: {
      doBreath: this.#doBreath,
      doRecoup: this.#doRecoup,
      doRest: this.#doRest,
    },
  };

  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/essence/apps/rest-dialog.hbs",
    },
  };

  get actor() {
    return this.options.document || this.options.actor;
  }

  async _prepareContext(options) {
    const actor = this.actor;
    const currentHp = Number(actor.system?.hp?.value ?? 0);
    const maxHp = Number(actor.system?.hp?.max ?? 0);
    const currentSp = Number(actor.system?.sp?.value ?? 0);
    const maxSp = Number(actor.system?.sp?.max ?? 0);
    const currentLp = Number(actor.system?.lp?.value ?? 0);
    const luckScore = Number(actor.system?.attributes?.luck ?? 0);
    const maxLp = calculateMaxLuckPoints(luckScore);
    const deathPoints = Number(actor.system?.death?.value ?? 0);

    return {
      actor,
      currentHp,
      maxHp,
      currentSp,
      maxSp,
      currentLp,
      maxLp,
      deathPoints,
      isFatigued: actor.statuses?.has("fatigued"),
    };
  }

  static async #doBreath(event, target) {
    await executeRest(this.actor, "breath");
    this.close();
  }

  static async #doRecoup(event, target) {
    await executeRest(this.actor, "recoup");
    this.close();
  }

  static async #doRest(event, target) {
    await executeRest(this.actor, "rest");
    this.close();
  }
}

