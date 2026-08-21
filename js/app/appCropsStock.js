"use strict";
  function getCropGlow(category) {
    const colors = {
      leaf: "rgba(131, 187, 101, .20)",
      root: "rgba(204, 145, 87, .18)",
      fruit: "rgba(222, 119, 101, .16)",
      tree: "rgba(147, 183, 95, .18)",
      grain: "rgba(225, 187, 88, .20)",
      tropical: "rgba(230, 153, 87, .18)",
      bush: "rgba(164, 113, 177, .15)",
      industry: "rgba(102, 162, 159, .17)"
    };
    return colors[category] || "rgba(151, 195, 126, .18)";
  }

  function getCropUpgradeMode(cropId) {
    const cropState = engine.state.crops[cropId];
    if (cropState?.level >= GameEngine.MAX_CROP_LEVEL) return "max";
    return cropUpgradeModes.get(cropId) === "max" ? "max" : "one";
  }

  function getCropUpgradeSelection(cropId) {
    const cropState = engine.state.crops[cropId];
    const mode = getCropUpgradeMode(cropId);
    const maxed = cropState.level >= GameEngine.MAX_CROP_LEVEL;
    const oneCost = maxed ? 0 : engine.getCropUpgradeCost(cropId);
    const affordablePlan = engine.getCropAffordableUpgrades(cropId);
    const levels = mode === "max" ? (maxed ? 0 : Math.max(1, affordablePlan.levels)) : maxed ? 0 : 1;
    const affordable = !maxed && (mode === "max" ? affordablePlan.levels > 0 : engine.state.coins >= oneCost);
    // Sem níveis acessíveis, mostramos o custo do próximo nível em vez de “0”.
    const cost = mode === "max"
      ? (affordablePlan.levels > 0 ? affordablePlan.totalCost : affordablePlan.nextCost)
      : oneCost;
    return { mode, maxed, oneCost, affordablePlan, cost, levels, affordable };
  }

  function updateCropUpgradePanel(card, cropId) {
    const cropState = engine.state.crops[cropId];
    if (!cropState?.owned) return;
    const selection = getCropUpgradeSelection(cropId);
    $$('[data-upgrade-mode]', card).forEach(button => {
      const active = button.dataset.upgradeMode === selection.mode;
      button.classList.toggle("active", active);
      button.disabled = selection.maxed;
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-disabled", String(selection.maxed));
    });
    const summary = $('[data-crop-upgrade-summary]', card);
    const action = $('[data-crop-upgrade-action]', card);
    if (summary) {
      const upgradeLevels = selection.mode === "max" ? selection.levels : 1;
      summary.innerHTML = `<strong>${selection.maxed ? "Máx." : `+${upgradeLevels}`}</strong>`;
    }
    if (action) {
      action.disabled = selection.maxed || !selection.affordable;
      action.innerHTML = selection.maxed
        ? "Plantação concluída"
        : `Aprimorar ${resourceAmount("coins", -selection.cost, { compact: true })}`;
    }
  }

  // Renderização das áreas do jogo.
  function renderCropCard(crop) {
    const data = engine.state.crops[crop.id];
    const category = engine.data.categories[crop.category];
    const unlocked = engine.isCropUnlocked(crop.id);
    const buyCost = engine.getBuyCost(crop.id);
    const canAffordPurchase = engine.state.coins >= buyCost;

    if (!data.owned) {
      const purchaseLabel = !unlocked
        ? `Necessário: Fazenda nível ${crop.unlockLevel}`
        : `Comprar ${resourceAmount("coins", -buyCost, { compact: true })}`;
      return `
        <article class="crop-card locked ${!unlocked ? "level-locked" : ""} ${unlocked && !canAffordPurchase ? "insufficient" : ""}" data-locked-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
          <div class="crop-level-strip locked-level-strip"><span class="crop-level-compact">Nível <strong>0</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span></div>
          <div class="crop-head">
            <div class="crop-art locked-art ${unlocked ? "crop-preview-unlocked" : "crop-preview-level-locked"}"><img src="${unlocked ? crop.image : "assets/icons/cadeado.webp"}" alt="${unlocked ? escapeHtml(crop.name) : "Cultura bloqueada"}" loading="lazy"></div>
            <div class="crop-info">
              <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
              <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
            </div>
          </div>
          <button class="button primary full crop-buy-button" type="button" data-action="buy-crop" data-crop="${crop.id}" data-crop-purchase ${unlocked && canAffordPurchase ? "" : "disabled"}>${purchaseLabel}</button>
        </article>`;
    }

    const growthTime = engine.getGrowthTime(crop.id);
    const instant = growthTime <= 0;
    const growthPct = instant ? 100 : percent(data.progress * 100);
    const directRoute = data.autoSell
      || engine.hasActiveContractForCrop(crop.id)
      || engine.hasWholesaleOverflowSale();
    const storageFull = engine.getStorageRemaining() <= 0 && !directRoute;
    const speedMaxed = data.level >= engine.getInstantGrowthLevel();
    const mastered = data.level >= GameEngine.MAX_CROP_LEVEL;
    const cycleLabel = instant ? "Contínua" : storageFull ? "Pausada" : formatLiveTime((1 - data.progress) * growthTime);
    const selection = getCropUpgradeSelection(crop.id);

    return `
      <article class="crop-card ${data.autoSell ? "auto-sell-enabled" : ""} ${mastered ? "crop-mastered" : ""}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" title="${mastered ? "Cultura platinada: nível 500 alcançado e bônus de 10% de XP recebido" : speedMaxed ? "Velocidade máxima; ao alcançar o nível 500 esta cultura concede 10% de XP" : "Ao alcançar o nível 500 esta cultura concede 10% de XP"}">
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
          ${mastered ? `<span class="crop-mastery-badge"><img alt="" src="assets/icons/estrela-dominio-cultura.webp">Platinada</span>` : ""}
        </div>
        <div class="crop-head">
          <div class="crop-art-progress ${storageFull ? "paused" : ""} ${instant ? "instant" : ""}" data-crop-ring data-last-progress="${growthPct}" style="--growth-progress:${growthPct}%" title="Progresso da produção">
            <div class="crop-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            ${instant ? "" : `<span class="crop-progress-percent" data-crop-percent>${storageFull ? "Ⅱ" : `${Math.floor(growthPct)}%`}</span>`}
          </div>
          <div class="crop-info">
            <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
            <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
            <div class="crop-quick-stats">
              <span title="Tempo restante"><i>◷</i><b data-crop-cycle>${cycleLabel}</b></span>
            </div>
          </div>
        </div>
        <div class="crop-upgrade-panel crop-upgrade-redesign">
          <div class="upgrade-mode-selector" role="group" aria-label="Quantidade de níveis">
            <button class="upgrade-mode-option ${selection.mode === "one" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="one" data-crop="${crop.id}" aria-pressed="${selection.mode === "one"}" ${selection.maxed ? 'disabled aria-disabled="true"' : ""}>+1</button>
            <button class="upgrade-mode-option ${selection.mode === "max" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="max" data-crop="${crop.id}" aria-pressed="${selection.mode === "max"}" ${selection.maxed ? 'disabled aria-disabled="true"' : ""}>Max</button>
          </div>
          <div class="crop-upgrade-summary" data-crop-upgrade-summary><strong>${selection.maxed ? "Máx." : `+${selection.mode === "max" ? selection.levels : 1}`}</strong></div>
          <button class="button primary full crop-upgrade-cta" type="button" data-action="upgrade-crop-selected" data-crop="${crop.id}" data-crop-upgrade-action ${selection.maxed || !selection.affordable ? "disabled" : ""}>${selection.maxed ? "Plantação concluída" : `Aprimorar ${resourceAmount("coins", -selection.cost, { compact: true })}`}</button>
        </div>
      </article>`;
  }

  function renderCrops() {
    if (!Array.isArray(engine.data.crops) || !engine.data.crops.length) {
      dom.cropGrid.innerHTML = "";
      dom.cropEmpty.innerHTML = runtimeTextHtml("emptyCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo.");
      dom.cropEmpty.classList.remove("hidden");
      rebuildLiveCropCache();
      return;
    }

    const term = normalize(dom.searchCrop.value);
    const category = dom.categoryFilter.value;
    // A Fazenda funciona como catálogo completo: todas as culturas permanecem
    // visíveis, inclusive as que ainda exigem níveis futuros.
    const list = engine.data.crops.filter(crop => {
      const cropState = engine.state.crops[crop.id];
      const categoryName = engine.data.categories[crop.category];
      const matchesCategory = category === "locked"
        ? !cropState.owned
        : category === "all" || crop.category === category;
      return matchesCategory && (!term || normalize(`${crop.name} ${categoryName}`).includes(term));
    }).sort((a, b) => a.index - b.index);

    dom.cropGrid.innerHTML = list.map(renderCropCard).join("");
    if (list.length) {
      dom.cropEmpty.classList.add("hidden");
    } else {
      dom.cropEmpty.innerHTML = runtimeTextHtml("emptyCropFilter", "Nenhuma planta corresponde aos filtros atuais.");
      dom.cropEmpty.classList.remove("hidden");
    }
    rebuildLiveCropCache();
  }

  function renderStock() {
    const categoryFilter = dom.stockCategoryFilter?.value || "all";
    const allOwned = engine.data.crops.filter(crop => engine.state.crops[crop.id].owned);
    const owned = allOwned.filter(crop => categoryFilter === "all" || crop.category === categoryFilter);
    const totalCapacity = engine.getStorageCap();
    const storageUsed = engine.getStorageUsed();
    const storagePct = percent((storageUsed / totalCapacity) * 100);
    const totalValue = allOwned.reduce((sum, crop) => sum + engine.state.crops[crop.id].stock * engine.getSalePrice(crop.id), 0);
    const expansionCost = engine.getDirectStorageExpansionCost();
    const canExpandStorage = engine.state.coins >= expansionCost;

    const allAutoSellEnabled = allOwned.length > 0 && allOwned.every(crop => engine.state.crops[crop.id].autoSell);
    const enabledAutoSellCount = allOwned.filter(crop => engine.state.crops[crop.id].autoSell).length;

    dom.stockSummary.innerHTML = `
      <article class="summary-card storage-capacity-card normalized-summary-card">
        <div class="summary-card-heading"><div><small>Estoque compartilhado</small><strong>${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}</strong></div><span class="summary-status ${storagePct >= 100 ? "full" : ""}">${storagePct >= 100 ? "Cheio" : "Capacidade"}</span></div>
        <div class="progress-track growth"><span style="width:${Math.min(100, storagePct)}%"></span></div>
        <button class="button primary full storage-expand-button" type="button" data-action="expand-storage" ${canExpandStorage ? "" : "disabled"}>+100 espaços de armazenamento ${resourceAmount("coins", -expansionCost, { compact: true })}</button>
      </article>
      <article class="summary-card stock-sale-summary normalized-summary-card">
        <div class="summary-card-heading"><div><small>Venda geral</small><strong>${engine.formatNumber(storageUsed)} itens</strong></div><span class="summary-status">Mercado</span></div>
        <p>Venda todo o conteúdo armazenado de uma só vez.</p>
        <button class="button primary full" type="button" data-action="sell-all-stock" ${storageUsed <= 0 ? "disabled" : ""}>${storageUsed > 0 ? `Vender estoque ${resourceAmount("coins", totalValue, { compact: true })}` : "Estoque vazio"}</button>
      </article>
      <article class="summary-card stock-auto-summary normalized-summary-card">
        <div class="summary-card-heading"><div><small>Venda automática geral</small><strong>${enabledAutoSellCount} / ${allOwned.length} ativas</strong></div><span class="summary-status">Automação</span></div>
        <p>Ative ou desative a venda automática de todas as culturas compradas.</p>
        <button class="auto-sell-toggle global-auto-sell-toggle ${allAutoSellEnabled ? "active" : ""}" type="button" data-action="toggle-all-auto-sell" aria-pressed="${String(allAutoSellEnabled)}" ${allOwned.length ? "" : "disabled"}><span><strong>${allAutoSellEnabled ? "Desativar todas" : "Ativar todas"}</strong><small>${allAutoSellEnabled ? "Todas as vendas estão ativas" : enabledAutoSellCount ? "Ativar as vendas restantes" : "Nenhuma venda automática ativa"}</small></span><span class="auto-sell-switch"><i></i></span></button>
      </article>`;

    const ownedCards = owned.map(crop => {
      const data = engine.state.crops[crop.id];
      const price = engine.getSalePrice(crop.id);
      return `
        <article class="stock-card normalized-stock-card ${data.autoSell ? "auto-sell-card" : ""}">
          <div class="stock-head"><div class="stock-ident"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"><div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div></div></div>
          <div class="stock-value-grid"><div><small>Quantidade</small><strong>${engine.formatNumber(data.stock)} <span>un.</span></strong></div><div><small>Valor unitário</small><strong>${resourceAmount("coins", price, { compact: true })}</strong></div><div><small>Valor guardado</small><strong>${resourceAmount("coins", data.stock * price, { compact: true })}</strong></div></div>
          <button class="auto-sell-toggle compact-auto-toggle ${data.autoSell ? "active" : ""}" type="button" data-action="toggle-auto-sell" data-crop="${crop.id}" aria-pressed="${String(data.autoSell)}"><span><strong>Venda automática</strong><small>${data.autoSell ? "Ativada" : "Desativada"}</small></span><span class="auto-sell-switch"><i></i></span></button>
          <div class="stock-actions"><button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.25" ${data.stock <= 0 ? "disabled" : ""}>25%</button><button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.5" ${data.stock <= 0 ? "disabled" : ""}>50%</button><button class="button primary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="1" ${data.stock <= 0 ? "disabled" : ""}>Vender tudo</button></div>
        </article>`;
    });
    const cards = ownedCards;
    dom.stockGrid.innerHTML = cards.length
      ? cards.join("")
      : `<div class="empty-state">${engine.data.crops.length
        ? runtimeTextHtml("emptyStockCategory", "Nenhum item pertence à categoria selecionada.")
        : runtimeTextHtml("emptyCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo.")}</div>`;
  }

