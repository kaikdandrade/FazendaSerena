"use strict";
  function renderContractDock() {
    const contracts = engine.state.activeContracts || [];
    if (!contracts.length || !engine.isContractsUnlocked()) {
      dom.contractDock.classList.remove("visible", "collapsed");
      dom.contractDock.innerHTML = "";
      return;
    }
    const slotLimit = engine.getActiveContractSlotLimit();
    dom.contractDock.classList.add("visible");
    dom.contractDock.classList.toggle("collapsed", contractDockCollapsed);
    const toggleLabel = contractDockCollapsed ? "Expandir contratos" : "Recolher contratos";
    if (contractDockCollapsed) {
      dom.contractDock.innerHTML = `<button class="contract-dock-compact-button" type="button" data-action="toggle-contract-dock" aria-label="${toggleLabel}" title="${toggleLabel}"><img src="assets/icons/contrato-agricola.webp" alt=""><b>${contracts.length}</b></button>`;
      return;
    }
    dom.contractDock.innerHTML = `<section class="contract-dock-panel contract-dock-v2">
      <header class="contract-dock-header"><button type="button" data-go-office-contracts><img src="assets/icons/contrato-agricola.webp" alt=""><span><strong>Contratos</strong><small>${contracts.length}/${slotLimit} ativos</small></span></button><button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock" aria-label="${toggleLabel}" title="${toggleLabel}"><img src="assets/icons/seta-cima.webp" alt=""></button></header>
      <div class="contract-dock-list">${contracts.map(contract => {
        const crop = engine.getCrop(contract.cropId);
        const company = engine.getCompany(contract.companyId);
        const progress = engine.getContractProgress(contract);
        const urgent = !progress.completed && !progress.defaulted && contract.timeRemaining <= 30;
        const actionAttributes = `data-go-office-contracts data-focus-contract="${escapeHtml(contract.id)}" title="Abrir este contrato"`;
        const state = progress.defaulted ? "Contrato vencido" : progress.completed ? "Recompensa pronta" : engine.formatTime(contract.timeRemaining);
        return `<button class="contract-dock-item contract-dock-item-v2 ${urgent ? "deadline-warning" : ""} ${progress.completed ? "reward-ready" : ""} ${progress.defaulted ? "contract-defaulted" : ""}" type="button" ${actionAttributes}><img class="contract-dock-crop" src="${crop.image}" alt="${escapeHtml(crop.name)}"><span class="contract-dock-copy"><span class="contract-dock-title-line"><strong>${escapeHtml(crop.name)}</strong><small>${Math.floor(progress.percent)}%</small></span><em>${escapeHtml(company.name)}</em><i><b class="delivered" style="width:${percent(progress.percent)}%"></b></i><u>${state}</u></span></button>`;
      }).join("")}</div>
    </section>`;
  }

  function renderContracts() {
    const hasCrops = Array.isArray(engine.data.crops) && engine.data.crops.length > 0;
    const hasCompanies = Array.isArray(engine.data.companies) && engine.data.companies.length > 0;
    const hasContractTypes = Array.isArray(engine.data.contractTypes) && engine.data.contractTypes.length > 0;
    if (!hasCrops && !engine.state.activeContracts.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo. Os contratos serão liberados automaticamente depois que o catálogo for configurado.")}</div>`; return; }
    if (!hasCompanies && !engine.state.activeContracts.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractCompaniesCatalog", "Nenhuma indústria foi publicada no catálogo administrativo. As propostas comerciais aparecerão depois que o catálogo for configurado.")}</div>`; return; }
    if (!hasContractTypes && !engine.state.activeContracts.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractTypesCatalog", "Nenhum tipo de contrato foi publicado no catálogo administrativo. Cadastre pelo menos um tipo para começar a gerar propostas.")}</div>`; return; }
    const eligible = engine.getContractEligibleCrops();
    if (!eligible.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractOwnedCrops", "Compre uma cultura para começar a receber oportunidades comerciais.")}</div>`; return; }

    engine.ensureContractOffers();
    const active = engine.state.activeContracts;
    const offers = engine.state.contractOffers;
    const cooldowns = engine.state.contractCooldowns || [];
    const slotLimit = engine.getActiveContractSlotLimit();
    const openSlots = Math.max(0, slotLimit - active.length);
    const contractXPReward = contract => Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE));
    const contractStyle = contract => {
      const type = engine.getContractDifficulty(contract.difficulty);
      const color = contract.typeColor || type?.color || "#6b9870";
      const alpha = Math.max(4, Math.min(28, Number(type?.colorAlpha) || 12));
      const cardAlpha = Math.max(3, Math.min(14, Math.round(alpha * 0.55)));
      return `style="--contract-type-color:${escapeHtml(color)};--contract-type-alpha:${alpha}%;--contract-card-alpha:${cardAlpha}%"`;
    };
    const typeBadge = contract => `<span class="contract-type-label"><i aria-hidden="true"></i>${escapeHtml(engine.getContractDifficulty(contract.difficulty)?.label || "Contrato")}</span>`;
    const stockChip = amount => `<span class="contract-stock-chip" title="Quantidade disponível no estoque"><img src="assets/icons/galpao-industrial.webp" alt=""><b>${engine.formatNumber(amount)}</b></span>`;
    const rewardStrip = contract => `<div class="contract-reward-strip"><span>Recompensa</span><strong>${resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige, xp: contractXPReward(contract) })}</strong></div>`;
    const progressBlock = (contract, progress) => `<div class="contract-progress-v2"><div><span>Entregue</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track"><span style="width:${percent(progress.percent)}%"></span></div></div>`;

    const slotSummary = `<article class="contract-capacity-v2"><div><img src="assets/icons/contrato-agricola.webp" alt=""><span><small>Contratos ativos</small><strong>${active.length} de ${slotLimit}</strong></span></div><b class="${openSlots ? "available" : "full"}">${openSlots ? `${openSlots} ${openSlots === 1 ? "vaga" : "vagas"}` : "Lotado"}</b></article>`;

    const activeCards = active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const progress = engine.getContractProgress(contract);
      const urgent = !progress.completed && !progress.defaulted && contract.timeRemaining <= 30;
      const head = `<header class="contract-card-header-v2"><div class="contract-company-v2"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-time-v2 ${urgent ? "urgent" : ""}"><img src="assets/icons/relogio.webp" alt="">${progress.defaulted ? "Vencido" : progress.completed ? "Concluído" : engine.formatTime(contract.timeRemaining)}</span></header>`;
      const main = `<div class="contract-main-v2"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${typeBadge(contract)}<h3>${engine.formatNumber(contract.amount)} <span>${escapeHtml(crop.name)}</span></h3><div class="contract-main-meta"><span>Estoque</span>${stockChip(progress.stock)}</div></div></div>`;
      if (progress.defaulted) {
        return `<article class="contract-card contract-card-v2 contract-defaulted-card" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${progressBlock(contract, progress)}<div class="contract-penalty-v2"><span>Multa</span><strong>${resourceAmount("coins", -progress.penaltyCoins)}</strong></div><button class="button danger full" type="button" data-action="pay-contract-penalty" data-id="${contract.id}">Pagar multa</button></article>`;
      }
      if (progress.completed) {
        return `<article class="contract-card contract-card-v2 contract-completed-card" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${rewardStrip(contract)}<button class="button gold full" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button></article>`;
      }
      const fine = Math.max(1, Math.ceil(Number(contract.penaltyCoins) || contract.rewardCoins * 1.20));
      return `<article class="contract-card contract-card-v2 ${urgent ? "contract-deadline-warning" : ""}" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${progressBlock(contract, progress)}${rewardStrip(contract)}<footer class="contract-card-footer-v2"><button class="button secondary" type="button" data-action="break-contract" data-id="${contract.id}" title="Sujeito a multa de ${engine.formatNumber(fine)} moedas">Quebrar contrato</button></footer></article>`;
    });
    dom.activeContractList.innerHTML = [slotSummary, ...activeCards].join("");

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const stock = engine.state.crops[contract.cropId]?.stock || 0;
      return `<article class="contract-card contract-card-v2 contract-offer-card" ${contractStyle(contract)}><header class="contract-card-header-v2"><div class="contract-company-v2"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-time-v2"><img src="assets/icons/relogio.webp" alt="">${engine.formatTime(contract.timeRemaining)}</span></header><div class="contract-main-v2"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${typeBadge(contract)}<h3>${engine.formatNumber(contract.amount)} <span>${escapeHtml(crop.name)}</span></h3><div class="contract-main-meta"><span>Estoque</span>${stockChip(stock)}</div></div></div>${rewardStrip(contract)}<footer class="contract-offer-actions-v2"><button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Sem vaga" : "Assinar"}</button><button class="button secondary" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button></footer></article>`;
    });
    const cooldownCards = cooldowns.map(item => {
      const seconds = Math.max(0, Math.ceil(Number(item.timeRemaining) || 0));
      const progress = percent((1 - seconds / Math.max(1, item.durationSeconds)) * 100);
      return `<article class="contract-card contract-card-v2 contract-cooldown-card"><div class="contract-cooldown-v2"><img src="assets/icons/renovar-contrato.webp" alt=""><div><small>Renovando contrato...</small><strong>${engine.formatTime(seconds)}</strong></div></div><div class="progress-track"><span style="width:${progress}%"></span></div></article>`;
    });
    const availableCards = [...offerCards, ...cooldownCards];
    dom.contractOfferList.innerHTML = availableCards.length ? availableCards.join("") : `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractRenewal", "As propostas estão em renovação. Aguarde o término dos intervalos.")}</div>`;
  }

  function renderOrders() {
    const setCompletedOrderBoardVisible = visible => {
      if (dom.completedOrderBoard) dom.completedOrderBoard.hidden = !visible;
    };

    if (!engine.data.orderSteps.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyOrdersCatalog", "Nenhuma etapa de pedido foi publicada no catálogo administrativo.")}</div>`;
      setCompletedOrderBoardVisible(false);
      dom.completedOrderList.innerHTML = "";
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "";
      return;
    }

    if (!engine.isOrdersUnlocked()) {
      dom.orderList.innerHTML = featureGateMarkup({
        eyebrow: "prévia do escritório",
        title: `Pedidos liberam no nível ${GameEngine.ORDER_UNLOCK_LEVEL}`,
        description: "Esta área já pode ser consultada. As entregas e recompensas começam quando sua fazenda atingir o nível necessário.",
        level: GameEngine.ORDER_UNLOCK_LEVEL
      });
      setCompletedOrderBoardVisible(false);
      dom.completedOrderList.innerHTML = "";
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "";
      return;
    }

    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyOrdersOwnedCrops", "Compre uma cultura para iniciar sua primeira sequência de pedidos.")}</div>`;
      setCompletedOrderBoardVisible(false);
      dom.completedOrderList.innerHTML = "";
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "";
      return;
    }

    const completedCrops = owned.filter(crop => engine.getOrder(crop.id)?.complete);
    setCompletedOrderBoardVisible(completedCrops.length > 0);
    const activeCrops = owned
      .filter(crop => !engine.getOrder(crop.id)?.complete)
      .sort((cropA, cropB) => {
        const orderA = engine.getOrder(cropA.id);
        const orderB = engine.getOrder(cropB.id);
        const stockA = Math.max(0, Number(engine.state.crops[cropA.id]?.stock) || 0);
        const stockB = Math.max(0, Number(engine.state.crops[cropB.id]?.stock) || 0);
        const readyA = stockA >= orderA.amount;
        const readyB = stockB >= orderB.amount;
        if (readyA !== readyB) return readyA ? -1 : 1;
        const progressA = stockA / Math.max(1, orderA.amount);
        const progressB = stockB / Math.max(1, orderB.amount);
        if (progressA !== progressB) return progressB - progressA;
        return (Number(cropA.unlockLevel) || 0) - (Number(cropB.unlockLevel) || 0);
      });
    dom.orderList.innerHTML = activeCrops.map(crop => {
      const order = engine.getOrder(crop.id);
      const stock = Math.max(0, Number(engine.state.crops[crop.id].stock) || 0);
      const available = Math.min(stock, order.amount);
      const progress = percent((available / order.amount) * 100);
      const canDeliver = stock >= order.amount;
      return `<article class="order-card normalized-order-card ${canDeliver ? "order-ready-to-deliver" : ""}">
        <div class="order-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Etapa ${order.tier + 1} de ${order.totalTiers}</small><h3>${escapeHtml(crop.name)}</h3></div></div></div>
        <p>${canDeliver ? "Lote completo disponível no estoque. Entregue para receber a recompensa." : `Reúna ${engine.formatNumber(order.amount)} unidades no estoque. Faltam ${engine.formatNumber(order.remaining)}.`}</p>
        <div class="order-progress"><div class="progress-label"><span>Disponível no estoque</span><strong>${engine.formatNumber(available)} / ${engine.formatNumber(order.amount)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
        <div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: order.rewardCoins, research: order.rewardResearch, prestige: order.rewardPrestige, xp: Math.round(engine.getFarmXPAwardForRate(order.xpRate ?? GameEngine.ORDER_CLAIM_XP_RATE)) })}</strong></div>
        <button class="button ${canDeliver ? "primary" : "secondary"} full" type="button" data-action="deliver-order" data-crop="${crop.id}" ${canDeliver ? "" : "disabled"}>Entregar pedido</button>
      </article>`;
    }).join("") || `<div class="empty-state office-empty">${runtimeTextHtml("emptyOrdersComplete", "Todas as séries de pedidos foram concluídas.")}</div>`;

    dom.completedOrderList.innerHTML = completedCrops.map(crop => {
      const category = engine.data.categories[crop.category];
      return `<article class="order-card order-complete compact-completed-order">
        <div class="completed-order-identity"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3><p>${escapeHtml(category)}</p></div></div>
        <strong class="completed-order-status">Pedido finalizado</strong>
      </article>`;
    }).join("");

    if (dom.completedOrderCount) dom.completedOrderCount.textContent = completedCrops.length
      ? `${completedCrops.length} ${completedCrops.length === 1 ? "cultura finalizou" : "culturas finalizaram"} todos os pedidos.`
      : "";
  }

  function rewardHtml(reward) {
    return resourceRewards(reward) || "";
  }

  function renderMissions() {
    if (!engine.data.missions.length) {
      dom.missionList.innerHTML = `<div class="empty-state">${runtimeTextHtml("emptyMissionsCatalog", "Nenhuma missão foi publicada no catálogo administrativo.")}</div>`;
      if (dom.toggleCompletedMissions) dom.toggleCompletedMissions.hidden = true;
      if (dom.completedMissionCount) dom.completedMissionCount.textContent = "";
      return;
    }
    const activeMissions = engine.getActiveMissions();
    const claimedMissions = engine.data.missions.filter(mission => engine.state.missionsClaimed[mission.id]);
    const list = showCompletedMissions ? [...activeMissions, ...claimedMissions] : activeMissions;
    dom.missionList.innerHTML = list.map(mission => {
      const value = engine.missionValue(mission.metric, mission);
      const completed = value >= mission.target;
      const claimed = Boolean(engine.state.missionsClaimed[mission.id]);
      const progress = percent((value / mission.target) * 100);
      const seriesMissions = engine.data.missions.filter(item => (item.series || item.id) === (mission.series || mission.id));
      const stage = mission.stage || 1;
      return `<article class="mission-card ${claimed ? "claimed" : ""}">
        <div class="mission-head"><div><span class="mission-stage-label">Série ${stage} de ${seriesMissions.length}</span><h3>${escapeHtml(mission.title)}</h3><p>${enrichResourceText(mission.desc)}</p></div></div>
        <div class="mission-progress"><div class="progress-label"><span>Progresso acumulado</span><strong>${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span><strong class="resource-reward-group">${rewardHtml(mission.reward)}</strong></div>
        ${claimed ? `<div class="mission-claimed-mark">✓ Recompensa recebida</div>` : `<button class="button ${completed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" ${completed ? "" : "disabled"}>Receber recompensa</button>`}
      </article>`;
    }).join("") || `<div class="empty-state">${runtimeTextHtml("emptyMissionsComplete", "Todas as séries de missões foram concluídas.")}</div>`;
    if (dom.toggleCompletedMissions) {
      dom.toggleCompletedMissions.hidden = claimedMissions.length === 0;
      dom.toggleCompletedMissions.textContent = showCompletedMissions ? "Ocultar missões concluídas" : "Mostrar missões concluídas";
      dom.toggleCompletedMissions.setAttribute("aria-expanded", String(showCompletedMissions));
    }
    if (dom.completedMissionCount) dom.completedMissionCount.textContent = claimedMissions.length
      ? `${claimedMissions.length} de ${engine.data.missions.length} séries concluídas na conta.`
      : runtimeText("emptyMissionHistory", "Nenhuma missão concluída ainda.");
  }

