/**
 * mythcraft-essence-sheet | src/data/spell-library.mjs
 *
 * Canonical MythCraft Spell Library mapped from Spell_Mapping.xlsx (Columns A–P).
 * Columns Q (Description) and R (Sourcebook) are intentionally omitted per specification.
 *
 * Column Mapping:
 * - A: name (Spell Name)
 * - B: magicSource (Magic Source: Arcane, Divine, Occult, Primal, Psionic)
 * - C: spellType (Spell Type: Spell, Cantrip, Prayer, Ritual, Chant, Invocation)
 * - D: function (Function: Altering, Illusory, Warding, Alchemy, Enchanting, Evoking, Necromancy, Divining, Summoning)
 * - E: apc (Action Point Cost)
 * - F: spc (Spell Point Cost)
 * - G: range (Range)
 * - H: duration (Spell Duration)
 * - I: requires (Requirements + 1-letter requirementBadges: G=Gesture, V=Verbal, S=Visual, E=Line of Effect, L=Line of Sight, Z=Sleeping)
 * - J: castingTime (Conjuring / Casting Time)
 * - K: prerequisite (Prerequisite / Recharge + structured prerequisiteRule)
 * - L: tags (Array of system tags)
 * - M: isAttack (Boolean: true if Spell Attack, false if non-attack description post)
 * - N: target (Target Defense / Check for chat cards)
 * - O: upcharge (Upcharge Cost and Effect + structured powerScaling & upchargeOptions)
 * - P: materials (Materials / Sacrament)
 */

import {
  getActorActiveEffectBonuses,
  getCombinedDamageBonusFormula,
  getSpellFilteredCostModifiers,
} from "../features/active-effect-engine.mjs";

export const SPELL_REQUIREMENT_LEGEND = {
  G: "Gesture",
  V: "Verbal",
  S: "Visual",
  E: "Line of Effect",
  L: "Line of Sight",
  Z: "Sleeping",
};

