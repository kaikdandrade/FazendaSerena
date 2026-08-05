"use strict";

class GameEngine {
  static STORAGE_KEY = "agricultura-industrial-save-v3";
  static SAVE_VERSION = 3;
  static MAX_OFFLINE_SECONDS = 60 * 60 * 8;
  static SEASON_DURATION = 180;

  constructor(onEvent = () => {}) {
    this.data = window.GameData;
    this.onEvent = onEvent;
    this.state = this.load();
  }

  createState(permanent = {}) {
    const prestigeUpgrades = { ...(permanent.prestigeUpgrades || {}) };
    const prestigePoints = Number(permanent.prestigePoints || 0);
    const prestiges = Number(permanent.prestiges || 0);
    const settings = {
      ambient: permanent.settings?.ambient ?? true,
      reducedMotion: permanent.settings?.reducedMotion ?? false,
      compactCards: permanent.settings?.compactCards ?? false,
      uiScale: permanent.settings?.uiScale ?? 100
    };

    const seedCapital = Number(prestigeUpgrades.seedCapital || 0);
    const academyLegacy = Number(prestigeUpgrades.academyLegacy || 0);
    const rootMemory = Number(prestigeUpgrades.rootMemory || 0);
    const starterCount = Math.min(this.data.crops.length, 1 + rootMemory);
    const crops = {};

    this.data.crops.forEach((crop, index) => {
      const owned = index < starterCount;
      crops[crop.id] = {
        owned,
        tier: owned ? 1 : 0,
        progress: 0,
        stock: 0,
        masteryLevel: owned ? 1 : 0,
        masteryXP: 0,
        totalHarvested: 0,
        totalSold: 0
      };
    });

    return {
      version: GameEngine.SAVE_VERSION,
      coins: 120 + seedCapital * 250,
      research: academyLegacy,
      prestigePoints,
      reputation: 0,
      farmLevel: 1,
      farmXP: 0,
      seasonIndex: 0,
      seasonElapsed: 0,
      crops,
      upgrades: Object.fromEntries(this.data.upgrades.map(item => [item.id, 0])),
      researchTechs: Object.fromEntries(this.data.research.map(item => [item.id, 0])),
      prestigeUpgrades,
      contracts: [],
      contractSerial: 1,
      missionsClaimed: {},
      stats: {
        totalHarvested: 0,
        totalSold: 0,
        contractsCompleted: 0,
        runCoinsEarned: 0,
        lifetimeCoins: Number(permanent.lifetimeCoins || 0),
        prestiges
      },
      settings,
      lastUpdate: Date.now(),
      createdAt: Date.now()
    };
  }

  load() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(GameEngine.STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (error) {
      console.warn("Não foi possível ler o save:", error);
    }

    const state = this.normalizeState(loaded || this.createState());
    this.state = state;
    if (!state.contracts.length) state.contracts = this.createContracts(3);

    const now = Date.now();
    const elapsed = Math.max(0, Math.min(GameEngine.MAX_OFFLINE_SECONDS, (now - Number(state.lastUpdate || now)) / 1000));
    if (elapsed >= 10) {
      const before = state.stats.totalHarvested;
      this.simulate(elapsed, true);
      const harvested = Math.max(0, state.stats.totalHarvested - before);
      if (harvested > 0) {
        this.emit("offline", { seconds: elapsed, harvested });
      }
    }
    state.lastUpdate = now;
    return state;
  }

