/**
 * mythcraft-essence-sheet | src/features/equipment-icons.mjs
 *
 * Comprehensive Foundry VTT Default Icon Mapping Engine for MythCraft Equipment,
 * Starting Gear, Weapons, Armor, Tools, Musical Instruments, Consumables,
 * Talents, Features & Spells.
 */

/**
 * Checks whether an image path is a generic Foundry default placeholder.
 * @param {string|null|undefined} img
 * @returns {boolean}
 */
export function isDefaultIcon(img) {
  if (!img || typeof img !== "string") return true;
  const clean = img.trim().toLowerCase();
  return (
    clean === "" ||
    clean === "icons/svg/item-bag.svg" ||
    clean === "icons/svg/mystery-man.svg" ||
    clean === "icons/svg/aura.svg" ||
    clean === "icons/svg/d20.svg" ||
    clean === "icons/svg/d20-black.svg" ||
    clean === "icons/svg/d20-grey.svg" ||
    clean === "icons/svg/d20-highlight.svg" ||
    clean === "icons/svg/book.svg" ||
    clean === "icons/svg/chest.svg" ||
    clean === "icons/svg/upgrade.svg" ||
    clean === "icons/svg/anchor.svg" ||
    clean === "icons/svg/combat.svg" ||
    clean.endsWith("/item-bag.svg") ||
    clean.endsWith("/mystery-man.svg") ||
    clean.endsWith("/aura.svg")
  );
}

/**
 * Exact name lookup mapping to canonical Foundry core icons (verified against Foundry 11/12/13/14 core).
 */
