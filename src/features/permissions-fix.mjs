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

  // 5. Initialize compatibility shim for third-party modules (statuscounter)
  initVisualActiveEffectsCompat();
}

/**
 * Fixes compatibility with third-party modules (e.g. statuscounter) that hook into
 * 'renderVisualActiveEffects' and expect jQuery-wrapped html (html[0].querySelectorAll).
 * In Foundry V12+ ApplicationV2, html is passed as an HTMLElement where html[0] is undefined.
 */
export function initVisualActiveEffectsCompat() {
  const normalizeHtmlArg = (args) => {
    if (!args[1] && args[0]?.element) {
      args[1] = args[0].element;
    }
    let html = args[1];
    if (html && !html[0]) {
      if (typeof globalThis.$ === "function") {
        args[1] = globalThis.$(html);
      } else {
        try {
          html[0] = html;
        } catch (_) {}
      }
    }
  };

  const origCallAll = Hooks.callAll;
  Hooks.callAll = function(hook, ...args) {
    if (hook === "renderVisualActiveEffects") {
      normalizeHtmlArg(args);
    }
    return origCallAll.apply(this, [hook, ...args]);
  };

  const origCall = Hooks.call;
  Hooks.call = function(hook, ...args) {
    if (hook === "renderVisualActiveEffects") {
      normalizeHtmlArg(args);
    }
    return origCall.apply(this, [hook, ...args]);
  };

  // Also wrap listeners directly to catch any third-party errors gracefully
  const guardHookListeners = () => {
    const list = Hooks.events?.["renderVisualActiveEffects"];
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        const fn = typeof entry === "function" ? entry : entry?.fn;
        if (fn && !fn.__guarded) {
          const guardedFn = function(app, html, ...rest) {
            let safeHtml = html;
            if (safeHtml && !safeHtml[0]) {
              safeHtml = typeof globalThis.$ === "function" ? globalThis.$(safeHtml) : safeHtml;
              if (safeHtml && !safeHtml[0]) {
                try { safeHtml[0] = safeHtml; } catch (_) {}
              }
            }
            try {
              return fn.call(this, app, safeHtml, ...rest);
            } catch (err) {
              console.warn("mythcraft-essence-sheet | Caught and handled error in third-party renderVisualActiveEffects hook:", err);
            }
          };
          guardedFn.__guarded = true;
          if (typeof entry === "function") list[i] = guardedFn;
          else if (entry) entry.fn = guardedFn;
        }
      }
    }
  };

  guardHookListeners();
  Hooks.on("ready", guardHookListeners);
}
