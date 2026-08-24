# Mythcraft Essence Sheet (v0.2.4-alpha) 📜✨

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?style=flat&logo=kofi&logoColor=white)](https://ko-fi.com/jitterbone)

A complete suite of elegant, high-readability alternate actor and item sheets for the **Mythcraft** system in Foundry VTT. Designed to seamlessly match the **Mythcraft HUD** aesthetic with a dark teal-and-gold palette, streamlined workflows, rich embedded editors, built-in damage automation, interactive level/HP progression, homebrew rules, and full support for Characters, NPCs, and Siege Engines.

---

## ✨ Features Overview

### 🧪 1. Homebrew Rules & Custom Attributes Engine
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
- **Themed Attribute & Skill Configuration**:
  - Replaces default input dialogs with high-contrast, themed modals featuring smooth sliders, plus/minus modifiers, and clear skill association dropdowns.

---

### 🏰 2. Complete Essence Siege Weapon Sheet
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
- **Integrated Damage Modifications & Conditions**:
  - Direct modal configuration of Resistances, Immunities, Vulnerabilities, DR, and DT, plus active condition tracking.

---

### 📈 3. Level Up & Endurance-Based HP Automation
- **Official Endurance Threshold Chart**:
  - Automatic lookup of Thresholds 1 through 7 with appropriate HP die sizes (`1d2` to `1d12`) and flat Set HP bonuses (`+0` to `+6`).
- **MythCraft HP Formula**:
  - Calculates $\text{HP} = 10 + \text{Level} + (\text{Level} \times \text{Die or Set HP})$.
- **Interactive Level Up & HP Calculator Dialog**:
  - **Dual Modes**: Step-by-step level progression ($+1 + \text{Die / Set HP}$) or Full Recalculate / Rebuild across all levels.
  - **Progression Options**: Choose guaranteed **Take Set HP (Flat)** or **Roll HP Dice** with automatic in-chat 3D dice rolls upon applying.
- **Threshold Shift Auto-Prompt**:
  - Automatically prompts for HP recalculation when Endurance crosses threshold boundaries during play or level editing.
- **Header Level Up Controls**:
  - Quick `[ ▲ ]` Level Up button and direct level change interception.

---

### 🔮 4. Advanced Spells & Magic Power Scaling
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

### 🛡️ 5. Integrated Damage Automation & Defenses Engine
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
- **Token Scrolling Text & Breakdown**:
  - Displays floating combat text over tokens and posts a step-by-step calculation breakdown notification.

---

### 👹 6. NPC Sheet Enhancements
- **Metaphysical Attributes Display**:
  - Optional 3-column layout toggle to display Luck, Corruption, Sanity, and custom Metaphysical attributes.
- **Combat Action Economy**:
  - Dynamic modifier display on expanded action cards, turn action rules editor, and animated golden foil shimmer sweeps for reaction exploit highlights.
- **Full Drawer & Spell Embed Parity**:
  - Expandable drawer descriptions for all NPC spells, traits, actions, and reactions with rich tooltip lookups.

---

### ⚔️ 7. Inventory, Currency & Effects
- **Container & Backpack Hierarchy**:
  - Organize gear into containers with real-time capacity and weight tracking.
- **Custom Currency & Exchange System**:
  - Manage currency names, abbreviations, exchange rates, and quick shopping presets.
- **Categorized Active Effects**:
  - Grouped into **Temporary Effects** (with duration), **Passive Effects**, and **Inactive Effects** with one-click toggles.
- **Accidental Deletion Protection**:
  - Confirmation modals (*"Are you sure?"*) prevent accidental deletion across all items, active effects, conditions, contacts, resources, and journal entries.

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

## 🎮 Usage & Controls

### Damage Modifications Configuration
Click the gear icon (⚙️) on the **Damage Modifications** panel to open the modal:
- Toggle **Affinity** and **Immunity** pills with a single click.
- Add and configure **Resist** and **Vulnerable** damage types with numerical values.
- Set **Damage Reduction (DR)** with optional bypass criteria, and configure **Damage Threshold (DT)**.

### Homebrew & Custom Attributes Configuration
Navigate to **Game Settings** -> **Configure Settings** -> **MythCraft Essence Sheet** -> **Configure Homebrew & Attributes**:
- Enable **Sanity (SAN)** and the **Fear Threshold & Tracker**.
- Add custom attributes with custom data keys, abbreviations, and categories.
- Check **Include in NPC sheets** for any custom attributes you want available on monster and NPC sheets.
- Add custom skills linked to your new attributes.

---

## 🧩 Compatibility

- **System**: Mythcraft v0.6.4+
- **Foundry VTT**: v14 (Verified)
- **Mythcraft HUD**: Required
- **Dice So Nice!**: Supported for 3D dice rolls.

## 📝 Changelog

### v0.2.4-alpha
- **Hand-and-a-Half Two-Handed APC Reduction**:
  - Automatically parses 2H APC reduction rules from weapon tags and item descriptions (e.g. `"STR Weapon, Hand-and-a-Half (reduce APC by 1, min 2)"`, `"-1 APC, min 2"`, `"2 APC"`).
  - Dynamically computes and displays the reduced APC on character sheet equipment cards and side drawer slots when toggled to Two-Handed grip.
  - Automatically enforces the reduced APC cost during combat attack rolls and AP deduction.
- **Redesigned Themed Insufficient Action Points Modal**:
  - Complete dark teal & gold redesign (`#0d1217` slate frame, gold Cinzel header, glowing amber lightning icon, teal borders).
  - Structured high-contrast breakdown of Required Cost (cyan), Available AP/SAP (green), and Deficit (red).
  - Custom styled "Proceed Anyway" and "Cancel" buttons.

### v0.2.3-alpha
- **Armor Enhancements System**:
  - Automatically identifies armor items in the `Enhancement` category (`system.category`, `system.armorType`, or tag).
  - Enforces single-enhancement equip limit and combines enhancement defense bonuses (+AR, REF, FORT, ANT, LOG, WILL) with base armor.
  - Multi-Armor Resistance Stacking: Resistances across Body Armor, Shields, and Enhancements seamlessly stack (e.g. `Sharp 2` + `Sharp 2` + `Sharp 2` = `Sharp 6`).
  - Signed STR Minimum & DEX Maximum Modifier calculations:
    - Base armor and enhancement STR requirements combine with positive/negative modifiers (`+2`, `-1`, etc.). If unmet, walk speed becomes 0 and Dazed is applied.
    - Accurately reduces DEX max (`armorDexMax - enhDexMax` or `12 - enhDexMax`) and clamps Reflex defense.
  - Dedicated **Wear / Remove** buttons in the equipment list and a centered enhancement slot rendered in the side drawer armor tab.
- **Luck Points Automation & Stepper**:
  - Added `-` and `+` stepper capsule to character header for quick Luck Point adjustments.
  - Automates maximum Luck Points calculation from LUCK attribute (1 LP per 2 LUCK).
  - Automates full LP restoration upon Taking a Rest.
- **Player Ownership & GM-Only Permission Fix**:
  - Intercepts and sanitizes GM-only fields (`system.description.gm`, `system.biography.gm`) during player sheet updates and item creation, resolving Foundry `HTMLField._sanitize` permission errors.
- **Dynamic Resource Bar Titles**:
  - Character header resource bars automatically show full names (**Hit Points**, **Action Points**, **Spell Points**) when Fear Threshold is disabled.

---

## 💖 Support & Contributing

- 🐛 **GitHub Issues**: [Open an issue on GitHub](https://github.com/Jitterbone/mythcraft-essence-sheet/issues)
- ☕ **Ko-fi**: [Support development on Ko-fi](https://ko-fi.com/jitterbone)

---

## ⚖️ Legal & Attribution

This work is based on The MythCraft System by QuasiReal Publishing LLC and published using the Creative Commons Attribution 3.0 Unported license ([http://creativecommons.org/licenses/by/3.0/](http://creativecommons.org/licenses/by/3.0/)).