export const EXACT_EQUIPMENT_ICONS = {
  "longsword": "icons/weapons/swords/greatsword-crossguard-steel.webp",
  "shortsword": "icons/weapons/swords/shortsword-guard-brass.webp",
  "greatsword": "icons/weapons/swords/greatsword-blue.webp",
  "broadsword": "icons/weapons/swords/sword-broad-worn.webp",
  "bastard sword": "icons/weapons/swords/sword-guard-steel-green.webp",
  "claymore": "icons/weapons/swords/greatsword-flamberge.webp",
  "rapier": "icons/weapons/swords/sword-cane.webp",
  "scimitar": "icons/weapons/swords/scimitar-guard-brown.webp",
  "falchion": "icons/weapons/swords/scimitar-broad.webp",
  "katana": "icons/weapons/swords/sword-katana-purple.webp",
  "nodachi": "icons/weapons/swords/greatsword-crossguard-curved.webp",
  "khopesh": "icons/weapons/swords/scimitar-guard-brown.webp",
  "machete": "icons/weapons/swords/machete.webp",
  "dagger": "icons/weapons/daggers/dagger-black.webp",
  "dirk": "icons/weapons/daggers/dagger-blue.webp",
  "knife": "icons/weapons/daggers/dagger-black.webp",
  "kunai": "icons/weapons/daggers/dagger-straight-blue.webp",
  "fire blade": "icons/weapons/swords/sword-flanged-lightning.webp",
  "improvised small blade": "icons/weapons/daggers/dagger-black.webp",
  "improvised large blade": "icons/weapons/swords/sword-broad-worn.webp",
  "battle axe": "icons/weapons/axes/axe-battle-black.webp",
  "greataxe": "icons/weapons/axes/axe-broad-crescent-gray.webp",
  "handaxe": "icons/weapons/axes/axe-broad-grey.webp",
  "hatchet": "icons/weapons/axes/axe-broad-grey.webp",
  "throwing axe": "icons/weapons/axes/axe-battle-black.webp",
  "war axe": "icons/weapons/axes/axe-battle-black.webp",
  "war pick": "icons/weapons/axes/pickaxe-bone-black.webp",
  "pickaxe": "icons/tools/hand/pickaxe-simple-stone-brown.webp",
  "warhammer": "icons/weapons/hammers/hammer-double-engraved-gold.webp",
  "maul": "icons/weapons/hammers/hammer-double-sledge-engraved.webp",
  "hammer": "icons/tools/hand/hammer-and-nail.webp",
  "lucerne hammer": "icons/weapons/polearms/halberd-crescent-steel.webp",
  "wood splitter": "icons/weapons/axes/axe-battle-black.webp",
  "spear": "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  "pike": "icons/weapons/polearms/halberd-crescent-steel.webp",
  "javelin": "icons/weapons/polearms/javelin-flared.webp",
  "lance": "icons/weapons/polearms/spear-barbed-silver.webp",
  "halberd": "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  "glaive": "icons/weapons/polearms/glaive-simple-hooked.webp",
  "glaive guisarme": "icons/weapons/polearms/glaive-hooked-steel.webp",
  "poleaxe": "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  "bardiche": "icons/weapons/axes/axe-broad-crescent-gray.webp",
  "trident": "icons/weapons/polearms/trident-curved-steel.webp",
  "war scythe": "icons/weapons/sickles/scythe-curved-steel.webp",
  "quarterstaff": "icons/weapons/staves/staff-simple-blue.webp",
  "yari": "icons/weapons/polearms/spear-barbed-silver.webp",
  "shortbow": "icons/weapons/bows/shortbow-arrows-black.webp",
  "longbow": "icons/weapons/bows/longbow-recurve-brown.webp",
  "recurve bow": "icons/weapons/bows/bow-recurve-black.webp",
  "standing longbow": "icons/weapons/bows/longbow-recurve-leather-brown.webp",
  "crossbow": "icons/weapons/crossbows/crossbow-blue.webp",
  "light crossbow": "icons/weapons/crossbows/crossbow-simple-black.webp",
  "heavy crossbow": "icons/weapons/crossbows/crossbow-heavy-black.webp",
  "hand crossbow": "icons/weapons/crossbows/crossbow-simple-black.webp",
  "blowgun": "icons/weapons/slings/sling-leather.webp",
  "sling": "icons/weapons/slings/sling-leather.webp",
  "war sling": "icons/weapons/slings/sling-leather.webp",
  "boomerang": "icons/weapons/thrown/ball-spiked.webp",
  "shuriken": "icons/weapons/thrown/shuriken-blue.webp",
  "net": "icons/tools/fishing/net-gold.webp",
  "improvised thrown": "icons/commodities/stone/rock-chunk-brown.webp",
  "club": "icons/weapons/clubs/club-banded-brown.webp",
  "baton": "icons/weapons/clubs/baton-night-stick-truncheon.webp",
  "mace": "icons/weapons/maces/mace-flanged-steel-grey.webp",
  "morningstar": "icons/weapons/maces/flail-morning-star.webp",
  "flail": "icons/weapons/maces/flail-spiked-grey.webp",
  "tetsubo": "icons/weapons/clubs/club-banded-barbed-black.webp",
  "brass knuckles": "icons/weapons/fist/claw-leather-brown.webp",
  "cestus": "icons/weapons/fist/claw-leather-brown.webp",
  "nunchucks": "icons/weapons/misc/nunchaku.webp",
  "tonfa": "icons/weapons/clubs/baton-night-stick-truncheon.webp",
  "kama": "icons/weapons/sickles/hand-sickle.webp",
  "kusarigama": "icons/weapons/sickles/scythe-wrapped-red.webp",
  "cat-o-nines": "icons/weapons/misc/whip-leather.webp",
  "whip": "icons/weapons/misc/whip-red-yellow.webp",
  "unarmed": "icons/skills/melee/unarmed-punch-fist-blue.webp",
  "improvised bludgeon": "icons/weapons/clubs/club-banded-brown.webp",
  "oak wand": "icons/weapons/wands/wand-carved-pink.webp",
  "pine wand": "icons/weapons/wands/wand-carved-stone-shard.webp",
  "willow wand": "icons/weapons/wands/wand-crook-yellow.webp",
  "ruby wand": "icons/weapons/wands/wand-gem-red.webp",
  "sapphire wand": "icons/weapons/wands/wand-gem-blue.webp",
  "emerald wand": "icons/weapons/wands/wand-gem-green.webp",
  "amethyst wand": "icons/weapons/wands/wand-gem-purple.webp",
  "topaz wand": "icons/weapons/wands/wand-gem-blue.webp",
  "diamond wand": "icons/weapons/wands/wand-gem-teal.webp",
  "gambeson": "icons/equipment/chest/breastplate-quilted-brown.webp",
  "leather": "icons/equipment/chest/breastplate-banded-leather-brown.webp",
  "cuirass (leather)": "icons/equipment/chest/breastplate-layered-leather-brown-silver.webp",
  "hide": "icons/equipment/chest/breastplate-layered-leather-studded-brown.webp",
  "cuirass (iron)": "icons/equipment/chest/breastplate-cuirass-steel-grey.webp",
  "leather-and-steel": "icons/equipment/chest/breastplate-layered-leather-blue-gold.webp",
  "brigandine": "icons/equipment/chest/breastplate-layered-leather-black.webp",
  "chain mail": "icons/equipment/chest/breastplate-banded-steel-grey.webp",
  "banded mail": "icons/equipment/chest/breastplate-banded-steel-gold.webp",
  "scale mail": "icons/equipment/chest/breastplate-scale-grey.webp",
  "lamellar": "icons/equipment/chest/breastplate-layered-steel-green.webp",
  "splint mail": "icons/equipment/chest/breastplate-banded-steel-studded.webp",
  "half plate": "icons/equipment/chest/breastplate-layered-steel-grey.webp",
  "plate (field)": "icons/equipment/chest/breastplate-layered-steel-black.webp",
  "plate (full)": "icons/equipment/chest/breastplate-layered-steel-black.webp",
  "plate (gilded)": "icons/equipment/chest/breastplate-layered-gold.webp",
  "breastplate": "icons/equipment/chest/breastplate-cuirass-steel-blue.webp",
  "breastplate (gilded)": "icons/equipment/chest/breastplate-layered-gilded-orange.webp",
  "robes (mage)": "icons/equipment/chest/robe-layered-blue.webp",
  "robes (command)": "icons/equipment/chest/robe-layered-red.webp",
  "robes (elemental)": "icons/equipment/chest/robe-layered-teal.webp",
  "robes (corruption)": "icons/equipment/chest/robe-layered-purple.webp",
  "robes (starlight)": "icons/equipment/chest/robe-layered-white.webp",
  "buckler": "icons/equipment/shield/buckler-boss-iron-wood-brown.webp",
  "heater shield": "icons/equipment/shield/heater-crystal-blue.webp",
  "kite shield": "icons/equipment/shield/kite-bronze-boss-brown.webp",
  "tower shield": "icons/equipment/shield/buckler-boss-iron-wood-brown.webp",
  "alchemist tools": "icons/tools/laboratory/alembic-glass-ball-blue.webp",
  "barber kit": "icons/tools/hand/scissors-barber.webp",
  "blacksmith tools": "icons/tools/smithing/anvil.webp",
  "bowyer tools": "icons/tools/hand/awl-steel-tan.webp",
  "brewer supplies": "icons/tools/cooking/cauldron-empty.webp",
  "brewing equipment": "icons/tools/cooking/cauldron-empty.webp",
  "carpenter tools": "icons/tools/hand/awl-steel-tan.webp",
  "cartographer tools": "icons/tools/navigation/map-chart-tan.webp",
  "climber kit": "icons/sundries/survival/rope-braided-yellow.webp",
  "cook utensils": "icons/tools/cooking/pot-camping-iron-black.webp",
  "distilling equipment": "icons/tools/laboratory/alembic-glass-ball-blue.webp",
  "fermenting equipment": "icons/tools/cooking/cauldron-empty.webp",
  "fishing kit": "icons/tools/fishing/basket-blue-tan.webp",
  "fishing net": "icons/tools/fishing/net-gold.webp",
  "fishing rod": "icons/tools/fishing/basket-blue-tan.webp",
  "fletching tools": "icons/tools/hand/chisel-steel-brown.webp",
  "jeweler tools": "icons/tools/hand/awl-steel-tan.webp",
  "leatherworking tools": "icons/tools/hand/awl-steel-tan.webp",
  "locksmith tools": "icons/tools/hand/lockpicks-steel-grey.webp",
  "lockpick": "icons/tools/hand/lockpicks-steel-grey.webp",
  "mason tools": "icons/tools/hand/trowel.webp",
  "medical kit": "icons/tools/medical/medkit-heavy.webp",
  "medicine (basic)": "icons/tools/medical/medication-pills-bottle.webp",
  "medicine (advanced)": "icons/tools/medical/medkit-white-red.webp",
  "navigator tools": "icons/tools/navigation/sextant-brass-brown.webp",
  "paint supplies": "icons/tools/hand/brush-paint-brown-tan.webp",
  "scribe tools": "icons/tools/scribal/ink-quill-pink.webp",
  "skulduggery kit": "icons/tools/hand/lockpicks-steel-grey.webp",
  "surgeon tools": "icons/tools/medical/toolkit-surgical-pink.webp",
  "tinker tools": "icons/tools/hand/wrench-simple-steel.webp",
  "trapper kit": "icons/sundries/survival/bedroll-blue-red.webp",
  "weaver tools": "icons/commodities/cloth/thread-and-needle.webp",
  "woodworking tools": "icons/tools/hand/awl-steel-tan.webp",
  "workbench and woodworking gear": "icons/tools/hand/awl-steel-tan.webp",
  "bagpipes": "icons/tools/instruments/bell-brass-brown.webp",
  "brass horn": "icons/tools/instruments/horn-flared-wood.webp",
  "horn": "icons/tools/instruments/horn-red-brown.webp",
  "trumpet": "icons/tools/instruments/horn-red-grey.webp",
  "cello": "icons/tools/instruments/lute-gold-brown.webp",
  "violin": "icons/tools/instruments/lute-gold-brown.webp",
  "drum": "icons/tools/instruments/drum-brown-red.webp",
  "dulcimer": "icons/tools/instruments/chimes-wood-brown.webp",
  "flute": "icons/tools/instruments/flute-simple-wood.webp",
  "panpipes": "icons/tools/instruments/pipe-flute-brown.webp",
  "ocarina": "icons/tools/instruments/rattle-gourd-glowing-teal.webp",
  "harp": "icons/tools/instruments/harp-gold-glowing.webp",
  "lute": "icons/tools/instruments/lute-gold-brown.webp",
  "lyre": "icons/tools/instruments/harp-lap-brown.webp",
  "tambourine": "icons/tools/instruments/drum-hand-tan.webp",
  "whistle": "icons/tools/instruments/whistle-copper.webp",
  "backpack": "icons/containers/bags/pack-leather-strapped-tan.webp",
  "traveler's pack": "icons/containers/bags/pack-leather-strapped-tan.webp",
  "bedroll": "icons/sundries/survival/bedroll-blue-red.webp",
  "blanket": "icons/sundries/survival/bedroll-grey.webp",
  "cargo bags": "icons/containers/bags/sack-cloth-tan.webp",
  "cargo bags (hidden pockets)": "icons/containers/bags/pouch-leather-brown-green.webp",
  "scroll case": "icons/containers/bags/case-scroll-leather-tan.webp",
  "saddlebags": "icons/containers/bags/pouch-leather-brown-green.webp",
  "glass bottle": "icons/consumables/drinks/alcohol-spirits-bottle-green.webp",
  "glass vial": "icons/tools/laboratory/vials-blue-pink.webp",
  "engraved flask": "icons/containers/kitchenware/bowl-clay-brown.webp",
  "waterskin": "icons/sundries/survival/waterskin-leather-brown.webp",
  "storage locker": "icons/containers/chest/chest-reinforced-box-brown.webp",
  "snuffbox": "icons/commodities/treasure/box-jade-tassel.webp",
  "torch": "icons/sundries/lights/torch-brown-lit.webp",
  "lantern": "icons/sundries/lights/lantern-iron-yellow.webp",
  "flint & steel": "icons/tools/smithing/pincers.webp",
  "tinderbox": "icons/tools/smithing/pincers.webp",
  "rope (50 ft)": "icons/sundries/survival/rope-braided-yellow.webp",
  "rope ladder (10 ft)": "icons/sundries/survival/rope-braided-yellow.webp",
  "wire (50 ft)": "icons/tools/fasteners/chain-steel-grey.webp",
  "chain (10 ft)": "icons/tools/fasteners/chain-steel-blue.webp",
  "chain (heavy, 10 ft)": "icons/tools/fasteners/chain-steel-grey.webp",
  "crowbar": "icons/tools/hand/hammer-and-nail.webp",
  "grappling hook": "icons/tools/nautical/anchor-blue-orange.webp",
  "pitons": "icons/tools/fasteners/pin-spiked.webp",
  "shovel": "icons/tools/hand/shovel-steel.webp",
  "whetstone": "icons/tools/cooking/mortar-stone-yellow.webp",
  "chalk": "icons/commodities/stone/boulder-black.webp",
  "manacles": "icons/tools/fasteners/chain-hook-grey.webp",
  "caltrops": "icons/tools/fasteners/nails-worn-steel-grey.webp",
  "bear trap": "icons/tools/hand/awl-steel-tan.webp",
  "snares": "icons/containers/bags/pack-leather-strapped-tan.webp",
  "compass": "icons/tools/navigation/compass-brass-blue-red.webp",
  "sextant": "icons/tools/navigation/sextant-brass-brown.webp",
  "spyglass": "icons/tools/navigation/spyglass-telescope-brass-blue.webp",
  "telescope": "icons/tools/navigation/spyglass-telescope-brass-blue.webp",
  "magnifying glass": "icons/tools/scribal/magnifying-glass.webp",
  "hourglass": "icons/tools/navigation/hourglass-yellow.webp",
  "sundial": "icons/tools/navigation/watch-simple-blue.webp",
  "scale": "icons/tools/hand/trowel.webp",
  "tent (small)": "icons/environment/settlement/house-wooden-fence.webp",
  "tent (large)": "icons/environment/settlement/tent-flag.webp",
  "tent (pavilion)": "icons/environment/settlement/tent-flag.webp",
  "camping kit": "icons/sundries/survival/bedroll-blue-red.webp",
  "parchment": "icons/sundries/documents/parchment-plain-tan.webp",
  "ink & quill": "icons/tools/scribal/ink-quill-pink.webp",
  "map": "icons/tools/navigation/map-chart-tan.webp",
  "card deck": "icons/sundries/documents/document-sealed-beige-red.webp",
  "dice set (2d6)": "icons/dice/d6black.svg",
  "dice set (7 polyhedral dice)": "icons/dice/d20black.svg",
  "battle chess": "icons/sundries/documents/document-sealed-beige-red.webp",
  "holy symbol": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "writ of status": "icons/sundries/documents/document-writing-brown.webp",
  "writ of status  skills": "icons/sundries/documents/document-writing-brown.webp",
  "writ of religious authority": "icons/sundries/documents/document-sealed-red-yellow.webp",
  "contract": "icons/sundries/documents/document-sealed-red-yellow.webp",
  "rations (1 day)": "icons/consumables/food/cooked-drumstick-chicken-turkey-brown.webp",
  "meal (average)": "icons/consumables/food/bowl-stew-brown.webp",
  "meal (nice)": "icons/consumables/food/chicken-bird-cooked.webp",
  "meal (royal)": "icons/consumables/food/cooked-grilled-ham-hock-glazed-brown.webp",
  "cooking pot": "icons/tools/cooking/pot-camping-iron-black.webp",
  "utensils": "icons/tools/cooking/fork-steel-brown.webp",
  "ale (mug)": "icons/consumables/drinks/alcohol-beer-mug-yellow.webp",
  "ale gallon (poor)": "icons/consumables/drinks/alcohol-beer-stein-wooden-brown.webp",
  "ale gallon (good)": "icons/consumables/drinks/alcohol-beer-stein-wooden-metal-brown.webp",
  "beer (bottle)": "icons/consumables/drinks/alcohol-spirits-bottle-green.webp",
  "cider (pint)": "icons/consumables/drinks/alcohol-spirits-bottle-blue.webp",
  "wine bottle (common)": "icons/consumables/drinks/wine-amphora-clay-gray.webp",
  "wine bottle (fine)": "icons/consumables/drinks/wine-bottle-glass-white.webp",
  "liquor bottle (common)": "icons/consumables/drinks/alcohol-spirits-bottle-blue.webp",
  "liquor bottle (fine)": "icons/consumables/drinks/alcohol-spirits-bottle-green.webp",
  "oil (flask)": "icons/consumables/potions/bottle-bulb-corked-labeled-blue.webp",
  "herbs (common)": "icons/tools/laboratory/bowl-herbs-green.webp",
  "herbs (rare)": "icons/consumables/plants/leaf-herb-green.webp",
  "spices": "icons/tools/cooking/mortar-herbs-yellow.webp",
  "spices (exotic)": "icons/tools/laboratory/bowl-powder-red.webp",
  "healing potion": "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
  "healing elixir": "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
  "healing vial": "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
  "greater healing elixir": "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
  "grand healing elixir": "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
  "herbal potion": "icons/consumables/potions/bottle-bulb-corked-green.webp",
  "clothes (common)": "icons/equipment/chest/breastplate-quilted-brown.webp",
  "clothes (travel)": "icons/equipment/chest/breastplate-banded-leather-brown.webp",
  "clothes (fine)": "icons/equipment/chest/robe-layered-blue.webp",
  "clothes (exquisite)": "icons/equipment/chest/robe-layered-white.webp",
  "clothes (ceremonial)": "icons/equipment/chest/robe-layered-red.webp",
  "clothes (vestments)": "icons/equipment/chest/robe-layered-white.webp",
  "comb": "icons/tools/hand/shears.webp",
  "embroidered handkerchief": "icons/commodities/cloth/cloth-bolt-embroidered-pink.webp",
  "cotton (bolt)": "icons/commodities/cloth/cloth-bolt-embroidered-pink.webp",
  "linen (bolt)": "icons/commodities/cloth/cloth-bolt-tan.webp",
  "silk (bolt)": "icons/commodities/cloth/cloth-bolt-purple.webp",
  "wool (bolt)": "icons/commodities/cloth/cloth-bolt-grey.webp",
  "iron (lb)": "icons/commodities/metal/ingot-iron.webp",
  "steel (lb)": "icons/commodities/metal/ingot-steel-brass.webp",
  "granite (cf)": "icons/commodities/stone/boulder-black.webp",
  "limestone (cf)": "icons/commodities/stone/boulder-black.webp",
  "marble (cf)": "icons/commodities/stone/boulder-black.webp",
  "hardwood (cf)": "icons/commodities/wood/log-cut-ash-brown.webp",
  "timber (cf)": "icons/commodities/wood/log-cut-ash-brown.webp",
  "exotic wood (cf)": "icons/commodities/wood/log-cut-ash-brown.webp",
  "horse (draft)": "icons/environment/creatures/horse-brown.webp",
  "horse (riding)": "icons/environment/creatures/horse-white.webp",
  "horse (war)": "icons/environment/creatures/horse-tan.webp",
  "hound": "icons/commodities/treasure/figurine-dog.webp",
  "hound (trained)": "icons/commodities/treasure/figurine-dog.webp",
  "ox": "icons/creatures/mammals/ox-buffalo-horned-green.webp",
  "cow": "icons/environment/creatures/horse-brown.webp",
  "pig": "icons/consumables/food/cooked-grilled-ham-hock-glazed-brown.webp",
  "sheep": "icons/environment/creatures/horse-white.webp",
  "goat": "icons/creatures/mammals/goat-horned-blue.webp",
  "chicken": "icons/consumables/food/chicken-bird-cooked.webp",
  "turtle (draft)": "icons/creatures/reptiles/turtle-shell-glowing-green.webp",
  "saddle (riding)": "icons/equipment/waist/belt-armored-buckle-steel.webp",
  "saddle (combat)": "icons/equipment/waist/belt-armored-buckle-steel.webp",
  "cart": "icons/environment/settlement/mine-cart-rocks-red.webp",
  "wagon": "icons/environment/settlement/wagon-black.webp",
  "carriage": "icons/environment/settlement/wagon-black.webp",
  "rowboat": "icons/environment/vehicles/boat-fishing-masted.webp",
  "fishing boat": "icons/environment/vehicles/boat-fishing-masted.webp",
  "sailboat": "icons/tools/nautical/steering-wheel-blue.webp",
  "ship (small)": "icons/tools/nautical/steering-wheel-blue.webp",
  "ship (large)": "icons/tools/nautical/steering-wheel-blue.webp",
  "galleon": "icons/tools/nautical/steering-wheel-blue.webp",
  "merchant vessel": "icons/tools/nautical/steering-wheel-blue.webp",
  "warship": "icons/tools/nautical/steering-wheel-blue.webp",
  "anvil": "icons/tools/smithing/anvil.webp",
  "blast furnace": "icons/tools/smithing/furnace-fire-metal-orange.webp",
  "furnace": "icons/tools/smithing/furnace-boiler-steel.webp",
  "kiln": "icons/tools/cooking/bowl-steaming-brown.webp",
  "loom": "icons/tools/hand/spinning-wheel-brown.webp",
  "pottery wheel": "icons/tools/cooking/mill-stone-grey.webp",
  "tanning rack": "icons/commodities/leather/leather-bolt-brown.webp",
  "millstone": "icons/tools/cooking/mill-stone-grey.webp",
  "saw": "icons/tools/hand/awl-steel-tan.webp",
  "stable (one stall)": "icons/environment/settlement/house-wooden-fence.webp",
  "room (one bed)": "icons/sundries/survival/bedroll-blue-red.webp",
  "room (two beds)": "icons/sundries/survival/bedroll-blue-red.webp",
  "room (four beds)": "icons/sundries/survival/bedroll-blue-red.webp",
  "room (hostel with lockers)": "icons/containers/chest/chest-reinforced-box-brown.webp",
  "room (hostel without lockers)": "icons/sundries/survival/bedroll-blue-red.webp",
  "satchel": "icons/containers/bags/pouch-leather-brown-green.webp",
  "gambeson armor": "icons/equipment/chest/breastplate-quilted-brown.webp",
  "tool or kit": "icons/tools/hand/hammer-and-nail.webp",
  "hooded lantern": "icons/sundries/lights/lantern-iron-yellow.webp",
  "hanging lantern rod": "icons/sundries/lights/lantern-iron-yellow.webp",
  "lamp": "icons/sundries/lights/lantern-battery-steel.webp",
  "robes": "icons/equipment/chest/robe-layered-blue.webp",
  "clothes (simple)": "icons/equipment/chest/breastplate-quilted-brown.webp",
  "clothes (noble)": "icons/equipment/chest/robe-layered-blue.webp",
  "flask of oil": "icons/consumables/potions/bottle-bulb-corked-labeled-blue.webp",
  "flask": "icons/consumables/drinks/alcohol-beer-mug-yellow.webp",
  "oil": "icons/consumables/potions/bottle-bulb-corked-labeled-blue.webp",
  "small collection of books and scrolls": "icons/sundries/books/book-backed-blue-gold.webp",
  "small collection of scrolls": "icons/sundries/documents/parchment-plain-tan.webp",
  "books of any topic fiction or nonfiction": "icons/sundries/books/book-backed-blue-gold.webp",
  "book of laws": "icons/sundries/books/book-backed-blue-gold.webp",
  "blank journal": "icons/sundries/books/book-embossed-bound-brown.webp",
  "medicinal tome": "icons/sundries/books/book-backed-blue-gold.webp",
  "gavel": "icons/tools/hand/hammer-and-nail.webp",
  "rations": "icons/consumables/food/cooked-drumstick-chicken-turkey-brown.webp",
  "inkpot": "icons/tools/scribal/ink-quill-pink.webp",
  "ink": "icons/tools/scribal/ink-quill-pink.webp",
  "quill pen": "icons/tools/scribal/ink-quill-pink.webp",
  "quill": "icons/tools/scribal/ink-quill-pink.webp",
  "wineskin": "icons/sundries/survival/waterskin-leather-brown.webp",
  "rucksack": "icons/containers/bags/pack-leather-strapped-tan.webp",
  "traveler’s pack": "icons/containers/bags/pack-leather-strapped-tan.webp",
  "belt pouch": "icons/containers/bags/pouch-leather-brown-green.webp",
  "belt pouches": "icons/containers/bags/pouch-leather-brown-green.webp",
  "various pouches and bottles": "icons/containers/bags/pouch-leather-brown-green.webp",
  "pocketed cloak": "icons/equipment/chest/robe-layered-blue.webp",
  "hooded cloak": "icons/equipment/chest/robe-layered-blue.webp",
  "embroidered hooded cloak": "icons/equipment/chest/robe-layered-blue.webp",
  "con gear": "icons/dice/d20black.svg",
  "gear to run your con of choice": "icons/dice/d20black.svg",
  "gear to run your con of choice (choose one: marked cards, weighted dice, defunct goods, fake antiques, or false gems/gold)": "icons/dice/d20black.svg",
  "small hand cart or prop-up stand": "icons/environment/settlement/wagon-black.webp",
  "candles": "icons/sundries/lights/candle-lit-angelic.webp",
  "religious icon": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "incense": "icons/magic/symbols/runes-star-pentagon-orange-purple.webp",
  "instruments": "icons/tools/instruments/lute-gold-brown.webp",
  "makeup": "icons/tools/hand/awl-steel-tan.webp",
  "costumes/disguises": "icons/equipment/chest/robe-collared-blue.webp",
  "props such as juggling balls or a book of songs": "icons/tools/instruments/lute-gold-brown.webp",
  "a spear or a halberd": "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  "spear or halberd": "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  "chainmail": "icons/equipment/chest/breastplate-banded-steel-grey.webp",
  "chainmail armor": "icons/equipment/chest/breastplate-banded-steel-grey.webp",
  "leather armor": "icons/equipment/chest/breastplate-banded-leather-brown.webp",
  "brigandine armor": "icons/equipment/chest/breastplate-layered-leather-black.webp",
  "torches": "icons/sundries/lights/torch-brown-lit.webp",
  "deck of cards": "icons/dice/d20black.svg",
  "cards": "icons/dice/d20black.svg",
  "insignia of rank": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "insignia of rank (banner, patch, pin, etc.)": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "signet ring": "icons/equipment/finger/ring-ball-gold-pink.webp",
  "mess kit": "icons/tools/cooking/pot-camping-iron-black.webp",
  "bowl": "icons/tools/cooking/pot-camping-iron-black.webp",
  "one large blade": "icons/weapons/swords/greatsword-crossguard-steel.webp",
  "large blade": "icons/weapons/swords/greatsword-crossguard-steel.webp",
  "50 ft rope": "icons/sundries/survival/rope-braided-yellow.webp",
  "rope": "icons/sundries/survival/rope-braided-yellow.webp",
  "bandages": "icons/tools/medical/medkit-heavy.webp",
  "wood- splitting axe": "icons/weapons/axes/axe-battle-black.webp",
  "wood-splitting axe": "icons/weapons/axes/axe-battle-black.webp",
  "two-person tent": "icons/environment/settlement/house-wooden-fence.webp",
  "tent": "icons/environment/settlement/house-wooden-fence.webp",
  "folding chair": "icons/environment/settlement/house-wooden-fence.webp",
  "scales": "icons/tools/hand/trowel.webp",
  "magnifying lens": "icons/tools/scribal/magnifying-glass.webp",
  "bolt of fabric (silk)": "icons/commodities/cloth/cloth-bolt-purple.webp",
  "daggers or knives": "icons/weapons/daggers/dagger-black.webp",
  "cestus or brass knuckles": "icons/weapons/fist/claw-leather-brown.webp"
};

