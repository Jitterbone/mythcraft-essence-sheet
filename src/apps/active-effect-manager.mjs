/**
 * mythcraft-essence-sheet | src/apps/active-effect-manager.mjs
 *
 * Guided Active Effect Manager (ApplicationV2) for MythCraft Actors & Items.
 * Walks users through creating, editing, and managing native Foundry VTT ActiveEffects
 * with a region-based visual picker, smart value builders, item/talent attachment,
 * and one-click presets.
 */

import {
  MYTHCRAFT_EFFECT_CATEGORIES,
  MYTHCRAFT_EFFECT_PRESETS,
  MYTHCRAFT_DAMAGE_TYPES,
  CURATED_EFFECT_ICONS,
  EFFECT_MODES,
  getCatalogTargetsForDocument,
  findCatalogEntryByKey,
  summarizeEffectChange,
  summarizeActiveEffect,
  getAllActorEffectsWithMeta,
  isItemEffectRequirementMet,
  syncActorTalentActiveEffects,
} from "../features/active-effect-engine.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ActiveEffectManager extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} options
   * @param {Actor|Item} options.document - The Actor or Item that owns (or hosts) the effects
   * @param {ActiveEffect|null} [options.effect=null] - Optional specific effect to edit immediately
   * @param {string|null} [options.initialCategory=null] - Optional initial category tab
   */
  constructor(options = {}) {
    super(options);
    this.document = options.document || options.actor || options.item;
    this.actor = this.document?.documentName === "Actor"
      ? this.document
      : (this.document?.parent?.documentName === "Actor" ? this.document.parent : null);

    this._selectedCategory = options.initialCategory || "vitality";
    this._presetCategoryFilter = "all";
    this._searchQuery = "";
    this._sidebarTab = "effects";
    this._step2Collapsed = false;

    // Load initial effect into draft state (or start a fresh guided draft)
    this._editingEffect = options.effect || null;
    this._draft = this._createDraftFromEffect(this._editingEffect);
  }

  static DEFAULT_OPTIONS = {
    id: "mythcraft-active-effect-manager-{id}",
    classes: ["mythcraft-essence", "active-effect-manager-window"],
    tag: "div",
    window: {
      title: "MythCraft — Guided Active Effect Manager",
      icon: "fas fa-wand-magic-sparkles",
      resizable: true,
    },
    position: {
      width: 1120,
      height: 780,
    },
    actions: {
      selectEffect: ActiveEffectManager.#onSelectEffect,
      newGuidedEffect: ActiveEffectManager.#onNewGuidedEffect,
      applyPreset: ActiveEffectManager.#onApplyPreset,
      selectCategory: ActiveEffectManager.#onSelectCategory,
      selectPresetFilter: ActiveEffectManager.#onSelectPresetFilter,
      selectSidebarTab: ActiveEffectManager.#onSelectSidebarTab,
      toggleStep2: ActiveEffectManager.#onToggleStep2,
      syncTalentEffects: ActiveEffectManager.#onSyncTalentEffects,
      addTargetRule: ActiveEffectManager.#onAddTargetRule,
      addBlankRule: ActiveEffectManager.#onAddBlankRule,
      removeRule: ActiveEffectManager.#onRemoveRule,
      quickValueChip: ActiveEffectManager.#onQuickValueChip,
      pickIcon: ActiveEffectManager.#onPickIcon,
      selectCuratedIcon: ActiveEffectManager.#onSelectCuratedIcon,
      saveEffect: ActiveEffectManager.#onSaveEffect,
      deleteEffect: ActiveEffectManager.#onDeleteEffect,
      toggleSidebarEffect: ActiveEffectManager.#onToggleSidebarEffect,
      openRawFoundryConfig: ActiveEffectManager.#onOpenRawFoundryConfig,
    },
  };

  static PARTS = {
    main: {
      template: "modules/mythcraft-essence-sheet/templates/apps/active-effect-manager.hbs",
      scrollable: [".aem-sidebar-list", ".aem-builder-scroll"],
    },
  };

  get title() {
    const docName = this.document?.name || "Sheet";
    return `MythCraft — Active Effect Manager (${docName})`;
  }

  /**
   * Builds a clean editable draft object from an existing ActiveEffect or defaults.
   * @param {ActiveEffect|null} effect
   * @returns {object}
   */
  _createDraftFromEffect(effect = null) {
    const isItemDoc = this.document?.documentName === "Item";
    const parentDoc = effect?.parent || this.document;
    const isEffectOnItem = parentDoc?.documentName === "Item";

    const hostDocId = isEffectOnItem ? `item:${parentDoc.id}` : "actor";
    const reqFlag =
      effect?.flags?.["mythcraft-essence-sheet"]?.itemRequirement ||
      effect?.flags?.["mythcraft-essence-sheet"]?.activationRequirement ||
      (isEffectOnItem
        ? (["weapon", "armor"].includes(parentDoc.type) ? "equipped" : "always")
        : "always");

    let activationMode = "passive";
    if (effect) {
      if (effect.disabled && !isEffectOnItem) {
        activationMode = "inactive";
      } else if (Number(effect.duration?.rounds) > 0 || Number(effect.duration?.turns) > 0 || Number(effect.duration?.seconds) > 0) {
        activationMode = "temporary";
      }
    }

    const rawChanges = Array.isArray(effect?.changes) && effect.changes.length > 0
      ? effect.changes.map((c) => ({
          key: String(c.key || ""),
          mode: Number(c.mode ?? EFFECT_MODES.ADD),
          value: String(c.value ?? ""),
        }))
      : [
          {
            key: "system.hp.max",
            mode: EFFECT_MODES.ADD,
            value: "5",
          },
        ];

    return {
      effectId: effect?.id || null,
      originalHostId: hostDocId,
      hostId: isItemDoc ? `item:${this.document.id}` : hostDocId,
      name: effect?.name || "New MythCraft Effect",
      img: effect?.img || "icons/magic/symbols/runes-star-pentagon-blue.webp",
      description: String(effect?.description || effect?.flags?.["mythcraft-essence-sheet"]?.description || ""),
      activationMode,
      durationRounds: Number(effect?.duration?.rounds || 10),
      itemRequirement: reqFlag,
      changes: rawChanges,
    };
  }

  /**
   * Resolves an effect by ID and optional parentItemId on the current document/actor.
   * @param {string} effectId
   * @param {string|null} [parentItemId=null]
   * @returns {ActiveEffect|null}
   */
  _resolveEffect(effectId, parentItemId = null) {
    if (!effectId) return null;
    if (parentItemId && this.actor) {
      const item = this.actor.items?.get(parentItemId);
      return item?.effects?.get(effectId) || null;
    }
    if (this.document?.effects?.get(effectId)) {
      return this.document.effects.get(effectId);
    }
    if (this.actor) {
      for (const item of this.actor.items || []) {
        const found = item.effects?.get(effectId);
        if (found) return found;
      }
    }
    return null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const catalogDoc = this.actor || this.document;
    const allTargets = getCatalogTargetsForDocument(catalogDoc);

    // Group targets by category for dropdowns and visual cards
    const categories = MYTHCRAFT_EFFECT_CATEGORIES.map((cat) => {
      const catTargets = allTargets.filter((t) => {
        if (cat.id === "all" || t.category === cat.id) {
          if (this._searchQuery) {
            const q = this._searchQuery.toLowerCase();
            return (
              t.label.toLowerCase().includes(q) ||
              t.hint.toLowerCase().includes(q) ||
              t.key.toLowerCase().includes(q)
            );
          }
          return true;
        }
        return false;
      });
      return {
        ...cat,
        active: this._selectedCategory === cat.id,
        count: allTargets.filter((t) => t.category === cat.id).length,
        targets: catTargets,
      };
    });

    const activeCategoryObj = categories.find((c) => c.id === this._selectedCategory) || categories[0];

    // Collect existing effects for sidebar
    let sidebarEffects = [];
    if (this.actor) {
      sidebarEffects = getAllActorEffectsWithMeta(this.actor).map((entry) => ({
        ...entry,
        isSelected: this._editingEffect?.id === entry.id &&
          ((entry.isItemEffect && this._editingEffect?.parent?.id === entry.parentItemId) ||
           (!entry.isItemEffect && this._editingEffect?.parent?.id === this.actor.id)),
      }));
    } else if (this.document?.documentName === "Item") {
      for (const e of this.document.effects || []) {
        const summaries = summarizeActiveEffect(e, this.document);
        sidebarEffects.push({
          effect: e,
          id: e.id,
          name: e.name,
          img: e.img || "icons/svg/aura.svg",
          disabled: Boolean(e.disabled),
          isTemporary: Boolean(e.isTemporary),
          isItemEffect: true,
          parentItem: this.document,
          parentItemId: this.document.id,
          sourceLabel: this.document.name,
          sourceTypeLabel: this.document.type,
          summaries,
          summaryText: summaries.map((s) => s.text).join(" • ") || "No automated modifiers",
          isSelected: this._editingEffect?.id === e.id,
        });
      }
    }

    // Build host attachment options (Character Sheet + owned Items/Talents/Weapons/Armor/Spells)
    const isItemSheetMode = this.document?.documentName === "Item" && !this.actor;
    const hostOptions = [];
    if (this.actor) {
      hostOptions.push({
        value: "actor",
        label: `Character Sheet: ${this.actor.name} (Direct Effect)`,
        group: "Character Sheet",
        selected: this._draft.hostId === "actor",
      });
      const typeLabels = {
        weapon: "Weapons",
        armor: "Armor & Shields",
        talent: "Talents",
        feature: "Class & Lineage Features",
        spell: "Spells",
        gear: "Equipment & Gear",
      };
      const sortedItems = Array.from(this.actor.items || []).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      for (const item of sortedItems) {
        const val = `item:${item.id}`;
        hostOptions.push({
          value: val,
          label: `${item.name} (${item.type})`,
          group: typeLabels[item.type] || "Other Items",
          selected: this._draft.hostId === val,
        });
      }
    } else if (this.document) {
      const val = `item:${this.document.id}`;
      hostOptions.push({
        value: val,
        label: `${this.document.name} (${this.document.type})`,
        group: "Item",
        selected: true,
      });
    }

    const isDraftAttachedToItem = String(this._draft.hostId || "").startsWith("item:");
    const damageTypeLabels = MYTHCRAFT_DAMAGE_TYPES.map((dt) => (typeof dt === "string" ? dt : dt.label));

    // Enrich draft changes for Step 3 UI
    const enrichedChanges = (this._draft.changes || []).map((chg, index) => {
      const catEntry = findCatalogEntryByKey(chg.key, catalogDoc);
      const isCustomKey = !catEntry && Boolean(chg.key);
      const valueType = catEntry?.valueType || "number";
      const isResistBuilder = valueType === "resist" || valueType === "damageTypeAmount";
      const isDamageTypePicker = valueType === "damageType";

      // Parse resist string like "Fire 3" for the smart builder
      let resistDamageType = "Fire";
      let resistAmount = "2";
      if (isResistBuilder && chg.value) {
        const m = String(chg.value).trim().match(/^([a-zA-Z\s]+?)\s*([0-9]+)?$/);
        if (m) {
          const matchedType = damageTypeLabels.find((dt) => dt.toLowerCase() === m[1].trim().toLowerCase());
          resistDamageType = matchedType || m[1].trim();
          resistAmount = m[2] || "2";
        }
      }

      // Quick value chips based on valueType
      let quickChips = [];
      if (valueType === "dice" || valueType === "diceOrNumber" || valueType === "formula") {
        quickChips = ["+1", "+2", "+3", "1d4", "1d6", "1d8", "1d10", "@level"];
      } else if (valueType === "number") {
        if (chg.key.toLowerCase().includes("reduce")) {
          quickChips = ["1", "2", "3"];
        } else if (chg.key.includes("movement")) {
          quickChips = ["5", "10", "15", "20", "-5", "-10"];
        } else {
          quickChips = ["1", "2", "3", "5", "10", "-1", "-2", "@level"];
        }
      }

      const summary = summarizeEffectChange(chg, catalogDoc);

      return {
        index,
        key: chg.key,
        mode: Number(chg.mode ?? EFFECT_MODES.ADD),
        value: chg.value,
        catEntry,
        isCustomKey,
        valueType,
        isResistBuilder,
        isDamageTypePicker,
        resistDamageType,
        resistAmount,
        quickChips,
        summary,
        placeholder: catEntry?.placeholder || "e.g. 2",
        hint: catEntry?.hint || "Modifies this sheet field.",
        modeOptions: [
          { value: EFFECT_MODES.ADD, label: "Add / Subtract (+ / −)", selected: Number(chg.mode) === EFFECT_MODES.ADD },
          { value: EFFECT_MODES.OVERRIDE, label: "Set Exact Value (=)", selected: Number(chg.mode) === EFFECT_MODES.OVERRIDE },
          { value: EFFECT_MODES.MULTIPLY, label: "Multiply (×)", selected: Number(chg.mode) === EFFECT_MODES.MULTIPLY },
          { value: EFFECT_MODES.UPGRADE, label: "Minimum Floor (≥)", selected: Number(chg.mode) === EFFECT_MODES.UPGRADE },
          { value: EFFECT_MODES.DOWNGRADE, label: "Maximum Cap (≤)", selected: Number(chg.mode) === EFFECT_MODES.DOWNGRADE },
        ],
      };
    });

    // Presets filtered by preset category
    const presets = MYTHCRAFT_EFFECT_PRESETS.filter(
      (p) => this._presetCategoryFilter === "all" || p.category === this._presetCategoryFilter
    );

    return {
      ...context,
      isEditingExisting: Boolean(this._editingEffect),
      isItemSheetMode,
      isDraftAttachedToItem,
      hasActor: Boolean(this.actor),
      sidebarTab: this._sidebarTab || "effects",
      step2Collapsed: Boolean(this._step2Collapsed),
      draft: this._draft,
      hostOptions,
      sidebarEffects,
      categories,
      activeCategory: activeCategoryObj,
      allTargets,
      enrichedChanges,
      presets,
      totalPresetsCount: MYTHCRAFT_EFFECT_PRESETS.length,
      presetCategoryFilter: this._presetCategoryFilter,
      damageTypes: damageTypeLabels,
      curatedIcons: CURATED_EFFECT_ICONS.map((ic) => ({
        ...ic,
        selected: ic.src === this._draft.img,
      })),
      searchQuery: this._searchQuery,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    // Bind live inputs to update this._draft without losing focus
    const nameInput = root.querySelector('[name="draft.name"]');
    if (nameInput) {
      nameInput.addEventListener("input", (ev) => {
        this._draft.name = ev.target.value;
      });
    }

    const imgInput = root.querySelector('[name="draft.img"]');
    if (imgInput) {
      imgInput.addEventListener("change", (ev) => {
        this._draft.img = ev.target.value;
        this.render();
      });
    }

    const descInput = root.querySelector('[name="draft.description"]');
    if (descInput) {
      descInput.addEventListener("input", (ev) => {
        this._draft.description = ev.target.value;
      });
    }

    const hostSelect = root.querySelector('[name="draft.hostId"]');
    if (hostSelect) {
      hostSelect.addEventListener("change", (ev) => {
        this._draft.hostId = ev.target.value;
        if (String(this._draft.hostId).startsWith("item:") && !this._draft.itemRequirement) {
          this._draft.itemRequirement = "equipped";
        }
        this.render();
      });
    }

    const activationSelect = root.querySelector('[name="draft.activationMode"]');
    if (activationSelect) {
      activationSelect.addEventListener("change", (ev) => {
        this._draft.activationMode = ev.target.value;
        this.render();
      });
    }

    const roundsInput = root.querySelector('[name="draft.durationRounds"]');
    if (roundsInput) {
      roundsInput.addEventListener("input", (ev) => {
        this._draft.durationRounds = Math.max(1, parseInt(ev.target.value, 10) || 1);
      });
    }

    const itemReqSelect = root.querySelector('[name="draft.itemRequirement"]');
    if (itemReqSelect) {
      itemReqSelect.addEventListener("change", (ev) => {
        this._draft.itemRequirement = ev.target.value;
        this.render();
      });
    }

    // Search input for Step 2 target catalog
    const searchInput = root.querySelector(".aem-target-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (ev) => {
        this._searchQuery = ev.target.value || "";
        this.render();
      });
    }

    // Rule row change listeners
    root.querySelectorAll(".aem-rule-row").forEach((row) => {
      const idx = Number(row.dataset.index);
      if (isNaN(idx) || !this._draft.changes[idx]) return;

      const keySelect = row.querySelector(".aem-rule-key-select");
      if (keySelect) {
        keySelect.addEventListener("change", (ev) => {
          const newKey = ev.target.value;
          if (newKey === "__custom__") {
            this._draft.changes[idx].key = "system.bonuses.";
          } else {
            this._draft.changes[idx].key = newKey;
            const entry = findCatalogEntryByKey(newKey, this.actor || this.document);
            if (entry) {
              this._draft.changes[idx].mode = entry.defaultMode;
              if (!this._draft.changes[idx].value) {
                this._draft.changes[idx].value = entry.defaultValue;
              }
            }
          }
          this.render();
        });
      }

      const customKeyInput = row.querySelector(".aem-rule-custom-key-input");
      if (customKeyInput) {
        customKeyInput.addEventListener("change", (ev) => {
          this._draft.changes[idx].key = ev.target.value.trim();
          this.render();
        });
      }

      const modeSelect = row.querySelector(".aem-rule-mode-select");
      if (modeSelect) {
        modeSelect.addEventListener("change", (ev) => {
          this._draft.changes[idx].mode = Number(ev.target.value);
          this.render();
        });
      }

      const valInput = row.querySelector(".aem-rule-value-input");
      if (valInput) {
        valInput.addEventListener("input", (ev) => {
          this._draft.changes[idx].value = ev.target.value;
          const previewEl = row.querySelector(".aem-rule-live-summary");
          if (previewEl) {
            const sum = summarizeEffectChange(this._draft.changes[idx], this.actor || this.document);
            previewEl.textContent = sum.text;
          }
        });
        valInput.addEventListener("change", () => this.render());
      }

      // Smart Resistance Builder (Damage Type + Amount)
      const resistTypeSelect = row.querySelector(".aem-resist-type-select");
      const resistAmtInput = row.querySelector(".aem-resist-amount-input");
      if (resistTypeSelect || resistAmtInput) {
        const updateResistValue = () => {
          const dType = resistTypeSelect ? resistTypeSelect.value : "Fire";
          const amt = resistAmtInput ? Math.max(1, parseInt(resistAmtInput.value, 10) || 1) : 2;
          this._draft.changes[idx].value = `${dType} ${amt}`;
          this.render();
        };
        if (resistTypeSelect) resistTypeSelect.addEventListener("change", updateResistValue);
        if (resistAmtInput) resistAmtInput.addEventListener("change", updateResistValue);
      }

      // Smart Immunity / Affinity Damage Type selector
      const dmgTypeSelect = row.querySelector(".aem-dmgtype-select");
      if (dmgTypeSelect) {
        dmgTypeSelect.addEventListener("change", (ev) => {
          this._draft.changes[idx].value = ev.target.value;
          this.render();
        });
      }
    });
  }

  // ─── Action Handlers ──────────────────────────────────────────────────────

  static #onSelectEffect(event, target) {
    event.preventDefault();
    const effectId = target.dataset.effectId;
    const parentItemId = target.dataset.parentItemId || null;
    const found = this._resolveEffect(effectId, parentItemId);
    if (found) {
      this._editingEffect = found;
      this._draft = this._createDraftFromEffect(found);
      this.render();
    }
  }

  static #onNewGuidedEffect(event) {
    event.preventDefault();
    this._editingEffect = null;
    this._draft = this._createDraftFromEffect(null);
    this.render();
  }

  static #onApplyPreset(event, target) {
    event.preventDefault();
    const presetId = target.dataset.presetId;
    const preset = MYTHCRAFT_EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    this._editingEffect = null;
    this._draft = {
      effectId: null,
      originalHostId: this.document?.documentName === "Item" ? `item:${this.document.id}` : "actor",
      hostId: this.document?.documentName === "Item" ? `item:${this.document.id}` : "actor",
      name: preset.name,
      img: preset.img || preset.icon || "icons/svg/aura.svg",
      description: preset.description,
      activationMode: preset.isTemporary ? "temporary" : "passive",
      durationRounds: preset.rounds || 10,
      itemRequirement: "equipped",
      changes: preset.changes.map((c) => ({
        key: c.key,
        mode: Number(c.mode ?? EFFECT_MODES.ADD),
        value: String(c.value ?? ""),
      })),
    };
    this._selectedCategory = preset.category || "vitality";
    ui.notifications.info(`Loaded preset "${preset.name}" into the Guided Builder. Click "Save & Apply Effect" to activate it!`);
    this.render();
  }

  static #onSelectCategory(event, target) {
    event.preventDefault();
    const catId = target.dataset.category;
    if (catId) {
      this._selectedCategory = catId;
      this._step2Collapsed = false;
      this.render();
    }
  }

  static #onSelectPresetFilter(event, target) {
    event.preventDefault();
    const catId = target.dataset.category || "all";
    this._presetCategoryFilter = catId;
    this.render();
  }

  static #onSelectSidebarTab(event, target) {
    event.preventDefault();
    const tab = target.dataset.tab || "effects";
    this._sidebarTab = tab;
    this.render();
  }

  static #onToggleStep2(event) {
    event.preventDefault();
    this._step2Collapsed = !this._step2Collapsed;
    this.render();
  }

  static async #onSyncTalentEffects(event) {
    event.preventDefault();
    if (!this.actor) return;
    await syncActorTalentActiveEffects(this.actor, { notify: true, force: true });
    this._sidebarTab = "effects";
    this.render();
    if (this.actor?.sheet?.rendered) this.actor.sheet.render();
  }

  static #onAddTargetRule(event, target) {
    event.preventDefault();
    const key = target.dataset.key;
    if (!key) return;
    const entry = findCatalogEntryByKey(key, this.actor || this.document);
    this._draft.changes.push({
      key,
      mode: entry?.defaultMode ?? EFFECT_MODES.ADD,
      value: entry?.defaultValue ?? "1",
    });
    if (this._draft.name === "New MythCraft Effect" && entry) {
      this._draft.name = `${entry.label} Effect`;
      if (entry.icon && CURATED_EFFECT_ICONS.length) {
        this._draft.img = CURATED_EFFECT_ICONS[0].src;
      }
    }
    this.render();
  }

  static #onAddBlankRule(event) {
    event.preventDefault();
    this._draft.changes.push({
      key: "system.bonuses.ar",
      mode: EFFECT_MODES.ADD,
      value: "1",
    });
    this.render();
  }

  static #onRemoveRule(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    if (!isNaN(idx) && idx >= 0 && idx < this._draft.changes.length) {
      this._draft.changes.splice(idx, 1);
      this.render();
    }
  }

  static #onQuickValueChip(event, target) {
    event.preventDefault();
    const idx = Number(target.dataset.index);
    const chipVal = target.dataset.value;
    if (!isNaN(idx) && this._draft.changes[idx] && chipVal !== undefined) {
      // Strip leading "+" for numeric fields unless it's a dice expression
      const cleaned = /^\+\d+$/.test(chipVal) ? chipVal.slice(1) : chipVal;
      this._draft.changes[idx].value = cleaned;
      this.render();
    }
  }

  static async #onPickIcon(event) {
    event.preventDefault();
    const FP = foundry.applications?.apps?.FilePicker?.implementation || globalThis.FilePicker;
    if (!FP) return;
    const fp = new FP({
      type: "image",
      current: this._draft.img || "icons/",
      callback: (path) => {
        this._draft.img = path;
        this.render();
      },
    });
    return fp.browse();
  }

  static #onSelectCuratedIcon(event, target) {
    event.preventDefault();
    const src = target.dataset.src;
    if (src) {
      this._draft.img = src;
      this.render();
    }
  }

  static async #onSaveEffect(event) {
    event.preventDefault();
    const cleanChanges = (this._draft.changes || [])
      .filter((c) => c.key && String(c.key).trim().length > 0)
      .map((c) => ({
        key: String(c.key).trim(),
        mode: Number(c.mode ?? EFFECT_MODES.ADD),
        value: String(c.value ?? "").trim(),
      }));

    if (cleanChanges.length === 0) {
      ui.notifications.warn("Please add at least one automated stat rule before saving.");
      return;
    }

    // Resolve target host document (Actor or owned Item)
    let targetHostDoc = this.document;
    const isAttachingToItem = String(this._draft.hostId || "").startsWith("item:");
    if (isAttachingToItem && this.actor) {
      const itemId = this._draft.hostId.slice(5);
      targetHostDoc = this.actor.items.get(itemId) || this.document;
    } else if (this.actor) {
      targetHostDoc = this.actor;
    }

    const isItemHost = targetHostDoc?.documentName === "Item";
    const itemReq = isItemHost ? (this._draft.itemRequirement || "equipped") : "always";

    // Determine disabled state: explicitly inactive mode sets disabled=true,
    // otherwise dynamic requirement checks (e.g. equipped) evaluate on the fly.
    const disabled = this._draft.activationMode === "inactive";

    const duration = {};
    if (!isItemHost && this._draft.activationMode === "temporary") {
      duration.rounds = Math.max(1, Number(this._draft.durationRounds) || 10);
    } else {
      duration.rounds = null;
      duration.seconds = null;
      duration.turns = null;
    }

    const effectData = {
      name: (this._draft.name || "MythCraft Effect").trim(),
      img: this._draft.img || "icons/svg/aura.svg",
      description: this._draft.description || "",
      transfer: isItemHost, // Item effects transfer to the owning Actor when active
      disabled,
      duration,
      changes: cleanChanges,
      flags: {
        "mythcraft-essence-sheet": {
          managedByAem: true,
          itemRequirement: itemReq,
          activationRequirement: itemReq,
          description: this._draft.description || "",
        },
      },
    };

    try {
      if (this._editingEffect) {
        const sameHost = this._editingEffect.parent?.id === targetHostDoc.id;
        if (sameHost) {
          await this._editingEffect.update(effectData);
          ui.notifications.info(`Updated Active Effect "${effectData.name}" on ${targetHostDoc.name}.`);
        } else {
          // Host changed (e.g. moved from Actor to an Item or vice-versa)
          await this._editingEffect.delete();
          const created = await targetHostDoc.createEmbeddedDocuments("ActiveEffect", [effectData]);
          this._editingEffect = created?.[0] || null;
          ui.notifications.info(`Moved Active Effect "${effectData.name}" to ${targetHostDoc.name}.`);
        }
      } else {
        const created = await targetHostDoc.createEmbeddedDocuments("ActiveEffect", [effectData]);
        this._editingEffect = created?.[0] || null;
        ui.notifications.info(`Created Active Effect "${effectData.name}" on ${targetHostDoc.name}!`);
      }

      if (this._editingEffect) {
        this._draft = this._createDraftFromEffect(this._editingEffect);
      }
      this.render();
      if (this.actor?.sheet?.rendered) this.actor.sheet.render();
      if (this.document?.sheet?.rendered && this.document !== this.actor) this.document.sheet.render();
    } catch (err) {
      console.error("[MythCraft Active Effect Manager] Failed to save effect:", err);
      ui.notifications.error(`Failed to save Active Effect: ${err.message || err}`);
    }
  }

  static async #onDeleteEffect(event, target) {
    event.preventDefault();
    const effectId = target.dataset.effectId || this._editingEffect?.id;
    const parentItemId = target.dataset.parentItemId || null;
    const found = this._resolveEffect(effectId, parentItemId);
    if (!found) return;

    const name = found.name;
    await found.delete();
    if (this._editingEffect?.id === effectId) {
      this._editingEffect = null;
      this._draft = this._createDraftFromEffect(null);
    }
    ui.notifications.info(`Deleted Active Effect "${name}".`);
    this.render();
    if (this.actor?.sheet?.rendered) this.actor.sheet.render();
  }

  static async #onToggleSidebarEffect(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const effectId = target.dataset.effectId;
    const parentItemId = target.dataset.parentItemId || null;
    const found = this._resolveEffect(effectId, parentItemId);
    if (!found) return;

    await found.update({ disabled: !found.disabled });
    this.render();
    if (this.actor?.sheet?.rendered) this.actor.sheet.render();
  }

  static #onOpenRawFoundryConfig(event) {
    event.preventDefault();
    if (this._editingEffect?.sheet) {
      this._editingEffect.sheet.render(true);
    } else {
      ui.notifications.info("Save this effect first to open its raw Foundry ActiveEffectConfig sheet.");
    }
  }
}

