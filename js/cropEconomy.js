"use strict";

(() => {
  const safeIndex = value => Math.max(0, Math.floor(Number(value) || 0));
  const purchaseCost = value => Math.max(100, Math.round(100 * Math.pow(1.46, safeIndex(value))));
  const upgradeBase = value => {
    const index = safeIndex(value);
    const purchaseReference = purchaseCost(index);
    const saleReference = Math.max(5, Math.round(5 * Math.pow(1.23, index)));
    return Math.max(140, saleReference * 10 + Math.sqrt(purchaseReference) * 3);
  };

  Object.defineProperty(window, "FazendaSerenaCropEconomy", {
    value: Object.freeze({ purchaseCost, upgradeBase }),
    configurable: false,
    enumerable: true,
    writable: false
  });
})();
