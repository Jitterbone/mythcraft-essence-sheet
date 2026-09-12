# MythCraft Essence Sheet (v0.6.1-beta) 📜✨

[![Latest Release](https://img.shields.io/github/v/release/Jitterbone/mythcraft-essence-sheet?style=flat&logo=github&logoColor=white&color=22c55e&label=Latest%20Release)](https://github.com/Jitterbone/mythcraft-essence-sheet/releases/latest)
[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v14%20Verified-ff6400?style=flat)](https://foundryvtt.com)
[![Latest Release Installs](https://img.shields.io/github/downloads/Jitterbone/mythcraft-essence-sheet/latest/mythcraft-essence-sheet.zip?displayAssetName=false&style=flat&logo=github&logoColor=white&color=38bdf8&label=Latest%20Release%20Installs)](https://github.com/Jitterbone/mythcraft-essence-sheet/releases/latest)
[![Lifetime Installs](https://img.shields.io/github/downloads/Jitterbone/mythcraft-essence-sheet/mythcraft-essence-sheet.zip?displayAssetName=false&style=flat&logo=github&logoColor=white&color=38bdf8&label=Lifetime%20Installs)](https://github.com/Jitterbone/mythcraft-essence-sheet/releases)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/jitterbone)

A complete suite of elegant, high-readability alternate actor and item sheets for the **Mythcraft** system in Foundry VTT. Designed to seamlessly match the **Mythcraft HUD** aesthetic with a dark teal-and-gold palette, streamlined workflows, rich embedded editors, and comprehensive **built-in automation**.

> **Note on Automation:**  
> **All character automation features described below are built directly into this module**—including the Character Creation Wizard, Level-Up Progression, Visual Flowchart Talent Trees, HP/SP/AP automation, Rest Automation, Defense Formula Calculations, and Damage Pipeline. No extra third-party automation modules are required!

---

## ✨ Features Overview

### 🧙‍♂️ 1. Interactive 6-Step Character Creation Wizard
- **Guided New Character Experience**:
  - Automatically prompts when opening a new **Level 0** character sheet or clicking the **Level** badge.
  - Interactive multi-step wizard styled in the signature Dark Teal & Gold Essence theme (`#0d1217` slate, gold Cinzel headings, glowing indicators).
- **Step 1 — Lineage, Sublineages & Choice Groups**:
  - Browse official and custom Lineages with instant keyword search.
  - **Sublineage Selection**: Automatically surfaces sublineage dropdowns for multi-branch lineages (Dwarves, Elementals, Elves, Fiendbloods, Raedeen, Golems) and grants all associated sublineage features.
  - **Choice Groups & Variants**: Configurable options for lineages with custom choices (e.g. Elemental energy types, Dragonborn breath affinities).
  - **Selectable Unique Features**: Direct selection of unique lineage features discovered from `All [Lineage] Features` compendium folders with clickable previews and prerequisite checks.
  - **Automatic Starting Features & Deduplication**: Free starting features are neatly integrated with deduplication protection across custom and core packs.
- **Step 2 — Attribute Allocation**:
  - Dynamic starting attribute pool calculation: standard characters receive **5 points**, while each active custom attribute (or Sanity) dynamically grants an extra **+1 point**.
  - Includes core attributes (STR, DEX, END, AWR, INT, CHA) plus Luck (LCK), Coordination (COR), and Sanity (SAN) when enabled.
  - Enforces the official MythCraft Level 1 attribute cap (maximum **+2**).
- **Step 3 — Stats, HP & AP Progression**:
  - Endurance Threshold calculation automatically determines starting HP die and Set HP values. Choose between **Take Set HP** or **Roll HP**.
  - **Action Points (AP) from Coordination**: Dynamically scales both maximum and starting Action Points using the official MythCraft formula ($\text{COR} \le -3 \rightarrow 1\text{ AP}$, $\text{COR} \le -1 \rightarrow 2\text{ AP}$, $\text{COR} \ge 0 \rightarrow 3 + \lfloor\text{COR} / 2\rfloor$).
- **Step 4 — Backgrounds & Professions (BOPs)**:
  - Select background to unlock skill category points with real-time category pools and per-skill point caps.
  - **Freeform Background Skills**: Allocates free skill pools for backgrounds like Urchin that do not require choosing a profession.
  - **Encouraged Profession Synergy**: Automatically highlights background-encouraged professions in shimmering gold with badge indicators (`★ +2 Medicine / Religion`).
- **Step 5 — Starting Talents & Magic Discipline Gating**:
  - **Magic Entry Gating**: Strictly requires taking a discipline's Magic Entry talent (*Student of the Arcane*, *Disciple of the Divine*, *Initiate of the Occult*, *Warden of the Primal*, *Adept of the Psionic*) as the entry gateway before any other magic talents can be chosen.
  - **Automatic Stack Choices**: Selecting a Magic Entry talent dynamically reveals the additional stack talent picker based on granted bonus picks.
  - Select starting spells/cantrips and assign primary spellcasting attributes.
- **Step 6 — Finalize & Create**:
  - Review complete character summary and automatically populate items, attributes, stats, AP, and starting wealth.

---

### 🌳 2. Visual Flowchart Talent Trees & Progression Engine
- **Authentic Skill Tree Architecture**:
  - Overhauled talent tree display into true branching flowcharts with double-gold bordered ornate track headers (`.srd-diagram-header-banner`), illuminated beveled badge nodes (`.srd-badge-node`), and vertical connecting stems with directional arrows ($\downarrow$).
- **Canonical MythCraft Track Hierarchy**:
  - Clean separation of the **13 MythCraft Classes** (Berzerker, Cleric, Mage, Oracle, Pugilist, Ranger, Rogue, Tinkerer, Troubadour, Vessel, Warrior, Witch, Zealot) and their respective subclass tracks.
  - Specialization tracks organized under parent stacks (**Combat**, **Command**, **Defense**, **Skill**).
  - Magic tracks organized under their disciplines (**Arcane**, **Divine**, **Occult**, **Primal**, **Psionic**).
  - Strictly excludes non-talent noise (lineage features, milestones, profession ranks).
- **Level-Up Talent Picker Pop-Up**:
  - Displays full tree progression in the **"Your Character"** tab with acquired checkmarks (`✓`), active glowing `+ Select` buttons on available talents, and lock badges with prerequisite tooltips for locked tiers.
  - Allows players to inspect rules, explore future tiers, and choose their next talent directly during level up.
- **Custom & Homebrew Talent Compendiums Manager**:
  - Dedicated settings configuration menu (**Configure Talent Compendiums**) allowing GMs and players to register external or homebrew Item compendiums outside official packs.
  - Flexible track categorization: map custom compendiums directly to **Classes**, **Subclasses** (with parent class mapping), **Specialization Talents** (with parent stack mapping), or **Magic Talents** (with discipline mapping).
  - Custom tracks seamlessly integrate into the Talent Tree Viewer, Level-Up picker, and character sheet side drawer flyout.
- **Quick-Access Widescreen Flyout Drawer (520px)**:
  - The 5th bookmark tab on the right edge of the character sheet expands a **520px widescreen side drawer flyout** (no floating popups).
  - Renders **ONLY the talents on the character's sheet** arranged in visual flowchart progression under their active followed tracks.
  - Direct 1-click inspect and **Share to Chat** (`💬`) buttons on every node.

---

### 📈 3. Level Up & Endurance-Based HP Automation
- **Interactive Level Up Dialog**:
  - 1-click level advancement tracking attributes, skill points, and talent picks.
  - Dynamic level cap validation ensuring attributes do not exceed level limits.
  - Integrated with `TalentTreeViewer` in picker mode: passes `targetLevel` to evaluate upcoming prerequisite eligibility.
- **Official Endurance Threshold Chart**:
  - Automatic lookup of Thresholds 1 through 7 with appropriate HP die sizes (`1d2` to `1d12`) and flat Set HP bonuses (`+0` to `+6`).
  - Calculates $\text{HP} = 10 + \text{Level} + (\text{Level} \times \text{Die or Set HP})$.
  - Current HP automatically updates when leveling up to preserve existing health and apply newly gained max HP.
- **Dual Progression Modes**:
  - Choose between guaranteed **Take Set HP (Flat)** or **Roll HP Dice** with automatic 3D dice rolls in chat.
  - Automatic prompt for HP recalculation when Endurance crosses threshold boundaries during play.

---

### 🧪 4. Homebrew Rules & Custom Attributes Engine
- **Alternate Metaphysical Rules: Sanity (SAN)**:
  - Adds Sanity as a 3rd Metaphysical attribute representing psychological resilience against terror and occult corruption.
  - Modifies Sanity ability checks and governs the **Fear Threshold**.
- **Fear Threshold & Resource Tracking**:
  - Automatically calculates Fear Threshold from Sanity: `1 + ⌊SAN / 2⌋`.
  - Displays an interactive **Fear Resource Meter Card** with animated purple gradient fill and an alert tag when exceeding threshold capacity.
  - Full toggle support to display Sanity and Fear on both **Character** and **NPC sheets**.
- **Custom Attributes Engine**:
  - GMs can define unlimited custom attributes in the Physical, Mental, or Metaphysical columns.
  - Custom attributes include custom keys, 4-letter abbreviations, categories, footnote rules tooltips, and per-attribute checkboxes to control whether they appear on NPC sheets.
- **Custom Skills Engine**:
  - Define custom skills linked to standard attributes, Sanity (SAN), or custom attributes.
  - Custom skills appear in attribute configuration dialogs and can be trained and rolled like core system skills.

---

### 🏰 5. Complete Essence Siege Weapon Sheet
- **Unified Single-View Operations & Combat Layout**:
  - Replaces default form sheets with a purpose-built, high-contrast Essence Siege Weapon layout.
- **Structural Integrity (HP) Meter**:
  - Dual current/max inputs with an emerald gradient progress bar and an animated `BROKEN` bloodied indicator when HP drops below 50%.
- **Ammunition Resource Tracker**:
  - Live ammo gauge with visual fill bar and embedded Quick Fire (`-`) / Quick Load (`+`) buttons.
- **Combat Defenses Ribbon**:
  - Badges for Armor Rating (**AR**), Reflexes (**REF**), Fortitude (**FORT**), Damage Reduction (**DR**), and Damage Threshold (**DT**).
- **Tactical Operations Grid**:
  - Dedicated cards for **Range & Area of Effect**, **Reload Cost (AP / Actions)**, and **Mobility Speed & Heft**.
- **Siege Attacks & Actions**:
  - Streamlined attack cards featuring D20 Siege Attack rolls (with MythCraft's 1–2 crit-fail misfire rules), damage buttons, defense target badges (`vs AR`, `vs REF`), and expandable descriptions.

---

### � 6. Advanced Spells & Magic Power Scaling
- **Magic Source Filtering & School Badges**:
  - Interactive filter buttons for Arcane, Divine, Occult, Primal, and Psionic magic with custom school colors.
- **Intelligent Grouping & Sorting**:
  - Spells automatically group by magic school with source badges and tags (*Cantrip*, *Prayer*, *Ritual*, *Chant*, *Invocation*).
- **Magic Power Scaling Engine**:
  - **Character Sheets**: Evaluates character magic power rank and renders a single, automated damage button corresponding to their unlocked tier.
  - **NPC Sheets**: Renders clearly formatted variation buttons for the GM (`(Base) 1d10`, `(Power 18) 2d10`, etc.).
- **Half-Attribute Non-Primary Engine**:
  - Automatically halves attribute modifiers for spells cast from non-primary magic sources.
- **One-Click Actions**:
  - Roll spellcasting checks or click the **Post to Chat** (`💬`) button to share full spell descriptions and parameters directly to chat without rolling.

---

### 🛡️ 7. Dynamic Defense Formulas & Damage Automation Engine
- **Custom Defense Formulas & Automation**:
  - Full support for entering custom formula strings (e.g. `10 + @INT`, `10 + @DEX`, `10 + max(@INT, @DEX)`) or flat integers (e.g. `15`) for any defense (`REF`, `FORT`, `ANT`, `LOG`, `WILL`, and `AR`).
  - `@ATTR` tokens dynamically resolve against the character's active attribute modifiers in real time.
  - **Dynamic Equipment Layering**: Donned armor, shields, enhancements, and system bonuses layer on top of evaluated base formulas without destructive database overwrites.
  - **Click-to-Edit Defense Badges**: Clicking any defense badge on the sheet opens the configuration dialog directly, with hover tooltips displaying the active formula.
  - **NPC Sheet Parity**: NPC sheets feature the same formula evaluation and equipment defense automation.
- **Full MythCraft Damage Pipeline**:
  - Intercepts chat damage application and evaluates incoming damage against:
    1. **Damage Threshold (DT)**: Cancels damage below threshold.
    2. **Immunity**: Nullifies damage of that type to 0.
    3. **Vulnerability**: Adds extra vulnerability damage and bypasses DR.
    4. **Affinity (Incoming)**: Automatically halves incoming damage ($\lfloor \text{damage} / 2 \rfloor$).
    5. **Resistance**: Automatically subtracts resistance values (e.g. `Sharp 2` subtracts 2).
    6. **Damage Reduction (DR)**: Subtracts DR unless bypassed or vulnerable.
    7. **Absorb**: Applies system damage absorb maps.
- **Shield HP Priority**:
  - Automatically absorbs damage into Shield HP (acting as Temporary HP) first before any regular HP is lost.
- **Outgoing Affinity Bonus**:
  - Automatically calculates and injects the `+3` Outgoing Affinity damage bonus into attack rolls when dealing affinity damage types.

---

### ⚔️ 8. Equipment, Storage Drawers & Quick Access Panels
- **Multi-Tab Side Drawer Flyout**:
  - Branching quick-access drawers for **Storage Containers**, **Worn Clothing**, **Donned Armor & Enhancements**, **Equipped Weapons (Dual-Hand Grid)**, and **Followed Talents**.
- **Hand-and-a-Half Two-Handed APC Automation**:
  - Automatically parses and applies 2H APC reductions (e.g., `-1 APC, min 2`) during Two-Handed grip mode.
- **Armor Enhancements System**:
  - Supports wearable enhancement items, stacking defenses and resistances with base armor.
- **Robust Weapon APC Formula Parsing**:
  - Normalizes compendium formulas containing `, min X` notation (e.g. `8-STR, min 4`, `5-STR, min 2`) without throwing parsing errors.
- **Native Avatar & Tokenizer Compatibility**:
  - Native Foundry image editing support with full compatibility for **Tokenizer** and third-party portrait modules.

---

## 🚀 Installation

### Manifest URL (Recommended)
1. In the Foundry VTT setup screen, go to the **Add-on Modules** tab.
2. Click **Install Module**.
3. Paste the following URL into the **Manifest URL** field and click **Install**:
   ```
   https://github.com/Jitterbone/mythcraft-essence-sheet/releases/latest/download/module.json
   ```

### Manual Installation
1. Download the `mythcraft-essence-sheet.zip` file from the latest GitHub Release.
2. Unzip the file into your Foundry VTT `Data/modules` directory (ensure the folder name is `mythcraft-essence-sheet`).

### Activation
1. In your game world, go to **Game Settings** -> **Manage Modules**.
2. Find **MythCraft Essence Sheet** in the list and check the box to enable it.
3. To set as default sheet, go to **Game Settings** -> **Configure Sheet Settings** and select **MythCraft Essence** sheets.

---

## 🧩 Compatibility

- **System**: Mythcraft v0.6.4+
- **Foundry VTT**: v14 (Verified)
- **Mythcraft HUD**: Recommended
- **Tokenizer**: Compatible
- **Dice So Nice!**: Supported for 3D dice rolls.

---

## 📝 Changelog

### v0.6.1-beta
- **Second Skin Armor Specialization Choice Dialog**:
  - Added an interactive popup modal (`SecondSkinChoiceDialog`) triggered automatically when acquiring Second Skin talents.
  - Features official lists for **Light Armor**, **Medium Armor**, **Heavy Armor**, and **Shields** with custom campaign armor overrides.
  - Added an interactive specialization pill button on character sheet talent and feature cards (`[🛡 Specialization]`) allowing players to review or change their armor specialization at any time.
- **Rules as Written Resistance Automation & Allow Resistance Stacking Setting**:
  - **Rules as Written (RAW - Default)**: Matching resistance types across multiple sources (body armor, shields, enhancements, base actor resistances) do not stack additively—only the single highest resistance value for each matching damage type applies. Characters still gain all distinct resistance types granted across their equipment.
  - **Allow Resistance Stacking House Rule (`allowResistanceStacking`)**: Added a toggle under **Community House Rules** allowing GMs to enable additive stacking of matching resistances from all sources.
- **Community House Rules Settings**:
  - Introduced a dedicated **Community House Rules** settings section in module configuration with a distinctive `#f43f5e` category header.
  - **Second Skin Variation Rules (`secondSkinRuleVariant`)**:
    - *Rules as Written* (`raw`, default): Requires choosing one specific armor per talent.
    - *Second Skin Armor Type* (`category`): Unlocks resistance bonuses for all armors within the category without requiring individual selection.
    - *Jitterbone's Sturdy Bones* (`sturdyBones`): Grants full resistance bonuses to all donned armors & shields by default without requiring talents.
  - **Jitterbone's Bonebreaker (`jitterboneBonebreakerRule`)**:
    - Automatically grants the full **Astounding Critical** talent automation to all character actors by default.
  - **World Reload Prompts**: Configured `requiresReload: true` on rule variant settings to automatically prompt GMs to reload the world upon saving.
- **Astounding Critical Automation**:
  - **Exploding Critical Damage Dice**: Critical hits automatically explode damage dice on max face values (`d6x`, `d8x`, `d10x`, `d12x`, etc.), continuing to roll additional dice as long as maximum values are rolled.
  - **Critical Failure Range Doubling**: Doubles effective critical failure range (e.g. from 1 to 2, or 2 to 4), immediately reflected in character sheet header chips (`2−`, `4−`).
  - **Turn End & AP Loss on Critical Failure**: Critically failing an attack or spell check immediately resets Action Points to 0, ends the character's turn in active combat, and displays an alert banner on the chat roll card.

### v0.6.0-beta
- **Target Defense Chat Badges**:
  - Registered `renderChatMessage` & `renderChatMessageHTML` hooks to ensure attack and spell roll chat cards dynamically display prominent, high-contrast target defense badges (`[vs AR]`, `[vs REF]`, `[vs FORT]`, `[vs ANT]`, `[vs LOG]`, `[vs WILL]`) in the top-right corner of the teal-and-gold card banner.
  - Automatically deduplicates and cleans up duplicate subtitle/flavor elements across chat rolls.
- **Canonical Backgrounds & Rule Enforcement**:
  - Implemented a canonical background library (`BACKGROUND_CANON_DATA`) enforcing exact official skill point budgets, valid skill categories, and individual skill caps (e.g. *Born Warrior* +4 cap, *Criminal* +6 subterfuge / +3 general caps).
  - **Knave Background Mechanics**: Added full Knave background support granting a fixed +4 bonus to *Savoir Faire* with 0 manual point allocation needed, along with dual-profession selection.
  - **Encouraged Profession Highlighting**: Restored gleaming gold highlighting for tag-matching encouraged professions with automatic skill bonus calculation and display.
  - **Compendium Sourcing for Starting Equipment**: Background equipment distribution dynamically matches and sources canonical items from compendiums.
- **Dynamic Compendium & Item Icons**:
  - Implemented dynamic runtime icon overrides for talents, backgrounds, professions, weapons, and armor without modifying on-disk compendium databases.
  - Replaced generic fallback icons with rich contextual Foundry core SVG icons across combat, magic, specialization tracks, and equipment.
- **Level-Up & Attribute Reallocation**:
  - Supports reallocating attribute points during level-up and recalculation, allowing negative adjustments down to the base floor when adjusting stats.
  - Preserves scroll positions and expands active tracks seamlessly in the Talent Tree viewer and Level-Up picker.
- **Automation & System Polish**:
  - **NPC Turn Action Economy Allowances**: Added dynamic parsing of Tier 1 and Tier 2 action allowances from creature Turn Action Economy rules (e.g. "4 Actions / Turn", "2 Actions / Turn") instead of static placeholders.
  - Fixed damage rolls so rolling damage never inadvertently deducts AP or SP.
  - Sanitized item data structures when provisioning background/lineage items to eliminate Foundry advancement and deprecation warnings during character creation.
  - Synchronized Action Point (AP) calculations when Coordination (COR) or max AP changes.

### v0.5.0-alpha
- **Lineage Sublineages & Choice Groups Overhaul**:
  - Added dedicated sublineage dropdowns for multi-branch lineages (Dwarves, Elementals, Elves, Fiendbloods, Raedeen, Golems) with automatic assignment of all corresponding sublineage features.
  - Added choice group dropdowns for custom feature options (Elemental energy types, Dragonborn breath affinities).
  - Cleaned up duplicate and triplicate feature entries across custom and official compendiums.
  - Unique feature selection now dynamically reads from `All [Lineage] Features` compendium folders with live click-to-preview cards.
  - Fixed dropdown interaction issues to prevent selection menus from prematurely closing.
- **Backgrounds & Freeform Skill Points**:
  - Added skill point allocator support for backgrounds that do not mandate choosing a profession (such as the Urchin background).
  - Supports completing character creation with freeform background skill allocation and no selected profession.
- **Magic Discipline Gating & Entry Talent Progression**:
  - Enforced official MythCraft rule: the first magic talent taken in any discipline (Arcane, Divine, Occult, Primal, Psionic) must be that discipline's Magic Entry talent (*Student of the Arcane*, *Disciple of the Divine*, *Initiate of the Occult*, *Warden of the Primal*, *Adept of the Psionic*).
  - Character Creation Wizard and Level-Up Progression display Magic Entry talents by default; selecting an entry talent dynamically reveals and requires allocating the granted bonus stack talents.
  - Downstream magic talents are locked with clear prerequisite tooltips until the entry talent is learned.
  - Compendiums, document loading, and magic stacks deduplicated so each entry talent appears exactly once.
- **Coordination (COR) & Action Points (AP) Automation**:
  - Implemented official MythCraft Action Point calculation ($\text{COR} \le -3 \rightarrow 1$, $\text{COR} \le -1 \rightarrow 2$, $\text{COR} \ge 0 \rightarrow 3 + \lfloor\text{COR} / 2\rfloor$).
  - Increasing Coordination in Character Creation, Level-Up Progression, or directly on the character sheet automatically raises both maximum AP and current AP (`system.ap.value`).
- **Roll Privacy & Chat Card Formatting**:
  - Enforced active user/GM roll privacy mode across all checks, attacks, spells, and damage rolls initiated from the HUD and Essence sheet (respecting Public Roll, Private to GM, Blind GM Roll, and Self Roll).
  - Chat cards for attribute and skill checks now display full friendly names (e.g. "Coordination Check" instead of "COR").
- **Custom Tags & Weapon System Integration**:
  - Synchronized custom tags cleanly into `CONFIG.weapon.tags` and `CONFIG.monster.tagGroups`.
  - Re-styled native tag input elements and dropdown suggestions with the dark teal & gold Essence theme.

### v0.4.1-alpha
- **Custom Talent Compendiums & Homebrew Tracks**:
  - Added a dedicated settings menu (**Configure Talent Compendiums**) that allows users to register custom/homebrew Item compendiums outside official ones.
  - Supports categorizing custom packs as **Classes**, **Subclasses** (with parent class mapping), **Specialization Talents** (with stack parent mapping), or **Magic Talents** (with discipline mapping).
  - Custom compendiums are automatically discovered and rendered in the Talent Tree Viewer, Level-Up picker, and side drawer flyout.
- **Monster Traits & Passive Features NPC Categorization**:
  - Resolved an issue on the NPC sheet where newly added features or imported passive traits were being incorrectly categorized as Tier 1 Actions due to default schema tier initialization. Explicit passive categories (`"passive"`, `"trait"`, `"traits"`, `"feature"`) and features without attack/damage properties now properly populate the **Monster Traits & Passive Features** section.
- **GitHub Release Action CI Fix**:
  - Updated `.github/workflows/release.yml` for `softprops/action-gh-release@v2` by removing the deprecated `overwrite` option that previously caused release asset upload failures with 404 deletion errors.

### v0.4.0-alpha
- **Visual Flowchart Talent Trees**:
  - Complete overhaul of talent trees into authentic branching skill tree flowcharts with double-gold bordered banners, glowing beveled badge nodes, vertical connecting stems, and directional arrows.
  - Implemented canonical MythCraft hierarchy mapping 13 base classes, specialization stacks (Combat, Command, Defense, Skill), and magic disciplines.
  - Lineage features, ancestry milestones, and profession ranks are cleanly excluded from talent trees.
- **Level-Up Talent Picker Pop-Up**:
  - "Your Character" view displays full tree progression with unlocked `+ Select` buttons and locked tier tooltips, letting players select upcoming talents directly upon level up.
  - Automatically receives `targetLevel` from the level-up dialog to validate level-dependent prerequisites.
- **Followed Talents Side Drawer Flyout**:
  - Converted the 5th bookmark tab on the character sheet into an expandable 520px widescreen side drawer flyout (no secondary window popups).
  - Displays exclusively the character's owned talents organized under their active followed tracks in progression order.
- **Character Creation Wizard & Level-Up Polish**:
  - Integrated bonus skill points from lineage starting and unique features into background pools.
  - Added Luck (LCK), Coordination (COR), and Sanity (SAN) to attribute allocations and level-up point progression.
  - Current HP automatically scales with max HP increases on level-up.
  - Sorted lineages, backgrounds, and professions alphabetically across the creation wizard.

### v0.3.2-alpha-hotfix
- **Defensive Movement Sanitization**:
  - Added an in-memory guard in `_preparePartContext` and `_prepareContext` that cleans up legacy/malformed active effect properties in `actor.system.movement`, preventing sheet crashes when opening characters affected by the `slowed` condition.
- **Conditions Dialog Error Resilience**:
  - Added support for all core MythCraft conditions with comprehensive descriptions.
  - Wrapped status effect toggling in try/catch blocks for graceful failure handling.
- **NPC Action Retention & Weapon Support**:
  - Actions retain Tier 1 / Tier 2 column placement when edited via Item Sheet.
  - Extended action processing to include embedded `weapon` documents on NPC actors.

### v0.3.2-alpha
- **NPC Senses Configuration & Header Display**:
  - `SensesDialog` dynamically handles both Character (typed object) and NPC (string) data models.
  - Active senses render as interactive pills on the NPC sheet header.
- **Damage Modifications Vulnerability Fix**:
  - Resolved an issue in `DamageModificationDialog` where adding and saving vulnerabilities failed due to selector mismatch.
- **Attribute Cog Wheel Dialog on NPC Sheets**:
  - Restored the attribute and skill configuration dialog when clicking the cog wheel or defense badges on NPC sheets.

### v0.3.1-alpha
- **Custom Attribute Defense Formulas & Automation**:
  - Defenses accept custom formula strings (e.g. `10 + @INT`, `10 + max(@INT, @DEX)`) and flat integers.
  - Shield bonuses, armor modifiers, and enhancements stack dynamically on top of evaluated formulas.
- **Actor Image & Tokenizer Compatibility**:
  - Direct pointer events passthrough on portrait overlays ensures Tokenizer capture-phase listeners open the Tokenizer window natively.

### v0.3.0-alpha
- **Character Creation Wizard**:
  - Complete 6-step guided wizard for creating Level 1 characters from scratch.
  - Integrated Lineage Skill Trees with starting automatic features and selectable unique features.
- **Talent Tree Viewer & Side Tab**:
  - Interactive skill tree viewer with dedicated bookmark tab on character sheet.

---

## 💖 Support & Contributing

- 🐛 **GitHub Issues**: [Open an issue on GitHub](https://github.com/Jitterbone/mythcraft-essence-sheet/issues)
- ☕ **Ko-fi**: [Support development on Ko-fi](https://ko-fi.com/jitterbone)

---

## ⚖️ Legal & Attribution

This work is based on The MythCraft System by QuasiReal Publishing LLC and published using the Creative Commons Attribution 3.0 Unported license ([http://creativecommons.org/licenses/by/3.0/](http://creativecommons.org/licenses/by/3.0/)).