  normalizeState(input) {
    const permanent = {
      prestigePoints: input?.prestigePoints,
      prestigeUpgrades: input?.prestigeUpgrades,
      prestiges: input?.stats?.prestiges,
      lifetimeCoins: input?.stats?.lifetimeCoins,
      settings: input?.settings
    };
    const base = this.createState(permanent);
    if (!input || typeof input !== "object") return base;

    const merged = {
      ...base,
      ...input,
      settings: { ...base.settings, ...(input.settings || {}) },
      upgrades: { ...base.upgrades, ...(input.upgrades || {}) },
      researchTechs: { ...base.researchTechs, ...(input.researchTechs || {}) },
      prestigeUpgrades: { ...base.prestigeUpgrades, ...(input.prestigeUpgrades || {}) },
      missionsClaimed: { ...base.missionsClaimed, ...(input.missionsClaimed || {}) },
      stats: { ...base.stats, ...(input.stats || {}) },
      crops: {}
    };

    this.data.crops.forEach(crop => {
      merged.crops[crop.id] = { ...base.crops[crop.id], ...(input.crops?.[crop.id] || {}) };
    });

    merged.contracts = Array.isArray(input.contracts) ? input.contracts.filter(Boolean) : [];
    merged.version = GameEngine.SAVE_VERSION;
    merged.coins = Math.max(0, Number(merged.coins) || 0);
    merged.research = Math.max(0, Number(merged.research) || 0);
    merged.prestigePoints = Math.max(0, Number(merged.prestigePoints) || 0);
    merged.farmLevel = Math.max(1, Math.floor(Number(merged.farmLevel) || 1));
    merged.farmXP = Math.max(0, Number(merged.farmXP) || 0);
    merged.seasonIndex = Math.abs(Math.floor(Number(merged.seasonIndex) || 0)) % this.data.seasons.length;
    merged.seasonElapsed = Math.max(0, Number(merged.seasonElapsed) || 0) % GameEngine.SEASON_DURATION;
    return merged;
  }

  save() {
    this.state.lastUpdate = Date.now();
    try {
      localStorage.setItem(GameEngine.STORAGE_KEY, JSON.stringify(this.state));
      return true;
    } catch (error) {
      console.warn("Não foi possível salvar:", error);
      return false;
    }
  }

  exportSave() {
    this.state.lastUpdate = Date.now();
    return JSON.stringify(this.state, null, 2);
  }

  importSave(text) {
    const parsed = JSON.parse(String(text || "").trim());
    this.state = this.normalizeState(parsed);
    if (!this.state.contracts.length) this.state.contracts = this.createContracts(3);
    this.save();
    return this.state;
  }

  hardReset() {
    localStorage.removeItem(GameEngine.STORAGE_KEY);
    this.state = this.createState();
    this.state.contracts = this.createContracts(3);
    this.save();
  }

  emit(type, payload = {}) {
    try { this.onEvent({ type, ...payload }); } catch (error) { console.warn(error); }
  }

  tick(seconds) {
    const safe = Math.min(5, Math.max(0, Number(seconds) || 0));
    if (safe <= 0) return;
    this.simulate(safe, false);
  }

  simulate(seconds, offline = false) {
    let remaining = Math.max(0, Math.min(GameEngine.MAX_OFFLINE_SECONDS, Number(seconds) || 0));
    while (remaining > 0.0001) {
      const untilSeason = GameEngine.SEASON_DURATION - this.state.seasonElapsed;
      const step = Math.min(remaining, untilSeason, offline ? 60 : remaining);
      this.produce(step, offline);
      this.updateContracts(step);
      this.state.seasonElapsed += step;
      remaining -= step;

      if (this.state.seasonElapsed >= GameEngine.SEASON_DURATION - 0.0001) {
        this.state.seasonElapsed = 0;
        this.state.seasonIndex = (this.state.seasonIndex + 1) % this.data.seasons.length;
        if (!offline) this.emit("season", { season: this.currentSeason() });
      }
    }
  }

  produce(seconds, offline) {
    for (const crop of this.data.crops) {
      const cropState = this.state.crops[crop.id];
      if (!cropState.owned || cropState.tier <= 0) continue;
      const cap = this.getStorageCap(crop.id);
      if (cropState.stock >= cap) {
        cropState.progress = Math.min(cropState.progress, 0.995);
        continue;
      }

      cropState.progress += seconds / this.getGrowthTime(crop.id);
      const cycles = Math.floor(cropState.progress);
      if (cycles < 1) continue;

      const perCycle = this.getYield(crop.id);
      const amount = Math.max(1, Math.floor(cycles * perCycle));
      const accepted = Math.max(0, Math.min(cap - cropState.stock, amount));
      if (accepted <= 0) continue;

      cropState.stock += accepted;
      cropState.progress -= cycles;
      cropState.totalHarvested += accepted;
      this.state.stats.totalHarvested += accepted;
      this.addFarmXP(Math.max(0.4, accepted * 0.22), offline);
      this.addMasteryXP(crop.id, cycles + accepted * 0.045, offline);

      if (!offline && accepted >= Math.max(20, perCycle * 4) && Math.random() < 0.025) {
        this.emit("toast", { message: `${crop.name} trouxe uma colheita especialmente bonita: +${this.formatNumber(accepted)}.` });
      }
    }
  }

