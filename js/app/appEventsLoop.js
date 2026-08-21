"use strict";
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
    dom.profileTabs.forEach(tab => tab.addEventListener("click", () => {
      if (tab.disabled) return;
      soundEngine.playNavigation();
      showProfileTab(tab.dataset.profileTab);
      window.requestAnimationFrame(() => revealTabHorizontally(tab.closest(".context-nav-column"), tab));
      render(true);
    }));
    $$('[data-go-view]').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      soundEngine.playNavigation();
      showView(link.dataset.goView);
    }));

    document.addEventListener("click", event => {
      const resourceShortcut = event.target.closest("[data-resource-shortcut]");
      if (resourceShortcut) {
        soundEngine.playNavigation();
        navigateFromResourceCounter(resourceShortcut.dataset.resourceShortcut);
        return;
      }
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

    document.addEventListener("keydown", event => {
      const shortcut = event.target.closest?.("[data-resource-shortcut]");
      if (!shortcut || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      soundEngine.playNavigation();
      navigateFromResourceCounter(shortcut.dataset.resourceShortcut);
    });

    dom.openSocialEvents?.addEventListener("click", () => {
      renderLiveSocialContent();
      const runtime = window.FazendaSerenaRuntimeConfig || {};
      const now = Date.now();
      const hasEvents = (runtime.events || []).some(event => Number(event.startAt) + Math.max(1, Number(event.durationMinutes) || 0) * 60000 > now);
      if (hasEvents && typeof dom.socialEventsDialog?.showModal === "function" && !dom.socialEventsDialog.open) dom.socialEventsDialog.showModal();
    });

    document.addEventListener("submit", async event => {
      const form = event.target.closest?.("#friendRequestForm");
      if (!form) return;
      event.preventDefault();
      const input = $("#friendCodeInput", form);
      const submit = form.querySelector('button[type="submit"]');
      const friendCode = String(input?.value || "").trim();
      if (!friendCode) return;
      if (submit) submit.disabled = true;
      setFriendsFeedback("Enviando solicitação...", "pending");
      try {
        await window.FirebaseManager.sendFriendRequest(friendCode);
        if (input) input.value = "";
        await refreshFriends(true);
        setFriendsFeedback("Solicitação enviada.", "success");
      } catch (error) {
        setFriendsFeedback(window.FirebaseManager.getFriendlyError(error), "error");
      } finally {
        if (submit) submit.disabled = false;
      }
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


    dom.openRankingProfileButton?.addEventListener("click", () => {
      if (!window.FirebaseManager.isAuthenticated()) return;
      updateAccountUI();
      if (typeof dom.rankingProfileDialog?.showModal === "function" && !dom.rankingProfileDialog.open) {
        dom.rankingProfileDialog.showModal();
      }
    });

    dom.cancelRankingProfile?.addEventListener("click", () => {
      if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "false";
      updateAccountUI();
      dom.rankingProfileDialog?.close("cancel");
    });

    dom.rankingProfileDialog?.addEventListener("click", event => {
      if (event.target === dom.rankingProfileDialog) dom.rankingProfileDialog.close("cancel");
    });

    dom.rankingProfileDialog?.addEventListener("close", () => {
      if (dom.rankingProfileDialog.returnValue === "saved") return;
      if (dom.playerProfileForm) dom.playerProfileForm.dataset.dirty = "false";
      updateAccountUI();
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
      if (dom.avatarPickerPanel) dom.avatarPickerPanel.hidden = true;
      if (dom.toggleAvatarPicker) {
        dom.toggleAvatarPicker.setAttribute("aria-expanded", "false");
        dom.toggleAvatarPicker.focus({ preventScroll: true });
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
        if (dom.avatarPickerPanel) dom.avatarPickerPanel.hidden = false;
        if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.setAttribute("aria-expanded", "true");
        dom.playerAvatarPicker?.focus?.({ preventScroll: true });
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
        dom.rankingProfileDialog?.close("saved");
        resetFriendsState();
        if (activeView === "profileView" && activeProfileTab === "social") await refreshPrestigeLeaderboard(true);
        if (activeView === "profileView" && activeProfileTab === "social") await refreshFriends(true);
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
        activeProfileTab = "account";
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
    dom.offlineProgressDialog?.addEventListener("close", () => {
      const milestones = pendingOfflineMilestones.slice();
      pendingOfflineMilestones = [];
      if (milestones.length) window.setTimeout(() => showMilestoneDialog({ milestones }), 80);
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
        activeProfileTab = "account";
        leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
        leaderboardRequest = null;
        resetFriendsState();
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
    dom.fontScaleSetting.addEventListener("input", () => {
      engine.setSetting("fontScale", Number(dom.fontScaleSetting.value));
      applySettings();
    });
    dom.numberFormatSetting?.addEventListener("change", () => {
      engine.setSetting("numberFormat", dom.numberFormatSetting.value);
      applySettings();
      render(true);
    });

    dom.navigationModeSetting?.addEventListener("change", () => {
      const mode = dom.navigationModeSetting.value === "sidebar" ? "sidebar" : "tabs";
      engine.setSetting("navigationMode", mode);
      applySettings(true);
      window.scrollTo({ top: 0, behavior: "auto" });
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
      if (control.matches("[data-action], .nav-tab, .office-tab, [data-go-view], .resource-shortcut")) return;
      soundEngine.play("click");
    }, true);

    const unlockAudio = () => {
      soundEngine.unlockAudio();
      soundEngine.resumeMusic();
    };
    document.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
    document.addEventListener("keydown", unlockAudio, { once: true });

    window.addEventListener("scroll", () => {
      navigationScrollActiveUntil = performance.now() + 180;
      syncScrollUI();
    }, { passive: true });
    window.addEventListener("resize", syncScrollUI, { passive: true });
    dom.backToTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    syncScrollUI();

    window.addEventListener("pagehide", () => {
      if (window.FirebaseManager.isAuthenticated()) engine.save();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        engine.save();
      } else {
        soundEngine.resumeMusic();
        const now = Date.now();
        const elapsed = Math.max(0, Math.min(GameEngine.MAX_OFFLINE_SECONDS, (now - Number(engine.state.lastUpdate || now)) / 1000));
        if (elapsed > 0.05) {
          engine.simulate(elapsed, true);
          engine.state.lastUpdate = now;
          render(true);
          const offlineReport = engine.consumeOfflineReport?.();
          if (offlineReport) window.setTimeout(() => showOfflineProgressDialog(offlineReport), 0);
        }
      }
      lastFrame = performance.now();
      if (!document.hidden) scheduleGameLoop(0);
    });
  }

  // Ciclo principal e inicialização.
  function scheduleGameLoop(delay = getPerformanceProfile().loopInterval) {
    window.clearTimeout(gameLoopTimer);
    gameLoopTimer = window.setTimeout(() => requestAnimationFrame(gameLoop), Math.max(0, delay));
  }

  function gameLoop(now) {
    const startedAt = performance.now();
    const dt = Math.max(0, Math.min(2, (now - lastFrame) / 1000));
    lastFrame = now;

    if (!document.hidden) {
      engine.tick(dt);
      updateLiveHeader(now);
      updateLiveFarmUI(now);
      render(false);

      if (now - lastSave >= 15000) {
        engine.save();
        lastSave = now;
      }
    }

    const workTime = performance.now() - startedAt;
    scheduleGameLoop(document.hidden ? 1000 : getPerformanceProfile().loopInterval - workTime);
  }

