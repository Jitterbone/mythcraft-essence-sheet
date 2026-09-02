// Complete canonical tracks for all 13 MythCraft classes
export const CANONICAL_CLASS_SUBCLASSES = {
  "Berzerker": ["Exile", "Fearless", "Juggernaut", "Rage", "Branded", "Berzerker Entry"],
  "Cleric": ["Exorcist", "Piety", "Support", "Theologian", "Divine Icon", "Mythological Domain", "Cleric Entry"],
  "Mage": ["Arcane Weaving", "Archmage", "Sorcery", "Tome Wizard", "Occultism", "Mage Entry"],
  "Oracle": ["Fate", "Prophecy", "Seer", "Medium", "Augury", "Time", "Oracle Entry"],
  "Pugilist": ["Brawler", "Drunken Master", "Grappler", "Iron Fist", "Martial Artist", "Street Fighter", "Pugilist Entry"],
  "Ranger": ["Beast Master", "Hunter", "Scout", "Warden", "Trapper", "Horizon Walker", "Ranger Entry"],
  "Rogue": ["Assassin", "Thief", "Shadow", "Swashbuckler", "Infiltrator", "Cutpurse", "Rogue Entry"],
  "Tinkerer": ["Artificer", "Alchemist", "Gunsmith", "Clockwork", "Engineer", "Gadgeteer", "Tinkerer Entry"],
  "Troubadour": ["Bard", "Jester", "Minstrel", "Skald", "Virtuoso", "Chanter", "Troubadour Entry"],
  "Vessel": ["Avatar", "Channeler", "Conduit", "Host", "Medium", "Relic", "Vessel Entry"],
  "Warrior": ["Champion", "Commander", "Duelist", "Gladiator", "Knight", "Tactician", "Defender", "Weapon Master", "Warrior Entry"],
  "Witch": ["Coven", "Curse", "Hex", "Potion", "Familiar", "Blood Witch", "Witch Entry"],
  "Zealot": ["Crusader", "Fanatic", "Inquisitor", "Templar", "Vindicator", "Avenger", "Zealot Entry"],
};

export const CANONICAL_MAGIC_DISCIPLINES = {
  "Arcane": ["Evoking", "Altering", "Enchanting", "Illusory", "Necromancy", "Divining", "Warding", "Summoning", "Alchemy", "Metamagic", "Arcane Entry", "Arcane Magic"],
  "Divine": ["Healing", "Radiance", "Blessing", "Holy", "Smiting", "Exorcism", "Warding", "Restoration", "Divine Entry", "Divine Magic"],
  "Occult": ["Curses", "Blood Magic", "Shadow", "Hexes", "Nether", "Void", "Dark", "Occult Entry", "Occult Magic"],
  "Primal": ["Elemental", "Nature", "Beast", "Storm", "Earth", "Fire", "Water", "Wind", "Primal Entry", "Primal Magic"],
  "Psionic": ["Telepathy", "Telekinesis", "Clairsentience", "Psychometabolism", "Psychoportation", "Psionic Entry", "Psionic Magic"],
};

export const CANONICAL_SPEC_STACKS = {
  "Combat Stack": ["Combat", "Melee", "Ranged", "Unarmed", "Martial Arts", "Weapon Mastery", "Maneuvers"],
  "Command Stack": ["Command", "Leadership", "Tactics", "Rally", "Strategy", "Inspiration", "Orders", "Formation"],
  "Defense Stack": ["Defense", "Armor", "Shield", "Resilience", "Resistance", "Toughness", "Fortification", "Heavy Armor"],
  "Skill Stack": ["Skill", "Acrobatics", "Athleticism", "Crafting", "Influence", "Knowledge", "Observation", "Performance", "Stamina", "Subterfuge", "Survival", "Luck"],
};

export const MYTHCRAFT_CANONICAL_CLASSES = Object.keys(CANONICAL_CLASS_SUBCLASSES);
export const MYTHCRAFT_CANONICAL_SPECS = Object.keys(CANONICAL_SPEC_STACKS);
export const MYTHCRAFT_CANONICAL_MAGIC = Object.keys(CANONICAL_MAGIC_DISCIPLINES);

