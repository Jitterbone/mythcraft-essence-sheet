/**
 * mythcraft-essence-sheet | src/data/talent-skill-grants.mjs
 *
 * Canonical mapping of skills by Category, skills by Attribute,
 * and comprehensive dictionary of all 175 MythCraft talents that grant
 * skill points to specific categories, attributes, multi-tag combinations,
 * or explicit curated skill lists.
 */

const MODULE_ID = "mythcraft-essence-sheet";

/**
 * 11 Canonical MythCraft Skill Categories and their assigned skills.
 */
export const SKILLS_BY_CATEGORY = {
  acrobatics: {
    id: "acrobatics",
    label: "Acrobatics",
    skills: ["Balancing", "Contorting", "Tumbling"],
  },
  athleticism: {
    id: "athleticism",
    label: "Athleticism",
    skills: ["Applied Force", "Athletics", "Sprinting"],
  },
  crafting: {
    id: "crafting",
    label: "Crafting",
    skills: [
      "Alchemy", "Brewing", "Calligraphy", "Carpentry", "Cartography",
      "Cobbling", "Cooking", "Glassblowing", "Jeweling", "Leatherworking",
      "Masonry", "Painting", "Pottery", "Smithing", "Weaving", "Woodcarving"
    ],
  },
  influence: {
    id: "influence",
    label: "Influence",
    skills: ["Deceiving", "Empathy", "Gossiping", "Intimidating", "Leadership", "Persuading"],
  },
  knowledge: {
    id: "knowledge",
    label: "Knowledge",
    skills: [
      "Arcana", "Art", "Astrology", "Astronomy", "Biology", "Chemistry",
      "Economics", "Engineering", "Geography", "History", "Law", "Medicine",
      "Military", "Politics", "Religion", "Vehicles [land]", "Vehicles [water]"
    ],
  },
  luck: {
    id: "luck",
    label: "Luck",
    skills: ["Fortuity", "Scavenging"],
  },
  observation: {
    id: "observation",
    label: "Observation",
    skills: ["Appraising", "Eavesdropping", "Intuiting", "Investigating", "Perceiving"],
  },
  performance: {
    id: "performance",
    label: "Performance",
    skills: ["Dancing", "Entertaining", "Instrument", "Savoir Faire"],
  },
  stamina: {
    id: "stamina",
    label: "Stamina",
    skills: ["Distance Running", "Forced March", "Menacing"],
  },
  subterfuge: {
    id: "subterfuge",
    label: "Subterfuge",
    skills: ["Disguising", "Evading", "Forging", "Lockpicking", "Sleight of Hand"],
  },
  survival: {
    id: "survival",
    label: "Survival",
    skills: ["Animal Handling", "Dungeoneering", "Foraging", "Nature", "Navigating", "Sheltering", "Sneaking", "Tracking"],
  },
};

/**
 * 7 Canonical MythCraft Attributes and their assigned skills.
 */
export const SKILLS_BY_ATTRIBUTE = {
  str: {
    id: "str",
    label: "Strength (STR)",
    skills: ["Applied Force", "Athletics", "Menacing", "Sprinting"],
  },
  dex: {
    id: "dex",
    label: "Dexterity (DEX)",
    skills: ["Balancing", "Contorting", "Dancing", "Sneaking", "Tumbling"],
  },
  end: {
    id: "end",
    label: "Endurance (END)",
    skills: ["Distance Running", "Forced March"],
  },
  awr: {
    id: "awr",
    label: "Awareness (AWR)",
    skills: ["Animal Handling", "Eavesdropping", "Foraging", "Intuiting", "Investigating", "Navigating", "Perceiving", "Sheltering", "Tracking"],
  },
  int: {
    id: "int",
    label: "Intellect (INT)",
    skills: [
      "Alchemy", "Appraising", "Arcana", "Art", "Astrology", "Astronomy",
      "Biology", "Brewing", "Calligraphy", "Carpentry", "Cartography",
      "Chemistry", "Cobbling", "Cooking", "Disguising", "Dungeoneering",
      "Economics", "Engineering", "Evading", "Forging", "Geography",
      "Glassblowing", "History", "Jeweling", "Law", "Leatherworking",
      "Lockpicking", "Masonry", "Medicine", "Military", "Nature",
      "Painting", "Politics", "Pottery", "Religion", "Sleight of Hand",
      "Smithing", "Weaving", "Woodcarving", "Vehicles [land]", "Vehicles [water]"
    ],
  },
  cha: {
    id: "cha",
    label: "Charisma (CHA)",
    skills: ["Deceiving", "Empathy", "Entertaining", "Gossiping", "Instrument", "Intimidating", "Leadership", "Persuading", "Savoir Faire"],
  },
  luck: {
    id: "luck",
    label: "Luck (LUCK)",
    skills: ["Fortuity", "Scavenging"],
  },
};

