/**
 * mythcraft-essence-sheet | src/apps/character-creation-wizard.mjs
 *
 * Interactive 6-Step Character Creation Wizard for the MythCraft System.
 */

import {
  getAvailableCompendiums,
  loadPacksDocuments,
  parseAttributeBonusPoints,
  getAttributeLevelCap,
  calculateAttributePool,
  parseBackgroundData,
  parseProfessionData,
  parseTalentData,
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
      bonusAttributePoints: 0,

      // Step 2: Attributes
      attributes: {
        str: 0,
        dex: 0,
        end: 0,
        awr: 0,
        int: 0,
        cha: 0,
      },

      // Step 3: Stats
      hpMode: "set", // "set" | "roll"

      // Step 4 & 5: Background & Profession (BOPs)
      backgrounds: [],
      selectedBackgroundId: null,
      allocatedSkills: {}, // { [skillKey]: points }
      wealthMode: "average", // "average" | "roll"

      professions: [],
      selectedProfessionId: null,
      selectedProfessionSkills: [],

      // Step 6: Starting Talent & Magic
      talents: [],
      selectedTalentId: null,
      selectedExtraTalentIds: [],
      availableSpells: [],
      selectedSpellIds: [],
      magicAttribute: "int",
    };

    // Include Sanity if homebrew enabled
    if (getSetting("enableSanityAttribute", false)) {
      this.data.attributes.san = 0;
    }
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
      width: 780,
      height: 720,
    },
    actions: {
      nextStep: this.#onNextStep,
      prevStep: this.#onPrevStep,
      selectLineage: this.#onSelectLineage,
      selectLineageFeature: this.#onSelectLineageFeature,
      adjustAttribute: this.#onAdjustAttribute,
      setHpMode: this.#onSetHpMode,
      selectBackground: this.#onSelectBackground,
      adjustSkill: this.#onAdjustSkill,
      setWealthMode: this.#onSetWealthMode,
      selectProfession: this.#onSelectProfession,
      toggleProfessionSkill: this.#onToggleProfessionSkill,
      selectTalent: this.#onSelectTalent,
      toggleExtraTalent: this.#onToggleExtraTalent,
      toggleSpell: this.#onToggleSpell,
      setMagicAttribute: this.#onSetMagicAttribute,
      finalize: this.#onFinalize,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    wizard: {
      template: "modules/mythcraft-essence-sheet/templates/essence/apps/character-creation-wizard.hbs",
    },
  };

  /**
   * Loads documents from compendiums upon initialization.
   */
  async loadCompendiumData() {
    const packs = getAvailableCompendiums();

    this.data.lineages = await loadPacksDocuments(packs.lineages);
    const bopsDocs = await loadPacksDocuments(packs.bops);

    this.data.backgrounds = bopsDocs.filter(d => d.system?.category === "background" || d.name?.toLowerCase().includes("background") || d.system?.tags?.includes("background"));
    this.data.professions = bopsDocs.filter(d => d.system?.category === "profession" || d.name?.toLowerCase().includes("profession") || d.system?.tags?.includes("profession"));

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

    const levelCap = getAttributeLevelCap(1); // At level 1, max +2
    const pool = calculateAttributePool(this.data.attributes, this.data.bonusAttributePoints, 5);

    // Selected Lineage Data
    const selectedLineage = this.data.lineages.find(l => l.id === this.data.selectedLineageId);
    
    // Selected Background Data
    const selectedBackground = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    const parsedBackground = selectedBackground ? parseBackgroundData(selectedBackground) : null;

    // Selected Profession Data
    const selectedProfession = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsedProfession = selectedProfession ? parseProfessionData(selectedProfession) : null;

    // Selected Talent Data
    const selectedTalent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
    const parsedTalent = selectedTalent ? parseTalentData(selectedTalent) : null;

    // HP calculation based on Endurance
    const endVal = this.data.attributes.end || 0;
    const hpData = getEnduranceThreshold(endVal);
    const setHpValue = 10 + 1 + (1 * hpData.setHp); // Level 1 HP formula: 10 + Level + (Level * SetHP)

    return {
      step: this.currentStep,
      actor: this.actor,
      levelCap,
      pool,
      data: this.data,
      selectedLineage,
      selectedBackground,
      parsedBackground,
      selectedProfession,
      parsedProfession,
      selectedTalent,
      parsedTalent,
      hpData,
      setHpValue,
      isLastStep: this.currentStep === 6,
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Action Handlers
   * ──────────────────────────────────────────────────────────────────────── */

  static #onNextStep(event, target) {
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
    const item = this.data.lineages.find(l => l.id === id);
    if (item) {
      this.data.bonusAttributePoints = parseAttributeBonusPoints(item);
    }
    this.render();
  }

  static #onSelectLineageFeature(event, target) {
    this.data.selectedFeatureId = target.dataset.featureId;
    this.render();
  }

  static #onAdjustAttribute(event, target) {
    const attr = target.dataset.attr;
    const delta = parseInt(target.dataset.delta, 10);
    const cur = Number(this.data.attributes[attr] ?? 0);
    const levelCap = getAttributeLevelCap(1);

    const next = cur + delta;
    if (next > levelCap) {
      ui.notifications.warn(`Attributes cannot exceed +${levelCap} at level 1.`);
      return;
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
    this.data.allocatedSkills = {};
    this.render();
  }

  static #onAdjustSkill(event, target) {
    const skill = target.dataset.skill;
    const delta = parseInt(target.dataset.delta, 10);
    const cur = Number(this.data.allocatedSkills[skill] ?? 0);
    const next = Math.max(0, cur + delta);

    const bg = this.data.backgrounds.find(b => b.id === this.data.selectedBackgroundId);
    const parsed = bg ? parseBackgroundData(bg) : null;
    const cap = parsed?.perSkillCap ?? 4;

    if (next > cap) {
      ui.notifications.warn(`This background limits individual skills to +${cap}.`);
      return;
    }

    this.data.allocatedSkills[skill] = next;
    this.render();
  }

  static #onSetWealthMode(event, target) {
    this.data.wealthMode = target.dataset.mode;
    this.render();
  }

  static #onSelectProfession(event, target) {
    this.data.selectedProfessionId = target.dataset.professionId;
    this.data.selectedProfessionSkills = [];
    this.render();
  }

  static #onToggleProfessionSkill(event, target) {
    const skill = target.dataset.skill;
    const prof = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsed = prof ? parseProfessionData(prof) : null;
    const maxChoice = parsed?.choiceSkills?.count ?? 1;

    const idx = this.data.selectedProfessionSkills.indexOf(skill);
    if (idx >= 0) {
      this.data.selectedProfessionSkills.splice(idx, 1);
    } else {
      if (this.data.selectedProfessionSkills.length >= maxChoice) {
        ui.notifications.warn(`You may only select ${maxChoice} skill(s) from this profession.`);
        return;
      }
      this.data.selectedProfessionSkills.push(skill);
    }
    this.render();
  }

  static #onSelectTalent(event, target) {
    this.data.selectedTalentId = target.dataset.talentId;
    this.data.selectedExtraTalentIds = [];
    this.data.selectedSpellIds = [];
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
      "system.attributes.str": this.data.attributes.str || 0,
      "system.attributes.dex": this.data.attributes.dex || 0,
      "system.attributes.end": this.data.attributes.end || 0,
      "system.attributes.awr": this.data.attributes.awr || 0,
      "system.attributes.int": this.data.attributes.int || 0,
      "system.attributes.cha": this.data.attributes.cha || 0,
    };

    if (this.data.attributes.san !== undefined) {
      updates["system.attributes.san"] = this.data.attributes.san;
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

    updates["system.currency.sc"] = (Number(this.actor.system?.currency?.sc) || 0) + startingWealth;

    // 3. Skills mapping
    const skillUpdates = {};
    for (const [sKey, pts] of Object.entries(this.data.allocatedSkills)) {
      if (pts > 0) {
        skillUpdates[`system.skills.${sKey}.value`] = (this.actor.system?.skills?.[sKey]?.value || 0) + pts;
      }
    }

    // Profession skills
    const prof = this.data.professions.find(p => p.id === this.data.selectedProfessionId);
    const parsedProf = prof ? parseProfessionData(prof) : null;
    if (parsedProf) {
      for (const fSkill of parsedProf.fixedSkills) {
        const key = fSkill.name.toLowerCase().trim();
        skillUpdates[`system.skills.${key}.value`] = (this.actor.system?.skills?.[key]?.value || 0) + fSkill.value;
      }
      for (const cSkill of this.data.selectedProfessionSkills) {
        const key = cSkill.toLowerCase().trim();
        skillUpdates[`system.skills.${key}.value`] = (this.actor.system?.skills?.[key]?.value || 0) + parsedProf.choiceSkills.value;
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

    if (bg) itemsToCreate.push(bg.toObject());
    if (prof) itemsToCreate.push(prof.toObject());

    const startingTalent = this.data.talents.find(t => t.id === this.data.selectedTalentId);
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
   * Prompts the user to start Character Creation for a Level 0 character.
   * @param {Actor} actor
   * @param {Application} [sheet]
   */
  static async promptStartup(actor, sheet) {
    if (!actor || actor.type !== "character") return;
    const curLevel = Number(actor.system?.level ?? 0);
    if (curLevel > 0) return;

    new Dialog({
      title: "Start Character Creation?",
      content: `
        <div class="insufficient-ap-modal-content" style="padding: 4px;">
          <div class="ap-modal-banner">
            <div class="ap-modal-icon"><i class="fas fa-sparkles"></i></div>
            <div class="ap-modal-text">
              <p class="ap-modal-actor"><strong>${actor.name}</strong> is currently a new <strong>Level 0</strong> character.</p>
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

