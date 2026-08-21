"use strict";

Object.assign(GameEngine.prototype, {
  getOrder(cropId) {
      if (!this.isOrdersUnlocked()) return null;
      const crop = this.getCrop(cropId);
      const cropState = this.state.crops[cropId];
      const orderState = this.state.orders[cropId];
      if (!crop || !cropState?.owned || !orderState) return null;
      const step = this.data.orderSteps[orderState.tier];
      if (!step) return { crop, complete: true, tier: orderState.tier, totalTiers: this.data.orderSteps.length };
      // Recompensas dos pedidos são calculadas a partir do valor base da etapa:
      // quantidade necessária × valor unitário atual da planta.
      const baseOrderValue = Math.max(0, Number(step.amount) || 0) * Math.max(0, this.getSalePrice(cropId));
      const missionRewardMultiplier = 1 + Math.max(0, Number(this.state.permanentBonuses?.orderRewardPercent) || 0) / 100;
      const evolutionRewardMultiplier = 1 + Math.max(0, this.getEvolutionBonus("orderRewardPercent")) / 100;
      const rewardMultiplier = missionRewardMultiplier * evolutionRewardMultiplier * this.getEventMultiplier("orderRewards");
      const rewardCoins = Math.max(0, Math.floor(baseOrderValue * (1 + Math.max(0, Number(step.coinBonusPercent) || 0) / 100) * rewardMultiplier));
      const rewardResearch = Math.max(0, Math.floor((Number(step.rewardResearch) || 0) * rewardMultiplier));
      const rewardPrestige = Math.max(0, Math.floor((Number(step.rewardPrestige) || 0) * rewardMultiplier));
      const available = Math.max(0, Math.floor(Number(cropState.stock) || 0));
      return {
        crop,
        complete: false,
        readyToClaim: false,
        readyToDeliver: available >= step.amount,
        tier: orderState.tier,
        totalTiers: this.data.orderSteps.length,
        amount: step.amount,
        delivered: 0,
        available,
        remaining: Math.max(0, step.amount - available),
        rewardCoins,
        rewardResearch,
        rewardPrestige,
        xpRate: Math.max(0, Number(step.xpPercent) || 0) / 100
      };
    },

  completeOrderStage(cropId, order, silent = false) {
      this.state.orders[cropId].tier += 1;
      this.state.orders[cropId].delivered = 0;
      this.state.orders[cropId].autoDeliver = false;
      if (this.state.orders[cropId].tier >= this.data.orderSteps.length) this.state.stats.completedOrderSeries += 1;
      this.state.stats.ordersCompleted += 1;
      this.state.stats.lifetimeOrdersCompleted += 1;
      this.addCoins(order.rewardCoins);
      this.addResearch(order.rewardResearch);
      this.addPrestigePoints(order.rewardPrestige);
      const xp = this.getFarmXPAwardForRate(order.xpRate);
      this.addFarmXPPercent(order.xpRate, 1, silent);
      return { coins: order.rewardCoins, research: order.rewardResearch, prestige: order.rewardPrestige, xp, xpRate: order.xpRate };
    },

  deliverOrder(cropId) {
      const order = this.getOrder(cropId);
      if (!order) return { ok: false, message: "Compre esta cultura para liberar seus pedidos." };
      if (order.complete) return { ok: false, message: "Todos os pedidos desta cultura já foram concluídos." };
      const cropState = this.state.crops[cropId];
      if (cropState.stock < order.amount) return { ok: false, message: `É necessário ter ${this.formatNumber(order.amount)} unidades de ${order.crop.name.toLowerCase()} no estoque.` };
  
      cropState.stock -= order.amount;
      this.state.stats.orderUnitsDelivered += order.amount;
      this.state.stats.lifetimeOrderUnitsDelivered += order.amount;
      const rewards = this.completeOrderStage(cropId, order, false);
      const nextOrder = this.getOrder(cropId);
      return { ok: true, delivered: order.amount, order, rewards, seriesComplete: Boolean(nextOrder?.complete), nextOrder };
    },

  getReadyOrderCount() {
      return this.getOwnedCrops().filter(crop => {
        const order = this.getOrder(crop.id);
        return order && !order.complete && order.readyToDeliver;
      }).length;
    },

  missionValue(metric, mission = null) {
      const map = {
        harvested: this.state.stats.lifetimeHarvested,
        owned: this.state.stats.lifetimeCropPurchases,
        cropPurchases: this.state.stats.lifetimeCropPurchases,
        sold: this.state.stats.lifetimeSold,
        cropLevels: this.state.stats.lifetimeCropUpgrades,
        cropUpgrades: this.state.stats.lifetimeCropUpgrades,
        orders: this.state.stats.lifetimeOrdersCompleted,
        contracts: this.state.stats.lifetimeContractsCompleted,
        maxCropLevel: this.state.stats.maxCropLevel,
        farmLevel: this.state.stats.maxFarmLevel,
        stock: this.state.stats.maxStorageUsed,
        coinsEarned: this.state.stats.lifetimeCoins,
        prestiges: this.state.stats.prestiges,
        categorySold: mission?.category ? Number(this.state.stats.lifetimeSoldByCategory[mission.category] || 0) : 0
      };
      return Number(map[metric] || 0);
    },

  getActiveMissions() {
      const seen = new Set();
      const active = [];
      for (const mission of this.data.missions) {
        const series = mission.series || mission.id;
        if (seen.has(series)) continue;
        const next = this.data.missions.find(item => (item.series || item.id) === series && !this.state.missionsClaimed[item.id]);
        if (next) active.push(next);
        seen.add(series);
      }
      return active;
    },

  getReadyMissionCount() {
      return this.getActiveMissions().filter(mission => this.missionValue(mission.metric, mission) >= mission.target).length;
    },

  claimMission(id) {
      const mission = this.data.missions.find(item => item.id === id);
      if (!mission || this.state.missionsClaimed[id]) return { ok: false, message: "Missão indisponível." };
      if (this.missionValue(mission.metric, mission) < mission.target) return { ok: false, message: "Objetivo ainda não foi concluído." };
      const reward = mission.reward || {};
      if (reward.coins) this.addCoins(reward.coins);
      if (reward.research) this.addResearch(reward.research);
      if (reward.prestige) this.addPrestigePoints(reward.prestige);
      this.state.missionsClaimed[id] = true;
      return { ok: true, mission };
    }
});
