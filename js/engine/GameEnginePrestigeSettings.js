"use strict";

Object.assign(GameEngine.prototype, {
  getPrestigeEstimate() {
      if (!this.isPrestigeUnlocked()) return 0;
      const owned = Object.values(this.state.crops).filter(item => item.owned).length;
      // O prestígio acompanha melhor uma jornada consistente sem
      // ultrapassar a importância das missões e dos legados permanentes.
      const score = Math.sqrt(Math.max(0, this.state.stats.runCoinsEarned) / 36000)
        + owned / 8
        + this.state.farmLevel / 8
        + this.state.stats.contractsCompleted / 6
        - 2.8;
      const resonance = 1 + Math.max(0, this.getEvolutionBonus("prestigeGainPercent")) / 100;
      const missionMultiplier = this.state.permanentBonuses.prestigeDouble ? 2 : 1;
      return Math.max(0, Math.floor(score * resonance * missionMultiplier));
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
        prestiges: this.state.stats.prestiges + 1,
        lifetimeCoins: this.state.stats.lifetimeCoins,
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