/**
 * Normalizes a skill name into a camelCase or standard slug key.
 * @param {string} rawName
 * @returns {string}
 */
export function normalizeSkillKey(rawName) {
  if (!rawName) return "";
  const clean = String(rawName).replace(/[\*\[\]]/g, "").trim().toLowerCase();
  const overrides = {
    "applied force": "appliedForce",
    "distance running": "distanceRunning",
    "forced march": "forcedMarch",
    "animal handling": "animalHandling",
    "savoir faire": "savoirFaire",
    "sleight of hand": "sleightOfHand",
    "vehicles land": "vehiclesLand",
    "vehicles water": "vehiclesWater",
    "vehicles": "vehiclesLand",
  };
  if (overrides[clean]) return overrides[clean];
  return clean.replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

/**
 * Builds a reverse lookup map of all skills to their category and attribute.
 */
export const SKILL_REGISTRY = (() => {
  const map = new Map();

  for (const [catKey, catData] of Object.entries(SKILLS_BY_CATEGORY)) {
    for (const skName of catData.skills) {
      const normKey = normalizeSkillKey(skName);
      if (!map.has(normKey)) {
        map.set(normKey, {
          name: skName,
          key: normKey,
          category: catKey,
          categoryLabel: catData.label,
          attribute: null,
          attributeLabel: "",
        });
      } else {
        const entry = map.get(normKey);
        entry.category = catKey;
        entry.categoryLabel = catData.label;
      }
    }
  }

  for (const [attrKey, attrData] of Object.entries(SKILLS_BY_ATTRIBUTE)) {
    for (const skName of attrData.skills) {
      const normKey = normalizeSkillKey(skName);
      const entry = map.get(normKey) || {
        name: skName,
        key: normKey,
        category: null,
        categoryLabel: "",
      };
      entry.attribute = attrKey;
      entry.attributeLabel = attrData.label;
      map.set(normKey, entry);
    }
  }

  return map;
})();

export const TALENT_SKILL_POINT_GRANTS = {
  "ferocious ii": { points: 4, type: "multi_attribute", targets: ["end","awr"], label: "END / AWR Skills" },
  "seeing red": { points: 2, type: "multi_attribute", targets: ["str","end"], label: "STR / END Skills" },
  "stoic": { points: 2, type: "multi_attribute", targets: ["str","end"], label: "STR / END Skills" },
  "ferocious iii": { points: 4, type: "multi_attribute", targets: ["end","awr"], label: "END / AWR Skills" },
  "ferocious iv": { points: 4, type: "multi_attribute", targets: ["end","awr"], label: "END / AWR Skills" },
  "seeing red iii": { points: 2, type: "multi_attribute", targets: ["dex","end"], label: "DEX / END Skills" },
  "stoic iii": { points: 2, type: "multi_attribute", targets: ["awr","cha"], label: "AWR / CHA Skills" },
  "ferocious v": { points: 4, type: "multi_attribute", targets: ["end","awr"], label: "END / AWR Skills" },
  "juggernaut ii": { points: 4, type: "attribute", target: "end", label: "END Skills" },
  "endure ii": { points: 4, type: "attribute", target: "end", label: "END Skills" },
  "ardent assault ii": { points: 2, type: "attribute", target: "str", label: "STR Skills" },
  "endure iii": { points: 4, type: "attribute", target: "end", label: "END Skills" },
  "death drop iii": { points: 4, type: "attribute", target: "str", label: "STR Skills" },
  "blood rage viii": { points: 4, type: "multi_attribute", targets: ["str","dex","end"], label: "STR / DEX / END Skills" },
  "soul brand iii": { points: 4, type: "attribute", target: "end", label: "END Skills" },
  "spirit sight iii": { points: 4, type: "attribute", target: "awr", label: "AWR Skills" },
  "piety": { points: 4, type: "multi_category", targets: ["influence","knowledge"], label: "Influence / Knowledge Skills" },
  "piety iii": { points: 4, type: "multi_category", targets: ["influence","knowledge"], label: "Influence / Knowledge Skills" },
  "piety v": { points: 4, type: "multi_category", targets: ["influence","knowledge"], label: "Influence / Knowledge Skills" },
  "ardent": { points: 6, type: "category", target: "knowledge", label: "Knowledge Skills" },
  "apprenticeship": { points: 4, type: "multi_category", targets: ["observation","knowledge"], label: "Observation / Knowledge Skills" },
  "iconic covenant": { points: 4, type: "multi_category", targets: ["observation","knowledge"], label: "Observation / Knowledge Skills" },
  "scrivener v": { points: 4, type: "multi_category", targets: ["observation","knowledge"], label: "Observation / Knowledge Skills" },
  "bestial awareness": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "mage entry": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: alchemy": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: altering": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: divining": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: enchanting": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: evoking": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: illusory": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: necromancy": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: summoning": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "mage: warding": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "star's guidance": { points: 2, type: "category", target: "survival", label: "Survival Skills" },
  "mentor": { points: 2, type: "all", target: "all", label: "All Skills" },
  "reactive instruction": { points: 2, type: "all", target: "all", label: "All Skills" },
  "mentor ii": { points: 2, type: "all", target: "all", label: "All Skills" },
  "guide": { points: 2, type: "all", target: "all", label: "All Skills" },
  "guide ii": { points: 2, type: "all", target: "all", label: "All Skills" },
  "guide iii": { points: 2, type: "all", target: "all", label: "All Skills" },
  "guide iv": { points: 2, type: "all", target: "all", label: "All Skills" },
  "apprentice": { points: 2, type: "all", target: "all", label: "All Skills" },
  "apprentice ii": { points: 2, type: "all", target: "all", label: "All Skills" },
  "apprentice iii": { points: 2, type: "all", target: "all", label: "All Skills" },
  "apprentice iv": { points: 2, type: "all", target: "all", label: "All Skills" },
  "superior mentor": { points: 12, type: "all", target: "all", label: "All Skills" },
  "ignore pain ii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "ignore pain iii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "martial arts ii:sense danger": { points: 4, type: "category", target: "observation", label: "Observation Skills" },
  "martial arts v:predict a punch ii": { points: 4, type: "category", target: "acrobatics", label: "Acrobatics Skills" },
  "fluid forms ii": { points: 4, type: "category", target: "acrobatics", label: "Acrobatics Skills" },
  "martial arts viii:serenity": { points: 4, type: "multi_category", targets: ["survival","knowledge","observation"], label: "Survival / Knowledge / Observation Skills" },
  "mighty punch": { points: 4, type: "category", target: "athleticism", label: "Athleticism Skills" },
  "hulking": { points: 4, type: "category", target: "athleticism", label: "Athleticism Skills" },
  "mighty punch ii": { points: 4, type: "category", target: "athleticism", label: "Athleticism Skills" },
  "dodge a punch ii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "pure technique": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "headlock choke iii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "sanctity of blood ii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "sanctity of blood iii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "sanctity of blood iv": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "ranger entry": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "bravery iv": { points: 2, type: "category", target: "observation", label: "Observation Skills" },
  "courage iii": { points: 2, type: "category", target: "stamina", label: "Stamina Skills" },
  "fight ii": { points: 4, type: "category", target: "athleticism", label: "Athleticism Skills" },
  "flight ii": { points: 4, type: "category", target: "acrobatics", label: "Acrobatics Skills" },
  "freeze ii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "courage iv": { points: 2, type: "category", target: "stamina", label: "Stamina Skills" },
  "freeze iii": { points: 4, type: "category", target: "stamina", label: "Stamina Skills" },
  "hunter ii": { points: 4, type: "multi_category", targets: ["acrobatics","survival"], label: "Acrobatics / Survival Skills" },
  "cornered quarry iii": { points: 2, type: "multi_category", targets: ["athleticism","stamina"], label: "Athleticism / Stamina Skills" },
  "fighting instinct iii": { points: 4, type: "category", target: "athleticism", label: "Athleticism Skills" },
  "survival instinct iv": { points: 4, type: "category", target: "observation", label: "Observation Skills" },
  "vigilant iii": { points: 4, type: "category", target: "survival", label: "Survival Skills" },
  "vigilant iv": { points: 4, type: "category", target: "observation", label: "Observation Skills" },
  "natural habitat": { points: 4, type: "multi_category", targets: ["survival","stamina"], label: "Survival / Stamina Skills" },
  "nature stride": { points: 4, type: "category", target: "acrobatics", label: "Acrobatics Skills" },
  "natural habitat iii": { points: 4, type: "multi_category", targets: ["acrobatics","athleticism"], label: "Acrobatics / Athleticism Skills" },
  "primeval senses iv": { points: 4, type: "category", target: "observation", label: "Observation Skills" },
  "primal warden ii": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "primal warden iv": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "chant of the wild heart": { points: 12, type: "multi_category", targets: ["athleticism","acrobatics","stamina","observation","survival"], label: "Athleticism / Acrobatics / Stamina / Observation / Survival Skills" },
  "intrinsic boon iii": { points: 4, type: "category", target: "survival", label: "Survival Skills" },
  "primal warden v": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "apprentice hunter": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "enduring hunter": { points: 4, type: "multi_category", targets: ["stamina","survival"], label: "Stamina / Survival Skills" },
  "rogue entry": { points: 6, type: "multi_category", targets: ["acrobatics","influence","observation","subterfuge"], label: "Acrobatics / Influence / Observation / Subterfuge Skills" },
  "master of disguise ii": { points: 3, type: "category", target: "influence", label: "Influence Skills" },
  "catechism of the clown": { points: 4, type: "multi_category", targets: ["acrobatics","performance","subterfuge"], label: "Acrobatics / Performance / Subterfuge Skills" },
  "impeccable mind": { points: 6, type: "all", target: "all", label: "All Skills" },
  "troubadour entry": { points: 4, type: "all", target: "all", label: "All Skills" },
  "smooth tongue": { points: 4, type: "multi_category", targets: ["performance","observation"], label: "Performance / Observation Skills" },
  "motley wardrobe": { points: 4, type: "multi_category", targets: ["performance","influence"], label: "Performance / Influence Skills" },
  "clown": { points: 4, type: "multi_category", targets: ["acrobatics","performance"], label: "Acrobatics / Performance Skills" },
  "fool": { points: 4, type: "multi_category", targets: ["observation","subterfuge"], label: "Observation / Subterfuge Skills" },
  "obfuscate": { points: 4, type: "multi_category", targets: ["subterfuge","knowledge"], label: "Subterfuge / Knowledge Skills" },
  "imitate": { points: 4, type: "multi_category", targets: ["subterfuge","influence"], label: "Subterfuge / Influence Skills" },
  "many hats": { points: 4, type: "multi_category", targets: ["performance","influence"], label: "Performance / Influence Skills" },
  "clown ii": { points: 4, type: "multi_category", targets: ["acrobatics","performance"], label: "Acrobatics / Performance Skills" },
  "fool ii": { points: 4, type: "multi_category", targets: ["observation","subterfuge"], label: "Observation / Subterfuge Skills" },
  "obfuscate ii": { points: 4, type: "multi_category", targets: ["subterfuge","knowledge"], label: "Subterfuge / Knowledge Skills" },
  "imitate ii": { points: 4, type: "multi_category", targets: ["subterfuge","influence"], label: "Subterfuge / Influence Skills" },
  "clown iii": { points: 4, type: "multi_category", targets: ["acrobatics","performance"], label: "Acrobatics / Performance Skills" },
  "fool iii": { points: 4, type: "multi_category", targets: ["observation","subterfuge"], label: "Observation / Subterfuge Skills" },
  "obfuscate iii": { points: 4, type: "multi_category", targets: ["subterfuge","knowledge"], label: "Subterfuge / Knowledge Skills" },
  "imitate iii": { points: 4, type: "multi_category", targets: ["subterfuge","influence"], label: "Subterfuge / Influence Skills" },
  "cruel jape": { points: 8, type: "multi_category", targets: ["influence","subterfuge","observation","performance"], label: "Influence / Subterfuge / Observation / Performance Skills" },
  "written tradition": { points: 4, type: "category", target: "knowledge", label: "Knowledge Skills" },
  "story for every occasion": { points: 8, type: "category", target: "knowledge", label: "Knowledge Skills" },
  "library of legends": { points: 8, type: "all", target: "all", label: "All Skills" },
  "multitalented": { points: 6, type: "all", target: "all", label: "All Skills" },
  "graft": { points: 4, type: "explicit_list", skills: ["Eavesdropping","Intuiting","Investigating","Perceiving","Tracking"], label: "Graft Eligible Skills" },
  "awakened spirit iv": { points: 2, type: "multi_category", targets: ["influence","knowledge"], label: "Influence / Knowledge Skills" },
  "uncaged": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "boon of etalun": { points: 6, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "prowess of sekh": { points: 6, type: "multi_category", targets: ["athleticism","acrobatics","stamina"], label: "Athleticism / Acrobatics / Stamina Skills" },
  "edmari’s emotional emancipation": { points: 2, type: "category", target: "influence", label: "Influence Skills" },
  "stravon conclave’s serenity": { points: 2, type: "category", target: "influence", label: "Influence Skills" },
  "unwavering": { points: 4, type: "multi_category", targets: ["athleticism","stamina"], label: "Athleticism / Stamina Skills" },
  "pious": { points: 4, type: "multi_category", targets: ["influence","knowledge"], label: "Influence / Knowledge Skills" },
  "pious iii": { points: 4, type: "multi_category", targets: ["influence","knowledge"], label: "Influence / Knowledge Skills" },
  "stalwart leader": { points: 6, type: "multi_category", targets: ["athleticism","stamina","influence","observation"], label: "Athleticism / Stamina / Influence / Observation Skills" },
  "hagiolator": { points: 4, type: "multi_category", targets: ["knowledge","observation"], label: "Knowledge / Observation Skills" },
  "speaker for the saints": { points: 4, type: "category", target: "influence", label: "Influence Skills" },
  "cunning courtier": { points: 6, type: "multi_category", targets: ["observation","influence","subterfuge"], label: "Observation / Influence / Subterfuge Skills" },
  "cunning courtier iii": { points: 4, type: "multi_category", targets: ["observation","influence","subterfuge"], label: "Observation / Influence / Subterfuge Skills" },
  "vicelike grip": { points: 4, type: "multi_category", targets: ["athleticism","survival"], label: "Athleticism / Survival Skills" },
  "crimson drink iii": { points: 4, type: "multi_category", targets: ["observation","subterfuge","survival"], label: "Observation / Subterfuge / Survival Skills" },
  "crimson drink iv": { points: 4, type: "multi_category", targets: ["observation","subterfuge","survival"], label: "Observation / Subterfuge / Survival Skills" },
  "powerful bloodline": { points: 4, type: "multi_attribute", targets: ["str","end","cha"], label: "STR / END / CHA Skills" },
  "ambush predator": { points: 2, type: "attribute", target: "dex", label: "DEX Skills" },
  "pact maker": { points: 2, type: "attribute", target: "cha", label: "CHA Skills" },
  "many mysteries to ponder": { points: 2, type: "attribute", target: "int", label: "INT Skills" },
  "curse resistant": { points: 4, type: "multi_attribute", targets: ["str","end","cha"], label: "STR / END / CHA Skills" },
  "curse resistant iii": { points: 4, type: "multi_attribute", targets: ["str","end","cha"], label: "STR / END / CHA Skills" },
  "sylvin entry": { points: 4, type: "category", target: "survival", label: "Survival Skills" },
  "natural survivor": { points: 6, type: "category", target: "survival", label: "Survival Skills" },
  "instinctive hunter": { points: 4, type: "multi_category", targets: ["observation","survival"], label: "Observation / Survival Skills" },
  "lithe hunter": { points: 4, type: "category", target: "acrobatics", label: "Acrobatics Skills" },
  "cursed": { points: 4, type: "multi_attribute", targets: ["str","end"], label: "STR / END Skills" },
  "lone wolf": { points: 4, type: "multi_category", targets: ["acrobatics","observation","survival"], label: "Acrobatics / Observation / Survival Skills" },
  "arcane knowledge": { points: 4, type: "category", target: "knowledge", label: "Knowledge Skills" },
  "theological magic": { points: 3, type: "category", target: "knowledge", label: "Knowledge Skills" },
  "force of belief": { points: 3, type: "category", target: "influence", label: "Influence Skills" },
  "primal survivalist": { points: 3, type: "category", target: "survival", label: "Survival Skills" },
  "charmer ii": { points: 3, type: "category", target: "influence", label: "Influence Skills" },
  "acrobat": { points: 6, type: "category", target: "acrobatics", label: "Acrobatics Skills" },
  "a little bit of soul": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "athlete": { points: 6, type: "category", target: "athleticism", label: "Athleticism Skills" },
  "aware": { points: 6, type: "attribute", target: "awr", label: "AWR Skills" },
  "by feel, not measure": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "charismatic": { points: 6, type: "attribute", target: "cha", label: "CHA Skills" },
  "crafter": { points: 6, type: "category", target: "crafting", label: "Crafting Skills" },
  "dextrous": { points: 6, type: "attribute", target: "dex", label: "DEX Skills" },
  "enduring": { points: 6, type: "attribute", target: "end", label: "END Skills" },
  "gentried title": { points: 6, type: "explicit_list", skills: ["Alchemy","Calligraphy","Cartography","Painting","Weaving","Woodcarving","Deceiving","Empathy","Gossiping","Intimidating","Leadership","Persuading","Arcana","Art","Astrology","Astronomy","Economics","Geography","History","Law","Medicine","Military","Politics","Religion","Appraising","Eavesdropping","Intuiting","Investigating","Perceiving","Dancing","Entertaining","Instrument","Savoir Faire"], label: "Gentried Title Eligible Skills" },
  "go-getter": { points: 6, type: "explicit_list", skills: ["Alchemy","Brewing","Calligraphy","Carpentry","Cartography","Cobbling","Cooking","Glassblowing","Jeweling","Leatherworking","Masonry","Painting","Pottery","Smithing","Weaving","Woodcarving","Deceiving","Empathy","Gossiping","Persuading","Art","Economics","History","Law","Politics","Fortuity","Appraising","Eavesdropping","Intuiting","Perceiving","Entertaining","Instrument","Savoir Faire","Forging","Sleight of Hand"], label: "Go-Getter Eligible Skills" },
  "influencer": { points: 6, type: "category", target: "influence", label: "Influence Skills" },
  "intelligence": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "knowledgeable": { points: 6, type: "category", target: "knowledge", label: "Knowledge Skills" },
  "lifelong learner": { points: 1, type: "all", target: "all", label: "All Skills" },
  "lucky": { points: 6, type: "mixed_tags", targets: ["luck","luck"], label: "LUCK Skills" },
  "observant": { points: 6, type: "category", target: "observation", label: "Observation Skills" },
  "part-time student": { points: 6, type: "explicit_list", skills: ["Alchemy","Brewing","Calligraphy","Carpentry","Cartography","Cobbling","Cooking","Glassblowing","Jeweling","Leatherworking","Masonry","Painting","Pottery","Smithing","Weaving","Woodcarving","Deceiving","Gossiping","Persuading","Arcana","Art","Astrology","Astronomy","Economics","Engineering","Geography","History","Law","Medicine","Military","Politics","Religion","Appraising","Eavesdropping","Investigating","Dancing","Entertaining","Instrument","Disguising","Forging","Animal Handling","Navigating"], label: "Part-Time Student Eligible Skills" },
  "performer": { points: 6, type: "category", target: "performance", label: "Performance Skills" },
  "petty criminal": { points: 6, type: "explicit_list", skills: ["Balancing","Contorting","Tumbling","Athletics","Sprinting","Brewing","Cooking","Jeweling","Painting","Pottery","Weaving","Woodcarving","Deceiving","Gossiping","Intimidating","Persuading","Art","Law","Politics","Fortuity","Scavenging","Appraising","Eavesdropping","Intuiting","Investigating","Perceiving","Entertaining","Savoir Faire","Disguising","Evading","Forging","Lockpicking","Sleight of Hand","Dungeoneering","Sneaking"], label: "Petty Criminal Eligible Skills" },
  "practiced warrior": { points: 6, type: "explicit_list", skills: ["Applied Force","Athletics","Sprinting","Intimidating","Leadership","Geography","History","Medicine","Military","Fortuity","Scavenging","Distance Running","Forced March","Menacing","Animal Handling","Dungeoneering","Navigating","Sheltering"], label: "Practiced Warrior Eligible Skills" },
  "practice makes perfect": { points: 6, type: "attribute", target: "int", label: "INT Skills" },
  "stamina": { points: 6, type: "category", target: "stamina", label: "Stamina Skills" },
  "strong": { points: 6, type: "attribute", target: "str", label: "STR Skills" },
  "subverter": { points: 6, type: "category", target: "subterfuge", label: "Subterfuge Skills" },
  "survivalist": { points: 6, type: "category", target: "survival", label: "Survival Skills" },
  "tentative believer": { points: 6, type: "explicit_list", skills: ["Alchemy","Brewing","Calligraphy","Cooking","Jeweling","Painting","Pottery","Weaving","Woodcarving","Deceiving","Empathy","Gossiping","Intimidating","Leadership","Persuading","Arcana","Art","Economics","Geography","History","Law","Medicine","Politics","Religion","Fortuity","Intuiting","Perceiving","Entertaining","Instrument","Savoir Faire","Forced March","Animal Handling","Navigating"], label: "Tentative Believer Eligible Skills" },
  "traveler": { points: 6, type: "explicit_list", skills: ["Balancing","Contorting","Applied Force","Athletics","Sprinting","Carpentry","Cartography","Cobbling","Cooking","Leatherworking","Weaving","Woodcarving","Astrology","Astronomy","Geography","Medicine","Intuiting","Perceiving","Instrument","Distance Running","Forced March","Animal Handling","Dungeoneering","Foraging","Nature","Navigating","Sheltering","Sneaking","Tracking"], label: "Traveler Eligible Skills" },
};

/**
 * Resolves the skill point grant definition for a talent Item or talent library entry.
 * @param {Item|object|string} talentOrItem
 * @returns {{ points: number, type: string, target?: string, targets?: string[], label: string, skills: Array<object> }|null}
 */
export function getTalentSkillPointGrant(talentOrItem) {
  if (!talentOrItem) return null;

  const rawName = typeof talentOrItem === "string"
    ? talentOrItem
    : (talentOrItem.name || "");
  const cleanName = rawName.replace(/[\*\(\)]/g, "").trim().toLowerCase();

  // 1. Direct match in canonical grants dictionary
  let grantDef = TALENT_SKILL_POINT_GRANTS[cleanName];

  // Try stripping "talent" or "talents" (e.g. "Mage Entry Talent" -> "mage entry")
  if (!grantDef) {
    const strippedTalent = cleanName.replace(/\s+(?:track\s*)?talents?$/i, "").trim();
    if (TALENT_SKILL_POINT_GRANTS[strippedTalent]) {
      grantDef = TALENT_SKILL_POINT_GRANTS[strippedTalent];
    }
  }

  // Try without numeric suffixes (e.g. "Ferocious II" -> "ferocious", "Lucky II" -> "lucky")
  if (!grantDef) {
    const baseName = cleanName.replace(/\s+(?:[ivxlcdm]+|\d+)$/i, "").trim();
    if (TALENT_SKILL_POINT_GRANTS[baseName]) {
      grantDef = { ...TALENT_SKILL_POINT_GRANTS[baseName] };
    } else {
      const strippedBase = baseName.replace(/\s+(?:track\s*)?talents?$/i, "").trim();
      if (TALENT_SKILL_POINT_GRANTS[strippedBase]) {
        grantDef = { ...TALENT_SKILL_POINT_GRANTS[strippedBase] };
      }
    }
  }

  // 2. Check talent library entry for flags or AE skillPoints changes
  let points = grantDef?.points;
  let target = grantDef?.target;
  let targets = grantDef?.targets;
  let type = grantDef?.type || "category";
  let label = grantDef?.label;

  const effects = talentOrItem.activeEffects
    || talentOrItem.effects
    || talentOrItem.system?.activeEffects
    || [];

  for (const eff of effects) {
    const changes = eff.changes || [];
    for (const ch of changes) {
      if (ch.key === "flags.mythcraft-essence-sheet.bonuses.skillPoints") {
        const val = parseInt(ch.value, 10);
        if (!Number.isNaN(val) && val > 0) {
          if (!points) points = val;
        }
      }
    }
  }

  if (!points || points <= 0) return null;

  // Infer category or attribute if not explicitly in dictionary
  if (!grantDef && !target && !targets) {
    const tags = Array.isArray(talentOrItem.tags)
      ? talentOrItem.tags.map(t => String(t).toLowerCase())
      : [];
    const stack = String(talentOrItem.stack || "").toLowerCase();

    if (tags.includes("int") || tags.includes("intellect")) {
      type = "attribute";
      target = "int";
      label = "Intellect (INT) Skills";
    } else if (tags.includes("str") || tags.includes("strength")) {
      type = "attribute";
      target = "str";
      label = "Strength (STR) Skills";
    } else if (tags.includes("dex") || tags.includes("dexterity")) {
      type = "attribute";
      target = "dex";
      label = "Dexterity (DEX) Skills";
    } else if (tags.includes("end") || tags.includes("endurance")) {
      type = "attribute";
      target = "end";
      label = "Endurance (END) Skills";
    } else if (tags.includes("awr") || tags.includes("awareness")) {
      type = "attribute";
      target = "awr";
      label = "Awareness (AWR) Skills";
    } else if (tags.includes("cha") || tags.includes("charisma")) {
      type = "attribute";
      target = "cha";
      label = "Charisma (CHA) Skills";
    } else if (tags.includes("luck")) {
      type = "category";
      target = "luck";
      label = "Luck Skills";
    } else if (tags.includes("acrobatics") || stack.includes("acrobat")) {
      type = "category";
      target = "acrobatics";
      label = "Acrobatics Skills";
    } else if (tags.includes("athletic") || stack.includes("athlete")) {
      type = "category";
      target = "athleticism";
      label = "Athleticism Skills";
    } else if (tags.includes("craft") || stack.includes("craft")) {
      type = "category";
      target = "crafting";
      label = "Crafting Skills";
    } else if (tags.includes("influence") || tags.includes("social")) {
      type = "category";
      target = "influence";
      label = "Influence Skills";
    } else if (tags.includes("knowledge")) {
      type = "category";
      target = "knowledge";
      label = "Knowledge Skills";
    } else if (tags.includes("observation")) {
      type = "category";
      target = "observation";
      label = "Observation Skills";
    } else if (tags.includes("performance")) {
      type = "category";
      target = "performance";
      label = "Performance Skills";
    } else if (tags.includes("stamina")) {
      type = "category";
      target = "stamina";
      label = "Stamina Skills";
    } else if (tags.includes("subterfuge")) {
      type = "category";
      target = "subterfuge";
      label = "Subterfuge Skills";
    } else if (tags.includes("survival")) {
      type = "category";
      target = "survival";
      label = "Survival Skills";
    } else {
      type = "all";
      target = "all";
      label = "All Skills";
    }
  }

  // 3. Resolve eligible skills list
  let eligibleSkillNames = [];
  if (Array.isArray(grantDef?.skills) && grantDef.skills.length > 0) {
    eligibleSkillNames = grantDef.skills;
  } else if (type === "category" && SKILLS_BY_CATEGORY[target]) {
    eligibleSkillNames = SKILLS_BY_CATEGORY[target].skills;
  } else if (type === "attribute" && SKILLS_BY_ATTRIBUTE[target]) {
    eligibleSkillNames = SKILLS_BY_ATTRIBUTE[target].skills;
  } else if (type === "multi_attribute" && Array.isArray(targets)) {
    for (const attr of targets) {
      if (SKILLS_BY_ATTRIBUTE[attr]) eligibleSkillNames.push(...SKILLS_BY_ATTRIBUTE[attr].skills);
    }
  } else if (type === "multi_category" && Array.isArray(targets)) {
    for (const cat of targets) {
      if (SKILLS_BY_CATEGORY[cat]) eligibleSkillNames.push(...SKILLS_BY_CATEGORY[cat].skills);
    }
  } else if (type === "mixed_tags" && Array.isArray(targets)) {
    for (const t of targets) {
      if (SKILLS_BY_ATTRIBUTE[t]) eligibleSkillNames.push(...SKILLS_BY_ATTRIBUTE[t].skills);
      if (SKILLS_BY_CATEGORY[t]) eligibleSkillNames.push(...SKILLS_BY_CATEGORY[t].skills);
    }
  } else {
    // All canonical skills
    eligibleSkillNames = Array.from(SKILL_REGISTRY.values()).map(s => s.name);
  }

  // Deduplicate eligible skill names
  eligibleSkillNames = Array.from(new Set(eligibleSkillNames));

  const skills = eligibleSkillNames.map(name => {
    const normKey = normalizeSkillKey(name);
    const reg = SKILL_REGISTRY.get(normKey);
    return {
      name,
      key: normKey,
      attribute: reg?.attribute ? reg.attribute.toUpperCase() : "INT",
      category: reg?.categoryLabel || "General",
    };
  });

  return {
    talentName: rawName,
    points,
    type,
    target,
    targets,
    label: label || `${points} Skill Points`,
    skills,
  };
}
