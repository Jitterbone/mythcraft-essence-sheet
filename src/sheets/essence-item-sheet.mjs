/**
 * mythcraft-essence-sheet | src/sheets/essence-item-sheet.mjs
 *
 * Polished, high-readability alternate Item Sheet for the MythCraft system
 * matching the Essence character sheet theme (dark teal, gold, and cosmic purple).
 */

import MythCraftItemSheet from "/systems/mythcraft/module/applications/sheets/item-sheet.mjs";
import { isItemContainer } from "../features/container-utils.mjs";
import { isItemClothes } from "../features/equipment-automation.mjs";
import { isDefaultIcon, resolveItemIcon } from "../features/equipment-icons.mjs";
import { sanitizeGmOnlyFields } from "../features/permissions-fix.mjs";
import { getActiveTagsLibrary, syncCustomTagsToSystem } from "../data/tags-library.mjs";
import { extractTalentStructuredTags } from "../features/talent-canonical-map.mjs";
import { getEnrichedItemTags } from "./essence-character-sheet.mjs";
import { getSetting } from "../settings.mjs";
import { syncSoulDamageToSystem } from "../features/homebrew-attributes.mjs";
import ActiveEffectManager from "../apps/active-effect-manager.mjs";
import { summarizeActiveEffect } from "../features/active-effect-engine.mjs";

export default class EssenceItemSheet extends MythCraftItemSheet {

  /**
   * Players who own the item (or parent actor) can always edit it.
   * @override
   */
  get isEditable() {
    return Boolean(this.document?.isOwner || this.document?.parent?.isOwner || game.user?.isGM);
  }

