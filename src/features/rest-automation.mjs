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
 * @returns {Promise<string[]>}
 */
export async function executeRest(actor, mode = "rest") {
  if (!actor) return [];

  const currentHp = Number(actor.system?.hp?.value ?? 0);
  const maxHp = Number(actor.system?.hp?.max ?? 0);
  const currentSp = Number(actor.system?.sp?.value ?? 0);
  const maxSp = Number(actor.system?.sp?.max ?? 0);
  const currentDeath = Number(actor.system?.death?.value ?? 0);
  const deathMax = Number(actor.system?.death?.max || Math.max(1, (actor.system?.attributes?.end ?? 0) + 8));
  const isFatigued = Boolean(
    actor.statuses?.has("fatigued") ||
    actor.effects?.some(e => !e.disabled && (e.statuses?.has("fatigued") || e.name?.toLowerCase() === "fatigued"))
  );

  const updates = {};
  const changes = [];
  let chatSummary = "";

  // Helper to reset feature uses on actor items
  const resetFeatureUses = async (matchPeriods = []) => {
    const periodSet = new Set(matchPeriods.map(p => p.toLowerCase()));
    let count = 0;
    for (const item of actor.items) {
      const uses = item.system?.uses;
      if (!uses || !uses.spent || uses.spent <= 0) continue;
      const recharge = String(uses.recharge || "").toLowerCase().trim();
      if (!recharge || periodSet.has(recharge) || periodSet.has("all")) {
        try {
          await item.update({ "system.uses.spent": 0 });
          count++;
        } catch (e) {
          console.warn(`[MythCraft Essence] Failed resetting uses for item ${item.name}:`, e);
        }
      }
    }
    return count;
  };

  switch (mode) {
    case "breath": {
      // Catch your Breath (5 Minutes)
      // "If you are at 0 HP when you begin Catch your Breath, you do not gain Death Points during that time, and you regain 1 HP at the end of the 5 minutes."
      let stabilized = false;
      if (currentHp <= 0) {
        updates["system.hp.value"] = 1;
        stabilized = true;
        changes.push("Regained 1 HP (stabilized from 0 HP)");
      } else {
        changes.push(`Caught Breath (HP remains ${currentHp}/${maxHp})`);
      }

      // Ends bleeding if active
      if (actor.statuses?.has("bleeding") || actor.effects?.some(e => !e.disabled && (e.statuses?.has("bleeding") || e.name?.toLowerCase() === "bleeding"))) {
        try {
          await actor.toggleStatusEffect("bleeding", { active: false });
          changes.push("Ended Bleeding condition");
        } catch (e) {
          console.warn("[MythCraft Essence] Could not toggle bleeding off on breath:", e);
        }
      }

      // Reset uses for features that recharge on Catch your Breath / encounter
      const resetCount = await resetFeatureUses(["breath", "catch your breath", "encounter", "round", "turn"]);
      if (resetCount > 0) {
        changes.push(`Reset uses for ${resetCount} ability/item(s)`);
      }

      chatSummary = `<strong>${actor.name}</strong> caught their breath (5 minutes)${stabilized ? ", stabilizing to <strong>1 HP</strong>" : ""}.`;
      break;
    }

    case "recoup": {
      // Recoup (1 Hour)
      // "If you are Bloodied when you Recoup, then you regain up to 1/4 of your max HP. However, when you regain HP in this way, you do not regain HP that would cause you to remove the Bloodied condition."
      // "When you Recoup, you also remove 1 Death Point."
      // "Recouping assumes that you have time to Catch your Breath, allowing you to regain any abilities that would necessitate Catching your Breath."

      // 1. Catch Breath first if at 0 HP (stabilize to 1 HP)
      let effectiveHp = currentHp;
      if (effectiveHp <= 0) {
        effectiveHp = 1;
        updates["system.hp.value"] = 1;
        changes.push("Stabilized to 1 HP (Catch your Breath)");
      }

      // 2. Bloodied check: Bloodied threshold = floor(maxHp / 2)
      const bloodiedThreshold = Math.floor(maxHp / 2);
      const isBloodied = effectiveHp <= bloodiedThreshold;

      if (isBloodied && maxHp > 0) {
        // Regain up to 1/4 max HP (at least 1 if maxHp > 0)
        const maxHeal = Math.max(1, Math.floor(maxHp / 4));
        // Cannot exceed bloodied threshold
        const targetHp = Math.min(bloodiedThreshold, effectiveHp + maxHeal);
        const actualHeal = Math.max(0, targetHp - effectiveHp);
        const finalHp = effectiveHp + actualHeal;

        if (actualHeal > 0) {
          updates["system.hp.value"] = finalHp;
          changes.push(`Regained ${actualHeal} HP (Bloodied Recoup, now ${finalHp}/${maxHp})`);
        } else {
          changes.push(`Already at Bloodied threshold (${effectiveHp}/${maxHp} HP; cannot un-bloody via Recoup)`);
        }
      } else {
        changes.push(`Not Bloodied (${effectiveHp}/${maxHp} HP, 0 HP gained from Recoup)`);
      }

      // 3. Remove 1 Death Point (if not Fatigued)
      if (isFatigued) {
        changes.push(`Fatigued: Cannot remove Death Points during Recoup (${currentDeath}/${deathMax} DP retained)`);
      } else if (currentDeath > 0) {
        const newDeath = Math.max(0, currentDeath - 1);
        updates["system.death.value"] = newDeath;
        changes.push(`Removed 1 Death Point (now ${newDeath}/${deathMax})`);
      }

      // 4. End Bleeding condition
      if (actor.statuses?.has("bleeding") || actor.effects?.some(e => !e.disabled && (e.statuses?.has("bleeding") || e.name?.toLowerCase() === "bleeding"))) {
        try {
          await actor.toggleStatusEffect("bleeding", { active: false });
          changes.push("Ended Bleeding condition");
        } catch (e) {}
      }

      // 5. Reset uses for features that recharge on Recoup, Breath, or Encounter
      const resetCount = await resetFeatureUses(["recoup", "short", "breath", "catch your breath", "encounter", "round", "turn"]);
      if (resetCount > 0) {
        changes.push(`Reset uses for ${resetCount} ability/item(s)`);
      }

      chatSummary = `<strong>${actor.name}</strong> took a Recoup (1 hour).`;
      break;
    }

    case "rest":
    default: {
      // Take a Rest (8 Hours)
      // "You regain all of your HP and SP after you Take a Rest and remove all of your Death Points. If you have Fatigue, you remove the Fatigued condition instead of removing your Death Points."
      // "Taking a Rest assumes that you both Catch your Breath and Recoup, gaining those benefits as well when you Take a Rest."

      // 1. Full HP & SP recovery
      updates["system.hp.value"] = maxHp;
      updates["system.sp.value"] = maxSp;
      changes.push(`Restored all HP (${maxHp}/${maxHp})`);
      changes.push(`Restored all SP (${maxSp}/${maxSp})`);

      // 2. Full Luck Points recovery
      const luckScore = Number(actor.system?.attributes?.luck ?? 0);
      const maxLp = calculateMaxLuckPoints(luckScore);
      updates["system.lp.value"] = maxLp;
      changes.push(`Restored all Luck Points (${maxLp}/${maxLp})`);

      // 3. Reset Soul Damage on Actor
      updates["flags.mythcraft-essence-sheet.soulDamage"] = 0;
      updates["system.soulDamage"] = 0;
      const currentSoul = Number(actor.flags?.["mythcraft-essence-sheet"]?.soulDamage ?? actor.system?.soulDamage ?? 0);
      if (currentSoul > 0) {
        changes.push("Cleared Soul Damage");
      }

      // 4. Reset Consumed / Claimed Souls on all owned weapons
      const weaponItems = actor.itemTypes?.weapon || actor.items.filter(i => i.type === "weapon");
      let resetSoulsCount = 0;
      for (const w of weaponItems) {
        const hasClaimed = Boolean(
          w.flags?.["mythcraft-essence-sheet"]?.enableClaimedSouls ||
          w.flags?.["mythcraft-essence-sheet"]?.enableConsumedSouls ||
          w.system?.enableClaimedSouls ||
          w.system?.enableConsumedSouls
        );
        const souls = Number(
          w.flags?.["mythcraft-essence-sheet"]?.consumedSouls ??
          w.flags?.["mythcraft-essence-sheet"]?.claimedSouls ??
          w.system?.consumedSouls ??
          w.system?.claimedSouls ??
          0
        );
        if (hasClaimed || souls > 0) {
          await w.update({
            "flags.mythcraft-essence-sheet.claimedSouls": 0,
            "flags.mythcraft-essence-sheet.consumedSouls": 0,
            "system.claimedSouls": 0,
            "system.consumedSouls": 0,
          });
          resetSoulsCount++;
        }
      }
      if (resetSoulsCount > 0) {
        changes.push("Reset weapon Consumed Souls to 0");
      }

      // 5. Fatigue & Death Points
      // "If you have Fatigue, you remove the Fatigued condition instead of removing your Death Points."
      if (isFatigued) {
        try {
          await actor.toggleStatusEffect("fatigued", { active: false });
          const fatEffect = actor.effects?.find(e => e.statuses?.has("fatigued") || e.name?.toLowerCase() === "fatigued");
          if (fatEffect) await fatEffect.delete();
          changes.push(`Removed Fatigued condition (Death Points retained: ${currentDeath}/${deathMax})`);
        } catch (e) {
          console.warn("[MythCraft Essence] Could not remove Fatigued condition:", e);
        }
      } else {
        if (currentDeath > 0) {
          updates["system.death.value"] = 0;
          changes.push(`Removed all Death Points (was ${currentDeath})`);
        }
      }

      // 6. Remove Bleeding & Burning
      if (actor.statuses?.has("bleeding") || actor.effects?.some(e => !e.disabled && (e.statuses?.has("bleeding") || e.name?.toLowerCase() === "bleeding"))) {
        try { await actor.toggleStatusEffect("bleeding", { active: false }); changes.push("Ended Bleeding condition"); } catch (e) {}
      }
      if (actor.statuses?.has("burning") || actor.effects?.some(e => !e.disabled && (e.statuses?.has("burning") || e.name?.toLowerCase() === "burning"))) {
        try { await actor.toggleStatusEffect("burning", { active: false }); changes.push("Ended Burning condition"); } catch (e) {}
      }

      // 7. Reset all feature/item uses
      const resetCount = await resetFeatureUses(["all", "rest", "long", "day", "recoup", "short", "breath", "catch your breath", "encounter", "round", "turn"]);
      if (resetCount > 0) {
        changes.push(`Reset uses for ${resetCount} ability/item(s)`);
      }

      chatSummary = `<strong>${actor.name}</strong> took a Rest (8 Hours).`;
      break;
    }
  }

  if (Object.keys(updates).length > 0) {
    await actor.update(updates);
  }

  // Attach updates to changes array object for compatibility
  changes.updates = updates;

  // Call system / module hook
  Hooks.callAll("mythcraft.rest", actor, mode, changes);

  if (chatSummary) {
    let listHTML = "";
    if (changes.length > 0) {
      listHTML = `<ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 0.9em; line-height: 1.4;">${changes.map(c => `<li>${c}</li>`).join("")}</ul>`;
    }
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="mythcraft-chat-card rest-card" style="border: 1px solid #246975; background: #0c1419; padding: 8px 12px; border-radius: 6px; color: #d3c4a3;"><div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #FEEBB3;"><i class="fas fa-bed"></i> <span>${chatSummary}</span></div>${listHTML}</div>`
    });
  }

  ui.notifications.info(`Completed ${mode === "breath" ? "Catch Breath" : (mode === "recoup" ? "Recoup" : "Take a Rest")} for ${actor.name}`);
  return changes;
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

