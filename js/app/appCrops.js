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
        ? `<span class="crop-required-label"><span>Necessário:</span><span>Fazenda nível ${crop.unlockLevel}</span></span>`
        : `<span class="crop-buy-button-label">Comprar</span><span class="crop-buy-button-cost">${resourceAmount("coins", -buyCost, { compact: true })}</span>`;
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
    const speedMaxed = data.level >= engine.getInstantGrowthLevel();
    const mastered = data.level >= GameEngine.MAX_CROP_LEVEL;
    const masteryXpPercent = Math.max(0, Number(GameEngine.CROP_MASTERY_XP_RATE) || 0) * 100;
    const selection = getCropUpgradeSelection(crop.id);

    return `
      <article class="crop-card ${mastered ? "crop-mastered" : ""}" data-live-render-key="${renderKey}" data-live-render-signature="owned|${data.level}|${mastered ? 1 : 0}|${numberFormat}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" title="${mastered ? `Nível máximo alcançado e bônus de ${engine.formatNumber(masteryXpPercent)}% de XP` : speedMaxed ? `Velocidade máxima; ao alcançar o nível 500 esta cultura concede ${engine.formatNumber(masteryXpPercent)}% de XP` : `Ao alcançar o nível 500 esta cultura concede ${engine.formatNumber(masteryXpPercent)}% de XP`}">
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
          ${mastered ? `<span class="crop-mastery-badge" aria-label="Cultura no nível máximo"><img alt="" src="assets/icons/estrela-dominio-cultura.webp"></span>` : ""}
        </div>
        <div class="crop-head">
          <div class="crop-loader ${optimizedRing ? "is-static" : ""}" data-crop-loader data-last-progress="${growthPct}" title="Progresso da produção">
            <svg class="crop-loader-svg" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
              <circle class="crop-loader-track" cx="30" cy="30" r="26.5"></circle>
              <circle class="crop-loader-progress" cx="30" cy="30" r="26.5" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - growthPct}" data-crop-progress-circle></circle>
            </svg>
            <img class="crop-loader-image" src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy">
            ${optimizedRing ? "" : `<span class="crop-loader-percent" data-crop-percent><span data-crop-percent-text>${Math.floor(growthPct)}%</span></span>`}
          </div>
          <div class="crop-info">
            <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
            <div class="crop-meta-row"><span class="crop-category-list">${escapeHtml(category)}</span></div>
          </div>
        </div>
        ${mastered ? "" : `<div class="crop-upgrade-panel crop-upgrade-redesign">
          <div class="upgrade-mode-selector" role="group" aria-label="Quantidade de níveis">
            <button class="upgrade-mode-option ${selection.mode === "one" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="one" data-crop="${crop.id}" aria-pressed="${selection.mode === "one"}">+1</button>
            <button class="upgrade-mode-option ${selection.mode === "max" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="max" data-crop="${crop.id}" aria-pressed="${selection.mode === "max"}">Max</button>
          </div>
          <div class="crop-upgrade-summary" data-crop-upgrade-summary><strong data-crop-upgrade-levels>+${selection.mode === "max" ? selection.levels : 1}</strong></div>
          <button class="button primary full crop-upgrade-cta" type="button" data-action="upgrade-crop-selected" data-crop="${crop.id}" data-crop-upgrade-action ${!selection.affordable ? "disabled" : ""}><span class="crop-upgrade-button-label" data-crop-upgrade-label>Aprimorar</span><span class="crop-upgrade-button-cost">${resourceAmount("coins", -selection.cost, { compact: true })}</span></button>
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