  /**
   * Strip GM-only fields for non-GM players to prevent Foundry sanitization errors.
   * @override
   */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    if (!game.user?.isGM) {
      sanitizeGmOnlyFields(data);
    }
    return data;
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["mythcraft", "item", "sheet", "essence-sheet", "essence-item-sheet"],
    position: {
      width: 580,
      height: 640,
    },
  };

  /* ─────────────────────────────────────────────────────────────────────────
   *  Context preparation
   * ───────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    // Synchronize tags and soul damage type into CONFIG before building UI
    syncCustomTagsToSystem();
    syncSoulDamageToSystem();

    const context = await super._prepareContext(options);

    const library = getActiveTagsLibrary();
    const itemType = this.item.type || "item";

    // Extract structured tags from subheader / description / properties in memory ONLY for talents
    if (this.item.type === "talent") {
      const structured = extractTalentStructuredTags(this.item);
      if (structured.directTags.length > 0) {
        if (Array.isArray(context.system?.tags)) {
          for (const t of structured.directTags) {
            if (!context.system.tags.includes(t)) context.system.tags.push(t);
          }
        } else if (context.system?.tags && typeof context.system.tags === "object") {
          let maxIdx = Object.keys(context.system.tags).length;
          for (const t of structured.directTags) {
            if (!Object.values(context.system.tags).includes(t)) {
              context.system.tags[maxIdx++] = t;
            }
          }
        } else if (context.system && !context.system.tags) {
          context.system.tags = [...structured.directTags];
        }
      }
    }

    const enrichedTags = getEnrichedItemTags(this.item);
    context.enrichedTags = enrichedTags;

    // Inject custom tags into tagOptions if present
    if (context.tagOptions && typeof context.tagOptions === "object") {
      for (const tag of library) {
        const key = tag.id || tag.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!context.tagOptions[key]) {
          context.tagOptions[key] = tag.name;
        }
      }
    }
    if (context.tags && typeof context.tags === "object" && !Array.isArray(context.tags)) {
      for (const tag of library) {
        const key = tag.id || tag.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!context.tags[key]) {
          context.tags[key] = tag.name;
        }
      }
    }

    const essenceCost = Number(this.item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? this.item.system?.essenceCost ?? 0);
    const isContainer = isItemContainer(this.item);
    const isClothes = isItemClothes(this.item);

    context.essence = {
      moduleId: "mythcraft-essence-sheet",
      essenceCost,
      itemTypeLabel: itemType.toUpperCase(),
      isContainer,
      isClothes,
    };

    return context;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Rendering Lifecycle
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Right-click Image Popout for Item Sheet Portrait
    const ImagePopoutApp = foundry.applications.apps.ImagePopout || globalThis.ImagePopout;
    const itemPortrait = this.element.querySelector(".profile, .portrait, .item-img, img[data-edit='img'], img.profile-img, img");
    if (itemPortrait) {
      if (isDefaultIcon(this.item?.img)) {
        const resolved = resolveItemIcon(this.item, this.item?.img, this.item?.type);
        if (resolved && !isDefaultIcon(resolved)) {
          itemPortrait.src = resolved;
        }
      }

      itemPortrait.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const displaySrc = itemPortrait.src || this.item?.img;
        if (displaySrc) {
          new ImagePopoutApp({
            src: displaySrc,
            window: { title: this.item.name },
            shareable: true,
            uuid: this.item.uuid,
          }).render(true);
        }
      });
    }

    const detailsTab = this.element.querySelector('.tab[data-tab="details"]') || this.element.querySelector('form.sheet-body') || this.element.querySelector('form');

    // 1. Inject Essence Cost card in Details tab
    if (detailsTab && !this.element.querySelector('.essence-item-cost-panel')) {
      const essenceCost = Number(this.item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? this.item.system?.essenceCost ?? 0);
      const costCard = document.createElement("div");
      costCard.className = "essence-item-cost-panel";
      costCard.innerHTML = `
        <div class="cost-panel-header">
          <div class="cost-title">
            <i class="fas fa-gem gem-icon"></i>
            <span>ESSENCE BINDING COST</span>
          </div>
          <span class="cost-hint">Deducted from character's 100 EP pool</span>
        </div>
        <div class="cost-input-wrapper">
          <input type="number" 
                 name="flags.mythcraft-essence-sheet.essenceCost" 
                 value="${essenceCost}" 
                 min="0" 
                 max="100" 
                 placeholder="0" 
                 class="essence-item-cost-input" />
          <span class="cost-unit">EP</span>
        </div>
      `;

      const input = costCard.querySelector("input");
      input.addEventListener("change", async (e) => {
        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
        await this.item.update({ "flags.mythcraft-essence-sheet.essenceCost": val });
      });

      detailsTab.prepend(costCard);
    }

    // 2. Inject Storage Container toggle in Details tab (for gear items only)
    if (detailsTab && this.item.type === "gear" && !this.element.querySelector('.essence-item-container-panel')) {
      const isContainer = isItemContainer(this.item);
      const containerCard = document.createElement("div");
      containerCard.className = "essence-item-container-panel";
      containerCard.innerHTML = `
        <div class="container-panel-header">
          <div class="container-title">
            <i class="fas fa-box-open container-icon"></i>
            <span>STORAGE CONTAINER</span>
          </div>
          <span class="container-hint">Allows this item to hold and organize other items in inventory</span>
        </div>
        <div class="container-toggle-wrapper">
          <label class="container-checkbox-label">
            <input type="checkbox" 
                   name="flags.mythcraft-essence-sheet.isContainer" 
                   ${isContainer ? "checked" : ""} 
                   class="essence-container-checkbox" />
            <span class="checkbox-text">Is Storage Container?</span>
          </label>
        </div>
      `;

      const checkbox = containerCard.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", async (e) => {
        await this.item.update({ "flags.mythcraft-essence-sheet.isContainer": e.target.checked });
      });

      const costPanel = detailsTab.querySelector('.essence-item-cost-panel');
      if (costPanel && costPanel.nextSibling) {
        detailsTab.insertBefore(containerCard, costPanel.nextSibling);
      } else {
        detailsTab.appendChild(containerCard);
      }
    }

    // 3. Inject Clothes / Wearable toggle in Details tab (for gear items)
    if (detailsTab && this.item.type === "gear" && !this.element.querySelector('.essence-item-clothes-panel')) {
      const isClothes = isItemClothes(this.item);
      const clothesCard = document.createElement("div");
      clothesCard.className = "essence-item-container-panel essence-item-clothes-panel";
      clothesCard.innerHTML = `
        <div class="container-panel-header">
          <div class="container-title">
            <i class="fas fa-shirt container-icon"></i>
            <span>CLOTHING / WEARABLE</span>
          </div>
          <span class="container-hint">Marks this item as wearable clothing for quick access</span>
        </div>
        <div class="container-toggle-wrapper">
          <label class="container-checkbox-label">
            <input type="checkbox" 
                   name="flags.mythcraft-essence-sheet.isClothes" 
                   ${isClothes ? "checked" : ""} 
                   class="essence-clothes-checkbox" />
            <span class="checkbox-text">Is Clothes / Wearable?</span>
          </label>
        </div>
      `;

      const checkbox = clothesCard.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", async (e) => {
        await this.item.update({ "flags.mythcraft-essence-sheet.isClothes": e.target.checked });
      });

      const containerPanel = detailsTab.querySelector('.essence-item-container-panel');
      if (containerPanel && containerPanel.nextSibling) {
        detailsTab.insertBefore(clothesCard, containerPanel.nextSibling);
      } else {
        detailsTab.appendChild(clothesCard);
      }
    }

    // 4. Inject Claimed Souls & Soul Damage panel in Details tab (for weapon items)
    const isSoulDamageEnabled = getSetting("enableSoulDamage", false);
    if (isSoulDamageEnabled && detailsTab && this.item.type === "weapon" && !this.element.querySelector('.essence-item-claimed-souls-panel')) {
      const isSoulWeapon = Boolean(
        this.item.flags?.["mythcraft-essence-sheet"]?.isSoulDamage ??
        this.item.system?.isSoulDamage ??
        (this.item.system?.damage?.type === "soul") ??
        (this.item.system?.damageType === "soul") ??
        (Array.isArray(this.item.system?.damage) && this.item.system.damage.some(d => d?.type === "soul"))
      );
      const enableClaimed = Boolean(
        this.item.flags?.["mythcraft-essence-sheet"]?.enableClaimedSouls ??
        this.item.flags?.["mythcraft-essence-sheet"]?.enableConsumedSouls ??
        this.item.system?.enableClaimedSouls ??
        this.item.system?.enableConsumedSouls
      );
      const claimedSouls = Math.min(5, Math.max(0, Number(
        this.item.flags?.["mythcraft-essence-sheet"]?.consumedSouls ??
        this.item.flags?.["mythcraft-essence-sheet"]?.claimedSouls ??
        this.item.system?.consumedSouls ??
        this.item.system?.claimedSouls ??
        0
      )));

      const soulsCard = document.createElement("div");
      soulsCard.className = "essence-item-cost-panel essence-item-claimed-souls-panel";
      soulsCard.style.cssText = "background: linear-gradient(135deg, rgba(88, 28, 135, 0.35) 0%, rgba(17, 24, 39, 0.85) 100%); border: 1px solid rgba(192, 132, 252, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;";
      soulsCard.innerHTML = `
        <div class="cost-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div class="cost-title" style="font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700; color: #e9d5ff; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-ghost" style="color: #c084fc;"></i>
            <span>CONSUMED SOULS & SOUL DAMAGE</span>
          </div>
          <span class="cost-hint" style="font-size: 11px; color: #d8b4fe;">+1 Dmg per soul (max +5)</span>
        </div>
        <div class="souls-content-body" style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
          <label class="container-checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: #f3e8ff;">
            <input type="checkbox" 
                   name="flags.mythcraft-essence-sheet.isSoulDamage" 
                   ${isSoulWeapon ? "checked" : ""} 
                   class="essence-soul-damage-checkbox" />
            <span class="checkbox-text" style="font-weight: 600; color: #c084fc;">Deals Soul Damage (Builds up purple lethal meter)</span>
          </label>
          <label class="container-checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: #f3e8ff;">
            <input type="checkbox" 
                   name="flags.mythcraft-essence-sheet.enableClaimedSouls" 
                   ${enableClaimed ? "checked" : ""} 
                   class="essence-claimed-souls-checkbox" />
            <span class="checkbox-text" style="font-weight: 600;">Enable Consumed Souls Modifier (+X Damage, max +5)</span>
          </label>
          <div class="souls-stepper-row" style="display: ${enableClaimed ? 'flex' : 'none'}; align-items: center; gap: 12px; padding: 6px 10px; background: rgba(0, 0, 0, 0.35); border-radius: 6px; border: 1px solid rgba(192, 132, 252, 0.25);">
            <span style="font-size: 12px; color: #e9d5ff; font-weight: 600;">Consumed Souls:</span>
            <div class="souls-stepper-controls" style="display: flex; align-items: center; gap: 6px;">
              <button type="button" class="souls-step-minus" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #a855f7; background: rgba(168, 85, 247, 0.2); color: #e9d5ff; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fas fa-minus"></i></button>
              <input type="number" 
                     name="flags.mythcraft-essence-sheet.claimedSouls" 
                     value="${claimedSouls}" 
                     min="0" 
                     max="5" 
                     class="essence-claimed-souls-input" 
                     style="width: 48px; text-align: center; font-weight: 700; color: #f3e8ff; background: rgba(0,0,0,0.5); border: 1px solid #a855f7; border-radius: 4px; padding: 2px 4px;" />
              <button type="button" class="souls-step-plus" style="width: 24px; height: 24px; border-radius: 4px; border: 1px solid #a855f7; background: rgba(168, 85, 247, 0.2); color: #e9d5ff; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fas fa-plus"></i></button>
            </div>
            <span class="souls-bonus-badge" style="margin-left: auto; font-size: 11px; font-weight: 700; color: #a855f7; background: rgba(168, 85, 247, 0.2); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(168, 85, 247, 0.4);">
              +${claimedSouls} Dmg
            </span>
          </div>
        </div>
      `;

      const soulChk = soulsCard.querySelector(".essence-soul-damage-checkbox");
      const chk = soulsCard.querySelector(".essence-claimed-souls-checkbox");
      const stepperRow = soulsCard.querySelector(".souls-stepper-row");
      const numInput = soulsCard.querySelector(".essence-claimed-souls-input");
      const minusBtn = soulsCard.querySelector(".souls-step-minus");
      const plusBtn = soulsCard.querySelector(".souls-step-plus");
      const badge = soulsCard.querySelector(".souls-bonus-badge");

      const updateSoulsDisplay = (val) => {
        const clamped = Math.min(5, Math.max(0, val));
        if (numInput) numInput.value = clamped;
        if (badge) badge.textContent = `+${clamped} Dmg`;
      };

      soulChk?.addEventListener("change", async (e) => {
        const checked = e.target.checked;
        const updates = {
          "flags.mythcraft-essence-sheet.isSoulDamage": checked,
          "flags.mythcraft-essence-sheet.damageType": checked ? "soul" : "sharp",
        };
        if (checked) {
          updates["system.damage.type"] = "soul";
          updates["system.damageType"] = "soul";
        }
        await this.item.update(updates);
      });

      chk?.addEventListener("change", async (e) => {
        const checked = e.target.checked;
        if (stepperRow) stepperRow.style.display = checked ? "flex" : "none";
        const updates = {
          "flags.mythcraft-essence-sheet.enableClaimedSouls": checked,
          "flags.mythcraft-essence-sheet.enableConsumedSouls": checked,
          "system.enableClaimedSouls": checked,
          "system.enableConsumedSouls": checked,
        };
        if (checked && !soulChk?.checked) {
          if (soulChk) soulChk.checked = true;
          updates["flags.mythcraft-essence-sheet.isSoulDamage"] = true;
          updates["flags.mythcraft-essence-sheet.damageType"] = "soul";
          updates["system.damage.type"] = "soul";
          updates["system.damageType"] = "soul";
        }
        await this.item.update(updates);
      });

      numInput?.addEventListener("change", async (e) => {
        const val = Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0));
        updateSoulsDisplay(val);
        await this.item.update({
          "flags.mythcraft-essence-sheet.claimedSouls": val,
          "flags.mythcraft-essence-sheet.consumedSouls": val,
          "system.claimedSouls": val,
          "system.consumedSouls": val,
        });
      });

      minusBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cur = Math.min(5, Math.max(0, parseInt(numInput?.value, 10) || 0));
        const next = Math.max(0, cur - 1);
        updateSoulsDisplay(next);
        await this.item.update({
          "flags.mythcraft-essence-sheet.claimedSouls": next,
          "flags.mythcraft-essence-sheet.consumedSouls": next,
          "system.claimedSouls": next,
          "system.consumedSouls": next,
        });
      });

      plusBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cur = Math.min(5, Math.max(0, parseInt(numInput?.value, 10) || 0));
        const next = Math.min(5, cur + 1);
        updateSoulsDisplay(next);
        await this.item.update({
          "flags.mythcraft-essence-sheet.claimedSouls": next,
          "flags.mythcraft-essence-sheet.consumedSouls": next,
          "system.claimedSouls": next,
          "system.consumedSouls": next,
        });
      });

      const costPanel = detailsTab.querySelector('.essence-item-cost-panel');
      if (costPanel && costPanel.nextSibling) {
        detailsTab.insertBefore(soulsCard, costPanel.nextSibling);
      } else {
        detailsTab.appendChild(soulsCard);
      }
    }

    // 5. Inject Soul option into damage type select elements if not already present
    const isSoulWeapon = Boolean(
      this.item.flags?.["mythcraft-essence-sheet"]?.isSoulDamage ||
      this.item.flags?.["mythcraft-essence-sheet"]?.damageType === "soul" ||
      this.item.system?.damage?.type === "soul" ||
      this.item.system?.damageType === "soul"
    );
    if (isSoulDamageEnabled || isSoulWeapon) {
      const damageSelects = this.element.querySelectorAll("select[name*='damage'][name*='type'], select[name='system.damageType'], select[name='system.damage.type'], select[name='system.damage.0.type']");
      damageSelects.forEach(sel => {
        if (!sel.querySelector("option[value='soul']")) {
          const opt = document.createElement("option");
          opt.value = "soul";
          opt.textContent = "Soul";
          sel.appendChild(opt);
        }
        if (isSoulWeapon && sel.value !== "soul") {
          sel.value = "soul";
        }
      });
    }

    // 6. Inject Active Effect Manager panel into Item Sheet (Details tab & Effects tab)
    const effectsTab = this.element.querySelector('.tab[data-tab="effects"]');
    const targetContainers = [detailsTab, effectsTab].filter(Boolean);
    for (const container of targetContainers) {
      if (container.querySelector(".essence-item-aem-panel")) continue;
      const itemEffects = Array.from(this.item.effects || []);
      const effectRowsHtml = itemEffects.length
        ? itemEffects.map((eff) => {
            const sums = summarizeActiveEffect(eff, this.item);
            const sumHtml = sums.length
              ? sums.map((s) => `<span class="effect-mod-pill ${s.isPositive ? "mod-pos" : "mod-neg"}"><i class="${s.icon}"></i> ${s.text}</span>`).join(" ")
              : `<span style="font-size:11px; color:#94a3b8;">No automated stat rules</span>`;
            return `
              <div class="item-aem-row" data-effect-id="${eff.id}" style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:5px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(58,122,127,0.35); border-radius:6px;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                  <img src="${eff.img || 'icons/svg/aura.svg'}" style="width:22px; height:22px; border-radius:4px; border:1px solid #3a7a7f;" />
                  <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
                    <strong style="font-size:12px; color:#FEEBB3;">${eff.name}</strong>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">${sumHtml}</div>
                  </div>
                </div>
                <button type="button" class="item-aem-edit-btn" data-effect-id="${eff.id}" style="padding:3px 8px; font-size:11px; border-radius:4px; border:1px solid #3a7a7f; background:rgba(46,139,154,0.25); color:#9bd7e5; cursor:pointer;">
                  <i class="fas fa-wand-magic-sparkles"></i> Edit
                </button>
              </div>
            `;
          }).join("")
        : `<p style="margin:0; font-size:11px; color:#94a3b8;">No automated Active Effects attached to this ${this.item.type} yet.</p>`;

      const aemPanel = document.createElement("div");
      aemPanel.className = "essence-item-cost-panel essence-item-aem-panel";
      aemPanel.style.cssText = "background: linear-gradient(135deg, rgba(19, 58, 67, 0.45) 0%, rgba(12, 24, 33, 0.85) 100%); border: 1px solid rgba(58, 122, 127, 0.5); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;";
      aemPanel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px; font-family:'Cinzel', serif; font-size:13px; font-weight:700; color:#FEEBB3;">
            <i class="fas fa-wand-magic-sparkles" style="color:#38bdf8;"></i>
            <span>ACTIVE EFFECTS &amp; AUTOMATION (${itemEffects.length})</span>
          </div>
          <button type="button" class="open-item-aem-btn" style="padding:4px 10px; font-size:11px; font-weight:700; border-radius:5px; border:1px solid #38bdf8; background:linear-gradient(135deg, rgba(14,116,144,0.55), rgba(30,58,138,0.55)); color:#e0f2fe; cursor:pointer; display:flex; align-items:center; gap:5px;">
            <i class="fas fa-wand-magic-sparkles"></i> Active Effect Manager
          </button>
        </div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${effectRowsHtml}
        </div>
      `;

      aemPanel.querySelector(".open-item-aem-btn")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        new ActiveEffectManager({ document: this.item }).render(true);
      });

      aemPanel.querySelectorAll(".item-aem-edit-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const eff = this.item.effects?.get(btn.dataset.effectId) || null;
          new ActiveEffectManager({ document: this.item, effect: eff }).render(true);
        });
      });

      if (container === effectsTab) {
        container.prepend(aemPanel);
      } else {
        const costPanel = container.querySelector(".essence-item-cost-panel");
        if (costPanel && costPanel.nextSibling) {
          container.insertBefore(aemPanel, costPanel.nextSibling);
        } else {
          container.prepend(aemPanel);
        }
      }
    }
  }
}
