/**
 * mythcraft-essence-sheet | src/apps/second-skin-dialog.mjs
 *
 * Interactive Dialog for selecting Second Skin Armor Specialization.
 * Supports Light Armor, Medium Armor, Heavy Armor, and Shields with official MythCraft armor lists.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export const SECOND_SKIN_OPTIONS = {
  light: [
    "Cuirass (Leather)",
    "Gambeson",
    "Hide",
    "Leather",
    "Robes (Command)",
    "Robes (Corruption)",
    "Robes (Elemental)",
    "Robes (Mage)",
    "Robes (Starlight)",
  ],
  medium: [
    "Breastplate",
    "Breastplate (Gilded)",
    "Brigandine",
    "Cuirass (Iron)",
    "Half Plate",
    "Lamellar",
    "Leather-and-Steel",
    "Scale Mail",
    "Splint Mail",
  ],
  heavy: [
    "Branded Mail",
    "Chain Mail",
    "Plate (Field)",
    "Plate (Full)",
    "Plate (Gilded)",
  ],
  shield: [
    "Buckler",
    "Heater Shield",
    "Kite Shield",
    "Tower Shield",
  ],
};

export const SECOND_SKIN_CATEGORY_LABELS = {
  light: "Light Armor",
  medium: "Medium Armor",
  heavy: "Heavy Armor",
  shield: "Shields",
  all: "All Armor & Shield Types",
};

/**
 * Helper to determine category of a Second Skin item
 * @param {Item} item
 * @returns {"light"|"medium"|"heavy"|"shield"|"all"}
 */
export function getSecondSkinTalentCategory(item) {
  if (!item) return "all";
  const name = (item.name || "").toLowerCase().trim();
  const desc = String(item.system?.description?.value || item.system?.description || "").toLowerCase();

  if (name.includes("light") || desc.includes("light armor")) return "light";
  if (name.includes("medium") || name.includes("med ") || name.includes("med:") || desc.includes("medium armor")) return "medium";
  if (name.includes("heavy") || desc.includes("heavy armor")) return "heavy";
  if (name.includes("shield") || desc.includes("shield")) return "shield";

  return "all";
}

/**
 * Checks whether an item is a Second Skin talent
 * @param {Item} item
 * @returns {boolean}
 */
export function isSecondSkinTalent(item) {
  if (!item) return false;
  const name = (item.name || "").toLowerCase().trim();
  const desc = String(item.system?.description?.value || item.system?.description || "").toLowerCase();

  return name.includes("second skin") ||
    desc.includes("gain the armor’s resist bonus") ||
    desc.includes("gain the armor's resist bonus") ||
    desc.includes("gain the shield’s resist bonus") ||
    desc.includes("gain the shield's resist bonus");
}

export default class SecondSkinChoiceDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(item, options = {}) {
    super(options);
    this.item = item;
    this.actor = item.actor || item.parent;
    this.category = getSecondSkinTalentCategory(item);
    this.currentChoice = item.flags?.["mythcraft-essence-sheet"]?.secondSkinArmor || "";
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "second-skin-dialog"],
    window: {
      title: "Second Skin: Armor Specialization",
      icon: "fas fa-shield-halved",
      resizable: false,
    },
    position: {
      width: 480,
      height: "auto",
    },
    actions: {
      confirmChoice: this.#onConfirmChoice,
      selectArmorOption: this.#onSelectArmorOption,
    },
  };

  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/second-skin-dialog.hbs",
    },
  };

  /** @inheritdoc */
  async _prepareContext(options) {
    const currentCategory = this.category;
    let armorOptions = [];

    if (currentCategory in SECOND_SKIN_OPTIONS) {
      armorOptions = SECOND_SKIN_OPTIONS[currentCategory].map(name => ({
        name,
        isSelected: name.toLowerCase() === this.currentChoice.toLowerCase(),
      }));
    } else {
      // "all" - provide grouped or combined options
      for (const [catKey, names] of Object.entries(SECOND_SKIN_OPTIONS)) {
        armorOptions.push(...names.map(name => ({
          name,
          categoryLabel: SECOND_SKIN_CATEGORY_LABELS[catKey],
          isSelected: name.toLowerCase() === this.currentChoice.toLowerCase(),
        })));
      }
    }

    return {
      item: this.item,
      actor: this.actor,
      category: currentCategory,
      categoryLabel: SECOND_SKIN_CATEGORY_LABELS[currentCategory] || "Armor",
      armorOptions,
      currentChoice: this.currentChoice,
    };
  }

  static async #onSelectArmorOption(event, target) {
    const selected = target.dataset.armorName;
    if (!selected) return;
    this.currentChoice = selected;
    this.render(false);
  }

  static async #onConfirmChoice(event, target) {
    event.preventDefault();
    const form = this.element.querySelector("form") || this.element;
    const customInput = form.querySelector('input[name="customArmor"]')?.value?.trim();
    const radioSelected = form.querySelector('input[name="selectedArmor"]:checked')?.value;

    const finalChoice = customInput || radioSelected || this.currentChoice;
    if (!finalChoice) {
      ui.notifications.warn("Please select an armor type for Second Skin specialization.");
      return;
    }

    const baseName = this.item.name.replace(/\s*\([^)]*\)$/, "");
    await this.item.update({
      name: `${baseName} (${finalChoice})`,
      "flags.mythcraft-essence-sheet.secondSkinArmor": finalChoice,
    });

    ui.notifications.info(`Selected ${finalChoice} specialization for ${this.item.name}.`);
    this.close();

    // Re-render actor sheet to update resistance calculation and badges
    if (this.actor?.sheet?.rendered) {
      this.actor.sheet.render(false);
    }
  }

  /**
   * Static helper to open the dialog for an item
   * @param {Item} item
   * @returns {SecondSkinChoiceDialog}
   */
  static promptChoice(item) {
    const dialog = new SecondSkinChoiceDialog(item);
    dialog.render(true);
    return dialog;
  }
}
