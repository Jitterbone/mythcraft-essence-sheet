/**
 * mythcraft-essence-sheet | src/sheets/essence-npc-sheet.mjs
 *
 * Extends the MythCraft system's NPCSheet (ApplicationV2) with
 * Essence-specific data remapping and HUD-aesthetic styling hooks.
 *
 * ─── HOW TO USE ───────────────────────────────────────────────────────────────
 *
 *  _preparePartContext()  – NPC sheets have a single "statblock" part that
 *                           merges stats, features, and spells. Override the
 *                           "statblock" case to inject Essence data before that
 *                           part renders.
 *
 *  _prepareDataRemaps()   – called from _prepareContext(). Map system NPC
 *                           data paths → Essence paths here (see TODO section).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 */

import NPCSheet from "/systems/mythcraft/module/applications/sheets/npc-sheet.mjs";

export default class EssenceNPCSheet extends NPCSheet {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    /**
     * The `essence-sheet` class is the CSS hook that activates the dark HUD
     * theme on this window.
     */
    classes: ["mythcraft", "actor", "sheet", "essence-sheet"],
  };

  /* ─────────────────────────────────────────────────────────────────────────
   *  Context preparation
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.essence = {
      moduleId: "mythcraft-essence-sheet",
    };

    await this._prepareDataRemaps(context, options);

    return context;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Per-part (tab) context
   * ──────────────────────────────────────────────────────────────────────── */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      // ── Statblock (the combined NPC view) ──────────────────────────────
      case "statblock":
        // TODO: Remap statblock data paths here.
        // At this point context already contains:
        //   context.attributeInfo  – grouped attribute data
        //   context.skillList      – flat array of skill objects
        //   context.passives       – passive feature items
        //   context.tieredActions  – action features by tier
        //   context.reactions      – reaction features
        // Example:
        //   context.essence.cr = context.system.cr;
        break;

      // ── Biography tab ──────────────────────────────────────────────────
      case "biography":
        // TODO: Remap biography-tab data paths here.
        break;
    }

    return context;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  Data remapping
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Override this method to remap data paths from the MythCraft system format
   * into whatever structure your NPC templates expect.
   *
   * @param {object} context   The context object (mutate in place).
   * @param {ApplicationRenderOptions} options
   */
  async _prepareDataRemaps(context, options) {
    const actor = this.actor;
    const sys   = actor.system;

    // ── TODO: Add NPC remaps below ────────────────────────────────────────
    //
    // FORMAT:  context.essence.<yourKey> = sys.<systemPath>;
    //
    // Examples (uncomment and adapt):
    //
    //   context.essence.hp       = { ...sys.hp };
    //   context.essence.defenses = { ...sys.defenses };
    //   context.essence.movement = { ...sys.movement };
    //
    // ─────────────────────────────────────────────────────────────────────
  }
}
