/**
 * mythcraft-essence-sheet | src/apps/talent-tree-viewer.mjs
 *
 * Interactive Visual Talent Tree Viewer and Picker for MythCraft.
 */

import {
  getAvailableCompendiums,
  loadPacksDocuments,
  buildTalentTrees,
  parseTalentData,
} from "../features/compendium-parser.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class TalentTreeViewer extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.isPickerMode = options.isPickerMode ?? false;
    this.onSelectTalent = options.onSelectTalent ?? null;
    this.trees = [];
    this.activeCategory = "all"; // "all" | "class" | "spec" | "magic"
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "talent-tree-viewer",
    classes: ["mythcraft", "essence-dialog", "talent-tree-viewer-dialog"],
    tag: "div",
    window: {
      title: "MythCraft — Talent Tree & Tracks",
      icon: "fas fa-diagram-project",
      resizable: true,
    },
    position: {
      width: 960,
      height: 740,
    },
    actions: {
      viewTalent: this.#onViewTalent,
      postTalent: this.#onPostTalent,
      chooseTalent: this.#onChooseTalent,
      filterCategory: this.#onFilterCategory,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    viewer: {
      template: "modules/mythcraft-essence-sheet/templates/essence/apps/talent-tree-viewer.hbs",
    },
  };

  /**
   * Loads talents from compendiums and builds interactive tree graphs.
   */
  async loadTrees() {
    const packs = getAvailableCompendiums();
    const actorTalents = this.actor.items.filter(i => i.type === "talent" || i.type === "feature");

    const allTalents = [];
    
    // Load class, spec, and magic talents
    const classTalents = await loadPacksDocuments(packs.classes, { type: "talent" });
    const specTalents = await loadPacksDocuments(packs.specTalents, { type: "talent" });
    const magicTalents = await loadPacksDocuments(packs.magic, { type: "talent" });

    allTalents.push(...classTalents, ...specTalents, ...magicTalents);

    // Also include any custom talents from actor or other packs
    for (const at of actorTalents) {
      if (!allTalents.some(t => t.name === at.name)) {
        allTalents.push(at);
      }
    }

    this.trees = buildTalentTrees(allTalents, actorTalents);
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    if (this.trees.length === 0) {
      await this.loadTrees();
    }

    const actorTalents = this.actor.items.filter(i => i.type === "talent" || i.type === "feature");

    // In viewer mode (non-picker), only show trees the character has started
    let displayTrees = this.isPickerMode 
      ? this.trees 
      : this.trees.filter(t => t.isStarted);

    if (!this.isPickerMode && displayTrees.length === 0) {
      // If character has no started trees, show all available root tracks
      displayTrees = this.trees.slice(0, 4);
    }

    return {
      actor: this.actor,
      isPickerMode: this.isPickerMode,
      trees: displayTrees,
      hasStartedTrees: this.trees.some(t => t.isStarted),
      activeCategory: this.activeCategory,
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static async #onViewTalent(event, target) {
    const talentId = target.dataset.talentId;
    const tree = this.trees.find(t => t.nodes.some(n => n.id === talentId));
    const node = tree?.nodes.find(n => n.id === talentId);
    if (!node || !node.item) return;

    if (typeof node.item.sheet?.render === "function") {
      node.item.sheet.render(true);
    }
  }

  static async #onPostTalent(event, target) {
    const talentId = target.dataset.talentId;
    const tree = this.trees.find(t => t.nodes.some(n => n.id === talentId));
    const node = tree?.nodes.find(n => n.id === talentId);
    if (!node || !node.item) return;

    const desc = node.item.system?.description?.value ?? node.item.system?.description ?? "";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div class="mythcraft-statblock talent-chat-card">
          <div class="talent-chat-header" style="display:flex; align-items:center; gap:8px; border-bottom:1px solid #246975; padding-bottom:6px; margin-bottom:6px;">
            <img src="${node.img || 'icons/svg/aura.svg'}" style="width:28px; height:28px; border-radius:4px; border:1px solid #FEEBB3;" />
            <h3 style="margin:0; font-family:'Cinzel', serif; color:#FEEBB3; font-size:14px;">${node.name}</h3>
          </div>
          <div class="talent-chat-body" style="font-size:12px; color:#e2e8f0; line-height:1.4;">
            ${desc}
          </div>
        </div>
      `,
    });
  }

  static async #onChooseTalent(event, target) {
    const talentId = target.dataset.talentId;
    const tree = this.trees.find(t => t.nodes.some(n => n.id === talentId));
    const node = tree?.nodes.find(n => n.id === talentId);
    if (!node || !node.item) return;

    if (typeof this.onSelectTalent === "function") {
      this.onSelectTalent(node.item);
      this.close();
    }
  }

  static #onFilterCategory(event, target) {
    this.activeCategory = target.dataset.category || "all";
    this.render();
  }
}

