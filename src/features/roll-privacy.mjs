/**
 * mythcraft-essence-sheet | src/features/roll-privacy.mjs
 *
 * Centralized utility to ensure all actor rolls, attacks, spells, damage,
 * and chat cards strictly honor the user's active roll privacy settings
 * (Public Roll, Private GM Roll, Blind GM Roll, Self Roll).
 */

/**
 * Resolves the currently active roll mode for the user/GM.
 * Respects live chat input select, explicit parameters, and core settings.
 * @param {string|null} [explicitMode=null]
 * @returns {string}
 */
export function getActiveRollMode(explicitMode = null) {
  if (explicitMode) {
    if (explicitMode === "roll") return "publicroll";
    return explicitMode;
  }

  // 1. Check live chat input dropdown selection
  try {
    const chatSelect = document.querySelector("#chat-controls select[name='rollMode']");
    if (chatSelect?.value) {
      const val = chatSelect.value;
      return val === "roll" ? "publicroll" : val;
    }

    if (ui.chat?.element) {
      const val = ui.chat.element[0]?.querySelector("select[name='rollMode']")?.value ||
                  ui.chat.element.find?.("select[name='rollMode']")?.val?.();
      if (val) return val === "roll" ? "publicroll" : val;
    }
  } catch (e) {
    // Non-fatal DOM lookup failover
  }

  // 2. Check game.settings core.messageMode or core.rollMode
  try {
    if (game.settings?.settings?.has("core.messageMode")) {
      const mode = game.settings.get("core", "messageMode");
      if (mode) return mode === "roll" ? "publicroll" : mode;
    }

    const coreMode = game.settings?.get?.("core", "rollMode");
    if (coreMode) return coreMode === "roll" ? "publicroll" : coreMode;
  } catch (e) {
    // Non-fatal settings failover
  }

  return "publicroll";
}

/**
 * Applies active roll privacy (whisper, blind, etc.) to a message data object
 * @param {object} messageData
 * @param {string|null} [explicitMode=null]
 * @returns {string} The active roll mode
 */
export function applyMessageRollMode(messageData, explicitMode = null) {
  if (!messageData || typeof messageData !== "object") return "publicroll";
  const activeMode = getActiveRollMode(explicitMode);
  
  if (typeof ChatMessage.applyRollMode === "function") {
    ChatMessage.applyRollMode(messageData, activeMode);
  } else {
    // Manual fallback if ChatMessage.applyRollMode is not present
    if (activeMode === "gmroll" || activeMode === "blindroll") {
      const gms = game.users ? game.users.filter(u => u.isGM).map(u => u.id) : [];
      messageData.whisper = gms;
      messageData.blind = (activeMode === "blindroll");
    } else if (activeMode === "selfroll") {
      messageData.whisper = [game.user?.id].filter(Boolean);
      messageData.blind = false;
    }
  }
  
  return activeMode;
}
