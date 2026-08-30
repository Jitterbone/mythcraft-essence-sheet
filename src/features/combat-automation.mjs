/**
 * mythcraft-essence-sheet | src/features/combat-automation.mjs
 *
 * Full Combat, Turn, Action Point (AP), Spell Point (SP), and Movement Automation.
 * Handles turn-start AP reset + reactive carryover, end-of-combat restoration,
 * movement stride AP deduction & enforcement, and chat message resource consumption.
 */

import { getSetting } from "../settings.mjs";
import { calculateItemAPC, calculateItemSP, deductAp, deductSp } from "./sp-ap-rolls.mjs";

/**
 * In-memory movement stride tracking map (actorId -> remaining unconsumed feet)
 */
const turnMovementTracker = new Map();

/**
 * Resets movement stride tracker for an actor or all actors
 * @param {string} [actorId]
 */
export function resetTurnMovementStride(actorId) {
  if (actorId) {
    turnMovementTracker.delete(actorId);
  } else {
    turnMovementTracker.clear();
  }
}

/**
 * Resolves an actor's walk speed in feet
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorSpeed(actor) {
  if (!actor) return 30;
  const walk = actor.system?.movement?.walk;
  if (typeof walk === "number" && walk > 0) return walk;
  if (typeof walk === "string" && Number(walk) > 0) return Number(walk);

  // Fallback check on string movement
  if (typeof actor.system?.movement === "string") {
    const match = actor.system.movement.match(/(\d+)\s*ft/i);
    if (match) return Number(match[1]);
  }

  return 30; // Default 30 ft
}

/**
 * Measures Euclidean distance between two grid points in feet
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @returns {number} Distance in scene units (feet)
 */
export function measureDistanceBetween(from, to) {
  if (!canvas?.grid || !from || !to) return 0;
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);

  if (canvas.grid.measurePath) {
    const path = canvas.grid.measurePath([from, to]);
    return path?.distance ?? 0;
  }

  const gridSize = canvas.grid.size || 100;
  const gridDistance = canvas.scene?.grid?.distance || 5;
  const pixelDist = Math.hypot(dx, dy);
  return (pixelDist / gridSize) * gridDistance;
}

/**
 * Extracts the item document associated with a chat message
 * @param {ChatMessage} message
 * @param {Actor} actor
 * @returns {Item|null}
 */
