"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const soundEngine = new SoundEngine();
  let lastFrame = performance.now();
  let lastRender = 0;
  let lastLiveHeader = 0;
  let lastCropControls = 0;
  let lastSave = 0;
  let activeView = "farmView";
  let engine = null;
  let currentAuthUid = null;
  let authTransitionQueue = Promise.resolve();
  let activeOfficeTab = "contracts";
  let activeEvolutionTab = "upgrades";
  let showCompletedMissions = false;
  let contractDockCollapsed = false;
  let leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
  let leaderboardRequest = null;
  const cropUpgradeModes = new Map();

  // Elementos persistentes da interface.
  const dom = {
    tabs: $$(".nav-tab[data-view]"),
    views: $$("[data-view-panel]"),
    cropGrid: $("#cropGrid"),
    cropEmpty: $("#cropEmpty"),
    searchCrop: $("#searchCrop"),
    categoryFilter: $("#categoryFilter"),
    stockCategoryFilter: $("#stockCategoryFilter"),
    stockGrid: $("#stockGrid"),
    stockSummary: $("#stockSummary"),
    upgradeList: $("#upgradeList"),
    researchList: $("#researchList"),
    prestigeDashboard: $("#prestigeDashboard"),
    prestigeList: $("#prestigeList"),
    activeContractList: $("#activeContractList"),
    contractOfferList: $("#contractOfferList"),
    contractDock: $("#contractDock"),
    orderList: $("#orderList"),
    completedOrderList: $("#completedOrderList"),
    completedOrderCount: $("#completedOrderCount"),
    missionList: $("#missionList"),
    toggleCompletedMissions: $("#toggleCompletedMissions"),
    completedMissionCount: $("#completedMissionCount"),
    officeTabs: $$("[data-office-tab]"),
    officePanels: $$("[data-office-panel]"),
    evolutionTabs: $$("[data-evolution-tab]"),
    evolutionPanels: $$("[data-evolution-panel]"),
    contextNavBlocks: $$("[data-context-for]"),
    contractTabCount: $("#contractTabCount"),
    orderTabCount: $("#orderTabCount"),
    missionTabCount: $("#missionTabCount"),
    coinsCounter: $("#coinsCounter"),
    researchCounter: $("#researchCounter"),
    prestigeCounter: $("#prestigeCounter"),
    floatingCoinsCounter: $("#floatingCoinsCounter"),
    floatingResearchCounter: $("#floatingResearchCounter"),
    floatingPrestigeCounter: $("#floatingPrestigeCounter"),
    farmProgress: $(".farm-progress"),
    farmXPTrack: $(".farm-progress .soft-progress"),
    farmLevelLabel: $("#farmLevelLabel"),
    farmXPBar: $("#farmXPBar"),
    farmXPText: $("#farmXPText"),
    stockNavTab: $("#stockNavTab"),
    stockNavBadge: $("#stockNavBadge"),
    officeNavTab: $("#officeNavTab"),
    evolveNavTab: $("#evolveNavTab"),
    contractsOfficeTab: $("#contractsOfficeTab"),
    ordersOfficeTab: $("#ordersOfficeTab"),
    prestigeEvolutionTab: $("#prestigeEvolutionTab"),
    statsHero: $("#statsHero"),
    prestigeLeaderboard: $("#prestigeLeaderboard"),
    lifetimeStats: $("#lifetimeStats"),
    recordStats: $("#recordStats"),
    achievementSummary: $("#achievementSummary"),
    achievementGrid: $("#achievementGrid"),
    ambientSetting: $("#ambientSetting"),
    uiScaleSetting: $("#uiScaleSetting"),
    uiScaleText: $("#uiScaleText"),
    numberFormatSetting: $("#numberFormatSetting"),
    masterVolumeSetting: $("#masterVolumeSetting"),
    masterVolumeText: $("#masterVolumeText"),
    effectVolumeSetting: $("#effectVolumeSetting"),
    effectVolumeText: $("#effectVolumeText"),
    musicVolumeSetting: $("#musicVolumeSetting"),
    musicVolumeText: $("#musicVolumeText"),
    musicTrackSetting: $("#musicTrackSetting"),
    accountAvatar: $("#accountAvatar"),
    accountName: $("#accountName"),
    accountEmail: $("#accountEmail"),
    accountDescription: $("#accountDescription"),
    cloudSaveStatus: $("#cloudSaveStatus"),
    googleSignIn: $("#googleSignIn"),
    googleSignOut: $("#googleSignOut"),
    resetProgressButton: $("#resetProgressButton"),
    resetProgressDialog: $("#resetProgressDialog"),
    cancelResetProgress: $("#cancelResetProgress"),
    confirmResetProgress: $("#confirmResetProgress"),
    playerProfileForm: $("#playerProfileForm"),
    playerNicknameSetting: $("#playerNicknameSetting"),
    playerAvatarPicker: $("#playerAvatarPicker"),
    playerAvatarSetting: $("#playerAvatarSetting"),
    playerRankingOptOut: $("#playerRankingOptOut"),
    selectedAvatarPreview: $("#selectedAvatarPreview"),
    selectedAvatarImage: $("#selectedAvatarImage"),
    selectedAvatarName: $("#selectedAvatarName"),
    toggleAvatarPicker: $("#toggleAvatarPicker"),
    avatarPickerPanel: $("#avatarPickerPanel"),
    savePlayerProfile: $("#savePlayerProfile"),
    playerProfileFeedback: $("#playerProfileFeedback"),
    profileRankingNotice: $("#profileRankingNotice"),
    profileCompletionBadge: $("#profileCompletionBadge"),
    prestigeConfirmDialog: $("#prestigeConfirmDialog"),
    prestigeConfirmText: $("#prestigeConfirmText"),
    cancelPrestigeConfirm: $("#cancelPrestigeConfirm"),
    confirmPrestigeConfirm: $("#confirmPrestigeConfirm"),
    milestoneDialog: $("#milestoneDialog"),
    milestoneDialogTitle: $("#milestoneDialogTitle"),
    milestoneDialogDescription: $("#milestoneDialogDescription"),
    milestoneDialogList: $("#milestoneDialogList"),
    closeMilestoneDialog: $("#closeMilestoneDialog"),
    backToTop: $("#backToTop")
  };

  // Utilitários de formatação e marcação segura.
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

  function sanitizeNickname(value) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);
  }

  function getAvatarEntry(avatarId) {
    const safeId = String(avatarId || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48);
    return (window.AvatarData || []).find(avatar => avatar.id === safeId) || null;
  }

  function getAvatarSource(avatarId, fallback = "assets/logo.png") {
    return getAvatarEntry(avatarId)?.src || fallback;
  }

  function hasCompletePlayerProfile(state = engine?.state) {
    const nickname = sanitizeNickname(state?.settings?.playerNickname);
    const avatar = getAvatarEntry(state?.settings?.playerAvatar);
    return nickname.length >= 4 && nickname.length <= 24 && Boolean(avatar);
  }

  function setProfileFeedback(message = "", type = "") {
    if (!dom.playerProfileFeedback) return;
    dom.playerProfileFeedback.textContent = message;
    dom.playerProfileFeedback.dataset.type = type;
  }

  function renderAvatarPicker(selectedId = "", disabled = false) {
    if (!dom.playerAvatarPicker) return;
    const avatars = window.AvatarData || [];
    if (dom.playerAvatarPicker.childElementCount !== avatars.length) {
      dom.playerAvatarPicker.innerHTML = avatars.map(avatar => `
        <button aria-checked="false" aria-label="${escapeHtml(avatar.label)}" class="avatar-option" data-avatar-id="${escapeHtml(avatar.id)}" role="radio" title="${escapeHtml(avatar.label)}" type="button">
          <img alt="" loading="lazy" src="${escapeHtml(avatar.src)}">
          <span>${escapeHtml(avatar.label)}</span>
        </button>`).join("");
    }
    $$(".avatar-option", dom.playerAvatarPicker).forEach(button => {
      const selected = button.dataset.avatarId === selectedId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
      button.disabled = disabled;
    });

    const selectedAvatar = getAvatarEntry(selectedId);
    if (dom.selectedAvatarImage) {
      dom.selectedAvatarImage.src = selectedAvatar?.src || "assets/icons/feature-lock.png";
      dom.selectedAvatarImage.alt = selectedAvatar ? `Avatar selecionado: ${selectedAvatar.label}` : "Nenhum avatar selecionado";
    }
    if (dom.selectedAvatarName) dom.selectedAvatarName.textContent = selectedAvatar?.label || "Nenhum avatar escolhido";
    if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.textContent = selectedAvatar ? "Trocar avatar" : "Escolher avatar";
  }

  function percent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
  }

  function syncRangeVisual(input) {
    if (!input) return;
    const minimum = Number(input.min || 0);
    const maximum = Number(input.max || 100);
    const value = Number(input.value || minimum);
    const progress = maximum > minimum ? ((value - minimum) / (maximum - minimum)) * 100 : 0;
    input.style.setProperty("--range-progress", `${percent(progress)}%`);
  }

  const resourceIcons = {
    coins: "assets/icons/coin.png",
    research: "assets/icons/potion.png",
    prestige: "assets/icons/prestige.png"
  };

  function resourceAmount(type, value, options = {}) {
    const number = Number(value) || 0;
    const label = options.label ? `<small>${escapeHtml(options.label)}</small>` : "";
    const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
    return `<span class="resource-amount resource-${type}${options.compact ? " compact" : ""}"${title}><img src="${resourceIcons[type]}" alt=""><b>${engine.formatNumber(Math.abs(number))}</b>${label}</span>`;
  }

  function resourceRewards(reward) {
    const parts = [];
    if (reward?.coins) parts.push(resourceAmount("coins", reward.coins, { title: "Moedas" }));
    if (reward?.research) parts.push(resourceAmount("research", reward.research, { title: "Pontos de pesquisa" }));
    if (reward?.prestige) parts.push(resourceAmount("prestige", reward.prestige, { title: "Pontos de prestígio" }));
    return parts.join("");
  }


  function companyIconMarkup(company) {
    const icon = String(company?.icon || "");
    if (/^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(icon)) {
      return `<img src="${escapeHtml(icon)}" alt="">`;
    }
    return escapeHtml(icon);
  }

  function enrichResourceText(message) {
    let html = escapeHtml(message);
    const amount = '([+−-]?(?:\\d[\\d.,]*)(?:(?:K|M|B|T)|(?:[A-Z]+[a-z]))?)';
    const replace = (type, labelPattern) => {
      const expression = new RegExp(`${amount}\\s+(?:${labelPattern})`, "gi");
      html = html.replace(expression, (_, value) => {
        const first = value.trim().charAt(0);
        const signed = ["+", "−", "-"].includes(first);
        const absolute = signed ? value.trim().slice(1) : value.trim();
        return `<span class="inline-resource resource-${type}"><img src="${resourceIcons[type]}" alt=""><b>${absolute}</b></span>`;
      });
    };
    replace("coins", "moedas?");
    replace("research", "(?:pontos? de )?pesquisa");
    replace("prestige", "(?:pontos? de )?prestígio");
    return html;
  }


  function showMilestoneDialog(detail) {
    const milestones = Array.isArray(detail?.milestones) ? detail.milestones : [];
    if (!milestones.length || !dom.milestoneDialog) return;

    let combined = milestones;
    if (dom.milestoneDialog.open && dom.milestoneDialog.dataset.milestones) {
      try {
        const current = JSON.parse(dom.milestoneDialog.dataset.milestones);
        if (Array.isArray(current)) combined = [...current, ...milestones];
      } catch (_) {}
    }
    const unique = [...new Map(combined.map(milestone => [Number(milestone.level) || 0, milestone])).values()]
      .sort((a, b) => a.level - b.level);
    dom.milestoneDialog.dataset.milestones = JSON.stringify(unique);

    const latest = unique.at(-1);
    if (dom.milestoneDialogTitle) dom.milestoneDialogTitle.textContent = unique.length > 1
      ? `Marcos alcançados até o nível ${latest.level}`
      : `Marco alcançado: nível ${latest.level}`;
    if (dom.milestoneDialogDescription) dom.milestoneDialogDescription.textContent = unique.length > 1
      ? "Você avançou por vários marcos. Confira tudo que foi liberado:"
      : "Confira o que foi desbloqueado neste marco:";
    if (dom.milestoneDialogList) {
      dom.milestoneDialogList.innerHTML = unique.map(milestone => `
        <section class="milestone-dialog-group">
          <strong>Nível ${Number(milestone.level) || 0}</strong>
          <ul>${(milestone.unlocks || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>`).join("");
    }
    if (typeof dom.milestoneDialog.showModal === "function" && !dom.milestoneDialog.open) {
      dom.milestoneDialog.showModal();
    }
  }

  function handleEngineEvent(event) {
    if (!event) return;
    if (event.type === "level") {
      if (Array.isArray(event.milestones) && event.milestones.length) {
        soundEngine.play("levelUp");
        showMilestoneDialog(event);
      }
      window.setTimeout(() => render(true), 0);
    }
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state || {}));
  }

  function formatCloudTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function setCloudSaveStatus(status, detail = {}) {
    if (!dom.cloudSaveStatus) return;

    if (status === "saving") {
      dom.cloudSaveStatus.textContent = "Salvando automaticamente na nuvem...";
      return;
    }
    if (status === "saved") {
      const time = formatCloudTime(detail.savedAt);
      dom.cloudSaveStatus.textContent = time
        ? `Progresso salvo automaticamente às ${time}.`
        : "Progresso salvo automaticamente.";
      return;
    }
    if (status === "loading") {
      dom.cloudSaveStatus.textContent = "Carregando o progresso da sua conta...";
      return;
    }
    if (status === "loaded") {
      const time = formatCloudTime(detail.savedAt);
      dom.cloudSaveStatus.textContent = time
        ? `Progresso carregado. Última gravação: ${time}.`
        : "Progresso carregado da sua conta.";
      return;
    }
    if (status === "empty") {
      dom.cloudSaveStatus.textContent = "Esta conta ainda não possui progresso; a sessão atual será salva automaticamente.";
      return;
    }
    if (status === "error") {
      dom.cloudSaveStatus.textContent = window.FirebaseManager.getFriendlyError(detail.error);
      return;
    }

    dom.cloudSaveStatus.textContent = window.FirebaseManager.isAvailable()
      ? "Entre com o Google para manter o progresso entre sessões."
      : "O serviço de nuvem não pôde ser carregado. A sessão continuará como visitante.";
  }

  function updateAccountUI(user = window.FirebaseManager.getUser()) {
    const signedIn = Boolean(user);
    const firebaseAvailable = window.FirebaseManager.isAvailable();
    const storedNickname = sanitizeNickname(engine?.state?.settings?.playerNickname);
    const storedAvatarId = getAvatarEntry(engine?.state?.settings?.playerAvatar)?.id || "";
    const profileComplete = signedIn && hasCompletePlayerProfile();
    const rankingOptOut = Boolean(engine?.state?.settings?.playerRankingOptOut);
    const profileDirty = dom.playerProfileForm?.dataset.dirty === "true";

    if (dom.accountName) {
      dom.accountName.textContent = signedIn
        ? (storedNickname || user.displayName || user.email || "Jogador")
        : "Visitante";
    }

    if (dom.accountEmail) {
      dom.accountEmail.textContent = signedIn
        ? (user.email || "Conta Google conectada")
        : "Conta não conectada";
    }
    if (dom.accountDescription) {
      dom.accountDescription.textContent = signedIn
        ? "Seu progresso é privado e salvo automaticamente na nuvem."
        : "Seu progresso existe somente nesta sessão e será perdido ao recarregar a página.";
    }

    if (dom.accountAvatar) {
      const gameAvatar = getAvatarEntry(storedAvatarId);
      const googlePhoto = signedIn && /^https:\/\//i.test(String(user.photoURL || "")) ? user.photoURL : "";
      dom.accountAvatar.src = gameAvatar?.src || googlePhoto || "assets/logo.png";
      dom.accountAvatar.alt = gameAvatar
        ? `Avatar selecionado: ${gameAvatar.label}`
        : signedIn ? `Foto de ${user.displayName || "jogador"}` : "";
      dom.accountAvatar.classList.toggle("google-avatar", Boolean(!gameAvatar && googlePhoto));
      dom.accountAvatar.classList.toggle("game-avatar", Boolean(gameAvatar));
    }

    if (dom.googleSignIn) {
      dom.googleSignIn.hidden = signedIn;
      dom.googleSignIn.disabled = !firebaseAvailable;
    }
    if (dom.googleSignOut) {
      dom.googleSignOut.hidden = !signedIn;
      dom.googleSignOut.disabled = false;
    }
    if (dom.resetProgressButton) {
      dom.resetProgressButton.hidden = !signedIn;
      dom.resetProgressButton.disabled = false;
    }

    if (!profileDirty) {
      const googleSuggestion = signedIn ? sanitizeNickname(user.displayName || "") : "";
      if (dom.playerNicknameSetting) dom.playerNicknameSetting.value = storedNickname || (googleSuggestion.length >= 4 ? googleSuggestion : "");
      if (dom.playerAvatarSetting) dom.playerAvatarSetting.value = storedAvatarId;
      if (dom.playerRankingOptOut) dom.playerRankingOptOut.checked = rankingOptOut;
      setProfileFeedback("");
    }

    const selectedAvatarId = dom.playerAvatarSetting?.value || storedAvatarId;
    renderAvatarPicker(selectedAvatarId, !signedIn);
    if (dom.playerNicknameSetting) {
      dom.playerNicknameSetting.disabled = !signedIn;
      dom.playerNicknameSetting.placeholder = signedIn ? "Seu apelido no ranking" : "Entre com o Google para definir";
    }
    if (dom.playerAvatarSetting) dom.playerAvatarSetting.disabled = !signedIn;
    if (dom.playerRankingOptOut) dom.playerRankingOptOut.disabled = !signedIn;
    if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.disabled = !signedIn;
    if (dom.savePlayerProfile) dom.savePlayerProfile.disabled = !signedIn;
    if (!signedIn && dom.avatarPickerPanel) {
      dom.avatarPickerPanel.hidden = true;
      dom.toggleAvatarPicker?.setAttribute("aria-expanded", "false");
    }

    if (dom.profileCompletionBadge) {
      dom.profileCompletionBadge.textContent = profileComplete ? (rankingOptOut ? "Fora do ranking" : "Salvo") : "Incompleto";
      dom.profileCompletionBadge.classList.toggle("complete", profileComplete && !rankingOptOut);
      dom.profileCompletionBadge.classList.toggle("opted-out", profileComplete && rankingOptOut);
    }
    if (dom.profileRankingNotice) {
      dom.profileRankingNotice.classList.remove("complete");
      dom.profileRankingNotice.textContent = "Somente jogadores conectados e com apelido e avatar configurados participarão do ranking global se quiserem.";
    }

    if (!signedIn) setCloudSaveStatus("guest");
  }

  function setAuthBusy(busy) {
    const profileDisabled = busy || !window.FirebaseManager.isAuthenticated();
    if (dom.googleSignIn) dom.googleSignIn.disabled = busy || !window.FirebaseManager.isAvailable();
    if (dom.googleSignOut) dom.googleSignOut.disabled = busy;
    if (dom.resetProgressButton) dom.resetProgressButton.disabled = busy;
    if (dom.playerNicknameSetting) dom.playerNicknameSetting.disabled = profileDisabled;
    if (dom.playerAvatarSetting) dom.playerAvatarSetting.disabled = profileDisabled;
    if (dom.playerRankingOptOut) dom.playerRankingOptOut.disabled = profileDisabled;
    if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.disabled = profileDisabled;
    if (dom.savePlayerProfile) dom.savePlayerProfile.disabled = profileDisabled;
    $$(".avatar-option", dom.playerAvatarPicker || document).forEach(button => { button.disabled = profileDisabled; });
  }

  async function applyAuthenticatedUser(user, authError = null) {
    const nextUid = user?.uid || null;
    if (!engine) {
      currentAuthUid = nextUid;
      updateAccountUI(user);
      if (authError) setCloudSaveStatus("error", { error: authError });
      return;
    }

    if (nextUid === currentAuthUid) {
      updateAccountUI(user);
      if (authError) setCloudSaveStatus("error", { error: authError });
      return;
    }

    const previousUid = currentAuthUid;
    const guestState = previousUid ? null : cloneState(engine.state);
    if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "false";
    leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
    leaderboardRequest = null;
    currentAuthUid = nextUid;
    setAuthBusy(true);

    try {
      if (user) {
        let cloudState = null;
        let loadFailed = false;
        try {
          cloudState = await window.FirebaseManager.loadGame();
        } catch (error) {
          loadFailed = true;
          setCloudSaveStatus("error", { error });
        }

        if (cloudState) {
          engine.replaceState(cloudState, { simulateOffline: true });
        } else if (!loadFailed) {
          engine.replaceState(guestState, { simulateOffline: false });
          await engine.save();
        }
      } else {
        engine.replaceState(null, { simulateOffline: false });
        showView("farmView", false);
      }

      applySettings();
      render(true);
      if (activeView === "officeView" && activeOfficeTab === "stats") refreshPrestigeLeaderboard(true);
      lastSave = performance.now();
    } finally {
      updateAccountUI(user);
      setAuthBusy(false);
    }
  }

  // Navegação, responsividade e configurações.
  function setupCategoryFilter() {
    const options = Object.entries(engine.data.categories)
      .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
      .join("");
    dom.categoryFilter.insertAdjacentHTML("beforeend", `<option value="locked">Safras bloqueadas</option>${options}`);
    dom.stockCategoryFilter?.insertAdjacentHTML("beforeend", options);
  }

  function syncScrollUI() {
    const scrolled = window.scrollY > 180;
    document.body.classList.toggle("page-scrolled", scrolled);
    if (dom.backToTop) dom.backToTop.hidden = !scrolled;
  }


  function revealTabHorizontally(container, tab, behavior = "smooth") {
    if (!container || !tab || container.scrollWidth <= container.clientWidth) return;
    const target = tab.offsetLeft - (container.clientWidth - tab.offsetWidth) / 2;
    const maximum = Math.max(0, container.scrollWidth - container.clientWidth);
    container.scrollTo({ left: Math.max(0, Math.min(maximum, target)), behavior });
  }

  function setupDragNavigation(container) {
    if (!container || container.dataset.dragNavigationReady === "true") return;
    container.dataset.dragNavigationReady = "true";

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let moved = false;
    let horizontalGesture = false;
    let suppressClickUntil = 0;

    const hasHorizontalOverflow = () => container.scrollWidth > container.clientWidth + 1;

    const resetPointer = () => {
      pointerId = null;
      moved = false;
      horizontalGesture = false;
      container.classList.remove("is-dragging");
    };

    const finishDrag = event => {
      if (pointerId === null) return;
      if (event?.pointerId !== undefined && event.pointerId !== pointerId) return;

      const activePointerId = pointerId;
      if (moved) suppressClickUntil = performance.now() + 420;
      if (container.hasPointerCapture?.(activePointerId)) {
        try { container.releasePointerCapture(activePointerId); } catch (_) {}
      }
      resetPointer();
    };

    container.addEventListener("pointerdown", event => {
      const touchLike = event.pointerType === "touch" || event.pointerType === "pen";
      if (!touchLike && event.button !== 0) return;
      if (!hasHorizontalOverflow()) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startScrollLeft = container.scrollLeft;
      moved = false;
      horizontalGesture = false;
    }, { passive: true });

    container.addEventListener("pointermove", event => {
      if (event.pointerId !== pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!horizontalGesture && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 6) {
        if (Math.abs(deltaY) >= Math.abs(deltaX)) {
          resetPointer();
          return;
        }

        horizontalGesture = true;
        moved = true;
        container.classList.add("is-dragging");
        try { container.setPointerCapture(pointerId); } catch (_) {}
      }

      if (!horizontalGesture || !hasHorizontalOverflow()) return;
      container.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    }, { passive: false });

    container.addEventListener("pointerup", finishDrag);
    container.addEventListener("pointercancel", finishDrag);
    container.addEventListener("lostpointercapture", finishDrag);
    container.addEventListener("click", event => {
      if (performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function showView(viewId, updateHash = true) {
    const requestedView = dom.views.some(view => view.id === viewId) ? viewId : "farmView";
    activeView = requestedView;
    dom.views.forEach(view => view.classList.toggle("active", view.id === activeView));
    dom.tabs.forEach(tab => {
      const active = tab.dataset.view === activeView;
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    window.requestAnimationFrame(() => {
      const activeTab = dom.tabs.find(tab => tab.dataset.view === activeView);
      revealTabHorizontally(activeTab?.closest(".main-nav"), activeTab);
    });
    dom.contextNavBlocks.forEach(block => {
      const visible = block.dataset.contextFor === activeView;
      block.hidden = !visible;
      block.classList.toggle("active", visible);
    });
    if (updateHash) history.replaceState(null, "", `#${activeView}`);
    window.scrollTo({ top: 0, behavior: "auto" });
    syncScrollUI();
    render(true);
  }

  function applySettings() {
    const settings = engine.state.settings;
    document.body.dataset.ambient = String(Boolean(settings.ambient));
    document.documentElement.style.setProperty("--ui-scale", String(((Number(settings.uiScale) || 100) / 100) * 0.85));

    if (dom.ambientSetting && document.activeElement !== dom.ambientSetting) dom.ambientSetting.checked = Boolean(settings.ambient);
    if (dom.uiScaleSetting && document.activeElement !== dom.uiScaleSetting) dom.uiScaleSetting.value = String(settings.uiScale || 100);
    if (dom.uiScaleText) dom.uiScaleText.textContent = `${settings.uiScale || 100}%`;
    if (dom.numberFormatSetting && document.activeElement !== dom.numberFormatSetting) dom.numberFormatSetting.value = settings.numberFormat === "international" ? "international" : "brazilian";

    soundEngine.configure(settings);
    if (dom.masterVolumeSetting && document.activeElement !== dom.masterVolumeSetting) dom.masterVolumeSetting.value = String(settings.masterVolume ?? 100);
    if (dom.masterVolumeText) dom.masterVolumeText.textContent = `${settings.masterVolume ?? 100}%`;
    if (dom.effectVolumeSetting && document.activeElement !== dom.effectVolumeSetting) dom.effectVolumeSetting.value = String(settings.effectVolume ?? 55);
    if (dom.effectVolumeText) dom.effectVolumeText.textContent = `${settings.effectVolume ?? 55}%`;
    if (dom.musicVolumeSetting && document.activeElement !== dom.musicVolumeSetting) dom.musicVolumeSetting.value = String(settings.musicVolume ?? 30);
    if (dom.musicVolumeText) dom.musicVolumeText.textContent = `${settings.musicVolume ?? 30}%`;
    if (dom.musicTrackSetting && document.activeElement !== dom.musicTrackSetting) dom.musicTrackSetting.value = SoundEngine.MUSIC_SOURCES[settings.musicTrack] ? settings.musicTrack : "betweenLightAndShadows";
    [dom.uiScaleSetting, dom.masterVolumeSetting, dom.effectVolumeSetting, dom.musicVolumeSetting].forEach(syncRangeVisual);
  }

  function updateStockNavigation(metrics = engine.getMetrics()) {
    const used = Math.max(0, Number(metrics.stock) || 0);
    const capacity = Math.max(1, Number(metrics.storageCapacity) || 1);
    const usage = percent((used / capacity) * 100);
    const full = used >= capacity;
    dom.stockNavTab.style.setProperty("--stock-progress", `${usage}%`);
    dom.stockNavTab.classList.toggle("stock-full", full);
    dom.stockNavBadge.hidden = !full;
    dom.stockNavTab.setAttribute("aria-label", full
      ? `Estoque cheio: ${engine.formatNumber(used)} de ${engine.formatNumber(capacity)} espaços usados.`
      : `Estoque: ${engine.formatNumber(used)} de ${engine.formatNumber(capacity)} espaços usados, ${Math.floor(usage)} por cento.`);
    dom.stockNavTab.title = `Estoque ${Math.floor(usage)}% cheio`;
  }

  function updateOfficeNavigation() {
    dom.officeNavTab.classList.remove("has-attention");
    dom.officeNavTab.setAttribute("aria-label", "Escritório");
    dom.officeNavTab.title = "Escritório";
  }

  function syncFeatureLocks() {
    const evolutionUnlocked = engine.isEvolutionUnlocked();
    if (dom.evolveNavTab) {
      dom.evolveNavTab.disabled = false;
      dom.evolveNavTab.classList.toggle("feature-preview", !evolutionUnlocked);
      dom.evolveNavTab.setAttribute("aria-disabled", "false");
      dom.evolveNavTab.title = evolutionUnlocked
        ? "Centro de evoluções"
        : `Centro de evoluções — compras liberam no nível ${GameEngine.FEATURE_UNLOCK_LEVEL}`;
    }

    dom.evolutionTabs
      .filter(tab => tab.dataset.evolutionTab !== "prestige")
      .forEach(tab => {
        tab.disabled = false;
        tab.classList.toggle("feature-preview", !evolutionUnlocked);
        tab.setAttribute("aria-disabled", "false");
      });

    if (dom.contractsOfficeTab) {
      dom.contractsOfficeTab.disabled = false;
      dom.contractsOfficeTab.classList.remove("feature-locked", "feature-preview");
      dom.contractsOfficeTab.setAttribute("aria-disabled", "false");
      dom.contractsOfficeTab.title = "Contratos";
    }

    const ordersUnlocked = engine.isOrdersUnlocked();
    if (dom.ordersOfficeTab) {
      dom.ordersOfficeTab.disabled = false;
      dom.ordersOfficeTab.classList.toggle("feature-preview", !ordersUnlocked);
      dom.ordersOfficeTab.setAttribute("aria-disabled", "false");
      dom.ordersOfficeTab.title = ordersUnlocked
        ? "Pedidos"
        : `Pedidos — entregas liberadas no nível ${GameEngine.FEATURE_UNLOCK_LEVEL}`;
    }

    const prestigeUnlocked = engine.isPrestigeUnlocked();
    if (dom.prestigeEvolutionTab) {
      dom.prestigeEvolutionTab.disabled = false;
      dom.prestigeEvolutionTab.classList.toggle("feature-preview", !prestigeUnlocked);
      dom.prestigeEvolutionTab.setAttribute("aria-disabled", "false");
      dom.prestigeEvolutionTab.title = prestigeUnlocked
        ? "Prestígio e legados permanentes"
        : `Prestígio desbloqueado no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}; legados continuam acessíveis`;
    }
  }

  function updateFarmProgressDisplay() {
    const state = engine.state;
    const maximumLevel = GameEngine.MAX_FARM_LEVEL;
    const atMaximum = state.farmLevel >= maximumLevel;
    const farmNeed = engine.getFarmXPNeed();
    dom.farmLevelLabel.textContent = String(Math.min(maximumLevel, state.farmLevel));
    dom.farmProgress?.classList.toggle("max-level", atMaximum);
    dom.farmXPBar.style.width = atMaximum ? "100%" : `${percent((state.farmXP / farmNeed) * 100)}%`;
    dom.farmXPText.textContent = atMaximum
      ? `${engine.formatNumber(state.farmXP)} XP`
      : `${engine.formatNumber(state.farmXP)} / ${engine.formatNumber(farmNeed)} XP`;
    if (dom.farmXPTrack) {
      dom.farmXPTrack.setAttribute("aria-valuemin", "0");
      dom.farmXPTrack.setAttribute("aria-valuemax", atMaximum ? "100" : String(farmNeed));
      dom.farmXPTrack.setAttribute("aria-valuenow", atMaximum ? "100" : String(Math.floor(state.farmXP)));
      dom.farmXPTrack.setAttribute("aria-label", atMaximum ? `Nível máximo. ${engine.formatNumber(state.farmXP)} XP.` : "Experiência da fazenda");
    }
  }

  function renderHeader() {
    syncFeatureLocks();
    const state = engine.state;
    const coinsText = engine.formatNumber(state.coins);
    const researchText = engine.formatNumber(state.research);
    const prestigeText = engine.formatNumber(state.prestigePoints);
    dom.coinsCounter.textContent = coinsText;
    dom.researchCounter.textContent = researchText;
    dom.prestigeCounter.textContent = prestigeText;
    if (dom.floatingCoinsCounter) dom.floatingCoinsCounter.textContent = coinsText;
    if (dom.floatingResearchCounter) dom.floatingResearchCounter.textContent = researchText;
    if (dom.floatingPrestigeCounter) dom.floatingPrestigeCounter.textContent = prestigeText;
    updateFarmProgressDisplay();

    const metrics = engine.getMetrics();
    updateStockNavigation(metrics);
    const readyContracts = engine.isContractsUnlocked() ? engine.getReadyContractCount() : 0;
    const readyOrders = engine.isOrdersUnlocked() ? engine.getReadyOrderCount() : 0;
    const readyMissions = engine.getReadyMissionCount();
    updateOfficeNavigation();
    dom.contractTabCount.textContent = String(readyContracts);
    dom.contractTabCount.hidden = readyContracts < 1;
    dom.orderTabCount.textContent = String(readyOrders);
    dom.orderTabCount.hidden = readyOrders < 1;
    dom.missionTabCount.textContent = String(readyMissions);
    dom.missionTabCount.hidden = readyMissions < 1;
    renderContractDock();
  }

  function formatLiveTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (value < 10) return `${value.toFixed(1).replace(".", ",")}s`;
    if (value < 60) return `${Math.ceil(value)}s`;
    return engine.formatTime(value);
  }

  function updateLiveHeader(now = performance.now()) {
    if (now - lastLiveHeader < 100) return;
    lastLiveHeader = now;
    const state = engine.state;
    const coinsText = engine.formatNumber(state.coins);
    const researchText = engine.formatNumber(state.research);
    const prestigeText = engine.formatNumber(state.prestigePoints);
    dom.coinsCounter.textContent = coinsText;
    dom.researchCounter.textContent = researchText;
    dom.prestigeCounter.textContent = prestigeText;
    if (dom.floatingCoinsCounter) dom.floatingCoinsCounter.textContent = coinsText;
    if (dom.floatingResearchCounter) dom.floatingResearchCounter.textContent = researchText;
    if (dom.floatingPrestigeCounter) dom.floatingPrestigeCounter.textContent = prestigeText;
    updateFarmProgressDisplay();
    updateStockNavigation({
      stock: engine.getStorageUsed(),
      storageCapacity: engine.getStorageCap()
    });
  }

  function updateLiveFarmUI(now = performance.now()) {
    if (activeView !== "farmView") return;
    const storageRemaining = engine.getStorageRemaining();
    const updateControls = now - lastCropControls >= 450;
    if (updateControls) lastCropControls = now;

    $$('[data-live-crop]').forEach(card => {
      const cropId = card.dataset.liveCrop;
      const cropState = engine.state.crops[cropId];
      if (!cropState?.owned) return;
      const growthTime = engine.getGrowthTime(cropId);
      const instant = growthTime <= 0;
      const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === cropId && contract.delivered < contract.amount && contract.timeRemaining > 0 && !contract.completedAt);
      const directRoute = cropState.autoSell || activeContracts.length > 0;
      const paused = storageRemaining <= 0 && !directRoute;
      const progress = instant ? 100 : percent(cropState.progress * 100);
      const ring = $('[data-crop-ring]', card);
      const progressLabel = $('[data-crop-percent]', card);
      const cycle = $('[data-crop-cycle]', card);

      if (ring) {
        const previous = Number(ring.dataset.lastProgress || 0);
        const wrapped = !instant && previous > 88 && progress < 25;
        if (wrapped) {
          ring.classList.add("progress-resetting");
          ring.style.setProperty("--growth-progress", "0%");
          void ring.offsetWidth;
          requestAnimationFrame(() => {
            ring.classList.remove("progress-resetting");
            ring.style.setProperty("--growth-progress", `${progress}%`);
          });
        } else {
          ring.style.setProperty("--growth-progress", `${progress}%`);
        }
        ring.dataset.lastProgress = String(progress);
        ring.classList.toggle("instant", instant);
        ring.classList.toggle("paused", paused);
      }
      if (progressLabel) {
        progressLabel.hidden = instant;
        if (!instant) progressLabel.textContent = paused ? "Ⅱ" : `${Math.floor(progress)}%`;
      }
      if (cycle) cycle.textContent = instant ? "Contínua" : paused ? "Pausada" : formatLiveTime((1 - cropState.progress) * growthTime);
      card.classList.toggle("auto-sell-enabled", Boolean(cropState.autoSell));

      if (updateControls) updateCropUpgradePanel(card, cropId);
    });

    if (updateControls) {
      $$('[data-locked-crop]').forEach(card => {
        const cropId = card.dataset.lockedCrop;
        const crop = engine.getCrop(cropId);
        const unlocked = engine.isCropUnlocked(cropId);
        const buyCost = engine.getBuyCost(cropId);
        const canAfford = engine.state.coins >= buyCost;
        const button = $('[data-crop-purchase]', card);
        card.classList.toggle("insufficient", unlocked && !canAfford);
        if (button) {
          button.disabled = !unlocked || !canAfford;
          button.innerHTML = !unlocked
            ? `Necessário: Fazenda nível ${crop.unlockLevel}`
            : `Comprar ${resourceAmount("coins", -buyCost, { compact: true })}`;
        }
      });
    }
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
            <div class="crop-art locked-art"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"></div>
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
    const activeContracts = engine.state.activeContracts.filter(contract => contract.cropId === crop.id && contract.delivered < contract.amount && !contract.completedAt);
    const directRoute = data.autoSell || activeContracts.length > 0;
    const storageFull = engine.getStorageRemaining() <= 0 && !directRoute;
    const speedMaxed = data.level >= engine.getInstantGrowthLevel();
    const mastered = data.level >= GameEngine.MAX_CROP_LEVEL;
    const cycleLabel = instant ? "Contínua" : storageFull ? "Pausada" : formatLiveTime((1 - data.progress) * growthTime);
    const selection = getCropUpgradeSelection(crop.id);

    return `
      <article class="crop-card ${data.autoSell ? "auto-sell-enabled" : ""} ${mastered ? "crop-mastered" : ""}" data-live-crop="${crop.id}" style="--crop-glow:${getCropGlow(crop.category)}">
        <div class="crop-level-strip" title="${mastered ? "Cultura platinada: nível 300 alcançado e bônus de 10% de XP recebido" : speedMaxed ? "Velocidade máxima; ao alcançar o nível 300 esta cultura concede 10% de XP" : "Ao alcançar o nível 300 esta cultura concede 10% de XP"}">
          <span class="crop-level-compact">Nível <strong>${data.level}</strong><small>/ ${GameEngine.MAX_CROP_LEVEL}</small></span>
          ${mastered ? `<span class="crop-mastery-badge"><img alt="" src="assets/icons/crop-mastery-star.png">Platinada</span>` : ""}
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
          <div class="upgrade-mode-selector" role="group" aria-label="Quantidade de aprimoramentos">
            <button class="upgrade-mode-option ${selection.mode === "one" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="one" data-crop="${crop.id}" aria-pressed="${selection.mode === "one"}" ${selection.maxed ? 'disabled aria-disabled="true"' : ""}>+1</button>
            <button class="upgrade-mode-option ${selection.mode === "max" ? "active" : ""}" type="button" data-action="select-upgrade-mode" data-upgrade-mode="max" data-crop="${crop.id}" aria-pressed="${selection.mode === "max"}" ${selection.maxed ? 'disabled aria-disabled="true"' : ""}>Max</button>
          </div>
          <div class="crop-upgrade-summary" data-crop-upgrade-summary><strong>${selection.maxed ? "Máx." : `+${selection.mode === "max" ? selection.levels : 1}`}</strong></div>
          <button class="button primary full crop-upgrade-cta" type="button" data-action="upgrade-crop-selected" data-crop="${crop.id}" data-crop-upgrade-action ${selection.maxed || !selection.affordable ? "disabled" : ""}>${selection.maxed ? "Plantação concluída" : `Aprimorar ${resourceAmount("coins", -selection.cost, { compact: true })}`}</button>
        </div>
      </article>`;
  }

  function renderCrops() {
    const term = normalize(dom.searchCrop.value);
    const category = dom.categoryFilter.value;
    const nextLockedCropIds = new Set(engine.data.crops
      .filter(crop => !engine.state.crops[crop.id]?.owned && crop.unlockLevel > engine.state.farmLevel)
      .sort((cropA, cropB) => (cropA.unlockLevel - cropB.unlockLevel) || (cropA.index - cropB.index))
      .slice(0, 3)
      .map(crop => crop.id));
    const list = engine.data.crops.filter(crop => {
      const cropState = engine.state.crops[crop.id];
      const categoryName = engine.data.categories[crop.category];
      const visibleByProgress = cropState.owned || crop.unlockLevel <= engine.state.farmLevel || nextLockedCropIds.has(crop.id);
      const matchesCategory = category === "locked"
        ? !cropState.owned && crop.unlockLevel <= engine.state.farmLevel
        : category === "all" || crop.category === category;
      return visibleByProgress && matchesCategory && (!term || normalize(`${crop.name} ${categoryName}`).includes(term));
    }).sort((a, b) => a.index - b.index);

    dom.cropGrid.innerHTML = list.map(renderCropCard).join("");
    dom.cropEmpty.classList.toggle("hidden", list.length > 0);
  }

  function renderStock() {
    const categoryFilter = dom.stockCategoryFilter?.value || "all";
    const allOwned = engine.data.crops.filter(crop => engine.state.crops[crop.id].owned);
    const owned = allOwned.filter(crop => categoryFilter === "all" || crop.category === categoryFilter);
    const upcomingLocked = engine.data.crops
      .filter(crop => !engine.state.crops[crop.id].owned && crop.unlockLevel > engine.state.farmLevel)
      .sort((cropA, cropB) => (cropA.unlockLevel - cropB.unlockLevel) || (cropA.index - cropB.index))
      .slice(0, 3)
      .filter(crop => categoryFilter === "all" || crop.category === categoryFilter);
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
    const lockedCards = upcomingLocked.map(crop => `
      <article class="stock-card normalized-stock-card stock-card-locked" title="${escapeHtml(crop.name)} será desbloqueada no nível ${crop.unlockLevel}">
        <span class="stock-lock-icon" aria-hidden="true"></span>
        <div class="stock-head"><div class="stock-ident"><img src="${crop.image}" alt="${escapeHtml(crop.name)}" loading="lazy"><div><h3>${escapeHtml(crop.name)}</h3><small>${escapeHtml(engine.data.categories[crop.category])}</small></div></div></div>
        <div class="stock-locked-copy"><small>Próxima cultura</small><strong>Desbloqueia no nível ${crop.unlockLevel}</strong><p>Ela aparecerá no estoque depois que for liberada e comprada na Fazenda.</p></div>
      </article>`);

    const cards = [...ownedCards, ...lockedCards];
    dom.stockGrid.innerHTML = cards.length
      ? cards.join("")
      : `<div class="empty-state">Nenhum item pertence à categoria selecionada.</div>`;
  }

  function featureGateMarkup({ eyebrow, title, description, level }) {
    const currentLevel = Math.max(1, Number(engine.state.farmLevel) || 1);
    const requiredLevel = Math.max(1, Number(level) || 1);
    const remaining = Math.max(0, requiredLevel - currentLevel);
    return `<section class="feature-gate-card" aria-live="polite">
      <div class="feature-gate-copy">
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)} ${remaining > 0 ? `Faltam ${remaining} ${remaining === 1 ? "nível" : "níveis"}.` : "Disponível agora."}</p>
      </div>
      <span class="feature-gate-level"><small>libera no nível</small><strong>${requiredLevel}</strong></span>
    </section>`;
  }

  function renderUpgradeCard(item, kind) {
    const source = kind === "upgrade" ? engine.state.upgrades : kind === "research" ? engine.state.researchTechs : engine.state.prestigeUpgrades;
    const level = Number(source[item.id] || 0);
    const maxed = level >= item.max;
    const cost = maxed ? 0 : engine.getUpgradeCost(item, source);
    const resourceType = kind === "upgrade" ? "coins" : kind === "research" ? "research" : "prestige";
    const availableResource = kind === "upgrade" ? engine.state.coins : kind === "research" ? engine.state.research : engine.state.prestigePoints;
    const journeyLocked = kind !== "prestige" && !engine.isEvolutionUnlocked();
    const affordable = !maxed && !journeyLocked && availableResource >= cost;
    const action = kind === "upgrade" ? "buy-upgrade" : kind === "research" ? "buy-research" : "buy-prestige-upgrade";
    const isRoyalTreasury = kind === "prestige" && item.id === "royalTreasury";
    const iconMarkup = typeof item.icon === "string" && /^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(item.icon)
      ? `<img src="${escapeHtml(item.icon)}" alt="">`
      : escapeHtml(item.icon);
    const treasuryAmount = engine.getStartingCoins();
    const descriptionHtml = isRoyalTreasury
      ? `<span class="treasury-current-value">${resourceAmount("coins", treasuryAmount, { compact: true })}<span>ao começar uma nova jornada.</span></span>${level < item.max
        ? `<span class="treasury-next-value">Próximo nível: ${resourceAmount("coins", GameEngine.TREASURY_COINS_PER_LEVEL, { compact: true })} adicionais.</span>`
        : `<span class="treasury-next-value">Valor inicial máximo consolidado.</span>`}`
      : enrichResourceText(item.desc);
    const buttonLabel = maxed
      ? "Concluído"
      : journeyLocked
        ? `Disponível no nível ${GameEngine.FEATURE_UNLOCK_LEVEL}`
        : `Aprimorar ${resourceAmount(resourceType, -cost, { compact: true })}`;
    return `
      <article class="upgrade-card normalized-upgrade-card redesigned-evolution-card ${maxed ? "evolution-upgrade-completed" : ""} ${journeyLocked ? "upgrade-card-preview" : ""}" data-upgrade-kind="${kind}" data-upgrade-completed="${String(maxed)}">
        <div class="upgrade-level-badge">${maxed ? "Nível máximo" : `Nível ${level} / ${item.max}`}</div>
        <div class="upgrade-card-identity">
          <span class="upgrade-icon" aria-hidden="true">${iconMarkup}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <p class="upgrade-description ${isRoyalTreasury ? "treasury-description" : ""}">${descriptionHtml}</p>
        <button class="button ${kind === "prestige" ? "gold" : "primary"} full" type="button" data-action="${action}" data-id="${item.id}" ${maxed || !affordable ? "disabled" : ""}>${buttonLabel}</button>
      </article>`;
  }

  function showEvolutionTab(tabId) {
    activeEvolutionTab = ["upgrades", "research", "prestige"].includes(tabId) ? tabId : "upgrades";
    dom.evolutionTabs.forEach(tab => {
      const active = tab.dataset.evolutionTab === activeEvolutionTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    dom.evolutionPanels.forEach(panel => {
      const active = panel.dataset.evolutionPanel === activeEvolutionTab;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function renderEvolutions() {
    const evolutionUnlocked = engine.isEvolutionUnlocked();
    const evolutionGate = evolutionUnlocked ? "" : featureGateMarkup({
      eyebrow: "prévia disponível",
      title: `Evoluções liberam no nível ${GameEngine.FEATURE_UNLOCK_LEVEL}`,
      description: "Explore todas as opções agora. As compras com moedas e pesquisa ficam disponíveis quando sua fazenda alcançar o nível necessário.",
      level: GameEngine.FEATURE_UNLOCK_LEVEL
    });

    dom.upgradeList.innerHTML = `${evolutionGate}${engine.data.upgrades.map(item => renderUpgradeCard(item, "upgrade")).join("")}`;
    dom.researchList.innerHTML = `${evolutionGate}${engine.data.research.map(item => renderUpgradeCard(item, "research")).join("")}`;
    dom.prestigeList.innerHTML = engine.data.prestigeUpgrades.map(item => renderUpgradeCard(item, "prestige")).join("");

    const gain = engine.getPrestigeEstimate();
    const metrics = engine.getMetrics();
    const prestigeUnlocked = engine.isPrestigeUnlocked();
    const drivers = [
      { label: "Nível da fazenda", value: `${engine.state.farmLevel}`, ready: prestigeUnlocked },
      { label: "Moedas desta jornada", value: resourceAmount("coins", engine.state.stats.runCoinsEarned), ready: engine.state.stats.runCoinsEarned > 0 },
      { label: "Culturas compradas", value: `${metrics.owned} / ${engine.data.crops.length}`, ready: metrics.owned > 0 },
      { label: "Contratos concluídos", value: engine.state.stats.contractsCompleted, ready: engine.state.stats.contractsCompleted > 0 }
    ];
    dom.prestigeDashboard.innerHTML = `
      <section class="prestige-overview-card normalized-prestige-card ${!prestigeUnlocked ? "prestige-locked" : ""}">
        <div class="prestige-copy"><p class="eyebrow">prestígio</p><h2>${prestigeUnlocked ? "Transforme esta jornada em legado" : `Prestígio desbloqueado no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</h2><p>${prestigeUnlocked ? "O cálculo usa somente o progresso renovável desta jornada." : `Você já pode visualizar e comprar legados com pontos acumulados. Apenas a ação de prestigiar permanece bloqueada por mais ${Math.max(0, GameEngine.PRESTIGE_UNLOCK_LEVEL - engine.state.farmLevel)} níveis.`}</p></div>
        <div class="prestige-gain-card"><small>Ganho estimado</small><strong>${resourceAmount("prestige", gain)}</strong><span>${prestigeUnlocked ? (engine.state.permanentBonuses.prestigeDouble ? "Bônus permanente 2× ativo" : "Aumente a jornada para ganhar mais") : `Prestígio no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}`}</span></div>
      </section>
      <section class="prestige-requirements normalized-prestige-requirements"><div class="prestige-requirements-head"><div><small>Requisitos da jornada</small><h3>Progresso que será convertido</h3></div><span>${prestigeUnlocked && gain > 0 ? "Pronto" : "Em progresso"}</span></div><div class="prestige-driver-grid">${drivers.map(item => `<article class="${item.ready ? "ready" : ""}"><div><small>${item.label}</small><strong>${item.value}</strong></div></article>`).join("")}</div></section>
      <section class="prestige-action-card"><div><strong>Ao prestigiar</strong><p>Moedas, pesquisa, nível, culturas, estoque, evoluções, contratos e pedidos da jornada serão reiniciados.</p></div><button class="button gold" type="button" data-action="perform-prestige" ${!prestigeUnlocked || gain < 1 ? "disabled" : ""}>${!prestigeUnlocked ? `Prestígio no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL}` : gain < 1 ? "Ganho insuficiente" : `Prestigiar ${resourceAmount("prestige", gain, { compact: true })}`}</button></section>`;
    showEvolutionTab(activeEvolutionTab);
  }

  function showOfficeTab(tabId) {
    activeOfficeTab = ["contracts", "orders", "missions", "stats"].includes(tabId) ? tabId : "contracts";
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
    const toggleIcon = `<img src="assets/icons/contract-dock-arrow.png" alt="">`;
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
            let status = progress.defaulted ? "Prazo vencido — conclua 100%" : `${engine.formatTime(contract.timeRemaining)} restantes`;
            let smallStatus = "entregue";
            let resourceLine = resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch });
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
    const eligible = engine.getContractEligibleCrops();
    if (!eligible.length) {
      dom.activeContractList.innerHTML = "";
      dom.contractOfferList.innerHTML = `<div class="empty-state office-empty">Compre uma cultura para começar a receber oportunidades comerciais.</div>`;
      return;
    }

    engine.ensureContractOffers();
    const active = engine.state.activeContracts;
    const offers = engine.state.contractOffers;
    const cooldowns = engine.state.contractCooldowns || [];
    const slotLimit = engine.getActiveContractSlotLimit();
    const openSlots = Math.max(0, slotLimit - active.length);
    const rewardsLine = contract => `<div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: contract.rewardCoins, research: contract.rewardResearch })}</strong></div>`;
    const contractTypeLine = contract => `<span class="contract-type-label">${escapeHtml(engine.getContractDifficulty(contract.difficulty).label)}</span>`;
    const penaltyLine = progress => `<div class="contract-penalty-unified"><span>Recompensa cancelada</span><strong class="resource-reward-group">${resourceRewards({ coins: progress.penaltyCoins })}</strong><small>Multa obrigatória: valor original do contrato + 20%.</small></div>`;
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
      const toneClass = contract.difficulty === "urgent" ? "contract-tone-urgent" : contract.difficulty === "bulk" ? "contract-tone-bulk" : "contract-tone-normal";

      if (progress.readyToPayPenalty) {
        return `<article class="contract-card active-contract-card contract-completed-card contract-defaulted-card friendly-contract-card ${toneClass}">
          <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Entrega concluída com atraso</strong></div></div><span class="contract-defaulted-badge">Multa pendente</span></div>
          <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>${engine.formatNumber(contract.amount)} unidades entregues</small><h3>${escapeHtml(crop.name)}</h3></div></div>
          ${penaltyLine(progress)}
          <button class="button danger full contract-penalty-button" type="button" data-action="pay-contract-penalty" data-id="${contract.id}">Pagar multa, receber 1,7% de XP e liberar slot</button>
        </article>`;
      }

      if (progress.defaulted) {
        return `<article class="contract-card active-contract-card contract-defaulted-card friendly-contract-card ${toneClass}">
          <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Prazo descumprido</strong></div></div><span class="contract-defaulted-badge">Sem prazo</span></div>
          <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>Entrega obrigatória</small><h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3></div></div>
          <div class="contract-progress-block"><div class="progress-label"><span>Produção enviada</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span></div></div>
          ${penaltyLine(progress)}
          ${breakAction(contract)}
        </article>`;
      }

      if (progress.completed) {
        return `<article class="contract-card active-contract-card contract-completed-card friendly-contract-card ${toneClass}">
          <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Entrega concluída</strong></div></div><span class="contract-ready-mark">✓ Pronta</span></div>
          <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>${engine.formatNumber(contract.amount)} unidades</small><h3>${escapeHtml(crop.name)}</h3></div></div>
          ${rewardsLine(contract)}
          <button class="button gold full reward-claim-button" type="button" data-action="claim-contract" data-id="${contract.id}">Receber recompensa</button>
        </article>`;
      }

      return `<article class="contract-card active-contract-card friendly-contract-card ${toneClass} ${urgent ? "contract-deadline-warning" : ""}">
        <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.name)}</small><strong>Contrato assinado</strong></div></div><span class="contract-clock-badge ${urgent ? "urgent" : ""}">⏱ ${engine.formatTime(contract.timeRemaining)}</span></div>
        <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<small>Meta de entrega</small><h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3></div></div>
        <div class="contract-progress-block"><div class="progress-label"><span>Produção enviada</span><strong>${engine.formatNumber(progress.delivered)} / ${engine.formatNumber(contract.amount)}</strong></div><div class="progress-track contract-progress-track"><span class="contract-delivered" style="width:${percent(progress.percent)}%"></span></div></div>
        ${rewardsLine(contract)}
        ${breakAction(contract)}
      </article>`;
    });
    dom.activeContractList.innerHTML = [slotSummary, ...activeCards].join("");

    const offerCards = offers.map(contract => {
      const crop = engine.getCrop(contract.cropId);
      const company = engine.getCompany(contract.companyId);
      const toneClass = contract.difficulty === "urgent" ? "contract-tone-urgent" : contract.difficulty === "bulk" ? "contract-tone-bulk" : "contract-tone-normal";
      return `<article class="contract-card contract-offer-card friendly-contract-card ${toneClass}">
        <div class="friendly-contract-top"><div class="contract-company-mark"><span>${companyIconMarkup(company)}</span><div><small>${escapeHtml(company.specialty)}</small><strong>${escapeHtml(company.name)}</strong></div></div><span class="contract-clock-badge">⏱ ${engine.formatTime(contract.durationSeconds)}</span></div>
        <div class="contract-product-focus"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div>${contractTypeLine(contract)}<h3>${engine.formatNumber(contract.amount)} ${escapeHtml(crop.name.toLowerCase())}</h3></div></div>
        ${rewardsLine(contract)}
        <div class="contract-offer-actions"><button class="button primary contract-accept-button" type="button" data-action="accept-contract" data-id="${contract.id}" ${openSlots < 1 ? "disabled" : ""}>${openSlots < 1 ? "Limite atingido" : "Assinar"}</button><button class="button secondary contract-decline-button" type="button" data-action="decline-contract" data-id="${contract.id}">Recusar</button></div>
      </article>`;
    });

    const cooldownCards = cooldowns.map(item => {
      const seconds = Math.max(0, Math.ceil((item.availableAt - Date.now()) / 1000));
      const progress = percent((1 - seconds / Math.max(1, item.durationSeconds)) * 100);
      return `<article class="contract-card contract-cooldown-card friendly-contract-card" aria-live="polite"><div class="cooldown-friendly"><img src="assets/icons/reload-contract.png" alt=""><div><small>Proposta indisponível</small><h3>Nova oportunidade em ${engine.formatTime(seconds)}</h3><p>Este espaço voltará depois do intervalo fixo de 5 minutos.</p></div></div><div class="progress-track"><span style="width:${progress}%"></span></div></article>`;
    });
    const availableCards = [...offerCards, ...cooldownCards];
    dom.contractOfferList.innerHTML = availableCards.length
      ? availableCards.join("")
      : `<div class="empty-state office-empty">As seis propostas estão em renovação. Aguarde o término dos intervalos.</div>`;
  }

  function renderOrders() {
    if (!engine.isOrdersUnlocked()) {
      dom.orderList.innerHTML = featureGateMarkup({
        eyebrow: "prévia do escritório",
        title: `Pedidos liberam no nível ${GameEngine.FEATURE_UNLOCK_LEVEL}`,
        description: "Esta área já pode ser consultada. As entregas e recompensas começam quando sua fazenda atingir o nível necessário.",
        level: GameEngine.FEATURE_UNLOCK_LEVEL
      });
      dom.completedOrderList.innerHTML = `<div class="empty-state compact-order-empty">O histórico de pedidos aparecerá depois da primeira entrega.</div>`;
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = `Entregas disponíveis a partir do nível ${GameEngine.FEATURE_UNLOCK_LEVEL}.`;
      return;
    }

    const owned = engine.getOwnedCrops();
    if (!owned.length) {
      dom.orderList.innerHTML = `<div class="empty-state office-empty">Compre uma cultura para iniciar sua primeira sequência de pedidos.</div>`;
      dom.completedOrderList.innerHTML = `<div class="empty-state compact-order-empty">Nenhum pedido finalizado ainda.</div>`;
      if (dom.completedOrderCount) dom.completedOrderCount.textContent = "Nenhum pedido finalizado ainda.";
      return;
    }

    const completedCrops = owned.filter(crop => engine.getOrder(crop.id)?.complete);
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
        <div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resourceRewards({ coins: order.rewardCoins, research: order.rewardResearch })}</strong></div>
        <button class="button ${canDeliver ? "primary" : "secondary"} full" type="button" data-action="deliver-order" data-crop="${crop.id}" ${canDeliver ? "" : "disabled"}>Entregar pedido</button>
      </article>`;
    }).join("") || `<div class="empty-state office-empty">Todas as séries de pedidos foram concluídas.</div>`;

    dom.completedOrderList.innerHTML = completedCrops.map(crop => {
      const category = engine.data.categories[crop.category];
      return `<article class="order-card order-complete compact-completed-order">
        <div class="completed-order-identity"><img src="${crop.image}" alt="${escapeHtml(crop.name)}"><div><small>Série completa</small><h3>${escapeHtml(crop.name)}</h3><p>${escapeHtml(category)}</p></div></div>
        <strong class="completed-order-status">Pedido finalizado</strong>
      </article>`;
    }).join("") || `<div class="empty-state compact-order-empty">Nenhum pedido finalizado ainda.</div>`;

    if (dom.completedOrderCount) dom.completedOrderCount.textContent = completedCrops.length
      ? `${completedCrops.length} ${completedCrops.length === 1 ? "cultura finalizou" : "culturas finalizaram"} todos os pedidos.`
      : "Nenhum pedido finalizado ainda.";
  }

  function rewardHtml(reward) {
    const parts = [];
    const resources = resourceRewards(reward);
    if (resources) parts.push(resources);
    if (reward.permanent === "prestigeDouble") parts.push('<span class="permanent-reward">2× pontos nos próximos prestígios</span>');
    return parts.join("");
  }

  function renderMissions() {
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
        <div class="mission-head"><div><span class="mission-stage-label">Etapa ${stage} de ${seriesMissions.length}</span><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div></div>
        <div class="mission-progress"><div class="progress-label"><span>Progresso acumulado</span><strong>${engine.formatNumber(Math.min(value, mission.target))} / ${engine.formatNumber(mission.target)}</strong></div><div class="progress-track growth"><span style="width:${progress}%"></span></div></div>
        <div class="mission-reward"><span>Recompensa</span><strong class="resource-reward-group">${rewardHtml(mission.reward)}</strong></div>
        ${claimed ? `<div class="mission-claimed-mark">✓ Recompensa recebida</div>` : `<button class="button ${completed ? "primary" : "secondary"} full" type="button" data-action="claim-mission" data-id="${mission.id}" ${completed ? "" : "disabled"}>Receber recompensa</button>`}
      </article>`;
    }).join("") || `<div class="empty-state">Todas as séries de missões foram concluídas.</div>`;
    if (dom.toggleCompletedMissions) {
      dom.toggleCompletedMissions.hidden = claimedMissions.length === 0;
      dom.toggleCompletedMissions.textContent = showCompletedMissions ? "Ocultar missões concluídas" : "Mostrar missões concluídas";
      dom.toggleCompletedMissions.setAttribute("aria-expanded", String(showCompletedMissions));
    }
    if (dom.completedMissionCount) dom.completedMissionCount.textContent = claimedMissions.length
      ? `${claimedMissions.length} de ${engine.data.missions.length} etapas concluídas na conta.`
      : "Nenhuma missão concluída ainda.";
  }

  function statIcon(source, label = "") {
    return `<img alt="" aria-hidden="true" src="${escapeHtml(source)}" title="${escapeHtml(label)}">`;
  }

  function statCard(iconSource, label, value, note = "") {
    return `<article class="player-stat-card"><span class="player-stat-icon">${statIcon(iconSource, label)}</span><div><small>${escapeHtml(label)}</small><strong>${value}</strong>${note ? `<p>${escapeHtml(note)}</p>` : ""}</div></article>`;
  }

  function formatAccountAge(timestamp) {
    const seconds = Math.max(0, (Date.now() - Number(timestamp || Date.now())) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days > 0) return `${days} dia${days === 1 ? "" : "s"}`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0) return `${hours} hora${hours === 1 ? "" : "s"}`;
    return `${Math.max(1, Math.floor(seconds / 60))} min`;
  }


  function renderPrestigeLeaderboard() {
    if (!dom.prestigeLeaderboard) return;
    const user = window.FirebaseManager.getUser();
    if (leaderboardState.status === "loading") {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty leaderboard-loading"><strong>Atualizando o rank global...</strong><span>Consultando as cinco melhores fazendas e sua posição atual.</span></div>`;
      return;
    }
    if (leaderboardState.status === "error") {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>Não foi possível carregar o rank</strong><span>${escapeHtml(window.FirebaseManager.getFriendlyError(leaderboardState.error))}</span></div>`;
      return;
    }
    if (leaderboardState.status !== "success") {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>Top 5 global</strong><span>O ranking é público. Jogadores conectados com perfil completo também veem a própria classificação.</span></div>`;
      return;
    }

    const top = Array.isArray(leaderboardState.top) ? leaderboardState.top.slice(0, 5) : [];
    const currentUid = user?.uid || "";
    const renderPosition = position => `<span>${engine.formatNumber(position)}º</span>${position === 1 ? '<img alt="" aria-hidden="true" src="assets/icons/crown.png">' : ""}`;
    const renderRow = (player, personal = false) => {
      const avatar = getAvatarEntry(player?.avatarId);
      if (!avatar) return "";
      const current = Boolean(currentUid && player.uid === currentUid);
      return `<article class="leaderboard-row ${current ? "current-player" : ""} ${personal ? "personal-rank-row" : ""}">
        <strong class="leaderboard-position">${renderPosition(player.position)}</strong>
        <img src="${escapeHtml(avatar.src)}" alt="Avatar de ${escapeHtml(player?.displayName || "jogador")}">
        <div class="leaderboard-player"><strong>${escapeHtml(player?.displayName || "Fazendeiro")}</strong><small>${engine.formatNumber(player?.prestigeCount || 0)} prestígios · nível máximo ${engine.formatNumber(player?.maxFarmLevel || 1)}</small></div>
        <div class="leaderboard-score"><small>Prestígio total</small><strong>${resourceAmount("prestige", player?.prestigeTotal || 0, { compact: true })}</strong></div>
      </article>`;
    };

    const topRows = top.map(player => renderRow(player)).filter(Boolean);
    const player = leaderboardState.player;
    const playerOutsideTop = Boolean(player && !top.some(entry => entry.uid === player.uid));
    const personalRow = playerOutsideTop
      ? `<div class="leaderboard-personal-divider"><span>Sua classificação</span></div>${renderRow(player, true)}`
      : "";

    if (!topRows.length) {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>Ainda não há fazendas classificadas</strong><span>Para participar, o jogador precisa estar conectado e ter apelido e avatar salvos.</span></div>`;
      return;
    }

    dom.prestigeLeaderboard.innerHTML = `<div class="leaderboard-list">${topRows.join("")}${personalRow}</div>`;
  }

  async function refreshPrestigeLeaderboard(force = false) {
    if (leaderboardRequest) return leaderboardRequest;
    if (!force && leaderboardState.status === "success" && Date.now() - leaderboardState.loadedAt < 30000) return;

    leaderboardState = { ...leaderboardState, status: "loading", error: null };
    renderPrestigeLeaderboard();
    leaderboardRequest = (async () => {
      try {
        if (force && window.FirebaseManager.isAuthenticated()) await engine.save();
        const result = await window.FirebaseManager.loadPrestigeLeaderboard(5);
        leaderboardState = {
          status: "success",
          top: result.top || [],
          rank: result.rank || null,
          player: result.player || null,
          error: null,
          loadedAt: Date.now()
        };
      } catch (error) {
        leaderboardState = { status: "error", top: [], rank: null, player: null, error, loadedAt: Date.now() };
      } finally {
        leaderboardRequest = null;
        renderPrestigeLeaderboard();
      }
    })();
    return leaderboardRequest;
  }

  function renderStats() {
    const state = engine.state;
    const stats = state.stats;
    const claimed = engine.data.missions.filter(mission => state.missionsClaimed[mission.id]);
    const discovered = Object.keys(state.cropsDiscovered || {}).filter(id => state.cropsDiscovered[id]).length;
    const legacyLevels = Object.values(state.prestigeUpgrades).reduce((sum, value) => sum + Number(value || 0), 0);
    dom.statsHero.innerHTML = `<article class="stats-account-card"><div><p class="eyebrow">sua história</p><h2>${stats.prestiges > 0 ? `${stats.prestiges + 1}ª jornada da fazenda` : "Primeira jornada da fazenda"}</h2><p>Conta criada há ${formatAccountAge(state.createdAt)}. Estatísticas históricas e conquistas permanecem entre prestígios.</p></div><div class="stats-account-score"><small>Etapas de missão</small><strong>${claimed.length}<span>/ ${engine.data.missions.length}</span></strong></div></article>`;
    dom.lifetimeStats.innerHTML = [
      statCard("assets/icons/coin.png", "Moedas recebidas", resourceAmount("coins", stats.lifetimeCoins), "Total de todas as jornadas"),
      statCard("assets/icons/harvest-crate.png", "Itens produzidos", engine.formatNumber(stats.lifetimeHarvested), "Produção histórica"),
      statCard("assets/icons/shop.png", "Itens vendidos", engine.formatNumber(stats.lifetimeSold), "Mercado manual e automático"),
      statCard("assets/icons/commercial-contract.png", "Contratos concluídos", engine.formatNumber(stats.lifetimeContractsCompleted), `${engine.formatNumber(stats.lifetimeContractUnitsDelivered)} unidades entregues`),
      statCard("assets/icons/clipboard.png", "Pedidos concluídos", engine.formatNumber(stats.lifetimeOrdersCompleted), `${engine.formatNumber(stats.lifetimeOrderUnitsDelivered)} unidades entregues`),
      statCard("assets/icons/prestige.png", "Prestígios realizados", engine.formatNumber(stats.prestiges), `${engine.formatNumber(stats.totalPrestigeEarned)} pontos conquistados`),
      statCard("assets/icons/books.png", "Séries de pedidos finalizadas", engine.formatNumber(stats.completedOrderSeries), "Catálogos completos por cultura"),
      statCard("assets/icons/clock.png", "Contratos expirados", engine.formatNumber(stats.lifetimeContractsFailed), "Entregas concluídas depois do prazo"),
      statCard("assets/icons/tools.png", "Contratos quebrados", engine.formatNumber(stats.lifetimeContractsBroken), "Multas pagas para encerrar contratos")
    ].join("");
    dom.recordStats.innerHTML = [
      statCard("assets/icons/barn.png", "Maior nível da fazenda", engine.formatNumber(stats.maxFarmLevel)),
      statCard("assets/icons/seedling-pot.png", "Maior nível de cultura", engine.formatNumber(stats.maxCropLevel), "Limite atual: 300"),
      statCard("assets/icons/warehouse.png", "Maior estoque ocupado", engine.formatNumber(stats.maxStorageUsed)),
      statCard("assets/icons/coin.png", "Maior saldo registrado", resourceAmount("coins", stats.maxCoinsHeld)),
      statCard("assets/icons/field-map.png", "Culturas descobertas", `${discovered} / ${engine.data.crops.length}`),
      statCard("assets/icons/harvest-crate.png", "Máximo de culturas na jornada", `${stats.maxCropsOwned} / ${engine.data.crops.length}`)
    ].join("");
    dom.achievementSummary.innerHTML = `<article><span>${statIcon("assets/icons/clipboard.png", "Missões")}</span><div><small>Missões concluídas</small><strong>${claimed.length} / ${engine.data.missions.length}</strong></div></article><article><span>${statIcon("assets/icons/crown.png", "Legados")}</span><div><small>Níveis de legado</small><strong>${legacyLevels}</strong></div></article><article><span>${statIcon("assets/icons/prestige.png", "Bônus permanentes")}</span><div><small>Bônus permanentes</small><strong>${state.permanentBonuses.prestigeDouble ? "Prestígio 2× ativo" : "Em construção"}</strong></div></article>`;
    const permanentAchievements = [];
    if (state.permanentBonuses.prestigeDouble) permanentAchievements.push(`<article class="achievement-card permanent-achievement"><span>${statIcon("assets/icons/prestige.png", "Bônus permanente")}</span><div><small>Bônus permanente</small><h3>Prestígio dos prestígios</h3><p>Todos os próximos prestígios concedem o dobro de pontos.</p></div></article>`);
    engine.data.prestigeUpgrades.forEach(item => {
      const level = Number(state.prestigeUpgrades[item.id] || 0);
      if (level > 0) {
        const legacyIcon = typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon)
          ? `<img src="${escapeHtml(item.icon)}" alt="">`
          : escapeHtml(item.icon);
        permanentAchievements.push(`<article class="achievement-card legacy-achievement"><span>${legacyIcon}</span><div><small>Legado permanente · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.desc)}</p></div></article>`);
      }
    });
    const missionAchievements = claimed.map(mission => `<article class="achievement-card"><span>${statIcon("assets/icons/clipboard.png", "Missão concluída")}</span><div><small>${mission.series ? `Etapa ${mission.stage}` : "Conquista"}</small><h3>${escapeHtml(mission.title)}</h3><p>${escapeHtml(mission.desc)}</p></div></article>`);
    const achievements = [...permanentAchievements, ...missionAchievements];
    dom.achievementGrid.innerHTML = achievements.length ? achievements.join("") : `<div class="empty-state">Missões concluídas, bônus permanentes e legados comprados aparecerão aqui e nunca serão apagados pelo prestígio.</div>`;
    renderPrestigeLeaderboard();
    if (activeOfficeTab === "stats") refreshPrestigeLeaderboard(false);
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastRender < 1800) return;
    lastRender = now;
    renderHeader();
    applySettings();

    if (activeView === "farmView") {
      if (force || !dom.cropGrid.children.length) renderCrops();
    } else if (activeView === "stockView") {
      renderStock();
    } else if (activeView === "evolveView") {
      renderEvolutions();
    } else if (activeView === "officeView") {
      renderContracts();
      renderOrders();
      renderMissions();
      renderStats();
      showOfficeTab(activeOfficeTab);
    }
    updateLiveHeader(now);
    updateLiveFarmUI();
  }

  function act(result) {
    if (!result?.ok) {
      if (result?.message) console.warn(result.message);
      return false;
    }
    render(true);
    return true;
  }

  function getVisibleResourceCounter(type) {
    const counters = {
      coins: [dom.floatingCoinsCounter, dom.coinsCounter],
      research: [dom.floatingResearchCounter, dom.researchCounter],
      prestige: [dom.floatingPrestigeCounter, dom.prestigeCounter]
    }[type] || [];

    return counters.find(counter => {
      if (!counter) return false;
      const rect = counter.getBoundingClientRect();
      const style = window.getComputedStyle(counter);
      return style.visibility !== "hidden"
        && style.display !== "none"
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < window.innerHeight;
    }) || counters.find(Boolean) || null;
  }

  function animateResourceReward(source, reward = {}) {
    if (!source) return;
    const sourceRect = source.getBoundingClientRect();
    const types = [
      ["coins", reward.coins],
      ["research", reward.research],
      ["prestige", reward.prestige]
    ].map(([type, value]) => [type, value, getVisibleResourceCounter(type)])
      .filter(([, value, target]) => Number(value) > 0 && target);

    types.forEach(([type, value, target], typeIndex) => {
      const targetRect = target.getBoundingClientRect();
      const particles = Math.min(9, Math.max(4, Math.ceil(Math.log10(Number(value) + 1) * 3)));
      for (let i = 0; i < particles; i += 1) {
        const particle = document.createElement("img");
        particle.className = `reward-particle reward-particle-${type}`;
        particle.src = resourceIcons[type];
        particle.alt = "";
        particle.draggable = false;
        particle.style.left = `${sourceRect.left + sourceRect.width / 2 - 10}px`;
        particle.style.top = `${sourceRect.top + sourceRect.height / 2 - 10}px`;
        document.body.appendChild(particle);

        const spreadX = (Math.random() - .5) * 90;
        const spreadY = -30 - Math.random() * 55;
        const endX = targetRect.left + targetRect.width / 2 - sourceRect.left - sourceRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2 - sourceRect.top - sourceRect.height / 2;
        const animation = particle.animate([
          { transform: "translate(0,0) scale(.65)", opacity: 0 },
          { transform: `translate(${spreadX}px, ${spreadY}px) scale(1.08)`, opacity: 1, offset: .28 },
          { transform: `translate(${endX}px, ${endY}px) scale(.5)`, opacity: .15 }
        ], {
          duration: 720 + i * 45 + typeIndex * 80,
          delay: i * 35,
          easing: "cubic-bezier(.2,.75,.25,1)",
          fill: "forwards"
        });

        animation.finished
          .then(() => soundEngine.playResourceCounterHit(type))
          .catch(() => {})
          .finally(() => particle.remove());
      }
    });
  }

  function getActionSound(action) {
    if (["upgrade-crop-selected", "buy-upgrade", "buy-research", "buy-prestige-upgrade"].includes(action)) return "upgrade";
    if (["sell-fraction", "sell-all-stock"].includes(action)) return "sell";
    if (["claim-contract", "deliver-order", "claim-mission"].includes(action)) return "reward";
    if (action === "perform-prestige") return "prestige";
    return "click";
  }

  // Ações do jogador e eventos da interface.
  function handleAction(button) {
    const action = button.dataset.action;
    const cropId = button.dataset.crop;
    const id = button.dataset.id;

    if (!["perform-prestige", "buy-crop", "accept-contract", "decline-contract", "break-contract"].includes(action)) soundEngine.play(getActionSound(action));

    if (action === "buy-crop") {
      const result = engine.buyCrop(cropId);
      if (result.ok) {
        cropUpgradeModes.set(cropId, "max");
        soundEngine.play("cropPurchase");
      }
      act(result);
    }
    if (action === "select-upgrade-mode") {
      cropUpgradeModes.set(cropId, button.dataset.upgradeMode === "max" ? "max" : "one");
      const card = button.closest("[data-live-crop]");
      if (card) updateCropUpgradePanel(card, cropId);
    }
    if (action === "upgrade-crop-selected") {
      const mode = getCropUpgradeMode(cropId);
      const result = mode === "max" ? engine.upgradeCropMax(cropId) : engine.upgradeCrop(cropId, 1);
      act(result);
    }
    if (action === "sell-fraction") {
      const stock = engine.state.crops[cropId]?.stock || 0;
      const amount = Math.max(1, Math.floor(stock * Number(button.dataset.fraction || 1)));
      const result = engine.sellCrop(cropId, amount);
      if (!result.ok) return act(result);
      animateResourceReward(button, { coins: result.gain });
      render(true);
    }
    if (action === "toggle-auto-sell") act(engine.toggleAutoSell(cropId));
    if (action === "toggle-all-auto-sell") {
      const owned = engine.data.crops.filter(crop => engine.state.crops[crop.id]?.owned);
      const allEnabled = owned.length > 0 && owned.every(crop => engine.state.crops[crop.id].autoSell);
      act(engine.setAllAutoSell(!allEnabled));
    }
    if (action === "sell-all-stock") {
      const result = engine.sellAll();
      if (!result.ok) return act(result);
      animateResourceReward(button, { coins: result.gain });
      render(true);
    }
    if (action === "expand-storage") act(engine.expandStorage());
    if (action === "buy-upgrade") act(engine.buyUpgrade(id));
    if (action === "buy-research") act(engine.buyResearch(id));
    if (action === "buy-prestige-upgrade") act(engine.buyPrestigeUpgrade(id));
    if (action === "accept-contract") {
      const result = engine.acceptContract(id);
      if (result.ok) soundEngine.play("contractSignature");
      act(result);
    }
    if (action === "decline-contract") {
      const result = engine.declineContract(id);
      if (result.ok) soundEngine.play("contractRefusal");
      act(result);
    }
    if (action === "break-contract") {
      const result = engine.breakContract(id);
      if (result.ok) soundEngine.play("contractRefusal");
      act(result);
    }
    if (action === "refresh-leaderboard") refreshPrestigeLeaderboard(true);
    if (action === "claim-contract") {
      const result = engine.claimContractReward(id);
      if (!result.ok) return act(result);
      animateResourceReward(button, { coins: result.contract.rewardCoins, research: result.contract.rewardResearch });
      render(true);
    }
    if (action === "pay-contract-penalty") act(engine.payContractPenalty(id));
    if (action === "deliver-order") {
      const result = engine.deliverOrder(cropId);
      if (!result.ok) return act(result);
      animateResourceReward(button, result.rewards || {});
      render(true);
    }
    if (action === "toggle-contract-dock") {
      contractDockCollapsed = !contractDockCollapsed;
      renderContractDock();
    }
    if (action === "claim-mission") {
      const result = engine.claimMission(id);
      if (!result.ok) return act(result);
      animateResourceReward(button, result.mission.reward || {});
      render(true);
    }
    if (action === "perform-prestige") {
      const gain = engine.getPrestigeEstimate();
      if (!engine.isPrestigeUnlocked() || gain < 1) return;
      if (dom.prestigeConfirmText) {
        dom.prestigeConfirmText.textContent = `Prestigiar agora reiniciará moedas, pesquisa, nível, culturas, estoque, evoluções, contratos e pedidos desta jornada. Você receberá ${engine.formatNumber(gain)} ponto${gain === 1 ? "" : "s"} de prestígio permanente${gain === 1 ? "" : "s"}.`;
      }
      if (typeof dom.prestigeConfirmDialog?.showModal === "function" && !dom.prestigeConfirmDialog.open) {
        dom.prestigeConfirmDialog.showModal();
      }
    }
  }

  function setupEvents() {
    document.addEventListener("dragstart", event => {
      if (event.target?.closest?.("img")) event.preventDefault();
    }, true);

    setupDragNavigation(document.querySelector(".main-nav"));
    dom.contextNavBlocks.forEach(setupDragNavigation);
    dom.tabs.forEach(tab => tab.addEventListener("click", () => {
      if (tab.disabled) return;
      soundEngine.playNavigation();
      showView(tab.dataset.view);
    }));
    dom.officeTabs.forEach(tab => tab.addEventListener("click", () => {
      if (tab.disabled) return;
      soundEngine.playNavigation();
      showOfficeTab(tab.dataset.officeTab);
      window.requestAnimationFrame(() => revealTabHorizontally(tab.closest(".context-nav-column"), tab));
      render(true);
    }));
    dom.evolutionTabs.forEach(tab => tab.addEventListener("click", () => {
      if (tab.disabled) return;
      soundEngine.playNavigation();
      showEvolutionTab(tab.dataset.evolutionTab);
      window.requestAnimationFrame(() => revealTabHorizontally(tab.closest(".context-nav-column"), tab));
      render(true);
    }));
    $$('[data-go-view]').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      soundEngine.playNavigation();
      showView(link.dataset.goView);
    }));

    document.addEventListener("click", event => {
      const contractShortcut = event.target.closest("[data-go-office-contracts]");
      if (contractShortcut) {
        showView("officeView");
        showOfficeTab("contracts");
        render(true);
        return;
      }
      const button = event.target.closest("[data-action]");
      if (button && !button.disabled) handleAction(button);
    });

    [dom.searchCrop, dom.categoryFilter, dom.stockCategoryFilter].filter(Boolean).forEach(control => {
      control.addEventListener(control.tagName === "INPUT" ? "input" : "change", () => render(true));
    });

    dom.toggleCompletedMissions?.addEventListener("click", () => {
      showCompletedMissions = !showCompletedMissions;
      renderMissions();
    });


    dom.googleSignIn?.addEventListener("click", async () => {
      setAuthBusy(true);
      try {
        await window.FirebaseManager.signInWithGoogle();
      } catch (error) {
        setCloudSaveStatus("error", { error });
      } finally {
        setAuthBusy(false);
      }
    });

    dom.googleSignOut?.addEventListener("click", async () => {
      setAuthBusy(true);
      try {
        await engine.save();
        await window.FirebaseManager.signOut();
      } catch (error) {
        setCloudSaveStatus("error", { error });
      } finally {
        setAuthBusy(false);
      }
    });


    dom.playerNicknameSetting?.addEventListener("input", () => {
      if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "true";
      dom.playerNicknameSetting.setCustomValidity("");
      setProfileFeedback("Alterações ainda não salvas.", "pending");
    });

    dom.playerRankingOptOut?.addEventListener("change", () => {
      if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "true";
      setProfileFeedback("Alterações ainda não salvas.", "pending");
    });

    dom.toggleAvatarPicker?.addEventListener("click", () => {
      if (!dom.avatarPickerPanel) return;
      const willOpen = dom.avatarPickerPanel.hidden;
      dom.avatarPickerPanel.hidden = !willOpen;
      dom.toggleAvatarPicker.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) dom.avatarPickerPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    dom.playerAvatarPicker?.addEventListener("click", event => {
      const button = event.target.closest("[data-avatar-id]");
      if (!button || button.disabled || !window.FirebaseManager.isAuthenticated()) return;
      const avatar = getAvatarEntry(button.dataset.avatarId);
      if (!avatar) return;
      if (dom.playerAvatarSetting) dom.playerAvatarSetting.value = avatar.id;
      if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "true";
      renderAvatarPicker(avatar.id, false);
      if (dom.accountAvatar) {
        dom.accountAvatar.src = avatar.src;
        dom.accountAvatar.alt = `Avatar selecionado: ${avatar.label}`;
        dom.accountAvatar.classList.remove("google-avatar");
        dom.accountAvatar.classList.add("game-avatar");
      }
      setProfileFeedback("Avatar selecionado. Salve o perfil para confirmar.", "pending");
    });

    dom.playerProfileForm?.addEventListener("submit", async event => {
      event.preventDefault();
      if (!window.FirebaseManager.isAuthenticated()) {
        setProfileFeedback("Entre com o Google antes de salvar o perfil.", "error");
        return;
      }

      const nickname = sanitizeNickname(dom.playerNicknameSetting?.value);
      const avatar = getAvatarEntry(dom.playerAvatarSetting?.value);
      const rankingOptOut = Boolean(dom.playerRankingOptOut?.checked);
      if (dom.playerNicknameSetting) dom.playerNicknameSetting.value = nickname;

      if (nickname.length < 4) {
        dom.playerNicknameSetting?.setCustomValidity("Use pelo menos 4 caracteres.");
        dom.playerNicknameSetting?.reportValidity();
        dom.playerNicknameSetting?.focus();
        setProfileFeedback("O apelido precisa ter entre 4 e 24 caracteres.", "error");
        return;
      }
      dom.playerNicknameSetting?.setCustomValidity("");
      if (!avatar) {
        setProfileFeedback("Escolha um avatar antes de salvar o perfil.", "error");
        dom.playerAvatarPicker?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }

      setAuthBusy(true);
      setProfileFeedback("Salvando perfil na nuvem...", "pending");
      try {
        engine.setSetting("playerNickname", nickname);
        engine.setSetting("playerAvatar", avatar.id);
        engine.setSetting("playerRankingOptOut", rankingOptOut);
        if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "false";
        leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
        const saveResult = await engine.save();
        if (!saveResult?.ok) throw saveResult?.error || new Error("Não foi possível salvar o perfil na nuvem.");
        updateAccountUI();
        if (dom.avatarPickerPanel) dom.avatarPickerPanel.hidden = true;
        if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.setAttribute("aria-expanded", "false");
        setProfileFeedback(rankingOptOut ? "Perfil salvo na nuvem. Sua fazenda não será exibida no ranking global." : "Perfil salvo na nuvem e publicado no ranking global.", "success");
        if (activeView === "officeView" && activeOfficeTab === "stats") await refreshPrestigeLeaderboard(true);
      } catch (error) {
        if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "true";
        setProfileFeedback(window.FirebaseManager.getFriendlyError(error), "error");
      } finally {
        setAuthBusy(false);
      }
    });

    dom.cancelPrestigeConfirm?.addEventListener("click", event => {
      event.preventDefault();
      dom.prestigeConfirmDialog?.close("cancel");
    });
    dom.confirmPrestigeConfirm?.addEventListener("click", event => {
      event.preventDefault();
      dom.prestigeConfirmDialog?.close("confirm");
      const result = engine.performPrestige();
      if (result.ok) {
        soundEngine.play("prestige");
        activeEvolutionTab = "upgrades";
        activeOfficeTab = "contracts";
        showView("farmView");
      }
      act(result);
    });

    dom.closeMilestoneDialog?.addEventListener("click", event => {
      event.preventDefault();
      dom.milestoneDialog?.close("confirm");
    });
    dom.milestoneDialog?.addEventListener("close", () => {
      delete dom.milestoneDialog.dataset.milestones;
    });

    dom.resetProgressButton?.addEventListener("click", () => {
      if (!window.FirebaseManager.isAuthenticated()) return;
      if (typeof dom.resetProgressDialog?.showModal === "function") dom.resetProgressDialog.showModal();
    });
    dom.cancelResetProgress?.addEventListener("click", event => {
      event.preventDefault();
      dom.resetProgressDialog?.close("cancel");
    });
    dom.confirmResetProgress?.addEventListener("click", async event => {
      event.preventDefault();
      if (!window.FirebaseManager.isAuthenticated()) return;
      setAuthBusy(true);
      dom.confirmResetProgress.disabled = true;
      try {
        const result = await window.FirebaseManager.resetProgress();
        if (!result?.ok) throw new Error("Não foi possível apagar o progresso desta conta.");
        engine.replaceState(null, { simulateOffline: false });
        if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "false";
        updateAccountUI();
        activeOfficeTab = "contracts";
        activeEvolutionTab = "upgrades";
        leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
        leaderboardRequest = null;
        dom.resetProgressDialog?.close("confirm");
        showView("farmView", false);
        applySettings();
        render(true);
        await engine.save();
        setCloudSaveStatus("saved", { savedAt: new Date() });
      } catch (error) {
        setCloudSaveStatus("error", { error });
      } finally {
        dom.confirmResetProgress.disabled = false;
        setAuthBusy(false);
      }
    });

    window.addEventListener("firebase-save-status", event => {
      setCloudSaveStatus(event.detail?.status || "guest", event.detail || {});
    });

    window.FirebaseManager.subscribeAuth((user, error) => {
      authTransitionQueue = authTransitionQueue
        .catch(() => {})
        .then(() => applyAuthenticatedUser(user, error));
    });


    dom.ambientSetting.addEventListener("change", () => {
      engine.setSetting("ambient", dom.ambientSetting.checked);
      applySettings();
    });
    dom.uiScaleSetting.addEventListener("input", () => {
      engine.setSetting("uiScale", Number(dom.uiScaleSetting.value));
      applySettings();
    });
    dom.numberFormatSetting?.addEventListener("change", () => {
      engine.setSetting("numberFormat", dom.numberFormatSetting.value);
      applySettings();
      render(true);
    });

    dom.masterVolumeSetting?.addEventListener("input", () => {
      engine.setSetting("masterVolume", Number(dom.masterVolumeSetting.value));
      applySettings();
    });
    dom.effectVolumeSetting?.addEventListener("input", () => {
      engine.setSetting("effectVolume", Number(dom.effectVolumeSetting.value));
      applySettings();
    });
    dom.musicVolumeSetting?.addEventListener("input", () => {
      engine.setSetting("musicVolume", Number(dom.musicVolumeSetting.value));
      applySettings();
    });
    dom.musicTrackSetting?.addEventListener("change", () => {
      engine.setSetting("musicTrack", dom.musicTrackSetting.value);
      applySettings();
    });

    document.addEventListener("click", event => {
      const control = event.target.closest("button, a.brand");
      if (!control || control.disabled) return;
      if (control.matches("[data-action], .nav-tab, .office-tab, .evolution-tab, [data-go-view]")) return;
      soundEngine.play("click");
    }, true);

    const unlockMusic = () => soundEngine.resumeMusic();
    document.addEventListener("pointerdown", unlockMusic, { once: true, passive: true });
    document.addEventListener("keydown", unlockMusic, { once: true });

    window.addEventListener("scroll", syncScrollUI, { passive: true });
    dom.backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    syncScrollUI();

    window.addEventListener("pagehide", () => {
      if (window.FirebaseManager.isAuthenticated()) engine.save();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        engine.save();
        soundEngine.pauseMusic();
      } else {
        soundEngine.resumeMusic();
        const now = Date.now();
        const elapsed = Math.max(0, Math.min(GameEngine.MAX_OFFLINE_SECONDS, (now - Number(engine.state.lastUpdate || now)) / 1000));
        if (elapsed > 0.05) {
          engine.simulate(elapsed, true);
          engine.state.lastUpdate = now;
          render(true);
        }
      }
      lastFrame = performance.now();
    });
  }

  // Ciclo principal e inicialização.
  function gameLoop(now) {
    const dt = Math.max(0, Math.min(2, (now - lastFrame) / 1000));
    lastFrame = now;
    engine.tick(dt);
    updateLiveHeader(now);
    updateLiveFarmUI(now);
    render(false);

    if (now - lastSave >= 15000) {
      engine.save();
      lastSave = now;
    }
    requestAnimationFrame(gameLoop);
  }

  async function boot() {
    let initialUser = null;
    let initialState = null;
    let cloudLoadFailed = false;

    try {
      initialUser = await window.FirebaseManager.ready();
      currentAuthUid = initialUser?.uid || null;
      if (initialUser) initialState = await window.FirebaseManager.loadGame();
    } catch (error) {
      cloudLoadFailed = true;
      setCloudSaveStatus("error", { error });
    }

    engine = new GameEngine(handleEngineEvent, initialState);
    setupCategoryFilter();
    setupEvents();

    const hashView = location.hash.replace("#", "");
    if (hashView && dom.views.some(view => view.id === hashView)) activeView = hashView;
    showView(activeView, false);
    applySettings();
    updateAccountUI(initialUser);
    if (initialUser && initialState) setCloudSaveStatus("loaded");
    render(true);

    if (initialUser && !initialState && !cloudLoadFailed) {
      await engine.save();
    }

    lastSave = performance.now();
    requestAnimationFrame(gameLoop);
  }

  boot().catch(error => {
    console.error("Não foi possível iniciar o jogo:", error);
  });
})();
