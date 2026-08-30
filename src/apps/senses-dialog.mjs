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
    const actor = this.document;
    const rawSenses = actor?.system?.senses;

    const availableSenses = [
      { key: "blindsight", label: "Blindsight", icon: "fas fa-eye-low-vision", defaultDist: 30 },
      { key: "lowlight", label: "Low-Light Vision", icon: "fas fa-moon", defaultDist: 60 },
      { key: "darkvision", label: "Darkvision", icon: "fas fa-eye", defaultDist: 60 },
      { key: "magicDarkvision", label: "Magical Darkvision", icon: "fas fa-wand-magic-sparkles", defaultDist: 60 },
      { key: "tremorsense", label: "Tremorsense", icon: "fas fa-water", defaultDist: 30 },
      { key: "truesight", label: "Truesight", icon: "fas fa-sun", defaultDist: 30 },
    ];

    let currentSensesMap = {};
    if (typeof rawSenses === "string" && rawSenses.trim()) {
      for (const part of rawSenses.split(",").map(p => p.trim()).filter(Boolean)) {
        const lower = part.toLowerCase();
        for (const s of availableSenses) {
          if (lower.includes(s.key.toLowerCase()) || lower.includes(s.label.toLowerCase()) || (s.key === "lowlight" && lower.includes("low-light"))) {
            const distMatch = part.match(/(\d+)/);
            const dist = distMatch ? parseInt(distMatch[1], 10) : s.defaultDist;
            currentSensesMap[s.key] = { value: dist };
            break;
          }
        }
      }
    } else if (rawSenses && typeof rawSenses === "object") {
      currentSensesMap = rawSenses;
    }

    context.senses = availableSenses.map(s => {
      const existing = currentSensesMap[s.key];
      const enabled = existing !== undefined && existing !== null;
      const value = enabled ? (existing.value ?? s.defaultDist) : s.defaultDist;
      return {
        ...s,
        enabled,
        value,
      };
    });

    context.actor = actor;
    context.system = actor?.system;
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

    const isNPC = actor.type === "npc" || (typeof actor.system?.senses === "string");
    const rawData = formData.object;

    const availableSenses = [
      { key: "blindsight", label: "Blindsight", defaultDist: 30 },
      { key: "lowlight", label: "Low-Light Vision", defaultDist: 60 },
      { key: "darkvision", label: "Darkvision", defaultDist: 60 },
      { key: "magicDarkvision", label: "Magical Darkvision", defaultDist: 60 },
      { key: "tremorsense", label: "Tremorsense", defaultDist: 30 },
      { key: "truesight", label: "Truesight", defaultDist: 30 },
    ];

    if (isNPC) {
      const senseStrings = [];
      for (const s of availableSenses) {
        const isEnabled = Boolean(rawData[`sense_${s.key}_enabled`]);
        if (isEnabled) {
          const dist = Number(rawData[`sense_${s.key}_value`]) || s.defaultDist;
          senseStrings.push(`${s.label} ${dist} ft.`);
        }
      }
      const formatted = senseStrings.join(", ");
      await actor.update({ "system.senses": formatted });
    } else {
      const updates = {};
      for (const s of availableSenses) {
        const isEnabled = Boolean(rawData[`sense_${s.key}_enabled`]);
        if (isEnabled) {
          const dist = Number(rawData[`sense_${s.key}_value`]) || s.defaultDist;
          updates[`system.senses.${s.key}`] = { value: dist };
        } else {
          updates[`system.senses.-=${s.key}`] = null;
        }
      }
      await actor.update(updates);
    }

    ui.notifications.info(`Updated Senses for ${actor.name}`);
  }
}

