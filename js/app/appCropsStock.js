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
    return cropUpgradeModes.get(cropId) === "one" ? "one" : "max";
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
      const value = summary.querySelector("[data-crop-upgrade-levels]") || summary.querySelector("strong");
      const text = selection.maxed ? "Máx." : `+${upgradeLevels}`;
      if (value && value.textContent !== text) value.textContent = text;
    }
    if (action) {
      action.disabled = selection.maxed || !selection.affordable;
      const label = action.querySelector("[data-crop-upgrade-label]");
      const labelText = selection.maxed ? "Plantação concluída" : "Aprimorar";
      if (label && label.textContent !== labelText) label.textContent = labelText;
      const amount = action.querySelector(".resource-amount b");
      const costText = engine.formatNumber(Math.abs(Number(selection.cost) || 0));
      if (amount && amount.textContent !== costText) amount.textContent = costText;
      const resource = action.querySelector(".resource-amount");
      if (resource) resource.hidden = selection.maxed;
    }
  }

  // Renderização das áreas do jogo.
  function renderCropCard(crop) {
    const data = engine.state.crops[crop.id];
    const category = engine.data.categories[crop.category];
    const unlocked = engine.isCropUnlocked(crop.id);
    const buyCost = engine.getBuyCost(crop.id);
    const canAffordPurchase = engine.state.coins >= buyCost;
    const mysteryNameGlyphs = "•".repeat(Math.max(1, Array.from(String(crop.name || "")).length));
    const numberFormat = engine.state.settings.numberFormat || "brazilian";
    const renderKey = `crop:${crop.id}`;

    if (!data.owned) {
      const purchaseLabel = !unlocked
        ? `Necessário: Fazenda nível ${crop.unlockLevel}`
        : `Comprar ${resourceAmount("coins", -buyCost, { compact: true })}`;
      return `
        <article class="crop-card locked ${!unlocked ? "level-locked" : ""} ${unlocked && !canAffordPurchase ? "insufficient" : ""}" data-live-render-key="${renderKey}" data-live-render-signature="locked|${unlocked ? 1 : 0}|${numberFormat}" data-locked-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
          <div class="crop-level-strip locked-level-strip"><span class="crop-level-compact">Nível <strong>0</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span></div>
          <div class="crop-head">
            <div class="crop-art locked-art ${unlocked ? "crop-preview-unlocked" : "crop-preview-level-locked"}"><img src="${unlocked ? crop.image : "assets/icons/cadeado.webp"}" alt="${unlocked ? escapeHtml(crop.name) : "Cultura bloqueada"}" loading="lazy"></div>
            <div class="crop-info">
              <div class="crop-title-row"><h3>${unlocked ? escapeHtml(crop.name) : `<span class="mystery-crop-name" aria-hidden="true"><span class="mystery-crop-glyphs">${mysteryNameGlyphs}</span></span><span class="sr-only">Nome oculto até o desbloqueio</span>`}</h3></div>
              <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
            </div>
          </div>
          <button class="button primary full crop-buy-button" type="button" data-action="buy-crop" data-crop="${crop.id}" data-crop-purchase ${unlocked && canAffordPurchase ? "" : "disabled"}>${purchaseLabel}</button>
        </article>`;
    }

    const growthTime = engine.getGrowthTime(crop.id);
    const instant = growthTime <= 0;
    const optimizedRing = instant || growthTime <= 1.5;
    const growthPct = optimizedRing ? 100 : percent(data.progress * 100);
    const directRoute = data.autoSell
      || engine.hasActiveContractForCrop(crop.id)
      || engine.hasWholesaleOverflowSale();
    const storageFull = engine.getStorageRemaining() <= 0 && !directRoute;
    const speedMaxed = data.level >= engine.getInstantGrowthLevel();
    const mastered = data.level >= GameEngine.MAX_CROP_LEVEL;
    const masteryXpPercent = Math.max(0, Number(GameEngine.CROP_MASTERY_XP_RATE) || 0) * 100;
    const cycleLabel = instant ? "Contínua" : storageFull ? "Pausada" : formatLiveTime((1 - data.progress) * growthTime);
    const selection = getCropUpgradeSelection(crop.id);

    return `
      <article class="crop-card ${data.autoSell ? "auto-sell-enabled" : ""} ${mastered ? "crop-mastered" : ""}" data-live-render-key="${renderKey}" data-live-render-signature="owned|${data.level}|${mastered ? 1 : 0}|${numberFormat}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" title="${mastered ? `Nível máximo alcançado e bônus de ${engine.formatNumber(masteryXpPercent)}% de XP` : speedMaxed ? `Velocidade máxima; ao alcançar o nível 500 esta cultura concede ${engine.formatNumber(masteryXpPercent)}% de XP` : `Ao alcançar o nível 500 esta cultura concede ${engine.formatNumber(masteryXpPercent)}% de XP`}">
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
          ${mastered ? `<span class="crop-mastery-badge" aria-label="Cultura no nível máximo"><img alt="" src="assets/icons/estrela-dominio-cultura.webp"></span>` : ""}
        </div>
        <div class="crop-head">
          <div class="crop-art-progress ${storageFull ? "paused" : ""} ${optimizedRing ? "instant optimized-ring" : ""}" data-crop-ring data-last-progress="${growthPct}" style="--growth-progress:${growthPct}%" title="Progresso da produção">
            <div class="crop-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            ${optimizedRing ? "" : `<span class="crop-progress-percent ${storageFull ? "is-paused" : ""}" data-crop-percent><span data-crop-percent-text ${storageFull ? "hidden" : ""}>${Math.floor(growthPct)}%</span><img data-crop-paused-icon src="assets/icons/pausa-producao.webp" alt="Produção pausada" ${storageFull ? "" : "hidden"}></span>`}
          </div>
          <div class="crop-info">
            <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
            <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
            <div class="crop-quick-stats">
              <span title="Tempo restante"><i class="crop-time-icon"><img src="assets/icons/relogio.webp" alt=""></i><b data-crop-cycle>${cycleLabel}</b></span>
            </div>
          </div>
        </div>
        ${mastered ? "" : `<div class="crop-upgrade-panel crop-upgrade-redesign">
          <div class="upgrade-mode-selector" role="group" aria-label="Quantidade de níveis">
            <button class="upgrade-mode-option ${selection.mode === "one" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="one" data-crop="${crop.id}" aria-pressed="${selection.mode === "one"}">+1</button>
            <button class="upgrade-mode-option ${selection.mode === "max" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="max" data-crop="${crop.id}" aria-pressed="${selection.mode === "max"}">Max</button>
          </div>
          <div class="crop-upgrade-summary" data-crop-upgrade-summary><strong data-crop-upgrade-levels>+${selection.mode === "max" ? selection.levels : 1}</strong></div>
          <button class="button primary full crop-upgrade-cta" type="button" data-action="upgrade-crop-selected" data-crop="${crop.id}" data-crop-upgrade-action ${!selection.affordable ? "disabled" : ""}><span data-crop-upgrade-label>Aprimorar</span> ${resourceAmount("coins", -selection.cost, { compact: true })}</button>
        </div>`}
      </article>`;
  }

  function renderCrops() {
    if (!Array.isArray(engine.data.crops) || !engine.data.crops.length) {
      if (dom.cropGrid.childElementCount) dom.cropGrid.replaceChildren();
      dom.cropEmpty.innerHTML = runtimeTextHtml("emptyCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo.");
      dom.cropEmpty.classList.remove("hidden");
      rebuildLiveCropCache();
      return;
    }

    const term = normalize(dom.searchCrop.value);
    const filters = catalogFilters.farm;
    // A Fazenda continua funcionando como catálogo completo, mas os filtros
    // permitem esconder culturas já prestigiadas, futuras e/ou categorias.
    const list = engine.data.crops.filter(crop => {
      const cropState = engine.state.crops[crop.id];
      const categoryName = engine.data.categories[crop.category] || "";
      const unlocked = engine.isCropUnlocked(crop.id);
      const mastered = Boolean(cropState?.owned && cropState.level >= GameEngine.MAX_CROP_LEVEL);
      if (filters.hideMastered && mastered) return false;
      if (filters.hideLocked && !unlocked) return false;
      if (filters.categories.size && !filters.categories.has(crop.category)) return false;
      const searchableName = unlocked ? crop.name : "";
      return !term || normalize(`${searchableName} ${categoryName}`).includes(term);
    }).sort((a, b) => a.index - b.index);

    reconcileLiveCards(dom.cropGrid, list.map(renderCropCard).join(""));
    if (list.length) {
      dom.cropEmpty.classList.add("hidden");
    } else {
      dom.cropEmpty.innerHTML = runtimeTextHtml("emptyCropFilter", "Nenhuma planta corresponde aos filtros atuais.");
      dom.cropEmpty.classList.remove("hidden");
    }
    rebuildLiveCropCache();
  }

  function renderStock() {
    const term = normalize(dom.stockSearch?.value || "");
    const allOwned = engine.data.crops.filter(crop => engine.state.crops[crop.id].owned)
      .sort((a, b) => Number(Boolean(engine.state.crops[b.id]?.favorite)) - Number(Boolean(engine.state.crops[a.id]?.favorite)) || a.index - b.index);
    const filters = catalogFilters.stock;
    const owned = allOwned.filter(crop => {
      const data = engine.state.crops[crop.id];
      const mastered = data.level >= GameEngine.MAX_CROP_LEVEL;
      if (filters.hideMastered && mastered) return false;
      if (filters.categories.size && !filters.categories.has(crop.category)) return false;
      return !term || normalize(`${crop.name} ${engine.data.categories[crop.category] || ""}`).includes(term);
    });
    const totalCapacity = engine.getStorageCap();
    const storageUsed = engine.getStorageUsed();
    const storagePct = percent((storageUsed / totalCapacity) * 100);
    const totalValue = allOwned.reduce((sum, crop) => sum + engine.state.crops[crop.id].stock * engine.getSalePrice(crop.id), 0);
    const expansionCost = engine.getDirectStorageExpansionCost();
    const canExpandStorage = engine.state.coins >= expansionCost;

    const allAutoSellEnabled = allOwned.length > 0 && allOwned.every(crop => engine.state.crops[crop.id].autoSell);
    const enabledAutoSellCount = allOwned.filter(crop => engine.state.crops[crop.id].autoSell).length;

    const stockSummaryMarkup = `
      <article class="summary-card storage-capacity-card normalized-summary-card" data-live-render-key="stock-summary-capacity" data-live-render-signature="capacity|${engine.getStorageCap()}|${engine.getDirectStorageExpansionCost()}|${engine.state.settings.numberFormat || "brazilian"}">
        <div class="summary-card-heading"><div><small>Estoque</small><strong data-stock-summary-capacity>${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}</strong></div><span class="summary-status ${storagePct >= 100 ? "full" : ""}" data-stock-summary-status>${storagePct >= 100 ? "Cheio" : "Capacidade"}</span></div>
        <div class="progress-track growth"><span data-stock-summary-progress style="width:${Math.min(100, storagePct)}%"></span></div>
        <button class="button primary full storage-expand-button" type="button" data-action="expand-storage" ${canExpandStorage ? "" : "disabled"}>+100 espaços de armazenamento ${resourceAmount("coins", -expansionCost, { compact: true })}</button>
      </article>
      <article class="summary-card stock-sale-summary normalized-summary-card" data-live-render-key="stock-summary-sale" data-live-render-signature="sale|${engine.state.settings.numberFormat || "brazilian"}">
        <div class="summary-card-heading"><div><small>Venda geral</small><strong data-stock-summary-items>${engine.formatNumber(storageUsed)} itens</strong></div><span class="summary-status">Mercado</span></div>
        <button class="button primary full" type="button" data-action="sell-all-stock" data-stock-sell-all ${storageUsed <= 0 ? "disabled" : ""}><span data-stock-sell-all-label>${storageUsed > 0 ? "Vender estoque" : "Estoque vazio"}</span> <span data-stock-sell-all-value ${storageUsed > 0 ? "" : "hidden"}>${resourceAmount("coins", totalValue, { compact: true })}</span></button>
      </article>
      <article class="summary-card stock-auto-summary normalized-summary-card" data-live-render-key="stock-summary-auto" data-live-render-signature="auto|${allOwned.length}|${enabledAutoSellCount}|${allAutoSellEnabled ? 1 : 0}">
        <div class="summary-card-heading"><div><small>Venda automática geral</small><strong>${enabledAutoSellCount} / ${allOwned.length} ativas</strong></div><span class="summary-status">Automação</span></div>
        <button class="auto-sell-toggle global-auto-sell-toggle ${allAutoSellEnabled ? "active" : ""}" type="button" data-action="toggle-all-auto-sell" aria-pressed="${String(allAutoSellEnabled)}" ${allOwned.length ? "" : "disabled"}><span><strong>${allAutoSellEnabled ? "Desativar todas" : "Ativar todas"}</strong><small>${allAutoSellEnabled ? "Todas as vendas estão ativas" : enabledAutoSellCount ? "Ativar as vendas restantes" : "Nenhuma venda automática ativa"}</small></span><span class="auto-sell-switch"><i></i></span></button>
      </article>`;
    reconcileLiveCards(dom.stockSummary, stockSummaryMarkup);

    const ownedCards = owned.map(crop => {
      const data = engine.state.crops[crop.id];
      const price = engine.getSalePrice(crop.id);
      return `
        <article class="stock-card normalized-stock-card ${data.autoSell ? "auto-sell-card" : ""} ${data.favorite ? "favorite-stock-card" : ""}" data-live-render-key="stock:${crop.id}" data-live-render-signature="stock|${data.favorite ? 1 : 0}|${data.autoSell ? 1 : 0}|${engine.state.settings.numberFormat || "brazilian"}" data-stock-crop="${crop.id}">
          <div class="stock-head"><div class="stock-ident"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"><div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div></div><button class="stock-favorite-button ${data.favorite ? "active" : ""}" type="button" data-action="toggle-stock-favorite" data-crop="${crop.id}" aria-pressed="${String(Boolean(data.favorite))}" aria-label="${data.favorite ? "Remover dos favoritos" : "Favoritar cultura"}" title="${data.favorite ? "Remover dos favoritos" : "Favoritar cultura"}">${data.favorite ? "★" : "☆"}</button></div>
          <div class="stock-value-grid"><div><small>Quantidade</small><strong><b data-stock-quantity>${engine.formatNumber(data.stock)}</b> <span>un.</span></strong></div><div><small>Valor un.</small><strong data-stock-unit-value>${resourceAmount("coins", price, { compact: true })}</strong></div><div><small>Valor total</small><strong data-stock-total-value>${resourceAmount("coins", data.stock * price, { compact: true })}</strong></div></div>
          <button class="auto-sell-toggle compact-auto-toggle ${data.autoSell ? "active" : ""}" type="button" data-action="toggle-auto-sell" data-crop="${crop.id}" aria-pressed="${String(data.autoSell)}"><span><strong>Venda automática</strong><small>${data.autoSell ? "Ativada" : "Desativada"}</small></span><span class="auto-sell-switch"><i></i></span></button>
          <div class="stock-actions"><button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.25" ${data.stock <= 0 ? "disabled" : ""}>25%</button><button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.5" ${data.stock <= 0 ? "disabled" : ""}>50%</button><button class="button primary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="1" ${data.stock <= 0 ? "disabled" : ""}>Vender tudo</button></div>
        </article>`;
    });
    const cards = ownedCards;
    const stockGridMarkup = cards.length
      ? cards.join("")
      : `<div class="empty-state" data-live-render-key="stock-empty" data-live-render-signature="empty">${engine.data.crops.length
        ? runtimeTextHtml("emptyStockCategory", "Nenhum item corresponde aos filtros atuais.")
        : runtimeTextHtml("emptyCropsCatalog", "Nenhuma planta foi publicada no catálogo administrativo.")}</div>`;
    reconcileLiveCards(dom.stockGrid, stockGridMarkup);
  }

