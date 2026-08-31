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
      if (doc.type === "talent" || doc.type === "feature" || !doc.type) {
        doc._compCategory = "class";
        allTalents.push(doc);
      }
    }
    for (const doc of specTalents) {
      if (doc.type === "talent" || doc.type === "feature" || !doc.type) {
        doc._compCategory = "specialization";
        allTalents.push(doc);
      }
    }
    for (const doc of magicTalents) {
      if (doc.type === "talent" || doc.type === "feature" || !doc.type) {
        doc._compCategory = "magic";
        allTalents.push(doc);
      }
    }

    this.trees = buildTalentTrees(allTalents, actorTalents);

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
        // Update isStarted since availability changed
        tree.isStarted = tree.nodes.some(n => n.isOwned);
      }
    }
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    if (this.trees.length === 0) {
      await this.loadTrees();
    }

    const startedTrees = this.trees.filter(t => t.isStarted);
    const hasStarted = startedTrees.length > 0;
    let displayTrees = this.trees;

    // Filter by Active Tab
    if (this.activeCategory === "character") {
      displayTrees = startedTrees;
    } else if (this.activeCategory !== "all") {
      displayTrees = this.trees.filter(tree => tree.category === this.activeCategory);
    }

    const query = (this.searchTerm || "").trim().toLowerCase();
    if (query) {
      displayTrees = displayTrees.filter(tree => {
        const trackText = `${tree.trackTitle || ""} ${tree.root?.name || ""} ${tree.nodes?.map(n => n?.name || "").join(" ")}`.toLowerCase();
        return trackText.includes(query);
      });
    }

    // Prepare presentation tracks with expansion state
    const tracks = displayTrees.map(tree => {
      // In "Your Character" tab, started tracks are expanded by default unless explicitly collapsed
      const isExpanded = (this.activeCategory === "character")
        ? !this.expandedTrackTitles.has(`collapsed:${tree.trackTitle}`)
        : (Boolean(query) || this.expandedTrackTitles.has(tree.trackTitle));

      const ownedCount = tree.nodes.filter(n => n.isOwned).length;
      const availableCount = tree.nodes.filter(n => n.isAvailable && !n.isOwned).length;

      return {
        ...tree,
        isExpanded,
        ownedCount,
        availableCount,
        totalNodesCount: tree.nodes.length,
      };
    });

    // Group class tracks by class name for hierarchical display
    const classGroupMap = new Map();
    for (const track of tracks) {
      if (track.category === "class") {
        const groupName = track.className || track.trackTitle.replace(/ TRACK$/, "");
        if (!classGroupMap.has(groupName)) {
          classGroupMap.set(groupName, { className: groupName, tracks: [] });
        }
        classGroupMap.get(groupName).tracks.push(track);
      }
    }
    const classGroups = Array.from(classGroupMap.values()).sort((a, b) => a.className.localeCompare(b.className));

    return {
      actor: this.actor,
      isPickerMode: this.isPickerMode,
      trees: tracks,
      classGroups,
      totalTracksCount: this.trees.length,
      startedTracksCount: startedTrees.length,
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

    // Setup live search listener with cursor and focus restoration
    const searchInput = this.element.querySelector("input.tree-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        this.searchTerm = e.target.value;
        const cursorPos = e.target.selectionStart;
        this.render();
        setTimeout(() => {
          const fresh = this.element.querySelector("input.tree-search-input");
          if (fresh) {
            fresh.focus();
            try { fresh.setSelectionRange(cursorPos, cursorPos); } catch (_) {}
          }
        }, 20);
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static #onToggleTrackExpand(event, target) {
    event.preventDefault();
    const trackTitle = target.dataset.trackTitle || target.closest(".srd-track-column")?.dataset.trackTitle;
    if (!trackTitle) return;

    if (this.activeCategory === "character") {
      const collapseKey = `collapsed:${trackTitle}`;
      if (this.expandedTrackTitles.has(collapseKey)) {
        this.expandedTrackTitles.delete(collapseKey);
      } else {
        this.expandedTrackTitles.add(collapseKey);
      }
    } else {
      if (this.expandedTrackTitles.has(trackTitle)) {
        this.expandedTrackTitles.delete(trackTitle);
      } else {
        this.expandedTrackTitles.add(trackTitle);
      }
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

