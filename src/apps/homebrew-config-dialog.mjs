/**
 * MythCraft Essence — Homebrew Rules & Custom Attributes Dialog
 *
 * Configures alternate MythCraft rules (Sanity attribute, Fear Threshold)
 * and enables GMs to define custom Physical, Mental, and Metaphysical attributes.
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const MODULE_ID = "mythcraft-essence-sheet";
import { syncHomebrewAttributesToSystem } from "../features/homebrew-attributes.mjs";

export default class HomebrewConfigDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "homebrew-dialog"],
    window: {
      title: "Homebrew Rules & Custom Attributes",
      icon: "fas fa-flask-vial",
      resizable: true,
    },
    position: {
      width: 720,
      height: "auto",
    },
    form: {
      handler: this.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      addCustomAttr: this.#onAddCustomAttr,
      deleteCustomAttr: this.#onDeleteCustomAttr,
      addCustomSkill: this.#onAddCustomSkill,
      deleteCustomSkill: this.#onDeleteCustomSkill,
      toggleSanity: this.#onToggleSanity,
      toggleFear: this.#onToggleFear,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/homebrew-config-dialog.hbs",
    },
  };  constructor(options = {}) {
    super(options);
    this._enableSanity = game.settings.get(MODULE_ID, "enableSanity") ?? false;
    this._enableFear = game.settings.get(MODULE_ID, "enableFear") ?? false;
    this._sanityOnNpc = game.settings.get(MODULE_ID, "sanityOnNpc") ?? false;
    this._customAttributes = foundry.utils.deepClone(game.settings.get(MODULE_ID, "customAttributes") ?? []);
    this._customSkills = foundry.utils.deepClone(game.settings.get(MODULE_ID, "customSkills") ?? []);
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Context Preparation
   * ─────────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const categories = [
      { key: "physical", label: "Physical Attributes" },
      { key: "mental", label: "Mental Attributes" },
      { key: "metaphysical", label: "Metaphysical Attributes" },
    ];

    // Standard attribute options for skill associations
    const allAttrOptions = [
      { key: "str", label: "Strength (STR)" },
      { key: "dex", label: "Dexterity (DEX)" },
      { key: "end", label: "Endurance (END)" },
      { key: "awr", label: "Awareness (AWR)" },
      { key: "int", label: "Intellect (INT)" },
      { key: "cha", label: "Charisma (CHA)" },
      { key: "luck", label: "Luck (LUCK)" },
      { key: "cor", label: "Coordination (COR)" },
    ];

    if (this._enableSanity) {
      allAttrOptions.push({ key: "san", label: "Sanity (SAN)" });
    }

    for (const ca of this._customAttributes) {
      if (ca.key && ca.name) {
        allAttrOptions.push({ key: ca.key, label: `${ca.name} (${ca.abbr || ca.key.toUpperCase()})` });
      }
    }

    const customAttrsWithMeta = this._customAttributes.map((attr, idx) => ({
      ...attr,
      index: idx,
      includeInNpc: Boolean(attr.includeInNpc),
      categoryOptions: categories.map(cat => ({
        ...cat,
        selected: attr.category === cat.key,
      })),
    }));

    const customSkillsWithMeta = this._customSkills.map((sk, idx) => ({
      ...sk,
      index: idx,
      attrOptions: allAttrOptions.map(opt => ({
        ...opt,
        selected: sk.attribute === opt.key,
      })),
    }));

    return {
      enableSanity: this._enableSanity,
      enableFear: this._enableFear,
      sanityOnNpc: this._sanityOnNpc,
      customAttributes: customAttrsWithMeta,
      hasCustomAttrs: customAttrsWithMeta.length > 0,
      customSkills: customSkillsWithMeta,
      hasCustomSkills: customSkillsWithMeta.length > 0,
      categories,
      allAttrOptions,
    };
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ─────────────────────────────────────────────────────────────────────────── */

  static async #onToggleSanity(event, target) {
    this._enableSanity = target.checked;
    if (!this._enableSanity) {
      this._enableFear = false;
      this._sanityOnNpc = false;
    }
    this.render();
  }

  static async #onToggleFear(event, target) {
    this._enableFear = target.checked;
    this.render();
  }

  static async #onAddCustomAttr(event, target) {
    event.preventDefault();
    this._customAttributes.push({
      key: `custom_${Date.now()}`,
      name: "New Attribute",
      abbr: "ATTR",
      category: "metaphysical",
      footnote: "Custom homebrew attribute.",
      includeInNpc: false,
    });
    this.render();
  }

  static async #onDeleteCustomAttr(event, target) {
    event.preventDefault();
    const idx = parseInt(target.dataset.index, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this._customAttributes.length) {
      this._customAttributes.splice(idx, 1);
      this.render();
    }
  }

  static async #onAddCustomSkill(event, target) {
    event.preventDefault();
    const defaultAttr = this._enableSanity ? "san" : (this._customAttributes[0]?.key || "int");
    this._customSkills.push({
      key: `skill_${Date.now()}`,
      name: "New Skill",
      attribute: defaultAttr,
      specialized: false,
    });
    this.render();
  }

  static async #onDeleteCustomSkill(event, target) {
    event.preventDefault();
    const idx = parseInt(target.dataset.index, 10);
    if (!isNaN(idx) && idx >= 0 && idx < this._customSkills.length) {
      this._customSkills.splice(idx, 1);
      this.render();
    }
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Form Submission
   * ─────────────────────────────────────────────────────────────────────────── */

  static async #onSubmitForm(event, form, formData) {
    const rawData = foundry.utils.expandObject(formData.object);

    const enableSanity = !!rawData.enableSanity;
    const enableFear = enableSanity && !!rawData.enableFear;
    const sanityOnNpc = enableSanity && !!rawData.sanityOnNpc;

    // Process custom attributes list
    const attrEntries = Object.entries(rawData.attrs || {});
    const customAttributes = attrEntries.map(([_, a]) => ({
      key: (a.key || "attr").toLowerCase().replace(/[^a-z0-9_]/g, ""),
      name: (a.name || "Attribute").trim(),
      abbr: (a.abbr || "ATTR").toUpperCase().trim().slice(0, 4),
      category: a.category || "metaphysical",
      footnote: (a.footnote || "").trim(),
      includeInNpc: !!a.includeInNpc,
    })).filter(a => a.key && a.name);

    // Process custom skills list
    const skillEntries = Object.entries(rawData.skills || {});
    const customSkills = skillEntries.map(([_, s]) => ({
      key: (s.key || "skill").toLowerCase().replace(/[^a-z0-9_]/g, ""),
      name: (s.name || "Skill").trim(),
      attribute: s.attribute || "str",
      specialized: !!s.specialized,
    })).filter(s => s.key && s.name);

    await game.settings.set(MODULE_ID, "enableSanity", enableSanity);
    await game.settings.set(MODULE_ID, "enableFear", enableFear);
    await game.settings.set(MODULE_ID, "sanityOnNpc", sanityOnNpc);
    await game.settings.set(MODULE_ID, "customAttributes", customAttributes);
    await game.settings.set(MODULE_ID, "customSkills", customSkills);

    // Sync to DataModels and CONFIG tables immediately
    syncHomebrewAttributesToSystem();

    ui.notifications.info("Homebrew settings, custom attributes, and custom skills saved successfully!");

    // Refresh active sheets
    for (const app of Object.values(ui.windows)) {
      if (app.actor) app.render();
    }
  }
}
