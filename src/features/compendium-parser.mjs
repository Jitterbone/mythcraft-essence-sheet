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
 * Safely loads all documents from an array of compendiums.
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
 * @returns {{ skillPoints: number, perSkillCap: number, eligibleSkills: Array<string>, startingWealth: { formula: string, average: number }, encouragedProfessions: { tag: string, bonusSkill: string, bonusValue: number, rawProfessionUuids: Array<string> } }}
 */
export function parseBackgroundData(item) {
  const desc = String(item?.system?.description?.value ?? item?.system?.description ?? "");

  // 1. Skill Points & Per-Skill Cap
  let skillPoints = 0;
  let perSkillCap = 4;

  const spMatch = desc.match(/gain\s*\+?(\d+)\s*skill\s*points?/i);
  if (spMatch) skillPoints = parseInt(spMatch[1], 10);

  const capMatch = desc.match(/put\s*up\s*to\s*\+?(\d+)\s*points?\s*into\s*any\s*individual\s*skill/i);
  if (capMatch) perSkillCap = parseInt(capMatch[1], 10);

  // 2. Eligible Skills List
  const eligibleSkills = [];
  const skillSectionMatch = desc.match(/(?:following\s*skills[:\.]?)([\s\S]*?)(?:Gain\s*\d+d|If\s*you\s*take|Tenure|$)/i);
  if (skillSectionMatch) {
    const lines = skillSectionMatch[1].split(/[\n\r]+/);
    for (const line of lines) {
      const clean = line.replace(/^[•\-\*]\s*/, "").trim();
      if (!clean) continue;
      const parts = clean.split(":");
      const rawList = parts.length > 1 ? parts[1] : parts[0];
      const skills = rawList.split(",").map(s => s.trim().replace(/\*$/, "").toLowerCase()).filter(Boolean);
      eligibleSkills.push(...skills);
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

  // 4. Encouraged Profession Tag & Bonus
  let encouragedTag = "";
  let encouragedBonusSkill = "";
  let encouragedBonusValue = 0;
  const encouragedMatch = desc.match(/if\s*you\s*take\s*a\s*profession\s*with\s*the\s*([a-zA-Z0-9_\-]+)\s*tag[,\s]*gain\s*\+?(\d+)\s*([a-zA-Z\s]+?)\./i);
  if (encouragedMatch) {
    encouragedTag = encouragedMatch[1].trim().toLowerCase();
    encouragedBonusValue = parseInt(encouragedMatch[2], 10);
    encouragedBonusSkill = encouragedMatch[3].trim();
  }

  const uuidMatches = [...desc.matchAll(/@UUID\[([^\]]+)\]\{([^}]+)\}/gi)].map(m => ({
    uuid: m[1],
    name: m[2],
  }));

  return {
    skillPoints,
    perSkillCap,
    eligibleSkills: Array.from(new Set(eligibleSkills)),
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
  const desc = String(item?.system?.description?.value ?? item?.system?.description ?? "");

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
      const skills = rawList.split(",").map(s => s.trim().replace(/\*$/, "").toLowerCase()).filter(Boolean);
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

  return {
    startingGear,
    fixedSkills,
    choiceSkills: {
      count: choiceCount,
      value: choiceValue,
      options: Array.from(new Set(choiceOptions)),
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
  const desc = String(item?.system?.description?.value ?? item?.system?.description ?? "");

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

  const spMatch = desc.match(/(?:gain|grants?)\s*\+?(\d+)\s*(?:spell\s*points?|sp)/i);
  if (spMatch) spBonus = parseInt(spMatch[1], 10);

  const powerMatch = desc.match(/(?:gain|grants?)\s*\+?(\d+)\s*([a-zA-Z]+)\s*power/i);
  if (powerMatch) {
    magicPowerBonus = parseInt(powerMatch[1], 10);
    magicStackTag = powerMatch[2].toLowerCase();
  }

  const attrMatch = desc.match(/magic\s*attribute\s*is\s*([a-zA-Z]+)/i);
  if (attrMatch) magicAttribute = attrMatch[1].toLowerCase();

  const extraTalentsMatch = desc.match(/gain\s*(two|three|four|\d+)\s*talents?\s*from\s*the\s*([a-zA-Z\s]+)\s*stack/i);
  if (extraTalentsMatch) {
    const wordMap = { two: 2, three: 3, four: 4 };
    extraStackTalents = wordMap[extraTalentsMatch[1].toLowerCase()] || parseInt(extraTalentsMatch[1], 10) || 2;
    magicStackTag = extraTalentsMatch[2].trim().toLowerCase();
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
 * @returns {{ isAvailable: boolean, missingPrereqs: Array<string>, conflictingTalents: Array<string> }}
 */
export function checkTalentAvailability(talent, actorTalents = []) {
  const data = parseTalentData(talent);
  const ownedNames = new Set(
    actorTalents.map(t => (typeof t === "string" ? t : t.name).toLowerCase().trim())
  );

  const missingPrereqs = [];
  for (const p of data.prerequisites) {
    const clean = p.toLowerCase().trim();
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

  return {
    isAvailable: missingPrereqs.length === 0 && conflictingTalents.length === 0,
    missingPrereqs,
    conflictingTalents,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 *  Talent Tree Graph Builder
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Builds connected talent trees from a list of talent items and actor's owned talents.
 * @param {Array<Item>} talentsList - All available talents in compendium/folder
 * @param {Array<Item|string>} [actorTalents=[]] - Owned talents on actor
 * @returns {Array<{ root: object, nodes: Array<object>, isStarted: boolean }>}
 */
export function buildTalentTrees(talentsList = [], actorTalents = []) {
  const ownedNames = new Set(
    actorTalents.map(t => (typeof t === "string" ? t : t.name).toLowerCase().trim())
  );

  const nodeMap = new Map();

  for (const t of talentsList) {
    const parsed = parseTalentData(t);
    const id = t.id || t._id || t.name;
    const name = t.name;
    const isOwned = ownedNames.has(name.toLowerCase().trim());
    const availability = checkTalentAvailability(t, actorTalents);

    nodeMap.set(name.toLowerCase().trim(), {
      id,
      item: t,
      name,
      img: t.img,
      prerequisites: parsed.prerequisites,
      incompatibilities: parsed.incompatibilities,
      isOwned,
      isAvailable: availability.isAvailable,
      missingPrereqs: availability.missingPrereqs,
      children: [],
      parents: [],
    });
  }

  // Connect edges
  for (const node of nodeMap.values()) {
    for (const prereqName of node.prerequisites) {
      const parentNode = nodeMap.get(prereqName.toLowerCase().trim());
      if (parentNode) {
        parentNode.children.push(node);
        node.parents.push(parentNode);
      }
    }
  }

  // Group by roots (nodes with 0 parents)
  const trees = [];
  for (const node of nodeMap.values()) {
    if (node.parents.length === 0) {
      const treeNodes = [];
      const visited = new Set();
      const queue = [node];

      let isStarted = false;

      while (queue.length > 0) {
        const curr = queue.shift();
        if (visited.has(curr.id)) continue;
        visited.add(curr.id);
        treeNodes.push(curr);

        if (curr.isOwned) isStarted = true;

        for (const child of curr.children) {
          queue.push(child);
        }
      }

      trees.push({
        root: node,
        nodes: treeNodes,
        isStarted,
      });
    }
  }

  return trees;
}
