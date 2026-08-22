/**
 * mythcraft-essence-sheet | src/sheets/essence-item-sheet.mjs
 *
 * Polished, high-readability alternate Item Sheet for the MythCraft system
 * matching the Essence character sheet theme (dark teal, gold, and cosmic purple).
 */

import MythCraftItemSheet from "/systems/mythcraft/module/applications/sheets/item-sheet.mjs";
import { isItemContainer } from "../features/container-utils.mjs";
import { isItemClothes } from "../features/equipment-automation.mjs";

export default class EssenceItemSheet extends MythCraftItemSheet {

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
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const essenceCost = Number(this.item.flags?.["mythcraft-essence-sheet"]?.essenceCost ?? this.item.system?.essenceCost ?? 0);
    const itemType = this.item.type || "item";
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
      itemPortrait.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (this.item?.img) {
          new ImagePopoutApp({
            src: this.item.img,
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
  }
}
