"use strict";

// Revisão 39 — camada de atualização incremental.
// Nada aqui recria imagens, cards ou grids durante o loop normal. A montagem
// estrutural continua nas funções render* e só é acionada quando a estrutura
// realmente muda (ex.: contrato termina, proposta expira, ação do jogador).

let lastContractsStructureSignature = "";
let lastContractDockStructureSignature = "";

function setLiveText(node, value) {
  if (!node) return;
  const text = String(value ?? "");
  if (node.textContent !== text) node.textContent = text;
}

function setLiveWidth(node, value) {
  if (!node) return;
  const width = `${percent(value)}%`;
  if (node.style.width !== width) node.style.width = width;
}

function setLiveResourceValue(root, value) {
  const amount = root?.matches?.(".resource-amount") ? root : root?.querySelector?.(".resource-amount");
  const target = amount?.querySelector?.("b");
  if (!target) return;
  setLiveText(target, engine.formatNumber(Math.abs(Number(value) || 0)));
}

function setLiveRewardValues(root, reward = {}) {
  if (!root) return;
  [["coins", reward.coins], ["research", reward.research], ["prestige", reward.prestige], ["xp", reward.xp]].forEach(([type, value]) => {
    if (value === undefined || value === null) return;
    const target = root.querySelector(`.resource-${type} b`);
    if (target) setLiveText(target, engine.formatNumber(Math.abs(Number(value) || 0)));
  });
}

function contractStatus(contract) {
  const progress = engine.getContractProgress(contract);
  return progress.defaulted ? "defaulted" : progress.completed ? "completed" : "running";
}

function contractCooldownKey(item) {
  return `${item?.reason || "cooldown"}-${item?.startedAt || 0}-${item?.sourceContractId || ""}`;
}

function getContractsStructureSignature() {
  if (!engine) return "";
  const active = (engine.state.activeContracts || []).map(contract => `${contract.id}:${contractStatus(contract)}`).join("|");
  const offers = (engine.state.contractOffers || []).map(contract => contract.id).join("|");
  const cooldowns = (engine.state.contractCooldowns || []).map(contractCooldownKey).join("|");
  return `${engine.isContractsUnlocked() ? 1 : 0};slots:${engine.getActiveContractSlotLimit()};a:${active};o:${offers};c:${cooldowns}`;
}

function getContractDockStructureSignature() {
  if (!engine) return "";
  const active = (engine.state.activeContracts || []).map(contract => `${contract.id}:${contractStatus(contract)}`).join("|");
  return `${engine.isContractsUnlocked() ? 1 : 0};collapsed:${contractDockCollapsed ? 1 : 0};${active}`;
}

function markContractsStructureRendered() {
  lastContractsStructureSignature = getContractsStructureSignature();
}

function markContractDockStructureRendered() {
  lastContractDockStructureSignature = getContractDockStructureSignature();
}

function updateLiveContractDockUI() {
  if (!dom.contractDock) return;
  const signature = getContractDockStructureSignature();
  if (signature !== lastContractDockStructureSignature) {
    renderContractDock();
    return;
  }

  const contracts = engine.state.activeContracts || [];
  if (contractDockCollapsed) {
    setLiveText(dom.contractDock.querySelector("[data-contract-dock-count]"), contracts.length);
    return;
  }

  contracts.forEach(contract => {
    const card = dom.contractDock.querySelector(`[data-contract-dock-id="${CSS.escape(contract.id)}"]`);
    if (!card) return;
    const progress = engine.getContractProgress(contract);
    const urgent = !progress.completed && !progress.defaulted && Number(contract.timeRemaining) <= 30;
    const statusNode = card.querySelector("[data-contract-dock-percent]");
    const statusText = progress.defaulted ? "Contrato vencido" : progress.completed ? "Concluído" : `${Math.floor(progress.percent)}%`;
    setLiveText(statusNode, statusText);
    statusNode?.classList.toggle("is-running", !urgent && !progress.completed && !progress.defaulted);
    statusNode?.classList.toggle("is-urgent", urgent);
    statusNode?.classList.toggle("is-completed", progress.completed && !progress.defaulted);
    statusNode?.classList.toggle("is-defaulted", progress.defaulted);
    setLiveWidth(card.querySelector("[data-contract-dock-progress]"), progress.percent);
    const timeNode = card.querySelector("[data-contract-dock-time]");
    const timeValue = card.querySelector("[data-contract-dock-time-value]");
    if (timeNode) {
      timeNode.hidden = progress.completed || progress.defaulted;
      timeNode.classList.toggle("is-urgent", urgent);
      if (!progress.completed && !progress.defaulted) setLiveText(timeValue, engine.formatTime(contract.timeRemaining));
    }
    const effectiveReward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
    setLiveRewardValues(card.querySelector(".contract-dock-rewards"), {
      ...effectiveReward,
      xp: Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
    });

    card.classList.toggle("deadline-warning", urgent);
  });
}

