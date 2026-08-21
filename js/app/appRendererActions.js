"use strict";
  function render(force = false) {
    const now = performance.now();

    // Revisão 39: render() é estrutural. O loop principal nunca deve remontar
    // grids/cards inteiros. Sem force, apenas os campos vivos são atualizados.
    if (!force) {
      updateLiveGameUI?.(now);
      return;
    }

    lastRender = now;
    renderHeader();

    if (activeView === "farmView") {
      renderCrops();
    } else if (activeView === "stockView") {
      renderStock();
    } else if (activeView === "officeView") {
      if (activeOfficeTab === "contracts") renderContracts();
      if (activeOfficeTab === "orders") renderOrders();
      if (activeOfficeTab === "evolutions") {
        renderResearch();
        renderPrestigeUpgrades();
        updateEvolutionAffordability("research");
        updateEvolutionAffordability("prestige");
      }
      showOfficeTab(activeOfficeTab, false);
    } else if (activeView === "profileView") {
      if (activeProfileTab === "account") {
        renderStats();
        renderPrestigeDashboard();
        renderPlayerTitleControl();
      }
      if (activeProfileTab === "social") {
        if (friendsState.status === "idle") refreshFriends(false);
        refreshPrestigeLeaderboard(false);
      }
      if (activeProfileTab === "missions") renderMissions();
      showProfileTab(activeProfileTab, false);
    }

    // Após um render estrutural, sincroniza somente valores/estados que podem
    // ter mudado durante a própria montagem, sem recriar nenhum filho.
    updateLiveHeader(now, true);
    updateLiveFarmUI(now);
    updateLiveGameUI?.(now, true);
  }

  function act(result) {
    if (!result?.ok) {
      if (result?.message) console.warn(result.message);
      return false;
    }
    render(true);
    requestGameSave();
    return true;
  }

  function getVisibleResourceCounter(type) {
    const counters = {
      coins: [dom.floatingCoinsCounter, dom.coinsCounter],
      research: [dom.floatingResearchCounter, dom.researchCounter],
      prestige: [dom.floatingPrestigeCounter, dom.prestigeCounter],
      xp: [dom.farmXPText, dom.farmProgress]
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
      ["prestige", reward.prestige],
      ["xp", reward.xp]
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
          .catch(() => {})
          .finally(() => particle.remove());
      }
    });
  }

  function getActionSound(action) {
    if (["upgrade-crop-selected", "buy-research", "buy-prestige-upgrade"].includes(action)) return "upgrade";
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

    if (action === "refresh-friends") {
      refreshFriends(true).then(() => startFriendsRealtime()).catch(() => {});
      return;
    }
    if (action === "friends-sign-in") {
      dom.googleSignIn?.click();
      return;
    }
    if (action === "open-account-profile") {
      showProfileTab("account");
      render(true);
      return;
    }
    if (action === "open-friends-list") {
      openFriendsListDialog();
      return;
    }
    if (action === "open-friend-code-dialog") {
      openFriendCodeDialog();
      return;
    }
    if (action === "close-friend-code-dialog") {
      if (dom.friendCodeDialog?.open) dom.friendCodeDialog.close("cancel");
      return;
    }
    if (action === "confirm-remove-friend") {
      confirmFriendRemoval().catch(error => setFriendsFeedback(window.FirebaseManager.getFriendlyError(error), "error"));
      return;
    }
    if (action === "remove-friend") {
      requestFriendRemoval(button.dataset.friendshipId);
      return;
    }
    if (action === "copy-friend-code") {
      const code = friendsState.selfProfile?.friendCode || window.FirebaseManager.getUser()?.uid || "";
      const codeElement = document.getElementById("currentFriendCode");
      const showCopied = () => {
        if (!codeElement) return;
        codeElement.textContent = "Código copiado.";
        codeElement.classList.add("is-copy-feedback");
        window.clearTimeout(codeElement._restoreTimer);
        codeElement._restoreTimer = window.setTimeout(() => {
          if (!codeElement.isConnected) return;
          codeElement.textContent = code;
          codeElement.classList.remove("is-copy-feedback");
        }, 2200);
      };
      if (code) {
        const copyOperation = navigator.clipboard?.writeText?.(code);
        if (copyOperation) copyOperation.then(showCopied).catch(() => codeElement?.select?.());
        else { try { navigator.clipboard?.writeText?.(code); } catch (_) {} showCopied(); }
      }
      return;
    }
    if (["accept-friend", "reject-friend", "cancel-friend-request"].includes(action)) {
      handleFriendRelationshipAction(action, button.dataset.friendshipId);
      return;
    }

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
      requestGameSave();
    }
    if (action === "toggle-auto-sell") act(engine.toggleAutoSell(cropId));
    if (action === "toggle-stock-favorite") act(engine.toggleStockFavorite(cropId));
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
      requestGameSave();
    }
    if (action === "expand-storage") act(engine.expandStorage());
    if (action === "buy-research") act(engine.buyResearch(id));
    if (action === "buy-prestige-upgrade") act(engine.buyPrestigeUpgrade(id));
    if (action === "accept-contract") {
      const offer = engine.state.contractOffers.find(contract => contract.id === id);
      const canSignNow = Boolean(offer && Number(offer.timeRemaining) > 0 && engine.state.activeContracts.length < engine.getActiveContractSlotLimit());
      if (canSignNow) soundEngine.playImmediate("contractSignature");
      const result = engine.acceptContract(id);
      act(result);
    }
    if (action === "decline-contract") {
      const offer = engine.state.contractOffers.find(contract => contract.id === id);
      if (offer) soundEngine.playImmediate("contractRefusal");
      const result = engine.declineContract(id);
      act(result);
    }
    if (action === "break-contract") {
      const contract = engine.state.activeContracts.find(item => item.id === id);
      if (!contract) return;
      const penalty = engine.calculateContractPenalty(contract);
      pendingContractBreakId = id;
      if (dom.contractBreakAmount) dom.contractBreakAmount.innerHTML = resourceAmount("coins", -penalty);
      const missing = Math.max(0, Math.floor(Number(contract.amount || 0) - Number(contract.delivered || 0)));
      if (dom.contractBreakMissing) dom.contractBreakMissing.textContent = engine.formatNumber(missing);
      if (typeof dom.contractBreakDialog?.showModal === "function") dom.contractBreakDialog.showModal();
      else if (window.confirm(`Quebrar contrato e pagar ${engine.formatNumber(penalty)} moedas?`)) {
        pendingContractBreakId = "";
        soundEngine.playImmediate("contractRefusal");
        const result = engine.breakContract(id);
        act(result);
      }
    }
    if (action === "refresh-leaderboard") refreshPrestigeLeaderboard(true);
    if (action === "claim-contract") {
      const result = engine.claimContractReward(id);
      if (!result.ok) return act(result);
      animateResourceReward(button, { coins: result.contract.rewardCoins, research: result.contract.rewardResearch, prestige: result.contract.rewardPrestige, xp: result.xpAward });
      render(true);
      requestGameSave();
    }
    if (action === "pay-contract-penalty") act(engine.payContractPenalty(id));
    if (action === "deliver-order") {
      const result = engine.deliverOrder(cropId);
      if (!result.ok) return act(result);
      animateResourceReward(button, result.rewards || {});
      render(true);
      requestGameSave();
    }
    if (action === "toggle-contract-dock") {
      contractDockCollapsed = !contractDockCollapsed;
      renderContractDock();
    }
    if (action === "claim-mission") {
      const result = engine.claimMission(id);
      if (!result.ok) return act(result);
      animateResourceReward(button, result.mission.reward || {});
      if (result.titleUnlock?.newlyUnlocked) showPlayerTitleUnlock(result.titleUnlock.title);
      render(true);
      requestGameSave();
    }
    if (action === "perform-prestige") {
      const gain = engine.getPrestigeEstimate();
      if (!engine.isPrestigeUnlocked() || gain < 1) return;
      if (dom.prestigeConfirmText) {
        dom.prestigeConfirmText.textContent = `Prestigiar agora reiniciará moedas, pesquisa, nível, culturas, estoque, tecnologias, contratos e pedidos desta jornada. Você receberá ${engine.formatNumber(gain)} ponto${gain === 1 ? "" : "s"} de prestígio permanente${gain === 1 ? "" : "s"}.`;
      }
      if (typeof dom.prestigeConfirmDialog?.showModal === "function" && !dom.prestigeConfirmDialog.open) {
        dom.prestigeConfirmDialog.showModal();
      }
    }
  }

