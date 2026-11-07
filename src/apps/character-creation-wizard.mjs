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
  BACKGROUND_CANON_DATA,
  BACKGROUND_ENCOURAGED_PROFESSIONS,
  getBackgroundSkillCap,
  parseBackgroundData,
  parseProfessionData,
  parseTalentData,
  checkTalentAvailability,
  resolveLineageFeatures,
  groupTalentsByStack,
  buildTalentTrees,
  getDocumentFolderChain,
  parseExplicitItemTags,
} from "../features/compendium-parser.mjs";
import { getSpellLibraryEntry } from "../data/spell-library.mjs";
import {
  resolveEquipmentIcon,
  resolveTalentIcon,
  resolveItemIcon,
  applyDefaultEquipmentIcon,
  applyDefaultItemIcon,
  isDefaultIcon,
} from "../features/equipment-icons.mjs";
import { getSetting, setSetting } from "../settings.mjs";
import { getEnduranceThreshold, ENDURANCE_THRESHOLDS, calculateApMax } from "../features/hp-automation.mjs";
import { getMagicAttributeOptions } from "../features/homebrew-attributes.mjs";
import {
  CcxSound,
  setupCcxParticles,
  attachCcxInteractiveEffects,
  buildAttributeRadarSvg,
  buildAstralConstellationSvg,
  triggerStageCalloutBanner,
  playAwakeningFinaleSequence,
} from "../features/ccx-experience-engine.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class CharacterCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.currentStep = 1;
    this.maxUnlockedStep = 1;
    this._lastStep = 1;

    // State data
    this.data = {
      // Step 1: Lineage
      lineages: [],
      selectedLineageId: null,
      selectedSublineageName: null,
      selectedLineageChoices: {}, // { [groupKey]: choiceId }
      selectedUniqueFeatureIds: [],
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
      allocatedLineageSkills: {}, // { [skillKey]: points }
      wealthMode: "average", // "average" | "roll"

      professions: [],
      selectedProfessionId: null,
      professionConfirmed: false,
      selectedProfessionSkills: [],

      // Knave background: second profession
      selectedProfessionId2: null,
      professionConfirmed2: false,
      selectedProfessionSkills2: [],

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
    classes: ["mythcraft", "essence-dialog", "character-creation-wizard", "ccx-fullscreen-window"],
    tag: "div",
    window: {
      title: "MythCraft — Character Creation Experience",
      icon: "fas fa-hat-wizard",
      resizable: true,
    },
    position: {
      width: 1520,
      height: 920,
    },
    actions: {
      nextStep: this._onNextStep,
      prevStep: this._onPrevStep,
      jumpToStep: this._onJumpToStep,
      selectLineage: this._onSelectLineage,
      selectSublineage: this._onSelectSublineage,
      selectLineageChoice: this._onSelectLineageChoice,
      selectLineageFeature: this._onSelectLineageFeature,
      adjustAttribute: this._onAdjustAttribute,
      setHpMode: this._onSetHpMode,
      selectBackground: this._onSelectBackground,
      confirmBackground: this._onConfirmBackground,
      adjustSkill: this._onAdjustSkill,
      adjustLineageSkill: this._onAdjustLineageSkill,
      setWealthMode: this._onSetWealthMode,
      selectProfession: this._onSelectProfession,
      confirmProfession: this._onConfirmProfession,
      toggleProfessionSkill: this._onToggleProfessionSkill,
      selectProfession2: this._onSelectProfession2,
      confirmProfession2: this._onConfirmProfession2,
      toggleProfessionSkill2: this._onToggleProfessionSkill2,
      selectTalent: this._onSelectTalent,
      toggleExtraTalent: this._onToggleExtraTalent,
      toggleSpell: this._onToggleSpell,
      setMagicAttribute: this._onSetMagicAttribute,
      toggleCardExpand: this._toggleCardExpand,
      setSearch: this._setSearch,
      viewTalent: this._onViewTalent,
      toggleCcxSound: this._onToggleCcxSound,
      finalize: this._onFinalize,
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
    // A document is a Lineage if it is NOT inside a child features subfolder (e.g. "Starting Features" or "All Features")
    // and its name matches the parent folder / ends with "lineage" / has type/category "lineage".
    const filteredLineages = allLineageDocs.filter(d => {
      const rawChain = d._folderChain || getDocumentFolderChain(d) || [];
      const filteredChain = rawChain.filter(f => !/^(?:\d+\.\s*)?(?:lineages?|ancestries?|compendium|items?)$/i.test(f.trim()));

      // If inside a child folder (e.g. "Starting Features", "All Features", "Features"), it is a feature, NOT a lineage
      if (filteredChain.length >= 2) {
        const subFolder = filteredChain[1].toLowerCase();
        if (/^(starting|base|core|all|unique|choice|features|talents|traits|milestones)/i.test(subFolder) || subFolder.includes("features")) {
          return false;
        }
      }

      const name = String(d.name || "").trim().toLowerCase();
      const tags = parseExplicitItemTags(d);
      if (tags.feature) return false; // Explicit feature tag

      if (d.type === "lineage" || d.type === "ancestry" || d.system?.category === "lineage" || d.system?.category === "ancestry") {
        return true;
      }

      if (name.endsWith(" lineage") || name.endsWith(" ancestry")) return true;

      // If at root of a lineage folder (e.g. folder "Bhrunai", item "Bhrunai")
      if (filteredChain.length === 1) {
        const folderBase = filteredChain[0].toLowerCase().replace(/lineage/i, "").trim();
        const itemBase = name.replace(/lineage/i, "").trim();
        if (folderBase && itemBase === folderBase) return true;
      }

      const folderName = String(d.folder?.name || d._source?.folder?.name || "").trim().toLowerCase();
      if (folderName) {
        const folderBase = folderName.replace(/lineage/i, "").trim();
        const itemBase = name.replace(/lineage/i, "").trim();
        if (folderBase && itemBase === folderBase) return true;
      }

      return false;
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

    this.data.backgrounds = bopsDocs.filter(d => {
      const name = String(d.name || "").trim().toLowerCase();
      if (name.includes(": rank") || name.includes(" list") || name.includes("modifications")) return false;
      const bgKey = name.replace(/ background$/i, "").trim();
      return d.type === "background" || d.system?.category === "background" || Boolean(BACKGROUND_CANON_DATA[bgKey]);
    }).sort((a, b) => a.name.localeCompare(b.name));

    this.data.professions = bopsDocs.filter(d => {
      const name = String(d.name || "").trim().toLowerCase();
      if (name.includes(": rank") || name.includes(" list") || name.includes("modifications")) return false;
      return d.type === "profession" || d.system?.category === "profession" || name.endsWith(" profession") || isDocOfCategory(d, "profession");
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Starting Talents: Specialization and Magic Entry talents (Level 1 characters cannot take Class talents)
    const specTalents = await loadPacksDocuments(packs.specTalents);
    const magicTalents = await loadPacksDocuments(packs.magic, { type: "talent" });
    const rawTalents = [...specTalents, ...magicTalents];
    const seenTalents = new Set();
    this.data.talents = [];
    for (const t of rawTalents) {
      const norm = (t.name || "").toLowerCase().trim();
      if (!seenTalents.has(norm)) {
        seenTalents.add(norm);
        this.data.talents.push(t);
      }
    }

    // Magic Spells & Cantrips
    const rawSpells = await loadPacksDocuments(packs.magic, { type: "spell" });
    const seenSpells = new Set();
    this.data.availableSpells = [];
    for (const s of rawSpells) {
      const norm = (s.name || "").toLowerCase().trim();
      if (!seenSpells.has(norm)) {
        seenSpells.add(norm);
        this.data.availableSpells.push(s);
      }
    }

    // Equipment Compendium for Starting Gear Cloning & Stats
    const allEquipmentDocs = await loadPacksDocuments(packs.equipment);
    this.data.allEquipmentDocs = allEquipmentDocs;
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

    // Resolve starting features, sublineages, choice groups, and unique features (cached per selectedLineageId)
    if (this._cachedLineageId !== (this.data.selectedLineageId || null)) {
      this._cachedLineageId = this.data.selectedLineageId || null;
      this._cachedLineageParsed = selectedLineage
        ? resolveLineageFeatures(selectedLineage, this.data.allLineageDocs || [])
        : {
            baseStartingFeatures: [],
            startingFeatures: [],
            sublineages: [],
            choiceGroups: [],
            uniqueFeatures: [],
            uniqueCount: 0,
          };
    }
    const lineageParsed = this._cachedLineageParsed;

    // Sublineage resolution
    const selectedSublineage = lineageParsed.sublineages.find(s => s.name === this.data.selectedSublineageName) || null;
    const sublineageFeatures = selectedSublineage ? selectedSublineage.features : [];

    // Choice groups resolution (e.g. Golem Primary Material & Life Source)
    const selectedChoiceFeatures = [];
    const choiceGroupsWithState = (lineageParsed.choiceGroups || []).map(group => {
      const selectedId = this.data.selectedLineageChoices?.[group.key] || "";
      const chosenOption = group.choices.find(c => c.id === selectedId);
      if (chosenOption?.item) {
        selectedChoiceFeatures.push(chosenOption.item);
      }
      return {
        ...group,
        selectedId,
        chosenOption,
        choices: group.choices.map(c => ({
          ...c,
          isSelected: c.id === selectedId,
        })),
      };
    });

    // Active granted starting features (base + chosen sublineage + chosen choice groups), deduplicated
    const rawActiveStarting = [
      ...lineageParsed.baseStartingFeatures,
      ...sublineageFeatures,
      ...selectedChoiceFeatures,
    ].filter(Boolean);
    const seenStartingIds = new Set();
    const activeStartingFeatures = [];
    for (const feat of rawActiveStarting) {
      const key = String(feat.id || feat._id || feat.name || "").toLowerCase().trim();
      if (key && !seenStartingIds.has(key)) {
        seenStartingIds.add(key);
        activeStartingFeatures.push(feat);
      }
    }
    this.data.lineageStartingFeatures = activeStartingFeatures;

    // Unique feature count
    const uniqueCount = lineageParsed.uniqueCount;
    this.data.lineageUniqueCount = uniqueCount;

    // Ensure selectedUniqueFeatureIds is an array
    if (!Array.isArray(this.data.selectedUniqueFeatureIds)) {
      this.data.selectedUniqueFeatureIds = this.data.selectedFeatureId ? [this.data.selectedFeatureId] : [];
    }

    // Evaluate availability for unique lineage features list ONLY on Step 1
    const lineageUniqueFeatures = this.currentStep === 1
      ? (lineageParsed.uniqueFeatures || []).map(feature => {
          const avail = checkTalentAvailability(feature, [selectedLineage, ...activeStartingFeatures]);
          const fId = feature.id || feature._id;
          return {
            id: fId,
            name: feature.name,
            img: resolveItemIcon(feature, feature.img, "feature"),
            description: feature.system?.description?.value ?? feature.system?.description ?? "",
            isAvailable: avail.isAvailable,
            missingPrereqs: avail.missingPrereqs,
            prereqTooltip: avail.prereqTooltip,
            isSelected: this.data.selectedUniqueFeatureIds.includes(fId),
          };
        })
      : [];

    const selectedUniqueFeatures = this.data.selectedUniqueFeatureIds
      .map(id => (this.data.allLineageDocs || []).find(d => (d.id || d._id) === id))
      .filter(Boolean);

    // Keep legacy single-selection property in sync
    this.data.selectedFeatureId = this.data.selectedUniqueFeatureIds[0] || null;

    // Calculate attribute bonuses from lineage + active starting features + selected unique features
    const lineageBonusData = parseLineageAttributeBonusSources(selectedLineage, activeStartingFeatures, selectedUniqueFeatures[0]);
    this.data.bonusAttributePoints = lineageBonusData.total;
    this.data.bonusAttributeSources = lineageBonusData.sources;
    const bonusAttributeSourcesTooltip = lineageBonusData.sources.map(s => `${s.name} (+${s.points})`).join(", ");

    // Milestone text
    const lineageMilestones = parseLineageMilestones(selectedLineage);

    // Selected Background Data
    const selectedBackground = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    if (selectedBackground && !selectedBackground._cachedParsed) {
      selectedBackground._cachedParsed = parseBackgroundData(selectedBackground);
    }
    const parsedBackground = selectedBackground ? selectedBackground._cachedParsed : null;
    const encouragedTag = (parsedBackground?.encouragedProfessions?.tag || "").trim().toLowerCase();

    // Backgrounds with No Professional Experience (e.g. Urchin) do not choose a profession at level 1
    if (parsedBackground?.hasNoProfession) {
      this.data.selectedProfessionId = null;
      this.data.professionConfirmed = true;
    }

    // Helper to evaluate if profession is encouraged by background
    const isEncouragedProfession = (profession) => {
      if (!parsedBackground || !this.data.backgroundConfirmed) return false;
      return this._isProfessionEncouraged(profession, parsedBackground);
    };

    // Professions sorted: only build full list on Step 4!
    const availableProfessions = (this.currentStep === 4 && parsedBackground && this.data.backgroundConfirmed)
      ? this.data.professions.map(profession => {
          const isEncouraged = isEncouragedProfession(profession);
          const pId = profession.id || profession._id;
          if (!profession._cachedParsed) profession._cachedParsed = parseProfessionData(profession);
          if (!profession._cachedImg) profession._cachedImg = resolveItemIcon(profession, profession.img, "profession");
          const parsed = profession._cachedParsed;
          return {
            id: pId,
            _id: pId,
            name: profession.name,
            displayName: parsed.name || profession.name.replace(/\s*profession$/i, "").trim(),
            img: profession._cachedImg,
            system: profession.system,
            isEncouraged,
            parsed,
          };
        }).sort((a, b) => (b.isEncouraged ? 1 : 0) - (a.isEncouraged ? 1 : 0))
      : [];

    // Selected Profession Data
    const selectedProfession = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    if (selectedProfession && !selectedProfession._cachedParsed) {
      selectedProfession._cachedParsed = parseProfessionData(selectedProfession);
    }
    const parsedProfession = selectedProfession ? selectedProfession._cachedParsed : null;
    if (parsedProfession?.startingGear) {
      for (const gear of parsedProfession.startingGear) {
        if (!gear.img) gear.img = resolveEquipmentIcon(gear.name, null, "gear");
      }
    }
    const professionRankItems = (this.currentStep === 4 && selectedProfession)
      ? (this.data.allBopsDocs || []).filter(item => String(item.name || "").toLowerCase().startsWith(`${selectedProfession.name.toLowerCase().replace(/ profession$/, "")}: rank 1`))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    // Knave dual-profession: second profession
    const isDualProfession = Boolean(parsedBackground?.dualProfession);
    const availableProfessions2 = (this.currentStep === 4 && isDualProfession && this.data.backgroundConfirmed)
      ? availableProfessions.filter(p => p.id !== this.data.selectedProfessionId)
      : [];
    const selectedProfession2 = isDualProfession
      ? this.data.professions.find(p => p.id === this.data.selectedProfessionId2)
      : null;
    if (selectedProfession2 && !selectedProfession2._cachedParsed) {
      selectedProfession2._cachedParsed = parseProfessionData(selectedProfession2);
    }
    const parsedProfession2 = selectedProfession2 ? selectedProfession2._cachedParsed : null;
    if (parsedProfession2?.startingGear) {
      for (const gear of parsedProfession2.startingGear) {
        if (!gear.img) gear.img = resolveEquipmentIcon(gear.name, null, "gear");
      }
    }
    const professionRankItems2 = (this.currentStep === 4 && selectedProfession2)
      ? (this.data.allBopsDocs || []).filter(item => String(item.name || "").toLowerCase().startsWith(`${selectedProfession2.name.toLowerCase().replace(/ profession$/, "")}: rank 1`))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    // Search filter helper
    const matchesSearch = (document, query) => {
      if (!query) return true;
      if (!document._cachedSearchText) {
        document._cachedSearchText = `${document?.name || ""} ${document?.system?.description?.value || document?.system?.description || document?.description || ""}`
          .replace(/<[^>]+>/g, " ").toLowerCase();
      }
      return document._cachedSearchText.includes(query.trim().toLowerCase());
    };

    const filteredLineages = this.currentStep === 1
      ? this.data.lineages.filter(item => matchesSearch(item, this.data.searches.lineage))
      : [];
    const filteredBackgrounds = this.currentStep === 4
      ? this.data.backgrounds
          .map(bg => {
            const bgId = bg.id || bg._id;
            if (!bg._cachedImg) bg._cachedImg = resolveItemIcon(bg, bg.img, "background");
            return {
              id: bgId,
              _id: bgId,
              name: bg.name,
              img: bg._cachedImg,
              system: bg.system,
              _cachedSearchText: bg._cachedSearchText,
            };
          })
          .filter(item => matchesSearch(item, this.data.searches.background))
      : [];
    const filteredProfessions = this.currentStep === 4
      ? availableProfessions.filter(item => matchesSearch(item, this.data.searches.profession))
      : [];

    // Known features/talents for prerequisite checking in Step 5
    const knownItemsForPrereq = [
      selectedLineage,
      ...activeStartingFeatures,
      ...selectedUniqueFeatures,
      selectedBackground,
      selectedProfession,
    ].filter(Boolean);

    // Selected Talent Data
    const selectedTalent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
    if (selectedTalent && !selectedTalent._cachedParsed) {
      selectedTalent._cachedParsed = parseTalentData(selectedTalent);
    }
    const parsedTalent = selectedTalent ? selectedTalent._cachedParsed : null;

    // Only build Step 5 talent stacks, extra talents, and spell lists when on Step 5!
    let talentGroups = [];
    let filteredTalentGroups = [];
    let extraTalentOptions = [];
    let filteredSpells = [];

    if (this.currentStep === 5) {
      if (!this._groupedTalents) {
        this._groupedTalents = groupTalentsByStack(this.data.talents);
      }

      const talentStacks = this._groupedTalents
        .map(stack => ({
          stackName: stack.stackName,
          stackKey: stack.stackKey,
          items: stack.talents
            .map(t => {
              const avail = checkTalentAvailability(t, knownItemsForPrereq, {
                effectiveLevel: 1,
                attributes: this.data.attributes,
              });
              if (!avail.isAvailable) return null;

              if (!t._cachedParsed) t._cachedParsed = parseTalentData(t);
              if (!t._cachedImg) t._cachedImg = resolveItemIcon(t, t.img, "talent");
              if (t._cachedShortDesc === undefined) {
                const descRaw = t.system?.description?.value ?? t.system?.description ?? "";
                const descClean = descRaw.replace(/<[^>]+>/g, " ").trim();
                t._cachedDescRaw = descRaw;
                t._cachedShortDesc = descClean.length > 135 ? descClean.substring(0, 132) + "..." : descClean;
              }

              return {
                id: t.id,
                name: t.name,
                img: t._cachedImg,
                description: t._cachedDescRaw,
                shortDesc: t._cachedShortDesc,
                isAvailable: true,
                missingPrereqs: avail.missingPrereqs,
                prereqTooltip: avail.prereqTooltip,
                parsed: t._cachedParsed,
                _cachedSearchText: t._cachedSearchText,
              };
            })
            .filter(Boolean),
        }))
        .filter(stack => stack.items.length > 0);

      talentGroups = [
        {
          categoryKey: "specialization",
          categoryTitle: "Specialization Stacks",
          label: "Specialization Stacks",
          categoryIcon: "fas fa-shield-halved",
          stacks: talentStacks.filter(s => !s.stackKey.includes("magic")),
        },
        {
          categoryKey: "magic",
          categoryTitle: "Magic Entry Stacks",
          label: "Magic Entry Stacks",
          categoryIcon: "fas fa-wand-magic-sparkles",
          stacks: talentStacks.filter(s => s.stackKey.includes("magic")),
        },
      ].filter(g => g.stacks.length > 0);

      const talentQuery = this.data.searches.talent.toLowerCase().trim();
      filteredTalentGroups = talentQuery
        ? talentGroups.map(group => ({
            ...group,
            stacks: group.stacks.map(stack => ({
              ...stack,
              items: stack.items.filter(item => matchesSearch(item, talentQuery)),
            })).filter(stack => stack.items.length > 0),
          })).filter(group => group.stacks.length > 0)
        : talentGroups;

      const stackTag = (parsedTalent?.magicStackTag || "").toLowerCase().replace(/\s*magic\s*$/i, "").trim();
      const isDocOfStack = (doc, tag) => {
        if (!tag) return true;
        if (doc.type === "spell") {
          const lib = getSpellLibraryEntry(doc);
          if (lib) return lib.sourceKey === tag;
        }
        const tName = (doc.name || "").toLowerCase();
        const tDesc = (doc.system?.description?.value ?? doc.system?.description ?? "").toLowerCase();
        const tSrc = String(doc.system?.magicSource || "").toLowerCase().replace(/^mythcraft\.(item|item)\.spell\.source\./i, "");
        const tCat = String(doc.system?.category || "").toLowerCase();
        const chain = doc._folderChain || [];
        const inChain = chain.some(f => f.toLowerCase().includes(tag));
        const inTags = this._hasTag(doc.system?.tags, tag) || this._hasTag(doc.system?.tag, tag);
        return inChain || inTags || tSrc.includes(tag) || tCat.includes(tag) || tName.includes(tag) || tDesc.includes(`${tag} magic`) || tDesc.includes(`tag: ${tag}`) || tDesc.includes(`[${tag}]`);
      };

      extraTalentOptions = selectedTalent && parsedTalent?.extraStackTalents
        ? this.data.talents
            .filter(t => t.id !== selectedTalent.id && isDocOfStack(t, stackTag))
            .map(t => {
              const avail = checkTalentAvailability(t, [...knownItemsForPrereq, selectedTalent], {
                effectiveLevel: 1,
                attributes: this.data.attributes,
              });
              if (!avail.isAvailable) return null;
              if (!t._cachedImg) t._cachedImg = resolveItemIcon(t, t.img, "talent");
              return {
                id: t.id,
                name: t.name,
                img: t._cachedImg,
                isAvailable: true,
                missingPrereqs: avail.missingPrereqs,
                prereqTooltip: avail.prereqTooltip,
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];

      const rawFilteredSpells = (parsedTalent?.isMagicEntry && stackTag)
        ? this.data.availableSpells.filter(s => isDocOfStack(s, stackTag) && matchesSearch(s, this.data.searches.spell))
        : this.data.availableSpells.filter(s => matchesSearch(s, this.data.searches.spell));

      filteredSpells = rawFilteredSpells.map(s => {
        const sId = s.id || s._id;
        if (!s._cachedImg) s._cachedImg = resolveItemIcon(s, s.img, "spell");
        return {
          id: sId,
          _id: sId,
          name: s.name,
          system: s.system,
          img: s._cachedImg,
        };
      });
    }

    // Active lineage features for skill bonus parsing (deduplicated)
    const seenLineageFeatIds = new Set();
    const activeLineageFeatures = [];
    for (const f of [...(activeStartingFeatures || []), ...selectedUniqueFeatures].filter(Boolean)) {
      const k = String(f.id || f._id || f.name || "").toLowerCase().trim();
      if (k && !seenLineageFeatIds.has(k)) {
        seenLineageFeatIds.add(k);
        activeLineageFeatures.push(f);
      }
    }

    const parsedFeatureSkillData = activeLineageFeatures.map(f => parseFeatureSkillData(f));
    const lineageSkillPool = parsedFeatureSkillData.reduce((sum, f) => sum + f.points, 0);
    const lineageSkillCap = Math.max(4, ...parsedFeatureSkillData.filter(f => f.points > 0).map(f => f.perSkillCap || 4));
    const lineageSkillSourceNames = parsedFeatureSkillData.filter(f => f.points > 0).map(f => f.name).join(", ");
    const fixedLineageSkills = parsedFeatureSkillData.flatMap(f => f.fixedSkills || []);

    if (!this.data.allocatedLineageSkills) this.data.allocatedLineageSkills = {};
    const lineageSkillSpent = Object.values(this.data.allocatedLineageSkills).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const lineageSkillRemaining = lineageSkillPool - lineageSkillSpent;

    // Build merged lineage skill categories when a lineage/sublineage feature grants bonus skill points
    const lineageCategoryMap = new Map();
    for (const fData of parsedFeatureSkillData) {
      if (fData.points <= 0) continue;
      for (const cat of fData.skillCategories || []) {
        const catKey = cat.category.toLowerCase().trim();
        if (!lineageCategoryMap.has(catKey)) {
          lineageCategoryMap.set(catKey, { category: cat.category, skillsMap: new Map() });
        }
        const entry = lineageCategoryMap.get(catKey);
        for (const sk of cat.skills || []) {
          const skKey = sk.name.toLowerCase().trim();
          if (!entry.skillsMap.has(skKey)) {
            entry.skillsMap.set(skKey, {
              ...sk,
              cap: fData.perSkillCap || lineageSkillCap,
              value: Number(this.data.allocatedLineageSkills[sk.name] ?? 0),
            });
          }
        }
      }
    }
    const lineageSkillCategories = Array.from(lineageCategoryMap.values()).map(c => ({
      category: c.category,
      skills: Array.from(c.skillsMap.values()),
    }));

    // Background skill allocator calculations (strictly tied to BACKGROUND_CANON_DATA)
    const backgroundSkillSpent = Object.values(this.data.allocatedSkills).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const backgroundSkillPool = parsedBackground?.skillPoints ?? 12;
    const backgroundSkillRemaining = backgroundSkillPool - backgroundSkillSpent;
    const effectivePerSkillCap = parsedBackground?.perSkillCap ?? 4;
    const backgroundTaggedCaps = parsedBackground?.taggedCaps
      ? Object.entries(parsedBackground.taggedCaps).map(([tagKey, capVal]) => ({
          tag: tagKey.charAt(0).toUpperCase() + tagKey.slice(1),
          cap: capVal,
        }))
      : [];

    // Decorate parsedBackground.skillCategories with strict background per-skill caps and current allocated values
    if (parsedBackground?.skillCategories) {
      for (const cat of parsedBackground.skillCategories) {
        for (const sk of cat.skills) {
          sk.isFeatureBonus = false;
          sk.cap = getBackgroundSkillCap(parsedBackground, sk.name, cat.category);
          sk.value = Number(this.data.allocatedSkills[sk.name] ?? 0);
        }
      }
    }

    const hpData = getEnduranceThreshold(this.data.attributes.end || 0);
    const setHpValue = 10 + 1 + (1 * hpData.setHp);
    const calculatedAp = calculateApMax(Number(this.data.attributes.cor) || 0);

    const allocatedSkillsList = Object.entries(this.data.allocatedSkills || {})
      .filter(([, pts]) => Number(pts) > 0)
      .map(([name, value]) => ({ name, value: Number(value) }));

    const allocatedLineageSkillsList = Object.entries(this.data.allocatedLineageSkills || {})
      .filter(([, pts]) => Number(pts) > 0)
      .map(([name, value]) => ({ name, value: Number(value) }));

    const selectedExtraTalents = (this.data.selectedExtraTalentIds || [])
      .map(id => {
        const doc = (this.data.talents || []).find(t => (t.id || t._id) === id);
        return doc ? { id: doc.id || doc._id, name: doc.name, img: resolveItemIcon(doc, doc.img, "talent") } : null;
      })
      .filter(Boolean);

    const selectedSpells = (this.data.selectedSpellIds || [])
      .map(id => {
        const doc = (this.data.availableSpells || []).find(s => (s.id || s._id) === id);
        return doc ? { id: doc.id || doc._id, name: doc.name, img: resolveItemIcon(doc, doc.img, "spell") } : null;
      })
      .filter(Boolean);

    const maxUnlockedStep = Math.max(this.maxUnlockedStep || 1, this.currentStep);
    this.maxUnlockedStep = maxUnlockedStep;
    const hierarchyProgressPct = Math.round(((this.currentStep - 1) / 5) * 100);

    return {
      actor: this.actor,
      step: this.currentStep,
      stepIndex: this.currentStep - 1,
      maxUnlockedStep,
      hierarchyProgressPct,
      calculatedAp,
      allocatedSkillsList,
      allocatedLineageSkillsList,
      selectedExtraTalents,
      selectedSpells,
      data: this.data,
      levelCap,
      attributesList,
      pool,
      bonusAttributeSourcesTooltip,
      filteredLineages,
      filteredBackgrounds,
      filteredProfessions,
      selectedLineage,
      lineageParsed,
      baseStartingFeatures: (lineageParsed.baseStartingFeatures || []).map(f => ({
        id: f.id || f._id,
        name: f.name,
        img: resolveItemIcon(f, f.img, "feature"),
        description: f.system?.description?.value ?? f.system?.description ?? "",
      })),
      sublineages: (lineageParsed.sublineages || []).map(s => ({
        ...s,
        isSelected: s.name === this.data.selectedSublineageName,
        features: (s.features || []).map(f => ({
          id: f.id || f._id,
          name: f.name,
          img: resolveItemIcon(f, f.img, "feature"),
          description: f.system?.description?.value ?? f.system?.description ?? "",
        })),
      })),
      selectedSublineage: selectedSublineage ? {
        ...selectedSublineage,
        features: (selectedSublineage.features || []).map(f => ({
          id: f.id || f._id,
          name: f.name,
          img: resolveItemIcon(f, f.img, "feature"),
          description: f.system?.description?.value ?? f.system?.description ?? "",
        })),
      } : null,
      choiceGroups: choiceGroupsWithState,
      selectedChoiceFeatures,
      lineageStartingFeatures: activeStartingFeatures,
      activeStartingFeatures,
      uniqueFeatures: lineageUniqueFeatures,
      lineageUniqueFeatures,
      eligibleUniqueFeatures: lineageUniqueFeatures.filter(f => f.isAvailable),
      selectedUniqueFeatures,
      selectedFeature: selectedUniqueFeatures[0] || null,
      hasSublineages: (lineageParsed.sublineages || []).length > 0,
      hasChoiceGroups: choiceGroupsWithState.length > 0,
      hasUniqueFeatures: lineageUniqueFeatures.length > 0 && uniqueCount > 0,
      uniqueCount,
      uniqueFeaturesRemaining: Math.max(0, uniqueCount - (this.data.selectedUniqueFeatureIds || []).length),
      lineageMilestones,
      selectedBackground,
      parsedBackground,
      backgroundSkillSpent,
      backgroundSkillPool,
      backgroundSkillRemaining,
      effectivePerSkillCap,
      backgroundTaggedCaps,
      lineageSkillPool,
      lineageSkillCap,
      lineageSkillSpent,
      lineageSkillRemaining,
      lineageSkillSourceNames,
      lineageSkillCategories,
      fixedLineageSkills,
      availableProfessions,
      selectedProfession,
      parsedProfession,
      professionRankItems,
      isDualProfession,
      availableProfessions2,
      selectedProfession2,
      parsedProfession2,
      professionRankItems2,
      selectedTalent,
      parsedTalent,
      talentGroups,
      filteredTalentGroups,
      extraTalentOptions,
      filteredSpells,
      magicAttributeOptions: getMagicAttributeOptions(this.data.magicAttribute),
      hpData,
      setHpValue,
      isLastStep: this.currentStep === 6,
      ccxEnabled: Boolean(getSetting("ccxEnabled", true)),
      ccxSoundEnabled: Boolean(getSetting("ccxSoundEnabled", true)),
      astralConstellationSvg: buildAstralConstellationSvg(
        this.currentStep,
        Math.max(this.maxUnlockedStep || 1, this.currentStep),
        ["Lineage", "Attributes", "Stats & HP", "Past & Calling", "Talents & Magic", "Character Overview"]
      ),
      attributeRadarSvg: (this.currentStep === 2 || this.currentStep === 3 || this.currentStep === 6)
        ? buildAttributeRadarSvg(attributesList, levelCap)
        : "",
    };
  }

  /** @inheritdoc */
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    try {
      const ccxEnabled = Boolean(getSetting("ccxEnabled", true));
      if (ccxEnabled) {
        const vw = Math.max(1024, (globalThis.innerWidth || 1600) - 24);
        const vh = Math.max(700, (globalThis.innerHeight || 960) - 24);
        this.setPosition({
          width: vw,
          height: vh,
          left: 12,
          top: 12,
        });
      } else {
        this.setPosition({
          width: 960,
          height: 780,
        });
      }
    } catch (_) {}
  }

  /** @inheritdoc */
  _preRender(context, options) {
    if (!this._savedScrolls) this._savedScrolls = new Map();
    if (this.element) {
      const scrollEls = this.element.querySelectorAll(".wizard-body-content, .wizard-step-panel, .ccx-stage-scroll, .ccx-hierarchy-scroll, .skill-categories-allocator, .bops-selection-grid, .lineage-selection-grid");
      for (const el of scrollEls) {
        const key = el.dataset.stage ? `stage-${el.dataset.stage}` : el.className;
        this._savedScrolls.set(key, el.scrollTop);
      }

      // If switching stages, snapshot the outgoing stage slide for a smooth horizontal pan
      if ((this._lastStep || this.currentStep) !== this.currentStep) {
        const curSlide = this.element.querySelector(".ccx-stage-slide.is-active");
        if (curSlide) {
          this._outgoingStageClone = curSlide.cloneNode(true);
          this._outgoingStageClone.classList.remove("is-active");
          this._outgoingStageClone.classList.add("is-outgoing-clone");
          this._outgoingStageClone.setAttribute("aria-hidden", "true");
        }
      }
    }
    return super._preRender?.(context, options);
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender?.(context, options);

    // Initialize 60fps Particle Canvas & 3D Holographic Card / Sound effects
    if (this.element) {
      this._particleSystem = setupCcxParticles(this.element);
      attachCcxInteractiveEffects(this.element, this._particleSystem);
    }

    // Smooth camera pan transition ONLY when switching stages
    const track = this.element?.querySelector(".ccx-camera-track");
    const prevIdx = (this._lastStep || this.currentStep) - 1;
    const nextIdx = this.currentStep - 1;
    if (track && prevIdx !== nextIdx) {
      const usePan = Boolean(getSetting("ccxEnabled", true)) && Boolean(getSetting("ccxConstellationPan", true));
      CcxSound.playStagePan();
      triggerStageCalloutBanner(this.element, this.currentStep);
      const outgoing = this._outgoingStageClone;
      this._outgoingStageClone = null;

      if (usePan && outgoing) {
        const goingForward = nextIdx > prevIdx;
        if (goingForward) {
          track.insertBefore(outgoing, track.firstChild);
          track.style.transition = "none";
          track.style.transform = "translate3d(0%, 0, 0)";
          void track.offsetWidth;
          track.style.transition = "transform 0.56s cubic-bezier(0.22, 1, 0.36, 1)";
          track.style.transform = "translate3d(-100%, 0, 0)";
        } else {
          track.appendChild(outgoing);
          track.style.transition = "none";
          track.style.transform = "translate3d(-100%, 0, 0)";
          void track.offsetWidth;
          track.style.transition = "transform 0.56s cubic-bezier(0.22, 1, 0.36, 1)";
          track.style.transform = "translate3d(0%, 0, 0)";
        }
        setTimeout(() => {
          if (outgoing.isConnected) outgoing.remove();
          if (track.isConnected) {
            track.style.transition = "none";
            track.style.transform = "none";
          }
        }, 580);
      }

      this._lastStep = this.currentStep;

      // Auto-scroll active hierarchy node into view inside the left hierarchy map
      const activeNode = this.element?.querySelector(`.ccx-h-node[data-step="${this.currentStep}"]`);
      if (activeNode) {
        activeNode.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      this._outgoingStageClone = null;
    }

    // Restore scroll positions
    if (this._savedScrolls && this.element) {
      const scrollEls = this.element.querySelectorAll(".wizard-body-content, .wizard-step-panel, .ccx-stage-scroll, .ccx-hierarchy-scroll, .skill-categories-allocator, .bops-selection-grid, .lineage-selection-grid");
      for (const el of scrollEls) {
        const key = el.dataset.stage ? `stage-${el.dataset.stage}` : el.className;
        if (this._savedScrolls.has(key)) {
          el.scrollTop = this._savedScrolls.get(key);
        }
      }
    }

    // If a sub-section pan was requested (e.g. confirming background or selecting lineage/profession), smoothly pan to it
    if (this._pendingPanSelector && this.element) {
      const sel = this._pendingPanSelector;
      this._pendingPanSelector = null;
      requestAnimationFrame(() => {
        const targetEl = this.element?.querySelector(sel);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    // Setup responsive live search listeners (debounced so typing never stutters on low-end CPUs)
    const searchInputs = this.element.querySelectorAll("input.wizard-search-input");
    searchInputs.forEach(input => {
      const searchKey = input.dataset.search;
      if (!searchKey) return;

      input.addEventListener("input", e => {
        this.data.searches[searchKey] = e.target.value;
        const cursorPos = e.target.selectionStart;
        if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
        this._searchDebounceTimer = setTimeout(() => {
          this.render();
          setTimeout(() => {
            const freshInput = this.element?.querySelector(`input.wizard-search-input[data-search="${searchKey}"]`);
            if (freshInput) {
              freshInput.focus();
              try { freshInput.setSelectionRange(cursorPos, cursorPos); } catch (_) {}
            }
          }, 16);
        }, 140);
      });
    });

    // Sublineage select change listener
    const sublineageSelect = this.element.querySelector(".lineage-sublineage-select");
    if (sublineageSelect) {
      sublineageSelect.addEventListener("change", e => {
        this.data.selectedSublineageName = e.target.value || null;
        this.data.allocatedLineageSkills = {};
        this.render();
      });
    }

    // Choice groups select change listeners (e.g. Golem Primary Material & Life Source)
    const choiceSelects = this.element.querySelectorAll(".lineage-choice-select");
    choiceSelects.forEach(select => {
      select.addEventListener("change", e => {
        const groupKey = select.dataset.groupKey;
        if (!groupKey) return;
        if (!this.data.selectedLineageChoices) this.data.selectedLineageChoices = {};
        if (select.value) {
          this.data.selectedLineageChoices[groupKey] = select.value;
        } else {
          delete this.data.selectedLineageChoices[groupKey];
        }
        this.data.allocatedLineageSkills = {};
        this.render();
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

  /** @inheritdoc */
  _onClose(options) {
    if (this._searchDebounceTimer) clearTimeout(this._searchDebounceTimer);
    this._particleSystem?.destroy?.();
    this._particleSystem = null;
    return super._onClose?.(options);
  }

  _hasTag(rawTags, target) {
    if (!rawTags || !target) return false;
    const tgt = String(target).toLowerCase().trim();
    if (typeof rawTags === "string") {
      return rawTags.toLowerCase().split(/[,\s]+/).includes(tgt);
    }
    const values = Array.isArray(rawTags) ? rawTags : rawTags instanceof Set ? Array.from(rawTags) : typeof rawTags === "object" ? Object.values(rawTags) : [rawTags];
    return values.some(tag => {
      if (!tag) return false;
      if (typeof tag === "string") return tag.toLowerCase().trim() === tgt;
      return String(tag?.name || tag?.label || tag?.id || tag?.value || tag).toLowerCase().trim() === tgt;
    });
  }

  _isProfessionEncouraged(profession, parsedBackground) {
    if (!profession || !parsedBackground) return false;
    const pName = (profession.name || "").toLowerCase().replace(/ profession$/i, "").trim();

    // 0. Static library matching by background name or parsed background
    const bgName = String(this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId)?.name || "").toLowerCase().replace(/ background$/i, "").trim();
    const libEntry = BACKGROUND_ENCOURAGED_PROFESSIONS[bgName] || (parsedBackground?.encouragedProfessions?.tag ? Object.values(BACKGROUND_ENCOURAGED_PROFESSIONS).find(e => e.tag === parsedBackground.encouragedProfessions.tag) : null);
    if (libEntry) {
      if (libEntry.professions.has(pName)) return true;
      for (const p of libEntry.professions) {
        if (pName === p || pName.includes(p) || p.includes(pName)) return true;
      }
    }

    const tag = (parsedBackground?.encouragedProfessions?.tag || "").trim().toLowerCase();
    const pDesc = String(profession.system?.description?.value ?? profession.system?.description ?? "").toLowerCase();

    // 1. Tag match in system fields
    if (tag) {
      if (this._hasTag(profession.system?.tags, tag) ||
          this._hasTag(profession.system?.tag, tag) ||
          this._hasTag(profession.system?.occupationTag, tag) ||
          this._hasTag(profession.system?.occupation?.tag, tag)) {
        return true;
      }

      // 2. Tag match in name or description
      if (pName.includes(tag)) return true;
      if (pDesc.includes(`tag: ${tag}`) || pDesc.includes(`tags: ${tag}`) ||
          pDesc.includes(`[${tag}]`) || pDesc.includes(`${tag} tag`) ||
          pDesc.includes(`<strong>${tag}</strong>`) ||
          pDesc.includes(`tag</strong>: ${tag}`) ||
          pDesc.includes(`tag:</strong> ${tag}`) ||
          pDesc.includes(`tag: <em>${tag}</em>`)) {
        return true;
      }
    }

    // 3. Explicit UUID or name matches in background description
    const rawUuids = parsedBackground?.encouragedProfessions?.rawProfessionUuids || [];
    for (const ref of rawUuids) {
      const refName = (ref.name || "").toLowerCase().replace(/ profession$/i, "").trim();
      if (refName && (refName === pName || pName.includes(refName) || refName.includes(pName))) return true;
      if (ref.uuid && (ref.uuid.includes(profession.id) || (profession._id && ref.uuid.includes(profession._id)))) return true;
    }

    return false;
  }

  _getBaseAttributePool() {
    const coreKeys = new Set(["str", "dex", "end", "awr", "int", "cha", "lck", "cor"]);
    const customKeys = Object.keys(this.data.attributes).filter(k => !coreKeys.has(k.toLowerCase()));
    return 5 + customKeys.length;
  }

  static _toggleCardExpand(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const card = target.closest(".wizard-selection-card, .bops-item-card, .talent-choice-card, .feature-detail-card");
    const cardId = card?.dataset.cardId;
    if (!cardId) return;
    if (this.data.expandedCardIds.has(cardId)) this.data.expandedCardIds.delete(cardId);
    else this.data.expandedCardIds.add(cardId);
    this.render();
  }

  static _setSearch(event, target) {
    const key = target.dataset.search;
    if (!key) return;
    this.data.searches[key] = target.value || "";
    this.render();
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static _onNextStep(event, target) {
    // Step validation checks
    if (this.currentStep === 1) {
      if (!this.data.selectedLineageId) {
        ui.notifications.warn("Please select a Lineage before proceeding.");
        return;
      }
      const selectedLineage = this.data.lineages.find(l => l.id === this.data.selectedLineageId);
      const lineageParsed = resolveLineageFeatures(selectedLineage, this.data.allLineageDocs || []);

      if (lineageParsed.sublineages.length > 0 && !this.data.selectedSublineageName) {
        ui.notifications.warn("Please choose a Sublineage before proceeding.");
        return;
      }
      for (const group of lineageParsed.choiceGroups) {
        if (!this.data.selectedLineageChoices?.[group.key]) {
          ui.notifications.warn(`Please choose an option for ${group.name} before proceeding.`);
          return;
        }
      }
      if (lineageParsed.uniqueCount > 0) {
        const selCount = (this.data.selectedUniqueFeatureIds || []).length;
        if (selCount < lineageParsed.uniqueCount) {
          ui.notifications.warn(`Please select ${lineageParsed.uniqueCount} Unique Feature${lineageParsed.uniqueCount > 1 ? "s" : ""} before proceeding.`);
          return;
        }
      }
    }

    if (this.currentStep === 2) {
      const basePool = this._getBaseAttributePool();
      const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, basePool);
      if (pool.remaining < 0) {
        ui.notifications.warn("You have allocated more attribute points than available. Please adjust before proceeding.");
        return;
      }
    }

    if (this.currentStep === 4) {
      // For Knave (dual profession), both professions must be confirmed
      const bg = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
      const parsedBg = bg ? parseBackgroundData(bg) : null;
      if (parsedBg?.dualProfession) {
        if (!this.data.professionConfirmed) {
          ui.notifications.warn("Please select and confirm your first profession before proceeding.");
          return;
        }
        if (!this.data.professionConfirmed2) {
          ui.notifications.warn("The Knave background allows two professions. Please select and confirm your second profession before proceeding.");
          return;
        }
      }
    }

    if (this.currentStep === 5) {
      if (!this.data.selectedTalentId) {
        ui.notifications.warn("Please select a starting talent before proceeding.");
        return;
      }
      const talent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
      const parsed = talent ? parseTalentData(talent) : null;
      if (parsed?.extraStackTalents > 0) {
        const selectedCount = (this.data.selectedExtraTalentIds || []).length;
        if (selectedCount < parsed.extraStackTalents) {
          const stackLabel = (parsed.magicStackTag || "magic").toUpperCase();
          ui.notifications.warn(`Please select ${parsed.extraStackTalents} additional talents from the ${stackLabel} stack before proceeding (${selectedCount}/${parsed.extraStackTalents} selected).`);
          return;
        }
      }
    }

    if (this.currentStep < 6) {
      this._lastStep = this.currentStep;
      this.currentStep++;
      this.maxUnlockedStep = Math.max(this.maxUnlockedStep || 1, this.currentStep);
      this.render();
    }
  }

  static _onPrevStep(event, target) {
    if (this.currentStep > 1) {
      this._lastStep = this.currentStep;
      this.currentStep--;
      this.render();
    }
  }

  static _onJumpToStep(event, target) {
    const targetStep = parseInt(target.dataset.step || target.closest("[data-step]")?.dataset.step, 10);
    if (!targetStep || targetStep === this.currentStep) return;

    // Allow jumping backwards freely, or jumping forward up to maxUnlockedStep (or 1 step ahead after validating current)
    if (targetStep < this.currentStep || targetStep <= (this.maxUnlockedStep || 1)) {
      this._lastStep = this.currentStep;
      this.currentStep = targetStep;
      this.render();
      return;
    }

    // If clicking the immediate next step in the hierarchy, run _onNextStep validation
    if (targetStep === this.currentStep + 1) {
      CharacterCreationWizard._onNextStep.call(this, event, target);
    } else {
      ui.notifications.info("Complete and confirm the current stage to unlock later stages in your build hierarchy.");
    }
  }

  static _onSelectLineage(event, target) {
    const id = target.dataset.lineageId;
    this.data.selectedLineageId = id;
    this.data.expandedCardIds.add(id);
    this.data.selectedSublineageName = null;
    this.data.selectedLineageChoices = {};
    this.data.selectedUniqueFeatureIds = [];
    this.data.selectedFeatureId = null;
    this.data.allocatedLineageSkills = {};
    this._pendingPanSelector = ".lineage-detail-box";
    this.render();
  }

  static _onSelectSublineage(event, target) {
    const val = target.value ?? target.dataset.sublineage;
    this.data.selectedSublineageName = val || null;
    this.data.allocatedLineageSkills = {};
    this.render();
  }

  static _onSelectLineageChoice(event, target) {
    const groupKey = target.dataset.groupKey;
    if (!groupKey) return;
    const val = target.value ?? target.dataset.choiceId;
    if (!this.data.selectedLineageChoices) this.data.selectedLineageChoices = {};
    if (val) {
      this.data.selectedLineageChoices[groupKey] = val;
    } else {
      delete this.data.selectedLineageChoices[groupKey];
    }
    this.data.allocatedLineageSkills = {};
    this.render();
  }

  static _onSelectLineageFeature(event, target) {
    const id = target.dataset.featureId || target.value;
    if (!id) return;

    const selectedLineage = this.data.lineages.find(l => l.id === this.data.selectedLineageId);
    const featureDoc = (this.data.allLineageDocs || []).find(d => (d.id || d._id) === id);
    if (featureDoc) {
      const avail = checkTalentAvailability(featureDoc, [selectedLineage, ...(this.data.lineageStartingFeatures || [])]);
      if (!avail.isAvailable) {
        ui.notifications.warn(avail.prereqTooltip || "Prerequisites not met for this feature.");
        return;
      }
    }

    const maxCount = Number(target.dataset.maxCount) || this.data.lineageUniqueCount || 1;
    let current = Array.isArray(this.data.selectedUniqueFeatureIds) ? [...this.data.selectedUniqueFeatureIds] : [];
    if (current.includes(id)) {
      current = current.filter(x => x !== id);
    } else {
      if (current.length >= maxCount) {
        if (maxCount === 1) {
          current = [id];
        } else {
          ui.notifications.warn(`You may only select ${maxCount} unique feature${maxCount > 1 ? "s" : ""}.`);
          return;
        }
      } else {
        current.push(id);
      }
    }
    this.data.selectedUniqueFeatureIds = current;
    this.data.selectedFeatureId = current[0] || null;
    this.data.allocatedLineageSkills = {};
    this.render();
  }

  static async _onViewTalent(event, target) {
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

  static _onAdjustAttribute(event, target) {
    const attr = target.dataset.attr;
    const delta = parseInt(target.dataset.delta, 10);
    const cur = Number(this.data.attributes[attr] ?? 0);
    const levelCap = getAttributeLevelCap(1);

    const next = cur + delta;
    if (delta > 0) {
      const basePool = this._getBaseAttributePool();
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

  static _onSetHpMode(event, target) {
    this.data.hpMode = target.dataset.mode;
    this.render();
  }

  static _onSelectBackground(event, target) {
    const bgId = target.dataset.backgroundId || target.closest("[data-background-id]")?.dataset.backgroundId;
    const cardId = target.dataset.cardId || target.closest("[data-card-id]")?.dataset.cardId;
    this.data.selectedBackgroundId = bgId;
    if (cardId) this.data.expandedCardIds.add(cardId);
    this.data.allocatedSkills = {};
    this.data.backgroundConfirmed = Boolean(bgId);
    this.data.selectedProfessionId = null;
    this.data.professionConfirmed = false;
    this.data.selectedProfessionId2 = null;
    this.data.professionConfirmed2 = false;
    this.data.selectedProfessionSkills2 = [];
    this.render();
  }

  static _onConfirmBackground(event, target) {
    event.preventDefault();
    this.data.backgroundConfirmed = Boolean(this.data.selectedBackgroundId);
    this._pendingPanSelector = ".skill-allocator-stage";
    this.render();
  }

  static _onAdjustSkill(event, target) {
    const skill = target.dataset.skill;
    const category = target.dataset.category || "";
    const delta = parseInt(target.dataset.delta, 10);
    const cur = Number(this.data.allocatedSkills[skill] ?? 0);
    const next = Math.max(0, cur + delta);

    const bg = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    const parsed = bg ? parseBackgroundData(bg) : null;
    const cap = getBackgroundSkillCap(parsed, skill, category);
    const maxPool = parsed?.skillPoints ?? 12;

    if (delta > 0) {
      const currentSpent = Object.values(this.data.allocatedSkills).reduce((sum, v) => sum + (Number(v) || 0), 0);
      if (currentSpent >= maxPool) {
        ui.notifications.warn(`You have already spent all ${maxPool} available background skill points.`);
        return;
      }
      if (next > cap) {
        ui.notifications.warn(`"${skill}" is limited to a maximum of +${cap} points for your background.`);
        return;
      }
    }

    this.data.allocatedSkills[skill] = next;
    this.render();
  }

  static _onAdjustLineageSkill(event, target) {
    const skill = target.dataset.skill;
    const delta = parseInt(target.dataset.delta, 10);
    if (!this.data.allocatedLineageSkills) this.data.allocatedLineageSkills = {};
    const cur = Number(this.data.allocatedLineageSkills[skill] ?? 0);
    const next = Math.max(0, cur + delta);

    const rawActiveFeatures = [
      ...(this.data.lineageStartingFeatures || []),
      ...((this.data.selectedUniqueFeatureIds || []).map(id => (this.data.allLineageDocs || []).find(f => (f.id || f._id) === id))),
    ].filter(Boolean);
    const seenIds = new Set();
    const activeLineageFeatures = rawActiveFeatures.filter(f => {
      const id = f.id || f._id || f.name;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    const parsedFeatureSkillData = activeLineageFeatures.map(f => parseFeatureSkillData(f)).filter(f => f.points > 0);
    const maxPool = parsedFeatureSkillData.reduce((sum, f) => sum + f.points, 0);
    const cap = Math.max(4, ...parsedFeatureSkillData.map(f => f.perSkillCap || 4));

    if (delta > 0) {
      const currentSpent = Object.values(this.data.allocatedLineageSkills).reduce((sum, v) => sum + (Number(v) || 0), 0);
      if (currentSpent >= maxPool) {
        ui.notifications.warn(`You have already spent all ${maxPool} available lineage feature skill points.`);
        return;
      }
      if (next > cap) {
        ui.notifications.warn(`"${skill}" is limited to a maximum of +${cap} points from your lineage feature.`);
        return;
      }
    }

    this.data.allocatedLineageSkills[skill] = next;
    this.render();
  }

  static _onSetWealthMode(event, target) {
    this.data.wealthMode = target.dataset.mode;
    this.render();
  }

  static _onSelectProfession(event, target) {
    if (!this.data.selectedBackgroundId) return;
    const profId = target.dataset.professionId || target.closest("[data-profession-id]")?.dataset.professionId;
    const cardId = target.dataset.cardId || target.closest("[data-card-id]")?.dataset.cardId;
    this.data.selectedProfessionId = profId;
    if (cardId) this.data.expandedCardIds.add(cardId);
    this.data.selectedProfessionSkills = [];
    this.data.professionConfirmed = Boolean(profId);
    this._pendingPanSelector = ".profession-detail-subpanel";
    this.render();
  }

  static _onConfirmProfession(event, target) {
    event.preventDefault();
    this.data.professionConfirmed = Boolean(this.data.selectedProfessionId);
    this._pendingPanSelector = ".profession-detail-subpanel";
    this.render();
  }

  static _onToggleProfessionSkill(event, target) {
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

  // ── Knave dual-profession handlers ──────────────────────────────────────────

  static _onSelectProfession2(event, target) {
    if (!this.data.selectedBackgroundId) return;
    const id = target.dataset.professionId || target.closest("[data-profession-id]")?.dataset.professionId;
    const cardId = target.dataset.cardId || target.closest("[data-card-id]")?.dataset.cardId;
    // Must differ from the first profession
    if (id === this.data.selectedProfessionId) {
      ui.notifications.warn("Your second profession must be different from your first.");
      return;
    }
    this.data.selectedProfessionId2 = id;
    if (cardId) this.data.expandedCardIds.add(cardId);
    this.data.selectedProfessionSkills2 = [];
    this.data.professionConfirmed2 = Boolean(id);
    this.render();
  }

  static _onConfirmProfession2(event, target) {
    event.preventDefault();
    this.data.professionConfirmed2 = Boolean(this.data.selectedProfessionId2);
    this.render();
  }

  static _onToggleProfessionSkill2(event, target) {
    const skillName = target.dataset.skill;
    const prof = this.data.professions.find(p => p.id === this.data.selectedProfessionId2);
    const parsed = prof ? parseProfessionData(prof) : null;
    const maxChoices = parsed?.choiceSkills?.count ?? 0;

    const idx = this.data.selectedProfessionSkills2.indexOf(skillName);
    if (idx >= 0) {
      this.data.selectedProfessionSkills2.splice(idx, 1);
    } else {
      if (this.data.selectedProfessionSkills2.length >= maxChoices) {
        ui.notifications.warn(`You may only select ${maxChoices} choice skills.`);
        return;
      }
      this.data.selectedProfessionSkills2.push(skillName);
    }
    this.render();
  }

  static _onSelectTalent(event, target) {
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
    this._pendingPanSelector = ".talent-detail-box";
    this.render();
  }

  static _onToggleExtraTalent(event, target) {
    const id = target.dataset.talentId;
    const talent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
    const parsed = talent ? parseTalentData(talent) : null;
    const maxExtra = parsed?.extraStackTalents ?? 2;

    const idx = this.data.selectedExtraTalentIds.indexOf(id);
    if (idx >= 0) {
      this.data.selectedExtraTalentIds.splice(idx, 1);
    } else {
      const extraItem = this.data.talents.find(t => t.id === id);
      if (extraItem && talent) {
        const avail = checkTalentAvailability(extraItem, [talent]);
        if (!avail.isAvailable) {
          ui.notifications.warn(avail.prereqTooltip || "Prerequisites not met for this talent.");
          return;
        }
      }

      if (this.data.selectedExtraTalentIds.length >= maxExtra) {
        ui.notifications.warn(`You may only select ${maxExtra} extra talents.`);
        return;
      }
      this.data.selectedExtraTalentIds.push(id);
    }
    this.render();
  }

  static _onToggleSpell(event, target) {
    const id = target.dataset.spellId;
    const idx = this.data.selectedSpellIds.indexOf(id);
    if (idx >= 0) {
      this.data.selectedSpellIds.splice(idx, 1);
    } else {
      this.data.selectedSpellIds.push(id);
    }
    this.render();
  }

  static _onSetMagicAttribute(event, target) {
    this.data.magicAttribute = target.value;
    this.render();
  }

  static async _onToggleCcxSound(event, target) {
    event.preventDefault();
    const cur = Boolean(getSetting("ccxSoundEnabled", true));
    await setSetting("ccxSoundEnabled", !cur);
    if (!cur) CcxSound.playConfirm();
    this.render();
  }

  static async _onFinalize(event, target) {
    const basePool = this._getBaseAttributePool();
    const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, basePool);
    if (pool.remaining < 0) {
      ui.notifications.error("Attribute points are over-allocated. Please correct before completing.");
      return;
    }

    const linName = this.data.lineages.find(l => l.id === this.data.selectedLineageId)?.name || "Adventurer";
    const profName = this.data.professions.find(p => p.id === this.data.selectedProfessionId)?.name || "";
    const subtitle = `Level 1 ${linName}${profName ? ` • ${profName}` : ""}`;

    await playAwakeningFinaleSequence(this.element, this.actor, "HERO AWAKENED", subtitle);
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
    // Ensure both 'luck' and 'lck' are populated for system model and module compat
    const luckVal = this.data.attributes.luck ?? this.data.attributes.lck ?? 0;
    updates["system.attributes.luck"] = luckVal;
    updates["system.attributes.lck"] = luckVal;

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

    // 1b. Action Points (AP) calculation from Coordination (COR)
    const corVal = Number(this.data.attributes.cor) || 0;
    const maxAp = calculateApMax(corVal);
    updates["system.ap.max"] = maxAp;
    updates["system.ap.value"] = maxAp;

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
      }
    }

    // Apply allocated lineage feature skill points (e.g. Wood Elf Forest Steward, High Elf Celestial Lorist)
    for (const [sName, pts] of Object.entries(this.data.allocatedLineageSkills || {})) {
      if (pts > 0) {
        const key = findSkillKey(sName);
        if (key) {
          const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? this.actor.system?.skills?.[key]?.bonus ?? 0);
          skillUpdates[`system.skills.${key}.value`] = curVal + pts;
        }
      }
    }

    // Apply fixed lineage feature skills (e.g. Plains Elf Keen Eye +4 Perceiving)
    const rawActiveLineageFeatures = [
      ...(this.data.lineageStartingFeatures || []),
      ...((this.data.selectedUniqueFeatureIds || []).map(id => (this.data.allLineageDocs || []).find(f => (f.id || f._id) === id))),
    ].filter(Boolean);
    const seenLineageIds = new Set();
    for (const feat of rawActiveLineageFeatures) {
      const fid = feat.id || feat._id || feat.name;
      if (seenLineageIds.has(fid)) continue;
      seenLineageIds.add(fid);
      const parsedFeatSkills = parseFeatureSkillData(feat);
      for (const fSkill of parsedFeatSkills.fixedSkills || []) {
        const key = findSkillKey(fSkill.name);
        if (key) {
          const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? this.actor.system?.skills?.[key]?.bonus ?? 0);
          skillUpdates[`system.skills.${key}.value`] = curVal + fSkill.value;
        }
      }
    }

    // Apply fixed background skills (e.g. Knave +4 Savoir Faire)
    if (parsedBg?.fixedSkills?.length) {
      for (const fSkill of parsedBg.fixedSkills) {
        const key = findSkillKey(fSkill.name);
        if (key) {
          const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? this.actor.system?.skills?.[key]?.bonus ?? 0);
          skillUpdates[`system.skills.${key}.value`] = curVal + fSkill.value;
        }
      }
    }

    // Profession skills
    const prof = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsedProf = prof ? parseProfessionData(prof) : null;
    if (parsedProf) {
      for (const fSkill of parsedProf.fixedSkills) {
        const key = findSkillKey(fSkill.name);
        const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + fSkill.value;
      }
      for (const cSkill of this.data.selectedProfessionSkills) {
        const key = findSkillKey(cSkill);
        const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + parsedProf.choiceSkills.value;
      }
    }

    // Knave second profession skills
    const prof2 = parsedBg?.dualProfession ? this.data.professions.find(p => p.id === this.data.selectedProfessionId2) : null;
    const parsedProf2 = prof2 ? parseProfessionData(prof2) : null;
    if (parsedProf2) {
      for (const fSkill of parsedProf2.fixedSkills) {
        const key = findSkillKey(fSkill.name);
        const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + fSkill.value;
      }
      for (const cSkill of this.data.selectedProfessionSkills2) {
        const key = findSkillKey(cSkill);
        const curVal = Number(skillUpdates[`system.skills.${key}.value`] ?? this.actor.system?.skills?.[key]?.value ?? 0);
        skillUpdates[`system.skills.${key}.value`] = curVal + parsedProf2.choiceSkills.value;
      }
    }

    // Background bonus skill for encouraged professions (first and/or second profession)
    const bgName = String(bg?.name || "").toLowerCase().replace(/ background$/i, "").trim();
    const libEntry = BACKGROUND_ENCOURAGED_PROFESSIONS[bgName];
    const bonusSkillName = libEntry?.bonusSkill || parsedBg?.encouragedProfessions?.bonusSkill;
    const bonusVal = Number(libEntry?.bonusValue ?? parsedBg?.encouragedProfessions?.bonusValue ?? 2);

    if (bonusSkillName) {
      let bonusApplied = false;

      if (prof && this._isProfessionEncouraged(prof, parsedBg)) {
        const bKey = findSkillKey(bonusSkillName);
        if (bKey) {
          const curVal = Number(skillUpdates[`system.skills.${bKey}.value`] ?? this.actor.system?.skills?.[bKey]?.value ?? 0);
          skillUpdates[`system.skills.${bKey}.value`] = curVal + bonusVal;
          bonusApplied = true;
        }
      }

      if (!bonusApplied && prof2 && this._isProfessionEncouraged(prof2, parsedBg)) {
        const bKey = findSkillKey(bonusSkillName);
        if (bKey) {
          const curVal = Number(skillUpdates[`system.skills.${bKey}.value`] ?? this.actor.system?.skills?.[bKey]?.value ?? 0);
          skillUpdates[`system.skills.${bKey}.value`] = curVal + bonusVal;
        }
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
        updates["flags.mythcraft-essence-sheet.magicAttribute"] = this.data.magicAttribute;
        updates["system.sp.attribute"] = this.data.magicAttribute;
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
    for (const feature of this.data.lineageStartingFeatures || []) {
      if (feature?.toObject) itemsToCreate.push(feature.toObject());
    }
    for (const featureId of (this.data.selectedUniqueFeatureIds || [])) {
      const feature = (this.data.allLineageDocs || []).find(item => (item.id || item._id) === featureId);
      if (feature?.toObject) itemsToCreate.push(feature.toObject());
    }

    if (bg) itemsToCreate.push(bg.toObject());
    if (prof) {
      itemsToCreate.push(prof.toObject());
      const professionBaseName = prof.name.replace(/ profession$/i, "").trim().toLowerCase();
      const rankOne = (this.data.allBopsDocs || []).find(item => item.name.toLowerCase().startsWith(`${professionBaseName}: rank 1`));
      if (rankOne) itemsToCreate.push(rankOne.toObject());
    }

    // Knave second profession items
    if (prof2) {
      itemsToCreate.push(prof2.toObject());
      const prof2BaseName = prof2.name.replace(/ profession$/i, "").trim().toLowerCase();
      const rankOne2 = (this.data.allBopsDocs || []).find(item => item.name.toLowerCase().startsWith(`${prof2BaseName}: rank 1`));
      if (rankOne2) itemsToCreate.push(rankOne2.toObject());
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

    // Helper to resolve an item directly from the compendiums by name or alias
    const resolveCompendiumItem = async (gear) => {
      const cleanName = (typeof gear === "string" ? gear : gear.name || "").trim();
      if (!cleanName) return null;

      const lower = cleanName.toLowerCase();
      const baseName = lower
        .replace(/\([^)]+\)/g, "")
        .replace(/\[[^\]]+\]/g, "")
        .replace(/^(a|an|the|one|two|three|four|five|\d+)\s+/i, "")
        .trim();

      const parenMatch = lower.match(/^([^\(]+)\s*\(([^)]+)\)$/);
      const invertedName = parenMatch ? `${parenMatch[2].trim()} ${parenMatch[1].trim()}` : "";
      const singularName = lower.endsWith("s") ? lower.slice(0, -1) : lower;

      const searchPools = [
        this.data.allEquipmentDocs || [],
      ];

      for (const pool of searchPools) {
        // 1. Exact match
        let match = pool.find(d => (d.name || "").trim().toLowerCase() === lower);
        if (match) return match;

        // 2. Base name / Inverted name / Singular match
        match = pool.find(d => {
          const dName = (d.name || "").trim().toLowerCase();
          const dBase = dName
            .replace(/\([^)]+\)/g, "")
            .replace(/\[[^\]]+\]/g, "")
            .replace(/^(a|an|the)\s+/i, "")
            .trim();
          return dName === baseName ||
                 (invertedName && dName === invertedName) ||
                 (dBase && (dBase === baseName || dBase === singularName)) ||
                 (baseName && dName.includes(baseName)) ||
                 (baseName && baseName.length >= 4 && dName.length >= 4 && baseName.includes(dName));
        });
        if (match) return match;
      }

      // If still not found, search equipment packs only (never spell/talent/lineage/BOP packs)
      const equipmentPacks = getAvailableCompendiums().equipment || [];
      for (const pack of equipmentPacks) {
        if (pack.documentName !== "Item") continue;
        if (pack.index) {
          const entry = pack.index.find(e => {
            const eName = (e.name || "").trim().toLowerCase();
            return eName === lower || eName === baseName || (invertedName && eName === invertedName) || (baseName && eName.includes(baseName));
          });
          if (entry) {
            const doc = await pack.getDocument(entry._id || entry.id);
            if (doc && !["spell", "talent", "lineage", "ancestry", "background", "profession"].includes(doc.type)) {
              return doc;
            }
          }
        }
      }

      return null;
    };

    // Starting gear helper: sources full compendium items whenever a matching name exists
    const addGearItems = async (gearList, sourceLabel = "background / profession") => {
      for (const gear of gearList || []) {
        const qty = Number(gear.quantity) || 1;
        const compItem = await resolveCompendiumItem(gear);

        if (compItem && typeof compItem.toObject === "function") {
          const obj = compItem.toObject();
          foundry.utils.setProperty(obj, "system.quantity", qty);
          obj.img = resolveItemIcon(obj, obj.img, obj.type);
          itemsToCreate.push(obj);
        } else {
          const lowerName = (gear.name || "").toLowerCase();
          let itemType = "gear";
          if (/(?:sword|blade|dagger|axe|bow|crossbow|halberd|spear|knife|quarterstaff|hammer|mace|flail|club|cestus|knuckles)/i.test(lowerName)) {
            itemType = "weapon";
          } else if (/(?:armor|mail|gambeson|brigandine|leather|plate|cuirass|robes?|shield)/i.test(lowerName)) {
            itemType = "armor";
          }
          itemsToCreate.push({
            name: gear.name,
            type: itemType,
            img: resolveItemIcon(gear.name, null, itemType),
            system: {
              quantity: qty,
              description: { value: `<p>Acquired from ${sourceLabel}.</p>` },
            },
          });
        }
      }
    };

    // Background starting gear & item grant advancements
    if (parsedBg?.startingGear?.length) {
      await addGearItems(parsedBg.startingGear, "background starting equipment");
    }

    const processItemGrantAdvancements = async (itemDoc) => {
      if (!itemDoc) return;
      const advs = Array.isArray(itemDoc.system?.advancements)
        ? itemDoc.system.advancements
        : typeof itemDoc.system?.advancements === "object"
          ? Object.values(itemDoc.system.advancements)
          : [];

      for (const adv of advs) {
        if (adv.type === "itemGrant" || adv.documentClass?.TYPE === "itemGrant") {
          for (const poolItem of adv.pool || []) {
            if (poolItem.uuid) {
              try {
                const fetched = await fromUuid(poolItem.uuid);
                if (fetched && typeof fetched.toObject === "function") {
                  const obj = fetched.toObject();
                  obj.img = resolveItemIcon(obj, obj.img, obj.type);
                  itemsToCreate.push(obj);
                }
              } catch (e) {}
            }
          }
        }
      }
    };

    if (bg) await processItemGrantAdvancements(bg);
    if (prof) await processItemGrantAdvancements(prof);
    if (prof2) await processItemGrantAdvancements(prof2);

    // Profession starting gear
    if (parsedProf?.startingGear) await addGearItems(parsedProf.startingGear, "profession starting equipment");
    if (parsedProf2?.startingGear) await addGearItems(parsedProf2.startingGear, "profession starting equipment");

    // Deduplicate by name: for stackable gear (same name from two professions), stack quantity
    const seenNames = new Map(); // name -> index in uniqueItemsToCreate
    const uniqueItemsToCreate = [];
    for (const itemData of itemsToCreate) {
      const key = String(itemData.name || "").toLowerCase().trim();
      if (seenNames.has(key)) {
        // If it's a stackable gear item, add the quantities instead of skipping
        const existingIdx = seenNames.get(key);
        const existing = uniqueItemsToCreate[existingIdx];
        const existingQty = Number(existing?.system?.quantity) || 1;
        const newQty = Number(itemData?.system?.quantity) || 1;
        if (existing?.system?.quantity !== undefined) {
          existing.system.quantity = existingQty + newQty;
        }
        continue;
      }
      seenNames.set(key, uniqueItemsToCreate.length);

      if (isDefaultIcon(itemData.img)) {
        itemData.img = resolveItemIcon(itemData, itemData.img, itemData.type);
      }

      // Initialize pseudo-document advancement flags so system's prepareDerivedData won't log undefined selection error
      if (itemData.system?.advancements) {
        const advs = Array.isArray(itemData.system.advancements)
          ? itemData.system.advancements
          : typeof itemData.system.advancements === "object"
            ? Object.values(itemData.system.advancements)
            : [];
        for (const adv of advs) {
          const advId = adv.id || adv._id;
          if (advId) {
            foundry.utils.setProperty(itemData, `flags.mythcraft.advancement.${advId}.selected`, {});
          }
        }
      }

      uniqueItemsToCreate.push(itemData);
    }

    if (uniqueItemsToCreate.length > 0) {
      await this.actor.createEmbeddedDocuments("Item", uniqueItemsToCreate);
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

