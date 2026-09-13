import { applyMessageRollMode } from "./roll-privacy.mjs";

const MODULE_ID = "mythcraft-essence-sheet";

/**
 * Synchronize Sanity and Custom Attributes to core MythCraft CONFIG and DataModel schemas
 */
export function syncHomebrewAttributesToSystem() {
  if (typeof mythcraft === "undefined" || !mythcraft.CONFIG) return;

  const enableSanity = game.settings?.get(MODULE_ID, "enableSanity") ?? false;
  const customAttributes = game.settings?.get(MODULE_ID, "customAttributes") ?? [];

  const attrList = mythcraft.CONFIG.attributes?.list;
  if (!attrList) return;

  // 1. Sanity attribute registration in CONFIG
  if (enableSanity) {
    attrList["san"] = {
      group: "meta",
      check: true,
      defense: null,
      label: "Sanity",
    };
  }

  // 2. Custom attributes registration in CONFIG
  for (const cAttr of customAttributes) {
    if (!cAttr.key || !cAttr.name) continue;
    const groupKey = cAttr.category === "physical" ? "physical" : (cAttr.category === "mental" ? "mental" : "meta");
    attrList[cAttr.key] = {
      group: groupKey,
      check: true,
      defense: null,
      label: cAttr.name,
    };
  }

  // 3. Extend CharacterModel and NpcModel schema fields for attributes
  const fields = foundry.data?.fields;
  if (!fields) return;

  const CharacterModel = CONFIG.Actor?.dataModels?.character;
  if (CharacterModel?.schema?.fields?.attributes?.fields) {
    const attrFields = CharacterModel.schema.fields.attributes.fields;

    if (enableSanity && !attrFields["san"]) {
      attrFields["san"] = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 30 });
    }

    for (const cAttr of customAttributes) {
      if (!cAttr.key) continue;
      if (!attrFields[cAttr.key]) {
        attrFields[cAttr.key] = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 30 });
      }
    }
  }

  const NpcModel = CONFIG.Actor?.dataModels?.npc;
  if (NpcModel?.schema?.fields?.attributes?.fields) {
    const attrFields = NpcModel.schema.fields.attributes.fields;

    if (enableSanity && !attrFields["san"]) {
      attrFields["san"] = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 30 });
    }

    for (const cAttr of customAttributes) {
      if (!cAttr.key) continue;
      if (!attrFields[cAttr.key]) {
        attrFields[cAttr.key] = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: -3, max: 30 });
      }
    }
  }

  // 4. Custom skills registration in CONFIG.skills.list
  const customSkills = game.settings?.get(MODULE_ID, "customSkills") ?? [];
  const skillsList = mythcraft.CONFIG.skills?.list;
  if (skillsList) {
    for (const cSkill of customSkills) {
      if (!cSkill.key || !cSkill.name) continue;
      skillsList[cSkill.key] = {
        label: cSkill.name,
        attribute: cSkill.attribute || "str",
        tag: "custom",
        reference: "",
        specialized: cSkill.specialized ? "MYTHCRAFT.Skills.specialized" : null,
      };
    }
  }

  // 5. Inject localized translation strings into game.i18n
  if (game.i18n?.translations) {
    if (enableSanity) {
      foundry.utils.setProperty(game.i18n.translations, "MYTHCRAFT.Actor.base.FIELDS.attributes.san.label", "Sanity");
    }
    for (const cAttr of customAttributes) {
      if (cAttr.key) {
        foundry.utils.setProperty(game.i18n.translations, `MYTHCRAFT.Actor.base.FIELDS.attributes.${cAttr.key}.label`, cAttr.name || cAttr.key);
      }
    }
    for (const cSkill of customSkills) {
      if (cSkill.key) {
        foundry.utils.setProperty(game.i18n.translations, `MYTHCRAFT.Skills.${cSkill.key}`, cSkill.name || cSkill.key);
      }
    }
  }

  // 6. Register Soul Damage type in System CONFIG
  syncSoulDamageToSystem();
}

/**
 * Synchronizes the Soul damage type to core MythCraft CONFIG (damage.types & damage.categories)
 */