/**
 * Category & Keyword Fallback Rules for Equipment (evaluated in top-down order).
 */
export const KEYWORD_ICON_RULES = [
  { regex: /\b(?:greatsword|claymore|nodachi|zweihander)\b/i, icon: "icons/weapons/swords/greatsword-blue.webp" },
  { regex: /\b(?:shortsword|gladius|wakizashi)\b/i, icon: "icons/weapons/swords/shortsword-guard-brass.webp" },
  { regex: /\b(?:scimitar|falchion|saber|cutlass|khopesh)\b/i, icon: "icons/weapons/swords/scimitar-guard-brown.webp" },
  { regex: /\b(?:rapier|estoc|foil|epee|fencing)\b/i, icon: "icons/weapons/swords/sword-cane.webp" },
  { regex: /\b(?:katana|tachi)\b/i, icon: "icons/weapons/swords/sword-katana-purple.webp" },
  { regex: /\b(?:dagger|dirk|stiletto|poniard|knife|kunai|blade)\b/i, icon: "icons/weapons/daggers/dagger-black.webp" },
  { regex: /\b(?:sword|broadsword|longsword|bastard sword)\b/i, icon: "icons/weapons/swords/greatsword-crossguard-steel.webp" },
  { regex: /\b(?:greataxe|battleaxe|battle axe|war axe|hatchet|handaxe|axe)\b/i, icon: "icons/weapons/axes/axe-battle-black.webp" },
  { regex: /\b(?:warhammer|maul|hammer|sledgehammer|mallet|gavel)\b/i, icon: "icons/weapons/hammers/hammer-double-engraved-gold.webp" },
  { regex: /\b(?:pick|war pick|pickaxe)\b/i, icon: "icons/weapons/axes/pickaxe-bone-black.webp" },
  { regex: /\b(?:quarterstaff|staff|walking stick|cane|rod)\b/i, icon: "icons/weapons/staves/staff-simple-blue.webp" },
  { regex: /\b(?:spear|pike|javelin|lance|halberd|glaive|poleaxe|bardiche|trident|scythe|yari)\b/i, icon: "icons/weapons/polearms/halberd-crescent-engraved-steel.webp" },
  { regex: /\b(?:longbow|shortbow|recurve|composite bow|bow)\b/i, icon: "icons/weapons/bows/longbow-recurve-brown.webp" },
  { regex: /\b(?:heavy crossbow|light crossbow|hand crossbow|crossbow|arbalest)\b/i, icon: "icons/weapons/crossbows/crossbow-blue.webp" },
  { regex: /\b(?:arrow|arrows|quiver|bolt|bolts)\b/i, icon: "icons/weapons/ammunition/arrows-barbed-white.webp" },
  { regex: /\b(?:sling|slingshot|blowgun|boomerang|shuriken|dart)\b/i, icon: "icons/weapons/slings/sling-leather.webp" },
  { regex: /\b(?:flail|morningstar|morning star|nunchaku|nunchucks)\b/i, icon: "icons/weapons/maces/flail-spiked-grey.webp" },
  { regex: /\b(?:mace|club|baton|cudgel|bludgeon|tetsubo|sap|blackjack)\b/i, icon: "icons/weapons/maces/mace-flanged-steel-grey.webp" },
  { regex: /\b(?:fist|knuckle|knuckles|cestus|brawling|gauntlet|punch)\b/i, icon: "icons/weapons/fist/claw-leather-brown.webp" },
  { regex: /\b(?:whip|lash|cat-o-nine)\b/i, icon: "icons/weapons/misc/whip-leather.webp" },
  { regex: /\b(?:wand|rod|scepter|focus)\b/i, icon: "icons/weapons/wands/wand-carved-fire.webp" },
  { regex: /\b(?:plate|full plate|half plate|field plate|cuirass)\b/i, icon: "icons/equipment/chest/breastplate-layered-steel-black.webp" },
  { regex: /\b(?:chain mail|chainmail|hauberk|scale mail|scalemail|splint|banded|lamellar|brigandine)\b/i, icon: "icons/equipment/chest/breastplate-banded-steel-grey.webp" },
  { regex: /\b(?:leather|gambeson|padded|hide|quilted|studded)\b/i, icon: "icons/equipment/chest/breastplate-banded-leather-brown.webp" },
  { regex: /\b(?:robe|robes|vestment|vestments|tunic|cloak|cape|mantle)\b/i, icon: "icons/equipment/chest/robe-layered-blue.webp" },
  { regex: /\b(?:shield|buckler|heater|kite|tower)\b/i, icon: "icons/equipment/shield/buckler-boss-iron-wood-brown.webp" },
  { regex: /\b(?:helmet|helm|coif|hood|hat|cap|circlet|crown)\b/i, icon: "icons/equipment/head/helm-armored-tech-heavy.webp" },
  { regex: /\b(?:boots|shoes|sandals|greaves|sabaton)\b/i, icon: "icons/equipment/feet/boots-armored-banded-steel.webp" },
  { regex: /\b(?:gloves|bracers|gauntlets|mitts)\b/i, icon: "icons/containers/bags/pack-leather-strapped-tan.webp" },
  { regex: /\b(?:belt|girdle|sash|waist)\b/i, icon: "icons/equipment/waist/belt-armored-buckle-steel.webp" },
  { regex: /\b(?:ring|band|signet)\b/i, icon: "icons/equipment/finger/ring-ball-gold-pink.webp" },
  { regex: /\b(?:amulet|necklace|pendant|medallion|periapt|talisman|choker)\b/i, icon: "icons/equipment/neck/amulet-carved-runed-othila-fehu-grey.webp" },
  { regex: /\b(?:alchem|herbal|poisoner|lab|flask|vial|mortar|pestle|apothecary)\b/i, icon: "icons/tools/laboratory/alembic-glass-ball-blue.webp" },
  { regex: /\b(?:healer|medic|first aid|surgeon|surgery|bandage|bandages|splint|scalpel)\b/i, icon: "icons/tools/medical/medkit-heavy.webp" },
  { regex: /\b(?:thief|thieves|lockpick|skulduggery|burglar|pickpocket|crowbar)\b/i, icon: "icons/tools/hand/lockpicks-steel-grey.webp" },
  { regex: /\b(?:navigator|cartograph|compass|sextant|spyglass|telescope|astrolabe|map)\b/i, icon: "icons/tools/navigation/compass-brass-blue-red.webp" },
  { regex: /\b(?:trapper|trap|snare)\b/i, icon: "icons/environment/traps/cage-grey-steel.webp" },
  { regex: /\b(?:fishing|fish|rod|tackle|net)\b/i, icon: "icons/tools/fishing/basket-blue-tan.webp" },
  { regex: /\b(?:carpenter|woodwork|woodworking|saw|plane|chisel)\b/i, icon: "icons/tools/hand/hammer-and-nail.webp" },
  { regex: /\b(?:blacksmith|smith|smithing|forge|anvil|bellows|tongs|crucible)\b/i, icon: "icons/tools/smithing/anvil.webp" },
  { regex: /\b(?:leatherworker|leatherworking|cobbler|shoemaker|awl)\b/i, icon: "icons/tools/hand/awl-steel-tan.webp" },
  { regex: /\b(?:mason|masonry|trowel|brick)\b/i, icon: "icons/tools/hand/trowel.webp" },
  { regex: /\b(?:jewel|jeweler|gem|gemstone)\b/i, icon: "icons/commodities/treasure/box-jade-tassel.webp" },
  { regex: /\b(?:cook|cooking|culinary|chef|pot|pan|utensil|utensils|skillet|cauldron|bowl)\b/i, icon: "icons/tools/cooking/pot-camping-iron-black.webp" },
  { regex: /\b(?:brewer|brewing|distill|distilling|ferment|fermenting)\b/i, icon: "icons/tools/cooking/cauldron-empty.webp" },
  { regex: /\b(?:scribe|scribal|calligraph|ink|quill|pen|vellum|parchment)\b/i, icon: "icons/tools/scribal/ink-quill-pink.webp" },
  { regex: /\b(?:painter|painting|artist|easel|canvas|palette|brush)\b/i, icon: "icons/tools/hand/brush-paint-brown-tan.webp" },
  { regex: /\b(?:weaver|tailor|sewing|thread|needle|loom|spindle)\b/i, icon: "icons/commodities/cloth/thread-and-needle.webp" },
  { regex: /\b(?:barber|shave|razor|scissors|shears)\b/i, icon: "icons/tools/hand/shears.webp" },
  { regex: /\b(?:tinker|engineer|clockwork|cog|wrench)\b/i, icon: "icons/tools/hand/wrench-adjustable-toothed.webp" },
  { regex: /\b(?:lute|guitar|mandolin|cittern|dulcimer|harp|lyre|psaltery|zither)\b/i, icon: "icons/tools/instruments/lute-gold-brown.webp" },
  { regex: /\b(?:flute|pipe|recorder|fife|panpipe|panpipes|ocarina|whistle)\b/i, icon: "icons/tools/instruments/flute-simple-wood.webp" },
  { regex: /\b(?:drum|bongo|bodhran|tabor|tambourine|percussion|gong|cymbal|bell)\b/i, icon: "icons/tools/instruments/drum-brown-red.webp" },
  { regex: /\b(?:horn|trumpet|bugle|cornet|trombone|tuba|sackbut|shofar)\b/i, icon: "icons/tools/instruments/horn-flared-wood.webp" },
  { regex: /\b(?:violin|fiddle|viol|viola|cello|bass)\b/i, icon: "icons/tools/instruments/lute-gold-brown.webp" },
  { regex: /\b(?:bagpipes|bagpipe)\b/i, icon: "icons/tools/instruments/bell-brass-brown.webp" },
  { regex: /\b(?:instrument|instruments|music|song)\b/i, icon: "icons/tools/instruments/lute-gold-brown.webp" },
  { regex: /\b(?:backpack|rucksack|knapsack|pack)\b/i, icon: "icons/containers/bags/pack-leather-strapped-tan.webp" },
  { regex: /\b(?:pouch|pouches|purse|coin purse|money pouch)\b/i, icon: "icons/containers/bags/pouch-leather-brown-green.webp" },
  { regex: /\b(?:sack|bag|bags|cargo bag|duffel|tote|satchel)\b/i, icon: "icons/containers/bags/sack-cloth-tan.webp" },
  { regex: /\b(?:saddlebag|saddlebags|haversack)\b/i, icon: "icons/containers/bags/case-embossed-leather-tan.webp" },
  { regex: /\b(?:chest|trunk|locker|box|coffer|crate|casket)\b/i, icon: "icons/containers/chest/chest-reinforced-box-brown.webp" },
  { regex: /\b(?:scroll case|case|quiver|holster|scabbard|sheath)\b/i, icon: "icons/containers/bags/case-scroll-leather-tan.webp" },
  { regex: /\b(?:vial|phial|ampoule)\b/i, icon: "icons/tools/laboratory/vials-blue-pink.webp" },
  { regex: /\b(?:torch|torches)\b/i, icon: "icons/sundries/lights/torch-brown-lit.webp" },
  { regex: /\b(?:lantern|lamp|beacon|cresset)\b/i, icon: "icons/sundries/lights/lantern-battery-steel.webp" },
  { regex: /\b(?:candle|candles|tallow|wax)\b/i, icon: "icons/sundries/lights/candle-lit-angelic.webp" },
  { regex: /\b(?:tinder|flint|match|matches|fire starter)\b/i, icon: "icons/tools/smithing/pincers.webp" },
  { regex: /\b(?:bedroll|blanket|sleeping bag|hammock|mat)\b/i, icon: "icons/sundries/survival/bedroll-blue-red.webp" },
  { regex: /\b(?:tent|pavilion|yurt|shelter|canopy|tarp)\b/i, icon: "icons/environment/settlement/house-wooden-fence.webp" },
  { regex: /\b(?:rope|cord|twine|string|cable|hemp)\b/i, icon: "icons/sundries/survival/rope-braided-yellow.webp" },
  { regex: /\b(?:chain|manacles|shackles|cuffs|fetters)\b/i, icon: "icons/tools/fasteners/chain-steel-blue.webp" },
  { regex: /\b(?:piton|pitons|grappling hook|grapple|spike|spikes|crampons)\b/i, icon: "icons/tools/fasteners/pin-spiked.webp" },
  { regex: /\b(?:waterskin|wineskin|canteen|flask|jug|bottle)\b/i, icon: "icons/sundries/survival/waterskin-leather-brown.webp" },
  { regex: /\b(?:shovel|spade)\b/i, icon: "icons/tools/hand/shovel-steel.webp" },
  { regex: /\b(?:holy symbol|religious icon|relic|sacred symbol|talisman|ankh|crucifix)\b/i, icon: "icons/magic/holy/angel-winged-humanoid-blue.webp" },
  { regex: /\b(?:writ|document|contract|deed|letter|warrant|charter|decree)\b/i, icon: "icons/sundries/documents/document-writing-brown.webp" },
  { regex: /\b(?:parchment|paper|scroll|scrolls)\b/i, icon: "icons/sundries/documents/parchment-plain-tan.webp" },
  { regex: /\b(?:book|books|tome|grimoire|journal|diary|ledger)\b/i, icon: "icons/sundries/books/book-backed-blue-gold.webp" },
  { regex: /\b(?:dice|cards|deck|game|chess|con gear)\b/i, icon: "icons/dice/d20black.svg" },
  { regex: /\b(?:ration|rations|meal|meat|stew|bread|food|cheese)\b/i, icon: "icons/consumables/food/cooked-drumstick-chicken-turkey-brown.webp" },
  { regex: /\b(?:ale|beer|wine|cider|spirits|liquor|whiskey|mead|rum)\b/i, icon: "icons/consumables/drinks/alcohol-beer-mug-yellow.webp" },
  { regex: /\b(?:healing potion|healing elixir|cure|antidote)\b/i, icon: "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp" },
  { regex: /\b(?:herb|herbs|plants|leaves|roots)\b/i, icon: "icons/tools/laboratory/bowl-herbs-green.webp" },
  { regex: /\b(?:spice|spices|seasoning|incense)\b/i, icon: "icons/tools/cooking/mortar-herbs-yellow.webp" },
  { regex: /\b(?:horse|mount|steed|mare|stallion|pony|donkey|mule)\b/i, icon: "icons/environment/creatures/horse-brown.webp" },
  { regex: /\b(?:hound|dog|wolf)\b/i, icon: "icons/commodities/treasure/figurine-dog.webp" },
  { regex: /\b(?:ox|bull|cow|cattle)\b/i, icon: "icons/environment/creatures/horse-brown.webp" },
  { regex: /\b(?:cart|wagon|carriage)\b/i, icon: "icons/environment/settlement/wagon-black.webp" },
  { regex: /\b(?:boat|ship|vessel|galley|canoe|raft)\b/i, icon: "icons/environment/vehicles/boat-fishing-masted.webp" },
];

