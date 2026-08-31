/**
 * mythcraft-essence-sheet | src/features/condition-automation.mjs
 *
 * Automates MythCraft condition lifecycles, active effect normalizations,
 * Bloodied state detection, Rallied suppression, Turn DoT, and Dazed/Stunned AP caps.
 */

import { mcConditions as MythcraftConditions } from "../data/condition-data.mjs";
import { getSetting } from "../settings.mjs";

/**
 * Checks if an ActiveEffect is a MythCraft status condition
 * @param {ActiveEffect} effect
 * @returns {boolean}
 */
export function isMythcraftCondition(effect) {
  if (!effect) return false;
  const effectStatuses = effect.statuses;
  if (!effectStatuses || effectStatuses.size === 0) return false;
  const statusId = effectStatuses.values().next().value;
  return MythcraftConditions.some(c => c.id === statusId);
}

/**
 * Suppress or unsuppress conditions by ID on an actor
 * @param {Actor} actor
 * @param {string[]} conditionIds
 * @param {boolean} disabled
 */
export async function suppressConditions(actor, conditionIds, disabled) {
  for (const id of conditionIds) {
    const effect = actor.effects?.find(e => e.statuses?.has(id));
    if (effect && effect.disabled !== disabled) {
      try {
        await effect.update({ disabled });
      } catch (err) {
        console.warn(`[MythCraft Essence] Could not toggle disabled state for condition ${id}:`, err);
      }
    }
  }
}

/**
 * Apply automated DoT or condition damage to an actor
 * @param {Actor} actor
 * @param {string} formula
 * @param {string} type
 */