export function syncSoulDamageToSystem() {
  const configs = [];
  if (typeof mythcraft !== "undefined" && mythcraft.CONFIG) configs.push(mythcraft.CONFIG);
  if (globalThis.CONFIG?.MYTHCRAFT) configs.push(globalThis.CONFIG.MYTHCRAFT);

  for (const cfg of configs) {
    if (!cfg.damage) cfg.damage = { types: {}, categories: {} };
    if (!cfg.damage.types) cfg.damage.types = {};
    if (!cfg.damage.categories) cfg.damage.categories = {};

    cfg.damage.types.soul = {
      label: "MYTHCRAFT.DamageTypes.soul",
      category: "energy",
      color: foundry.utils?.Color?.fromString?.("#c084fc") || "#c084fc",
    };

    if (cfg.damage.categories.energy) {
      if (Array.isArray(cfg.damage.categories.energy.types) && !cfg.damage.categories.energy.types.includes("soul")) {
        cfg.damage.categories.energy.types.push("soul");
      }
    }
  }

  if (globalThis.CONFIG?.damageTypes) {
    globalThis.CONFIG.damageTypes.soul = "Soul";
  }

  // Ensure translation exists in game.i18n
  if (game.i18n) {
    if (game.i18n.translations) {
      foundry.utils.setProperty(game.i18n.translations, "MYTHCRAFT.DamageTypes.soul", "Soul");
      foundry.utils.setProperty(game.i18n.translations, "MYTHCRAFT.DamageTypes.Soul", "Soul");
    }
    if (game.i18n._fallback) {
      foundry.utils.setProperty(game.i18n._fallback, "MYTHCRAFT.DamageTypes.soul", "Soul");
      foundry.utils.setProperty(game.i18n._fallback, "MYTHCRAFT.DamageTypes.Soul", "Soul");
    }
  }
}

