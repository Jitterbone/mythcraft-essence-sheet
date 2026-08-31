/**
 * mythcraft-essence-sheet | src/features/compendium-parser.mjs
 *
 * Compendium Discovery, Intelligent Text Parsing, Prerequisite Validation,
 * and Talent Tree Builder for Character Creation and Level-Up Progression.
 */

/**
 * Recognized compendium titles and package IDs for official MythCraft content.
 */
export const OFFICIAL_PACK_NAMES = {
  lineages: ["lineages", "chapter-1-lineages", "lineage"],
  bops: ["bops", "chapter-2-bops", "backgrounds-and-professions", "backgrounds", "professions"],
  classes: ["classes", "chapter-3-classes", "class-talents"],
  magic: ["magic", "chapter-4-magic", "magic-talents", "spells", "cantrips"],
  specTalents: ["spec-talents", "specialization-talents", "chapter-5-specialization-talents"],
  equipment: ["equipment", "chapter-6-equipment", "items", "gear"],
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

  for (const pack of game.packs.values()) {
    if (pack.documentName !== "Item") continue;

    const packId = (pack.metadata?.id || pack.collection || "").toLowerCase();
    const packTitle = (pack.metadata?.label || pack.title || "").toLowerCase();

    grouped.all.push(pack);

    if (OFFICIAL_PACK_NAMES.lineages.some(k => packId.includes(k) || packTitle.includes(k))) {
      grouped.lineages.push(pack);
    } else if (OFFICIAL_PACK_NAMES.bops.some(k => packId.includes(k) || packTitle.includes(k))) {
      grouped.bops.push(pack);
    } else if (OFFICIAL_PACK_NAMES.classes.some(k => packId.includes(k) || packTitle.includes(k))) {
      grouped.classes.push(pack);
    } else if (OFFICIAL_PACK_NAMES.magic.some(k => packId.includes(k) || packTitle.includes(k))) {
      grouped.magic.push(pack);
    } else if (OFFICIAL_PACK_NAMES.specTalents.some(k => packId.includes(k) || packTitle.includes(k))) {
      grouped.specTalents.push(pack);
    } else if (OFFICIAL_PACK_NAMES.equipment.some(k => packId.includes(k) || packTitle.includes(k))) {
      grouped.equipment.push(pack);
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
  const chain = [];
  if (!doc) return chain;

  let folderId = typeof doc.folder === "string" ? doc.folder : (doc.folder?.id || doc.folder?._id);
  const folderObj = typeof doc.folder === "object" ? doc.folder : null;

  if (folderObj?.name) {
    let curr = folderObj;
    while (curr) {
      if (curr.name) chain.unshift(curr.name.trim());
      curr = curr.parent || (pack?.folders ? pack.folders.get(curr.folder) : null);
    }
    return chain;
  }

  // Lookup in pack.folders or game.folders
  const folderCollection = pack?.folders || (doc.pack && globalThis.game?.packs?.get(doc.pack)?.folders) || globalThis.game?.folders;
  while (folderId && folderCollection) {
    const f = folderCollection.get(folderId);
    if (!f) break;
    if (f.name) chain.unshift(f.name.trim());
    folderId = f.folder || f.parent?.id || f._source?.folder;
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

  for (const pack of packs) {
    try {
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        if (filter.type && doc.type !== filter.type) continue;
        doc._folderChain = getDocumentFolderChain(doc, pack);
        doc._compendiumPack = pack;
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

  // 1. Skill Points & Per-Skill Cap
  let skillPoints = 12; // Standard default
  let perSkillCap = 4;

  const spMatch = desc.match(/gain\s*\+?(\d+)\s*skill\s*points?/i);
  if (spMatch) skillPoints = parseInt(spMatch[1], 10);

  const capMatch = desc.match(/put\s*up\s*to\s*\+?(\d+)\s*points?\s*into\s*any\s*individual\s*skill/i);
  if (capMatch) perSkillCap = parseInt(capMatch[1], 10);

  // 2. Eligible Skills List & Categories
  const eligibleSkills = [];
  const skillCategories = [];

  const skillSectionMatch = desc.match(/(?:following\s*skills[:\.]?)([\s\S]*?)(?:Gain\s*\d|If\s*you\s*take|Professions\s*with|Tenure|Starting\s*Wealth|$)/i);
  if (skillSectionMatch) {
    const lines = skillSectionMatch[1].split(/[\n\r]+/);
    for (const line of lines) {
      const clean = line.replace(/^[•\-\*]\s*/, "").trim();
      if (!clean) continue;
      // Skip lines that look like wealth or rules
      if (/^(gain\s*\d|if\s*you\s*take|professions\s*with|tenure|starting\s*wealth)/i.test(clean)) continue;

      const parts = clean.split(":");
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
        // Only accept if line is a comma-separated list of short skill names, not a full sentence
        if (!/(?:with\s*this|you\s*may|put\s*up|points?\s*into|spend\s*on)/i.test(clean)) {
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

  // 3. Starting Wealth
  let wealthFormula = "5d20*2";
  let wealthAverage = 104;
  const wealthMatch = desc.match(/gain\s*([0-9d\*\+\-\s]+)\s*sc\s*\(or\s*take\s*the\s*average[,\s]*(\d+)\s*sc\)/i);
  if (wealthMatch) {
    wealthFormula = wealthMatch[1].trim();
    wealthAverage = parseInt(wealthMatch[2], 10);
  }

  // 4. Encouraged Profession Tag & Bonus Parsing
  let encouragedTag = "";
  let encouragedBonusSkill = "";
  let encouragedBonusValue = 0;

  const rawDesc = String(item?.system?.description?.value ?? item?.system?.description ?? "");
  const clean = descriptionText(item);

  // Tag extraction (e.g. "with the sacred tag", "profession with the militant tag", "religious tag")
  const tagMatch = clean.match(/(?:professions?\s*with\s*the|with\s*the|taking\s*a\s*profession\s*with\s*the)\s*([a-zA-Z0-9_\-]+)\s*tag/i)
    || clean.match(/tag[:\s]+([a-zA-Z0-9_\-]+)/i);
  if (tagMatch) {
    encouragedTag = tagMatch[1].trim().toLowerCase();
  }

  // Bonus extraction (e.g. "gain +2 Religion", "you gain +2 to Religion", "gain 2 points in Medicine", "gain +2 to your Forced March skill")
  const bonusMatch = clean.match(/(?:gain|receive)\s*(?:\+)?(\d+)\s*(?:points?\s*(?:in|to)?|to|in)?\s*([a-zA-Z\s]+?)(?:\s*skill|\s*\(|\.|\n|$)/i)
    || clean.match(/\+(\d+)\s*([a-zA-Z\s]+?)(?:\s*skill|\.|\n|$)/i);

  if (bonusMatch) {
    const candidateVal = parseInt(bonusMatch[1], 10);
    const candidateSkill = bonusMatch[2].replace(/attribute|point|wealth|sc|silver/gi, "").trim();
    if (candidateVal > 0 && candidateSkill && candidateSkill.length < 35) {
      encouragedBonusValue = candidateVal;
      encouragedBonusSkill = candidateSkill;
    }
  }

  // Fallback: If background mentions professions or tags, ensure standard +2 bonus value
  if (!encouragedBonusValue && (encouragedTag || rawDesc.includes("@UUID") || clean.toLowerCase().includes("profession"))) {
    encouragedBonusValue = 2;
    // Try to find the associated skill
    const knownSkills = ["Religion", "Medicine", "Insight", "Investigation", "Persuasion", "Deception", "History", "Arcana", "Athletics", "Stealth", "Perception", "Awareness", "Survival", "Forced March", "Intimidation", "Streetwise", "Performance", "Crafting"];
    for (const sk of knownSkills) {
      if (clean.toLowerCase().includes(sk.toLowerCase())) {
        encouragedBonusSkill = sk;
        break;
      }
    }
    if (!encouragedBonusSkill) encouragedBonusSkill = "Synergy Skill";
  }

  const uuidMatches = [...rawDesc.matchAll(/@UUID\[([^\]]+)\](?:\{([^}]+)\})?/gi)].map(m => ({
    uuid: m[1],
    name: (m[2] || "").trim(),
  }));

  return {
    skillPoints,
    perSkillCap,
    eligibleSkills: Array.from(new Set(eligibleSkills)),
    skillCategories,
    startingWealth: {
      formula: wealthFormula,
      average: wealthAverage,
    },
    encouragedProfessions: {
      tag: encouragedTag,
      bonusSkill: encouragedBonusSkill,
      bonusValue: encouragedBonusValue,
      rawProfessionUuids: uuidMatches,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Text Parsing: Professions, Gear, Skills & Tenure
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Parses profession items for starting gear, skills, and tenure rank items.
 * @param {Item} item
 * @returns {{ startingGear: Array<{ name: string, quantity: number, raw: string }>, fixedSkills: Array<{ name: string, value: number }>, choiceSkills: { count: number, value: number, options: Array<string> }, tenureUuids: Array<{ uuid: string, label: string, rank: number }> }}
 */
export function parseProfessionData(item) {
  const desc = descriptionText(item);

  // 1. Starting Gear List
  const startingGear = [];
  const gearMatch = desc.match(/gain\s*the\s*following\s*gear[^:]*:\s*([\s\S]*?)(?:Each\s*time|Tenure|When\s*you\s*become|$)/i);
  if (gearMatch) {
    const rawItems = gearMatch[1].split(/[\n\r,]+/).map(s => s.trim()).filter(Boolean);
    for (const raw of rawItems) {
      const qtyMatch = raw.match(/^([^\(]+)\s*\(\s*(\d+)\s*\)$/);
      if (qtyMatch) {
        startingGear.push({
          name: qtyMatch[1].trim(),
          quantity: parseInt(qtyMatch[2], 10),
          raw,
        });
      } else {
        startingGear.push({
          name: raw,
          quantity: 1,
          raw,
        });
      }
    }
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
 *  Text Parsing: Talents, Prerequisites & Incompatibilities
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Parses talent items for prerequisites, incompatibilities, Magic Power, SP, and extra stack talents.
 * @param {Item} item
 * @returns {{ prerequisites: Array<string>, incompatibilities: Array<string>, isMagicEntry: boolean, spBonus: number, magicPowerBonus: number, magicAttribute: string, extraStackTalents: number, magicStackTag: string }}
 */
export function parseTalentData(item) {
  const desc = descriptionText(item);

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
  const isMagicEntry = /fundamental\s*wellspring|achieved\s*attunation|first\s*magic\s*entry\s*talent/i.test(desc);
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

  const attrMatch = desc.match(/magic\s*attribute\s*is\s*([a-zA-Z]+)/i);
  if (attrMatch) magicAttribute = attrMatch[1].toLowerCase();

  const extraTalentsMatch = desc.match(/gain\s*(two|three|four|\d+)\s*talents?\s*from\s*the\s*([a-zA-Z\s]+)\s*stack/i);
  if (extraTalentsMatch) {
    const wordMap = { two: 2, three: 3, four: 4 };
    extraStackTalents = wordMap[extraTalentsMatch[1].toLowerCase()] || parseInt(extraTalentsMatch[1], 10) || 2;
    magicStackTag = extraTalentsMatch[2].replace(/\s*magic\s*$/i, "").trim().toLowerCase();
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
  const ownedNames = new Set(
    actorTalents.map(t => (typeof t === "string" ? t : t.name).toLowerCase().trim())
  );

  const missingPrereqs = [];
  for (const p of data.prerequisites) {
    const clean = p.toLowerCase().trim();

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

    if (!ownedNames.has(clean)) {
      missingPrereqs.push(p);
    }
  }

  const conflictingTalents = [];
  for (const inc of data.incompatibilities) {
    const clean = inc.toLowerCase().trim();
    if (ownedNames.has(clean)) {
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
 * Resolves starting features and eligible unique features for a chosen lineage.
 * Uses folder chains, description UUIDs, item name matching, and fallback discovery.
 * @param {Item} selectedLineage
 * @param {Array<Item>} allLineageDocs
 * @returns {{ startingFeatures: Array<Item>, uniqueFeatures: Array<Item> }}
 */
export function resolveLineageFeatures(selectedLineage, allLineageDocs = []) {
  if (!selectedLineage) return { startingFeatures: [], uniqueFeatures: [] };

  const rawDesc = String(selectedLineage.system?.description?.value ?? selectedLineage.system?.description ?? "");
  const baseName = selectedLineage.name.replace(/lineage/i, "").trim().toLowerCase();

  // 1. Extract referenced UUIDs or item names from the description
  const referencedIds = new Set();
  const referencedNames = new Set();

  const uuidMatches = rawDesc.matchAll(/@UUID\[(?:Compendium\.[^\]]+\.)?(?:Item\.)?([^\]]+)\](?:\{([^}]+)\})?/gi);
  for (const m of uuidMatches) {
    if (m[1]) referencedIds.add(m[1].toLowerCase());
    if (m[2]) referencedNames.add(m[2].toLowerCase().trim());
  }

  // 2. Classify documents strictly by lineage affiliation
  const startingFeatures = [];
  const uniqueFeatures = [];
  const candidates = allLineageDocs.filter(d => d.id !== selectedLineage.id);

  for (const doc of candidates) {
    const chain = (doc._folderChain || getDocumentFolderChain(doc)).map(f => f.toLowerCase().trim());
    const docName = doc.name.toLowerCase().trim();
    const docId = (doc.id || doc._id || "").toLowerCase();

    // The feature MUST belong to this specific lineage by folder or description reference
    const belongsToThisLineage = chain.some(f => f.includes(baseName)) || docName.includes(baseName) || referencedIds.has(docId) || referencedNames.has(docName);
    if (!belongsToThisLineage) continue;

    // Check if it's explicitly a starting feature
    const isStartingFolder = chain.some(f => f.includes("starting features") || f.endsWith("starting features"));
    const isExplicitlyReferencedStarting = referencedIds.has(docId) || referencedNames.has(docName);

    if (isStartingFolder || isExplicitlyReferencedStarting) {
      if (!startingFeatures.some(s => s.id === doc.id || s.name.toLowerCase().trim() === docName)) {
        startingFeatures.push(doc);
      }
    } else {
      if (!uniqueFeatures.some(u => u.id === doc.id || u.name.toLowerCase().trim() === docName)) {
        uniqueFeatures.push(doc);
      }
    }
  }

  return { startingFeatures, uniqueFeatures };
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
    stackMap.get(key).talents.push(talent);
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
export function buildTalentTrees(talentsList = [], actorTalents = [], { effectiveLevel = null } = {}) {
  const ownedNames = new Set(
    actorTalents.map(t => (typeof t === "string" ? t : t.name).toLowerCase().trim())
  );

  // 1. Group talents into tracks based on compendium folder structure / stack / category
  const trackGroups = new Map();

  for (const t of talentsList) {
    const chain = t._folderChain || getDocumentFolderChain(t);
    let trackName = "";

    let className = "";
    // If folder chain has folders, use the most specific folder
    if (chain.length > 0) {
      const filtered = chain.filter(f => !/^(class|specialization|magic|talents|features|compendium)s?$/i.test(f.trim()));
      if (filtered.length > 0) {
        trackName = filtered[filtered.length - 1];
        if (filtered.length >= 2) {
          className = filtered[filtered.length - 2];
        }
      } else {
        trackName = chain[chain.length - 1];
      }
    }

    if (!trackName && t.system?.category) {
      trackName = String(t.system.category);
    }

    if (!trackName) {
      const baseStem = t.name.replace(/\s+(I{1,3}|IV|V|VI|VII|VIII|IX|X|\d+)\b/i, "").trim();
      trackName = baseStem;
    }

    // Clean up trackName formatting
    trackName = trackName.replace(/\s+stack$/i, "").replace(/\s+track$/i, "").replace(/\s+talents$/i, "").trim();
    if (!trackName) trackName = "General";

    const key = trackName.toLowerCase();
    if (!trackGroups.has(key)) {
      trackGroups.set(key, {
        rawName: trackName,
        className,
        category: t._compCategory || "specialization",
        talents: [],
      });
    }
    trackGroups.get(key).talents.push(t);
  }

  // 2. Build structured tree graph for each track group
  const trees = [];

  for (const group of trackGroups.values()) {
    const nodeMap = new Map();

    for (const t of group.talents) {
      const parsed = parseTalentData(t);
      const id = t.id || t._id || t.name;
      const name = t.name.trim();
      const isOwned = ownedNames.has(name.toLowerCase());
      const availability = checkTalentAvailability(t, actorTalents, { effectiveLevel });

      nodeMap.set(name.toLowerCase(), {
        id,
        item: t,
        name,
        img: t.img || "icons/svg/aura.svg",
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
      });
    }

    // Connect parent-child links within the track
    for (const node of nodeMap.values()) {
      for (const prereq of node.prerequisites) {
        const parentNode = nodeMap.get(prereq.toLowerCase().trim());
        if (parentNode && parentNode !== node) {
          parentNode.children.push(node);
          node.parents.push(parentNode);
        }
      }

      // Also check name-based roman numeral parent (e.g. "Clown II" requires "Clown")
      if (node.parents.length === 0) {
        const baseNameMatch = node.name.match(/^(.*?)\s+(II|III|IV|V|\d+)$/i);
        if (baseNameMatch) {
          const prevName = baseNameMatch[1].toLowerCase().trim();
          const parentNode = nodeMap.get(prevName);
          if (parentNode && parentNode !== node) {
            parentNode.children.push(node);
            node.parents.push(parentNode);
          }
        }
      }
    }

    // Compute tier/depth within track
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

      // Name-based tier heuristic (e.g. III => tier 3+, II => tier 2+)
      if (/\bIII\b/i.test(node.name)) node.tier = Math.max(node.tier, 3);
      else if (/\bII\b/i.test(node.name)) node.tier = Math.max(node.tier, 2);

      return node.tier;
    }

    for (const node of nodeMap.values()) {
      computeTier(node);
    }

    const allNodes = Array.from(nodeMap.values());
    const isStarted = allNodes.some(n => n.isOwned);

    // Group into Tiers
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
        nodes,
      }));

    const trackTitle = `${group.rawName.toUpperCase()} TRACK`;
    const rootNode = allNodes.find(n => n.parents.length === 0) || allNodes[0];

    trees.push({
      trackTitle,
      className: group.className || "",
      category: group.category,
      root: rootNode,
      nodes: allNodes,
      tiers,
      isStarted,
    });
  }

  return trees.sort((a, b) => a.trackTitle.localeCompare(b.trackTitle));
}
