"use strict";

Object.assign(GameEngine.prototype, {
  getStorageCap() {
      const capacityBonus = Math.max(0, this.getEvolutionBonus("storageCapacityPercent")) / 100;
      const directCapacity = Math.max(0, Number(this.state.storageExpansions || 0)) * 100;
      const baseWithExpansions = Math.max(1, Number(GameEngine.BASE_STORAGE_CAPACITY) || 200) + directCapacity;
      // O percentual incide sobre TODO o estoque, inclusive expansões diretas
      // compradas antes ou depois da Pesquisa/Legado.
      return Math.max(GameEngine.BASE_STORAGE_CAPACITY, Math.round(baseWithExpansions * (1 + capacityBonus)));
    },

  getDirectStorageExpansionCost() {
      const level = Math.max(0, Number(this.state.storageExpansions || 0));
      return Math.ceil(1200 * Math.pow(1.85, level));
    },

  expandStorage() {
      const cost = this.getDirectStorageExpansionCost();
      if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
      const previousCapacity = this.getStorageCap();
      this.state.coins -= cost;
      this.state.storageExpansions = Math.max(0, Number(this.state.storageExpansions || 0)) + 1;
      this.addFarmXPPercent(GameEngine.ACTION_XP_RATE);
      const capacity = this.getStorageCap();
      return { ok: true, cost, added: Math.max(0, capacity - previousCapacity), baseAdded: 100, capacity };
    },

  getStorageUsedFromState(state = this.state) {
      return Object.values(state?.crops || {}).reduce((sum, cropState) => sum + Math.max(0, Number(cropState.stock) || 0), 0);
    },

  getStorageUsed() {
      return this.getStorageUsedFromState(this.state);
    },

  getStorageRemaining() {
      return Math.max(0, this.getStorageCap() - this.getStorageUsed());
    },

  getSalePriceForState(cropId, state) {
      const crop = this.getCrop(cropId);
      if (!crop || !state) return 0;
      const cropLevel = Math.max(1, Number(state.crops?.[cropId]?.level || 1));
      const cultivationValue = window.FazendaSerenaCropEconomy?.levelValueMultiplier?.(cropLevel) ?? 1;
      return Math.max(1, crop.basePrice * cultivationValue * (1 + Math.max(0, this.getEvolutionBonus("salePricePercent", state)) / 100));
    },

  getSalePrice(cropId) {
      return this.getSalePriceForState(cropId, this.state);
    },

  getAutoSalePrice(cropId) {
      return this.getSalePrice(cropId) * (1 + Math.max(0, this.getEvolutionBonus("autoSalePricePercent")) / 100);
    },

  hasWholesaleOverflowSale() {
      return this.getEvolutionBonus("wholesaleOverflowUnlock") >= 1;
    },

  getWholesaleSalePrice(cropId) {
      return this.getSalePrice(cropId) * GameEngine.WHOLESALE_SALE_MULTIPLIER;
    },

  recordSale(cropId, sold, gain, silent = false) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      const amount = Math.max(0, Math.floor(Number(sold) || 0));
      const coins = Math.max(0, Math.floor(Number(gain) || 0));
      if (!crop || !cropState || amount < 1) return;
      cropState.totalSold += amount;
      this.state.stats.totalSold += amount;
      this.state.stats.lifetimeSold += amount;
      this.state.stats.soldByCategory[crop.category] = (this.state.stats.soldByCategory[crop.category] || 0) + amount;
      this.state.stats.lifetimeSoldByCategory[crop.category] = (this.state.stats.lifetimeSoldByCategory[crop.category] || 0) + amount;
      this.addCoins(coins);
    },

  sellCrop(cropId, amount = Infinity) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      if (!crop || !cropState?.owned || cropState.stock <= 0) return { ok: false, message: "Não há produtos para vender." };
      const sold = Math.max(0, Math.min(cropState.stock, Math.floor(Number(amount) || 0)));
      if (sold <= 0) return { ok: false, message: "Escolha uma quantidade válida." };
      const gain = Math.floor(sold * this.getSalePrice(cropId));
      cropState.stock -= sold;
      this.recordSale(cropId, sold, gain);
      return { ok: true, sold, gain };
    },

  sellAll() {
      let totalSold = 0;
      let totalGain = 0;
      for (const crop of this.data.crops) {
        const stock = this.state.crops[crop.id].stock;
        if (stock <= 0) continue;
        const result = this.sellCrop(crop.id, stock);
        if (result.ok) {
          totalSold += result.sold;
          totalGain += result.gain;
        }
      }
      return totalSold > 0 ? { ok: true, sold: totalSold, gain: totalGain } : { ok: false, message: "O estoque ainda está vazio." };
    },

  setAutoSell(cropId, enabled) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      if (!crop || !cropState?.owned) return { ok: false, message: "Compre a cultura antes de configurar a venda automática." };
      cropState.autoSell = Boolean(enabled);
      return { ok: true, crop, enabled: cropState.autoSell };
    },

  toggleAutoSell(cropId) {
      const cropState = this.state.crops[cropId];
      return this.setAutoSell(cropId, !cropState?.autoSell);
    },

  setAllAutoSell(enabled) {
      const owned = this.data.crops.filter(crop => this.state.crops[crop.id]?.owned);
      if (!owned.length) return { ok: false, message: "Compre uma cultura antes de configurar as vendas automáticas." };
      const nextState = Boolean(enabled);
      owned.forEach(crop => {
        this.state.crops[crop.id].autoSell = nextState;
      });
      return { ok: true, enabled: nextState, count: owned.length };
    },

  addCoins(value) {
      const base = Math.max(0, Number(value) || 0);
      const amount = Math.max(0, Math.floor(base * this.getEventMultiplier("coins")));
      this.state.coins += amount;
      this.state.stats.runCoinsEarned += amount;
      this.state.stats.lifetimeCoins += amount;
      this.state.stats.maxCoinsHeld = Math.max(this.state.stats.maxCoinsHeld, this.state.coins);
    }
});
