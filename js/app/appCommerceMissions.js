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
    const toggleLabel = contractDockCollapsed ? "Expandir acompanhamento de contratos" : "Recolher acompanhamento de contratos";
    const toggleIcon = `<img src="assets/icons/seta-cima.webp" alt="">`;
    if (contractDockCollapsed) {
      dom.contractDock.innerHTML = `<button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock" aria-expanded="false" aria-label="${toggleLabel}" title="${toggleLabel}"><span aria-hidden="true">${toggleIcon}</span></button>`;
      return;
    }
    dom.contractDock.innerHTML = `
      <button class="contract-dock-collapse-toggle" type="button" data-action="toggle-contract-dock" aria-expanded="true" aria-label="${toggleLabel}" title="${toggleLabel}"><span aria-hidden="true">${toggleIcon}</span></button>
      <div class="contract-dock-panel">
        <button class="contract-dock-title" type="button" data-go-office-contracts><strong>Contratos</strong><small>${contracts.length}/${slotLimit}</small></button>
        <div class="contract-dock-list">
          ${contracts.map(contract => {
            const crop = engine.getCrop(contract.cropId);
            const company = engine.getCompany(contract.companyId);
            const progress = engine.getContractProgress(contract);
            const urgent = !progress.completed && !progress.defaulted && contract.timeRemaining <= 30;
            let actionAttributes = 'data-go-office-contracts title="Abrir contratos"';
            let status = progress.defaulted ? "Prazo vencido — pagar multa" : `${engine.formatTime(contract.timeRemaining)} restantes`;
            let smallStatus = "entregue";
            let resourceLine = resourceRewards({
              coins: contract.rewardCoins,
              research: contract.rewardResearch,
              xp: Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE))
            });
            const stateClasses = [];

            if (progress.readyToClaim) {
              actionAttributes = `data-action="claim-contract" data-id="${contract.id}" title="Receber recompensa"`;
              status = "Clique para receber";
              smallStatus = "receber";
              stateClasses.push("reward-ready");
            } else if (progress.readyToPayPenalty) {
              actionAttributes = `data-action="pay-contract-penalty" data-id="${contract.id}" title="Pagar multa"`;
              status = "Clique para pagar a multa";
              smallStatus = "pagar";
              resourceLine = resourceRewards({ coins: progress.penaltyCoins });
              stateClasses.push("contract-defaulted", "penalty-ready");
            } else if (progress.defaulted) {
              resourceLine = resourceRewards({ coins: progress.penaltyCoins });
              stateClasses.push("contract-defaulted");
            }

            return `<button class="contract-dock-item ${urgent ? "deadline-warning" : ""} ${stateClasses.join(" ")}" type="button" ${actionAttributes}>
              <img src="${crop.image}" alt="${escapeHtml(crop.name)}">
              <span class="contract-dock-copy"><small>${escapeHtml(company.name)}</small><strong>${escapeHtml(crop.name)}</strong><i><b class="delivered" style="width:${percent(progress.percent)}%"></b></i><u>${status}</u><span class="contract-dock-rewards">${resourceLine}</span></span>
              <em class="${progress.completed ? "ready" : ""}">${Math.floor(progress.percent)}%<small>${smallStatus}</small></em>
            </button>`;
          }).join("")}
        </div>
      </div>`;
  }

  function renderContracts() {
    const hasCrops = Array.isArray(engine.data.crops) && engine.data.crops.length > 0;
    const hasCompanies = Array.isArray(engine.data.companies) && engine.data.companies.length > 0;
    const hasContractTypes = Array.isArray(engine.data.contractTypes) && engine.data.contractTypes.length > 0;

    if (!hasCrops && !engine.state.activeContracts.length) {
      dom.activeContractList.innerHTML = "";
      dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo. Os contratos serão liberados automaticamente depois que o catálogo for configurado.")}</div>`;
      return;
    }
    if (!hasCompanies && !engine.state.activeContracts.length) {
      dom.activeContractList.innerHTML = "";
      dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractCompaniesCatalog", "Nenhuma indústria foi publicada no catálogo administrativo. As propostas comerciais aparecerão depois que o catálogo for configurado.")}</div>`;
      return;
    }
    if (!hasContractTypes && !engine.state.activeContracts.length) {
      dom.activeContractList.innerHTML = "";
      dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractTypesCatalog", "Nenhum tipo de contrato foi publicado no catálogo administrativo. Cadastre pelo menos um tipo para começar a gerar propostas.")}</div>`;
      return;
    }
    const eligible = engine.getContractEligibleCrops();
    if (!eligible.length) {
      dom.activeContractList.innerHTML = "";
      dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractOwnedCrops", "Compre uma cultura para começar a receber oportunidades comerciais.")}</div>`;
      return;
    }

    engine.ensureContractOffers();
    const active = engine.state.activeContracts;
    const offers = engine.state.contractOffers;
    const cooldowns = engine.state.contractCooldowns || [];
    const slotLimit = engine.getActiveContractSlotLimit();
    const openSlots = Math.max(0, slotLimit - active.length);
    const contractXPReward = contract => Math.round(engine.getFarmXPAwardForRate(contract.xpRate ?? GameEngine.CONTRACT_CLAIM_XP_RATE));
    const rewardsLine = contract => `<div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch, prestige: contract.rewardPrestige, xp: contractXPReward(contract) })}</strong></div>`;
    const contractStyle = contract => {
      const type = engine.getContractDifficulty(contract.difficulty);
      const color = contract.typeColor || type?.color || "#e6c35f";
      const alpha = Math.max(0, Math.min(100, Number(contract.typeColorAlpha ?? type?.colorAlpha ?? 18) || 0));
      return `style="--contract-type-color:${escapeHtml(color)};--contract-type-alpha:${alpha}%;--contract-type-opacity:${(alpha / 100).toFixed(2)}"`;
    };
    const stockLine = value => `<small class="contract-stock-line" title="Quantidade no estoque"><img src="assets/icons/galpao-industrial.webp" alt="Estoque"><strong>${engine.formatNumber(value)}</strong></small>`;
    const contractTypeLine = contract => {
      const type = engine.getContractDifficulty(contract.difficulty);
      return `<span class="contract-type-label">${escapeHtml(type?.label || "Contrato")}</span>`;
    };
    const penaltyLine = progress => `<div class="contract-penalty-unified"><span>Multa por atraso</span><strong class="resource-reward-group">${resourceAmount("coins", -progress.penaltyCoins, { title: "Multa em moedas" })}</strong><small>O pagamento é obrigatório e pode deixar o saldo de moedas negativo.</small></div>`;
    const breakAction = contract => {
      const fine = Math.max(1, Math.ceil(Number(contract.penaltyCoins) || contract.rewardCoins * 1.20));
      return `<div class="contract-break-area"><div><strong>Não quer continuar?</strong><small>Sujeito a multa ao quebrar contrato.</small></div><button class="button contract-break-button" type="button" data-action="break-contract" data-id="${contract.id}">Quebrar ${resourceAmount("coins", -fine, { compact: true })}</button></div>`;
    };

    const slotSummary = `<article class="contract-slot-summary">
      <div><small>Capacidade de contratos ativos</small><strong>${active.length} / ${slotLimit} slots usados</strong><p>${openSlots > 0 ? `Você ainda pode assinar ${openSlots} ${openSlots === 1 ? "contrato" : "contratos"}.` : "Libere um slot para assinar outra proposta."}</p></div>
      <span>${openSlots > 0 ? `${openSlots} ${openSlots === 1 ? "slot livre" : "slots livres"}` : "Capacidade cheia"}</span>
    </article>`;

    const activeCards = active.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const progress = engine.getContractProgress(contract);
      const urgent = !progress.completed && !progress.defaulted && contract.timeRemaining <= 30;
      const toneClass = "contract-custom-color";
      const contractColorStyle = contractStyle(contract);

      if (progress.defaulted) {
        return `<article class="contract-card active-contract-card contract-defaulted-card friendly-contract-card ${toneClass}" ${contractColorStyle}>
          <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Contrato vencido</strong></div></div><span class="contract-defaulted-badge">Multa pendente</span></div>
          <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>Prazo encerrado</small><h3>${escapeHtml(crop.name)}</h3></div></div>
          <div class="contract-progress-block"><div class="progress-label"><span>Entregue até o vencimento</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span></div></div>
          ${penaltyLine(progress)}
          <button class="button danger full contract-penalty-button" type="button" data-action="pay-contract-penalty" data-id="${contract.id}">Pagar multa ${resourceAmount("coins", -progress.penaltyCoins, { compact: true })}</button>
        </article>`;
      }

      if (progress.completed) {
        return `<article class="contract-card active-contract-card contract-completed-card friendly-contract-card ${toneClass}" ${contractColorStyle}>
          <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Entrega concluída</strong></div></div><span class="contract-ready-mark">✓ Pronta</span></div>
          <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>${engine.formatNumber(contract.amount)} unidades</small><h3>${escapeHtml(crop.name)}</h3></div></div>
          ${rewardsLine(contract)}
          <button class="button gold full reward-claim-button" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button>
        </article>`;
      }

      return `<article class="contract-card active-contract-card friendly-contract-card ${toneClass} ${urgent ? "contract-deadline-warning" : ""}" ${contractColorStyle}>
        <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Contrato assinado</strong></div></div><span class="contract-clock-badge ${urgent ? "urgent" : ""}">⏱ ${engine.formatTime(contract.timeRemaining)}</span></div>
        <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>Meta de entrega</small><h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3>${stockLine(progress.stock)}</div></div>
        <div class="contract-progress-block"><div class="progress-label"><span>Produção enviada</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span></div></div>
        ${rewardsLine(contract)}
        ${breakAction(contract)}
      </article>`;
    });
    dom.activeContractList.innerHTML = [slotSummary, ...activeCards].join("");

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const toneClass = "contract-custom-color";
      const contractColorStyle = contractStyle(contract);
      return `<article class="contract-card contract-offer-card friendly-contract-card ${toneClass}" ${contractColorStyle}>
        <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty)}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-clock-badge">⏱ ${engine.formatTime(contract.timeRemaining)}</span></div>
        <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3>${stockLine(engine.state.crops[contract.cropId]?.stock || 0)}</div></div>
        ${rewardsLine(contract)}
        <div class="contract-offer-actions"><button class="button primary contract-accept-button" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Limite atingido" : "Assinar"}</button><button class="button secondary contract-decline-button" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button></div>
      </article>`;
    });

    const cooldownCards = cooldowns.map(item => {
      const seconds = Math.max(0, Math.ceil(Number(item.timeRemaining) || 0));
      const progress = percent((1 - seconds / Math.max(1, item.durationSeconds)) * 100);
      const cooldownCopy = item.reason === "broken" ? "Quebra de contrato: intervalo de 4 minutos." : item.reason === "declined" ? "" : item.reason === "signed" ? "Contrato assinado: nova proposta em 30 segundos." : "Proposta expirada: nova oportunidade em 30 segundos.";
      return `<article class="contract-card contract-cooldown-card friendly-contract-card" aria-live="polite"><div class="cooldown-friendly"><img src="assets/icons/renovar-contrato.webp" alt=""><div><small>Proposta indisponível</small><h3>Nova oportunidade em ${engine.formatTime(seconds)}</h3>${cooldownCopy ? `<p>${cooldownCopy}</p>` : ""}</div></div><div class="progress-track"><span style="width:${progress}%"></span></div></article>`;
    });
    const availableCards = [...offerCards, ...cooldownCards];
    dom.contractOfferList.innerHTML = availableCards.length
      ? availableCards.join("")
      : `<div class="empty-state office-empty">${runtimeTextHtml("emptyContractRenewal", "As propostas estão em renovação. Aguarde o término dos intervalos.")}</div>`;
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

