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

    if (dom.accountPlayerTitle) dom.accountPlayerTitle.innerHTML = playerTitleMarkup(equipped, { compact: true });
    if (dom.accountTitleDot) dom.accountTitleDot.dataset.titleRarity = PLAYER_TITLE_RARITY_LABELS[equipped?.rarity] ? equipped.rarity : "common";
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

    if (dom.accountEmail) {
      dom.accountEmail.textContent = signedIn
        ? (user.email || "Conta Google conectada")
        : "Conta não conectada";
    }
    if (dom.accountDescription) {
      dom.accountDescription.textContent = signedIn
        ? "Seu progresso é privado e salvo automaticamente na nuvem."
        : "Seu progresso de visitante é salvo neste navegador e pode ser enviado para a nuvem ao entrar pela primeira vez.";
    }

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

  function stopFriendsRealtime() {
    if (typeof friendsRealtimeUnsubscribe === "function") {
      try { friendsRealtimeUnsubscribe(); } catch (_) {}
    }
    friendsRealtimeUnsubscribe = null;
  }

  function resetFriendsState() {
    stopFriendsRealtime();
    friendsState = { status: "idle", selfProfile: null, friends: [], incoming: [], outgoing: [], error: null, loadedAt: 0 };
    friendsRequest = null;
    if (dom.friendsTabCount) {
      dom.friendsTabCount.textContent = "0";
      dom.friendsTabCount.hidden = true;
    }
  }

  async function startFriendsRealtime() {
    stopFriendsRealtime();
    if (!window.FirebaseManager.isAuthenticated()) return;
    const uid = window.FirebaseManager.getUser()?.uid || "";
    try {
      const unsubscribe = await window.FirebaseManager.subscribeFriendships((result, error) => {
        if (uid !== (window.FirebaseManager.getUser()?.uid || "")) return;
        if (error) {
          friendsState = { ...friendsState, status: "error", error, loadedAt: Date.now() };
          renderFriends();
          return;
        }
        friendsState = { status: "ready", ...result, error: null, loadedAt: Date.now() };
        renderFriends();
      });
      if (uid !== (window.FirebaseManager.getUser()?.uid || "")) {
        try { unsubscribe?.(); } catch (_) {}
        return;
      }
      friendsRealtimeUnsubscribe = unsubscribe;
    } catch (error) {
      friendsState = { ...friendsState, status: "error", error, loadedAt: Date.now() };
      renderFriends();
    }
  }

  function getFriendProfilePresentation(profile) {
    const avatar = getAvatarEntry(profile?.avatarId);
    return {
      name: sanitizeNickname(profile?.displayName) || "Perfil indisponível",
      avatarSrc: avatar?.src || "assets/logo.webp",
      avatarAlt: avatar ? `Avatar de ${sanitizeNickname(profile?.displayName) || "jogador"}` : "",
      title: getPlayerTitleEntry(profile?.playerTitleId || "fazendeiro")
    };
  }

  function setFriendsFeedback(message = "", type = "", targetId = "friendsFeedback") {
    const feedback = $(`#${targetId}`, dom.friendCodeDialog || document) || $(`#${targetId}`, dom.friendsContent || document) || document.getElementById(targetId);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  function friendRelationshipCard(item, mode) {
    const profile = getFriendProfilePresentation(item?.profile);
    const relationshipId = escapeHtml(item?.id || "");
    let actions = "";
    let status = "Amigo da sua fazenda";

    if (mode === "incoming") {
      status = "Quer adicionar você";
      actions = `<button class="button primary compact-friend-button" data-action="accept-friend" data-friendship-id="${relationshipId}" type="button">Aceitar</button><button class="button secondary compact-friend-button" data-action="reject-friend" data-friendship-id="${relationshipId}" type="button">Recusar</button>`;
    } else if (mode === "outgoing") {
      status = "Solicitação enviada";
      actions = `<button class="button secondary compact-friend-button" data-action="cancel-friend-request" data-friendship-id="${relationshipId}" type="button">Cancelar</button>`;
    } else {
      actions = `<button class="button secondary compact-friend-button" data-action="remove-friend" data-friendship-id="${relationshipId}" type="button">Remover</button>`;
    }

    const titleRarity = ["common", "uncommon", "rare", "epic", "legendary"].includes(profile.title?.rarity) ? profile.title.rarity : "common";
    return `<article class="friend-card" data-friend-mode="${mode}">
      <img class="friend-avatar" src="${escapeHtml(profile.avatarSrc)}" alt="${escapeHtml(profile.avatarAlt)}" loading="lazy">
      <div class="friend-card-copy"><div class="friend-card-identity"><strong>${escapeHtml(profile.name)}</strong><span class="social-title-dot" data-title-rarity="${titleRarity}" aria-hidden="true"></span>${playerTitleMarkup(profile.title, { compact: true })}</div><small>${escapeHtml(status)}</small></div>
      <div class="friend-card-actions">${actions}</div>
    </article>`;
  }

  function friendsCollection(title, eyebrow, items, mode, emptyMessage) {
    const open = mode === "incoming" && items.length ? " open" : "";
    return `<details class="friends-list-section friends-list-${mode} friends-list-accordion"${open}>
      <summary class="friends-list-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h3>${escapeHtml(title)}</h3></div><span>${items.length}</span></summary>
      <div class="friends-list">${items.length ? items.map(item => friendRelationshipCard(item, mode)).join("") : `<div class="friends-empty-state">${escapeHtml(emptyMessage)}</div>`}</div>
    </details>`;
  }

  function renderFriends() {
    if (!dom.friendsContent) return;
    const user = window.FirebaseManager.getUser();
    const incomingCount = friendsState.incoming?.length || 0;
    document.querySelectorAll("[data-friends-count]").forEach(badge => {
      badge.textContent = String(incomingCount);
      badge.hidden = incomingCount < 1;
    });

    // onSnapshot pode atualizar a lista enquanto o jogador está com uma opção
    // aberta ou digitando um código. Preserve esse estado para que o tempo real
    // não feche a sanfona nem apague o texto do formulário.
    const openFriendOptions = new Set(
      [...dom.friendsContent.querySelectorAll("details.friends-beta-option[open][data-friend-option]")]
        .map(option => option.dataset.friendOption)
        .filter(Boolean)
    );
    const pendingFriendCode = String($("#friendCodeInput", dom.friendsContent)?.value || "");
    const restoreFriendInteractionState = () => {
      openFriendOptions.forEach(key => {
        const option = dom.friendsContent.querySelector(`.friends-beta-option[data-friend-option="${key}"]`);
        if (option) option.open = true;
      });
      const input = $("#friendCodeInput", dom.friendsContent);
      if (input && pendingFriendCode && !input.value) input.value = pendingFriendCode;
    };

    if (!user) {
      dom.friendsContent.innerHTML = `<article class="friends-access-card panel-card"><img src="assets/icons/logo-google.webp" alt=""><div><h3>Amigos (beta)</h3><p>Entre com o Google para conectar sua fazenda a outros jogadores.</p></div><button class="button primary" data-action="friends-sign-in" type="button">Entrar com o Google</button></article>`;
      return;
    }
    if (friendsState.status === "loading" || friendsState.status === "idle") {
      dom.friendsContent.innerHTML = `<div class="friends-loading"><span aria-hidden="true"></span><strong>Carregando amigos...</strong></div>`;
      return;
    }
    if (friendsState.status === "error") {
      dom.friendsContent.innerHTML = `<article class="friends-access-card panel-card"><img src="assets/icons/social.webp" alt=""><div><h3>Amigos (beta)</h3><p>${escapeHtml(window.FirebaseManager.getFriendlyError(friendsState.error))}</p></div><button class="button secondary" data-action="refresh-friends" type="button">Tentar novamente</button></article>`;
      return;
    }
    if (!friendsState.selfProfile) {
      dom.friendsContent.innerHTML = `<article class="friends-access-card panel-card"><img src="assets/icons/social.webp" alt=""><div><h3>Configure seu perfil</h3><p>Escolha apelido e avatar antes de usar amizades.</p></div><button class="button primary" data-action="open-account-profile" type="button">Abrir Minha Conta</button></article>`;
      return;
    }

    const code = escapeHtml(friendsState.selfProfile.friendCode || user.uid);
    const friendCount = friendsState.friends?.length || 0;
    const outgoingCount = friendsState.outgoing?.length || 0;
    dom.friendsContent.innerHTML = `<section class="friends-beta-card friends-hub-card">
      <header class="friends-beta-header friends-hub-header"><div class="friends-beta-title"><div><small>conexões da fazenda</small><h3>Amigos <span>beta</span></h3></div></div><div class="friends-hub-counters"><span><b>${friendCount}</b> ${friendCount === 1 ? "amigo" : "amigos"}</span>${incomingCount ? `<span class="has-pending"><b>${incomingCount}</b> pendente${incomingCount === 1 ? "" : "s"}</span>` : ""}</div></header>
      <div class="friends-beta-options friends-hub-actions friends-hub-actions-restored">
        <button class="friends-beta-option friends-list-launch friends-hub-launch" data-action="open-friends-list" type="button"><span><img src="assets/icons/perfil.webp" alt=""><span><strong>Amigos e solicitações</strong><small>Veja conexões, pedidos recebidos e enviados</small></span></span><b>${friendCount + incomingCount + outgoingCount}</b></button>
        <button class="friends-beta-option friends-list-launch friends-hub-launch friends-add-launch" data-action="open-friend-code-dialog" type="button"><span><img src="assets/icons/social.webp" alt=""><span><strong>Adicionar amigo</strong><small>Compartilhe seu código ou conecte outra fazenda</small></span></span><b>+</b></button>
      </div>
    </section>`;
    if (dom.friendsListDialog?.open) openFriendsListDialog();
  }

  function openFriendsListDialog() {
    if (!dom.friendsListDialog || !dom.friendsListDialogBody) return;
    const incoming = friendsCollection(
      "Solicitações recebidas",
      "pedidos pendentes",
      friendsState.incoming || [],
      "incoming",
      "Nenhuma solicitação recebida."
    );
    const accepted = friendsCollection(
      "Amigos",
      "fazendas conectadas",
      friendsState.friends || [],
      "accepted",
      "Sua lista de amigos ainda está vazia."
    );
    const outgoing = friendsCollection(
      "Solicitações enviadas",
      "aguardando resposta",
      friendsState.outgoing || [],
      "outgoing",
      "Nenhuma solicitação enviada."
    );
    dom.friendsListDialogBody.innerHTML = `<div class="friends-dialog-sections">${incoming}${accepted}${outgoing}</div>`;
    if (typeof dom.friendsListDialog.showModal === "function" && !dom.friendsListDialog.open) dom.friendsListDialog.showModal();
  }

  function openFriendCodeDialog() {
    if (!dom.friendCodeDialog || !dom.friendCodeDialogBody) return;
    const user = window.FirebaseManager.getUser();
    const code = escapeHtml(friendsState.selfProfile?.friendCode || user?.uid || "");
    dom.friendCodeDialogBody.innerHTML = `<section class="friend-code-share"><small>Seu código de amizade</small><div><code id="currentFriendCode">${code}</code><button class="button secondary compact-friend-button" data-action="copy-friend-code" type="button">Copiar</button></div></section><div class="friend-code-divider"><span>ou</span></div><form class="friend-request-form friend-request-form-dialog" id="friendRequestForm"><label for="friendCodeInput">Código de outro jogador</label><div><input autocomplete="off" id="friendCodeInput" maxlength="128" placeholder="Cole o código de amizade" required type="text"><button class="button primary" type="submit">Enviar pedido</button></div></form><div aria-live="polite" class="friends-feedback" id="friendsFeedback"></div>`;
    if (typeof dom.friendCodeDialog.showModal === "function" && !dom.friendCodeDialog.open) dom.friendCodeDialog.showModal();
  }

  function requestFriendRemoval(friendshipId) {
    const item = (friendsState.friends || []).find(entry => entry.id === friendshipId);
    if (!item || !dom.removeFriendDialog) return;
    pendingFriendRemovalId = friendshipId;
    const profile = getFriendProfilePresentation(item.profile);
    if (dom.removeFriendName) dom.removeFriendName.textContent = profile.name;
    if (typeof dom.removeFriendDialog.showModal === "function" && !dom.removeFriendDialog.open) dom.removeFriendDialog.showModal();
  }

  async function confirmFriendRemoval() {
    const id = pendingFriendRemovalId;
    pendingFriendRemovalId = "";
    if (dom.removeFriendDialog?.open) dom.removeFriendDialog.close("confirm");
    if (!id) return;
    await handleFriendRelationshipAction("remove-friend", id);
    await refreshFriends(true);
    if (dom.friendsListDialog?.open) openFriendsListDialog();
  }

  async function refreshFriends(force = false) {
    if (!window.FirebaseManager.isAuthenticated()) {
      resetFriendsState();
      renderFriends();
      return null;
    }
    const fresh = friendsState.status === "ready" && Date.now() - friendsState.loadedAt < 30000;
    // Não recrie o formulário enquanto o usuário digita. O loop principal
    // consulta refreshFriends(false) quando o Social está aberto; se o estado
    // ainda estiver fresco, o DOM atual já representa exatamente esse estado.
    if (!force && fresh) return friendsState;
    if (friendsRequest) return friendsRequest;

    friendsState = { ...friendsState, status: "loading", error: null };
    renderFriends();
    friendsRequest = window.FirebaseManager.loadFriendships()
      .then(result => {
        friendsState = { status: "ready", ...result, error: null, loadedAt: Date.now() };
        renderFriends();
        return friendsState;
      })
      .catch(error => {
        friendsState = { ...friendsState, status: "error", error, loadedAt: Date.now() };
        renderFriends();
        return friendsState;
      })
      .finally(() => { friendsRequest = null; });
    return friendsRequest;
  }

  async function handleFriendRelationshipAction(action, friendshipId) {
    if (!friendshipId) return;
    setFriendsFeedback("Atualizando amizade...", "pending");
    try {
      if (action === "accept-friend") await window.FirebaseManager.acceptFriendRequest(friendshipId);
      else await window.FirebaseManager.deleteFriendship(friendshipId);
      if (!friendsRealtimeUnsubscribe) await refreshFriends(true);
    } catch (error) {
      setFriendsFeedback(window.FirebaseManager.getFriendlyError(error), "error");
    }
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
    resetFriendsState();
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
      if (user) { await refreshFriends(true); await startFriendsRealtime(); }
      lastSave = performance.now();
    } finally {
      updateAccountUI(user);
      setAuthBusy(false);
    }
  }

  // Navegação, responsividade e configurações.
