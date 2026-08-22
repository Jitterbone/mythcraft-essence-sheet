/**
 * mythcraft-essence-sheet | src/apps/currency-config-dialog.mjs
 *
 * Stylized modal for configuring Custom Currencies, abbreviations, icons,
 * custom colors, exchange rates, live conversion preview matrix,
 * AND GM-customizable Shopping Quick Presets.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import { DEFAULT_CURRENCY_CONFIG, DEFAULT_CURRENCY_PRESETS, MODULE_ID } from "../settings.mjs";

export const ICON_THEMES = {
  coins: [
    { icon: "fas fa-circle", label: "Simple Coin", defaultColor: "#d97706" },
    { icon: "fas fa-circle-dot", label: "Detailed Coin", defaultColor: "#cbd5e1" },
    { icon: "fas fa-coins", label: "Coin Stack", defaultColor: "#f1c40f" },
    { icon: "fas fa-gem", label: "Diamond Coin", defaultColor: "#38bdf8" },
    { icon: "fas fa-sack-dollar", label: "Money Sack", defaultColor: "#a855f7" },
  ],
  gems: [
    { icon: "fas fa-diamond", label: "Raw Gem", defaultColor: "#f97316" },
    { icon: "fas fa-gem", label: "Cut Crystal", defaultColor: "#06b6d4" },
    { icon: "fas fa-ring", label: "Jeweled Ring", defaultColor: "#ec4899" },
    { icon: "fas fa-crown", label: "Crown Jewel", defaultColor: "#eab308" },
  ],
  dollars: [
    { icon: "fas fa-cent-sign", label: "Cent / Penny", defaultColor: "#b45309" },
    { icon: "fas fa-money-bill", label: "Single Note", defaultColor: "#22c55e" },
    { icon: "fas fa-money-bill-wave", label: "Waving Bill", defaultColor: "#10b981" },
    { icon: "fas fa-vault", label: "Vault Reserve", defaultColor: "#6366f1" },
  ],
};

export const AVAILABLE_ICONS = [
  { icon: "fas fa-circle", label: "Small Coin" },
  { icon: "fas fa-circle-dot", label: "Minted Coin" },
  { icon: "fas fa-coins", label: "Coins Pile" },
  { icon: "fas fa-gem", label: "Gem / Crystal" },
  { icon: "fas fa-diamond", label: "Diamond" },
  { icon: "fas fa-sack-dollar", label: "Coin Sack" },
  { icon: "fas fa-crown", label: "Crown" },
  { icon: "fas fa-ring", label: "Ring" },
  { icon: "fas fa-money-bill", label: "Bill Note" },
  { icon: "fas fa-money-bill-wave", label: "Money Wave" },
  { icon: "fas fa-cent-sign", label: "Cent Sign" },
  { icon: "fas fa-vault", label: "Vault" },
  { icon: "fas fa-scale-balanced", label: "Scales" },
  { icon: "fas fa-star", label: "Star" },
];

export default class CurrencyConfigDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "currency-config-dialog"],
    window: {
      title: "Currency & Exchange Configuration",
      icon: "fas fa-coins",
      resizable: true,
    },
    position: {
      width: 820,
      height: "auto",
    },
    form: {
      handler: this.#onSubmitForm,
      closeOnSubmit: true,
    },
    actions: {
      addCurrency: this.#onAddCurrency,
      removeCurrency: this.#onRemoveCurrency,
      setDefaultCurrency: this.#onSetDefaultCurrency,
      resetDefaults: this.#onResetDefaults,
      applyTheme: this.#onApplyTheme,
      addPreset: this.#onAddPreset,
      removePreset: this.#onRemovePreset,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/currency-config-dialog.hbs",
    },
  };

  #workingCurrencies = null;
  #workingPresets = null;

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    if (!this.#workingCurrencies) {
      let saved = [];
      try {
        saved = game.settings.get(MODULE_ID, "customCurrencyConfig");
      } catch (err) {
        saved = [];
      }
      this.#workingCurrencies = Array.isArray(saved) && saved.length ? foundry.utils.deepClone(saved) : foundry.utils.deepClone(DEFAULT_CURRENCY_CONFIG);
    }

    if (!this.#workingPresets) {
      let savedPresets = [];
      try {
        savedPresets = game.settings.get(MODULE_ID, "customCurrencyPresets");
      } catch (err) {
        savedPresets = [];
      }
      this.#workingPresets = Array.isArray(savedPresets) && savedPresets.length ? foundry.utils.deepClone(savedPresets) : foundry.utils.deepClone(DEFAULT_CURRENCY_PRESETS);
    }

    // Sort ascending by rate (Lowest to Highest value)
    this.#workingCurrencies.sort((a, b) => (Number(a.rate) || 1) - (Number(b.rate) || 1));

    // Ensure exactly one default currency is selected (defaulting to Silver Coins)
    const hasDefault = this.#workingCurrencies.some(c => c.isDefault);
    if (!hasDefault) {
      const sc = this.#workingCurrencies.find(c => c.abbr === "sc" || c.key === "scillings") || this.#workingCurrencies[0];
      if (sc) sc.isDefault = true;
    }

    const defaultCurrency = this.#workingCurrencies.find(c => c.isDefault) || this.#workingCurrencies.find(c => c.abbr === "sc") || this.#workingCurrencies[0];
    const defRate = Number(defaultCurrency?.rate) || 100;

    const currencies = this.#workingCurrencies.map((c, i) => {
      const rate = Number(c.rate) || 1;
      const relMult = rate / defRate;
      const relDisplay = relMult < 1 ? Number(relMult.toFixed(4)).toString() : relMult.toLocaleString();
      return {
        ...c,
        index: i,
        rate,
        relMult,
        relDisplay,
        color: c.color || "#f1c40f",
        icon: c.icon || "fas fa-coins",
        isDefault: Boolean(c.isDefault),
        defaultAbbr: defaultCurrency.abbr,
      };
    });

    // Build Live Conversion Matrix (Ascending from lowest to highest)
    const conversionMatrix = {
      headers: currencies.map(c => ({ abbr: c.abbr, label: c.label })),
      rows: currencies.map(source => {
        const cells = currencies.map(target => {
          if (source.abbr === target.abbr) return "1";
          const ratio = (Number(source.rate) || 1) / (Number(target.rate) || 1);
          if (ratio >= 1) {
            return Number.isInteger(ratio) ? ratio.toLocaleString() : ratio.toFixed(2);
          } else {
            const inv = Math.round(1 / ratio);
            return `1/${inv.toLocaleString()}`;
          }
        });
        return {
          sourceAbbr: source.abbr,
          sourceLabel: source.label,
          cells,
        };
      }),
    };

    const presets = this.#workingPresets.map((p, i) => ({
      ...p,
      index: i,
      amount: Number(p.amount) || 1,
    }));

    context.currencies = currencies;
    context.presets = presets;
    context.conversionMatrix = conversionMatrix;
    context.availableIcons = AVAILABLE_ICONS;

    return context;
  }

  /**
   * Apply a curated theme (Coins, Gems, Dollars)
   */
  static async #onApplyTheme(event, target) {
    this.#syncFormState();
    const themeKey = target.dataset.theme || "coins";
    const themeList = ICON_THEMES[themeKey] || ICON_THEMES.coins;

    this.#workingCurrencies.forEach((c, idx) => {
      const themeItem = themeList[Math.min(idx, themeList.length - 1)];
      c.icon = themeItem.icon;
      if (!c.color || c.color === "#f1c40f" || c.color === "#ffffff") {
        c.color = themeItem.defaultColor;
      }
    });

    this.render();
    ui.notifications.info(`Applied "${themeKey.toUpperCase()}" icon theme.`);
  }

  /**
   * Add a new custom currency entry
   */
  static async #onAddCurrency(event, target) {
    this.#syncFormState();
    const highestRate = this.#workingCurrencies.reduce((max, c) => Math.max(max, Number(c.rate) || 1), 1);
    this.#workingCurrencies.push({
      key: `custom_${Date.now()}`,
      label: "Gold",
      abbr: "gp",
      rate: highestRate * 10,
      icon: "fas fa-coins",
      color: "#f1c40f",
    });
    this.render();
  }

  /**
   * Remove a currency entry
   */
  static async #onRemoveCurrency(event, target) {
    this.#syncFormState();
    const index = Number(target.dataset.index);
    if (!isNaN(index) && this.#workingCurrencies.length > 1) {
      const wasDefault = this.#workingCurrencies[index]?.isDefault;
      this.#workingCurrencies.splice(index, 1);
      if (wasDefault && this.#workingCurrencies.length > 0) {
        this.#workingCurrencies[0].isDefault = true;
      }
      this.render();
    } else {
      ui.notifications.warn("You must have at least one currency configured.");
    }
  }

  /**
   * Star / Set a currency as default
   */
  static async #onSetDefaultCurrency(event, target) {
    this.#syncFormState();
    const index = Number(target.dataset.index);
    if (!isNaN(index)) {
      this.#workingCurrencies.forEach((c, idx) => {
        c.isDefault = idx === index;
      });
      this.render();
      const curr = this.#workingCurrencies[index];
      ui.notifications.info(`Set ${curr.label} (${curr.abbr}) as the Default Base Currency.`);
    }
  }

  /**
   * Add a quick shopping preset
   */
  static async #onAddPreset(event, target) {
    this.#syncFormState();
    const firstCurr = this.#workingCurrencies[0]?.key || "scillings";
    this.#workingPresets.push({
      label: "New Preset Item",
      amount: 1,
      curr: firstCurr,
    });
    this.render();
  }

  /**
   * Remove a quick shopping preset
   */
  static async #onRemovePreset(event, target) {
    this.#syncFormState();
    const index = Number(target.dataset.index);
    if (!isNaN(index)) {
      this.#workingPresets.splice(index, 1);
      this.render();
    }
  }

  /**
   * Reset currency list and presets to MythCraft defaults
   */
  static async #onResetDefaults(event, target) {
    this.#workingCurrencies = foundry.utils.deepClone(DEFAULT_CURRENCY_CONFIG);
    this.#workingPresets = foundry.utils.deepClone(DEFAULT_CURRENCY_PRESETS);
    this.render();
    ui.notifications.info("Currencies and presets reset to MythCraft standards.");
  }

  /**
   * Synchronize DOM input values to working state
   */
  #syncFormState() {
    if (!this.element) return;

    // 1. Sync Currencies
    const rows = this.element.querySelectorAll(".currency-table-row");
    const updatedCurrs = [];
    rows.forEach((row, i) => {
      const key = row.dataset.key || `curr_${Date.now()}`;
      const label = row.querySelector('[name="curr_label"]')?.value?.trim() || "Currency";
      const abbr = row.querySelector('[name="curr_abbr"]')?.value?.trim() || "c";
      const rate = Math.max(1, Number(row.querySelector('[name="curr_rate"]')?.value) || 1);
      const icon = row.querySelector('[name="curr_icon"]')?.value?.trim() || "fas fa-coins";
      const color = row.querySelector('[name="curr_color"]')?.value || "#f1c40f";
      const isDefault = Boolean(this.#workingCurrencies[i]?.isDefault);

      updatedCurrs.push({
        key: key.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        label,
        abbr: abbr.toLowerCase(),
        rate,
        icon,
        color,
        isDefault,
      });
    });
    if (updatedCurrs.length) {
      this.#workingCurrencies = updatedCurrs;
    }

    // 2. Sync Presets
    const presetRows = this.element.querySelectorAll(".preset-table-row");
    const updatedPresets = [];
    for (const pRow of presetRows) {
      const label = pRow.querySelector('[name="preset_label"]')?.value?.trim() || "Item";
      const amount = Math.max(0.01, Number(pRow.querySelector('[name="preset_amount"]')?.value) || 1);
      const curr = pRow.querySelector('[name="preset_curr"]')?.value || this.#workingCurrencies[0]?.key || "scillings";

      updatedPresets.push({
        label,
        amount,
        curr,
      });
    }
    if (presetRows.length > 0 || updatedPresets.length > 0) {
      this.#workingPresets = updatedPresets;
    }
  }

  /**
   * Save currency configurations & presets to world settings
   */
  static async #onSubmitForm(event, form, formData) {
    this.#syncFormState();
    // Sort ascending by rate (Lowest to Highest)
    this.#workingCurrencies.sort((a, b) => a.rate - b.rate);
    await game.settings.set(MODULE_ID, "customCurrencyConfig", this.#workingCurrencies);
    await game.settings.set(MODULE_ID, "customCurrencyPresets", this.#workingPresets);
    ui.notifications.info("Saved custom currency, exchange, and preset configurations.");
  }
}
