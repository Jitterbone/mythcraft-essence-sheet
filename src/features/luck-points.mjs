/**
 * mythcraft-essence-sheet | src/features/luck-points.mjs
 *
 * Implements the "Use Luck Point" context menu option on chat rolls.
 * Right-clicking any roll made by a character sheet allows the player or GM
 * to spend 1 Luck Point (LP) to re-evaluate and reroll the check with 3D dice animations.
 */

/**
 * Calculates effective critical hit threshold based on actor Luck and Damage Modification settings.
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorCritHit(actor) {
  const baseHit = Number(actor?.system?.critical?.hit ?? 20);
  const critBonus = Number(actor?.flags?.["mythcraft-essence-sheet"]?.critBonus ?? 0);
  const luck = Number(actor?.system?.attributes?.luck?.value ?? actor?.system?.attributes?.luck ?? 0);
  if (luck < 0) return 999; // If LUCK < 0, can never critically hit
  const luckBonus = luck >= 12 ? 2 : (luck >= 6 ? 1 : 0);
  return Math.max(16, baseHit - luckBonus - critBonus);
}

/**
 * Calculates effective critical fail threshold for actor.
 * @param {Actor} actor
 * @returns {number}
 */
export function getActorCritFail(actor) {
  return Number(actor?.system?.critical?.fail ?? 1);
}

/**
 * Calculates max Luck Points (LP) based on character Luck attribute (1 LP per 2 LUCK, min 0).
 * @param {Actor|number} actorOrLuck
 * @returns {number}
 */
export function calculateMaxLuckPoints(actorOrLuck) {
  let luck = 0;
  if (typeof actorOrLuck === "number") {
    luck = actorOrLuck;
  } else if (actorOrLuck?.system?.attributes?.luck !== undefined) {
    const val = actorOrLuck.system.attributes.luck;
    luck = Number(val?.value ?? val ?? 0);
  }
  if (isNaN(luck) || luck <= 0) return 0;
  return Math.floor(luck / 2);
}

/**
 * Resolves the ChatMessage document from a DOM element or jQuery object.
 * @param {HTMLElement|jQuery} target
 * @returns {ChatMessage|null}
 */
export function getMessageFromElement(target) {
  if (!target) return null;
  const el = (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) ? target : (target[0] || target);
  const msgEl = el?.closest?.("[data-message-id]") || el?.closest?.(".chat-message") || el;
  const messageId = msgEl?.dataset?.messageId 
    || msgEl?.getAttribute?.("data-message-id") 
    || (typeof target.data === "function" ? (target.data("messageId") || target.data("message-id")) : null)
    || (typeof target.attr === "function" ? target.attr("data-message-id") : null);
  return messageId ? game.messages?.get(messageId) : null;
}

/**
 * Resolves the Actor associated with a ChatMessage document.
 * @param {ChatMessage} message
 * @returns {Actor|null}
 */
export function getMessageActor(message) {
  if (!message) return null;
  try {
    if (typeof ChatMessage.getSpeakerActor === "function" && message.speaker) {
      const a = ChatMessage.getSpeakerActor(message.speaker);
      if (a) return a;
    }
  } catch (e) {}
  if (message.actor) return message.actor;
  if (message.speaker?.actor) {
    const a = game.actors?.get(message.speaker.actor);
    if (a) return a;
  }
  if (message.speaker?.token && globalThis.canvas?.tokens) {
    const t = globalThis.canvas.tokens.get(message.speaker.token);
    if (t?.actor) return t.actor;
  }
  return null;
}

/**
 * Initializes the Chat Log Context Menu option for Luck Point rerolls across all Foundry versions.
 */
