/**
 * mythcraft-essence-sheet | src/apps/actor-tags-dialog.mjs
 *
 * Interactive modal for assigning and removing tags on an Actor
 * from the official MythCraft Tag & Keyword Library.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import {
  DEFAULT_TAGS_LIBRARY,
  TAG_CATEGORIES,
  getActiveTagsLibrary,
  formatTagTitle,
  findTagDefinition,
} from "../data/tags-library.mjs";

export default class ActorTagsAssignmentDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "div",
    classes: ["mythcraft", "essence-sheet", "actor-tags-dialog"],
    window: {
      title: "Assign Creature Tags",
      icon: "fas fa-tags",
      resizable: true,
    },
    position: {
      width: 760,
      height: 680,
    },
    actions: {
      filterCategory: this.#onFilterCategory,
      toggleActorTag: this.#onToggleActorTag,
      addCustomActorTag: this.#onAddCustomActorTag,
      closeDialog: this.#onCloseDialog,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/actor-tags-dialog.hbs",
    },
  };

  searchTerm = "";
  activeCategory = "all";

  constructor(options = {}) {
    super(options);
    this.actor = options.document || options.actor;
  }

  /**
   * Get clean array of actor tag strings
   * @returns {string[]}
   */
  getActorTags() {
    const raw = this.actor?.system?.tags || [];
    if (Array.isArray(raw)) return raw;
    if (raw instanceof Set) return Array.from(raw);
    if (typeof raw === "string") return raw.split(",").map(t => t.trim()).filter(Boolean);
    return [];
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const library = getActiveTagsLibrary();
    const actorTags = this.getActorTags().map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ""));

    // Compute category counts
    const categories = Object.entries(TAG_CATEGORIES).map(([key, meta]) => {
      const count = library.filter(t => t.category === key).length;
      return {
        key,
        ...meta,
        count,
      };
    });

    // Filter tags by search and category
    const searchLower = (this.searchTerm || "").toLowerCase().trim();
    const filteredTags = library.filter(tag => {
      const matchesCat = this.activeCategory === "all" || tag.category === this.activeCategory;
      if (!matchesCat) return false;
      if (!searchLower) return true;
      return (
        tag.name.toLowerCase().includes(searchLower) ||
        (tag.description || "").toLowerCase().includes(searchLower) ||
        (tag.categoryLabel || "").toLowerCase().includes(searchLower)
      );
    }).map(t => {
      const normId = (t.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const normName = (t.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const isAssigned = actorTags.includes(normId) || actorTags.includes(normName);
      return {
        ...t,
        categoryMeta: TAG_CATEGORIES[t.category] || TAG_CATEGORIES.custom,
        isAssigned,
      };
    });

    context.actor = this.actor;
    context.searchTerm = this.searchTerm;
    context.activeCategory = this.activeCategory;
    context.categories = categories;
    context.filteredTags = filteredTags;
    context.totalCount = library.length;
    context.actorTagsCount = this.getActorTags().length;

    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    const searchInput = this.element.querySelector(".tag-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this.render();
      });
    }

    const customInput = this.element.querySelector(".quick-tag-input");
    if (customInput) {
      customInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ActorTagsAssignmentDialog.#onAddCustomActorTag.call(this, e, customInput);
        }
      });
    }
  }

  /**
   * Filter tag category
   */
  static #onFilterCategory(event, target) {
    const category = target.dataset.category || "all";
    this.activeCategory = category;
    this.render();
  }

  /**
   * Toggle tag on the actor
   */
  static async #onToggleActorTag(event, target) {
    const tagId = target.dataset.tagId;
    const tagName = target.dataset.tagName || tagId;
    if (!tagId || !this.actor) return;

    const currentTags = [...this.getActorTags()];
    const normId = tagId.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normName = tagName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const existingIndex = currentTags.findIndex(t => {
      const tNorm = t.toLowerCase().replace(/[^a-z0-9]/g, "");
      return tNorm === normId || tNorm === normName;
    });

    if (existingIndex >= 0) {
      // Remove
      currentTags.splice(existingIndex, 1);
      ui.notifications.info(`Removed tag "${tagName}" from ${this.actor.name}.`);
    } else {
      // Add
      currentTags.push(tagName);
      ui.notifications.info(`Added tag "${tagName}" to ${this.actor.name}.`);
    }

    await this.actor.update({ "system.tags": currentTags });
    this.render();
  }

  /**
   * Add a custom tag directly to actor
   */
  static async #onAddCustomActorTag(event, target) {
    const root = target.closest(".actor-tags-dialog-content") || this.element;
    const input = root.querySelector(".quick-tag-input");
    const name = input?.value?.trim();
    if (!name || !this.actor) {
      ui.notifications.warn("Please enter a tag name.");
      return;
    }

    const currentTags = [...this.getActorTags()];
    const normName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (currentTags.some(t => t.toLowerCase().replace(/[^a-z0-9]/g, "") === normName)) {
      ui.notifications.warn(`Tag "${name}" is already assigned to this creature.`);
      return;
    }

    currentTags.push(formatTagTitle(name));
    await this.actor.update({ "system.tags": currentTags });
    if (input) input.value = "";
    ui.notifications.info(`Added custom tag "${name}" to ${this.actor.name}.`);
    this.render();
  }

  /**
   * Close dialog
   */
  static #onCloseDialog() {
    this.close();
  }
}

