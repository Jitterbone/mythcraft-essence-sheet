/**
 * mythcraft-essence-sheet | src/apps/wallet-dialog.mjs
 *
 * Shopping & Wallet Manager modal for MythCraft.
 * Handles:
 * • Live balance tracking in all campaign currencies (ordered lowest to highest)
 * • Live real-time coin input editing on typing
 * • Natural tabletop payment math (direct payment without forced coin conversion)
 * • Robust coin consolidation into highest denominations
 * • Compendium search & autocomplete for purchasing items with auto-populated costs
 * • Depositing / Earning funds
 * • Detailed transaction receipts in chat
 */

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import { DEFAULT_CURRENCY_CONFIG, DEFAULT_CURRENCY_PRESETS, MODULE_ID } from "../settings.mjs";
import { parseItemCost } from "./item-acquisition-dialog.mjs";

/**
 * Get active currency configuration from world settings (sorted lowest to highest)
 * @returns {Array<{ key: string, label: string, abbr: string, rate: number, icon: string, color: string, isDefault?: boolean }>}
 */
export function getActiveCurrencies() {
  let currencies = [];
  try {
    currencies = game.settings.get(MODULE_ID, "customCurrencyConfig");
  } catch (err) {
    currencies = [];
  }
  if (!Array.isArray(currencies) || !currencies.length) {
    currencies = foundry.utils.deepClone(DEFAULT_CURRENCY_CONFIG);
  }
  return currencies.map(c => ({
    ...c,
    rate: Number(c.rate) || 1,
    color: c.color || "#f1c40f",
    icon: c.icon || "fas fa-coins",
    isDefault: Boolean(c.isDefault),
  })).sort((a, b) => a.rate - b.rate);
}

/**
 * Safely read an actor's currency count matching MythCraft DataModel schema
 * @param {Actor} actor
 * @param {object} currency
 * @returns {number}
 */
export function getActorCurrencyCount(actor, currency) {
  if (!actor) return 0;
  const sysCurr = actor.system?.currency || {};
  const flagCurr = actor.flags?.["mythcraft-essence-sheet"]?.customCurrency || {};

  const key = currency.key?.toLowerCase();
  const abbr = currency.abbr?.toLowerCase();

  if (key === "amber" || key === "astra" || abbr === "a") {
    return Number(sysCurr.astra ?? sysCurr.a ?? sysCurr.amber ?? 0);
  }
  if (key === "scillings" || key === "silver" || abbr === "sc") {
    return Number(sysCurr.scillings ?? sysCurr.sc ?? 0);
  }
  if (key === "qorn" || key === "quints" || abbr === "q") {
    return Number(sysCurr.quints ?? sysCurr.q ?? sysCurr.qorn ?? 0);
  }
  if (key === "diamond" || key === "denarii" || abbr === "dc") {
    return Number(sysCurr.denarii ?? sysCurr.dc ?? sysCurr.diamond ?? 0);
  }

  return Number(flagCurr[key] ?? sysCurr[key] ?? sysCurr[abbr] ?? 0);
}

/**
 * Build actor update payload matching MythCraft system schema
 * @param {Record<string, number>} currencyCounts
 * @param {Array<object>} currencies
 * @returns {object}
 */
export function getActorCurrencyUpdates(currencyCounts, currencies) {
  const updates = {};
  for (const c of currencies) {
    const key = c.key?.toLowerCase();
    const abbr = c.abbr?.toLowerCase();
    const val = Math.max(0, parseInt(currencyCounts[c.key] ?? currencyCounts[c.abbr] ?? 0) || 0);

    if (key === "amber" || key === "astra" || abbr === "a") {
      updates["system.currency.astra"] = val;
    } else if (key === "scillings" || key === "silver" || abbr === "sc") {
      updates["system.currency.scillings"] = val;
    } else if (key === "qorn" || key === "quints" || abbr === "q") {
      updates["system.currency.quints"] = val;
    } else if (key === "diamond" || key === "denarii" || abbr === "dc") {
      updates["system.currency.denarii"] = val;
    } else {
      updates[`flags.mythcraft-essence-sheet.customCurrency.${c.key}`] = val;
      updates[`system.currency.${c.key}`] = val;
    }
  }
  return updates;
}