  addFarmXP(amount, silent = false) {
    this.state.farmXP += Math.max(0, amount);
    let leveled = false;
    while (this.state.farmXP >= this.getFarmXPNeed()) {
      this.state.farmXP -= this.getFarmXPNeed();
      this.state.farmLevel += 1;
      const reward = 35 + this.state.farmLevel * 12;
      this.addCoins(reward);
      leveled = true;
    }
    if (leveled && !silent) this.emit("level", { level: this.state.farmLevel });
  }

  addMasteryXP(cropId, amount, silent = false) {
    const cropState = this.state.crops[cropId];
    if (!cropState?.owned) return;
    cropState.masteryXP += Math.max(0, amount);
    let leveled = false;
    while (cropState.masteryXP >= this.getMasteryXPNeed(cropId)) {
      cropState.masteryXP -= this.getMasteryXPNeed(cropId);
      cropState.masteryLevel += 1;
      leveled = true;
    }
    if (leveled && !silent) {
      const crop = this.getCrop(cropId);
      this.emit("mastery", { crop, level: cropState.masteryLevel });
    }
  }

  getFarmXPNeed(level = this.state.farmLevel) {
    return Math.round(38 + 30 * Math.pow(Math.max(1, level), 1.32));
  }

  getMasteryXPNeed(cropId) {
    const level = this.state.crops[cropId]?.masteryLevel || 1;
    return Math.round(8 + level * 5.5 + Math.pow(level, 1.32));
  }

  currentSeason() {
    return this.data.seasons[this.state.seasonIndex % this.data.seasons.length];
  }

  getCrop(cropId) {
    return this.data.crops.find(item => item.id === cropId);
  }

  getSeasonEffect(cropId) {
    const crop = this.getCrop(cropId);
    const season = this.currentSeason();
    const greenhouse = Number(this.state.upgrades.greenhouse || 0);
    let speed = 1;
    let yieldBonus = 1;
    let label = "Ritmo estável";

    if (crop.best.includes(season.id)) {
      speed += 0.24 + greenhouse * 0.012;
      yieldBonus += 0.15 + greenhouse * 0.008;
      label = "Safra favorita";
    } else if (season.id === "winter") {
      const penalty = Math.max(0.025, 0.12 - greenhouse * 0.007);
      speed -= penalty;
      label = "Descanso de inverno";
    } else if (season.id === "spring" && crop.category === "leaf") {
      speed += 0.12;
      yieldBonus += 0.07;
      label = "Brisa de primavera";
    } else if (season.id === "autumn" && ["grain", "tree"].includes(crop.category)) {
      yieldBonus += 0.1;
      label = "Colheita de outono";
    }
    return { speed, yield: yieldBonus, label };
  }

