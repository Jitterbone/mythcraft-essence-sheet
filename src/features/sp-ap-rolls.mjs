/**
 * mythcraft-essence-sheet | src/features/sp-ap-rolls.mjs
 *
 * Universal action execution, attack rolling, spell casting, AP/SP enforcement,
 * tactical modifier calculation, and resource deduction.
 */

import { getSetting } from "../settings.mjs";
import { getActorCritHit } from "./luck-points.mjs";

/**
 * Evaluates an APC formula string (e.g. "8-STR, min 4", "5-DEX", "3")
 * @param {string} formula
 * @param {Actor} actor
 * @returns {number}
 */
export function evaluateApcFormula(formula, actor) {
  if (!formula || typeof formula !== "string") return 3;
  let cleanFormula = formula.trim();

  const minMatch = cleanFormula.match(/^(.*?)[,\s]+min\s+(\d+)$/i);
  if (minMatch) {
    cleanFormula = `Math.max(${minMatch[1]}, ${minMatch[2]})`;
  }
  const maxMatch = cleanFormula.match(/^(.*?)[,\s]+max\s+(\d+)$/i);
  if (maxMatch) {
    cleanFormula = `Math.min(${maxMatch[1]}, ${maxMatch[2]})`;
  }

  const attrs = ["str", "dex", "end", "con", "int", "awa", "per", "wis", "cha", "luck", "agi", "cor", "san"];
  for (const attr of attrs) {
    const val = Number(actor?.system?.attributes?.[attr]?.value ?? actor?.system?.attributes?.[attr] ?? 0);
    const reg = new RegExp(`@?${attr}\\b`, 'gi');
    cleanFormula = cleanFormula.replace(reg, val);
  }

  cleanFormula = cleanFormula.replace(/max\(/g, "Math.max(").replace(/min\(/g, "Math.min(");

  try {
    const evalFunc = new Function('return ' + cleanFormula);
    const res = Number(evalFunc());
    if (Number.isFinite(res) && res >= 0) return res;
  } catch (err) {
    return 3;
  }
  return 3;
}

/**
 * Calculates effective APC for an item
 * @param {Item} item
 * @param {Actor} actor
 * @param {object} [options={}]
 * @returns {number}
 */
export function calculateItemAPC(item, actor, options = {}) {
  if (!item) return 0;

  const rawApc = item._source?.system?.apc ?? item.system?._source?.apc;
  if (typeof rawApc === "number" && !isNaN(rawApc) && rawApc > 0) {
    return Number(rawApc);
  }

  const rawFormula = item.system?.apcFormula || item._source?.system?.apcFormula || item.system?.apc_formula || "";
  if (rawFormula && typeof rawFormula === "string" && rawFormula.trim()) {
    return evaluateApcFormula(rawFormula, actor);
  }

  const direct = item.system?.apc;
  if (typeof direct === "number" && !isNaN(direct) && direct >= 0) {
    return Number(direct);
  }

  return 0;
}

/**
 * Calculates SP cost for a spell or feature
 * @param {Item} item
 * @returns {number}
 */
export function calculateItemSP(item) {
  if (!item) return 0;
  return Number(
    item.system?.spc ??
    item.system?.spCost ??
    item.system?.sp ??
    item.system?.cost ??
    0
  );
}

/**
 * Checks and enforces AP sufficiency for an actor
 * @param {Actor} actor
 * @param {number} cost
 * @param {object} [options={}]
 * @returns {Promise<boolean>}
 */
export async function checkAndEnforceAp(actor, cost, options = {}) {
  if (!actor || cost <= 0) return true;
  if (actor.type === "npc") return true; // NPCs are exempt

  const behavior = getSetting("insufficientApBehavior", "confirm");
  if (behavior === "disabled") return true;

  const currentAp = Number(actor.system?.ap?.value ?? 0);
  const currentSap = Number(actor.system?.sap?.value ?? 0);
  const availableAp = currentAp + currentSap;

  if (availableAp >= cost) return true;

  const shortage = cost - availableAp;
  const msg = `${actor.name} has only ${availableAp} AP (needs ${cost}, short by ${shortage}).`;

  if (behavior === "block") {
    ui.notifications.error(`[Insufficient AP] ${msg} Action blocked.`);
    return false;
  }

  if (behavior === "warn") {
    ui.notifications.warn(`[AP Warning] ${msg}`);
    return true;
  }

  // Default: Confirm dialog
  return new Promise((resolve) => {
    new Dialog({
      title: "Insufficient Action Points",
      content: `<p><strong>${actor.name}</strong> only has <strong>${availableAp} AP</strong> available, but this action costs <strong>${cost} AP</strong> (short by ${shortage} AP).</p><p>Do you want to proceed anyway?</p>`,
      buttons: {
        proceed: {
          icon: '<i class="fas fa-check"></i>',
          label: "Proceed Anyway",
          callback: () => resolve(true),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel Action",
          callback: () => resolve(false),
        },
      },
      default: "cancel",
      close: () => resolve(false),
    }).render(true);
  });
}

/**
 * Checks and enforces SP sufficiency for an actor
 * @param {Actor} actor
 * @param {number} cost
 * @returns {Promise<boolean>}
 */
export async function checkAndEnforceSp(actor, cost) {
  if (!actor || cost <= 0) return true;
  if (actor.type === "npc") return true;

  const enforce = getSetting("enforceSP", true);
  if (!enforce) return true;

  const currentSp = Number(actor.system?.sp?.value ?? 0);
  if (currentSp >= cost) return true;

  const shortage = cost - currentSp;
  const msg = `${actor.name} only has ${currentSp} SP (needs ${cost}, short by ${shortage}).`;

  return new Promise((resolve) => {
    new Dialog({
      title: "Insufficient Spell Points",
      content: `<p><strong>${actor.name}</strong> has <strong>${currentSp} SP</strong> available, but this spell costs <strong>${cost} SP</strong>.</p><p>Cast anyway?</p>`,
      buttons: {
        proceed: {
          icon: '<i class="fas fa-check"></i>',
          label: "Cast Anyway",
          callback: () => resolve(true),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel Spell",
          callback: () => resolve(false),
        },
      },
      default: "cancel",
      close: () => resolve(false),
    }).render(true);
  });
}

/**
 * Deducts AP from an actor
 * @param {Actor} actor
 * @param {number} cost
 * @returns {Promise<number>} Remaining AP
 */
export async function deductAp(actor, cost) {
  if (!actor || cost <= 0) return Number(actor?.system?.ap?.value ?? 0);

  const currentAp = Number(actor.system?.ap?.value ?? 0);
  const currentSap = Number(actor.system?.sap?.value ?? 0);

  let newAp = currentAp;
  let newSap = currentSap;

  // Use regular AP first, then SAP
  if (newAp >= cost) {
    newAp -= cost;
  } else {
    const remainder = cost - newAp;
    newAp = 0;
    newSap = Math.max(0, newSap - remainder);
  }

  const updates = { "system.ap.value": newAp };
  if (actor.system?.sap !== undefined) updates["system.sap.value"] = newSap;

  await actor.update(updates);
  return newAp;
}

/**
 * Deducts SP from an actor
 * @param {Actor} actor
 * @param {number} cost
 * @returns {Promise<number>} Remaining SP
 */
export async function deductSp(actor, cost) {
  if (!actor || cost <= 0) return Number(actor?.system?.sp?.value ?? 0);

  const currentSp = Number(actor.system?.sp?.value ?? 0);
  const newSp = Math.max(0, currentSp - cost);
  await actor.update({ "system.sp.value": newSp });
  return newSp;
}

/**
 * Refunds SP to an actor
 * @param {Actor} actor
 * @param {number} amount
 */
export async function refundSP(actor, amount) {
  if (!actor || amount <= 0) return;
  const currentSp = Number(actor.system?.sp?.value ?? 0);
  const maxSp = Number(actor.system?.sp?.max ?? 0);
  const newSp = Math.min(maxSp, currentSp + amount);
  await actor.update({ "system.sp.value": newSp });
  ui.notifications.info(`Refunded ${amount} SP to ${actor.name} (now ${newSp}/${maxSp}).`);
}

/**
 * Executes a full unified action roll (weapon attack, spell, feature check)
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} [options={}]
 */
export async function executeUnifiedAction(actor, item, options = {}) {
  if (!actor || !item) return;

  const isCombat = !!game.combat?.started;
  const apCost = calculateItemAPC(item, actor, options);
  const spCost = calculateItemSP(item);

  // 1. Check AP & SP
  const canAp = isCombat ? await checkAndEnforceAp(actor, apCost, options) : true;
  if (!canAp) return;

  const canSp = await checkAndEnforceSp(actor, spCost);
  if (!canSp) return;

  // 2. Determine Attack / Roll formula
  const attrKey = (item.system?.attr || item.system?.attribute || "").toLowerCase().trim();
  const attrMod = attrKey ? Number(actor.system?.attributes?.[attrKey] ?? 0) : 0;
  const attackBonus = Number(item.system?.attackBonus ?? item.system?.toHit ?? item.system?.bonus ?? 0);

  const totalMod = attrMod + attackBonus;
  const formula = totalMod !== 0 ? `1d20 + ${totalMod}` : "1d20";

  const RollClass = globalThis.mythcraft?.rolls?.AttributeRoll || Roll;
  const roll = new RollClass(formula, {}, {
    attribute: attrKey,
    flavor: `${item.name} Attack Roll`,
  });

  await roll.roll();

  // 3. Deduct resources
  const attackMode = getSetting("attackAPMode", "auto");
  const spellMode = getSetting("spellSPMode", "auto");

  if (isCombat && apCost > 0 && attackMode !== "disabled") {
    await deductAp(actor, apCost);
  }

  if (spCost > 0 && spellMode !== "disabled") {
    await deductSp(actor, spCost);
  }

  // 4. Critical hit check
  const critThreshold = getActorCritHit(actor);
  const isCrit = roll.dice[0]?.results?.[0]?.result >= critThreshold;

  // 5. Build chat message
  const cardData = {
    actor,
    item,
    roll,
    total: roll.total,
    isCrit,
    apCost,
    spCost,
    hasDamage: !!(item.system?.damage?.formula || item.system?.damageFormula || (Array.isArray(item.system?.damage) && item.system.damage.length > 0)),
  };

  const template = "modules/mythcraft-essence-sheet/templates/essence/chat/attack-card.hbs";
  let content = "";
  try {
    content = await renderTemplate(template, cardData);
  } catch (err) {
    content = `
      <div class="mythcraft-chat-card attack-card">
        <div class="card-header">
          <h3>${item.name}</h3>
        </div>
        <div class="card-body">
          <div class="roll-result ${isCrit ? 'crit' : ''}">
            <span class="roll-total">${roll.total}</span>
            ${isCrit ? '<span class="crit-badge">CRITICAL HIT!</span>' : ''}
          </div>
          ${cardData.hasDamage ? `<button type="button" class="roll-damage" data-action="rollEssenceDamage" data-item-id="${item.id}" data-actor-id="${actor.id}" data-is-crit="${isCrit}"><i class="fas fa-sword"></i> Roll Damage</button>` : ''}
        </div>
      </div>`;
  }

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${item.name}`,
    content,
    flags: {
      "mythcraft-essence-sheet": {
        itemId: item.id,
        actorId: actor.id,
        isCrit,
        apCost,
        spCost,
      },
    },
  });
}

