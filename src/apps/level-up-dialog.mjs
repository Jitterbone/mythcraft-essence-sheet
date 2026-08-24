/**
 * MythCraft Essence — Level Up & HP Calculator Dialog
 *
 * Interactive modal for leveling up character actors and managing HP progression
 * based on MythCraft Endurance Thresholds.
 */

import {
  ENDURANCE_THRESHOLDS,
  getEnduranceThreshold,
  calculateSetHpTotal,
  calculateLevelUpSetHpGain,
} from "../features/hp-automation.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class LevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "level-up-dialog"],
    window: {
      title: "Level Up & HP Calculator",
      icon: "fas fa-arrow-up-right-dots",
      resizable: true,
    },
    position: {
      width: 660,
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
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Context Preparation
   * ────────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const curLvl = this._currentLevel;
    const tgtLvl = this._targetLevel;
    const endVal = Number(this.actor.system.attributes?.end ?? 0);
    const activeTh = getEnduranceThreshold(endVal);

    const curHpMax = Number(this.actor.system.hp?.max ?? 0);
    const curHpVal = Number(this.actor.system.hp?.value ?? 0);

    const isLevelUp = tgtLvl > curLvl && curLvl > 0;
    const isInitialBuild = curLvl === 0;
    const isRecalculate = this._mode === "recalculate";

    const levelsGained = Math.max(1, tgtLvl - (isRecalculate ? 0 : curLvl));

    // Calculate Set HP values
    const fullSetHpTotal = calculateSetHpTotal(tgtLvl, endVal);
    const incrementalSetHpGain = calculateLevelUpSetHpGain(curLvl, tgtLvl, endVal);

    // Threshold breakdown table
    const thresholdList = ENDURANCE_THRESHOLDS.map(th => ({
      ...th,
      isActive: th.threshold === activeTh.threshold,
    }));

    // Dice formula preview
    let diceFormula = "";
    if (activeTh.die) {
      diceFormula = isRecalculate || isInitialBuild
        ? `${tgtLvl}${activeTh.die}`
        : `${levelsGained}${activeTh.die}`;
    }

    // Determine final Preview Max HP based on chosen method
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
      // Rolled HP
      if (isRecalculate || isInitialBuild) {
        previewMaxHp = `10 + ${tgtLvl} + [${diceFormula}]`;
        previewGainText = `Will roll ${diceFormula} in chat (+10 base + ${tgtLvl} level) upon applying`;
      } else {
        previewMaxHp = `${curHpMax} + [${diceFormula} + ${levelsGained}]`;
        previewGainText = `Will roll ${diceFormula} in chat (+${levelsGained} level) upon applying`;
      }
    }

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
    if (this._targetLevel < 20) {
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
    if (!isNaN(val) && val >= 1 && val <= 20) {
      this._targetLevel = val;
      this.render();
    }
  }

  static async #onSetMode(event, target) {
    event.preventDefault();
    const mode = target.dataset.mode || "levelUp";
    this._mode = mode;
    this.render();
  }

  static async #onSelectMethod(event, target) {
    event.preventDefault();
    const method = target.dataset.method || target.closest("[data-method]")?.dataset.method || "set";
    this._chosenHpMethod = method;
    this.render();
  }

  static async #onRecalculateAllHp(event, target) {
    event.preventDefault();
    this._mode = "recalculate";
    this._chosenHpMethod = "set";
    this.render();
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Form Submission / Update Execution
   * ────────────────────────────────────────────────────────────────────────── */

  static async #onSubmitForm(event, form, formData) {
    const endVal = Number(this.actor.system.attributes?.end ?? 0);
    const activeTh = getEnduranceThreshold(endVal);
    const curLvl = this._currentLevel;
    const tgtLvl = this._targetLevel;
    const curHpMax = Number(this.actor.system.hp?.max ?? 0);
    const curHpVal = Number(this.actor.system.hp?.value ?? 0);

    const isRecalculate = this._mode === "recalculate" || curLvl === 0;
    const levelsGained = Math.max(1, tgtLvl - (isRecalculate ? 0 : curLvl));

    let finalMaxHp = curHpMax;
    let rollTotal = 0;

    if (this._chosenHpMethod === "rolled" && activeTh.die) {
      const numDice = isRecalculate ? tgtLvl : levelsGained;
      const formula = `${numDice}${activeTh.die}`;

      try {
        const roll = new Roll(formula);
        await roll.evaluate();

        // Post chat message with 3D dice animation
        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: `<div class="mythcraft-chat-card mythcraft-level-up-roll">
            <strong><i class="fas fa-heart-pulse"></i> Level ${tgtLvl} HP Roll</strong>
            <div>Endurance: ${endVal} (${activeTh.label})</div>
            <div>Formula: ${formula}</div>
          </div>`,
        });

        rollTotal = roll.total;

        if (isRecalculate) {
          finalMaxHp = 10 + tgtLvl + rollTotal;
        } else {
          finalMaxHp = curHpMax + levelsGained + rollTotal;
        }
      } catch (err) {
        console.error("MythCraft Essence | Error evaluating HP roll:", err);
        ui.notifications.error("Failed to roll HP dice.");
        return;
      }
    } else {
      // Set HP (Flat / Average)
      if (isRecalculate) {
        finalMaxHp = calculateSetHpTotal(tgtLvl, endVal);
      } else {
        const gain = calculateLevelUpSetHpGain(curLvl, tgtLvl, endVal);
        finalMaxHp = curHpMax + gain;
      }
    }

    const hpDiff = finalMaxHp - curHpMax;
    const newCurrentHp = curLvl === 0 ? finalMaxHp : Math.max(0, curHpVal + Math.max(0, hpDiff));

    await this.actor.update({
      "system.level": tgtLvl,
      "system.hp.max": finalMaxHp,
      "system.hp.value": newCurrentHp,
      "flags.mythcraft-essence-sheet.maxHp": finalMaxHp,
    });

    ui.notifications.info(`Leveled up ${this.actor.name} to Level ${tgtLvl}! Max HP is now ${finalMaxHp}.`);
  }
}
