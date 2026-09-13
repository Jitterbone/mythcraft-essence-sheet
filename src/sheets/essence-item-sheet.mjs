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
    const context = await super._prepareContext(options);

    // Synchronize tags into CONFIG before building UI
    syncCustomTagsToSystem();

    const library = getActiveTagsLibrary();
    const itemType = this.item.type || "item";

    // Extract structured tags from subheader / description / properties in memory
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

    // 0. Inject Detected & Configured Item Tags Panel in Details Tab
    if (detailsTab && !this.element.querySelector('.essence-item-tags-panel')) {
      const enrichedTags = context.enrichedTags || getEnrichedItemTags(this.item);
      if (enrichedTags && enrichedTags.length > 0) {
        const tagsCard = document.createElement("div");
        tagsCard.className = "essence-item-tags-panel";
        tagsCard.style.cssText = "background: rgba(8, 28, 36, 0.7); border: 1px solid rgba(88, 178, 192, 0.35); border-radius: 8px; padding: 8px 12px; margin-bottom: 10px;";
        tagsCard.innerHTML = `
          <div class="tags-panel-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid rgba(88, 178, 192, 0.25); padding-bottom:4px;">
            <div class="tags-title" style="font-family:'Cinzel', Georgia, serif; color:#f1c40f; font-weight:700; font-size:0.82rem; letter-spacing:0.06em; text-transform:uppercase; display:flex; align-items:center; gap:6px;">
              <i class="fas fa-tags tag-icon" style="color:#2dd4bf;"></i>
              <span>ITEM TAGS</span>
            </div>
            <span class="tags-hint" style="font-size:0.7rem; color:rgba(254, 235, 179, 0.6);">Detected & configured tags</span>
          </div>
          <div class="essence-tags-pills-row" style="display:flex; flex-wrap:wrap; gap:6px; padding:4px 0;">
            ${enrichedTags.map(tag => `
              <span class="tag-badge-pill ${tag.category}" 
                    style="--cat-color: ${tag.categoryMeta.color}; --cat-bg: ${tag.categoryMeta.bg}; --cat-border: ${tag.categoryMeta.border}; cursor:pointer;"
                    data-tooltip="${(tag.tooltipHTML || tag.name).replace(/"/g, '&quot;')}"
                    data-tooltip-direction="UP">
                <i class="${tag.categoryMeta.icon}"></i>
                <span class="tag-badge-name">${tag.name}</span>
              </span>
            `).join("")}
          </div>
        `;
        detailsTab.prepend(tagsCard);
      }
    }

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
  }
}
