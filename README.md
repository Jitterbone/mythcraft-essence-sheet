# MythCraft Essence Sheet (v0.4.0-alpha) 📜✨

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?style=flat&logo=kofi&logoColor=white)](https://ko-fi.com/jitterbone)

A complete suite of elegant, high-readability alternate actor and item sheets for the **Mythcraft** system in Foundry VTT. Designed to seamlessly match the **Mythcraft HUD** aesthetic with a dark teal-and-gold palette, streamlined workflows, rich embedded editors, and comprehensive **built-in automation**.

> **Note on Automation:**  
> **All character automation features described below are built directly into this module**—including the Character Creation Wizard, Level-Up Progression, Visual Flowchart Talent Trees, HP/SP/AP automation, Rest Automation, Defense Formula Calculations, and Damage Pipeline. No extra third-party automation modules are required!

---

## ✨ Features Overview

### 🧙‍♂️ 1. Interactive 6-Step Character Creation Wizard
- **Guided New Character Experience**:
  - Automatically prompts when opening a new **Level 0** character sheet or clicking the **Level** badge.
  - Interactive multi-step wizard styled in the signature Dark Teal & Gold Essence theme (`#0d1217` slate, gold Cinzel headings, glowing indicators).
- **Step 1 — Lineage & Skill Trees**:
  - Browse official and custom Lineages with instant keyword search.
  - **SRD Talent Tree Integration**: Lineage unique milestone features are presented in an authentic vertical skill tree flow with branch connectors, lock states, and prerequisite tooltips.
  - **Automatic Starting Features**: Free starting features (e.g. *Rapid Regeneration*, *Stoneform*) are cleanly integrated as compact tier 0 nodes.
  - **Bonus Attribute Points & Skills**: Automatically detects bonus points and skill points granted by lineages and unique features (e.g., *Tenacious*).
- **Step 2 — Attribute Allocation**:
  - Dynamic starting attribute pool calculation: standard characters receive **5 points**, while each active custom attribute (or Sanity) dynamically grants an extra **+1 point**.
  - Includes core attributes (STR, DEX, END, AWR, INT, CHA) plus Luck (LCK), Coordination (COR), and Sanity (SAN) when enabled.
  - Enforces the official MythCraft Level 1 attribute cap (maximum **+2**).
- **Step 3 — Stats & Health Progression**:
  - Endurance Threshold calculation automatically determines starting HP die and Set HP values.
  - Choose between **Take Set HP** or **Roll HP**.
- **Step 4 — Backgrounds & Professions (BOPs)**:
  - Select background to unlock skill category points with real-time category pools and per-skill point caps.
  - **Encouraged Profession Synergy**: Automatically highlights background-encouraged professions in shimmering gold with badge indicators (`★ +2 Medicine / Religion`).
- **Step 5 — Starting Talents & Magic**:
  - Select starting Specialization or Magic entry talents organized into cohesive talent stacks.
  - Select starting spells/cantrips and assign primary spellcasting attributes.
- **Step 6 — Finalize & Create**:
  - Review complete character summary and automatically populate items, attributes, stats, and starting wealth.

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

### 🔮 6. Advanced Spells & Magic Power Scaling
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




