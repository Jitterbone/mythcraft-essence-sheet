/**
 * mythcraft-essence-sheet | src/features/compendium-parser.mjs
 *
 * Compendium Discovery, Intelligent Text Parsing, Prerequisite Validation,
 * and Talent Tree Builder for Character Creation and Level-Up Progression.
 */

import {
  CANONICAL_TALENTS,
  CANONICAL_TRACK_PARENTS,
  NORMALIZED_CANONICAL_TALENTS,
  SUBCLASS_TO_CLASS,
  DISCIPLINE_TO_MAGIC,
  SUBTRACK_TO_SPEC,
  normalizeTalentName,
  isDisallowedTalentItem,
  resolveTalentTrackInfo,
  extractTalentStructuredTags,
  parseExplicitItemTags,
} from "./talent-canonical-map.mjs";
import { resolveItemIcon } from "./equipment-icons.mjs";

export { parseExplicitItemTags };

/**
 * Recognized compendium titles and package IDs for official MythCraft content.
 */
export const OFFICIAL_PACK_NAMES = {
  lineages: ["lineages", "chapter-1-lineages", "lineage"],
  bops: ["bops", "bop", "chapter-2-bops", "backgrounds-and-professions", "backgrounds", "professions", "background", "profession"],
  classes: ["classes", "chapter-3-classes", "class-talents", "class"],
  magic: ["magic-talents", "chapter-4-magic", "magic"],
  spells: ["spells", "cantrips", "spell", "cantrip"],
  specTalents: ["spec-talents", "specialization-talents", "chapter-5-specialization-talents", "specialization", "specializations"],
  equipment: ["equipment", "chapter-6-equipment", "items", "gear", "item"],
};

function descriptionText(item) {
  const raw = String(item?.system?.description?.value ?? item?.system?.description ?? "");
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();
}

/**
 * Canonical MythCraft skill list used to validate parsed profession skill options.
 * Keys are lowercase trimmed skill names (without * markers).
 */
export const MYTHCRAFT_SKILLS = new Set([
  // STR
  "applied force", "athletics", "menacing", "sprinting",
  // DEX
  "balancing", "contorting", "dancing", "sneaking", "tumbling",
  // END
  "distance running", "forced march",
  // AWR
  "animal handling", "eavesdropping", "foraging", "intuiting", "investigating",
  "navigating", "perceiving", "sheltering", "tracking",
  // INT
  "alchemy", "appraising", "arcana", "art", "astrology", "astronomy",
  "biology", "brewing", "calligraphy", "carpentry", "cartography",
  "chemistry", "cobbling", "cooking", "disguising", "dungeoneering",
  "economics", "engineering", "evading", "forging", "geography",
  "glassblowing", "history", "jeweling", "law", "leatherworking",
  "lockpicking", "masonry", "medicine", "military", "nature", "painting",
  "politics", "pottery", "religion", "sleight of hand", "smithing",
  "weaving", "woodcarving", "vehicles", "vehicles [land]", "vehicles [water]",
  // CHA
  "deceiving", "empathy", "entertaining", "gossiping", "instrument",
  "intimidating", "leadership", "persuading", "savoir faire",
  // LUCK
  "fortuity", "scavenging",
]);

/**
 * Canonical background rules library for skill points, category structures,
 * per-skill caps (including tagged skill caps), starting wealth, and encouraged professions.
 */
