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
} from "../features/hp-automation.mjs";
import {
  getAttributeLevelCap,
  getAvailableCompendiums,
  loadPacksDocuments,
  checkTalentAvailability,
  parseProfessionData,
} from "../features/compendium-parser.mjs";
import TalentTreeViewer from "./talent-tree-viewer.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const getAttributeValue = (actor, key) => Number(actor?.system?.attributes?.[key]?.value ?? actor?.system?.attributes?.[key] ?? 0);

export { ENDURANCE_THRESHOLDS as ENDURANCE_THRESHOLD_CHART, getEnduranceThreshold as getHpDataForEndurance };

export default class LevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "level-up-dialog"],
    window: {
      title: "Level Up & Progression",
      icon: "fas fa-arrow-up-right-dots",
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
    this._attributeChanges = {
      str: 0,
      dex: 0,
      end: 0,
      awr: 0,
      int: 0,
      cha: 0,
    };

    // Profession Rank Up
    this._increaseProfessionRank = false;

    // Selected Talent for this level
    this._selectedTalent = null;
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

    // Attributes list with current and preview values
    const attributesList = ["str", "dex", "end", "awr", "int", "cha"].map(key => {
      const base = getAttributeValue(this.actor, key);
      const mod = this._attributeChanges[key] || 0;
      return {
        key,
        label: key.toUpperCase(),
        base,
        mod,
        preview: base + mod,
        isAtCap: (base + mod) >= levelCap,
      };
    });

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
    };
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
    const base = Number(this.actor.system.attributes?.[attr]?.value ?? this.actor.system.attributes?.[attr] ?? 0);
    const curMod = this._attributeChanges[attr] || 0;
    const nextMod = curMod + delta;

    const levelCap = getAttributeLevelCap(this._targetLevel);
    if (base + nextMod > levelCap) {
      ui.notifications.warn(`Attributes cannot exceed +${levelCap} at level ${this._targetLevel}.`);
      return;
    }

    if (nextMod < 0) return;

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
      onSelectTalent: (talent) => {
        this._selectedTalent = talent;
        this.render();
      },
    });
    viewer.render(true);
  }

  static #onClearSelectedTalent(event, target) {
    this._selectedTalent = null;
    this.render();
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Form Submission / Application
   * ────────────────────────────────────────────────────────────────────────── */

  static async #onSubmitForm(event, form, formData) {
    const tgtLvl = this._targetLevel;
    const curLvl = this._currentLevel;
    const isRecalculate = this._mode === "recalculate";
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

    const updates = {
      "system.level": tgtLvl,
      "system.hp.max": Math.max(1, newMaxHp),
    };

    const attrPointsRemaining = Math.max(0, levelsGained - Object.values(this._attributeChanges).reduce((sum, value) => sum + value, 0));
    if (levelsGained > 0 && Object.values(this._attributeChanges).reduce((sum, value) => sum + value, 0) > levelsGained) {
      ui.notifications.warn(`Spend no more than ${levelsGained} attribute point${levelsGained === 1 ? "" : "s"}.`);
      return;
    }

    // Apply attribute advancements
    for (const [key, mod] of Object.entries(this._attributeChanges)) {
      if (mod > 0) {
        const currentAttribute = this.actor.system.attributes?.[key];
        const base = getAttributeValue(this.actor, key);
        const path = currentAttribute && typeof currentAttribute === "object" && "value" in currentAttribute
          ? `system.attributes.${key}.value`
          : `system.attributes.${key}`;
        updates[path] = base + mod;
      }
    }

    await this.actor.update(updates);

    // Apply selected talent
    if (this._selectedTalent) {
      await this.actor.createEmbeddedDocuments("Item", [this._selectedTalent.toObject()]);
    }

    ui.notifications.info(`${this.actor.name} advanced to Level ${tgtLvl}! (${hpGainDesc})`);
  }
}