function updateLiveContractsUI() {
  if (activeView !== "officeView" || activeOfficeTab !== "contracts") return;

  const signature = getContractsStructureSignature();
  if (signature !== lastContractsStructureSignature) {
    renderContracts();
    return;
  }

  (engine.state.activeContracts || []).forEach(contract => {
    const card = dom.activeContractList?.querySelector?.(`[data-contract-id="${CSS.escape(contract.id)}"]`);
    if (!card) return;
    const progress = engine.getContractProgress(contract);
    const urgent = !progress.completed && !progress.defaulted && Number(contract.timeRemaining) <= 30;
    const timeWrapper = card.querySelector("[data-contract-live-time]");
    const timeText = progress.defaulted ? "Vencido" : progress.completed ? "Concluído" : engine.formatTime(contract.timeRemaining);
    setLiveText(card.querySelector("[data-contract-live-time-value]"), timeText);
    timeWrapper?.classList.toggle("urgent", urgent);
    card.classList.toggle("contract-deadline-warning", urgent);
    setLiveText(card.querySelector("[data-contract-live-stock]"), engine.formatNumber(progress.stock));
    setLiveText(card.querySelector("[data-contract-live-delivered]"), `${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}`);
    setLiveWidth(card.querySelector("[data-contract-live-progress]"), progress.percent);

    const effectiveReward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
    setLiveRewardValues(card.querySelector(".contract-reward-strip"), {
      ...effectiveReward,
      xp: Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
    });

    const penaltyRoot = card.querySelector("[data-contract-live-penalty]");
    if (penaltyRoot) {
      const penalty = progress.defaulted ? progress.penaltyCoins : engine.calculateContractPenalty(contract);
      setLiveResourceValue(penaltyRoot, penalty);
    }
  });

  (engine.state.contractOffers || []).forEach(contract => {
    const card = dom.contractOfferList?.querySelector?.(`[data-contract-offer-id="${CSS.escape(contract.id)}"]`);
    if (!card) return;
    setLiveText(card.querySelector("[data-contract-offer-time-value]"), engine.formatTime(contract.timeRemaining));
    const stock = Math.max(0, Number(engine.state.crops[contract.cropId]?.stock) || 0);
    setLiveText(card.querySelector("[data-contract-offer-stock]"), engine.formatNumber(stock));
    const openSlots = Math.max(0, engine.getActiveContractSlotLimit() - (engine.state.activeContracts || []).length);
    const signButton = card.querySelector('[data-action="accept-contract"]');
    if (signButton) {
      signButton.disabled = openSlots < 1;
      setLiveText(signButton, openSlots < 1 ? "Sem vaga" : "Assinar");
    }
    const effectiveReward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
    setLiveRewardValues(card.querySelector(".contract-reward-strip"), {
      ...effectiveReward,
      xp: Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
    });
  });

  (engine.state.contractCooldowns || []).forEach(cooldown => {
    const key = contractCooldownKey(cooldown);
    const card = dom.contractOfferList?.querySelector?.(`[data-contract-cooldown-id="${CSS.escape(key)}"]`);
    if (!card) return;
    setLiveText(card.querySelector("[data-contract-cooldown-time]"), engine.formatTime(Math.max(0, Math.ceil(Number(cooldown.timeRemaining) || 0))));
  });
}

