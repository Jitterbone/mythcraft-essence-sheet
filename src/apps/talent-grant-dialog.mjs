/**
 * mythcraft-essence-sheet | src/apps/talent-grant-dialog.mjs
 *
 * Interactive Dialog & Orchestrator for Granted Talents and Track Picks.
 * When a talent is acquired (via sheet drop, wizard, or level up) that grants
 * another talent (e.g. Cleric Entry -> Disciple of the Divine) or unlocks track
 * picks (e.g. Student of the Arcane -> 2 Arcane Magic picks), this prompts the user
 * with clear Accept/Decline options, filters picks by character prerequisites,
 * and stamps bidirectional parent-child linking flags on both documents.
 */

import {
  TALENT_LIBRARY,
  TALENT_LIBRARY_BY_ID,
  getTalentLibraryEntry,
  getTalentGrantsAndPicks,
  normalizeTalentLibraryName,
} from "../data/talent-library.mjs";
import {
  normalizeTalentName,
} from "../features/talent-canonical-map.mjs";
import {
  getAvailableCompendiums,
  checkTalentAvailability,
  parseTalentData,
} from "../features/compendium-parser.mjs";
import { syncActorTalentActiveEffects } from "../features/active-effect-engine.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "mythcraft-essence-sheet";

export default class TalentGrantDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {object} options
   * @param {Actor} options.actor
   * @param {Item} options.parentItem
   * @param {"grant"|"pick"} options.mode
   * @param {string} [options.talentName]
   * @param {Array<string>} [options.alternatives]
   * @param {string} [options.track]
   * @param {number} [options.count]
   * @param {Array<string>} [options.optionsList]
   * @param {Function} options.resolve
   */
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.parentItem = options.parentItem;
    this.mode = options.mode || "grant";

    // Specific grant data
    this.talentName = options.talentName || "";
    this.alternatives = Array.isArray(options.alternatives) ? options.alternatives : [];
    this.selectedAlternative = this.talentName || (this.alternatives[0] || "");

    // Track pick data
    this.track = options.track || "Stack";
    this.maxCount = Number(options.count) || 1;
    this.optionsList = Array.isArray(options.optionsList) ? options.optionsList : [];
    this._selectedNames = new Set();
    this._expandedNames = new Set();
    this._descriptionCache = new Map();
    this._collapsedSpotlight = false;
    this._searchQuery = "";

    this._resolve = options.resolve || (() => {});
  }

  static DEFAULT_OPTIONS = {
    id: "mythcraft-talent-grant-dialog",
    classes: ["mythcraft-essence", "talent-grant-dialog-window"],
    tag: "div",
    window: {
      title: "MythCraft — Talent Benefit Granted",
      icon: "fa-solid fa-gift",
      resizable: true,
    },
    position: {
      width: 720,
      height: "auto",
    },
    actions: {
      acceptGrant: TalentGrantDialog.#onAcceptGrant,
      declineGrant: TalentGrantDialog.#onDeclineGrant,
      confirmPicks: TalentGrantDialog.#onConfirmPicks,
      toggleCandidate: TalentGrantDialog.#onToggleCandidate,
      toggleExpand: TalentGrantDialog.#onToggleExpand,
      selectAlternative: TalentGrantDialog.#onSelectAlternative,
    },
  };

  static PARTS = {
    content: {
      template: "modules/mythcraft-essence-sheet/templates/apps/talent-grant-dialog.hbs",
    },
  };

  /** @inheritdoc */
  async _prepareContext() {
    const isGrantMode = this.mode === "grant";

    if (isGrantMode) {
      const activeName = this.selectedAlternative || this.talentName;
      const selectedEntry = getTalentLibraryEntry(activeName) || {
        name: activeName,
        img: "icons/svg/aura.svg",
        category: "Talent",
        stack: "",
        prereq: "",
        activeEffects: [],
      };

      const actorOwnedNorms = new Set(
        (this.actor?.items || [])
          .filter(i => i.type === "talent" || i.type === "feature")
          .map(i => normalizeTalentName(i.name))
      );

      selectedEntry.isOwned = actorOwnedNorms.has(normalizeTalentName(activeName));

      // Fetch description for spotlight entry
      if (!this._descriptionCache.has(activeName)) {
        await this._loadTalentDescription(activeName);
      }
      selectedEntry.description = this._descriptionCache.get(activeName) || "";
      selectedEntry.isExpanded = !this._collapsedSpotlight;

      const altsData = this.alternatives.map(name => {
        const ent = getTalentLibraryEntry(name);
        const isExpanded = this._expandedNames.has(name);
        return {
          name,
          stack: ent?.stack || ent?.class || "Talent",
          isSelected: name === activeName,
          isOwned: actorOwnedNorms.has(normalizeTalentName(name)),
          isExpanded,
          description: isExpanded ? (this._descriptionCache.get(name) || "") : "",
        };
      });

      return {
        isGrantMode: true,
        mode: this.mode,
        parentItem: this.parentItem,
        talentName: activeName,
        hasAlternatives: this.alternatives.length > 1,
        alternatives: altsData,
        selectedEntry,
      };
    }

    // Pick Mode
    const candidates = this._evaluateCandidates();
    const query = this._searchQuery.toLowerCase().trim();
    const filtered = query
      ? candidates.filter(c => c.name.toLowerCase().includes(query) || (c.stack && c.stack.toLowerCase().includes(query)))
      : candidates;

    const eligibleCount = candidates.filter(c => c.isEligible && !c.isOwned).length;

    return {
      isGrantMode: false,
      mode: this.mode,
      parentItem: this.parentItem,
      trackTitle: this.track,
      maxCount: this.maxCount,
      selectedCount: this._selectedNames.size,
      isReady: this._selectedNames.size === this.maxCount || (this._selectedNames.size > 0 && this._selectedNames.size <= this.maxCount),
      searchQuery: this._searchQuery,
      candidates: filtered,
      eligibleCount,
    };
  }

  /**
   * Gathers and evaluates candidate talents matching track/options against actor prerequisites.
   */
  _evaluateCandidates() {
    const actorTalents = (this.actor?.items || []).filter(i => i.type === "talent" || i.type === "feature");
    const actorOwnedNorms = new Set(actorTalents.map(i => normalizeTalentName(i.name)));

    const effectiveLevel = Number(this.actor?.system?.level?.value || this.actor?.system?.level || 1);
    const attributes = this.actor?.system?.attributes || {};

    let rawEntries = [];

    if (this.optionsList.length > 0) {
      for (const opt of this.optionsList) {
        const entry = getTalentLibraryEntry(opt);
        if (entry) rawEntries.push(entry);
        else rawEntries.push({ name: opt, stack: this.track, prereq: "" });
      }
    } else {
      const cleanTrack = String(this.track || "").toLowerCase();
      const isMagicDiscipline = /arcane|divine|occult|primal|psionic/.test(cleanTrack);

      for (const entry of Object.values(TALENT_LIBRARY)) {
        if (entry.isEntry) continue; // Don't pick entry gateway talents as regular stack picks

        if (isMagicDiscipline) {
          if (/arcane/.test(cleanTrack) && (entry.class === "Arcane" || entry.tags?.includes("arcaneMagic"))) {
            rawEntries.push(entry);
            continue;
          }
          if (/divine/.test(cleanTrack) && (entry.class === "Divine" || entry.tags?.includes("divineMagic"))) {
            rawEntries.push(entry);
            continue;
          }
          if (/occult/.test(cleanTrack) && (entry.class === "Occult" || entry.tags?.includes("occultMagic"))) {
            rawEntries.push(entry);
            continue;
          }
          if (/primal/.test(cleanTrack) && (entry.class === "Primal" || entry.tags?.includes("primalMagic"))) {
            rawEntries.push(entry);
            continue;
          }
          if (/psionic/.test(cleanTrack) && (entry.class === "Psionic" || entry.tags?.includes("psionicMagic"))) {
            rawEntries.push(entry);
            continue;
          }
        }

        if (/defense/.test(cleanTrack) && (entry.class === "Defense Stack" || entry.stack?.toLowerCase().includes("defense"))) {
          rawEntries.push(entry);
          continue;
        }

        if (/combat/.test(cleanTrack) && (entry.class === "Combat Stack" || entry.stack?.toLowerCase().includes("combat"))) {
          rawEntries.push(entry);
          continue;
        }

        if (/command/.test(cleanTrack) && (entry.class === "Command Stack" || entry.stack?.toLowerCase().includes("command"))) {
          rawEntries.push(entry);
          continue;
        }

        if (/hunter/.test(cleanTrack) && entry.stack?.toLowerCase().includes("hunter")) {
          rawEntries.push(entry);
          continue;
        }

        if (/plague doctor/.test(cleanTrack) && entry.stack?.toLowerCase().includes("plague doctor")) {
          rawEntries.push(entry);
          continue;
        }

        if (entry.stack && cleanTrack.includes(entry.stack.toLowerCase())) {
          rawEntries.push(entry);
          continue;
        }

        if (cleanTrack.includes("specialization") && entry.category === "specialization") {
          rawEntries.push(entry);
          continue;
        }
      }
    }

    // Deduplicate by name
    const seen = new Set();
    const unique = [];
    for (const r of rawEntries) {
      const k = normalizeTalentName(r.name);
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(r);
      }
    }

    // Evaluate prerequisites
    const evaluated = unique.map(entry => {
      const isOwned = actorOwnedNorms.has(normalizeTalentName(entry.name));
      const avail = checkTalentAvailability(
        {
          name: entry.name,
          type: "talent",
          system: {
            prerequisites: entry.prereq || "",
            description: { value: "" },
          },
        },
        actorTalents,
        { effectiveLevel, attributes }
      );

      const isSelected = this._selectedNames.has(entry.name);
      const isEligible = !isOwned && (avail.isAvailable || avail.isEntry);
      const isExpanded = this._expandedNames.has(entry.name);
      const description = isExpanded ? (this._descriptionCache.get(entry.name) || "") : "";

      const libEntry = getTalentLibraryEntry(entry.name);
      let activeEffectsSummary = "";
      if (libEntry?.automatable && Array.isArray(libEntry.activeEffects) && libEntry.activeEffects.length > 0) {
        const changes = libEntry.activeEffects.flatMap(e => e.changes || []);
        if (changes.length > 0) {
          activeEffectsSummary = changes.map(ch => {
            const shortKey = String(ch.key || "").replace(/^.*bonuses\./, "").replace(/^system\./, "");
            return `${shortKey}: ${ch.value}`;
          }).join(" • ");
        }
      }

      return {
        id: entry.id,
        name: entry.name,
        stack: entry.stack || entry.class || this.track,
        prereq: entry.prereq || "",
        prereqTooltip: avail.prereqTooltip || "",
        isOwned,
        isEligible,
        isSelected,
        isExpanded,
        description,
        activeEffectsSummary,
      };
    });

    // Sort: Eligible first, then Locked, then Owned
    evaluated.sort((a, b) => {
      if (a.isOwned !== b.isOwned) return a.isOwned ? 1 : -1;
      if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return evaluated;
  }

  /**
   * Loads a rich description for a talent from local items or compendiums and caches it.
   * @param {string} talentName
   * @returns {Promise<string>}
   */
  async _loadTalentDescription(talentName) {
    if (!talentName) return "";
    if (this._descriptionCache.has(talentName)) {
      return this._descriptionCache.get(talentName);
    }

    const normName = normalizeTalentName(talentName);
    let rawDesc = "";

    // 1. Check actor items
    const localItem = (this.actor?.items || []).find(
      i => (i.type === "talent" || i.type === "feature") && normalizeTalentName(i.name) === normName
    );
    if (localItem) {
      rawDesc = localItem.system?.description?.value ?? localItem.system?.description ?? "";
    }

    // 2. Check compendiums if not on actor or empty
    if (!rawDesc || !rawDesc.trim()) {
      try {
        const packs = getAvailableCompendiums();
        const allPacks = [
          ...(packs.classes || []),
          ...(packs.specTalents || []),
          ...(packs.magic || []),
          ...(packs.customTalentPacks || []),
          ...(packs.all || []),
        ];

        for (const pack of allPacks) {
          if (!pack || pack.documentName !== "Item") continue;
          let index = pack.index;
          if (!index || index.size === 0) {
            index = await pack.getIndex({ fields: ["system.description"] }).catch(() => pack.getIndex());
          }
          const match = index?.find(e => normalizeTalentName(e.name) === normName);
          if (match) {
            if (match.system?.description?.value) {
              rawDesc = match.system.description.value;
              break;
            }
            const doc = await pack.getDocument(match._id || match.id);
            const d = doc?.system?.description?.value ?? doc?.system?.description ?? "";
            if (d && d.trim()) {
              rawDesc = d;
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | Error fetching compendium description for "${talentName}":`, err);
      }
    }

    let enrichedDesc = rawDesc || "";
    if (enrichedDesc && globalThis.TextEditor?.enrichHTML) {
      try {
        enrichedDesc = await TextEditor.enrichHTML(enrichedDesc, { async: true, rollData: this.actor?.getRollData?.() });
      } catch (_) {}
    }

    this._descriptionCache.set(talentName, enrichedDesc);
    return enrichedDesc;
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ─────────────────────────────────────────────────────────────────────────── */

  static async #onAcceptGrant(event, target) {
    const activeName = this.selectedAlternative || this.talentName;
    this._resolve({ accepted: true, selectedTalentName: activeName });
    await this.close();
  }

  static async #onDeclineGrant(event, target) {
    this._resolve({ accepted: false });
    await this.close();
  }

  static async #onConfirmPicks(event, target) {
    const selected = Array.from(this._selectedNames);
    if (selected.length === 0) return;
    this._resolve({ accepted: true, selectedTalents: selected });
    await this.close();
  }

  static #onToggleCandidate(event, target) {
    if (event?.target?.closest(".candidate-expand-btn")) return;
    const talentName = target.dataset.talentName || target.closest("[data-talent-name]")?.dataset.talentName;
    if (!talentName) return;

    if (this._selectedNames.has(talentName)) {
      this._selectedNames.delete(talentName);
    } else {
      if (this._selectedNames.size >= this.maxCount) {
        ui.notifications?.warn(`You can only select up to ${this.maxCount} talent${this.maxCount > 1 ? "s" : ""}.`);
        return;
      }
      this._selectedNames.add(talentName);
    }
    this.render();
  }

  static async #onToggleExpand(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const talentName = target.dataset.talentName || target.closest("[data-talent-name]")?.dataset.talentName;
    if (!talentName) return;

    // Check if this is the spotlight card
    if (this.mode === "grant" && this.alternatives.length <= 1) {
      this._collapsedSpotlight = !this._collapsedSpotlight;
      this.render();
      return;
    }

    if (this._expandedNames.has(talentName)) {
      this._expandedNames.delete(talentName);
      this.render();
    } else {
      this._expandedNames.add(talentName);
      if (!this._descriptionCache.has(talentName)) {
        await this._loadTalentDescription(talentName);
      }
      this.render();
    }
  }

  static #onSelectAlternative(event, target) {
    const val = target.value;
    if (val) {
      this.selectedAlternative = val;
      this.render();
    }
  }

  /**
   * Live filter input handler
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const searchInput = this.element?.querySelector(".grant-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this._searchQuery = e.target.value;
        this.render();
      });
    }

    const radioInputs = this.element?.querySelectorAll('input[name="selectedAlternative"]');
    if (radioInputs) {
      radioInputs.forEach(r => {
        r.addEventListener("change", (e) => {
          this.selectedAlternative = e.target.value;
          this.render();
        });
      });
    }
  }

  /* ───────────────────────────────────────────────────────────────────────────
   *  Static Prompt & Acquisition Pipeline
   * ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Prompts the user to accept or decline a specific granted talent.
   * @param {Actor} actor
   * @param {Item} parentItem
   * @param {object} grantInfo
   * @returns {Promise<{ accepted: boolean, selectedTalentName?: string }>}
   */
  static async promptGrant(actor, parentItem, grantInfo) {
    return new Promise((resolve) => {
      const dialog = new TalentGrantDialog({
        actor,
        parentItem,
        mode: "grant",
        talentName: grantInfo.talentName,
        alternatives: grantInfo.alternatives || [],
        resolve,
      });
      dialog.render(true);
    });
  }

  /**
   * Prompts the user to pick X talents from a stack/track.
   * @param {Actor} actor
   * @param {Item} parentItem
   * @param {object} pickInfo
   * @returns {Promise<{ accepted: boolean, selectedTalents?: Array<string> }>}
   */
  static async promptPick(actor, parentItem, pickInfo) {
    return new Promise((resolve) => {
      const dialog = new TalentGrantDialog({
        actor,
        parentItem,
        mode: "pick",
        track: pickInfo.track || "Track",
        count: pickInfo.count || 1,
        optionsList: pickInfo.options || [],
        resolve,
      });
      dialog.render(true);
    });
  }

  /**
   * High-level orchestrator called whenever a talent is added to an Actor.
   * Inspects `grantedTalents` and steps the user through any granted talent or track pick prompts.
   * Automatically stamps bidirectional parent-child linking flags on both items.
   *
   * @param {Actor} actor
   * @param {Item} parentItem
   * @param {object} [options]
   */
  static async processTalentGrantsAndPicks(actor, parentItem, options = {}) {
    if (!actor || !parentItem) return;
    const processed = options.processedItemIds || new Set();
    if (processed.has(parentItem.id)) return;
    processed.add(parentItem.id);
    options.processedItemIds = processed;

    const grants = getTalentGrantsAndPicks(parentItem);
    if (!Array.isArray(grants) || grants.length === 0) return;

    for (const grant of grants) {
      // 1. SPECIFIC TALENT GRANT
      if (grant.type === "grant_talent" && grant.talentName) {
        // Skip self-referential grants (e.g. Hardy -> Hardy)
        if (normalizeTalentName(grant.talentName) === normalizeTalentName(parentItem.name)) {
          continue;
        }

        const res = await TalentGrantDialog.promptGrant(actor, parentItem, grant);
        if (res?.accepted && res.selectedTalentName) {
          const normSelected = normalizeTalentName(res.selectedTalentName);
          let childDoc = (actor.items || []).find(i => normalizeTalentName(i.name) === normSelected);
          if (childDoc) {
            // Already owned on sheet: link existing item
            await childDoc.update({
              [`flags.${MODULE_ID}.parentTalentId`]: parentItem.id,
              [`flags.${MODULE_ID}.parentTalentName`]: parentItem.name,
              [`flags.${MODULE_ID}.isGrantedTalent`]: true,
            });
          } else {
            const itemData = await getTalentItemDataForAcquisition(res.selectedTalentName);
            foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.parentTalentId`, parentItem.id);
            foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.parentTalentName`, parentItem.name);
            foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.isGrantedTalent`, true);

            const [created] = await actor.createEmbeddedDocuments("Item", [itemData], {
              skipGrantPrompt: true,
            });
            childDoc = created;
          }

          // Link child to parent
          if (childDoc) {
            const existing = Array.from(parentItem.flags?.[MODULE_ID]?.grantedTalentNames || []);
            await parentItem.update({
              [`flags.${MODULE_ID}.grantedTalentNames`]: [...new Set([...existing, childDoc.name])],
            });
            await syncActorTalentActiveEffects(actor, { notify: false });

            // Cascading grants: check if newly linked/created talent also grants talents
            await TalentGrantDialog.processTalentGrantsAndPicks(actor, childDoc, options);
          }
        }
      }

      // 2. STACK / TRACK PICKS
      else if (grant.type === "pick_from_track") {
        const res = await TalentGrantDialog.promptPick(actor, parentItem, grant);
        if (res?.accepted && Array.isArray(res.selectedTalents) && res.selectedTalents.length > 0) {
          const createdItems = [];
          const linkedDocs = [];
          for (const talentName of res.selectedTalents) {
            const normSelected = normalizeTalentName(talentName);
            const existingDoc = (actor.items || []).find(i => normalizeTalentName(i.name) === normSelected);
            if (existingDoc) {
              await existingDoc.update({
                [`flags.${MODULE_ID}.parentTalentId`]: parentItem.id,
                [`flags.${MODULE_ID}.parentTalentName`]: parentItem.name,
                [`flags.${MODULE_ID}.isGrantedTalent`]: true,
              });
              linkedDocs.push(existingDoc);
            } else {
              const itemData = await getTalentItemDataForAcquisition(talentName);
              foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.parentTalentId`, parentItem.id);
              foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.parentTalentName`, parentItem.name);
              foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.isGrantedTalent`, true);
              createdItems.push(itemData);
            }
          }

          let createdDocs = [];
          if (createdItems.length > 0) {
            createdDocs = await actor.createEmbeddedDocuments("Item", createdItems, {
              skipGrantPrompt: true,
            });
          }

          const allHandledDocs = [...linkedDocs, ...createdDocs];
          if (allHandledDocs.length > 0) {
            const existing = Array.from(parentItem.flags?.[MODULE_ID]?.grantedTalentNames || []);
            const newNames = allHandledDocs.map(d => d.name);
            await parentItem.update({
              [`flags.${MODULE_ID}.grantedTalentNames`]: [...new Set([...existing, ...newNames])],
            });
            await syncActorTalentActiveEffects(actor, { notify: false });

            // Cascading check on each created/linked pick
            for (const doc of allHandledDocs) {
              await TalentGrantDialog.processTalentGrantsAndPicks(actor, doc, options);
            }
          }
        }
      }
    }
  }
}

/**
 * Loads a talent item from compendiums, or synthesizes a clean talent Item object
 * using TALENT_LIBRARY canonical definitions if not found in packs.
 * @param {string|object} talentNameOrEntry
 * @returns {Promise<object>}
 */
export async function getTalentItemDataForAcquisition(talentNameOrEntry) {
  const normName = normalizeTalentName(typeof talentNameOrEntry === "string" ? talentNameOrEntry : talentNameOrEntry.name);
  const entry = typeof talentNameOrEntry === "object" && talentNameOrEntry.id
    ? talentNameOrEntry
    : getTalentLibraryEntry(talentNameOrEntry);

  const packs = getAvailableCompendiums();
  const allPacks = [
    ...(packs.classes || []),
    ...(packs.specTalents || []),
    ...(packs.magic || []),
    ...(packs.customTalentPacks || []),
  ];

  for (const pack of allPacks) {
    if (!pack) continue;
    try {
      const index = pack.index || (await pack.getIndex());
      const match = index.find(e => normalizeTalentName(e.name) === normName);
      if (match) {
        const doc = await pack.getDocument(match._id || match.id);
        if (doc) return doc.toObject();
      }
    } catch (_) {}
  }

  // Synthesize from TALENT_LIBRARY
  if (entry) {
    return {
      name: entry.name,
      type: "talent",
      img: "icons/svg/aura.svg",
      system: {
        description: { value: "" },
        prerequisites: entry.prereq || "",
        tags: entry.tags || [],
      },
      flags: {
        [MODULE_ID]: {
          canonicalId: entry.id,
          canonicalCategory: entry.category,
          canonicalClass: entry.class,
          canonicalStack: entry.stack,
        },
      },
    };
  }

  return {
    name: typeof talentNameOrEntry === "string" ? talentNameOrEntry : "Unknown Talent",
    type: "talent",
    img: "icons/svg/aura.svg",
    system: { description: { value: "" } },
  };
}

/**
 * Checks whether all talent grants and picks defined for a talent document are already satisfied
 * on the actor sheet (or already recorded in its grantedTalentNames flag).
 * @param {Actor} actor
 * @param {Item} parentItem
 * @returns {boolean}
 */
export function isTalentGrantFullySatisfied(actor, parentItem) {
  if (!actor || !parentItem) return true;
  const grants = getTalentGrantsAndPicks(parentItem);
  if (!grants || grants.length === 0) return true;

  const existingGrantedNames = Array.from(parentItem.flags?.[MODULE_ID]?.grantedTalentNames || []);
  if (existingGrantedNames.length > 0) return true;

  const actorTalents = (actor.items || []).filter(i => i.type === "talent" || i.type === "feature");
  const actorNorms = new Set(actorTalents.map(t => normalizeTalentName(t.name)));

  for (const grant of grants) {
    if (grant.type === "grant_talent") {
      const grantNorm = normalizeTalentName(grant.talentName);
      const altNorms = (grant.alternatives || []).map(normalizeTalentName);
      const isOwned = actorNorms.has(grantNorm) || altNorms.some(a => actorNorms.has(a));
      if (!isOwned) return false;
    } else if (grant.type === "pick_from_track") {
      const count = Number(grant.count) || 1;
      const cleanTrack = String(grant.track || "").toLowerCase().replace(/\s+(track|stack|talents?)$/i, "").trim();
      const trackTalentsOwned = actorTalents.filter(t => {
        if (t.id === parentItem.id || normalizeTalentName(t.name) === normalizeTalentName(parentItem.name)) return false;
        const entry = getTalentLibraryEntry(t.name);
        const tTrack = String(entry?.stack || entry?.class || "").toLowerCase().replace(/\s+(track|stack|talents?)$/i, "").trim();
        return tTrack.includes(cleanTrack) || cleanTrack.includes(tTrack);
      });
      if (trackTalentsOwned.length < count) return false;
    }
  }

  return true;
}

