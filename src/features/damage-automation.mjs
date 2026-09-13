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
import { getSetting } from "../settings.mjs";

export const DAMAGE_CATEGORIES = {
  physical: ["blunt", "sharp"],
  elemental: ["cold", "corrosive", "fire", "lightning", "toxic"],
  energy: ["necrotic", "psychic", "radiant", "sonic", "soul"],
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
  soul: "energy",
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

  const damageType = String(options.type || "").toLowerCase().trim();
  const isSoulDamage = damageType === "soul" || damageType === "soul damage" || damageType === "soul-damage";
  const isSoulDamageEnabled = Boolean(getSetting("enableSoulDamage", false));

  const { finalDamage, breakdown } = calculateMythCraftDamage(actor, rawDamage, options);

  const hp = actor.system?.hp || {};
  const currentShield = Number(hp.shield) || 0;
  const currentHp = Number(hp.value) || 0;

  if (finalDamage === 0) {
    ui.notifications.info(`${actor.name}: ${breakdown.join(" • ")} → 0 Damage Taken`);
    return actor;
  }

  const attackerActor = options.attackerActor;
  const attackerWeapon = options.attackerWeapon;

  // 1. Soul Damage Path (Accumulates over rounds; lethal when >= current HP)
  if (isSoulDamage && isSoulDamageEnabled) {
    const curSoul = Number(actor.flags?.["mythcraft-essence-sheet"]?.soulDamage ?? actor.system?.soulDamage ?? 0);
    const newSoul = curSoul + finalDamage;
    const isLethal = (currentHp > 0) && (newSoul >= currentHp);

    if (isLethal) {
      // Lethal Soul Damage Execution
      await actor.update({
        "system.hp.value": 0,
        "flags.mythcraft-essence-sheet.soulDamage": newSoul,
        "system.soulDamage": newSoul,
      });

      // Mark dead status effect if available
      try {
        if (typeof actor.toggleStatusEffect === "function") {
          await actor.toggleStatusEffect("dead", { active: true, overlay: true });
        }
      } catch (e) {}

      // Post dramatic chat card for Soul Harvest execution
      const harvestCard = `
        <div class="mythcraft chat-card essence-soul-harvest-card" style="background: linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1px solid #c084fc; border-radius: 8px; padding: 10px 12px; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
          <header style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid rgba(192, 132, 252, 0.3); padding-bottom: 4px;">
            <i class="fas fa-ghost" style="color: #e879f9; font-size: 18px;"></i>
            <h3 style="margin: 0; font-family: 'Cinzel', serif; font-size: 14px; color: #f3e8ff; font-weight: 700;">SOUL HARVESTED!</h3>
          </header>
          <div style="font-size: 12px; color: #f3e8ff; line-height: 1.4;">
            <strong>${actor.name}</strong>'s soul was torn from its body! Accumulated Soul Damage (<strong>${newSoul}</strong>) exceeded remaining HP (<strong>${currentHp}</strong>). The creature immediately perished!
          </div>
        </div>
      `;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: attackerActor || actor }),
        content: harvestCard,
        flavor: "Soul Harvest Execution",
      });

      // Harvest soul into weapon if Claimed Souls is enabled
      const hasClaimedSouls = Boolean(attackerWeapon?.flags?.["mythcraft-essence-sheet"]?.enableClaimedSouls || attackerWeapon?.system?.enableClaimedSouls);
      if (attackerWeapon && hasClaimedSouls) {
        const curSouls = Math.min(5, Math.max(0, Number(attackerWeapon.flags?.["mythcraft-essence-sheet"]?.claimedSouls ?? attackerWeapon.system?.claimedSouls ?? 0)));
        if (curSouls < 5) {
          const nextSouls = curSouls + 1;
          await attackerWeapon.update({
            "flags.mythcraft-essence-sheet.claimedSouls": nextSouls,
            "system.claimedSouls": nextSouls,
          });
          ui.notifications.info(`${attackerWeapon.name} claimed ${actor.name}'s soul! (+${nextSouls} Attack & Damage).`);
        }
      }
    } else {
      // Non-lethal soul damage accumulation
      await actor.update({
        "flags.mythcraft-essence-sheet.soulDamage": newSoul,
        "system.soulDamage": newSoul,
      });
      ui.notifications.info(`Applied ${finalDamage} soul damage to ${actor.name} (Accumulated: ${newSoul} / ${currentHp} HP).`);
    }

    // Display purple scrolling text on canvas tokens
    if (canvas?.interface?.createScrollingText && canvas.scene) {
      const tokens = actor.getActiveTokens ? actor.getActiveTokens() : [];
      const displayArgs = {
        fill: "#c084fc",
        fontSize: 28,
        stroke: 0x000000,
        strokeThickness: 4,
      };
      for (const token of tokens) {
        if (token.visible && !token.document?.isSecret) {
          canvas.interface.createScrollingText(token.center, `-${finalDamage} ✦`, displayArgs);
        }
      }
    }

    return actor;
  }

  // 2. Standard Damage Path: Shield absorbs first (acting as Temporary HP)
  const damageToShield = Math.min(finalDamage, currentShield);
  const remainingDamage = Math.max(0, finalDamage - damageToShield);
  const newShield = Math.max(0, currentShield - damageToShield);
  const newHp = Math.max(0, currentHp - remainingDamage);

  const updates = {
    "system.hp.shield": newShield,
    "system.hp.value": newHp,
  };

  await actor.update(updates);

  // If creature was reduced to 0 HP and killed by a Claimed Souls weapon
  if (currentHp > 0 && newHp === 0 && isSoulDamageEnabled) {
    const hasClaimedSouls = Boolean(attackerWeapon?.flags?.["mythcraft-essence-sheet"]?.enableClaimedSouls || attackerWeapon?.system?.enableClaimedSouls);
    if (attackerWeapon && hasClaimedSouls) {
      const curSouls = Math.min(5, Math.max(0, Number(attackerWeapon.flags?.["mythcraft-essence-sheet"]?.claimedSouls ?? attackerWeapon.system?.claimedSouls ?? 0)));
      if (curSouls < 5) {
        const nextSouls = curSouls + 1;
        await attackerWeapon.update({
          "flags.mythcraft-essence-sheet.claimedSouls": nextSouls,
          "system.claimedSouls": nextSouls,
        });
        ui.notifications.info(`${attackerWeapon.name} claimed a soul from the kill! (+${nextSouls} Attack & Damage).`);
      }
    }
  }

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

    // Resolve Attacker Actor & Weapon
    const attackerActorId = message?.flags?.["mythcraft-essence-sheet"]?.attackerActorId || message?.speaker?.actor;
    const attackerActor = attackerActorId ? game.actors?.get(attackerActorId) : null;
    const attackerItemId = message?.flags?.["mythcraft-essence-sheet"]?.itemId;
    const attackerWeapon = (attackerActor && attackerItemId) ? attackerActor.items.get(attackerItemId) : null;

    const weaponIsSoul = Boolean(
      attackerWeapon?.flags?.["mythcraft-essence-sheet"]?.isSoulDamage ||
      attackerWeapon?.flags?.["mythcraft-essence-sheet"]?.damageType === "soul" ||
      attackerWeapon?.system?.isSoulDamage ||
      attackerWeapon?.system?.damageType === "soul" ||
      attackerWeapon?.system?.damage?.type === "soul" ||
      (Array.isArray(attackerWeapon?.system?.damage) && attackerWeapon.system.damage.some(d => d?.type === "soul" || d?.types?.includes("soul"))) ||
      (Array.isArray(attackerWeapon?.system?.tags) ? attackerWeapon.system.tags.some(t => /soul/i.test(t)) : (typeof attackerWeapon?.system?.tags === "object" && attackerWeapon?.system?.tags && Object.values(attackerWeapon.system.tags).some(t => /soul/i.test(t))))
    );

    let dmgType = (
      btn.dataset.damageType || 
      btn.dataset.type || 
      roll?.options?.type || 
      roll?.type || 
      message?.flags?.["mythcraft-essence-sheet"]?.damageType || 
      (weaponIsSoul ? "soul" : null) ||
      attackerWeapon?.system?.damage?.[0]?.type || 
      attackerWeapon?.system?.damageType || 
      ""
    ).toLowerCase().trim();

    if (btn.textContent && /soul/i.test(btn.textContent)) dmgType = "soul";
    if (btn.classList.contains("soul-damage-btn")) dmgType = "soul";
    if (!dmgType) dmgType = "damage";

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
        await applyActorDamage(actor, amount, {
          type: dmgType,
          attackerActor,
          attackerWeapon,
          message,
        });
      }
    }
  }, true);

  patchFeatureUsesMaxFormula();
}

