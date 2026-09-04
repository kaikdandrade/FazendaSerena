"use strict";
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
    if (status === "local") {
      const time = formatCloudTime(detail.savedAt);
      dom.cloudSaveStatus.textContent = time
        ? `Progresso de visitante salvo neste navegador às ${time}.`
        : "Progresso de visitante salvo neste navegador.";
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

  function renderPlayerTitleControl() {
    if (!engine?.state) return;
    const titles = Array.isArray(engine.data?.playerTitles) ? engine.data.playerTitles : [];
    const unlocked = titles.filter(title => isPlayerTitleUnlocked(title));
    const equipped = getEquippedPlayerTitle();
    const preserveDraft = Boolean(dom.rankingProfileDialog?.open && dom.playerProfileForm?.dataset.dirty === "true");

    const accountSignedIn = Boolean(window.FirebaseManager?.getUser?.());
    if (dom.accountPlayerTitle) {
      dom.accountPlayerTitle.hidden = !accountSignedIn;
      dom.accountPlayerTitle.innerHTML = accountSignedIn ? playerTitleMarkup(equipped, { compact: true }) : "";
    }
    if (dom.accountTitleDot) {
      dom.accountTitleDot.hidden = !accountSignedIn;
      dom.accountTitleDot.dataset.titleRarity = PLAYER_TITLE_RARITY_LABELS[equipped?.rarity] ? equipped.rarity : "common";
    }
    if (dom.playerTitleUnlockCount) dom.playerTitleUnlockCount.textContent = `${unlocked.length} de ${titles.length} ${unlocked.length === 1 ? "desbloqueado" : "desbloqueados"}`;

    if (!dom.playerTitleSetting) return;
    let selected = preserveDraft ? getPlayerTitleEntry(dom.playerTitleSetting.value) : equipped;
    if (!isPlayerTitleUnlocked(selected)) selected = equipped;
    dom.playerTitleSetting.value = selected.id;

    if (dom.selectedPlayerTitlePreview) {
      const rarity = PLAYER_TITLE_RARITY_LABELS[selected?.rarity] ? selected.rarity : "common";
      dom.selectedPlayerTitlePreview.innerHTML = `<span class="social-title-dot" data-title-rarity="${rarity}" aria-hidden="true"></span>${playerTitleMarkup(selected, { showRarity: true })}`;
    }

    if (dom.playerTitlePickerGrid) {
      const signature = unlocked.map(title => `${title.id}:${title.name}:${title.rarity}`).join("|");
      if (dom.playerTitlePickerGrid.dataset.signature !== signature) {
        dom.playerTitlePickerGrid.innerHTML = unlocked.map(title => {
          const rarity = PLAYER_TITLE_RARITY_LABELS[title.rarity] ? title.rarity : "common";
          return `<button class="player-title-picker-option" data-player-title-id="${escapeHtml(title.id)}" data-title-rarity="${rarity}" role="radio" type="button"><span class="social-title-dot" data-title-rarity="${rarity}" aria-hidden="true"></span><span class="player-title-picker-option-copy">${playerTitleMarkup(title)}<small>${escapeHtml(playerTitleRarityLabel(rarity))}</small></span><span aria-hidden="true" class="player-title-picker-check">✓</span></button>`;
        }).join("");
        dom.playerTitlePickerGrid.dataset.signature = signature;
      }
      [...dom.playerTitlePickerGrid.querySelectorAll("[data-player-title-id]")].forEach(option => {
        const active = option.dataset.playerTitleId === selected.id;
        option.classList.toggle("selected", active);
        option.setAttribute("aria-checked", String(active));
      });
    }
    if (dom.togglePlayerTitlePicker) {
      dom.togglePlayerTitlePicker.disabled = unlocked.length === 0;
      dom.togglePlayerTitlePicker.textContent = unlocked.length > 1 ? "Selecionar título" : "Título disponível";
    }
  }

  function updateAccountUI(user = window.FirebaseManager.getUser()) {
    const signedIn = Boolean(user);
    const firebaseAvailable = window.FirebaseManager.isAvailable();
    const storedNickname = sanitizeNickname(engine?.state?.settings?.playerNickname);
    const storedAvatarId = getAvatarEntry(engine?.state?.settings?.playerAvatar)?.id || "";
    const profileComplete = signedIn && hasCompletePlayerProfile();
    const profileDirty = dom.playerProfileForm?.dataset.dirty === "true";

    if (dom.playerProfileForm) {
      dom.playerProfileForm.hidden = !signedIn;
      dom.playerProfileForm.setAttribute("aria-hidden", String(!signedIn));
    }

    if (dom.accountName) {
      dom.accountName.textContent = signedIn
        ? (storedNickname || user.displayName || user.email || "Jogador")
        : "Visitante";
    }

    renderPlayerTitleControl();

    if (dom.accountAvatar) {
      const gameAvatar = getAvatarEntry(storedAvatarId);
      const googlePhoto = signedIn && /^https:\/\//i.test(String(user.photoURL || "")) ? user.photoURL : "";
      dom.accountAvatar.src = gameAvatar?.src || googlePhoto || "assets/icons/perfil.webp";
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

    if (dom.rankingProfileLaunch) dom.rankingProfileLaunch.hidden = !signedIn;
    if (dom.openRankingProfileButton) {
      dom.openRankingProfileButton.disabled = !signedIn;
      dom.openRankingProfileButton.textContent = "Perfil do ranking";
    }
    if (!signedIn && dom.rankingProfileDialog?.open) dom.rankingProfileDialog.close("signed-out");

    if (!profileDirty) {
      const googleSuggestion = signedIn ? sanitizeNickname(user.displayName || "") : "";
      if (dom.playerNicknameSetting) dom.playerNicknameSetting.value = storedNickname || (googleSuggestion.length >= 4 ? googleSuggestion : "");
      if (dom.playerAvatarSetting) dom.playerAvatarSetting.value = storedAvatarId;
      setProfileFeedback("");
    }

    const selectedAvatarId = dom.playerAvatarSetting?.value || storedAvatarId;
    renderAvatarPicker(selectedAvatarId, !signedIn);
    if (dom.playerNicknameSetting) {
      dom.playerNicknameSetting.disabled = !signedIn;
      dom.playerNicknameSetting.placeholder = signedIn ? "Seu apelido no ranking" : "Entre com o Google para definir";
    }
    if (dom.playerAvatarSetting) dom.playerAvatarSetting.disabled = !signedIn;
    if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.disabled = !signedIn;
    if (dom.togglePlayerTitlePicker) dom.togglePlayerTitlePicker.disabled = !signedIn;
    if (dom.savePlayerProfile) dom.savePlayerProfile.disabled = !signedIn;
    if (!signedIn && dom.avatarPickerPanel) {
      dom.avatarPickerPanel.hidden = true;
      dom.toggleAvatarPicker?.setAttribute("aria-expanded", "false");
    }
    if (!signedIn && dom.playerTitlePickerPanel) {
      dom.playerTitlePickerPanel.hidden = true;
      dom.togglePlayerTitlePicker?.setAttribute("aria-expanded", "false");
    }

    if (!signedIn) setCloudSaveStatus("guest");
  }

  function setAuthBusy(busy) {
    const profileDisabled = busy || !window.FirebaseManager.isAuthenticated();
    if (dom.googleSignIn) dom.googleSignIn.disabled = busy || !window.FirebaseManager.isAvailable();
    if (dom.googleSignOut) dom.googleSignOut.disabled = busy;
    
    if (dom.openRankingProfileButton) dom.openRankingProfileButton.disabled = profileDisabled;
    if (dom.playerNicknameSetting) dom.playerNicknameSetting.disabled = profileDisabled;
    if (dom.playerAvatarSetting) dom.playerAvatarSetting.disabled = profileDisabled;
    if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.disabled = profileDisabled;
    if (dom.togglePlayerTitlePicker) dom.togglePlayerTitlePicker.disabled = profileDisabled;
    $$(".player-title-picker-option", dom.playerTitlePickerGrid || document).forEach(button => { button.disabled = profileDisabled; });
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
    if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "false";
    leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
    leaderboardRequest = null;
    currentAuthUid = nextUid;
    setAuthBusy(true);

    try {
      if (user) {
        window.FirebaseManager.lockCloudWrites?.();
        let cloudState = null;
        let loadFailed = false;
        try {
          cloudState = await window.FirebaseManager.loadGame();
        } catch (error) {
          loadFailed = true;
          setCloudSaveStatus("error", { error });
        }

        if (cloudState) {
          // Conta já existente: o save remoto continua soberano.
          engine.replaceState(cloudState, { simulateOffline: true });
          window.FirebaseManager.unlockCloudWrites?.();
        } else if (!loadFailed) {
          // Primeira entrada desta conta: todo o progresso feito como visitante
          // neste navegador é promovido para a nuvem. O localStorage só é limpo
          // depois da confirmação da gravação remota.
          const guestState = window.FirebaseManager.loadGuestGame?.()
            || (!previousUid ? cloneState(engine.state) : null);
          engine.replaceState(guestState || null, { simulateOffline: Boolean(guestState) });
          window.FirebaseManager.unlockCloudWrites?.();
          const migrated = await engine.save();
          if (migrated?.ok && guestState) window.FirebaseManager.clearGuestGame?.();
        }
        // A antiga opção de ocultação não existe mais. Ao autenticar, reconciliamos
        // a projeção do ranking: perfil configurado entra automaticamente; perfil
        // incompleto não publica nome/e-mail; Admin/bloqueio global continuam fora.
        if (!loadFailed) {
          try { await window.FirebaseManager.syncOwnLeaderboard?.(engine.state, { forceModeration: true }); }
          catch (error) { console.warn("Não foi possível reconciliar o ranking agora:", error); }
        }

        // Em falha de leitura, a trava permanece ativa para impedir que um save
        // local sobrescreva acidentalmente uma conta existente. Um novo login/reload
        // tentará ler a nuvem novamente.
        if (await window.FirebaseManager.isCurrentUserAdmin()) {
          await window.FirebaseManager.removeOwnLeaderboardEntry?.();
        }
      } else {
        window.FirebaseManager.unlockCloudWrites?.();
        engine.replaceState(window.FirebaseManager.loadGuestGame?.() || null, { simulateOffline: true });
        showView("farmView", false);
      }

      applySettings();
      render(true);
      const offlineReport = engine.consumeOfflineReport?.();
      if (offlineReport) window.setTimeout(() => showOfflineProgressDialog(offlineReport), 0);
      if (activeView === "profileView" && activeProfileTab === "social") refreshPrestigeLeaderboard(true);
      lastSave = performance.now();
    } finally {
      updateAccountUI(user);
      setAuthBusy(false);
    }
  }

  // Navegação, responsividade e configurações.