export async function applyConditionDamage(actor, formula = "1d4", type = "damage") {
  try {
    const RollClass = globalThis.mythcraft?.rolls?.DamageRoll || Roll;
    const roll = new RollClass(formula);
    await roll.roll();

    const currentHp = Number(actor.system?.hp?.value ?? 0);
    const newHp = Math.max(0, currentHp - roll.total);
    await actor.update({ "system.hp.value": newHp });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="mythcraft-chat-card condition-dot-card"><strong>${actor.name}</strong> suffers <strong>${roll.total}</strong> ${type} damage from active conditions.</div>`
    });
  } catch (err) {
    console.warn(`[MythCraft Essence] Error applying condition damage to ${actor?.name}:`, err);
  }
}

/**
 * Clean up invalid/orphaned status effects on all tokens across scenes
 */
export async function purgeInvalidStatusEffects() {
  if (!game.user?.isGM) return;
  for (const actor of game.actors) {
    const invalidEffects = actor.effects.filter(e => {
      if (!e.statuses || e.statuses.size === 0) return false;
      const statusId = e.statuses.values().next().value;
      return statusId && !MythcraftConditions.some(c => c.id === statusId);
    });
    if (invalidEffects.length > 0) {
      try {
        await actor.deleteEmbeddedDocuments("ActiveEffect", invalidEffects.map(e => e.id));
      } catch (err) {
        console.warn(`[MythCraft Essence] Could not purge invalid effects for ${actor.name}:`, err);
      }
    }
  }
}

/**
 * Initializes all condition automation hooks
 */
export function initConditionAutomation() {

  // 1. Normalize condition effects before creation
  Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
    const statuses = effect.statuses || data.statuses || [];
    const statusArray = Array.isArray(statuses) ? statuses : [...(statuses ?? [])];
    if (statusArray.length === 0) return;

    const statusId = statusArray[0];
    const condition = MythcraftConditions.find(c => c.id === statusId);
    if (!condition) return;

    effect.updateSource({
      statuses: [statusId],
      description: condition.description || effect.description || "",
      img: condition.img,
      icon: condition.img,
    });
  });

  // 2. Rallied Condition Suppression (Creation)
  Hooks.on("createActiveEffect", async (effect, options, userId) => {
    if (game.userId !== userId) return;
    if (!isMythcraftCondition(effect)) return;

    const actor = effect.parent;
    if (!actor) return;

    const conditionId = effect.statuses?.values().next().value;
    if (!conditionId) return;

    if (conditionId === "rallied") {
      await suppressConditions(actor, ["demoralized", "frightened", "shaken"], true);
    }

    if (["demoralized", "frightened", "shaken"].includes(conditionId)) {
      if (actor.statuses?.has("rallied")) {
        await effect.update({ disabled: true });
      }
    }
  });

  // 3. Rallied Condition Unsuppression (Deletion)
  Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
    if (game.userId !== userId) return;
    if (!isMythcraftCondition(effect)) return;

    const actor = effect.parent;
    if (!actor) return;

    const conditionId = effect.statuses?.values().next().value;
    if (conditionId === "rallied") {
      await suppressConditions(actor, ["demoralized", "frightened", "shaken"], false);
    }
  });

  // 4. Rallied Condition Sync (Update)
  Hooks.on("updateActiveEffect", async (effect, changes, options, userId) => {
    if (game.userId !== userId) return;
    if (!isMythcraftCondition(effect)) return;

    if (changes.disabled !== undefined) {
      const actor = effect.parent;
      const conditionId = effect.statuses?.values().next().value;
      if (conditionId === "rallied") {
        await suppressConditions(actor, ["demoralized", "frightened", "shaken"], !changes.disabled);
      }
    }
  });

  // 5. Combat Turn: DoT (Bleeding/Burning) and AP Caps (Dazed/Stunned)
  Hooks.on("updateCombat", async (combat, round, options, userId) => {
    const currentUserId = game.user?.id ?? game.userId;
    if (currentUserId !== userId || !combat.combatant) return;

    const actor = combat.combatant.actor;
    if (!actor || actor.type !== "character") return;

    if (round.turn === undefined && round.round === undefined) return;

    // Dazed: Cap current AP at 3
    const isDazed = actor.statuses?.has("dazed") || actor.effects?.some(e => !e.disabled && e.statuses?.has("dazed"));
    if (isDazed) {
      const currentAP = Number(actor.system.ap?.value ?? 0);
      if (currentAP > 3) {
        await actor.update({ "system.ap.value": 3 });
        ui.notifications.info(`${actor.name} is Dazed (AP capped at 3).`);
      }
    }

    // Stunned: Cap current AP at 1
    const isStunned = actor.statuses?.has("stunned") || actor.effects?.some(e => !e.disabled && e.statuses?.has("stunned"));
    if (isStunned) {
      const currentAP = Number(actor.system.ap?.value ?? 0);
      if (currentAP > 1) {
        await actor.update({ "system.ap.value": 1 });
        ui.notifications.info(`${actor.name} is Stunned (AP capped at 1).`);
      }
    }

    // Previous Combatant: Apply Bleeding / Burning DoT
    const prevTurn = (combat.turn === 0) ? combat.turns.length - 1 : combat.turn - 1;
    const prevCombatant = combat.turns[prevTurn];
    if (!prevCombatant || !prevCombatant.actor) return;

    const prevActor = prevCombatant.actor;

    if (prevActor.statuses?.has("bleeding")) {
      const effect = prevActor.effects?.find(e => e.statuses?.has("bleeding"));
      const damage = effect?.flags?.["mythcraft-essence-sheet"]?.bleedingValue || effect?.flags?.["mythcraft-hud"]?.bleedingValue || "1d4";
      await applyConditionDamage(prevActor, damage, "Bleeding (physical)");
    }

    if (prevActor.statuses?.has("burning")) {
      const effect = prevActor.effects?.find(e => e.statuses?.has("burning"));
      const damage = effect?.flags?.["mythcraft-essence-sheet"]?.burningValue || effect?.flags?.["mythcraft-hud"]?.burningValue || "1d4";
      await applyConditionDamage(prevActor, damage, "Burning (fire)");
    }
  });

  // 6. Bloodied Condition Automatic State Detection
  Hooks.on("updateActor", async (actor, changes, options, userId) => {
    if (game.userId !== userId) return;

    if (changes.system?.hp?.value !== undefined || changes.system?.hp?.max !== undefined) {
      const maxHp = Number(actor.system?.hp?.max ?? 0);
      const currentHp = Number(actor.system?.hp?.value ?? 0);
      const isBloodied = maxHp > 0 && currentHp <= Math.floor(maxHp / 2);
      const hasBloodied = actor.statuses?.has("bloodied");

      if (isBloodied && !hasBloodied) {
        if (actor.toggleStatusEffect) {
          try {
            await actor.toggleStatusEffect("bloodied", { active: true });
          } catch (err) {
            console.warn(`[MythCraft Essence] Could not apply Bloodied condition:`, err);
          }
        }
      } else if (!isBloodied && hasBloodied) {
        if (actor.toggleStatusEffect) {
          try {
            await actor.toggleStatusEffect("bloodied", { active: false });
          } catch (err) {
            console.warn(`[MythCraft Essence] Could not remove Bloodied condition:`, err);
          }
        }
      }
    }
  });
}