/**
 * Convert a map of currency counts into total base units
 * @param {Record<string, number>} counts
 * @param {Array<object>} currencies
 * @returns {number}
 */
export function calculateTotalBaseUnits(counts, currencies) {
  let total = 0;
  for (const c of currencies) {
    const qty = Number(counts[c.key] ?? counts[c.abbr] ?? 0);
    total += qty * c.rate;
  }
  return total;
}

/**
 * Greedily pack base units into currency counts from highest denomination to lowest
 * @param {number} totalBaseUnits
 * @param {Array<object>} currencies
 * @returns {Record<string, number>}
 */
export function packBaseUnitsToCurrencies(totalBaseUnits, currencies) {
  let remainder = Math.max(0, Math.floor(totalBaseUnits));
  const counts = {};
  const sorted = [...currencies].sort((a, b) => b.rate - a.rate);

  for (const c of sorted) {
    const qty = Math.floor(remainder / c.rate);
    counts[c.key] = qty;
    remainder %= c.rate;
  }

  return counts;
}

/**
 * Tabletop RPG payment deduction.
 * Always takes from the highest value currency first.
 * If breaking a higher denomination coin is needed, change is distributed back into lower denominations.
 * @param {Record<string, number>} currentCounts
 * @param {number} costAmount
 * @param {object} chosenCurr
 * @param {Array<object>} currencies
 * @returns {Record<string, number> | null}
 */
export function executePurchaseDeduction(currentCounts, costAmount, chosenCurr, currencies) {
  const counts = { ...currentCounts };
  const costInBase = costAmount * chosenCurr.rate;
  const totalBaseWealth = calculateTotalBaseUnits(counts, currencies);

  if (totalBaseWealth < costInBase) {
    return null; // Insufficient funds
  }

  // Sort currencies descending by rate (Diamond -> Qorn -> Silver -> Amber)
  const sortedDesc = [...currencies].sort((a, b) => b.rate - a.rate);
  let remainingCostInBase = costInBase;

  for (let i = 0; i < sortedDesc.length; i++) {
    const c = sortedDesc[i];
    const available = Number(counts[c.key] || 0);
    if (available <= 0) continue;

    if (c.rate >= remainingCostInBase) {
      // 1 coin of this highest available currency can cover the entire remaining cost
      counts[c.key] -= 1;
      let changeInBase = c.rate - remainingCostInBase;
      remainingCostInBase = 0;

      // Distribute change back into smaller denominations strictly below this currency
      const changeCurrs = [...currencies].filter(curr => curr.rate < c.rate).sort((a, b) => b.rate - a.rate);
      for (const ch of changeCurrs) {
        const qty = Math.floor(changeInBase / ch.rate);
        counts[ch.key] = (counts[ch.key] || 0) + qty;
        changeInBase %= ch.rate;
      }
      return counts;
    } else {
      // Coin is smaller than remaining cost: use as many as needed/available
      const neededQty = Math.floor(remainingCostInBase / c.rate);
      const usedQty = Math.min(available, neededQty);

      if (usedQty > 0) {
        counts[c.key] -= usedQty;
        remainingCostInBase -= (usedQty * c.rate);
      }

      if (remainingCostInBase === 0) {
        return counts;
      }

      // If we still have coins of this denomination left and a fraction of cost remains:
      if (counts[c.key] > 0 && remainingCostInBase > 0) {
        counts[c.key] -= 1;
        let changeInBase = c.rate - remainingCostInBase;
        remainingCostInBase = 0;

        const changeCurrs = [...currencies].filter(curr => curr.rate < c.rate).sort((a, b) => b.rate - a.rate);
        for (const ch of changeCurrs) {
          const qty = Math.floor(changeInBase / ch.rate);
          counts[ch.key] = (counts[ch.key] || 0) + qty;
          changeInBase %= ch.rate;
        }
        return counts;
      }
    }
  }

  if (remainingCostInBase <= 0) {
    return counts;
  }

  // Fallback
  const newTotalBase = totalBaseWealth - costInBase;
  return packBaseUnitsToCurrencies(newTotalBase, currencies);
}

