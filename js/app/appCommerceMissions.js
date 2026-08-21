"use strict";

  function renderContractDock() {
    const previousList = dom.contractDock?.querySelector?.(".contract-dock-list");
    const previousScrollTop = Math.max(0, Number(previousList?.scrollTop) || 0);
    const contracts = engine.state.activeContracts || [];

    if (!contracts.length || !engine.isContractsUnlocked()) {
      dom.contractDock.classList.remove("visible", "collapsed");
      if (dom.contractDock.childElementCount) dom.contractDock.replaceChildren();
      markContractDockStructureRendered?.();
      return;
    }

    dom.contractDock.classList.add("visible");
    dom.contractDock.classList.toggle("collapsed", contractDockCollapsed);
    const toggleLabel = contractDockCollapsed ? "Expandir contratos" : "Recolher contratos";

    if (contractDockCollapsed) {
      const compact = dom.contractDock.querySelector(".contract-dock-compact-button");
      if (!compact || dom.contractDock.children.length !== 1) {
        dom.contractDock.innerHTML = `<button class="contract-dock-compact-button" type="button" data-action="toggle-contract-dock" aria-label="${toggleLabel}" title="${toggleLabel}"><img src="assets/icons/contrato-agricola.webp" alt=""><b data-contract-dock-count>${contracts.length}</b></button>`;
      } else {
        compact.setAttribute("aria-label", toggleLabel);
        compact.title = toggleLabel;
        setLiveText?.(compact.querySelector("[data-contract-dock-count]"), contracts.length);
      }
      markContractDockStructureRendered?.();
      return;
    }

    if (!dom.contractDock.querySelector(".contract-dock-panel.contract-dock-v2")) {
      dom.contractDock.innerHTML = `<section class="contract-dock-panel contract-dock-v2">
        <header class="contract-dock-header"><button type="button" data-go-office-contracts><img src="assets/icons/contrato-agricola.webp" alt=""><span><strong>Contratos ativos</strong><small>Acompanhe suas entregas</small></span></button><button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock"><img src="assets/icons/seta-cima.webp" alt=""></button></header>
        <div class="contract-dock-list"></div>
      </section>`;
    }

    const collapse = dom.contractDock.querySelector(".contract-dock-collapse-toggle");
    if (collapse) {
      collapse.setAttribute("aria-label", toggleLabel);
      collapse.title = toggleLabel;
    }

    const dockReward = contract => {
      const reward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
      return resourceRewards({
        coins: reward.coins,
        research: reward.research,
        prestige: reward.prestige,
        xp: Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
      });
    };

    const listHtml = contracts.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const progress = engine.getContractProgress(contract);
      const urgent = !progress.completed && !progress.defaulted && contract.timeRemaining <= 30;
      const canClaim = progress.completed && !progress.defaulted;
      const actionAttributes = `data-go-office-contracts data-focus-contract="${escapeHtml(contract.id)}" data-contract-dock-behavior="${canClaim ? "claim" : "navigate"}" title="${canClaim ? "Contrato concluído" : "Abrir este contrato"}"`;
      const statusText = progress.defaulted ? "Contrato vencido" : progress.completed ? "Concluído" : `${Math.floor(progress.percent)}%`;
      const stateClass = progress.defaulted ? "is-defaulted" : progress.completed ? "is-completed" : urgent ? "is-urgent" : "is-running";
      const timeMarkup = progress.completed || progress.defaulted ? "" : `<span class="contract-dock-time ${urgent ? "is-urgent" : ""}" data-contract-dock-time><img src="assets/icons/relogio.webp" alt=""><b data-contract-dock-time-value>${engine.formatTime(contract.timeRemaining)}</b></span>`;
      const type = engine.getContractDifficulty(contract.difficulty);
      const contractColor = contract.typeColor || type?.color || "#6b9870";
      const renderState = `${progress.defaulted ? "defaulted" : progress.completed ? "completed" : "running"}|${engine.state.settings.numberFormat || "brazilian"}`;
      return `<button class="contract-dock-item contract-dock-item-v2 ${urgent ? "deadline-warning" : ""} ${progress.completed ? "reward-ready" : ""} ${progress.defaulted ? "contract-defaulted" : ""}" style="--contract-type-color:${escapeHtml(contractColor)}" type="button" data-live-render-key="dock:${escapeHtml(contract.id)}" data-live-render-signature="${escapeHtml(renderState)}" data-contract-dock-id="${escapeHtml(contract.id)}" ${actionAttributes}><span class="contract-dock-crop-shell"><img class="contract-dock-crop" src="${crop.image}" alt="${escapeHtml(crop.name)}"></span><span class="contract-dock-copy"><span class="contract-dock-title-line"><strong>${escapeHtml(crop.name)}</strong><u class="contract-dock-state ${stateClass}" data-contract-dock-percent>${statusText}</u></span><span class="contract-dock-meta-line"><em>${escapeHtml(company.name)}</em></span><i class="contract-dock-progress"><b class="delivered" data-contract-dock-progress style="width:${percent(progress.percent)}%"></b></i>${timeMarkup}<span class="contract-dock-rewards" aria-label="Recompensa do contrato">${dockReward(contract)}</span></span></button>`;
    }).join("");

    const list = dom.contractDock.querySelector(".contract-dock-list");
    if (list) {
      list.dataset.contractCount = String(contracts.length);
      reconcileLiveCards(list, listHtml);
      if (previousScrollTop > 0) list.scrollTop = Math.min(previousScrollTop, Math.max(0, list.scrollHeight - list.clientHeight));
    }
    markContractDockStructureRendered?.();
  }

  function renderContracts() {
    const hasCrops = Array.isArray(engine.data.crops) && engine.data.crops.length > 0;
    const hasCompanies = Array.isArray(engine.data.companies) && engine.data.companies.length > 0;
    const hasContractTypes = Array.isArray(engine.data.contractTypes) && engine.data.contractTypes.length > 0;
    if (!hasCrops && !engine.state.activeContracts.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo. Os contratos serão liberados automaticamente depois que o catálogo for configurado.")}</div>`; markContractsStructureRendered?.(); return; }
    if (!hasCompanies && !engine.state.activeContracts.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractCompaniesCatalog", "Nenhuma indústria foi publicada no catálogo administrativo. As propostas comerciais aparecerão depois que o catálogo for configurado.")}</div>`; markContractsStructureRendered?.(); return; }
    if (!hasContractTypes && !engine.state.activeContracts.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractTypesCatalog", "Nenhum tipo de contrato foi publicado no catálogo administrativo. Cadastre pelo menos um tipo para começar a gerar propostas.")}</div>`; markContractsStructureRendered?.(); return; }
    const eligible = engine.getContractEligibleCrops();
    if (!eligible.length) { dom.activeContractList.innerHTML = ""; dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractOwnedCrops", "Compre uma cultura para começar a receber oportunidades comerciais.")}</div>`; markContractsStructureRendered?.(); return; }

    engine.ensureContractOffers();
    const active = engine.state.activeContracts;
    if (pendingContractBreakId) {
      const pending = active.find(item => item.id === pendingContractBreakId);
      const pendingProgress = pending ? engine.getContractProgress(pending) : null;
      if (!pending || pendingProgress?.completed || pendingProgress?.defaulted) {
        pendingContractBreakId = "";
        if (dom.contractBreakDialog?.open) dom.contractBreakDialog.close("contract-state-changed");
      }
    }
    const offers = engine.state.contractOffers;
    const cooldowns = engine.state.contractCooldowns || [];
    const slotLimit = engine.getActiveContractSlotLimit();
    const openSlots = Math.max(0, slotLimit - active.length);
    const contractFormatMode = engine.state.settings.numberFormat || "brazilian";
    const contractXPReward = contract => Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE));
    const contractStyle = contract => {
      const type = engine.getContractDifficulty(contract.difficulty);
      const color = contract.typeColor || type?.color || "#6b9870";
      const alpha = Math.max(4, Math.min(28, Number(type?.colorAlpha) || 12));
      const cardAlpha = Math.max(3, Math.min(14, Math.round(alpha * 0.55)));
      return `style="--contract-type-color:${escapeHtml(color)};--contract-type-alpha:${alpha}%;--contract-card-alpha:${cardAlpha}%"`;
    };
    const typeBadge = contract => `<span class="contract-type-label"><i aria-hidden="true"></i>${escapeHtml(engine.getContractDifficulty(contract.difficulty)?.label || "Contrato")}</span>`;
    const stockChip = (amount, liveAttr = "") => `<span class="contract-stock-chip" title="Quantidade disponível no estoque"><img src="assets/icons/galpao-industrial.webp" alt=""><b ${liveAttr}>${engine.formatNumber(amount)}</b></span>`;
    const rewardStrip = contract => { const reward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige }; return `<div class="contract-reward-strip"><span>Recompensa</span><strong>${resourceRewards({ coins: reward.coins, research: reward.research, prestige: reward.prestige, xp: contractXPReward(contract) })}</strong></div>`; };
    const progressBlock = (contract, progress) => `<div class="contract-progress-v2"><div><span>Entregue</span><strong data-contract-live-delivered>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track"><span data-contract-live-progress style="width:${percent(progress.percent)}%"></span></div></div>`;

    const slotSummary = `<article class="contract-capacity-v2" data-live-render-key="capacity" data-live-render-signature="${active.length}|${slotLimit}|${openSlots}"><div><img src="assets/icons/contrato-agricola.webp" alt=""><span><small>Contratos ativos</small><strong>${active.length} de ${slotLimit}</strong></span></div><b class="${openSlots ? "available" : "full"}">${openSlots ? `${openSlots} ${openSlots === 1 ? "vaga" : "vagas"}` : "Lotado"}</b></article>`;

    const activeCards = active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const progress = engine.getContractProgress(contract);
      const urgent = !progress.completed && !progress.defaulted && contract.timeRemaining <= 30;
      const head = `<header class="contract-card-header-v2"><div class="contract-company-v2"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-time-v2 ${urgent ? "urgent" : ""}" data-contract-live-time><img src="assets/icons/relogio.webp" alt=""><b data-contract-live-time-value>${progress.defaulted ? "Vencido" : progress.completed ? "Concluído" : engine.formatTime(contract.timeRemaining)}</b></span></header>`;
      const main = `<div class="contract-main-v2"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${typeBadge(contract)}<h3>${engine.formatNumber(contract.amount)} <span>${escapeHtml(crop.name)}</span></h3><div class="contract-main-meta"><span>Estoque</span>${stockChip(progress.stock, "data-contract-live-stock")}</div></div></div>`;
      if (progress.defaulted) {
        return `<article class="contract-card contract-card-v2 contract-defaulted-card" data-live-render-key="active:${escapeHtml(contract.id)}" data-live-render-signature="defaulted|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${progressBlock(contract, progress)}<footer class="contract-card-footer-v2 contract-break-footer-v3 contract-full-action-footer"><button class="button contract-break-button-v3 contract-penalty-action" type="button" data-action="pay-contract-penalty" data-id="${contract.id}"><span>Pagar multa</span><strong data-contract-live-penalty>${resourceAmount("coins", -progress.penaltyCoins, { compact: true })}</strong></button></footer></article>`;
      }
      if (progress.completed) {
        return `<article class="contract-card contract-card-v2 contract-completed-card" data-live-render-key="active:${escapeHtml(contract.id)}" data-live-render-signature="completed|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${rewardStrip(contract)}<footer class="contract-card-footer-v2 contract-break-footer-v3 contract-full-action-footer"><button class="button gold contract-full-action contract-claim-action" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button></footer></article>`;
      }
      const fine = Math.max(1, engine.calculateContractPenalty(contract));
      return `<article class="contract-card contract-card-v2 ${urgent ? "contract-deadline-warning" : ""}" data-live-render-key="active:${escapeHtml(contract.id)}" data-live-render-signature="running|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${progressBlock(contract, progress)}${rewardStrip(contract)}<footer class="contract-card-footer-v2 contract-break-footer-v3"><button class="button contract-break-button-v3" type="button" data-action="break-contract" data-id="${contract.id}" title="Quebrar contrato e pagar a multa estimada"><span>Quebrar contrato</span><strong data-contract-live-penalty>${resourceAmount("coins", -fine, { compact: true })}</strong></button></footer></article>`;
    });
    reconcileLiveCards(dom.activeContractList, [slotSummary, ...activeCards].join(""));

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const stock = engine.state.crops[contract.cropId]?.stock || 0;
      const proposalTimer = `<span class="contract-time-v2 contract-proposal-time-v3" data-contract-offer-time title="Tempo restante para decidir se assina"><img src="assets/icons/relogio.webp" alt=""><b data-contract-offer-time-value>${engine.formatTime(contract.timeRemaining)}</b></span>`;
      const deliveryTime = `<div class="contract-delivery-time-v3"><span><img src="assets/icons/relogio.webp" alt="">Tempo para concluir</span><strong>${engine.formatTime(contract.deliveryDurationSeconds || contract.durationSeconds)}</strong></div>`;
      return `<article class="contract-card contract-card-v2 contract-offer-card" data-live-render-key="offer:${escapeHtml(contract.id)}" data-live-render-signature="offer|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-offer-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}><header class="contract-card-header-v2"><div class="contract-company-v2"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></div></div>${proposalTimer}</header><div class="contract-main-v2"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${typeBadge(contract)}<h3>${engine.formatNumber(contract.amount)} <span>${escapeHtml(crop.name)}</span></h3><div class="contract-main-meta"><span>Estoque</span>${stockChip(stock, "data-contract-offer-stock")}</div></div></div>${deliveryTime}${rewardStrip(contract)}<footer class="contract-offer-actions-v2"><button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Sem vaga" : "Assinar"}</button><button class="button secondary contract-decline-button-v2" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button></footer></article>`;
    });
    const cooldownCards = cooldowns.map(item => {
      const seconds = Math.max(0, Math.ceil(Number(item.timeRemaining) || 0));
      const cooldownKey = `${item.reason || "cooldown"}-${item.startedAt || 0}-${item.sourceContractId || ""}`;
      return `<article class="contract-card contract-card-v2 contract-cooldown-card" data-live-render-key="cooldown:${escapeHtml(cooldownKey)}" data-live-render-signature="cooldown|${escapeHtml(contractFormatMode)}" data-contract-cooldown-id="${escapeHtml(cooldownKey)}"><div class="contract-cooldown-v2"><img src="assets/icons/renovar-contrato.webp" alt=""><div><strong>Renovando contrato...</strong><span data-contract-cooldown-time>${engine.formatTime(seconds)}</span></div></div></article>`;
    });
    const availableCards = [...offerCards, ...cooldownCards];
    const offersMarkup = availableCards.length ? availableCards.join("") : `<div class="empty-state office-empty" data-live-render-key="empty-offers" data-live-render-signature="empty">${runtimeTextHtml("emptyContractRenewal", "As propostas estão em renovação. Aguarde o término dos intervalos.")}</div>`;
    reconcileLiveCards(dom.contractOfferList, offersMarkup);
    markContractsStructureRendered?.();
  }

  function renderOrders() {
    const setCompletedOrderBoardVisible = visible => {
      if (dom.completedOrderBoard) dom.completedOrderBoard.hidden = !visible;
    };

    if (!engine.data.orderSteps.length) {
      reconcileLiveCards(dom.orderList, `<div class="empty-state office-empty" data-live-render-key="orders-empty-catalog" data-live-render-signature="empty">${runtimeTextHtml("emptyOrdersCatalog", "Nenhuma etapa de pedido foi publicada no catálogo administrativo.")}</div>`);
      setCompletedOrderBoardVisible(false);
      if (dom.completedOrderList.childElementCount) dom.completedOrderList.replaceChildren();
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "";
      return;
    }

    if (!engine.isOrdersUnlocked()) {
      reconcileLiveCards(dom.orderList, featureGateMarkup({
        eyebrow: "prévia do escritório",
        title: `Pedidos liberam no nível ${GameEngine.ORDER_UNLOCK_LEVEL}`,
        description: "Esta área já pode ser consultada. As entregas e recompensas começam quando sua fazenda atingir o nível necessário.",
        level: GameEngine.ORDER_UNLOCK_LEVEL
      }).replace('<section class="feature-gate-card"', '<section class="feature-gate-card" data-live-render-key="orders-gate" data-live-render-signature="gate"'));
      setCompletedOrderBoardVisible(false);
      if (dom.completedOrderList.childElementCount) dom.completedOrderList.replaceChildren();
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "";
      return;
    }

    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      reconcileLiveCards(dom.orderList, `<div class="empty-state office-empty" data-live-render-key="orders-empty-owned" data-live-render-signature="empty">${runtimeTextHtml("emptyOrdersOwnedCrops", "Compre uma cultura para iniciar sua primeira sequência de pedidos.")}</div>`);
      setCompletedOrderBoardVisible(false);
      if (dom.completedOrderList.childElementCount) dom.completedOrderList.replaceChildren();
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
    const activeOrderMarkup = activeCrops.map(crop => {
      const order = engine.getOrder(crop.id);
      const stock = Math.max(0, Number(engine.state.crops[crop.id].stock) || 0);
      const available = Math.min(stock, order.amount);
      const progress = percent((available / order.amount) * 100);
      const canDeliver = stock >= order.amount;
      return `<article class="order-card normalized-order-card ${canDeliver ? "order-ready-to-deliver" : ""}" data-live-render-key="order:${crop.id}" data-live-render-signature="active|${order.tier}|${order.totalTiers}|${engine.state.settings.numberFormat || "brazilian"}" data-order-crop="${crop.id}">
        <div class="order-head"><div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Etapa ${order.tier + 1} de ${order.totalTiers}</small><h3>${escapeHtml(crop.name)}</h3></div></div></div>
        <p data-order-live-description>${canDeliver ? "Lote completo disponível no estoque. Entregue para receber a recompensa." : `Reúna ${engine.formatNumber(order.amount)} unidades no estoque. Faltam ${engine.formatNumber(order.remaining)}.`}</p>
        <div class="order-progress"><div class="progress-label"><span>Disponível no estoque</span><strong data-order-live-value>${engine.formatNumber(available)} / ${engine.formatNumber(order.amount)}</strong></div><div class="progress-track growth"><span data-order-live-progress style="width:${progress}%"></span></div></div>
        <div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: order.rewardCoins, research: order.rewardResearch, prestige: order.rewardPrestige, xp: Math.round(engine.getFarmXPAwardForRate(order.xpRate ?? GameEngine.ORDER_CLAIM_XP_RATE)) })}</strong></div>
        <button class="button ${canDeliver ? "primary" : "secondary"} full" type="button" data-action="deliver-order" data-crop="${crop.id}" data-order-live-action ${canDeliver ? "" : "disabled"}>Entregar pedido</button>
      </article>`;
    }).join("") || `<div class="empty-state office-empty" data-live-render-key="orders-all-complete" data-live-render-signature="empty">${runtimeTextHtml("emptyOrdersComplete", "Todas as séries de pedidos foram concluídas.")}</div>`;
    reconcileLiveCards(dom.orderList, activeOrderMarkup);

    const completedOrderMarkup = completedCrops.map(crop => {
      const category = engine.data.categories[crop.category];
      return `<article class="order-card order-complete compact-completed-order" data-live-render-key="completed-order:${crop.id}" data-live-render-signature="completed|${engine.state.settings.numberFormat || "brazilian"}" data-completed-order-crop="${crop.id}">
        <div class="completed-order-identity"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3><p>${escapeHtml(category)}</p></div></div>
        <strong class="completed-order-status">Pedido finalizado</strong>
      </article>`;
    }).join("");
    reconcileLiveCards(dom.completedOrderList, completedOrderMarkup);

    if (dom.completedOrderCount) dom.completedOrderCount.textContent = completedCrops.length
      ? `${completedCrops.length} ${completedCrops.length === 1 ? "cultura finalizou" : "culturas finalizaram"} todos os pedidos.`
      : "";
  }

  function rewardHtml(reward) {
    const resources = resourceRewards(reward) || "";
    const title = reward?.titleId ? getPlayerTitleEntry(reward.titleId) : null;
    const titleReward = title ? `<span class="mission-title-reward"><small>Título</small>${playerTitleMarkup(title, { showRarity: true, compact: true })}</span>` : "";
    return resources + titleReward;
  }

  function renderMissions() {
    if (!engine.data.missions.length) {
      reconcileLiveCards(dom.missionList, `<div class="empty-state" data-live-render-key="missions-empty" data-live-render-signature="empty">${runtimeTextHtml("emptyMissionsCatalog", "Nenhuma missão foi publicada no catálogo administrativo.")}</div>`);
      if (dom.toggleCompletedMissions) dom.toggleCompletedMissions.hidden = true;
      if (dom.completedMissionCount) dom.completedMissionCount.textContent = "";
      return;
    }
    const activeMissions = engine.getActiveMissions();
    const claimedMissions = engine.data.missions.filter(mission => engine.state.missionsClaimed[mission.id]);
    const list = showCompletedMissions ? [...activeMissions, ...claimedMissions] : activeMissions;
    const missionMarkup = list.map(mission => {
      const value = engine.missionValue(mission.metric, mission);
      const completed = value >= mission.target;
      const claimed = Boolean(engine.state.missionsClaimed[mission.id]);
      const progress = percent((value / mission.target) * 100);
      const seriesMissions = engine.data.missions.filter(item => (item.series || item.id) === (mission.series || mission.id));
      const stage = mission.stage || 1;
      const cropMilestone = mission.metric === "cropUnlocked" ? engine.getCrop(mission.cropId) : null;
      const cropWasUnlocked = Boolean(cropMilestone && value >= 1);
      const milestoneBadge = cropMilestone ? `<div class="mission-crop-milestone ${cropWasUnlocked ? "unlocked" : "locked"}"><img src="${cropWasUnlocked ? escapeHtml(cropMilestone.image) : "assets/icons/cadeado.webp"}" alt=""><span><small>Marco de desbloqueio</small><strong>${cropWasUnlocked ? escapeHtml(cropMilestone.name) : "Cultura misteriosa"}</strong><em>${cropWasUnlocked ? "Desbloqueada pela fazenda" : `Libera no nível ${Math.max(1, Number(cropMilestone.unlockLevel) || 1)}`}</em></span></div>` : "";
      const progressLabel = cropMilestone ? "Desbloqueio por nível" : "Progresso acumulado";
      const progressValue = cropMilestone ? (cropWasUnlocked ? "Concluído" : `Nível ${Math.max(1, Number(cropMilestone.unlockLevel) || 1)}`) : `${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}`;
      return `<article class="mission-card ${claimed ? "claimed" : ""} ${cropMilestone ? "mission-crop-unlock-card" : ""}" data-live-render-key="mission:${escapeHtml(mission.id)}" data-live-render-signature="mission|${claimed ? 1 : 0}|${cropWasUnlocked ? 1 : 0}|${engine.state.settings.numberFormat || "brazilian"}" data-mission-id="${escapeHtml(mission.id)}">
        <div class="mission-head"><div><span class="mission-stage-label">Série ${stage} de ${seriesMissions.length}</span><h3>${escapeHtml(mission.title)}</h3><p>${enrichResourceText(mission.desc)}</p></div></div>
        ${milestoneBadge}
        <div class="mission-progress"><div class="progress-label"><span>${progressLabel}</span><strong data-mission-live-value>${progressValue}</strong></div><div class="progress-track growth"><span data-mission-live-progress style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span><strong class="resource-reward-group">${rewardHtml(mission.reward)}</strong></div>
        ${claimed ? `<div class="mission-claimed-mark">✓ Recompensa recebida</div>` : `<button class="button ${completed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" data-mission-live-action ${completed ? "" : "disabled"}>Receber recompensa</button>`}
      </article>`;
    }).join("") || `<div class="empty-state" data-live-render-key="missions-complete" data-live-render-signature="empty">${runtimeTextHtml("emptyMissionsComplete", "Todas as séries de missões foram concluídas.")}</div>`;
    reconcileLiveCards(dom.missionList, missionMarkup);
    if (dom.toggleCompletedMissions) {
      dom.toggleCompletedMissions.hidden = claimedMissions.length === 0;
      dom.toggleCompletedMissions.textContent = showCompletedMissions ? "Ocultar missões concluídas" : "Mostrar missões concluídas";
      dom.toggleCompletedMissions.setAttribute("aria-expanded", String(showCompletedMissions));
    }
    if (dom.completedMissionCount) dom.completedMissionCount.textContent = claimedMissions.length
      ? `${claimedMissions.length} de ${engine.data.missions.length} séries concluídas na conta.`
      : runtimeText("emptyMissionHistory", "Nenhuma missão concluída ainda.");
  }