  getGrowthTime(cropId) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    const season = this.getSeasonEffect(cropId);
    const irrigation = Number(this.state.upgrades.irrigation || 0);
    const hydro = Number(this.state.researchTechs.hydroponics || 0);
    const legacy = Number(this.state.prestigeUpgrades.greenLegacy || 0);
    const tier = Math.max(0, cropState.tier - 1);
    const mastery = Math.max(0, cropState.masteryLevel - 1);
    const speed = season.speed * (1 + irrigation * 0.08 + hydro * 0.06 + legacy * 0.04 + tier * 0.055 + mastery * 0.012);
    return Math.max(1.1, crop.baseGrowth / speed);
  }

  getYield(cropId) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    const season = this.getSeasonEffect(cropId);
    const fertilizer = Number(this.state.upgrades.fertilizer || 0);
    const genetics = Number(this.state.researchTechs.genetics || 0);
    const legacy = Number(this.state.prestigeUpgrades.greenLegacy || 0);
    const tier = Math.max(0, cropState.tier - 1);
    const mastery = Math.max(0, cropState.masteryLevel - 1);
    return crop.baseYield * season.yield * (1 + fertilizer * 0.1 + genetics * 0.07 + legacy * 0.03 + tier * 0.14 + mastery * 0.035);
  }

  getStorageCap(cropId) {
    const cropState = this.state.crops[cropId];
    return Math.round(90 + Number(this.state.upgrades.warehouse || 0) * 70 + Number(this.state.researchTechs.storageScience || 0) * 45 + Number(this.state.prestigeUpgrades.storageLegacy || 0) * 50 + Math.max(0, cropState.tier - 1) * 12);
  }

  getSalePrice(cropId) {
    const crop = this.getCrop(cropId);
    const season = this.currentSeason();
    const logistics = Number(this.state.upgrades.logistics || 0);
    const market = Number(this.state.researchTechs.marketData || 0);
    const merchant = Number(this.state.prestigeUpgrades.merchantCrown || 0);
    const repBonus = 1 + Math.min(0.35, this.state.reputation * 0.012);
    const seasonal = season.id === "autumn" && ["grain", "tree"].includes(crop.category) ? 1.12 : season.id === "winter" ? 1.04 : 1;
    return Math.max(1, crop.basePrice * seasonal * repBonus * (1 + logistics * 0.07 + market * 0.04 + merchant * 0.05));
  }

  getBuyCost(cropId) {
    const crop = this.getCrop(cropId);
    return crop ? crop.cost : Infinity;
  }

  getCropUpgradeCost(cropId) {
    const crop = this.getCrop(cropId);
    const level = this.state.crops[cropId]?.tier || 1;
    return Math.ceil(Math.max(45, crop.cost * 0.48 + crop.basePrice * 28) * Math.pow(1.48, Math.max(0, level - 1)));
  }

  isCropUnlocked(cropId) {
    const crop = this.getCrop(cropId);
    return Boolean(crop && this.state.farmLevel >= crop.unlockLevel && this.state.reputation >= crop.unlockReputation);
  }

  buyCrop(cropId) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!crop || !cropState || cropState.owned) return { ok: false, message: "Esta cultura já está na fazenda." };
    if (!this.isCropUnlocked(cropId)) return { ok: false, message: `Libera no nível ${crop.unlockLevel} e com ${crop.unlockReputation} de reputação.` };
    const cost = this.getBuyCost(cropId);
    if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
    this.state.coins -= cost;
    Object.assign(cropState, { owned: true, tier: 1, masteryLevel: 1, masteryXP: 0, progress: 0 });
    this.emit("toast", { message: `${crop.name} agora faz parte da fazenda.` });
    return { ok: true };
  }

  upgradeCrop(cropId) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!cropState?.owned) return { ok: false, message: "Compre a cultura primeiro." };
    const cost = this.getCropUpgradeCost(cropId);
    if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
    this.state.coins -= cost;
    cropState.tier += 1;
    this.emit("toast", { message: `${crop.name}: equipamentos no nível ${cropState.tier}.` });
    return { ok: true };
  }

  nurtureCrop(cropId) {
    const cropState = this.state.crops[cropId];
    if (!cropState?.owned) return { ok: false };
    cropState.progress = Math.min(0.98, cropState.progress + 0.12);
    this.addMasteryXP(cropId, 0.35, true);
    return { ok: true };
  }

  sellCrop(cropId, amount = Infinity) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!crop || !cropState?.owned || cropState.stock <= 0) return { ok: false, message: "Não há produtos para vender." };
    const sold = Math.max(0, Math.min(cropState.stock, Math.floor(Number(amount) || 0)));
    if (sold <= 0) return { ok: false, message: "Escolha uma quantidade válida." };
    const gain = Math.floor(sold * this.getSalePrice(cropId));
    cropState.stock -= sold;
    cropState.totalSold += sold;
    this.state.stats.totalSold += sold;
    this.addCoins(gain);
    this.addFarmXP(Math.max(1, sold * 0.08));
    return { ok: true, sold, gain };
  }

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
  }

  addCoins(value) {
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    this.state.coins += amount;
    this.state.stats.runCoinsEarned += amount;
    this.state.stats.lifetimeCoins += amount;
  }

  getUpgradeCost(item, source) {
    const level = Number(source[item.id] || 0);
    return Math.ceil(item.baseCost * Math.pow(item.growth, level));
  }

  buyUpgrade(id) {
    const item = this.data.upgrades.find(entry => entry.id === id);
    if (!item) return { ok: false };
    const level = Number(this.state.upgrades[id] || 0);
    if (level >= item.max) return { ok: false, message: "Melhoria já está no nível máximo." };
    const cost = this.getUpgradeCost(item, this.state.upgrades);
    if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
    this.state.coins -= cost;
    this.state.upgrades[id] = level + 1;
    return { ok: true };
  }

  buyResearch(id) {
    const item = this.data.research.find(entry => entry.id === id);
    if (!item) return { ok: false };
    const level = Number(this.state.researchTechs[id] || 0);
    if (level >= item.max) return { ok: false, message: "Tecnologia já está no nível máximo." };
    const cost = this.getUpgradeCost(item, this.state.researchTechs);
    if (this.state.research < cost) return { ok: false, message: `São necessários ${cost} pontos de pesquisa.` };
    this.state.research -= cost;
    this.state.researchTechs[id] = level + 1;
    return { ok: true };
  }

  buyPrestigeUpgrade(id) {
    const item = this.data.prestigeUpgrades.find(entry => entry.id === id);
    if (!item) return { ok: false };
    const level = Number(this.state.prestigeUpgrades[id] || 0);
    if (level >= item.max) return { ok: false, message: "Legado já está no nível máximo." };
    const cost = this.getUpgradeCost(item, this.state.prestigeUpgrades);
    if (this.state.prestigePoints < cost) return { ok: false, message: `São necessários ${cost} pontos de prestígio.` };
    this.state.prestigePoints -= cost;
    this.state.prestigeUpgrades[id] = level + 1;
    return { ok: true };
  }

  createContracts(count = 3) {
    const owned = this.data.crops.filter(crop => this.state.crops[crop.id]?.owned);
    if (!owned.length) return [];
    const result = [];
    for (let i = 0; i < count; i += 1) {
      const crop = owned[Math.floor(Math.random() * owned.length)];
      const cap = this.getStorageCap(crop.id);
      const amount = Math.max(8, Math.round(Math.min(cap * 0.32, 12 + this.state.farmLevel * 2.4 + Math.random() * 35)));
      const multiplier = Number((1.35 + Math.random() * 0.65 + Number(this.state.researchTechs.contractAI || 0) * 0.08).toFixed(2));
      const rewardCoins = Math.floor(amount * this.getSalePrice(crop.id) * multiplier);
      const researchBase = Math.random() < 0.48 ? 1 + Math.floor(this.state.farmLevel / 9) : 0;
      const researchBonus = 1 + Number(this.state.prestigeUpgrades.academyLegacy || 0) * 0.1;
      result.push({
        id: `contract-${Date.now()}-${this.state.contractSerial++}-${i}`,
        cropId: crop.id,
        amount,
        rewardCoins,
        rewardResearch: Math.floor(researchBase * researchBonus),
        timeLeft: 540 + Math.floor(Math.random() * 420)
      });
    }
    return result;
  }

  updateContracts(seconds) {
    let changed = false;
    for (const contract of this.state.contracts) contract.timeLeft -= seconds;
    const alive = this.state.contracts.filter(contract => contract.timeLeft > 0);
    if (alive.length !== this.state.contracts.length) changed = true;
    if (alive.length < 3) alive.push(...this.createContracts(3 - alive.length));
    this.state.contracts = alive.slice(0, 3);
    return changed;
  }

  completeContract(id) {
    const index = this.state.contracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.contracts[index];
    const cropState = this.state.crops[contract.cropId];
    if (cropState.stock < contract.amount) return { ok: false, message: `Ainda faltam ${contract.amount - cropState.stock} unidades.` };
    cropState.stock -= contract.amount;
    cropState.totalSold += contract.amount;
    this.state.stats.totalSold += contract.amount;
    this.state.stats.contractsCompleted += 1;
    this.state.reputation += 1;
    this.addCoins(contract.rewardCoins);
    this.state.research += contract.rewardResearch;
    this.addFarmXP(contract.amount * 0.22 + 10);
    this.state.contracts.splice(index, 1, ...this.createContracts(1));
    return { ok: true, contract };
  }

  rerollContracts() {
    const cost = Math.max(35, Math.floor(20 + this.state.farmLevel * 12));
    if (this.state.coins < cost) return { ok: false, message: `A renovação custa ${this.formatMoney(cost)}.` };
    this.state.coins -= cost;
    this.state.contracts = this.createContracts(3);
    return { ok: true, cost };
  }

  missionValue(metric) {
    const cropStates = Object.values(this.state.crops);
    const map = {
      harvested: this.state.stats.totalHarvested,
      owned: cropStates.filter(item => item.owned).length,
      sold: this.state.stats.totalSold,
      tiers: cropStates.reduce((sum, item) => sum + (item.tier || 0), 0),
      contracts: this.state.stats.contractsCompleted,
      mastery: Math.max(0, ...cropStates.map(item => item.masteryLevel || 0)),
      farmLevel: this.state.farmLevel,
      stock: cropStates.reduce((sum, item) => sum + (item.stock || 0), 0),
      coinsEarned: this.state.stats.runCoinsEarned
    };
    return Number(map[metric] || 0);
  }

  claimMission(id) {
    const mission = this.data.missions.find(item => item.id === id);
    if (!mission || this.state.missionsClaimed[id]) return { ok: false, message: "Missão indisponível." };
    if (this.missionValue(mission.metric) < mission.target) return { ok: false, message: "Objetivo ainda não foi concluído." };
    const reward = mission.reward || {};
    if (reward.coins) this.addCoins(reward.coins);
    if (reward.research) this.state.research += reward.research;
    if (reward.prestige) this.state.prestigePoints += reward.prestige;
    this.state.missionsClaimed[id] = true;
    return { ok: true, mission };
  }

  getPrestigeEstimate() {
    const owned = Object.values(this.state.crops).filter(item => item.owned).length;
    const score = Math.sqrt(Math.max(0, this.state.stats.runCoinsEarned) / 42000) + owned / 9 + this.state.farmLevel / 9 + this.state.stats.contractsCompleted / 7 - 3.2;
    const theory = 1 + Number(this.state.researchTechs.prestigeTheory || 0) * 0.08;
    return Math.max(0, Math.floor(score * theory));
  }

  performPrestige() {
    const gain = this.getPrestigeEstimate();
    if (gain < 1) return { ok: false, message: "Fortaleça mais a fazenda antes de prestigiar." };
    const permanent = {
      prestigePoints: this.state.prestigePoints + gain,
      prestigeUpgrades: { ...this.state.prestigeUpgrades },
      prestiges: this.state.stats.prestiges + 1,
      lifetimeCoins: this.state.stats.lifetimeCoins,
      settings: { ...this.state.settings }
    };
    this.state = this.createState(permanent);
    this.state.contracts = this.createContracts(3);
    this.save();
    return { ok: true, gain };
  }

  setSetting(key, value) {
    if (!(key in this.state.settings)) return;
    this.state.settings[key] = value;
  }

  getMetrics() {
    const cropStates = Object.values(this.state.crops);
    return {
      owned: cropStates.filter(item => item.owned).length,
      stock: cropStates.reduce((sum, item) => sum + item.stock, 0),
      sold: this.state.stats.totalSold,
      harvested: this.state.stats.totalHarvested,
      contracts: this.state.stats.contractsCompleted,
      maxMastery: Math.max(0, ...cropStates.map(item => item.masteryLevel || 0))
    };
  }

  formatNumber(value, digits = 1) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);
    const units = [
      [1e15, "q"], [1e12, "tri"], [1e9, "bi"], [1e6, "mi"], [1e3, "mil"]
    ];
    for (const [size, suffix] of units) {
      if (abs >= size) return `${(number / size).toFixed(digits).replace(/[,\.]0$/, "").replace(".", ",")} ${suffix}`;
    }
    return Math.floor(number).toLocaleString("pt-BR");
  }

  formatMoney(value) {
    return `${this.formatNumber(Math.floor(value))} moedas`;
  }

  formatTime(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }
}

window.GameEngine = GameEngine;
