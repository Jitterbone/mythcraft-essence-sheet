/**
 * MythCraft Essence — Homebrew & Custom Attributes System Bridge
 *
 * Bridges Sanity (SAN) and custom attributes into the core MythCraft
 * DataModel schemas, CONFIG tables, and AttributeSkillInput dialog.
 */

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
}

/**
 * Patches core MythCraft AttributeSkillInput and AttributeRoll to safely handle custom/homebrew attributes and skills
 */
export function patchAttributeSkillInput() {
  if (typeof mythcraft === "undefined") return;

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

  // Patch AttributeRollDialog for clean titles on Sanity, custom attributes, and custom skills
  const AttributeRollDialog = mythcraft.applications?.apps?.AttributeRollDialog;
  if (AttributeRollDialog && !AttributeRollDialog._essencePatched) {
    const descAttr = Object.getOwnPropertyDescriptor(AttributeRollDialog.prototype, "attributeLabel");
    if (descAttr && descAttr.get) {
      const origGetter = descAttr.get;
      Object.defineProperty(AttributeRollDialog.prototype, "attributeLabel", {
        get() {
          const attrKey = this.options?.context?.attribute;
          if (attrKey === "san") return "Sanity";
          const customAttrs = game.settings?.get?.(MODULE_ID, "customAttributes") ?? [];
          const found = customAttrs.find(a => a.key === attrKey);
          if (found) return found.name;
          const localized = origGetter.call(this);
          if (localized && !localized.startsWith("MYTHCRAFT.")) return localized;
          return mythcraft.CONFIG?.attributes?.list?.[attrKey]?.label || attrKey.toUpperCase();
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

  // Patch AttributeRoll class flavor generation
  const AttributeRollClass = mythcraft.rolls?.AttributeRoll || CONFIG.Dice?.rolls?.find(r => r.name === "AttributeRoll");
  if (AttributeRollClass && !AttributeRollClass._essencePatched) {
    // Intercept BaseActorModel.prototype.rollAttribute / rollSkill to format flavor cleanly
    const BaseActorModel = CONFIG.Actor?.dataModels?.character?.prototype?.__proto__;
    if (BaseActorModel?.rollAttribute && !BaseActorModel._essenceFlavorPatched) {
      const origRollAttribute = BaseActorModel.rollAttribute;
      BaseActorModel.rollAttribute = async function(attribute) {
        // Ensure i18n has translations set
        syncHomebrewAttributesToSystem();
        return origRollAttribute.call(this, attribute);
      };
      BaseActorModel._essenceFlavorPatched = true;
    }
    AttributeRollClass._essencePatched = true;
  }
}
