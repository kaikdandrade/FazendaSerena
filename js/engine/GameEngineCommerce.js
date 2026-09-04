"use strict";

Object.assign(GameEngine.prototype, {
  getSalePriceForState(cropId, state) {
      const crop = this.getCrop(cropId);
      if (!crop || !state) return 0;
      const cropLevel = Math.max(1, Number(state.crops?.[cropId]?.level || 1));
      const cultivationValue = window.FazendaSerenaCropEconomy?.levelValueMultiplier?.(cropLevel) ?? 1;
      return Math.max(1, crop.basePrice * cultivationValue * (1 + Math.max(0, this.getEvolutionBonus("salePricePercent", state)) / 100));
    },

  getSalePrice(cropId) {
      return this.getSalePriceForState(cropId, this.state) * this.getEventMultiplier("salePrice");
    },

  getAutoSalePrice(cropId) {
      return this.getSalePrice(cropId) * (1 + Math.max(0, this.getEvolutionBonus("autoSalePricePercent")) / 100);
    },

  recordSale(cropId, sold, gain) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      const amount = Math.max(0, Math.floor(Number(sold) || 0));
      const coins = Math.max(0, Math.floor(Number(gain) || 0));
      if (!crop || !cropState || amount < 1) return 0;
      cropState.totalSold += amount;
      this.state.stats.totalSold += amount;
      this.state.stats.lifetimeSold += amount;
      this.state.stats.soldByCategory[crop.category] = (this.state.stats.soldByCategory[crop.category] || 0) + amount;
      this.state.stats.lifetimeSoldByCategory[crop.category] = (this.state.stats.lifetimeSoldByCategory[crop.category] || 0) + amount;
      return this.addCoins(coins);
    },

  addCoins(value, applyEventMultiplier = true) {
      const base = Math.max(0, Number(value) || 0);
      const amount = Math.max(0, Math.floor(base * (applyEventMultiplier ? this.getEventMultiplier("coins") : 1)));
      this.state.coins += amount;
      this.state.stats.runCoinsEarned += amount;
      this.state.stats.lifetimeCoins += amount;
      this.state.stats.maxCoinsHeld = Math.max(this.state.stats.maxCoinsHeld, this.state.coins);
      return amount;
    }
});
