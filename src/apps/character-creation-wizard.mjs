/**
 * mythcraft-essence-sheet | src/apps/character-creation-wizard.mjs
 *
 * Interactive 6-Step Character Creation Wizard for the MythCraft System.
 */

import {
  getAvailableCompendiums,
  loadPacksDocuments,
  parseAttributeBonusPoints,
  parseFeatureSkillPointBonus,
  parseFeatureSkillData,
  MYTHCRAFT_SKILL_CATEGORIES,
  parseLineageAttributeBonusSources,
  parseLineageMilestones,
  getAttributeLevelCap,
  calculateAttributePool,
  parseBackgroundData,
  parseProfessionData,
  parseTalentData,
  checkTalentAvailability,
  resolveLineageFeatures,
  groupTalentsByStack,
  buildTalentTrees,
} from "../features/compendium-parser.mjs";
import { getSetting } from "../settings.mjs";
import { getEnduranceThreshold, ENDURANCE_THRESHOLDS } from "../features/hp-automation.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class CharacterCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.currentStep = 1;

    // State data
    this.data = {
      // Step 1: Lineage
      lineages: [],
      selectedLineageId: null,
      selectedFeatureId: null,
      expandedCardIds: new Set(),
      searches: { lineage: "", background: "", profession: "", talent: "", spell: "" },
      bonusAttributePoints: 0,
      bonusAttributeSources: [],
      lineageMilestones: "",

      // Step 2: Attributes
      attributes: {
        str: 0,
        dex: 0,
        end: 0,
        awr: 0,
        int: 0,
        cha: 0,
        lck: 0,
        cor: 0,
      },

      // Step 3: Stats
      hpMode: "set", // "set" | "roll"

      // Step 4: Background & Profession (BOPs)
      backgrounds: [],
      selectedBackgroundId: null,
      backgroundConfirmed: false,
      allocatedSkills: {}, // { [skillKey]: points }
      wealthMode: "average", // "average" | "roll"

      professions: [],
      selectedProfessionId: null,
      professionConfirmed: false,
      selectedProfessionSkills: [],

      // Step 5: Talents
      talents: [],
      selectedTalentId: null,
      selectedExtraTalentIds: [],
      availableSpells: [],
      selectedSpellIds: [],
      magicAttribute: "int",
    };
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "character-creation-wizard",
    classes: ["mythcraft", "essence-dialog", "character-creation-wizard"],
    tag: "div",
    window: {
      title: "MythCraft — Character Creation Wizard",
      icon: "fas fa-hat-wizard",
      resizable: true,
    },
    position: {
      width: 860,
      height: 760,
    },
    actions: {
      nextStep: this.#onNextStep,
      prevStep: this.#onPrevStep,
      selectLineage: this.#onSelectLineage,
      selectLineageFeature: this.#onSelectLineageFeature,
      adjustAttribute: this.#onAdjustAttribute,
      setHpMode: this.#onSetHpMode,
      selectBackground: this.#onSelectBackground,
      confirmBackground: this.#onConfirmBackground,
      adjustSkill: this.#onAdjustSkill,
      setWealthMode: this.#onSetWealthMode,
      selectProfession: this.#onSelectProfession,
      confirmProfession: this.#onConfirmProfession,
      toggleProfessionSkill: this.#onToggleProfessionSkill,
      selectTalent: this.#onSelectTalent,
      toggleExtraTalent: this.#onToggleExtraTalent,
      toggleSpell: this.#onToggleSpell,
      setMagicAttribute: this.#onSetMagicAttribute,
      toggleCardExpand: this.#toggleCardExpand,
      setSearch: this.#setSearch,
      viewTalent: this.#onViewTalent,
      finalize: this.#onFinalize,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    wizard: {
      template: "modules/mythcraft-essence-sheet/templates/essence/apps/character-creation-wizard.hbs",
    },
  };

  async loadCompendiumData() {
    const packs = getAvailableCompendiums();

    const allLineageDocs = await loadPacksDocuments(packs.lineages);
    this.data.allLineageDocs = allLineageDocs;

    // Lineage folders contain features as well as the actual lineage item.
    const filteredLineages = allLineageDocs.filter(d => {
      const name = String(d.name || "").trim().toLowerCase();
      const folderName = String(d.folder?.name || d._source?.folder?.name || "").trim().toLowerCase();
      const expectedName = folderName ? `${folderName} lineage` : "";
      return (folderName && name === expectedName) || (!folderName && name.endsWith(" lineage"));
    });
    this.data.lineages = filteredLineages;
    this.data.lineages.sort((a, b) => a.name.localeCompare(b.name));

    const bopsDocs = await loadPacksDocuments(packs.bops);
    this.data.allBopsDocs = bopsDocs;

    const isDocOfCategory = (d, categoryName) => {
      const target = categoryName.toLowerCase();
      const cat = String(d.system?.category || "").toLowerCase();
      const type = String(d.type || "").toLowerCase();
      const name = String(d.name || "").toLowerCase();
      if (cat === target || type === target || name.includes(target)) return true;

      const rawTags = d.system?.tags;
      if (!rawTags) return false;
      if (Array.isArray(rawTags)) {
        return rawTags.some(t => String(t?.name || t?.label || t?.id || t).toLowerCase().includes(target));
      }
      if (rawTags instanceof Set) {
        return Array.from(rawTags).some(t => String(t?.name || t?.label || t?.id || t).toLowerCase().includes(target));
      }
      if (typeof rawTags === "object") {
        return Object.values(rawTags).some(t => String(t?.name || t?.label || t?.id || t).toLowerCase().includes(target));
      }
      return String(rawTags).toLowerCase().includes(target);
    };

    this.data.backgrounds = bopsDocs.filter(d => isDocOfCategory(d, "background") && !String(d.name || "").toLowerCase().includes(": rank"))
      .sort((a, b) => a.name.localeCompare(b.name));
    this.data.professions = bopsDocs.filter(d => String(d.name || "").trim().toLowerCase().endsWith(" profession"))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Starting Talents: Specialization and Magic Entry talents (Level 1 characters cannot take Class talents)
    const specTalents = await loadPacksDocuments(packs.specTalents);
    const magicTalents = await loadPacksDocuments(packs.magic, { type: "talent" });
    this.data.talents = [...specTalents, ...magicTalents];

    // Magic Spells & Cantrips
    this.data.availableSpells = await loadPacksDocuments(packs.magic, { type: "spell" });
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    if (this.data.lineages.length === 0) {
      await this.loadCompendiumData();
    }

    // 1. Detect and register Custom Attributes & Sanity
    const coreKeys = new Set(["str", "dex", "end", "awr", "int", "cha", "lck", "cor"]);
    const sanityEnabled = Boolean(getSetting("enableSanity", false));
    const validCustomKeys = new Set();
    if (sanityEnabled) {
      validCustomKeys.add("san");
      if (this.data.attributes.san === undefined) {
        this.data.attributes.san = 0;
      }
    }

    const customAttrsSetting = getSetting("customAttributes", []);
    if (Array.isArray(customAttrsSetting)) {
      for (const ca of customAttrsSetting) {
        const key = (typeof ca === "string" ? ca : ca?.key || ca?.id || "").toLowerCase().trim();
        if (key && !coreKeys.has(key)) {
          validCustomKeys.add(key);
          if (this.data.attributes[key] === undefined) {
            this.data.attributes[key] = 0;
          }
        }
      }
    }

    // Clean up this.data.attributes so no unintended system keys pollute the attributes list
    for (const k of Object.keys(this.data.attributes)) {
      const lower = k.toLowerCase().trim();
      if (!coreKeys.has(lower) && !validCustomKeys.has(lower)) {
        delete this.data.attributes[k];
      }
    }

    // Base pool is 5 points for core 6 attributes. Each enabled custom attribute grants an additional +1 attribute point!
    const customAttrCount = validCustomKeys.size;
    const baseAttributePool = 5 + customAttrCount;

    const levelCap = getAttributeLevelCap(1); // At level 1, max +2
    const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, baseAttributePool);

    const attrNames = {
      str: "Strength",
      dex: "Dexterity",
      end: "Endurance",
      awr: "Awareness",
      int: "Intellect",
      cha: "Charisma",
      lck: "Luck",
      cor: "Coordination",
      san: "Sanity",
    };
    const attributesList = Object.entries(this.data.attributes).map(([key, val]) => ({
      key,
      label: key.toUpperCase(),
      name: attrNames[key] || key.toUpperCase(),
      value: val,
      isAtCap: val >= levelCap,
      canIncrease: val < levelCap && pool.remaining > 0,
      canDecrease: val > -10,
    }));

    // Selected Lineage Data
    const selectedLineage = this.data.lineages.find(l => l.id === this.data.selectedLineageId);

    // Resolve starting features and unique features strictly isolated to this lineage
    const { startingFeatures: lineageStartingFeatures, uniqueFeatures: lineageUniqueFeaturesRaw } = 
      resolveLineageFeatures(selectedLineage, this.data.allLineageDocs || []);

    const selectedFeature = lineageUniqueFeaturesRaw.find(feature => feature.id === this.data.selectedFeatureId);

    // Build authentic Lineage Talent Tree for unique selectable features
    const lineageTrees = buildTalentTrees(lineageUniqueFeaturesRaw, selectedFeature ? [{ name: selectedFeature.name }] : []);

    // Evaluate prerequisites for unique lineage features list
    const lineageUniqueFeatures = lineageUniqueFeaturesRaw.map(feature => {
      const avail = checkTalentAvailability(feature, [selectedLineage, ...lineageStartingFeatures]);
      return {
        id: feature.id,
        name: feature.name,
        img: feature.img || "icons/svg/aura.svg",
        description: feature.system?.description?.value ?? feature.system?.description ?? "",
        isAvailable: avail.isAvailable,
        missingPrereqs: avail.missingPrereqs,
        prereqTooltip: avail.prereqTooltip,
      };
    });

    const eligibleUniqueFeatures = lineageUniqueFeatures.filter(f => f.isAvailable);
    this.data.lineageStartingFeatures = lineageStartingFeatures;
    this.data.eligibleUniqueFeatures = eligibleUniqueFeatures;

    // Calculate attribute bonuses from lineage + starting features + selected unique feature
    const lineageBonusData = parseLineageAttributeBonusSources(selectedLineage, lineageStartingFeatures, selectedFeature);
    this.data.bonusAttributePoints = lineageBonusData.total;
    this.data.bonusAttributeSources = lineageBonusData.sources;
    const bonusAttributeSourcesTooltip = lineageBonusData.sources.map(s => `${s.name} (+${s.points})`).join(", ");

    // Milestone text
    const lineageMilestones = parseLineageMilestones(selectedLineage);

    // Selected Background Data
    const selectedBackground = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    const parsedBackground = selectedBackground ? parseBackgroundData(selectedBackground) : null;
    const encouragedTag = (parsedBackground?.encouragedProfessions?.tag || "").trim().toLowerCase();

    // Helper to evaluate if profession is encouraged by background
    const isEncouragedProfession = (profession) => {
      if (!parsedBackground || !this.data.backgroundConfirmed) return false;
      const pName = (profession.name || "").toLowerCase().replace(/ profession$/i, "").trim();
      const pDesc = String(profession.system?.description?.value ?? profession.system?.description ?? "").toLowerCase();

      // 1. Tag in profession tags
      if (encouragedTag && (this.#hasTag(profession.system?.tags, encouragedTag) || this.#hasTag(profession.system?.tag, encouragedTag))) return true;

      // 2. Tag in profession name only (not full description body — too broad)
      if (encouragedTag && pName.includes(encouragedTag)) return true;

      // 3. Matched by explicit UUID or name in background description
      const rawUuids = parsedBackground?.encouragedProfessions?.rawProfessionUuids || [];
      for (const ref of rawUuids) {
        const refName = (ref.name || "").toLowerCase().replace(/ profession$/i, "").trim();
        if (refName && (refName === pName || pName.includes(refName) || refName.includes(pName))) return true;
        if (ref.uuid && (ref.uuid.includes(profession.id) || (profession._id && ref.uuid.includes(profession._id)))) return true;
      }

      return false;
    };

    // Professions sorted: encouraged professions with bonus in gold at the top
    const availableProfessions = parsedBackground && this.data.backgroundConfirmed
      ? this.data.professions.map(profession => {
          const isEncouraged = isEncouragedProfession(profession);
          return {
            id: profession.id,
            name: profession.name,
            img: profession.img || "icons/svg/item-bag.svg",
            system: profession.system,
            isEncouraged,
          };
        }).sort((a, b) => (b.isEncouraged ? 1 : 0) - (a.isEncouraged ? 1 : 0))
      : [];

    // Selected Profession Data
    const selectedProfession = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsedProfession = selectedProfession ? parseProfessionData(selectedProfession) : null;
    const professionRankItems = selectedProfession
      ? (this.data.allBopsDocs || []).filter(item => String(item.name || "").toLowerCase().startsWith(`${selectedProfession.name.toLowerCase().replace(/ profession$/, "")}: rank`))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    // Search filter helper
    const matchesSearch = (document, query) => {
      const text = `${document?.name || ""} ${document?.system?.description?.value || document?.system?.description || document?.description || ""}`
        .replace(/<[^>]+>/g, " ").toLowerCase();
      return !query || text.includes(query.trim().toLowerCase());
    };

    const filteredLineages = this.data.lineages.filter(item => matchesSearch(item, this.data.searches.lineage));
    const filteredBackgrounds = this.data.backgrounds.filter(item => matchesSearch(item, this.data.searches.background));
    const filteredProfessions = availableProfessions.filter(item => matchesSearch(item, this.data.searches.profession));

    // Known features/talents for prerequisite checking in Step 5
    const knownItemsForPrereq = [
      selectedLineage,
      ...lineageStartingFeatures,
      selectedFeature,
      selectedBackground,
      selectedProfession,
    ].filter(Boolean);

    // Selected Talent Data
    const selectedTalent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
    const parsedTalent = selectedTalent ? parseTalentData(selectedTalent) : null;

    // Divide talents into Stacks (Specialization & Magic)
    const talentStacks = groupTalentsByStack(this.data.talents).map(stack => ({
      stackName: stack.stackName,
      stackKey: stack.stackKey,
      items: stack.talents.map(t => {
        const avail = checkTalentAvailability(t, knownItemsForPrereq);
        const parsed = parseTalentData(t);
        const descRaw = t.system?.description?.value ?? t.system?.description ?? "";
        const descClean = descRaw.replace(/<[^>]+>/g, " ").trim();
        const shortDesc = descClean.length > 120 ? descClean.substring(0, 117) + "..." : descClean;

        return {
          id: t.id,
          name: t.name,
          img: t.img || "icons/svg/aura.svg",
          description: descRaw,
          shortDesc,
          isAvailable: avail.isAvailable,
          missingPrereqs: avail.missingPrereqs,
          prereqTooltip: avail.prereqTooltip,
          parsed,
        };
      }),
    }));

    const talentGroups = [
      { 
        label: "Specialization Talents", 
        key: "specialization", 
        stacks: talentStacks.filter(s => !s.items.some(i => i.parsed?.isMagicEntry))
      },
      { 
        label: "Magic Talents", 
        key: "magic", 
        stacks: talentStacks.filter(s => s.items.some(i => i.parsed?.isMagicEntry))
      },
    ];

    // Filter talent groups by search
    const filteredTalentGroups = talentGroups.map(group => ({
      ...group,
      stacks: group.stacks.map(stack => ({
        ...stack,
        items: stack.items.filter(item => matchesSearch(item, this.data.searches.talent)),
      })).filter(stack => stack.items.length > 0),
    })).filter(group => group.stacks.length > 0);

    // Extra talents and spells for magic entry talents
    const stackTag = (parsedTalent?.magicStackTag || "").toLowerCase().replace(/\s*magic\s*$/i, "").trim();
    const isDocOfStack = (doc, tag) => {
      if (!tag) return true;
      const tName = (doc.name || "").toLowerCase();
      const tDesc = (doc.system?.description?.value ?? doc.system?.description ?? "").toLowerCase();
      const tSrc = String(doc.system?.magicSource || "").toLowerCase().replace(/^mythcraft\.(item|item)\.spell\.source\./i, "");
      const tCat = String(doc.system?.category || "").toLowerCase();
      const chain = doc._folderChain || [];
      const inChain = chain.some(f => f.toLowerCase().includes(tag));
      const inTags = this.#hasTag(doc.system?.tags, tag) || this.#hasTag(doc.system?.tag, tag);
      return inChain || inTags || tSrc.includes(tag) || tCat.includes(tag) || tName.includes(tag) || tDesc.includes(`${tag} magic`) || tDesc.includes(`tag: ${tag}`) || tDesc.includes(`[${tag}]`);
    };

    const extraTalentOptions = selectedTalent && parsedTalent?.extraStackTalents
      ? this.data.talents.filter(t => t.id !== selectedTalent.id && isDocOfStack(t, stackTag)).map(t => {
          const avail = checkTalentAvailability(t, [...knownItemsForPrereq, selectedTalent]);
          return {
            id: t.id,
            name: t.name,
            img: t.img,
            isAvailable: avail.isAvailable,
            missingPrereqs: avail.missingPrereqs,
            prereqTooltip: avail.prereqTooltip,
          };
        })
      : [];

    const filteredSpells = (parsedTalent?.isMagicEntry && stackTag)
      ? this.data.availableSpells.filter(s => isDocOfStack(s, stackTag) && matchesSearch(s, this.data.searches.spell))
      : this.data.availableSpells.filter(s => matchesSearch(s, this.data.searches.spell));

    // Active lineage features for skill bonus parsing
    const activeLineageFeatures = [
      ...(lineageStartingFeatures || []),
      selectedFeature,
    ].filter(Boolean);

    const parsedFeatureSkillData = activeLineageFeatures.map(f => parseFeatureSkillData(f));
    const featureSkillBonus = parsedFeatureSkillData.reduce((sum, f) => sum + f.points, 0);
    const featureSkillCapOverride = Math.max(0, ...parsedFeatureSkillData.map(f => f.perSkillCap || 0));
    const featureSkillTags = new Set(parsedFeatureSkillData.map(f => f.tag).filter(Boolean));

    // Background skill allocator calculations
    const backgroundSkillSpent = Object.values(this.data.allocatedSkills).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const backgroundSkillPool = (parsedBackground?.skillPoints ?? 12) + featureSkillBonus;
    const backgroundSkillRemaining = backgroundSkillPool - backgroundSkillSpent;
    const effectivePerSkillCap = Math.max(parsedBackground?.perSkillCap ?? 4, featureSkillCapOverride);

    // Decorate parsedBackground.skillCategories with feature bonus highlight flags
    if (parsedBackground?.skillCategories) {
      for (const cat of parsedBackground.skillCategories) {
        const catKey = cat.category.toLowerCase().trim();
        for (const sk of cat.skills) {
          const skName = sk.name.replace(/\*/g, "").toLowerCase().trim();
          const matchesTag = Array.from(featureSkillTags).some(t => {
            if (t === catKey) return true;
            if (MYTHCRAFT_SKILL_CATEGORIES[t]?.includes(skName)) return true;
            return skName.includes(t) || t.includes(skName);
          });
          sk.isFeatureBonus = matchesTag;
        }
      }
    }

    const hpData = getEnduranceThreshold(this.data.attributes.end || 0);
    const setHpValue = 10 + 1 + (1 * hpData.setHp);

    return {
      actor: this.actor,
      step: this.currentStep,
      data: this.data,
      levelCap,
      attributesList,
      pool,
      bonusAttributeSourcesTooltip,
      filteredLineages,
      filteredBackgrounds,
      filteredProfessions,
      selectedLineage,
      lineageStartingFeatures,
      lineageUniqueFeatures,
      eligibleUniqueFeatures,
      selectedFeature,
      lineageTrees,
      lineageMilestones,
      selectedBackground,
      parsedBackground,
      backgroundSkillSpent,
      backgroundSkillPool,
      backgroundSkillRemaining,
      effectivePerSkillCap,
      availableProfessions,
      selectedProfession,
      parsedProfession,
      professionRankItems,
      selectedTalent,
      parsedTalent,
      talentGroups,
      filteredTalentGroups,
      extraTalentOptions,
      filteredSpells,
      hpData,
      setHpValue,
      isLastStep: this.currentStep === 6,
    };
  }

  /** @inheritdoc */
  _preRender(context, options) {
    if (!this._savedScrolls) this._savedScrolls = new Map();
    if (this.element) {
      const scrollEls = this.element.querySelectorAll(".wizard-body-content, .wizard-step-panel, .skill-categories-allocator, .bops-selection-grid, .lineage-selection-grid");
      for (const el of scrollEls) {
        const cls = el.className;
        this._savedScrolls.set(cls, el.scrollTop);
      }
    }
    return super._preRender?.(context, options);
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender?.(context, options);

    // Restore scroll positions
    if (this._savedScrolls && this.element) {
      const scrollEls = this.element.querySelectorAll(".wizard-body-content, .wizard-step-panel, .skill-categories-allocator, .bops-selection-grid, .lineage-selection-grid");
      for (const el of scrollEls) {
        const cls = el.className;
        if (this._savedScrolls.has(cls)) {
          el.scrollTop = this._savedScrolls.get(cls);
        }
      }
    }

    // Setup responsive live search listeners
    const searchInputs = this.element.querySelectorAll("input.wizard-search-input");
    searchInputs.forEach(input => {
      const searchKey = input.dataset.search;
      if (!searchKey) return;

      input.addEventListener("input", e => {
        this.data.searches[searchKey] = e.target.value;
        const cursorPos = e.target.selectionStart;
        this.render();
        // Re-focus search input after rendering
        setTimeout(() => {
          const freshInput = this.element.querySelector(`input.wizard-search-input[data-search="${searchKey}"]`);
          if (freshInput) {
            freshInput.focus();
            try { freshInput.setSelectionRange(cursorPos, cursorPos); } catch (_) {}
          }
        }, 20);
      });
    });

    // Magic attribute select change listener
    const magicAttrSelect = this.element.querySelector('select[name="magicAttr"]');
    if (magicAttrSelect) {
      magicAttrSelect.addEventListener("change", e => {
        this.data.magicAttribute = e.target.value;
      });
    }
  }

  #hasTag(rawTags, target) {
    if (!rawTags || !target) return false;
    const values = Array.isArray(rawTags) ? rawTags : rawTags instanceof Set ? Array.from(rawTags) : Object.values(rawTags);
    return values.some(tag => String(tag?.name || tag?.label || tag?.id || tag).toLowerCase() === target.toLowerCase());
  }

  static #toggleCardExpand(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const card = target.closest(".wizard-selection-card, .bops-item-card, .talent-choice-card, .feature-detail-card");
    const cardId = card?.dataset.cardId;
    if (!cardId) return;
    if (this.data.expandedCardIds.has(cardId)) this.data.expandedCardIds.delete(cardId);
    else this.data.expandedCardIds.add(cardId);
    this.render();
  }

  static #setSearch(event, target) {
    const key = target.dataset.search;
    if (!key) return;
    this.data.searches[key] = target.value || "";
    this.render();
  }

  #getBaseAttributePool() {
    const coreKeys = new Set(["str", "dex", "end", "awr", "int", "cha", "lck", "cor"]);
    const customKeys = Object.keys(this.data.attributes).filter(k => !coreKeys.has(k.toLowerCase()));
    return 5 + customKeys.length;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static #onNextStep(event, target) {
    // Step validation checks
    if (this.currentStep === 1 && !this.data.selectedLineageId) {
      ui.notifications.warn("Please select a Lineage before proceeding.");
      return;
    }

    if (this.currentStep === 2) {
      const basePool = this.#getBaseAttributePool();
      const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, basePool);
      if (pool.remaining < 0) {
        ui.notifications.warn("You have allocated more attribute points than available. Please adjust before proceeding.");
        return;
      }
    }

    if (this.currentStep < 6) {
      this.currentStep++;
      this.render();
    }
  }

  static #onPrevStep(event, target) {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  }

  static #onSelectLineage(event, target) {
    const id = target.dataset.lineageId;
    this.data.selectedLineageId = id;
    this.data.expandedCardIds.add(id);
    this.data.selectedFeatureId = null;
    this.render();
  }

  static #onSelectLineageFeature(event, target) {
    const id = target.dataset.featureId;
    const isLocked = target.classList.contains("locked") || target.dataset.locked === "true";
    if (isLocked) {
      const tooltip = target.dataset.tooltip || "Prerequisites not met";
      ui.notifications.warn(tooltip);
      return;
    }
    this.data.selectedFeatureId = id;
    this.render();
  }

  static async #onViewTalent(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const id = target.dataset.talentId || target.dataset.featureId;
    if (!id) return;
    const doc = (this.data.allLineageDocs || []).find(d => d.id === id) 
      || (this.data.talents || []).find(t => t.id === id)
      || (this.data.allBopsDocs || []).find(b => b.id === id);
    if (doc?.sheet?.render) {
      doc.sheet.render(true);
    }
  }

  static #onAdjustAttribute(event, target) {
    const attr = target.dataset.attr;
    const delta = parseInt(target.dataset.delta, 10);
    const cur = Number(this.data.attributes[attr] ?? 0);
    const levelCap = getAttributeLevelCap(1);

    const next = cur + delta;
    if (delta > 0) {
      const basePool = this.#getBaseAttributePool();
      const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, basePool);
      if (pool.remaining <= 0) {
        ui.notifications.warn("No remaining attribute points to spend.");
        return;
      }
      if (next > levelCap) {
        ui.notifications.warn(`Attributes cannot exceed +${levelCap} at level 1.`);
        return;
      }
    }

    this.data.attributes[attr] = next;
    this.render();
  }

  static #onSetHpMode(event, target) {
    this.data.hpMode = target.dataset.mode;
    this.render();
  }

  static #onSelectBackground(event, target) {
    this.data.selectedBackgroundId = target.dataset.backgroundId;
    this.data.expandedCardIds.add(target.dataset.cardId);
    this.data.allocatedSkills = {};
    this.data.backgroundConfirmed = false;
    this.data.selectedProfessionId = null;
    this.data.professionConfirmed = false;
    this.render();
  }

  static #onConfirmBackground(event, target) {
    event.preventDefault();
    this.data.backgroundConfirmed = Boolean(this.data.selectedBackgroundId);
    this.render();
  }

  static #onAdjustSkill(event, target) {
    const skill = target.dataset.skill;
    const delta = parseInt(target.dataset.delta, 10);
    const cur = Number(this.data.allocatedSkills[skill] ?? 0);
    const next = Math.max(0, cur + delta);

    const activeLineageFeatures = [
      ...(this.data.lineageStartingFeatures || []),
      this.data.allLineageDocs?.find(f => f.id === this.data.selectedFeatureId),
    ].filter(Boolean);
    const parsedFeatureSkillData = activeLineageFeatures.map(f => parseFeatureSkillData(f));
    const featureSkillBonus = parsedFeatureSkillData.reduce((sum, f) => sum + f.points, 0);
    const featureSkillCapOverride = Math.max(0, ...parsedFeatureSkillData.map(f => f.perSkillCap || 0));

    const bg = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    const parsed = bg ? parseBackgroundData(bg) : null;
    const cap = Math.max(parsed?.perSkillCap ?? 4, featureSkillCapOverride);
    const maxPool = (parsed?.skillPoints ?? 12) + featureSkillBonus;

    if (delta > 0) {
      const currentSpent = Object.values(this.data.allocatedSkills).reduce((sum, v) => sum + (Number(v) || 0), 0);
      if (currentSpent >= maxPool) {
        ui.notifications.warn(`You have already spent all ${maxPool} available skill points.`);
        return;
      }
      if (next > cap) {
        ui.notifications.warn(`Skills are limited to a maximum of +${cap}.`);
        return;
      }
    }

    this.data.allocatedSkills[skill] = next;
    this.render();
  }

  static #onSetWealthMode(event, target) {
    this.data.wealthMode = target.dataset.mode;
    this.render();
  }

  static #onSelectProfession(event, target) {
    if (!this.data.selectedBackgroundId) return;
    this.data.selectedProfessionId = target.dataset.professionId;
    this.data.expandedCardIds.add(target.dataset.cardId);
    this.data.selectedProfessionSkills = [];
    this.data.professionConfirmed = false;
    this.render();
  }

  static #onConfirmProfession(event, target) {
    event.preventDefault();
    this.data.professionConfirmed = Boolean(this.data.selectedProfessionId);
    this.render();
  }

  static #onToggleProfessionSkill(event, target) {
    const skillName = target.dataset.skill;
    const prof = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsed = prof ? parseProfessionData(prof) : null;
    const maxChoices = parsed?.choiceSkills?.count ?? 0;

    const idx = this.data.selectedProfessionSkills.indexOf(skillName);
    if (idx >= 0) {
      this.data.selectedProfessionSkills.splice(idx, 1);
    } else {
      if (this.data.selectedProfessionSkills.length >= maxChoices) {
        ui.notifications.warn(`You may only select ${maxChoices} choice skills.`);
        return;
      }
      this.data.selectedProfessionSkills.push(skillName);
    }
    this.render();
  }

  static #onSelectTalent(event, target) {
    const isLocked = target.classList.contains("locked") || target.dataset.locked === "true";
    if (isLocked) {
      const tooltip = target.dataset.tooltip || "Prerequisites not met";
      ui.notifications.warn(tooltip);
      return;
    }
    const talent = this.data.talents.find(t => t.id === target.dataset.talentId);
    const parsed = talent ? parseTalentData(talent) : null;
    this.data.selectedTalentId = target.dataset.talentId;
    this.data.expandedCardIds.add(target.dataset.cardId);
    this.data.selectedExtraTalentIds = [];
    this.data.selectedSpellIds = [];
    if (parsed?.magicAttribute) {
      this.data.magicAttribute = parsed.magicAttribute;
    }
    this.render();
  }

  static #onToggleExtraTalent(event, target) {
    const id = target.dataset.talentId;
    const talent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
    const parsed = talent ? parseTalentData(talent) : null;
    const maxExtra = parsed?.extraStackTalents ?? 2;

    const idx = this.data.selectedExtraTalentIds.indexOf(id);
    if (idx >= 0) {
      this.data.selectedExtraTalentIds.splice(idx, 1);
    } else {
      if (this.data.selectedExtraTalentIds.length >= maxExtra) {
        ui.notifications.warn(`You may only select ${maxExtra} extra talents.`);
        return;
      }
      this.data.selectedExtraTalentIds.push(id);
    }
    this.render();
  }

  static #onToggleSpell(event, target) {
    const id = target.dataset.spellId;
    const idx = this.data.selectedSpellIds.indexOf(id);
    if (idx >= 0) {
      this.data.selectedSpellIds.splice(idx, 1);
    } else {
      this.data.selectedSpellIds.push(id);
    }
    this.render();
  }

  static #onSetMagicAttribute(event, target) {
    this.data.magicAttribute = target.value;
    this.render();
  }

  static async #onFinalize(event, target) {
    const basePool = this.#getBaseAttributePool();
    const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, basePool);
    if (pool.remaining < 0) {
      ui.notifications.error("Attribute points are over-allocated. Please correct before completing.");
      return;
    }

    await this.applyToActor();
    this.close();
    ui.notifications.info(`Character Creation Complete for ${this.actor.name}!`);
  }

  /**
   * Applies all finalized selections directly onto the actor.
   */
  async applyToActor() {
    const updates = {
      "system.level": 1,
    };

    for (const [attrKey, attrVal] of Object.entries(this.data.attributes)) {
      updates[`system.attributes.${attrKey}`] = attrVal || 0;
    }

    // 1. HP calculation
    const endVal = this.data.attributes.end || 0;
    const hpData = getEnduranceThreshold(endVal);
    let finalHp = 10 + 1 + (1 * hpData.setHp);

    if (this.data.hpMode === "roll") {
      const roll = new Roll(`10 + 1 + 1${hpData.die}`);
      await roll.evaluate();
      finalHp = roll.total;
      await roll.toMessage({
        flavor: `${this.actor.name} — Starting Hit Points Roll (Level 1)`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      });
    }

    updates["system.hp.max"] = finalHp;
    updates["system.hp.value"] = finalHp;

    // 2. Starting Wealth
    const bg = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    const parsedBg = bg ? parseBackgroundData(bg) : null;
    let startingWealth = parsedBg?.startingWealth?.average || 104;

    if (this.data.wealthMode === "roll" && parsedBg?.startingWealth?.formula) {
      const wRoll = new Roll(parsedBg.startingWealth.formula);
      await wRoll.evaluate();
      startingWealth = wRoll.total;
      await wRoll.toMessage({
        flavor: `${this.actor.name} — Starting Wealth Roll`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      });
    }

    // Use the configured primary currency key (defaults to "scillings" in the MythCraft system)
    const primaryCurrencyKey = getSetting("customCurrencyConfig", null)?.[1]?.key ?? "scillings";
    updates[`system.currency.${primaryCurrencyKey}`] = (Number(this.actor.system?.currency?.[primaryCurrencyKey]) || 0) + startingWealth;

    // 3. Skills mapping
    const skillListCfg = globalThis.mythcraft?.CONFIG?.skills?.list || CONFIG?.MYTHCRAFT?.skills?.list || {};
    const findSkillKey = (rawName) => {
      if (!rawName) return "";
      const clean = rawName.replace(/\*/g, "").trim();
      const lower = clean.toLowerCase();
      const slug = lower.replace(/[^a-z0-9]/g, "");
      for (const k of Object.keys(skillListCfg)) {
        if (k.toLowerCase() === lower || k.toLowerCase().replace(/[^a-z0-9]/g, "") === slug) return k;
      }
      const camel = lower.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
      return camel || lower;
    };

    const skillUpdates = {};
    for (const [sName, pts] of Object.entries(this.data.allocatedSkills)) {
      if (pts > 0) {
        const key = findSkillKey(sName);
        const curVal = Number(this.actor.system?.skills?.[key]?.value ?? this.actor.system?.skills?.[key]?.bonus ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + pts;
        skillUpdates[`system.skills.${key}.bonus`] = curVal + pts;
      }
    }

    // Profession skills
    const prof = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsedProf = prof ? parseProfessionData(prof) : null;
    if (parsedProf) {
      for (const fSkill of parsedProf.fixedSkills) {
        const key = findSkillKey(fSkill.name);
        const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? this.actor.system?.skills?.[key]?.bonus ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + fSkill.value;
        skillUpdates[`system.skills.${key}.bonus`] = curVal + fSkill.value;
      }
      for (const cSkill of this.data.selectedProfessionSkills) {
        const key = findSkillKey(cSkill);
        const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? this.actor.system?.skills?.[key]?.bonus ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + parsedProf.choiceSkills.value;
        skillUpdates[`system.skills.${key}.bonus`] = curVal + parsedProf.choiceSkills.value;
      }
    }

    // Background bonus skill for encouraged professions
    if (parsedBg?.encouragedProfessions?.bonusSkill && prof) {
      const tag = parsedBg.encouragedProfessions.tag;
      const isEncouraged = tag ? (this.#hasTag(prof.system?.tags, tag) || prof.name.toLowerCase().includes(tag)) : false;
      if (isEncouraged) {
        const bKey = findSkillKey(parsedBg.encouragedProfessions.bonusSkill);
        const curVal = Number(skillUpdates[`system.skills.${bKey}.value`] ?? this.actor.system?.skills?.[bKey]?.value ?? this.actor.system?.skills?.[bKey]?.bonus ?? 0);
        skillUpdates[`system.skills.${bKey}.value`] = curVal + parsedBg.encouragedProfessions.bonusValue;
        skillUpdates[`system.skills.${bKey}.bonus`] = curVal + parsedBg.encouragedProfessions.bonusValue;
      }
    }

    // 4. Magic Power Level, Spell Points & Magic Attribute
    const startingTalent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
    const parsedStartingTalent = startingTalent ? parseTalentData(startingTalent) : null;
    if (parsedStartingTalent?.isMagicEntry) {
      const spAmount = parsedStartingTalent.spBonus || 10;
      updates["system.sp.max"] = spAmount;
      updates["system.sp.value"] = spAmount;
      const stackTag = (parsedStartingTalent.magicStackTag || "").toLowerCase().replace(/\s*magic\s*$/i, "").trim();
      if (stackTag) {
        updates[`system.powerLevel.${stackTag}`] = parsedStartingTalent.magicPowerBonus || 1;
      }
      if (this.data.magicAttribute) {
        updates["system.attributes.magic"] = this.data.magicAttribute;
      }
    }

    Object.assign(updates, skillUpdates);

    // Apply actor updates
    await this.actor.update(updates);

    // 4. Inject Items (Lineage, Background, Profession, Talents, Starting Gear, Spells)
    const itemsToCreate = [];

    if (this.data.selectedLineageId) {
      const l = this.data.lineages.find(item => item.id === this.data.selectedLineageId);
      if (l) itemsToCreate.push(l.toObject());
    }
    for (const feature of this.data.lineageStartingFeatures || []) itemsToCreate.push(feature.toObject());
    if (this.data.selectedFeatureId) {
      const feature = this.data.allLineageDocs.find(item => item.id === this.data.selectedFeatureId);
      if (feature) itemsToCreate.push(feature.toObject());
    }

    if (bg) itemsToCreate.push(bg.toObject());
    if (prof) {
      itemsToCreate.push(prof.toObject());
      const professionBaseName = prof.name.replace(/ profession$/i, "");
      const rankOne = (this.data.allBopsDocs || []).find(item => item.name.toLowerCase() === `${professionBaseName.toLowerCase()}: rank 1`);
      if (rankOne) itemsToCreate.push(rankOne.toObject());
    }

    if (startingTalent) itemsToCreate.push(startingTalent.toObject());

    for (const extraId of this.data.selectedExtraTalentIds) {
      const extra = this.data.talents.find(t => t.id === extraId);
      if (extra) itemsToCreate.push(extra.toObject());
    }

    for (const spellId of this.data.selectedSpellIds) {
      const sp = this.data.availableSpells.find(s => s.id === spellId);
      if (sp) itemsToCreate.push(sp.toObject());
    }

    // Starting gear
    if (parsedProf?.startingGear) {
      for (const gear of parsedProf.startingGear) {
        itemsToCreate.push({
          name: gear.name,
          type: "gear",
          system: {
            quantity: gear.quantity,
            description: { value: "<p>Acquired from profession.</p>" },
          },
        });
      }
    }

    if (itemsToCreate.length > 0) {
      await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
    }
  }

  /**
   * Prompts the user to start Character Creation for a Level 0 or unbuilt character.
   * @param {Actor} actor
   * @param {Application} [sheet]
   */
  static async promptStartup(actor, sheet) {
    if (!actor || actor.type !== "character") return;
    const curLevel = Number(actor.system?.level ?? 0);
    const hasLineage = actor.items.some(i => i.type === "lineage" || String(i.name || "").toLowerCase().endsWith(" lineage"));
    const isUnbuilt = curLevel === 0 || (!hasLineage && curLevel <= 1);
    if (!isUnbuilt) return;

    // Check if a wizard or startup dialog is already open for this actor
    const openWizard = Object.values(ui.windows || {}).find(w => w instanceof CharacterCreationWizard && w.actor?.id === actor.id);
    if (openWizard) return;

    new Dialog({
      title: "Start Character Creation?",
      content: `
        <div class="insufficient-ap-modal-content" style="padding: 4px;">
          <div class="ap-modal-banner">
            <div class="ap-modal-icon"><i class="fas fa-sparkles"></i></div>
            <div class="ap-modal-text">
              <p class="ap-modal-actor"><strong>${actor.name}</strong> is currently a new <strong>${curLevel === 0 ? "Level 0" : "Unbuilt"}</strong> character.</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Would you like to step through the guided MythCraft Character Creation Wizard?</p>
            </div>
          </div>
        </div>
      `,
      buttons: {
        begin: {
          icon: '<i class="fas fa-wand-magic-sparkles"></i>',
          label: "Begin Wizard",
          callback: () => {
            new CharacterCreationWizard(actor).render(true);
          },
        },
        import: {
          icon: '<i class="fas fa-file-import"></i>',
          label: "Import JSON",
          callback: () => {
            actor.importFromJSONDialog?.();
          },
        },
        skip: {
          icon: '<i class="fas fa-forward"></i>',
          label: "Skip",
          callback: () => {},
        },
      },
      default: "begin",
    }, {
      classes: ["dialog", "essence-dialog"],
      width: 440,
    }).render(true);
  }
}