function updateLiveStockUI() {
  if (activeView !== "stockView") return;

  const totalCapacity = engine.getStorageCap();
  const storageUsed = engine.getStorageUsed();
  const storagePct = percent((storageUsed / Math.max(1, totalCapacity)) * 100);
  const allOwned = engine.data.crops.filter(crop => engine.state.crops[crop.id]?.owned);
  const totalValue = allOwned.reduce((sum, crop) => sum + (Number(engine.state.crops[crop.id]?.stock) || 0) * engine.getSalePrice(crop.id), 0);

  setLiveText(dom.stockSummary?.querySelector?.("[data-stock-summary-capacity]"), `${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}`);
  const status = dom.stockSummary?.querySelector?.("[data-stock-summary-status]");
  setLiveText(status, storagePct >= 100 ? "Cheio" : "Capacidade");
  status?.classList.toggle("full", storagePct >= 100);
  setLiveWidth(dom.stockSummary?.querySelector?.("[data-stock-summary-progress]"), storagePct);
  setLiveText(dom.stockSummary?.querySelector?.("[data-stock-summary-items]"), `${engine.formatNumber(storageUsed)} itens`);

  const sellAll = dom.stockSummary?.querySelector?.("[data-stock-sell-all]");
  if (sellAll) {
    sellAll.disabled = storageUsed <= 0;
    setLiveText(sellAll.querySelector("[data-stock-sell-all-label]"), storageUsed > 0 ? "Vender estoque" : "Estoque vazio");
    const value = sellAll.querySelector("[data-stock-sell-all-value]");
    if (value) value.hidden = storageUsed <= 0;
    setLiveResourceValue(value, totalValue);
  }

  const expandButton = dom.stockSummary?.querySelector?.('[data-action="expand-storage"]');
  if (expandButton) expandButton.disabled = engine.state.coins < engine.getDirectStorageExpansionCost();

  dom.stockGrid?.querySelectorAll?.("[data-stock-crop]").forEach(card => {
    const cropId = card.dataset.stockCrop;
    const cropState = engine.state.crops[cropId];
    if (!cropState?.owned) return;
    const price = engine.getSalePrice(cropId);
    setLiveText(card.querySelector("[data-stock-quantity]"), engine.formatNumber(cropState.stock));
    setLiveResourceValue(card.querySelector("[data-stock-unit-value]"), price);
    setLiveResourceValue(card.querySelector("[data-stock-total-value]"), cropState.stock * price);
    card.querySelectorAll('[data-action="sell-fraction"]').forEach(button => { button.disabled = cropState.stock <= 0; });
  });
}

function updateLiveOrdersUI() {
  if (activeView !== "officeView" || activeOfficeTab !== "orders") return;

  dom.orderList?.querySelectorAll?.("[data-order-crop]").forEach(card => {
    const cropId = card.dataset.orderCrop;
    const order = engine.getOrder(cropId);
    if (!order || order.complete) return;
    const stock = Math.max(0, Number(engine.state.crops[cropId]?.stock) || 0);
    const available = Math.min(stock, order.amount);
    const progress = percent((available / Math.max(1, order.amount)) * 100);
    const canDeliver = stock >= order.amount;

    setLiveText(card.querySelector("[data-order-live-description]"), canDeliver
      ? "Lote completo disponível no estoque. Entregue para receber a recompensa."
      : `Reúna ${engine.formatNumber(order.amount)} unidades no estoque. Faltam ${engine.formatNumber(Math.max(0, order.amount - stock))}.`);
    setLiveText(card.querySelector("[data-order-live-value]"), `${engine.formatNumber(available)} / ${engine.formatNumber(order.amount)}`);
    setLiveWidth(card.querySelector("[data-order-live-progress]"), progress);
    setLiveRewardValues(card.querySelector(".contract-reward-unified"), {
      coins: order.rewardCoins,
      research: order.rewardResearch,
      prestige: order.rewardPrestige,
      xp: Math.round(engine.getFarmXPAwardForRate(order.xpRate ?? GameEngine.ORDER_CLAIM_XP_RATE))
    });
    card.classList.toggle("order-ready-to-deliver", canDeliver);
    const action = card.querySelector("[data-order-live-action]");
    if (action) {
      action.disabled = !canDeliver;
      action.classList.toggle("primary", canDeliver);
      action.classList.toggle("secondary", !canDeliver);
    }
  });
}

