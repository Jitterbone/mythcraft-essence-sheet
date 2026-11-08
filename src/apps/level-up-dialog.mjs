/**
 * MythCraft Essence — Level Up & HP Progression Dialog
 *
 * Full-featured interactive modal for leveling up character actors:
 * - HP Progression based on Endurance Thresholds
 * - +1 Attribute Point distribution (enforcing level cap: floor(level/2) + 1)
 * - Lineage Milestones (Levels 5, 10, 15, 20, 25, 29)
 * - Profession Rank-Up & Tenure progression
 * - Interactive Talent Selection with Tree Viewer integration
 */

import {
  ENDURANCE_THRESHOLDS,
  getEnduranceThreshold,
  calculateSetHpTotal,
  calculateLevelUpSetHpGain,
  calculateApMax,
} from "../features/hp-automation.mjs";
import {
  getAttributeLevelCap,
  getAvailableCompendiums,
  loadPacksDocuments,
  checkTalentAvailability,
  parseTalentData,
  parseProfessionData,
  resolveLineageFeatures,
  buildTalentTrees,
} from "../features/compendium-parser.mjs";
import {
  isDisallowedTalentItem,
  normalizeTalentName,
  CANONICAL_TALENTS,
  NORMALIZED_CANONICAL_TALENTS,
} from "../features/talent-canonical-map.mjs";
import { resolveItemIcon, isDefaultIcon } from "../features/equipment-icons.mjs";
import { syncActorTalentActiveEffects } from "../features/active-effect-engine.mjs";
import { getSetting, setSetting } from "../settings.mjs";
import TalentTreeViewer from "./talent-tree-viewer.mjs";
import {
  CcxSound,
  setupCcxParticles,
  attachCcxInteractiveEffects,
  buildAttributeRadarSvg,
  playAwakeningFinaleSequence,
  decorateTreesWithConstellationLayout,
  buildCharacterNebulaTracks,
  playGalaxyZoomAnimation,
} from "../features/ccx-experience-engine.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const getAttributeValue = (actor, key) => {
  const normKey = key === "lck" ? "luck" : (key === "luck" ? "lck" : key);
  const sysAttr = actor?.system?.attributes;
  if (!sysAttr) return 0;
  const val = sysAttr[key] ?? sysAttr[normKey];
  if (val !== undefined && val !== null) {
    if (typeof val === "object" && "value" in val) return Number(val.value) || 0;
    return Number(val) || 0;
  }
  return 0;
};

export { ENDURANCE_THRESHOLDS as ENDURANCE_THRESHOLD_CHART, getEnduranceThreshold as getHpDataForEndurance };

