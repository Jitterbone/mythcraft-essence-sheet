/**
 * MythCraft Essence — Damage Automation Engine
 * 
 * Implements automated calculations for:
 * 1. Damage Threshold (DT) — Damage must exceed DT at once to deal any damage.
 * 2. Immunity — Takes 0 damage of that type. Encompasses categories (Physical, Elemental, Energy, All).
 * 3. Vulnerability — Takes additional damage (+X) of that type; disables DR.
 * 4. Affinity (Incoming) — Takes 1/2 damage (Math.floor(dmg / 2)) of that type.
 * 5. Resist — Subtracts Resist value from damage of that type (stacks specific + category + armor).
 * 6. Damage Reduction (DR) — Subtracts DR from all damage unless vulnerable or bypassed.
 * 7. Absorb — Native system damage absorb map.
 * 8. Shield Points (Temporary HP) & Health Points allocation: Shield absorbs first!
 */

import { calculateEffectiveResistances } from "./equipment-automation.mjs";

export const DAMAGE_CATEGORIES = {
  physical: ["blunt", "sharp"],
  elemental: ["cold", "corrosive", "fire", "lightning", "toxic"],
  energy: ["necrotic", "psychic", "radiant", "sonic"],
};

export const DAMAGE_TYPE_TO_CATEGORY = {
  blunt: "physical",
  sharp: "physical",
  cold: "elemental",
  corrosive: "elemental",
  fire: "elemental",
  lightning: "elemental",
  toxic: "elemental",
  necrotic: "energy",
  psychic: "energy",
  radiant: "energy",
  sonic: "energy",
};

/**
 * Checks if a given modifier key (e.g. "physical", "sharp", "all") matches an incoming damage type (e.g. "sharp", "physical").
 * @param {string} entryKey - Key from resistance/immunity/affinity
 * @param {string} incomingType - Incoming damage type
 * @returns {boolean}
 */
export function isDamageTypeMatch(entryKey, incomingType) {
  if (!entryKey || !incomingType) return false;
  const k = String(entryKey).toLowerCase().trim();
  const inc = String(incomingType).toLowerCase().trim();

  // 1. Exact match or global match
  if (k === inc || k === "all" || k === "all damage") return true;

  // 2. If incoming is a sub-type (e.g. "sharp"), check if entry is its category (e.g. "physical")
  const categoryOfIncoming = DAMAGE_TYPE_TO_CATEGORY[inc];
  if (categoryOfIncoming && k === categoryOfIncoming) return true;

  // 3. If incoming is a category (e.g. "physical"), check if entry matches category or sub-type
  const subTypes = DAMAGE_CATEGORIES[inc];
  if (subTypes && (subTypes.includes(k) || k === inc)) return true;

  return false;
}

/**
 * Normalizes a Set, Array, Object, or String of damage types into a Set of lowercase strings.
 * @param {any} source 
 * @returns {Set<string>}
 */
function normalizeTypeSet(source) {
  const result = new Set();
  if (!source) return result;

  if (source instanceof Set || Array.isArray(source)) {
    for (const item of source) {
      if (typeof item === "string") {
        item.split(/[,;\n]/).forEach(s => {
          const trimmed = s.trim().toLowerCase();
          if (trimmed) result.add(trimmed);
        });
      } else if (item && typeof item === "object") {
        const k = item.key || item.type || item.id;
        if (k) result.add(String(k).trim().toLowerCase());
      }
    }
  } else if (typeof source === "string") {
    source.split(/[,;\n]/).forEach(s => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed) result.add(trimmed);
    });
  } else if (typeof source === "object") {
    for (const [k, v] of Object.entries(source)) {
      if (v) result.add(k.trim().toLowerCase());
    }
  }
  return result;
}

/**
 * Checks if incoming damage type is covered by any type in a normalized Set
 * @param {Set<string>} typeSet
 * @param {string} incomingType
 * @returns {boolean}
 */
