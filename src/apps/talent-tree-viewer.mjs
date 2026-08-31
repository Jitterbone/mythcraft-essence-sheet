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
  checkTalentAvailability,
} from "../features/compendium-parser.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class TalentTreeViewer extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.isPickerMode = options.isPickerMode ?? false;
    this.targetLevel = options.targetLevel ?? null;
    this.onSelectTalent = options.onSelectTalent ?? null;
    this.trees = [];
    this.activeCategory = "character"; // "character" | "class" | "specialization" | "magic" | "all"
    this.searchTerm = "";
    this.expandedRootIds = new Set();
    this.expandedTrackTitles = new Set();
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "talent-tree-viewer",
    classes: ["mythcraft", "essence-dialog", "talent-tree-viewer-dialog"],
    tag: "div",
    window: {
      title: "MythCraft — Talent Trees & Tracks",
      icon: "fas fa-diagram-project",
      resizable: true,
    },
    position: {
      width: 980,
      height: 760,
    },
    actions: {
      viewTalent: this.#onViewTalent,
      postTalent: this.#onPostTalent,
      chooseTalent: this.#onChooseTalent,
      filterCategory: this.#onFilterCategory,
      toggleRootExpand: this.#onToggleRootExpand,
      toggleTrackExpand: this.#onToggleTrackExpand,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    viewer: {
      template: "modules/mythcraft-essence-sheet/templates/essence/apps/talent-tree-viewer.hbs",
    },
  };

  /**
   * Loads talents from Class, Specialization, and Magic compendiums and builds tree graphs.
   */
  async loadTrees() {
    const packs = getAvailableCompendiums();
    const actorTalents = this.actor.items.filter(i => i.type === "talent" || i.type === "feature");

    // ONLY source talents found in the Class, Magic, and Specialization Talents compendiums
    const classTalents = await loadPacksDocuments(packs.classes);
    const specTalents = await loadPacksDocuments(packs.specTalents);
    const magicTalents = await loadPacksDocuments(packs.magic);

    const allTalents = [];

    for (const doc of classTalents) {
      if (doc.type === "talent" || doc.type === "feature") {
        doc._compCategory = "class";
        allTalents.push(doc);
      }
    }
    for (const doc of specTalents) {
      if (doc.type === "talent" || doc.type === "feature") {
        doc._compCategory = "specialization";
        allTalents.push(doc);
      }
    }
    for (const doc of magicTalents) {
      if (doc.type === "talent" || doc.type === "feature") {
        doc._compCategory = "magic";
        allTalents.push(doc);
      }
    }

    this.trees = buildTalentTrees(allTalents, actorTalents, { effectiveLevel: this.targetLevel });

    // If opened from level-up with a targetLevel, re-evaluate availability using that level
    if (this.targetLevel !== null) {
      for (const tree of this.trees) {
        for (const node of tree.nodes) {
          if (node.item) {
            const avail = checkTalentAvailability(node.item, actorTalents, { effectiveLevel: this.targetLevel });
            node.isAvailable = avail.isAvailable;
            node.missingPrereqs = avail.missingPrereqs;
            node.prereqTooltip = avail.prereqTooltip;
          }
        }
        tree.isStarted = tree.nodes.some(n => n.isOwned);
      }
    }
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    if (this.trees.length === 0) {
      await this.loadTrees();
    }

    const startedTrees = this.trees.filter(tree => tree.isStarted);
    const hasStarted = startedTrees.length > 0;
    let displayTrees = this.trees;

    // Filter by Active Tab
    if (this.activeCategory === "character") {
      displayTrees = startedTrees;
    } else if (this.activeCategory !== "all") {
      displayTrees = this.trees.filter(tree => tree.category === this.activeCategory);
    }

    // Prepare presentation root trees with expansion state and stats
    const rootTrees = displayTrees.map(tree => {
      // In category views, root trees are expanded by default unless collapsed
      const isExpanded = !this.expandedRootIds.has(`collapsed:${tree.id}`);

      const ownedCount = tree.nodes.filter(n => n.isOwned).length;
      const availableCount = tree.nodes.filter(n => n.isAvailable && !n.isOwned).length;

      const tracks = tree.tracks.map(track => {
        const isTrackExpanded = !this.expandedTrackTitles.has(`collapsed:${track.trackTitle}`);
        const trackOwnedCount = track.nodes.filter(n => n.isOwned).length;
        const trackAvailableCount = track.nodes.filter(n => n.isAvailable && !n.isOwned).length;

        return {
          ...track,
          isExpanded: isTrackExpanded,
          ownedCount: trackOwnedCount,
          availableCount: trackAvailableCount,
          totalNodesCount: track.nodes.length,
        };
      });

      return {
        ...tree,
        isExpanded,
        ownedCount,
        availableCount,
        totalNodesCount: tree.nodes.length,
        tracks,
      };
    });

    return {
      actor: this.actor,
      isPickerMode: this.isPickerMode,
      trees: rootTrees,
      totalTreesCount: this.trees.length,
      startedTreesCount: startedTrees.length,
      hasStartedTrees: hasStarted,
      activeCategory: this.activeCategory,
      searchTerm: this.searchTerm,
    };
  }

  /** @inheritdoc */
  _preRender(context, options) {
    if (!this._savedScrollTop) this._savedScrollTop = 0;
    if (this.element) {
      const canvas = this.element.querySelector(".srd-tracks-viewport, .tree-canvas-container");
      if (canvas) this._savedScrollTop = canvas.scrollTop;
    }
    return super._preRender?.(context, options);
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender?.(context, options);

    // Restore scroll position after re-render
    if (this._savedScrollTop != null && this.element) {
      const canvas = this.element.querySelector(".srd-tracks-viewport, .tree-canvas-container");
      if (canvas) canvas.scrollTop = this._savedScrollTop;
    }

    // Instant client-side DOM search filter (no focus-destroying re-renders while typing)
    const searchInput = this.element.querySelector("input.tree-search-input");
    if (searchInput) {
      if (this.searchTerm) searchInput.value = this.searchTerm;

      const performFilter = (term) => {
        const cleanTerm = (term || "").toLowerCase().trim();
        const rootSections = this.element.querySelectorAll(".srd-root-tree-column");

        if (!cleanTerm) {
          rootSections.forEach(el => (el.style.display = ""));
          return;
        }

        rootSections.forEach(root => {
          const text = (root.textContent || "").toLowerCase();
          root.style.display = text.includes(cleanTerm) ? "" : "none";
        });
      };

      if (this.searchTerm) performFilter(this.searchTerm);

      searchInput.addEventListener("input", e => {
        this.searchTerm = e.target.value;
        performFilter(this.searchTerm);
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static #onToggleRootExpand(event, target) {
    event.preventDefault();
    const rootId = target.dataset.rootId || target.closest("[data-root-id]")?.dataset.rootId;
    if (!rootId) return;

    const collapseKey = `collapsed:${rootId}`;
    if (this.expandedRootIds.has(collapseKey)) {
      this.expandedRootIds.delete(collapseKey);
    } else {
      this.expandedRootIds.add(collapseKey);
    }
    this.render();
  }

  static #onToggleTrackExpand(event, target) {
    event.preventDefault();
    const trackTitle = target.dataset.trackTitle || target.closest(".srd-track-column")?.dataset.trackTitle;
    if (!trackTitle) return;

    const collapseKey = `collapsed:${trackTitle}`;
    if (this.expandedTrackTitles.has(collapseKey)) {
      this.expandedTrackTitles.delete(collapseKey);
    } else {
      this.expandedTrackTitles.add(collapseKey);
    }
    this.render();
  }

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
    this.activeCategory = target.dataset.category || "character";
    this.render();
  }
}

