"use strict";

 // 39 — camada de atualização incremental.
// Nada aqui recria imagens, cards ou grids durante o loop normal. A montagem
// estrutural continua nas funções render* e só é acionada quando a estrutura
// realmente muda (ex.: contrato termina, propostas são atualizadas ou ação do jogador).

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
  return progress.completed ? "completed" : "running";
}


function getContractsStructureSignature() {
  if (!engine) return "";
  const board = (engine.getContractBoardEntries?.() || [
    ...(engine.state.activeContracts || []),
    ...(engine.state.contractOffers || [])
  ]).map(contract => {
    const active = (engine.state.activeContracts || []).some(item => item.id === contract.id);
    const state = active ? contractStatus(contract) : String(contract.boardStatus || "offer");
    return `${contract.id}:${state}:${Number(contract.boardOrder) || 0}`;
  }).join("|");
  return `${engine.isContractsUnlocked() ? 1 : 0};slots:${engine.getActiveContractSlotLimit()};board:${board}`;
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
    const statusNode = card.querySelector("[data-contract-dock-percent]");
    const statusText = progress.completed ? "Concluído" : `${Math.floor(progress.percent)}%`;
    setLiveText(statusNode, statusText);
    statusNode?.classList.toggle("is-running", !progress.completed);
    statusNode?.classList.toggle("is-completed", progress.completed);
    setLiveWidth(card.querySelector("[data-contract-dock-progress]"), progress.percent);
    const timeNode = card.querySelector("[data-contract-dock-time]");
    const timeValue = card.querySelector("[data-contract-dock-time-value]");
    if (timeNode) {
      timeNode.hidden = progress.completed;
      if (!progress.completed) setLiveText(timeValue, engine.formatTime(contract.timeRemaining));
    }
    const effectiveReward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
    setLiveRewardValues(card.querySelector(".contract-dock-rewards"), {
      ...effectiveReward,
      xp: Math.round(engine.getContractFrozenXPReward?.(contract) ?? engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
    });

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
    const card = dom.contractOfferList?.querySelector?.(`[data-contract-id="${CSS.escape(contract.id)}"]`);
    if (!card) return;
    const progress = engine.getContractProgress(contract);
    const timeText = progress.completed ? "Concluído" : engine.formatTime(contract.timeRemaining);
    setLiveText(card.querySelector("[data-contract-live-time-value]"), timeText);
    setLiveText(card.querySelector("[data-contract-live-delivered]"), engine.formatNumber(progress.delivered));
    progress.items.forEach(item => setLiveText(card.querySelector(`[data-contract-live-item-delivered="${CSS.escape(item.cropId)}"]`), engine.formatNumber(item.delivered)));
    setLiveWidth(card.querySelector("[data-contract-live-progress]"), progress.percent);
    setLiveText(card.querySelector("[data-contract-live-fill]"), `${Math.floor(progress.percent)}%`);

    const effectiveReward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
    setLiveRewardValues(card.querySelector(".contract-reward-strip"), {
      ...effectiveReward,
      xp: Math.round(engine.getContractFrozenXPReward?.(contract) ?? engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
    });

    const penaltyRoot = card.querySelector("[data-contract-live-penalty]");
    if (penaltyRoot) {
      const penalty = engine.calculateContractPenalty(contract);
      setLiveResourceValue(penaltyRoot, penalty);
    }
  });

  (engine.state.contractOffers || []).filter(contract => (contract.boardStatus || "offer") === "offer").forEach(contract => {
    const card = dom.contractOfferList?.querySelector?.(`[data-contract-offer-id="${CSS.escape(contract.id)}"]`);
    if (!card) return;
    const openSlots = Math.max(0, engine.getActiveContractSlotLimit() - (engine.state.activeContracts || []).length);
    const signButton = card.querySelector('[data-action="accept-contract"]');
    if (signButton) {
      signButton.disabled = openSlots < 1;
      setLiveText(signButton, "Assinar");
    }
    const effectiveReward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
    setLiveRewardValues(card.querySelector(".contract-reward-strip"), {
      ...effectiveReward,
      xp: Math.round(engine.getContractFrozenXPReward?.(contract) ?? engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
    });
  });

  const capacity = dom.contractCapacitySummary?.querySelector?.(".contract-capacity-compact strong");
  if (capacity) setLiveText(capacity, `${(engine.state.activeContracts || []).length}/${engine.getActiveContractSlotLimit()}`);

  const refreshButton = document.getElementById("refreshContractsButton");
  if (refreshButton) {
    const seconds = Math.max(0, Math.ceil(Number(engine.state.contractRefreshCooldownRemaining) || 0));
    refreshButton.disabled = seconds > 0;
    setLiveText(refreshButton.querySelector("[data-contract-refresh-label]"), seconds > 0 ? `Atualizar contratos (${seconds}s)` : "Atualizar contratos");
  }
}

function updateLiveMissionsUI() {
  if (activeView !== "profileView" || activeProfileTab !== "account") return;

  dom.missionList?.querySelectorAll?.("[data-mission-id]").forEach(card => {
    const mission = engine.data.missions.find(item => item.id === card.dataset.missionId);
    if (!mission || engine.state.missionsClaimed[mission.id]) return;
    const value = engine.missionValue(mission.metric, mission);
    const completed = value >= mission.target;
    const progress = percent((value / Math.max(1, mission.target)) * 100);
    const cropGoal = ["cropUnlocked", "cropPurchased"].includes(mission.metric) ? engine.getCrop(mission.cropId) : null;
    if (mission.metric === "cropPurchased") {
      setLiveText(card.querySelector("[data-mission-live-value]"), `${engine.formatNumber(Math.min(value, 1))} / 1`);
    } else if (cropGoal) {
      setLiveText(card.querySelector("[data-mission-live-value]"), completed ? "Concluído" : `Nível ${Math.max(1, Number(cropGoal.unlockLevel) || 1)}`);
    } else {
      setLiveText(card.querySelector("[data-mission-live-value]"), formatMissionMetricProgress(mission, value));
    }
    setLiveWidth(card.querySelector("[data-mission-live-progress]"), progress);
    const slot = card.querySelector("[data-mission-claim-slot]");
    let action = card.querySelector("[data-mission-live-action]");
    if (completed && !action && slot) {
      slot.innerHTML = `<button class="button primary full" type="button" data-action="claim-mission" data-id="${mission.id}" data-mission-live-action>Receber recompensa</button>`;
      action = slot.querySelector("[data-mission-live-action]");
    }
    if (!completed && action) action.remove();
  });
}

function updateLivePrestigeDashboardUI() {
  if (activeView !== "profileView" || activeProfileTab !== "account" || !dom.prestigeDashboard) return;
  const breakdown = engine.getPrestigeBreakdown();
  const gain = breakdown.total;
  setLiveResourceValue(dom.prestigeDashboard.querySelector("[data-prestige-live-gain]"), gain);

  const totalCrops = Math.max(0, Number(breakdown.totalCrops) || engine.data.crops.length || 0);
  const values = {
    level: `${Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(engine.state.farmLevel) || 1)))} / ${GameEngine.MAX_FARM_LEVEL}`,
    research: `${engine.formatNumber(breakdown.researchAcquired || 0)} / ${engine.formatNumber(breakdown.totalResearch || 0)}`,
    owned: `${engine.formatNumber(breakdown.owned || 0)} / ${engine.formatNumber(totalCrops)}`,
    mastered: `${engine.formatNumber(breakdown.mastered || 0)} / ${engine.formatNumber(totalCrops)}`,
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
    prestiges: stats.prestiges,
    maxFarmLevel: stats.maxFarmLevel,
    lifetimeCropPrestiges: stats.lifetimeCropPrestiges || 0,
    maxCoinsHeld: stats.maxCoinsHeld,
    totalPlaySeconds: stats.totalPlaySeconds || 0,
    maxOnlineSessionSeconds: stats.maxOnlineSessionSeconds || 0
  };
  Object.entries(values).forEach(([key, value]) => {
    const card = dom.lifetimeStats?.querySelector?.(`[data-stat-live="${key}"]`) || dom.recordStats?.querySelector?.(`[data-stat-live="${key}"]`);
    const target = card?.querySelector?.("[data-stat-live-value]");
    if (!target) return;
    if (key === "lifetimeCoins" || key === "maxCoinsHeld") setLiveResourceValue(target, value);
    else if (key === "totalPlaySeconds" || key === "maxOnlineSessionSeconds") setLiveText(target, formatGameplayDuration(value));
    else if (key === "lifetimeCropPrestiges") {
      const mastered = engine.data.crops.filter(crop => Number(engine.state.crops?.[crop.id]?.level || 0) >= GameEngine.MAX_CROP_LEVEL).length;
      setLiveText(target, `${engine.formatNumber(mastered)} / ${engine.formatNumber(engine.data.crops.length)}`);
    } else setLiveText(target, engine.formatNumber(value));
  });

  const researchLevels = engine.data.research.reduce((sum, item) => sum + Math.max(0, Number(engine.state.researchTechs[item.id]) || 0), 0);
  const totalResearchLevels = engine.data.research.reduce((sum, item) => sum + Math.max(0, Number(item.max) || 0), 0);
  const legacyLevels = engine.data.prestigeUpgrades.reduce((sum, item) => sum + Math.max(0, Number(engine.state.prestigeUpgrades[item.id]) || 0), 0);
  const totalLegacyLevels = engine.data.prestigeUpgrades.reduce((sum, item) => sum + Math.max(0, Number(item.max) || 0), 0);
  setLiveText(dom.achievementSummary?.querySelector?.('[data-achievement-live="researchLevels"]'), `${engine.formatNumber(researchLevels)} / ${engine.formatNumber(totalResearchLevels)} níveis`);
  setLiveText(dom.achievementSummary?.querySelector?.('[data-achievement-live="legacyLevels"]'), `${engine.formatNumber(legacyLevels)} / ${engine.formatNumber(totalLegacyLevels)} níveis`);
}

function updateLiveNavigationBadges() {
  const readyContracts = engine.isContractsUnlocked() ? engine.getReadyContractCount() : 0;
  const readyMissions = engine.getReadyMissionCount();
  setNavigationAttention("contracts", readyContracts > 0);
  setNavigationAttention("profile", readyMissions > 0);
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
  updateLiveMissionsUI();
  updateLivePrestigeDashboardUI();
  updateLiveStatsUI();

  if (activeView === "officeView" && activeOfficeTab === "evolutions") {
    updateEvolutionAffordability("research");
    updateEvolutionAffordability("prestige");
  }
}
