/**
 * mythcraft-essence-sheet | src/features/container-utils.mjs
 *
 * Storage Container helpers for MythCraft inventory management.
 */

export const DEFAULT_CONTAINER_NAMES = new Set([
  "cooking pot",
  "scroll case",
  "backpack",
  "cargo bags",
  "cargo bags (hidden pockets)",
  "saddlebags",
]);

/**
 * Checks whether an item is configured or recognized as a storage container.
 * @param {Item} item
 * @returns {boolean}
 */
export function isItemContainer(item) {
  if (!item) return false;
  const flagVal = item.flags?.["mythcraft-essence-sheet"]?.isContainer;
  if (typeof flagVal === "boolean") return flagVal;

  const cleanName = (item.name || "").trim().toLowerCase();
  return DEFAULT_CONTAINER_NAMES.has(cleanName);
}

/**
 * Retrieves all items stored inside a given container on an actor.
 * @param {Actor} actor
 * @param {string} containerId
 * @returns {Item[]}
 */
export function getContainerContents(actor, containerId) {
  if (!actor || !containerId) return [];
  return actor.items.filter(item => {
    const parentId = item.flags?.["mythcraft-essence-sheet"]?.containerId;
    return parentId === containerId && item.id !== containerId;
  });
}

/**
 * Moves an item into a container.
 * @param {Item} item
 * @param {string} containerId
 * @returns {Promise<Item>}
 */
export async function moveItemToContainer(item, containerId) {
  if (!item || !containerId) return item;
  if (item.id === containerId) return item; // Prevent nesting inside self
  return await item.update({ "flags.mythcraft-essence-sheet.containerId": containerId });
}

/**
 * Removes an item from any container, returning it to root inventory.
 * If combat initiative is active, automatically consumes 1 Action Point (AP).
 * @param {Item} item
 * @returns {Promise<Item>}
 */
export async function removeItemFromContainer(item) {
  if (!item) return item;

  const actor = item.parent;
  const inCombat = Boolean(game.combat?.started && actor?.inCombat);
  if (inCombat && actor) {
    const curAp = Number(actor.system?.ap?.value ?? 0);
    if (curAp < 1) {
      ui.notifications.warn(`${actor.name} has 0 AP remaining to retrieve an item from storage.`);
    }
    const newAp = Math.max(0, curAp - 1);
    await actor.update({ "system.ap.value": newAp });
    ui.notifications.info(`${actor.name} retrieved ${item.name} from storage (1 AP consumed. Remaining: ${newAp} AP).`);
  }

  return await item.update({ "flags.mythcraft-essence-sheet.containerId": null });
}

