"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pendingEvents = [];
  let engine = null;
  let lastFrame = performance.now();
  let lastRender = 0;
  let lastSave = 0;
  let activeView = "farmView";
  let activeOfficeTab = "contracts";

  const dom = {
    tabs: $$(".nav-tab[data-view]"),
    views: $$("[data-view-panel]"),
    cropGrid: $("#cropGrid"),
    cropEmpty: $("#cropEmpty"),
    searchCrop: $("#searchCrop"),
    categoryFilter: $("#categoryFilter"),
    sortCrops: $("#sortCrops"),
    stockGrid: $("#stockGrid"),
    stockSummary: $("#stockSummary"),
    upgradeList: $("#upgradeList"),
    researchList: $("#researchList"),
    prestigeDashboard: $("#prestigeDashboard"),
    prestigeList: $("#prestigeList"),
    contractList: $("#contractList"),
    orderList: $("#orderList"),
    missionList: $("#missionList"),
    officeSummary: $("#officeSummary"),
    officeTabs: $$("[data-office-tab]"),
    officePanels: $$("[data-office-panel]"),
    contractTabCount: $("#contractTabCount"),
    orderTabCount: $("#orderTabCount"),
    missionTabCount: $("#missionTabCount"),
    seasonPanel: $("#seasonPanel"),
    farmMetrics: $("#farmMetrics"),
    toastZone: $("#toastZone"),
    saveBox: $("#saveBox"),
    coinsCounter: $("#coinsCounter"),
    researchCounter: $("#researchCounter"),
    prestigeCounter: $("#prestigeCounter"),
    farmLevelLabel: $("#farmLevelLabel"),
    farmXPBar: $("#farmXPBar"),
    farmXPText: $("#farmXPText"),
    stockNavBadge: $("#stockNavBadge"),
    officeNavBadge: $("#officeNavBadge"),
    ambientSetting: $("#ambientSetting"),
    reducedMotionSetting: $("#reducedMotionSetting"),
    compactCardsSetting: $("#compactCardsSetting"),
    uiScaleSetting: $("#uiScaleSetting"),
    uiScaleText: $("#uiScaleText")
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function percent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function toast(message, type = "") {
    if (!message) return;
    const item = document.createElement("div");
    item.className = `toast ${type}`.trim();
    item.innerHTML = `<span aria-hidden="true">${type === "error" ? "!" : type === "success" ? "✓" : "🍃"}</span><span>${escapeHtml(message)}</span>`;
    dom.toastZone.appendChild(item);
    window.setTimeout(() => item.remove(), 3600);
  }

  function handleEngineEvent(event) {
    if (!event) return;
    if (event.type === "toast") toast(event.message);
    if (event.type === "season") toast(`Chegou ${event.season.name}. ${event.season.description}`);
    if (event.type === "level") toast(`A fazenda alcançou o nível ${event.level}. Novas sementes podem ter sido liberadas.`, "success");
    if (event.type === "offline") toast(`Enquanto você esteve longe, a fazenda produziu ${engine ? engine.formatNumber(event.harvested) : Math.floor(event.harvested)} itens.`);
  }

  engine = new GameEngine(event => {
    if (!engine) pendingEvents.push(event);
    else handleEngineEvent(event);
  });
  pendingEvents.splice(0).forEach(handleEngineEvent);

  function setupCategoryFilter() {
    const options = Object.entries(engine.data.categories)
      .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
      .join("");
    dom.categoryFilter.insertAdjacentHTML("beforeend", options);
  }

  function showView(viewId, updateHash = true) {
    activeView = dom.views.some(view => view.id === viewId) ? viewId : "farmView";
    dom.views.forEach(view => view.classList.toggle("active", view.id === activeView));
    dom.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.view === activeView));
    if (updateHash) history.replaceState(null, "", `#${activeView}`);
    render(true);
    window.scrollTo({ top: 0, behavior: engine.state.settings.reducedMotion ? "auto" : "smooth" });
  }

  function applySettings() {
    const settings = engine.state.settings;
    document.body.dataset.ambient = String(Boolean(settings.ambient));
    document.body.classList.toggle("reduce-motion", Boolean(settings.reducedMotion));
    document.body.classList.toggle("compact-cards", Boolean(settings.compactCards));
    document.documentElement.style.setProperty("--ui-scale", String((Number(settings.uiScale) || 100) / 100));

    if (document.activeElement !== dom.ambientSetting) dom.ambientSetting.checked = Boolean(settings.ambient);
    if (document.activeElement !== dom.reducedMotionSetting) dom.reducedMotionSetting.checked = Boolean(settings.reducedMotion);
    if (document.activeElement !== dom.compactCardsSetting) dom.compactCardsSetting.checked = Boolean(settings.compactCards);
    if (document.activeElement !== dom.uiScaleSetting) dom.uiScaleSetting.value = String(settings.uiScale || 100);
    dom.uiScaleText.textContent = `${settings.uiScale || 100}%`;
  }

  function renderHeader() {
    const state = engine.state;
    const farmNeed = engine.getFarmXPNeed();
    dom.coinsCounter.textContent = engine.formatNumber(state.coins);
    dom.researchCounter.textContent = engine.formatNumber(state.research);
    dom.prestigeCounter.textContent = engine.formatNumber(state.prestigePoints);
    dom.farmLevelLabel.textContent = state.farmLevel;
    dom.farmXPBar.style.width = `${percent((state.farmXP / farmNeed) * 100)}%`;
    dom.farmXPText.textContent = `${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)} XP`;

    const metrics = engine.getMetrics();
    dom.stockNavBadge.textContent = engine.formatNumber(metrics.stock);
    const readyContracts = state.contracts.filter(contract => state.crops[contract.cropId]?.stock >= contract.amount).length;
    const readyOrders = engine.getReadyOrderCount();
    const readyMissions = engine.data.missions.filter(mission => !state.missionsClaimed[mission.id] && engine.missionValue(mission.metric, mission) >= mission.target).length;
    dom.officeNavBadge.textContent = String(readyContracts + readyOrders + readyMissions);
    dom.contractTabCount.textContent = String(readyContracts);
    dom.orderTabCount.textContent = String(readyOrders);
    dom.missionTabCount.textContent = String(readyMissions);
  }

  function renderSeason() {
    const season = engine.currentSeason();
    const progress = percent((engine.state.seasonElapsed / GameEngine.SEASON_DURATION) * 100);
    const remaining = GameEngine.SEASON_DURATION - engine.state.seasonElapsed;
    dom.seasonPanel.style.setProperty("--season-soft", season.soft);
    dom.seasonPanel.style.setProperty("--season-color", season.color);
    dom.seasonPanel.innerHTML = `
      <div class="season-ring" style="--season-progress:${progress}%; --season-color:${season.color}">
        <img src="${season.icon}" alt="${escapeHtml(season.name)}">
      </div>
      <div class="season-copy">
        <small>Estação atual</small>
        <h2>${escapeHtml(season.name)}</h2>
        <p>${escapeHtml(season.description)}</p>
        <span class="season-time">Muda em ${engine.formatTime(remaining)}</span>
      </div>`;
  }

  function renderFarmMetrics() {
    const metrics = engine.getMetrics();
    dom.farmMetrics.innerHTML = `
      <span class="metric-chip">🌱 <strong>${metrics.owned}</strong> / ${engine.data.crops.length} culturas</span>
      <span class="metric-chip">🧺 <strong>${engine.formatNumber(metrics.stock)}</strong> / ${engine.formatNumber(metrics.storageCapacity)} no celeiro</span>
      <span class="metric-chip">🧾 <strong>${metrics.orders}</strong> pedidos nesta jornada</span>
      <span class="metric-chip">📋 <strong>${metrics.contracts}</strong> contratos nesta jornada</span>`;
  }

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

  function renderCropCard(crop) {
    const data = engine.state.crops[crop.id];
    const category = engine.data.categories[crop.category];
    const unlocked = engine.isCropUnlocked(crop.id);
    const bestNames = crop.best.map(id => engine.data.seasons.find(item => item.id === id)?.name).filter(Boolean).join(" e ");

    if (!data.owned) {
      const requirements = [];
      if (engine.state.farmLevel < crop.unlockLevel) requirements.push(`nível ${crop.unlockLevel} da fazenda`);
      return `
        <article class="crop-card locked" style="--crop-glow:${getCropGlow(crop.category)}">
          <div class="crop-level-strip locked-level-strip">
            <span>Ainda não cultivada</span>
          </div>
          <div class="crop-head">
            <div class="crop-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
            <div class="crop-info">
              <div class="crop-title-row"><h3>${escapeHtml(crop.name)}</h3></div>
              <div class="crop-meta-row">
                <span class="crop-category">${escapeHtml(category)}</span>
                <span class="crop-season-tag">Melhor: ${escapeHtml(bestNames || "todas")}</span>
                <span class="crop-price-chip"><img src="img/icons/coin.png" alt="">${engine.formatNumber(engine.getBuyCost(crop.id))}</span>
              </div>
            </div>
          </div>
          <div class="locked-copy">
            <div class="unlock-line"><span>Desbloqueio</span><strong>${requirements.length ? escapeHtml(requirements.join(" · ")) : "Disponível"}</strong></div>
            <div class="unlock-line"><span>Compra da cultura</span><strong>${engine.formatMoney(engine.getBuyCost(crop.id))}</strong></div>
          </div>
          <button class="button primary full" type="button" data-action="buy-crop" data-crop="${crop.id}" ${unlocked ? "" : "disabled"}>${unlocked ? (engine.getBuyCost(crop.id) === 0 ? "Comprar gratuitamente" : "Comprar cultura") : `Libera no nível ${crop.unlockLevel}`}</button>
        </article>`;
    }

    const growthPct = percent(data.progress * 100);
    const growthTime = engine.getGrowthTime(crop.id);
    const price = engine.getSalePrice(crop.id);
    const effect = engine.getSeasonEffect(crop.id);
    const storageFull = engine.getStorageRemaining() <= 0;
    const affordable = engine.getCropAffordableUpgrades(crop.id);
    const nextCost = affordable.nextCost;
    const affordableText = affordable.levels > 0
      ? `Suas moedas permitem avançar +${affordable.levels} nível${affordable.levels === 1 ? "" : "is"} agora.`
      : `Próximo nível custa ${engine.formatMoney(nextCost)}.`;

    return `
      <article class="crop-card" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip">
          <div class="crop-level-copy"><span>Nível da plantação</span><strong>${data.level}</strong></div>
        </div>

        <div class="crop-head">
          <div class="crop-art">
            <img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy">
          </div>
          <div class="crop-info">
            <div class="crop-title-row">
              <h3>${escapeHtml(crop.name)}</h3>
            </div>
            <div class="crop-meta-row">
              <span class="crop-category">${escapeHtml(category)}</span>
              <span class="crop-season-tag">${escapeHtml(effect.label)}</span>
              <span class="crop-price-chip" title="Preço atual por unidade"><img src="img/icons/coin.png" alt="">${engine.formatNumber(price)}</span>
            </div>
          </div>
        </div>

        <div class="crop-production ${storageFull ? "storage-paused" : ""}">
          <div class="progress-label">
            <span>${storageFull ? "Produção pausada: celeiro cheio" : "Produzindo para o celeiro"}</span>
            <strong>${growthPct.toFixed(0)}%${storageFull ? "" : ` · ${engine.formatTime((1 - data.progress) * growthTime)}`}</strong>
          </div>
          <div class="progress-track growth"><span style="width:${growthPct}%"></span></div>
          <div class="production-foot"><span>🧺 ${engine.formatNumber(data.stock)} desta cultura guardados</span><span>Produção automática</span></div>
        </div>

        <div class="crop-upgrade-panel">
          <div class="crop-upgrade-copy">
            <strong>Aprimorar plantação</strong>
            <small>${affordableText}</small>
          </div>
          <div class="crop-upgrade-actions">
            <button class="button soft compact-button" type="button" data-action="upgrade-crop-once" data-crop="${crop.id}" ${engine.state.coins < nextCost ? "disabled" : ""}>+1 · ${engine.formatNumber(nextCost)}</button>
            <button class="button primary compact-button" type="button" data-action="upgrade-crop-max" data-crop="${crop.id}" ${affordable.levels < 1 ? "disabled" : ""}>Máximo${affordable.levels > 0 ? ` (+${affordable.levels})` : ""}</button>
          </div>
        </div>

        <div class="crop-actions">
          <button class="button secondary" type="button" data-action="sell-crop" data-crop="${crop.id}" ${data.stock <= 0 ? "disabled" : ""}>Vender estoque</button>
        </div>
      </article>`;
  }

  function renderCrops() {
    const term = normalize(dom.searchCrop.value);
    const category = dom.categoryFilter.value;
    const sort = dom.sortCrops.value;
    const visibleUnlockLevel = engine.state.farmLevel + 1;
    let list = engine.data.crops.filter(crop => {
      const categoryName = engine.data.categories[crop.category];
      const visibleByProgress = engine.state.crops[crop.id].owned || crop.unlockLevel <= visibleUnlockLevel;
      return visibleByProgress && (category === "all" || crop.category === category) && (!term || normalize(`${crop.name} ${categoryName}`).includes(term));
    });

    list = [...list].sort((a, b) => {
      if (sort === "owned") return Number(engine.state.crops[b.id].owned) - Number(engine.state.crops[a.id].owned) || a.index - b.index;
      if (sort === "stock") return engine.state.crops[b.id].stock - engine.state.crops[a.id].stock || a.index - b.index;
      if (sort === "level") return engine.state.crops[b.id].level - engine.state.crops[a.id].level || a.index - b.index;
      if (sort === "price") return engine.getSalePrice(b.id) - engine.getSalePrice(a.id) || a.index - b.index;
      return a.index - b.index;
    });

    dom.cropGrid.innerHTML = list.map(renderCropCard).join("");
    dom.cropEmpty.classList.toggle("hidden", list.length > 0);
  }

  function renderStock() {
    const owned = engine.data.crops.filter(crop => engine.state.crops[crop.id].owned);
    const metrics = engine.getMetrics();
    const totalCapacity = engine.getStorageCap();
    const storageUsed = engine.getStorageUsed();
    const storageAvailable = engine.getStorageRemaining();
    const storagePct = percent((storageUsed / totalCapacity) * 100);
    const totalValue = owned.reduce((sum, crop) => sum + engine.state.crops[crop.id].stock * engine.getSalePrice(crop.id), 0);
    const warehouse = engine.data.upgrades.find(item => item.id === "warehouse");
    const warehouseLevel = Number(engine.state.upgrades.warehouse || 0);
    const warehouseMaxed = warehouseLevel >= warehouse.max;
    const warehouseCost = warehouseMaxed ? 0 : engine.getUpgradeCost(warehouse, engine.state.upgrades);
    dom.stockSummary.innerHTML = `
      <article class="summary-card storage-capacity-card">
        <div class="storage-summary-head"><span><small>Estoque compartilhado</small><strong>${engine.formatNumber(storageUsed)} / ${engine.formatNumber(totalCapacity)}</strong></span><b>${storagePct.toFixed(0)}%</b></div>
        <div class="progress-track growth"><span style="width:${Math.min(100, storagePct)}%"></span></div>
        <button class="button soft compact-button full" type="button" data-action="buy-upgrade" data-id="warehouse" ${warehouseMaxed || engine.state.coins < warehouseCost ? "disabled" : ""}>${warehouseMaxed ? "Capacidade máxima" : `Aumentar +100 · ${engine.formatNumber(warehouseCost)}`}</button>
      </article>
      <article class="summary-card"><small>Espaço disponível</small><strong>${engine.formatNumber(storageAvailable)}</strong></article>
      <article class="summary-card"><small>Valor estimado</small><strong>${engine.formatMoney(totalValue)}</strong></article>
      <article class="summary-card"><small>Total vendido</small><strong>${engine.formatNumber(metrics.sold)}</strong></article>`;

    if (!owned.length) {
      dom.stockGrid.innerHTML = `<div class="empty-state">Compre sua primeira cultura para começar a encher o celeiro.</div>`;
      return;
    }

    dom.stockGrid.innerHTML = owned.map(crop => {
      const data = engine.state.crops[crop.id];
      const price = engine.getSalePrice(crop.id);
      const share = storageUsed > 0 ? percent((data.stock / storageUsed) * 100) : 0;
      return `
        <article class="stock-card">
          <div class="stock-head">
            <div class="stock-ident">
              <img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy">
              <div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div>
            </div>
            <span class="crop-price-chip"><img src="img/icons/coin.png" alt="">${engine.formatNumber(price)}</span>
          </div>
          <div class="stock-amount">
            <strong>${engine.formatNumber(data.stock)} unidades</strong>
            <small>${share.toFixed(0)}% do conteúdo atual do celeiro · ${engine.formatMoney(price)} por unidade</small>
          </div>
          <div class="stock-actions">
            <button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.25" ${data.stock <= 0 ? "disabled" : ""}>Vender 25%</button>
            <button class="button secondary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="0.5" ${data.stock <= 0 ? "disabled" : ""}>Vender 50%</button>
            <button class="button primary" data-action="sell-fraction" data-crop="${crop.id}" data-fraction="1" ${data.stock <= 0 ? "disabled" : ""}>Vender tudo</button>
          </div>
        </article>`;
    }).join("");
  }

  function renderUpgradeCard(item, kind) {
    const source = kind === "upgrade" ? engine.state.upgrades : kind === "research" ? engine.state.researchTechs : engine.state.prestigeUpgrades;
    const level = Number(source[item.id] || 0);
    const maxed = level >= item.max;
    const cost = maxed ? 0 : engine.getUpgradeCost(item, source);
    const currency = kind === "upgrade" ? "moedas" : kind === "research" ? "pesquisa" : "prestígio";
    const action = kind === "upgrade" ? "buy-upgrade" : kind === "research" ? "buy-research" : "buy-prestige-upgrade";
    return `
      <article class="upgrade-card">
        <div class="upgrade-head">
          <div><h3>${escapeHtml(item.name)}</h3><span class="crop-category">Nível ${level} / ${item.max}</span></div>
          <span class="upgrade-icon" aria-hidden="true">${item.icon}</span>
        </div>
        <p>${escapeHtml(item.desc)}</p>
        <div class="upgrade-level-row"><span>Próximo nível</span><strong>${maxed ? "Máximo" : `${engine.formatNumber(cost)} ${currency}`}</strong></div>
        <button class="button ${kind === "prestige" ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed ? "disabled" : ""}>${maxed ? "Concluído" : "Aprimorar"}</button>
      </article>`;
  }

  function renderEvolutions() {
    dom.upgradeList.innerHTML = engine.data.upgrades.map(item => renderUpgradeCard(item, "upgrade")).join("");
    dom.researchList.innerHTML = engine.data.research.map(item => renderUpgradeCard(item, "research")).join("");
    dom.prestigeList.innerHTML = engine.data.prestigeUpgrades.map(item => renderUpgradeCard(item, "prestige")).join("");

    const gain = engine.getPrestigeEstimate();
    const metrics = engine.getMetrics();
    dom.prestigeDashboard.innerHTML = `
      <div class="prestige-copy">
        <p class="eyebrow">renascimento e legado</p>
        <h2>Comece uma nova estação da sua história</h2>
        <p>Prestigiar reinicia moedas, culturas, níveis das plantações, infraestrutura e pesquisa. Pontos de prestígio, legados, missões concluídas e totais históricos permanecem.</p>
      </div>
      <div class="prestige-side">
        <div class="prestige-stat-row">
          <div class="prestige-stat"><small>Ganho agora</small><strong>+${gain}</strong></div>
          <div class="prestige-stat"><small>Prestígios feitos</small><strong>${engine.state.stats.prestiges}</strong></div>
          <div class="prestige-stat"><small>Bônus de missão</small><strong>${engine.state.permanentBonuses.prestigeDouble ? "2× pontos" : "Ainda bloqueado"}</strong></div>
          <div class="prestige-stat"><small>Culturas</small><strong>${metrics.owned}</strong></div>
          <div class="prestige-stat"><small>Moedas nesta jornada</small><strong>${engine.formatNumber(engine.state.stats.runCoinsEarned)}</strong></div>
        </div>
        <button class="button gold full" type="button" data-action="perform-prestige" ${gain < 1 ? "disabled" : ""}>Prestigiar e receber ${gain} ponto${gain === 1 ? "" : "s"}</button>
      </div>`;
  }

  function renderOfficeSummary() {
    const owned = engine.getOwnedCrops().length;
    const completeOrderSeries = engine.getOwnedCrops().filter(crop => engine.getOrder(crop.id)?.complete).length;
    dom.officeSummary.innerHTML = `
      <article class="office-summary-card"><span>📑</span><div><small>Contratos cumpridos</small><strong>${engine.formatNumber(engine.state.stats.lifetimeContractsCompleted)}</strong></div></article>
      <article class="office-summary-card"><span>🧾</span><div><small>Pedidos concluídos</small><strong>${engine.formatNumber(engine.state.stats.lifetimeOrdersCompleted)}</strong></div></article>
      <article class="office-summary-card"><span>🌱</span><div><small>Culturas com pedidos</small><strong>${owned}</strong></div></article>
      <article class="office-summary-card"><span>✅</span><div><small>Séries finalizadas</small><strong>${completeOrderSeries}</strong></div></article>`;
  }

  function showOfficeTab(tabId) {
    activeOfficeTab = ["contracts", "orders", "missions"].includes(tabId) ? tabId : "contracts";
    dom.officeTabs.forEach(tab => {
      const active = tab.dataset.officeTab === activeOfficeTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    dom.officePanels.forEach(panel => {
      const active = panel.dataset.officePanel === activeOfficeTab;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function renderContracts() {
    if (!engine.state.contracts.length) {
      dom.contractList.innerHTML = `<div class="empty-state office-empty">Compre sua primeira cultura para a cooperativa começar a enviar contratos.</div>`;
      return;
    }

    dom.contractList.innerHTML = engine.state.contracts.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const stock = engine.state.crops[contract.cropId].stock;
      const ready = stock >= contract.amount;
      return `
        <article class="contract-card">
          <div class="contract-head">
            <div class="contract-crop">
              <img src="${crop.image}" alt="${escapeHtml(crop.name)}">
              <div><small>Contrato temporário</small><h3>${escapeHtml(crop.name)}</h3></div>
            </div>
            <span class="status-tag contract-timer">${engine.formatTime(contract.timeLeft)}</span>
          </div>
          <p>Uma oportunidade da cooperativa com prazo e recompensa superior à venda comum.</p>
          <div class="contract-lines">
            <div class="contract-line ${ready ? "ready" : ""}"><span>Remessa</span><strong>${engine.formatNumber(stock)} / ${engine.formatNumber(contract.amount)}</strong></div>
            <div class="contract-line"><span>Pagamento</span><strong>${engine.formatMoney(contract.rewardCoins)}</strong></div>
            <div class="contract-line"><span>Pesquisa</span><strong>+${contract.rewardResearch}</strong></div>
          </div>
          <button class="button primary full" type="button" data-action="complete-contract" data-id="${contract.id}" ${ready ? "" : "disabled"}>${ready ? "Cumprir contrato" : `Faltam ${engine.formatNumber(contract.amount - stock)}`}</button>
        </article>`;
    }).join("");
  }

  function renderOrders() {
    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">Cada cultura comprada libera automaticamente sua própria sequência de pedidos.</div>`;
      return;
    }

    dom.orderList.innerHTML = owned.map(crop => {
      const order = engine.getOrder(crop.id);
      const stock = engine.state.crops[crop.id].stock;
      if (order.complete) {
        return `
          <article class="order-card order-complete">
            <div class="order-head">
              <div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3></div></div>
              <span class="status-tag">${order.totalTiers}/${order.totalTiers}</span>
            </div>
            <div class="order-finished-mark">✓</div>
            <p>Todos os pedidos desta cultura foram atendidos. A produção continua disponível para vendas e contratos.</p>
          </article>`;
      }

      const progress = percent((order.delivered / order.amount) * 100);
      const deliverNow = Math.min(stock, order.remaining);
      return `
        <article class="order-card">
          <div class="order-head">
            <div class="contract-crop"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Pedido ${order.tier + 1} de ${order.totalTiers}</small><h3>${escapeHtml(crop.name)}</h3></div></div>
            <span class="status-tag permanent-tag">Sem prazo</span>
          </div>
          <p>Entregue ${engine.formatNumber(order.amount)} unidades. Você pode completar este pedido em várias remessas.</p>
          <div class="order-progress">
            <div class="progress-label"><span>Entregue</span><strong>${engine.formatNumber(order.delivered)} / ${engine.formatNumber(order.amount)}</strong></div>
            <div class="progress-track growth"><span style="width:${progress}%"></span></div>
          </div>
          <div class="contract-lines">
            <div class="contract-line"><span>No estoque agora</span><strong>${engine.formatNumber(stock)}</strong></div>
            <div class="contract-line"><span>Recompensa final</span><strong>${engine.formatMoney(order.rewardCoins)}${order.rewardResearch ? ` + ${order.rewardResearch} pesquisa` : ""}</strong></div>
          </div>
          <button class="button primary full" type="button" data-action="deliver-order" data-crop="${crop.id}" ${deliverNow < 1 ? "disabled" : ""}>${deliverNow > 0 ? `Entregar ${engine.formatNumber(deliverNow)} disponível${deliverNow === order.remaining ? " e concluir" : ""}` : `Faltam ${engine.formatNumber(order.remaining)}`}</button>
        </article>`;
    }).join("");
  }

  function rewardText(reward) {
    const parts = [];
    if (reward.coins) parts.push(engine.formatMoney(reward.coins));
    if (reward.research) parts.push(`${reward.research} pesquisa`);
    if (reward.prestige) parts.push(`${reward.prestige} prestígio`);
    if (reward.permanent === "prestigeDouble") parts.push("dobro de pontos em todos os próximos prestígios");
    return parts.join(" + ");
  }

  function renderMissions() {
    dom.missionList.innerHTML = engine.data.missions.map(mission => {
      const value = engine.missionValue(mission.metric, mission);
      const completed = value >= mission.target;
      const claimed = Boolean(engine.state.missionsClaimed[mission.id]);
      const progress = percent((value / mission.target) * 100);
      return `
        <article class="mission-card ${claimed ? "claimed" : ""}">
          <div class="mission-head">
            <div><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div>
            <span class="status-tag">${claimed ? "Concluída" : completed ? "Pronta" : "Em andamento"}</span>
          </div>
          <div class="mission-progress">
            <div class="progress-label"><span>Progresso</span><strong>${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}</strong></div>
            <div class="progress-track growth"><span style="width:${progress}%"></span></div>
          </div>
          <div class="mission-reward"><span>Recompensa</span><strong>${escapeHtml(rewardText(mission.reward))}</strong></div>
          <button class="button ${completed && !claimed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" ${completed && !claimed ? "" : "disabled"}>${claimed ? "Recompensa recebida" : completed ? "Receber recompensa" : "Continue cultivando"}</button>
        </article>`;
    }).join("");
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastRender < 700) return;
    lastRender = now;
    renderHeader();
    applySettings();

    if (activeView === "farmView") {
      renderSeason();
      renderFarmMetrics();
      renderCrops();
    } else if (activeView === "stockView") {
      renderStock();
    } else if (activeView === "evolveView") {
      renderEvolutions();
    } else if (activeView === "officeView") {
      renderOfficeSummary();
      renderContracts();
      renderOrders();
      renderMissions();
      showOfficeTab(activeOfficeTab);
    }
  }

  function act(result, successMessage = "") {
    if (!result?.ok) {
      if (result?.message) toast(result.message, "error");
      return false;
    }
    if (successMessage) toast(typeof successMessage === "function" ? successMessage(result) : successMessage, "success");
    render(true);
    return true;
  }

  function handleAction(button) {
    const action = button.dataset.action;
    const cropId = button.dataset.crop;
    const id = button.dataset.id;

    if (action === "buy-crop") act(engine.buyCrop(cropId));
    if (action === "upgrade-crop-once") act(engine.upgradeCrop(cropId, 1), result => `${result.crop.name} aprimorada para o nível ${result.level}.`);
    if (action === "upgrade-crop-max") act(engine.upgradeCropMax(cropId), result => `${result.crop.name} avançou ${result.purchased} nível${result.purchased === 1 ? "" : "is"} e chegou ao nível ${result.level}.`);
    if (action === "sell-crop") {
      const stock = engine.state.crops[cropId]?.stock || 0;
      act(engine.sellCrop(cropId, stock), result => `Venda concluída: +${engine.formatMoney(result.gain)}.`);
    }
    if (action === "sell-fraction") {
      const stock = engine.state.crops[cropId]?.stock || 0;
      const amount = Math.max(1, Math.floor(stock * Number(button.dataset.fraction || 1)));
      act(engine.sellCrop(cropId, amount), result => `${engine.formatNumber(result.sold)} itens vendidos por ${engine.formatMoney(result.gain)}.`);
    }
    if (action === "buy-upgrade") act(engine.buyUpgrade(id), "Infraestrutura aprimorada.");
    if (action === "buy-research") act(engine.buyResearch(id), "Nova etapa da pesquisa concluída.");
    if (action === "buy-prestige-upgrade") act(engine.buyPrestigeUpgrade(id), "Legado permanente aprimorado.");
    if (action === "complete-contract") act(engine.completeContract(id), result => `Contrato cumprido: +${engine.formatMoney(result.contract.rewardCoins)}${result.contract.rewardResearch ? ` e +${result.contract.rewardResearch} pesquisa` : ""}.`);
    if (action === "deliver-order") act(engine.deliverOrder(cropId), result => result.completed
      ? `Pedido concluído: +${engine.formatMoney(result.order.rewardCoins)}${result.order.rewardResearch ? ` e +${result.order.rewardResearch} pesquisa` : ""}.`
      : `${engine.formatNumber(result.delivered)} unidades entregues. O progresso ficou salvo.`);
    if (action === "claim-mission") act(engine.claimMission(id), result => `Missão concluída: ${rewardText(result.mission.reward)}.`);
    if (action === "perform-prestige") {
      const gain = engine.getPrestigeEstimate();
      if (gain < 1) return;
      if (!window.confirm(`Prestigiar agora reiniciará esta jornada e concederá ${gain} ponto(s) permanente(s). Continuar?`)) return;
      act(engine.performPrestige(), result => `Nova jornada iniciada com +${result.gain} ponto(s) de prestígio.`);
    }
  }

  function setupEvents() {
    dom.tabs.forEach(tab => tab.addEventListener("click", () => showView(tab.dataset.view)));
    dom.officeTabs.forEach(tab => tab.addEventListener("click", () => {
      showOfficeTab(tab.dataset.officeTab);
      render(true);
    }));
    $$('[data-go-view]').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      showView(link.dataset.goView);
    }));

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (button && !button.disabled) handleAction(button);
    });

    [dom.searchCrop, dom.categoryFilter, dom.sortCrops].forEach(control => {
      control.addEventListener(control.tagName === "INPUT" ? "input" : "change", () => render(true));
    });

    $("#sellAllStock").addEventListener("click", () => {
      act(engine.sellAll(), result => `${engine.formatNumber(result.sold)} produtos vendidos por ${engine.formatMoney(result.gain)}.`);
    });

    $("#rerollContracts").addEventListener("click", () => {
      act(engine.rerollContracts(), result => `Novos contratos chegaram por ${engine.formatMoney(result.cost)}.`);
    });

    $("#saveNow").addEventListener("click", () => {
      const saved = engine.save();
      toast(saved ? "Progresso salvo no navegador." : "Não foi possível salvar neste navegador.", saved ? "success" : "error");
    });

    $("#exportSave").addEventListener("click", () => {
      const content = engine.exportSave();
      dom.saveBox.value = content;
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `agricultura-industrial-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast("Save exportado e preparado para download.", "success");
    });

    $("#importSave").addEventListener("click", () => {
      const text = dom.saveBox.value.trim();
      if (!text) return toast("Cole um save no campo de texto primeiro.", "error");
      if (!window.confirm("Importar este save substituirá o progresso atual. Continuar?")) return;
      try {
        engine.importSave(text);
        applySettings();
        render(true);
        toast("Save importado com sucesso.", "success");
      } catch (error) {
        console.warn(error);
        toast("O texto não contém um save válido.", "error");
      }
    });

    $("#resetGame").addEventListener("click", () => {
      if (!window.confirm("Apagar todo o progresso, inclusive prestígio e legados? Esta ação não pode ser desfeita.")) return;
      engine.hardReset();
      applySettings();
      showView("farmView");
      toast("Uma nova fazenda foi criada.", "success");
    });

    dom.ambientSetting.addEventListener("change", () => {
      engine.setSetting("ambient", dom.ambientSetting.checked);
      applySettings();
    });
    dom.reducedMotionSetting.addEventListener("change", () => {
      engine.setSetting("reducedMotion", dom.reducedMotionSetting.checked);
      applySettings();
    });
    dom.compactCardsSetting.addEventListener("change", () => {
      engine.setSetting("compactCards", dom.compactCardsSetting.checked);
      applySettings();
      render(true);
    });
    dom.uiScaleSetting.addEventListener("input", () => {
      engine.setSetting("uiScale", Number(dom.uiScaleSetting.value));
      applySettings();
    });

    window.addEventListener("beforeunload", () => engine.save());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) engine.save();
      lastFrame = performance.now();
    });
  }

  function gameLoop(now) {
    const dt = Math.max(0, Math.min(2, (now - lastFrame) / 1000));
    lastFrame = now;
    engine.tick(dt);
    render(false);

    if (now - lastSave >= 15000) {
      engine.save();
      lastSave = now;
    }
    requestAnimationFrame(gameLoop);
  }

  function boot() {
    setupCategoryFilter();
    setupEvents();
    const hashView = location.hash.replace("#", "");
    if (hashView && dom.views.some(view => view.id === hashView)) activeView = hashView;
    showView(activeView, false);
    applySettings();
    render(true);
    requestAnimationFrame(gameLoop);
  }

  boot();
})();