export function initLuckPointReroll() {
  const registerEntry = (html, entryOptions) => {
    // Avoid duplicate entry registration
    if (entryOptions.some(e => e.name === "Use Luck Point (Reroll)" || e.name === "Use Luck Point")) return;

    entryOptions.push({
      name: "Use Luck Point (Reroll)",
      icon: '<i class="fas fa-clover" style="color: #16a34a; font-weight: 900;"></i>',
      condition: (li) => {
        try {
          const message = getMessageFromElement(li);
          if (!message) return false;

          // Must contain at least one roll
          const hasRolls = Boolean(
            message.isRoll || 
            (Array.isArray(message.rolls) && message.rolls.length > 0) ||
            message.flags?.["mythcraft-essence-sheet"]?.isAttack ||
            message.flags?.["mythcraft-essence-sheet"]?.isSpell ||
            message.flags?.["mythcraft-hud"]?.hudAction
          );
          if (!hasRolls) return false;

          // Must belong to a character actor
          const actor = getMessageActor(message);
          if (!actor || actor.type !== "character") return false;

          // User must own the actor or be GM
          if (!actor.isOwner && !game.user.isGM) return false;

          return true;
        } catch (err) {
          console.error("mythcraft-essence-sheet | Error in Luck Point condition:", err);
          return false;
        }
      },
      callback: async (li) => {
        const message = getMessageFromElement(li);
        if (!message) return;

        const actor = getMessageActor(message);
        if (!actor) return;

        await handleUseLuckPoint(message, actor);
      },
    });
  };

  Hooks.on("getChatLogEntryContext", registerEntry);
  Hooks.on("getChatMessageContextOptions", registerEntry);

  initRestLuckAutomation();
}

/**
 * Initializes automatic Luck Point restoration on Taking a Rest.
 */
export function initRestLuckAutomation() {
  Hooks.on("mythcraft.rest", async (actor, restType) => {
    if (restType === "rest" && actor?.type === "character") {
      const maxLp = calculateMaxLuckPoints(actor);
      await actor.update({ "system.lp.value": maxLp });
    }
  });

  Hooks.on("dnd5e.restCompleted", async (actor, data) => {
    if (actor?.type === "character") {
      const maxLp = calculateMaxLuckPoints(actor);
      await actor.update({ "system.lp.value": maxLp });
    }
  });
}

/**
 * Handles spending a Luck Point and executing the reroll.
 * @param {ChatMessage} message
 * @param {Actor} actor
 * @returns {Promise<ChatMessage|void>}
 */