/**
 * Exact name lookup mapping for Backgrounds and Professions to canonical Foundry core icons.
 */
export const EXACT_BOP_ICONS = {
  // Backgrounds
  "acolyte": "icons/magic/holy/prayer-hands-glowing-yellow-white.webp",
  "academic": "icons/skills/trades/academics-study-reading-book.webp",
  "archivist": "icons/sundries/books/book-embossed-gold-green.webp",
  "aristocrat": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "artisan": "icons/tools/smithing/anvil.webp",
  "barrister": "icons/sundries/documents/document-writing-brown.webp",
  "charlatan": "icons/magic/symbols/clover-luck-white-green.webp",
  "clergy": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "courtesan": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "criminal": "icons/weapons/daggers/dagger-black.webp",
  "cultist": "icons/magic/unholy/silhouette-robe-evil-glow.webp",
  "drifter": "icons/environment/people/commoner.webp",
  "entertainer": "icons/tools/instruments/lute-gold-brown.webp",
  "farmer": "icons/environment/settlement/house-wooden-fence.webp",
  "gladiator": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "guild artisan": "icons/tools/smithing/anvil.webp",
  "herbalist": "icons/tools/laboratory/bowl-herbs-green.webp",
  "hermit": "icons/magic/nature/elemental-plant-humanoid.webp",
  "highborn": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "hunter": "icons/skills/ranged/target-bullseye-archer-orange.webp",
  "inquisitor": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "knight": "icons/equipment/chest/breastplate-layered-steel-black.webp",
  "knave": "icons/magic/symbols/clover-luck-white-green.webp",
  "laborer": "icons/tools/hand/hammer-and-nail.webp",
  "lawyer": "icons/sundries/documents/document-writing-brown.webp",
  "merchant": "icons/containers/bags/pouch-leather-brown-green.webp",
  "miner": "icons/tools/hand/pickaxe-simple-stone-brown.webp",
  "minstrel": "icons/tools/instruments/lute-gold-brown.webp",
  "noble": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "nomad": "icons/environment/vehicles/boat-fishing-masted.webp",
  "outlander": "icons/skills/movement/feet-winged-boots-blue.webp",
  "pauper": "icons/environment/people/commoner.webp",
  "peasant": "icons/environment/people/commoner.webp",
  "performer": "icons/tools/instruments/lute-gold-brown.webp",
  "physician": "icons/tools/medical/medkit-heavy.webp",
  "pioneer": "icons/tools/navigation/compass-brass-blue-red.webp",
  "pirate": "icons/environment/vehicles/boat-fishing-masted.webp",
  "priest": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "scholar": "icons/skills/trades/academics-study-reading-book.webp",
  "scout": "icons/tools/navigation/compass-brass-blue-red.webp",
  "scribe": "icons/tools/scribal/ink-quill-pink.webp",
  "servant": "icons/environment/people/commoner.webp",
  "shaman": "icons/magic/nature/beam-hand-leaves-green.webp",
  "smuggler": "icons/containers/bags/pouch-leather-brown-green.webp",
  "soldier": "icons/equipment/head/helm-armored-tech-heavy.webp",
  "spy": "icons/weapons/daggers/dagger-black.webp",
  "student": "icons/skills/trades/academics-study-reading-book.webp",
  "thief": "icons/tools/hand/lockpicks-steel-grey.webp",
  "tinker": "icons/tools/hand/wrench-adjustable-toothed.webp",
  "trader": "icons/containers/bags/pouch-leather-brown-green.webp",
  "urchin": "icons/skills/movement/feet-winged-boots-blue.webp",
  "vagabond": "icons/environment/people/commoner.webp",
  "veteran": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "villager": "icons/environment/settlement/house-wooden-fence.webp",

  // Professions
  "alchemist profession": "icons/tools/laboratory/alembic-glass-ball-blue.webp",
  "apothecary profession": "icons/tools/laboratory/bowl-herbs-green.webp",
  "archaeologist profession": "icons/sundries/books/book-embossed-gold-green.webp",
  "archer profession": "icons/skills/ranged/target-bullseye-archer-orange.webp",
  "architect profession": "icons/sundries/documents/blueprints.webp",
  "armorer profession": "icons/equipment/chest/breastplate-layered-steel-black.webp",
  "artisan profession": "icons/tools/smithing/anvil.webp",
  "assassin profession": "icons/weapons/daggers/dagger-black.webp",
  "astrologer profession": "icons/magic/perception/eye-ringed-glow-angry-teal.webp",
  "bandit profession": "icons/weapons/daggers/dagger-black.webp",
  "bard profession": "icons/tools/instruments/lute-gold-brown.webp",
  "barrister profession": "icons/sundries/documents/document-writing-brown.webp",
  "beastmaster profession": "icons/magic/nature/elemental-plant-humanoid.webp",
  "blacksmith profession": "icons/tools/smithing/anvil.webp",
  "bounty hunter profession": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "brawler profession": "icons/skills/melee/unarmed-punch-fist-blue.webp",
  "brewer profession": "icons/tools/cooking/cauldron-empty.webp",
  "burglar profession": "icons/tools/hand/lockpicks-steel-grey.webp",
  "carpenter profession": "icons/tools/hand/hammer-and-nail.webp",
  "cartographer profession": "icons/tools/navigation/map-chart-tan.webp",
  "champion profession": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "charlatan profession": "icons/magic/symbols/clover-luck-white-green.webp",
  "chef profession": "icons/tools/cooking/pot-camping-iron-black.webp",
  "chronicler profession": "icons/sundries/books/book-backed-blue-gold.webp",
  "clergy profession": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "clerk profession": "icons/tools/scribal/ink-quill-pink.webp",
  "cobbler profession": "icons/tools/hand/awl-steel-tan.webp",
  "commander profession": "icons/skills/social/diplomacy-handshake-blue.webp",
  "cook profession": "icons/tools/cooking/pot-camping-iron-black.webp",
  "courier profession": "icons/skills/movement/figure-running-gray.webp",
  "criminal profession": "icons/weapons/daggers/dagger-black.webp",
  "detective profession": "icons/tools/scribal/magnifying-glass.webp",
  "diplomat profession": "icons/skills/social/diplomacy-peace-alliance.webp",
  "doctor profession": "icons/tools/medical/medkit-heavy.webp",
  "druid profession": "icons/magic/nature/beam-hand-leaves-green.webp",
  "duelist profession": "icons/skills/melee/hand-grip-sword-strike-orange.webp",
  "enchanter profession": "icons/magic/symbols/runes-star-pentagon-orange-purple.webp",
  "engineer profession": "icons/tools/hand/wrench-adjustable-toothed.webp",
  "entertainer profession": "icons/tools/instruments/lute-gold-brown.webp",
  "explorer profession": "icons/tools/navigation/compass-brass-blue-red.webp",
  "farmer profession": "icons/environment/settlement/house-wooden-fence.webp",
  "fighter profession": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "fisherman profession": "icons/tools/fishing/basket-blue-tan.webp",
  "forester profession": "icons/magic/nature/beam-hand-leaves-green.webp",
  "gladiator profession": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "guard profession": "icons/equipment/head/helm-armored-tech-heavy.webp",
  "healer profession": "icons/magic/life/cross-flared-green.webp",
  "herbalist profession": "icons/tools/laboratory/bowl-herbs-green.webp",
  "hunter profession": "icons/skills/ranged/target-bullseye-archer-orange.webp",
  "innkeeper profession": "icons/consumables/drinks/alcohol-beer-mug-yellow.webp",
  "inquisitor profession": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "jeweler profession": "icons/commodities/treasure/box-jade-tassel.webp",
  "judge profession": "icons/sundries/documents/document-writing-brown.webp",
  "knight profession": "icons/equipment/chest/breastplate-layered-steel-black.webp",
  "leatherworker profession": "icons/tools/hand/awl-steel-tan.webp",
  "mage profession": "icons/magic/symbols/runes-star-pentagon-orange-purple.webp",
  "mariner profession": "icons/environment/vehicles/boat-fishing-masted.webp",
  "mason profession": "icons/tools/hand/trowel.webp",
  "mercenary profession": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "merchant profession": "icons/containers/bags/pouch-leather-brown-green.webp",
  "miner profession": "icons/tools/hand/pickaxe-simple-stone-brown.webp",
  "minstrel profession": "icons/tools/instruments/lute-gold-brown.webp",
  "monk profession": "icons/magic/holy/meditation-chi-focus-blue.webp",
  "navigator profession": "icons/tools/navigation/compass-brass-blue-red.webp",
  "noble profession": "icons/commodities/treasure/token-engraved-pickaxe-pink.webp",
  "nomad profession": "icons/environment/vehicles/boat-fishing-masted.webp",
  "officer profession": "icons/skills/social/diplomacy-handshake-blue.webp",
  "painter profession": "icons/tools/hand/brush-paint-brown-tan.webp",
  "paladin profession": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "performer profession": "icons/tools/instruments/lute-gold-brown.webp",
  "physician profession": "icons/tools/medical/medkit-heavy.webp",
  "pioneer profession": "icons/tools/navigation/compass-brass-blue-red.webp",
  "pirate profession": "icons/environment/vehicles/boat-fishing-masted.webp",
  "priest profession": "icons/magic/holy/angel-winged-humanoid-blue.webp",
  "ranger profession": "icons/skills/ranged/target-bullseye-archer-orange.webp",
  "rogue profession": "icons/weapons/daggers/dagger-black.webp",
  "sailor profession": "icons/environment/vehicles/boat-fishing-masted.webp",
  "scholar profession": "icons/skills/trades/academics-study-reading-book.webp",
  "scout profession": "icons/tools/navigation/compass-brass-blue-red.webp",
  "scribe profession": "icons/tools/scribal/ink-quill-pink.webp",
  "shaman profession": "icons/magic/nature/beam-hand-leaves-green.webp",
  "soldier profession": "icons/equipment/head/helm-armored-tech-heavy.webp",
  "sorcerer profession": "icons/magic/fire/beam-jet-stream-blue.webp",
  "spy profession": "icons/weapons/daggers/dagger-black.webp",
  "tailor profession": "icons/commodities/cloth/thread-and-needle.webp",
  "thief profession": "icons/tools/hand/lockpicks-steel-grey.webp",
  "tinker profession": "icons/tools/hand/wrench-adjustable-toothed.webp",
  "tracker profession": "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "trader profession": "icons/containers/bags/pouch-leather-brown-green.webp",
  "urchin profession": "icons/skills/movement/feet-winged-boots-blue.webp",
  "veteran profession": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "warden profession": "icons/magic/defensive/armor-shield-barrier-steel.webp",
  "warrior profession": "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "watchman profession": "icons/equipment/head/helm-armored-tech-heavy.webp",
  "wizard profession": "icons/magic/symbols/runes-star-pentagon-orange-purple.webp",
};

