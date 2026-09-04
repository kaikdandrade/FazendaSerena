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

  getContractItems(contract) {
    const source = Array.isArray(contract?.items) && contract.items.length
      ? contract.items
      : (contract?.cropId ? [{ cropId: contract.cropId, amount: contract.amount, delivered: contract.delivered }] : []);
    const merged = new Map();
    source.forEach(item => {
      const crop = this.getCrop(item?.cropId);
      if (!crop) return;
      const amount = Math.max(1, Math.floor(Number(item?.amount) || 1));
      const delivered = Math.max(0, Math.min(amount, Math.floor(Number(item?.delivered) || 0)));
      const previous = merged.get(crop.id);
      if (previous) {
        previous.amount += amount;
        previous.delivered = Math.min(previous.amount, previous.delivered + delivered);
      } else {
        merged.set(crop.id, { cropId: crop.id, amount, delivered });
      }
    });
    return [...merged.values()];
  },

  syncContractTotals(contract) {
    if (!contract) return contract;
    const items = this.getContractItems(contract);
    if (!items.length) return contract;
    contract.items = items;
    contract.cropId = items[0].cropId; // compatibilidade com integrações antigas.
    contract.amount = items.reduce((sum, item) => sum + item.amount, 0);
    contract.delivered = items.reduce((sum, item) => sum + item.delivered, 0);
    return contract;
  },

  lockContractParameters(contract, force = false) {
    if (!contract) return contract;
    const alreadyLocked = Number(contract.rewardSnapshotVersion || 0) >= 1;
    if (alreadyLocked && !force) return contract;
    const contractRewardMultiplier = this.getEventMultiplier("contractRewards");
    const coinEventMultiplier = this.getEventMultiplier("coins");
    const researchEventMultiplier = this.getEventMultiplier("research");
    contract.lockedRewardCoins = Math.max(0, Math.floor((Number(contract.rewardCoins) || 0) * contractRewardMultiplier * coinEventMultiplier));
    contract.lockedRewardResearch = Math.max(0, Math.floor((Number(contract.rewardResearch) || 0) * contractRewardMultiplier * researchEventMultiplier));
    contract.lockedRewardPrestige = Math.max(0, Math.floor((Number(contract.rewardPrestige) || 0) * contractRewardMultiplier));
    contract.lockedRewardXP = Math.max(0, Math.round(this.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE)));
    contract.penaltyUnitPrices = Object.fromEntries(this.getContractItems(contract).map(item => [item.cropId, Math.max(1, Number(this.getSalePrice(item.cropId)) || 1)]));
    contract.rewardSnapshotVersion = 1;
    return contract;
  },

  getContractFrozenXPReward(contract) {
    if (Number(contract?.rewardSnapshotVersion || 0) < 1) this.lockContractParameters(contract, false);
    return Math.max(0, Number(contract?.lockedRewardXP) || 0);
  },

  calculateContractPenalty(contract) {
    const type = this.getContractDifficulty(contract?.difficulty || contract?.typeId);
    const penaltyPercent = Math.max(0, Number(contract?.penaltyPercent ?? type?.penaltyPercent ?? 20) || 0);
    const basePenalty = this.getContractItems(contract).reduce((sum, item) => {
      const missing = Math.max(0, item.amount - item.delivered);
      const unitPrice = Math.max(1, Number(contract?.penaltyUnitPrices?.[item.cropId]) || Number(this.getSalePrice(item.cropId)) || 1);
      return sum + unitPrice * missing;
    }, 0);
    if (basePenalty <= 0) return 0;
    const calculated = basePenalty * (100 + penaltyPercent) / 100;
    return Math.max(1, Math.ceil(Math.round(calculated * 1e9) / 1e9));
  },

  advanceContractTimers(seconds, silent = false) {
    const elapsed = Math.max(0, Number(seconds) || 0);
    if (elapsed <= 0) return;
    this.state.activeContracts.forEach(contract => {
      if (contract.completedAt) return;
      this.syncContractTotals(contract);
      const duration = Math.max(5, Number(contract.deliveryDurationSeconds || contract.durationSeconds) || 5);
      contract.timeRemaining = Math.max(0, Number(contract.timeRemaining || 0) - elapsed);
      const elapsedRatio = Math.max(0, Math.min(1, 1 - contract.timeRemaining / duration));
      let deliveredDelta = 0;
      contract.items.forEach(item => {
        const previousDelivered = Math.max(0, Math.floor(Number(item.delivered) || 0));
        const targetDelivered = contract.timeRemaining <= 0
          ? item.amount
          : Math.floor(item.amount * elapsedRatio);
        item.delivered = Math.max(previousDelivered, Math.min(item.amount, targetDelivered));
        deliveredDelta += Math.max(0, item.delivered - previousDelivered);
      });
      if (deliveredDelta > 0) {
        this.state.stats.contractUnitsDelivered += deliveredDelta;
        this.state.stats.lifetimeContractUnitsDelivered += deliveredDelta;
      }
      this.syncContractTotals(contract);
      if (contract.timeRemaining <= 0) this.markContractComplete(contract.id, silent, true);
    });
    this.state.contractRefreshCooldownRemaining = Math.max(0, Number(this.state.contractRefreshCooldownRemaining || 0) - elapsed);
    this.expireContracts(silent);
  },

  expireContracts(silent = false) {
    const completed = this.state.activeContracts.filter(contract =>
      !contract.completedAt && Number(contract.timeRemaining || 0) <= 0
    );
    completed.forEach(contract => {
      this.syncContractTotals(contract);
      let delta = 0;
      contract.items.forEach(item => {
        delta += Math.max(0, item.amount - item.delivered);
        item.delivered = item.amount;
      });
      if (delta > 0) {
        this.state.stats.contractUnitsDelivered += delta;
        this.state.stats.lifetimeContractUnitsDelivered += delta;
      }
      this.syncContractTotals(contract);
      this.markContractComplete(contract.id, silent, true);
    });
    return completed;
  },

  expireContractOffers() {
    // As propostas não expiram mais. Elas permanecem até serem assinadas ou
    // substituídas manualmente pelo botão Atualizar contratos.
    return [];
  },

  normalizeContract(contract, active = false) {
    if (!contract) return null;
    const rawItems = this.getContractItems(contract);
    if (!rawItems.length) return null;
    const rawBoardStatus = ["offer", "delivered", "broken", "penalized"].includes(String(contract.boardStatus || "")) ? String(contract.boardStatus) : "offer";
    const terminalBoardStatus = !active && rawBoardStatus !== "offer";
    const items = rawItems.map(item => ({ ...item, delivered: active || terminalBoardStatus ? item.delivered : 0 }));
    const company = this.data.companies.find(item => item.id === contract.companyId) || this.data.companies[0];
    const type = this.getContractDifficulty(contract.difficulty || contract.typeId);
    if (!company || !type) return null;
    const amount = items.reduce((sum, item) => sum + item.amount, 0);
    const delivered = items.reduce((sum, item) => sum + item.delivered, 0);
    const deliveryRange = Array.isArray(type.deliveryDurationRange) ? type.deliveryDurationRange : [180, 360];
    const deliveryFallback = Math.max(5, Math.round((Number(deliveryRange[0]) + Number(deliveryRange[1] ?? deliveryRange[0])) / 2) || 180);
    const legacyDuration = Math.max(5, Math.floor(Number(contract.deliveryDurationSeconds) || Number(contract.durationSeconds) || Number(type.durationSeconds) || deliveryFallback));
    const deliveryDurationSeconds = legacyDuration;
    const legacyDeadline = Number(contract.deadlineAt || 0);
    const legacyRemaining = active && legacyDeadline > 0 ? Math.max(0, (legacyDeadline - Date.now()) / 1000) : deliveryDurationSeconds;
    const completedAt = (active || terminalBoardStatus) && (Number(contract.completedAt || 0) > 0 || delivered >= amount) ? Number(contract.completedAt || Date.now()) : 0;
    const normalized = {
      id: String(contract.id || `contract-${Date.now()}-${this.state?.contractSerial || 1}`),
      companyId: company.id,
      items,
      cropId: items[0].cropId,
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
      priority: Math.max(0, Math.floor(Number(contract.priority ?? type.priority) || 0)),
      penaltyPercent: Math.max(0, Number(contract.penaltyPercent ?? type.penaltyPercent ?? 20) || 0),
      deliveryDurationSeconds,
      durationSeconds: deliveryDurationSeconds,
      ...(active ? { timeRemaining: Math.max(0, Number.isFinite(Number(contract.timeRemaining)) ? Number(contract.timeRemaining) : legacyRemaining) } : {}),
      createdAt: Number(contract.createdAt || Date.now()),
      acceptedAt: active ? Number(contract.acceptedAt || Date.now()) : 0,
      completedAt,
      penaltyCoins: Math.max(0, Number(contract.penaltyCoins) || 0),
      rewardSnapshotVersion: Math.max(0, Math.floor(Number(contract.rewardSnapshotVersion) || 0)),
      lockedRewardCoins: Math.max(0, Math.floor(Number(contract.lockedRewardCoins) || 0)),
      lockedRewardResearch: Math.max(0, Math.floor(Number(contract.lockedRewardResearch) || 0)),
      lockedRewardPrestige: Math.max(0, Math.floor(Number(contract.lockedRewardPrestige) || 0)),
      lockedRewardXP: Math.max(0, Number(contract.lockedRewardXP) || 0),
      penaltyUnitPrices: contract.penaltyUnitPrices && typeof contract.penaltyUnitPrices === "object" ? { ...contract.penaltyUnitPrices } : {},
      boardStatus: active ? "active" : rawBoardStatus,
      boardOrder: Number.isFinite(Number(contract.boardOrder)) ? Number(contract.boardOrder) : Number.MAX_SAFE_INTEGER,
      resolvedAt: Math.max(0, Number(contract.resolvedAt) || 0)
    };
    return this.state ? this.lockContractParameters(normalized, false) : normalized;
  },

  getContractDifficulty(id) {
    const types = Array.isArray(this.data.contractTypes) ? this.data.contractTypes : [];
    return types.find(item => item.id === id) || types[0] || null;
  },

  getContractEligibleCrops() {
    if (!this.isContractsUnlocked()) return [];
    const unlocked = this.data.crops.filter(crop => Number(crop.unlockLevel) <= Number(this.state.farmLevel));
    const purchased = unlocked
      .filter(crop => this.state.crops?.[crop.id]?.owned)
      .sort((a, b) => {
        const orderA = Math.max(0, Number(this.state.crops?.[a.id]?.purchaseOrder) || 0);
        const orderB = Math.max(0, Number(this.state.crops?.[b.id]?.purchaseOrder) || 0);
        return orderB - orderA || Number(b.index) - Number(a.index);
      })
      .slice(0, Math.max(1, Math.floor(Number(GameEngine.CONTRACT_RECENT_CROP_LIMIT) || 5)));

    // Além das compras recentes configuradas, deixa visível a planta desbloqueada
    // mais avançada que ainda não foi comprada. Isso transforma o contrato em
    // um incentivo de progressão sem trazer de volta todo o catálogo antigo.
    const newestUnlockedUnpurchased = unlocked
      .filter(crop => !this.state.crops?.[crop.id]?.owned)
      .sort((a, b) => Number(b.unlockLevel) - Number(a.unlockLevel) || Number(b.index) - Number(a.index))[0];

    return newestUnlockedUnpurchased ? [...purchased, newestUnlockedUnpurchased] : purchased;
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
    const amount = Math.max(1, Number(value) || 1);
    const step = amount < 10 ? 1 : amount < 50 ? 5 : amount < 250 ? 10 : amount < 1000 ? 25 : amount < 5000 ? 100 : amount < 25000 ? 500 : 1000;
    return Math.max(1, Math.round(amount / step) * step);
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
    const usedCrops = new Set([...this.state.contractOffers, ...this.state.activeContracts].flatMap(contract => this.getContractItems(contract).map(item => item.cropId)));
    const contractTypes = this.data.contractTypes.filter(type => type && Math.max(0, Number(type.chancePercent ?? 100)) > 0);
    if (!contractTypes.length) return [];
    // chancePercent agora é tratado como probabilidade real de cada categoria.
    // Tipos raros fazem uma rolagem independente; se nenhum passar, um tipo de
    // 100% (comum) preenche a proposta. Se não existir um 100%, o tipo de maior
    // chance funciona como fallback para não deixar um slot sem proposta.
    const chooseContractType = () => {
      const hits = contractTypes
        .filter(type => Math.random() * 100 < Math.max(0, Math.min(100, Number(type.chancePercent ?? 100))))
        .sort((a, b) => Number(a.chancePercent ?? 100) - Number(b.chancePercent ?? 100) || Math.random() - 0.5);
      if (hits.length) return hits[0];
      const maxChance = Math.max(...contractTypes.map(type => Number(type.chancePercent ?? 100)));
      const fallback = contractTypes.filter(type => Number(type.chancePercent ?? 100) === maxChance);
      return fallback[Math.floor(Math.random() * fallback.length)] || contractTypes[0];
    };
    const randomRangeSeconds = (range, fallback) => {
      const values = Array.isArray(range) ? range : [fallback, fallback];
      const a = Math.max(5, Number(values[0]) || fallback);
      const b = Math.max(5, Number(values[1] ?? values[0]) || a);
      const min = Math.min(a, b), max = Math.max(a, b);
      return Math.max(5, Math.round(min + Math.random() * (max - min)));
    };
    const averageLevel = owned.length ? owned.reduce((sum, crop) => sum + Math.max(1, Number(this.state.crops[crop.id]?.level || 1)), 0) / owned.length : 1;

    const validCompanies = this.data.companies.filter(company => !company.category || eligible.some(crop => crop.category === company.category));
    const serialSeed = this.state.contractSerial;
    for (let index = 0; index < count; index += 1) {
      const availableCompanies = validCompanies.filter(company => !usedCompanies.has(company.id));
      const companies = availableCompanies.length ? availableCompanies : validCompanies;
      if (!companies.length) break;
      const company = companies[(serialSeed + index) % companies.length];
      const companyEligibleCrops = company.category ? eligible.filter(crop => crop.category === company.category) : eligible;
      if (!companyEligibleCrops.length) continue;
      const type = chooseContractType();
      if (!type) continue;
      const requestedCropCount = Math.max(1, Math.min(4, Math.floor(Number(type.cropCount) || 1)));
      const selectedCrops = [];
      const selectedIds = new Set();
      for (let cropIndex = 0; cropIndex < requestedCropCount; cropIndex += 1) {
        const selectionExclusions = new Set([...usedCrops, ...selectedIds]);
        let crop = this.chooseContractCrop(companyEligibleCrops.filter(item => !selectedIds.has(item.id)), index + cropIndex, selectionExclusions);
        if (!crop) break;
        selectedCrops.push(crop);
        selectedIds.add(crop.id);
      }
      if (!selectedCrops.length) continue;
      selectedCrops.forEach(crop => usedCrops.add(crop.id));
      usedCompanies.add(company.id);

      const speedBonus = Math.max(0, this.getEvolutionBonus("contractDurationPercent")) / 100;
      const baseDeliveryDuration = randomRangeSeconds(type.deliveryDurationRange, 240);
      const deliveryDurationSeconds = Math.max(5, Math.round(baseDeliveryDuration / (1 + speedBonus) * GameEngine.CONTRACT_DURATION_FACTOR));
      const workloadShare = 0.36 + Math.random() * 0.18;
      const difficultyLoad = Math.max(0.01, Number(type.quantityMultiplier) || 1);
      const items = selectedCrops.map(crop => {
        const rate = Math.max(0.01, this.getProductionRate(crop.id, false));
        const expectedProduction = Math.max(1, rate * deliveryDurationSeconds);
        const minimumByCycle = Math.max(1, Math.min(this.getYield(crop.id, false) * 2, expectedProduction * 0.75));
        const splitLoad = difficultyLoad / Math.max(1, selectedCrops.length);
        const amount = this.roundContractAmount(Math.max(minimumByCycle, expectedProduction * workloadShare * splitLoad));
        return { cropId: crop.id, amount, delivered: 0 };
      });
      const amount = items.reduce((sum, item) => sum + item.amount, 0);
      const progressionReward = 1 + this.state.farmLevel * 0.012 + selectedCrops.reduce((sum, crop) => sum + crop.index, 0) / selectedCrops.length * 0.025 + averageLevel * 0.0015;
      const rewardKeys = this.getContractRewardKeys(type);
      const coinBonus = 1 + Math.max(0, this.getEvolutionBonus("contractCoinRewardPercent")) / 100;
      const contractValue = items.reduce((sum, item) => sum + item.amount * this.getSalePrice(item.cropId), 0);
      const baseCoins = contractValue * (Math.max(0, Number(type.coinMultiplierPercent) || 0) / 100) * progressionReward * GameEngine.CONTRACT_REWARD_FACTOR * coinBonus;
      const missionRewardMultiplier = 1 + Math.max(0, Number(this.state.permanentBonuses?.contractRewardPercent) || 0) / 100;
      const rewardCoins = rewardKeys.has("coins") ? Math.max(0, Math.floor(baseCoins * missionRewardMultiplier)) : 0;
      const rewardResearch = Math.max(0, Math.floor(this.getContractResearchReward(type, amount) * missionRewardMultiplier));
      const prestigeBonus = 1 + Math.max(0, this.getEvolutionBonus("contractPrestigeRewardPercent")) / 100;
      const prestigeBase = Math.max(0, Number(type.prestigeMultiplierPercent) || 0) / 100;
      const rewardPrestige = rewardKeys.has("prestige") ? Math.max(0, Math.floor(Math.max(1, Math.log10(contractValue + 10)) * prestigeBase * prestigeBonus * missionRewardMultiplier)) : 0;

      const generatedContract = {
        id: `contract-${Date.now()}-${this.state.contractSerial++}-${index}`,
        companyId: company.id,
        items,
        cropId: items[0].cropId,
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
        priority: Math.max(0, Math.floor(Number(type.priority) || 0)),
        penaltyPercent: Math.max(0, Number(type.penaltyPercent ?? 20) || 0),
        deliveryDurationSeconds,
        durationSeconds: deliveryDurationSeconds,
        createdAt: Date.now(),
        acceptedAt: 0,
        boardStatus: "offer",
        boardOrder: Number.MAX_SAFE_INTEGER,
        resolvedAt: 0
      };
      result.push(this.lockContractParameters(generatedContract, true));
    }
    return result;
  },


  getContractOfferTargetCount(state = this.state) {
    // A grade comercial cresce apenas com a capacidade de contratos ativos:
    // padrão 6 cards; a partir de 3 slots, 9; a partir de 6 slots, 12.
    const activeSlots = Math.max(0, this.getActiveContractSlotLimit(state));
    if (activeSlots >= 6) return 12;
    if (activeSlots >= 3) return 9;
    return 6;
  },

  getContractBoardEntries(state = this.state) {
    const active = Array.isArray(state?.activeContracts) ? state.activeContracts : [];
    const inactive = Array.isArray(state?.contractOffers) ? state.contractOffers : [];
    return [...active, ...inactive].sort((a, b) => {
      const orderA = Number.isFinite(Number(a?.boardOrder)) ? Number(a.boardOrder) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(Number(b?.boardOrder)) ? Number(b.boardOrder) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB || Number(a?.createdAt || 0) - Number(b?.createdAt || 0) || String(a?.id || "").localeCompare(String(b?.id || ""));
    });
  },

  needsContractOfferRefresh(state = this.state) {
    if (!this.getContractEligibleCrops().length || !this.data.companies?.length || !this.data.contractTypes?.length) return false;
    return this.getContractBoardEntries(state).length < this.getContractOfferTargetCount(state);
  },

  ensureContractOffers() {
    if (!Array.isArray(this.state.contractOffers)) this.state.contractOffers = [];
    if (!Array.isArray(this.state.activeContracts)) this.state.activeContracts = [];
    this.state.contractRefreshCooldownRemaining = Math.max(0, Number(this.state.contractRefreshCooldownRemaining) || 0);
    this.state.contractOffers = this.state.contractOffers.map(contract => this.normalizeContract(contract, false)).filter(Boolean);
    this.state.activeContracts = this.state.activeContracts.map(contract => this.normalizeContract(contract, true)).filter(Boolean).slice(0, GameEngine.MAX_ACTIVE_CONTRACTS);

    // Migração de saves anteriores: preserva a ordem visual atual e passa a usar
    // um único tabuleiro para propostas, contratos em andamento e estados finais.
    const ordered = this.getContractBoardEntries(this.state);
    const usedOrders = new Set();
    ordered.forEach((contract, index) => {
      let order = Number(contract.boardOrder);
      if (!Number.isFinite(order) || order >= Number.MAX_SAFE_INTEGER || usedOrders.has(order)) order = index;
      contract.boardOrder = order;
      usedOrders.add(order);
      if (this.state.activeContracts.includes(contract)) contract.boardStatus = "active";
      else if (!["delivered", "broken", "penalized"].includes(contract.boardStatus)) contract.boardStatus = "offer";
    });

    const eligibleCrops = this.getContractEligibleCrops();
    const eligibleCropIds = new Set(eligibleCrops.map(crop => crop.id));
    // Somente propostas ainda assináveis dependem da janela atual de plantas.
    // Cards encerrados permanecem visíveis até o usuário atualizar os contratos.
    this.state.contractOffers = this.state.contractOffers.filter(contract => {
      if (contract.boardStatus !== "offer") return true;
      const items = this.getContractItems(contract);
      return items.length > 0 && items.every(item => eligibleCropIds.has(item.cropId));
    });

    if (!eligibleCrops.length || !this.data.companies?.length || !this.data.contractTypes?.length) {
      // Contratos ativos e cards já encerrados continuam visíveis. Apenas não são
      // criadas novas propostas enquanto o catálogo não puder gerar contratos.
      this.state.contractOffers = this.state.contractOffers.filter(contract => contract.boardStatus !== "offer");
      return;
    }

    const boardCapacity = this.getContractOfferTargetCount(this.state);
    const activeCount = this.state.activeContracts.length;
    const roomForInactive = Math.max(0, boardCapacity - activeCount);
    if (this.state.contractOffers.length > roomForInactive) {
      this.state.contractOffers = [...this.state.contractOffers]
        .sort((a, b) => Number(a.boardOrder) - Number(b.boardOrder))
        .slice(0, roomForInactive);
    }

    const currentTotal = activeCount + this.state.contractOffers.length;
    if (GameEngine.ALLOW_CONTRACT_OFFER_CREATION && currentTotal < boardCapacity) {
      const missing = boardCapacity - currentTotal;
      const created = this.createContractOffers(missing);
      const maxOrder = this.getContractBoardEntries(this.state).reduce((max, contract) => Math.max(max, Number(contract.boardOrder) || -1), -1);
      created.forEach((contract, index) => {
        contract.boardStatus = "offer";
        contract.boardOrder = maxOrder + index + 1;
      });
      this.state.contractOffers.push(...created);
    }
  },

  getCompany(companyId) {
    return this.data.companies.find(item => item.id === companyId) || this.data.companies[0] || { id: "unavailable", name: "Sem empresas cadastradas", icon: "assets/icons/contrato-comercial.webp", specialty: "Catálogo administrativo ainda não publicado" };
  },

  getContractProgress(contract) {
    const items = this.getContractItems(contract);
    const amount = Math.max(1, items.reduce((sum, item) => sum + item.amount, 0));
    const delivered = Math.max(0, Math.min(amount, items.reduce((sum, item) => sum + item.delivered, 0)));
    const completed = Boolean(contract?.completedAt) || delivered >= amount;
    const remaining = completed ? 0 : Math.max(0, amount - delivered);
    const duration = Math.max(5, Number(contract?.deliveryDurationSeconds || contract?.durationSeconds) || 5);
    const timeRemaining = Math.max(0, Number(contract?.timeRemaining) || 0);
    const timedPercent = completed ? 100 : Math.max(0, Math.min(100, (1 - timeRemaining / duration) * 100));
    return {
      items, amount, delivered, remaining, completed,
      penaltyCoins: Math.max(0, Number(contract.penaltyCoins) || 0),
      readyToClaim: completed,
      percent: timedPercent,
      availablePercent: timedPercent,
      readyToComplete: timeRemaining <= 0
    };
  },

  getContractRefreshCooldownSeconds() {
    const configuredMin = Math.max(1, Math.floor(Number(GameEngine.CONTRACT_REFRESH_COOLDOWN_MIN_SECONDS) || 5));
    const configuredMax = Math.max(1, Math.floor(Number(GameEngine.CONTRACT_REFRESH_COOLDOWN_MAX_SECONDS) || 15));
    const minimum = Math.min(configuredMin, configuredMax);
    const maximum = Math.max(configuredMin, configuredMax);
    return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
  },

  refreshContractOffers() {
    this.ensureContractOffers();
    const remaining = Math.max(0, Number(this.state.contractRefreshCooldownRemaining) || 0);
    if (remaining > 0) return { ok: false, message: `Você poderá atualizar os contratos em ${this.formatTime(Math.ceil(remaining))}.`, cooldownSeconds: remaining };

    // Atualizar nunca remove contratos em andamento/concluídos aguardando coleta.
    // Ofertas antigas e cards encerrados são descartados. Os ativos são movidos
    // para o começo do tabuleiro e as posições restantes recebem novas propostas.
    this.state.activeContracts
      .sort((a, b) => Number(a.boardOrder) - Number(b.boardOrder))
      .forEach((contract, index) => {
        contract.boardOrder = index;
        contract.boardStatus = "active";
      });
    this.state.contractOffers = [];

    const boardCapacity = this.getContractOfferTargetCount(this.state);
    const proposalCount = Math.max(0, boardCapacity - this.state.activeContracts.length);
    if (GameEngine.ALLOW_CONTRACT_OFFER_CREATION && proposalCount > 0) {
      const created = this.createContractOffers(proposalCount);
      created.forEach((contract, index) => {
        contract.boardStatus = "offer";
        contract.boardOrder = this.state.activeContracts.length + index;
      });
      this.state.contractOffers = created;
    }
    const cooldownSeconds = this.getContractRefreshCooldownSeconds();
    this.state.contractRefreshCooldownRemaining = cooldownSeconds;
    return { ok: true, offers: this.state.contractOffers, cooldownSeconds };
  },

  acceptContract(id) {
    this.ensureContractOffers();
    const slotLimit = this.getActiveContractSlotLimit();
    if (this.state.activeContracts.length >= slotLimit) return { ok: false, message: `Você já utiliza todos os ${slotLimit} slots de contratos ativos.` };
    const index = this.state.contractOffers.findIndex(contract => contract.id === id && contract.boardStatus === "offer");
    if (index < 0) return { ok: false, message: "Esta proposta não está mais disponível." };
    const [offer] = this.state.contractOffers.splice(index, 1);
    const contract = {
      ...offer,
      items: this.getContractItems(offer).map(item => ({ ...item, delivered: 0 })),
      delivered: 0,
      acceptedAt: Date.now(),
      completedAt: 0,
      resolvedAt: 0,
      boardStatus: "active",
      timeRemaining: Math.max(5, Number(offer.deliveryDurationSeconds || offer.durationSeconds) || 5)
    };
    this.syncContractTotals(contract);
    this.state.activeContracts.push(contract);
    // Não cria uma proposta de reposição: o contrato assinado continua ocupando
    // exatamente o card que já ocupava na grade.
    return { ok: true, contract, completed: Boolean(contract.completedAt) };
  },

  breakContract(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (contract.completedAt) return { ok: false, message: "Receba a recompensa deste contrato concluído." };
    const penaltyCoins = this.calculateContractPenalty(contract);
    this.state.coins -= penaltyCoins;
    this.state.activeContracts.splice(index, 1);
    const archived = {
      ...contract,
      boardStatus: "broken",
      resolvedAt: Date.now(),
      penaltyCoins,
      timeRemaining: Math.max(0, Number(contract.timeRemaining) || 0)
    };
    this.state.contractOffers.push(archived);
    this.state.stats.contractsBroken += 1;
    this.state.stats.lifetimeContractsBroken += 1;
    return { ok: true, contract: archived, penaltyCoins };
  },

  markContractComplete(id, silent = false, automatic = false) {
    const contract = this.state.activeContracts.find(item => item.id === id);
    if (!contract || contract.completedAt) return contract || null;
    this.syncContractTotals(contract);
    const ready = Number(contract.timeRemaining || 0) <= 0 || contract.items.every(item => item.delivered >= item.amount);
    if (!ready) return contract;
    contract.items.forEach(item => { item.delivered = item.amount; });
    this.syncContractTotals(contract);
    contract.completedAt = Date.now();
    contract.timeRemaining = 0;
    this.state.stats.contractsCompleted += 1;
    this.state.stats.lifetimeContractsCompleted += 1;
    return contract;
  },

  getEffectiveContractRewards(contract) {
    if (Number(contract?.rewardSnapshotVersion || 0) < 1) this.lockContractParameters(contract, false);
    return {
      coins: Math.max(0, Math.floor(Number(contract?.lockedRewardCoins) || 0)),
      research: Math.max(0, Math.floor(Number(contract?.lockedRewardResearch) || 0)),
      prestige: Math.max(0, Math.floor(Number(contract?.lockedRewardPrestige) || 0))
    };
  },

  claimContractReward(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (!contract.completedAt || !this.getContractProgress(contract).completed) return { ok: false, message: "Este contrato ainda não foi concluído." };
    this.state.activeContracts.splice(index, 1);
    const rewards = this.getEffectiveContractRewards(contract);
    if (rewards.coins) this.addCoins(rewards.coins, false);
    if (rewards.research) this.addResearch(rewards.research, false);
    if (rewards.prestige) this.addPrestigePoints(rewards.prestige);
    const xpAward = this.getContractFrozenXPReward(contract);
    if (xpAward > 0) this.addFarmXP(xpAward, false, false);
    const archived = {
      ...contract,
      boardStatus: "delivered",
      resolvedAt: Date.now(),
      timeRemaining: 0
    };
    this.state.contractOffers.push(archived);
    return { ok: true, contract: archived, rewards, xpRate: contract.xpRate, xpAward };
  },

  getReadyContractCount() {
    return this.state.activeContracts.filter(contract => Boolean(contract.completedAt)).length;
  }
});
