# Mythcraft Essence Sheet (v0.3.0-alpha) 📜✨

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?style=flat&logo=kofi&logoColor=white)](https://ko-fi.com/jitterbone)

A complete suite of elegant, high-readability alternate actor and item sheets for the **Mythcraft** system in Foundry VTT. Designed to seamlessly match the **Mythcraft HUD** aesthetic with a dark teal-and-gold palette, streamlined workflows, rich embedded editors, built-in damage automation, interactive character creation and level up progression, homebrew rules, and full support for Characters, NPCs, and Siege Engines.

---

## ✨ Features Overview

### ‍♂️ 1. Interactive 6-Step Character Creation Wizard
- **Guided New Character Experience**:
  - Automatically prompts when opening a new **Level 0** character sheet or clicking the **Level** badge.
  - Interactive multi-step wizard styled in the signature Dark Teal & Gold Essence theme (`#0d1217` slate, gold Cinzel headings, glowing indicators).
- **Step 1 — Lineage & Skill Trees**:
  - Browse official and custom Lineages with instant keyword search.
  - **SRD Talent Tree Integration**: Lineage unique milestone features are presented in an authentic vertical skill tree flow with branch connectors, lock states, and prerequisite tooltips.
  - **Automatic Starting Features**: Free starting features (e.g. *Rapid Regeneration*, *Stoneform*) are cleanly integrated as compact tier 0 nodes.
  - **Bonus Attribute Points**: Automatically detects and displays bonus points granted by lineages/features (e.g., *Tenacious*).
- **Step 2 — Attribute Allocation**:
  - Dynamic starting attribute pool calculation: standard characters receive **5 points**, while each active custom attribute (or Sanity) dynamically grants an extra **+1 point**.
  - Enforces the official MythCraft Level 1 attribute cap (maximum **+2**).
- **Step 3 — Stats & Health Progression**:
  - Endurance Threshold calculation automatically determines starting HP die and Set HP values.
  - Choose between **Take Set HP** or **Roll HP**.
- **Step 4 — Backgrounds & Professions (BOPs)**:
  - Select background to unlock skill category points (e.g. 12 points across 6 categories) with real-time category pools and per-skill point caps.
  - **Encouraged Profession Synergy**: Automatically highlights background-encouraged professions in shimmering gold with badge indicators (`★ +2 Medicine / Religion`).
- **Step 5 — Starting Talents & Magic**:
  - Select starting Specialization or Magic entry talents organized into cohesive talent stacks.
  - Select starting spells/cantrips and assign primary spellcasting attributes.
- **Step 6 — Finalize & Create**:
  - Review complete character summary and automatically populate items, attributes, stats, and starting wealth.

---

### 🌳 2. Full-Featured Talent Tree Viewer & Side Tab
- **Talent Tracks & Skill Trees**:
  - Visual tree flow displaying prerequisite dependencies, tiers, locked status, and owned talents.
  - Dedicated **Talent Tree Bookmark Tab** (`diagram-project` icon) on the right side drawer of the character sheet for instant access.
- **Dynamic Compendium Parsing**:
  - Intelligently extracts prerequisites, mutually exclusive incompatibilities, and stacks from Class, Magic, and Specialization compendiums.

---

### 🧪 3. Homebrew Rules & Custom Attributes Engine
- **Alternate Metaphysical Rules: Sanity (SAN)**:
  - Adds Sanity as a 3rd Metaphysical attribute representing psychological resilience against terror and occult corruption.
  - Modifies Sanity ability checks and governs the **Fear Threshold**.
- **Fear Threshold & Resource Tracking**:
  - Automatically calculates Fear Threshold from Sanity: `1 + ⌊SAN / 2⌋` (negative Sanity subtracts from capacity).
  - Displays an interactive **Fear Resource Meter Card** with animated purple gradient fill and an alert tag when exceeding threshold capacity.
  - Full toggle support to display Sanity and Fear on both **Character** and **NPC sheets**.
- **Custom Attributes Engine**:
  - GMs can define unlimited custom attributes in the Physical, Mental, or Metaphysical columns.
  - Custom attributes include custom keys, 4-letter abbreviations, categories, footnote rules tooltips, and per-attribute checkboxes to control whether they appear on NPC sheets.
- **Custom Skills Engine**:
  - Define custom skills linked to standard attributes, Sanity (SAN), or custom attributes.
  - Custom skills appear in attribute configuration dialogs and can be trained and rolled like core system skills.

---

### 🏰 4. Complete Essence Siege Weapon Sheet
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

### 📈 5. Level Up & Endurance-Based HP Automation
- **Official Endurance Threshold Chart**:
  - Automatic lookup of Thresholds 1 through 7 with appropriate HP die sizes (`1d2` to `1d12`) and flat Set HP bonuses (`+0` to `+6`).
- **MythCraft HP Formula**:
  - Calculates $\text{HP} = 10 + \text{Level} + (\text{Level} \times \text{Die or Set HP})$.
- **Interactive Level Up & HP Calculator Dialog**:
  - **Dual Modes**: Step-by-step level progression ($+1 + \text{Die / Set HP}$) or Full Recalculate / Rebuild across all levels.
  - **Progression Options**: Choose guaranteed **Take Set HP (Flat)** or **Roll HP Dice** with automatic in-chat 3D dice rolls upon applying.
- **Threshold Shift Auto-Prompt**:
  - Automatically prompts for HP recalculation when Endurance crosses threshold boundaries during play or level editing.

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

### 🛡️ 7. Integrated Damage Automation & Defenses Engine
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

### ⚔️ 8. Equipment, Armor Enhancements & Native Mod Compatibility
- **Hand-and-a-Half Two-Handed APC Automation**:
  - Automatically parses and applies 2H APC reductions (e.g., `-1 APC, min 2`) during Two-Handed grip mode.
- **Armor Enhancements System**:
  - Supports wearable enhancement items, stacking defenses and resistances with base armor.
- **Robust Weapon APC Formula Parsing**:
  - Normalizes compendium formulas containing `, min X` notation (e.g. `8-STR, min 4`, `5-STR, min 2`) without throwing parsing errors.
- **Native Avatar & Tokenizer Compatibility**:
  - Native Foundry image editing support with full compatibility for **Tokenizer** and other portrait modules.

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
- **Mythcraft HUD**: Required
- **Tokenizer**: Compatible
- **Dice So Nice!**: Supported for 3D dice rolls.

---

## 📝 Changelog

### v0.3.0-alpha
- **Character Creation Wizard**:
  - Complete 6-step guided wizard for creating Level 1 characters from scratch.
  - Integrated Lineage Skill Trees with starting automatic features and selectable unique features.
  - Dynamic attribute pool calculation (+1 point per active custom attribute).
  - Background skill allocation engine with encouraged profession synergy highlighting.
  - Automatic startup prompt when opening Level 0 character sheets.
- **Talent Tree Viewer & Side Tab**:
  - Interactive skill tree viewer with dedicated bookmark tab on character sheet.
- **Weapon APC Formula Evaluation Fix**:
  - Safe evaluation and normalization of `, min X` APC formulas across system weapons and data models.
- **Native Portrait Editing**:
  - Full compatibility with native Foundry file pickers and third-party modules like Tokenizer.

### v0.2.4-alpha
- **Hand-and-a-Half Two-Handed APC Reduction**:
  - Automatically parses 2H APC reduction rules from weapon tags and item descriptions.
- **Redesigned Insufficient Action Points Modal**:
  - Complete dark teal & gold redesign with structured cost breakdown.

---

## 💖 Support & Contributing

- 🐛 **GitHub Issues**: [Open an issue on GitHub](https://github.com/Jitterbone/mythcraft-essence-sheet/issues)
- ☕ **Ko-fi**: [Support development on Ko-fi](https://ko-fi.com/jitterbone)

---

## ⚖️ Legal & Attribution

This work is based on The MythCraft System by QuasiReal Publishing LLC and published using the Creative Commons Attribution 3.0 Unported license ([http://creativecommons.org/licenses/by/3.0/](http://creativecommons.org/licenses/by/3.0/)).