export const BACKGROUND_CANON_DATA = {
  "born warrior": {
    name: "Born Warrior",
    skillPoints: 12,
    defaultPerSkillCap: 4,
    taggedCaps: {},
    encouragedProfessions: {
      tag: "militant",
      bonusSkill: "Forced March",
      bonusValue: 2,
      professions: new Set(["guard", "inquisitor", "knight", "soldier", "thug"]),
    },
    skillCategories: [
      {
        category: "Athletics",
        skills: [
          { name: "Applied Force", key: "applied force", hasStar: false },
          { name: "Athletics", key: "athletics", hasStar: false },
          { name: "Sprinting", key: "sprinting", hasStar: false },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Intimidating", key: "intimidating", hasStar: false },
          { name: "Leadership", key: "leadership", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Geography", key: "geography", hasStar: false },
          { name: "History", key: "history", hasStar: false },
          { name: "Medicine", key: "medicine", hasStar: true },
          { name: "Military", key: "military", hasStar: false },
          { name: "Vehicles [land]", key: "vehicles [land]", hasStar: true },
        ],
      },
      {
        category: "Luck",
        skills: [
          { name: "Fortuity", key: "fortuity", hasStar: false },
          { name: "Scavenging", key: "scavenging", hasStar: false },
        ],
      },
      {
        category: "Stamina",
        skills: [
          { name: "Distance Running", key: "distance running", hasStar: false },
          { name: "Forced March", key: "forced march", hasStar: false },
          { name: "Menacing", key: "menacing", hasStar: false },
        ],
      },
      {
        category: "Survival",
        skills: [
          { name: "Animal Handling", key: "animal handling", hasStar: false },
          { name: "Dungeoneering", key: "dungeoneering", hasStar: false },
          { name: "Navigating", key: "navigating", hasStar: true },
          { name: "Sheltering", key: "sheltering", hasStar: false },
        ],
      },
    ],
  },

  "criminal": {
    name: "Criminal",
    skillPoints: 12,
    defaultPerSkillCap: 3,
    taggedCaps: {
      subterfuge: 6,
    },
    encouragedProfessions: {
      tag: "underworld",
      bonusSkill: "Intuiting",
      bonusValue: 2,
      professions: new Set(["charlatan", "sailor", "thug", "thief"]),
    },
    skillCategories: [
      {
        category: "Acrobatics",
        skills: [
          { name: "Balancing", key: "balancing", hasStar: false },
          { name: "Contorting", key: "contorting", hasStar: false },
          { name: "Tumbling", key: "tumbling", hasStar: false },
        ],
      },
      {
        category: "Athleticism",
        skills: [
          { name: "Athletics", key: "athletics", hasStar: false },
          { name: "Sprinting", key: "sprinting", hasStar: false },
        ],
      },
      {
        category: "Crafting",
        skills: [
          { name: "Brewing", key: "brewing", hasStar: true },
          { name: "Cooking", key: "cooking", hasStar: true },
          { name: "Jeweling", key: "jeweling", hasStar: true },
          { name: "Painting", key: "painting", hasStar: true },
          { name: "Pottery", key: "pottery", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Deceiving", key: "deceiving", hasStar: false },
          { name: "Gossiping", key: "gossiping", hasStar: false },
          { name: "Intimidating", key: "intimidating", hasStar: false },
          { name: "Persuading", key: "persuading", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Art", key: "art", hasStar: false },
          { name: "Law", key: "law", hasStar: false },
          { name: "Politics", key: "politics", hasStar: false },
        ],
      },
      {
        category: "Luck",
        skills: [
          { name: "Fortuity", key: "fortuity", hasStar: false },
          { name: "Scavenging", key: "scavenging", hasStar: false },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Appraising", key: "appraising", hasStar: false },
          { name: "Eavesdropping", key: "eavesdropping", hasStar: false },
          { name: "Intuiting", key: "intuiting", hasStar: false },
          { name: "Investigating", key: "investigating", hasStar: false },
          { name: "Perceiving", key: "perceiving", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Entertaining", key: "entertaining", hasStar: false },
          { name: "Savoir Faire", key: "savoir faire", hasStar: false },
        ],
      },
      {
        category: "Subterfuge",
        skills: [
          { name: "Disguising", key: "disguising", hasStar: true },
          { name: "Evading", key: "evading", hasStar: false },
          { name: "Forging", key: "forging", hasStar: true },
          { name: "Lockpicking", key: "lockpicking", hasStar: true },
          { name: "Sleight of Hand", key: "sleight of hand", hasStar: false },
        ],
      },
      {
        category: "Survival",
        skills: [
          { name: "Dungeoneering", key: "dungeoneering", hasStar: false },
          { name: "Sneaking", key: "sneaking", hasStar: false },
        ],
      },
    ],
  },

  "entrepreneur": {
    name: "Entrepreneur",
    skillPoints: 12,
    defaultPerSkillCap: 3,
    taggedCaps: {
      crafting: 6,
    },
    encouragedProfessions: {
      tag: "mercantile",
      bonusSkill: "Appraising",
      bonusValue: 2,
      professions: new Set(["charlatan", "entertainer", "guard", "sailor", "trader"]),
    },
    skillCategories: [
      {
        category: "Crafting",
        skills: [
          { name: "Alchemy", key: "alchemy", hasStar: true },
          { name: "Brewing", key: "brewing", hasStar: true },
          { name: "Calligraphy", key: "calligraphy", hasStar: true },
          { name: "Carpentry", key: "carpentry", hasStar: true },
          { name: "Cartography", key: "cartography", hasStar: true },
          { name: "Cobbling", key: "cobbling", hasStar: true },
          { name: "Cooking", key: "cooking", hasStar: true },
          { name: "Glassblowing", key: "glassblowing", hasStar: true },
          { name: "Jeweling", key: "jeweling", hasStar: true },
          { name: "Leatherworking", key: "leatherworking", hasStar: true },
          { name: "Masonry", key: "masonry", hasStar: true },
          { name: "Painting", key: "painting", hasStar: true },
          { name: "Pottery", key: "pottery", hasStar: true },
          { name: "Smithing", key: "smithing", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Deceiving", key: "deceiving", hasStar: false },
          { name: "Empathy", key: "empathy", hasStar: false },
          { name: "Gossiping", key: "gossiping", hasStar: false },
          { name: "Persuading", key: "persuading", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Art", key: "art", hasStar: false },
          { name: "Economics", key: "economics", hasStar: false },
          { name: "History", key: "history", hasStar: false },
          { name: "Law", key: "law", hasStar: false },
          { name: "Politics", key: "politics", hasStar: false },
        ],
      },
      {
        category: "Luck",
        skills: [
          { name: "Fortuity", key: "fortuity", hasStar: false },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Appraising", key: "appraising", hasStar: false },
          { name: "Eavesdropping", key: "eavesdropping", hasStar: false },
          { name: "Intuiting", key: "intuiting", hasStar: false },
          { name: "Perceiving", key: "perceiving", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Entertaining", key: "entertaining", hasStar: false },
          { name: "Instrument", key: "instrument", hasStar: true },
          { name: "Savoir Faire", key: "savoir faire", hasStar: false },
        ],
      },
      {
        category: "Subterfuge",
        skills: [
          { name: "Forging", key: "forging", hasStar: true },
          { name: "Sleight of Hand", key: "sleight of hand", hasStar: false },
        ],
      },
    ],
  },

  "noble title": {
    name: "Noble Title",
    skillPoints: 12,
    defaultPerSkillCap: 4,
    taggedCaps: {},
    encouragedProfessions: {
      tag: "aristocratic",
      bonusSkill: "Gossiping",
      bonusValue: 2,
      professions: new Set(["barrister", "entertainer", "honorable", "knight", "pioneer"]),
    },
    skillCategories: [
      {
        category: "Crafting",
        skills: [
          { name: "Alchemy", key: "alchemy", hasStar: true },
          { name: "Calligraphy", key: "calligraphy", hasStar: true },
          { name: "Cartography", key: "cartography", hasStar: true },
          { name: "Painting", key: "painting", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Deceiving", key: "deceiving", hasStar: false },
          { name: "Empathy", key: "empathy", hasStar: false },
          { name: "Gossiping", key: "gossiping", hasStar: false },
          { name: "Intimidating", key: "intimidating", hasStar: false },
          { name: "Leadership", key: "leadership", hasStar: false },
          { name: "Persuading", key: "persuading", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Arcana", key: "arcana", hasStar: false },
          { name: "Art", key: "art", hasStar: false },
          { name: "Astrology", key: "astrology", hasStar: false },
          { name: "Astronomy", key: "astronomy", hasStar: false },
          { name: "Economics", key: "economics", hasStar: false },
          { name: "Geography", key: "geography", hasStar: false },
          { name: "History", key: "history", hasStar: false },
          { name: "Law", key: "law", hasStar: false },
          { name: "Medicine", key: "medicine", hasStar: true },
          { name: "Military", key: "military", hasStar: false },
          { name: "Politics", key: "politics", hasStar: false },
          { name: "Religion", key: "religion", hasStar: false },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Appraising", key: "appraising", hasStar: false },
          { name: "Eavesdropping", key: "eavesdropping", hasStar: false },
          { name: "Intuiting", key: "intuiting", hasStar: false },
          { name: "Investigating", key: "investigating", hasStar: false },
          { name: "Perceiving", key: "perceiving", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Dancing", key: "dancing", hasStar: false },
          { name: "Entertaining", key: "entertaining", hasStar: false },
          { name: "Instrument", key: "instrument", hasStar: true },
          { name: "Savoir Faire", key: "savoir faire", hasStar: false },
        ],
      },
    ],
  },

  "noble": {
    name: "Noble",
    skillPoints: 12,
    defaultPerSkillCap: 4,
    taggedCaps: {},
    encouragedProfessions: {
      tag: "aristocratic",
      bonusSkill: "Gossiping",
      bonusValue: 2,
      professions: new Set(["barrister", "entertainer", "honorable", "knight", "pioneer"]),
    },
    skillCategories: [
      {
        category: "Crafting",
        skills: [
          { name: "Alchemy", key: "alchemy", hasStar: true },
          { name: "Calligraphy", key: "calligraphy", hasStar: true },
          { name: "Cartography", key: "cartography", hasStar: true },
          { name: "Painting", key: "painting", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Deceiving", key: "deceiving", hasStar: false },
          { name: "Empathy", key: "empathy", hasStar: false },
          { name: "Gossiping", key: "gossiping", hasStar: false },
          { name: "Intimidating", key: "intimidating", hasStar: false },
          { name: "Leadership", key: "leadership", hasStar: false },
          { name: "Persuading", key: "persuading", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Arcana", key: "arcana", hasStar: false },
          { name: "Art", key: "art", hasStar: false },
          { name: "Astrology", key: "astrology", hasStar: false },
          { name: "Astronomy", key: "astronomy", hasStar: false },
          { name: "Economics", key: "economics", hasStar: false },
          { name: "Geography", key: "geography", hasStar: false },
          { name: "History", key: "history", hasStar: false },
          { name: "Law", key: "law", hasStar: false },
          { name: "Medicine", key: "medicine", hasStar: true },
          { name: "Military", key: "military", hasStar: false },
          { name: "Politics", key: "politics", hasStar: false },
          { name: "Religion", key: "religion", hasStar: false },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Appraising", key: "appraising", hasStar: false },
          { name: "Eavesdropping", key: "eavesdropping", hasStar: false },
          { name: "Intuiting", key: "intuiting", hasStar: false },
          { name: "Investigating", key: "investigating", hasStar: false },
          { name: "Perceiving", key: "perceiving", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Dancing", key: "dancing", hasStar: false },
          { name: "Entertaining", key: "entertaining", hasStar: false },
          { name: "Instrument", key: "instrument", hasStar: true },
          { name: "Savoir Faire", key: "savoir faire", hasStar: false },
        ],
      },
    ],
  },

  "outlander": {
    name: "Outlander",
    skillPoints: 12,
    defaultPerSkillCap: 3,
    taggedCaps: {
      survival: 6,
    },
    encouragedProfessions: {
      tag: "wanderer",
      bonusSkill: "Navigating",
      bonusValue: 2,
      professions: new Set(["nomad", "pioneer", "sailor"]),
    },
    skillCategories: [
      {
        category: "Acrobatics",
        skills: [
          { name: "Balancing", key: "balancing", hasStar: false },
          { name: "Contorting", key: "contorting", hasStar: false },
        ],
      },
      {
        category: "Athleticism",
        skills: [
          { name: "Applied Force", key: "applied force", hasStar: false },
          { name: "Athletics", key: "athletics", hasStar: false },
          { name: "Sprinting", key: "sprinting", hasStar: false },
        ],
      },
      {
        category: "Crafting",
        skills: [
          { name: "Carpentry", key: "carpentry", hasStar: true },
          { name: "Cartography", key: "cartography", hasStar: true },
          { name: "Cobbling", key: "cobbling", hasStar: true },
          { name: "Cooking", key: "cooking", hasStar: true },
          { name: "Leatherworking", key: "leatherworking", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Astrology", key: "astrology", hasStar: false },
          { name: "Astronomy", key: "astronomy", hasStar: false },
          { name: "Geography", key: "geography", hasStar: false },
          { name: "Medicine", key: "medicine", hasStar: true },
          { name: "Vehicles [land]", key: "vehicles [land]", hasStar: true },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Intuiting", key: "intuiting", hasStar: false },
          { name: "Perceiving", key: "perceiving", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Instrument", key: "instrument", hasStar: true },
        ],
      },
      {
        category: "Stamina",
        skills: [
          { name: "Distance Running", key: "distance running", hasStar: false },
          { name: "Forced March", key: "forced march", hasStar: false },
        ],
      },
      {
        category: "Survival",
        skills: [
          { name: "Animal Handling", key: "animal handling", hasStar: false },
          { name: "Dungeoneering", key: "dungeoneering", hasStar: false },
          { name: "Foraging", key: "foraging", hasStar: false },
          { name: "Nature", key: "nature", hasStar: false },
          { name: "Navigating", key: "navigating", hasStar: true },
          { name: "Sheltering", key: "sheltering", hasStar: false },
          { name: "Sneaking", key: "sneaking", hasStar: false },
          { name: "Tracking", key: "tracking", hasStar: false },
        ],
      },
    ],
  },

  "student": {
    name: "Student",
    skillPoints: 12,
    defaultPerSkillCap: 3,
    taggedCaps: {
      knowledge: 6,
    },
    encouragedProfessions: {
      tag: "academic",
      bonusSkill: "History",
      bonusValue: 2,
      professions: new Set(["archivist", "barrister", "clergy", "physician"]),
    },
    skillCategories: [
      {
        category: "Crafting",
        skills: [
          { name: "Alchemy", key: "alchemy", hasStar: true },
          { name: "Brewing", key: "brewing", hasStar: true },
          { name: "Calligraphy", key: "calligraphy", hasStar: true },
          { name: "Carpentry", key: "carpentry", hasStar: true },
          { name: "Cartography", key: "cartography", hasStar: true },
          { name: "Cobbling", key: "cobbling", hasStar: true },
          { name: "Cooking", key: "cooking", hasStar: true },
          { name: "Glassblowing", key: "glassblowing", hasStar: true },
          { name: "Jeweling", key: "jeweling", hasStar: true },
          { name: "Leatherworking", key: "leatherworking", hasStar: true },
          { name: "Masonry", key: "masonry", hasStar: true },
          { name: "Painting", key: "painting", hasStar: true },
          { name: "Pottery", key: "pottery", hasStar: true },
          { name: "Smithing", key: "smithing", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Deceiving", key: "deceiving", hasStar: false },
          { name: "Gossiping", key: "gossiping", hasStar: false },
          { name: "Persuading", key: "persuading", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Arcana", key: "arcana", hasStar: false },
          { name: "Art", key: "art", hasStar: false },
          { name: "Astrology", key: "astrology", hasStar: false },
          { name: "Astronomy", key: "astronomy", hasStar: false },
          { name: "Economics", key: "economics", hasStar: false },
          { name: "Engineering", key: "engineering", hasStar: false },
          { name: "Geography", key: "geography", hasStar: false },
          { name: "History", key: "history", hasStar: false },
          { name: "Law", key: "law", hasStar: false },
          { name: "Medicine", key: "medicine", hasStar: true },
          { name: "Military", key: "military", hasStar: false },
          { name: "Politics", key: "politics", hasStar: false },
          { name: "Religion", key: "religion", hasStar: false },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Appraising", key: "appraising", hasStar: false },
          { name: "Eavesdropping", key: "eavesdropping", hasStar: false },
          { name: "Investigating", key: "investigating", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Dancing", key: "dancing", hasStar: false },
          { name: "Entertaining", key: "entertaining", hasStar: false },
          { name: "Instrument", key: "instrument", hasStar: true },
        ],
      },
      {
        category: "Subterfuge",
        skills: [
          { name: "Disguising", key: "disguising", hasStar: true },
          { name: "Forging", key: "forging", hasStar: true },
        ],
      },
      {
        category: "Survival",
        skills: [
          { name: "Animal Handling", key: "animal handling", hasStar: false },
          { name: "Navigating", key: "navigating", hasStar: true },
        ],
      },
    ],
  },

  "true believer": {
    name: "True Believer",
    skillPoints: 12,
    defaultPerSkillCap: 4,
    taggedCaps: {},
    encouragedProfessions: {
      tag: "religious",
      bonusSkill: "Religion",
      bonusValue: 2,
      professions: new Set(["clergy", "inquisitor", "physician"]),
    },
    skillCategories: [
      {
        category: "Crafting",
        skills: [
          { name: "Alchemy", key: "alchemy", hasStar: true },
          { name: "Brewing", key: "brewing", hasStar: true },
          { name: "Calligraphy", key: "calligraphy", hasStar: true },
          { name: "Cooking", key: "cooking", hasStar: true },
          { name: "Jeweling", key: "jeweling", hasStar: true },
          { name: "Painting", key: "painting", hasStar: true },
          { name: "Pottery", key: "pottery", hasStar: true },
          { name: "Weaving", key: "weaving", hasStar: true },
          { name: "Woodcarving", key: "woodcarving", hasStar: true },
        ],
      },
      {
        category: "Influence",
        skills: [
          { name: "Deceiving", key: "deceiving", hasStar: false },
          { name: "Empathy", key: "empathy", hasStar: false },
          { name: "Gossiping", key: "gossiping", hasStar: false },
          { name: "Intimidating", key: "intimidating", hasStar: false },
          { name: "Leadership", key: "leadership", hasStar: false },
          { name: "Persuading", key: "persuading", hasStar: false },
        ],
      },
      {
        category: "Knowledge",
        skills: [
          { name: "Arcana", key: "arcana", hasStar: false },
          { name: "Art", key: "art", hasStar: false },
          { name: "Economics", key: "economics", hasStar: false },
          { name: "Geography", key: "geography", hasStar: false },
          { name: "History", key: "history", hasStar: false },
          { name: "Law", key: "law", hasStar: false },
          { name: "Medicine", key: "medicine", hasStar: true },
          { name: "Politics", key: "politics", hasStar: false },
          { name: "Religion", key: "religion", hasStar: false },
        ],
      },
      {
        category: "Luck",
        skills: [
          { name: "Fortuity", key: "fortuity", hasStar: false },
        ],
      },
      {
        category: "Observation",
        skills: [
          { name: "Intuiting", key: "intuiting", hasStar: false },
          { name: "Perceiving", key: "perceiving", hasStar: false },
        ],
      },
      {
        category: "Performance",
        skills: [
          { name: "Entertaining", key: "entertaining", hasStar: false },
          { name: "Instrument", key: "instrument", hasStar: true },
          { name: "Savoir Faire", key: "savoir faire", hasStar: false },
        ],
      },
      {
        category: "Stamina",
        skills: [
          { name: "Forced March", key: "forced march", hasStar: false },
        ],
      },
      {
        category: "Survival",
        skills: [
          { name: "Animal Handling", key: "animal handling", hasStar: false },
          { name: "Navigating", key: "navigating", hasStar: true },
        ],
      },
    ],
  },

  "knave": {
    name: "Knave",
    skillPoints: 0,
    defaultPerSkillCap: 0,
    taggedCaps: {},
    fixedSkills: [
      { name: "Savoir Faire", key: "savoir faire", value: 4 },
    ],
    encouragedProfessions: null,
    dualProfession: true,
    skillCategories: [],
  },
};

/**
 * Backward compatibility alias for BACKGROUND_ENCOURAGED_PROFESSIONS.
 */
export const BACKGROUND_ENCOURAGED_PROFESSIONS = Object.fromEntries(
  Object.entries(BACKGROUND_CANON_DATA)
    .filter(([k, v]) => v.encouragedProfessions)
    .map(([k, v]) => [k, v.encouragedProfessions])
);

/**
 * Returns the individual per-skill cap for a skill under the character's background,
 * accounting for background category caps (e.g. +6 Subterfuge for Criminals, +6 Crafting for Entrepreneurs).
 * @param {object} parsedBackground
 * @param {string} skillName
 * @param {string} [categoryName=""]
 * @returns {number}
 */
export function getBackgroundSkillCap(parsedBackground, skillName, categoryName = "") {
  if (!parsedBackground) return 4;
  const sNorm = (skillName || "").toLowerCase().trim();
  const cNorm = (categoryName || "").toLowerCase().trim();

  if (parsedBackground.taggedCaps) {
    for (const [tag, cap] of Object.entries(parsedBackground.taggedCaps)) {
      const t = tag.toLowerCase().trim();
      if (cNorm === t) return cap;
      if (MYTHCRAFT_SKILL_CATEGORIES[t]?.includes(sNorm)) return cap;
    }
  }

  return parsedBackground.defaultPerSkillCap ?? parsedBackground.perSkillCap ?? 4;
}

/**
 * Discovers and groups all available MythCraft compendiums.
 * @returns {Record<string, Array<CompendiumCollection>>}
 */
export function getAvailableCompendiums() {
  const grouped = {
    lineages: [],
    bops: [],
    classes: [],
    magic: [],
    specTalents: [],
    equipment: [],
    all: [],
  };

  if (!globalThis.game?.packs) return grouped;

  // Custom compendiums configured by user in settings
  const customConfig = globalThis.game?.settings?.get("mythcraft-essence-sheet", "customTalentCompendiums") || [];
  const customPackMap = new Map();
  for (const entry of customConfig) {
    if (entry.pack) {
      const clean = entry.pack.toLowerCase().trim();
      customPackMap.set(clean, entry);
      if (clean.includes(".")) {
        customPackMap.set(clean.split(".").pop(), entry);
      }
    }
  }

  for (const pack of game.packs.values()) {
    if (pack.documentName !== "Item") continue;

    const collectionId = (pack.collection || "").toLowerCase();
    const metadataId = (pack.metadata?.id || "").toLowerCase();
    const packTitle = (pack.metadata?.label || pack.title || "").toLowerCase();

    grouped.all.push(pack);

    // 1. Check custom configured compendiums
    const customEntry = customPackMap.get(collectionId) || 
                        customPackMap.get(metadataId) || 
                        customPackMap.get(packTitle) ||
                        Array.from(customPackMap.entries()).find(([k]) => collectionId.includes(k) || k.includes(collectionId) || packTitle.includes(k))?.[1];

    if (customEntry) {
      pack._customCategory = customEntry.category || "class";
      pack._customParent = customEntry.parentName || "";
      pack._customTrack = customEntry.trackName || "";

      if (customEntry.category === "class" || customEntry.category === "subclass") {
        if (!grouped.classes.includes(pack)) grouped.classes.push(pack);
      } else if (customEntry.category === "magic") {
        if (!grouped.magic.includes(pack)) grouped.magic.push(pack);
      } else if (customEntry.category === "specialization") {
        if (!grouped.specTalents.includes(pack)) grouped.specTalents.push(pack);
      } else if (customEntry.category === "lineage" || customEntry.category === "sublineage" || customEntry.category === "lineage-starting" || customEntry.category === "lineage-all") {
        if (!grouped.lineages.includes(pack)) grouped.lineages.push(pack);
      } else if (customEntry.category === "bops" || customEntry.category === "background" || customEntry.category === "profession") {
        if (!grouped.bops.includes(pack)) grouped.bops.push(pack);
      } else if (customEntry.category === "equipment") {
        if (!grouped.equipment.includes(pack)) grouped.equipment.push(pack);
      }
      continue;
    }

    // 2. Check official compendium naming rules
    if (OFFICIAL_PACK_NAMES.lineages.some(k => collectionId.includes(k) || packTitle.includes(k))) {
      if (!grouped.lineages.includes(pack)) grouped.lineages.push(pack);
    } else if (OFFICIAL_PACK_NAMES.bops.some(k => collectionId.includes(k) || packTitle.includes(k))) {
      if (!grouped.bops.includes(pack)) grouped.bops.push(pack);
    } else if (OFFICIAL_PACK_NAMES.classes.some(k => collectionId.includes(k) || packTitle.includes(k))) {
      if (!grouped.classes.includes(pack)) grouped.classes.push(pack);
    } else if (OFFICIAL_PACK_NAMES.magic.some(k => collectionId.includes(k) || packTitle.includes(k))) {
      if (!grouped.magic.includes(pack)) grouped.magic.push(pack);
    } else if (OFFICIAL_PACK_NAMES.specTalents.some(k => collectionId.includes(k) || packTitle.includes(k))) {
      if (!grouped.specTalents.includes(pack)) grouped.specTalents.push(pack);
    } else if (OFFICIAL_PACK_NAMES.equipment.some(k => collectionId.includes(k) || packTitle.includes(k))) {
      if (!grouped.equipment.includes(pack)) grouped.equipment.push(pack);
    }
  }

  return grouped;
}

/**
 * Returns the hierarchical folder name chain for a compendium document.
 * @param {Item} doc
 * @param {CompendiumCollection} [pack=null]
 * @returns {Array<string>}
 */
export function getDocumentFolderChain(doc, pack = null) {
  if (doc?._folderChain && Array.isArray(doc._folderChain) && doc._folderChain.length > 0) {
    return doc._folderChain;
  }
  const chain = [];
  if (!doc) return chain;

  // 1. If doc.folder is a Folder document with getParentFolders() (standard Foundry Document)
  if (doc.folder && typeof doc.folder === "object") {
    if (typeof doc.folder.getParentFolders === "function") {
      try {
        const parents = doc.folder.getParentFolders();
        const fullChain = [...parents.reverse(), doc.folder]
          .map(f => String(f?.name || "").trim())
          .filter(Boolean);
        if (fullChain.length > 0) return fullChain;
      } catch (e) {
        // Fall through to manual traversal
      }
    }
    // Object-based hierarchy traversal
    let cur = doc.folder;
    const visitedObjs = new Set();
    while (cur && typeof cur === "object" && !visitedObjs.has(cur.id || cur._id || cur)) {
      visitedObjs.add(cur.id || cur._id || cur);
      if (cur.name) chain.unshift(String(cur.name).trim());
      cur = cur.folder && typeof cur.folder === "object" ? cur.folder : null;
    }
    if (chain.length > 0) return chain;
  }

  // 2. Collection-based traversal using folder ID
  const targetPack = pack || doc._compendiumPack || (doc.pack && globalThis.game?.packs?.get(doc.pack));
  const folderCollection = targetPack?.folders || globalThis.game?.folders;

  let folderId = typeof doc.folder === "string" 
    ? doc.folder 
    : (doc.folder?.id || doc.folder?._id || doc._source?.folder);

  const visited = new Set();
  while (folderId && !visited.has(folderId)) {
    visited.add(folderId);
    const f = folderCollection?.get?.(folderId) || (globalThis.game?.folders?.get?.(folderId));
    if (!f) break;
    if (f.name) chain.unshift(String(f.name).trim());
    folderId = typeof f.folder === "string" 
      ? f.folder 
      : (f.folder?.id || f.folder?._id || f.parent?.id || f._source?.folder);
  }

  return chain;
}

/**
 * Safely loads all documents from an array of compendiums with attached folder chains.
 * @param {Array<CompendiumCollection>} packs
 * @param {object} [filter={}]
 * @returns {Promise<Array<Item>>}
 */
export async function loadPacksDocuments(packs, filter = {}) {
  const documents = [];
  if (!Array.isArray(packs)) return documents;

  // Deduplicate packs
  const seenPackKeys = new Set();
  const uniquePacks = [];
  for (const pack of packs) {
    if (!pack) continue;
    const pKey = (pack.collection || pack.metadata?.id || pack.title || String(pack)).toLowerCase();
    if (!seenPackKeys.has(pKey)) {
      seenPackKeys.add(pKey);
      uniquePacks.push(pack);
    }
  }

  const seenDocIds = new Set();
  const seenDocNames = new Set();

  for (const pack of uniquePacks) {
    try {
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        if (filter.type && doc.type !== filter.type) continue;
        const docId = doc.id || doc._id;
        const normName = normalizeTalentName(doc.name);
        if (docId && seenDocIds.has(docId)) continue;
        if (filter.type === "talent" && normName && seenDocNames.has(normName)) continue;
        if (docId) seenDocIds.add(docId);
        if (normName) seenDocNames.add(normName);

        doc._folderChain = getDocumentFolderChain(doc, pack);
        doc._compendiumPack = pack;
        doc._customCategory = pack._customCategory || null;
        doc._customParent = pack._customParent || null;
        doc._customTrack = pack._customTrack || null;
        if (doc.type === "talent") {
          const structured = extractTalentStructuredTags(doc);
          if (structured.directTags.length > 0) {
            doc._synthesizedTags = structured.directTags;
          }
        }
        documents.push(doc);
      }
    } catch (e) {
      console.warn(`mythcraft-essence-sheet | Error loading pack ${pack.collection}:`, e);
    }
  }
  return documents;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Text Parsing: Lineages, Attributes, Prerequisites & Bonuses
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Parses bonus attribute points given by lineage features or talents.
 * (e.g. "Gain +1 Attribute Point", "gain +2 attribute points")
 * @param {string|Item} itemOrText
 * @returns {number}
 */
export function parseAttributeBonusPoints(itemOrText) {
  const text = typeof itemOrText === "string" 
    ? itemOrText 
    : String(itemOrText?.system?.description?.value ?? itemOrText?.system?.description ?? "");

  const match = text.match(/gain\s*\+?(\d+)\s*(?:additional\s*)?attribute\s*points?/i);
  return match ? parseInt(match[1], 10) : 0;
}

export const MYTHCRAFT_SKILL_CATEGORIES = {
  acrobatics: ["balancing", "contorting", "tumbling"],
  athleticism: ["applied force", "athletics", "sprinting"],
  crafting: [
    "alchemy", "brewing", "calligraphy", "carpentry", "cartography",
    "cobbling", "cooking", "glassblowing", "jeweling", "leatherworking",
    "masonry", "painting", "pottery", "smithing", "weaving", "woodcarving"
  ],
  influence: ["deceiving", "empathy", "gossiping", "intimidating", "leadership", "persuading"],
  knowledge: [
    "arcana", "art", "astrology", "astronomy", "biology", "chemistry",
    "economics", "engineering", "geography", "history", "law", "medicine",
    "military", "politics", "religion", "vehicles [land]", "vehicles [water]", "vehicles"
  ],
  luck: ["fortuity", "scavenging"],
  observation: ["appraising", "eavesdropping", "intuiting", "investigating", "perceiving"],
  performance: ["dancing", "entertaining", "instrument", "savoir faire"],
  stamina: ["distance running", "forced march", "menacing"],
  subterfuge: ["disguising", "evading", "forging", "lockpicking", "sleight of hand"],
  survival: [
    "animal handling", "dungeoneering", "foraging", "nature", "navigating",
    "sheltering", "sneaking", "tracking"
  ]
};

/**
 * Parses bonus skill points, matching tag, and individual per-skill cap increase from a feature.
 * @param {string|Item} itemOrText
 * @returns {{ points: number, tag: string, perSkillCap: number|null }}
 */
export function parseFeatureSkillData(itemOrText) {
  const text = typeof itemOrText === "string"
    ? itemOrText
    : String(itemOrText?.system?.description?.value ?? itemOrText?.system?.description ?? "");

  let points = 0;
  let tag = "";
  let perSkillCap = null;

  const ptMatch = text.match(/gain\s*\+?(\d+)\s*(?:additional\s*)?skill\s*points?(?:\s*(?:to\s*spend\s*on|in|that\s*you\s*can\s*spend\s*on)\s*(?:any\s*skills?\s*(?:with\s*the\s*)?)?([a-zA-Z\s]+?)(?:\s*tag|\s*skills|\.|\n|$))?/i);
  if (ptMatch) {
    points = parseInt(ptMatch[1], 10);
    if (ptMatch[2]) {
      tag = ptMatch[2].trim().toLowerCase().replace(/^(skills?\s*with\s*the|with\s*the)\s*/i, "").trim();
    }
  }

  const capMatch = text.match(/put\s*up\s*to\s*\+?(\d+)\s*points?\s*into\s*any\s*individual\s*skill/i);
  if (capMatch) {
    perSkillCap = parseInt(capMatch[1], 10);
  }

  return { points, tag, perSkillCap };
}

/**
 * Parses bonus skill points granted by lineage features or talents.
 * (e.g. "Gain +4 Skill Points", "gain +2 additional skill points")
 * @param {string|Item} itemOrText
 * @returns {number}
 */
export function parseFeatureSkillPointBonus(itemOrText) {
  return parseFeatureSkillData(itemOrText).points;
}

/**
 * Parses all sources of bonus attribute points from a lineage and its starting/chosen features.
 * @param {Item} [lineage]
 * @param {Array<Item>} [startingFeatures=[]]
 * @param {Item} [uniqueFeature=null]
 * @returns {{ total: number, sources: Array<{ name: string, points: number }> }}
 */
export function parseLineageAttributeBonusSources(lineage = null, startingFeatures = [], uniqueFeature = null) {
  const sources = [];
  let total = 0;

  if (lineage) {
    const pts = parseAttributeBonusPoints(lineage);
    if (pts > 0) {
      sources.push({ name: lineage.name, points: pts });
      total += pts;
    }
  }

  for (const feature of startingFeatures) {
    if (!feature) continue;
    const pts = parseAttributeBonusPoints(feature);
    if (pts > 0) {
      sources.push({ name: feature.name, points: pts });
      total += pts;
    }
  }

  if (uniqueFeature) {
    const pts = parseAttributeBonusPoints(uniqueFeature);
    if (pts > 0) {
      sources.push({ name: uniqueFeature.name, points: pts });
      total += pts;
    }
  }

  return { total, sources };
}

/**
 * Parses the milestone feature progression note from a lineage description.
 * @param {Item} lineage
 * @returns {string}
 */
export function parseLineageMilestones(lineage) {
  if (!lineage) return "";
  const desc = descriptionText(lineage);
  const match = desc.match(/(In addition to the unique feature you selected at level 1,[\s\S]*?Choose from All[^\.\n\r]*Features\.)/i);
  if (match) return match[1].trim();

  const lineageName = lineage.name?.replace(/ lineage$/i, "") || "Lineage";
  return `In addition to the unique feature you selected at level 1, you gain more features at 5th, 10th, 15th, 20th, 25th, and 29th levels. Choose from All ${lineageName} Features.`;
}

/**
 * Parses maximum attribute value permitted for a character level.
 * Rule: At level 1 and 2, attributes cannot exceed +2. At levels 3 and 4, +3.
 * Formula: floor(level / 2) + 1 (with minimum of 2).
 * @param {number} level
 * @returns {number}
 */
export function getAttributeLevelCap(level = 1) {
  const lvl = Math.max(1, parseInt(level, 10) || 1);
  return Math.ceil(lvl / 2) + 1;
}

/**
 * Calculates attribute points cost and validation.
 * Starting pool: 5 points.
 * Rule: Taking negative attributes (e.g. -1) grants +1 point back to pool.
 * @param {Record<string, number>} attributes - Current assigned values
 * @param {number} [bonusPoints=0] - Additional points gained from talents/lineages
 * @param {number} [basePool=5] - Base starting points
 * @returns {{ remaining: number, spent: number, totalPool: number, isValid: boolean }}
 */
export function calculateAttributePool(attributes = {}, bonusPoints = 0, basePool = 5) {
  const totalPool = basePool + (Number(bonusPoints) || 0);
  let spent = 0;

  for (const [key, val] of Object.entries(attributes)) {
    const num = Number(val) || 0;
    spent += num; // Positive values cost points, negative values return points
  }

  const remaining = totalPool - spent;
  return {
    remaining,
    spent,
    totalPool,
    isValid: remaining >= 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Text Parsing: Backgrounds, Skill Points & Wealth
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Parses background items for Skill Points, caps, eligible skills, starting wealth, and encouraged profession tags.
 * @param {Item} item
 * @returns {{ skillPoints: number, perSkillCap: number, eligibleSkills: Array<string>, skillCategories: Array<{ category: string, skills: Array<{ name: string, key: string, hasStar: boolean }> }>, startingWealth: { formula: string, average: number }, encouragedProfessions: { tag: string, bonusSkill: string, bonusValue: number, rawProfessionUuids: Array<string> } }}
 */
export function parseBackgroundData(item) {
  const desc = descriptionText(item);
  const rawDesc = String(item?.system?.description?.value ?? item?.system?.description ?? "");
  const clean = desc;

  // 1. Check static library canonical background data first
  const bgNameKey = String(item?.name || "").toLowerCase().replace(/ background$/i, "").trim();
  const canon = BACKGROUND_CANON_DATA[bgNameKey] || (bgNameKey === "noble" ? BACKGROUND_CANON_DATA["noble title"] : null);

  let skillPoints = canon ? (canon.skillPoints ?? 12) : 12;
  let perSkillCap = canon ? (canon.defaultPerSkillCap ?? 4) : 4;
  let taggedCaps = canon ? (canon.taggedCaps || {}) : {};
  let eligibleSkills = canon ? (canon.skillCategories ? canon.skillCategories.flatMap(c => c.skills.map(s => s.name.toLowerCase())) : []) : [];
  let skillCategories = canon ? (canon.skillCategories ? canon.skillCategories.map(c => ({ category: c.category, skills: c.skills.map(s => ({ ...s })) })) : []) : [];
  let fixedSkills = canon?.fixedSkills ? [...canon.fixedSkills] : [];

  let encouragedTag = canon?.encouragedProfessions ? canon.encouragedProfessions.tag : "";
  let encouragedBonusSkill = canon?.encouragedProfessions ? canon.encouragedProfessions.bonusSkill : "";
  let encouragedBonusValue = canon?.encouragedProfessions ? canon.encouragedProfessions.bonusValue : 0;
  let encouragedProfessionsLib = canon?.encouragedProfessions || null;

  if (!canon) {
    const spMatch = desc.match(/gain\s*\+?(\d+)\s*skill\s*points?/i);
    if (spMatch) skillPoints = parseInt(spMatch[1], 10);

    const capMatch = desc.match(/put\s*up\s*to\s*\+?(\d+)\s*points?\s*into\s*any\s*individual\s*skill/i);
    if (capMatch) perSkillCap = parseInt(capMatch[1], 10);

    const skillSectionMatch = desc.match(/(?:following\s*skills[:\.]?)([\s\S]*?)(?:Gain\s*\d|If\s*you\s*take|Professions\s*with|Tenure|Starting\s*Wealth|$)/i);
    if (skillSectionMatch) {
      const lines = skillSectionMatch[1].split(/[\n\r]+/);
      for (const line of lines) {
        const cleanLine = line.replace(/^[•\-\*]\s*/, "").trim();
        if (!cleanLine) continue;
        if (/^(gain\s*\d|if\s*you\s*take|professions\s*with|tenure|starting\s*wealth)/i.test(cleanLine)) continue;

        const parts = cleanLine.split(":");
        if (parts.length > 1) {
          const category = parts[0].trim();
          const rawList = parts[1];
          const categorySkills = rawList.split(",").map(s => {
            const rawName = s.trim();
            const hasStar = rawName.includes("*");
            const name = rawName.replace(/\*/g, "").trim();
            const key = name.toLowerCase();
            return { name, key, hasStar };
          }).filter(s => Boolean(s.name) && s.name.length < 40 && !/^(with|you\s*may|gain|choose)/i.test(s.name));

          if (categorySkills.length > 0) {
            skillCategories.push({ category, skills: categorySkills });
            eligibleSkills.push(...categorySkills.map(s => s.name.toLowerCase()));
          }
        } else {
          if (!/(?:with\s*this|you\s*may|put\s*up|points?\s*into|spend\s*on)/i.test(cleanLine)) {
            const skills = parts[0].split(",").map(s => {
              const rawName = s.trim();
              const hasStar = rawName.includes("*");
              const name = rawName.replace(/\*/g, "").trim();
              const key = name.toLowerCase();
              return { name, key, hasStar };
            }).filter(s => Boolean(s.name) && s.name.length < 40 && !/^(with|you\s*may|gain|choose)/i.test(s.name));

            if (skills.length > 0) {
              skillCategories.push({ category: "General", skills });
              eligibleSkills.push(...skills.map(s => s.name.toLowerCase()));
            }
          }
        }
      }
    }

    if (skillCategories.length === 0 && (skillPoints > 0 || /any\s*skills?\s*(?:of\s*your\s*choice)?/i.test(desc))) {
      const starSkills = new Set([
        "alchemy", "brewing", "calligraphy", "carpentry", "cartography",
        "cobbling", "cooking", "glassblowing", "jeweling", "leatherworking",
        "masonry", "painting", "pottery", "smithing", "weaving", "woodcarving",
        "disguising", "forging", "lockpicking", "instrument", "vehicles", "vehicles [land]", "vehicles [water]"
      ]);

      for (const [catKey, skillNames] of Object.entries(MYTHCRAFT_SKILL_CATEGORIES)) {
        const catName = catKey.charAt(0).toUpperCase() + catKey.slice(1);
        const catSkills = skillNames.map(sk => {
          const cleanName = sk.replace(/\*/g, "").trim();
          const titleName = cleanName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const key = cleanName.toLowerCase();
          const hasStar = starSkills.has(key);
          return { name: titleName, key, hasStar };
        });
        skillCategories.push({ category: catName, skills: catSkills });
        eligibleSkills.push(...catSkills.map(s => s.name.toLowerCase()));
      }
    }

    // Check official MythCraft BackgroundModel schema (system.occupation)
    if (!encouragedTag && item?.system?.occupation?.tag) {
      encouragedTag = String(item.system.occupation.tag).trim().toLowerCase();
    }
    if (!encouragedBonusSkill && item?.system?.occupation?.skill) {
      encouragedBonusSkill = String(item.system.occupation.skill).trim();
    }
    if (!encouragedBonusValue && item?.system?.occupation?.bonus !== undefined) {
      encouragedBonusValue = Number(item.system.occupation.bonus) || 2;
    }

    // Tag extraction fallback from description
    if (!encouragedTag) {
      const tagMatch = clean.match(/(?:professions?\s*with\s*the|with\s*the|taking\s*a\s*profession\s*with\s*the)\s*([a-zA-Z0-9_\-]+)\s*tag/i)
        || clean.match(/tag[:\s]+([a-zA-Z0-9_\-]+)/i)
        || clean.match(/([a-zA-Z0-9_\-]+)\s*tag/i);
      if (tagMatch) {
        encouragedTag = tagMatch[1].trim().toLowerCase();
      }
    }

    // Bonus extraction
    if (!encouragedBonusValue || !encouragedBonusSkill) {
      const bonusMatch = clean.match(/(?:gain|receive)\s*(?:\+)?(\d+)\s*(?:points?\s*(?:in|to)?|to|in)?\s*([a-zA-Z\s]+?)(?:\s*skill|\s*\(|\.|\n|$)/i)
        || clean.match(/\+(\d+)\s*([a-zA-Z\s]+?)(?:\s*skill|\.|\n|$)/i);

      if (bonusMatch) {
        const candidateVal = parseInt(bonusMatch[1], 10);
        const candidateSkill = bonusMatch[2].replace(/attribute|point|wealth|sc|silver/gi, "").trim();
        const isGenericPoints = /^(?:skill|attribute|bonus)?\s*s?\s*(?:that|you|to|of)?/i.test(candidateSkill) || !candidateSkill;
        if (candidateVal > 0 && candidateSkill && candidateSkill.length < 35 && !isGenericPoints) {
          if (!encouragedBonusValue) encouragedBonusValue = candidateVal;
          if (!encouragedBonusSkill) encouragedBonusSkill = candidateSkill;
        }
      }
    }

    if (!encouragedBonusValue && (encouragedTag || rawDesc.includes("@UUID") || clean.toLowerCase().includes("profession"))) {
      encouragedBonusValue = 2;
    }
    if (!encouragedBonusSkill && (encouragedTag || rawDesc.includes("@UUID") || clean.toLowerCase().includes("profession"))) {
      const knownSkills = ["Religion", "Medicine", "Insight", "Investigation", "Persuasion", "Deception", "History", "Arcana", "Athletics", "Stealth", "Perception", "Awareness", "Survival", "Forced March", "Intimidation", "Streetwise", "Performance", "Crafting"];
      for (const sk of knownSkills) {
        if (clean.toLowerCase().includes(sk.toLowerCase())) {
          encouragedBonusSkill = sk;
          break;
        }
      }
      if (!encouragedBonusSkill) encouragedBonusSkill = "Synergy Skill";
    }
  }

  // Starting Wealth
  let wealthFormula = "5d20*2";
  let wealthAverage = 104;
  const wealthMatch = desc.match(/gain\s*([0-9d\*\+\-\s]+)\s*sc\s*\(or\s*take\s*the\s*average[,\s]*(\d+)\s*sc\)/i);
  if (wealthMatch) {
    wealthFormula = wealthMatch[1].trim();
    wealthAverage = parseInt(wealthMatch[2], 10);
  }

  const uuidMatches = [...rawDesc.matchAll(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/gi)].map(m => ({
    uuid: m[1],
    name: (m[2] || "").trim(),
  }));

  const dualProfession = (item?.system?.professions === 2)
    || /choose\s*two\s*professions?/i.test(clean)
    || /may\s*select\s*two\s*professions?/i.test(clean)
    || /gains?\s*two\s*professions?/i.test(clean)
    || /select\s*(?:any\s*)?two\s*professions?/i.test(clean)
    || /two\s*profession\s*choices?/i.test(clean)
    || /knave/i.test(String(item?.name || ""));

  const hasNoProfession = !dualProfession && (
    (item?.system?.professions === 0)
    || /do\s*not\s*(?:get\s*to\s*)?select\s*(?:a\s*)?profession/i.test(clean)
    || (/no\s*professional\s*experience/i.test(clean) && !/two\s*professions?/i.test(clean))
    || /^urchin$/i.test(String(item?.name || "").trim())
  );

  let startingGear = [];
  const bgGearMatch = desc.match(/(?:gain|receive)\s*(?:the\s*following\s*gear|the\s*following\s*items|starting\s*gear|starting\s*equipment)[^:]*:\s*([\s\S]*?)(?:Gain\s*\d|If\s*you\s*take|Professions\s*with|Tenure|Starting\s*Wealth|$)/i)
    || desc.match(/(?:starting\s*(?:gear|equipment)[:\.]?)\s*([\s\S]*?)(?:Gain\s*\d|If\s*you\s*take|Professions\s*with|Tenure|Starting\s*Wealth|$)/i);
  if (bgGearMatch) {
    startingGear = parseProfessionStartingGear(bgGearMatch[1]);
  }

  return {
    skillPoints,
    perSkillCap,
    defaultPerSkillCap: perSkillCap,
    taggedCaps,
    eligibleSkills: Array.from(new Set(eligibleSkills)),
    skillCategories,
    fixedSkills,
    startingGear,
    startingWealth: {
      formula: wealthFormula,
      average: wealthAverage,
    },
    encouragedProfessions: encouragedProfessionsLib || {
      tag: encouragedTag,
      bonusSkill: encouragedBonusSkill,
      bonusValue: encouragedBonusValue,
      rawProfessionUuids: uuidMatches,
    },
    hasNoProfession,
    dualProfession: canon?.dualProfession !== undefined ? canon.dualProfession : dualProfession,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Text Parsing: Professions, Gear, Skills & Tenure
 * ──────────────────────────────────────────────────────────────────────── */

const WORD_TO_QTY = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/**
 * Parses a starting gear description string into structured equipment items with resolved quantities.
 * Handles nested parentheses, markdown links, compound containers, and word quantities.
 * @param {string} gearText
 * @returns {Array<{ name: string, quantity: number, raw: string }>}
 */
export function parseProfessionStartingGear(gearText) {
  if (!gearText || typeof gearText !== "string") return [];

  // 1. Strip markdown links: [label](url) -> label
  const cleaned = gearText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // 2. Tokenize respecting parentheses & brackets (do not split commas inside parens)
  const tokens = [];
  let current = "";
  let parenDepth = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "(" || ch === "[" || ch === "{") parenDepth++;
    else if (ch === ")" || ch === "]" || ch === "}") parenDepth = Math.max(0, parenDepth - 1);

    if ((ch === "," || ch === "\n" || ch === "\r") && parenDepth === 0) {
      const trimmed = current.trim();
      if (trimmed) tokens.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());

  // 3. Process tokens into structured items
  const startingGear = [];

  for (const rawToken of tokens) {
    const itemStr = rawToken.replace(/^[\*\-•]\s*/, "").replace(/[\.\*]+$/, "").trim();
    if (!itemStr) continue;

    // Check compound container entries like "Satchel and saddlebags" or "belt pouch and satchel"
    const andMatch = itemStr.match(/^(satchel|belt pouch|pouch|saddlebags)\s+and\s+(satchel|belt pouch|pouch|saddlebags)$/i);
    if (andMatch) {
      startingGear.push(parseSingleGearToken(andMatch[1].trim(), rawToken));
      startingGear.push(parseSingleGearToken(andMatch[2].trim(), rawToken));
      continue;
    }

    startingGear.push(parseSingleGearToken(itemStr, rawToken));
  }

  return startingGear;
}

function parseSingleGearToken(itemStr, rawToken) {
  let name = itemStr;
  let quantity = 1;

  // Pattern 1: "parchment (10)" or "rations (2)" or "candles (10)"
  const parenQtyMatch = name.match(/^([^\(]+?)\s*\(\s*(\d+)\s*\)$/);
  if (parenQtyMatch) {
    name = parenQtyMatch[1].trim();
    quantity = parseInt(parenQtyMatch[2], 10) || 1;
    return { name, quantity, raw: rawToken };
  }

  // Pattern 2: "two sets of clothes (noble)" or "two sets of clothes"
  const wordSetsMatch = name.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*sets?\s*of\s*(.+)$/i);
  if (wordSetsMatch) {
    const word = wordSetsMatch[1].toLowerCase();
    quantity = WORD_TO_QTY[word] || parseInt(word, 10) || 1;
    name = wordSetsMatch[2].trim();
    return { name, quantity, raw: rawToken };
  }

  // Pattern 3: "50 ft rope" -> "Rope (50 ft)"
  if (/^50\s*ft\s*rope$/i.test(name)) {
    return { name: "Rope (50 ft)", quantity: 1, raw: rawToken };
  }

  // Pattern 4: "wood- splitting axe" -> "Wood Splitter"
  if (/^wood[\-\s]+splitting\s*axe$/i.test(name)) {
    return { name: "Wood Splitter", quantity: 1, raw: rawToken };
  }

  return { name, quantity, raw: rawToken };
}

/**
 * Parses profession items for starting gear, skills, and tenure rank items.
 * @param {Item} item
 * @returns {{ startingGear: Array<{ name: string, quantity: number, raw: string }>, fixedSkills: Array<{ name: string, value: number }>, choiceSkills: { count: number, value: number, options: Array<string> }, tenureUuids: Array<{ uuid: string, label: string, rank: number }> }}
 */
export function parseProfessionData(item) {
  const desc = descriptionText(item);

  // 1. Starting Gear List
  let startingGear = [];
  const gearMatch = desc.match(/gain\s*the\s*following\s*gear[^:]*:\s*([\s\S]*?)(?:Each\s*time|Tenure|When\s*you\s*become|Starting\s*Wealth|At\s*1st\s*Level|$)/i);
  if (gearMatch) {
    startingGear = parseProfessionStartingGear(gearMatch[1]);
  }

  // 2. Fixed and Choice Skills
  const fixedSkills = [];
  let choiceCount = 0;
  let choiceValue = 1;
  const choiceOptions = [];

  const fixedMatch = desc.match(/gain\s*\+?(\d+)\s*([a-zA-Z\s]+?)(?:,?\s*and\s*\+?(\d+)\s*in\s*([a-zA-Z0-9]+)\s*of\s*the\s*following\s*skills|\.)/i);
  if (fixedMatch) {
    fixedSkills.push({
      name: fixedMatch[2].trim(),
      value: parseInt(fixedMatch[1], 10),
    });
  }

  const choiceMatch = desc.match(/and\s*\+?(\d+)\s*in\s*(one|two|three|four|five|\d+)\s*of\s*the\s*following\s*skills[:\.]?([\s\S]*?)(?:Tenure|Rank|$)/i);
  if (choiceMatch) {
    choiceValue = parseInt(choiceMatch[1], 10);
    const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    choiceCount = wordMap[choiceMatch[2].toLowerCase()] || parseInt(choiceMatch[2], 10) || 1;

    const lines = choiceMatch[3].split(/[\n\r]+/);
    for (const line of lines) {
      const clean = line.replace(/^[•\-\*]\s*/, "").trim();
      if (!clean) continue;
      const parts = clean.split(":");
      const rawList = parts.length > 1 ? parts[1] : parts[0];
      const skills = rawList.split(",").map(s => s.trim().replace(/[\.\*]+$/, "").trim().toLowerCase()).filter(Boolean);
      choiceOptions.push(...skills);
    }
  }

  // 3. Tenure Items UUIDs
  const tenureUuids = [];
  const tenureMatches = [...desc.matchAll(/@UUID\[([^\]]+)\]\{([^}]+)\}/gi)];
  let rankCounter = 1;
  for (const m of tenureMatches) {
    tenureUuids.push({
      uuid: m[1],
      label: m[2],
      rank: rankCounter++,
    });
  }

  // Filter choiceOptions against the canonical skill list to remove prose fragments
  const validChoiceOptions = [];
  for (const s of choiceOptions) {
    const norm = s.toLowerCase().replace(/[\.\*]+$/, "").trim();
    if (MYTHCRAFT_SKILLS.has(norm)) {
      validChoiceOptions.push(norm);
    } else {
      const match = Array.from(MYTHCRAFT_SKILLS).find(k => norm.startsWith(k) || k.startsWith(norm.split("[")[0].trim()));
      if (match) validChoiceOptions.push(match);
    }
  }

  return {
    startingGear,
    fixedSkills,
    choiceSkills: {
      count: choiceCount,
      value: choiceValue,
      options: Array.from(new Set(validChoiceOptions)),
    },
    tenureUuids,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Canonical Magic Entry Talents & Helpers
 * ──────────────────────────────────────────────────────────────────────── */

export const MAGIC_ENTRY_TALENTS = {
  arcane: "Student of the Arcane",
  divine: "Disciple of the Divine",
  occult: "Initiate of the Occult",
  primal: "Warden of the Primal",
  psionic: "Adept of the Psionic",
};

export const MAGIC_ENTRY_BY_NAME = {
  "student of the arcane": "arcane",
  "disciple of the divine": "divine",
  "initiate of the occult": "occult",
  "warden of the primal": "primal",
  "adept of the psionic": "psionic",
};

/**
 * Determines the magic discipline for a talent item, if any.
 * @param {Item|object} talent
 * @returns {string|null} "arcane" | "divine" | "occult" | "primal" | "psionic" | null
 */
export function getMagicDiscipline(talent) {
  if (!talent) return null;
  const rawName = String(talent.name || "").trim().toLowerCase();
  const normName = normalizeTalentName(rawName);

  // 1. Check direct canonical magic entry talent names
  if (MAGIC_ENTRY_BY_NAME[rawName] || MAGIC_ENTRY_BY_NAME[normName]) {
    return MAGIC_ENTRY_BY_NAME[rawName] || MAGIC_ENTRY_BY_NAME[normName];
  }

  // 2. Check canonical talent lookup
  const canonical = NORMALIZED_CANONICAL_TALENTS[normName] || CANONICAL_TALENTS[rawName];
  if (canonical && canonical.category === "magic") {
    return canonical.parent.toLowerCase();
  }

  // 3. Check folder chain
  const chain = (talent._folderChain || getDocumentFolderChain(talent) || []).map(f => String(f).toLowerCase());
  for (const f of chain) {
    const clean = f.replace(/^\d+\.\s*/, "").replace(/\s*(track|stack|talents?)$/i, "").trim();
    if (MAGIC_ENTRY_TALENTS[clean]) return clean;
    if (DISCIPLINE_TO_MAGIC[clean]) return DISCIPLINE_TO_MAGIC[clean].toLowerCase();
  }

  // 4. Check tags
  const tags = (Array.isArray(talent.system?.tags) ? talent.system.tags : []).map(t =>
    String(t?.name || t?.label || t).toLowerCase()
  );
  for (const tag of tags) {
    if (MAGIC_ENTRY_TALENTS[tag]) return tag;
    if (DISCIPLINE_TO_MAGIC[tag]) return DISCIPLINE_TO_MAGIC[tag].toLowerCase();
  }

  // 5. Check magicSource or category
  const src = String(talent.system?.magicSource || "").toLowerCase();
  for (const mag of Object.keys(MAGIC_ENTRY_TALENTS)) {
    if (src.includes(mag)) return mag;
  }

  // 6. Check custom category
  if (talent._customCategory === "magic" && talent._customParent) {
    const parent = talent._customParent.toLowerCase();
    if (MAGIC_ENTRY_TALENTS[parent]) return parent;
  }

  // 7. Check compendium pack metadata or category
  if (talent._compCategory === "magic") {
    for (const mag of Object.keys(MAGIC_ENTRY_TALENTS)) {
      if (chain.some(f => f.includes(mag)) || tags.some(t => t.includes(mag))) return mag;
    }
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Text Parsing: Talents, Prerequisites & Incompatibilities
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Parses talent items for prerequisites, incompatibilities, Magic Power, SP, and extra stack talents.
 * @param {Item} item
 * @returns {{ prerequisites: Array<string>, incompatibilities: Array<string>, isMagicEntry: boolean, spBonus: number, magicPowerBonus: number, magicAttribute: string, extraStackTalents: number, magicStackTag: string }}
 */
export function parseTalentData(item) {
  const desc = descriptionText(item);
  const itemName = String(item?.name || "").trim();
  const itemNorm = normalizeTalentName(itemName);
  const isCanonicalEntry = Boolean(MAGIC_ENTRY_BY_NAME[itemName.toLowerCase()] || MAGIC_ENTRY_BY_NAME[itemNorm]);

  // 1. Prerequisites
  const prerequisites = [];
  const prereqMatch = desc.match(/prerequisites?[:\s]+([^\n\r\.\<]+)/i);
  if (prereqMatch) {
    const raw = prereqMatch[1].replace(/@UUID\[[^\]]+\]\{([^}]+)\}/gi, "$1");
    prerequisites.push(...raw.split(/,|and/).map(s => s.trim()).filter(Boolean));
  }

  // 2. Incompatible
  const incompatibilities = [];
  const incompMatch = desc.match(/incompatible[:\s]+([^\n\r\.\<]+)/i);
  if (incompMatch) {
    const raw = incompMatch[1].replace(/@UUID\[[^\]]+\]\{([^}]+)\}/gi, "$1");
    incompatibilities.push(...raw.split(/,|and/).map(s => s.trim()).filter(Boolean));
  }

  // 3. Magic Entry & Benefits
  const isMagicEntry = isCanonicalEntry || /fundamental\s*wellspring|achieved\s*attunation|first\s*magic\s*entry\s*talent/i.test(desc);
  let spBonus = 0;
  let magicPowerBonus = 0;
  let magicAttribute = "int";
  let extraStackTalents = 0;
  let magicStackTag = "";

  const spMatch = desc.match(/(?:gain|grants?)\s*\+?(\d+)\s*(?:spell|sell)?\s*(?:points?|sp)/i);
  if (spMatch) spBonus = parseInt(spMatch[1], 10);
  if (isMagicEntry && !spBonus) spBonus = 10;

  const powerMatch = desc.match(/(?:gain|grants?)\s*\+?(\d+)\s*([a-zA-Z]+)?\s*power/i);
  if (powerMatch) {
    magicPowerBonus = parseInt(powerMatch[1], 10);
    if (powerMatch[2]) magicStackTag = powerMatch[2].toLowerCase().replace(/\s*magic\s*$/i, "").trim();
  }
  if (isMagicEntry && !magicPowerBonus) magicPowerBonus = 1;

  const attrMatch = desc.match(/magic\s*attribute\s*is\s*([a-zA-Z]+)/i);
  if (attrMatch) magicAttribute = attrMatch[1].toLowerCase();

  const extraTalentsMatch = desc.match(/gain\s*(two|three|four|\d+)\s*talents?\s*from\s*the\s*([a-zA-Z\s]+)\s*stack/i);
  if (extraTalentsMatch) {
    const wordMap = { two: 2, three: 3, four: 4 };
    extraStackTalents = wordMap[extraTalentsMatch[1].toLowerCase()] || parseInt(extraTalentsMatch[1], 10) || 2;
    magicStackTag = extraTalentsMatch[2].replace(/\s*magic\s*$/i, "").trim().toLowerCase();
  }
  if (isMagicEntry && !extraStackTalents) {
    extraStackTalents = 2;
  }
  if (isCanonicalEntry && !magicStackTag) {
    magicStackTag = MAGIC_ENTRY_BY_NAME[itemName.toLowerCase()] || MAGIC_ENTRY_BY_NAME[itemNorm] || "";
  }

  return {
    prerequisites,
    incompatibilities,
    isMagicEntry,
    spBonus,
    magicPowerBonus,
    magicAttribute,
    extraStackTalents,
    magicStackTag,
  };
}

/**
 * Checks whether an actor meets all prerequisites and has no incompatible talents for a given talent.
 * @param {Item} talent
 * @param {Array<Item|string>} actorTalents - Array of owned talent items or talent names
 * @param {object} [options={}]
 * @param {number|null} [options.effectiveLevel=null] - Target character level when advancing
 * @returns {{ isAvailable: boolean, missingPrereqs: Array<string>, conflictingTalents: Array<string> }}
 */
export function checkTalentAvailability(talent, actorTalents = [], { effectiveLevel = null } = {}) {
  const data = parseTalentData(talent);
  const ownedNames = new Set();
  for (const t of actorTalents) {
    const raw = typeof t === "string" ? t : t.name;
    if (!raw) continue;
    ownedNames.add(raw.toLowerCase().trim());
    const norm = normalizeTalentName(raw);
    ownedNames.add(norm);
    const arabic = norm.replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, (m) => {
      const rMap = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
      return rMap[m] || m;
    });
    ownedNames.add(arabic);
  }

  const missingPrereqs = [];

  // Magic Entry Prerequisite Check:
  // Any talent in a magic discipline requires that discipline's Magic Entry talent unless it is the entry talent itself.
  const magicDiscipline = getMagicDiscipline(talent);
  if (magicDiscipline && !data.isMagicEntry) {
    const requiredEntry = MAGIC_ENTRY_TALENTS[magicDiscipline];
    if (requiredEntry) {
      const entryClean = requiredEntry.toLowerCase().trim();
      const entryNorm = normalizeTalentName(requiredEntry);
      if (!ownedNames.has(entryClean) && !ownedNames.has(entryNorm)) {
        missingPrereqs.push(requiredEntry);
      }
    }
  }

  for (const p of data.prerequisites) {
    const clean = p.toLowerCase().trim();
    const norm = normalizeTalentName(p);
    const arabic = norm.replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, (m) => {
      const rMap = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
      return rMap[m] || m;
    });

    // Ignore descriptive/negative clause prerequisites like "no other class entry talents"
    if (/^(no\s+other|cannot\s+have|must\s+not|without)\b/i.test(clean)) {
      continue;
    }

    // Check level prerequisites (e.g. "Level 2", "Character Level 2", "2nd Level", "Level 2 or higher")
    const levelPrereqMatch = clean.match(/(?:character\s*)?level\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*level/i);
    if (levelPrereqMatch) {
      const requiredLevel = parseInt(levelPrereqMatch[1] || levelPrereqMatch[2], 10);
      const actorLevel = effectiveLevel ?? (
        typeof actorTalents[0] === "object" && actorTalents[0]?.parent?.system?.level
          ? Number(actorTalents[0].parent.system.level)
          : null
      );
      if (actorLevel !== null && actorLevel >= requiredLevel) {
        continue; // Level requirement met
      } else if (actorLevel !== null) {
        missingPrereqs.push(p);
        continue;
      }
    }

    if (!ownedNames.has(clean) && !ownedNames.has(norm) && !ownedNames.has(arabic)) {
      missingPrereqs.push(p);
    }
  }

  const conflictingTalents = [];
  for (const inc of data.incompatibilities) {
    const clean = inc.toLowerCase().trim();
    const norm = normalizeTalentName(inc);
    if (ownedNames.has(clean) || ownedNames.has(norm)) {
      conflictingTalents.push(inc);
    }
  }

  let prereqTooltip = "";
  if (missingPrereqs.length > 0) {
    prereqTooltip = `Requires: ${missingPrereqs.join(", ")}`;
  } else if (conflictingTalents.length > 0) {
    prereqTooltip = `Incompatible with: ${conflictingTalents.join(", ")}`;
  }

  return {
    isAvailable: missingPrereqs.length === 0 && conflictingTalents.length === 0,
    missingPrereqs,
    conflictingTalents,
    prereqTooltip,
  };
}

/**
 * Resolves starting features, sublineages, choice groups, and eligible unique features for a chosen lineage.
 * Uses structured description parsing (headings, @UUID links), folder chains, and document matching.
 * @param {Item} selectedLineage
 * @param {Array<Item>} allLineageDocs
 * @returns {{
 *   baseStartingFeatures: Array<Item>,
 *   startingFeatures: Array<Item>,
 *   sublineages: Array<{ name: string, description: string, features: Array<Item> }>,
 *   choiceGroups: Array<{ name: string, key: string, choices: Array<{ id: string, name: string, item: Item }> }>,
 *   uniqueFeatures: Array<Item>,
 *   uniqueCount: number,
 * }}
 */
export function resolveLineageFeatures(selectedLineage, allLineageDocs = []) {
  if (!selectedLineage) {
    return {
      baseStartingFeatures: [],
      startingFeatures: [],
      sublineages: [],
      choiceGroups: [],
      uniqueFeatures: [],
      uniqueCount: 0,
    };
  }

  const rawDesc = String(selectedLineage.system?.description?.value ?? selectedLineage.system?.description ?? "");
  const baseName = selectedLineage.name.replace(/lineage/i, "").trim().toLowerCase();
  const lineageFullName = String(selectedLineage.name || "").trim().toLowerCase();

  // 1. Gather all candidate documents belonging to this lineage, strictly excluding the lineage item itself
  const selectedId = String(selectedLineage.id || selectedLineage._id || "").toLowerCase();
  const candidates = allLineageDocs.filter(d => {
    const dId = String(d.id || d._id || "").toLowerCase();
    if (dId && dId === selectedId) return false;
    const dName = String(d.name || "").trim().toLowerCase();
    const dBase = dName.replace(/lineage/i, "").trim();
    if (dName === baseName || dName === lineageFullName || dBase === baseName) {
      return false; // Exclude lineage document itself
    }
    if (d.type === "lineage" || d.type === "ancestry" || d.system?.category === "lineage" || d.system?.category === "ancestry") {
      return false;
    }
    return true;
  });

  const docMap = new Map();
  for (const doc of candidates) {
    const docId = (doc.id || doc._id || "").toLowerCase();
    const docName = String(doc.name || "").toLowerCase().trim();
    if (docId) docMap.set(docId, doc);
    if (docName) docMap.set(docName, doc);
  }

  const resolveDoc = (uuidOrId, name) => {
    if (uuidOrId) {
      const cleanId = String(uuidOrId).replace(/^.*Item\./, "").replace(/^.*Compendium\.[^\.]+\./, "").toLowerCase();
      if (docMap.has(cleanId)) return docMap.get(cleanId);
      const byId = candidates.find(c => (c.id || c._id || "").toLowerCase() === cleanId);
      if (byId) return byId;
    }
    if (name) {
      const cleanName = String(name).toLowerCase().trim();
      if (docMap.has(cleanName)) return docMap.get(cleanName);
      const byName = candidates.find(c => String(c.name || "").toLowerCase().trim() === cleanName);
      if (byName) return byName;
    }
    return null;
  };

  // 2. Base Starting Features (strictly under "Starting Features" heading in HTML description)
  const baseStartingFeatures = [];
  const startingMatch = rawDesc.match(/<h[23][^>]*>[^<]*starting features[^<]*<\/h[23]>([\s\S]*?)(?=<h[23]|$)/i);
  if (startingMatch) {
    const stHtml = startingMatch[1];
    // Stop before inline "Unique Feature" text (e.g. Bhrunai)
    const beforeUnique = stHtml.split(/unique\s+features?/i)[0];
    const matches = [...beforeUnique.matchAll(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/gi)];
    for (const m of matches) {
      const item = resolveDoc(m[1], m[2]);
      if (item && !baseStartingFeatures.some(f => (f.id || f._id) === (item.id || item._id) || f.name === item.name)) {
        baseStartingFeatures.push(item);
      }
    }
  }

  // 3. Sublineages (under "Sublineage" heading in HTML, divided by <h4>)
  const sublineages = [];
  const subMatch = rawDesc.match(/<h[23][^>]*>[^<]*sublineage[^<]*<\/h[23]>([\s\S]*?)(?=<h[23]|$)/i);
  if (subMatch) {
    const subHtml = subMatch[1];
    const parts = subHtml.split(/<h4[^>]*>/i);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const hEnd = part.indexOf("</h4>");
      if (hEnd === -1) continue;
      const subName = part.substring(0, hEnd).replace(/<[^>]+>/g, "").trim();
      const normSub = subName.toLowerCase().replace(/lineage/i, "").trim();
      if (!normSub || normSub === baseName || normSub === lineageFullName) continue; // Lineage name is NOT a sublineage!

      const content = part.substring(hEnd + 5);
      const subDescMatch = content.match(/<p>([\s\S]*?)<\/p>/i);
      const subDesc = subDescMatch ? subDescMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      const feats = [];
      const matches = [...content.matchAll(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/gi)];
      for (const m of matches) {
        const item = resolveDoc(m[1], m[2]);
        if (item && !feats.some(f => (f.id || f._id) === (item.id || item._id) || f.name === item.name)) {
          feats.push(item);
        }
      }
      sublineages.push({
        name: subName,
        description: subDesc,
        features: feats,
      });
    }
  }

  // 4. Choice Groups (e.g. Golem "Primary Material" and "Life Source")
  const choiceGroups = [];
  const groupMatches = [...rawDesc.matchAll(/<h[34][^>]*>([^<]*(?:primary material|life source)[^<]*)<\/h[34]>([\s\S]*?)(?=<h[234]|$)/gi)];
  for (const gm of groupMatches) {
    const gName = gm[1].replace(/<[^>]+>/g, "").trim();
    const gHtml = gm[2];
    const choices = [];
    const matches = [...gHtml.matchAll(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/gi)];
    for (const m of matches) {
      const item = resolveDoc(m[1], m[2]);
      if (item && !choices.some(c => c.id === (item.id || item._id))) {
        choices.push({
          id: item.id || item._id,
          name: m[2] || item.name,
          item,
        });
      }
    }
    if (choices.length > 0) {
      choiceGroups.push({
        name: gName,
        key: gName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        choices,
      });
    }
  }

  // 5. Folder Hierarchy & Explicit Tag Integration (Homebrew / Compendium Folder structure)
  // Hierarchy: Parent folder = Ancestry Name, Secondary folder = "(Lineage Name) Starting Features", "All (Lineage Name) Features", or Sublineage Name
  const uniqueFolderFeatures = [];
  for (const doc of candidates) {
    const tags = parseExplicitItemTags(doc);
    const rawChain = doc._folderChain || getDocumentFolderChain(doc) || [];
    const filteredChain = rawChain.filter(f => !/^(lineages?|ancestries?|compendium|items?)$/i.test(f.trim()));

    // Check if doc belongs to this ancestry via tags or folder chain
    const tagAncestry = (tags.ancestry || tags.lineage || doc._customParent || "").toLowerCase().replace(/lineage/i, "").trim();
    const folderAncestry = filteredChain.length > 0 ? filteredChain[0].toLowerCase().replace(/lineage/i, "").trim() : "";
    const belongsToLineage = (tagAncestry && (tagAncestry === baseName || tagAncestry === lineageFullName))
      || (folderAncestry && (folderAncestry === baseName || folderAncestry === lineageFullName))
      || filteredChain.some(f => f.toLowerCase().includes(baseName))
      || (doc._customCategory === "sublineage" && (!doc._customParent || doc._customParent.toLowerCase().replace(/lineage/i, "").trim() === baseName));

    if (!belongsToLineage) continue;

    const featureTag = tags.feature ? tags.feature.toLowerCase() : "";

    // A) Starting / Core Features: "(Lineage Name) Starting Features", "Starting Features", "Core Features"
    const isStartingFolder = filteredChain.some(f => /starting/i.test(f) || /^(base|core)\s+features?/i.test(f))
      || (doc.folder?.name && /starting/i.test(doc.folder.name));
    const isStartingTag = featureTag === "starting" || featureTag === "base" || featureTag === "core";
    if (isStartingTag || isStartingFolder) {
      if (!baseStartingFeatures.some(f => (f.id || f._id) === (doc.id || doc._id) || f.name === doc.name)) {
        baseStartingFeatures.push(doc);
      }
      continue;
    }

    // B) All Features / Milestone / Unique: "All (Lineage Name) Features", "All Features", "Unique Features", "Choice Features"
    const isAllFeaturesFolder = filteredChain.some(f => /^all\s+/i.test(f) || /all\s+.*features?/i.test(f) || /^(unique|choice|milestones?)(\s+features?|\s+options?)?$/i.test(f))
      || (doc.folder?.name && (/^all\s+/i.test(doc.folder.name) || /all\s+.*features?/i.test(doc.folder.name)));
    const isAllFeaturesTag = featureTag === "all" || featureTag === "unique" || featureTag === "choice" || featureTag === "milestone";
    if (isAllFeaturesTag || isAllFeaturesFolder) {
      if (!uniqueFolderFeatures.some(f => (f.id || f._id) === (doc.id || doc._id) || f.name === doc.name)) {
        uniqueFolderFeatures.push(doc);
      }
      continue;
    }

    // C) Sublineages (Sublineage folder, tag, or custom sublineage compendium e.g. "Wood Elf", "High Elf")
    // Note: The lineage name itself or generic feature folders are NEVER sublineages
    const subFolder = filteredChain.find(f => {
      const norm = f.toLowerCase().replace(/lineage/i, "").trim();
      return norm && norm !== baseName && norm !== lineageFullName && !/^(starting|base|core|all|unique|choice|features|talents|traits|milestones)/i.test(f) && !f.toLowerCase().endsWith("features");
    });
    const customSubName = doc._customCategory === "sublineage" ? (doc._customTrack || (filteredChain.length > 0 ? filteredChain[filteredChain.length - 1] : null) || doc._compendiumPack?.metadata?.label || doc._compendiumPack?.title || doc.name) : null;
    const subName = tags.sublineage || customSubName || subFolder;
    if (subName) {
      const normSub = subName.toLowerCase().replace(/lineage/i, "").trim();
      if (normSub && normSub !== baseName && normSub !== lineageFullName && !/^(starting|base|core|all|unique|choice|features|talents|traits|milestones)/i.test(subName) && !subName.toLowerCase().endsWith("features")) {
        let sub = sublineages.find(s => s.name.toLowerCase() === subName.toLowerCase());
        if (!sub) {
          sub = { name: subName, description: "", features: [] };
          sublineages.push(sub);
        }
        if (!sub.features.some(f => (f.id || f._id) === (doc.id || doc._id) || f.name === doc.name)) {
          sub.features.push(doc);
        }
      }
    }
  }

  // 6. Unique Features Pool
  const assignedIds = new Set([
    ...baseStartingFeatures.map(f => (f.id || f._id || "").toLowerCase()),
    ...baseStartingFeatures.map(f => String(f.name || "").toLowerCase().trim()),
    ...sublineages.flatMap(s => s.features.flatMap(f => [(f.id || f._id || "").toLowerCase(), String(f.name || "").toLowerCase().trim()])),
    ...choiceGroups.flatMap(g => g.choices.flatMap(c => [(c.id || "").toLowerCase(), String(c.name || "").toLowerCase().trim()])),
  ]);

  const uniqueFeatures = [...uniqueFolderFeatures];
  for (const doc of candidates) {
    const dId = (doc.id || doc._id || "").toLowerCase();
    const dName = String(doc.name || "").toLowerCase().trim();
    const dBase = dName.replace(/lineage/i, "").trim();
    if (dName === baseName || dName === lineageFullName || dBase === baseName) continue; // Exclude lineage itself
    if (assignedIds.has(dId) || assignedIds.has(dName)) continue;

    // Check if doc belongs to this lineage's folder chain
    const chain = (doc._folderChain || getDocumentFolderChain(doc)).map(f => f.toLowerCase().trim());
    const tags = parseExplicitItemTags(doc);
    const tagAncestry = (tags.ancestry || tags.lineage || "").toLowerCase().replace(/lineage/i, "").trim();
    const belongs = chain.some(f => f.includes(baseName)) || (tagAncestry && (tagAncestry === baseName || tagAncestry === lineageFullName));
    if (!belongs) continue;

    if (uniqueFeatures.some(u => (u.id || u._id) === (doc.id || doc._id) || String(u.name || "").toLowerCase().trim() === dName)) continue;
    uniqueFeatures.push(doc);
  }

  // Sort unique features alphabetically
  uniqueFeatures.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // 7. Unique Feature Count
  let uniqueCount = 0;
  if (/choose\s+(?:two|2)\s+(?:additional\s+)?options/i.test(rawDesc)) {
    uniqueCount = 2;
  } else if (/unique\s+features?/i.test(rawDesc) || /choose\s+(?:one|1)\s+(?:additional\s+)?(?:feature|option)/i.test(rawDesc)) {
    uniqueCount = 1;
  } else if (uniqueFeatures.length > 0) {
    uniqueCount = 1;
  }

  return {
    baseStartingFeatures,
    startingFeatures: baseStartingFeatures,
    sublineages,
    choiceGroups,
    uniqueFeatures,
    uniqueCount,
  };
}

/**
 * Groups a list of talent items by their Compendium Folder / Stack.
 * @param {Array<Item>} talentsList
 * @returns {Array<{ stackName: string, stackKey: string, talents: Array<Item> }>}
 */
export function groupTalentsByStack(talentsList = []) {
  const stackMap = new Map();

  for (const talent of talentsList) {
    const chain = talent._folderChain || getDocumentFolderChain(talent);
    let stackName = "General Talents";
    if (chain.length > 0) {
      stackName = chain[chain.length - 1];
    } else if (talent.system?.category) {
      stackName = String(talent.system.category);
    } else if (talent.system?.tags) {
      const tags = Array.isArray(talent.system.tags) ? talent.system.tags : [talent.system.tags];
      if (tags.length > 0) stackName = String(tags[0]?.name || tags[0]?.label || tags[0]);
    }

    if (!stackName.toLowerCase().endsWith("stack") && !stackName.toLowerCase().endsWith("talents")) {
      stackName = `${stackName} Stack`;
    }

    const key = stackName.toLowerCase();
    if (!stackMap.has(key)) {
      stackMap.set(key, { stackName, stackKey: key, talents: [] });
    }
    const stackTalents = stackMap.get(key).talents;
    const tName = normalizeTalentName(talent.name);
    if (!stackTalents.some(existing => normalizeTalentName(existing.name) === tName)) {
      stackTalents.push(talent);
    }
  }

  return Array.from(stackMap.values()).sort((a, b) => a.stackName.localeCompare(b.stackName));
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Talent Tree Graph Builder (MythCraft SRD Tier Layout)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Builds connected talent trees with structured tiers, branch ranks, and edges.
 * @param {Array<Item>} talentsList - All available talents in compendium/folder
 * @param {Array<Item|string>} [actorTalents=[]] - Owned talents on actor
 * @returns {Array<{ trackTitle: string, root: object, nodes: Array<object>, tiers: Array<{ tierNumber: number, label: string, nodes: Array<object> }>, isStarted: boolean }>}
 */
/**
 * Builds connected talent trees with structured tiers, branch ranks, and edges.
 * Groups talents by Compendium Folder / Stack, then structures nodes into SRD Tiers.
 * @param {Array<Item>} talentsList - All available talents in compendiums
 * @param {Array<Item|string>} [actorTalents=[]] - Owned talents on actor
 * @returns {Array<{ trackTitle: string, category: string, root: object, nodes: Array<object>, tiers: Array<{ tierNumber: number, label: string, nodes: Array<object> }>, isStarted: boolean }>}
 */
export const MYTHCRAFT_CANONICAL_CLASSES = [
  "Berzerker",
  "Cleric",
  "Mage",
  "Oracle",
  "Pugilist",
  "Ranger",
  "Rogue",
  "Tinkerer",
  "Troubadour",
  "Vessel",
  "Warrior",
  "Witch",
  "Zealot",
];

export const MYTHCRAFT_CANONICAL_SPECS = [
  "Combat Stack",
  "Command Stack",
  "Defense Stack",
  "Skill Stack",
];

export const MYTHCRAFT_CANONICAL_MAGIC = [
  "Arcane",
  "Divine",
  "Occult",
  "Primal",
  "Psionic",
];

export function buildTalentTrees(talentsList = [], actorTalents = [], { effectiveLevel = null } = {}) {
  const ownedNames = new Set();
  for (const t of actorTalents) {
    const raw = typeof t === "string" ? t : t.name;
    if (!raw) continue;
    ownedNames.add(raw.toLowerCase().trim());
    const norm = normalizeTalentName(raw);
    ownedNames.add(norm);
    const arabic = norm.replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, (m) => {
      const rMap = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
      return rMap[m] || m;
    });
    ownedNames.add(arabic);
  }

  const rootTreeMap = new Map();

  for (const t of talentsList) {
    if (isDisallowedTalentItem(t)) {
      continue;
    }

    const type = String(t.type || "").toLowerCase();
    if (type && type !== "talent" && type !== "feature") {
      continue;
    }

    const docName = String(t.name || "").toLowerCase().trim();
    const docNameClean = normalizeTalentName(docName);
    const trackInfo = resolveTalentTrackInfo(t);
    let category = trackInfo.category;
    let rootName = trackInfo.rootName;
    let trackName = trackInfo.trackName;
    let isEntry = trackInfo.isEntry;

    rootName = rootName
      .replace(/^\d+[\.\s:_-]*/, "")
      .replace(/^chapter\s*\d+[\s:_-]*/i, "")
      .replace(/\s+stack$/i, "")
      .replace(/\s+track$/i, "")
      .replace(/\s+talents$/i, "")
      .trim() || "General";

    trackName = trackName
      .replace(/^\d+[\.\s:_-]*/, "")
      .replace(/^chapter\s*\d+[\s:_-]*/i, "")
      .replace(/\s+stack$/i, "")
      .replace(/\s+track$/i, "")
      .replace(/\s+talents$/i, "")
      .trim() || "General";

    const rootKey = `${category}:${rootName}`.toLowerCase();
    if (!rootTreeMap.has(rootKey)) {
      rootTreeMap.set(rootKey, {
        id: rootKey,
        title: rootName,
        category,
        entryTalents: [],
        trackGroups: new Map(),
      });
    }

    const rootObj = rootTreeMap.get(rootKey);
    const isMagicEntryDoc = category === "magic" && (parseTalentData(t).isMagicEntry || Boolean(MAGIC_ENTRY_BY_NAME[docName]) || Boolean(MAGIC_ENTRY_BY_NAME[docNameClean]));
    if (isEntry || isMagicEntryDoc || /entry\b/i.test(t.name) || (/class\b/i.test(t.name) && category === "class" && trackName.includes("Entry"))) {
      rootObj.entryTalents.push(t);
    } else {
      const trackKey = trackName.toLowerCase();
      if (!rootObj.trackGroups.has(trackKey)) {
        rootObj.trackGroups.set(trackKey, {
          trackName,
          talents: [],
        });
      }
      rootObj.trackGroups.get(trackKey).talents.push(t);
    }
  }

  function createNode(t) {
    const parsed = parseTalentData(t);
    const id = t.id || t._id || t.name;
    const name = t.name.trim();
    const norm = normalizeTalentName(name);
    const arabic = norm.replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, (m) => {
      const rMap = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
      return rMap[m] || m;
    });
    const isOwned = ownedNames.has(name.toLowerCase().trim()) || ownedNames.has(norm) || ownedNames.has(arabic);
    const availability = checkTalentAvailability(t, actorTalents, { effectiveLevel });

    return {
      id,
      item: t,
      name,
      img: resolveItemIcon(t, t.img, "talent"),
      description: t.system?.description?.value ?? t.system?.description ?? "",
      prerequisites: parsed.prerequisites,
      incompatibilities: parsed.incompatibilities,
      isOwned,
      isAvailable: availability.isAvailable,
      missingPrereqs: availability.missingPrereqs,
      prereqTooltip: availability.prereqTooltip,
      children: [],
      parents: [],
      tier: 1,
    };
  }

  const rootTrees = [];
  for (const root of rootTreeMap.values()) {
    const entryNodes = root.entryTalents.map(createNode);
    const tracks = [];

    for (const group of root.trackGroups.values()) {
      const nodeMap = new Map();
      for (const t of group.talents) {
        const node = createNode(t);
        nodeMap.set(node.name.toLowerCase(), node);
      }

      for (const node of nodeMap.values()) {
        for (const prereq of node.prerequisites) {
          const pNode = nodeMap.get(prereq.toLowerCase().trim());
          if (pNode && pNode !== node) {
            pNode.children.push(node);
            node.parents.push(pNode);
          }
        }
      }

      function computeTier(node, visited = new Set()) {
        if (visited.has(node.id)) return node.tier;
        visited.add(node.id);
        if (node.parents.length === 0) {
          node.tier = 1;
        } else {
          let maxParentTier = 0;
          for (const p of node.parents) {
            maxParentTier = Math.max(maxParentTier, computeTier(p, visited));
          }
          node.tier = maxParentTier + 1;
        }
        if (/\bIII\b/i.test(node.name)) node.tier = Math.max(node.tier, 3);
        else if (/\bII\b/i.test(node.name)) node.tier = Math.max(node.tier, 2);
        return node.tier;
      }

      for (const node of nodeMap.values()) {
        computeTier(node);
        node.parentNames = node.parents.map(p => p.name);
        node.hasParents = node.parents.length > 0;
        node.hasChildren = node.children.length > 0;
      }

      const allNodes = Array.from(nodeMap.values());
      const isStarted = allNodes.some(n => n.isOwned);

      const tierMap = new Map();
      for (const n of allNodes) {
        const tNum = n.tier || 1;
        if (!tierMap.has(tNum)) tierMap.set(tNum, []);
        tierMap.get(tNum).push(n);
      }

      const tiers = Array.from(tierMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([tierNumber, nodes]) => ({
          tierNumber,
          label: `Tier ${tierNumber}`,
          nodes: nodes.sort((a, b) => a.name.localeCompare(b.name)),
        }));

      const subclassName = group.trackName.replace(/ track$/i, "").replace(/ stack$/i, "").trim();
      const trackTitle = `${subclassName.toUpperCase()} TRACK`;
      tracks.push({
        trackTitle,
        subclassName,
        category: root.category,
        rootTitle: root.title,
        entryNode: tiers[0]?.nodes?.[0] || null,
        nodes: allNodes,
        tiers,
        isStarted,
      });
    }

    const allRootNodes = [...entryNodes, ...tracks.flatMap(tr => tr.nodes)];
    const isRootStarted = allRootNodes.some(n => n.isOwned);
    const categorySuffix = root.category === "class" ? "CLASS" : root.category === "magic" ? "MAGIC" : "SPECIALIZATION";

    rootTrees.push({
      id: root.id,
      title: root.title,
      displayTitle: `${root.title.toUpperCase()} ${categorySuffix}`,
      category: root.category,
      entryTalents: entryNodes,
      tracks: tracks.sort((a, b) => a.trackTitle.localeCompare(b.trackTitle)),
      nodes: allRootNodes,
      isStarted: isRootStarted,
    });
  }

  return rootTrees.sort((a, b) => a.title.localeCompare(b.title));
}