export async function handleUseLuckPoint(message, actor) {
  if (!actor || !message) return;

  const currentLp = Number(actor.system?.lp?.value ?? 0);
  if (currentLp <= 0) {
    ui.notifications.warn(`${actor.name} does not have any Luck Points (LP) remaining!`);
    return;
  }

  // Confirmation modal styled with dark high-contrast box
  const confirmed = await new Promise((resolve) => {
    new Dialog({
      title: "Use Luck Point",
      content: `
        <div style="background: #14171a; border: 1px solid #3a7a7f; border-radius: 6px; padding: 12px; font-size: 13px; color: #FEEBB3; margin-bottom: 6px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.4; color: #f1f5f9;">
            Spend <strong style="color: #4ade80;">1 Luck Point</strong> to reroll <strong style="color: #FEEBB3;">${message.flavor || "this check"}</strong>?
          </p>
          <div style="display:flex; align-items:center; gap:8px; background: rgba(74, 222, 128, 0.12); border: 1px solid rgba(74, 222, 128, 0.35); padding: 8px 12px; border-radius: 4px; color: #86efac; font-size: 12px; font-weight: 600;">
            <i class="fas fa-clover" style="color:#4ade80; font-size: 14px;"></i>
            <span>Remaining Luck Points: <strong style="color: #ffffff;">${currentLp} &rarr; ${currentLp - 1}</strong></span>
          </div>
        </div>
      `,
      buttons: {
        reroll: {
          icon: '<i class="fas fa-rotate-right"></i>',
          label: "Reroll Check",
          callback: () => resolve(true),
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(false),
        },
      },
      default: "reroll",
      close: () => resolve(false),
    }, {
      classes: ["dialog", "essence-dialog", "luck-reroll-dialog"],
    }).render(true);
  });

  if (!confirmed) return;

  // Deduct 1 Luck Point
  const newLp = Math.max(0, currentLp - 1);
  await actor.update({ "system.lp.value": newLp });

  // Get original roll
  const oldRoll = message.rolls?.[0];
  if (!oldRoll) {
    ui.notifications.warn("No roll data found to reroll.");
    return;
  }

  // Create new roll with same formula and data
  const RollClass = oldRoll.constructor || Roll;
  const newRoll = new RollClass(oldRoll.formula, oldRoll.data || actor.getRollData(), oldRoll.options || {});
  if (typeof newRoll.evaluate === "function" && !newRoll._evaluated) {
    await newRoll.evaluate();
  }

  // Critical Hit & Fumble Check
  const critHit = getActorCritHit(actor);
  const critFail = getActorCritFail(actor);
  const d20Term = newRoll.terms?.find(t => t.faces === 20);
  const d20Result = d20Term?.results?.find(r => r.active !== false)?.result ?? d20Term?.results?.[0]?.result ?? newRoll.dice?.[0]?.total;
  const isCrit = typeof d20Result === "number" && d20Result >= critHit;
  const isFumble = typeof d20Result === "number" && d20Result <= critFail;

  const resultClass = isCrit ? "crit-success" : (isFumble ? "crit-fail" : "");
  const resultLabel = isCrit ? "CRITICAL HIT" : (isFumble ? "CRITICAL FAILURE" : "LUCK REROLL");

  const luckBannerHTML = `
    <div class="luck-reroll-badge" style="display:flex; align-items:center; gap:8px; background: rgba(22, 101, 52, 0.3); border: 1px solid #16a34a; padding: 5px 10px; border-radius: 4px; color: #86efac; font-size: 11.5px; font-weight: 700; margin-bottom: 8px;">
      <i class="fas fa-clover" style="font-size: 14px; color: #22c55e; filter: drop-shadow(0 0 3px rgba(34, 197, 94, 0.6));"></i>
      <span style="color: #86efac;">Luck Point Used (1 LP spent • ${newLp} remaining)</span>
    </div>
  `;

  let newContent = "";
  const oldContent = message.content || "";

  if (oldContent.includes("mythcraft-statblock") && typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(oldContent, "text/html");
      const statblock = doc.querySelector(".mythcraft-statblock");

      if (statblock) {
        const bannerDiv = doc.createElement("div");
        bannerDiv.innerHTML = luckBannerHTML;
        statblock.prepend(bannerDiv.firstElementChild);

        const rollResultEl = statblock.querySelector(".roll-result");
        if (rollResultEl) {
          rollResultEl.className = `roll-result ${resultClass}`;
          rollResultEl.innerHTML = `
            <div class="roll-label">${resultLabel}</div>
            <div class="roll-value">${newRoll.total}</div>
            <div class="roll-formula">${newRoll.formula}</div>
          `;
        }
        newContent = doc.body.innerHTML;
      }
    } catch (e) {}
  }

  if (!newContent) {
    newContent = `
      <div class="mythcraft-statblock reroll-card">
        ${luckBannerHTML}
        <div class="card-header" style="font-family: 'Cinzel', serif; font-size: 14px; color: #FEEBB3; font-weight: 700;">
          ${message.flavor || "Check Reroll"}
        </div>
        <div class="roll-result ${resultClass}">
          <div class="roll-label">${resultLabel}</div>
          <div class="roll-value">${newRoll.total}</div>
          <div class="roll-formula">${newRoll.formula}</div>
        </div>
      </div>
    `;
  }

  const msgData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${message.flavor || "Roll"} (Luck Reroll)`,
    content: newContent,
    rolls: [newRoll],
    flags: {
      ...(message.flags || {}),
      "mythcraft-essence-sheet": {
        ...(message.flags?.["mythcraft-essence-sheet"] || {}),
        isLuckReroll: true,
        isCrit,
        isFumble,
        originalMessageId: message.id,
      },
    },
  };

  if (message.whisper && message.whisper.length) {
    msgData.whisper = message.whisper;
    msgData.blind = message.blind;
  }

  if (CONST.CHAT_MESSAGE_STYLES) {
    msgData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
  }

  ui.notifications.info(`${actor.name} used 1 Luck Point to reroll! (${newLp} LP remaining)`);
  return await ChatMessage.create(msgData);
}
