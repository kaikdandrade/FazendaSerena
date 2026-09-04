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
        <header class="contract-dock-header"><button type="button" data-go-office-contracts><img src="assets/icons/contrato-agricola.webp" alt=""><span><strong>Contratos ativos</strong><small>Acompanhe o preenchimento automático</small></span></button><button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock"><img src="assets/icons/seta-cima.webp" alt=""></button></header>
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
      const canClaim = progress.completed;
      const actionAttributes = `data-go-office-contracts data-focus-contract="${escapeHtml(contract.id)}" data-contract-dock-behavior="${canClaim ? "claim" : "navigate"}" title="${canClaim ? "Contrato concluído" : "Abrir este contrato"}"`;
      const statusText = progress.completed ? "Concluído" : `${Math.floor(progress.percent)}%`;
      const stateClass = progress.completed ? "is-completed" : "is-running";
      const timeMarkup = progress.completed ? "" : `<span class="contract-dock-time" data-contract-dock-time><img src="assets/icons/relogio.webp" alt=""><b data-contract-dock-time-value>${engine.formatTime(contract.timeRemaining)}</b></span>`;
      const type = engine.getContractDifficulty(contract.difficulty);
      const contractColor = contract.typeColor || type?.color || "#6b9870";
      const renderState = `${progress.completed ? "completed" : "running"}|${engine.state.settings.numberFormat || "brazilian"}`;
      return `<button class="contract-dock-item contract-dock-item-v2 ${progress.completed ? "reward-ready" : ""}" style="--contract-type-color:${escapeHtml(contractColor)}" type="button" data-live-render-key="dock:${escapeHtml(contract.id)}" data-live-render-signature="${escapeHtml(renderState)}" data-contract-dock-id="${escapeHtml(contract.id)}" ${actionAttributes}><span class="contract-dock-crop-shell"><img class="contract-dock-crop" src="${crop.image}" alt="${escapeHtml(crop.name)}"></span><span class="contract-dock-copy"><span class="contract-dock-title-line"><strong>${escapeHtml(crop.name)}</strong><u class="contract-dock-state ${stateClass}" data-contract-dock-percent>${statusText}</u></span><span class="contract-dock-meta-line"><em>${escapeHtml(company.name)}</em></span><i class="contract-dock-progress"><b class="delivered" data-contract-dock-progress style="width:${percent(progress.percent)}%"></b></i>${timeMarkup}<span class="contract-dock-rewards" aria-label="Recompensa do contrato">${dockReward(contract)}</span></span></button>`;
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
      if (!pending || pendingProgress?.completed) {
        pendingContractBreakId = "";
        if (dom.contractBreakDialog?.open) dom.contractBreakDialog.close("contract-state-changed");
      }
    }
    const offers = engine.state.contractOffers;
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
    const rewardStrip = contract => { const reward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige }; return `<div class="contract-reward-strip"><span class="contract-reward-title">Recompensa</span><strong class="contract-reward-values">${resourceRewards({ coins: reward.coins, research: reward.research, prestige: reward.prestige, xp: contractXPReward(contract) })}</strong></div>`; };
    const progressBlock = (contract, progress) => `<div class="contract-progress-v2"><div><span>Preenchido</span><strong data-contract-live-delivered>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track"><span data-contract-live-progress style="width:${percent(progress.percent)}%"></span></div></div>`;

    const slotSummary = `<article class="contract-capacity-v2" data-live-render-key="capacity" data-live-render-signature="${active.length}|${slotLimit}|${openSlots}"><div><img src="assets/icons/contrato-agricola.webp" alt=""><span><small>Contratos ativos</small><strong>${active.length} de ${slotLimit}</strong></span></div><b class="${openSlots ? "available" : "full"}">${openSlots ? `${openSlots} ${openSlots === 1 ? "vaga" : "vagas"}` : "Lotado"}</b></article>`;

    const activeCards = active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const progress = engine.getContractProgress(contract);
      const head = `<header class="contract-card-header-v2"><div class="contract-company-v2"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-time-v2 contract-completion-time-v4" data-contract-live-time><small>Conclusão</small><span><img src="assets/icons/relogio.webp" alt=""><b data-contract-live-time-value>${progress.completed ? "Concluído" : engine.formatTime(contract.timeRemaining)}</b></span></span></header>`;
      const main = `<div class="contract-main-v2"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${typeBadge(contract)}<h3>${engine.formatNumber(contract.amount)} <span>${escapeHtml(crop.name)}</span></h3><div class="contract-main-meta"><span>Preenchimento automático</span><strong data-contract-live-fill>${Math.floor(progress.percent)}%</strong></div></div></div>`;
      if (progress.completed) {
        return `<article class="contract-card contract-card-v2 contract-completed-card" data-live-render-key="active:${escapeHtml(contract.id)}" data-live-render-signature="completed|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${rewardStrip(contract)}<footer class="contract-card-footer-v2 contract-break-footer-v3 contract-full-action-footer"><button class="button gold contract-full-action contract-claim-action" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button></footer></article>`;
      }
      const fine = Math.max(1, engine.calculateContractPenalty(contract));
      return `<article class="contract-card contract-card-v2" data-live-render-key="active:${escapeHtml(contract.id)}" data-live-render-signature="running|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}>${head}${main}${progressBlock(contract, progress)}${rewardStrip(contract)}<footer class="contract-card-footer-v2 contract-break-footer-v3"><button class="button contract-break-button-v3" type="button" data-action="break-contract" data-id="${contract.id}" title="Quebrar contrato e pagar a multa estimada"><span>Quebrar contrato</span><strong data-contract-live-penalty>${resourceAmount("coins", -fine, { compact: true })}</strong></button></footer></article>`;
    });
    reconcileLiveCards(dom.activeContractList, [slotSummary, ...activeCards].join(""));

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const proposalTime = `<span class="contract-time-v2 contract-proposal-time-v4" title="Tempo de conclusão após assinar"><small>Proposta</small><span><img src="assets/icons/relogio.webp" alt=""><b>${engine.formatTime(contract.deliveryDurationSeconds || contract.durationSeconds)}</b></span></span>`;
      return `<article class="contract-card contract-card-v2 contract-offer-card" data-live-render-key="offer:${escapeHtml(contract.id)}" data-live-render-signature="offer|${escapeHtml(contractFormatMode)}|${contract.amount}|${escapeHtml(contract.companyId)}|${escapeHtml(contract.cropId)}" data-contract-offer-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}><header class="contract-card-header-v2"><div class="contract-company-v2"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></div></div>${proposalTime}</header><div class="contract-main-v2"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${typeBadge(contract)}<h3>${engine.formatNumber(contract.amount)} <span>${escapeHtml(crop.name)}</span></h3><div class="contract-main-meta"><span>Preenchimento</span><strong>Automático após assinar</strong></div></div></div>${rewardStrip(contract)}<footer class="contract-offer-actions-v2 contract-offer-single-action"><button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Sem vaga" : "Assinar"}</button></footer></article>`;
    });
    const offersMarkup = offerCards.length ? offerCards.join("") : `<div class="empty-state office-empty" data-live-render-key="empty-offers" data-live-render-signature="empty">Nenhuma proposta disponível.</div>`;
    reconcileLiveCards(dom.contractOfferList, offersMarkup);
    markContractsStructureRendered?.();
  }

  function rewardHtml(reward) {
    const resources = resourceRewards(reward) || "";
    const title = reward?.titleId ? getPlayerTitleEntry(reward.titleId) : null;
    const rarity = title?.rarity || "common";
    const resourcesMarkup = resources ? `<div class="mission-resource-rewards resource-reward-group">${resources}</div>` : "";
    const titleReward = title ? `<div class="mission-title-reward" data-title-rarity="${escapeHtml(rarity)}" title="Título: ${escapeHtml(title.name)}"><span class="mission-title-reward-mark" aria-hidden="true">✦</span><span class="mission-title-reward-copy"><small>Título de jogador</small><b>${escapeHtml(title.name)}</b><em class="mission-title-reward-rarity">${escapeHtml(playerTitleRarityLabel(rarity))}</em></span></div>` : "";
    return `<div class="mission-reward-content">${resourcesMarkup}${titleReward}</div>`;
  }

  function renderMissions() {
    const visibleMissions = engine.data.missions.filter(mission => engine.isMissionVisible?.(mission) !== false);
    if (!visibleMissions.length) {
      reconcileLiveCards(dom.missionList, `<div class="empty-state" data-live-render-key="missions-empty" data-live-render-signature="empty">${runtimeTextHtml("emptyMissionsCatalog", "Nenhuma missão foi publicada no catálogo administrativo.")}</div>`);
      if (dom.toggleCompletedMissions) dom.toggleCompletedMissions.hidden = true;
      if (dom.completedMissionCount) dom.completedMissionCount.textContent = "";
      return;
    }
    const activeMissions = engine.getActiveMissions();
    const claimedMissions = visibleMissions.filter(mission => engine.state.missionsClaimed[mission.id]);
    const list = showCompletedMissions ? [...activeMissions, ...claimedMissions] : activeMissions;
    const missionMarkup = list.map(mission => {
      const value = engine.missionValue(mission.metric, mission);
      const completed = value >= mission.target;
      const claimed = Boolean(engine.state.missionsClaimed[mission.id]);
      const progress = percent((value / mission.target) * 100);
      const seriesMissions = visibleMissions.filter(item => (item.series || item.id) === (mission.series || mission.id));
      const stage = mission.stage || 1;
      const cropGoal = ["cropUnlocked", "cropPurchased"].includes(mission.metric) ? engine.getCrop(mission.cropId) : null;
      const cropGoalComplete = Boolean(cropGoal && value >= 1);
      const isPurchaseGoal = mission.metric === "cropPurchased";
      const isUnlockGoal = mission.metric === "cropUnlocked";
      const cropGoalBadge = isUnlockGoal && cropGoal ? `<div class="mission-crop-milestone ${cropGoalComplete ? "unlocked" : "locked"} unlock-goal"><img src="${cropGoalComplete ? escapeHtml(cropGoal.image) : "assets/icons/cadeado.webp"}" alt=""><span><small>Marco de desbloqueio</small><strong>${escapeHtml(cropGoal.name)}</strong><em>${cropGoalComplete ? "Desbloqueada pela fazenda" : `Libera no nível ${Math.max(1, Number(cropGoal.unlockLevel) || 1)}`}</em></span></div>` : "";
      const progressLabel = isPurchaseGoal ? "Progresso" : cropGoal ? "Desbloqueio por nível" : "Progresso acumulado";
      const progressValue = isPurchaseGoal
        ? `${engine.formatNumber(Math.min(value, 1))} / 1`
        : cropGoal
          ? (cropGoalComplete ? "Concluído" : `Nível ${Math.max(1, Number(cropGoal.unlockLevel) || 1)}`)
          : `${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}`;
      const stageLabel = seriesMissions.length > 1 ? `<span class="mission-stage-label">Série ${stage} de ${seriesMissions.length}</span>` : "";
      return `<article class="mission-card ${claimed ? "claimed" : ""} ${isUnlockGoal && cropGoal ? "mission-crop-unlock-card mission-crop-target-card" : ""}" data-live-render-key="mission:${escapeHtml(mission.id)}" data-live-render-signature="mission|${claimed ? 1 : 0}|${cropGoalComplete ? 1 : 0}|${engine.state.settings.numberFormat || "brazilian"}" data-mission-id="${escapeHtml(mission.id)}">
        <div class="mission-head"><div>${stageLabel}<h3>${escapeHtml(mission.title)}</h3><p>${enrichResourceText(mission.desc)}</p></div></div>
        ${cropGoalBadge}
        <div class="mission-progress"><div class="progress-label"><span>${progressLabel}</span><strong data-mission-live-value>${progressValue}</strong></div><div class="progress-track growth"><span data-mission-live-progress style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span>${rewardHtml(mission.reward)}</div>
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
      ? `${claimedMissions.length} de ${visibleMissions.length} séries concluídas na conta.`
      : runtimeText("emptyMissionHistory", "Nenhuma missão concluída ainda.");
  }