export const ALLOWED_SHOP_ITEM_TYPES = new Set([
  "gear",
  "weapon",
  "armor",
  "equipment",
  "consumable",
  "item",
  "tool",
]);

/**
 * Search all Item compendiums and world items for matching items (gear, weapons, armor only)
 * @param {string} query
 * @returns {Promise<Array<{ uuid: string, name: string, img: string, type: string, costData: object | null }>>}
 */
export async function searchCompendiumItems(query) {
  if (!query || typeof query !== "string" || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();
  const results = [];

  // 1. Search World Items (gear, weapons, armor only)
  for (const item of game.items) {
    const itemType = item.type?.toLowerCase();
    if (!ALLOWED_SHOP_ITEM_TYPES.has(itemType)) continue;

    if (item.name.toLowerCase().includes(q)) {
      const costData = parseItemCost(item);
      results.push({
        uuid: item.uuid,
        name: item.name,
        img: item.img,
        type: item.type,
        costData,
      });
      if (results.length >= 14) return results;
    }
  }

  // 2. Search Compendium Item Packs (gear, weapons, armor only)
  const itemPacks = game.packs.filter(p => p.documentName === "Item");
  for (const pack of itemPacks) {
    const index = await pack.getIndex({ fields: ["img", "type", "system.cost", "system.price", "system.value"] });
    for (const entry of index) {
      const entryType = entry.type?.toLowerCase();
      if (!ALLOWED_SHOP_ITEM_TYPES.has(entryType)) continue;

      if (entry.name.toLowerCase().includes(q)) {
        const costData = parseItemCost(entry);
        results.push({
          uuid: entry.uuid,
          name: entry.name,
          img: entry.img,
          type: entry.type,
          costData,
        });
        if (results.length >= 14) return results;
      }
    }
  }

  return results;
}

export default class WalletDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["mythcraft", "essence-sheet", "wallet-dialog"],
    window: {
      title: "Wallet & Shopping Manager",
      icon: "fas fa-wallet",
      resizable: true,
    },
    position: {
      width: 680,
      height: "auto",
    },
    form: {
      handler: this.#onSubmitForm,
      closeOnSubmit: false,
    },
    actions: {
      processPurchase: this.#onProcessPurchase,
      processDeposit: this.#onProcessDeposit,
      consolidateCoins: this.#onConsolidateCoins,
      quickSpend: this.#onQuickSpend,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/mythcraft-essence-sheet/templates/apps/wallet-dialog.hbs",
    },
  };

  #selectedItemUuid = null;
  #searchDebounceTimer = null;

  /**
   * Safe accessor for actor document
   */
  get actor() {
    return this.document ?? this.options?.document ?? this.options?.actor ?? null;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;

    if (!actor) {
      context.actor = { name: "Character" };
      context.wallet = [];
      context.currencies = [];
      context.totalBaseWealth = 0;
      context.totalInDefault = "0";
      return context;
    }

    context.actor = actor;
    const currencies = getActiveCurrencies();
    const defaultCurrency = currencies.find(c => c.isDefault) || currencies.find(c => c.abbr === "sc") || currencies[0];
    const defRate = defaultCurrency.rate || 1;

    const currentCounts = {};
    for (const c of currencies) {
      currentCounts[c.key] = getActorCurrencyCount(actor, c);
    }

    const wallet = currencies.map(c => {
      const count = currentCounts[c.key] || 0;
      const relMult = c.rate / defRate;
      const relDisplay = relMult < 1 ? Number(relMult.toFixed(4)).toString() : relMult.toLocaleString();
      const totalInDefaultVal = count * relMult;
      const totalInDefaultDisplay = totalInDefaultVal % 1 === 0 ? totalInDefaultVal.toLocaleString() : totalInDefaultVal.toFixed(2);

      return {
        ...c,
        count,
        relMult,
        relDisplay,
        totalInDefaultVal,
        totalInDefaultDisplay,
        defaultAbbr: defaultCurrency.abbr,
      };
    });

    const totalBaseWealth = calculateTotalBaseUnits(currentCounts, currencies);
    const lowestCurrency = currencies[0] || { label: "Amber", abbr: "a", rate: 1 };
    const highestCurrency = currencies[currencies.length - 1] || { label: "Diamond Coins", abbr: "dc", rate: 100000 };

    let presets = [];
    try {
      presets = game.settings.get(MODULE_ID, "customCurrencyPresets");
    } catch (err) {
      presets = [];
    }
    if (!Array.isArray(presets) || !presets.length) {
      presets = foundry.utils.deepClone(DEFAULT_CURRENCY_PRESETS);
    }

    const dynamicPresets = presets.map(p => {
      const matchCurr = currencies.find(c => c.key === p.curr || c.abbr === p.curr) || currencies[1] || currencies[0] || { abbr: "sc", label: "Silver Coins", color: "#cbd5e1" };
      return {
        label: p.label,
        amount: p.amount,
        curr: matchCurr.key,
        currAbbr: matchCurr.abbr,
        currLabel: matchCurr.label,
        color: matchCurr.color || "#f1c40f",
        icon: matchCurr.icon || "fas fa-coins",
      };
    });

    const totalInDefault = (totalBaseWealth / defRate).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    context.wallet = wallet;
    context.currencies = currencies;
    context.presets = dynamicPresets;
    context.totalBaseWealth = totalBaseWealth;
    context.defaultCurrency = defaultCurrency;
    context.totalInDefault = totalInDefault;
    context.highestCurrency = highestCurrency;
    context.lowestCurrency = lowestCurrency;

    return context;
  }

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    if (!html) return;

    // 1. Live Auto-Update for Coin Inputs on Typing / Change
    const coinInputs = html.querySelectorAll(".wallet-coin-input");
    coinInputs.forEach(input => {
      let liveDebounce = null;
      const saveCoinValue = async () => {
        const actor = this.actor;
        if (!actor) return;
        const key = input.dataset.key || input.name.replace(/^curr_/, "");
        const val = Math.max(0, parseInt(input.value) || 0);
        const currencies = getActiveCurrencies();
        const matchCurr = currencies.find(c => c.key === key || c.abbr === key);

        const currentVal = getActorCurrencyCount(actor, matchCurr || { key });
        if (currentVal === val) return;

        const currencyCounts = {};
        for (const c of currencies) {
          currencyCounts[c.key] = getActorCurrencyCount(actor, c);
        }
        currencyCounts[matchCurr?.key || key] = val;

        const updates = getActorCurrencyUpdates(currencyCounts, currencies);
        await actor.update(updates);
        ui.notifications.info(`Updated ${matchCurr?.label || key} to ${val}.`);
      };

      input.addEventListener("change", saveCoinValue);
      input.addEventListener("input", () => {
        clearTimeout(liveDebounce);
        liveDebounce = setTimeout(saveCoinValue, 500);
      });
    });

    // 2. Compendium Search Dropdown
    const descInput = html.querySelector('[name="purchase_desc"]');
    const dropdown = html.querySelector('.compendium-search-dropdown');

    if (descInput && dropdown) {
      descInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        clearTimeout(this.#searchDebounceTimer);

        if (query.length < 1) {
          dropdown.classList.remove("visible");
          dropdown.innerHTML = "";
          this.#selectedItemUuid = null;
          return;
        }

        this.#searchDebounceTimer = setTimeout(async () => {
          const results = await searchCompendiumItems(query);
          if (!results.length) {
            dropdown.innerHTML = `<div class="search-empty-hint"><i class="fas fa-search"></i> No items found matching "${query}"</div>`;
            dropdown.classList.add("visible");
            return;
          }

          let itemsHTML = "";
          for (const item of results) {
            const costTag = item.costData 
              ? `<span class="item-cost-tag" style="color: ${item.costData.currency.color};"><i class="${item.costData.currency.icon}"></i> ${item.costData.rawDisplay}</span>` 
              : `<span class="item-cost-tag cost-free">No cost listed</span>`;
            
            itemsHTML += `
              <div class="search-result-row" data-uuid="${item.uuid}" data-name="${item.name}" data-cost="${item.costData?.amount ?? ''}" data-curr="${item.costData?.currency?.key ?? ''}">
                <img src="${item.img || 'icons/svg/item-bag.svg'}" class="search-item-img" />
                <div class="search-item-info">
                  <span class="search-item-name">${item.name}</span>
                  <span class="search-item-type">${item.type}</span>
                </div>
                ${costTag}
              </div>
            `;
          }

          dropdown.innerHTML = itemsHTML;
          dropdown.classList.add("visible");

          // Bind click listeners on search results
          dropdown.querySelectorAll('.search-result-row').forEach(row => {
            row.addEventListener("click", () => {
              const uuid = row.dataset.uuid;
              const name = row.dataset.name;
              const cost = row.dataset.cost;
              const curr = row.dataset.curr;

              descInput.value = name;
              this.#selectedItemUuid = uuid;

              if (cost) {
                const costInput = html.querySelector('[name="purchase_cost"]');
                if (costInput) costInput.value = cost;
              }
              if (curr) {
                const currSelect = html.querySelector('[name="purchase_currency"]');
                if (currSelect) currSelect.value = curr;
              }

              dropdown.classList.remove("visible");
              dropdown.innerHTML = "";
            });
          });
        }, 150);
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!html.contains(e.target)) {
          dropdown.classList.remove("visible");
        }
      }, { capture: true });
    }
  }

  /**
   * Process a purchase / spend transaction with auto-change
   */
  static async #onProcessPurchase(event, target) {
    const actor = this.actor;
    if (!actor) return;

    const form = this.element;
    const costInput = form.querySelector('[name="purchase_cost"]');
    const currencySelect = form.querySelector('[name="purchase_currency"]');
    const itemDescInput = form.querySelector('[name="purchase_desc"]');

    const costAmount = Math.max(0, Number(costInput?.value) || 0);
    const currKey = currencySelect?.value;
    const itemDesc = itemDescInput?.value?.trim() || "Item Purchase";
    const itemUuid = this.#selectedItemUuid;

    if (costAmount <= 0) {
      ui.notifications.warn("Please enter a valid purchase cost.");
      return;
    }

    const currencies = getActiveCurrencies();
    const chosenCurr = currencies.find(c => c.key === currKey || c.abbr === currKey) || currencies[1] || currencies[0];
    const defaultCurrency = currencies.find(c => c.isDefault) || currencies.find(c => c.abbr === "sc") || currencies[0];
    const defRate = defaultCurrency.rate || 1;

    const currentCounts = {};
    for (const c of currencies) {
      currentCounts[c.key] = getActorCurrencyCount(actor, c);
    }

    const newCounts = executePurchaseDeduction(currentCounts, costAmount, chosenCurr, currencies);

    const costDisplay = `${costAmount} ${chosenCurr.abbr} (${chosenCurr.label})`;

    if (!newCounts) {
      const totalBaseWealth = calculateTotalBaseUnits(currentCounts, currencies);
      const totalInDefault = (totalBaseWealth / defRate).toLocaleString(undefined, { maximumFractionDigits: 2 });
      const costInBase = costAmount * chosenCurr.rate;
      const costInDefault = (costInBase / defRate).toLocaleString(undefined, { maximumFractionDigits: 2 });
      ui.notifications.error(`Insufficient funds! Total wealth is ${totalInDefault} ${defaultCurrency.abbr}, but cost is ${costDisplay} (${costInDefault} ${defaultCurrency.abbr}).`);
      return;
    }

    const updates = getActorCurrencyUpdates(newCounts, currencies);
    await actor.update(updates);

    // If a compendium item was selected, create the item on the actor
    let purchasedDoc = null;
    let itemImg = null;
    if (itemUuid) {
      try {
        const itemObj = await fromUuid(itemUuid);
        if (itemObj) {
          itemImg = itemObj.img;
          purchasedDoc = await actor.createEmbeddedDocuments("Item", [itemObj.toObject()]);
        }
      } catch (err) {
        console.warn("Could not create embedded item from UUID:", itemUuid, err);
      }
    }

    const newTotalBase = calculateTotalBaseUnits(newCounts, currencies);
    const remInDefault = (newTotalBase / defRate).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const content = `
      <div class="mythcraft-chat-card essence-receipt-card purchase">
        <div class="receipt-header">
          <div class="receipt-title-wrap">
            <i class="fas fa-receipt receipt-icon"></i>
            <h3 class="receipt-title">Purchase Receipt</h3>
          </div>
          <span class="receipt-tag purchase-tag">PURCHASE</span>
        </div>

        <div class="receipt-body">
          <div class="receipt-item-banner">
            <img src="${itemImg || 'icons/svg/item-bag.svg'}" class="receipt-item-img" />
            <div class="receipt-item-details">
              <span class="receipt-item-name">${itemDesc}</span>
              ${purchasedDoc ? '<span class="receipt-inventory-badge"><i class="fas fa-box-archive"></i> Added to Inventory</span>' : '<span class="receipt-inventory-badge general"><i class="fas fa-bag-shopping"></i> Item / Service</span>'}
            </div>
          </div>

          <div class="receipt-ledger">
            <div class="ledger-row cost-row">
              <span class="ledger-label"><i class="fas fa-coins" style="color: ${chosenCurr.color};"></i> Amount Paid</span>
              <span class="ledger-val cost-amount">-${costAmount} ${chosenCurr.abbr} <small>(${chosenCurr.label})</small></span>
            </div>
            <div class="ledger-divider"></div>
            <div class="ledger-row balance-row">
              <span class="ledger-label"><i class="fas fa-vault" style="color: ${defaultCurrency.color};"></i> Remaining Balance</span>
              <span class="ledger-val balance-amount">${remInDefault} ${defaultCurrency.abbr}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flavor: `${actor.name} made a purchase`,
    });

    this.#selectedItemUuid = null;
    if (itemDescInput) itemDescInput.value = "";
    if (costInput) costInput.value = "";

    ui.notifications.info(`Purchased ${itemDesc} for ${costDisplay}.`);
    this.render();
  }

  /**
   * Deposit or receive funds
   */
  static async #onProcessDeposit(event, target) {
    const actor = this.actor;
    if (!actor) return;

    const form = this.element;
    const depositInput = form.querySelector('[name="deposit_amount"]');
    const currencySelect = form.querySelector('[name="deposit_currency"]');

    const amount = Math.max(0, Number(depositInput?.value) || 0);
    const currKey = currencySelect?.value;

    if (amount <= 0) {
      ui.notifications.warn("Please enter a valid deposit amount.");
      return;
    }

    const currencies = getActiveCurrencies();
    const chosenCurr = currencies.find(c => c.key === currKey || c.abbr === currKey) || currencies[0];
    const defaultCurrency = currencies.find(c => c.isDefault) || currencies.find(c => c.abbr === "sc") || currencies[0];
    const defRate = defaultCurrency.rate || 1;

    const currentCounts = {};
    for (const c of currencies) {
      currentCounts[c.key] = getActorCurrencyCount(actor, c);
    }
    currentCounts[chosenCurr.key] = (currentCounts[chosenCurr.key] || 0) + amount;

    const updates = getActorCurrencyUpdates(currentCounts, currencies);
    await actor.update(updates);

    const newTotalBase = calculateTotalBaseUnits(currentCounts, currencies);
    const totalInDefault = (newTotalBase / defRate).toLocaleString(undefined, { maximumFractionDigits: 2 });

    const content = `
      <div class="mythcraft-chat-card essence-receipt-card deposit">
        <div class="receipt-header">
          <div class="receipt-title-wrap">
            <i class="fas fa-hand-holding-dollar receipt-icon"></i>
            <h3 class="receipt-title">Funds Deposited</h3>
          </div>
          <span class="receipt-tag deposit-tag">DEPOSIT</span>
        </div>

        <div class="receipt-body">
          <div class="receipt-ledger">
            <div class="ledger-row gain-row">
              <span class="ledger-label"><i class="fas fa-coins" style="color: ${chosenCurr.color};"></i> Amount Deposited</span>
              <span class="ledger-val gain-amount">+${amount} ${chosenCurr.abbr} <small>(${chosenCurr.label})</small></span>
            </div>
            <div class="ledger-divider"></div>
            <div class="ledger-row balance-row">
              <span class="ledger-label"><i class="fas fa-vault" style="color: ${defaultCurrency.color};"></i> New Total Wealth</span>
              <span class="ledger-val balance-amount">${totalInDefault} ${defaultCurrency.abbr}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      flavor: `${actor.name} deposited funds`,
    });

    if (depositInput) depositInput.value = "";

    ui.notifications.info(`Added ${amount} ${chosenCurr.abbr} to vault.`);
    this.render();
  }

  /**
   * Consolidate loose change into highest possible denominations
   */
  static async #onConsolidateCoins(event, target) {
    const actor = this.actor;
    if (!actor) return;

    const currencies = getActiveCurrencies();
    const currentCounts = {};
    for (const c of currencies) {
      currentCounts[c.key] = getActorCurrencyCount(actor, c);
    }

    const totalBaseWealth = calculateTotalBaseUnits(currentCounts, currencies);

    if (totalBaseWealth <= 0) {
      ui.notifications.warn("Wallet is empty.");
      return;
    }

    const consolidated = packBaseUnitsToCurrencies(totalBaseWealth, currencies);
    const updates = getActorCurrencyUpdates(consolidated, currencies);

    await actor.update(updates);
    ui.notifications.info("Consolidated wallet into highest coin denominations!");
    this.render();
  }

  /**
   * Quick spend preset (e.g. 1 sc, 5 sc, 15 sc)
   */
  static async #onQuickSpend(event, target) {
    const amount = Number(target.dataset.amount) || 1;
    const currKey = target.dataset.curr || "scillings";
    const desc = target.dataset.desc || "Quick Purchase";

    const form = this.element;
    if (form) {
      const costInput = form.querySelector('[name="purchase_cost"]');
      const currencySelect = form.querySelector('[name="purchase_currency"]');
      const descInput = form.querySelector('[name="purchase_desc"]');
      if (costInput) costInput.value = amount;
      if (currencySelect) currencySelect.value = currKey;
      if (descInput) descInput.value = desc;
    }
  }

  /**
   * Submit manual edits to currency counts
   */
  static async #onSubmitForm(event, form, formData) {
    const actor = this.actor;
    if (!actor) return;

    const rawData = formData.object;
    const currencies = getActiveCurrencies();
    const currentCounts = {};

    for (const c of currencies) {
      const val = Number(rawData[`curr_${c.key}`]);
      if (!isNaN(val)) {
        currentCounts[c.key] = Math.max(0, val);
      } else {
        currentCounts[c.key] = getActorCurrencyCount(actor, c);
      }
    }

    const updates = getActorCurrencyUpdates(currentCounts, currencies);
    if (Object.keys(updates).length) {
      await actor.update(updates);
      ui.notifications.info(`Updated wallet balances for ${actor.name}`);
    }
  }
}
