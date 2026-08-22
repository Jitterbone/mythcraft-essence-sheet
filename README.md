# Mythcraft Essence Sheet (v0.1.0-alpha) 📜✨

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?style=flat&logo=kofi&logoColor=white)](https://ko-fi.com/jitterbone)

A complete suite of elegant, high-readability alternate actor and item sheets for the **Mythcraft** system in Foundry VTT. Designed to seamlessly match the **Mythcraft HUD** aesthetic with a dark teal-and-gold palette, streamlined workflows, rich embedded editors, and built-in damage automation.

---

## ✨ Features

- **🎨 Mythcraft HUD Aesthetic & Dark Theme**:
  - Immersive dark teal-and-gold color scheme with glowing accents and Cinzel typography.
  - High-contrast, crystal-clear headers and labels across all sheet tabs and embedded item cards.
  - Custom HUD modal dialogs for configuring defenses, movement, senses, conditions, and active effect sheets.

- **📊 Comprehensive Character Sheet Architecture**:
  - **Stats & Attributes**: Visual breakdown of Physical (STR, DEX, END), Mental (AWR, INT, CHA), and Meta (LUCK, COR) attributes with derived defenses (REF, FORT, ANT, LOG, WILL) and associated rollable skills.
  - **Dynamic Resource Tracking**: Dedicated tracking for `HP`, `Shield HP` (Temporary Health), `AP` (Action Points), `SP` (Spell Points), and `Death Points`.
  - **Defenses & Damage Modifications**: Overview card displaying active Affinities, Immunities, Resists, Vulnerabilities, Damage Reduction (DR), and Damage Threshold (DT) with styled icons and badges.
  - **Tactical Panels**: One-click configuration for Senses (Blindsight, Darkvision, etc.), Movement speeds, and Active Conditions with rich tooltip descriptions.

- **🔮 Advanced Spells Management**:
  - **Magic Source Filtering**: Interactive filter buttons for Arcane, Divine, Occult, Primal, and Psionic magic with custom school colors.
  - **Intelligent Sorting**: Spells automatically group by magic school by default with source badges.
  - **Power Level Filtering**: Toggle view by Spell Power Levels with active glow indicators.
  - **Special Spell Tags**: Inline badges beside spell names for *Cantrip*, *Prayer*, *Ritual*, *Chant*, and *Invocation*.
  - **One-Click Actions**: Roll spellcasting checks or click the **Post to Chat** (`💬`) button to share full spell descriptions and parameters directly to chat without rolling.

- **⚔️ Inventory & Equipment**:
  - **Container & Backpack Hierarchy**: Organize gear into containers with real-time capacity and weight tracking.
  - **Currency Counter**: Compact tracker for Astra, Scillings, Quints, and Denarii.
  - **Item Embeds**: Clickable expand/collapse drawers displaying full rich item descriptions.
  - **Combat Actions**: Direct Attack and Damage rolling buttons on weapon rows.
  - **Outgoing Affinity Bonus**: Automatically calculates and injects the `+3` Outgoing Affinity damage bonus into attack rolls when dealing affinity damage types.

- **🪄 Effects Management**:
  - **Categorized Sections**: Cleanly grouped into **Temporary Effects** (with duration), **Passive Effects**, and **Inactive Effects**.
  - **Instant Toggling**: Turn effects on or off with a single click from the status badge or toggle switch.
  - **Category Add Buttons**: Dedicated `+` buttons on category headers to immediately create and configure temporary, passive, or inactive effects.
  - **Themed Configuration Sheet**: Full Mythcraft HUD styling on the native Active Effect configuration dialog with dark teal background and gold typography.

- **📜 Biography & Personality**:
  - **Values, Drive & Quirk**: High-contrast personality fields with readable gold-tinted placeholders.
  - **Full-Width Physical Description**: Dedicated character description textarea with auto-saving.
  - **ProseMirror Rich Editors**: Fully functional rich text editing for Biography and GM Notes with glowing gold edit controls (`✏️`).

- **📖 Journal & Contacts**:
  - **Real-Time Live Auto-Save**: All inputs typed in Additional Info, Contacts, Tracked Resources, and Journal Logs persist immediately to the actor.
  - **Card-Based UI**: Collapsible entries with gold headers, cyan labels, and delete confirmation protection.

- **🛡️ Integrated Damage Automation Engine**:
  - **Full MythCraft Damage Pipeline**: Intercepts chat damage application and evaluates incoming damage against:
    1. **Damage Threshold (DT)**: Cancels damage below threshold.
    2. **Immunity**: Nullifies damage of that type to 0.
    3. **Vulnerability**: Adds extra vulnerability damage and bypasses DR.
    4. **Affinity (Incoming)**: Automatically halves incoming damage ($\lfloor \text{damage} / 2 \rfloor$).
    5. **Resistance**: Automatically subtracts resistance values (e.g. `Sharp 2` subtracts 2).
    6. **Damage Reduction (DR)**: Subtracts DR unless bypassed or vulnerable.
    7. **Absorb**: Applies system damage absorb maps.
  - **Shield HP Priority**: Automatically absorbs damage into Shield HP (acting as Temporary HP) first before any regular HP is lost.
  - **Token Scrolling Text & Breakdown**: Displays floating combat text over tokens and posts a step-by-step calculation breakdown notification.

- **🛡️ Accidental Deletion Protection**:
  - Confirmation modals (*"Are you sure?"*) prevent accidental deletion across all items, active effects, conditions, contacts, resources, and journal entries.

- **📜 Full Sheet Ecosystem**:
  - Alternate **Character Sheet**, **NPC Sheet**, **Item Sheet**, and **Siege Weapon Sheet** for unified world styling.

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
3. Save your module settings and the world will reload.
4. To set as default sheet, go to **Game Settings** -> **Configure Sheet Settings** and select **MythCraft Essence: Character Sheet**.

---

## 🔧 Mythcraft Data Path Compatibility

The module is built specifically for the **Mythcraft** system and utilizes the following data paths:

### Actor Data
- `system.hp.value` / `system.hp.max` - Current & Maximum Hit Points
- `system.hp.shield` - Shield Hit Points (Temporary HP)
- `system.ap.value` / `system.ap.special` - Action Points
- `system.sp.value` / `system.sp.max` - Spell Points & Spellcasting Attribute
- `system.attributes` - Core ability scores (`str`, `dex`, `end`, `awr`, `int`, `cha`, `luck`, `cor`)
- `system.defenses` - Calculated defenses (`ar`, `ref`, `fort`, `ant`, `log`, `will`)
- `system.damage.affinity` - Set/Array of active affinity damage types
- `system.damage.immune` - Set/Array of immune damage types
- `system.damage.resist` - String/Object of damage resistances (e.g. `"Sharp 2, Cold 3"`)
- `system.damage.vulnerable` - String/Object of damage vulnerabilities (e.g. `"Fire 5"`)
- `system.damage.reduction` - Damage Reduction (`value`, `bypasses`)
- `system.damage.threshold` - Damage Threshold (`threshold`)

### Item System Data
- `system.magicSource` - Spell school classification (`arcane`, `divine`, `occult`, `primal`, `psionic`)
- `system.apc` - Action Points cost
- `system.spc` - Spell Points cost
- `system.range` - Range value and unit
- `system.duration` - Duration value and unit
- `system.tags` - Categorical tags (`cantrip`, `prayer`, `ritual`, `chant`, `invocation`, etc.)
- `system.description.value` - Enriched HTML description

---

## 🎮 Usage

### Damage Modifications Configuration
Click the gear icon (⚙️) on the **Damage Modifications** panel on the Stats tab to open the HUD modal:
- Toggle **Affinity** and **Immunity** pills with a single click.
- Use the **Resist** and **Vulnerable** dropdown menus to add any damage type, enter its numerical value, or delete modifiers.
- Set **Damage Reduction (DR)** with optional bypass criteria, and configure **Damage Threshold (DT)**.
- Hit **Save** to stamp the changes to your actor and update all automated calculations.

### Spell Management & Sharing
- Use the magic school buttons (Arcane, Divine, Occult, Primal, Psionic) at the top of the Spells tab to filter by school.
- Click the d20 (`🎲`) button to roll a spellcasting check with automatic half-attribute scaling for non-primary sources.
- Click the speech bubble (`💬`) button to immediately post a styled spell description card to chat for other players to view.

---

## 🧩 Compatibility

- **System**: Mythcraft v0.6.4+
- **Foundry VTT**: v14
- **Mythcraft HUD**: Required
- **Dice So Nice!**: Supported for 3D dice rolls.

---

## 💖 Support & Contributing

If you encounter a bug, have a feature request, or would like to support ongoing development:
- 🐛 **GitHub Issues**: [Open an issue on GitHub](https://github.com/Jitterbone/mythcraft-essence-sheet/issues)
- ☕ **Ko-fi**: [Support development on Ko-fi](https://ko-fi.com/jitterbone)


