/**
 * mythcraft-essence-sheet | src/module.mjs
 *
 * Main entry point for the Essence Sheet module.
 *
 * Registers alternate sheet classes that extend the MythCraft system sheets
 * with Essence-specific data remapping and HUD-aesthetic styling.
 */

import {
  EssenceCharacterSheet,
  EssenceNPCSheet,
  EssenceItemSheet,
  EssenceSiegeWeaponSheet,
} from "./sheets/_module.mjs";
import { initDamageAutomation, applyActorDamage, patchFeatureUsesMaxFormula } from "./features/damage-automation.mjs";
import { initEquipmentAutomation, patchWeaponApcGetter, isBrassKnuckles, isUnarmedOrNaturalWeapon, getWeaponDamageData } from "./features/equipment-automation.mjs";
import { initCompendiumIconOverrides } from "./features/equipment-icons.mjs";
import { patchSystemHpCalculation, getEnduranceThreshold, calculateApMax } from "./features/hp-automation.mjs";
import { patchSystemSkillsCalculation } from "./features/skills-automation.mjs";
import { syncHomebrewAttributesToSystem, syncSoulDamageToSystem, patchAttributeSkillInput, getFullAttributeName } from "./features/homebrew-attributes.mjs";
import { initLuckPointReroll } from "./features/luck-points.mjs";
import { initPermissionsFix } from "./features/permissions-fix.mjs";
import LevelUpDialog from "./apps/level-up-dialog.mjs";
import { registerSettings, applySheetScale } from "./settings.mjs";

import { findTagDefinition, getActiveTagsLibrary, syncCustomTagsToSystem, patchTagInputElement } from "./data/tags-library.mjs";
import { getEnrichedItemTags, getActorCritHit, getActorCritFail, hasAstoundingCritical, makeExplodingDiceFormula, rollItemDamage, executeSpellUpchargeFromChat, computeUpchargedFormula, postSpellDescriptionCard, buildSpellLibraryChatControlsHTML, rollSpellItem, rollWeaponItem } from "./sheets/essence-character-sheet.mjs";
import { SPELL_LIBRARY, getSpellLibraryEntry, getSpellRequirementsBadges, checkSpellPrerequisite, evaluateSpellScalingAndUpcharge } from "./data/spell-library.mjs";
import { getDefenseTargetConfig, renderDefenseTargetBadgeHTML, DEFENSE_TARGET_CONFIG } from "./data/defense-config.mjs";
import { mcConditions as MythcraftConditions } from "./data/condition-data.mjs";
import { initCombatAutomation, resetTurnMovementStride } from "./features/combat-automation.mjs";
import { initConditionAutomation, purgeInvalidStatusEffects, isMythcraftCondition, suppressConditions, applyConditionDamage } from "./features/condition-automation.mjs";
import { executeRest, RestDialog } from "./features/rest-automation.mjs";
import { calculateItemAPC, calculateItemSP, checkAndEnforceAp, checkAndEnforceSp, deductAp, deductSp, executeUnifiedAction, refundSP } from "./features/sp-ap-rolls.mjs";
import { initActiveEffectEngine, getActorActiveEffectBonuses, summarizeActiveEffect } from "./features/active-effect-engine.mjs";
import ActiveEffectManager from "./apps/active-effect-manager.mjs";
import WhatsNewDialog from "./apps/whats-new-dialog.mjs";
import TalentGrantDialog from "./apps/talent-grant-dialog.mjs";
import TalentSkillAllocationDialog, { applySkillAllocationActiveEffect } from "./apps/talent-skill-dialog.mjs";
import { getTalentSkillPointGrant, SKILLS_BY_CATEGORY, SKILLS_BY_ATTRIBUTE, SKILL_REGISTRY } from "./data/talent-skill-grants.mjs";

const MODULE_ID  = "mythcraft-essence-sheet";



const SYSTEM_ID  = "mythcraft";