export const CORE_ATTRIBUTE_NAME_MAP = {
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

/**
 * Returns the human-readable full name for an attribute key (e.g. "awr" -> "Awareness")
 * @param {string} key
 * @returns {string}
 */
export function getFullAttributeName(key) {
  if (!key) return "";
  const norm = String(key).toLowerCase().trim();
  if (CORE_ATTRIBUTE_NAME_MAP[norm]) return CORE_ATTRIBUTE_NAME_MAP[norm];
  
  const customAttrs = game.settings?.get?.(MODULE_ID, "customAttributes") ?? [];
  const found = customAttrs.find(a => (a.key && a.key.toLowerCase() === norm) || (a.abbr && a.abbr.toLowerCase() === norm));
  if (found?.name) return found.name;
  
  return mythcraft.CONFIG?.attributes?.list?.[norm]?.name || 
         mythcraft.CONFIG?.attributes?.list?.[norm]?.label || 
         key.toUpperCase();
}

/**
 * Patches core MythCraft AttributeSkillInput and AttributeRoll to safely handle custom/homebrew attributes and skills
 */
export function patchAttributeSkillInput() {
  if (typeof mythcraft === "undefined") return;

  // 1. Patch AttributeSkillInput slider & context
  const AttributeSkillInput = mythcraft.applications?.apps?.AttributeSkillInput;
  if (AttributeSkillInput && !AttributeSkillInput._essencePatched) {
    const origPrepareContext = AttributeSkillInput.prototype._prepareContext;

    AttributeSkillInput.prototype._prepareContext = async function(options) {
      // Ensure attribute definition exists in CONFIG.attributes.list
      if (mythcraft.CONFIG?.attributes?.list && !mythcraft.CONFIG.attributes.list[this.attribute]) {
        mythcraft.CONFIG.attributes.list[this.attribute] = {
          group: "meta",
          check: true,
          defense: null,
          label: this.attribute === "san" ? "Sanity" : this.attribute.toUpperCase(),
        };
      }

      const context = await origPrepareContext.call(this, options);

      // Provide fallback field object if DataModel schema field wasn't resolved
      if (context.attribute && !context.attribute.field) {
        const label = mythcraft.CONFIG?.attributes?.list?.[this.attribute]?.label || (this.attribute === "san" ? "Sanity" : this.attribute.toUpperCase());
        context.attribute.field = {
          label: label,
          hint: label,
        };
      }

      return context;
    };

    const origOnRender = AttributeSkillInput.prototype._onRender;
    AttributeSkillInput.prototype._onRender = function(context, options) {
      if (origOnRender) origOnRender.call(this, context, options);

      // Bind range slider to synchronize with score display/input and update document
      const rangeInput = this.element?.querySelector('input[type="range"]');
      const numInput = this.element?.querySelector('input[type="number"], .range-value, span.range-value');

      if (rangeInput) {
        rangeInput.addEventListener("input", (event) => {
          const val = event.target.value;
          if (numInput) {
            if (numInput.tagName === "INPUT") {
              numInput.value = val;
              numInput.dispatchEvent(new Event("change", { bubbles: true }));
            } else {
              numInput.textContent = val;
            }
          }
        });

        rangeInput.addEventListener("change", async (event) => {
          const val = Number(event.target.value);
          const attrKey = this.attribute;
          const actor = this.document || this.actor;
          if (actor && attrKey) {
            await actor.update({ [`system.attributes.${attrKey}`]: val });
          }
        });
      }

      if (numInput && numInput.tagName === "INPUT" && rangeInput) {
        numInput.addEventListener("input", (event) => {
          rangeInput.value = event.target.value;
        });
      }
    };

    AttributeSkillInput._essencePatched = true;
  }

  // 2. Patch AttributeRollDialog to resolve full attribute names for title and dropdowns
  const AttributeRollDialog = mythcraft.applications?.apps?.AttributeRollDialog;
  if (AttributeRollDialog && !AttributeRollDialog._essencePatched) {
    const descAttr = Object.getOwnPropertyDescriptor(AttributeRollDialog.prototype, "attributeLabel");
    if (descAttr && descAttr.get) {
      Object.defineProperty(AttributeRollDialog.prototype, "attributeLabel", {
        get() {
          const attrKey = this.options?.context?.attribute;
          return getFullAttributeName(attrKey);
        },
        configurable: true,
        enumerable: false,
      });
    }

    const descSkill = Object.getOwnPropertyDescriptor(AttributeRollDialog.prototype, "skillLabel");
    if (descSkill && descSkill.get) {
      const origSkillGetter = descSkill.get;
      Object.defineProperty(AttributeRollDialog.prototype, "skillLabel", {
        get() {
          const skillKey = this.options?.context?.skill;
          const skillCfg = mythcraft.CONFIG?.skills?.list?.[skillKey];
          if (!skillCfg) return "";
          const customSkills = game.settings?.get?.(MODULE_ID, "customSkills") ?? [];
          const found = customSkills.find(s => s.key === skillKey);
          if (found) return found.name;
          const localized = origSkillGetter.call(this);
          if (localized && !localized.startsWith("MYTHCRAFT.")) return localized;
          return skillCfg.label || skillKey;
        },
        configurable: true,
        enumerable: false,
      });
    }

    AttributeRollDialog._essencePatched = true;
  }

  // 2. Patch BaseActorModel.prototype.rollAttribute & rollSkill to output full attribute name in flavor
  const BaseActorModel = CONFIG.Actor?.dataModels?.character?.prototype?.__proto__;
  if (BaseActorModel && !BaseActorModel._essenceFlavorPatched) {
    const origRollAttribute = BaseActorModel.rollAttribute;
    const origRollSkill = BaseActorModel.rollSkill;

    if (origRollAttribute) {
      BaseActorModel.rollAttribute = async function (attribute) {
        syncHomebrewAttributesToSystem();
        const AttributeRollClass = mythcraft.rolls?.AttributeRoll || CONFIG.Dice?.rolls?.find(r => r.name === "AttributeRoll");
        const AttributeRollDialog = mythcraft.applications?.apps?.AttributeRollDialog;
        if (!AttributeRollClass || !AttributeRollDialog) {
          return origRollAttribute.call(this, attribute);
        }

        const formula = `1d20 + @attributes.${attribute} + @situationalBonus`;
        const fd = await AttributeRollDialog.create({ context: { attribute, formula, rollModes: { ...this.rollModes } } });
        if (!fd) throw new Error("Roll Dialog Cancelled");
        const { situationalBonus, rollMode, situationalTA = 0, situationalTD = 0 } = fd;
        const rollData = this.parent.getRollData();
        rollData.situationalBonus = AttributeRollClass.replaceFormulaData(situationalBonus, rollData) || 0;
        rollData.rollModes = { ...rollData.rollModes };
        rollData.rollModes.ta += situationalTA;
        rollData.rollModes.td += situationalTD;

        const fullAttrName = getFullAttributeName(attribute);
        const roll = new AttributeRollClass(formula, rollData, {
          attribute,
          flavor: `${fullAttrName} Check`,
        });
        const messageData = { speaker: ChatMessage.getSpeaker({ actor: this.parent }) };
        const activeRollMode = applyMessageRollMode(messageData, rollMode);
        return roll.toMessage(messageData, { rollMode: activeRollMode });
      };
    }

    if (origRollSkill) {
      BaseActorModel.rollSkill = async function (skill) {
        syncHomebrewAttributesToSystem();
        const AttributeRollClass = mythcraft.rolls?.AttributeRoll || CONFIG.Dice?.rolls?.find(r => r.name === "AttributeRoll");
        const AttributeRollDialog = mythcraft.applications?.apps?.AttributeRollDialog;
        if (!AttributeRollClass || !AttributeRollDialog) {
          return origRollSkill.call(this, skill);
        }

        let formula = `1d20 + @skills.${skill}.bonus + @situationalBonus`;
        const attribute = mythcraft.CONFIG.skills?.list?.[skill]?.attribute || "str";
        const specialization = this.skills?.[skill]?.specialization ?? "";
        const fd = await AttributeRollDialog.create({ context: { attribute, skill, formula, specialization, rollModes: { ...this.rollModes } } });
        if (!fd) throw new Error("Roll Dialog Cancelled");
        if (fd.attribute !== attribute) {
          formula += ` -@attributes.${attribute} + @attributes.${fd.attribute}`;
        }
        const { situationalBonus, rollMode, specializationMultiplier, situationalTA = 0, situationalTD = 0 } = fd;
        const rollData = this.parent.getRollData();
        rollData.situationalBonus = AttributeRollClass.replaceFormulaData(situationalBonus, rollData) || 0;
        rollData.rollModes = { ...rollData.rollModes };
        rollData.rollModes.ta += situationalTA;
        rollData.rollModes.td += situationalTD;

        const fullAttrName = getFullAttributeName(fd.attribute || attribute);
        const skillLabel = game.i18n.localize(mythcraft.CONFIG?.skills?.list?.[skill]?.label) || skill;
        const roll = new AttributeRollClass(formula, rollData, {
          attribute: fd.attribute,
          skill,
          flavor: `${fullAttrName} Check (${skillLabel})`,
        });
        if (Number.isNumeric(specializationMultiplier)) {
          roll.terms[2].number = Math.ceil(roll.terms[2].number * specializationMultiplier);
          roll.resetFormula();
        }
        const messageData = { speaker: ChatMessage.getSpeaker({ actor: this.parent }) };
        const activeRollMode = applyMessageRollMode(messageData, rollMode);
        return roll.toMessage(messageData, { rollMode: activeRollMode });
      };
    }

    BaseActorModel._essenceFlavorPatched = true;
  }
}

/**
 * Generates the complete list of Magic Attribute options including all core attributes,
 * Luck (LCK), Coordination (COR), Sanity (SAN if enabled), and any configured custom attributes.
 * @param {string} [currentSelected="int"]
 * @returns {Array<{ key: string, label: string, selected: boolean }>}
 */
export function getMagicAttributeOptions(currentSelected = "int") {
  const normSelected = String(currentSelected || "int").toLowerCase().trim();
  const baseOptions = [
    { key: "int", abbr: "INT", name: "Intellect" },
    { key: "awr", abbr: "AWR", name: "Awareness" },
    { key: "cha", abbr: "CHA", name: "Charisma" },
    { key: "str", abbr: "STR", name: "Strength" },
    { key: "dex", abbr: "DEX", name: "Dexterity" },
    { key: "end", abbr: "END", name: "Endurance" },
    { key: "luck", abbr: "LCK", name: "Luck" },
    { key: "cor", abbr: "COR", name: "Coordination" },
  ];

  const enableSanity = Boolean(game.settings?.get?.(MODULE_ID, "enableSanity") ?? false);
  if (enableSanity) {
    baseOptions.push({ key: "san", abbr: "SAN", name: "Sanity" });
  }

  const customAttrs = game.settings?.get?.(MODULE_ID, "customAttributes") ?? [];
  if (Array.isArray(customAttrs)) {
    for (const ca of customAttrs) {
      const key = (typeof ca === "string" ? ca : ca?.key || ca?.id || "").toLowerCase().trim();
      if (key && !baseOptions.some(o => o.key === key)) {
        baseOptions.push({
          key,
          abbr: ca?.abbr || key.toUpperCase(),
          name: ca?.name || key,
        });
      }
    }
  }

  return baseOptions.map(opt => ({
    key: opt.key,
    label: `${opt.abbr} (${opt.name})`,
    selected: opt.key === normSelected || (opt.key === "luck" && normSelected === "lck") || (opt.key === "lck" && normSelected === "luck"),
  }));
}