/**
 * Patches FeatureModel.prototype.prepareDerivedData to prevent unhandled evaluation
 * errors when non-formula strings (such as "Rest") are entered in uses.maxFormula.
 */
export function patchFeatureUsesMaxFormula() {
  const FeatureModelClass = CONFIG.Item?.dataModels?.feature;
  if (!FeatureModelClass?.prototype?.prepareDerivedData) return;

  if (FeatureModelClass.prototype._essenceUsesPatched) return;
  FeatureModelClass.prototype._essenceUsesPatched = true;

  const originalPrepareDerivedData = FeatureModelClass.prototype.prepareDerivedData;

  FeatureModelClass.prototype.prepareDerivedData = function() {
    try {
      const formula = this.uses?.maxFormula;
      if (!formula || formula === "0") {
        this.uses.max = 0;
        this.uses.value = 0 - (this.uses.spent || 0);
        return;
      }

      // If formula is purely numeric
      const numericVal = Number(formula);
      if (!isNaN(numericVal)) {
        this.uses.max = numericVal;
        this.uses.value = this.uses.max - (this.uses.spent || 0);
        return;
      }

      // Try safe synchronous evaluation
      try {
        const roll = Roll.create(formula, this.parent?.getRollData?.() || {});
        this.uses.max = Number(roll.evaluateSync().total) || 0;
      } catch (err) {
        // Fallback if formula contains non-mathematical words (e.g. "Rest", "Encounter")
        const numMatch = typeof formula === "string" ? formula.match(/\d+/) : null;
        this.uses.max = numMatch ? Number(numMatch[0]) : 0;
      }
      this.uses.value = (this.uses.max || 0) - (this.uses.spent || 0);
    } catch (err) {
      if (this.uses) {
        this.uses.max = Number(this.uses.max) || 0;
        this.uses.value = this.uses.max - (this.uses.spent || 0);
      }
    }
  };
}

