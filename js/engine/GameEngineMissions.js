"use strict";

Object.assign(GameEngine.prototype, {
  missionValue(metric, mission = null) {
      const map = {
        harvested: this.state.stats.lifetimeHarvested,
        owned: this.state.stats.lifetimeCropPurchases,
        cropPurchases: this.state.stats.lifetimeCropPurchases,
        sold: this.state.stats.lifetimeSold,
        cropLevels: this.state.stats.lifetimeCropUpgrades,
        cropUpgrades: this.state.stats.lifetimeCropUpgrades,
        contracts: this.state.stats.lifetimeContractsCompleted,
        maxCropLevel: this.state.stats.maxCropLevel,
        farmLevel: this.state.stats.maxFarmLevel,
        coinsEarned: this.state.stats.lifetimeCoins,
        prestiges: this.state.stats.prestiges,
        onlineMinutes: this.getCurrentSessionSeconds() / 60,
        playHours: Math.max(0, Number(this.state.stats.totalPlaySeconds) || 0) / 3600,
        categorySold: mission?.category ? Number(this.state.stats.lifetimeSoldByCategory[mission.category] || 0) : 0,
        cropPurchased: (() => {
          const cropId = String(mission?.cropId || "");
          if (!cropId || !this.getCrop(cropId)) return 0;
          return this.state.cropsDiscovered?.[cropId] === true || this.state.crops?.[cropId]?.owned === true ? 1 : 0;
        })(),
        cropUnlocked: (() => {
          const crop = mission?.cropId ? this.getCrop(mission.cropId) : null;
          if (!crop) return 0;
          return Math.max(Number(this.state.farmLevel) || 1, Number(this.state.stats.maxFarmLevel) || 1) >= Number(crop.unlockLevel || 1) ? 1 : 0;
        })()
      };
      return Number(map[metric] || 0);
    },

  isMissionVisible(mission) {
      if (!mission?.hidden) return true;
      return window.FirebaseManager?.isCurrentUserAdminCached?.() === true;
    },

  getActiveMissions() {
      const visibleMissions = this.data.missions.filter(mission => this.isMissionVisible(mission));
      const seen = new Set();
      const active = [];
      for (const mission of visibleMissions) {
        const series = mission.series || mission.id;
        if (seen.has(series)) continue;
        const next = visibleMissions.find(item => (item.series || item.id) === series && !this.state.missionsClaimed[item.id]);
        if (next) active.push(next);
        seen.add(series);
      }
      return active;
    },

  getReadyMissionCount() {
      return this.getActiveMissions().filter(mission => this.missionValue(mission.metric, mission) >= mission.target).length;
    },

  unlockPlayerTitle(titleId) {
      const safeId = String(titleId || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
      const title = (this.data.playerTitles || []).find(item => item.id === safeId);
      if (!title) return null;
      this.state.unlockedPlayerTitles ||= { fazendeiro: true };
      const newlyUnlocked = this.state.unlockedPlayerTitles[title.id] !== true;
      this.state.unlockedPlayerTitles[title.id] = true;
      return { title, newlyUnlocked };
    },

  getUnlockedPlayerTitles() {
      const unlocked = this.state.unlockedPlayerTitles || {};
      return (this.data.playerTitles || []).filter(title => title.default === true || unlocked[title.id] === true);
    },

  claimMission(id) {
      const mission = this.data.missions.find(item => item.id === id);
      if (!mission || !this.isMissionVisible(mission) || this.state.missionsClaimed[id]) return { ok: false, message: "Missão indisponível." };
      if (this.missionValue(mission.metric, mission) < mission.target) return { ok: false, message: "Objetivo ainda não foi concluído." };
      const reward = mission.reward || {};
      if (reward.coins) this.addCoins(reward.coins);
      if (reward.research) this.addResearch(reward.research);
      if (reward.prestige) this.addPrestigePoints(reward.prestige);
      const titleUnlock = reward.titleId ? this.unlockPlayerTitle(reward.titleId) : null;
      this.state.missionsClaimed[id] = true;
      return { ok: true, mission, titleUnlock };
    }
});
