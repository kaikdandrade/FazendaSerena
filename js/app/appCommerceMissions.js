"use strict";

  function renderContracts() {
    const hasCrops = Array.isArray(engine.data.crops) && engine.data.crops.length > 0;
    const hasCompanies = Array.isArray(engine.data.companies) && engine.data.companies.length > 0;
    const hasContractTypes = Array.isArray(engine.data.contractTypes) && engine.data.contractTypes.length > 0;

    engine.ensureContractOffers();
    const active = engine.state.activeContracts || [];
    const boardEntries = engine.getContractBoardEntries?.() || [...active, ...(engine.state.contractOffers || [])];
    const eligible = engine.getContractEligibleCrops();

    const renderEmpty = message => {
      if (dom.contractCapacitySummary) dom.contractCapacitySummary.replaceChildren();
      if (dom.contractOfferList) dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${message}</div>`;
      markContractsStructureRendered?.();
    };
    if (!boardEntries.length && !hasCrops) return renderEmpty(runtimeTextHtml("emptyContractCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo. Os contratos serão liberados automaticamente depois que o catálogo for configurado."));
    if (!boardEntries.length && !hasCompanies) return renderEmpty(runtimeTextHtml("emptyContractCompaniesCatalog", "Nenhuma indústria foi publicada no catálogo administrativo. As propostas comerciais aparecerão depois que o catálogo for configurado."));
    if (!boardEntries.length && !hasContractTypes) return renderEmpty(runtimeTextHtml("emptyContractTypesCatalog", "Nenhum tipo de contrato foi publicado no catálogo administrativo. Cadastre pelo menos um tipo para começar a gerar propostas."));
    if (!boardEntries.length && !eligible.length) return renderEmpty(runtimeTextHtml("emptyContractOwnedCrops", "Compre uma cultura para começar a receber oportunidades comerciais."));

    if (pendingContractBreakId) {
      const pending = active.find(item => item.id === pendingContractBreakId);
      const pendingProgress = pending ? engine.getContractProgress(pending) : null;
      if (!pending || pendingProgress?.completed) {
        pendingContractBreakId = "";
        if (dom.contractBreakDialog?.open) dom.contractBreakDialog.close("contract-state-changed");
      }
    }

    const slotLimit = engine.getActiveContractSlotLimit();
    const openSlots = Math.max(0, slotLimit - active.length);
    const contractFormatMode = engine.state.settings.numberFormat || "brazilian";
    const contractXPReward = contract => Math.round(engine.getContractFrozenXPReward?.(contract) ?? Math.max(0, Number(contract.rewardXP) || 0));
    const contractStyle = contract => {
      const type = engine.getContractDifficulty(contract.difficulty);
      const color = contract.typeColor || type?.color || "#6b9870";
      const alpha = Math.max(4, Math.min(28, Number(type?.colorAlpha) || 12));
      return `style="--contract-type-color:${escapeHtml(color)};--contract-type-alpha:${alpha}%"`;
    };
    const typeBadge = contract => `<span class="contract-type-label contract-type-label-live"><i aria-hidden="true"></i>${escapeHtml(engine.getContractDifficulty(contract.difficulty)?.label || "Contrato")}</span>`;
    const rewardStrip = (contract, label = "Recompensa") => {
      const reward = engine.getEffectiveContractRewards?.(contract) || { coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige };
      return `<section class="contract-reward-strip contract-reward"><span class="contract-reward-title">${escapeHtml(label)}</span><strong class="contract-reward-values">${resourceRewards({ coins: reward.coins, research: reward.research, prestige: reward.prestige, xp: contractXPReward(contract) })}</strong></section>`;
    };
    const penaltyStrip = contract => `<section class="contract-reward-strip contract-reward contract-penalty-paid"><span class="contract-reward-title">Multa paga</span><strong class="contract-reward-values">${resourceAmount("coins", -Math.max(0, Number(contract.penaltyCoins) || 0), { compact: true })}</strong></section>`;
    const cropList = (contract, progress, showDelivered = false) => {
      const items = progress?.items?.length ? progress.items : engine.getContractItems(contract);
      return `<div class="contract-crop-list" data-contract-crop-count="${items.length}">${items.map(item => {
        const crop = engine.getCrop(item.cropId);
        const quantity = showDelivered
          ? `<strong><span data-contract-live-item-delivered="${escapeHtml(item.cropId)}">${engine.formatNumber(item.delivered)}</span> / ${engine.formatNumber(item.amount)}</strong>`
          : `<strong>${engine.formatNumber(item.amount)}</strong>`;
        return `<div class="contract-crop-item" data-contract-crop-id="${escapeHtml(item.cropId)}"><span class="contract-crop-art"><img src="${escapeHtml(crop.image)}" alt=""></span><span class="contract-crop-copy"><small>${showDelivered ? "Entrega" : "Quantidade"}</small><b>${escapeHtml(crop.name)}</b></span>${quantity}</div>`;
      }).join("")}</div>`;
    };
    const progressBlock = progress => `<section class="contract-progress"><div class="contract-progress-head"><span>Progresso</span><strong data-contract-live-fill>${Math.floor(progress.percent)}%</strong></div><div class="progress-track"><span data-contract-live-progress style="width:${percent(progress.percent)}%"></span></div><small><b data-contract-live-delivered>${engine.formatNumber(progress.delivered)}</b> / ${engine.formatNumber(progress.amount)} unidades</small></section>`;
    const cardHeader = (contract, state, progress = null) => {
      const company = engine.getCompany(contract.companyId);
      let timing = "";
      if (state === "running") timing = `<span class="contract-time-badge"><b data-contract-live-time-value>${engine.formatTime(contract.timeRemaining)}</b></span>`;
      else if (state === "completed") timing = `<span class="contract-time-badge contract-time-completed"><b>Concluído</b></span>`;
      else if (state === "delivered") timing = `<span class="contract-time-badge contract-time-terminal"><b>Entregue</b></span>`;
      else if (state === "broken") timing = `<span class="contract-time-badge contract-time-terminal is-broken"><b>Quebrado</b></span>`;
      else if (state === "penalized") timing = `<span class="contract-time-badge contract-time-terminal is-penalized"><b>Multado</b></span>`;
      else timing = `<span class="contract-time-badge"><b>${engine.formatTime(contract.deliveryDurationSeconds || contract.durationSeconds)}</b></span>`;
      return `<header class="contract-card-header"><div class="contract-company"><span class="contract-company-icon">${companyIconMarkup(company)}</span><span><small>${escapeHtml(company.specialty || "Parceiro comercial")}</small><strong>${escapeHtml(company.name)}</strong></span></div><div class="contract-time" ${state === "running" ? "data-contract-live-time" : ""}>${timing}</div></header>`;
    };

    // O contador é deliberadamente compacto: apenas ícone e contratos ativos/slots.
    if (dom.contractCapacitySummary) {
      dom.contractCapacitySummary.innerHTML = `<article class="contract-capacity-compact" aria-label="${active.length} de ${slotLimit} contratos ativos"><img src="assets/icons/contrato-agricola.webp" alt=""><strong>${active.length}/${slotLimit}</strong></article>`;
    }

    const cards = boardEntries.map(contract => {
      const isActive = active.some(item => item.id === contract.id);
      const progress = engine.getContractProgress(contract);
      const terminalStatus = !isActive ? String(contract.boardStatus || "offer") : "";
      const state = isActive ? (progress.completed ? "completed" : "running") : terminalStatus;
      const itemsKey = progress.items.map(item => `${item.cropId}:${item.amount}`).join(",");
      const showDelivered = isActive || ["delivered", "broken", "penalized"].includes(state);
      const body = `<div class="contract-body"><div class="contract-body-title">${typeBadge(contract)}</div>${cropList(contract, progress, showDelivered)}${state === "running" ? progressBlock(progress) : ""}</div>`;
      const key = `board:${escapeHtml(contract.id)}`;
      const signature = `${state}|${escapeHtml(contractFormatMode)}|${escapeHtml(itemsKey)}|${escapeHtml(contract.companyId)}`;
      const common = `class="contract-card contract-card-foundation contract-card-live contract-board-card contract-state-${escapeHtml(state)}" data-live-render-key="${key}" data-live-render-signature="${signature}" data-contract-board-id="${escapeHtml(contract.id)}" ${contractStyle(contract)}`;

      if (state === "running") {
        const fine = Math.max(1, engine.calculateContractPenalty(contract));
        return `<article ${common} data-contract-id="${escapeHtml(contract.id)}">${cardHeader(contract, state, progress)}${body}${rewardStrip(contract)}<footer class="contract-actions"><button class="button contract-break-button" type="button" data-action="break-contract" data-id="${contract.id}" title="Quebrar contrato e pagar a multa estimada"><span>Quebrar contrato</span><strong data-contract-live-penalty>${resourceAmount("coins", -fine, { compact: true })}</strong></button></footer></article>`;
      }
      if (state === "completed") {
        return `<article ${common} data-contract-id="${escapeHtml(contract.id)}">${cardHeader(contract, state, progress)}${body}${rewardStrip(contract)}<footer class="contract-actions"><button class="button gold contract-full-action contract-claim-action" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button></footer></article>`;
      }
      if (state === "delivered") {
        return `<article ${common}>${cardHeader(contract, state, progress)}${body}${rewardStrip(contract, "Recompensa recebida")}<footer class="contract-terminal-footer">Entregue</footer></article>`;
      }
      if (state === "broken" || state === "penalized") {
        return `<article ${common}>${cardHeader(contract, state, progress)}${body}${penaltyStrip(contract)}<footer class="contract-terminal-footer">${state === "broken" ? "Contrato quebrado" : "Multa quitada"}</footer></article>`;
      }
      return `<article ${common} data-contract-offer-id="${escapeHtml(contract.id)}">${cardHeader(contract, "offer", progress)}${body}${rewardStrip(contract)}<footer class="contract-actions contract-offer-actions"><button class="button primary" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>Assinar</button></footer></article>`;
    });

    const boardMarkup = cards.length ? cards.join("") : `<div class="empty-state office-empty" data-live-render-key="empty-board" data-live-render-signature="empty">Nenhum contrato disponível.</div>`;
    reconcileLiveCards(dom.contractOfferList, boardMarkup);
    markContractsStructureRendered?.();
  }

  function rewardHtml(reward) {
    const resources = resourceRewards(reward) || "";
    const title = reward?.titleId ? getPlayerTitleEntry(reward.titleId) : null;
    const avatar = reward?.avatarId ? getAvatarEntry(reward.avatarId) : null;
    const rarity = title?.rarity || "common";
    const resourcesMarkup = resources ? `<div class="mission-resource-rewards resource-reward-group">${resources}</div>` : "";
    const titleReward = title ? `<div class="mission-title-reward" data-title-rarity="${escapeHtml(rarity)}" title="Título: ${escapeHtml(title.name)}"><span class="mission-title-reward-mark" aria-hidden="true">✦</span><span class="mission-title-reward-copy"><small>Título de jogador</small><b>${escapeHtml(title.name)}</b><em class="mission-title-reward-rarity">${escapeHtml(playerTitleRarityLabel(rarity))}</em></span></div>` : "";
    const avatarReward = avatar ? `<div class="mission-avatar-reward" title="Avatar: ${escapeHtml(avatar.label)}"><img src="${escapeHtml(avatar.src)}" alt=""><span><small>Avatar</small><b>${escapeHtml(avatar.label)}</b></span></div>` : "";
    return `<div class="mission-reward-content">${resourcesMarkup}${titleReward}${avatarReward}</div>`;
  }

  function renderMissions() {
    const visibleMissions = engine.data.missions.filter(mission => engine.isMissionVisible?.(mission) !== false);
    if (!visibleMissions.length) {
      reconcileLiveCards(dom.missionList, `<div class="empty-state" data-live-render-key="missions-empty" data-live-render-signature="empty">${runtimeTextHtml("emptyMissionsCatalog", "Nenhuma missão foi publicada no catálogo administrativo.")}</div>`);
      if (dom.toggleCompletedMissions) dom.toggleCompletedMissions.hidden = true;
      if (dom.completedMissionCount) dom.completedMissionCount.textContent = "";
      if (dom.missionSectionCounter) dom.missionSectionCounter.textContent = "0/0";
      return;
    }
    const activeMissions = engine.getActiveMissions();
    const claimedMissions = visibleMissions.filter(mission => engine.state.missionsClaimed[mission.id]);
    if (dom.missionSectionCounter) {
      dom.missionSectionCounter.textContent = `${claimedMissions.length}/${visibleMissions.length}`;
      dom.missionSectionCounter.setAttribute("aria-label", `${claimedMissions.length} de ${visibleMissions.length} missões concluídas`);
    }
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
      const progressLabel = isPurchaseGoal
        ? "Progresso"
        : cropGoal
          ? "Desbloqueio por nível"
          : mission.metric === "onlineMinutes"
            ? "Tempo online nesta sessão"
            : mission.metric === "playHours"
              ? "Tempo total jogado"
              : "Progresso acumulado";
      const progressValue = isPurchaseGoal
        ? `${engine.formatNumber(Math.min(value, 1))} / 1`
        : cropGoal
          ? (cropGoalComplete ? "Concluído" : `Nível ${Math.max(1, Number(cropGoal.unlockLevel) || 1)}`)
          : formatMissionMetricProgress(mission, value);
      const stageLabel = seriesMissions.length > 1 ? `<span class="mission-stage-label">Série ${stage} de ${seriesMissions.length}</span>` : "";
      return `<article class="mission-card ${claimed ? "claimed" : ""} ${isUnlockGoal && cropGoal ? "mission-crop-unlock-card mission-crop-target-card" : ""}" data-live-render-key="mission:${escapeHtml(mission.id)}" data-live-render-signature="mission|${claimed ? 1 : 0}|${cropGoalComplete ? 1 : 0}|${engine.state.settings.numberFormat || "brazilian"}" data-mission-id="${escapeHtml(mission.id)}">
        <div class="mission-head"><div>${stageLabel}<h3>${escapeHtml(mission.title)}</h3><p>${enrichResourceText(mission.desc)}</p></div></div>
        ${cropGoalBadge}
        <div class="mission-progress"><div class="progress-label"><span>${progressLabel}</span><strong data-mission-live-value>${progressValue}</strong></div><div class="progress-track growth"><span data-mission-live-progress style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span>${rewardHtml(mission.reward)}</div>
        ${claimed ? `<div class="mission-claimed-mark">✓ Recompensa recebida</div>` : `<div class="mission-claim-slot" data-mission-claim-slot>${completed ? `<button class="button primary full" type="button" data-action="claim-mission" data-id="${mission.id}" data-mission-live-action>Receber recompensa</button>` : ""}</div>`}
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

