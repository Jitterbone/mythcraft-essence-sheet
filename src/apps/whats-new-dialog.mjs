/**
 * mythcraft-essence-sheet | src/apps/whats-new-dialog.mjs
 *
 * "What's New" Update Spotlight & Automation Onboarding Dialog (ApplicationV2).
 * Explains the Native Active Effect Engine, Guided Effect Manager, and
 * Canonical Talent Automation to users upon module updates.
 *
 * Provides options to enable talent automation, acknowledge while keeping it disabled,
 * or remind the user later.
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "mythcraft-essence-sheet";

export default class WhatsNewDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * Version tracking constant for the Active Effect Engine & Talent Automation update.
   * Updating this constant will prompt users on subsequent major updates.
   */
  static WHATS_NEW_VERSION = "0.9.8-talent-automation";

  static DEFAULT_OPTIONS = {
    id: "mythcraft-whats-new-dialog",
    classes: ["mythcraft-essence", "whats-new-dialog-window"],
    tag: "div",
    window: {
      title: "MythCraft Essence — What's New: Active Effects & Talent Automation",
      icon: "fa-solid fa-sparkles",
      resizable: true,
      minimizable: false,
    },
    position: {
      width: 820,
      height: 740,
    },
    actions: {
      enableAutomation: WhatsNewDialog.#onEnableAutomation,
      acknowledgeDisabled: WhatsNewDialog.#onAcknowledgeDisabled,
      remindLater: WhatsNewDialog.#onRemindLater,
      openGithub: WhatsNewDialog.#onOpenGithub,
    },
  };

  static PARTS = {
    content: {
      template: "modules/mythcraft-essence-sheet/templates/apps/whats-new-dialog.hbs",
    },
  };

  static _hasCheckedAndPrompted = false;

  constructor(options = {}) {
    super(options);
    this._acknowledged = false;
  }

  /**
   * Prepares context data for rendering the template.
   */
  async _prepareContext(options) {
    const context = (await super._prepareContext(options)) || {};
    const isGM = Boolean(game.user?.isGM || (game.user?.role >= (CONST?.USER_ROLES?.ASSISTANT ?? 3)));
    let talentAutomationEnabled = false;
    try {
      talentAutomationEnabled = Boolean(game.settings?.get(MODULE_ID, "talentAutomation"));
    } catch (_) {
      talentAutomationEnabled = false;
    }

    context.isGM = isGM;
    context.talentAutomationEnabled = talentAutomationEnabled;
    context.version = WhatsNewDialog.WHATS_NEW_VERSION;
    return context;
  }

  /**
   * Handler for "Enable Talent Automation" button.
   * Enables the world setting, records acknowledgment so it is not shown again, and closes.
   */
  static async #onEnableAutomation(event, target) {
    if (game.user?.isGM) {
      try {
        await game.settings.set(MODULE_ID, "talentAutomation", true);
      } catch (err) {
        console.error(`${MODULE_ID} | Error updating talentAutomation setting:`, err);
      }
    }
    try {
      await game.settings.set(MODULE_ID, "whatsNewAcknowledgedVersion", WhatsNewDialog.WHATS_NEW_VERSION);
    } catch (err) {
      console.error(`${MODULE_ID} | Error updating whatsNewAcknowledgedVersion setting:`, err);
    }
    try {
      globalThis.localStorage?.setItem("mythcraft_whats_new_ack", WhatsNewDialog.WHATS_NEW_VERSION);
    } catch (_) {}
    this._acknowledged = true;
    ui.notifications?.info("Talent Active Effect automation enabled! Check character Effects tabs to verify manual modifiers.");
    await this.close();
  }

  /**
   * Handler for "Acknowledge (Keep Disabled)" button.
   * Keeps talent automation disabled, records acknowledgment so it is not shown again, and closes.
   */
  static async #onAcknowledgeDisabled(event, target) {
    if (game.user?.isGM) {
      try {
        await game.settings.set(MODULE_ID, "talentAutomation", false);
      } catch (err) {
        console.error(`${MODULE_ID} | Error updating talentAutomation setting:`, err);
      }
    }
    try {
      await game.settings.set(MODULE_ID, "whatsNewAcknowledgedVersion", WhatsNewDialog.WHATS_NEW_VERSION);
    } catch (err) {
      console.error(`${MODULE_ID} | Error updating whatsNewAcknowledgedVersion setting:`, err);
    }
    try {
      globalThis.localStorage?.setItem("mythcraft_whats_new_ack", WhatsNewDialog.WHATS_NEW_VERSION);
    } catch (_) {}
    this._acknowledged = true;
    ui.notifications?.info("Talent automation remains disabled. You can enable it anytime in Game Settings -> Module Settings.");
    await this.close();
  }

  /**
   * Handler for "Remind Me Later" button.
   * Closes without recording acknowledgment, so it will show again on next world launch.
   */
  static async #onRemindLater(event, target) {
    this._acknowledged = false;
    ui.notifications?.info("Reminder set: The What's New prompt will show again when you next load the game.");
    await this.close();
  }

  /**
   * External link action for GitHub Issues
   */
  static #onOpenGithub(event, target) {
    window.open("https://github.com/Jitterbone/mythcraft-essence-sheet/issues", "_blank", "noopener,noreferrer");
  }

  /**
   * Checks whether the current user has not yet acknowledged the current update,
   * launching the dialog if necessary.
   */
  static checkAndPrompt() {
    if (WhatsNewDialog._hasCheckedAndPrompted) return;

    let ackVersion = "";
    try {
      ackVersion = String(game.settings?.get(MODULE_ID, "whatsNewAcknowledgedVersion") || "");
    } catch (err) {
      ackVersion = "";
    }
    const localAck = String(globalThis.localStorage?.getItem("mythcraft_whats_new_ack") || "");

    console.log(`${MODULE_ID} | Checking What's New status (Ack: "${ackVersion}", LocalAck: "${localAck}", Target: "${WhatsNewDialog.WHATS_NEW_VERSION}")...`);
    if (ackVersion !== WhatsNewDialog.WHATS_NEW_VERSION && localAck !== WhatsNewDialog.WHATS_NEW_VERSION) {
      WhatsNewDialog._hasCheckedAndPrompted = true;
      // Delay slightly so UI layers finish initial draw
      setTimeout(() => {
        WhatsNewDialog.show();
      }, 350);
    }
  }

  /**
   * Resets the acknowledgment state so the What's New dialog will show again on next refresh
   * (or immediately renders it).
   */
  static async reset(showImmediately = true) {
    try {
      await game.settings?.set(MODULE_ID, "whatsNewAcknowledgedVersion", "");
    } catch (_) {}
    try {
      globalThis.localStorage?.removeItem("mythcraft_whats_new_ack");
    } catch (_) {}
    WhatsNewDialog._hasCheckedAndPrompted = false;
    if (showImmediately) {
      return WhatsNewDialog.show();
    }
  }

  /**
   * Explicitly opens the What's New dialog at any time (e.g. from Module Settings or macro).
   */
  static show() {
    console.log(`${MODULE_ID} | Opening WhatsNewDialog spotlight...`);
    // If an existing dialog is currently mounted and active in the DOM, bring it forward
    if (globalThis.foundry?.applications?.instances) {
      for (const [appId, app] of foundry.applications.instances.entries()) {
        if (app instanceof WhatsNewDialog) {
          if (app.element && document.body.contains(app.element)) {
            app.bringToFront?.();
            return app;
          } else {
            // Remove stale/closed instance from registry so fresh one can render cleanly
            try {
              foundry.applications.instances.delete(appId);
            } catch (_) {}
          }
        }
      }
    }
    const dialog = new WhatsNewDialog();
    dialog.render({ force: true });
    setTimeout(() => {
      try {
        dialog.bringToFront?.();
      } catch (_) {}
    }, 150);
    return dialog;
  }
}

