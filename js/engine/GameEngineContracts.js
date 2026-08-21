"use strict";

Object.assign(GameEngine.prototype, {
  getActiveContractSlotLimit(state = this.state) {
    const configured = (this.data.contractSlots || []).filter(slot => Number(state?.farmLevel || 1) >= Number(slot.unlockLevel || 1)).length;
    const bonus = Math.max(0, Math.floor(this.getEvolutionBonus("activeContractSlots", state)));
    return Math.max(0, Math.min(GameEngine.MAX_ACTIVE_CONTRACTS, configured + bonus));
  },

  getContractSlotBreakdown(state = this.state) {
    const unlocked = (this.data.contractSlots || []).filter(slot => Number(state?.farmLevel || 1) >= Number(slot.unlockLevel || 1));
    const bonus = Math.max(0, Math.floor(this.getEvolutionBonus("activeContractSlots", state)));
    return { total: this.getActiveContractSlotLimit(state), base: unlocked.length, level: 0, research: 0, prestige: bonus, slots: unlocked };
  },

  advanceContractTimers(seconds, silent = false) {
    const elapsed = Math.max(0, Number(seconds) || 0);
    if (elapsed <= 0) return;
    this.state.activeContracts.forEach(contract => {
      if (contract.completedAt || contract.defaultedAt || contract.delivered >= contract.amount) return;
      contract.timeRemaining = Math.max(0, Number(contract.timeRemaining || 0) - elapsed);
    });
    this.state.contractOffers.forEach(contract => {
      contract.timeRemaining = Math.max(0, Number(contract.timeRemaining || 0) - elapsed);
    });
    this.state.contractCooldowns.forEach(cooldown => {
      cooldown.timeRemaining = Math.max(0, Number(cooldown.timeRemaining || 0) - elapsed);
    });
    this.expireContracts(silent);
    this.expireContractOffers();
  },

  expireContracts(silent = false) {
    const expired = this.state.activeContracts.filter(contract =>
      !contract.completedAt && !contract.defaultedAt && Number(contract.timeRemaining || 0) <= 0 && contract.delivered < contract.amount
    );
    if (!expired.length) return [];
    const defaultedAt = Date.now();
    expired.forEach(contract => {
      contract.timeRemaining = 0;
      contract.defaultedAt = defaultedAt;
      contract.penaltyCoins = Math.max(1, Math.ceil(Math.max(1, Number(contract.penaltyBaseCoins || contract.rewardCoins)) * 1.20));
      this.state.stats.contractsFailed += 1;
      this.state.stats.lifetimeContractsFailed += 1;
    });
    return expired;
  },

  expireContractOffers() {
    const expired = this.state.contractOffers.filter(contract => Number(contract.timeRemaining || 0) <= 0);
    if (!expired.length) return [];
    const expiredIds = new Set(expired.map(contract => contract.id));
    this.state.contractOffers = this.state.contractOffers.filter(contract => !expiredIds.has(contract.id));
    expired.forEach(() => this.startContractCooldown(GameEngine.CONTRACT_EXPIRED_COOLDOWN_SECONDS, "expired"));
    return expired;
  },

  normalizeContract(contract, active = false) {
    if (!contract || !this.getCrop(contract.cropId)) return null;
    const company = this.data.companies.find(item => item.id === contract.companyId) || this.data.companies[0];
    const type = this.getContractDifficulty(contract.difficulty || contract.typeId);
    if (!company || !type) return null;
    const amount = Math.max(1, Math.floor(Number(contract.amount) || 1));
    const delivered = active ? Math.max(0, Math.min(amount, Math.floor(Number(contract.delivered) || 0))) : 0;
    const durationSeconds = Math.max(5, Math.floor(Number(contract.durationSeconds) || type.durationSeconds || 60));
    const legacyDeadline = Number(contract.deadlineAt || 0);
    const legacyRemaining = legacyDeadline > 0 ? Math.max(0, (legacyDeadline - Date.now()) / 1000) : durationSeconds;
    const completedAt = active && (Number(contract.completedAt || 0) > 0 || delivered >= amount) ? Number(contract.completedAt || Date.now()) : 0;
    const defaultedAt = active && Number(contract.defaultedAt || 0) > 0 ? Number(contract.defaultedAt) : 0;
    return {
      id: String(contract.id || `contract-${Date.now()}-${this.state?.contractSerial || 1}`),
      companyId: company.id,
      cropId: contract.cropId,
      amount,
      delivered,
      rewardCoins: Math.max(0, Math.floor(Number(contract.rewardCoins) || 0)),
      rewardResearch: Math.max(0, Math.floor(Number(contract.rewardResearch) || 0)),
      rewardPrestige: Math.max(0, Math.floor(Number(contract.rewardPrestige) || 0)),
      penaltyBaseCoins: Math.max(1, Math.floor(Number(contract.penaltyBaseCoins) || Number(contract.rewardCoins) || 1)),
      xpRate: Math.max(0, Number(contract.xpRate ?? type.xpPercent / 100) || 0),
      difficulty: type.id,
      typeColor: String(contract.typeColor || type.color || "#e6c35f"),
      typeColorAlpha: Math.max(0, Math.min(100, Number(contract.typeColorAlpha ?? type.colorAlpha ?? 18) || 0)),
      durationSeconds,
      timeRemaining: defaultedAt ? 0 : Math.max(0, Number.isFinite(Number(contract.timeRemaining)) ? Number(contract.timeRemaining) : legacyRemaining),
      createdAt: Number(contract.createdAt || Date.now()),
      acceptedAt: active ? Number(contract.acceptedAt || Date.now()) : 0,
      completedAt,
      defaultedAt,
      penaltyCoins: defaultedAt ? Math.max(1, Math.ceil(Number(contract.penaltyCoins) || Number(contract.penaltyBaseCoins || contract.rewardCoins || 1) * 1.20)) : 0
    };
  },

  getContractDifficulty(id) {
    const types = Array.isArray(this.data.contractTypes) ? this.data.contractTypes : [];
    return types.find(item => item.id === id) || types[0] || null;
  },

  getContractEligibleCrops() {
    if (!this.isContractsUnlocked()) return [];
    return this.data.crops.filter(crop => crop.unlockLevel <= this.state.farmLevel);
  },

  chooseContractCrop(crops, offerIndex = 0, excluded = new Set()) {
    if (!crops.length) return null;
    const uniquePool = crops.filter(crop => !excluded.has(crop.id));
    const pool = uniquePool.length ? uniquePool : crops;
    const sorted = [...pool].sort((a, b) => a.index - b.index);
    if (sorted.length === 1) return sorted[0];
    const maxIndex = Math.max(1, sorted.at(-1).index);
    const weighted = sorted.map(crop => {
      const owned = this.state.crops[crop.id]?.owned ? 1 : 0;
      const recentUnlock = crop.unlockLevel >= Math.max(1, this.state.farmLevel - 4) ? 0.55 : 0;
      const varietyBoost = offerIndex === 0 && crop.index >= maxIndex * 0.65 ? 0.45 : 0;
      return { crop, weight: 1 + (crop.index / maxIndex) * 0.85 + recentUnlock + varietyBoost + owned * 0.18 };
    });
    let roll = Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) return item.crop;
    }
    return sorted[0];
  },

  roundContractAmount(value) {
    const amount = Math.max(5, Number(value) || 5);
    const step = amount < 50 ? 5 : amount < 250 ? 10 : amount < 1000 ? 25 : amount < 5000 ? 100 : amount < 25000 ? 500 : 1000;
    return Math.max(5, Math.round(amount / step) * step);
  },

  getContractRewardKeys(type) {
    if (Array.isArray(type?.rewards)) return new Set(type.rewards);
    const legacy = type?.rewardMode === "both" ? ["coins", "research"] : type?.rewardMode ? [type.rewardMode] : [];
    return new Set(legacy);
  },

  getContractResearchReward(type, amount) {
    if (!type || !this.getContractRewardKeys(type).has("research")) return 0;
    const base = Math.max(1, Math.round(Math.log10(Math.max(1, amount) + 1) * 2 + Math.sqrt(Math.max(1, amount)) / 25));
    const typeValue = base * Math.max(0, Number(type.researchMultiplierPercent) || 0) / 100;
    return Math.max(0, Math.floor(typeValue * (1 + this.getEvolutionBonus("contractResearchRewardPercent") / 100)));
  },

  createContractOffers(count = 1) {
    const eligible = this.getContractEligibleCrops();
    if (!eligible.length || !this.data.companies?.length || !this.data.contractTypes?.length) return [];
    const owned = this.getOwnedCrops();
    const result = [];
    const usedCompanies = new Set([...this.state.contractOffers, ...this.state.activeContracts].map(contract => contract.companyId));
    const usedCrops = new Set([...this.state.contractOffers, ...this.state.activeContracts].map(contract => contract.cropId));
    const typeCycle = this.data.contractTypes.map(item => item.id);
    const typeOffset = this.state.contractSerial % typeCycle.length;
    const averageLevel = owned.length ? owned.reduce((sum, crop) => sum + Math.max(1, Number(this.state.crops[crop.id]?.level || 1)), 0) / owned.length : 1;
    const journeyScale = 1 + Math.min(3.2, this.state.farmLevel * 0.012) + Math.min(1.5, averageLevel / 250);

    const validCompanies = this.data.companies.filter(company => !company.category || eligible.some(crop => crop.category === company.category));
    const serialSeed = this.state.contractSerial;
    for (let index = 0; index < count; index += 1) {
      const availableCompanies = validCompanies.filter(company => !usedCompanies.has(company.id));
      const companies = availableCompanies.length ? availableCompanies : validCompanies;
      if (!companies.length) break;
      const company = companies[(serialSeed + index) % companies.length];
      const companyEligibleCrops = company.category ? eligible.filter(crop => crop.category === company.category) : eligible;
      const crop = this.chooseContractCrop(companyEligibleCrops, index, usedCrops);
      if (!crop) continue;
      usedCrops.add(crop.id);
      usedCompanies.add(company.id);
      const cropLevel = Math.max(1, Number(this.state.crops[crop.id]?.level || 1));
      const type = this.getContractDifficulty(typeCycle[(typeOffset + index) % typeCycle.length]);
      if (!type) continue;

      const durationBonus = Math.max(0, this.getEvolutionBonus("contractDurationPercent")) / 100;
      const durationSeconds = Math.max(5, Math.round(Number(type.durationSeconds || 60) * (1 + durationBonus) * GameEngine.CONTRACT_DURATION_FACTOR));
      const rate = Math.max(0.08, this.getProductionRate(crop.id));
      const variation = 0.88 + Math.random() * 0.24;
      const minimumByProgress = 8 + this.state.farmLevel * 2.4 + eligible.length * 1.35 + Math.floor(cropLevel / 10);
      const amount = this.roundContractAmount(Math.max(minimumByProgress, rate * durationSeconds * journeyScale * variation) * Math.max(0.01, Number(type.quantityMultiplier) || 1));
      const progressionReward = 1 + this.state.farmLevel * 0.012 + crop.index * 0.025 + averageLevel * 0.0015;
      const rewardKeys = this.getContractRewardKeys(type);
      const coinBonus = 1 + Math.max(0, this.getEvolutionBonus("contractCoinRewardPercent")) / 100;
      const orderValue = amount * this.getSalePrice(crop.id);
      const baseCoins = orderValue * (Math.max(0, Number(type.coinMultiplierPercent) || 0) / 100) * progressionReward * GameEngine.CONTRACT_REWARD_FACTOR * coinBonus;
      const missionRewardMultiplier = 1 + Math.max(0, Number(this.state.permanentBonuses?.contractRewardPercent) || 0) / 100;
      const rewardCoins = rewardKeys.has("coins") ? Math.max(0, Math.floor(baseCoins * missionRewardMultiplier)) : 0;
      const rewardResearch = Math.max(0, Math.floor(this.getContractResearchReward(type, amount) * missionRewardMultiplier));
      const prestigeBonus = 1 + Math.max(0, this.getEvolutionBonus("contractPrestigeRewardPercent")) / 100;
      const prestigeBase = Math.max(0, Number(type.prestigeMultiplierPercent) || 0) / 100;
      const rewardPrestige = rewardKeys.has("prestige") ? Math.max(0, Math.floor(Math.max(1, Math.log10(orderValue + 10)) * prestigeBase * prestigeBonus * missionRewardMultiplier)) : 0;

      result.push({
        id: `contract-${Date.now()}-${this.state.contractSerial++}-${index}`,
        companyId: company.id,
        cropId: crop.id,
        amount,
        delivered: 0,
        rewardCoins,
        rewardResearch,
        rewardPrestige,
        penaltyBaseCoins: Math.max(1, Math.floor(baseCoins)),
        xpRate: Math.max(0, Number(type.xpPercent) || 0) / 100,
        difficulty: type.id,
        typeColor: type.color,
        typeColorAlpha: type.colorAlpha,
        durationSeconds,
        timeRemaining: durationSeconds,
        createdAt: Date.now(),
        acceptedAt: 0
      });
    }
    return result;
  },

  normalizeContractCooldown(value) {
    const legacyAvailableAt = typeof value === "object" && value !== null ? Number(value.availableAt) : Number(value);
    const legacyRemaining = legacyAvailableAt > Date.now() ? (legacyAvailableAt - Date.now()) / 1000 : 0;
    const remaining = Math.max(0, Number(value?.timeRemaining ?? legacyRemaining) || 0);
    if (remaining <= 0) return null;
    return {
      reason: String(value?.reason || "renewal"),
      durationSeconds: Math.max(1, Number(value?.durationSeconds) || remaining),
      timeRemaining: remaining,
      startedAt: Number(value?.startedAt || Date.now()),
      sourceContractId: String(value?.sourceContractId || "")
    };
  },

  ensureContractOffers() {
    if (!Array.isArray(this.state.contractOffers)) this.state.contractOffers = [];
    if (!Array.isArray(this.state.contractCooldowns)) this.state.contractCooldowns = [];
    if (!Array.isArray(this.state.activeContracts)) this.state.activeContracts = [];
    this.state.contractOffers = this.state.contractOffers.map(contract => this.normalizeContract(contract, false)).filter(Boolean);
    this.state.activeContracts = this.state.activeContracts.map(contract => this.normalizeContract(contract, true)).filter(Boolean).slice(0, GameEngine.MAX_ACTIVE_CONTRACTS);
    this.state.contractCooldowns = this.state.contractCooldowns.map(value => this.normalizeContractCooldown(value)).filter(Boolean);
    this.expireContractOffers();
    this.state.contractCooldowns = this.state.contractCooldowns.filter(item => Number(item.timeRemaining) > 0);

    if (!this.getContractEligibleCrops().length || !this.data.companies?.length || !this.data.contractTypes?.length) {
      this.state.contractOffers = [];
      this.state.contractCooldowns = [];
      return;
    }
    const maximumOffers = Math.max(0, GameEngine.CONTRACT_OFFER_COUNT - this.state.contractCooldowns.length);
    if (this.state.contractOffers.length < maximumOffers) this.state.contractOffers.push(...this.createContractOffers(maximumOffers - this.state.contractOffers.length));
    this.state.contractOffers = this.state.contractOffers.slice(0, maximumOffers);
  },

  getCompany(companyId) {
    return this.data.companies.find(item => item.id === companyId) || this.data.companies[0] || { id: "unavailable", name: "Sem empresas cadastradas", icon: "assets/icons/contrato-comercial.webp", specialty: "Catálogo administrativo ainda não publicado" };
  },

  getContractProgress(contract) {
    const amount = Math.max(1, Number(contract?.amount) || 1);
    const delivered = Math.max(0, Math.min(amount, Number(contract?.delivered) || 0));
    const completed = Boolean(contract?.completedAt) || delivered >= amount;
    const defaulted = Boolean(contract?.defaultedAt);
    const remaining = completed ? 0 : Math.max(0, amount - delivered);
    const stock = Math.max(0, Math.floor(Number(this.state.crops[contract?.cropId]?.stock) || 0));
    let stockPool = stock;
    let availableNow = 0;
    if (!completed) {
      const queue = this.state.activeContracts.filter(item => item.cropId === contract?.cropId && item.delivered < item.amount && !item.completedAt).sort((a, b) => (Boolean(a.defaultedAt) !== Boolean(b.defaultedAt) ? (a.defaultedAt ? -1 : 1) : (a.timeRemaining - b.timeRemaining) || (a.acceptedAt - b.acceptedAt)));
      for (const queued of queue) {
        const needed = Math.max(0, queued.amount - queued.delivered);
        const allocation = Math.min(stockPool, needed);
        if (queued.id === contract?.id) { availableNow = allocation; break; }
        stockPool -= allocation;
      }
    }
    const fulfillable = completed ? amount : Math.min(amount, delivered + availableNow);
    return {
      delivered, remaining, stock, availableNow, fulfillable, completed, defaulted,
      penaltyCoins: defaulted ? Math.max(1, Math.ceil(Number(contract.penaltyCoins) || Number(contract.penaltyBaseCoins || contract.rewardCoins || 1) * 1.20)) : 0,
      readyToClaim: completed && !defaulted,
      readyToPayPenalty: defaulted,
      percent: completed ? 100 : Math.max(0, Math.min(100, delivered / amount * 100)),
      availablePercent: completed ? 100 : Math.max(0, Math.min(100, fulfillable / amount * 100)),
      readyToComplete: !completed && remaining > 0 && availableNow >= remaining
    };
  },

  startContractCooldown(durationSeconds, reason = "renewal", sourceContractId = "") {
    const seconds = Math.max(1, Math.floor(Number(durationSeconds) || 1));
    const cooldown = { reason, startedAt: Date.now(), durationSeconds: seconds, timeRemaining: seconds, sourceContractId: String(sourceContractId || "") };
    this.state.contractCooldowns.push(cooldown);
    return cooldown;
  },

  acceptContract(id) {
    this.ensureContractOffers();
    const slotLimit = this.getActiveContractSlotLimit();
    if (this.state.activeContracts.length >= slotLimit) return { ok: false, message: `Você já utiliza todos os ${slotLimit} slots de contratos ativos.` };
    const index = this.state.contractOffers.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Esta proposta não está mais disponível." };
    const [offer] = this.state.contractOffers.splice(index, 1);
    if (offer.timeRemaining <= 0) { this.startContractCooldown(GameEngine.CONTRACT_EXPIRED_COOLDOWN_SECONDS, "expired"); this.ensureContractOffers(); return { ok: false, message: "O prazo desta proposta terminou." }; }
    const contract = { ...offer, delivered: 0, acceptedAt: Date.now(), completedAt: 0 };
    this.state.activeContracts.push(contract);
    const cooldown = this.startContractCooldown(GameEngine.CONTRACT_SIGNED_COOLDOWN_SECONDS, "signed", contract.id);
    const stockDelivery = this.deliverStockToContract(contract.id, true);
    this.ensureContractOffers();
    return { ok: true, contract, autoDelivered: stockDelivery.delivered || 0, completed: Boolean(contract.completedAt), cooldownSeconds: cooldown.durationSeconds };
  },

  declineContract(id) {
    this.ensureContractOffers();
    const index = this.state.contractOffers.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Esta proposta não está mais disponível." };
    const [contract] = this.state.contractOffers.splice(index, 1);
    const cooldown = this.startContractCooldown(GameEngine.CONTRACT_DECLINED_COOLDOWN_SECONDS, "declined");
    this.ensureContractOffers();
    return { ok: true, contract, cooldownSeconds: cooldown.durationSeconds };
  },

  breakContract(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (contract.completedAt && !contract.defaultedAt) return { ok: false, message: "Receba a recompensa deste contrato concluído." };
    const penaltyCoins = Math.max(1, Math.ceil(Number(contract.penaltyCoins) || Math.max(1, Number(contract.penaltyBaseCoins || contract.rewardCoins)) * 1.20));
    this.state.coins -= penaltyCoins;
    this.state.activeContracts.splice(index, 1);
    this.state.stats.contractsBroken += 1;
    this.state.stats.lifetimeContractsBroken += 1;
    // Se a reposição de 30 s da assinatura ainda não aconteceu, ela é
    // substituída pelo prazo de 4 min da quebra, evitando dois bloqueios para
    // a mesma proposta original.
    this.state.contractCooldowns = this.state.contractCooldowns.filter(cooldown => !(cooldown.reason === "signed" && cooldown.sourceContractId === contract.id));
    const cooldown = this.startContractCooldown(GameEngine.CONTRACT_BROKEN_COOLDOWN_SECONDS, "broken", contract.id);
    this.ensureContractOffers();
    return { ok: true, contract, penaltyCoins, cooldownSeconds: cooldown.durationSeconds };
  },

  deliverStockToContract(id, silent = false) {
    const contract = this.state.activeContracts.find(item => item.id === id);
    if (!contract || contract.completedAt || contract.defaultedAt) return { ok: false, delivered: 0, contract };
    if (contract.timeRemaining <= 0) this.expireContracts(silent);
    if (contract.defaultedAt) return { ok: false, delivered: 0, contract };
    const cropState = this.state.crops[contract.cropId];
    const needed = Math.max(0, contract.amount - contract.delivered);
    const delivered = Math.min(Math.max(0, cropState.stock), needed);
    if (delivered > 0) {
      cropState.stock -= delivered;
      contract.delivered += delivered;
      this.state.stats.contractUnitsDelivered += delivered;
      this.state.stats.lifetimeContractUnitsDelivered += delivered;
    }
    if (contract.delivered >= contract.amount) this.markContractComplete(contract.id, silent, false);
    return { ok: delivered > 0, delivered, completed: Boolean(contract.completedAt), contract };
  },

  markContractComplete(id, silent = false, automatic = false) {
    const contract = this.state.activeContracts.find(item => item.id === id);
    if (!contract || contract.delivered < contract.amount || contract.completedAt) return contract || null;
    contract.delivered = contract.amount;
    contract.completedAt = Date.now();
    contract.timeRemaining = Math.max(0, Number(contract.timeRemaining) || 0);
    if (!contract.defaultedAt) {
      this.state.stats.contractsCompleted += 1;
      this.state.stats.lifetimeContractsCompleted += 1;
    }
    return contract;
  },

  claimContractReward(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (contract.defaultedAt) return { ok: false, message: "Este contrato venceu. Pague a multa para liberar o slot." };
    if (!contract.completedAt || contract.delivered < contract.amount) return { ok: false, message: "Este contrato ainda não foi concluído." };
    this.state.activeContracts.splice(index, 1);
    if (contract.rewardCoins) this.addCoins(contract.rewardCoins);
    if (contract.rewardResearch) this.addResearch(contract.rewardResearch);
    if (contract.rewardPrestige) this.state.prestigePoints += contract.rewardPrestige;
    this.addFarmXPPercent(contract.xpRate);
    this.ensureContractOffers();
    return { ok: true, contract, xpRate: contract.xpRate };
  },

  payContractPenalty(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (!contract.defaultedAt) return { ok: false, message: "Este contrato não possui multa." };
    const penaltyCoins = Math.max(1, Math.ceil(Number(contract.penaltyCoins) || Math.max(1, Number(contract.penaltyBaseCoins || contract.rewardCoins)) * 1.20));
    this.state.coins -= penaltyCoins;
    this.state.activeContracts.splice(index, 1);
    this.ensureContractOffers();
    return { ok: true, contract, penaltyCoins };
  },

  getReadyContractCount() {
    return this.state.activeContracts.filter(contract => Boolean(contract.completedAt || contract.defaultedAt)).length;
  }
});
