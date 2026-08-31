/**
 * MythCraft Essence — Custom Talent Compendiums Config Dialog
 *
 * Enables GMs and players to register custom/homebrew compendiums
 * and categorize them as Classes, Subclasses, Specializations, or Magic.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const MODULE_ID = "mythcraft-essence-sheet";

export default class TalentCompendiumsConfigDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "talent-compendiums-dialog"],
    window: {
      title: "Custom Talent Compendiums & Skill Trees",
      icon: "fas fa-diagram-project",
      resizable: true,
    },
    position: {
      width: 760,
      height: "auto",
    },
    form: {
      handler: this.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      addCustomCompendium: this.#onAddCustomCompendium,
      deleteCustomCompendium: this.#onDeleteCustomCompendium,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/talent-compendiums-config-dialog.hbs",
    },
  };

  constructor(options = {}) {
    super(options);
    this._customCompendiums = foundry.utils.deepClone(game.settings.get(MODULE_ID, "customTalentCompendiums") ?? []);
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Context Preparation
   * ─────────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const availablePacks = [];
    if (globalThis.game?.packs) {
      for (const pack of game.packs.values()) {
        if (pack.documentName === "Item") {
          availablePacks.push({
            id: pack.metadata?.id || pack.collection,
            title: pack.metadata?.label || pack.title || pack.collection,
            package: pack.metadata?.packageName || pack.metadata?.package || "world",
          });
        }
      }
    }
    availablePacks.sort((a, b) => a.title.localeCompare(b.title));

    const categoryOptions = [
      { key: "class", label: "Class (Base Class & Tracks)", icon: "fas fa-shield" },
      { key: "subclass", label: "Subclass Track", icon: "fas fa-shield-halved" },
      { key: "specialization", label: "Specialization Talents", icon: "fas fa-crosshairs" },
      { key: "magic", label: "Magic Talents", icon: "fas fa-wand-magic-sparkles" },
    ];

    const compendiumsList = this._customCompendiums.map((comp, index) => {
      const selectedCat = comp.category || "class";
      const catMeta = categoryOptions.find(c => c.key === selectedCat) || categoryOptions[0];

      return {
        ...comp,
        index,
        categoryMeta: catMeta,
        categoryOptions: categoryOptions.map(cat => ({
          ...cat,
          selected: cat.key === selectedCat,
        })),
        isSubclass: selectedCat === "subclass",
        isClass: selectedCat === "class",
        isSpecialization: selectedCat === "specialization",
        isMagic: selectedCat === "magic",
      };
    });

    return {
      availablePacks,
      customCompendiums: compendiumsList,
      hasCustomCompendiums: compendiumsList.length > 0,
      totalConfigured: compendiumsList.length,
    };
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Event Handlers & Form Submission
   * ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Add a new custom compendium row
   */
  static #onAddCustomCompendium(event, target) {
    event.preventDefault();
    this._customCompendiums.push({
      id: foundry.utils.randomID(),
      pack: "",
      category: "class",
      parentName: "",
      trackName: "",
    });
    this.render();
  }

  /**
   * Delete a custom compendium row
   */
  static #onDeleteCustomCompendium(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    if (!isNaN(index) && index >= 0 && index < this._customCompendiums.length) {
      this._customCompendiums.splice(index, 1);
      this.render();
    }
  }

  /**
   * Save and submit custom compendiums
   */
  static async #onSubmitForm(event, form, formData) {
    const rawData = formData.object;
    const compendiumsMap = new Map();

    for (const [key, value] of Object.entries(rawData)) {
      const match = key.match(/^compendiums\.(\d+)\.(.+)$/);
      if (match) {
        const index = Number(match[1]);
        const field = match[2];
        if (!compendiumsMap.has(index)) {
          compendiumsMap.set(index, { id: foundry.utils.randomID() });
        }
        compendiumsMap.get(index)[field] = typeof value === "string" ? value.trim() : value;
      }
    }

    const cleanedCompendiums = Array.from(compendiumsMap.values())
      .filter(c => Boolean(c.pack))
      .map(c => ({
        id: c.id || foundry.utils.randomID(),
        pack: c.pack.trim(),
        category: c.category || "class",
        parentName: (c.parentName || "").trim(),
        trackName: (c.trackName || "").trim(),
      }));

    await game.settings.set(MODULE_ID, "customTalentCompendiums", cleanedCompendiums);
    ui.notifications.info(`Saved ${cleanedCompendiums.length} custom talent compendium${cleanedCompendiums.length === 1 ? "" : "s"}.`);

    // Refresh any open character sheets and talent tree viewers
    for (const app of Object.values(ui.windows)) {
      if (app.documentName === "Actor" || app.constructor?.name === "TalentTreeViewer") {
        app.render?.();
      }
    }
  }
}