/**
 * Keyword Rules for Backgrounds and Professions.
 */
export const BOP_KEYWORD_RULES = [
  { regex: /\b(?:clerg|priest|acolyte|bishop|chaplain|devout|pastor|preacher)\b/i, icon: "icons/magic/holy/angel-winged-humanoid-blue.webp" },
  { regex: /\b(?:inquisit|zealot|crusad)\b/i, icon: "icons/magic/holy/angel-winged-humanoid-blue.webp" },
  { regex: /\b(?:knight|paladin|cavalier|chivalr)\b/i, icon: "icons/equipment/chest/breastplate-layered-steel-black.webp" },
  { regex: /\b(?:soldier|guard|watchman|sentry|infantry|legionnaire|mercenary|militia|enforcer)\b/i, icon: "icons/equipment/head/helm-armored-tech-heavy.webp" },
  { regex: /\b(?:warrior|fighter|champion|gladiator|brawler|duelist|slayer)\b/i, icon: "icons/skills/melee/weapons-crossed-swords-yellow.webp" },
  { regex: /\b(?:thief|burglar|pickpocket|cutpurse|outlaw|bandit|highwayman|rogue|scoundrel)\b/i, icon: "icons/tools/hand/lockpicks-steel-grey.webp" },
  { regex: /\b(?:criminal|assassin|spy|infiltrator|hitman)\b/i, icon: "icons/weapons/daggers/dagger-black.webp" },
  { regex: /\b(?:charlatan|con artist|trickster|gambler|swindler|knave)\b/i, icon: "icons/magic/symbols/clover-luck-white-green.webp" },
  { regex: /\b(?:noble|aristocrat|highborn|lord|lady|duke|baron|prince|royal|courtier)\b/i, icon: "icons/commodities/treasure/token-engraved-pickaxe-pink.webp" },
  { regex: /\b(?:merchant|trader|peddler|shopkeeper|vendor|banker|money)\b/i, icon: "icons/containers/bags/pouch-leather-brown-green.webp" },
  { regex: /\b(?:barrister|lawyer|judge|magistrate|advocate|solicitor|clerk)\b/i, icon: "icons/sundries/documents/document-writing-brown.webp" },
  { regex: /\b(?:archivist|scholar|historian|philosopher|chronicler|academic|student)\b/i, icon: "icons/sundries/books/book-embossed-gold-green.webp" },
  { regex: /\b(?:scribe|calligrapher|author|writer|poet)\b/i, icon: "icons/tools/scribal/ink-quill-pink.webp" },
  { regex: /\b(?:physician|doctor|healer|medic|surgeon|apothecary|nurse)\b/i, icon: "icons/tools/medical/medkit-heavy.webp" },
  { regex: /\b(?:alchemist|brewer|distiller|chemist)\b/i, icon: "icons/tools/laboratory/alembic-glass-ball-blue.webp" },
  { regex: /\b(?:blacksmith|smith|armorer|weaponsmith|metalsmith|forge)\b/i, icon: "icons/tools/smithing/anvil.webp" },
  { regex: /\b(?:carpenter|woodcarver|stonemason|mason|builder|craftsman|artisan|whittler)\b/i, icon: "icons/tools/hand/hammer-and-nail.webp" },
  { regex: /\b(?:tinker|engineer|architect|inventor|machinist|clockmaker)\b/i, icon: "icons/tools/hand/wrench-adjustable-toothed.webp" },
  { regex: /\b(?:cobbler|leatherworker|tanner|tailor|weaver|seamstress)\b/i, icon: "icons/tools/hand/awl-steel-tan.webp" },
  { regex: /\b(?:jeweler|gemcutter|lapidary|goldsmith|silversmith)\b/i, icon: "icons/commodities/treasure/box-jade-tassel.webp" },
  { regex: /\b(?:cook|chef|baker|innkeeper|tavernkeeper)\b/i, icon: "icons/tools/cooking/pot-camping-iron-black.webp" },
  { regex: /\b(?:entertainer|bard|minstrel|troubadour|performer|actor|musician|singer|skald|jester)\b/i, icon: "icons/tools/instruments/lute-gold-brown.webp" },
  { regex: /\b(?:artist|painter|sculptor|illustrator)\b/i, icon: "icons/tools/hand/brush-paint-brown-tan.webp" },
  { regex: /\b(?:sailor|mariner|pirate|seaman|captain|navigator|pilot|explorer)\b/i, icon: "icons/environment/vehicles/boat-fishing-masted.webp" },
  { regex: /\b(?:pioneer|scout|tracker|cartographer|surveyor|ranger|guide)\b/i, icon: "icons/tools/navigation/compass-brass-blue-red.webp" },
  { regex: /\b(?:hunter|archer|marksman|bowman|fletcher|poacher|trapper)\b/i, icon: "icons/skills/ranged/target-bullseye-archer-orange.webp" },
  { regex: /\b(?:fisherman|angler)\b/i, icon: "icons/tools/fishing/basket-blue-tan.webp" },
  { regex: /\b(?:farmer|peasant|herder|shepherd|gardener|forester|woodcutter|logger|laborer|villager|drifter|pauper|urchin|servant)\b/i, icon: "icons/environment/settlement/house-wooden-fence.webp" },
  { regex: /\b(?:miner|quarryman|prospector|excavator)\b/i, icon: "icons/tools/hand/pickaxe-simple-stone-brown.webp" },
  { regex: /\b(?:shaman|druid|witch doctor|hermit|herbalist)\b/i, icon: "icons/magic/nature/beam-hand-leaves-green.webp" },
  { regex: /\b(?:mage|wizard|sorcerer|warlock|enchanter|necromancer|elementalist|illusionist)\b/i, icon: "icons/magic/symbols/runes-star-pentagon-orange-purple.webp" },
];