export const SPELL_LIBRARY = {
  "air bubble": {
    "name": "Air Bubble",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 12,
    "spc": 8,
    "range": "Touch",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 2",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 willing creature per +6 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 willing creature",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "arcane column": {
    "name": "Arcane Column",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 2,
    "spc": 18,
    "range": "1 mi",
    "duration": "10 min",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "altering"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "+5 ft radius per +4 SP / +30 ft height per +18 SP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d12",
        "type": "blunt"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 ft radius",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      },
      {
        "id": "upcharge-1",
        "label": "+30 ft height",
        "spCost": 18,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "arcane disguise": {
    "name": "Arcane Disguise",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 2,
    "spc": 5,
    "range": "Self",
    "duration": "10 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "illusory"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 min per +5 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 min",
        "spCost": 5,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "arcane shield": {
    "name": "Arcane Shield",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Warding",
    "apc": "Reactive",
    "spc": 3,
    "range": "Self",
    "duration": "1 round",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Resist Magic +2 per +4 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "Resist Magic +2",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "arcane swap": {
    "name": "Arcane Swap",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": 10,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "altering"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "+20 ft range per +5 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+20 ft range",
        "spCost": 5,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "bloat": {
    "name": "Bloat",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 5,
    "spc": 0,
    "range": "40 ft",
    "duration": "1 min",
    "requires": "Gesture, Visual, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "alchemy"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "3d12",
        "type": "corrosive"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "carrier": {
    "name": "Carrier",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 5,
    "spc": 8,
    "range": "Touch",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+30 min duration per +6 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+30 min duration",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "circle of haste": {
    "name": "Circle of Haste",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 2,
    "spc": 16,
    "range": "60 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 ft radius per +6 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 ft radius",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "circle of power": {
    "name": "Circle of Power",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 6,
    "spc": 12,
    "range": "60 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 ft radius per +4 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 ft radius",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "circle of warding": {
    "name": "Circle of Warding",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Warding",
    "apc": 5,
    "spc": 8,
    "range": "30 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "warding"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 ft radius per +6 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 ft radius",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "clear mind": {
    "name": "Clear Mind",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": 4,
    "range": "Self",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "conceal spell": {
    "name": "Conceal Spell",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 2,
    "spc": 14,
    "range": "Self",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metamagic",
      "illusory"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "conduit": {
    "name": "Conduit",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 10,
    "spc": 10,
    "range": "Special",
    "duration": "1 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 3",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "contest spell": {
    "name": "Contest Spell",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Warding",
    "apc": "Reactive",
    "spc": 0,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding"
    ],
    "isAttack": false,
    "target": "Magic Attr Check",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "corpse explosion": {
    "name": "Corpse Explosion",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 3,
    "spc": 12,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "4d6",
        "type": "corrosive"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "create lesser golem": {
    "name": "Create Lesser Golem",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 1,
    "spc": 30,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "death ward": {
    "name": "Death Ward",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Warding",
    "apc": 4,
    "spc": 14,
    "range": "Touch",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 hr duration per +6 SP (max +7 hr)",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 hr duration",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "decapitate": {
    "name": "Decapitate",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 3,
    "spc": 14,
    "range": "Touch",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "necromancy"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "4d6",
        "type": "necrotic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "decay": {
    "name": "Decay",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 4,
    "spc": 8,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "necromancy"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "+1d12 damage per +6 SP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "2d12",
        "type": "necrotic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "decay-dmg",
        "label": "+1d12 Necrotic Damage",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "bonusDicePerStack": "1d12",
        "damageType": "necrotic",
        "isDamageUpcharge": true
      }
    ]
  },
  "delay spell": {
    "name": "Delay Spell",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": "Reactive",
    "spc": 12,
    "range": "Self",
    "duration": "10 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metamagic",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "dispel circle": {
    "name": "Dispel Circle",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": "Special",
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "altering"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "empower spell": {
    "name": "Empower Spell",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 4,
    "spc": 12,
    "range": "Self",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metamagic",
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 die size per +6 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 die size",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "enchant weapon - fire": {
    "name": "Enchant Weapon - Fire",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 2,
    "spc": 8,
    "range": "Touch",
    "duration": "2 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "alchemy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "encode/ decode": {
    "name": "Encode/ Decode",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 30,
    "spc": 10,
    "range": "Touch",
    "duration": "Special",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 10",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "illusory"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 page per +1 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 page",
        "spCost": 1,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "energy siphon": {
    "name": "Energy Siphon",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 4,
    "spc": "Variable",
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "necromancy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "extend spell": {
    "name": "Extend Spell",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": 12,
    "range": "Self",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metamagic",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+15 ft range per +4 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+15 ft range",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "fan the flames": {
    "name": "Fan the Flames",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 3,
    "spc": 4,
    "range": "60 ft",
    "duration": "Special",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 ft radius per +4 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 ft radius",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "fade": {
    "name": "Fade",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 15,
    "spc": 15,
    "range": "Touch",
    "duration": "1 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 6",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "illusory"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "fire shield": {
    "name": "Fire Shield",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 2,
    "spc": 8,
    "range": "Self",
    "duration": "1 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "fireball": {
    "name": "Fireball",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": "Special",
    "spc": 15,
    "range": "200 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "+5 ft radius per +4 SP / +1d6 dmg per +2 AP conjuring",
    "materials": null,
    "baseDamage": [
      {
        "formula": "6d6",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "fireball-conjure-dmg",
        "label": "+1d6 Fire Damage (Conjuring)",
        "spCost": 0,
        "apCost": 2,
        "repeatable": true,
        "bonusDicePerStack": "1d6",
        "damageType": "fire",
        "isDamageUpcharge": true
      },
      {
        "id": "fireball-radius",
        "label": "+5 ft Radius",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "flay": {
    "name": "Flay",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 12,
    "spc": 2,
    "range": "Touch",
    "duration": "Special",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 3",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "necromancy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "fly": {
    "name": "Fly",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 2,
    "spc": 12,
    "range": "Touch",
    "duration": "10 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "freeze": {
    "name": "Freeze",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 12,
    "spc": 50,
    "range": "300 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Conjuring 2",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "altering"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "+10 ft radius per +5 SP / Fatigue on crit",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+10 ft radius",
        "spCost": 5,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "frost beam": {
    "name": "Frost Beam",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 4,
    "spc": 8,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "+1d6 damage per +4 SP / Grounded on crit",
    "materials": null,
    "baseDamage": [
      {
        "formula": "3d6",
        "type": "cold"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "frost-beam-dmg",
        "label": "+1d6 Cold Damage",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "bonusDicePerStack": "1d6",
        "damageType": "cold",
        "isDamageUpcharge": true
      }
    ]
  },
  "gateway": {
    "name": "Gateway",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 30,
    "spc": 75,
    "range": "Touch",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 10",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "glyph of seeing and casting": {
    "name": "Glyph of Seeing and Casting",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 20,
    "spc": 32,
    "range": "Touch",
    "duration": "24 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 5",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Invisible glyph for +8 SP / Cross-plane for +12 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "Invisible glyph",
        "spCost": 8,
        "apCost": 0,
        "repeatable": false,
        "isDamageUpcharge": false
      },
      {
        "id": "upcharge-1",
        "label": "Cross-plane",
        "spCost": 12,
        "apCost": 0,
        "repeatable": false,
        "isDamageUpcharge": false
      }
    ]
  },
  "graft": {
    "name": "Graft",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": 35,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "grand unveiling": {
    "name": "Grand Unveiling",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Divining",
    "apc": 15,
    "spc": 60,
    "range": "Self",
    "duration": "10 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 5",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "divining"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 min duration per +15 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 min duration",
        "spCost": 15,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "greater unveiling": {
    "name": "Greater Unveiling",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Divining",
    "apc": 4,
    "spc": 22,
    "range": "Self",
    "duration": "10 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "divining"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 min duration per +8 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 min duration",
        "spCost": 8,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "grimoire": {
    "name": "Grimoire",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 1,
    "spc": "Special",
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "grounded": {
    "name": "Grounded",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 4,
    "spc": 16,
    "range": "150 ft",
    "duration": "1 min",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "altering"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "herneate": {
    "name": "Herneate",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 10,
    "spc": 48,
    "range": "80 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 2",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "necromancy"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "ice daggers": {
    "name": "Ice Daggers",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 4,
    "spc": 12,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": "+1 target creature per +4 SP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "sharp"
      },
      {
        "formula": "2d6",
        "type": "cold"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 target creature",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "ice fan": {
    "name": "Ice Fan",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 8,
    "spc": 21,
    "range": "20 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Cone +5 ft per +3 SP / Grounded on crit",
    "materials": null,
    "baseDamage": [
      {
        "formula": "6d6",
        "type": "cold"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "Cone +5 ft",
        "spCost": 3,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "ice stairs": {
    "name": "Ice Stairs",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 1,
    "spc": 6,
    "range": "5 ft",
    "duration": "1 round",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "identify magic": {
    "name": "Identify Magic",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Divining",
    "apc": 15,
    "spc": 8,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 3",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "divining"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "kill": {
    "name": "Kill",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 1,
    "spc": 90,
    "range": "100 ft",
    "duration": "Instant",
    "requires": "Verbal",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "last wish": {
    "name": "Last Wish",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 1,
    "spc": 0,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "necromancy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "lesser unveiling": {
    "name": "Lesser Unveiling",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Divining",
    "apc": 4,
    "spc": 6,
    "range": "Touch",
    "duration": "10 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "divining"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+2 bonus to both skills per +3 SP (max +15)",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+2 bonus to both skills",
        "spCost": 3,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "living letter": {
    "name": "Living Letter",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 1,
    "spc": 6,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "10 min",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "alchemy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "living mansion": {
    "name": "Living Mansion",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 50,
    "spc": 70,
    "range": "Touch",
    "duration": "1 week",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 10",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "summoning"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "locate signature": {
    "name": "Locate Signature",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Divining",
    "apc": 20,
    "spc": 5,
    "range": "Indefinite",
    "duration": "1 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 5",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "divining"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "locate magic": {
    "name": "Locate Magic",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Divining",
    "apc": 20,
    "spc": 15,
    "range": "1 mi",
    "duration": "1 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 5",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "divining"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 min per +2 SP / +1 mi per +8 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 min",
        "spCost": 2,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      },
      {
        "id": "upcharge-1",
        "label": "+1 mi",
        "spCost": 8,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "mage armor": {
    "name": "Mage Armor",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Warding",
    "apc": 3,
    "spc": 8,
    "range": "Touch",
    "duration": "8 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "warding"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 to all defenses per +12 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 to all defenses",
        "spCost": 12,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "major illusion": {
    "name": "Major Illusion",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 3,
    "spc": 32,
    "range": "600 ft",
    "duration": "10 min",
    "requires": "Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "illusory"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 min duration per +8 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 min duration",
        "spCost": 8,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "major teleportation": {
    "name": "Major Teleportation",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 20,
    "spc": 45,
    "range": "10 ft",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "Conjuring 5",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "mask": {
    "name": "Mask",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 6,
    "spc": 30,
    "range": "30 ft",
    "duration": "1 hr",
    "requires": "Gesture, Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Conjuring 2",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "arcaneRitual",
      "conjuring",
      "illusory"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+30 min duration per +5 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+30 min duration",
        "spCost": 5,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "medusification": {
    "name": "Medusification",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 4,
    "spc": 20,
    "range": "80 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "summoning"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "meteor": {
    "name": "Meteor",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 30,
    "spc": 120,
    "range": "Sight",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 10",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Backlash 120 damage; DC 25 save or permanently lose Arcane magic",
    "materials": null,
    "baseDamage": [
      {
        "formula": "40d6",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "meteor storm": {
    "name": "Meteor Storm",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 50,
    "spc": 150,
    "range": "Sight",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 15",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Caster dies immediately and Essence is scattered across Celestial Sea",
    "materials": null,
    "baseDamage": [
      {
        "formula": "40d6",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "beam of fire": {
    "name": "Beam of Fire",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Evoking",
    "apc": 3,
    "spc": 0,
    "range": "30 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "cantrip"
    ],
    "isAttack": true,
    "target": "AR",
    "upcharge": "Scales with Arcane Power: +20 ft range at 3, 7, 12; +1d10 dmg at 18, 25",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d10",
        "type": "fire"
      }
    ],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "note": "+20 ft range (80 ft)"
        },
        {
          "min": 7,
          "note": "+40 ft range (100 ft)"
        },
        {
          "min": 12,
          "note": "+60 ft range (120 ft)"
        },
        {
          "min": 18,
          "damageFormula": "2d10",
          "note": "Damage increases to 2d10 fire"
        },
        {
          "min": 25,
          "damageFormula": "3d10",
          "note": "Damage increases to 3d10 fire"
        }
      ]
    },
    "upchargeOptions": []
  },
  "frostbite": {
    "name": "Frostbite",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Evoking",
    "apc": 2,
    "spc": 0,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "cantrip"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Scales with Arcane Power: +20 ft range at 3, 7, 18; Chilled at 12; +1d6 dmg at 25",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "cold"
      }
    ],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "note": "+20 ft range (80 ft)"
        },
        {
          "min": 7,
          "note": "+40 ft range (100 ft)"
        },
        {
          "min": 12,
          "note": "Inflicts Chilled condition"
        },
        {
          "min": 18,
          "note": "+60 ft range (120 ft)"
        },
        {
          "min": 25,
          "damageFormula": "2d6",
          "note": "Damage increases to 2d6 cold"
        }
      ]
    },
    "upchargeOptions": []
  },
  "grave whisper": {
    "name": "Grave Whisper",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Evoking",
    "apc": 3,
    "spc": 0,
    "range": "40 ft",
    "duration": "Instant",
    "requires": "Verbal, Visual, Line of Sight",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "cantrip"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Scales: +20 ft at 3, 7, 18; APC -1 at 12; +1d8 at 25; Broken on crit",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "necrotic"
      }
    ],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "note": "+20 ft range (60 ft)"
        },
        {
          "min": 7,
          "note": "+40 ft range (80 ft)"
        },
        {
          "min": 12,
          "apcOverride": 2,
          "note": "APC reduced by 1 (2 AP)"
        },
        {
          "min": 18,
          "note": "+60 ft range (100 ft)"
        },
        {
          "min": 25,
          "damageFormula": "2d8",
          "note": "Damage increases to 2d8 necrotic; Broken on crit"
        }
      ]
    },
    "upchargeOptions": []
  },
  "illuminate": {
    "name": "Illuminate",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Evoking",
    "apc": 1,
    "spc": 0,
    "range": "40 ft",
    "duration": "1 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scales: +20 ft range at 3, 12, 18; +10 ft bright radius at 7, 25",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "note": "+20 ft range"
        },
        {
          "min": 7,
          "note": "+10 ft bright light radius"
        },
        {
          "min": 12,
          "note": "+40 ft range"
        },
        {
          "min": 18,
          "note": "+60 ft range"
        },
        {
          "min": 25,
          "note": "+20 ft bright light radius"
        }
      ]
    },
    "upchargeOptions": []
  },
  "lend power": {
    "name": "Lend Power",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Altering",
    "apc": "Reactive",
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Line of Effect",
    "requirementBadges": [
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "altering",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "mend": {
    "name": "Mend",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Alchemy",
    "apc": 1,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Conjuring 6",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scales with Arcane Power: area increases to 10 ft cube at 7, 15 ft at 18, 20 ft at 25",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 7,
          "note": "Area increases to 10 ft cube"
        },
        {
          "min": 18,
          "note": "Area increases to 15 ft cube"
        },
        {
          "min": 25,
          "note": "Area increases to 20 ft cube"
        }
      ]
    },
    "upchargeOptions": []
  },
  "minor conjuration": {
    "name": "Minor Conjuration",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Alchemy",
    "apc": 1,
    "spc": 0,
    "range": "15 ft",
    "duration": "1 hr",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "10 min",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "numb": {
    "name": "Numb",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Enchanting",
    "apc": 5,
    "spc": 0,
    "range": "30 ft",
    "duration": "1 round",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "enchanting",
      "cantrip"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Scales with Arcane Power: APC 4 at 3, +30 ft at 7, 30s at 12, APC 3 at 18, 1 min at 25",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "apcOverride": 4,
          "note": "APC reduced to 4 AP"
        },
        {
          "min": 7,
          "note": "+30 ft range (90 ft)"
        },
        {
          "min": 12,
          "note": "Duration increases to 30 seconds"
        },
        {
          "min": 18,
          "apcOverride": 3,
          "note": "APC reduced to 3 AP"
        },
        {
          "min": 25,
          "note": "Duration increases to 1 minute"
        }
      ]
    },
    "upchargeOptions": []
  },
  "prestidigitation": {
    "name": "Prestidigitation",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Evoking",
    "apc": 1,
    "spc": 0,
    "range": "15 ft",
    "duration": "1 hr",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "sensory illusion": {
    "name": "Sensory Illusion",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Illusory",
    "apc": 1,
    "spc": 0,
    "range": "30 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "illusory",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "signature": {
    "name": "Signature",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Illusory",
    "apc": 1,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "10 min",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "fundamental",
      "illusory",
      "cantrip"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "stink": {
    "name": "Stink",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Evoking",
    "apc": 4,
    "spc": 0,
    "range": "Touch",
    "duration": "1 round",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "cantrip"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Scales with Arcane Power: range 20 ft at 3, radius 10 ft at 12, duration 30s at 25",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "note": "Range increases to 20 ft"
        },
        {
          "min": 12,
          "note": "Radius increases to 10 ft"
        },
        {
          "min": 25,
          "note": "Duration increases to 30 seconds"
        }
      ]
    },
    "upchargeOptions": []
  },
  "ulcerate": {
    "name": "Ulcerate",
    "magicSource": "Arcane",
    "sourceKey": "arcane",
    "spellType": "Cantrip",
    "function": "Necromancy",
    "apc": 4,
    "spc": 0,
    "range": "60 ft",
    "duration": "1 round",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "necromancy",
      "cantrip"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Scales with Arcane Power: +20 ft at 3, APC 3 at 7, +20 ft at 12, +1d4 dmg at 18, APC 2 at 25",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d4",
        "type": "necrotic"
      }
    ],
    "powerScaling": {
      "source": "arcane",
      "tiers": [
        {
          "min": 3,
          "note": "+20 ft range (30 ft)"
        },
        {
          "min": 7,
          "apcOverride": 3,
          "note": "APC reduced to 3 AP"
        },
        {
          "min": 12,
          "note": "+40 ft range (50 ft)"
        },
        {
          "min": 18,
          "damageFormula": "2d4",
          "note": "Damage increases to 2d4 necrotic"
        },
        {
          "min": 25,
          "apcOverride": 2,
          "note": "APC reduced to 2 AP"
        }
      ]
    },
    "upchargeOptions": []
  },
  "angel wings": {
    "name": "Angel Wings",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 4,
    "spc": 32,
    "range": "Touch",
    "duration": "10 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Sacrament: Diamond 500 sc enables Light Burst prayer for 2 AP (instead of 3)",
    "materials": "Diamond 500 sc",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "armor of starlight": {
    "name": "Armor of Starlight",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Warding",
    "apc": 4,
    "spc": 30,
    "range": "40 ft",
    "duration": "10 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Outdoors under stars: attacks deal +2 dmg as radiant",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "banish": {
    "name": "Banish",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 18,
    "spc": 40,
    "range": "40 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Conjuring 4",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "summoning"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": "Roll 2d20 take higher vs Primal/Psionic casters. Interrupted loses 10 SP instead of 40.",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "brimstone boulder": {
    "name": "Brimstone Boulder",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 6,
    "spc": 40,
    "range": "10 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "conjuring",
      "summoning"
    ],
    "isAttack": false,
    "target": "DEX Check",
    "upcharge": "Sacrament: Crush sulfur crystal (20 sc) to take 1d10 fire/toxic and lower SPC by 10",
    "materials": "Sulfur crystal 20 sc",
    "baseDamage": [
      {
        "formula": "2d10",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "burst of healing": {
    "name": "Burst of Healing",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 4,
    "spc": 20,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+5 ft radius per +4 SP / +1d6 HP healed per +4 SP. Sacrament: removes Broken/Frightened/Shaken",
    "materials": "Diamond 100 sc",
    "baseDamage": [
      {
        "formula": "2d6",
        "type": "heal",
        "isHeal": true
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "burst-healing-hp",
        "label": "+1d6 HP Healed",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "bonusDicePerStack": "1d6",
        "damageType": "heal",
        "isHeal": true,
        "isDamageUpcharge": true
      },
      {
        "id": "burst-healing-radius",
        "label": "+5 ft Radius",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "celestial form": {
    "name": "Celestial Form",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 8,
    "spc": 50,
    "range": "Self",
    "duration": "1 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 3",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "conjuring",
      "alchemy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Sacrament: Burn 100 sc incense to last full duration without spending 1 AP/round",
    "materials": "Incense 100 sc",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "commandment": {
    "name": "Commandment",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 2,
    "spc": 4,
    "range": "40 ft",
    "duration": "1 round",
    "requires": "Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "enchanting"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "curative word": {
    "name": "Curative Word",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 1,
    "spc": 3,
    "range": "40 ft",
    "duration": "Instant",
    "requires": "Verbal",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+60 ft range per +3 SP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d4",
        "type": "heal",
        "isHeal": true
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+60 ft range",
        "spCost": 3,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "divine challenge": {
    "name": "Divine Challenge",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 1,
    "spc": 6,
    "range": "60 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "enchanting"
    ],
    "isAttack": true,
    "target": "LOG",
    "upcharge": "All damage in spell becomes 1d10 for +4 AP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "radiant"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "divine-challenge-d10",
        "label": "All Spell Damage Becomes 1d10",
        "spCost": 0,
        "apCost": 4,
        "repeatable": false,
        "formulaOverride": "1d10",
        "damageType": "radiant",
        "isDamageUpcharge": true
      }
    ]
  },
  "healing touch": {
    "name": "Healing Touch",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 3,
    "spc": 4,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1d8 HP per +4 SP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "heal",
        "isHeal": true
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "healing-touch-hp",
        "label": "+1d8 HP Healed",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "bonusDicePerStack": "1d8",
        "damageType": "heal",
        "isHeal": true,
        "isDamageUpcharge": true
      }
    ]
  },
  "heavenly fire": {
    "name": "Heavenly Fire",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 5,
    "spc": 20,
    "range": "100 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Sacrament: Diamond 100 sc ignores conjuring and reduces APC by 2",
    "materials": "Diamond 100 sc",
    "baseDamage": [
      {
        "formula": "4d10",
        "type": "radiant"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "miracle": {
    "name": "Miracle",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 30,
    "spc": 150,
    "range": "Indefinite",
    "duration": "Instant",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 10",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Permanent Shaken condition if used to create custom world-altering effect",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "radiance of the dawn": {
    "name": "Radiance of the Dawn",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 6,
    "spc": 20,
    "range": "60 ft",
    "duration": "1 round",
    "requires": "Gesture, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "evoking"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "Sacrament: Spend 40 sc incense to keep light active for 5 minutes",
    "materials": "Incense 40 sc",
    "baseDamage": [
      {
        "formula": "3d10",
        "type": "radiant"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "revitalize": {
    "name": "Revitalize",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 15,
    "spc": 5,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 3",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "sacrament",
      "conjuring",
      "necromancy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 Death Point removed per +5 SP. Sacrament: Ruby 60 sc reduces APC to 2 & ignores conjuring",
    "materials": "Ruby 60 sc",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 Death Point removed",
        "spCost": 5,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "candle of faith": {
    "name": "Candle of Faith",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Prayer",
    "function": "Evoking",
    "apc": 1,
    "spc": 0,
    "range": "Touch",
    "duration": "1 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "prayer"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scales with Divine Power: duration 2m at 3, 10m at 7, 30m at 12, 1h at 16, indefinite at 24",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "divine",
      "tiers": [
        {
          "min": 3,
          "note": "Duration increases to 2 minutes"
        },
        {
          "min": 7,
          "note": "Duration increases to 10 minutes"
        },
        {
          "min": 12,
          "note": "Duration increases to 30 minutes"
        },
        {
          "min": 16,
          "note": "Duration increases to 1 hour"
        },
        {
          "min": 24,
          "note": "Duration becomes Indefinite"
        }
      ]
    },
    "upchargeOptions": []
  },
  "guide": {
    "name": "Guide",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Prayer",
    "function": "Enchanting",
    "apc": "Reactive",
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "enchanting",
      "prayer"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scales with Divine Power: range 20 ft at 3, 40 ft at 7, bonus +1d6 at 12, +1d8 at 24",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d4",
        "type": "bonus"
      }
    ],
    "powerScaling": {
      "source": "divine",
      "tiers": [
        {
          "min": 3,
          "note": "Range increases to 20 ft"
        },
        {
          "min": 7,
          "note": "Range increases to 40 ft"
        },
        {
          "min": 12,
          "damageFormula": "1d6",
          "note": "Bonus increases to +1d6"
        },
        {
          "min": 24,
          "damageFormula": "1d8",
          "note": "Bonus increases to +1d8"
        }
      ]
    },
    "upchargeOptions": []
  },
  "sacred flare": {
    "name": "Sacred Flare",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Prayer",
    "function": "Evoking",
    "apc": 2,
    "spc": 0,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "prayer"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": "Scales with Divine Power: +20 ft range at 3, 7, 12, 16; +1d8 damage at 24",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "radiant"
      }
    ],
    "powerScaling": {
      "source": "divine",
      "tiers": [
        {
          "min": 3,
          "note": "+20 ft range (80 ft)"
        },
        {
          "min": 7,
          "note": "+40 ft range (100 ft)"
        },
        {
          "min": 12,
          "note": "+60 ft range (120 ft)"
        },
        {
          "min": 16,
          "note": "+80 ft range (140 ft)"
        },
        {
          "min": 24,
          "damageFormula": "2d8",
          "note": "Damage increases to 2d8 radiant"
        }
      ]
    },
    "upchargeOptions": []
  },
  "stabilizing touch": {
    "name": "Stabilizing Touch",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Prayer",
    "function": "Necromancy",
    "apc": 2,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "necromancy",
      "prayer"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scales with Divine Power: range extends up to 40 ft; target regains 1 HP at 24",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "divine",
      "tiers": [
        {
          "min": 3,
          "note": "Range extends up to 40 ft with Divine Power"
        },
        {
          "min": 24,
          "note": "Target also regains 1 HP"
        }
      ]
    },
    "upchargeOptions": []
  },
  "greater restoration": {
    "name": "Greater Restoration",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "4 hours",
    "prerequisite": "Divine Power 12",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 12,
      "label": "Divine Power 12"
    },
    "tags": [
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Exhausting: Caster is Sickened for 1 hour after completing ritual",
    "materials": "Incense/gems 500 sc",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hallow": {
    "name": "Hallow",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "24 hours",
    "prerequisite": "Divine Power 12",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 12,
      "label": "Divine Power 12"
    },
    "tags": [
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "100 sc worth of incense, which are burned over the course of the ritual",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "heaven-touched": {
    "name": "Heaven-Touched",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "4 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "enchanting",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "10 sc worth of oils and incense, expended as part of the ritual",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "holy tempering": {
    "name": "Holy Tempering",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": 6,
    "spc": 20,
    "range": "Take a Rest",
    "duration": "4 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes, which can be part of a Recoup",
    "prerequisite": "Divine Power 3",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 3,
      "label": "Divine Power 3"
    },
    "tags": [
      "liturgy",
      "alchemy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Your ritual becomes stronger when you reach higher Divine Power. Divine Power 12: Additional radiant damage becomes 1d10.",
    "materials": "1 melee or reach weapon and 1 flask of holy water",
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "radiant"
      }
    ],
    "powerScaling": {
      "source": "divine",
      "tiers": [
        {
          "min": 12,
          "damageFormula": "1d10",
          "note": "Divine Power 12: Additional radiant damage becomes 1d10"
        }
      ]
    },
    "upchargeOptions": []
  },
  "holy weapon": {
    "name": "Holy Weapon",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "8 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Divine Power 7",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 7,
      "label": "Divine Power 7"
    },
    "tags": [
      "alchemy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "1 sc of scented oils, expended as part of the ritual",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "immunity": {
    "name": "Immunity",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes, which can be part of a Recoup",
    "prerequisite": "Divine Power 24",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 24,
      "label": "Divine Power 24"
    },
    "tags": [
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "A diamond worth at least 10,000 sc, which the ritual consumes",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "lesser restoration": {
    "name": "Lesser Restoration",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": 5,
    "spc": 20,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": "Divine Power 7",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 7,
      "label": "Divine Power 7"
    },
    "tags": [
      "liturgy",
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "100 sc worth of incense or gems, which are burned or magically consumed over the casting of the ritual",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "merriment": {
    "name": "Merriment",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "30 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "plague": {
    "name": "Plague",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Evoking",
    "apc": null,
    "spc": 0,
    "range": "Sight",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": "Divine Power 12",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 12,
      "label": "Divine Power 12"
    },
    "tags": [
      "evoking",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "portent": {
    "name": "Portent",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "24 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Divine Power 3",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 3,
      "label": "Divine Power 3"
    },
    "tags": [
      "divining",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "prayer of healing": {
    "name": "Prayer of Healing",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Evoking",
    "apc": null,
    "spc": 0,
    "range": "30 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes, which can be part of a Recoup",
    "prerequisite": "Divine Power 3",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 3,
      "label": "Divine Power 3"
    },
    "tags": [
      "evoking",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "If you burn at least 10 sc worth of incense as part of the casting of this ritual, add +1d10 to your roll.",
    "materials": null,
    "baseDamage": [
      {
        "formula": "3d10",
        "type": "heal",
        "isHeal": true
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "prayer-healing-incense",
        "label": "Burn 10 sc Incense (+1d10 HP Healed)",
        "spCost": 0,
        "apCost": 0,
        "repeatable": false,
        "bonusDicePerStack": "1d10",
        "damageType": "heal",
        "isHeal": true,
        "isDamageUpcharge": true
      }
    ]
  },
  "precognition": {
    "name": "Precognition",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "divining",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "providence": {
    "name": "Providence",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "24 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Divine Power 12",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 12,
      "label": "Divine Power 12"
    },
    "tags": [
      "divining",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "purify": {
    "name": "Purify",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": 3,
    "spc": 8,
    "range": "10 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Divine Power 12",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 12,
      "label": "Divine Power 12"
    },
    "tags": [
      "liturgy",
      "alchemy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "regeneration": {
    "name": "Regeneration",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "24 hours",
    "prerequisite": "Divine Power 16",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 16,
      "label": "Divine Power 16"
    },
    "tags": [
      "alchemy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "1,000 sc worth of gems and oils, which the ritual consumes",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "reincarnation": {
    "name": "Reincarnation",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "12 hours",
    "prerequisite": "Divine Power 24",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 24,
      "label": "Divine Power 24"
    },
    "tags": [
      "necromancy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "At least one physical body part of the creature you intend to reincarnate and 1,000 sc worth of crystals and diamonds, which the ritual consumes",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "resistance": {
    "name": "Resistance",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": 5,
    "spc": 6,
    "range": "Self",
    "duration": "2 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "liturgy",
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+3 Resist per +4 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+3 Resist",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "resurrection": {
    "name": "Resurrection",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "24 hours",
    "prerequisite": "Divine Power 24",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 24,
      "label": "Divine Power 24"
    },
    "tags": [
      "necromancy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Roll 2d100 for Personality/Memory tables, or assume 100/100 by permanently losing ritual",
    "materials": "10,000 sc gems/oils & corpse",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "revive": {
    "name": "Revive",
    "magicSource": "Divine",
    "sourceKey": "divine",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": "Divine Power 12",
    "prerequisiteRule": {
      "source": "divine",
      "sourceLabel": "Divine",
      "kind": "power",
      "value": 12,
      "label": "Divine Power 12"
    },
    "tags": [
      "necromancy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "A corpse with at least the torso and head intact; 500 sc worth of incense, crystals, diamonds, rubies, and oils, all of which are consumed in the ritual",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "abuse essence": {
    "name": "Abuse Essence",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Necromancy",
    "apc": 1,
    "spc": 5,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Verbal",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "necromancy"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Dark Power: Roll 1d20 vs DC 5+Occult Power. On fail, target gains +2 Fear",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "blood blade": {
    "name": "Blood Blade",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 3,
    "spc": 24,
    "range": "Touch",
    "duration": "10 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "corrosive"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "bone spear": {
    "name": "Bone Spear",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 4,
    "spc": 24,
    "range": "80 ft",
    "duration": "1 round",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "altering"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Dark Power: Crit fail hits caster and adjacent ally; Broken Bone on crit",
    "materials": null,
    "baseDamage": [
      {
        "formula": "6d8",
        "type": "sharp"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "darkness": {
    "name": "Darkness",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 3,
    "spc": 8,
    "range": "600 ft",
    "duration": "1 hr",
    "requires": "Gesture, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": "Incantation 1 AP",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "incantation",
      "ritualize",
      "illusory"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "+5 ft radius per +2 SP. Ritual cast takes 30 min (1/Recoup, no incantation needed)",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+5 ft radius",
        "spCost": 2,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "grasp of bones": {
    "name": "Grasp of Bones",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 3,
    "spc": 12,
    "range": "60 ft",
    "duration": "10 min",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Incantation 2 AP",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "incantation",
      "darkPower",
      "summoning"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "Dark Power: Crit fail deals 1d12 necrotic to caster",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d12",
        "type": "necrotic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hellfire": {
    "name": "Hellfire",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 30,
    "spc": 100,
    "range": "Sight",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 10",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "conjuring",
      "evoking"
    ],
    "isAttack": false,
    "target": "END Check",
    "upcharge": "Dark Power: Roll 1d20; on <=5 caster spontaneously combusts, dies, soul destroyed permanently",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hex of terror": {
    "name": "Hex of Terror",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 3,
    "spc": 16,
    "range": "60 ft",
    "duration": "1 min",
    "requires": "Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Incantation 1 AP",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "incantation",
      "enchanting"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": "+1 target creature per +8 SP (incantation costs 1 AP per creature)",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 target creature",
        "spCost": 8,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "blind": {
    "name": "Blind",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Chant",
    "function": "Illusory",
    "apc": 3,
    "spc": 0,
    "range": "40 ft",
    "duration": "Instant",
    "requires": "Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "illusory",
      "chant"
    ],
    "isAttack": true,
    "target": "LOG",
    "upcharge": "Crit fail blinds caster. Scales with Occult Power: range to 100 ft, up to 3 creatures",
    "materials": null,
    "baseDamage": [],
    "powerScaling": {
      "source": "occult",
      "tiers": [
        {
          "min": 3,
          "note": "Scales with Occult Power: range up to 100 ft, up to 3 creatures"
        }
      ]
    },
    "upchargeOptions": []
  },
  "eldritch orb": {
    "name": "Eldritch Orb",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Chant",
    "function": "Evoking",
    "apc": 3,
    "spc": 0,
    "range": "80 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "chant"
    ],
    "isAttack": true,
    "target": "AR",
    "upcharge": "Scales with Occult Power: range to 160 ft, up to 3 separate attack/damage beams",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "necrotic"
      }
    ],
    "powerScaling": {
      "source": "occult",
      "tiers": [
        {
          "min": 3,
          "note": "Scales with Occult Power: range up to 160 ft, up to 3 separate attack/damage beams"
        }
      ]
    },
    "upchargeOptions": []
  },
  "withering grasp": {
    "name": "Withering Grasp",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Chant",
    "function": "Necromancy",
    "apc": 2,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "necromancy",
      "chant"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Miss deals damage to caster. Scales with Occult Power: +1d10 dmg at 13, Fatigue on crit at 23",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d10",
        "type": "necrotic"
      }
    ],
    "powerScaling": {
      "source": "occult",
      "tiers": [
        {
          "min": 13,
          "damageFormula": "2d10",
          "note": "Occult Power 13: Damage increases to 2d10 necrotic"
        },
        {
          "min": 23,
          "note": "Occult Power 23: Inflicts Fatigue on critical hit"
        }
      ]
    },
    "upchargeOptions": []
  },
  "animate corpses": {
    "name": "Animate Corpses",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "15 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "necromancy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Can attempt without ruby dust via DC 10+4n check (fail gives Fatigue). +1 corpse per +10 SP",
    "materials": "Up to 3 corpses, 250 sc ruby dust each",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-1",
        "label": "+1 corpse",
        "spCost": 10,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "curse of withering": {
    "name": "Curse of Withering",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "Indefinite",
    "duration": "1 week",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": "Occult Power 13",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 13,
      "label": "Occult Power 13"
    },
    "tags": [
      "curse",
      "darkPower",
      "necromancy",
      "ritual"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "Miss afflicts caster with curse and permanent skin deformities",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "deathboil plague": {
    "name": "Deathboil Plague",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "5 mi",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "24 hours",
    "prerequisite": "Occult Power 13",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 13,
      "label": "Occult Power 13"
    },
    "tags": [
      "darkPower",
      "necromancy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scale by urban population size: <1k to >500k",
    "materials": "At least 5 rats and powdered bone from an undead humanoid",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "devil's sight": {
    "name": "Devil's Sight",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "4 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "enchanting",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Roll 1d20: on <=5, target becomes Blinded for duration instead",
    "materials": "Black onyx gem worth at least 200 sc (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "dreamwalker": {
    "name": "Dreamwalker",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Special",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which you can do while sleeping as part of Taking a Rest",
    "prerequisite": "Occult Power 7",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 7,
      "label": "Occult Power 7"
    },
    "tags": [
      "divining",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Upcharge levels: 5, 10, 15, 20, 25, 30, 35, 40",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "drums of the war god": {
    "name": "Drums of the War God",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "30 ft",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "enchanting",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Roll 1d20: on <=5, caster and allies become Shaken for duration instead",
    "materials": "A drum or improvised percussive instrument",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "entice": {
    "name": "Entice",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "60 ft",
    "duration": "24 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes",
    "prerequisite": "Occult Power 13",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 13,
      "label": "Occult Power 13"
    },
    "tags": [
      "charm",
      "enchanting",
      "ritual"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": "None",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "facetheft": {
    "name": "Facetheft",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "8 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "altering",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Magic check vs DC 10 + level or 1/2 ML; on fail, suffers permanent facial scarring",
    "materials": "20 sc cocaine and black pearl worth at least 40 sc (consumed)",
    "baseDamage": [
      {
        "formula": "1d12",
        "type": "psychic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "fallen progeny": {
    "name": "Fallen Progeny",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Summoning",
    "apc": null,
    "spc": 0,
    "range": "20 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 19",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 19,
      "label": "Occult Power 19"
    },
    "tags": [
      "darkPower",
      "summoning",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Spellcasting roll vs DC 15 + ML: friendly for 2x Magic Attr hours on success, hostile on failure",
    "materials": "Iron, copper, and precious gems worth at least 15,000 sc (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "fleshweave": {
    "name": "Fleshweave",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Summoning",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": "Occult Power 7",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 7,
      "label": "Occult Power 7"
    },
    "tags": [
      "summoning",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Biological matter of target creature (hair, blood, tooth) (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "flesh wings": {
    "name": "Flesh Wings",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "4 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "altering",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Magic check vs DC 18; on fail, ribs fail to heal properly, imposing permanent social penalties",
    "materials": "Scalpel, 20 sc morphine, mammal intestine thread (consumed except scalpel)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "gaze of a thousand miles": {
    "name": "Gaze of a Thousand Miles",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "1,000 mi",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "divining",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "MC rolls 1d20 vs WILL; if hit, Sarnulothon notices caster, Sickened 6 hr and hunted",
    "materials": "Blood and 2500 sc worth of incense (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hands of fire": {
    "name": "Hands of Fire",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Evoking",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "evoking",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Flammable oils and 20 sc worth of incense (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hell's angel": {
    "name": "Hell's Angel",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Summoning",
    "apc": null,
    "spc": 0,
    "range": "20 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 19",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 19,
      "label": "Occult Power 19"
    },
    "tags": [
      "darkPower",
      "summoning",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Magic check vs DC 15 + ML: friendly for 2x Magic Attr hours on success, hostile on failure",
    "materials": "Iron, copper, and precious gems worth at least 15,000 sc (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "horns of hell": {
    "name": "Horns of Hell",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "4 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes, which can be part of a Recoup",
    "prerequisite": "Occult Power 3",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 3,
      "label": "Occult Power 3"
    },
    "tags": [
      "charm",
      "darkPower",
      "altering",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Magic check vs DC 10 + level (max 30); on fail, misaligned horns leave creature Shaken",
    "materials": "A slaughtered and disemboweled goat",
    "baseDamage": [
      {
        "formula": "1d10",
        "type": "psychic"
      },
      {
        "formula": "2d6",
        "type": "sharp"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "innocence slaughtered": {
    "name": "Innocence Slaughtered",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "2 pints of blood from an innocent person",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "inscription of sharpening": {
    "name": "Inscription of Sharpening",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "2 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "alchemy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "A weapon that deals sharp damage",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "larva expulsion": {
    "name": "Larva Expulsion",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "24 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes",
    "prerequisite": "Occult Power 13",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 13,
      "label": "Occult Power 13"
    },
    "tags": [
      "alchemy",
      "ritual"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": null,
    "materials": "5 sc worth of molasses (consumed)",
    "baseDamage": [
      {
        "formula": "12d4",
        "type": "necrotic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "plague of boils": {
    "name": "Plague of Boils",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "5 mi",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "12 hours",
    "prerequisite": "Occult Power 7",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 7,
      "label": "Occult Power 7"
    },
    "tags": [
      "darkPower",
      "altering",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Scale by urban population size: <1k to >500k",
    "materials": "Collection of scabs and beetles",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "planar portal": {
    "name": "Planar Portal",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "10 ft",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes",
    "prerequisite": "Occult Power 24",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 24,
      "label": "Occult Power 24"
    },
    "tags": [
      "altering",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Close portal early by spending 30 AP and 15 SP as Conjuring 10",
    "materials": "30,000 sc gems befitting target plane (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "refraction of a thousand souls": {
    "name": "Refraction of a Thousand Souls",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Illusory",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "1 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes, which can be part of a Recoup",
    "prerequisite": "Occult Power 3",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 3,
      "label": "Occult Power 3"
    },
    "tags": [
      "illusory",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "A gem worth at least 100 sc (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "regenerate": {
    "name": "Regenerate",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 19",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 19,
      "label": "Occult Power 19"
    },
    "tags": [
      "darkPower",
      "necromancy",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Roll 1d20: on <=5, regrown limb has grotesque or monstrous appearance",
    "materials": "Slaughtered animal, 50 sc incense, 5,000 sc rubies (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "scarlet sickness": {
    "name": "Scarlet Sickness",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "5 mi",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "24 hours",
    "prerequisite": "Occult Power 23",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 23,
      "label": "Occult Power 23"
    },
    "tags": [
      "darkPower",
      "necromancy",
      "ritual"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "On a miss, caster contracts Scarlet Sickness instead",
    "materials": "Rotten corpse, slaughtered animal, 1 gallon fresh humanoid blood",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "scry": {
    "name": "Scry",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "5 mi",
    "duration": "10 min",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 13",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 13,
      "label": "Occult Power 13"
    },
    "tags": [
      "divining",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Large crystal, silvered mirror, or reflection pool worth at least 10,000 sc",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "shadow armor": {
    "name": "Shadow Armor",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "charm",
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Fire source and darkened area allowing shadows to dance",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "shrine to the dark lords": {
    "name": "Shrine to the Dark Lords",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "8 hours",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "300 sc gems, 2 lbs humanoid bones, 4 gal blood, humanoid heart",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "skeleton key": {
    "name": "Skeleton Key",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "30 min",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes",
    "prerequisite": "Occult Power 7",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 7,
      "label": "Occult Power 7"
    },
    "tags": [
      "altering",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d10",
        "type": "sharp"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "splendor of the exiles": {
    "name": "Splendor of the Exiles",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Summoning",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "2 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "charm",
      "darkPower",
      "summoning",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Roll 1d20: on <=5, target takes 4d10 fire dmg and summons no fiends",
    "materials": "Flammable oils, 100 sc incense, 1 gallon fresh humanoid blood (consumed)",
    "baseDamage": [
      {
        "formula": "4d10",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "summon fiend": {
    "name": "Summon Fiend",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Summoning",
    "apc": null,
    "spc": 0,
    "range": "20 ft",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 19",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 19,
      "label": "Occult Power 19"
    },
    "tags": [
      "darkPower",
      "summoning",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Magic check vs DC 15 + ML: friendly for 2x Magic Attr hours on success, hostile on failure",
    "materials": "Iron, copper, and precious gems worth at least 15,000 sc (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "summon hellfire": {
    "name": "Summon Hellfire",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Evoking",
    "apc": null,
    "spc": 0,
    "range": "5 mi",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour",
    "prerequisite": "Occult Power 13",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 13,
      "label": "Occult Power 13"
    },
    "tags": [
      "darkPower",
      "evoking",
      "ritual"
    ],
    "isAttack": false,
    "target": "END Check",
    "upcharge": "Magic check vs DC 10 + 2x level; fail summons hostile fire elemental or ignites caster space",
    "materials": "1 gallon fresh humanoid blood, cut timber, slaughtered animal",
    "baseDamage": [
      {
        "formula": "2d8",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "talisman of mikhael": {
    "name": "Talisman of Mikhael",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 7",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 7,
      "label": "Occult Power 7"
    },
    "tags": [
      "darkPower",
      "enchanting",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Dark Power: each spell cast attacks WILL; on hit, Night Devil arrives to coerce deal",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "talisman of ralzire": {
    "name": "Talisman of Ralzire",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 4",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 4,
      "label": "Occult Power 4"
    },
    "tags": [
      "darkPower",
      "enchanting",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Dark Power: each spell cast attacks FORT; on hit, Sanguine Flame arrives to coerce deal",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "talisman of rasheen": {
    "name": "Talisman of Rasheen",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Occult Power 4",
    "prerequisiteRule": {
      "source": "occult",
      "sourceLabel": "Occult",
      "kind": "power",
      "value": 4,
      "label": "Occult Power 4"
    },
    "tags": [
      "darkPower",
      "enchanting",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Dark Power: each spell cast attacks LOG; on hit, Rasheen deals 4d10 radiant dmg and ends talisman",
    "materials": null,
    "baseDamage": [
      {
        "formula": "4d10",
        "type": "radiant"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "undo curse": {
    "name": "Undo Curse",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 Hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "darkPower",
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Magic check: roll <18 transfers possessing spirits to caster; roll <9 transfers curses/diseases",
    "materials": "Smelling salts, incense, 400 sc rubies/sapphires, 1 gallon fresh blood (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "warding pentagram": {
    "name": "Warding Pentagram",
    "magicSource": "Occult",
    "sourceKey": "occult",
    "spellType": "Ritual",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "warding",
      "ritual"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "1 gallon fresh humanoid blood, 50 sc incense and candles (consumed)",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "acid pool": {
    "name": "Acid Pool",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 6,
    "spc": 4,
    "range": "60 ft",
    "duration": "10 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "+1d4 damage per +3 SP against creatures starting turn in acid",
    "materials": null,
    "baseDamage": [
      {
        "formula": "3d4",
        "type": "corrosive"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "acid-pool-dmg",
        "label": "+1d4 Corrosive Damage",
        "spCost": 3,
        "apCost": 0,
        "repeatable": true,
        "bonusDicePerStack": "1d4",
        "damageType": "corrosive",
        "isDamageUpcharge": true
      }
    ]
  },
  "animal bond": {
    "name": "Animal Bond",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 5,
    "spc": 3,
    "range": "30 ft",
    "duration": "24 hr",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "intrinsic",
      "nature",
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+3 SP for telepathic communication and sensory linking with bonded beast",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "animal-bond-telepathy",
        "label": "Telepathic & Sensory Link",
        "spCost": 3,
        "apCost": 0,
        "repeatable": false,
        "isDamageUpcharge": false
      }
    ]
  },
  "animate plants": {
    "name": "Animate Plants",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 8,
    "spc": 18,
    "range": "30 ft",
    "duration": "10 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "conjuring",
      "altering"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "+10 ft range per +6 SP",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "blunt"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+10 ft range",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "boilblood": {
    "name": "Boilblood",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Alchemy",
    "apc": 4,
    "spc": 18,
    "range": "40 ft",
    "duration": "1 min",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "emotion",
      "alchemy"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "carnage": {
    "name": "Carnage",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 3,
    "spc": 30,
    "range": "20 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "intrinsic",
      "emotion",
      "enchanting"
    ],
    "isAttack": true,
    "target": "LOG",
    "upcharge": "End of spell requires END check vs DC 10+Magic Attr or gain Fatigue; 1d10 psychic damage",
    "materials": null,
    "baseDamage": [
      {
        "formula": "2d8",
        "type": "sharp"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "control water": {
    "name": "Control Water",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 10,
    "spc": 20,
    "range": "300 ft",
    "duration": "1 min",
    "requires": "Gesture, Verbal, Visual, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": "Conjuring 2",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "altering"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "+1 min duration per +10 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 min duration",
        "spCost": 10,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "lightning bolt": {
    "name": "Lightning Bolt",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 4,
    "spc": 20,
    "range": "100 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "weather",
      "conjuring",
      "evoking"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "6d8",
        "type": "lightning"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "summon beast": {
    "name": "Summon Beast",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 6,
    "spc": 15,
    "range": "30 ft",
    "duration": "10 min",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 2",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "conjuring",
      "summoning"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+10 min per +5 SP; permanent bond if cast daily for 1 year",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+10 min",
        "spCost": 5,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "acid stream": {
    "name": "Acid Stream",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Chant",
    "function": "Evoking",
    "apc": 2,
    "spc": 0,
    "range": "20 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "evoking",
      "chant"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": "Scales with Tier: pierce line at T2/T4, range +20 ft at T3/T6, +1d6 dmg at T5",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "corrosive"
      }
    ],
    "powerScaling": {
      "source": "primal",
      "isTier": true,
      "tiers": [
        {
          "min": 2,
          "note": "Tier 2: Pierces line"
        },
        {
          "min": 3,
          "note": "Tier 3: +20 ft range"
        },
        {
          "min": 4,
          "note": "Tier 4: Enhanced pierce line"
        },
        {
          "min": 5,
          "damageFormula": "2d6",
          "note": "Tier 5: Damage increases to 2d6 corrosive"
        },
        {
          "min": 6,
          "note": "Tier 6: +40 ft range"
        }
      ]
    },
    "upchargeOptions": []
  },
  "briar whip": {
    "name": "Briar Whip",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Chant",
    "function": "Evoking",
    "apc": 3,
    "spc": 0,
    "range": "20 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual, Line of Effect",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "E",
        "label": "Line of Effect"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "evoking",
      "chant"
    ],
    "isAttack": true,
    "target": "AR",
    "upcharge": "Scales with Tier: range +10 ft at T2, T3, T4; +1d8 dmg at T5; Grapple on crit",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "sharp"
      }
    ],
    "powerScaling": {
      "source": "primal",
      "isTier": true,
      "tiers": [
        {
          "min": 2,
          "note": "Tier 2: +10 ft range (25 ft)"
        },
        {
          "min": 3,
          "note": "Tier 3: +20 ft range (35 ft)"
        },
        {
          "min": 4,
          "note": "Tier 4: +30 ft range (45 ft)"
        },
        {
          "min": 5,
          "damageFormula": "2d8",
          "note": "Tier 5: Damage increases to 2d8 sharp; Grapple on crit"
        }
      ]
    },
    "upchargeOptions": []
  },
  "ensnaring root": {
    "name": "Ensnaring Root",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Chant",
    "function": "Altering",
    "apc": 3,
    "spc": 0,
    "range": "60 ft",
    "duration": "Special",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "altering",
      "chant"
    ],
    "isAttack": true,
    "target": "ANT",
    "upcharge": "Scales with Tier: range +30 ft at T2/T3, APC 2 at T4, Huge targets prone at T5, +1d6 dmg at T6",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "blunt"
      }
    ],
    "powerScaling": {
      "source": "primal",
      "isTier": true,
      "tiers": [
        {
          "min": 2,
          "note": "Tier 2: +30 ft range"
        },
        {
          "min": 3,
          "note": "Tier 3: +60 ft range"
        },
        {
          "min": 4,
          "apcOverride": 2,
          "note": "Tier 4: APC reduced to 2 AP"
        },
        {
          "min": 5,
          "note": "Tier 5: Huge or smaller targets fall Prone"
        },
        {
          "min": 6,
          "damageFormula": "2d6",
          "note": "Tier 6: Damage increases to 2d6 blunt"
        }
      ]
    },
    "upchargeOptions": []
  },
  "blizzard": {
    "name": "Blizzard",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "100 mi",
    "duration": "Special",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Primal Tier 5",
    "prerequisiteRule": {
      "source": "primal",
      "sourceLabel": "Primal",
      "kind": "tier",
      "value": 5,
      "label": "Primal Tier 5"
    },
    "tags": [
      "extrinsic",
      "weather",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": "END Check",
    "upcharge": "Magic check DC 20 (temp modifiers apply); 1/Rest; caster gains Fatigue",
    "materials": "1 gallon of water",
    "baseDamage": [
      {
        "formula": "1d6",
        "type": "cold"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "firestorm": {
    "name": "Firestorm",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Evoking",
    "apc": null,
    "spc": 0,
    "range": "2 mi",
    "duration": "Instant",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Primal Tier 6",
    "prerequisiteRule": {
      "source": "primal",
      "sourceLabel": "Primal",
      "kind": "tier",
      "value": 6,
      "label": "Primal Tier 6"
    },
    "tags": [
      "extrinsic",
      "weather",
      "evoking",
      "invocation"
    ],
    "isAttack": false,
    "target": "END Check",
    "upcharge": "Takes 2d8 fire damage; DC 15 magic check; spends 2 invocations; gains Fatigue",
    "materials": "Kindling, flint, steel",
    "baseDamage": [
      {
        "formula": "4d8",
        "type": "fire"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hurricane": {
    "name": "Hurricane",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Sight",
    "duration": "1 hr",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Primal Tier 5",
    "prerequisiteRule": {
      "source": "primal",
      "sourceLabel": "Primal",
      "kind": "tier",
      "value": 5,
      "label": "Primal Tier 5"
    },
    "tags": [
      "extrinsic",
      "weather",
      "alchemy",
      "invocation"
    ],
    "isAttack": true,
    "target": "FORT",
    "upcharge": "DC 20 magic check; grants Lightning Strike attack (3 AP, 60 ft, 2d8 lightning)",
    "materials": "1 gallon of water",
    "baseDamage": [
      {
        "formula": "2d8",
        "type": "lightning"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "lunar circle": {
    "name": "Lunar Circle",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Warding",
    "apc": null,
    "spc": 0,
    "range": "60 ft",
    "duration": "24 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "conjuring",
      "warding",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "100 sc worth of silver dust",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "photosynthesis": {
    "name": "Photosynthesis",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "intrinsic",
      "nature",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Leaves, blades of grass, or similar vegetation; direct exposure to sunlight",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "predict weather": {
    "name": "Predict Weather",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "Instant",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "30 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "intrinsic",
      "weather",
      "divining",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Acorns, seeds, flower blossoms, or some similar plant byproduct",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "rapid growth": {
    "name": "Rapid Growth",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "1 mi",
    "duration": "24 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "extrinsic",
      "nature",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "A handful of soil",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "reorient": {
    "name": "Reorient",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "30 ft",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "1 hour, which can be part of a Recoup",
    "prerequisite": "Primal Tier 3",
    "prerequisiteRule": {
      "source": "primal",
      "sourceLabel": "Primal",
      "kind": "tier",
      "value": 3,
      "label": "Primal Tier 3"
    },
    "tags": [
      "intrinsic",
      "emotion",
      "enchanting",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "A willing wild animal that serves as a therapy pet for the duration",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "sandstorm": {
    "name": "Sandstorm",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Sight",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Primal Tier 4",
    "prerequisiteRule": {
      "source": "primal",
      "sourceLabel": "Primal",
      "kind": "tier",
      "value": 4,
      "label": "Primal Tier 4"
    },
    "tags": [
      "extrinsic",
      "weather",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": "STR Check",
    "upcharge": "DC 18 magic check (DC 10 in desert); 1/Rest; caster gains Fatigue",
    "materials": "A handful of sand or dirt",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "tornado": {
    "name": "Tornado",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "3 mi",
    "duration": "1 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Primal Tier 5",
    "prerequisiteRule": {
      "source": "primal",
      "sourceLabel": "Primal",
      "kind": "tier",
      "value": 5,
      "label": "Primal Tier 5"
    },
    "tags": [
      "extrinsic",
      "weather",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": "STR Check",
    "upcharge": "DC 15 magic check; caster gains Fatigue (Staggered and loses control on failure)",
    "materials": "A pinch of dirt or a gallon of water",
    "baseDamage": [
      {
        "formula": "6d6",
        "type": "blunt"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "warden's navigation": {
    "name": "Warden's Navigation",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "8 hr",
    "requires": null,
    "requirementBadges": [],
    "castingTime": "10 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "intrinsic",
      "nature",
      "divining",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": "Moss, lichen, or some form of fungus or weed indigenous to the environment",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "warden's trap": {
    "name": "Warden's Trap",
    "magicSource": "Primal",
    "sourceKey": "primal",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Special",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "10 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "intrinsic",
      "nature",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": "AWR Check",
    "upcharge": null,
    "materials": "At least 5 ft of rope, vine, twine, or a similar substance that can be used to bind",
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "blur": {
    "name": "Blur",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Illusory",
    "apc": 2,
    "spc": 10,
    "range": "Self",
    "duration": "1 min",
    "requires": "Verbal",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychometabolics",
      "concentration",
      "illusory"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "create weapon": {
    "name": "Create Weapon",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 1,
    "spc": 4,
    "range": "10 ft",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metacreativity",
      "manifestation",
      "evoking"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Manifestation: Costs 0 SP for Metacreatives. Resummon for 0-3 AP without SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "distract": {
    "name": "Distract",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": "Reactive",
    "spc": 3,
    "range": "40 ft",
    "duration": "5 min",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "telepathy",
      "concentration",
      "manifestation",
      "enchanting"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Manifestation: Costs 0 SP for Telepaths. 1 AP to repeat per round",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "empathize": {
    "name": "Empathize",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Enchanting",
    "apc": 6,
    "spc": 8,
    "range": "120 ft",
    "duration": "5 min",
    "requires": "Verbal",
    "requirementBadges": [
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 1",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "telepathy",
      "concentration",
      "conjuring",
      "enchanting"
    ],
    "isAttack": true,
    "target": "WILL",
    "upcharge": "+40 ft range per +4 SP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+40 ft range",
        "spCost": 4,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "grand telekinesis": {
    "name": "Grand Telekinesis",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 30,
    "spc": 70,
    "range": "1000 ft",
    "duration": "1 min",
    "requires": "Gesture, Visual, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": "Conjuring 3",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychokinetics",
      "concentration",
      "conjuring",
      "altering"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "20d6",
        "type": "blunt"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "hasten": {
    "name": "Hasten",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 4,
    "spc": 18,
    "range": "Touch",
    "duration": "5 min",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychometabolics",
      "concentration",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "When spell ends, caster and target are Dazed for 1 round",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "lesser telekinesis": {
    "name": "Lesser Telekinesis",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 3,
    "spc": 3,
    "range": "60 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychokinetics",
      "manifestation",
      "altering"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": "Manifestation: Costs 0 SP for Psychokinetics",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d10",
        "type": "blunt"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "mind fist": {
    "name": "Mind Fist",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 2,
    "spc": 4,
    "range": "40 ft",
    "duration": "5 min",
    "requires": "Gesture, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metacreativity",
      "concentration",
      "manifestation",
      "altering"
    ],
    "isAttack": true,
    "target": "AR",
    "upcharge": "+20 ft range per +2 SP. Manifestation: Costs 0 SP for Metacreatives",
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d8",
        "type": "psychic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+20 ft range",
        "spCost": 2,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "shatterblade": {
    "name": "Shatterblade",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Evoking",
    "apc": 2,
    "spc": 12,
    "range": "30 ft",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychokinetics",
      "evoking"
    ],
    "isAttack": true,
    "target": "REF",
    "upcharge": "+1d8 sharp damage per +6 SP; Bleeding 1d4 on crit",
    "materials": null,
    "baseDamage": [
      {
        "formula": "4d8",
        "type": "sharp"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "shatterblade-dmg",
        "label": "+1d8 Sharp Damage",
        "spCost": 6,
        "apCost": 0,
        "repeatable": true,
        "bonusDicePerStack": "1d8",
        "damageType": "sharp",
        "isDamageUpcharge": true
      }
    ]
  },
  "stop time": {
    "name": "Stop TIme",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": 70,
    "range": "Self",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychokinetics",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "Spell ends immediately if you harm another creature, losing excess AP",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "summon incarnation": {
    "name": "Summon Incarnation",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Summoning",
    "apc": 20,
    "spc": 20,
    "range": "30 ft",
    "duration": "1 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "Conjuring 4",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metacreativity",
      "concentration",
      "conjuring",
      "summoning"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": "+1 ML per +3 SP, to a max of 15.",
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": [
      {
        "id": "upcharge-0",
        "label": "+1 ML",
        "spCost": 3,
        "apCost": 0,
        "repeatable": true,
        "isDamageUpcharge": false
      }
    ]
  },
  "warp time": {
    "name": "Warp Time",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Spell",
    "function": "Altering",
    "apc": 1,
    "spc": 40,
    "range": "Self",
    "duration": "Instant",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": null,
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychokinetics",
      "altering"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "adapt": {
    "name": "Adapt",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "1 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "10 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "psychometabolics",
      "altering",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "1d4",
        "type": "sharp"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "assembly": {
    "name": "Assembly",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Alchemy",
    "apc": null,
    "spc": 0,
    "range": "100 ft",
    "duration": "Instant",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "10 minutes to 1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metacreativity",
      "meditation",
      "alchemy",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "astral projection": {
    "name": "Astral Projection",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "Self",
    "duration": "8 hr",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Psionic Tier 6",
    "prerequisiteRule": {
      "source": "psionic",
      "sourceLabel": "Psionic",
      "kind": "tier",
      "value": 6,
      "label": "Psionic Tier 6"
    },
    "tags": [
      "clairsentience",
      "meditation",
      "divining",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "bend reality": {
    "name": "Bend Reality",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Sight",
    "duration": "Special",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": "Psionic Tier 5",
    "prerequisiteRule": {
      "source": "psionic",
      "sourceLabel": "Psionic",
      "kind": "tier",
      "value": 5,
      "label": "Psionic Tier 5"
    },
    "tags": [
      "psychokinetics",
      "meditation",
      "altering",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "dreamspeak": {
    "name": "Dreamspeak",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Special",
    "duration": "30 min",
    "requires": "Sleeping",
    "requirementBadges": [
      {
        "letter": "Z",
        "label": "Sleeping"
      }
    ],
    "castingTime": "30 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "telepathy",
      "enchanting",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "duplicate": {
    "name": "Duplicate",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Summoning",
    "apc": null,
    "spc": 0,
    "range": "10 ft",
    "duration": "8 hr",
    "requires": "Gesture, Verbal, Visual",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      },
      {
        "letter": "S",
        "label": "Visual"
      }
    ],
    "castingTime": "10 minutes",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "metacreativity",
      "summoning",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "essence torsion": {
    "name": "Essence Torsion",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "4 hours",
    "prerequisite": "Psionic Tier 4",
    "prerequisiteRule": {
      "source": "psionic",
      "sourceLabel": "Psionic",
      "kind": "tier",
      "value": 4,
      "label": "Psionic Tier 4"
    },
    "tags": [
      "psychometabolics",
      "enchanting",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "3d10",
        "type": "psychic"
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "haunt": {
    "name": "Haunt",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Enchanting",
    "apc": null,
    "spc": 0,
    "range": "Special",
    "duration": "Instant",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "4 hours",
    "prerequisite": "Psionic Tier 3",
    "prerequisiteRule": {
      "source": "psionic",
      "sourceLabel": "Psionic",
      "kind": "tier",
      "value": 3,
      "label": "Psionic Tier 3"
    },
    "tags": [
      "telepathy",
      "meditation",
      "enchanting",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "soulsteal": {
    "name": "Soulsteal",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Necromancy",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "Instant",
    "requires": "Gesture, Verbal",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "V",
        "label": "Verbal"
      }
    ],
    "castingTime": "10 minutes",
    "prerequisite": "Psionic Tier 2",
    "prerequisiteRule": {
      "source": "psionic",
      "sourceLabel": "Psionic",
      "kind": "tier",
      "value": 2,
      "label": "Psionic Tier 2"
    },
    "tags": [
      "psychovillainy",
      "necromancy",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [
      {
        "formula": "2d10",
        "type": "heal",
        "isHeal": true
      }
    ],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "steel trap": {
    "name": "Steel Trap",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Altering",
    "apc": null,
    "spc": 0,
    "range": "Touch",
    "duration": "4 hr",
    "requires": "Gesture",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "clairsentience",
      "altering",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  },
  "telepathic anchor": {
    "name": "Telepathic Anchor",
    "magicSource": "Psionic",
    "sourceKey": "psionic",
    "spellType": "Invocation",
    "function": "Divining",
    "apc": null,
    "spc": 0,
    "range": "30 ft",
    "duration": "Instant",
    "requires": "Gesture, Visual, Line of Sight",
    "requirementBadges": [
      {
        "letter": "G",
        "label": "Gesture"
      },
      {
        "letter": "S",
        "label": "Visual"
      },
      {
        "letter": "L",
        "label": "Line of Sight"
      }
    ],
    "castingTime": "1 hour",
    "prerequisite": null,
    "prerequisiteRule": null,
    "tags": [
      "clairsentience",
      "divining",
      "invocation"
    ],
    "isAttack": false,
    "target": null,
    "upcharge": null,
    "materials": null,
    "baseDamage": [],
    "powerScaling": null,
    "upchargeOptions": []
  }
};

// Normalized alias map for punctuation/spacing variations
const SPELL_ALIASES = {
  "encode/decode": "encode/ decode",
  "encode / decode": "encode/ decode",
  "stop time": "stop time",
  "enchant weapon: fire": "enchant weapon - fire",
  "enchant weapon (fire)": "enchant weapon - fire",
  "major illusion": "major illusion",
  "minor illusion": "minor illusion",
};

/**
 * Normalize a spell name for dictionary lookup
 * @param {string} name
 * @returns {string}
 */
export function normalizeSpellName(name) {
  if (!name || typeof name !== "string") return "";
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s*\([^)]*\)\s*$/g, "") // strip trailing parenthetical notes if any
    .replace(/\s*\[[^\]]*\]\s*$/g, "") // strip trailing bracketed tags if any
    .replace(/\s+/g, " ")
    .trim();
  return SPELL_ALIASES[clean] || clean;
}

/**
 * Retrieve a spell's canonical library entry by Item document or spell name
 * @param {Item|object|string} itemOrName
 * @returns {object|null}
 */
export function getSpellLibraryEntry(itemOrName) {
  if (!itemOrName) return null;
  const rawName = typeof itemOrName === "string"
    ? itemOrName
    : (itemOrName.name || itemOrName.itemName || "");
  if (!rawName) return null;

  const directKey = rawName.trim().toLowerCase();
  if (SPELL_LIBRARY[directKey]) return SPELL_LIBRARY[directKey];

  const normKey = normalizeSpellName(rawName);
  if (SPELL_LIBRARY[normKey]) return SPELL_LIBRARY[normKey];

  // Try stripping source prefix (e.g. "Arcane: Beam of Fire") or trailing dash note (e.g. "Beam of Fire - Cantrip")
  const stripped = normKey
    .replace(/^(arcane|divine|occult|primal|psionic)\s*:\s*/i, "")
    .replace(/\s+-\s+(cantrip|prayer|ritual|chant|invocation|spell|arcane|divine|occult|primal|psionic)$/i, "")
    .trim();
  if (stripped && SPELL_LIBRARY[stripped]) return SPELL_LIBRARY[stripped];

  // Try matching without punctuation
  const alphaKey = (stripped || normKey).replace(/[^a-z0-9]/g, "");
  for (const [k, entry] of Object.entries(SPELL_LIBRARY)) {
    if (k.replace(/[^a-z0-9]/g, "") === alphaKey) return entry;
  }

  return null;
}

/**
 * Get 1-letter requirement badges for a spell (Column I)
 * @param {Item|object|string} itemOrEntry
 * @returns {Array<{letter: string, label: string}>}
 */
export function getSpellRequirementsBadges(itemOrEntry) {
  const entry = (itemOrEntry && itemOrEntry.requirementBadges)
    ? itemOrEntry
    : getSpellLibraryEntry(itemOrEntry);
  if (entry && Array.isArray(entry.requirementBadges)) {
    return entry.requirementBadges;
  }
  return [];
}

/**
 * Get an actor's effective Power Level and Tier for a given magic source
 * @param {Actor} actor
 * @param {string} sourceKey - "arcane" | "divine" | "occult" | "primal" | "psionic"
 * @returns {{ power: number, tier: number }}
 */
export function getActorMagicPowerAndTier(actor, sourceKey) {
  if (!actor || !sourceKey) return { power: 0, tier: 0 };
  const k = String(sourceKey).toLowerCase().trim();
  const rawPower = Number(actor.system?.powerLevel?.[k] ?? 0);

  // Also check if the actor owns talents explicitly naming Tier X or Power
  let talentTier = 0;
  const items = actor.items || [];
  for (const it of items) {
    if (it.type !== "talent" && it.type !== "feature") continue;
    const nm = (it.name || "").toLowerCase();
    if (nm.includes(k)) {
      const tm = nm.match(/tier\s*(\d+)/i);
      if (tm) talentTier = Math.max(talentTier, parseInt(tm[1], 10));
    }
  }

  // Note: On the character sheet Spells tab, each magic source has a single numeric input
  // (system.powerLevel.<source>). Users may enter either their Tier directly (1-6) or their
  // total Power points (1-30). Using Math.max(rawPower, talentTier) ensures that if a user
  // enters 5 in Primal/Psionic, it satisfies Tier 5, and if they enter higher Power points it also satisfies it.
  return {
    power: rawPower,
    tier: Math.max(rawPower, talentTier),
  };
}

/**
 * Check whether an actor meets the spell's prerequisite (Column K)
 * @param {Actor} actor
 * @param {Item|object|string} itemOrEntry
 * @returns {{ met: boolean, hasPrerequisite: boolean, prerequisiteText: string|null, note: string|null, currentVal: number, requiredVal: number }}
 */
export function checkSpellPrerequisite(actor, itemOrEntry) {
  const entry = (itemOrEntry && "prerequisiteRule" in itemOrEntry)
    ? itemOrEntry
    : getSpellLibraryEntry(itemOrEntry);

  if (!entry || !entry.prerequisite || !entry.prerequisiteRule) {
    return {
      met: true,
      hasPrerequisite: false,
      prerequisiteText: null,
      note: null,
      currentVal: 0,
      requiredVal: 0,
    };
  }

  if (!actor || actor.type === "npc") {
    return {
      met: true,
      hasPrerequisite: true,
      prerequisiteText: entry.prerequisite,
      note: null,
      currentVal: entry.prerequisiteRule.value,
      requiredVal: entry.prerequisiteRule.value,
    };
  }

  const rule = entry.prerequisiteRule;
  const { power, tier } = getActorMagicPowerAndTier(actor, rule.source);
  const currentVal = rule.kind === "tier" ? tier : power;
  const met = currentVal >= rule.value;

  return {
    met,
    hasPrerequisite: true,
    prerequisiteText: entry.prerequisite,
    note: met ? null : `Actor does not meet prerequisite: ${entry.prerequisite} (Current ${rule.sourceLabel}: ${currentVal})`,
    currentVal,
    requiredVal: rule.value,
  };
}

/**
 * Evaluate active Power/Tier scaling and available Upcharge options for an actor casting a spell (Column O)
 * @param {Actor} actor
 * @param {Item|object|string} itemOrEntry
 * @param {object} [options={}]
 * @param {boolean} [options.afterBaseDeduction=false] - Whether base AP/SP have already been deducted
 * @returns {object}
 */
export function evaluateSpellScalingAndUpcharge(actor, itemOrEntry, { afterBaseDeduction = false } = {}) {
  const entry = (itemOrEntry && "upchargeOptions" in itemOrEntry)
    ? itemOrEntry
    : getSpellLibraryEntry(itemOrEntry);

  if (!entry) {
    return {
      effectiveApc: 0,
      effectiveSpc: 0,
      effectiveDamage: [],
      activeScalingNotes: [],
      manifestationZeroSp: false,
      availableUpcharges: [],
      allUpcharges: [],
      upchargeText: null,
    };
  }

  let effectiveApc = typeof entry.apc === "number" ? entry.apc : 0;
  let effectiveSpc = typeof entry.spc === "number" ? entry.spc : 0;
  let effectiveDamage = Array.isArray(entry.baseDamage)
    ? entry.baseDamage.map(d => ({ ...d }))
    : [];
  const activeScalingNotes = [];

  // 1. Evaluate Power / Tier Scaling (Cantrips, Prayers, Chants, Holy Tempering, etc.)
  if (entry.powerScaling && actor) {
    const { power, tier } = getActorMagicPowerAndTier(actor, entry.powerScaling.source || entry.sourceKey);
    const val = entry.powerScaling.isTier ? tier : power;
    for (const t of entry.powerScaling.tiers || []) {
      if (val >= t.min) {
        if (t.apcOverride !== undefined) effectiveApc = t.apcOverride;
        if (t.damageFormula && effectiveDamage.length > 0) {
          effectiveDamage[0].formula = t.damageFormula;
        }
        if (t.note) activeScalingNotes.push(t.note);
      }
    }
  }

  // 2. Evaluate Psionic Manifestation (Costs 0 SP if actor has the matching aptitude or manifestation)
  let manifestationZeroSp = false;
  if (entry.tags?.includes("manifestation") && effectiveSpc > 0 && actor) {
    const aptitudeTags = ["metacreativity", "telepathy", "psychokinetics", "clairsentience", "psychometabolics", "psychovillainy"];
    const spellAptitude = entry.tags.find(t => aptitudeTags.includes(t.toLowerCase()));
    if (spellAptitude) {
      const actorItems = actor.items || [];
      const hasAptitude = actorItems.some(i => {
        const nm = (i.name || "").toLowerCase();
        const desc = String(i.system?.description?.value || i.system?.description || "").toLowerCase();
        return nm.includes(spellAptitude) || desc.includes(spellAptitude) || nm.includes("manifestation");
      }) || Number(actor.system?.powerLevel?.psionic ?? 0) > 0;
      if (hasAptitude) {
        manifestationZeroSp = true;
        effectiveSpc = 0;
      }
    }
  }

  // 2b. Apply Active Effect Spell APC / SPC Reductions & Damage Bonuses
  if (actor) {
    const aeBonuses = getActorActiveEffectBonuses(actor);
    const { apcReduction, spcReduction, isFreeSpell } = getSpellFilteredCostModifiers(entry, aeBonuses);
    if (effectiveApc > 0 && apcReduction !== 0) {
      effectiveApc = Math.max(1, effectiveApc - apcReduction);
      activeScalingNotes.push(`Active Effect: APC ${apcReduction > 0 ? `−${apcReduction}` : `+${Math.abs(apcReduction)}`}`);
    }
    if (isFreeSpell) {
      manifestationZeroSp = true;
      effectiveSpc = 0;
      activeScalingNotes.push("Active Effect: 0 SP Cost");
    } else if (!manifestationZeroSp && effectiveSpc > 0 && spcReduction !== 0) {
      effectiveSpc = Math.max(0, effectiveSpc - spcReduction);
      activeScalingNotes.push(`Active Effect: SPC ${spcReduction > 0 ? `−${spcReduction}` : `+${Math.abs(spcReduction)}`}`);
    }
    if (effectiveDamage.length > 0 && !effectiveDamage[0].isHeal) {
      const aeSpellDmg = getCombinedDamageBonusFormula(actor, "spell");
      if (aeSpellDmg.formulaSuffix && effectiveDamage[0].formula) {
        effectiveDamage[0].formula = `${effectiveDamage[0].formula}${aeSpellDmg.formulaSuffix}`;
      }
    }
  }

  // 3. Evaluate Upcharge Options and whether the actor meets requirements
  const curSp = Number(actor?.system?.sp?.value ?? 0);
  const curAp = Number(actor?.system?.ap?.value ?? 0) + Number(actor?.system?.sap?.value ?? 0);
  const remSp = afterBaseDeduction ? curSp : Math.max(0, curSp - effectiveSpc);
  const remAp = afterBaseDeduction ? curAp : Math.max(0, curAp - effectiveApc);

  const allUpcharges = [];
  const availableUpcharges = [];

  for (const opt of entry.upchargeOptions || []) {
    let maxStacks = 1;
    let meetsRequirement = true;

    if (opt.spCost > 0) {
      const spStacks = Math.floor(remSp / opt.spCost);
      if (spStacks < 1) meetsRequirement = false;
      maxStacks = opt.repeatable ? Math.max(1, Math.min(10, spStacks)) : 1;
    }
    if (opt.apCost > 0) {
      const apStacks = Math.floor(remAp / opt.apCost);
      if (apStacks < 1) meetsRequirement = false;
      maxStacks = opt.repeatable ? Math.max(1, Math.min(10, apStacks)) : 1;
    }

    const enrichedOpt = {
      ...opt,
      meetsRequirement,
      maxStacks,
      baseFormula: effectiveDamage[0]?.formula || null,
      baseDamageType: opt.damageType || effectiveDamage[0]?.type || "damage",
      isHeal: Boolean(opt.isHeal || effectiveDamage[0]?.isHeal),
    };

    allUpcharges.push(enrichedOpt);
    if (meetsRequirement) {
      availableUpcharges.push(enrichedOpt);
    }
  }

  return {
    effectiveApc,
    effectiveSpc,
    effectiveDamage,
    activeScalingNotes,
    manifestationZeroSp,
    availableUpcharges,
    allUpcharges,
    upchargeText: entry.upcharge || null,
  };
}