function updateLiveMissionsUI() {
  if (activeView !== "profileView" || activeProfileTab !== "missions") return;

  dom.missionList?.querySelectorAll?.("[data-mission-id]").forEach(card => {
    const mission = engine.data.missions.find(item => item.id === card.dataset.missionId);
    if (!mission || engine.state.missionsClaimed[mission.id]) return;
    const value = engine.missionValue(mission.metric, mission);
    const completed = value >= mission.target;
    const progress = percent((value / Math.max(1, mission.target)) * 100);
    const cropGoal = ["cropUnlocked", "cropPurchased"].includes(mission.metric) ? engine.getCrop(mission.cropId) : null;
    if (cropGoal) {
      const isPurchaseGoal = mission.metric === "cropPurchased";
      setLiveText(card.querySelector("[data-mission-live-value]"), completed ? "Concluído" : (isPurchaseGoal ? "Pendente" : `Nível ${Math.max(1, Number(cropGoal.unlockLevel) || 1)}`));
    } else {
      setLiveText(card.querySelector("[data-mission-live-value]"), `${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}`);
    }
    setLiveWidth(card.querySelector("[data-mission-live-progress]"), progress);
    const action = card.querySelector("[data-mission-live-action]");
    if (action) {
      action.disabled = !completed;
      action.classList.toggle("primary", completed);
      action.classList.toggle("secondary", !completed);
    }
  });
}

function updateLivePrestigeDashboardUI() {
  if (activeView !== "profileView" || activeProfileTab !== "account" || !dom.prestigeDashboard) return;
  const breakdown = engine.getPrestigeBreakdown();
  const gain = breakdown.total;
  setLiveResourceValue(dom.prestigeDashboard.querySelector("[data-prestige-live-gain]"), gain);

  const totalCrops = Math.max(0, Number(breakdown.totalCrops) || engine.data.crops.length || 0);
  const totalOrderSteps = Math.max(0, Number(engine.data.orderSteps?.length) || 0);
  const completedOrders = totalOrderSteps > 0
    ? engine.data.crops.reduce((count, crop) => count + (Math.max(0, Math.floor(Number(engine.state.orders?.[crop.id]?.tier) || 0)) >= totalOrderSteps ? 1 : 0), 0)
    : 0;
  const values = {
    level: `${Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(engine.state.farmLevel) || 1)))} / ${GameEngine.MAX_FARM_LEVEL}`,
    owned: `${engine.formatNumber(breakdown.owned || 0)} / ${engine.formatNumber(totalCrops)}`,
    mastered: `${engine.formatNumber(breakdown.mastered || 0)} / ${engine.formatNumber(totalCrops)}`,
    orders: `${engine.formatNumber(completedOrders)} / ${engine.formatNumber(totalCrops)}`
  };
  Object.entries(values).forEach(([key, value]) => setLiveText(dom.prestigeDashboard.querySelector(`[data-prestige-live-driver="${key}"]`), value));
  const action = dom.prestigeDashboard.querySelector("[data-prestige-live-action]");
  if (action) action.disabled = gain < 1;
}

