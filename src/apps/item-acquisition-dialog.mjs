/**
 * mythcraft-essence-sheet | src/apps/item-acquisition-dialog.mjs
 *
 * Modal prompted when dropping an item with a cost onto a character sheet.
 * Gives the player/GM choices:
 * • Purchase Item (deducts cost with direct payment or clean auto-change)
 * • Add for Free (Given / Loot / Reward)
 * • Cancel Drop
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import {
  getActiveCurrencies,
  getActorCurrencyCount,
  getActorCurrencyUpdates,
  calculateTotalBaseUnits,
  executePurchaseDeduction,
} from "./wallet-dialog.mjs";

/**
 * Parse cost from a dropped item document or index entry
 * @param {Item|object} item
 * @returns {{ amount: number, currency: object, costInBase: number, rawDisplay: string } | null}
 */
export function parseItemCost(item) {
  if (!item) return null;
  const currencies = getActiveCurrencies();
  const defaultCurr = currencies.find(c => c.isDefault) || currencies.find(c => c.abbr === "sc") || currencies[0] || { key: "scillings", abbr: "sc", label: "Silver Coins", rate: 100 };

  const rawCost = item.system?.cost ?? item.system?.price ?? item.system?.value ?? item.cost ?? item.price ?? item.value ?? item.flags?.["mythcraft-essence-sheet"]?.cost;

  let amount = 0;
  let chosenCurr = defaultCurr;

  if (typeof rawCost === "number") {
    amount = rawCost;
  } else if (typeof rawCost === "string") {
    const trimmed = rawCost.trim().toLowerCase();
    const numMatch = trimmed.match(/^([\d.,]+)/);
    if (numMatch) {
      amount = parseFloat(numMatch[1].replace(/,/g, ""));
      const rest = trimmed.slice(numMatch[0].length).trim();
      const matched = currencies.find(c => rest.startsWith(c.abbr) || rest.startsWith(c.key) || rest.startsWith(c.label.toLowerCase()));
      if (matched) chosenCurr = matched;
    }
  } else if (typeof rawCost === "object" && rawCost !== null) {
    amount = Number(rawCost.value ?? rawCost.amount ?? 0);
    const denom = String(rawCost.denomination ?? rawCost.currency ?? rawCost.curr ?? "").trim().toLowerCase();
    const matched = currencies.find(c => c.abbr === denom || c.key === denom || c.label.toLowerCase() === denom);
    if (matched) chosenCurr = matched;
  }

  if (isNaN(amount) || amount <= 0) return null;

  return {
    amount,
    currency: chosenCurr,
    costInBase: amount * chosenCurr.rate,
    rawDisplay: `${amount} ${chosenCurr.abbr} (${chosenCurr.label})`,
  };
}

/**
 * Process purchasing an item for an actor
 * @param {Actor} actor
 * @param {object} costData
 * @param {Item} item
 * @returns {Promise<boolean>}
 */