// Fast lowercase reverse lookups
export const SUBCLASS_TO_CLASS = {};
for (const [cls, tracks] of Object.entries(CANONICAL_CLASS_SUBCLASSES)) {
  for (const tr of tracks) {
    SUBCLASS_TO_CLASS[tr.toLowerCase()] = cls;
  }
}

export const DISCIPLINE_TO_MAGIC = {};
for (const [mag, tracks] of Object.entries(CANONICAL_MAGIC_DISCIPLINES)) {
  for (const tr of tracks) {
    DISCIPLINE_TO_MAGIC[tr.toLowerCase()] = mag;
  }
}

export const SUBTRACK_TO_SPEC = {};
for (const [spec, tracks] of Object.entries(CANONICAL_SPEC_STACKS)) {
  for (const tr of tracks) {
    SUBTRACK_TO_SPEC[tr.toLowerCase()] = spec;
  }
}

export function normalizeTalentName(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/["'“”‘’]/g, "")
    .replace(/[!.,;:?]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\(talent\)$/i, "")
    .replace(/\s*(track\s*)?talents?$/i, "")
    .replace(/\s*(track|stack)$/i, "")
    .trim();
}

/**
 * Checks if a document is NOT a valid talent (e.g. is a profession rank, lineage feature, background feature, spell, etc.)
 */
export function isDisallowedTalentItem(item) {
  if (!item) return true;
  if (item._customCategory) {
    const type = String(item.type || "").toLowerCase();
    if (["weapon", "armor", "gear", "consumable", "disease", "condition", "curse"].includes(type)) {
      return true;
    }
    return false;
  }
  const type = String(item.type || "").toLowerCase();
  if (["profession", "background", "lineage", "ancestry", "disease", "condition", "curse", "spell", "weapon", "armor", "gear", "consumable"].includes(type)) {
    return true;
  }
  const name = String(item.name || "").toLowerCase();
  if (/^rank\s*\d|\bprofession\b|:\s*rank\b|\btenure\b|\blineage\b|\bancestry\b|\bheritage\b|\bmilestone\b/i.test(name)) {
    return true;
  }
  const chain = (item._folderChain || []).map(f => String(f).toLowerCase());
  if (chain.some(f => /^(professions?|backgrounds?|lineages?|ancestrys?|heritages?|milestones?|diseases?|spells?|gear|items)$/i.test(f))) {
    return true;
  }
  return false;
}

export const CANONICAL_TRACK_PARENTS = {
  "berzerker entry": {
    "parent": "Berzerker",
    "track": "Berzerker Entry",
    "category": "class"
  },
  "exile": {
    "parent": "Berzerker",
    "track": "Exile",
    "category": "class"
  },
  "fearless": {
    "parent": "Berzerker",
    "track": "Fearless",
    "category": "class"
  },
  "juggernaut": {
    "parent": "Berzerker",
    "track": "Juggernaut",
    "category": "class"
  },
  "rage": {
    "parent": "Berzerker",
    "track": "Rage",
    "category": "class"
  },
  "branded": {
    "parent": "Berzerker",
    "track": "Branded",
    "category": "class"
  },
  "blood rage ii**this is the same as blood rage ii in the rage": {
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "category": "class"
  },
  "cleric entry": {
    "parent": "Cleric",
    "track": "Cleric Entry",
    "category": "class"
  },
  "exorcist": {
    "parent": "Cleric",
    "track": "Exorcist",
    "category": "class"
  },
  "piety": {
    "parent": "Cleric",
    "track": "Piety",
    "category": "class"
  },
  "support": {
    "parent": "Cleric",
    "track": "Support",
    "category": "class"
  },
  "theologian": {
    "parent": "Cleric",
    "track": "Theologian",
    "category": "class"
  },
  "divine icon": {
    "parent": "Cleric",
    "track": "Divine Icon",
    "category": "class"
  },
  "mythological domain": {
    "parent": "Cleric",
    "track": "Mythological Domain",
    "category": "class"
  },
  "mage entry": {
    "parent": "Mage",
    "track": "Mage Entry",
    "category": "class"
  },
  "arcane weaving": {
    "parent": "Mage",
    "track": "Arcane Weaving",
    "category": "class"
  },
  "archmage": {
    "parent": "Mage",
    "track": "Archmage",
    "category": "class"
  },
  "sorcery": {
    "parent": "Mage",
    "track": "Sorcery",
    "category": "class"
  },
  "tome wizard": {
    "parent": "Mage",
    "track": "Tome Wizard",
    "category": "class"
  },
  "occultism": {
    "parent": "Mage",
    "track": "Occultism",
    "category": "class"
  }
};

export const CANONICAL_TALENTS = {
  "berzerker entry": {
    "name": "Berzerker Entry",
    "parent": "Berzerker",
    "track": "Berzerker Entry",
    "isEntry": true,
    "category": "class"
  },
  "marked": {
    "name": "Marked",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "drunken fighter": {
    "name": "Drunken Fighter",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "throw anything": {
    "name": "Throw Anything",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "brutality": {
    "name": "Brutality",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "another swig": {
    "name": "Another Swig",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "drunken stagger": {
    "name": "Drunken Stagger",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "drunken fist": {
    "name": "Drunken Fist",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "hidden dagger": {
    "name": "Hidden Dagger",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "fighting dirty": {
    "name": "Fighting Dirty",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "brawling": {
    "name": "Brawling",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "beast companion": {
    "name": "Beast Companion",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "regain honor": {
    "name": "Regain Honor",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "companion boon": {
    "name": "Companion Boon",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "companion boon ii": {
    "name": "Companion Boon II",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "companion boon iii": {
    "name": "Companion Boon III",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "drunken resilience": {
    "name": "Drunken Resilience",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "steady fist": {
    "name": "Steady Fist",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "steady fist ii": {
    "name": "Steady Fist II",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "restored honor": {
    "name": "Restored Honor",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "defiance": {
    "name": "Defiance",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "throw anything ii": {
    "name": "Throw Anything II",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "hidden dagger ii": {
    "name": "Hidden Dagger II",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "drunken ferocity": {
    "name": "Drunken Ferocity",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "scrapping": {
    "name": "Scrapping",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "drag": {
    "name": "Drag",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "refresh": {
    "name": "Refresh",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "utterly independent": {
    "name": "Utterly Independent",
    "parent": "Berzerker",
    "track": "Exile",
    "isEntry": false,
    "category": "class"
  },
  "ferocious ii": {
    "name": "Ferocious II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "seeing red": {
    "name": "Seeing Red",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "blood will flow": {
    "name": "Blood Will Flow",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "stoic": {
    "name": "Stoic",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "unflappable": {
    "name": "Unflappable",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "ferocious iii": {
    "name": "Ferocious III",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "seeing red ii": {
    "name": "Seeing Red II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "blood will flow ii": {
    "name": "Blood Will Flow II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "frenzy": {
    "name": "Frenzy",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "stoic ii": {
    "name": "Stoic II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "unflappable ii": {
    "name": "Unflappable II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "never retreat": {
    "name": "Never Retreat",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "ferocious iv": {
    "name": "Ferocious IV",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "seeing red iii": {
    "name": "Seeing Red III",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "blood will flow iii": {
    "name": "Blood Will Flow III",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "frenzy ii": {
    "name": "Frenzy II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "stoic iii": {
    "name": "Stoic III",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "unflappable iii": {
    "name": "Unflappable III",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "never retreat ii": {
    "name": "Never Retreat II",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "ferocious v": {
    "name": "Ferocious V",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "horrifying frenzy": {
    "name": "Horrifying Frenzy",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "savage frenzy": {
    "name": "Savage Frenzy",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "stoic iv": {
    "name": "Stoic IV",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "never retreat iii": {
    "name": "Never Retreat III",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "unstoppable ferocity": {
    "name": "Unstoppable Ferocity",
    "parent": "Berzerker",
    "track": "Fearless",
    "isEntry": false,
    "category": "class"
  },
  "juggernaut": {
    "name": "Juggernaut",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "hardy": {
    "name": "Hardy",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "elemental inurement": {
    "name": "Elemental Inurement",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "ardent assault": {
    "name": "Ardent Assault",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "staunch resistance": {
    "name": "Staunch Resistance",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "shrug it off": {
    "name": "Shrug It Off",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "endure": {
    "name": "Endure",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "juggernaut ii": {
    "name": "Juggernaut II",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "juggernaut iii": {
    "name": "Juggernaut III",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "energy inurement": {
    "name": "Energy Inurement",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "citadel of stamina": {
    "name": "Citadel of Stamina",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "staunch resistance ii": {
    "name": "Staunch Resistance II",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "battle-ready": {
    "name": "Battle-Ready",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "endure ii": {
    "name": "Endure II",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "hardy ii": {
    "name": "Hardy II",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "ardent assault ii": {
    "name": "Ardent Assault II",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "shrug it off ii": {
    "name": "Shrug It Off II",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "endure iii": {
    "name": "Endure III",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "juggernaut iv": {
    "name": "Juggernaut IV",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "unstoppable juggernaut": {
    "name": "Unstoppable Juggernaut",
    "parent": "Berzerker",
    "track": "Juggernaut",
    "isEntry": false,
    "category": "class"
  },
  "blood rage ii": {
    "name": "Blood Rage II",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "furious blows": {
    "name": "Furious Blows",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "furious blows ii": {
    "name": "Furious Blows II",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death defier": {
    "name": "Death Defier",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death drop": {
    "name": "Death Drop",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rage iii": {
    "name": "Blood Rage III",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rage iv": {
    "name": "Blood Rage IV",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "bloodlust": {
    "name": "Bloodlust",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "furious smash": {
    "name": "Furious Smash",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death drop ii": {
    "name": "Death Drop II",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death defier ii": {
    "name": "Death Defier II",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rage v": {
    "name": "Blood Rage V",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rage vi": {
    "name": "Blood Rage VI",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "bloodlust ii": {
    "name": "Bloodlust II",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "furious smash ii": {
    "name": "Furious Smash II",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "bloodlust iii": {
    "name": "Bloodlust III",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death defier iii": {
    "name": "Death Defier III",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death defier iv": {
    "name": "Death Defier IV",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "death drop iii": {
    "name": "Death Drop III",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rage vii": {
    "name": "Blood Rage VII",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rage viii": {
    "name": "Blood Rage VIII",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood rampage": {
    "name": "Blood Rampage",
    "parent": "Berzerker",
    "track": "Rage",
    "isEntry": false,
    "category": "class"
  },
  "eternal mark": {
    "name": "Eternal Mark",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "soul brand": {
    "name": "Soul Brand",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "soul brand ii": {
    "name": "Soul Brand II",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "spirit sight": {
    "name": "Spirit Sight",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "spirit sight ii": {
    "name": "Spirit Sight II",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "shademarked": {
    "name": "Shademarked",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood circle": {
    "name": "Blood Circle",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "burning brand": {
    "name": "Burning Brand",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "greatweapon": {
    "name": "Greatweapon",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "scourging resolve": {
    "name": "Scourging Resolve",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "supernatural brand": {
    "name": "Supernatural Brand",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "shademarked ii": {
    "name": "Shademarked II",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "soul brand iii": {
    "name": "Soul Brand III",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood circle ii": {
    "name": "Blood Circle II",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "spirit sight iii": {
    "name": "Spirit Sight III",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "greatweapon ii": {
    "name": "Greatweapon II",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "essence drink": {
    "name": "Essence Drink",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "blood circle iii": {
    "name": "Blood Circle III",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "greatweapon iii": {
    "name": "Greatweapon III",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "eternal mark ii": {
    "name": "Eternal Mark II",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "scouring shockwave": {
    "name": "Scouring Shockwave",
    "parent": "Berzerker",
    "track": "Blood Rage II**This is the same as Blood Rage II in the Rage",
    "isEntry": false,
    "category": "class"
  },
  "cleric entry": {
    "name": "Cleric Entry",
    "parent": "Cleric",
    "track": "Cleric Entry",
    "isEntry": true,
    "category": "class"
  },
  "sense planar": {
    "name": "Sense Planar",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "divine ward ii": {
    "name": "Divine Ward II",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "distant ward": {
    "name": "Distant Ward",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "divine shield": {
    "name": "Divine Shield",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "sense planar ii": {
    "name": "Sense Planar II",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "abjure unholy": {
    "name": "Abjure Unholy",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "distant ward ii": {
    "name": "Distant Ward II",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "divine shield ii": {
    "name": "Divine Shield II",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "divine ward iii": {
    "name": "Divine Ward III",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "expert exorcist": {
    "name": "Expert Exorcist",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "distant ward iii": {
    "name": "Distant Ward III",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "divine shield iii": {
    "name": "Divine Shield III",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "abjure unholy ii": {
    "name": "Abjure Unholy II",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "sense planar iii": {
    "name": "Sense Planar III",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "unholy scourge": {
    "name": "Unholy Scourge",
    "parent": "Cleric",
    "track": "Exorcist",
    "isEntry": false,
    "category": "class"
  },
  "healing hands": {
    "name": "Healing Hands",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "monastic horticulturist": {
    "name": "Monastic Horticulturist",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "holy touch": {
    "name": "Holy Touch",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "piety": {
    "name": "Piety",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "divine hands": {
    "name": "Divine Hands",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "wellspring of health": {
    "name": "Wellspring of Health",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "piety ii": {
    "name": "Piety II",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "monastic horticulturist ii": {
    "name": "Monastic Horticulturist II",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "piety iii": {
    "name": "Piety III",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "piety iv": {
    "name": "Piety IV",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "piety v": {
    "name": "Piety V",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "miracle worker": {
    "name": "Miracle Worker",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "battle medic": {
    "name": "Battle Medic",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "battle medic ii": {
    "name": "Battle Medic II",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "battle medic iii": {
    "name": "Battle Medic III",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "savior": {
    "name": "Savior",
    "parent": "Cleric",
    "track": "Piety",
    "isEntry": false,
    "category": "class"
  },
  "holy support": {
    "name": "Holy Support",
    "parent": "Cleric",
    "track": "Support",
    "isEntry": false,
    "category": "class"
  },
  "holy support ii": {
    "name": "Holy Support II",
    "parent": "Cleric",
    "track": "Support",
    "isEntry": false,
    "category": "class"
  },
  "holy support iii": {
    "name": "Holy Support III",
    "parent": "Cleric",
    "track": "Support",
    "isEntry": false,
    "category": "class"
  },
  "ardent": {
    "name": "Ardent",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "apocrypha": {
    "name": "Apocrypha",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scriptorium": {
    "name": "Scriptorium",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "iconographer": {
    "name": "Iconographer",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "iconographer ii": {
    "name": "Iconographer II",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scrivener": {
    "name": "Scrivener",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scrivener ii": {
    "name": "Scrivener II",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "apocrypha ii": {
    "name": "Apocrypha II",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scriptorium ii": {
    "name": "Scriptorium II",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scriptorium iii": {
    "name": "Scriptorium III",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "apprenticeship": {
    "name": "Apprenticeship",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "iconographer iii": {
    "name": "Iconographer III",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "iconographer iv": {
    "name": "Iconographer IV",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "sola scriptura": {
    "name": "Sola Scriptura",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scrivener iii": {
    "name": "Scrivener III",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scrivener iv": {
    "name": "Scrivener IV",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "illuminated manuscript": {
    "name": "Illuminated Manuscript",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scriptorium iv": {
    "name": "Scriptorium IV",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "apocrypha iii": {
    "name": "Apocrypha III",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "iconographer v": {
    "name": "Iconographer V",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "iconic covenant": {
    "name": "Iconic Covenant",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "scrivener v": {
    "name": "Scrivener V",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "holy lectionary": {
    "name": "Holy Lectionary",
    "parent": "Cleric",
    "track": "Theologian",
    "isEntry": false,
    "category": "class"
  },
  "icons": {
    "name": "Icons",
    "parent": "Cleric",
    "track": "Divine Icon",
    "isEntry": false,
    "category": "class"
  },
  "polytheism": {
    "name": "Polytheism",
    "parent": "Cleric",
    "track": "Divine Icon",
    "isEntry": false,
    "category": "class"
  },
  "siphon divinity": {
    "name": "Siphon Divinity",
    "parent": "Cleric",
    "track": "Divine Icon",
    "isEntry": false,
    "category": "class"
  },
  "divine icon abilities list": {
    "name": "Divine Icon Abilities List",
    "parent": "Cleric",
    "track": "Divine Icon",
    "isEntry": false,
    "category": "class"
  },
  "animal spirit": {
    "name": "Animal Spirit",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "primal affinity": {
    "name": "Primal Affinity",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "spirit enhancement": {
    "name": "Spirit Enhancement",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "manifest mythology": {
    "name": "Manifest Mythology",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "spiritual summons": {
    "name": "Spiritual Summons",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "spell link": {
    "name": "Spell Link",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "morph": {
    "name": "Morph",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "animal spirit ii": {
    "name": "Animal Spirit II",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "manifest mythology ii": {
    "name": "Manifest Mythology II",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "bestial awareness": {
    "name": "Bestial Awareness",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "team effort": {
    "name": "Team Effort",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "overwhelm": {
    "name": "Overwhelm",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "spiritual summons ii": {
    "name": "Spiritual Summons II",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "manifest mythology iii": {
    "name": "Manifest Mythology III",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "animal spirit iii": {
    "name": "Animal Spirit III",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "team effort ii": {
    "name": "Team Effort II",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "mythological myriad": {
    "name": "Mythological Myriad",
    "parent": "Cleric",
    "track": "Mythological Domain",
    "isEntry": false,
    "category": "class"
  },
  "mage entry": {
    "name": "Mage Entry",
    "parent": "Mage",
    "track": "Mage Entry",
    "isEntry": true,
    "category": "class"
  },
  "arcane weaver": {
    "name": "Arcane Weaver",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "spell sculptor": {
    "name": "Spell Sculptor",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "spell sculptor ii": {
    "name": "Spell Sculptor II",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "spell sculptor iii": {
    "name": "Spell Sculptor III",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "spell sniper": {
    "name": "Spell Sniper",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "spell sniper ii": {
    "name": "Spell Sniper II",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "mote expert": {
    "name": "Mote Expert",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "mote expert ii": {
    "name": "Mote Expert II",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "mote expert iii": {
    "name": "Mote Expert III",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "empower spell expert": {
    "name": "Empower Spell Expert",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "arcane weaver ii": {
    "name": "Arcane Weaver II",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: spell point cost": {
    "name": "Metamagic: Spell Point Cost",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: morph damage": {
    "name": "Metamagic: Morph Damage",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: hasten": {
    "name": "Metamagic: Hasten",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: overclock": {
    "name": "Metamagic: Overclock",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: maximize": {
    "name": "Metamagic: Maximize",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: overcome": {
    "name": "Metamagic: Overcome",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: humane spell": {
    "name": "Metamagic: Humane Spell",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: leeching": {
    "name": "Metamagic: Leeching",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: duration": {
    "name": "Metamagic: Duration",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic: conjuring": {
    "name": "Metamagic: Conjuring",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic expert": {
    "name": "Metamagic Expert",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic expert ii": {
    "name": "Metamagic Expert II",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "arcane versatility": {
    "name": "Arcane Versatility",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "metamagic caster": {
    "name": "Metamagic Caster",
    "parent": "Mage",
    "track": "Arcane Weaving",
    "isEntry": false,
    "category": "class"
  },
  "arcane intellectual": {
    "name": "Arcane Intellectual",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: alchemy": {
    "name": "Mage: Alchemy",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: alchemy ii": {
    "name": "Mage: Alchemy II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: alchemy iii": {
    "name": "Mage: Alchemy III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: alchemy iv": {
    "name": "Mage: Alchemy IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: alchemy v": {
    "name": "Mage: Alchemy V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: altering": {
    "name": "Mage: Altering",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: altering ii": {
    "name": "Mage: Altering II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: altering iii": {
    "name": "Mage: Altering III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: altering iv": {
    "name": "Mage: Altering IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: altering v": {
    "name": "Mage: Altering V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: divining": {
    "name": "Mage: Divining",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: divining ii": {
    "name": "Mage: Divining II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: divining iii": {
    "name": "Mage: Divining III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: divining iv": {
    "name": "Mage: Divining IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: divining v": {
    "name": "Mage: Divining V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: enchanting": {
    "name": "Mage: Enchanting",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: enchanting ii": {
    "name": "Mage: Enchanting II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: enchanting iii": {
    "name": "Mage: Enchanting III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: enchanting iv": {
    "name": "Mage: Enchanting IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: enchanting v": {
    "name": "Mage: Enchanting V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: evoking": {
    "name": "Mage: Evoking",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: evoking ii": {
    "name": "Mage: Evoking II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: evoking iii": {
    "name": "Mage: Evoking III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: evoking iv": {
    "name": "Mage: Evoking IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: evoking v": {
    "name": "Mage: Evoking V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: illusory": {
    "name": "Mage: Illusory",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: illusory ii": {
    "name": "Mage: Illusory II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: illusory iii": {
    "name": "Mage: Illusory III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: illusory iv": {
    "name": "Mage: Illusory IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: illusory v": {
    "name": "Mage: Illusory V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: necromancy": {
    "name": "Mage: Necromancy",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: necromancy ii": {
    "name": "Mage: Necromancy II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: necromancy iii": {
    "name": "Mage: Necromancy III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: necromancy iv": {
    "name": "Mage: Necromancy IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: necromancy v": {
    "name": "Mage: Necromancy V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: summoning": {
    "name": "Mage: Summoning",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: summoning ii": {
    "name": "Mage: Summoning II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: summoning iii": {
    "name": "Mage: Summoning III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: summoning iv": {
    "name": "Mage: Summoning IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: summoning v": {
    "name": "Mage: Summoning V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: warding": {
    "name": "Mage: Warding",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: warding ii": {
    "name": "Mage: Warding II",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: warding iii": {
    "name": "Mage: Warding III",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: warding iv": {
    "name": "Mage: Warding IV",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "mage: warding v": {
    "name": "Mage: Warding V",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "high mage": {
    "name": "High Mage",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "archmage": {
    "name": "Archmage",
    "parent": "Mage",
    "track": "Archmage",
    "isEntry": false,
    "category": "class"
  },
  "sorcery focus": {
    "name": "Sorcery Focus",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "careful casting": {
    "name": "Careful Casting",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "careful casting ii": {
    "name": "Careful Casting II",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "careful casting iii": {
    "name": "Careful Casting III",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "wellspring tap": {
    "name": "Wellspring Tap",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "wellspring tap ii": {
    "name": "Wellspring Tap II",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "wellspring tap iii": {
    "name": "Wellspring Tap III",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "careful casting - cantrips": {
    "name": "Careful Casting - Cantrips",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "inertia": {
    "name": "Inertia",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "cantrip focus": {
    "name": "Cantrip Focus",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "cantrip focus ii": {
    "name": "Cantrip Focus II",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "cantrip focus iii": {
    "name": "Cantrip Focus III",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "cantrip focus iv": {
    "name": "Cantrip Focus IV",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "cantrip focus v": {
    "name": "Cantrip Focus V",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "unstable casting": {
    "name": "Unstable Casting",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "unstable casting ii": {
    "name": "Unstable Casting II",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "unstable casting iii": {
    "name": "Unstable Casting III",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "unstable casting iv": {
    "name": "Unstable Casting IV",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "unstable casting v": {
    "name": "Unstable Casting V",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "explosive critical": {
    "name": "Explosive Critical",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "explosive critical ii": {
    "name": "Explosive Critical II",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "explosive critical iii": {
    "name": "Explosive Critical III",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "inertia ii": {
    "name": "Inertia II",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "inertia iii": {
    "name": "Inertia III",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "grand sorcerer": {
    "name": "Grand Sorcerer",
    "parent": "Mage",
    "track": "Sorcery",
    "isEntry": false,
    "category": "class"
  },
  "awakened spellbook": {
    "name": "Awakened Spellbook",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spell scribe": {
    "name": "Spell Scribe",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "awakened spellbook ii": {
    "name": "Awakened Spellbook II",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spell scribe ii": {
    "name": "Spell Scribe II",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "tome familiar": {
    "name": "Tome Familiar",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "awakened spellbook iii": {
    "name": "Awakened Spellbook III",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "tome familiar ii": {
    "name": "Tome Familiar II",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spellstealing": {
    "name": "Spellstealing",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spell thief": {
    "name": "Spell Thief",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "awakened spellbook iv": {
    "name": "Awakened Spellbook IV",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spellstealing ii": {
    "name": "Spellstealing II",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spell scribe iii": {
    "name": "Spell Scribe III",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "spellstealing iii": {
    "name": "Spellstealing III",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "awakened spellbook v": {
    "name": "Awakened Spellbook V",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "tome wizard": {
    "name": "Tome Wizard",
    "parent": "Mage",
    "track": "Tome Wizard",
    "isEntry": false,
    "category": "class"
  },
  "occultist": {
    "name": "Occultist",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "source synthesis": {
    "name": "Source Synthesis",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "ritual blade": {
    "name": "Ritual Blade",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "bloodlet": {
    "name": "Bloodlet",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "shade familiar": {
    "name": "Shade Familiar",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "ethereal shade": {
    "name": "Ethereal Shade",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "occult bargain": {
    "name": "Occult Bargain",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "precision cast": {
    "name": "Precision Cast",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "psychic ward": {
    "name": "Psychic Ward",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "death by a thousand cuts": {
    "name": "Death by a Thousand Cuts",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "arcane parry": {
    "name": "Arcane Parry",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "twin sacrifice": {
    "name": "Twin Sacrifice",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "vengeful stare": {
    "name": "Vengeful Stare",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "blackened shade": {
    "name": "Blackened Shade",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "sweet nothings": {
    "name": "Sweet Nothings",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "wings of darkness": {
    "name": "Wings of Darkness",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "precision blast": {
    "name": "Precision Blast",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "heartburn": {
    "name": "Heartburn",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "mass sacrifice": {
    "name": "Mass Sacrifice",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "dark feast": {
    "name": "Dark Feast",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "hungering shade": {
    "name": "Hungering Shade",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "grasping tentacles": {
    "name": "Grasping Tentacles",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  },
  "blackened shade ii": {
    "name": "Blackened Shade II",
    "parent": "Mage",
    "track": "Occultism",
    "isEntry": false,
    "category": "class"
  }
};

export const NORMALIZED_CANONICAL_TALENTS = {};
for (const [k, v] of Object.entries(CANONICAL_TALENTS)) {
  const normK = normalizeTalentName(k);
  NORMALIZED_CANONICAL_TALENTS[normK] = v;
  const arabicK = normK.replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, (m) => {
    const rMap = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };
    return rMap[m] || m;
  });
  NORMALIZED_CANONICAL_TALENTS[arabicK] = v;
}

// Add common aliases / punctuation variants
NORMALIZED_CANONICAL_TALENTS["cowards"] = {
  name: "\"Cowards!\"",
  parent: "Berzerker",
  track: "Exile",
  isEntry: false,
  category: "class"
};
NORMALIZED_CANONICAL_TALENTS["throw anything 1"] = {
  name: "Throw Anything I",
  parent: "Berzerker",
  track: "Exile",
  isEntry: false,
  category: "class"
};
NORMALIZED_CANONICAL_TALENTS["throw anything i"] = {
  name: "Throw Anything I",
  parent: "Berzerker",
  track: "Exile",
  isEntry: false,
  category: "class"
};