/**
 * Category & Keyword Rules for Talents & Features (evaluated in top-down order).
 */
export const TALENT_ICON_RULES = [
  // 1. Specific combat maneuvers and weapon strikes
  { regex: /\b(?:pierc|thrust|stab|lunge|skewer|impale|rapier|estoc|spear strike|bayonet|pinpoint strike)\b/i, icon: "icons/skills/melee/hand-grip-sword-strike-orange.webp" },
  { regex: /\b(?:slash|cleave|whirlwind|flurry|blade dance|sword storm|dual wield|twin strike|dual strike|mow down|scything strike|reap|reaper|sever)\b/i, icon: "icons/skills/melee/weapons-crossed-swords-yellow.webp" },
  { regex: /\b(?:crush|smash|bludgeon|heavy hit|shatter|concussion|hammer blow|ground slam|impact|sledge|demolish)\b/i, icon: "icons/skills/melee/unarmed-punch-fist-yellow-red.webp" },
  { regex: /\b(?:punch|kick|fist|unarmed|brawler|pugilist|martial art|iron fist|drunken|knuckle|grapple|tackle|throw|wrestle|body slam|choke|headbutt|trip|takedown|sweep)\b/i, icon: "icons/skills/melee/unarmed-punch-fist-blue.webp" },
  { regex: /\b(?:parry|riposte|deflect|counter|reactive stance|defensive stance|blade blocker|weapon guard|disarm|feint|maneuver|footwork|flourish)\b/i, icon: "icons/skills/melee/hand-grip-staff-teal.webp" },
  { regex: /\b(?:tower shield|medium shield|shield train|shield wall|shield block|shield bash|shield slam|bulwark|phalanx)\b/i, icon: "icons/magic/defensive/armor-shield-barrier-steel.webp" },
  { regex: /\b(?:shield|block|bastion|wall of defense|defend|cover|intervene|bodyguard|protect)\b/i, icon: "icons/magic/defensive/shield-barrier-blue.webp" },

  // 2. Wounds, Bleed, Fury, Berserk
  { regex: /\b(?:rend|great rend|bleed|blood|hemomancy|lacerate|gash|deep wound|hemorrhage|mutilat|sever artery|open wound|gore|butcher)\b/i, icon: "icons/skills/wounds/blood-drip-droplet-red.webp" },
  { regex: /\b(?:berserk|rage|frenzy|bloodlust|reckless|rampage|juggernaut|unbridled|wrath|furious|outrage|death wish)\b/i, icon: "icons/skills/wounds/injury-face-impact-orange.webp" },
  { regex: /\b(?:take a punch|hardy|toughness|resilience|thick hide|iron skin|stone skin|endure|fortitude|tenacity|unyielding|indomitable|grit|stamina|survivalist)\b/i, icon: "icons/magic/defensive/armor-stone-skin.webp" },
  { regex: /\b(?:armor|plate|mail|cuirass|hardened|reinforced|adamantine|heavy armor|dwarven craft|armored)\b/i, icon: "icons/equipment/chest/breastplate-banded-blue.webp" },

  // 3. Ranged & Targeting
  { regex: /\b(?:aim|aimed shot|deadeye|bullseye|volley|barrage|recurve|arrow|bolt|marksman|marksmanship|snipe|sniper|ricochet|trick shot|long shot|rapid fire|double shot)\b/i, icon: "icons/skills/ranged/target-bullseye-archer-orange.webp" },
  { regex: /\b(?:focus|precision|keen eye|eagle eye|critical|weak point|vital spot|exploit weakness|target|pinpoint|trueshot|hunter's mark|quarry|seek)\b/i, icon: "icons/skills/targeting/crosshair-arrowhead-blue.webp" },

  // 4. Movement, Speed, Acrobatics & Evasion
  { regex: /\b(?:sprint|dash|speed|haste|fast|quick|rapid|fleet|swift|stride|cavalry|charge|rush|pursuit|overrun)\b/i, icon: "icons/skills/movement/figure-running-gray.webp" },
  { regex: /\b(?:acrobat|tumbler|vault|leap|jump|spring|high jump|bound|nimble|evade|evasion|dodge|roll|sidestep|elusive|shadowstep|blink|teleport|vanish|displace)\b/i, icon: "icons/skills/movement/feet-winged-boots-blue.webp" },
  { regex: /\b(?:swim|swimmer|dive|aquatic|waterborn|amphibious|tide)\b/i, icon: "icons/magic/water/barrier-ice-shield.webp" },
  { regex: /\b(?:climb|climber|scale|mountaineer|wall runner)\b/i, icon: "icons/skills/movement/arrow-upward-blue.webp" },
  { regex: /\b(?:fly|flight|wings|aerial|glide|soar|feather fall|hover)\b/i, icon: "icons/magic/control/buff-flight-wings-blue.webp" },

  // 5. Stealth, Roguery & Toxins
  { regex: /\b(?:sneak|stealth|shadow|shadows|hide|infiltrat|silent|ghost|veil|unseen|camo|ambush|backstab|assassin|cutthroat|surprise attack)\b/i, icon: "icons/weapons/daggers/dagger-black.webp" },
  { regex: /\b(?:lockpick|trap|burglar|pickpocket|skulduggery|cutpurse|sleight|pilfer|thievery|disarm trap)\b/i, icon: "icons/tools/hand/lockpicks-steel-grey.webp" },
  { regex: /\b(?:poison|venom|toxin|envenom|toxic|vial|bane|pollute|pestilence|corrupt|noxious|gas bomb|smoke bomb)\b/i, icon: "icons/skills/toxins/poison-bottle-corked-fire-green.webp" },

  // 6. Social, Leadership, Orders, Minstrelsy
  { regex: /\b(?:command|leader|leadership|order|rally|tactics|strategy|formation|coordinate|inspire|warlord|banner|standard|herald|marshal|captain|officer)\b/i, icon: "icons/skills/social/diplomacy-handshake-blue.webp" },
  { regex: /\b(?:diplomacy|persua|deceiv|intimida|reputation|charm|allure|fascinate|enthrall|taunt|mockery|silver tongue|gossip|negotiat|barter|pact)\b/i, icon: "icons/skills/social/diplomacy-peace-alliance.webp" },
  { regex: /\b(?:music|musician|song|sing|melody|chant|ballad|hymn|rhapsody|sonata|virtuoso|minstrel|skald|jester|troubadour|instrument|lute|flute|drum|horn|rhythm)\b/i, icon: "icons/skills/trades/music-notes-sound-blue.webp" },

  // 7. Senses, Mind, Intuition, Perception & Luck
  { regex: /\b(?:apprais|careful appraiser|by feel|evaluate|examine|inspect|lore|knowledge|study|scholar|academic|reading|research|chronicler|historian|book|grimoire|tome)\b/i, icon: "icons/skills/trades/academics-study-reading-book.webp" },
  { regex: /\b(?:intuition|intuitive|awareness|unarmored awareness|sense|detect|perceive|alert|vigilant|sixth sense|instinct|prescience|foresee|prophecy|seer|oracle|vision|mind spike|telepath|psychic|psionic|mental)\b/i, icon: "icons/magic/perception/eye-ringed-glow-angry-teal.webp" },
  { regex: /\b(?:luck|lucky|lucky placement|fortune|fortuity|chance|gamble|fate|serendipity|blessing of luck|jackpot)\b/i, icon: "icons/magic/control/buff-luck-fortune-clover-green.webp" },

  // 8. Trades & Crafting
  { regex: /\b(?:whittler|carpenter|woodcarver|potter|jeweler|artistic|artisan|craft|smith|forge|anvil|mason|leatherwork|cobbler|tailor|tinker|inventor|alchemist|brew)\b/i, icon: "icons/tools/smithing/anvil.webp" },

  // 9. Life, Healing, Holy & Divine
  { regex: /\b(?:medic|heal|healing|burst of healing|cure|salve|mend|restoration|rejuvenat|revive|resurrect|divine hands|lay on hands|first aid|doctor|physician|recovery)\b/i, icon: "icons/magic/life/cross-flared-green.webp" },
  { regex: /\b(?:holy|divine|prayer|prayers|sacred|radiance|radiant|bless|blessing|sanctuary|smite|exorcism|angel|templar|crusader|inquisitor|piety|zealot|zealot's resolve|force of belief|sword for justice)\b/i, icon: "icons/magic/holy/prayer-hands-glowing-yellow-white.webp" },
  { regex: /\b(?:meditation|chi|ki|zen|inner peace|spirit focus|attunement|shibmar attunement|aura|aura of aggression|combined aura|soul|bond soul)\b/i, icon: "icons/magic/holy/meditation-chi-focus-blue.webp" },

  // 10. Elemental & Magic Schools
  { regex: /\b(?:fire|wave of fire|flame|pyro|burn|blaze|inferno|combustion|scorch|fireball|ignite|heat|ember|cinder)\b/i, icon: "icons/magic/fire/beam-jet-stream-blue.webp" },
  { regex: /\b(?:ice|frost|frost beam|ice fan|cold|freeze|glacial|chill|blizzard|icicle|crystal|snow|shatter ice)\b/i, icon: "icons/magic/water/barrier-ice-shield.webp" },
  { regex: /\b(?:lightning|shock|thunder|storm|volt|electric|spark|tempest|plasma|zap|chain lightning)\b/i, icon: "icons/magic/lightning/bolt-strike-blue-white.webp" },
  { regex: /\b(?:earth|stone|rock|boulder|terran|quake|fissure|geomancy|mud|sand|landslide)\b/i, icon: "icons/magic/earth/strike-fist-stone-light.webp" },
  { regex: /\b(?:wind|air|gust|cyclone|gale|tornado|aeromancy|breeze|squall|fog|mist|smoke)\b/i, icon: "icons/magic/air/fog-gas-smoke-dense-gray.webp" },
  { regex: /\b(?:acid|corrosive|caustic|ooze|slime|dissolve|melt|vitriol)\b/i, icon: "icons/magic/acid/dissolve-arm-flesh.webp" },
  { regex: /\b(?:nature|primal|aspect|primal aspect|plant|plants|animate plants|briars|wall of briars|brambles|tangle of brambles|vine|tree|thorn|leaf|druid|flora|entangle|growth|sprout|roots|forest|woods)\b/i, icon: "icons/magic/nature/beam-hand-leaves-green.webp" },
  { regex: /\b(?:beast|beast form|animal|familiar|flock of familiars|predator|pack|wolf|bear|hawk|companion|avianism|wild|hunt|tracker|creature|charm creature|polymorph|giant)\b/i, icon: "icons/magic/nature/elemental-plant-humanoid.webp" },
  { regex: /\b(?:death|necro|corpse|undead|bone|skull|grave|soul|decay|wither|drain|reaper|crypt|tomb|mortal|rot|ghoul|zombie|skeleton)\b/i, icon: "icons/magic/death/grave-tombstone-glow-tan.webp" },
  { regex: /\b(?:curse|hex|voodoo|jinx|witch|coven|darkness|abyss|void|nether|torment|shadow magic|evil|demon|fiend|devil|infernal)\b/i, icon: "icons/magic/unholy/silhouette-robe-evil-glow.webp" },
  { regex: /\b(?:time|chrono|hasten|haste|slow|rewind|temporal|precognition|future|delay|dreamwalker|last wish)\b/i, icon: "icons/magic/time/hourglass-tilted-glowing-gold.webp" },
  { regex: /\b(?:arcane|metacreative|enchant|enchanting|mage|spell|signature|unveiling|elemental mastery|summon|summon fae|summon elemental|magic)\b/i, icon: "icons/magic/symbols/runes-star-pentagon-orange-purple.webp" },
];

/**
 * Resolves the most appropriate Foundry core icon for an item name.
 * If the item already has a non-default icon, it is preserved.
 *
 * @param {string} rawName - The name of the equipment item
 * @param {string|null} [currentImg=null] - The current image path
 * @param {string} [itemType="gear"] - Optional type hint ("weapon", "armor", "gear", "tool")
 * @returns {string} The resolved icon path
 */
export function resolveEquipmentIcon(rawName, currentImg = null, itemType = "gear") {
  // If currentImg is already a valid custom icon, preserve it
  if (currentImg && !isDefaultIcon(currentImg)) {
    return currentImg;
  }

  if (!rawName || typeof rawName !== "string") {
    return getDefaultTypeIcon(itemType);
  }

  // Normalize name: strip quantity indicators like "(2)", leading bullets, trailing punctuation
  const clean = rawName
    .replace(/\[[^\]]+\]\([^\)]+\)/g, "$1") // markdown links [label](url) -> label
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/^[•\-\*]\s*/, "")
    .replace(/[\.\*]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!clean) return getDefaultTypeIcon(itemType);

  // 1. Exact match
  if (EXACT_EQUIPMENT_ICONS[clean]) {
    return EXACT_EQUIPMENT_ICONS[clean];
  }

  // 1b. Check without parenthetical/bracket text (e.g. "Rope (50 ft)" -> "Rope")
  const baseName = clean.replace(/\([^\)]+\)/g, "").replace(/\[[^\]]+\]/g, "").trim();
  if (baseName && EXACT_EQUIPMENT_ICONS[baseName]) {
    return EXACT_EQUIPMENT_ICONS[baseName];
  }

  // 2. Keyword rules
  for (const rule of KEYWORD_ICON_RULES) {
    if (rule.regex.test(clean)) {
      return rule.icon;
    }
  }

  // 3. Fallback by item type
  return getDefaultTypeIcon(itemType);
}