export default class LevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "level-up-dialog", "ccx-fullscreen-window", "lud-experience-window"],
    window: {
      title: "MythCraft — Ascension & Talent Build Hierarchy",
      icon: "fas fa-arrow-up-right-dots",
      resizable: true,
    },
    position: {
      width: 1520,
      height: 920,
    },
    form: {
      handler: this.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      increaseLevel: this.#onIncreaseLevel,
      decreaseLevel: this.#onDecreaseLevel,
      selectTargetLevel: this.#onSelectTargetLevel,
      setMode: this.#onSetMode,
      selectMethod: this.#onSelectMethod,
      recalculateAllHp: this.#onRecalculateAllHp,
      adjustAttribute: this.#onAdjustAttribute,
      toggleProfessionRank: this.#onToggleProfessionRank,
      openTalentPicker: this.#onOpenTalentPicker,
      clearSelectedTalent: this.#onClearSelectedTalent,
      toggleExtraTalent: this.#onToggleExtraTalent,
      selectMilestoneFeature: this.#onSelectMilestoneFeature,
      clearSelectedMilestoneFeature: this.#onClearSelectedMilestoneFeature,
      filterTreeCategory: this.#onFilterTreeCategory,
      toggleTreeRootExpand: this.#onToggleTreeRootExpand,
      toggleTreeTrackExpand: this.#onToggleTreeTrackExpand,
      chooseTreeTalent: this.#onChooseTreeTalent,
      viewTreeTalent: this.#onViewTreeTalent,
      postTreeTalent: this.#onPostTreeTalent,
      focusSection: this.#onFocusSection,
      toggleCcxSound: this.#onToggleCcxSound,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/level-up-dialog.hbs",
    },
  };

  /**
   * @param {Actor} actor - Character actor document
   * @param {object} options - Configuration options
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;

    const curLvl = Math.max(0, Number(actor.system.level) || 0);
    this._currentLevel = curLvl;
    this._targetLevel = options.targetLevel ?? (curLvl === 0 ? 1 : curLvl + 1);
    this._mode = options.mode || (curLvl === 0 ? "recalculate" : "levelUp");

    this._chosenHpMethod = "set"; // "set" | "rolled"

    // Attribute point advancement (1 point per level gained)
    // Build from actor's actual attribute keys, custom attributes, and standard order
    const actorAttrKeys = Object.keys(actor.system?.attributes ?? {});
    const customAttrsSetting = getSetting("customAttributes", []);
    const customKeys = Array.isArray(customAttrsSetting)
      ? customAttrsSetting.map(c => (typeof c === "string" ? c : c?.key || c?.id || "").toLowerCase().trim()).filter(Boolean)
      : [];
    const sanityEnabled = Boolean(getSetting("enableSanity", false));

    const standardOrder = ["str", "dex", "end", "awr", "int", "cha", "luck", "cor"];
    if (sanityEnabled || actorAttrKeys.includes("san")) standardOrder.push("san");

    const allKeys = Array.from(new Set([...standardOrder, ...customKeys, ...actorAttrKeys]))
      .filter(k => k !== "lck" && k !== "magic" && !k.startsWith("_"));

    this._attributeChanges = Object.fromEntries(allKeys.map(k => [k, 0]));

    // Profession Rank Up
    this._increaseProfessionRank = false;

    // Selected Talent for this level
    this._selectedTalent = null;
    this._selectedExtraTalentIds = [];
    this._cachedMagicTalents = null;

    // Lineage Milestone Feature (Levels 5, 10, 15, 20, 25, 29)
    this._selectedMilestoneFeatureId = null;
    this._cachedLineageDocs = null;

    // Embedded Talent Build Hierarchy state
    this._allCompendiumTalents = null;
    this._treeCategory = "character"; // "character" | "class" | "specialization" | "magic" | "all"
    this._treeSearchTerm = "";
    this._expandedRootIds = new Set();
    this._collapsedRootIds = new Set();
    this._expandedTrackTitles = new Set();
    this._collapsedTrackTitles = new Set();
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Context Preparation
   * ────────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const curLvl = this._currentLevel;
    const tgtLvl = this._targetLevel;
    const endVal = getAttributeValue(this.actor, "end") + (this._attributeChanges.end || 0);
    const activeTh = getEnduranceThreshold(endVal);

    const curHpMax = Number(this.actor.system.hp?.max ?? 0);
    const curHpVal = Number(this.actor.system.hp?.value ?? 0);

    const isLevelUp = tgtLvl > curLvl && curLvl > 0;
    const isInitialBuild = curLvl === 0;
    const isRecalculate = this._mode === "recalculate";

    const levelsGained = Math.max(1, tgtLvl - (isRecalculate ? 0 : curLvl));
    const levelCap = getAttributeLevelCap(tgtLvl);

    // Calculate Attribute Pool
    const totalAttrPointsGained = isLevelUp ? levelsGained : 0;
    let attrPointsSpent = 0;
    for (const val of Object.values(this._attributeChanges)) {
      attrPointsSpent += val;
    }
    const attrPointsRemaining = totalAttrPointsGained - attrPointsSpent;

    // Check if target level has a Lineage Milestone (5, 10, 15, 20, 25, 29)
    const isLineageMilestone = [5, 10, 15, 20, 25, 29].includes(tgtLvl);

    // Calculate Set HP values
    const fullSetHpTotal = calculateSetHpTotal(tgtLvl, endVal);
    const incrementalSetHpGain = calculateLevelUpSetHpGain(curLvl, tgtLvl, endVal);

    const thresholdList = ENDURANCE_THRESHOLDS.map(th => ({
      ...th,
      isActive: th.threshold === activeTh.threshold,
    }));

    let diceFormula = "";
    if (activeTh.die) {
      diceFormula = isRecalculate || isInitialBuild
        ? `${tgtLvl}${activeTh.die}`
        : `${levelsGained}${activeTh.die}`;
    }

    let previewMaxHp = "";
    let previewGainText = "";

    if (this._chosenHpMethod === "set" || !activeTh.die) {
      if (isRecalculate || isInitialBuild) {
        previewMaxHp = `${fullSetHpTotal}`;
        previewGainText = `10 + ${tgtLvl} (Level) + (${tgtLvl} × ${activeTh.setHp} Set HP) = ${fullSetHpTotal} HP`;
      } else {
        previewMaxHp = `${curHpMax + incrementalSetHpGain}`;
        previewGainText = `+${incrementalSetHpGain} HP (${levelsGained} level + ${levelsGained * activeTh.setHp} Set HP)`;
      }
    } else {
      if (isRecalculate || isInitialBuild) {
        previewMaxHp = `10 + ${tgtLvl} + [${diceFormula}]`;
        previewGainText = `Will roll ${diceFormula} in chat (+10 base + ${tgtLvl} level) upon applying`;
      } else {
        previewMaxHp = `${curHpMax} + [${diceFormula} + ${levelsGained}]`;
        previewGainText = `Will roll ${diceFormula} in chat (+${levelsGained} level) upon applying`;
      }
    }

    // Attributes list — built from this._attributeChanges keys to include LCK, COR, SAN, and custom attrs
    const attrNameMap = {
      str: "Strength", dex: "Dexterity", end: "Endurance", awr: "Awareness",
      int: "Intellect", cha: "Charisma", luck: "Luck", lck: "Luck", cor: "Coordination", san: "Sanity",
    };
    const attrLabelMap = {
      str: "STR", dex: "DEX", end: "END", awr: "AWR", int: "INT", cha: "CHA",
      luck: "LCK", lck: "LCK", cor: "COR", san: "SAN",
    };
    const customAttrsSetting = getSetting("customAttributes", []) || [];
    const customAttrMap = new Map(
      (Array.isArray(customAttrsSetting) ? customAttrsSetting : []).map(ca => [
        (typeof ca === "string" ? ca : ca?.key || ca?.id || "").toLowerCase().trim(),
        ca,
      ])
    );

    const attributesList = Object.keys(this._attributeChanges).map(key => {
      const base = getAttributeValue(this.actor, key);
      const mod = this._attributeChanges[key] || 0;
      const customDef = customAttrMap.get(key);
      return {
        key,
        label: attrLabelMap[key] || customDef?.abbr || key.toUpperCase(),
        name: attrNameMap[key] || customDef?.name || key.toUpperCase(),
        base,
        mod,
        preview: base + mod,
        isAtCap: (base + mod) >= levelCap,
        canDecrease: (base + mod) > -5,  // can subtract as long as result stays >= -5
      };
    });

    // Magic Entry additional stack talents preparation
    let extraTalents = null;
    const parsedSelectedTalent = this._selectedTalent ? parseTalentData(this._selectedTalent) : null;
    if (parsedSelectedTalent?.isMagicEntry && parsedSelectedTalent.extraStackTalents > 0) {
      const stackTag = (parsedSelectedTalent.magicStackTag || "").toLowerCase().trim();
      if (!this._cachedMagicTalents) {
        const packs = getAvailableCompendiums();
        this._cachedMagicTalents = await loadPacksDocuments(packs.magic);
      }
      const isDocOfStack = (doc, tag) => {
        if (!tag) return true;
        const tName = (doc.name || "").toLowerCase();
        const tDesc = (doc.system?.description?.value ?? doc.system?.description ?? "").toLowerCase();
        const tSrc = String(doc.system?.magicSource || "").toLowerCase();
        const tCat = String(doc.system?.category || "").toLowerCase();
        const chain = (doc._folderChain || []).map(f => String(f).toLowerCase());
        const inChain = chain.some(f => f.includes(tag));
        const tags = (Array.isArray(doc.system?.tags) ? doc.system.tags : []).map(t => String(t?.name || t?.label || t).toLowerCase());
        const inTags = tags.some(t => t.includes(tag));
        return inChain || inTags || tSrc.includes(tag) || tCat.includes(tag) || tName.includes(tag) || tDesc.includes(`${tag} magic`);
      };

      const actorTalents = this.actor.items.filter(i => i.type === "talent" || i.type === "feature");
      const eligibleTalents = (this._cachedMagicTalents || [])
        .filter(t => (t.id || t._id) !== (this._selectedTalent.id || this._selectedTalent._id) && isDocOfStack(t, stackTag))
        .map(t => {
          const tid = t.id || t._id;
          const avail = checkTalentAvailability(t, [...actorTalents, this._selectedTalent], { effectiveLevel: this._targetLevel });
          return {
            id: tid,
            name: t.name,
            img: resolveItemIcon(t, t.img, "talent"),
            isAvailable: avail.isAvailable,
            missingPrereqs: avail.missingPrereqs,
            prereqTooltip: avail.prereqTooltip,
            isSelected: this._selectedExtraTalentIds.includes(tid),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      extraTalents = {
        count: parsedSelectedTalent.extraStackTalents,
        selectedCount: this._selectedExtraTalentIds.length,
        remainingCount: Math.max(0, parsedSelectedTalent.extraStackTalents - this._selectedExtraTalentIds.length),
        discipline: stackTag ? stackTag.toUpperCase() : "MAGIC",
        isComplete: this._selectedExtraTalentIds.length >= parsedSelectedTalent.extraStackTalents,
        options: eligibleTalents,
      };
    }

    // Lineage Milestone Feature Options (Levels 5, 10, 15, 20, 25, 29)
    let milestoneOptions = [];
    let lineageName = "Lineage";
    let selectedMilestoneFeature = null;

    if (isLineageMilestone) {
      const actorLineage = this.actor.items.find(i =>
        i.type === "lineage" ||
        (i.type === "feature" && (/lineage/i.test(i.name) || i.system?.category === "lineage" || i.flags?.["mythcraft-essence-sheet"]?.category === "lineage"))
      );

      if (actorLineage) {
        lineageName = actorLineage.name.replace(/lineage/i, "").trim();
        if (!this._cachedLineageDocs) {
          const packs = getAvailableCompendiums();
          this._cachedLineageDocs = await loadPacksDocuments(packs.lineages);
        }
        const lineageParsed = resolveLineageFeatures(actorLineage, this._cachedLineageDocs || []);
        const allPool = lineageParsed.uniqueFeatures || [];

        const ownedIds = new Set(this.actor.items.map(i => (i.id || i._id || "").toLowerCase()));
        const ownedNames = new Set(this.actor.items.map(i => String(i.name || "").toLowerCase().trim()));

        const unownedPool = allPool.filter(f =>
          !ownedIds.has((f.id || f._id || "").toLowerCase()) &&
          !ownedNames.has(String(f.name || "").toLowerCase().trim())
        );

        milestoneOptions = unownedPool.map(f => {
          const fid = f.id || f._id;
          const avail = checkTalentAvailability(f, this.actor.items, { effectiveLevel: tgtLvl });
          const isSelected = this._selectedMilestoneFeatureId === fid;
          if (isSelected) selectedMilestoneFeature = f;
          return {
            id: fid,
            name: f.name,
            img: resolveItemIcon(f, f.img, "feature"),
            description: f.system?.description?.value ?? f.system?.description ?? "",
            isAvailable: avail.isAvailable,
            missingPrereqs: avail.missingPrereqs,
            prereqTooltip: avail.prereqTooltip,
            isSelected,
            item: f,
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    // Embedded Live Talent Build Hierarchy preparation
    const { rootTrees, characterNebulaTracks, focusedNebulaTrack, totalTreesCount, startedTreesCount } = await this.#prepareTalentHierarchy(tgtLvl);

    return {
      actor: this.actor,
      currentLevel: curLvl,
      targetLevel: tgtLvl,
      endValue: endVal,
      activeThreshold: activeTh,
      thresholdList,
      mode: this._mode,
      isLevelUp,
      isInitialBuild,
      isRecalculate,
      levelsGained,
      levelCap,
      attrPointsRemaining,
      totalAttrPointsGained,
      attributesList,
      isLineageMilestone,
      lineageName,
      milestoneOptions,
      selectedMilestoneFeature,
      increaseProfessionRank: this._increaseProfessionRank,
      selectedTalent: this._selectedTalent,
      currentHpMax: curHpMax,
      currentHpVal: curHpVal,
      fullSetHpTotal,
      incrementalSetHpGain,
      diceFormula,
      chosenHpMethod: this._chosenHpMethod,
      previewMaxHp,
      previewGainText,
      extraTalents,
      trees: rootTrees,
      characterNebulaTracks,
      focusedNebulaTrack,
      totalTreesCount,
      startedTreesCount: characterNebulaTracks.length || startedTreesCount,
      hasStartedTrees: characterNebulaTracks.length > 0 || startedTreesCount > 0,
      activeTreeCategory: this._treeCategory,
      treeSearchTerm: this._treeSearchTerm,
      ccxEnabled: Boolean(getSetting("ccxEnabled", true)),
      ccxSoundEnabled: Boolean(getSetting("ccxSoundEnabled", true)),
      attributeRadarSvg: buildAttributeRadarSvg(attributesList, levelCap),
    };
  }

  /**
   * Builds and filters the character's live Talent Tree hierarchy for the embedded right-hand canvas.
   * Caches built trees by targetLevel so expanding tracks, switching tabs, or adjusting HP/skills is instantaneous (<1ms).
   */
  async #prepareTalentHierarchy(targetLevel) {
    if (!this._actorTalents) {
      const actorItems = this.actor.items.filter(i => !isDisallowedTalentItem(i));
      const customConfig = globalThis.game?.settings?.get("mythcraft-essence-sheet", "customTalentCompendiums") || [];
      const customTalentNames = new Set();
      for (const c of customConfig) {
        if (!c.pack) continue;
        const packKey = c.pack.toLowerCase().trim();
        const p = game.packs?.get(c.pack) || game.packs?.find(pack => (pack.metadata?.id || pack.collection || "").toLowerCase() === packKey || (pack.metadata?.label || pack.title || "").toLowerCase() === packKey);
        if (p?.index) {
          for (const entry of p.index) {
            customTalentNames.add(normalizeTalentName(entry.name));
            customTalentNames.add(entry.name.toLowerCase().trim());
          }
        }
      }

      this._actorTalents = actorItems.filter(i => {
        if (i.type === "talent") return true;
        if (i.type === "feature") {
          const rawName = String(i.name || "").trim();
          const norm = normalizeTalentName(rawName);
          return Boolean(NORMALIZED_CANONICAL_TALENTS[norm] || CANONICAL_TALENTS[rawName.toLowerCase()] || customTalentNames.has(norm) || customTalentNames.has(rawName.toLowerCase()));
        }
        return false;
      });
    }

    if (!this._allCompendiumTalents) {
      const packs = getAvailableCompendiums();
      const classTalents = (await loadPacksDocuments(packs.classes)).filter(d => !isDisallowedTalentItem(d));
      const specTalents = (await loadPacksDocuments(packs.specTalents)).filter(d => !isDisallowedTalentItem(d));
      const magicTalents = (await loadPacksDocuments(packs.magic)).filter(d => !isDisallowedTalentItem(d));

      const allTalents = [];
      const seenNames = new Set();
      for (const doc of classTalents) {
        if (doc.type === "talent" || doc.type === "feature" || doc._customCategory) {
          if (!doc._compCategory) doc._compCategory = "class";
          allTalents.push(doc);
          seenNames.add(normalizeTalentName(doc.name));
        }
      }
      for (const doc of specTalents) {
        if (doc.type === "talent" || doc.type === "feature" || doc._customCategory) {
          if (!doc._compCategory) doc._compCategory = "specialization";
          allTalents.push(doc);
          seenNames.add(normalizeTalentName(doc.name));
        }
      }
      for (const doc of magicTalents) {
        if (doc.type === "talent" || doc.type === "feature" || doc._customCategory) {
          if (!doc._compCategory) doc._compCategory = "magic";
          allTalents.push(doc);
          seenNames.add(normalizeTalentName(doc.name));
        }
      }
      for (const doc of this._actorTalents) {
        const cleanName = normalizeTalentName(doc.name);
        if (!seenNames.has(cleanName)) {
          allTalents.push(doc);
          seenNames.add(cleanName);
        }
      }
      this._allCompendiumTalents = allTalents;
    }

    // Only rebuild talent trees when targetLevel actually changes!
    if (!this._builtTrees || this._builtTreesLevel !== targetLevel) {
      const builtTrees = buildTalentTrees(this._allCompendiumTalents, this._actorTalents, { effectiveLevel: targetLevel });
      for (const tree of builtTrees) {
        tree.isStarted = tree.nodes.some(n => n.isOwned);
        tree.ownedCount = tree.nodes.filter(n => n.isOwned).length;
        tree.availableCount = tree.nodes.filter(n => n.isAvailable && (!n.isOwned || n.repeatable)).length;
        for (const track of tree.tracks) {
          track.ownedCount = track.nodes.filter(n => n.isOwned).length;
          track.availableCount = track.nodes.filter(n => n.isAvailable && (!n.isOwned || n.repeatable)).length;
        }
      }
      this._builtTrees = builtTrees;
      this._builtTreesLevel = targetLevel;
    }

    const builtTrees = this._builtTrees;
    const selectedId = this._selectedTalent ? (this._selectedTalent.id || this._selectedTalent._id) : null;
    const selectedNorm = this._selectedTalent ? normalizeTalentName(this._selectedTalent.name) : "";

    const startedTrees = builtTrees.filter(t =>
      t.isStarted ||
      t.nodes.some(n => (selectedId && n.id === selectedId) || (selectedNorm && normalizeTalentName(n.name) === selectedNorm))
    );
    const effectiveCategory = this._treeCategory;

    let displayTrees = builtTrees;
    if (effectiveCategory === "character") {
      displayTrees = startedTrees.length > 0 ? startedTrees : builtTrees;
    } else if (effectiveCategory !== "all") {
      displayTrees = builtTrees.filter(t => t.category === effectiveCategory);
    }

    const decorateNode = (n) => ({
      ...n,
      isSelectedForLevelUp: Boolean(
        (selectedId && n.id === selectedId) ||
        (selectedNorm && normalizeTalentName(n.name) === selectedNorm)
      ),
    });

    const rawRootTrees = displayTrees.map(tree => {
      const hasSelectedInside = Boolean(selectedId || selectedNorm) && tree.nodes.some(n => (selectedId && n.id === selectedId) || (selectedNorm && normalizeTalentName(n.name) === selectedNorm));
      const isExpanded = effectiveCategory === "character"
        ? (startedTrees.length > 0 ? !this._collapsedRootIds.has(tree.id) : (this._expandedRootIds.has(tree.id) || hasSelectedInside))
        : (this._expandedRootIds.has(tree.id) || hasSelectedInside);

      const anyTrackStartedInTree = tree.tracks.some(tr =>
        tr.isStarted || (Boolean(selectedId || selectedNorm) && tr.nodes.some(n => (selectedId && n.id === selectedId) || (selectedNorm && normalizeTalentName(n.name) === selectedNorm)))
      );

      const tracks = tree.tracks.map(track => {
        const trackHasSelected = Boolean(selectedId || selectedNorm) && track.nodes.some(n => (selectedId && n.id === selectedId) || (selectedNorm && normalizeTalentName(n.name) === selectedNorm));
        const isTrackExpanded = effectiveCategory === "character"
          ? (((track.isStarted || trackHasSelected || !anyTrackStartedInTree) && !this._collapsedTrackTitles.has(track.trackTitle)) || this._expandedTrackTitles.has(track.trackTitle))
          : !this._collapsedTrackTitles.has(track.trackTitle);

        return {
          ...track,
          isExpanded: isTrackExpanded,
          totalNodesCount: track.nodes.length,
          nodes: selectedId ? track.nodes.map(decorateNode) : track.nodes,
          tiers: (isExpanded && isTrackExpanded)
            ? (track.tiers || []).map(tier => ({
                ...tier,
                nodes: selectedId ? (tier.nodes || []).map(decorateNode) : (tier.nodes || []),
              }))
            : [],
        };
      });

      const isDisciplineLocked = tree.category === "magic" && !tree.isStarted;

      return {
        ...tree,
        isExpanded,
        isDisciplineLocked,
        totalNodesCount: tree.nodes.length,
        entryTalents: selectedId ? (tree.entryTalents || []).map(decorateNode) : (tree.entryTalents || []),
        tracks,
      };
    });

    const rootTrees = decorateTreesWithConstellationLayout(rawRootTrees);
    const characterNebulaTracks = effectiveCategory === "character"
      ? buildCharacterNebulaTracks(rawRootTrees, this._expandedTrackTitles)
      : [];
    const focusedNebulaTrack = characterNebulaTracks.find(t => t.isExpanded) || null;

    return {
      rootTrees,
      characterNebulaTracks,
      focusedNebulaTrack,
      totalTreesCount: builtTrees.length,
      startedTreesCount: startedTrees.length,
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
          width: 720,
          height: 760,
        });
      }
    } catch (_) {}
  }

  /** @inheritdoc */
  _preRender(context, options) {
    if (!this._savedScrolls) this._savedScrolls = new Map();
    if (this.element) {
      const scrollEls = this.element.querySelectorAll(".lud-left-scroll, .lud-tree-canvas-scroll");
      for (const el of scrollEls) {
        this._savedScrolls.set(el.className, el.scrollTop);
      }
    }
    return super._preRender?.(context, options);
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender?.(context, options);

    if (this.element) {
      this._particleSystem = setupCcxParticles(this.element);
      attachCcxInteractiveEffects(this.element, this._particleSystem);
    }

    if (this._savedScrolls && this.element) {
      const scrollEls = this.element.querySelectorAll(".lud-left-scroll, .lud-tree-canvas-scroll");
      for (const el of scrollEls) {
        if (this._savedScrolls.has(el.className)) {
          el.scrollTop = this._savedScrolls.get(el.className);
        }
      }
    }

    // Instant client-side search filter for embedded Talent Build Hierarchy
    const searchInput = this.element?.querySelector("input.lud-tree-search-input");
    if (searchInput) {
      if (this._treeSearchTerm) searchInput.value = this._treeSearchTerm;

      const performFilter = (term) => {
        const cleanTerm = (term || "").toLowerCase().trim();
        const nebulaItems = this.element.querySelectorAll(".ccx-galaxy-star-cluster, .ccx-nebula-parent-node-pod, .ccx-nebula-track-sector");
        nebulaItems.forEach(item => {
          if (!cleanTerm) {
            item.style.display = "";
            return;
          }
          const txt = (item.textContent || "").toLowerCase();
          item.style.display = txt.includes(cleanTerm) ? "" : "none";
        });

        const rootSections = this.element.querySelectorAll(".lud-hierarchy-canvas .srd-root-tree-column");
        rootSections.forEach(rootCol => {
          if (!cleanTerm) {
            rootCol.style.display = "";
            rootCol.querySelectorAll(".srd-subclass-column-card, .srd-badge-node").forEach(el => { el.style.display = ""; });
            return;
          }
          const rootTitle = (rootCol.querySelector(".srd-root-title")?.textContent || "").toLowerCase();
          const rootMatches = rootTitle.includes(cleanTerm);
          let anyNodeMatches = false;
          rootCol.querySelectorAll(".srd-badge-node").forEach(node => {
            const title = (node.querySelector(".badge-node-title")?.textContent || "").toLowerCase();
            const match = rootMatches || title.includes(cleanTerm);
            node.style.display = match ? "" : "none";
            if (match) anyNodeMatches = true;
          });
          rootCol.style.display = (rootMatches || anyNodeMatches) ? "" : "none";
        });
      };

      if (this._treeSearchTerm) performFilter(this._treeSearchTerm);
      searchInput.addEventListener("input", (e) => {
        this._treeSearchTerm = e.target.value;
        performFilter(this._treeSearchTerm);
      });
    }
  }

  /** @inheritdoc */
  _onClose(options) {
    this._particleSystem?.destroy?.();
    this._particleSystem = null;
    return super._onClose?.(options);
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ────────────────────────────────────────────────────────────────────────── */

  static async #onIncreaseLevel(event, target) {
    event.preventDefault();
    if (this._targetLevel < 30) {
      this._targetLevel++;
      this.render();
    }
  }

  static async #onDecreaseLevel(event, target) {
    event.preventDefault();
    if (this._targetLevel > (this._mode === "recalculate" ? 1 : this._currentLevel + 1)) {
      this._targetLevel--;
      this.render();
    }
  }

  static async #onSelectTargetLevel(event, target) {
    const val = parseInt(target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 30) {
      this._targetLevel = val;
      this.render();
    }
  }

  static async #onSetMode(event, target) {
    this._mode = target.dataset.mode || "levelUp";
    this.render();
  }

  static async #onSelectMethod(event, target) {
    this._chosenHpMethod = target.dataset.method || "set";
    this.render();
  }

  static async #onRecalculateAllHp(event, target) {
    this._mode = "recalculate";
    this._targetLevel = this._currentLevel || 1;
    this.render();
  }

  static #onAdjustAttribute(event, target) {
    const attr = target.dataset.attr;
    const delta = parseInt(target.dataset.delta, 10);
    const base = getAttributeValue(this.actor, attr);
    const curMod = this._attributeChanges[attr] || 0;
    const nextMod = curMod + delta;

    const levelCap = getAttributeLevelCap(this._targetLevel);
    if (base + nextMod > levelCap) {
      ui.notifications.warn(`Attributes cannot exceed +${levelCap} at level ${this._targetLevel}.`);
      return;
    }

    // Prevent reducing an attribute below -5 total
    if (base + nextMod < -5) {
      ui.notifications.warn(`Attributes cannot go below -5.`);
      return;
    }

    this._attributeChanges[attr] = nextMod;
    this.render();
  }

  static #onToggleProfessionRank(event, target) {
    this._increaseProfessionRank = target.checked;
    this.render();
  }

  static #onOpenTalentPicker(event, target) {
    const viewer = new TalentTreeViewer(this.actor, {
      isPickerMode: true,
      targetLevel: this._targetLevel,
      onSelectTalent: (talent) => {
        this._selectedTalent = talent;
        this._selectedExtraTalentIds = [];
        this.render();
      },
    });
    viewer.render(true);
  }

  static #onClearSelectedTalent(event, target) {
    this._selectedTalent = null;
    this._selectedExtraTalentIds = [];
    this.render();
  }

  static #onToggleExtraTalent(event, target) {
    const id = target.dataset.talentId;
    if (!id || !this._selectedTalent) return;
    const parsed = parseTalentData(this._selectedTalent);
    const maxExtra = parsed?.extraStackTalents ?? 2;

    const idx = this._selectedExtraTalentIds.indexOf(id);
    if (idx >= 0) {
      this._selectedExtraTalentIds.splice(idx, 1);
    } else {
      const extraItem = (this._cachedMagicTalents || []).find(t => (t.id || t._id) === id);
      if (extraItem) {
        const actorTalents = this.actor.items.filter(i => i.type === "talent" || i.type === "feature");
        const avail = checkTalentAvailability(extraItem, [...actorTalents, this._selectedTalent], { effectiveLevel: this._targetLevel });
        if (!avail.isAvailable) {
          ui.notifications.warn(avail.prereqTooltip || "Prerequisites not met for this talent.");
          return;
        }
      }

      if (this._selectedExtraTalentIds.length >= maxExtra) {
        ui.notifications.warn(`You may only select ${maxExtra} extra talents.`);
        return;
      }
      this._selectedExtraTalentIds.push(id);
    }
    this.render();
  }

  static #onSelectMilestoneFeature(event, target) {
    const id = target.dataset.featureId;
    if (!id) return;

    if (this._selectedMilestoneFeatureId === id) {
      this._selectedMilestoneFeatureId = null;
      this.render();
      return;
    }

    const featureDoc = (this._cachedLineageDocs || []).find(d => (d.id || d._id) === id);
    if (featureDoc) {
      const avail = checkTalentAvailability(featureDoc, this.actor.items, { effectiveLevel: this._targetLevel });
      if (!avail.isAvailable) {
        ui.notifications.warn(avail.prereqTooltip || "Prerequisites not met for this lineage feature.");
        return;
      }
    }

    this._selectedMilestoneFeatureId = id;
    this.render();
  }

  static #onClearSelectedMilestoneFeature(event, target) {
    this._selectedMilestoneFeatureId = null;
    this.render();
  }

  static #onFilterTreeCategory(event, target) {
    const cat = target.dataset.category;
    if (!cat) return;
    this._treeCategory = cat;
    this.render();
  }

  static #onToggleTreeRootExpand(event, target) {
    const rootId = target.dataset.rootId || target.closest("[data-root-id]")?.dataset.rootId;
    if (!rootId) return;
    const startedTrees = (this._builtTrees || []).filter(t => t.isStarted);
    const effectiveCategory = (this._treeCategory === "character" && startedTrees.length === 0) ? "all" : this._treeCategory;
    if (effectiveCategory === "character") {
      if (this._collapsedRootIds.has(rootId)) this._collapsedRootIds.delete(rootId);
      else this._collapsedRootIds.add(rootId);
    } else {
      if (this._expandedRootIds.has(rootId)) this._expandedRootIds.delete(rootId);
      else this._expandedRootIds.add(rootId);
    }
    this.render();
  }

  static #onToggleTreeTrackExpand(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const trackTitle = target.dataset.trackTitle || target.closest("[data-track-title]")?.dataset.trackTitle;
    if (!trackTitle) return;
    if (this._treeCategory === "character") {
      if (trackTitle === "__GALAXY_OVERVIEW__" || this._expandedTrackTitles.has(trackTitle)) {
        playGalaxyZoomAnimation(this.element, target, "out", () => {
          this._expandedTrackTitles.clear();
          this.render();
        });
      } else {
        const isSwitchingFromFocused = this._expandedTrackTitles.size > 0;
        if (isSwitchingFromFocused) {
          this._expandedTrackTitles.clear();
          this._expandedTrackTitles.add(trackTitle);
          this.render();
        } else {
          playGalaxyZoomAnimation(this.element, target, "in", () => {
            this._expandedTrackTitles.clear();
            this._expandedTrackTitles.add(trackTitle);
            this.render();
          });
        }
      }
      return;
    } else if (this._collapsedTrackTitles.has(trackTitle)) {
      this._collapsedTrackTitles.delete(trackTitle);
      this._expandedTrackTitles.add(trackTitle);
    } else {
      this._collapsedTrackTitles.add(trackTitle);
      this._expandedTrackTitles.delete(trackTitle);
    }
    this.render();
  }

  static #onChooseTreeTalent(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const id = target.dataset.talentId || target.closest("[data-talent-id]")?.dataset.talentId;
    if (!id) return;

    let foundNode = null;
    for (const tree of (this._builtTrees || [])) {
      const node = tree.nodes.find(n => n.id === id);
      if (node) {
        foundNode = node;
        break;
      }
    }

    if (!foundNode?.item) return;
    if (!foundNode.isAvailable) {
      ui.notifications.warn(foundNode.prereqTooltip || "Prerequisites not met for this talent.");
      return;
    }

    this._selectedTalent = foundNode.item;
    this._selectedExtraTalentIds = [];
    this.render();
  }

  static #onViewTreeTalent(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const id = target.dataset.talentId || target.closest("[data-talent-id]")?.dataset.talentId;
    if (!id) return;
    for (const tree of (this._builtTrees || [])) {
      const node = tree.nodes.find(n => n.id === id);
      if (node?.item?.sheet) {
        node.item.sheet.render(true);
        return;
      }
    }
  }

  static async #onPostTreeTalent(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const id = target.dataset.talentId || target.closest("[data-talent-id]")?.dataset.talentId;
    if (!id) return;
    let foundNode = null;
    for (const tree of (this._builtTrees || [])) {
      const node = tree.nodes.find(n => n.id === id);
      if (node) {
        foundNode = node;
        break;
      }
    }
    if (!foundNode?.item) return;
    const item = foundNode.item;
    const desc = item.system?.description?.value ?? item.system?.description ?? "";
    const content = `
      <div class="mythcraft chat-card talent-share-card">
        <header class="card-header flexrow" style="display:flex;align-items:center;gap:8px;border-bottom:1px solid #246975;padding-bottom:6px;margin-bottom:6px;">
          <img src="${item.img}" title="${item.name}" width="32" height="32" style="border-radius:4px;border:1px solid #d4af37;"/>
          <h3 class="item-name" style="margin:0;color:#feebb3;font-family:'Cinzel',serif;">${item.name}</h3>
        </header>
        <div class="card-content" style="font-size:12px;line-height:1.4;">${desc}</div>
      </div>
    `;
    const rollMode = globalThis.game?.settings?.get("core", "rollMode") || "publicroll";
    const msgData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
    };
    if (typeof ChatMessage.applyRollMode === "function") {
      ChatMessage.applyRollMode(msgData, rollMode);
    }
    await ChatMessage.create(msgData);
  }

  static #onFocusSection(event, target) {
    const sel = target.dataset.targetSection;
    if (!sel || !this.element) return;
    const el = this.element.querySelector(sel);
    if (el) {
      CcxSound.playStagePan();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("lud-pulse-highlight");
      setTimeout(() => el.classList.remove("lud-pulse-highlight"), 1200);
    }
  }

  static async #onToggleCcxSound(event, target) {
    event.preventDefault();
    const cur = Boolean(getSetting("ccxSoundEnabled", true));
    await setSetting("ccxSoundEnabled", !cur);
    if (!cur) CcxSound.playConfirm();
    this.render();
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Form Submission / Application
   * ────────────────────────────────────────────────────────────────────────── */

  static async #onSubmitForm(event, form, formData) {
    const tgtLvl = this._targetLevel;
    const curLvl = this._currentLevel;
    const isRecalculate = this._mode === "recalculate";
    const isLevelUp = tgtLvl > curLvl && curLvl > 0;
    const levelsGained = Math.max(1, tgtLvl - (isRecalculate ? 0 : curLvl));
    const endVal = getAttributeValue(this.actor, "end") + (this._attributeChanges.end || 0);
    const activeTh = getEnduranceThreshold(endVal);

    let newMaxHp = Number(this.actor.system.hp?.max ?? 0);
    let hpGainDesc = "";

    if (this._chosenHpMethod === "set" || !activeTh.die) {
      if (isRecalculate || curLvl === 0) {
        newMaxHp = calculateSetHpTotal(tgtLvl, endVal);
        hpGainDesc = `Set HP Recalculated to <strong>${newMaxHp}</strong>`;
      } else {
        const gain = calculateLevelUpSetHpGain(curLvl, tgtLvl, endVal);
        newMaxHp += gain;
        hpGainDesc = `+<strong>${gain}</strong> Set HP gained`;
      }
    } else {
      let rollFormula = "";
      if (isRecalculate || curLvl === 0) {
        rollFormula = `10 + ${tgtLvl} + ${tgtLvl}${activeTh.die}`;
        const r = new Roll(rollFormula);
        await r.evaluate();
        newMaxHp = r.total;
        hpGainDesc = `Rolled ${r.total} (${rollFormula})`;
        await r.toMessage({
          flavor: `Hit Points Full Recalculation (Level ${tgtLvl}) — ${this.actor.name}`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
      } else {
        rollFormula = `${levelsGained}${activeTh.die} + ${levelsGained}`;
        const r = new Roll(rollFormula);
        await r.evaluate();
        newMaxHp += r.total;
        hpGainDesc = `+<strong>${r.total}</strong> Rolled HP gained (${rollFormula})`;
        await r.toMessage({
          flavor: `Level Up Hit Points Roll (+${levelsGained} level(s)) — ${this.actor.name}`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
      }
    }

    const curHpMax = Number(this.actor.system.hp?.max ?? 0);
    const curHpVal = Number(this.actor.system.hp?.value ?? 0);
    const finalMaxHp = Math.max(1, newMaxHp);
    const hpGain = Math.max(0, finalMaxHp - curHpMax);
    const finalCurrentHp = Math.min(curHpVal + hpGain, finalMaxHp);
    const updates = {
      "system.level": tgtLvl,
      "system.hp.max": finalMaxHp,
      "system.hp.value": finalCurrentHp,
    };

    const totalNetMod = Object.values(this._attributeChanges).reduce((sum, value) => sum + value, 0);
    if (levelsGained > 0 && totalNetMod > levelsGained) {
      ui.notifications.warn(`Spend no more than ${levelsGained} attribute point${levelsGained === 1 ? "" : "s"}.`);
      return;
    }

    // Validate no attribute went below -5
    for (const [key, mod] of Object.entries(this._attributeChanges)) {
      const base = getAttributeValue(this.actor, key);
      if (base + mod < -5) {
        ui.notifications.warn(`${key.toUpperCase()} cannot go below -5.`);
        return;
      }
    }

    // Soft warning if leveling up without a talent selected
    if (isLevelUp && !this._selectedTalent) {
      ui.notifications.warn("No talent was selected for this level-up. You can choose one later from the Talent Trees.");
    }

    // Apply attribute advancements (including negative reallocation moves)
    for (const [key, mod] of Object.entries(this._attributeChanges)) {
      if (mod !== 0) {
        const base = getAttributeValue(this.actor, key);
        const finalVal = base + mod;
        if (key === "luck" || key === "lck") {
          updates["system.attributes.luck"] = finalVal;
          updates["system.attributes.lck"] = finalVal;
        } else {
          const currentAttribute = this.actor.system.attributes?.[key];
          const path = currentAttribute && typeof currentAttribute === "object" && "value" in currentAttribute
            ? `system.attributes.${key}.value`
            : `system.attributes.${key}`;
          updates[path] = finalVal;
        }
      }
    }

    // Coordination (COR) AP progression: increase current AP if max AP increases
    const oldCor = getAttributeValue(this.actor, "cor");
    const corMod = this._attributeChanges.cor || 0;
    if (corMod > 0) {
      const oldApMax = calculateApMax(oldCor, this.actor.system?.ap?.override);
      const newApMax = calculateApMax(oldCor + corMod, this.actor.system?.ap?.override);
      if (newApMax > oldApMax) {
        const apGain = newApMax - oldApMax;
        const curApVal = Number(this.actor.system?.ap?.value ?? 0);
        updates["system.ap.value"] = Math.min(newApMax, curApVal + apGain);
        updates["system.ap.max"] = newApMax;
      }
    }

    // Apply selected talent and extra talents
    if (this._selectedTalent) {
      const parsed = parseTalentData(this._selectedTalent);
      if (parsed?.isMagicEntry && parsed.extraStackTalents > 0) {
        if (this._selectedExtraTalentIds.length < parsed.extraStackTalents) {
          const stackLabel = (parsed.magicStackTag || "magic").toUpperCase();
          ui.notifications.warn(`Please select ${parsed.extraStackTalents} additional talents from the ${stackLabel} stack before applying advancement (${this._selectedExtraTalentIds.length}/${parsed.extraStackTalents} selected).`);
          return;
        }
      }

      const itemsToCreate = [this._selectedTalent.toObject()];
      for (const grant of parsed?.grantedTalents || []) {
        if (grant.type === "grant_talent" && grant.talentName) {
          const gClean = String(grant.talentName).toLowerCase().trim();
          const grantedDoc = (this._cachedAllTalents || this._cachedMagicTalents || []).find(t => String(t.name || "").toLowerCase().trim() === gClean);
          if (grantedDoc?.toObject) itemsToCreate.push(grantedDoc.toObject());
        }
      }
      for (const extraId of this._selectedExtraTalentIds) {
        const extraItem = (this._cachedMagicTalents || []).find(t => (t.id || t._id) === extraId);
        if (extraItem?.toObject) itemsToCreate.push(extraItem.toObject());
      }
      for (const it of itemsToCreate) {
        if (isDefaultIcon(it.img)) {
          it.img = resolveItemIcon(it, it.img, it.type || "talent");
        }
      }
      await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
      await syncActorTalentActiveEffects(this.actor, { notify: false });

      // Apply Magic Entry benefits if applicable
      if (parsed?.isMagicEntry) {
        const spAmount = parsed.spBonus || 10;
        const currentSpMax = Number(this.actor.system?.sp?.max) || 0;
        const currentSpVal = Number(this.actor.system?.sp?.value) || 0;
        updates["system.sp.max"] = currentSpMax + spAmount;
        updates["system.sp.value"] = currentSpVal + spAmount;

        const stackTag = (parsed.magicStackTag || "").toLowerCase().replace(/\s*magic\s*$/i, "").trim();
        if (stackTag && !this.actor.system?.powerLevel?.[stackTag]) {
          updates[`system.powerLevel.${stackTag}`] = parsed.magicPowerBonus || 1;
        }
      }
    }

    // Apply selected lineage milestone feature (Levels 5, 10, 15, 20, 25, 29)
    const isLineageMilestone = isLevelUp && [5, 10, 15, 20, 25, 29].includes(tgtLvl);
    if (isLineageMilestone) {
      if (this._selectedMilestoneFeatureId) {
        const milestoneDoc = (this._cachedLineageDocs || []).find(d => (d.id || d._id) === this._selectedMilestoneFeatureId);
        if (milestoneDoc?.toObject) {
          const itemObj = milestoneDoc.toObject();
          if (isDefaultIcon(itemObj.img)) {
            itemObj.img = resolveItemIcon(itemObj, itemObj.img, "feature");
          }
          await this.actor.createEmbeddedDocuments("Item", [itemObj]);
        }
      } else {
        ui.notifications.warn("No lineage milestone feature was selected for this level-up. You can choose one later from compendiums.");
      }
    }

    await playAwakeningFinaleSequence(
      this.element,
      this.actor,
      "ASCENSION COMPLETE",
      `Advanced to Level ${tgtLvl}${this._selectedTalent ? ` • ${this._selectedTalent.name}` : ""}`
    );

    await this.actor.update(updates);

    ui.notifications.info(`${this.actor.name} advanced to Level ${tgtLvl}! (${hpGainDesc})`);
  }
}