/* ─────────────────────────────────────────────────────────────────────────────
 *  init – Sheet registration
 *  Called before any document data is available, so use it only for:
 *  • Sheet registration                (DocumentSheetConfig.registerSheet)
 *  • CONFIG variable overrides         (CONFIG.*)
 *  • Handlebars helper registration    (Handlebars.registerHelper)
 * ──────────────────────────────────────────────────────────────────────────── */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initialising Essence Sheet module.`);

  // Register granular module settings
  registerSettings();
  applySheetScale();

  // Register helpers before any initialization can render an Application.
  Handlebars.registerHelper("toUpperCase", (str) => typeof str === "string" ? str.toUpperCase() : String(str ?? ""));
  Handlebars.registerHelper("uppercase", (str) => typeof str === "string" ? str.toUpperCase() : String(str ?? ""));

  // Populate core status effects with MythCraft condition definitions
  CONFIG.statusEffects = MythcraftConditions;

  // Initialize Automation Engines
  initActiveEffectEngine();
  initDamageAutomation();
  initEquipmentAutomation();
  initCompendiumIconOverrides();
  initCombatAutomation();
  initConditionAutomation();
  patchSystemHpCalculation();
  patchSystemSkillsCalculation();
  syncHomebrewAttributesToSystem();
  syncSoulDamageToSystem();
  syncCustomTagsToSystem();
  patchTagInputElement();
  patchAttributeSkillInput();
  initLuckPointReroll();
  initPermissionsFix();

  // ── Actor & Item Sheets Registration ───────────────────────────────────────
  const registerActorSheet = (cls, type, label) => {
    const actorDoc = globalThis.Actor || foundry.documents?.BaseActor || foundry.documents?.Actor;
    if (actorDoc && foundry.applications?.apps?.DocumentSheetConfig?.registerSheet) {
      try {
        foundry.applications.apps.DocumentSheetConfig.registerSheet(actorDoc, MODULE_ID, cls, {
          makeDefault: true,
          types: [type],
          label,
        });
        return;
      } catch (e) {
        console.warn(`${MODULE_ID} | DocumentSheetConfig.registerSheet for ${type} failed:`, e);
      }
    }
    const actorsCollection = foundry.documents?.collections?.Actors || globalThis.Actors;
    if (actorsCollection?.registerSheet) {
      try {
        actorsCollection.registerSheet(MODULE_ID, cls, {
          makeDefault: true,
          types: [type],
          label,
        });
      } catch (e) {
        console.warn(`${MODULE_ID} | Actors.registerSheet for ${type} failed:`, e);
      }
    }
  };

  registerActorSheet(EssenceCharacterSheet, "character", "MythCraft Essence: Character Sheet");
  registerActorSheet(EssenceNPCSheet, "npc", "MythCraft Essence: NPC Sheet");
  registerActorSheet(EssenceSiegeWeaponSheet, "siege", "MythCraft Essence: Siege Weapon Sheet");

  const itemDoc = globalThis.Item || foundry.documents?.BaseItem || foundry.documents?.Item;
  let itemRegistered = false;
  if (itemDoc && foundry.applications?.apps?.DocumentSheetConfig?.registerSheet) {
    try {
      foundry.applications.apps.DocumentSheetConfig.registerSheet(itemDoc, MODULE_ID, EssenceItemSheet, {
        makeDefault: true,
        label: "MythCraft Essence: Item Sheet",
      });
      itemRegistered = true;
    } catch (e) {}
  }
  if (!itemRegistered) {
    const itemsCollection = foundry.documents?.collections?.Items || globalThis.Items;
    if (itemsCollection?.registerSheet) {
      try {
        itemsCollection.registerSheet(MODULE_ID, EssenceItemSheet, {
          makeDefault: true,
          label: "MythCraft Essence: Item Sheet",
        });
      } catch (e) {}
    }
  }

  // ── CONFIG overrides ───────────────────────────────────────────────────────
  // Place any CONFIG.* remaps here.  These run before any actor data is
  // resolved, so they affect derived values used everywhere (formulas, labels).
  //
  // Example – override the initiative formula:
  //   CONFIG.Combat.initiative.formula = "1d20 + @attributes.awr + @initiative.bonus";
  //
  // Example – add a custom status effect:
  //   CONFIG.statusEffects.push({ id: "essence-stunned", label: "Essence: Stunned", icon: "..." });

  // ── Handlebars helpers ─────────────────────────────────────────────────────
  // Helpers required by Essence templates that are not built into Foundry.

  // {{percent value max}} → integer 0-100 safe for CSS width
  Handlebars.registerHelper("percent", (value, max) => {
    const v = Number(value) || 0;
    const m = Number(max)   || 0;
    return m > 0 ? Math.round(Math.min(100, Math.max(0, (v / m) * 100))) : 0;
  });

  // {{#times n}} ... {{/times}}  (0-indexed @index available inside)
  Handlebars.registerHelper("times", function(n, options) {
    let out = "";
    const count = Number(n) || 0;
    for (let i = 0; i < count; i++) {
      out += options.fn(this, { data: Handlebars.createFrame({ ...options.data, index: i }) });
    }
    return out;
  });

  // Comparison helpers (used as sub-expressions: {{#if (gte x y)}} )
  Handlebars.registerHelper("gte", (a, b) => Number(a) >= Number(b));
  Handlebars.registerHelper("lte", (a, b) => Number(a) <= Number(b));
  Handlebars.registerHelper("gt",  (a, b) => Number(a) >  Number(b));
  Handlebars.registerHelper("lt",  (a, b) => Number(a) <  Number(b));
  Handlebars.registerHelper("eq",  (a, b) => a === b);
  Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("subtract", (a, b) => Number(a) - Number(b));
  Handlebars.registerHelper("and", (...args) => {
    args.pop();
    return args.every(Boolean);
  });
  Handlebars.registerHelper("or", (...args) => {
    args.pop();
    return args.some(Boolean);
  });
  Handlebars.registerHelper("not", (val) => !val);
  Handlebars.registerHelper("includes", (collection, item) => {
    if (!collection || !item) return false;
    if (typeof collection === "string") return collection.includes(String(item));
    if (Array.isArray(collection)) return collection.includes(item);
    if (collection instanceof Set) return collection.has(item);
    if (typeof collection === "object") return Object.values(collection).includes(item);
    return false;
  });
  // String concat helper (used as sub-expression in formInput name= param)
  // Only register if Foundry hasn't already provided one.
  if (!Handlebars.helpers["concat"]) {
    Handlebars.registerHelper("concat", (...args) => {
      // Last arg is the Handlebars options hash — drop it.
      args.pop();
      return args.join("");
    });
  }

  // Expose Global & Module API early for other scripts and macros
  globalThis.mythcraftEssenceSheet = {
    getDefenseTargetConfig,
    renderDefenseTargetBadgeHTML,
    DEFENSE_TARGET_CONFIG,
    findTagDefinition,
    getEnrichedItemTags,
    getActiveTagsLibrary,
    getActorCritHit,
    getActorCritFail,
    hasAstoundingCritical,
    makeExplodingDiceFormula,
    rollItemDamage,
    rollSpellItem,
    rollWeaponItem,
    postSpellDescriptionCard,
    executeRest,
    RestDialog,
    ActiveEffectManager,
    getActorActiveEffectBonuses,
    summarizeActiveEffect,
    TalentGrantDialog,
    TalentSkillAllocationDialog,
    promptSkillAllocation: (actor, item, grant) => TalentSkillAllocationDialog.promptAllocation(actor, item, grant),
    applySkillAllocationActiveEffect,
    getTalentSkillPointGrant,
    SKILLS_BY_CATEGORY,
    SKILLS_BY_ATTRIBUTE,
    SKILL_REGISTRY,
    WhatsNewDialog,
    resetWhatsNew: (show = true) => WhatsNewDialog.reset(show),
    showWhatsNew: () => WhatsNewDialog.show(),
  };

  const handleChatMessageRender = async (arg1, arg2, arg3) => {
    let message = null;
    let html = null;

    if (arg1 instanceof HTMLElement || (arg1 && typeof arg1 === "object" && "jquery" in arg1)) {
      html = arg1;
      message = arg2;
    } else if (arg2 instanceof HTMLElement || (arg2 && typeof arg2 === "object" && "jquery" in arg2)) {
      message = arg1;
      html = arg2;
    } else if (arg1 && typeof arg1 === "object") {
      message = arg1;
      html = arg2;
    }

    const root = html instanceof HTMLElement ? html : (html?.[0] || html);
    if (!root || !(root instanceof HTMLElement)) return;

    if (!message && root.dataset?.messageId) {
      message = game.messages?.get(root.dataset.messageId);
    }
    if (!message) return;

    if (root.dataset.essenceEnriched === "true" && root.querySelector(".chat-defense-target-badge")) {
      return;
    }
    root.dataset.essenceEnriched = "true";

    // 0. Format attribute check titles & clean unlocalized keys in chat card headers
    const formatAttributeCheckText = (raw) => {
      if (!raw || typeof raw !== "string") return raw;
      let text = raw;

      // Replace core & homebrew localization paths
      text = text.replace(/MYTHCRAFT\.Actor\.base\.FIELDS\.attributes\.([a-zA-Z0-9_-]+)\.label/g, (_, k) => getFullAttributeName(k));

      // Replace abbreviation checks like "awr Check", "STR Check", "dex check" with "Awareness Check", "Strength Check", etc.
      const abbrMap = {
        str: "Strength",
        dex: "Dexterity",
        end: "Endurance",
        awr: "Awareness",
        int: "Intellect",
        cha: "Charisma",
        lck: "Luck",
        cor: "Coordination",
        san: "Sanity",
      };

      const customAttrs = game.settings?.get?.(MODULE_ID, "customAttributes") ?? [];
      for (const ca of customAttrs) {
        if (ca.key && ca.name) {
          abbrMap[ca.key.toLowerCase()] = ca.name;
          if (ca.abbr) abbrMap[ca.abbr.toLowerCase()] = ca.name;
        }
      }

      for (const [abbr, fullName] of Object.entries(abbrMap)) {
        const re = new RegExp(`^\\s*${abbr}\\s+check\\b`, "i");
        text = text.replace(re, `${fullName} Check`);
        const reMid = new RegExp(`\\b${abbr}\\s+check\\b`, "gi");
        text = text.replace(reMid, `${fullName} Check`);
      }

      return text;
    };

    const headerEls = root.querySelectorAll(".flavor-text, .card-header h3, .card-header, h3, .card-title, .message-header, .dice-flavor, .title");
    headerEls.forEach(el => {
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        el.textContent = formatAttributeCheckText(el.textContent);
      } else {
        for (const child of el.childNodes) {
          if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
            child.nodeValue = formatAttributeCheckText(child.nodeValue);
          }
        }
      }
    });

    // Check if this message is a Damage Roll or Healing Roll

    const isDamageMessage = message.flags?.["mythcraft-essence-sheet"]?.isDamage ||
                            message.flags?.mythcraft?.isDamage ||
                            message.rolls?.some(r => r.constructor?.name === "DamageRoll" || r.class === "DamageRoll" || r.options?.isDamage || r.options?.type === "damage" || r.options?.type === "healing") ||
                            root.querySelector(".apply-damage-btn, .apply-healing-btn") ||
                            (/^\s*damage\s*roll/i.test(message.flavor || "") || /^\s*critical\s*damage/i.test(message.flavor || ""));

    if (isDamageMessage) {
      // Prevent duplicate or redundant "Roll Damage" buttons inside a Damage Roll card
      root.querySelectorAll(".roll-damage:not(.apply-damage-btn), .essence-chat-damage-btn, .chat-damage-action-wrap").forEach(el => el.remove());
    }

    // Resolve associated item and actor
    let item = null;
    const itemUuid = message.flags?.["mythcraft-essence-sheet"]?.itemUuid || 
                     message.flags?.mythcraft?.itemUuid ||
                     message.flags?.dnd5e?.itemUuid;

    if (itemUuid) {
      try {
        item = fromUuidSync(itemUuid);
      } catch (e) {
        // UUID resolution failover
      }
    }

    const actorId = message.speaker?.actor;
    const actor = (typeof ChatMessage.getSpeakerActor === "function" ? ChatMessage.getSpeakerActor(message.speaker) : null) || 
                  (actorId ? game.actors.get(actorId) : null);

    if (!item && actor) {
      const itemId = message.flags?.["mythcraft-essence-sheet"]?.itemId || 
                     message.flags?.mythcraft?.itemId || 
                     root.dataset?.itemId || 
                     root.querySelector("[data-item-id]")?.dataset?.itemId;

      if (itemId) {
        item = actor.items.get(itemId);
      }

      // Check roll options for spellName, weaponName, or itemName
      if (!item && message.rolls?.length) {
        for (const r of message.rolls) {
          const rollItemName = r.options?.spellName || r.options?.weaponName || r.options?.itemName;
          if (rollItemName) {
            item = actor.items.find(i => i.name.toLowerCase() === rollItemName.toLowerCase());
            if (item) break;
          }
        }
      }

      // Match by item name from flavor string (e.g. "Knife (x3) - Attack Roll" or "Knife (x3)")
      if (!item && message.flavor) {
        const flavorClean = message.flavor.split(/[-–—:]/)[0].trim().toLowerCase();
        if (flavorClean) {
          item = actor.items.find(i => i.name.toLowerCase() === flavorClean || i.name.toLowerCase().includes(flavorClean) || flavorClean.includes(i.name.toLowerCase()));
        }
      }

      // Match from card header / title in HTML
      if (!item) {
        const cardTitleEl = root.querySelector(".card-header, .card-title, .title, .item-name");
        if (cardTitleEl) {
          const titleText = cardTitleEl.textContent.replace(/vs\s+[a-z]+/i, '').split(/[(–—:]/)[0].trim().toLowerCase();
          if (titleText) {
            item = actor.items.find(i => i.name.toLowerCase() === titleText || i.name.toLowerCase().includes(titleText) || titleText.includes(i.name.toLowerCase()));
          }
        }
      }
    }

    // 1. Critical Hit Range, Fumble, Max Damage & Min Damage Detection
    let isCrit = message.flags?.["mythcraft-essence-sheet"]?.isCrit;
    let isFumble = message.flags?.["mythcraft-essence-sheet"]?.isFumble;
    let isMaxDmg = false;
    let isMinDmg = false;

    const critHit = actor ? getActorCritHit(actor) : 20;
    const critFail = actor ? getActorCritFail(actor) : 1;

    if (Array.isArray(message.rolls) && message.rolls.length > 0) {
      for (const r of message.rolls) {
        // Check for d20 (Attack / Skill / Check rolls)
        let d20Result = null;
        if (Array.isArray(r.terms)) {
          for (const term of r.terms) {
            if (term.faces === 20 && Array.isArray(term.results)) {
              const activeResult = term.results.find(res => res.active !== false) || term.results[0];
              if (activeResult && typeof activeResult.result === "number") {
                d20Result = activeResult.result;
                break;
              }
            }
          }
        }

        if (d20Result === null && Array.isArray(r.dice)) {
          const d20 = r.dice.find(d => d.faces === 20);
          if (d20 && Array.isArray(d20.results)) {
            const activeResult = d20.results.find(res => res.active !== false) || d20.results[0];
            if (activeResult && typeof activeResult.result === "number") {
              d20Result = activeResult.result;
            }
          }
        }

        if (typeof d20Result === "number") {
          if (d20Result >= critHit) isCrit = true;
          else if (d20Result <= critFail) isFumble = true;
        }

        // Check for Damage dice (Max vs Min damage)
        let totalDice = 0;
        let maxCount = 0;
        let minCount = 0;
        const diceTerms = Array.isArray(r.dice) ? r.dice : (Array.isArray(r.terms) ? r.terms.filter(t => t.faces > 0 && Array.isArray(t.results)) : []);
        for (const d of diceTerms) {
          if (d.faces > 0 && Array.isArray(d.results)) {
            for (const res of d.results) {
              if (res.active !== false && typeof res.result === "number") {
                totalDice++;
                if (res.result === d.faces) maxCount++;
                if (res.result === 1) minCount++;
              }
            }
          }
        }
        if (totalDice > 0 && maxCount === totalDice) isMaxDmg = true;
        if (totalDice > 0 && minCount === totalDice) isMinDmg = true;
      }
    }

    // Check flavor text and existing classes for critical markers
    if (isCrit === undefined || isCrit === false) {
      if (/critical hit|\bcrit\b/i.test(message.flavor || "") || /critical damage/i.test(message.flavor || "") || root.querySelector(".dice-total.critical, .dice-total.max, .crit-success")) {
        isCrit = true;
      }
    }
    if (isFumble === undefined || isFumble === false) {
      if (/critical fail|\bfumble\b/i.test(message.flavor || "") || root.querySelector(".dice-total.fumble, .dice-total.min, .crit-fail")) {
        isFumble = true;
      }
    }

    const isRecent = (Date.now() - (message.timestamp || Date.now())) < 4000;
    if (!isRecent) root.classList.add("not-recent");

    const applyCritStyling = () => {
      if (isCrit || isMaxDmg) {
        root.classList.add("is-crit", "crit-success");
        root.querySelectorAll(".dice-total, .js-slot-display, .roll-value, .animated-rolls-big-value").forEach(el => {
          el.style.setProperty("color", "#39d98a", "important");
          el.style.setProperty("text-shadow", "0 0 10px rgba(57, 217, 138, 0.85), 0 0 20px rgba(57, 217, 138, 0.55)", "important");
        });
      } else if (isFumble || isMinDmg) {
        root.classList.add("is-fumble", "crit-fail");
        root.querySelectorAll(".dice-total, .js-slot-display, .roll-value, .animated-rolls-big-value").forEach(el => {
          el.style.setProperty("color", "#ff4d4f", "important");
          el.style.setProperty("text-shadow", "0 0 10px rgba(255, 77, 79, 0.85), 0 0 20px rgba(255, 77, 79, 0.55)", "important");
        });
      }
    };

    const applyDamageButtons = root.querySelectorAll(".apply-damage, .apply-damage-btn, .apply-healing, .apply-healing-btn");

    // Enhance & format Apply Damage Buttons (Soul Damage Purple & Clean Labels)
    applyDamageButtons.forEach((btn, idx) => {
      if (btn.classList.contains("apply-healing") || btn.classList.contains("apply-healing-btn")) return;
      const rollIdx = btn.dataset.index !== undefined ? Number(btn.dataset.index) : idx;
      const roll = message?.rolls?.[rollIdx] || message?.rolls?.[0];

      const itemIsSoul = Boolean(
        item?.flags?.["mythcraft-essence-sheet"]?.isSoulDamage ||
        item?.flags?.["mythcraft-essence-sheet"]?.damageType === "soul" ||
        item?.system?.isSoulDamage ||
        item?.system?.damageType === "soul" ||
        item?.system?.damage?.type === "soul" ||
        (Array.isArray(item?.system?.damage) && item.system.damage.some(d => d?.type === "soul" || d?.types?.includes("soul"))) ||
        (Array.isArray(item?.system?.tags) ? item.system.tags.some(t => /soul/i.test(t)) : (typeof item?.system?.tags === "object" && item?.system?.tags && Object.values(item.system.tags).some(t => /soul/i.test(t))))
      );

      let dmgType = (
        btn.dataset.damageType || 
        btn.dataset.type || 
        roll?.options?.type || 
        roll?.type || 
        message?.flags?.["mythcraft-essence-sheet"]?.damageType || 
        (itemIsSoul ? "soul" : null) ||
        item?.system?.damage?.[0]?.type || 
        item?.system?.damageType || 
        ""
      ).toLowerCase().trim();

      if (btn.textContent && /soul/i.test(btn.textContent)) dmgType = "soul";

      const total = btn.dataset.value !== undefined ? Number(btn.dataset.value) : (roll?.total ?? 0);

      if (dmgType === "soul" || dmgType === "soul damage" || dmgType === "soul-damage" || itemIsSoul) {
        btn.dataset.damageType = "soul";
        btn.classList.add("soul-damage-btn");
        btn.innerHTML = `<i class="fas fa-ghost"></i> <span>APPLY SOUL DAMAGE (${total})</span>`;
      } else {
        // Clean up accidental duplicate "DAMAGE DAMAGE" labels from core system
        if (btn.textContent && (/damage\s+damage/i.test(btn.textContent) || /apply\s+damage\s+damage/i.test(btn.textContent))) {
          const cleanType = (dmgType && dmgType !== "damage") ? `${dmgType.toUpperCase()} ` : "";
          btn.innerHTML = `<i class="fas fa-sword"></i> <span>APPLY ${cleanType}DAMAGE (${total})</span>`;
        }
      }
    });

    if (isRecent) {
      // Build suspense: Hide the Apply Damage button initially, wait until the roll animation finishes and modifiers land, then pop it in!
      if (applyDamageButtons.length > 0) {
        applyDamageButtons.forEach(btn => {
          btn.classList.add("suspense-hidden");
          btn.classList.remove("suspense-revealed");
        });
      }

      const rollDuration = (game.modules.get('mythcraft-hud')?.active 
        ? (Number(game.settings.get('mythcraft-hud', 'rollAnimationDuration')) || 1300) 
        : (game.dice3d ? 1500 : 700));

      const revealButtons = () => {
        applyCritStyling();
        if (applyDamageButtons.length > 0) {
          applyDamageButtons.forEach(btn => {
            btn.classList.remove("suspense-hidden");
            btn.classList.add("suspense-revealed");
          });
        }
      };

      if (game.dice3d && typeof Hooks.once === "function") {
        let revealed = false;
        const fallbackTimer = setTimeout(() => {
          if (!revealed) {
            revealed = true;
            revealButtons();
          }
        }, rollDuration + 1000);

        Hooks.once("diceSoNiceRollComplete", (msgId) => {
          if (msgId === message.id && !revealed) {
            revealed = true;
            clearTimeout(fallbackTimer);
            setTimeout(revealButtons, 300);
          }
        });
      } else {
        setTimeout(revealButtons, rollDuration);
      }
    } else {
      // Historical messages on load / refresh get colored and revealed immediately
      applyCritStyling();
      if (applyDamageButtons.length > 0) {
        applyDamageButtons.forEach(btn => {
          btn.classList.remove("suspense-hidden");
          btn.classList.add("suspense-revealed");
        });
      }
    }

  // 2. Tag Strip Injection
  if (item && !root.querySelector(".chat-tags-strip")) {
    const tags = getEnrichedItemTags(item);
    if (tags && tags.length) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "chat-tags-strip expanded-tags-strip";
      tagsContainer.style.cssText = "display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 4px 0 6px; padding: 4px 0; border-top: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08);";

      tagsContainer.innerHTML = tags.map(tag => `
        <span class="tag-badge-pill ${tag.category}" 
              style="--cat-color: ${tag.categoryMeta.color}; --cat-bg: ${tag.categoryMeta.bg}; --cat-border: ${tag.categoryMeta.border};"
              data-tooltip="${tag.tooltipHTML.replace(/"/g, '&quot;')}"
              data-tooltip-direction="UP">
          <i class="${tag.categoryMeta.icon}"></i>
          <span class="tag-badge-name">${tag.name}</span>
        </span>
      `).join("");

      const cardHeader = root.querySelector(".card-header, .mythcraft-statblock .card-header");
      if (cardHeader && cardHeader.parentNode) {
        cardHeader.parentNode.insertBefore(tagsContainer, cardHeader.nextSibling);
      } else {
        const targetHeader = root.querySelector(".message-header") || 
                             root.querySelector(".flavor-text") ||
                             root.querySelector(".dice-roll");
        if (targetHeader && targetHeader.parentNode) {
          targetHeader.parentNode.insertBefore(tagsContainer, targetHeader.nextSibling);
        } else {
          const content = root.querySelector(".message-content") || root;
          content.prepend(tagsContainer);
        }
      }
    }
  }

  // 3. Defense Target Badge Injection for Weapon Attacks, Spell Attacks & Attack Roll Cards
  const isWeaponAttack = item?.type === "weapon";
  const hasDefenseTarget = Boolean(item?.system?.defenseTarget || item?.system?.defense || item?.system?.targetDefense);
  const flavorText = String(message.flavor || "").toLowerCase();
  const rootText = String(root.textContent || "").toLowerCase();
  const flavorVsMatch = flavorText.match(/\bvs\s+([a-zA-Z]+)\b/i);
  const contentVsMatch = rootText.match(/\bvs\s+([a-zA-Z]+)\b/i);

  const isAttackMessage = isWeaponAttack ||
                          hasDefenseTarget ||
                          Boolean(message.flags?.["mythcraft-essence-sheet"]?.isAttack) ||
                          Boolean(message.flags?.["mythcraft-essence-sheet"]?.isSpell) ||
                          Boolean(message.flags?.["mythcraft-essence-sheet"]?.defenseTarget) ||
                          Boolean(message.flags?.["mythcraft-hud"]?.defenseTarget) ||
                          Boolean(message.flags?.mythcraft?.defenseTarget) ||
                          Boolean(message.flags?.mythcraft?.defense) ||
                          Boolean(message.flags?.mythcraft?.isAttack) ||
                          message.rolls?.some(r => r.options?.defenseTarget || r.options?.targetDefense || r.constructor?.name === "AttackRoll" || r.class === "AttackRoll" || r.constructor?.name === "SpellRoll" || r.class === "SpellRoll") ||
                          root.querySelector(".attack-card, .attack-defense, .spell-card, [data-defense-target]") !== null ||
                          /attack\s*roll/i.test(flavorText) ||
                          /attack\s*check/i.test(flavorText) ||
                          Boolean(flavorVsMatch) ||
                          Boolean(contentVsMatch);

  const spellLibEntry = item?.type === "spell" ? getSpellLibraryEntry(item) : null;
  const isNonAttackSpell = Boolean(
    message.flags?.["mythcraft-essence-sheet"]?.isNonAttackSpell ||
    root.querySelector("[data-non-attack-spell='true']") ||
    (spellLibEntry && !spellLibEntry.isAttack)
  );
  const explicitTarget = message.flags?.["mythcraft-essence-sheet"]?.defenseTarget ||
                         spellLibEntry?.target ||
                         null;

  if (isNonAttackSpell && !explicitTarget) {
    root.querySelectorAll(".chat-defense-target-badge, .attack-defense").forEach(el => el.remove());
  }

  if (isAttackMessage && (!isNonAttackSpell || explicitTarget)) {
    const rawDefense = message.flags?.["mythcraft-essence-sheet"]?.defenseTarget ||
                       spellLibEntry?.target ||
                       message.flags?.["mythcraft-hud"]?.defenseTarget ||
                       message.flags?.mythcraft?.defenseTarget ||
                       message.flags?.mythcraft?.defense ||
                       message.rolls?.find(r => r.options?.defenseTarget)?.options?.defenseTarget ||
                       message.rolls?.find(r => r.options?.targetDefense)?.options?.targetDefense ||
                       item?.system?.defenseTarget ||
                       item?.system?.defense ||
                       item?.system?.targetDefense ||
                       flavorVsMatch?.[1] ||
                       contentVsMatch?.[1] ||
                       "ar";

    const defConfig = getDefenseTargetConfig(rawDefense);

    // Remove plain text attack-defense if present
    root.querySelectorAll(".attack-defense").forEach(el => el.remove());

    // Locate or create the prominent card header banner
    let targetHeader = root.querySelector(".essence-chat-card-header");
    if (!targetHeader) {
      targetHeader = root.querySelector(".mythcraft-statblock .card-header, .attack-card .card-header, .spell-card .card-header");
    }

    const diceRollEl = root.querySelector(".dice-roll");
    const msgContent = root.querySelector(".message-content") || root;
    const diceFlavorEl = root.querySelector(".dice-flavor");

    if (!targetHeader) {
      targetHeader = document.createElement("div");
      targetHeader.className = "essence-chat-card-header";
      const titleText = message.flavor || diceFlavorEl?.textContent?.trim() || (item ? `${item.name}` : "Attack Roll");
      targetHeader.innerHTML = `<h4 class="card-roll-title">${titleText}</h4>`;
      if (diceRollEl) {
        diceRollEl.prepend(targetHeader);
      } else {
        msgContent.prepend(targetHeader);
      }
    }

    if (diceFlavorEl && (targetHeader.classList.contains("essence-chat-card-header") || targetHeader.querySelector(".card-roll-title, .card-title"))) {
      diceFlavorEl.style.display = "none";
    }

    targetHeader.style.display = "flex";
    targetHeader.style.alignItems = "center";
    targetHeader.style.justifyContent = "space-between";
    targetHeader.style.gap = "8px";

    // Ensure badge is inside targetHeader
    let badgeEl = targetHeader.querySelector(".chat-defense-target-badge");
    if (!badgeEl) {
      badgeEl = document.createElement("span");
      targetHeader.appendChild(badgeEl);
    }
    badgeEl.className = `chat-defense-target-badge def-${defConfig.key}`;
    badgeEl.style.cssText = `--def-color: ${defConfig.color}; --def-bg: ${defConfig.bg}; --def-border: ${defConfig.border}; margin-left: auto; display: inline-flex !important;`;
    badgeEl.setAttribute("title", `Target Defense: ${defConfig.label} (${defConfig.abbr})`);
    badgeEl.setAttribute("data-tooltip", `Target Defense: <strong>${defConfig.label} (${defConfig.abbr})</strong>`);
    badgeEl.innerHTML = `
      <span class="vs-prefix">vs</span>
      <i class="${defConfig.icon} def-icon"></i>
      <span class="def-abbr">${defConfig.abbr}</span>
    `;
  }


  // 4. Damage Button Enhancement / Injection for Weapon & Spell Cards (including Hotbar rolls)
  let isEssenceSpellCard = Boolean(root.querySelector(".essence-spell-chat-card"));

  // If a Spell was rolled from the Hotbar / HUD (not yet enriched as .essence-spell-chat-card),
  // upgrade the card with full Spell Library metadata, damage roll button, power scaling, and upcharge controls!
  if (item?.type === "spell" && actor && !isDamageMessage && !isEssenceSpellCard) {
    const cardBox = root.querySelector(".mythcraft-statblock, .spell-card, .chat-card") || root.querySelector(".message-content") || root;
    cardBox.classList.add("essence-spell-chat-card");
    isEssenceSpellCard = true;

    const scalingInfo = evaluateSpellScalingAndUpcharge(actor, spellLibEntry || item, { afterBaseDeduction: true });

    // If this spell is a Non-Attack Spell in the Spell Library, hide any 1d20 attack roll box generated by the hotbar
    if (spellLibEntry && !spellLibEntry.isAttack) {
      cardBox.setAttribute("data-non-attack-spell", "true");
      cardBox.querySelectorAll(".roll-result, .animated-rolls-slot-container, .animated-rolls-total, .dice-result").forEach(el => {
        el.style.display = "none";
      });
    }

    // Inject Spell Library Details strip if not already present
    if (!cardBox.querySelector(".spell-chat-details")) {
      const sys = item.system || {};
      const magicSource = spellLibEntry?.magicSource || (sys.magicSource ? (sys.magicSource.charAt(0).toUpperCase() + sys.magicSource.slice(1)) : "");
      const spellType = spellLibEntry?.spellType || "Spell";
      const funcLabel = spellLibEntry?.function || sys.function || null;
      const apcVal = spellLibEntry
        ? (typeof spellLibEntry.apc === "number" ? scalingInfo.effectiveApc : spellLibEntry.apc)
        : (sys.apc ?? sys.ap ?? null);
      const spcVal = spellLibEntry
        ? (typeof spellLibEntry.spc === "number" ? scalingInfo.effectiveSpc : spellLibEntry.spc)
        : (sys.spc ?? sys.sp ?? null);
      const rangeLabel = spellLibEntry?.range || sys.rangeLabel || (sys.range?.value ? `${sys.range.value} ${sys.range.unit || "ft"}` : null);
      const durationLabel = spellLibEntry?.duration || sys.durationLabel || (sys.duration?.value ? `${sys.duration.value} ${sys.duration.unit || ""}` : null);
      const requiresLabel = spellLibEntry?.requires || null;
      const castingTimeLabel = spellLibEntry?.castingTime || sys.castingTime || null;
      const prereqLabel = spellLibEntry?.prerequisite || sys.recharge || null;
      const materialsLabel = spellLibEntry?.materials || null;

      const details = [];
      if (magicSource) details.push(`<strong>Source:</strong> ${magicSource} ${spellType}`);
      if (funcLabel) details.push(`<strong>Function:</strong> ${funcLabel}`);
      if (apcVal !== undefined && apcVal !== null && apcVal !== "") details.push(`<strong>APC:</strong> ${apcVal}`);
      if (spcVal !== undefined && spcVal !== null && spcVal !== "") details.push(`<strong>SPC:</strong> ${spcVal}`);
      if (rangeLabel) details.push(`<strong>Range:</strong> ${rangeLabel}`);
      if (durationLabel) details.push(`<strong>Duration:</strong> ${durationLabel}`);
      if (requiresLabel) details.push(`<strong>Requires:</strong> ${requiresLabel}`);
      if (castingTimeLabel) details.push(`<strong>Casting Time:</strong> ${castingTimeLabel}`);
      if (prereqLabel) details.push(`<strong>Prerequisite:</strong> ${prereqLabel}`);
      if (materialsLabel) details.push(`<strong>Materials:</strong> ${materialsLabel}`);

      if (details.length > 0) {
        const detailsEl = document.createElement("div");
        detailsEl.className = "spell-chat-details";
        detailsEl.style.cssText = "display:flex; flex-wrap:wrap; gap:5px 12px; margin:6px 0; font-size:11px; color:#cbd5e1; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1); padding:4px 0;";
        detailsEl.innerHTML = details.map(d => `<span>${d}</span>`).join("");

        const afterAnchor = cardBox.querySelector(".chat-tags-strip") || cardBox.querySelector(".card-header, .essence-chat-card-header");
        if (afterAnchor && afterAnchor.parentNode) {
          afterAnchor.parentNode.insertBefore(detailsEl, afterAnchor.nextSibling);
        } else {
          cardBox.prepend(detailsEl);
        }
      }
    }

    // Inject Spell Library Controls (Roll Damage, Power Scaling, Manifestation, Upcharge Available)
    if (!cardBox.querySelector(".essence-spell-controls-injected")) {
      const controlsHTML = buildSpellLibraryChatControlsHTML(actor, item, spellLibEntry, scalingInfo, {
        isCrit,
        includeBaseDamageBtn: true,
      });
      if (controlsHTML && controlsHTML.trim()) {
        const controlsWrap = document.createElement("div");
        controlsWrap.className = "essence-spell-controls-injected";
        controlsWrap.innerHTML = controlsHTML;

        const descEl = cardBox.querySelector(".card-description, .description, .spell-description");
        if (descEl && descEl.parentNode) {
          descEl.parentNode.insertBefore(controlsWrap, descEl);
        } else {
          cardBox.appendChild(controlsWrap);
        }
      }
    }
  }
  if (item && actor && !isDamageMessage && !isEssenceSpellCard) {
    const isBK = isBrassKnuckles(item);
    const isUnarmedOrNat = isUnarmedOrNaturalWeapon(item);
    const hasDamage =
      isBK ||
      isUnarmedOrNat ||
      (Array.isArray(item.system?.damage) && item.system.damage.some(d => d && d.formula)) ||
      Boolean(item.system?.damageFormula);

    if (hasDamage) {
      let btnWrap = root.querySelector(".chat-damage-action-wrap");
      const existingBtn = root.querySelector(".roll-damage, [data-action='rollEssenceDamage']");
      const wData = item.type === "weapon" ? getWeaponDamageData(actor, item) : null;
      const dmgHint = wData ? ` (${wData.effectiveFormula} ${wData.damageType || "blunt"})` : "";
      const btnLabel = isCrit ? `Roll Critical Damage${dmgHint}` : `Roll Damage${dmgHint}`;

      if (!btnWrap) {
        btnWrap = document.createElement("div");
        btnWrap.className = "chat-damage-action-wrap revealed";
        btnWrap.innerHTML = `
          <button type="button" class="essence-chat-damage-btn ${isCrit ? 'crit-damage-btn' : ''}" 
                  data-action="rollEssenceDamage" 
                  data-is-crit="${isCrit ? 'true' : 'false'}"
                  data-item-id="${item.id}"
                  data-actor-id="${actor.id}">
            <i class="fas fa-${isCrit ? 'burst' : 'sword'}"></i>
            <span>${btnLabel}</span>
          </button>
        `;

        if (existingBtn && existingBtn.parentNode) {
          existingBtn.replaceWith(btnWrap);
        } else {
          const body = root.querySelector(".mythcraft-statblock") || root.querySelector(".card-body") || root.querySelector(".message-content") || root;
          body.appendChild(btnWrap);
        }
      } else {
        btnWrap.classList.add("revealed");
        const btn = btnWrap.querySelector("button");
        if (btn) {
          btn.dataset.action = "rollEssenceDamage";
          btn.dataset.isCrit = isCrit ? "true" : "false";
          btn.dataset.itemId = item.id;
          btn.dataset.actorId = actor.id;
          if (isCrit) {
            btn.classList.add("crit-damage-btn");
            btn.innerHTML = `<i class="fas fa-burst"></i> <span>${btnLabel}</span>`;
          } else {
            btn.classList.remove("crit-damage-btn");
            btn.innerHTML = `<i class="fas fa-sword"></i> <span>${btnLabel}</span>`;
          }
        }
      }
    }
  }

  if (isEssenceSpellCard || root.querySelector(".spell-card") || (item?.type === "weapon" && !isDamageMessage)) {
    const cleanDuplicateSpellButtons = () => {
      root.querySelectorAll(".hud-action-button, .roll-spell-damage-btn").forEach(el => el.remove());
      root.querySelectorAll("button, a.button, [role='button']").forEach(btn => {
        if (
          btn.classList.contains("essence-chat-damage-btn") ||
          btn.classList.contains("essence-upcharge-roll-btn") ||
          btn.classList.contains("essence-upcharge-apply-btn") ||
          btn.classList.contains("apply-damage") ||
          btn.classList.contains("apply-damage-btn") ||
          btn.classList.contains("apply-healing") ||
          btn.classList.contains("apply-healing-btn") ||
          btn.dataset?.action === "rollEssenceDamage" ||
          btn.dataset?.action === "rollSpellUpcharge" ||
          btn.dataset?.action === "applySpellUpcharge"
        ) {
          return;
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim();
        if (/\broll\b.*\b(damage|healing)\b/i.test(txt)) {
          const parent = btn.parentElement;
          btn.remove();
          let p = parent;
          while (
            p &&
            p !== root &&
            !p.classList.contains("message-content") &&
            !p.classList.contains("essence-spell-chat-card") &&
            !p.classList.contains("spell-card") &&
            !p.classList.contains("attack-card") &&
            !p.classList.contains("mythcraft-statblock")
          ) {
            const nextParent = p.parentElement;
            if (p.querySelectorAll("button, input, select, img").length === 0 && !(p.textContent || "").trim()) {
              p.remove();
              p = nextParent;
            } else {
              break;
            }
          }
        }
      });
    };
    cleanDuplicateSpellButtons();
    if (typeof MutationObserver !== "undefined" && !root._essenceSpellObserver) {
      const obs = new MutationObserver(() => cleanDuplicateSpellButtons());
      obs.observe(root, { childList: true, subtree: true });
      root._essenceSpellObserver = obs;
      setTimeout(() => obs.disconnect(), 10000);
    }
    setTimeout(cleanDuplicateSpellButtons, 50);
    setTimeout(cleanDuplicateSpellButtons, 250);
    setTimeout(cleanDuplicateSpellButtons, 800);
    setTimeout(cleanDuplicateSpellButtons, 1800);
    setTimeout(cleanDuplicateSpellButtons, 3000);
  }
  };

  Hooks.on("renderChatMessage", handleChatMessageRender);
  Hooks.on("renderChatMessageHTML", handleChatMessageRender);

  patchFeatureUsesMaxFormula();

  // Default newly created Character Actors to Level 0 and 0 HP
  Hooks.on("createActor", async (actor, options, userId) => {
    if (game.user.id !== userId) return;
    if (actor.type === "character") {
      const currentLevel = actor.system?.level;
      if ((currentLevel === 1 || currentLevel === 0) && (actor.system?.hp?.max === 15 || actor.system?.hp?.max === 0)) {
        await actor.update({
          "system.level": 0,
          "system.hp.max": 0,
          "system.hp.value": 0,
        });
      }
    }
  });

  // Track previous Endurance before update to detect threshold shifts,
  // and ensure current AP raises when max AP or COR increases.
  Hooks.on("preUpdateActor", (actor, changed, options, userId) => {
    if (actor.type !== "character") return;

    if (changed.system?.attributes?.end !== undefined) {
      options._essenceOldEnd = Number(actor.system.attributes?.end ?? 0);
    }

    // When COR is updated, calculate AP gain and increase current AP
    const flat = foundry.utils.flattenObject(changed);
    let rawNewCor = flat["system.attributes.cor.value"] ?? flat["system.attributes.cor"];
    if (rawNewCor === undefined && changed.system?.attributes?.cor !== undefined) {
      rawNewCor = changed.system.attributes.cor;
    }
    if (rawNewCor !== undefined && typeof rawNewCor === "object" && rawNewCor !== null && "value" in rawNewCor) {
      rawNewCor = rawNewCor.value;
    }

    let corApGained = 0;
    if (rawNewCor !== undefined) {
      const newCorVal = Number(rawNewCor);
      if (!isNaN(newCorVal)) {
        const oldCorVal = Number(actor.system?.attributes?.cor?.value ?? actor.system?.attributes?.cor ?? 0);
        const oldApMax = calculateApMax(oldCorVal, actor.system?.ap?.override);
        const newApMax = calculateApMax(newCorVal, actor.system?.ap?.override);
        if (newApMax > oldApMax) {
          corApGained = newApMax - oldApMax;
          const currentApVal = Number(flat["system.ap.value"] ?? changed.system?.ap?.value ?? actor.system?.ap?.value ?? 0);
          const newApVal = Math.min(newApMax, currentApVal + corApGained);
          foundry.utils.setProperty(changed, "system.ap.value", newApVal);
        }
      }
    }

    // When system.ap.max or system.ap.override is updated directly (and wasn't already handled by COR)
    if (corApGained === 0) {
      const rawNewMaxAp = flat["system.ap.max"] ?? changed.system?.ap?.max ?? flat["system.ap.override"] ?? changed.system?.ap?.override;
      if (rawNewMaxAp !== undefined) {
        const newMax = Number(rawNewMaxAp);
        const oldMax = Number(actor.system?.ap?.max ?? 0);
        if (!isNaN(newMax) && newMax > oldMax) {
          const apGain = newMax - oldMax;
          const currentApVal = Number(flat["system.ap.value"] ?? changed.system?.ap?.value ?? actor.system?.ap?.value ?? 0);
          const newApVal = Math.min(newMax, currentApVal + apGain);
          foundry.utils.setProperty(changed, "system.ap.value", newApVal);
        }
      }
    }
  });

  // Prompt HP recalculation when Endurance threshold changes
  Hooks.on("updateActor", (actor, changed, options, userId) => {
    if (game.user.id !== userId) return;
    if (actor.type !== "character") return;
    if (changed.system?.attributes?.end !== undefined && options._essenceOldEnd !== undefined) {
      const oldEnd = options._essenceOldEnd;
      const newEnd = Number(changed.system.attributes.end);
      const oldTh = getEnduranceThreshold(oldEnd);
      const newTh = getEnduranceThreshold(newEnd);

      if (oldTh.threshold !== newTh.threshold && (actor.system.level || 0) > 0) {
        // Threshold changed! Open LevelUpDialog in recalculate mode
        new LevelUpDialog(actor, {
          mode: "recalculate",
          targetLevel: actor.system.level,
        }).render(true);
      }
    }
  });
});






Hooks.on("i18nInit", () => {
  syncSoulDamageToSystem();
});

Hooks.on("setup", () => {
  // Ensure MythCraft status conditions persist through setup phase
  CONFIG.statusEffects = MythcraftConditions;
  syncSoulDamageToSystem();
});

export async function rollItemMacro(itemNameOrUuid, options = {}) {
  let item = null;
  let actor = null;
  if (typeof itemNameOrUuid === "string" && (itemNameOrUuid.startsWith("Actor.") || itemNameOrUuid.startsWith("Scene.") || itemNameOrUuid.includes("."))) {
    try { item = await fromUuid(itemNameOrUuid); } catch (e) {}
    actor = item?.actor || item?.parent;
  }
  if (!item) {
    const speaker = ChatMessage.getSpeaker();
    actor = (typeof ChatMessage.getSpeakerActor === "function" ? ChatMessage.getSpeakerActor(speaker) : null) ||
            game.actors.get(speaker.actor) ||
            canvas?.tokens?.controlled?.[0]?.actor ||
            game.user?.character;
    if (actor) {
      item = actor.items?.get(itemNameOrUuid) ||
             actor.items?.find(i => i.name === itemNameOrUuid || i.name?.toLowerCase() === itemNameOrUuid?.toLowerCase());
    }
  }
  if (!actor || !item) {
    ui.notifications?.warn(`Could not find item "${itemNameOrUuid}". Please select a token or character.`);
    return;
  }
  const isDamage = options.rollType === "damage" || options.action === "damage" || (typeof event !== "undefined" && event?.shiftKey);
  if (isDamage) {
    return await rollItemDamage(actor, item, options);
  }
  if (item.type === "weapon") {
    return await rollWeaponItem(actor, item, options);
  }
  if (item.type === "spell") {
    return await rollSpellItem(actor, item, options);
  }
  return await item.roll?.(options);
}

export async function createEssenceItemMacro(data, slot) {
  if (!data?.uuid) return;
  const item = await fromUuid(data.uuid);
  if (!item) return;

  const command = `const item = await fromUuid("${data.uuid}");\nif (item) {\n  if (typeof event !== "undefined" && event?.shiftKey) await item.rollDamage?.() ?? item.roll?.({ rollType: "damage" });\n  else await item.roll?.();\n}`;

  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "mythcraft-essence-sheet.itemMacro": true, "mythcraft-essence-sheet.itemUuid": data.uuid }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
}

function patchHotbarAndSystemRolls() {
  const resolveActorAndItem = (ctx, arg) => {
    const actor = ctx?.parent?.documentName === "Actor"
      ? ctx.parent
      : (ctx?.actor || (ctx?.documentName === "Actor" ? ctx : null));
    if (!actor) return { actor: null, item: null };
    if (!arg) return { actor, item: null };
    if (typeof arg === "object" && (arg.documentName === "Item" || arg.type)) {
      return { actor, item: arg };
    }
    const idOrName = String(arg).trim();
    const item = actor.items?.get(idOrName)
      || actor.items?.find(i => i.name === idOrName || i.name?.toLowerCase() === idOrName.toLowerCase());
    return { actor, item: item || null };
  };

  // 1. Patch Actor & Actor DataModels (rollSpell, castSpell, rollAttack, rollWeapon, rollDamage)
  const actorProtos = [
    CONFIG.Actor?.documentClass?.prototype,
    CONFIG.Actor?.dataModels?.character?.prototype,
    CONFIG.Actor?.dataModels?.character?.prototype?.__proto__,
    CONFIG.Actor?.dataModels?.npc?.prototype,
    CONFIG.Actor?.dataModels?.siege?.prototype,
  ].filter(Boolean);

  for (const proto of actorProtos) {
    for (const method of ["rollSpell", "castSpell"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (itemOrId, ...rest) {
          const { actor, item } = resolveActorAndItem(this, itemOrId);
          if (actor && item && item.type === "spell") {
            return await rollSpellItem(actor, item, rest[0]);
          }
          if (orig) return orig.call(this, itemOrId, ...rest);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }

    for (const method of ["rollAttack", "rollWeapon"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (itemOrId, ...rest) {
          const { actor, item } = resolveActorAndItem(this, itemOrId);
          if (actor && item && item.type === "weapon") {
            return await rollWeaponItem(actor, item, rest[0]);
          }
          if (actor && item && item.type === "spell") {
            return await rollSpellItem(actor, item, rest[0]);
          }
          if (orig) return orig.call(this, itemOrId, ...rest);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }

    for (const method of ["rollDamage"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (itemOrId, ...rest) {
          const { actor, item } = resolveActorAndItem(this, itemOrId);
          if (actor && item) {
            return await rollItemDamage(actor, item, rest[0]);
          }
          if (orig) return orig.call(this, itemOrId, ...rest);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }
  }

  // 2. Patch Item & Item DataModels (roll, use, rollSpell, rollAttack, rollDamage, cast)
  const itemProtos = [
    CONFIG.Item?.documentClass?.prototype,
    CONFIG.Item?.dataModels?.spell?.prototype,
    CONFIG.Item?.dataModels?.weapon?.prototype,
    CONFIG.Item?.dataModels?.spell?.prototype?.__proto__,
    CONFIG.Item?.dataModels?.weapon?.prototype?.__proto__,
  ].filter(Boolean);

  for (const proto of itemProtos) {
    for (const method of ["roll", "use"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (...args) {
          const item = this?.parent?.documentName === "Item" ? this.parent : (this?.documentName === "Item" ? this : null);
          const actor = item?.actor || item?.parent;
          const options = args[0] || {};
          if (actor && item) {
            if (options.rollType === "damage" || options.action === "damage" || (typeof event !== "undefined" && event?.shiftKey)) {
              return await rollItemDamage(actor, item, options);
            }
            if (item.type === "spell") {
              return await rollSpellItem(actor, item, options);
            }
            if (item.type === "weapon") {
              return await rollWeaponItem(actor, item, options);
            }
          }
          if (orig) return orig.apply(this, args);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }

    for (const method of ["rollAttack"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (...args) {
          const item = this?.parent?.documentName === "Item" ? this.parent : (this?.documentName === "Item" ? this : null);
          const actor = item?.actor || item?.parent;
          const options = args[0] || {};
          if (actor && item) {
            if (item.type === "spell") return await rollSpellItem(actor, item, options);
            if (item.type === "weapon") return await rollWeaponItem(actor, item, options);
          }
          if (orig) return orig.apply(this, args);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }

    for (const method of ["rollDamage"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (...args) {
          const item = this?.parent?.documentName === "Item" ? this.parent : (this?.documentName === "Item" ? this : null);
          const actor = item?.actor || item?.parent;
          const options = args[0] || {};
          if (actor && item) {
            return await rollItemDamage(actor, item, options);
          }
          if (orig) return orig.apply(this, args);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }

    for (const method of ["rollSpell", "cast"]) {
      if (!proto[method] || !proto[method]._essenceHotbarPatched) {
        const orig = typeof proto[method] === "function" ? proto[method] : null;
        const wrapped = async function (...args) {
          const item = this?.parent?.documentName === "Item" ? this.parent : (this?.documentName === "Item" ? this : null);
          const actor = item?.actor || item?.parent;
          const options = args[0] || {};
          if (actor && item && item.type === "spell") {
            return await rollSpellItem(actor, item, options);
          }
          if (orig) return orig.apply(this, args);
        };
        wrapped._essenceHotbarPatched = true;
        proto[method] = wrapped;
      }
    }
  }

  // 3. Expose global rollItemMacro for system macros & HUD compatibility
  globalThis.mythcraft = globalThis.mythcraft || {};
  globalThis.mythcraft.rollItemMacro = rollItemMacro;
  if (globalThis.game) {
    game.mythcraft = game.mythcraft || {};
    game.mythcraft.rollItemMacro = rollItemMacro;
  }

  // 4. Hook hotbarDrop to create robust Essence macros that support attack and shift-click damage
  if (!Hooks.events["hotbarDrop"]?.some(fn => fn._essenceHotbarDrop)) {
    const hotbarDropHandler = (bar, data, slot) => {
      if (data?.type === "Item" && data?.uuid) {
        createEssenceItemMacro(data, slot);
        return false;
      }
    };
    hotbarDropHandler._essenceHotbarDrop = true;
    Hooks.on("hotbarDrop", hotbarDropHandler);
  }

  // 5. Patch ActionHandler in mythcraft-hud if active
  if (game.modules?.get("mythcraft-hud")?.active) {
    import("/modules/mythcraft-hud/scripts/actions/ActionHandler.js").then(hudModule => {
      const ActionHandler = hudModule?.ActionHandler;
      if (ActionHandler && !ActionHandler._essencePatched) {
        ActionHandler._essencePatched = true;

        const origRollWeapon = ActionHandler.rollWeapon;
        ActionHandler.rollWeapon = async function(weaponId, actor, options = {}) {
          const item = actor?.items?.get(weaponId);
          if (actor && item && item.type === "weapon") {
            return await rollWeaponItem(actor, item, options);
          }
          if (typeof origRollWeapon === "function") {
            return await origRollWeapon.call(this, weaponId, actor, options);
          }
        };

        const origRollDamage = ActionHandler.rollDamage;
        ActionHandler.rollDamage = async function(formula, type, actorUuid, options = {}) {
          const actor = actorUuid ? await fromUuid(actorUuid) : null;
          const itemId = options.itemId || options.item?.id;
          const item = itemId ? actor?.items?.get(itemId) : null;
          if (actor && item) {
            return await rollItemDamage(actor, item, options);
          }
          if (typeof origRollDamage === "function") {
            return await origRollDamage.call(this, formula, type, actorUuid, options);
          }
        };
      }
    }).catch(() => {});
  }
}

Hooks.once("ready", async () => {
  console.log(`${MODULE_ID} | Ready.`);

  // Check and prompt What's New dialog early on ready if unacknowledged
  WhatsNewDialog.checkAndPrompt();

  // Re-apply monkey-patches now that system classes are fully loaded.
  // (initDamageAutomation is intentionally NOT repeated here — hooks
  //  are already registered in the init hook above; calling it twice
  //  would double-register preCreateChatMessage / createChatMessage listeners.)
  patchWeaponApcGetter();
  patchFeatureUsesMaxFormula();
  patchSystemHpCalculation();
  patchSystemSkillsCalculation();
  syncHomebrewAttributesToSystem();
  syncSoulDamageToSystem();
  syncCustomTagsToSystem();
  patchTagInputElement();
  patchAttributeSkillInput();
  patchHotbarAndSystemRolls();
  await purgeInvalidStatusEffects();

  // Ensure Essence sheets are set as the default world sheets
  if (game.user.isGM) {
    try {
      const coreSheets = foundry.utils.deepClone(game.settings.get("core", "sheetClasses") || {});
      if (!coreSheets.Actor) coreSheets.Actor = {};
      if (!coreSheets.Item) coreSheets.Item = {};

      const defaultActorMap = {
        character: `${MODULE_ID}.EssenceCharacterSheet`,
        npc: `${MODULE_ID}.EssenceNPCSheet`,
        siege: `${MODULE_ID}.EssenceSiegeWeaponSheet`,
      };

      let changed = false;
      for (const [type, desiredSheet] of Object.entries(defaultActorMap)) {
        const current = coreSheets.Actor[type];
        if (!current || current.startsWith("mythcraft.")) {
          coreSheets.Actor[type] = desiredSheet;
          changed = true;
        }
      }

      if (!coreSheets.Item.base || coreSheets.Item.base.startsWith("mythcraft.")) {
        coreSheets.Item.base = `${MODULE_ID}.EssenceItemSheet`;
        changed = true;
      }

      if (changed) {
        await game.settings.set("core", "sheetClasses", coreSheets);
        console.log(`${MODULE_ID} | Essence sheets set as default in core.sheetClasses.`);
      }
    } catch (e) {
      console.warn(`${MODULE_ID} | Error setting default sheet classes:`, e);
    }
  }

  // Ensure theme is applied on client ready
  applyEssenceTheme();

  // Expose Tag, Defense, Damage, Combat, AP/SP & Rest API globally
  const moduleObj = game.modules.get(MODULE_ID);
  if (moduleObj) {
    moduleObj.api = globalThis.mythcraftEssenceSheet = {
      getDefenseTargetConfig,
      renderDefenseTargetBadgeHTML,
      DEFENSE_TARGET_CONFIG,
      findTagDefinition,
      getEnrichedItemTags,
      getActiveTagsLibrary,
      getActorCritHit,
      getActorCritFail,
      hasAstoundingCritical,
      makeExplodingDiceFormula,
      rollItemDamage,
      executeUnifiedAction,
      executeRest,
      RestDialog,
      calculateItemAPC,
      calculateItemSP,
      deductAp,
      deductSp,
      refundSP,
      mcConditions: MythcraftConditions,
      SPELL_LIBRARY,
      getSpellLibraryEntry,
      getSpellRequirementsBadges,
      checkSpellPrerequisite,
      evaluateSpellScalingAndUpcharge,
      executeSpellUpchargeFromChat,
      postSpellDescriptionCard,
      WhatsNewDialog,
      showWhatsNew: () => WhatsNewDialog.show(),
      TalentGrantDialog,
      processTalentGrantsAndPicks: (actor, item, options) => TalentGrantDialog.processTalentGrantsAndPicks(actor, item, options),
    };
  }

  // Check and prompt What's New dialog for GM if update is unacknowledged
  WhatsNewDialog.checkAndPrompt();
});

Hooks.once("canvasReady", () => {
  WhatsNewDialog.checkAndPrompt();
});

// ── TALENT BENEFIT & GRANTED PICKS HOOK ─────────────────────────────────────
Hooks.on("createItem", (item, options, userId) => {
  if (game.user?.id !== userId) return;
  if (!item.parent || item.parent.documentName !== "Actor") return;
  if (options?.skipGrantPrompt || options?.isGrantedChild) return;
  if (item.type !== "talent" && item.type !== "feature") return;

  // Let document creation settle before prompting
  setTimeout(async () => {
    try {
      await TalentGrantDialog.processTalentGrantsAndPicks(item.parent, item);
    } catch (err) {
      console.error(`${MODULE_ID} | Error processing talent grants on createItem:`, err);
    }

    // Check for Skill Point Grants (e.g. "+3 skill points to skills with luck tag", "Lucky", "Crafter")
    try {
      const grant = getTalentSkillPointGrant(item);
      const existingAlloc = item.flags?.[MODULE_ID]?.skillAllocation;
      if (grant && (!existingAlloc || Object.keys(existingAlloc).length === 0)) {
        await TalentSkillAllocationDialog.promptAllocation(item.parent, item, grant);
      }
    } catch (err) {
      console.error(`${MODULE_ID} | Error prompting talent skill allocation on createItem:`, err);
    }
  }, 250);
});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Global Chat Log & Document Click Listeners for Automations
 * ──────────────────────────────────────────────────────────────────────────── */

document.addEventListener("click", async (event) => {
  // 1. Roll Damage from Chat Button
  const damageBtn = event.target.closest("[data-action='rollEssenceDamage'], .roll-damage");
  if (damageBtn) {
    event.preventDefault();
    event.stopPropagation();

    const msgEl = damageBtn.closest("[data-message-id]");
    const message = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
    const actorId = damageBtn.dataset.actorId || message?.speaker?.actor;
    const actor = actorId ? game.actors.get(actorId) : null;
    const itemId = damageBtn.dataset.itemId || message?.flags?.["mythcraft-essence-sheet"]?.itemId || msgEl?.querySelector("[data-item-id]")?.dataset.itemId;

    let item = actor?.items?.get(itemId);
    if (!item && actor) {
      const cardTitleEl = msgEl?.querySelector(".card-header h3, h3, .item-name, .card-title");
      const title = cardTitleEl?.textContent?.split(/[(–—:]/)[0].trim().toLowerCase();
      if (title) item = actor.items.find(i => i.name.toLowerCase() === title || title.includes(i.name.toLowerCase()));
    }

    if (actor && item) {
      const isCrit = damageBtn.dataset.isCrit === "true" || event.shiftKey;
      let rollMode = message?.blind ? "blindroll" : (message?.whisper?.length ? "gmroll" : null);
      if (!rollMode) {
        rollMode = game.settings.settings.has("core.messageMode") 
          ? game.settings.get("core", "messageMode") 
          : game.settings.get("core", "rollMode");
      }
      await rollItemDamage(actor, item, { isCrit, rollMode });
    }
    return;
  }

  // 1b. Spell Upcharge Roll / Apply from Chat Button
  const upchargeBtn = event.target.closest("[data-action='rollSpellUpcharge'], [data-action='applySpellUpcharge']");
  if (upchargeBtn) {
    event.preventDefault();
    event.stopPropagation();

    const msgEl = upchargeBtn.closest("[data-message-id]");
    const message = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
    const actorId = upchargeBtn.dataset.actorId || message?.speaker?.actor;
    const actor = actorId ? game.actors.get(actorId) : null;
    const itemId = upchargeBtn.dataset.itemId || message?.flags?.["mythcraft-essence-sheet"]?.itemId;
    const optionId = upchargeBtn.dataset.optionId;
    const isCrit = upchargeBtn.dataset.isCrit === "true" || event.shiftKey;

    const rowEl = upchargeBtn.closest(".essence-upcharge-row");
    const stackSelect = rowEl?.querySelector(".essence-upcharge-stacks");
    const stacks = stackSelect ? Math.max(1, parseInt(stackSelect.value, 10) || 1) : 1;

    let item = actor?.items?.get(itemId);
    if (!item && actor && message?.flags?.["mythcraft-essence-sheet"]?.itemName) {
      const targetName = message.flags["mythcraft-essence-sheet"].itemName.toLowerCase();
      item = actor.items.find(i => i.name.toLowerCase() === targetName);
    }

    if (actor && item && optionId) {
      let rollMode = message?.blind ? "blindroll" : (message?.whisper?.length ? "gmroll" : null);
      if (!rollMode) {
        rollMode = game.settings.settings.has("core.messageMode")
          ? game.settings.get("core", "messageMode")
          : game.settings.get("core", "rollMode");
      }
      await executeSpellUpchargeFromChat(actor, item, optionId, stacks, { isCrit, rollMode });
    }
    return;
  }

  // 1c. Toggle Roll Breakdown & Tooltip on Attack Cards
  const rollResultBox = event.target.closest(".attack-card .roll-result, .attack-card .roll-formula, .attack-card .roll-breakdown-details, .attack-card .card-title, .essence-embedded-roll-html .dice-roll");
  if (rollResultBox) {
    const card = rollResultBox.closest(".attack-card");
    const tooltip = card?.querySelector(".dice-tooltip");
    const details = card?.querySelector(".roll-breakdown-details");
    if (tooltip) {
      const isVisible = tooltip.style.display === "block" || tooltip.classList.contains("expanded");
      if (isVisible) {
        tooltip.style.display = "none";
        tooltip.classList.remove("expanded");
      } else {
        tooltip.style.display = "block";
        tooltip.classList.add("expanded");
      }
    }
    if (details) {
      details.classList.toggle("revealed-breakdown");
    }
  }

  // 2. Open Rest Dialog from Button
  const restBtn = event.target.closest("[data-action='openRestDialog'], .open-rest-dialog-btn");
  if (restBtn) {
    event.preventDefault();
    event.stopPropagation();
    const actorId = restBtn.dataset.actorId || restBtn.closest("[data-actor-id]")?.dataset.actorId;
    const actor = actorId ? game.actors.get(actorId) : (canvas.tokens.controlled[0]?.actor || game.user.character);
    if (actor) {
      new RestDialog({ document: actor }).render(true);
    } else {
      ui.notifications.warn("Please select a character token or open a character sheet to rest.");
    }
    return;
  }

  // 3. Refund SP from Chat Button
  const refundBtn = event.target.closest("[data-action='refundSP'], .myth-hud-refund-btn");
  if (refundBtn) {
    event.preventDefault();
    event.stopPropagation();
    const actorId = refundBtn.dataset.actorId;
    const amount = Number(refundBtn.dataset.amount || 1);
    const actor = actorId ? game.actors.get(actorId) : null;
    if (actor) {
      await refundSP(actor, amount);
    }
    return;
  }

  // 4. Apply Damage to Selected Tokens
  const applyDmgBtn = event.target.closest(".apply-damage-btn, .apply-damage, [data-action='applyDamageToSelected'], [data-action='apply-damage']");
  if (applyDmgBtn) {
    event.preventDefault();
    event.stopPropagation();

    const msgEl = applyDmgBtn.closest("[data-message-id]");
    const message = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;

    let amount = Number(applyDmgBtn.dataset.amount || applyDmgBtn.dataset.total || applyDmgBtn.dataset.value || 0);
    if (!amount && message?.rolls?.length) {
      amount = message.rolls.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    }

    const attackerActorId = message?.flags?.["mythcraft-essence-sheet"]?.attackerActorId || message?.speaker?.actor;
    const attackerActor = attackerActorId ? game.actors?.get(attackerActorId) : null;
    const attackerItemId = message?.flags?.["mythcraft-essence-sheet"]?.itemId;
    const attackerWeapon = (attackerActor && attackerItemId) ? attackerActor.items.get(attackerItemId) : null;

    let damageType = (applyDmgBtn.dataset.damageType || applyDmgBtn.dataset.type || "").toLowerCase().trim();
    if (!damageType && message?.rolls?.length) {
      damageType = (message.rolls[0]?.options?.type || message.rolls[0]?.type || message?.flags?.["mythcraft-essence-sheet"]?.damageType || attackerWeapon?.system?.damage?.[0]?.type || attackerWeapon?.system?.damageType || "damage").toLowerCase().trim();
    }
    if (applyDmgBtn.textContent && /soul/i.test(applyDmgBtn.textContent)) damageType = "soul";
    if (!damageType) damageType = "damage";

    const selectedTokens = canvas.tokens?.controlled || [];
    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select at least one token on the canvas to apply damage to.");
      return;
    }

    for (const token of selectedTokens) {
      const actor = token.actor;
      if (!actor) continue;
      await applyActorDamage(actor, amount, {
        type: damageType,
        attackerActor,
        attackerWeapon,
        message,
      });
    }
    return;
  }

  // 5. Apply Healing to Selected Tokens
  const applyHealBtn = event.target.closest(".apply-healing-btn, [data-action='applyHealingToSelected']");
  if (applyHealBtn) {
    event.preventDefault();
    event.stopPropagation();
    const amount = Number(applyHealBtn.dataset.amount || applyHealBtn.dataset.total || 0);
    const selectedTokens = canvas.tokens?.controlled || [];

    if (selectedTokens.length === 0) {
      ui.notifications.warn("Please select at least one token on the canvas to apply healing to.");
      return;
    }

    for (const token of selectedTokens) {
      const actor = token.actor;
      if (!actor) continue;
      const curHp = Number(actor.system?.hp?.value ?? 0);
      const maxHp = Number(actor.system?.hp?.max ?? curHp);
      const newHp = Math.min(maxHp, curHp + amount);
      await actor.update({ "system.hp.value": newHp });
      ui.notifications.info(`Applied ${amount} healing to ${actor.name} (HP: ${curHp} → ${newHp}).`);
    }
    return;
  }
});


document.addEventListener("change", (event) => {
  const stackSelect = event.target?.closest?.(".essence-upcharge-stacks");
  if (!stackSelect) return;

  const rowEl = stackSelect.closest(".essence-upcharge-row");
  const rollBtn = rowEl?.querySelector("[data-action='rollSpellUpcharge']");
  if (!rollBtn) return;

  const actorId = rollBtn.dataset.actorId;
  const itemId = rollBtn.dataset.itemId;
  const optionId = rollBtn.dataset.optionId;
  const stacks = Math.max(1, parseInt(stackSelect.value, 10) || 1);

  const actor = actorId ? game.actors?.get(actorId) : null;
  const item = actor?.items?.get(itemId);
  const libEntry = getSpellLibraryEntry(item);
  const scalingInfo = evaluateSpellScalingAndUpcharge(actor, libEntry || item, { afterBaseDeduction: true });
  const opt = (scalingInfo.allUpcharges || []).find(o => o.id === optionId);
  if (!opt || !opt.isDamageUpcharge) return;

  const previewFormula = opt.formulaOverride
    ? opt.formulaOverride
    : computeUpchargedFormula(opt.baseFormula, opt.bonusDicePerStack, stacks);
  const btnActionLabel = opt.isHeal
    ? `Roll Upcharged Healing (${previewFormula})`
    : `Roll Upcharged Damage (${previewFormula})`;
  rollBtn.innerHTML = `<i class="fas fa-${opt.isHeal ? "heart-circle-plus" : "fire-flame-curved"}"></i> ${btnActionLabel}`;
});
