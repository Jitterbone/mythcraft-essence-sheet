/**
 * mythcraft-essence-sheet | src/data/tags-library.mjs
 *
 * Official MythCraft System Tag & Keyword Library.
 * Includes complete descriptions and categorized metadata for:
 * • Weapon Tags
 * • Arcane Specific Magic Types & Tags
 * • Divine Specific Magic Types & Tags
 * • Occult Magic Types & Tags
 * • Primal Magic Types & Tags
 * • Psionic Aptitudes & Tags
 * • Monster & Creature Types
 * • Monster Traits
 */

/**
 * Format string into clean grammatical Title Case with capitalized first letters
 * @param {string} str
 * @returns {string}
 */
export function formatTagTitle(str) {
  if (!str || typeof str !== "string") return "";
  const clean = str.trim().replace(/^MYTHCRAFT\.Item\.[a-zA-Z0-9_]+\.tags\./i, "").replace(/[-_]/g, " ");
  return clean
    .split(" ")
    .map(word => {
      if (!word) return "";
      // Keep small connectors lowercase unless it's first word
      const lower = word.toLowerCase();
      if (["and", "of", "the", "in", "a", "an"].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^([a-z])/, (m) => m.toUpperCase())
    .replace(/Hand And A Half/i, "Hand-and-a-Half");
}

export const DEFAULT_TAGS_LIBRARY = [
  // ── WEAPON TAGS ────────────────────────────────────────────────────────────
  {
    id: "ammunition",
    name: "Ammunition",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "If a weapon has the ammunition tag, you must have ammunition in order to make attacks with that weapon. Ammunition might be arrows, crossbow bolts, sling pellets, and the like.",
  },
  {
    id: "concealed",
    name: "Concealed",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "If a weapon has the concealed tag, then when it is sheathed it can be tucked within folds of your clothing, such as inside a boot. Concealed weapons are not readily visible to observers, but a pat-down will reveal these weapons, and if a creature succeeds on an AWR check against an INT check that you make when you hide the weapon, then they can spot it without needing to pat you down.",
  },
  {
    id: "hand-and-a-half",
    name: "Hand-and-a-Half",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "Weapons with the hand-and-a-half tag can be wielded with one or two hands. After the hand-and-a-half tag, there will be a brief phrase in parentheses explaining what benefit you gain from wielding the weapon with two hands, such as dealing more damage or a lower APC to make the attack.",
  },
  {
    id: "light",
    name: "Light",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "A weapon with the light tag does not count against your encumbrance. Furthermore, light weapons can be dual wielded, using one light weapon in each hand.",
  },
  {
    id: "natural-weapon",
    name: "Natural Weapon",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "A weapon with the natural tag is considered light if it has a reach of 15 ft or less.",
  },
  {
    id: "one-handed",
    name: "One-Handed",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "A weapon with the one-handed tag can only be wielded with one hand.",
  },
  {
    id: "special",
    name: "Special",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "If a weapon has the special tag, then its special properties are explained in detail below that weapon’s table.",
  },
  {
    id: "two-handed",
    name: "Two-Handed",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "A weapon with the two-handed tag can only be wielded with two hands.",
  },
  {
    id: "unwieldy",
    name: "Unwieldy",
    category: "weapon",
    categoryLabel: "Weapon",
    description: "The unwieldy tag interacts with your encumbrance. It takes 1 AP to draw or sheathe an unwieldy weapon.",
  },

  // ── ARCANE MAGIC TYPES & TAGS ──────────────────────────────────────────────
  {
    id: "cantrip",
    name: "Cantrip",
    category: "arcane",
    categoryLabel: "Arcane Magic Type",
    description: "Cantrips cost no SP and you can use them as many times as you wish.",
  },
  {
    id: "arcane-power",
    name: "Arcane Power",
    category: "arcane",
    categoryLabel: "Arcane Tag",
    description: "Arcane Power is the total number of talent points you have spent on Arcane Magic talents as a result of leveling up, as well as the number of talent points you have spent in certain classes and subclass tracks that specify they contribute to Arcane Power.",
  },
  {
    id: "arcane-ritual",
    name: "Arcane Ritual",
    category: "arcane",
    categoryLabel: "Arcane Tag",
    description: "If you know a spell with the arcane ritual tag, you may scribe that spell into a book by spending at least one hour doing so. Spells recorded in this way can be cast without expending SP if the SPC does not exceed your max SP. This requires the spell’s full casting time + 10 minutes. You can cast one arcane ritual per day in this way, regardless of how many arcane rituals you know.",
  },
  {
    id: "fundamental",
    name: "Fundamental",
    category: "arcane",
    categoryLabel: "Arcane Tag",
    description: "Spells with the fundamental tag can only be dispelled using the Unravel Magic spell from the Arcane Source.",
  },

  // ── DIVINE MAGIC TYPES & TAGS ──────────────────────────────────────────────
  {
    id: "prayer",
    name: "Prayer",
    category: "divine",
    categoryLabel: "Divine Magic Type",
    description: "Prayers cost no SP and you can use them as many times as you wish.",
  },
  {
    id: "ritual",
    name: "Ritual",
    category: "divine",
    categoryLabel: "Magic Type",
    description: "Rituals take quite a long time to cast, and each ritual will specify how frequently you can cast it.",
  },
  {
    id: "divine-power",
    name: "Divine Power",
    category: "divine",
    categoryLabel: "Divine Tag",
    description: "Divine Power is the total number of talent points you have spent on Divine Magic talents as a result of leveling up, as well as the number of talent points you have spent in certain classes or tracks that specify they contribute to Divine Power.",
  },
  {
    id: "liturgy",
    name: "Liturgy",
    category: "divine",
    categoryLabel: "Divine Tag",
    description: "If a ritual has the liturgy tag, you can spend the listed APC and SPC to cast the ritual as a spell. Turning a ritual into a spell in this way still expends the use of the ritual.",
  },
  {
    id: "sacrament",
    name: "Sacrament",
    category: "divine",
    categoryLabel: "Divine Tag",
    description: "If a spell has the sacrament tag, you may expend material components to increase the power of the spell. This will be noted at the end of any sacrament spell’s description.",
  },

  // ── OCCULT MAGIC TYPES & TAGS ──────────────────────────────────────────────
  {
    id: "chant",
    name: "Chant",
    category: "occult",
    categoryLabel: "Magic Type",
    description: "Chants cost no SP and you can use them as many times as you wish.",
  },
  {
    id: "occult-power",
    name: "Occult Power",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "Occult Power is the total number of talent points you have spent on Occult Magic talents as a result of leveling up, in addition to the number of talent points you have spent in certain classes or tracks that specify they contribute to Occult Power.",
  },
  {
    id: "curse-and-charm",
    name: "Curse and Charm",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "Curse and charm are tags that denote an effect that lingers with its target for the magic’s duration, even if an effect would normally dispel or suppress magic.",
  },
  {
    id: "curse",
    name: "Curse",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "Curse denotes an effect that lingers with its target for the magic’s duration, even if an effect would normally dispel or suppress magic.",
  },
  {
    id: "charm",
    name: "Charm",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "Charm denotes an effect that lingers with its target for the magic’s duration, even if an effect would normally dispel or suppress magic.",
  },
  {
    id: "incantation",
    name: "Incantation",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "If a spell has the incantation tag, the spell’s effects can be extended if you spend a smaller amount of AP on subsequent rounds, up to a maximum duration. If you neglect to spend the required Incantation AP at any point on subsequent turns, the spell ends.",
  },
  {
    id: "ritualize",
    name: "Ritualize",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "This tag means that the spell can be cast as a ritual, which does not expend SP. Each spell with a ritualize tag will specify how many times it can be used as a ritual, and when you regain the ability to do so.",
  },
  {
    id: "dark-power",
    name: "Dark Power",
    category: "occult",
    categoryLabel: "Occult Tag",
    description: "Dark power is a tag attached to certain chants, rituals, and spells. These magical abilities come with a risk of being temporarily or permanently altered or corrupted in some way, specified within each ability.",
  },

  // ── PRIMAL MAGIC TYPES & TAGS ──────────────────────────────────────────────
  {
    id: "invocation",
    name: "Invocation",
    category: "primal",
    categoryLabel: "Primal Magic Type",
    description: "If you know any invocations, you may cast invocations a number of times equal to your Primal Tier. This resets each time you Take a Rest.",
  },
  {
    id: "emotion",
    name: "Emotion",
    category: "primal",
    categoryLabel: "Primal Aspect",
    description: "Reflects the Emotion aspect of the Everwilds that a given magical ability represents. Every primal magical ability has one of Emotion, Nature, or Weather. Some talents reference these tags.",
  },
  {
    id: "nature",
    name: "Nature",
    category: "primal",
    categoryLabel: "Primal Aspect",
    description: "Reflects the Nature aspect of the Everwilds that a given magical ability represents. Every primal magical ability has one of Emotion, Nature, or Weather. Some talents reference these tags.",
  },
  {
    id: "weather",
    name: "Weather",
    category: "primal",
    categoryLabel: "Primal Aspect",
    description: "Reflects the Weather aspect of the Everwilds that a given magical ability represents. Every primal magical ability has one of Emotion, Nature, or Weather. Some talents reference these tags.",
  },
  {
    id: "extrinsic",
    name: "Extrinsic",
    category: "primal",
    categoryLabel: "Primal Scope",
    description: "Reflects whether a magical ability affects the world around you. Every primal magical ability has either Extrinsic or Intrinsic. Some talents reference these tags.",
  },
  {
    id: "intrinsic",
    name: "Intrinsic",
    category: "primal",
    categoryLabel: "Primal Scope",
    description: "Reflects whether a magical ability bolsters your own abilities in some way. Every primal magical ability has either Extrinsic or Intrinsic. Some talents reference these tags.",
  },
  {
    id: "primal-power",
    name: "Primal Power",
    category: "primal",
    categoryLabel: "Primal Tag",
    description: "Primal Power is the total number of talent points you have spent on Primal Magic talents as a result of leveling up, in addition to the number of talent points you have spent in certain classes or tracks.",
  },
  {
    id: "primal-tier",
    name: "Primal Tier",
    category: "primal",
    categoryLabel: "Primal Tag",
    description: "Your Primal Tier increases at varying increments of Primal Power (1-2: Tier 1, 3-4: Tier 2, 5-7: Tier 3, 8-12: Tier 4, 13-20: Tier 5, 21+: Tier 6). Chants gain power based on your Primal Tier, and you may cast daily invocations equal to your Primal Tier.",
  },

  // ── PSIONIC APTITUDES & TAGS ───────────────────────────────────────────────
  {
    id: "clairsentience",
    name: "Clairsentience",
    category: "psionic",
    categoryLabel: "Psionic Aptitude",
    description: "Clairsentience is the psionic aptitude that allows one to master one’s senses and perceive outside of those senses and self.",
  },
  {
    id: "psychokinetics",
    name: "Psychokinetics",
    category: "psionic",
    categoryLabel: "Psionic Aptitude",
    description: "Psychokinetics is the manipulation and mastery of existing physical matter.",
  },
  {
    id: "metacreativity",
    name: "Metacreativity",
    category: "psionic",
    categoryLabel: "Psionic Aptitude",
    description: "Metacreativity taps into the space between space, the Pale, to draw and shape essence, manifesting semi-physical objects and creatures.",
  },
  {
    id: "telepathy",
    name: "Telepathy",
    category: "psionic",
    categoryLabel: "Psionic Aptitude",
    description: "Mental communication such as traditional telepathy, empathy, mind-reading, and manipulation of thought and perception.",
  },
  {
    id: "psychometabolics",
    name: "Psychometabolics",
    category: "psionic",
    categoryLabel: "Psionic Aptitude",
    description: "The ultimate attunement with one’s own body, and the ability to push it past its physical limits, and even morph and shape it.",
  },
  {
    id: "psychovillainy",
    name: "Psychovillainy",
    category: "psionic",
    categoryLabel: "Psionic Aptitude",
    description: "The forbidden art of charm and compulsion.",
  },
  {
    id: "psionic-power",
    name: "Psionic Power",
    category: "psionic",
    categoryLabel: "Psionic Tag",
    description: "Psionic Power is the total number of talent points you have spent on Psionic Magic talents as a result of leveling up, in addition to the number of talent points you have spent in certain classes or tracks.",
  },
  {
    id: "psionic-tier",
    name: "Psionic Tier",
    category: "psionic",
    categoryLabel: "Psionic Tag",
    description: "Your Psionic Tier increases at varying increments of Psionic Power (1-3: Tier 1, 4-7: Tier 2, 8-11: Tier 3, 12-15: Tier 4, 16-19: Tier 5, 20+: Tier 6). Determines how many times you can use invocations each day.",
  },
  {
    id: "aptitude",
    name: "Aptitude",
    category: "psionic",
    categoryLabel: "Psionic Tag",
    description: "When you take the Adept of the Psionic talent, choose one aptitude: Clairsentience, Psychokinetics, Metacreativity, Telepathy, or Psychometabolics.",
  },
  {
    id: "concentration",
    name: "Concentration",
    category: "psionic",
    categoryLabel: "Psionic Tag",
    description: "Spells with the concentration tag require intense mental focus; only one can be active at a time. If you take damage while concentrating, make a Concentration check: 1d20+END against DC equal to 1/2 the damage taken. On failure, the spell ends.",
  },
  {
    id: "manifestation",
    name: "Manifestation",
    category: "psionic",
    categoryLabel: "Psionic Tag",
    description: "A spell with the manifestation tag costs 0 SP for psions who have the corresponding aptitude (upcharging still requires SP).",
  },
  {
    id: "meditation",
    name: "Meditation",
    category: "psionic",
    categoryLabel: "Psionic Tag",
    description: "Psionic spells and invocations with the meditation tag require you to meditate for both the casting and duration of the spell. While meditating, you cannot spend AP on other actions unless talents specify otherwise. Taking damage ends meditation immediately.",
  },
  {
    id: "altering",
    name: "Altering",
    category: "psionic",
    categoryLabel: "Focus Tag",
    description: "A magical modification or focus tag that alters the state, parameters, or shape of the target or spell effect.",
  },

  // ── MONSTER & CREATURE TAGS ────────────────────────────────────────────────
  {
    id: "beast",
    name: "Beast",
    category: "monster",
    categoryLabel: "Mundane Creature",
    description: "Mundane creature type representing wild or domesticated animals.",
  },
  {
    id: "humanoid",
    name: "Humanoid",
    category: "monster",
    categoryLabel: "Mundane Creature",
    description: "Mundane creature type representing bipedal civilized and tribal peoples.",
  },
  {
    id: "monstrosity",
    name: "Monstrosity",
    category: "monster",
    categoryLabel: "Mundane Creature",
    description: "Mundane creature type representing unnatural, monstrous beasts and warped beings.",
  },
  {
    id: "plant",
    name: "Plant",
    category: "monster",
    categoryLabel: "Mundane Creature",
    description: "Mundane creature type representing ambulatory or magical flora and fungi.",
  },
  {
    id: "avadri",
    name: "Avadri",
    category: "monster",
    categoryLabel: "Planar Creature",
    description: "Planar creature type hailing from celestial realms or divine planes.",
  },
  {
    id: "celestial",
    name: "Celestial",
    category: "monster",
    categoryLabel: "Planar Creature",
    description: "Planar creature type representing holy, angelic, and radiant entities.",
  },
  {
    id: "eldritch",
    name: "Eldritch",
    category: "monster",
    categoryLabel: "Planar Creature",
    description: "Planar creature type representing cosmic horrors from beyond the known planes.",
  },
  {
    id: "elemental",
    name: "Elemental",
    category: "monster",
    categoryLabel: "Planar Creature",
    description: "Planar creature type composed of raw elemental substances like fire, water, earth, or air.",
  },
  {
    id: "fae",
    name: "Fae",
    category: "monster",
    categoryLabel: "Planar Creature",
    description: "Planar creature type native to the Everwilds and enchanted realms.",
  },
  {
    id: "fiend",
    name: "Fiend",
    category: "monster",
    categoryLabel: "Planar Creature",
    description: "Planar creature type originating from nether hells and infernal dimensions.",
  },
  {
    id: "abominable",
    name: "Abominable",
    category: "monster",
    categoryLabel: "Modifying Tag",
    description: "Modifying creature tag denoting horrifying mutations and grotesque features.",
  },
  {
    id: "constructed",
    name: "Constructed",
    category: "monster",
    categoryLabel: "Modifying Tag",
    description: "Modifying creature tag denoting artificial animated objects, golems, or automatons.",
  },
  {
    id: "giant",
    name: "Giant",
    category: "monster",
    categoryLabel: "Modifying Tag",
    description: "Modifying creature tag denoting colossal stature and immense physical strength.",
  },
  {
    id: "swarm",
    name: "Swarm",
    category: "monster",
    categoryLabel: "Modifying Tag",
    description: "Modifying creature tag representing a dense collective of small creatures acting as a single unit.",
  },
  {
    id: "shapechanger",
    name: "Shapechanger",
    category: "monster",
    categoryLabel: "Modifying Tag",
    description: "Modifying creature tag representing entities capable of altering their physical form at will.",
  },
  {
    id: "undead",
    name: "Undead",
    category: "monster",
    categoryLabel: "Modifying Tag",
    description: "If a creature has the Undead tag, then by default it does not need to eat, drink, sleep, or breathe, and is immune to Fatigue. Some Undead will specify otherwise within their stats (for example, Vampires must periodically consume blood).",
  },

  // ── MONSTER TRAITS ─────────────────────────────────────────────────────────
  {
    id: "ethereal",
    name: "Ethereal",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait can pass through walls and other barriers and surfaces freely.",
  },
  {
    id: "immovable",
    name: "Immovable",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait cannot be teleported or moved against its will.",
  },
  {
    id: "immutable",
    name: "Immutable",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait cannot have its physical form changed, such as with the Cloven Step spell.",
  },
  {
    id: "invisible",
    name: "Invisible",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait is Unseen and remains Unseen even when under circumstances that would normally end the Unseen condition.",
  },
  {
    id: "iron-will",
    name: "Iron Will",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait cannot gain the Frightened or Shaken conditions.",
  },
  {
    id: "mythic",
    name: "Mythic",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "Mythic monsters are incredibly challenging to fight. A Mythic monster has the Iron Will and Steel Mind traits. A Mythic monster is also more difficult to kill: if it gains the Helpless condition, it is not reduced to 0 HP when it takes damage; instead, all damage that it takes is considered critical. Finally, Mythic monsters do not roll Initiative, but instead act after every 2 characters in Initiative order.",
  },
  {
    id: "regen",
    name: "Regen",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "At the start of each of the creature’s turns, the creature regains HP equal to its Regen number.",
  },
  {
    id: "steel-mind",
    name: "Steel Mind",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait cannot gain the Charmed or Enthralled conditions.",
  },
  {
    id: "unerring-mind",
    name: "Unerring Mind",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait cannot be tricked by illusions, disguise magic or magical effects, and sees the true form of any shapechanger or polymorphed creature.",
  },
  {
    id: "vigilant",
    name: "Vigilant",
    category: "traits",
    categoryLabel: "Monster Trait",
    description: "A creature with this trait does not suffer any penalties to its AWR while Unconscious.",
  },
];

/**
 * Category metadata for styling, icons, and colors matching the sheet's palette
 */
export const TAG_CATEGORIES = {
  weapon:  { label: "Weapon", icon: "fas fa-shield-halved", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.45)" },
  arcane:  { label: "Arcane", icon: "fas fa-wand-magic-sparkles", color: "#aed6f1", bg: "rgba(93, 173, 226, 0.2)", border: "#5dade2" },
  divine:  { label: "Divine", icon: "fas fa-sun", color: "#f9e79f", bg: "rgba(223, 177, 91, 0.2)", border: "#dfb15b" },
  occult:  { label: "Occult", icon: "fas fa-skull", color: "#f5b7b1", bg: "rgba(201, 104, 104, 0.2)", border: "#c96868" },
  primal:  { label: "Primal", icon: "fas fa-leaf", color: "#a9dfbf", bg: "rgba(95, 163, 122, 0.2)", border: "#5fa37a" },
  psionic: { label: "Psionic", icon: "fas fa-brain", color: "#d7bde2", bg: "rgba(155, 114, 207, 0.2)", border: "#9b72cf" },
  monster: { label: "Monster", icon: "fas fa-dragon", color: "#fb923c", bg: "rgba(251, 146, 60, 0.18)", border: "rgba(251, 146, 60, 0.5)" },
  traits:  { label: "Traits", icon: "fas fa-bolt", color: "#ec4899", bg: "rgba(236, 72, 153, 0.18)", border: "rgba(236, 72, 153, 0.5)" },
  custom:  { label: "Custom", icon: "fas fa-tag", color: "#2dd4bf", bg: "rgba(45, 212, 191, 0.18)", border: "rgba(45, 212, 191, 0.5)" },
};

/**
 * Retrieve the active list of all tags (defaults + custom modifications)
 * @returns {Array<object>}
 */
export function getActiveTagsLibrary() {
  try {
    const saved = game.settings.get("mythcraft-essence-sheet", "customTags");
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {
    // Settings not ready yet
  }
  return DEFAULT_TAGS_LIBRARY;
}

/**
 * Look up a tag definition by name or ID (case-insensitive fuzzy match)
 * @param {string} tagString
 * @returns {object}
 */
export function findTagDefinition(tagString) {
  if (!tagString || typeof tagString !== "string") return null;
  const library = getActiveTagsLibrary();
  const rawClean = tagString.trim().replace(/^MYTHCRAFT\.Item\.[a-zA-Z0-9_]+\.tags\./i, "");
  const clean = rawClean.toLowerCase().replace(/[^a-z0-9]/g, "");
  const formattedName = formatTagTitle(rawClean);
  
  // 1. Direct match on ID or normalized name
  let found = library.find(t => {
    const tIdNorm = (t.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const tNameNorm = (t.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return tIdNorm === clean || tNameNorm === clean;
  });
  if (found) {
    const cat = TAG_CATEGORIES[found.category] || TAG_CATEGORIES.custom;
    return { ...found, name: formatTagTitle(found.name), categoryMeta: cat };
  }

  // 2. Partial/Prefix match (e.g. "Regen 5" -> "Regen")
  found = library.find(t => {
    const tNameNorm = (t.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean.startsWith(tNameNorm);
  });
  if (found) {
    const cat = TAG_CATEGORIES[found.category] || TAG_CATEGORIES.custom;
    return { ...found, name: formattedName, categoryMeta: cat };
  }

  // 3. Fallback for uncatalogued custom tags
  return {
    id: rawClean.toLowerCase().replace(/\s+/g, "-"),
    name: formattedName,
    category: "custom",
    categoryLabel: "Custom",
    description: `Custom or uncatalogued tag: ${formattedName}`,
    categoryMeta: TAG_CATEGORIES.custom,
  };
}