function isTypeInSet(typeSet, incomingType) {
  if (!typeSet || !typeSet.size || !incomingType) return false;
  const inc = String(incomingType).toLowerCase().trim();
  if (typeSet.has(inc) || typeSet.has("all") || typeSet.has("all damage")) return true;
  const cat = DAMAGE_TYPE_TO_CATEGORY[inc];
  if (cat && typeSet.has(cat)) return true;
  return false;
}

/**
 * Extracts numeric modifier for a given damage type from a String, Array, or Object.
 * Encompasses specific type (e.g. sharp), category (e.g. physical), and global (all).
 * Stacks if both specific and category modifiers are present!
 * @param {any} source 
 * @param {string} damageType 
 * @returns {number|null}
 */
export function parseDamageTypeModifier(source, damageType) {
  if (!source || !damageType) return null;
  const targetType = String(damageType).toLowerCase().trim();

  let total = 0;
  let found = false;

  const checkMatch = (key, val) => {
    if (!key) return;
    if (isDamageTypeMatch(key, targetType)) {
      total += Number(val) || 1;
      found = true;
    }
  };

  // If source is an Object (e.g. { sharp: 2, physical: 2 })
  if (typeof source === "object" && !(source instanceof Set) && !Array.isArray(source)) {
    for (const [k, v] of Object.entries(source)) {
      checkMatch(k, v);
    }
  } else if (Array.isArray(source)) {
    for (const item of source) {
      if (typeof item === "string") {
        const parts = item.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        for (const p of parts) {
          const match = p.match(/^([a-zA-Z\s]+?)(?:[:\s\+\-]+(\d+))?$/);
          if (match) checkMatch(match[1], match[2] !== undefined ? parseInt(match[2], 10) : 1);
        }
      } else if (item && typeof item === "object") {
        const k = item.type || item.key || item.label || "";
        const val = item.value ?? item.val ?? item.amount ?? 1;
        checkMatch(k, val);
      }
    }
  } else if (typeof source === "string") {
    const entries = source.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    for (const entry of entries) {
      const match = entry.match(/^([a-zA-Z\s]+?)(?:[:\s\+\-]+(\d+))?$/);
      if (match) {
        checkMatch(match[1], match[2] !== undefined ? parseInt(match[2], 10) : 1);
      }
    }
  }

  return found ? total : null;
}

/**
 * Checks if a bypass string matches any of the damage options (type, source, tags).
 * @param {string} bypasses - Raw bypass string (e.g. "Silver, Fire, Radiant")
 * @param {object} options - Damage options
 * @returns {boolean} True if bypassed
 */
