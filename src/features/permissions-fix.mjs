/**
 * mythcraft-essence-sheet | src/features/permissions-fix.mjs
 *
 * Fixes Foundry VTT V12+ permissions error:
 * "Error: <field> may only be modified by a GM or Assistant GM user"
 *
 * Automatically removes gmOnly fields (e.g. system.description.gm, system.biography.gm)
 * from creation/update payloads sent by non-GM players who own the document.
 */

/**
 * Recursively removes gmOnly fields from an update object or form data map.
 * @param {object} obj
 */
export function sanitizeGmOnlyFields(obj) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key === "gm" || key.endsWith(".gm") || key.endsWith(".gmOnly")) {
      delete obj[key];
    } else if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      sanitizeGmOnlyFields(obj[key]);
    }
  }
}

/**
 * Initializes permission fixes for player editing of owned actors and items.
 */
export function initPermissionsFix() {
  // 1. Hook into preUpdateItem to strip gmOnly fields for non-GM users
  Hooks.on("preUpdateItem", (item, changes, options, userId) => {
    if (!game.user.isGM) {
      sanitizeGmOnlyFields(changes);
    }
  });

  // 2. Hook into preUpdateActor to strip gmOnly fields for non-GM users
  Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
    if (!game.user.isGM) {
      sanitizeGmOnlyFields(changes);
    }
  });

  // 3. Hook into preCreateItem to strip gmOnly fields for non-GM users
  Hooks.on("preCreateItem", (item, data, options, userId) => {
    if (!game.user.isGM) {
      sanitizeGmOnlyFields(data);
      if (item._source?.system?.description?.gm !== undefined) {
        delete item._source.system.description.gm;
      }
    }
  });

  // 4. Hook into preCreateActor to strip gmOnly fields for non-GM users
  Hooks.on("preCreateActor", (actor, data, options, userId) => {
    if (!game.user.isGM) {
      sanitizeGmOnlyFields(data);
      if (actor._source?.system?.biography?.gm !== undefined) {
        delete actor._source.system.biography.gm;
      }
    }
  });
}
