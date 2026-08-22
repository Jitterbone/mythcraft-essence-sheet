/**
 * MythCraft Essence — Conditions Config Dialog
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const CONDITION_DESCRIPTIONS = {
  bleeding: "Takes physical damage at the start of each turn until treated.",
  bloodied: "Health is at or below half maximum HP.",
  burning: "Takes fire damage at the start of each turn until extinguished.",
  broken: "Suffering severe morale failure; disadvantage on attacks and checks.",
  charmed: "Cannot harm the charmer and the charmer has advantage on social checks against you.",
  chilled: "Movement speed is reduced and cold penalties apply.",
  concealed: "Hard to see; attackers suffer disadvantage or situational TD.",
  partialCover: "+2 bonus to Armor Rating against ranged attacks.",
  totalCover: "Cannot be targeted directly by attacks or spells.",
  dazed: "Can take an Action or Move on turn, but not both; cannot take Reactions.",
  deafened: "Cannot hear and automatically fails checks that require hearing.",
  fatigued: "Suffering from exhaustion; penalties to physical attributes and stamina.",
  frightened: "Disadvantage on ability checks and attack rolls while source of fear is in line of sight.",
  grappled: "Movement speed is reduced to 0.",
  incapacitated: "Cannot take actions or reactions.",
  invisible: "Impossible to see without special senses; advantage on attacks against targets.",
  paralyzed: "Incapacitated and cannot move or speak. Attacks against have advantage.",
  petrified: "Transformed into solid inanimate substance. Weight increases ten-fold.",
  poisoned: "Disadvantage on attack rolls and ability checks.",
  prone: "Lying on the ground. Crawling costs double movement. Melee attacks against have advantage.",
  restrained: "Speed becomes 0. Attacks against have advantage, own attacks have disadvantage.",
  shaken: "Disadvantage on mental checks.",
  sickened: "Penalties to stamina and physical fortitude.",
  slowed: "All movement speeds are halved.",
  stunned: "Incapacitated, cannot move, and speak falteringly.",
  surprised: "Cannot move or take actions on the first round of combat.",
  unconscious: "Incapacitated, drops what holding, falls prone, unaware of surroundings.",
  vulnerable: "Takes additional damage from specified damage types.",
};

export default class ConditionsDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "conditions-dialog"],
    window: {
      title: "Conditions & Status Effects",
      icon: "fas fa-biohazard",
      resizable: true,
    },
    position: {
      width: 620,
      height: 520,
    },
    form: {
      handler: ConditionsDialog.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/conditions-dialog.hbs",
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
    return `Conditions — ${this.document?.name || "Character"}`;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    const activeStatusIds = new Set();
    for (const effect of (actor?.effects || [])) {
      for (const st of effect.statuses) {
        activeStatusIds.add(st);
      }
    }

    const allConditions = Object.entries(mythcraft?.CONFIG?.conditions || {}).map(([id, config]) => {
      const label = game.i18n.localize(config.name || id);
      const desc = CONDITION_DESCRIPTIONS[id] || `${label} status condition.`;
      return {
        id,
        label,
        img: config.img || "icons/svg/aura.svg",
        active: activeStatusIds.has(id),
        description: desc,
      };
    });

    context.conditions = allConditions;
    context.actor = actor;
    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const cards = this.element.querySelectorAll(".condition-toggle-card");
    for (const card of cards) {
      const checkbox = card.querySelector('input[type="checkbox"]');
      card.addEventListener("click", () => {
        checkbox.checked = !checkbox.checked;
        card.classList.toggle("active", checkbox.checked);
      });
    }
  }

  static async #onSubmitForm(event, form, formData) {
    const actor = this.document;
    if (!actor) return;

    const rawData = formData.object;
    const selectedStatusIds = new Set();

    for (const [k, v] of Object.entries(rawData)) {
      if (k.startsWith("condition_") && v) {
        selectedStatusIds.add(v);
      }
    }

    // Determine conditions to add and remove
    for (const [id] of Object.entries(mythcraft?.CONFIG?.conditions || {})) {
      const isCurrentlyActive = actor.statuses?.has?.(id) || actor.effects?.some(e => e.statuses?.has?.(id));
      const shouldBeActive = selectedStatusIds.has(id);

      if (shouldBeActive && !isCurrentlyActive) {
        await actor.toggleStatusEffect(id, { active: true });
      } else if (!shouldBeActive && isCurrentlyActive) {
        await actor.toggleStatusEffect(id, { active: false });
      }
    }

    ui.notifications.info(`Updated Conditions for ${actor.name}`);
  }
}

