"use strict";

Object.assign(GameEngine.prototype, {
  produce(seconds, offline) {
      const silent = Boolean(offline);
      for (const crop of this.data.crops) {
        const cropState = this.state.crops[crop.id];
        if (!cropState?.owned || cropState.level <= 0) continue;

        const growthTime = this.getGrowthTime(crop.id);
        cropState.progress += growthTime <= 0
          ? seconds * this.getInstantCyclesPerSecond(crop.id)
          : seconds / growthTime;

        const cycles = Math.floor(cropState.progress);
        if (cycles < 1) continue;

        const producedThisTick = this.rollProductionYield(crop.id, cycles);
        cropState.progress -= cycles;
        cropState.productionBuffer = Math.max(0, Number(cropState.productionBuffer) || 0) + producedThisTick;
        const produced = Math.floor(cropState.productionBuffer);
        if (produced < 1) continue;
        cropState.productionBuffer = Math.max(0, cropState.productionBuffer - produced);

        cropState.totalHarvested += produced;
        this.state.stats.totalHarvested += produced;
        this.state.stats.lifetimeHarvested += produced;

        const gain = Math.floor(produced * this.getAutoSalePrice(crop.id));
        this.recordSale(crop.id, produced, gain, silent);
      }
    },

  routeProducedCrop(cropId, amount, silent = false) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      const sold = Math.max(0, Math.floor(Number(amount) || 0));
      if (!crop || !cropState || sold < 1) return { accepted: 0, autoSold: 0, gain: 0 };
      const gain = Math.floor(sold * this.getAutoSalePrice(cropId));
      this.recordSale(cropId, sold, gain, silent);
      return { accepted: sold, autoSold: sold, gain };
    },

  hasActiveContractForCrop() {
      return false;
    },

  getOwnedCrops() {
      return this.data.crops.filter(crop => this.state.crops[crop.id]?.owned);
    },

  getGlobalGrowthSpeed(includeEventBonuses = true) {
      return (1 + Math.max(0, this.getEvolutionBonus("growthSpeedPercent")) / 100) * (includeEventBonuses ? this.getEventMultiplier("growthSpeed") : 1);
    },

  getInstantGrowthLevel() {
      const currentBonus = Math.max(0, this.getEvolutionBonus("growthSpeedPercent"));
      const maximumBonus = Math.max(100, currentBonus);
      const progress = Math.max(0, Math.min(1, currentBonus / maximumBonus));
      const reduction = Math.round((GameEngine.INSTANT_GROWTH_LEVEL - GameEngine.MIN_INSTANT_GROWTH_LEVEL) * progress);
      return Math.max(GameEngine.MIN_INSTANT_GROWTH_LEVEL, GameEngine.INSTANT_GROWTH_LEVEL - reduction);
    },

  getGrowthTime(cropId, includeEventBonuses = true) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      if (!crop || !cropState) return Infinity;
      const level = Math.max(1, Math.min(GameEngine.MAX_CROP_LEVEL, Number(cropState.level) || 1));
      const instantLevel = this.getInstantGrowthLevel();
      if (level >= instantLevel) return 0;
  
      const levelProgress = Math.max(0, Math.min(1, (level - 1) / (instantLevel - 1)));
      const remainingFactor = 1 - Math.sqrt(levelProgress);
      const levelAdjustedTime = crop.baseGrowth * remainingFactor;
      return Math.max(0.01, levelAdjustedTime / this.getGlobalGrowthSpeed(includeEventBonuses));
    },

  getInstantCyclesPerSecond(cropId, includeEventBonuses = true) {
      const crop = this.getCrop(cropId);
      if (!crop) return 0;
      const instantLevel = this.getInstantGrowthLevel();
      const previousProgress = Math.max(0, (instantLevel - 2) / (instantLevel - 1));
      const previousFactor = Math.max(0.0001, 1 - Math.sqrt(previousProgress));
      const previousTime = Math.max(0.01, (crop.baseGrowth * previousFactor) / this.getGlobalGrowthSpeed(includeEventBonuses));
      return Math.max(1, 1 / previousTime);
    },

  getYieldRange(cropId, includeEventBonuses = true) {
      const crop = this.getCrop(cropId);
      if (!crop) return { min: 0, max: 0 };
      const cropLevel = Math.max(1, Number(this.state.crops?.[cropId]?.level) || 1);
      const levelMultiplier = window.FazendaSerenaCropEconomy?.levelYieldMultiplier?.(cropLevel) ?? 1;
      const configuredMin = Math.max(1, Number(GameEngine.BASE_PRODUCTION_MIN) || 1);
      const configuredMax = Math.max(configuredMin, Number(GameEngine.BASE_PRODUCTION_CAP) || 10);
      const rawYield = Math.max(0, crop.baseYield * levelMultiplier * (includeEventBonuses ? this.getEventMultiplier("harvest") : 1));
      const currentBaseMax = Math.max(configuredMin, Math.min(configuredMax, rawYield));
      // O mínimo é o piso global configurado. Pesquisa/Legados aumentam apenas
      // o teto da faixa, permitindo produzir acima do máximo base sem tornar
      // todas as colheitas automaticamente maiores.
      const yieldBonus = Math.max(0, this.getEvolutionBonus("yieldPercent")) / 100;
      const boostedMax = Math.max(configuredMin, currentBaseMax * (1 + yieldBonus));
      return { min: configuredMin, max: boostedMax };
    },

  getExpectedYield(cropId, includeEventBonuses = true) {
      const range = this.getYieldRange(cropId, includeEventBonuses);
      if (range.max <= 0) return 0;
      return (range.min + range.max) / 2;
    },

  getYield(cropId, includeEventBonuses = true) {
      // Mantém compatibilidade com cálculos de contratos/UI: aqui retornamos
      // a média esperada. A aleatoriedade real acontece somente ao produzir.
      return this.getExpectedYield(cropId, includeEventBonuses);
    },

  rollProductionYield(cropId, cycles = 1) {
      const count = Math.max(0, Math.floor(Number(cycles) || 0));
      if (!count) return 0;
      const { min, max } = this.getYieldRange(cropId);
      if (max <= min) return count * min;
      const span = max - min;

      // Em jogo aberto os ciclos são poucos e cada colheita é sorteada de
      // verdade. Em progresso offline/produção instantânea, milhares de ciclos
      // podem ocorrer de uma vez; uma aproximação normal mantém média/variância
      // da distribuição uniforme sem fazer dezenas de milhares de Math.random().
      if (count <= 128) {
        let total = 0;
        for (let index = 0; index < count; index += 1) total += min + Math.random() * span;
        return total;
      }

      const mean = count * (min + max) / 2;
      const deviation = Math.sqrt(count * span * span / 12);
      const u1 = Math.max(Number.EPSILON, Math.random());
      const u2 = Math.random();
      const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.max(count * min, Math.min(count * max, mean + normal * deviation));
    },

  getProductionRate(cropId, includeEventBonuses = true) {
      const growthTime = this.getGrowthTime(cropId, includeEventBonuses);
      const cyclesPerSecond = growthTime <= 0 ? this.getInstantCyclesPerSecond(cropId, includeEventBonuses) : 1 / growthTime;
      return Math.max(0, this.getExpectedYield(cropId, includeEventBonuses) * cyclesPerSecond);
    }
});