export function findItemFromChatMessage(message, actor) {
  if (!actor) return null;

  const flagItemId = message?.flags?.["mythcraft-essence-sheet"]?.itemId ||
                     message?.flags?.["mythcraft-hud"]?.itemId ||
                     message?.flags?.mythcraft?.itemId;
  if (flagItemId) {
    const item = actor.items.get(flagItemId);
    if (item) return item;
  }

  const cardTitle = message?.flavor || "";
  if (cardTitle) {
    const cleanTitle = cardTitle.split(/[(–—:]/)[0].trim().toLowerCase();
    const match = actor.items.find(i => i.name.toLowerCase() === cleanTitle || cleanTitle.includes(i.name.toLowerCase()));
    if (match) return match;
  }

  return null;
}

/**
 * Initializes combat, turn, AP, SP, and movement automation hooks
 */
export function initCombatAutomation() {

  // 1. Turn Start: AP Reset & Reactive AP Carryover (GM only)
  Hooks.on("updateCombat", async (combat, changed, options, userId) => {
    if (!game.user?.isGM) return;
    if (changed.round === undefined && changed.turn === undefined) return;

    // Reset movement strides on turn/round change
    resetTurnMovementStride();

    const turnMode = getSetting("turnAPMode", "auto");
    if (turnMode === "disabled") return;

    const combatant = combat.combatant;
    const actor = combatant?.actor;
    if (!actor || actor.type !== "character") return;

    // Only apply on round 2+ or turn progression forward
    if (combat.round < 1) return;

    const maxAp = Number(actor.system?.ap?.max ?? 4);
    const currentAp = Number(actor.system?.ap?.value ?? 0);
    const level = Number(actor.system?.level?.value ?? actor.system?.level ?? 1);

    // Reactive AP cap: ceil(level / 2) + 1
    const reactiveCap = Math.ceil(level / 2) + 1;
    const carryover = Math.min(Math.max(0, currentAp), reactiveCap);
    const newAp = maxAp + carryover;

    if (turnMode === "prompt") {
      new Dialog({
        title: `Turn Start AP: ${actor.name}`,
        content: `<p>Reset AP for <strong>${actor.name}</strong> to <strong>${newAp} AP</strong> (${maxAp} Max + ${carryover} Reactive Carryover)?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: "Reset AP",
            callback: async () => {
              await actor.update({ "system.ap.value": newAp });
              ui.notifications.info(`Reset AP for ${actor.name} to ${newAp}.`);
            }
          },
          skip: { icon: '<i class="fas fa-times"></i>', label: "Skip" }
        },
        default: "yes"
      }).render(true);
    } else {
      await actor.update({ "system.ap.value": newAp });
      console.log(`[MythCraft Essence] Turn start: ${actor.name} AP reset to ${newAp} (${maxAp} + ${carryover} carryover).`);
    }
  });

  // 2. Combat End: Restore Full AP to All Player Characters
  Hooks.on("deleteCombat", async (combat, options, userId) => {
    if (!game.user?.isGM) return;
    resetTurnMovementStride();

    for (const actor of game.actors.filter(a => a.type === "character")) {
      const maxAp = Number(actor.system?.ap?.max ?? 4);
      if (Number(actor.system?.ap?.value ?? 0) !== maxAp) {
        try {
          await actor.update({ "system.ap.value": maxAp });
        } catch (err) {
          console.warn(`[MythCraft Essence] Error restoring AP for ${actor.name} on combat delete:`, err);
        }
      }
    }
  });

  // 3. Movement AP Enforcement (preUpdateToken)
  Hooks.on("preUpdateToken", (tokenDoc, changes, options, userId) => {
    if (changes.x === undefined && changes.y === undefined) return;
    if (!game.combat?.started) return;

    const actor = tokenDoc.actor;
    if (!actor || actor.type !== "character") return;

    const apBehavior = getSetting("insufficientApBehavior", "confirm");
    if (apBehavior === "disabled") return;

    const from = { x: tokenDoc.x, y: tokenDoc.y };
    const to = { x: changes.x ?? tokenDoc.x, y: changes.y ?? tokenDoc.y };
    const dist = measureDistanceBetween(from, to);
    if (dist <= 0) return;

    const speed = getActorSpeed(actor);
    const strideFeet = Math.max(5, speed);
    const existingUnused = turnMovementTracker.get(actor.id) || 0;
    const totalDist = dist + existingUnused;
    const stridesNeeded = Math.floor(totalDist / strideFeet);

    if (stridesNeeded > 0) {
      const availableAp = Number(actor.system?.ap?.value ?? 0) + Number(actor.system?.sap?.value ?? 0);
      if (availableAp < stridesNeeded && apBehavior === "block") {
        ui.notifications.error(`[Movement Blocked] ${actor.name} does not have enough AP to move ${dist} ft (${stridesNeeded} AP needed, ${availableAp} available).`);
        return false;
      }
    }

    // Attach calculated distance for updateToken hook
    options._mythcraftMoveDist = dist;
  });

  // 4. Movement AP Deduction (updateToken)
  Hooks.on("updateToken", async (tokenDoc, changes, options, userId) => {
    if (game.userId !== userId) return;
    if (!game.combat?.started) return;

    const dist = options._mythcraftMoveDist;
    if (!dist || dist <= 0) return;

    const actor = tokenDoc.actor;
    if (!actor || actor.type !== "character") return;

    const moveMode = getSetting("movementAPMode", "auto");
    if (moveMode === "disabled") return;

    const speed = getActorSpeed(actor);
    const strideFeet = Math.max(5, speed);
    const prevUnused = turnMovementTracker.get(actor.id) || 0;
    const totalFeet = dist + prevUnused;
    const strides = Math.floor(totalFeet / strideFeet);
    const remainderFeet = totalFeet % strideFeet;

    turnMovementTracker.set(actor.id, remainderFeet);

    if (strides > 0) {
      if (moveMode === "prompt") {
        new Dialog({
          title: `Movement AP: ${actor.name}`,
          content: `<p><strong>${actor.name}</strong> moved <strong>${dist} ft</strong> (${strides} stride${strides > 1 ? "s" : ""}). Deduct <strong>${strides} AP</strong>?</p>`,
          buttons: {
            yes: {
              icon: '<i class="fas fa-check"></i>',
              label: `Deduct ${strides} AP`,
              callback: () => deductAp(actor, strides)
            },
            skip: { icon: '<i class="fas fa-times"></i>', label: "Skip" }
          },
          default: "yes"
        }).render(true);
      } else {
        await deductAp(actor, strides);
      }
    }
  });

  // 5. Chat Message SP & Attack AP Automation (createChatMessage)
  Hooks.on("createChatMessage", async (message, options, userId) => {
    if (game.userId !== userId) return;

    const actorId = message.speaker?.actor;
    const actor = actorId ? game.actors.get(actorId) : null;
    if (!actor || actor.type !== "character") return;

    const item = findItemFromChatMessage(message, actor);
    if (!item) return;

    // A. SP Deduction for Spells
    const spCost = calculateItemSP(item);
    const spellMode = getSetting("spellSPMode", "auto");
    if (spCost > 0 && spellMode !== "disabled") {
      // Check if SP was already deducted by unified action
      if (!message.flags?.["mythcraft-essence-sheet"]?.spDeducted) {
        if (spellMode === "prompt") {
          new Dialog({
            title: `Cast ${item.name}`,
            content: `<p>Deduct <strong>${spCost} SP</strong> from <strong>${actor.name}</strong>?</p>`,
            buttons: {
              yes: {
                icon: '<i class="fas fa-check"></i>',
                label: `Deduct ${spCost} SP`,
                callback: () => deductSp(actor, spCost)
              },
              skip: { icon: '<i class="fas fa-times"></i>', label: "Skip" }
            },
            default: "yes"
          }).render(true);
        } else {
          await deductSp(actor, spCost);
        }
      }
    }

    // B. Combat Attack AP Deduction
    if (game.combat?.started) {
      const apCost = calculateItemAPC(item, actor);
      const attackMode = getSetting("attackAPMode", "auto");
      if (apCost > 0 && attackMode !== "disabled") {
        if (!message.flags?.["mythcraft-essence-sheet"]?.apDeducted) {
          if (attackMode === "prompt") {
            new Dialog({
              title: `Action: ${item.name}`,
              content: `<p>Deduct <strong>${apCost} AP</strong> from <strong>${actor.name}</strong>?</p>`,
              buttons: {
                yes: {
                  icon: '<i class="fas fa-check"></i>',
                  label: `Deduct ${apCost} AP`,
                  callback: () => deductAp(actor, apCost)
                },
                skip: { icon: '<i class="fas fa-times"></i>', label: "Skip" }
              },
              default: "yes"
            }).render(true);
          } else {
            await deductAp(actor, apCost);
          }
        }
      }
    }
  });
}