export async function processItemPurchase(actor, costData, item) {
  if (!actor || !costData) return false;

  const currencies = getActiveCurrencies();
  const defaultCurr = currencies.find(c => c.isDefault) || currencies.find(c => c.abbr === "sc") || currencies[0];
  const defRate = defaultCurr.rate || 1;

  const currentCounts = {};
  for (const c of currencies) {
    currentCounts[c.key] = getActorCurrencyCount(actor, c);
  }

  const newCounts = executePurchaseDeduction(currentCounts, costData.amount, costData.currency, currencies);

  if (!newCounts) {
    const totalBaseWealth = calculateTotalBaseUnits(currentCounts, currencies);
    const totalInDefault = (totalBaseWealth / defRate).toLocaleString(undefined, { maximumFractionDigits: 2 });
    ui.notifications.error(`Insufficient funds to purchase ${item.name}! Required: ${costData.rawDisplay}, but you only have ${totalInDefault} ${defaultCurr.abbr}.`);
    return false;
  }

  const updates = getActorCurrencyUpdates(newCounts, currencies);
  await actor.update(updates);

  const newTotalBase = calculateTotalBaseUnits(newCounts, currencies);
  const remInDefault = (newTotalBase / defRate).toLocaleString(undefined, { maximumFractionDigits: 2 });

  // Post transaction chat card
  const content = `
    <div class="mythcraft-chat-card essence-receipt-card purchase">
      <div class="receipt-header">
        <div class="receipt-title-wrap">
          <i class="fas fa-bag-shopping receipt-icon"></i>
          <h3 class="receipt-title">Item Purchase Receipt</h3>
        </div>
        <span class="receipt-tag purchase-tag">PURCHASE</span>
      </div>

      <div class="receipt-body">
        <div class="receipt-item-banner">
          <img src="${item.img || 'icons/svg/item-bag.svg'}" class="receipt-item-img" />
          <div class="receipt-item-details">
            <span class="receipt-item-name">${item.name}</span>
            <span class="receipt-inventory-badge"><i class="fas fa-box-archive"></i> Added to Inventory</span>
          </div>
        </div>

        <div class="receipt-ledger">
          <div class="ledger-row cost-row">
            <span class="ledger-label"><i class="fas fa-coins" style="color: ${costData.currency?.color || '#f1c40f'};"></i> Amount Paid</span>
            <span class="ledger-val cost-amount">-${costData.rawDisplay}</span>
          </div>
          <div class="ledger-divider"></div>
          <div class="ledger-row balance-row">
            <span class="ledger-label"><i class="fas fa-vault" style="color: ${defaultCurr.color || '#cbd5e1'};"></i> Remaining Balance</span>
            <span class="ledger-val balance-amount">${remInDefault} ${defaultCurr.abbr}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flavor: `${actor.name} purchased ${item.name}`,
  });

  ui.notifications.info(`Purchased ${item.name} for ${costData.rawDisplay}.`);
  return true;
}

export default class ItemAcquisitionDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "item-acquisition-dialog"],
    window: {
      title: "Item Acquisition",
      icon: "fas fa-bag-shopping",
      resizable: false,
    },
    position: {
      width: 480,
      height: "auto",
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/item-acquisition-dialog.hbs",
    },
  };

  #resolve = null;

  /**
   * Prompt modal for item acquisition choice
   * @param {{ actor: Actor, item: Item, costData: object }} data
   * @returns {Promise<"purchase" | "free" | "cancel">}
   */
  static async prompt(data) {
    return new Promise(resolve => {
      const dialog = new this(data);
      dialog.#resolve = resolve;
      dialog.render(true);
    });
  }

  constructor(options = {}) {
    super(options);
    this.actorDoc = options.actor;
    this.itemDoc = options.item;
    this.costData = options.costData;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const currencies = getActiveCurrencies();
    const defaultCurr = currencies.find(c => c.isDefault) || currencies.find(c => c.abbr === "sc") || currencies[0];
    const defRate = defaultCurr.rate || 1;

    const currentCounts = {};
    for (const c of currencies) {
      currentCounts[c.key] = getActorCurrencyCount(this.actorDoc, c);
    }
    const totalBaseWealth = calculateTotalBaseUnits(currentCounts, currencies);
    const canAfford = totalBaseWealth >= (this.costData?.costInBase || 0);

    context.actor = this.actorDoc;
    context.item = this.itemDoc;
    context.costData = this.costData;
    context.canAfford = canAfford;
    context.totalBaseWealth = totalBaseWealth;
    context.defaultCurr = defaultCurr;
    context.wealthInDefault = (totalBaseWealth / defRate).toFixed(2);

    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    if (!html) return;

    html.querySelector('[data-action="choosePurchase"]')?.addEventListener("click", () => {
      if (this.#resolve) this.#resolve("purchase");
      this.#resolve = null;
      this.close();
    });

    html.querySelector('[data-action="chooseFree"]')?.addEventListener("click", () => {
      if (this.#resolve) this.#resolve("free");
      this.#resolve = null;
      this.close();
    });

    html.querySelector('[data-action="chooseCancel"]')?.addEventListener("click", () => {
      if (this.#resolve) this.#resolve("cancel");
      this.#resolve = null;
      this.close();
    });
  }

  /** @inheritdoc */
  async close(options = {}) {
    if (this.#resolve) {
      this.#resolve("cancel");
      this.#resolve = null;
    }
    return super.close(options);
  }
}
