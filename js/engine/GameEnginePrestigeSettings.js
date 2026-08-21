"use strict";

Object.assign(GameEngine.prototype, {
  getPrestigeBreakdown() {
      if (!this.isPrestigeUnlocked()) {
        return { level: 0, ownership: 0, upgrades: 0, mastery: 0, base: 0, total: 0 };
      }

      const unlockLevel = Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(GameEngine.PRESTIGE_UNLOCK_LEVEL) || 1)));
      const currentLevel = Math.max(unlockLevel, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(this.state.farmLevel) || 1)));
      const levelRange = Math.max(1, GameEngine.MAX_FARM_LEVEL - unlockLevel);
      const levelProgress = Math.max(0, currentLevel - unlockLevel) / levelRange;

      const crops = Array.isArray(this.data.crops) ? this.data.crops : [];
      const totalCrops = Math.max(1, crops.length);
      let owned = 0;
      let normalizedUpgradeProgress = 0;
      let mastered = 0;
      crops.forEach(crop => {
        const cropState = this.state.crops?.[crop.id] || {};
        const isOwned = Boolean(cropState.owned);
        if (isOwned) owned += 1;
        const level = isOwned ? Math.max(0, Math.min(GameEngine.MAX_CROP_LEVEL, Number(cropState.level) || 0)) : 0;
        normalizedUpgradeProgress += level / Math.max(1, GameEngine.MAX_CROP_LEVEL);
        if (level >= GameEngine.MAX_CROP_LEVEL) mastered += 1;
      });

      // Prestígio é deliberadamente raro. O nível de desbloqueio é apenas a
      // linha de partida: chegar exatamente nele não concede ponto algum.
      // O teto base é pequeno mesmo no nível 1000 e com todas as plantas
      // platinadas, evitando saltos de milhares/milhões no início do jogo.
      const levelScore = levelProgress * 24;
      const ownershipScore = (owned / totalCrops) * 3;
      const upgradeScore = (normalizedUpgradeProgress / totalCrops) * 12;
      const masteryScore = (mastered / totalCrops) * 24;
      const base = Math.max(0, Math.floor(levelScore + ownershipScore + upgradeScore + masteryScore + 1e-9));
      const resonance = 1 + Math.max(0, this.getEvolutionBonus("prestigeGainPercent")) / 100;
      const missionMultiplier = this.state.permanentBonuses.prestigeDouble ? 2 : 1;
      const configuredBonus = Math.max(0, Math.floor(Number(GameEngine.PRESTIGE_BONUS) || 0));
      const calculated = Math.max(0, Math.floor(base * resonance * missionMultiplier));
      const total = Math.max(0, calculated + configuredBonus);

      return {
        level: Math.max(0, Math.floor(levelScore)),
        ownership: Math.max(0, Math.floor(ownershipScore)),
        upgrades: Math.max(0, Math.floor(upgradeScore)),
        mastery: Math.max(0, Math.floor(masteryScore)),
        base,
        calculated,
        configuredBonus,
        total,
        owned,
        mastered,
        totalCrops,
        unlockLevel,
        currentLevel
      };
    },

  getPrestigeEstimate() {
      return this.getPrestigeBreakdown().total;
    },

  performPrestige() {
      if (!this.isPrestigeUnlocked()) return { ok: false, message: `O prestígio fica disponível no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL} da fazenda.` };
      const gain = this.getPrestigeEstimate();
      if (gain < 1) return { ok: false, message: "Fortaleça mais a fazenda antes de prestigiar." };
      const permanent = {
        prestigePoints: this.state.prestigePoints + gain,
        passiveResearchProgress: this.state.passiveResearchProgress,
        prestigeUpgrades: { ...this.state.prestigeUpgrades },
        permanentBonuses: { ...this.state.permanentBonuses },
        missionsClaimed: { ...this.state.missionsClaimed },
        unlockedPlayerTitles: { ...this.state.unlockedPlayerTitles },
        prestiges: this.state.stats.prestiges + 1,
        lifetimeCoins: this.state.stats.lifetimeCoins,
        lifetimeResearchEarned: this.state.stats.lifetimeResearchEarned,
        lifetimeFarmXPEarned: this.state.stats.lifetimeFarmXPEarned,
        lifetimeHarvested: this.state.stats.lifetimeHarvested,
        lifetimeSold: this.state.stats.lifetimeSold,
        lifetimeSoldByCategory: { ...this.state.stats.lifetimeSoldByCategory },
        lifetimeOrdersCompleted: this.state.stats.lifetimeOrdersCompleted,
        lifetimeOrderUnitsDelivered: this.state.stats.lifetimeOrderUnitsDelivered,
        lifetimeCropPurchases: this.state.stats.lifetimeCropPurchases,
        lifetimeCropUpgrades: this.state.stats.lifetimeCropUpgrades,
        lifetimeCropPrestiges: this.state.stats.lifetimeCropPrestiges,
        completedOrderSeries: this.state.stats.completedOrderSeries,
        lifetimeContractsCompleted: this.state.stats.lifetimeContractsCompleted,
        lifetimeContractsFailed: this.state.stats.lifetimeContractsFailed,
        lifetimeContractsBroken: this.state.stats.lifetimeContractsBroken,
        lifetimeContractUnitsDelivered: this.state.stats.lifetimeContractUnitsDelivered,
        totalPrestigeEarned: this.state.stats.totalPrestigeEarned + gain,
        maxFarmLevel: this.state.stats.maxFarmLevel,
        maxCropLevel: this.state.stats.maxCropLevel,
        maxCropsOwned: this.state.stats.maxCropsOwned,
        maxCoinsHeld: this.state.stats.maxCoinsHeld,
        maxStorageUsed: this.state.stats.maxStorageUsed,
        cropsDiscovered: { ...this.state.cropsDiscovered },
        accountCreatedAt: this.state.createdAt,
        settings: { ...this.state.settings }
      };
      this.state = this.createState(permanent);
      this.state.contractOffers = [];
      this.state.contractCooldowns = [];
      this.state.activeContracts = [];
      this.save();
      return { ok: true, gain };
    },

  setSetting(key, value) {
      if (!(key in this.state.settings)) return;
      this.state.settings[key] = value;
    },

  getMetrics() {
      const cropStates = Object.values(this.state.crops);
      return {
        owned: cropStates.filter(item => item.owned).length,
        stock: cropStates.reduce((sum, item) => sum + item.stock, 0),
        sold: this.state.stats.totalSold,
        harvested: this.state.stats.totalHarvested,
        contracts: this.state.stats.contractsCompleted,
        activeContracts: this.state.activeContracts.length,
        activeContractSlots: this.getActiveContractSlotLimit(),
        contractOffers: this.state.contractOffers.length,
        orders: this.state.stats.ordersCompleted,
        maxCropLevel: Math.max(0, ...cropStates.map(item => item.level || 0)),
        storageCapacity: this.getStorageCap(),
        storageRemaining: this.getStorageRemaining()
      };
    },

  formatNumber(value, digits = 1) {
      const number = Number(value) || 0;
      const abs = Math.abs(number);
      const precision = Math.max(0, Math.min(3, Math.floor(Number(digits) || 0)));
      const international = this.state.settings.numberFormat === "international";
      const decimalSeparator = international ? "." : ",";
      const locale = international ? "en-US" : "pt-BR";
  
      if (abs < 1000) return Math.floor(number).toLocaleString(locale);
  
      let group = Math.max(1, Math.floor(Math.log10(abs) / 3));
      let scaled = number / Math.pow(1000, group);
      const roundingFactor = Math.pow(10, precision);
      let rounded = Math.round(scaled * roundingFactor) / roundingFactor;
  
      // Evita resultados como 1000K quando o arredondamento já alcançou a
      // próxima ordem de grandeza.
      if (Math.abs(rounded) >= 1000) {
        group += 1;
        scaled = number / Math.pow(1000, group);
        rounded = Math.round(scaled * roundingFactor) / roundingFactor;
      }
  
      const fixed = Math.abs(rounded)
        .toFixed(precision)
        .replace(/\.0+$/, "")
        .replace(/(\.\d*?)0+$/, "$1");
      const formatted = `${rounded < 0 ? "-" : ""}${fixed.replace(".", decimalSeparator)}`;
  
      const standardSuffixes = ["", "K", "M", "B", "T"];
      if (group < standardSuffixes.length) return `${formatted}${standardSuffixes[group]}`;
  
      // Após T: Aa, Ab, ... Az, Ba, Bb... para manter a função preparada para
      // economias maiores sem voltar a nomes longos ou inserir espaços.
      const extendedIndex = group - standardSuffixes.length;
      const trailing = String.fromCharCode(97 + (extendedIndex % 26));
      let leadingIndex = Math.floor(extendedIndex / 26);
      let leading = "";
      do {
        leading = String.fromCharCode(65 + (leadingIndex % 26)) + leading;
        leadingIndex = Math.floor(leadingIndex / 26) - 1;
      } while (leadingIndex >= 0);
  
      return `${formatted}${leading}${trailing}`;
    },

  formatMoney(value) {
      return `${this.formatNumber(Math.floor(value))} moedas`;
    },

  formatTime(seconds) {
      const total = Math.max(0, Math.ceil(Number(seconds) || 0));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
      return `${minutes}:${String(secs).padStart(2, "0")}`;
    }
});