/**
 * Resolves an icon for a Background or Profession document/name.
 * @param {string} rawName
 * @param {string|null} [currentImg=null]
 * @param {string} [type="background"]
 * @returns {string}
 */
export function resolveBopIcon(rawName, currentImg = null, type = "background") {
  if (currentImg && !isDefaultIcon(currentImg)) {
    return currentImg;
  }

  if (!rawName || typeof rawName !== "string") {
    return getDefaultTypeIcon(type);
  }

  const clean = rawName
    .replace(/\[[^\]]+\]\([^\)]+\)/g, "$1")
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/^[•\-\*]\s*/, "")
    .replace(/[\.\*]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!clean) return getDefaultTypeIcon(type);

  // 1. Exact match in EXACT_BOP_ICONS
  if (EXACT_BOP_ICONS[clean]) {
    return EXACT_BOP_ICONS[clean];
  }

  // 1b. Check without "profession" suffix (e.g. "Knight Profession" -> "Knight")
  const baseName = clean.replace(/\s*profession$/i, "").replace(/:\s*rank\s*\d.*$/i, "").trim();
  if (baseName && EXACT_BOP_ICONS[baseName]) {
    return EXACT_BOP_ICONS[baseName];
  }
  if (baseName && EXACT_BOP_ICONS[`${baseName} profession`]) {
    return EXACT_BOP_ICONS[`${baseName} profession`];
  }

  // 2. Keyword rules
  for (const rule of BOP_KEYWORD_RULES) {
    if (rule.regex.test(clean)) {
      return rule.icon;
    }
  }

  // 3. Fallback based on type
  return getDefaultTypeIcon(type);
}

