/**
 * MythCraft Essence — Senses Config Dialog
 * Stylized modal for toggling senses and setting sight distances in feet.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class SensesDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "senses-dialog"],
    window: {
      title: "Senses Configuration",
      icon: "fas fa-eye",
      resizable: true,
    },
    position: {
      width: 460,
      height: "auto",
    },
    form: {
      handler: SensesDialog.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/senses-dialog.hbs",
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
    return `Senses — ${this.document?.name || "Character"}`;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const currentSenses = this.document?.system?.senses || {};

    const availableSenses = [
      { key: "blindsight", label: "Blindsight", icon: "fas fa-eye-low-vision", defaultDist: 30 },
      { key: "lowlight", label: "Low-Light Vision", icon: "fas fa-moon", defaultDist: 60 },
      { key: "darkvision", label: "Darkvision", icon: "fas fa-eye", defaultDist: 60 },
      { key: "magicDarkvision", label: "Magical Darkvision", icon: "fas fa-wand-magic-sparkles", defaultDist: 60 },
      { key: "tremorsense", label: "Tremorsense", icon: "fas fa-water", defaultDist: 30 },
      { key: "truesight", label: "Truesight", icon: "fas fa-sun", defaultDist: 30 },
    ];

    context.senses = availableSenses.map(s => {
      const existing = currentSenses[s.key];
      const enabled = existing !== undefined && existing !== null;
      const value = enabled ? (existing.value ?? s.defaultDist) : s.defaultDist;
      return {
        ...s,
        enabled,
        value,
      };
    });

    context.actor = this.document;
    context.system = this.document?.system;
    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    // Wire up dynamic enable/disable on checkbox changes
    const rows = this.element.querySelectorAll(".sense-dialog-row");
    for (const row of rows) {
      const checkbox = row.querySelector(".sense-enable-checkbox");
      const distWrap = row.querySelector(".sense-dist-wrap");
      const distInput = row.querySelector(".sense-dist-input");
      if (checkbox && distInput && distWrap) {
        checkbox.addEventListener("change", () => {
          distInput.disabled = !checkbox.checked;
          distWrap.classList.toggle("disabled", !checkbox.checked);
          row.classList.toggle("active-row", checkbox.checked);
          if (checkbox.checked && (!distInput.value || Number(distInput.value) <= 0)) {
            distInput.value = 60;
          }
        });
      }
    }
  }

  static async #onSubmitForm(event, form, formData) {
    const actor = this.document;
    if (!actor) return;

    const rawData = formData.object;
    const updates = {};

    const availableKeys = ["blindsight", "lowlight", "darkvision", "magicDarkvision", "tremorsense", "truesight"];

    for (const key of availableKeys) {
      const isEnabled = Boolean(rawData[`sense_${key}_enabled`]);
      if (isEnabled) {
        const dist = Number(rawData[`sense_${key}_value`]) || 30;
        updates[`system.senses.${key}`] = { value: dist };
      } else {
        updates[`system.senses.-=${key}`] = null;
      }
    }

    await actor.update(updates);
    ui.notifications.info(`Updated Senses for ${actor.name}`);
  }
}

