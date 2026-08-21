"use strict";

Object.assign(GameEngine.prototype, {
  getEvolutionBonus(type, state = this.state) {
      const requested = String(type || "");
      if (!requested) return 0;
      const readCatalog = (items, levels) => (items || []).reduce((sum, item) => {
        const level = Math.max(0, Math.min(Number(item.max) || 0, Math.floor(Number(levels?.[item.id]) || 0)));
        if (level <= 0) return sum;
        let total = 0;
        const bonuses = Array.isArray(item.bonuses) && item.bonuses.length
          ? item.bonuses
          : [
              { type: item.bonusType, amount: item.bonusAmount, stageValues: item.stageRates },
              { type: item.bonus2Type, amount: item.bonus2Amount },
              { type: item.bonus3Type, amount: item.bonus3Amount }
            ];
        bonuses.forEach(bonus => {
          if (bonus?.type !== requested) return;
          if (Array.isArray(bonus.stageValues) && bonus.stageValues.length) {
            total += bonus.stageValues.slice(0, level).reduce((value, rate) => value + Math.max(0, Number(rate) || 0), 0);
          } else {
            total += level * Math.max(0, Number(bonus?.amount) || 0);
          }
        });
        return sum + total;
      }, 0);
      return readCatalog(this.data.research, state?.researchTechs) + readCatalog(this.data.prestigeUpgrades, state?.prestigeUpgrades);
    },

  getActiveEventBonus(type, at = Date.now()) {
      const now = Number(at) || Date.now();
      const events = window.FazendaSerenaRuntimeConfig?.events || [];
      return events.reduce((sum, event) => {
        if (event.type !== type) return sum;
        const start = Number(event.startAt) || 0;
        const end = start + Math.max(1, Number(event.durationMinutes) || 0) * 60000;
        return now >= start && now < end ? sum + Math.max(0, Number(event.bonusPercent) || 0) : sum;
      }, 0);
    },

  getEventMultiplier(type, at = Date.now()) {
      return 1 + this.getActiveEventBonus(type, at) / 100;
    },

  addResearch(value) {
      const base = Math.max(0, Number(value) || 0);
      const amount = Math.max(0, Math.floor(base * this.getEventMultiplier("research")));
      this.state.research += amount;
      return amount;
    },
  isEvolutionUnlocked() {
      return this.state.farmLevel >= GameEngine.EVOLUTION_UNLOCK_LEVEL;
    },

  isContractsUnlocked() {
      return true;
    },

  isOrdersUnlocked() {
      return this.state.farmLevel >= GameEngine.ORDER_UNLOCK_LEVEL;
    },

  isOfficeCommerceUnlocked() {
      return this.isContractsUnlocked();
    },

  isPrestigeUnlocked() {
      return this.state.farmLevel >= GameEngine.PRESTIGE_UNLOCK_LEVEL;
    },


  getMaxOfflineSeconds(state = this.state) {
      const extraMinutes = Math.max(0, this.getEvolutionBonus("offlineProductionMinutes", state));
      const extraSeconds = Math.floor(extraMinutes * 60);
      // Teto técnico de 30 dias evita configurações acidentais que travariam a
      // simulação, sem limitar a progressão normal do administrador.
      return Math.min(30 * 24 * 60 * 60, GameEngine.BASE_MAX_OFFLINE_SECONDS + extraSeconds);
    },

  getStartingCoins(state = this.state) {
      return GameEngine.BASE_STARTING_COINS + Math.max(0, Math.floor(this.getEvolutionBonus("startingCoins", state)));
    },

  getPassiveResearchRate() {
      return Math.max(0, GameEngine.BASE_PASSIVE_RESEARCH_RATE + this.getEvolutionBonus("passiveResearchPercentPerSecond") / 100);
    },

  advancePassiveResearch(seconds) {
      const elapsed = Math.max(0, Number(seconds) || 0);
      const rate = this.getPassiveResearchRate();
      if (elapsed <= 0 || rate <= 0) return 0;
      const totalProgress = Math.max(0, Number(this.state.passiveResearchProgress) || 0) + rate * elapsed;
      const generatedPoints = Math.max(0, Math.floor(totalProgress + 1e-10));
      this.state.passiveResearchProgress = totalProgress - generatedPoints;
      if (generatedPoints > 0) this.addResearch(generatedPoints);
      return generatedPoints;
    },

  getPassiveFarmXPRate() {
      const permanentMissionRate = Math.max(0, Number(this.state.permanentBonuses?.passiveXPPercentPerSecond) || 0) / 100;
      return GameEngine.BASE_PASSIVE_XP_RATE
        + Math.max(0, this.getEvolutionBonus("passiveXPPercentPerSecond") / 100)
        + permanentMissionRate;
    },

  addPassiveFarmXP(seconds, silent = false) {
      if (this.state.farmLevel >= GameEngine.MAX_FARM_LEVEL) return 0;
      const elapsed = Math.max(0, Number(seconds) || 0);
      const rate = this.getPassiveFarmXPRate();
      if (elapsed <= 0 || rate <= 0) return 0;
      return this.addFarmXP(rate * elapsed, silent);
    },

  addFarmXP(amount, silent = false) {
      const multiplier = (1 + this.getEvolutionBonus("farmXPGainPercent") / 100) * this.getEventMultiplier("xp");
      const gainedXP = Math.max(0, Number(amount) || 0) * multiplier;
      this.state.farmXP += gainedXP;
  
      if (this.state.farmLevel >= GameEngine.MAX_FARM_LEVEL) {
        this.state.farmLevel = GameEngine.MAX_FARM_LEVEL;
        this.state.stats.maxFarmLevel = GameEngine.MAX_FARM_LEVEL;
        return gainedXP;
      }
  
      let leveled = false;
      let levelsGained = 0;
      let rewardCoins = 0;
      const milestones = [];
      while (this.state.farmLevel < GameEngine.MAX_FARM_LEVEL && this.state.farmXP >= this.getFarmXPNeed()) {
        this.state.farmXP -= this.getFarmXPNeed();
        this.state.farmLevel += 1;
        levelsGained += 1;
        this.state.stats.maxFarmLevel = Math.max(this.state.stats.maxFarmLevel, this.state.farmLevel);
        const reward = Math.floor(120 * Math.pow(this.state.farmLevel, 1.35));
        this.addCoins(reward);
        rewardCoins += reward;
        leveled = true;
        const unlocks = this.getMilestoneUnlocks(this.state.farmLevel);
        if (unlocks.length) milestones.push({ level: this.state.farmLevel, unlocks });
      }
      if (leveled && !silent) this.emit("level", { level: this.state.farmLevel, levelsGained, rewardCoins, milestones });
      return gainedXP;
    },

  getFarmXPAwardForRate(rate, level = this.state.farmLevel) {
      const percentage = Math.max(0, Number(rate) || 0);
      const multiplier = (1 + this.getEvolutionBonus("farmXPGainPercent") / 100) * this.getEventMultiplier("xp");
      return Math.max(0, this.getFarmXPNeed(level) * percentage * multiplier);
    },

  addFarmXPPercent(rate, occurrences = 1, silent = false) {
      const percentage = Math.max(0, Number(rate) || 0);
      const count = Math.max(0, Math.floor(Number(occurrences) || 0));
      for (let index = 0; index < count; index += 1) {
        this.addFarmXP(this.getFarmXPNeed() * percentage, silent);
      }
    },

  getFarmXPNeed(level = this.state.farmLevel) {
      const normalizedLevel = Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(level) || 1)));
      const baseCurve = 160 + 72 * Math.pow(normalizedLevel, 1.52);
      const journeyProgress = (normalizedLevel - 1) / Math.max(1, GameEngine.MAX_FARM_LEVEL - 1);
  
      // A aceleração exponencial é suave nos níveis iniciais e cresce ao longo da
      // jornada. No nível 1.000, o requisito chega à faixa Az. Como as fontes de
      // XP concedem percentuais do requisito atual, o ritmo de ações por nível é
      // preservado enquanto a escala numérica acompanha a progressão completa.
      const extendedScale = Math.pow(10, 84 * Math.pow(journeyProgress, 2));
      return Math.round(baseCurve * extendedScale);
    },

  getMilestoneUnlocks(level) {
      const milestoneLevel = Math.max(1, Math.floor(Number(level) || 1));
      const unlocks = this.data.crops
        .filter(crop => Number(crop.unlockLevel) === milestoneLevel)
        .sort((cropA, cropB) => cropA.index - cropB.index)
        .map(crop => ({ text: `Nova cultura disponível para compra: ${crop.name}.`, icon: crop.image, type: "crop" }));
      if (milestoneLevel === GameEngine.ORDER_UNLOCK_LEVEL) {
        unlocks.push({ text: "Pedidos liberados no Escritório.", icon: "assets/icons/pacote.webp", type: "feature" });
      }
      if (milestoneLevel === GameEngine.EVOLUTION_UNLOCK_LEVEL) {
        unlocks.push({ text: "Centro de pesquisa liberado em Evoluções, no Escritório.", icon: "assets/icons/livros.webp", type: "feature" });
      }
      (this.data.contractSlots || []).filter(slot => Number(slot.unlockLevel) === milestoneLevel && milestoneLevel > 1).forEach(slot => {
        unlocks.push({ text: `${slot.name || "Novo slot"} de contrato liberado.`, icon: "assets/icons/contrato-comercial.webp", type: "feature" });
      });
      if (milestoneLevel === GameEngine.PRESTIGE_UNLOCK_LEVEL) unlocks.push({ text: "A ação de prestigiar foi liberada.", icon: "assets/icons/prestigio.webp", type: "prestige" });
      return unlocks;
    },

  getCrop(cropId) {
      return this.cropById.get(cropId);
    },

  getAutomaticCropPurchaseCost(cropOrIndex) {
      const crop = typeof cropOrIndex === "object" ? cropOrIndex : null;
      const index = crop ? Number(crop.index) || this.data.crops.indexOf(crop) : Number(cropOrIndex) || 0;
      const categoryIndex = crop ? Math.max(0, Number(crop.categoryIndex) || 0) : 0;
      return window.FazendaSerenaCropEconomy?.purchaseCost(index, categoryIndex) ?? Math.max(100, Number(crop?.cost) || 100);
    },

  getAutomaticCropUpgradeBase(cropOrIndex) {
      const crop = typeof cropOrIndex === "object" ? cropOrIndex : null;
      const index = crop ? Number(crop.index) || this.data.crops.indexOf(crop) : Number(cropOrIndex) || 0;
      const categoryIndex = crop ? Math.max(0, Number(crop.categoryIndex) || 0) : 0;
      return window.FazendaSerenaCropEconomy?.upgradeBase(index, categoryIndex) ?? Math.max(140, this.getAutomaticCropPurchaseCost(cropOrIndex) * 0.12);
    },

  getBuyCost(cropId) {
      const crop = this.getCrop(cropId);
      if (!crop) return Infinity;
      const totalDiscount = Math.min(0.80, this.getEvolutionBonus("cropPurchaseDiscountPercent") / 100);
      return Math.max(0, Math.floor(this.getAutomaticCropPurchaseCost(crop) * (1 - totalDiscount)));
    },

  getCropUpgradeCost(cropId, levelOverride = null) {
      const crop = this.getCrop(cropId);
      const level = Math.max(1, Number(levelOverride ?? this.state.crops[cropId]?.level) || 1);
      if (!crop || level >= GameEngine.MAX_CROP_LEVEL) return Infinity;
  
      // A economia de compra e aprimoramento é determinada pela ordem da
      // cultura no catálogo. Assim o ADM controla conteúdo sem precisar
      // recalibrar manualmente preços de progressão a cada nova planta.
      const base = this.getAutomaticCropUpgradeBase(crop);
      const exponential = Math.pow(1.04, level - 1);
      const masteryCurve = Math.pow(1 + (level - 1) * 0.025, 1.65);
      const milestone = 1 + Math.floor((level - 1) / 50) * 0.28;
      const discount = Math.min(0.70, this.getEvolutionBonus("cropUpgradeDiscountPercent") / 100);
      return Math.max(1, Math.ceil(base * exponential * masteryCurve * milestone * (1 - discount)));
    },

  getCropAffordableUpgrades(cropId, budget = this.state.coins) {
      const cropState = this.state.crops[cropId];
      if (!cropState?.owned) {
        return { levels: 0, totalCost: 0, nextCost: 0 };
      }
  
      let levels = 0;
      let totalCost = 0;
      let simulatedLevel = cropState.level;
      const available = Math.max(0, Number(budget) || 0);
  
      while (levels < GameEngine.MAX_BATCH_UPGRADES && simulatedLevel < GameEngine.MAX_CROP_LEVEL) {
        const cost = this.getCropUpgradeCost(cropId, simulatedLevel);
        if (!Number.isFinite(cost) || totalCost + cost > available) break;
        totalCost += cost;
        levels += 1;
        simulatedLevel += 1;
      }
  
      return {
        levels,
        totalCost,
        nextCost: this.getCropUpgradeCost(cropId, cropState.level)
      };
    },

  isCropUnlocked(cropId) {
      const crop = this.getCrop(cropId);
      return Boolean(crop && this.state.farmLevel >= crop.unlockLevel);
    },

  buyCrop(cropId) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      if (!crop || !cropState || cropState.owned) return { ok: false, message: "Esta cultura já está na fazenda." };
      if (!this.isCropUnlocked(cropId)) return { ok: false, message: `Esta cultura libera no nível ${crop.unlockLevel} da fazenda.` };
      const cost = this.getBuyCost(cropId);
      if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
      this.state.coins -= cost;
      Object.assign(cropState, { owned: true, level: 1, progress: 0 });
      this.state.cropsDiscovered[cropId] = true;
      this.state.stats.lifetimeCropPurchases += 1;
      this.addFarmXPPercent(GameEngine.ACTION_XP_RATE);
      this.state.stats.maxCropsOwned = Math.max(this.state.stats.maxCropsOwned, this.getOwnedCrops().length);
      this.state.stats.maxCropLevel = Math.max(this.state.stats.maxCropLevel, 1);
      this.ensureContractOffers();
      return { ok: true };
    },

  upgradeCrop(cropId, requestedLevels = 1) {
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      if (!cropState?.owned) return { ok: false, message: "Compre a cultura primeiro." };
  
      if (cropState.level >= GameEngine.MAX_CROP_LEVEL) return { ok: false, message: "Esta plantação já alcançou o nível máximo 300." };
      const target = Math.min(GameEngine.MAX_BATCH_UPGRADES, GameEngine.MAX_CROP_LEVEL - cropState.level, Math.max(1, Math.floor(Number(requestedLevels) || 1)));
      let purchased = 0;
      let totalCost = 0;
  
      while (purchased < target) {
        const cost = this.getCropUpgradeCost(cropId, cropState.level + purchased);
        if (!Number.isFinite(cost) || totalCost + cost > this.state.coins) break;
        totalCost += cost;
        purchased += 1;
      }
  
      if (purchased < 1) {
        const nextCost = this.getCropUpgradeCost(cropId);
        return { ok: false, message: `Faltam ${this.formatMoney(nextCost - this.state.coins)}.` };
      }
  
      const previousLevel = cropState.level;
      this.state.coins -= totalCost;
      cropState.level += purchased;
      this.state.stats.lifetimeCropUpgrades += purchased;
      this.addFarmXPPercent(GameEngine.ACTION_XP_RATE, purchased);
      const reachedCropPrestige = previousLevel < GameEngine.MAX_CROP_LEVEL
        && cropState.level >= GameEngine.MAX_CROP_LEVEL;
      if (reachedCropPrestige) {
        this.addFarmXPPercent(0.10);
        this.state.stats.lifetimeCropPrestiges = Math.max(0, Number(this.state.stats.lifetimeCropPrestiges) || 0) + 1;
      }
      this.state.stats.maxCropLevel = Math.max(this.state.stats.maxCropLevel, cropState.level);
      return { ok: true, purchased, totalCost, level: cropState.level, crop, reachedCropPrestige, masteryXpRate: reachedCropPrestige ? 0.10 : 0 };
    },

  upgradeCropMax(cropId) {
      const affordable = this.getCropAffordableUpgrades(cropId);
      if (affordable.levels < 1) {
        return { ok: false, message: "Ainda não há moedas suficientes para outro aprimoramento." };
      }
      return this.upgradeCrop(cropId, affordable.levels);
    },

  getUpgradeCost(item, source) {
      const level = Math.max(0, Math.floor(Number(source[item.id] || 0)));
      if (Array.isArray(item.stageCosts) && Number.isFinite(Number(item.stageCosts[level]))) {
        return Math.max(0, Math.ceil(Number(item.stageCosts[level]) || 0));
      }
      return Math.max(0, Math.ceil(item.baseCost * Math.pow(item.growth, level)));
    },

  buyResearch(id) {
      if (!this.isEvolutionUnlocked()) return { ok: false, message: `As pesquisas liberam no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL} da fazenda.` };
      const item = this.data.research.find(entry => entry.id === id);
      if (!item) return { ok: false };
      const level = Number(this.state.researchTechs[id] || 0);
      if (level >= item.max) return { ok: false, message: "Tecnologia já está no nível máximo." };
      const cost = this.getUpgradeCost(item, this.state.researchTechs);
      if (this.state.research < cost) return { ok: false, message: `São necessários ${cost} pontos de pesquisa.` };
      this.state.research -= cost;
      this.state.researchTechs[id] = level + 1;
      this.addFarmXPPercent(GameEngine.ACTION_XP_RATE);
      return { ok: true };
    },

  buyPrestigeUpgrade(id) {
      if (!this.isEvolutionUnlocked()) return { ok: false, message: `Os legados de prestígio liberam no nível ${GameEngine.EVOLUTION_UNLOCK_LEVEL} da fazenda.` };
      const item = this.data.prestigeUpgrades.find(entry => entry.id === id);
      if (!item) return { ok: false };
      const level = Number(this.state.prestigeUpgrades[id] || 0);
      if (level >= item.max) return { ok: false, message: "Legado já está no nível máximo." };
      const cost = this.getUpgradeCost(item, this.state.prestigeUpgrades);
      if (this.state.prestigePoints < cost) return { ok: false, message: `São necessários ${cost} pontos de prestígio.` };
      this.state.prestigePoints -= cost;
      this.state.prestigeUpgrades[id] = level + 1;
      this.addFarmXPPercent(GameEngine.ACTION_XP_RATE);
      return { ok: true };
    }
});