/**
 * Deterministic diverse palette for talents that don't match specific keyword rules.
 */
const TALENT_FALLBACK_PALETTE = [
  "icons/skills/melee/weapons-crossed-swords-yellow.webp",
  "icons/skills/targeting/crosshair-arrowhead-blue.webp",
  "icons/magic/defensive/armor-shield-barrier-steel.webp",
  "icons/skills/movement/feet-winged-boots-blue.webp",
  "icons/magic/symbols/elements-air-earth-fire-water.webp",
  "icons/skills/social/diplomacy-handshake-blue.webp",
];

/**
 * Resolves an icon for a talent, feature, or action document.
 * @param {string} rawName - The name of the talent or feature
 * @param {string|null} [currentImg=null] - Current image path
 * @param {string} [categoryOrTrack=""] - Optional category, discipline, or track hint
 * @returns {string} The resolved icon path
 */
export function resolveTalentIcon(rawName, currentImg = null, categoryOrTrack = "") {
  if (currentImg && !isDefaultIcon(currentImg)) {
    return currentImg;
  }

  if (!rawName || typeof rawName !== "string") {
    return "icons/skills/melee/weapons-crossed-swords-yellow.webp";
  }

  const clean = rawName.trim().toLowerCase();

  // 1. Check talent rules against name + category/track
  const combinedText = clean + " " + String(categoryOrTrack || "").toLowerCase();
  for (const rule of TALENT_ICON_RULES) {
    if (rule.regex.test(combinedText)) {
      return rule.icon;
    }
  }

  // 2. Fallback based on category
  const cat = String(categoryOrTrack || "").toLowerCase();
  if (cat.includes("magic") || cat.includes("spell") || cat.includes("arcane")) {
    return "icons/magic/symbols/runes-star-pentagon-orange-purple.webp";
  }
  if (cat.includes("divine") || cat.includes("holy")) {
    return "icons/magic/holy/angel-winged-humanoid-blue.webp";
  }
  if (cat.includes("nature") || cat.includes("primal")) {
    return "icons/magic/nature/beam-hand-leaves-green.webp";
  }
  if (cat.includes("defense") || cat.includes("armor")) {
    return "icons/magic/defensive/armor-shield-barrier-steel.webp";
  }
  if (cat.includes("ranged") || cat.includes("archery")) {
    return "icons/skills/ranged/target-bullseye-archer-orange.webp";
  }
  if (cat.includes("movement") || cat.includes("speed")) {
    return "icons/skills/movement/figure-running-gray.webp";
  }

  // 3. Deterministic hash palette fallback to provide colorful variety (never scythes)
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
  }
  return TALENT_FALLBACK_PALETTE[Math.abs(hash) % TALENT_FALLBACK_PALETTE.length];
}

/**
 * Universal icon resolver for any item, background, profession, or talent document/data.
 * @param {object|string} docOrName - Document object or name string
 * @param {string|null} [currentImg=null]
 * @param {string} [itemType="gear"]
 * @returns {string}
 */
export function resolveItemIcon(docOrName, currentImg = null, itemType = "gear") {
  let name = "";
  let img = currentImg;
  let type = itemType;
  let category = "";

  if (typeof docOrName === "object" && docOrName !== null) {
    name = docOrName.name || "";
    img = docOrName.img || currentImg;
    type = docOrName.type || itemType;
    category = docOrName.system?.category || docOrName._compCategory || "";
  } else if (typeof docOrName === "string") {
    name = docOrName;
  }

  if (img && !isDefaultIcon(img)) return img;

  const lowerType = String(type || "").toLowerCase();
  const lowerName = String(name || "").toLowerCase();
  const lowerCat = String(category || "").toLowerCase();

  // Background / Profession / Lineage detection
  if (
    lowerType === "background" ||
    lowerType === "profession" ||
    lowerType === "lineage" ||
    lowerCat.includes("background") ||
    lowerCat.includes("profession") ||
    lowerCat.includes("lineage") ||
    lowerName.endsWith(" profession") ||
    lowerName.endsWith(" lineage") ||
    lowerName.includes(": rank ")
  ) {
    return resolveBopIcon(name, img, lowerType);
  }

  if (lowerType === "talent" || lowerType === "feature" || lowerType === "action") {
    return resolveTalentIcon(name, img, category);
  }
  if (lowerType === "spell") {
    for (const rule of TALENT_ICON_RULES) {
      if (rule.regex.test(name)) return rule.icon;
    }
    return "icons/magic/symbols/runes-star-pentagon-orange-purple.webp";
  }

  return resolveEquipmentIcon(name, img, type);
}

/**
 * Returns default icon by item type.
 * @param {string} itemType
 * @returns {string}
 */
export function getDefaultTypeIcon(itemType) {
  switch (String(itemType || "").toLowerCase()) {
    case "weapon":
      return "icons/weapons/swords/greatsword-crossguard-steel.webp";
    case "armor":
      return "icons/equipment/chest/breastplate-banded-leather-brown.webp";
    case "spell":
      return "icons/magic/symbols/runes-star-pentagon-orange-purple.webp";
    case "background":
      return "icons/commodities/treasure/token-engraved-pickaxe-pink.webp";
    case "profession":
      return "icons/tools/hand/hammer-and-nail.webp";
    case "lineage":
      return "icons/magic/symbols/elements-air-earth-fire-water.webp";
    case "talent":
    case "feature":
    case "action":
      return "icons/skills/melee/weapons-crossed-swords-yellow.webp";
    case "gear":
    default:
      return "icons/containers/bags/pack-leather-strapped-tan.webp";
  }
}

/**
 * Updates an item document or item data object in-place with its resolved icon
 * if it currently has a default or missing icon.
 * @param {object} itemData - Plain item data object or Foundry Item document
 * @returns {object} The mutated or updated itemData
 */
export function applyDefaultEquipmentIcon(itemData) {
  if (!itemData) return itemData;
  const name = itemData.name || "";
  const currentImg = itemData.img || null;
  const type = itemData.type || "gear";

  if (isDefaultIcon(currentImg)) {
    const resolved = resolveItemIcon(itemData, currentImg, type);
    if (resolved && resolved !== currentImg) {
      itemData.img = resolved;
    }
  }
  return itemData;
}
export const applyDefaultItemIcon = applyDefaultEquipmentIcon;

/**
 * Dynamically enriches compendium indices and UI windows with resolved icons
 * at runtime without altering the on-disk database files.
 * When the module is deactivated, compendiums immediately revert to original icons.
 */
export function initCompendiumIconOverrides() {
  // 1. Dynamic in-memory index enrichment when packs are loaded
  Hooks.once("ready", () => {
    try {
      for (const pack of (game.packs || [])) {
        if (pack.documentName === "Item") {
          // If index is already built, enrich existing entries in memory
          if (pack.indexed && pack.index) {
            for (const entry of pack.index) {
              if (isDefaultIcon(entry.img)) {
                const resolved = resolveItemIcon(entry.name, entry.img, entry.type);
                if (resolved && !isDefaultIcon(resolved)) {
                  entry.img = resolved;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("mythcraft-essence-sheet | Error enriching compendium index:", err);
    }
  });

  // 2. Intercept Compendium UI rendering (both ApplicationV2 and classic Foundry compendium windows)
  Hooks.on("renderCompendium", (app, html, data) => {
    try {
      const root = html instanceof HTMLElement ? html : html?.[0];
      if (!root || !app.collection) return;

      const entries = root.querySelectorAll(".directory-item[data-document-id], .directory-item[data-entry-id], li.compendium-entry, li.directory-item");
      for (const el of entries) {
        const id = el.dataset.documentId || el.dataset.entryId || el.dataset.id;
        const img = el.querySelector("img");
        if (!img) continue;

        const entry = app.collection.index?.get(id);
        const name = entry?.name || el.querySelector(".entry-name, .document-name, a")?.textContent?.trim();
        const type = entry?.type || "gear";
        const currentImg = img.getAttribute("src") || entry?.img;

        if (isDefaultIcon(currentImg)) {
          const resolved = resolveItemIcon(name, currentImg, type);
          if (resolved && !isDefaultIcon(resolved)) {
            img.src = resolved;
          }
        }
      }
    } catch (err) {
      console.warn("mythcraft-essence-sheet | Error rendering compendium icons:", err);
    }
  });
}
