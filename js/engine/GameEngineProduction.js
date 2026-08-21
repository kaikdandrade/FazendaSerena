"use strict";

Object.assign(GameEngine.prototype, {
  produce(seconds, offline) {
      const activeContractCropIds = new Set(this.state.activeContracts
        .filter(contract => contract.delivered < contract.amount && !contract.completedAt && !contract.defaultedAt && contract.timeRemaining > 0)
        .map(contract => contract.cropId));
      const wholesaleOverflowEnabled = this.hasWholesaleOverflowSale();
      let storageRemaining = this.getStorageRemaining();
  
      for (const crop of this.data.crops) {
        const cropState = this.state.crops[crop.id];
        if (!cropState.owned || cropState.level <= 0) continue;
  
        const directRoute = cropState.autoSell || activeContractCropIds.has(crop.id) || wholesaleOverflowEnabled;
        if (!directRoute && storageRemaining <= 0) {
          cropState.progress = Math.min(cropState.progress, 0.995);
          continue;
        }
  
        const growthTime = this.getGrowthTime(crop.id);
        cropState.progress += growthTime <= 0
          ? seconds * this.getInstantCyclesPerSecond(crop.id)
          : seconds / growthTime;
  
        const cycles = Math.floor(cropState.progress);
        if (cycles < 1) continue;
  
        const producedThisTick = this.rollProductionYield(crop.id, cycles);
        cropState.progress -= cycles;
        cropState.productionBuffer = Math.max(0, Number(cropState.productionBuffer) || 0) + producedThisTick;
        const requested = Math.floor(cropState.productionBuffer);
        if (requested < 1) continue;
        const routed = this.routeProducedCrop(crop.id, requested, offline, storageRemaining);
        storageRemaining = Math.max(0, storageRemaining - routed.stored);
        cropState.productionBuffer = Math.max(0, cropState.productionBuffer - routed.accepted);
        if (routed.accepted < 1) continue;
  
        cropState.totalHarvested += routed.accepted;
        this.state.stats.totalHarvested += routed.accepted;
        this.state.stats.lifetimeHarvested += routed.accepted;
      }
  
      this.state.stats.maxStorageUsed = Math.max(
        this.state.stats.maxStorageUsed,
        this.getStorageCap() - storageRemaining
      );
    },

  routeProducedCrop(cropId, amount, silent = false, storageRemainingOverride = null) {
      const cropState = this.state.crops[cropId];
      let remaining = Math.max(0, Math.floor(Number(amount) || 0));
      let delivered = 0;
      let autoSold = 0;
      let wholesaleSold = 0;
      let stored = 0;
      let gain = 0;
  
      const contracts = this.state.activeContracts
        .filter(contract => contract.cropId === cropId && contract.delivered < contract.amount && !contract.completedAt && !contract.defaultedAt && contract.timeRemaining > 0)
        .sort((a, b) => (Number(b.priority) - Number(a.priority)) || (a.timeRemaining - b.timeRemaining) || (a.acceptedAt - b.acceptedAt));
  
      for (const contract of contracts) {
        if (remaining < 1) break;
        const needed = Math.max(0, contract.amount - contract.delivered);
        const sent = Math.min(remaining, needed);
        if (sent < 1) continue;
        contract.delivered += sent;
        remaining -= sent;
        delivered += sent;
        this.state.stats.contractUnitsDelivered += sent;
        this.state.stats.lifetimeContractUnitsDelivered += sent;
        if (contract.delivered >= contract.amount) this.markContractComplete(contract.id, silent, true);
      }
  
      const orderDelivered = 0;
  
      if (remaining > 0 && cropState.autoSell) {
        autoSold = remaining;
        const autoSaleGain = Math.floor(autoSold * this.getAutoSalePrice(cropId));
        gain += autoSaleGain;
        this.recordSale(cropId, autoSold, autoSaleGain, silent);
        remaining = 0;
      }
  
      if (remaining > 0) {
        const availableStorage = Number.isFinite(storageRemainingOverride)
          ? Math.max(0, Number(storageRemainingOverride) || 0)
          : this.getStorageRemaining();
        stored = Math.min(remaining, availableStorage);
        cropState.stock += stored;
        remaining -= stored;
      }
  
      if (remaining > 0 && this.hasWholesaleOverflowSale()) {
        wholesaleSold = remaining;
        const wholesaleGain = Math.floor(wholesaleSold * this.getWholesaleSalePrice(cropId));
        gain += wholesaleGain;
        this.recordSale(cropId, wholesaleSold, wholesaleGain, silent);
        remaining = 0;
      }
  
      return {
        accepted: Math.max(0, amount - remaining),
        delivered,
        orderDelivered,
        autoSold,
        wholesaleSold,
        stored,
        gain,
        blocked: remaining
      };
    },

  hasActiveContractForCrop(cropId) {
      return this.state.activeContracts.some(contract => contract.cropId === cropId && contract.delivered < contract.amount && !contract.completedAt && !contract.defaultedAt && contract.timeRemaining > 0);
    },

  getOwnedCrops() {
      return this.data.crops.filter(crop => this.state.crops[crop.id]?.owned);
    },

  getGlobalGrowthSpeed() {
      return 1 + Math.max(0, this.getEvolutionBonus("growthSpeedPercent")) / 100;
    },

  getInstantGrowthLevel() {
      const currentBonus = Math.max(0, this.getEvolutionBonus("growthSpeedPercent"));
      const maximumBonus = Math.max(100, currentBonus);
      const progress = Math.max(0, Math.min(1, currentBonus / maximumBonus));
      const reduction = Math.round((GameEngine.INSTANT_GROWTH_LEVEL - GameEngine.MIN_INSTANT_GROWTH_LEVEL) * progress);
      return Math.max(GameEngine.MIN_INSTANT_GROWTH_LEVEL, GameEngine.INSTANT_GROWTH_LEVEL - reduction);
    },

  getGrowthTime(cropId) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      if (!crop || !cropState) return Infinity;
      const level = Math.max(1, Math.min(GameEngine.MAX_CROP_LEVEL, Number(cropState.level) || 1));
      const instantLevel = this.getInstantGrowthLevel();
      if (level >= instantLevel) return 0;
  
      const levelProgress = Math.max(0, Math.min(1, (level - 1) / (instantLevel - 1)));
      const remainingFactor = 1 - Math.sqrt(levelProgress);
      const levelAdjustedTime = crop.baseGrowth * remainingFactor;
      return Math.max(0.01, levelAdjustedTime / this.getGlobalGrowthSpeed());
    },

  getInstantCyclesPerSecond(cropId) {
      const crop = this.getCrop(cropId);
      if (!crop) return 0;
      const instantLevel = this.getInstantGrowthLevel();
      const previousProgress = Math.max(0, (instantLevel - 2) / (instantLevel - 1));
      const previousFactor = Math.max(0.0001, 1 - Math.sqrt(previousProgress));
      const previousTime = Math.max(0.01, (crop.baseGrowth * previousFactor) / this.getGlobalGrowthSpeed());
      return Math.max(1, 1 / previousTime);
    },

  getYieldRange(cropId) {
      const crop = this.getCrop(cropId);
      if (!crop) return { min: 0, max: 0 };
      const cropLevel = Math.max(1, Number(this.state.crops?.[cropId]?.level) || 1);
      const levelMultiplier = window.FazendaSerenaCropEconomy?.levelYieldMultiplier?.(cropLevel) ?? 1;
      const configuredMin = Math.max(1, Number(GameEngine.BASE_PRODUCTION_MIN) || 1);
      const configuredMax = Math.max(configuredMin, Number(GameEngine.BASE_PRODUCTION_CAP) || 10);
      const rawYield = Math.max(0, crop.baseYield * levelMultiplier * this.getEventMultiplier("harvest"));
      const currentBaseMax = Math.max(configuredMin, Math.min(configuredMax, rawYield));
      // O mínimo é o piso global configurado. Pesquisa/Legados aumentam apenas
      // o teto da faixa, permitindo produzir acima do máximo base sem tornar
      // todas as colheitas automaticamente maiores.
      const yieldBonus = Math.max(0, this.getEvolutionBonus("yieldPercent")) / 100;
      const boostedMax = Math.max(configuredMin, currentBaseMax * (1 + yieldBonus));
      return { min: configuredMin, max: boostedMax };
    },

  getExpectedYield(cropId) {
      const range = this.getYieldRange(cropId);
      if (range.max <= 0) return 0;
      return (range.min + range.max) / 2;
    },

  getYield(cropId) {
      // Mantém compatibilidade com cálculos de contratos/UI: aqui retornamos
      // a média esperada. A aleatoriedade real acontece somente ao produzir.
      return this.getExpectedYield(cropId);
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

  getProductionRate(cropId) {
      const growthTime = this.getGrowthTime(cropId);
      const cyclesPerSecond = growthTime <= 0 ? this.getInstantCyclesPerSecond(cropId) : 1 / growthTime;
      return Math.max(0, this.getExpectedYield(cropId) * cyclesPerSecond);
    }
});
