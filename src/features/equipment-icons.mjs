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
 * Category & Keyword Rules for Talents & Features (evaluated in top-down order).
 */
export const TALENT_ICON_RULES = [
  { regex: /\b(?:strike|slash|cleave|thrust|smash|bash|crush|flurry|whirlwind|rend|gore|bite|claw|brawler|grapple|charge|assault|overpower|execute)\b/i, icon: "icons/skills/melee/strike-blade-blood-red.webp" },
  { regex: /\b(?:parry|riposte|feint|counter|disarm|trip|sweep|maneuver|stance|footwork|flourish|duel|fencing)\b/i, icon: "icons/skills/melee/hand-grip-axe-strike-orange.webp" },
  { regex: /\b(?:punch|kick|fist|unarmed|martial|iron fist|drunken|pugilist)\b/i, icon: "icons/skills/melee/unarmed-punch-fist-blue.webp" },
  { regex: /\b(?:berserk|rage|frenzy|bloodlust|reckless|rampage|juggernaut|unbridled)\b/i, icon: "icons/skills/wounds/injury-face-impact-orange.webp" },
  { regex: /\b(?:shot|snipe|aim|deadeye|bullseye|volley|barrage|recurve|arrow|bolt|marksman|marksmanship|ricochet)\b/i, icon: "icons/skills/ranged/target-bullseye-archer-orange.webp" },
  { regex: /\b(?:shield|block|bulwark|bastion|wall|deflect|guard|protect|fortress|defend)\b/i, icon: "icons/magic/defensive/shield-barrier-blue.webp" },
  { regex: /\b(?:armor|plate|iron skin|stone skin|unyielding|indomitable|toughness|resilience|fortitude|endure|tenacity|hardened|thick hide)\b/i, icon: "icons/equipment/chest/breastplate-banded-blue.webp" },
  { regex: /\b(?:stride|sprint|dash|leap|jump|fly|flight|wings|acrobat|tumble|vault|evade|dodge|blink|teleport|shadowstep|vanish|nimble|fleet|swift)\b/i, icon: "icons/skills/movement/arrow-upward-blue.webp" },
  { regex: /\b(?:sneak|stealth|shadow|hide|assassin|backstab|ambush|infiltrate|cutpurse|pickpocket|lockpick|trap|poison|toxin|venom|disguise|impersonate)\b/i, icon: "icons/weapons/daggers/dagger-black.webp" },
  { regex: /\b(?:command|leader|rally|tactics|strategy|orders|formation|coordinate|inspire|warlord|banner|herald|marshal)\b/i, icon: "icons/skills/social/diplomacy-handshake-blue.webp" },
  { regex: /\b(?:song|sing|melody|chant|ballad|hymn|rhapsody|sonata|virtuoso|minstrel|skald|jester|mockery|taunt|charm|allure|fascinate)\b/i, icon: "icons/tools/instruments/lute-gold-brown.webp" },
  { regex: /\b(?:heal|healing|cure|restoration|mend|rejuvenat|revive|resurrect|lay on hands|salve)\b/i, icon: "icons/magic/life/heart-hand-gold-green-light.webp" },
  { regex: /\b(?:holy|divine|sacred|radiance|radiant|bless|blessing|prayer|sanctuary|smite|exorcism|angel|templar|crusader|inquisitor|piety|zealot)\b/i, icon: "icons/magic/holy/angel-winged-humanoid-blue.webp" },
  { regex: /\b(?:fire|flame|pyro|burn|blaze|inferno|combustion|scorch|fireball|ignite)\b/i, icon: "icons/magic/fire/beam-jet-stream-blue.webp" },
  { regex: /\b(?:ice|frost|cold|freeze|glacial|chill|blizzard|icicle|crystal)\b/i, icon: "icons/magic/water/barrier-ice-shield.webp" },
  { regex: /\b(?:lightning|shock|thunder|storm|volt|electric|spark|tempest|plasma)\b/i, icon: "icons/magic/lightning/bolt-strike-blue-white.webp" },
  { regex: /\b(?:earth|stone|rock|boulder|terran|quake|fissure|geomancy)\b/i, icon: "icons/magic/earth/strike-fist-stone-light.webp" },
  { regex: /\b(?:wind|air|gust|cyclone|gale|tornado|aeromancy)\b/i, icon: "icons/magic/air/fog-gas-smoke-dense-gray.webp" },
  { regex: /\b(?:acid|corrosive|caustic|ooze|slime|dissolve)\b/i, icon: "icons/magic/acid/dissolve-arm-flesh.webp" },
  { regex: /\b(?:death|necro|corpse|undead|bone|skull|grave|soul|reaper|drain|wither|decay)\b/i, icon: "icons/magic/death/grave-tombstone-glow-tan.webp" },
  { regex: /\b(?:curse|hex|voodoo|jinx|witch|coven|blood|bleed|hemomancy|darkness|abyss|void|nether|torment)\b/i, icon: "icons/magic/unholy/silhouette-robe-evil-glow.webp" },
  { regex: /\b(?:nature|plant|vine|tree|thorn|leaf|druid|flora|entangle|growth|sprout|roots)\b/i, icon: "icons/magic/nature/beam-hand-leaves-green.webp" },
  { regex: /\b(?:beast|animal|predator|pack|wolf|bear|hawk|companion|familiar|wild|primal|hunt|tracker)\b/i, icon: "icons/magic/nature/elemental-plant-humanoid.webp" },
  { regex: /\b(?:psionic|telepath|telekinesis|mind|psychic|brain|thought|mental|sensor|scry|clairvoyance|prophecy|seer|oracle|augury|fortune|fate|time|chronomancy)\b/i, icon: "icons/magic/perception/eye-ringed-glow-angry-teal.webp" },
  { regex: /\b(?:tinker|engineer|clockwork|gadget|artificer|gunsmith|explosive|bomb|grenade|craft|smith|forge|alchem|potion|elixir|brew)\b/i, icon: "icons/tools/smithing/anvil.webp" },
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
    return "icons/skills/melee/strike-blade-blood-red.webp";
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
    return "magic/symbols/runes-star-pentagon-orange-purple.webp";
  }
  if (cat.includes("divine") || cat.includes("holy")) {
    return "icons/magic/holy/angel-winged-humanoid-blue.webp";
  }
  if (cat.includes("nature") || cat.includes("primal")) {
    return "icons/magic/nature/beam-hand-leaves-green.webp";
  }
  if (cat.includes("defense") || cat.includes("armor")) {
    return "icons/magic/defensive/shield-barrier-blue.webp";
  }
  if (cat.includes("ranged") || cat.includes("archery")) {
    return "icons/skills/ranged/target.webp";
  }

  return "icons/skills/melee/strike-blade-blood-red.webp";
}

/**
 * Universal icon resolver for any item or talent document/data.
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
    case "talent":
    case "feature":
      return "icons/skills/melee/strike-blade-blood-red.webp";
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
