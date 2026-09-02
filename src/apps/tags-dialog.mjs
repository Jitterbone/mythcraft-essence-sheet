/**
 * mythcraft-essence-sheet | src/apps/tags-dialog.mjs
 *
 * Stylized modal for viewing, searching, customizing, and adding
 * tags to the MythCraft Tag & Keyword Library.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import {
  DEFAULT_TAGS_LIBRARY,
  TAG_CATEGORIES,
  getActiveTagsLibrary,
  syncCustomTagsToSystem,
} from "../data/tags-library.mjs";
import { MODULE_ID } from "../settings.mjs";

export default class TagsManagementDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "tags-management-dialog"],
    window: {
      title: "MythCraft Tag & Keyword Library",
      icon: "fas fa-tags",
      resizable: true,
    },
    position: {
      width: 780,
      height: 720,
    },
    actions: {
      filterCategory: this.#onFilterCategory,
      addTag: this.#onAddTag,
      deleteTag: this.#onDeleteTag,
      resetDefaults: this.#onResetDefaults,
      saveTags: this.#onSaveTags,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/tags-dialog.hbs",
    },
  };

  /** Working copy of tags in the dialog */
  tagsList = [];
  searchTerm = "";
  activeCategory = "all";

  constructor(options = {}) {
    super(options);
    // Clone active tags library into working list
    const existing = getActiveTagsLibrary();
    this.tagsList = foundry.utils.deepClone(existing);
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Compute category counts
    const categories = Object.entries(TAG_CATEGORIES).map(([key, meta]) => {
      const count = this.tagsList.filter(t => t.category === key).length;
      return {
        key,
        ...meta,
        count,
      };
    });

    // Filter tags by search term and category
    const searchLower = (this.searchTerm || "").toLowerCase().trim();
    const filteredTags = this.tagsList.filter(tag => {
      const matchesCat = this.activeCategory === "all" || tag.category === this.activeCategory;
      if (!matchesCat) return false;
      if (!searchLower) return true;
      return (
        tag.name.toLowerCase().includes(searchLower) ||
        (tag.description || "").toLowerCase().includes(searchLower) ||
        (tag.categoryLabel || "").toLowerCase().includes(searchLower)
      );
    }).map(t => ({
      ...t,
      categoryMeta: TAG_CATEGORIES[t.category] || TAG_CATEGORIES.custom,
    }));

    context.searchTerm = this.searchTerm;
    context.activeCategory = this.activeCategory;
    context.categories = categories;
    context.filteredTags = filteredTags;
    context.totalCount = this.tagsList.length;

    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Live search input handler
    const searchInput = this.element.querySelector(".tag-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this.render();
      });
    }

    // Live description update listeners
    const textareas = this.element.querySelectorAll(".tag-desc-editor");
    textareas.forEach(ta => {
      ta.addEventListener("change", (e) => {
        const tagId = e.target.dataset.tagId;
        const targetTag = this.tagsList.find(t => t.id === tagId);
        if (targetTag) {
          targetTag.description = e.target.value;
        }
      });
    });
  }

  /**
   * Filter by category
   */
  static #onFilterCategory(event, target) {
    const category = target.dataset.category || "all";
    this.activeCategory = category;
    this.render();
  }

  /**
   * Add a new custom tag
   */
  static #onAddTag(event, target) {
    const formGrid = target.closest(".add-tag-panel");
    if (!formGrid) return;

    const nameInput = formGrid.querySelector(".new-tag-name");
    const catSelect = formGrid.querySelector(".new-tag-category");
    const descInput = formGrid.querySelector(".new-tag-desc");

    const name = nameInput?.value?.trim();
    const category = catSelect?.value || "custom";
    const description = descInput?.value?.trim() || "";

    if (!name) {
      ui.notifications.warn("Please enter a name for the new tag.");
      return;
    }

    const catMeta = TAG_CATEGORIES[category] || TAG_CATEGORIES.custom;
    const cleanId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Check duplicate
    if (this.tagsList.some(t => t.id === cleanId)) {
      ui.notifications.warn(`A tag with the ID "${cleanId}" already exists.`);
      return;
    }

    this.tagsList.unshift({
      id: cleanId,
      name,
      category,
      categoryLabel: catMeta.label,
      description,
    });

    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";

    ui.notifications.info(`Added new tag "${name}".`);
    this.render();
  }

  /**
   * Delete tag from working list
   */
  static #onDeleteTag(event, target) {
    const tagId = target.dataset.tagId;
    if (!tagId) return;

    const index = this.tagsList.findIndex(t => t.id === tagId);
    if (index >= 0) {
      const removed = this.tagsList.splice(index, 1)[0];
      ui.notifications.info(`Removed tag "${removed.name}".`);
      this.render();
    }
  }

  /**
   * Reset to official MythCraft system defaults
   */
  static async #onResetDefaults(event, target) {
    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Reset Tag Library" },
      content: "<p>Are you sure you want to restore the default MythCraft tag library? Any custom tags will be reset.</p>",
      rejectClose: false,
      modal: true,
    });

    if (confirm) {
      this.tagsList = foundry.utils.deepClone(DEFAULT_TAGS_LIBRARY);
      await game.settings.set(MODULE_ID, "customTags", this.tagsList);
      syncCustomTagsToSystem();
      ui.notifications.info("Restored default MythCraft Tag Library.");
      this.render();
    }
  }

  /**
   * Save working tag list to world settings
   */
  static async #onSaveTags(event, target) {
    // Capture any pending changes in textareas
    const textareas = this.element.querySelectorAll(".tag-desc-editor");
    textareas.forEach(ta => {
      const tagId = ta.dataset.tagId;
      const targetTag = this.tagsList.find(t => t.id === tagId);
      if (targetTag) {
        targetTag.description = ta.value;
      }
    });

    await game.settings.set(MODULE_ID, "customTags", this.tagsList);
    syncCustomTagsToSystem();
    ui.notifications.info("MythCraft Tag & Keyword Library saved successfully.");

    // Refresh open Item and Actor sheets
    for (const app of Object.values(ui.windows)) {
      if (app.documentName === "Item" || app.documentName === "Actor") {
        app.render?.();
      }
    }

    this.close();
  }
}