export function checkDRBypass(bypasses, options = {}) {
  if (!bypasses || typeof bypasses !== "string") return false;
  const bypassList = bypasses.split(/[,;\n]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!bypassList.length) return false;

  const dmgType = String(options.type || "").toLowerCase().trim();
  const dmgSource = String(options.source || "").toLowerCase().trim();
  const dmgTags = Array.isArray(options.tags) ? options.tags.map(t => String(t).toLowerCase().trim()) : [];

  for (const bypass of bypassList) {
    if (bypass === dmgType || bypass === dmgSource || dmgTags.includes(bypass)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate modified damage according to MythCraft rules.
 * @param {Actor} actor - Target actor
 * @param {number} rawDamage - Initial incoming damage amount
 * @param {object} options - Context (type, tags, source, ignoreResist, ignoreDR, etc.)
 * @returns {{ finalDamage: number, breakdown: string[] }}
 */
export function calculateMythCraftDamage(actor, rawDamage, options = {}) {
  let damage = Math.max(0, Number(rawDamage) || 0);
  const sysDamage = actor.system?.damage || {};
  const damageType = String(options.type || "").toLowerCase().trim();
  const categoryType = DAMAGE_TYPE_TO_CATEGORY[damageType] || "";
  const breakdown = [];

  const typeLabel = damageType ? (damageType.charAt(0).toUpperCase() + damageType.slice(1)) : "Untyped";
  breakdown.push(`Initial: ${damage} ${typeLabel}`);

  // 1. Damage Threshold (DT)
  const dt = Number(sysDamage.threshold) || 0;
  if (dt > 0) {
    if (damage < dt) {
      breakdown.push(`Below DT (${dt}) → 0`);
      return { finalDamage: 0, breakdown };
    } else {
      breakdown.push(`Exceeded DT (${dt})`);
    }
  }

  // 2. Immunity (Matches specific damage type, encompassing category, or all damage)
  const immuneSet = normalizeTypeSet(sysDamage.immune);
  if (damageType && isTypeInSet(immuneSet, damageType)) {
    const immuneSource = immuneSet.has(damageType) ? typeLabel : (categoryType && immuneSet.has(categoryType) ? `${categoryType.toUpperCase()} Immunity` : "All Damage Immunity");
    breakdown.push(`Immune (${immuneSource}) → 0`);
    return { finalDamage: 0, breakdown };
  }

  // 3. Vulnerability (+X extra damage, disables DR)
  let isVulnerable = false;
  if (damageType) {
    const vulnVal = parseDamageTypeModifier(sysDamage.vulnerable, damageType);
    if (vulnVal !== null && vulnVal > 0) {
      isVulnerable = true;
      damage += vulnVal;
      breakdown.push(`Vulnerable (+${vulnVal}) → ${damage}`);
    }
  }

  // 4. Affinity (Incoming Damage Halved - matches specific type, category, or all)
  const affinitySet = normalizeTypeSet(sysDamage.affinity);
  if (damageType && isTypeInSet(affinitySet, damageType)) {
    const half = Math.floor(damage / 2);
    breakdown.push(`Affinity (½) → ${half}`);
    damage = half;
  }

  // 5. Resist (Subtracts resistance value from base actor + donned armor)
  if (!options.ignoreResist && damageType) {
    const effectiveResistData = calculateEffectiveResistances(actor);
    const resistSource = effectiveResistData.combinedString || sysDamage.resist || "";
    const resistVal = parseDamageTypeModifier(resistSource, damageType);
    if (resistVal !== null && resistVal > 0) {
      damage = Math.max(0, damage - resistVal);
      breakdown.push(`Resist (-${resistVal}) → ${damage}`);
    }
  } else if (options.ignoreResist) {
    breakdown.push(`Ignores Resist`);
  }

  // 6. Damage Reduction (DR)
  const drVal = Number(sysDamage.reduction?.value) || 0;
  if (drVal > 0) {
    if (isVulnerable) {
      breakdown.push(`DR ignored (Vulnerable)`);
    } else if (options.ignoreResist || options.ignoreDR) {
      breakdown.push(`Ignores DR`);
    } else {
      const isBypassed = checkDRBypass(sysDamage.reduction?.bypasses, options);
      if (isBypassed) {
        breakdown.push(`DR bypassed`);
      } else {
        damage = Math.max(0, damage - drVal);
        breakdown.push(`DR (-${drVal}) → ${damage}`);
      }
    }
  }

  // 7. Absorb (Native system absorb map)
  if (damageType && sysDamage.absorb && sysDamage.absorb[damageType]) {
    const absorbVal = Number(sysDamage.absorb[damageType]) || 0;
    if (absorbVal > 0) {
      damage = Math.max(0, damage - absorbVal);
      breakdown.push(`Absorb (-${absorbVal}) → ${damage}`);
    }
  }

  return { finalDamage: Math.max(0, damage), breakdown };
}

/**
 * Applies damage to an actor document: Shield HP absorbs first before HP is lost!
 * @param {Actor} actor 
 * @param {number} rawDamage 
 * @param {object} options 
 * @returns {Promise<Actor>}
 */
export async function applyActorDamage(actor, rawDamage, options = {}) {
  if (!actor) return null;

  const { finalDamage, breakdown } = calculateMythCraftDamage(actor, rawDamage, options);

  const hp = actor.system?.hp || {};
  const currentShield = Number(hp.shield) || 0;
  const currentHp = Number(hp.value) || 0;

  if (finalDamage === 0) {
    ui.notifications.info(`${actor.name}: ${breakdown.join(" • ")} → 0 Damage Taken`);
    return actor;
  }

  // Shield absorbs first (acting as Temporary HP)
  const damageToShield = Math.min(finalDamage, currentShield);
  const remainingDamage = Math.max(0, finalDamage - damageToShield);
  const newShield = Math.max(0, currentShield - damageToShield);
  const newHp = currentHp - remainingDamage;

  const updates = {
    "system.hp.shield": newShield,
    "system.hp.value": newHp,
  };

  await actor.update(updates);

  // Display floating scrolling text on canvas tokens
  if (canvas?.interface?.createScrollingText && canvas.scene) {
    const tokens = actor.getActiveTokens ? actor.getActiveTokens() : [];
    const displayArgs = {
      fill: options.type === "heal" ? "lightgreen" : "#ff4d4d",
      fontSize: 28,
      stroke: 0x000000,
      strokeThickness: 4,
    };
    for (const token of tokens) {
      if (token.visible && !token.document?.isSecret) {
        canvas.interface.createScrollingText(token.center, `-${finalDamage}`, displayArgs);
      }
    }
  }

  let shieldNote = "";
  if (damageToShield > 0) {
    shieldNote = ` (${damageToShield} absorbed by Shield Points)`;
  }

  ui.notifications.info(`${actor.name}: ${breakdown.join(" • ")} → Took ${finalDamage} Damage${shieldNote}`);

  return actor;
}

/**
 * Initialize damage automation hooks and listeners
 */
export function initDamageAutomation() {
  console.log("mythcraft-essence-sheet | Initializing Damage Automation Engine.");

  // 1. Hook into Actor takeDamage method
  const takeDamageHandler = async function(rawDamage, options = {}) {
    return applyActorDamage(this.actor || this, rawDamage, options);
  };

  if (CONFIG.Actor?.documentClass?.prototype) {
    CONFIG.Actor.documentClass.prototype.takeDamage = takeDamageHandler;
  }

  const dataModels = [
    CONFIG.Actor?.dataModels?.character,
    CONFIG.Actor?.dataModels?.npc,
    CONFIG.Actor?.dataModels?.siegeWeapon,
  ].filter(Boolean);

  for (const model of dataModels) {
    if (model.prototype) {
      model.prototype.takeDamage = takeDamageHandler;
    }
    const parentProto = Object.getPrototypeOf(model.prototype);
    if (parentProto && parentProto !== Object.prototype) {
      parentProto.takeDamage = takeDamageHandler;
    }
  }

  // 2. Global capture-phase click interceptor for all .apply-damage and .apply-damage-btn buttons
  document.addEventListener("click", async (event) => {
    const btn = event.target?.closest?.(".apply-damage, .apply-damage-btn");
    if (!btn) return;

    // Stop core system or other module event listener from running raw damage deductions
    event.stopImmediatePropagation();
    event.preventDefault();

    const li = btn.closest("[data-message-id]") || btn.closest(".chat-message");
    const messageId = li?.dataset?.messageId;
    const message = messageId ? game.messages?.get(messageId) : null;

    const rollIndex = Number(btn.dataset.index) || 0;
    const roll = message?.rolls?.[rollIndex];

    let amount = btn.dataset.value !== undefined ? Number(btn.dataset.value) : (roll?.total ?? 0);
    if (event.shiftKey) amount = Math.floor(amount / 2);

    const dmgType = btn.dataset.damageType || roll?.type || roll?.options?.type || "";

    const controlledTokens = canvas?.tokens?.controlled || [];
    if (!controlledTokens.length) {
      ui.notifications.warn("No tokens selected. Please select one or more tokens on the canvas.");
      return;
    }

    const actors = new Set(controlledTokens.map(t => t.actor).filter(Boolean));

    for (const actor of actors) {
      if (roll?.isHeal || btn.classList.contains("apply-healing-btn")) {
        const isTemp = roll?.type !== "value";
        if (isTemp && (amount < (actor.system?.stamina?.temporary ?? 0))) {
          ui.notifications.warn("MYTHCRAFT.ChatMessage.base.Buttons.ApplyHeal.TempCapped", {
            format: { name: actor.name },
          });
        } else {
          await actor.modifyTokenAttribute(isTemp ? "hp.shield" : "hp", amount, !isTemp, !isTemp);
        }
      } else {
        await applyActorDamage(actor, amount, { type: dmgType });
      }
    }
  }, true);
}
