"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const dom = {
    gate: $("#adminGate"), gateMessage: $("#adminGateMessage"), loader: $("#adminLoader"), signIn: $("#adminSignIn"), app: $("#adminApp"),
    userActions: $("#adminUserActions"), userLabel: $("#adminUserLabel"), signOut: $("#adminSignOut"), cloudStatus: $("#adminCloudStatus"), feedback: $("#adminFeedback"),
    actionXP: $("#adminActionXP"), cropMasteryXPPercent: $("#adminCropMasteryXPPercent"), passiveXP: $("#adminPassiveXP"), passiveResearch: $("#adminPassiveResearch"),
    ordersUnlockLevel: $("#adminOrdersUnlockLevel"), evolutionsUnlockLevel: $("#adminEvolutionsUnlockLevel"), prestigeUnlockLevel: $("#adminPrestigeUnlockLevel"), prestigeBonus: $("#adminPrestigeBonus"), startingCoins: $("#adminStartingCoins"), storageCapacity: $("#adminStorageCapacity"), baseProductionMin: $("#adminBaseProductionMin"), baseProductionCap: $("#adminBaseProductionCap"),
    contractSignedCooldown: $("#adminContractSignedCooldown"), contractExpiredCooldown: $("#adminContractExpiredCooldown"), contractDeclinedCooldown: $("#adminContractDeclinedCooldown"), contractBrokenCooldown: $("#adminContractBrokenCooldown"), contractOfferCount: $("#adminContractOfferCount"), maxOfflineMinutes: $("#adminMaxOfflineMinutes"),
    workspaceSelect: $("#adminWorkspaceSelect"),
    navigationIconGrid: $("#adminNavigationIconGrid"), gridNavigationIconGrid: $("#adminGridNavigationIconGrid"), prestigeIconGrid: $("#adminPrestigeIconGrid"), saveNavigationIcons: $("#adminSaveNavigationIcons"),
    playerFeedbackList: $("#adminPlayerFeedbackList"), refreshPlayerFeedback: $("#adminRefreshPlayerFeedback"), feedbackTypeFilter: $("#adminFeedbackTypeFilter"), feedbackStatusFilter: $("#adminFeedbackStatusFilter"), feedbackFilterCount: $("#adminFeedbackFilterCount"),
    textsEditor: $("#adminTextsEditor"), saveBalance: $("#adminSaveBalance"), saveTexts: $("#adminSaveTexts"),
    administratorForm: $("#adminAdministratorForm"), administratorEmail: $("#adminAdministratorEmail"), administratorName: $("#adminAdministratorName"), administratorList: $("#adminAdministratorList"),
    globalResetCoins: $("#adminGlobalResetCoins"), globalResetResearchPoints: $("#adminGlobalResetResearchPoints"), globalResetPrestigePoints: $("#adminGlobalResetPrestigePoints"), globalResetOrders: $("#adminGlobalResetOrders"), globalResolveCrops: $("#adminGlobalResolveCrops"), globalResolveResearch: $("#adminGlobalResolveResearch"), globalRefundResearch: $("#adminGlobalRefundResearch"), globalResetEvolutions: $("#adminGlobalResetEvolutions"), globalRefundEvolutions: $("#adminGlobalRefundEvolutions"), globalRefreshPlayers: $("#adminGlobalRefreshPlayers"), globalPlayerSelect: $("#adminGlobalPlayerSelect"), globalPlayerStatus: $("#adminGlobalPlayerStatus"), globalPlayerCoins: $("#adminGlobalPlayerCoins"), globalPlayerResearch: $("#adminGlobalPlayerResearch"), globalPlayerPrestigePoints: $("#adminGlobalPlayerPrestigePoints"), globalPlayerPrestigeCount: $("#adminGlobalPlayerPrestigeCount"), globalPlayerFarmLevel: $("#adminGlobalPlayerFarmLevel"), globalPlayerApply: $("#adminGlobalPlayerApply"), globalPlayerRanking: $("#adminGlobalPlayerRanking"), globalPlayerReset: $("#adminGlobalPlayerReset"), globalPlayerBan: $("#adminGlobalPlayerBan"), globalFeedback: $("#adminGlobalFeedback")
  };
  const balanceFields = [
    ["actionXPPercent", dom.actionXP, true, false],
    ["cropMasteryXPPercent", dom.cropMasteryXPPercent, true, false],
    ["passiveXPPercentPerSecond", dom.passiveXP, true, false],
    ["passiveResearchPercentPerSecond", dom.passiveResearch, true, false],
    ["ordersUnlockLevel", dom.ordersUnlockLevel, false, true], ["evolutionsUnlockLevel", dom.evolutionsUnlockLevel, false, true], ["prestigeUnlockLevel", dom.prestigeUnlockLevel, false, true], ["prestigeBonus", dom.prestigeBonus, false, true], ["startingCoins", dom.startingCoins, false, true], ["storageCapacity", dom.storageCapacity, false, true], ["baseProductionMin", dom.baseProductionMin, false, true], ["baseProductionCap", dom.baseProductionCap, false, true],
    ["contractSignedCooldownRange", dom.contractSignedCooldown, false, false, true], ["contractExpiredCooldownRange", dom.contractExpiredCooldown, false, false, true], ["contractDeclinedCooldownRange", dom.contractDeclinedCooldown, false, false, true], ["contractBrokenCooldownRange", dom.contractBrokenCooldown, false, false, true], ["contractOfferCount", dom.contractOfferCount, false, true], ["maxOfflineMinutes", dom.maxOfflineMinutes, false, true]
  ];
  const catalogNames = ["pointTypes", "categories", "crops", "companies", "contractTypes", "contractSlots", "orderSteps", "missions", "research", "prestigeUpgrades", "events", "updateNotes"];
  const PRIMARY_ADMIN_EMAIL = "kaikdossantossilva2@gmail.com";

  const navigationIconFields = Object.freeze([
    ["farm", "Fazenda"], ["stock", "Estoque"], ["office", "Escritório"], ["profile", "Perfil"], ["settings", "Configurações"],
    ["contracts", "Contratos"], ["orders", "Pedidos"], ["evolutions", "Evoluções"], ["account", "Minha Conta"], ["social", "Social"], ["missions", "Missões"]
  ]);
  const gridNavigationIconFields = Object.freeze([
    ["farm", "Fazenda"], ["stock", "Estoque"], ["contracts", "Contratos"], ["orders", "Pedidos"], ["evolutions", "Evoluções"],
    ["account", "Minha Conta"], ["social", "Social"], ["missions", "Missões"], ["settings", "Configurações"]
  ]);
  const prestigeIconFields = Object.freeze([["resource", "Contador de prestígio"], ["account", "Painel de prestígio"], ["legacy", "Legado nas estatísticas"]]);
  let playerFeedbackLoaded = false;
  let globalPlayersLoaded = false;
  let globalPlayers = [];
  let selectedGlobalPlayer = null;
  let playerFeedbackItems = [];
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function orderedNavigationFields(fields, order = []) {
    const rank = new Map((order || []).map((key, index) => [key, index]));
    return [...fields].sort((a, b) => (rank.get(a[0]) ?? 999) - (rank.get(b[0]) ?? 999));
  }
  function navigationIconFieldMarkup(fields, values, attribute, order = []) {
    const options = window.AdminAssetRegistry?.options?.("icone") || [];
    return orderedNavigationFields(fields, order).map(([key, label]) => {
      const current = values?.[key] || options[0]?.value || "";
      return `<section class="admin-navigation-icon-field" data-navigation-row="${escapeHtml(key)}"><div class="admin-navigation-icon-field-title"><span>${escapeHtml(label)}</span><div class="admin-navigation-order-actions"><button class="admin-icon-order-button" data-nav-move="up" type="button" aria-label="Mover ${escapeHtml(label)} para cima">↑</button><button class="admin-icon-order-button" data-nav-move="down" type="button" aria-label="Mover ${escapeHtml(label)} para baixo">↓</button></div></div><select autocomplete="off" data-image-select ${attribute}="${key}">${options.map(item => `<option value="${escapeHtml(item.value)}" ${item.value === current ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></section>`;
    }).join("");
  }
  function buildNavigationIconFields(values = {}, gridValues = {}, lineOrder = [], gridOrder = [], prestigeValues = {}, prestigeOrder = []) {
    if (dom.navigationIconGrid) {
      dom.navigationIconGrid.innerHTML = navigationIconFieldMarkup(navigationIconFields, values, "data-navigation-icon-field", lineOrder);
      window.AdminImageSelect?.enhance?.(dom.navigationIconGrid);
    }
    if (dom.gridNavigationIconGrid) {
      dom.gridNavigationIconGrid.innerHTML = navigationIconFieldMarkup(gridNavigationIconFields, gridValues, "data-grid-navigation-icon-field", gridOrder);
      window.AdminImageSelect?.enhance?.(dom.gridNavigationIconGrid);
    }
    if (dom.prestigeIconGrid) {
      dom.prestigeIconGrid.innerHTML = navigationIconFieldMarkup(prestigeIconFields, prestigeValues, "data-prestige-icon-field", prestigeOrder);
      window.AdminImageSelect?.enhance?.(dom.prestigeIconGrid);
    }
  }
  function navigationIconsFromForm() {
    return Object.fromEntries(navigationIconFields.map(([key]) => [key, dom.navigationIconGrid?.querySelector(`[data-navigation-icon-field="${key}"]`)?.value || ""]));
  }
  function gridNavigationIconsFromForm() {
    return Object.fromEntries(gridNavigationIconFields.map(([key]) => [key, dom.gridNavigationIconGrid?.querySelector(`[data-grid-navigation-icon-field="${key}"]`)?.value || ""]));
  }
  function prestigeIconsFromForm() {
    return Object.fromEntries(prestigeIconFields.map(([key]) => [key, dom.prestigeIconGrid?.querySelector(`[data-prestige-icon-field="${key}"]`)?.value || ""]));
  }
  function navigationOrderFromGrid(grid) {
    return [...(grid?.querySelectorAll('[data-navigation-row]') || [])].map(row => row.dataset.navigationRow).filter(Boolean);
  }
  function bindNavigationOrderControls(grid) {
    grid?.addEventListener("click", event => {
      const button = event.target.closest("[data-nav-move]");
      if (!button) return;
      const row = button.closest("[data-navigation-row]");
      if (!row) return;
      const sibling = button.dataset.navMove === "up" ? row.previousElementSibling : row.nextElementSibling;
      if (!sibling) return;
      if (button.dataset.navMove === "up") grid.insertBefore(row, sibling);
      else grid.insertBefore(sibling, row);
    });
  }
  function drawPlayerFeedback() {
    if (!dom.playerFeedbackList) return;
    const typeFilter = dom.feedbackTypeFilter?.value || "all";
    const statusFilter = dom.feedbackStatusFilter?.value || "unread";
    const items = playerFeedbackItems.filter(item => {
      if (typeFilter !== "all" && String(item.type || "feedback") !== typeFilter) return false;
      const read = item.status === "read";
      if (statusFilter === "read" && !read) return false;
      if (statusFilter === "unread" && read) return false;
      return true;
    });
    if (dom.feedbackFilterCount) dom.feedbackFilterCount.textContent = `${items.length} ${items.length === 1 ? "mensagem" : "mensagens"}`;
    dom.playerFeedbackList.innerHTML = items.length ? items.map(item => {
      const typeLabel = item.type === "idea" ? "Ideia" : item.type === "problem" ? "Problema" : "Feedback";
      const unread = item.status !== "read";
      const date = new Date(Number(item.createdAtClient) || Date.now()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      return `<article class="admin-feedback-message ${unread ? "is-new" : ""}" data-feedback-id="${escapeHtml(item.id)}"><header><div><span>${typeLabel}</span><strong>${escapeHtml(item.subject)}</strong></div><time>${escapeHtml(date)}</time></header><p>${escapeHtml(item.message)}</p><footer><small>${escapeHtml(item.displayName || "Jogador")} · ${escapeHtml(item.email || "")}${item.gameVersion ? ` · v${escapeHtml(item.gameVersion)}` : ""}</small><div>${unread ? `<button class="admin-button compact secondary" data-feedback-action="read" data-feedback-id="${escapeHtml(item.id)}" type="button">Marcar como lido</button>` : '<span class="admin-feedback-read">Lido</span>'}<button class="admin-button compact danger" data-feedback-action="delete" data-feedback-id="${escapeHtml(item.id)}" type="button">Excluir</button></div></footer></article>`;
    }).join("") : '<div class="admin-catalog-empty">Nenhuma mensagem corresponde aos filtros selecionados.</div>';
  }

  async function renderPlayerFeedback(force = true) {
    if (!authorized || !dom.playerFeedbackList) return;
    playerFeedbackLoaded = true;
    if (!force && playerFeedbackItems.length) { drawPlayerFeedback(); return; }
    dom.playerFeedbackList.innerHTML = '<div class="admin-catalog-empty">Carregando mensagens...</div>';
    try {
      playerFeedbackItems = await window.FirebaseManager.listPlayerFeedback(120);
      drawPlayerFeedback();
    } catch (error) {
      dom.playerFeedbackList.innerHTML = `<div class="admin-catalog-empty">${escapeHtml(window.FirebaseManager.getFriendlyError(error))}</div>`;
    }
  }

  const clone = value => JSON.parse(JSON.stringify(value));
  let authorized = false, currentConfig = window.GameAdminConfig.getDefaults(), saveQueue = Promise.resolve(), validationToken = 0;

  const setFeedback = (message = "", type = "") => { dom.feedback.textContent = message; dom.feedback.dataset.type = type; };
  const parseJSON = value => { try { return JSON.parse(String(value || "{}")); } catch (error) { throw new Error(`JSON inválido em “Textos públicos”: ${error.message}`); } };
  const sanitize = (value, integer = false) => window.AdminInputTools?.sanitizePositive(value, integer) ?? String(value || "").replace(/[^0-9.,]/g, "");
  const parsePositive = (value, integer = false) => { const normalized = sanitize(value, integer).replace(",", "."); const number = Number(normalized || 0); return integer ? Math.max(0, Math.floor(number || 0)) : Math.max(0, Number.isFinite(number) ? number : 0); };
  const percent = value => `${sanitize(value)}%`;

  function selectWorkspace(name) {
    const workspaceAliases = {
      categories: "plantsCatalog", crops: "plantsCatalog",
      companies: "contractsCatalog", contractTypes: "contractsCatalog", contractSlots: "contractsCatalog",
      research: "evolutionsCatalog", prestigeUpgrades: "evolutionsCatalog",
      tests: "globalControl"
    };
    const raw = String(name || "balance");
    const selected = workspaceAliases[raw] || raw;
    document.querySelectorAll("[data-admin-section]").forEach(section => {
      section.hidden = section.dataset.adminSection !== selected;
    });
    if (dom.workspaceSelect && dom.workspaceSelect.value !== selected) dom.workspaceSelect.value = selected;
    try { sessionStorage.setItem("fazenda-serena-admin-section", selected); } catch {}
    if (selected === "playerFeedback" && authorized && !playerFeedbackLoaded) renderPlayerFeedback();
    if (selected === "globalControl" && authorized && !globalPlayersLoaded) loadGlobalPlayers().catch(error => setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"));
  }

  function bindPositiveInputs() {
    document.querySelectorAll("[data-admin-number]").forEach(input => {
      input.addEventListener("input", () => {
        const integer = input.hasAttribute("data-admin-integer");
        const sanitized = sanitize(input.value, integer);
        input.value = input.hasAttribute("data-admin-percent") && sanitized !== "" ? percent(sanitized) : sanitized;
        const caret = input.hasAttribute("data-admin-percent") && input.value ? Math.max(0, input.value.length - 1) : input.value.length;
        try { input.setSelectionRange(caret, caret); } catch {}
      });
      input.addEventListener("focus", () => {
        if (!input.hasAttribute("data-admin-percent") || !input.value) return;
        const caret = Math.max(0, input.value.length - 1);
        try { input.setSelectionRange(caret, caret); } catch {}
      });
      input.addEventListener("blur", () => { if (input.hasAttribute("data-admin-percent") && input.value !== "") input.value = percent(input.value); });
      input.addEventListener("keydown", event => {
        if (["e", "E", "-", "+"].includes(event.key)) event.preventDefault();
        if (input.hasAttribute("data-admin-integer") && [".", ","].includes(event.key)) event.preventDefault();
      });
    });
  }

  function balanceFromForm() { return Object.fromEntries(balanceFields.map(([key, element,, integer, range]) => { if (!range) return [key, parsePositive(element.value, integer)]; const parts = String(element.value || "").split(",").map(part => part.trim()).filter(Boolean).slice(0, 2).map(part => Math.max(1, parsePositive(part, true))); return [key, parts.length ? parts : [1, 1]]; })); }
  function getCatalogEditors() {
    const editors = window.AdminCatalogEditors;
    if (!editors || typeof editors.set !== "function" || typeof editors.get !== "function") {
      throw new Error("O editor administrativo não foi inicializado corretamente. Recarregue o painel e tente novamente.");
    }
    return editors;
  }
  function fillEditors(input, { source = "editor" } = {}) {
    const config = window.GameAdminConfig.normalize(input); currentConfig = clone(config);
    balanceFields.forEach(([key, element, isPercent,, range]) => { const raw = config.balance[key]; const value = range && Array.isArray(raw) ? raw.join(",") : String(raw); element.value = isPercent ? `${value}%` : value; });
    const editors = getCatalogEditors();
    catalogNames.forEach(name => editors.set(name, config[name])); buildNavigationIconFields(config.navigationIcons, config.gridNavigationIcons, config.lineNavigationOrder, config.gridNavigationOrder, config.prestigeIcons, config.prestigeIconOrder); dom.textsEditor.value = JSON.stringify(config.texts, null, 2);
    dom.cloudStatus.textContent = source === "cloud" ? "Configuração carregada da nuvem." : source === "empty" ? "Ainda não existe configuração publicada." : "Configuração carregada."; return config;
  }
  function setBusy(busy) { [dom.saveBalance, dom.saveTexts, dom.saveNavigationIcons, dom.globalResetCoins, dom.globalResetResearchPoints, dom.globalResetPrestigePoints, dom.globalResolveResearch, dom.globalResetEvolutions, dom.globalResolveCrops, dom.globalRefreshPlayers, dom.textsEditor, ...balanceFields.map(([, element]) => element)].filter(Boolean).forEach(element => { element.disabled = Boolean(busy); }); window.AdminCatalogEditors?.setBusy(Boolean(busy)); }
  function showGate(message, { login = false, loading = false } = {}) { authorized = false; dom.app.hidden = true; dom.gate.hidden = false; dom.gateMessage.textContent = message; dom.signIn.hidden = !login; dom.loader.hidden = !loading; dom.userActions.hidden = true; }
  function showApp(user) {
    authorized = true;
    dom.gate.hidden = true;
    dom.app.hidden = false;
    dom.userActions.hidden = false;
    dom.userLabel.textContent = user.email || user.displayName || "Administrador";
    const remembered = (() => { try { return sessionStorage.getItem("fazenda-serena-admin-section") || "balance"; } catch { return "balance"; } })();
    selectWorkspace(remembered);
  }
  const redirectUnauthorized = () => window.setTimeout(() => window.location.replace("play.html"), 900);
  function queueCloudSave(message, task) { const run = async () => { setFeedback(message, "pending"); try { const result = await task(); setFeedback("Alteração salva na nuvem.", "success"); return result; } catch (error) { setFeedback(window.FirebaseManager.getFriendlyError(error), "error"); throw error; } }; saveQueue = saveQueue.then(run, run); return saveQueue; }
  async function publishConfig(nextConfig, successMessage = "Alteração publicada.") { if (!authorized) throw new Error("Esta conta não possui acesso administrativo."); const validated = window.GameAdminConfig.validateForSave(nextConfig); await window.FirebaseManager.savePublicGameConfig(validated); currentConfig = clone(validated); dom.cloudStatus.textContent = successMessage; return validated; }
  async function saveCatalog(name) { return queueCloudSave("Salvando na nuvem...", async () => {
    const next = clone(currentConfig);
    const editors = getCatalogEditors();
    next[name] = editors.get(name);
    if (name === "categories") { next.crops = editors.get("crops"); next.missions = editors.get("missions"); }
    if (name === "prestigeUpgrades") next.missions = editors.get("missions");
    if (name === "updateNotes") {
      const newest = next.updateNotes.slice().sort((a, b) => Number(b.publishedAt || 0) - Number(a.publishedAt || 0))[0];
      if (newest?.version) next.gameVersion = newest.version;
    }
    const published = await publishConfig(next, name === "updateNotes" ? "Nota publicada e versão do jogo atualizada." : "Alteração publicada.");
    window.FazendaSerenaPublicCloud?.clearCache?.();
    window.FazendaSerenaConfig?.applyCloudVersion?.(published.gameVersion);
    return published;
  }); }

  window.AdminCloudActions = { async beforeCatalogSave(kind, previous, next) {
    if (previous?.id && next?.id && previous.id !== next.id) getCatalogEditors().updateReferences(kind, previous.id, next.id);
    if (kind === "events") {
      const now = Date.now();
      const weekStart = window.GameAdminConfig.getWeekStart(now);
      next.weekAnchor = Number(previous?.weekAnchor) || weekStart;
      if (next.repeatWeekly !== true) {
        const occurrence = window.GameAdminConfig.getEventOccurrence({ ...next, weekAnchor }, now);
        if (occurrence.end <= now) next.weekAnchor = weekStart + 7 * 86400000;
      }
    }
  }, saveCatalog, restoreEditors() { fillEditors(currentConfig, { source: "cloud" }); }, showError(error) { setFeedback(window.FirebaseManager.getFriendlyError(error), "error"); } };

  const setGlobalFeedback = (message = "", type = "") => { if (!dom.globalFeedback) return; dom.globalFeedback.textContent = message; dom.globalFeedback.dataset.type = type; };
  const globalPlayerById = userId => globalPlayers.find(item => item.userId === userId) || null;
  function updateGlobalPlayerButtons(player = selectedGlobalPlayer) {
    const enabled = Boolean(player?.userId);
    [dom.globalPlayerApply, dom.globalPlayerRanking, dom.globalPlayerReset, dom.globalPlayerBan].filter(Boolean).forEach(button => { button.disabled = !enabled; });
    if (dom.globalPlayerRanking) dom.globalPlayerRanking.textContent = player?.moderation?.rankingBlocked ? "Desbloquear no ranking" : "Bloquear no ranking";
    if (dom.globalPlayerBan) dom.globalPlayerBan.textContent = player?.moderation?.banned ? "Desbanir jogador" : "Banir jogador";
    if (dom.globalPlayerStatus) {
      if (!enabled) dom.globalPlayerStatus.textContent = "Nenhum jogador selecionado.";
      else {
        const flags = [player.moderation?.banned ? "Banido" : "Ativo", player.moderation?.rankingBlocked ? "Ranking bloqueado" : "Ranking liberado"];
        dom.globalPlayerStatus.textContent = `${player.playerNickname || player.email || player.nickname || "Sem apelido"} · ${flags.join(" · ")}`;
      }
    }
  }
  function fillGlobalPlayerFields(player) {
    const state = player?.state || {};
    if (dom.globalPlayerCoins) dom.globalPlayerCoins.value = String(Math.floor(Number(state.coins) || 0));
    if (dom.globalPlayerResearch) dom.globalPlayerResearch.value = String(Math.max(0, Math.floor(Number(state.research) || 0)));
    if (dom.globalPlayerPrestigePoints) dom.globalPlayerPrestigePoints.value = String(Math.max(0, Math.floor(Number(state.prestigePoints) || 0)));
    if (dom.globalPlayerPrestigeCount) dom.globalPlayerPrestigeCount.value = String(Math.max(0, Math.floor(Number(state.stats?.prestiges) || 0)));
    if (dom.globalPlayerFarmLevel) dom.globalPlayerFarmLevel.value = String(Math.max(1, Math.floor(Number(state.farmLevel) || 1)));
  }
  async function selectGlobalPlayer(userId) {
    const uid = String(userId || "").trim();
    if (!uid) {
      selectedGlobalPlayer = null;
      fillGlobalPlayerFields(null);
      updateGlobalPlayerButtons(null);
      return null;
    }
    if (dom.globalPlayerStatus) dom.globalPlayerStatus.textContent = "Carregando jogador...";
    const detail = await window.FirebaseManager.loadPlayerSaveForAdmin(uid);
    const summary = globalPlayerById(uid) || {};
    selectedGlobalPlayer = { ...summary, ...detail, nickname: summary.nickname || window.FirebaseManager.normalizeNickname(detail.state?.settings?.playerNickname) || "Sem apelido" };
    fillGlobalPlayerFields(selectedGlobalPlayer);
    updateGlobalPlayerButtons(selectedGlobalPlayer);
    return selectedGlobalPlayer;
  }
  async function loadGlobalPlayers(force = false) {
    if (!authorized || !dom.globalPlayerSelect) return;
    if (!force && globalPlayersLoaded && globalPlayers.length) return;
    dom.globalPlayerSelect.disabled = true;
    const previous = dom.globalPlayerSelect.value;
    try {
      globalPlayers = await window.FirebaseManager.listPlayerSavesForAdmin();
      globalPlayersLoaded = true;
      dom.globalPlayerSelect.innerHTML = `<option value="">Selecione um jogador</option>${globalPlayers.map(player => `<option value="${escapeHtml(player.userId)}">${escapeHtml(player.playerNickname || player.email || player.nickname)} · Nv. ${player.farmLevel} · ${escapeHtml(String(player.userId || "").slice(0, 8))}${player.banned ? " · BANIDO" : ""}</option>`).join("")}`;
      const next = globalPlayers.some(player => player.userId === previous) ? previous : "";
      dom.globalPlayerSelect.value = next;
      if (next) await selectGlobalPlayer(next);
      else updateGlobalPlayerButtons(null);
    } finally {
      dom.globalPlayerSelect.disabled = false;
    }
  }
  async function resetGlobalResource(field, label) {
    if (!confirm(`Zerar ${label} de TODOS os jogadores?`)) return;
    setGlobalFeedback(`Resetando ${label}...`, "pending");
    const result = await window.FirebaseManager.mutateAllPlayerSavesForAdmin(state => {
      if (Number(state?.[field]) === 0) return false;
      state[field] = 0;
      return true;
    }, { mutationType: `reset-${field}-global` });
    setGlobalFeedback(`${result.updated} de ${result.scanned} saves alterados.`, "success");
    globalPlayersLoaded = false;
  }
  function evolutionCostAt(item, levelIndex) {
    const level = Math.max(0, Math.floor(Number(levelIndex) || 0));
    if (Array.isArray(item?.stageCosts) && Number.isFinite(Number(item.stageCosts[level]))) return Math.max(0, Math.ceil(Number(item.stageCosts[level]) || 0));
    return Math.max(0, Math.ceil((Number(item?.baseCost) || 0) * Math.pow(Math.max(.01, Number(item?.growth) || 1), level)));
  }
  function researchRefundForState(state) {
    const levels = { ...(state?.researchTechs || {}) };
    const retiredUpgradeResearchMap = {
      irrigationNetwork: "acceleratedGermination", harvestCrew: "hybridGenetics", regionalMarket: "priceForecast", reinforcedBarn: "coldChain",
      seedCooperative: "smartSeedCatalog", precisionTools: "cultivationAlgorithms", fieldAcademy: "agriculturalPedagogy", contractBureau: "negotiationModels",
      orderCenter: "orderOptimization", expressPacking: "logisticsSimulation"
    };
    Object.entries(retiredUpgradeResearchMap).forEach(([upgradeId, researchId]) => {
      levels[researchId] = Math.max(Number(levels[researchId]) || 0, Number(state?.upgrades?.[upgradeId]) || 0);
    });
    return (currentConfig?.research || []).reduce((total, item) => {
      const owned = Math.max(0, Math.min(Number(item.max) || 0, Math.floor(Number(levels[item.id]) || 0)));
      for (let level = 0; level < owned; level += 1) total += evolutionCostAt(item, level);
      return total;
    }, 0);
  }
  function prestigeRefundForState(state) {
    const levels = { ...(state?.prestigeUpgrades || {}) };
    return (currentConfig?.prestigeUpgrades || []).reduce((total, item) => {
      const owned = Math.max(0, Math.min(Number(item.max) || 0, Math.floor(Number(levels[item.id]) || 0)));
      for (let level = 0; level < owned; level += 1) total += evolutionCostAt(item, level);
      return total;
    }, 0);
  }

  function reconcileCropsForState(state) {
    const farmLevel = Math.max(1, Math.floor(Number(state?.farmLevel) || 1));
    const lockedIds = new Set();
    (currentConfig?.crops || []).forEach(crop => {
      if (farmLevel < Math.max(1, Math.floor(Number(crop.unlockLevel) || 1))) lockedIds.add(crop.id);
    });
    let changed = false;
    lockedIds.forEach(cropId => {
      const crop = state?.crops?.[cropId];
      if (crop && (crop.owned || Number(crop.level) > 0 || Number(crop.stock) > 0 || Number(crop.progress) > 0 || crop.autoSell)) {
        Object.assign(crop, { owned: false, level: 0, progress: 0, stock: 0, autoSell: false, productionBuffer: 0 });
        changed = true;
      }
      if (state?.cropsDiscovered && state.cropsDiscovered[cropId]) { delete state.cropsDiscovered[cropId]; changed = true; }
      if (state?.orders?.[cropId] && (state.orders[cropId].tier || state.orders[cropId].delivered || state.orders[cropId].autoDeliver)) {
        Object.assign(state.orders[cropId], { tier: 0, delivered: 0, autoDeliver: false });
        changed = true;
      }
    });
    if (Array.isArray(state.contractOffers)) {
      const next = state.contractOffers.filter(contract => !lockedIds.has(contract?.cropId));
      if (next.length !== state.contractOffers.length) { state.contractOffers = next; changed = true; }
    }
    if (Array.isArray(state.activeContracts)) {
      const next = state.activeContracts.filter(contract => !lockedIds.has(contract?.cropId));
      if (next.length !== state.activeContracts.length) { state.activeContracts = next; changed = true; }
    }
    return changed;
  }
  function resetCropsInState(state) {
    Object.values(state.crops || {}).forEach(crop => Object.assign(crop, { owned: false, level: 0, progress: 0, stock: 0, totalHarvested: 0, totalSold: 0, autoSell: false, productionBuffer: 0 }));
    state.cropsDiscovered = {};
    state.upgrades = {};
    state.storageExpansions = 0;
  }
  function resetOrdersInState(state) {
    Object.values(state.orders || {}).forEach(order => Object.assign(order, { tier: 0, delivered: 0, autoDeliver: false }));
    if (state.stats) { state.stats.ordersCompleted = 0; state.stats.orderUnitsDelivered = 0; }
  }

  async function renderAdministrators() {
    if (!authorized || !dom.administratorList) return;
    dom.administratorList.innerHTML = '<div class="admin-catalog-empty">Carregando administradores...</div>';
    try {
      const administrators = await window.FirebaseManager.listAdministrators();
      dom.administratorList.innerHTML = administrators.length ? administrators.map(item => {
        const email = String(item.email || item.id || "").trim().toLowerCase();
        const primary = email === PRIMARY_ADMIN_EMAIL;
        return `<article class="admin-administrator-item"><div><strong>${String(item.displayName || "Administrador").replace(/[<>]/g, "")}</strong><small>${email.replace(/[<>]/g, "")}${primary ? " · administrador principal" : ""}</small></div>${primary ? '<button class="admin-button compact" type="button" disabled title="O administrador principal não pode ser removido pelo painel.">Principal</button>' : `<button class="admin-button compact danger" data-remove-admin="${email.replace(/["<>]/g, "")}" type="button">Remover</button>`}</article>`;
      }).join("") : '<div class="admin-catalog-empty">Nenhuma conta administrativa cadastrada.</div>';
    } catch (error) { dom.administratorList.innerHTML = `<div class="admin-catalog-empty">${window.FirebaseManager.getFriendlyError(error)}</div>`; }
  }
  async function loadConfiguration() { if (!authorized) return; setBusy(true); setFeedback("Carregando configuração...", "pending"); try { await window.AdminAssetRegistry?.ready?.catch?.(() => {}); const cloud = await window.FirebaseManager.loadPublicGameConfig({ throwOnError: true }); fillEditors(cloud || window.GameAdminConfig.getDefaults(), { source: cloud ? "cloud" : "empty" }); await renderAdministrators(); setFeedback(cloud ? "Configuração pronta para edição." : "Nenhuma configuração publicada ainda.", cloud ? "success" : "pending"); } catch (error) { setFeedback(window.FirebaseManager.getFriendlyError(error), "error"); } finally { setBusy(false); } }
  async function validateSession(user) {
    const token = ++validationToken;
    if (!user) return showGate("Entre com uma conta Google autorizada.", { login: true });
    showGate("Validando acesso administrativo...", { loading: true });
    try {
      const isAdmin = await window.FirebaseManager.isCurrentUserAdmin({ force: true });
      if (token !== validationToken) return;
      if (!isAdmin) throw new Error("Esta conta não possui acesso administrativo.");
      showApp(user);
      await window.FirebaseManager.removeOwnLeaderboardEntry?.();
      await loadConfiguration();
    } catch (error) {
      if (token !== validationToken) return;
      showGate("Conta sem permissão para acessar a administração. Redirecionando para o jogo.");
      redirectUnauthorized();
    }
  }

  dom.signIn.addEventListener("click", async () => { dom.signIn.disabled = true; try { await window.FirebaseManager.signInWithGoogle(); } catch (error) { showGate(window.FirebaseManager.getFriendlyError(error), { login: true }); } finally { dom.signIn.disabled = false; } });
  dom.signOut.addEventListener("click", async () => { dom.signOut.disabled = true; try { await window.FirebaseManager.signOut(); } finally { dom.signOut.disabled = false; } });
  dom.saveBalance.addEventListener("click", () => queueCloudSave("Salvando parâmetros...", async () => { const next = clone(currentConfig); next.balance = balanceFromForm(); return publishConfig(next, "Parâmetros atualizados."); }).catch(() => {}));
  dom.saveTexts.addEventListener("click", () => queueCloudSave("Salvando textos...", async () => { const next = clone(currentConfig); next.texts = parseJSON(dom.textsEditor.value); return publishConfig(next, "Textos atualizados."); }).catch(() => {}));

  dom.saveNavigationIcons?.addEventListener("click", () => queueCloudSave("Salvando ícones de navegação...", async () => {
    const next = clone(currentConfig);
    next.navigationIcons = navigationIconsFromForm();
    next.gridNavigationIcons = gridNavigationIconsFromForm();
    next.prestigeIcons = prestigeIconsFromForm();
    next.lineNavigationOrder = navigationOrderFromGrid(dom.navigationIconGrid);
    next.gridNavigationOrder = navigationOrderFromGrid(dom.gridNavigationIconGrid);
    next.prestigeIconOrder = navigationOrderFromGrid(dom.prestigeIconGrid);
    delete next.mobileNavigationIcons;
    return publishConfig(next, "Ícones e ordem da navegação atualizados.");
  }).catch(() => {}));
  dom.refreshPlayerFeedback?.addEventListener("click", () => renderPlayerFeedback());
  dom.feedbackTypeFilter?.addEventListener("change", () => drawPlayerFeedback());
  dom.feedbackStatusFilter?.addEventListener("change", () => drawPlayerFeedback());
  dom.playerFeedbackList?.addEventListener("click", event => {
    const button = event.target.closest("[data-feedback-action]");
    if (!button) return;
    const id = button.dataset.feedbackId;
    const action = button.dataset.feedbackAction;
    if (action === "read") queueCloudSave("Atualizando mensagem...", async () => { await window.FirebaseManager.markPlayerFeedbackRead(id, true); await renderPlayerFeedback(); }).catch(() => {});
    if (action === "delete" && confirm("Excluir esta mensagem permanentemente?")) queueCloudSave("Excluindo mensagem...", async () => { await window.FirebaseManager.deletePlayerFeedback(id); await renderPlayerFeedback(); }).catch(() => {});
  });
  dom.administratorForm?.addEventListener("submit", event => { event.preventDefault(); queueCloudSave("Cadastrando administrador...", async () => { await window.FirebaseManager.addAdministrator(dom.administratorEmail.value, dom.administratorName.value); dom.administratorForm.reset(); await renderAdministrators(); }).catch(() => {}); });
  dom.administratorList?.addEventListener("click", event => { const button = event.target.closest("[data-remove-admin]"); if (!button) return; const email = String(button.dataset.removeAdmin || "").trim().toLowerCase(); if (email === PRIMARY_ADMIN_EMAIL) return; if (!confirm(`Remover ${email} da administração?`)) return; queueCloudSave("Removendo administrador...", async () => { await window.FirebaseManager.removeAdministrator(email); await renderAdministrators(); }).catch(() => {}); });

  dom.globalResetCoins?.addEventListener("click", () => resetGlobalResource("coins", "as moedas").catch(error => setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error")));
  dom.globalResetResearchPoints?.addEventListener("click", () => resetGlobalResource("research", "os pontos de pesquisa").catch(error => setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error")));
  dom.globalResetPrestigePoints?.addEventListener("click", () => resetGlobalResource("prestigePoints", "os pontos de prestígio").catch(error => setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error")));
  dom.globalResetOrders?.addEventListener("click", async () => {
    if (!confirm("Resetar os pedidos de TODOS os jogadores?")) return;
    dom.globalResetOrders.disabled = true;
    setGlobalFeedback("Resetando pedidos...", "pending");
    try {
      const result = await window.FirebaseManager.mutateAllPlayerSavesForAdmin(state => {
        const hadProgress = Object.values(state.orders || {}).some(order => Number(order?.tier) > 0 || Number(order?.delivered) > 0 || Boolean(order?.autoDeliver))
          || Number(state.stats?.ordersCompleted) > 0
          || Number(state.stats?.orderUnitsDelivered) > 0;
        if (!hadProgress) return false;
        resetOrdersInState(state);
        return true;
      }, { mutationType: "reset-orders-global" });
      setGlobalFeedback(`${result.updated} de ${result.scanned} saves tiveram os pedidos resetados.`, "success");
      globalPlayersLoaded = false;
    } catch (error) {
      setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error");
    } finally {
      dom.globalResetOrders.disabled = false;
    }
  });

  dom.globalResolveResearch?.addEventListener("click", async () => {
    const refundPoints = Boolean(dom.globalRefundResearch?.checked);
    if (!confirm(`Zerar todas as pesquisas de TODOS os jogadores${refundPoints ? " e devolver os pontos gastos" : " sem devolver os pontos"}?`)) return;
    dom.globalResolveResearch.disabled = true;
    setGlobalFeedback("Resolvendo pesquisas...", "pending");
    let refunded = 0;
    try {
      const currentResearchIds = new Set((currentConfig?.research || []).map(item => item.id));
      const result = await window.FirebaseManager.mutateAllPlayerSavesForAdmin(state => {
        const hasLevels = Object.entries(state.researchTechs || {}).some(([id, level]) => currentResearchIds.has(id) && Number(level) > 0)
          || Object.values(state.upgrades || {}).some(level => Number(level) > 0);
        if (!hasLevels) return false;
        const refund = refundPoints ? researchRefundForState(state) : 0;
        refunded += refund;
        if (refund) state.research = Math.max(0, Number(state.research) || 0) + refund;
        state.researchTechs = Object.fromEntries((currentConfig?.research || []).map(item => [item.id, 0]));
        state.upgrades = {};
        return true;
      }, { mutationType: refundPoints ? "resolve-research-refund" : "resolve-research-no-refund" });
      setGlobalFeedback(`${result.updated} de ${result.scanned} saves corrigidos${refundPoints ? ` · ${refunded.toLocaleString("pt-BR")} pontos devolvidos` : ""}.`, "success");
      globalPlayersLoaded = false;
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
    finally { dom.globalResolveResearch.disabled = false; }
  });

  dom.globalResetEvolutions?.addEventListener("click", async () => {
    const refundPoints = Boolean(dom.globalRefundEvolutions?.checked);
    if (!confirm(`Resetar todas as evoluções de prestígio de TODOS os jogadores${refundPoints ? " e devolver os pontos de prestígio gastos" : " sem devolver os pontos"}?`)) return;
    dom.globalResetEvolutions.disabled = true;
    setGlobalFeedback("Resetando evoluções...", "pending");
    let refunded = 0;
    try {
      const result = await window.FirebaseManager.mutateAllPlayerSavesForAdmin(state => {
        const hasLevels = Object.values(state.prestigeUpgrades || {}).some(level => Number(level) > 0);
        if (!hasLevels) return false;
        const refund = refundPoints ? prestigeRefundForState(state) : 0;
        refunded += refund;
        if (refund) state.prestigePoints = Math.max(0, Number(state.prestigePoints) || 0) + refund;
        state.prestigeUpgrades = Object.fromEntries((currentConfig?.prestigeUpgrades || []).map(item => [item.id, 0]));
        state.permanentBonuses = {
          prestigeDouble: false, passiveXPPercentPerSecond: 0, contractRewardPercent: 0, orderRewardPercent: 0
        };
        return true;
      }, { mutationType: refundPoints ? "reset-evolutions-refund" : "reset-evolutions-no-refund" });
      setGlobalFeedback(`${result.updated} de ${result.scanned} saves tiveram as evoluções resetadas${refundPoints ? ` · ${refunded.toLocaleString("pt-BR")} pontos de prestígio devolvidos` : ""}.`, "success");
      globalPlayersLoaded = false;
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
    finally { dom.globalResetEvolutions.disabled = false; }
  });

  dom.globalResolveCrops?.addEventListener("click", async () => {
    if (!confirm("Resolver conflitos de plantas em TODOS os jogadores usando os níveis de desbloqueio publicados agora?")) return;
    dom.globalResolveCrops.disabled = true;
    setGlobalFeedback("Verificando todos os saves...", "pending");
    try {
      const result = await window.FirebaseManager.mutateAllPlayerSavesForAdmin(state => reconcileCropsForState(state), { mutationType: "reconcile-crops-global" });
      setGlobalFeedback(result.updated ? `${result.updated} de ${result.scanned} saves corrigidos.` : `${result.scanned} saves verificados · nenhum conflito encontrado.`, "success");
      globalPlayersLoaded = false;
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
    finally { dom.globalResolveCrops.disabled = false; }
  });

  dom.globalRefreshPlayers?.addEventListener("click", () => { globalPlayersLoaded = false; loadGlobalPlayers(true).catch(error => setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error")); });
  dom.globalPlayerSelect?.addEventListener("change", () => selectGlobalPlayer(dom.globalPlayerSelect.value).catch(error => setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error")));
  dom.globalPlayerApply?.addEventListener("click", async () => {
    if (!selectedGlobalPlayer?.userId) return;
    const uid = selectedGlobalPlayer.userId;
    setGlobalFeedback("Salvando variáveis do jogador...", "pending");
    try {
      await window.FirebaseManager.mutatePlayerSaveForAdmin(uid, state => {
        state.coins = parsePositive(dom.globalPlayerCoins?.value ?? state.coins, true);
        state.research = parsePositive(dom.globalPlayerResearch?.value ?? state.research, true);
        state.prestigePoints = parsePositive(dom.globalPlayerPrestigePoints?.value ?? state.prestigePoints, true);
        state.farmLevel = Math.max(1, parsePositive(dom.globalPlayerFarmLevel?.value ?? state.farmLevel, true) || 1);
        state.farmXP = 0;
        state.stats = state.stats || {};
        state.stats.prestiges = parsePositive(dom.globalPlayerPrestigeCount?.value ?? state.stats.prestiges, true);
        state.stats.maxFarmLevel = Math.max(Number(state.stats.maxFarmLevel) || 1, state.farmLevel);
        return true;
      }, "single-player-variables");
      setGlobalFeedback("Variáveis do jogador atualizadas.", "success");
      globalPlayersLoaded = false;
      await loadGlobalPlayers(true);
      dom.globalPlayerSelect.value = uid;
      await selectGlobalPlayer(uid);
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
  });
  dom.globalPlayerRanking?.addEventListener("click", async () => {
    if (!selectedGlobalPlayer?.userId) return;
    const uid = selectedGlobalPlayer.userId;
    const block = !selectedGlobalPlayer.moderation?.rankingBlocked;
    if (!confirm(`${block ? "Bloquear" : "Desbloquear"} ${selectedGlobalPlayer.nickname} no ranking global?`)) return;
    try {
      const moderation = await window.FirebaseManager.setPlayerModerationForAdmin(uid, { rankingBlocked: block });
      selectedGlobalPlayer.moderation = moderation;
      updateGlobalPlayerButtons();
      setGlobalFeedback(block ? "Jogador bloqueado do ranking." : "Jogador liberado para o ranking.", "success");
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
  });
  dom.globalPlayerReset?.addEventListener("click", async () => {
    if (!selectedGlobalPlayer?.userId) return;
    if (!confirm(`Resetar completamente o progresso de ${selectedGlobalPlayer.nickname}? A conta continuará existindo, mas a fazenda voltará ao estado inicial.`)) return;
    try {
      await window.FirebaseManager.resetPlayerAccountForAdmin(selectedGlobalPlayer.userId);
      setGlobalFeedback("Conta resetada na nuvem. Se o jogador estiver online, a alteração será aplicada automaticamente.", "success");
      selectedGlobalPlayer = null;
      globalPlayersLoaded = false;
      await loadGlobalPlayers(true);
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
  });
  dom.globalPlayerBan?.addEventListener("click", async () => {
    if (!selectedGlobalPlayer?.userId) return;
    const uid = selectedGlobalPlayer.userId;
    const ban = !selectedGlobalPlayer.moderation?.banned;
    if (!confirm(`${ban ? "Banir" : "Desbanir"} ${selectedGlobalPlayer.nickname}?`)) return;
    const reason = ban ? String(prompt("Motivo do banimento (opcional):", selectedGlobalPlayer.moderation?.reason || "") || "").trim().slice(0, 240) : "";
    try {
      const moderation = await window.FirebaseManager.setPlayerModerationForAdmin(uid, { banned: ban, reason });
      selectedGlobalPlayer.moderation = moderation;
      updateGlobalPlayerButtons();
      setGlobalFeedback(ban ? "Jogador banido e bloqueado das gravações do jogo." : "Jogador desbanido.", "success");
    } catch (error) { setGlobalFeedback(window.FirebaseManager.getFriendlyError(error), "error"); }
  });

  function setupGroupedCatalogAccordions() {
    const grouped = new Set(["plantsCatalog", "contractsCatalog", "evolutionsCatalog"]);
    document.querySelectorAll(".admin-catalog-editor[data-admin-section]").forEach(section => {
      if (!grouped.has(section.dataset.adminSection)) return;
      const heading = section.querySelector(":scope > .admin-section-heading");
      if (!heading || heading.querySelector("[data-admin-accordion-toggle]")) return;
      section.classList.add("admin-accordion-section");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "admin-accordion-toggle";
      toggle.dataset.adminAccordionToggle = "";
      toggle.setAttribute("aria-expanded", "true");
      toggle.innerHTML = '<span>Ocultar</span><b aria-hidden="true">⌃</b>';
      const title = heading.querySelector("h2");
      if (title) title.insertAdjacentElement("afterend", toggle); else heading.prepend(toggle);
      toggle.addEventListener("click", () => {
        const collapsed = section.classList.toggle("is-collapsed");
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.querySelector("span").textContent = collapsed ? "Mostrar" : "Ocultar";
        toggle.querySelector("b").textContent = collapsed ? "⌄" : "⌃";
      });
    });
  }

  setupGroupedCatalogAccordions();
  bindNavigationOrderControls(dom.navigationIconGrid);
  bindNavigationOrderControls(dom.gridNavigationIconGrid);
  bindNavigationOrderControls(dom.prestigeIconGrid);
  bindPositiveInputs();
  dom.workspaceSelect?.addEventListener("change", () => selectWorkspace(dom.workspaceSelect.value));
  selectWorkspace("balance");
  window.FirebaseManager.subscribeAuth((user, error) => { if (error) return showGate(window.FirebaseManager.getFriendlyError(error), { login: true }); validateSession(user).catch(failure => { console.warn(failure); showGate("Não foi possível validar o acesso administrativo.", { user }); redirectUnauthorized(); }); });
})();
