/**
 * MythCraft Essence — Damage Modification Dialog
 * Stylized modal for editing an actor's Damage Modifications (Affinity, Resist, Immune, Vulnerable, DR, DT).
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const ALL_DAMAGE_TYPES = [
  { key: "physical", label: "Physical (Blunt & Sharp)", icon: "fas fa-shield" },
  { key: "elemental", label: "Elemental (Cold, Fire, etc.)", icon: "fas fa-fire-flame-curved" },
  { key: "energy", label: "Energy (Necrotic, Radiant, etc.)", icon: "fas fa-sun" },
  { key: "blunt", label: "Blunt", icon: "fas fa-hammer" },
  { key: "sharp", label: "Sharp", icon: "fas fa-cut" },
  { key: "cold", label: "Cold", icon: "fas fa-snowflake" },
  { key: "corrosive", label: "Corrosive", icon: "fas fa-flask" },
  { key: "fire", label: "Fire", icon: "fas fa-fire" },
  { key: "lightning", label: "Lightning", icon: "fas fa-bolt" },
  { key: "toxic", label: "Toxic", icon: "fas fa-biohazard" },
  { key: "necrotic", label: "Necrotic", icon: "fas fa-skull" },
  { key: "psychic", label: "Psychic", icon: "fas fa-brain" },
  { key: "radiant", label: "Radiant", icon: "fas fa-sun" },
  { key: "sonic", label: "Sonic", icon: "fas fa-volume-high" },
  { key: "all", label: "All Damage", icon: "fas fa-asterisk" },
];

const TYPE_MAP = Object.fromEntries(ALL_DAMAGE_TYPES.map(t => [t.key, t]));
import { calculateEffectiveResistances, getDonnedArmor } from "../features/equipment-automation.mjs";

export default class DamageModificationDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "damage-mod-dialog"],
    window: {
      title: "Damage Modifications & Defenses",
      icon: "fas fa-shield-virus",
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
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/damage-modification-dialog.hbs",
    },
  };

  /**
   * Constructor
   * @param {object} options
   * @param {Actor} options.document - Target Actor document
   */
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
    return `Damage Modifications — ${this.document?.name || "Character"}`;
  }

  /**
   * Parse a comma-separated modifier string like "Sharp 2, Fire, Cold 3"
   * @param {string} str
   * @returns {Array<{ type: string, label: string, icon: string, value: number }>}
   */
  static parseModifierString(str) {
    if (!str || typeof str !== "string") return [];
    const list = [];
    const parts = str.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^([a-zA-Z\s]+?)(?:[:\s\+\-]+(\d+))?$/);
      if (match) {
        const rawType = match[1].trim();
        const lower = rawType.toLowerCase();
        const val = match[2] !== undefined ? parseInt(match[2], 10) : 1;
        const cfg = TYPE_MAP[lower];
        list.push({
          type: lower,
          label: cfg?.label || (rawType.charAt(0).toUpperCase() + rawType.slice(1)),
          icon: cfg?.icon || "fas fa-shield-alt",
          value: val,
        });
      }
    }
    return list;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    context.actor = actor;
    context.system = actor.system;

    const affinitySet = new Set(actor.system.damage?.affinity || []);
    const immuneSet = new Set(actor.system.damage?.immune || []);

    const rawCategories = [
      {
        name: "Physical",
        types: [
          { key: "blunt", label: "Blunt", icon: "fas fa-hammer" },
          { key: "sharp", label: "Sharp", icon: "fas fa-cut" },
        ],
      },
      {
        name: "Elemental",
        types: [
          { key: "cold", label: "Cold", icon: "fas fa-snowflake" },
          { key: "corrosive", label: "Corrosive", icon: "fas fa-flask" },
          { key: "fire", label: "Fire", icon: "fas fa-fire" },
          { key: "lightning", label: "Lightning", icon: "fas fa-bolt" },
          { key: "toxic", label: "Toxic", icon: "fas fa-biohazard" },
        ],
      },
      {
        name: "Energy",
        types: [
          { key: "necrotic", label: "Necrotic", icon: "fas fa-skull" },
          { key: "psychic", label: "Psychic", icon: "fas fa-brain" },
          { key: "radiant", label: "Radiant", icon: "fas fa-sun" },
          { key: "sonic", label: "Sonic", icon: "fas fa-volume-high" },
        ],
      },
    ];

    context.damageCategories = rawCategories.map(cat => ({
      ...cat,
      types: cat.types.map(t => ({
        ...t,
        hasAffinity: affinitySet.has(t.key),
        hasImmunity: immuneSet.has(t.key),
      })),
    }));

    context.availableDamageTypes = ALL_DAMAGE_TYPES;

    // Armor and Effective Resistances
    const donnedArmor = getDonnedArmor(actor);
    const effectiveResistData = calculateEffectiveResistances(actor);
    context.donnedArmor = donnedArmor;
    context.armorResists = effectiveResistData.armorResists;
    context.resistList = effectiveResistData.list.map(r => ({
      ...r,
      icon: (ALL_DAMAGE_TYPES.find(d => d.key === r.type)?.icon) || "fas fa-shield-alt",
      isLocked: r.hasArmorBonus && (r.baseValue <= 0),
    }));
    context.vulnList = DamageModificationDialog.parseModifierString(actor.system.damage?.vulnerable || "");

    // Critical Hit & Fail with Luck Scaling
    const luck = Number(actor.system.attributes?.luck ?? 0);
    const luckBonus = luck >= 12 ? 2 : (luck >= 6 ? 1 : 0);
    const baseHit = Number(actor.system.critical?.hit ?? 20);
    const baseFail = Number(actor.system.critical?.fail ?? 1);
    const critBonus = Number(actor.flags?.["mythcraft-essence-sheet"]?.critBonus ?? 0);
    const effectiveHit = Math.max(16, baseHit - luckBonus - critBonus);
    const effectiveFail = Math.max(1, baseFail);

    context.critData = {
      luck,
      luckBonus,
      baseHit,
      baseFail,
      critBonus,
      effectiveHit,
      effectiveFail,
    };

    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // 1. Checkbox pill toggle handler for Affinities & Immunities
    const pills = this.element.querySelectorAll(".dmg-checkbox-pill");
    for (const pill of pills) {
      const checkbox = pill.querySelector('input[type="checkbox"]');
      if (checkbox) {
        pill.addEventListener("click", () => {
          checkbox.checked = !checkbox.checked;
          pill.classList.toggle("checked", checkbox.checked);
        });
      }
    }

    // 2. Dynamic Dropdown for Resist & Vulnerable
    const dropdowns = this.element.querySelectorAll(".dmg-type-dropdown");
    for (const select of dropdowns) {
      select.addEventListener("change", (e) => {
        const typeKey = select.value;
        if (!typeKey) return;
        const targetListKey = select.dataset.target; // "resist" or "vulnerable"
        const selector = (targetListKey === "vulnerable" || targetListKey === "vuln")
          ? ".vulnerable-entry-list, .vuln-entry-list"
          : `.${targetListKey}-entry-list`;
        const listEl = this.element.querySelector(selector);
        if (!listEl) return;

        // Check if already in list
        const existing = listEl.querySelector(`[data-type="${typeKey}"]`);
        if (existing) {
          const input = existing.querySelector('input[type="number"]');
          if (input) input.focus();
          select.value = "";
          return;
        }

        const info = TYPE_MAP[typeKey] || { label: typeKey.charAt(0).toUpperCase() + typeKey.slice(1), icon: "fas fa-shield-alt" };
        const row = document.createElement("div");
        row.className = "dmg-entry-row";
        row.dataset.type = typeKey;
        row.dataset.label = info.label;
        row.innerHTML = `
          <div class="dmg-entry-label">
            <i class="${info.icon}"></i>
            <span>${info.label}</span>
          </div>
          <div class="dmg-entry-val-wrap">
            <input type="number" class="dmg-entry-input" name="${targetListKey}_val_${typeKey}" value="1" min="1" max="99" />
            <span class="val-unit">pts</span>
          </div>
          <button type="button" class="dmg-entry-remove-btn" title="Remove ${info.label}">
            <i class="fas fa-trash"></i>
          </button>
        `;

        row.querySelector(".dmg-entry-remove-btn")?.addEventListener("click", () => row.remove());
        listEl.appendChild(row);
        select.value = "";
      });
    }

    // 3. Existing Remove buttons
    const removeBtns = this.element.querySelectorAll(".dmg-entry-remove-btn");
    for (const btn of removeBtns) {
      btn.addEventListener("click", (e) => {
        const row = btn.closest(".dmg-entry-row");
        if (row) row.remove();
      });
    }
  }

  /**
   * Form submission handler
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmitForm(event, form, formData) {
    const actor = this.document;
    if (!actor) return;

    const rawData = formData.object;
    const affinities = [];
    const immunities = [];

    for (const [k, v] of Object.entries(rawData)) {
      if (k.startsWith("affinity_") && v) {
        affinities.push(v);
      } else if (k.startsWith("immune_") && v) {
        immunities.push(v);
      }
    }

    // Collect configured Resistances
    const resistRows = this.element.querySelectorAll(".resist-entry-list .dmg-entry-row");
    const resistParts = [];
    for (const row of resistRows) {
      const typeKey = row.dataset.type;
      const label = row.dataset.label || TYPE_MAP[typeKey]?.label || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1));
      const valInput = row.querySelector('.dmg-entry-input');
      const val = Number(valInput?.value) || 1;
      const armorVal = Number(row.dataset.armorVal) || 0;
      const baseVal = Math.max(0, val - armorVal);
      if (baseVal > 0) {
        resistParts.push(`${label} ${baseVal}`);
      }
    }
    const resistString = resistParts.join(", ");

    // Collect configured Vulnerabilities
    const vulnRows = this.element.querySelectorAll(".vulnerable-entry-list .dmg-entry-row, .vuln-entry-list .dmg-entry-row");
    const vulnParts = [];
    for (const row of vulnRows) {
      const typeKey = row.dataset.type;
      const label = row.dataset.label || TYPE_MAP[typeKey]?.label || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1));
      const valInput = row.querySelector('.dmg-entry-input');
      const val = Number(valInput?.value) || 1;
      vulnParts.push(`${label} ${val}`);
    }
    const vulnString = vulnParts.join(", ");

    const updates = {
      "system.damage.affinity": affinities,
      "system.damage.immune": immunities,
      "system.damage.resist": resistString,
      "system.damage.vulnerable": vulnString,
      "system.damage.reduction.value": Number(rawData["system.damage.reduction.value"]) || 0,
      "system.damage.reduction.bypasses": rawData["system.damage.reduction.bypasses"] || "",
      "system.damage.threshold": Number(rawData["system.damage.threshold"]) || 0,
      "system.critical.hit": Math.min(20, Math.max(10, Number(rawData["critBaseHit"]) || 20)),
      "system.critical.fail": Math.min(20, Math.max(1, Number(rawData["critBaseFail"]) || 1)),
      "flags.mythcraft-essence-sheet.critBonus": Math.max(0, Number(rawData["critBonus"]) || 0),
    };

    await actor.update(updates);
    ui.notifications.info(`Updated Damage & Critical Modifications for ${actor.name}`);
  }
}