function updateLiveStatsUI() {
  if (activeView !== "profileView" || activeProfileTab !== "account") return;
  const stats = engine.state.stats;
  const values = {
    lifetimeCoins: stats.lifetimeCoins,
    lifetimeHarvested: stats.lifetimeHarvested,
    lifetimeSold: stats.lifetimeSold,
    lifetimeContractsCompleted: stats.lifetimeContractsCompleted,
    lifetimeOrdersCompleted: stats.lifetimeOrdersCompleted,
    prestiges: stats.prestiges,
    maxFarmLevel: stats.maxFarmLevel,
    lifetimeCropPrestiges: stats.lifetimeCropPrestiges || 0,
    maxStorageUsed: stats.maxStorageUsed,
    maxCoinsHeld: stats.maxCoinsHeld
  };
  Object.entries(values).forEach(([key, value]) => {
    const card = dom.lifetimeStats?.querySelector?.(`[data-stat-live="${key}"]`) || dom.recordStats?.querySelector?.(`[data-stat-live="${key}"]`);
    const target = card?.querySelector?.("[data-stat-live-value]");
    if (!target) return;
    if (key === "lifetimeCoins" || key === "maxCoinsHeld") setLiveResourceValue(target, value);
    else if (key === "lifetimeCropPrestiges") {
      const mastered = engine.data.crops.filter(crop => Number(engine.state.crops?.[crop.id]?.level || 0) >= GameEngine.MAX_CROP_LEVEL).length;
      setLiveText(target, `${engine.formatNumber(mastered)} / ${engine.formatNumber(engine.data.crops.length)}`);
    } else setLiveText(target, engine.formatNumber(value));
  });

  const researchLevels = engine.data.research.reduce((sum, item) => sum + Math.max(0, Number(engine.state.researchTechs[item.id]) || 0), 0);
  const totalResearchLevels = engine.data.research.reduce((sum, item) => sum + Math.max(0, Number(item.max) || 0), 0);
  const legacyLevels = engine.data.prestigeUpgrades.reduce((sum, item) => sum + Math.max(0, Number(engine.state.prestigeUpgrades[item.id]) || 0), 0);
  const totalLegacyLevels = engine.data.prestigeUpgrades.reduce((sum, item) => sum + Math.max(0, Number(item.max) || 0), 0);
  const claimed = engine.data.missions.filter(mission => engine.state.missionsClaimed[mission.id]).length;
  setLiveText(dom.achievementSummary?.querySelector?.('[data-achievement-live="researchLevels"]'), `${engine.formatNumber(researchLevels)} / ${engine.formatNumber(totalResearchLevels)} níveis`);
  setLiveText(dom.achievementSummary?.querySelector?.('[data-achievement-live="legacyLevels"]'), `${engine.formatNumber(legacyLevels)} / ${engine.formatNumber(totalLegacyLevels)} níveis`);
  setLiveText(dom.achievementSummary?.querySelector?.('[data-achievement-live="missionsClaimed"]'), `${claimed} / ${engine.data.missions.length}`);
}

function updateLiveNavigationBadges() {
  const readyContracts = engine.isContractsUnlocked() ? engine.getReadyContractCount() : 0;
  const readyOrders = engine.isOrdersUnlocked() ? engine.getReadyOrderCount() : 0;
  const readyMissions = engine.getReadyMissionCount();
  if (dom.contractTabCount) {
    setLiveText(dom.contractTabCount, readyContracts);
    dom.contractTabCount.hidden = readyContracts < 1;
  }
  if (dom.orderTabCount) {
    setLiveText(dom.orderTabCount, readyOrders);
    dom.orderTabCount.hidden = readyOrders < 1;
  }
  if (dom.missionTabCount) {
    setLiveText(dom.missionTabCount, readyMissions);
    dom.missionTabCount.hidden = readyMissions < 1;
  }
}


function updateLiveContractsPulse(now = performance.now(), force = false) {
  if (!engine || document.hidden) return;
  const interval = getPerformanceProfile().liveContractsInterval;
  if (!force && now - lastLiveContractsUpdate < interval) return;
  lastLiveContractsUpdate = now;

  // Apenas patches pontuais: cronômetros, progresso, quantidades, estados e
  // recompensas. setLiveText/setLiveWidth evitam qualquer escrita se nada mudou.
  updateLiveContractDockUI();
  updateLiveContractsUI();
}

function updateLiveGameUI(now = performance.now(), force = false) {
  if (!engine || document.hidden) return;
  const interval = getPerformanceProfile().livePanelInterval;
  if (!force && now - lastLivePanelUpdate < interval) return;
  lastLivePanelUpdate = now;

  // Globais: somente números/badges. Contratos têm pulso independente acima.
  updateLiveNavigationBadges();

  // Cada view atualiza apenas os seus pequenos campos mutáveis.
  updateLiveStockUI();
  updateLiveOrdersUI();
  updateLiveMissionsUI();
  updateLivePrestigeDashboardUI();
  updateLiveStatsUI();

  if (activeView === "officeView" && activeOfficeTab === "evolutions") {
    updateEvolutionAffordability("research");
    updateEvolutionAffordability("prestige");
  }
}
