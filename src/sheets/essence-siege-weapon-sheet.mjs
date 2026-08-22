/**
 * mythcraft-essence-sheet | src/sheets/essence-siege-weapon-sheet.mjs
 *
 * Extends the MythCraft system's SiegeWeaponSheet (ApplicationV2) with
 * Essence-specific data remapping and HUD-aesthetic styling hooks.
 */

import SiegeWeaponSheet from "/systems/mythcraft/module/applications/sheets/siege-weapon-sheet.mjs";

export default class EssenceSiegeWeaponSheet extends SiegeWeaponSheet {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
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
   *  Data remapping
   * ──────────────────────────────────────────────────────────────────────── */

  /**
   * Override this method to remap data paths from the MythCraft system format
   * into whatever structure your siege-weapon templates expect.
   *
   * @param {object} context   The context object (mutate in place).
   * @param {ApplicationRenderOptions} options
   */
  async _prepareDataRemaps(context, options) {
    // TODO: Add siege-weapon-specific remaps here.
  }
}
