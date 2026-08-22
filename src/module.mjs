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
import { initDamageAutomation, patchFeatureUsesMaxFormula } from "./features/damage-automation.mjs";
import { initEquipmentAutomation, patchWeaponApcGetter } from "./features/equipment-automation.mjs";
import { registerSettings } from "./settings.mjs";

import { findTagDefinition, getActiveTagsLibrary } from "./data/tags-library.mjs";
import { getEnrichedItemTags, getActorCritHit, getActorCritFail, rollItemDamage } from "./sheets/essence-character-sheet.mjs";
import { getDefenseTargetConfig, renderDefenseTargetBadgeHTML, DEFENSE_TARGET_CONFIG } from "./data/defense-config.mjs";

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

  // Initialize Automation Engines
  initDamageAutomation();
  initEquipmentAutomation();

  const { DocumentSheetConfig } = foundry.applications.apps;

  // ── Actor Sheets ───────────────────────────────────────────────────────────

  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    MODULE_ID,
    EssenceCharacterSheet,
    {
      makeDefault: true,
      types: ["character"],
      label: "MythCraft Essence: Character Sheet",
    }
  );

  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    MODULE_ID,
    EssenceNPCSheet,
    {
      makeDefault: true,
      types: ["npc"],
      label: "MythCraft Essence: NPC Sheet",
    }
  );

  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    MODULE_ID,
    EssenceSiegeWeaponSheet,
    {
      makeDefault: true,
      types: ["siege"],
      label: "MythCraft Essence: Siege Weapon Sheet",
    }
  );

  // ── Item Sheets ────────────────────────────────────────────────────────────

  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    MODULE_ID,
    EssenceItemSheet,
    {
      makeDefault: true,
      label: "MythCraft Essence: Item Sheet",
    }
  );

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
  Handlebars.registerHelper("ne",  (a, b) => a !== b);

  // String concat helper (used as sub-expression in formInput name= param)
  // Only register if Foundry hasn't already provided one.
  if (!Handlebars.helpers["concat"]) {
    Handlebars.registerHelper("concat", (...args) => {
      // Last arg is the Handlebars options hash — drop it.
      args.pop();
      return args.join("");
    });
  }

  // Initialize Damage Automation Engine
  initDamageAutomation();

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
    rollItemDamage,
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

    if (isRecent) {
      // Build suspense: Wait until the die lands on the result, then flash green/red before modifiers are added!
      const rollDuration = (game.modules.get('mythcraft-hud')?.active 
        ? (Number(game.settings.get('mythcraft-hud', 'rollAnimationDuration')) || 1300) 
        : 600);
      setTimeout(() => {
        applyCritStyling();
      }, rollDuration);
    } else {
      // Historical messages on load / refresh get colored immediately
      applyCritStyling();
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
  const isAttackMessage = isWeaponAttack ||
                          hasDefenseTarget ||
                          Boolean(message.flags?.["mythcraft-essence-sheet"]?.isAttack) ||
                          Boolean(message.flags?.["mythcraft-essence-sheet"]?.defenseTarget) ||
                          Boolean(message.flags?.["mythcraft-hud"]?.defenseTarget) ||
                          message.rolls?.some(r => r.options?.defenseTarget || r.constructor?.name === "AttackRoll" || r.class === "AttackRoll") ||
                          root.querySelector(".attack-card, .attack-defense") !== null ||
                          /attack\s*roll/i.test(message.flavor || "") ||
                          /attack\s*check/i.test(message.flavor || "");

  if (isAttackMessage && !root.querySelector(".chat-defense-target-badge")) {
    const rawDefense = message.flags?.["mythcraft-essence-sheet"]?.defenseTarget ||
                       message.flags?.["mythcraft-hud"]?.defenseTarget ||
                       message.rolls?.find(r => r.options?.defenseTarget)?.options?.defenseTarget ||
                       item?.system?.defenseTarget ||
                       item?.system?.defense ||
                       item?.system?.targetDefense ||
                       "ar";

    const defConfig = getDefenseTargetConfig(rawDefense);
    const badgeEl = document.createElement("span");
    badgeEl.className = `chat-defense-target-badge def-${defConfig.key}`;
    badgeEl.style.cssText = `--def-color: ${defConfig.color}; --def-bg: ${defConfig.bg}; --def-border: ${defConfig.border};`;
    badgeEl.setAttribute("title", `Target Defense: ${defConfig.label} (${defConfig.abbr})`);
    badgeEl.setAttribute("data-tooltip", `Target Defense: <strong>${defConfig.label} (${defConfig.abbr})</strong>`);
    badgeEl.innerHTML = `
      <span class="vs-prefix">vs</span>
      <i class="${defConfig.icon} def-icon"></i>
      <span class="def-abbr">${defConfig.abbr}</span>
    `;

    // Remove plain text attack-defense if present
    root.querySelectorAll(".attack-defense").forEach(el => el.remove());

    // 1. Check for card-header (e.g. custom or system roll card header)
    const cardHeader = root.querySelector(".card-header, .mythcraft-statblock .card-header, .attack-card .card-header");
    if (cardHeader) {
      cardHeader.style.display = "flex";
      cardHeader.style.alignItems = "center";
      cardHeader.style.justifyContent = "space-between";
      cardHeader.style.gap = "8px";
      badgeEl.style.marginLeft = "auto";
      cardHeader.appendChild(badgeEl);
    } else {
      // 2. Check for dice-roll wrapper or flavor header
      const diceRollEl = root.querySelector(".dice-roll");
      const flavorEl = root.querySelector(".flavor-text, .message-header .flavor");
      if (diceRollEl) {
        let rollHeader = diceRollEl.querySelector(".essence-chat-card-header");
        if (!rollHeader) {
          rollHeader = document.createElement("div");
          rollHeader.className = "essence-chat-card-header";
          const titleText = message.flavor || (item ? `${item.name}` : "Attack Roll");
          rollHeader.innerHTML = `<h4 class="card-roll-title">${titleText}</h4>`;
          diceRollEl.prepend(rollHeader);
        }
        badgeEl.style.marginLeft = "auto";
        rollHeader.appendChild(badgeEl);
      } else if (flavorEl) {
        flavorEl.style.display = "flex";
        flavorEl.style.alignItems = "center";
        flavorEl.style.justifyContent = "space-between";
        badgeEl.style.marginLeft = "auto";
        flavorEl.appendChild(badgeEl);
      }
    }
  }


  // 4. Damage Button Enhancement / Injection for Weapon & Spell Cards
  if (item && actor && !isDamageMessage) {
    const hasDamage = (Array.isArray(item.system?.damage) && item.system.damage.some(d => d && d.formula)) || Boolean(item.system?.damageFormula);
    if (hasDamage) {
      let btnWrap = root.querySelector(".chat-damage-action-wrap");
      const existingBtn = root.querySelector(".roll-damage, [data-action='rollEssenceDamage']");

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
            <span>${isCrit ? 'Roll Critical Damage' : 'Roll Damage'}</span>
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
            btn.innerHTML = `<i class="fas fa-burst"></i> <span>Roll Critical Damage</span>`;
          } else {
            btn.classList.remove("crit-damage-btn");
            btn.innerHTML = `<i class="fas fa-sword"></i> <span>Roll Damage</span>`;
          }
        }
      }
    }
  }
  };

  Hooks.on("renderChatMessageHTML", handleChatMessageRender);
  Hooks.on("renderChatMessage", handleChatMessageRender);

  patchFeatureUsesMaxFormula();
});






Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready.`);
  patchWeaponApcGetter();
  initDamageAutomation();
  patchFeatureUsesMaxFormula();


  // Expose Tag, Defense & Damage API globally for external modules (e.g. MythCraft HUD) or macros
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
      rollItemDamage,
    };
  }

});

/* ─────────────────────────────────────────────────────────────────────────────
 *  Global Chat Log Click Listener for Damage & Critical Damage Rolls
 * ──────────────────────────────────────────────────────────────────────────── */

document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-action='rollEssenceDamage'], .roll-damage");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();

  const msgEl = btn.closest("[data-message-id]");
  const message = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
  const actorId = btn.dataset.actorId || message?.speaker?.actor;
  const actor = actorId ? game.actors.get(actorId) : null;
  const itemId = btn.dataset.itemId || message?.flags?.["mythcraft-essence-sheet"]?.itemId || msgEl?.querySelector("[data-item-id]")?.dataset.itemId;

  let item = actor?.items?.get(itemId);
  if (!item && actor) {
    const cardTitleEl = msgEl?.querySelector(".card-header h3, h3, .item-name, .card-title");
    const title = cardTitleEl?.textContent?.split(/[(–—:]/)[0].trim().toLowerCase();
    if (title) item = actor.items.find(i => i.name.toLowerCase() === title || title.includes(i.name.toLowerCase()));
  }

  if (!actor || !item) return;

  const isCrit = btn.dataset.isCrit === "true" || event.shiftKey;
  await rollItemDamage(actor, item, { isCrit });
});
