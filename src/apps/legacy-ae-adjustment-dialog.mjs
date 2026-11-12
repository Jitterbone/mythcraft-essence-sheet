/**
 * MythCraft Essence — Legacy Sheet Active Effect Adjustment Dialog
 *
 * Allows GMs to select character sheets and automatically subtract enabled
 * Canonical Talent/Feature Library Active Effect bonuses from saved base values
 * so legacy sheets do not double-count bonuses when Active Effects are enabled.
 */

import {
  previewLegacyActorAeAdjustment,
  applyLegacyActorAeAdjustment,
} from "../features/active-effect-engine.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const MODULE_ID = "mythcraft-essence-sheet";

export default class LegacyAeAdjustmentDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "legacy-ae-adjustment-dialog"],
    window: {
      title: "Adjust Legacy Sheets for Active Effects",
      icon: "fas fa-sliders",
      resizable: true,
    },
    position: {
      width: 760,
      height: 680,
    },
    form: {
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      selectAll: this.#onSelectAll,
      selectWithChanges: this.#onSelectWithChanges,
      deselectAll: this.#onDeselectAll,
      proceedToConfirm: this.#onProceedToConfirm,
      backToSelect: this.#onBackToSelect,
      executeAdjustment: this.#onExecuteAdjustment,
      copyLog: this.#onCopyLog,
      closeDialog: this.#onCloseDialog,
    },
  };

  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/legacy-ae-adjustment-dialog.hbs",
    },
  };

  constructor(options = {}) {
    super(options);
    this._step = "select"; // "select" | "confirm" | "results"
    this._selectedIds = new Set();
    this._initializedSelection = false;
    this._logs = [];
    this._plainTextLog = "";
  }

  _syncCheckboxesFromDom() {
    if (!this.element) return;
    const boxes = this.element.querySelectorAll("input[name='selectedActorId']");
    if (boxes.length === 0) return;
    this._selectedIds.clear();
    for (const box of boxes) {
      if (box.checked && box.value) this._selectedIds.add(box.value);
    }
  }

  async _prepareContext() {
    const actors = Array.from(game.actors || [])
      .filter(a => a.type === "character")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const previews = actors.map(actor => previewLegacyActorAeAdjustment(actor));

    if (!this._initializedSelection) {
      for (const p of previews) {
        if (p.hasChanges) this._selectedIds.add(p.actorId);
      }
      this._initializedSelection = true;
    }

    const characterRows = previews.map(p => ({
      ...p,
      checked: this._selectedIds.has(p.actorId),
      adjustmentsFormatted: p.adjustments.map(adj => ({
        ...adj,
        deltaLabel: adj.changeAmount >= 0 ? `+${adj.changeAmount}` : `${adj.changeAmount}`,
      })),
    }));

    const selectedRows = characterRows.filter(r => r.checked);
    const selectedWithChangesCount = selectedRows.filter(r => r.hasChanges).length;
    const talentAutomationEnabled = Boolean(game.settings.get(MODULE_ID, "talentAutomation"));

    const updatedActorsCount = this._logs.filter(l => l.updated).length;
    const totalFieldsAdjusted = this._logs.reduce((sum, l) => sum + (l.updated ? l.changed.length : 0), 0);

    return {
      step: this._step,
      isSelectStep: this._step === "select",
      isConfirmStep: this._step === "confirm",
      isResultsStep: this._step === "results",
      talentAutomationEnabled,
      characterRows,
      hasCharacters: characterRows.length > 0,
      selectedRows,
      selectedCount: selectedRows.length,
      selectedWithChangesCount,
      logs: this._logs.map(l => ({
        ...l,
        changed: l.changed.map(c => ({
          ...c,
          deltaLabel: c.changeAmount >= 0 ? `+${c.changeAmount}` : `${c.changeAmount}`,
        })),
      })),
      updatedActorsCount,
      totalFieldsAdjusted,
      plainTextLog: this._plainTextLog,
    };
  }

  static #onSelectAll() {
    for (const actor of game.actors || []) {
      if (actor.type === "character") this._selectedIds.add(actor.id);
    }
    this.render(false);
  }

  static #onSelectWithChanges() {
    this._selectedIds.clear();
    for (const actor of game.actors || []) {
      if (actor.type !== "character") continue;
      const preview = previewLegacyActorAeAdjustment(actor);
      if (preview.hasChanges) this._selectedIds.add(actor.id);
    }
    this.render(false);
  }

  static #onDeselectAll() {
    this._selectedIds.clear();
    this.render(false);
  }

  static #onProceedToConfirm() {
    this._syncCheckboxesFromDom();
    if (this._selectedIds.size === 0) {
      ui.notifications?.warn("Please select at least one character sheet first.");
      return;
    }
    this._step = "confirm";
    this.render(false);
  }

  static #onBackToSelect() {
    this._step = "select";
    this.render(false);
  }

  static async #onExecuteAdjustment() {
    const logs = [];
    for (const actorId of this._selectedIds) {
      const actor = game.actors?.get(actorId);
      if (!actor || actor.type !== "character") continue;
      const entry = await applyLegacyActorAeAdjustment(actor);
      logs.push(entry);
    }

    this._logs = logs;
    this._plainTextLog = LegacyAeAdjustmentDialog.#buildPlainTextLog(logs);
    this._step = "results";

    for (const app of Object.values(ui.windows || {})) {
      if (app?.actor && this._selectedIds.has(app.actor.id)) {
        app.render(false);
      }
    }

    this.render(false);
  }

  static async #onCopyLog() {
    try {
      await navigator.clipboard.writeText(this._plainTextLog || "");
      ui.notifications?.info("Adjustment log copied to clipboard.");
    } catch (_) {
      ui.notifications?.warn("Could not copy automatically. Please select and copy the log text.");
    }
  }

  static #onCloseDialog() {
    this.close();
  }

  static #buildPlainTextLog(logs) {
    const lines = [
      `MythCraft Essence — Legacy Sheet Active Effect Adjustment Log (${new Date().toLocaleString()})`,
      "=".repeat(72),
    ];
    for (const entry of logs) {
      lines.push(`\nCharacter: ${entry.actorName} (${entry.actorId})`);
      if (entry.error) {
        lines.push(`  ERROR: ${entry.error}`);
        continue;
      }
      if (entry.changed.length === 0 && entry.skipped.length === 0) {
        lines.push("  No Canonical Library Active Effect adjustments were needed.");
        continue;
      }
      for (const c of entry.changed) {
        lines.push(`  CHANGED ${c.label}: ${c.currentBase} -> ${c.newBase} (${c.changeAmount >= 0 ? "+" : ""}${c.changeAmount})`);
        lines.push(`    Why: Subtracted active bonus from Canonical Library effect(s): ${c.reasonText}`);
      }
      for (const s of entry.skipped) {
        lines.push(`  SKIPPED ${s.label}: ${s.skipReason} (Effect(s): ${s.reasonText})`);
      }
    }
    return lines.join("\n");
  }
}
