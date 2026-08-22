/**
 * MythCraft Essence — Movement & Initiative Config Dialog
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class MovementDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "movement-dialog"],
    window: {
      title: "Movement & Initiative",
      icon: "fas fa-person-running",
      resizable: true,
    },
    position: {
      width: 440,
      height: "auto",
    },
    form: {
      handler: MovementDialog.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/movement-dialog.hbs",
    },
  };

  constructor(options = {}) {
    super(options);
    this.#document = options.document;
  }

  /** @type {Actor} */
  #document;

  get document() {
    return this.#document;
  }

  /** @inheritdoc */
  get title() {
    return `Movement & Initiative — ${this.document?.name || "Character"}`;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    context.document = this.document;
    context.system = this.document.system;
    return context;
  }

  static async #onSubmitForm(event, form, formData) {
    const actor = this.document;
    if (!actor) return;
    const raw = formData.object;

    const parseOptionalSpeed = (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = parseInt(val, 10);
      return (!isNaN(num) && num > 0) ? num : null;
    };

    const walkVal = parseInt(raw["system.movement.walk"] ?? raw?.system?.movement?.walk, 10);
    const walk = !isNaN(walkVal) ? Math.max(0, walkVal) : 20;

    const climb = parseOptionalSpeed(raw["system.movement.climb"] ?? raw?.system?.movement?.climb);
    const swim = parseOptionalSpeed(raw["system.movement.swim"] ?? raw?.system?.movement?.swim);
    const fly = parseOptionalSpeed(raw["system.movement.fly"] ?? raw?.system?.movement?.fly);
    const burrow = parseOptionalSpeed(raw["system.movement.burrow"] ?? raw?.system?.movement?.burrow);

    const initBonusVal = parseInt(raw["system.initiative.bonus"] ?? raw?.system?.initiative?.bonus, 10);
    const initBonus = !isNaN(initBonusVal) ? initBonusVal : 0;

    const updates = {
      "system.movement.walk": walk,
      "system.movement.climb": climb,
      "system.movement.swim": swim,
      "system.movement.fly": fly,
      "system.movement.burrow": burrow,
      "system.initiative.bonus": initBonus,
    };

    try {
      await actor.update(updates);
      ui.notifications.info(`Updated Movement & Initiative for ${actor.name}`);
    } catch (err) {
      console.error("Error updating movement & initiative:", err);
      ui.notifications.error("Failed to update movement settings.");
    }
  }
}
