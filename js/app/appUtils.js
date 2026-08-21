"use strict";
  function reconcileLiveCards(container, html) {
    if (!container) return;
    const template = document.createElement("template");
    template.innerHTML = String(html || "").trim();
    const incoming = [...template.content.children];
    const existing = new Map([...container.children].map((node, index) => [node.dataset.liveRenderKey || `index:${index}`, node]));
    const keep = new Set();

    incoming.forEach((freshNode, index) => {
      const key = freshNode.dataset.liveRenderKey || `index:${index}`;
      const current = existing.get(key);
      const sameSignature = current
        && (current.dataset.liveRenderSignature || "") === (freshNode.dataset.liveRenderSignature || "");
      let node = sameSignature ? current : freshNode;

      if (current && !sameSignature && current.isConnected) {
        current.replaceWith(freshNode);
        node = freshNode;
      }

      // Só move/insere quando a posição realmente mudou. Ao contrário de
      // replaceChildren(), os nós reaproveitados permanecem conectados ao DOM,
      // preservando imagens carregadas, foco, scroll interno e animações.
      const atIndex = container.children[index];
      if (atIndex !== node) container.insertBefore(node, atIndex || null);
      keep.add(node);
    });

    [...container.children].forEach(node => {
      if (!keep.has(node)) node.remove();
    });
  }
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

  function getAvatarSource(avatarId, fallback = "assets/logo.webp") {
    return getAvatarEntry(avatarId)?.src || fallback;
  }

  function hasCompletePlayerProfile(state = engine?.state) {
    const nickname = sanitizeNickname(state?.settings?.playerNickname);
    const avatar = getAvatarEntry(state?.settings?.playerAvatar);
    return nickname.length >= 4 && nickname.length <= 24 && Boolean(avatar);
  }

  const PLAYER_TITLE_RARITY_LABELS = Object.freeze({ common: "Comum", uncommon: "Incomum", rare: "Raro", epic: "Épico", legendary: "Lendário" });

  function getPlayerTitleEntry(titleId) {
    const safeId = String(titleId || "fazendeiro").replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "fazendeiro";
    const titles = engine?.data?.playerTitles || window.GameData?.playerTitles || [];
    return titles.find(title => title.id === safeId) || titles.find(title => title.id === "fazendeiro") || { id: "fazendeiro", name: "Fazendeiro", rarity: "common", default: true };
  }

  function playerTitleRarityLabel(rarity) {
    return PLAYER_TITLE_RARITY_LABELS[rarity] || PLAYER_TITLE_RARITY_LABELS.common;
  }

  function isPlayerTitleUnlocked(title, state = engine?.state) {
    const entry = typeof title === "string" ? getPlayerTitleEntry(title) : title;
    return Boolean(entry && (entry.default === true || entry.id === "fazendeiro" || state?.unlockedPlayerTitles?.[entry.id] === true));
  }

  function getEquippedPlayerTitle(state = engine?.state) {
    const entry = getPlayerTitleEntry(state?.settings?.playerTitle || "fazendeiro");
    return isPlayerTitleUnlocked(entry, state) ? entry : getPlayerTitleEntry("fazendeiro");
  }

  function playerTitleMarkup(titleOrId, { showRarity = false, compact = false } = {}) {
    const title = typeof titleOrId === "object" && titleOrId ? titleOrId : getPlayerTitleEntry(titleOrId);
    const rarity = PLAYER_TITLE_RARITY_LABELS[title?.rarity] ? title.rarity : "common";
    const rarityMarkup = showRarity ? `<small>${escapeHtml(playerTitleRarityLabel(rarity))}</small>` : "";
    return `<span class="player-title player-title-${rarity}${compact ? " player-title-compact" : ""}" data-player-title-rarity="${rarity}"><span class="player-title-name">${escapeHtml(title?.name || "Fazendeiro")}</span>${rarityMarkup}</span>`;
  }

  function showPlayerTitleUnlock(title) {
    if (!title) return;
    document.querySelector(".player-title-unlock-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "player-title-unlock-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `<div class="player-title-unlock-icon">✦</div><div><small>Novo título desbloqueado</small>${playerTitleMarkup(title, { showRarity: true })}</div>`;
    document.body.appendChild(toast);
    window.requestAnimationFrame(() => toast.classList.add("visible"));
    window.setTimeout(() => { toast.classList.remove("visible"); window.setTimeout(() => toast.remove(), 260); }, 4300);
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
      dom.selectedAvatarImage.src = selectedAvatar?.src || "assets/icons/perfil.webp";
      dom.selectedAvatarImage.alt = selectedAvatar ? `Avatar selecionado: ${selectedAvatar.label}` : "Nenhum avatar selecionado";
    }
    if (dom.selectedAvatarName) dom.selectedAvatarName.textContent = selectedAvatar?.label || "Nenhum avatar escolhido";
    if (dom.toggleAvatarPicker) dom.toggleAvatarPicker.textContent = "Selecionar avatar";
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
    coins: "assets/icons/moeda.webp",
    research: "assets/icons/pocao-pesquisa.webp",
    prestige: "assets/icons/prestigio.webp",
    xp: "assets/icons/xp.webp"
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
    if (reward?.xp) parts.push(resourceAmount("xp", reward.xp, { title: "Experiência da fazenda" }));
    return parts.join("");
  }

  function runtimeText(key, fallback = "") {
    const value = window.FazendaSerenaRuntimeConfig?.texts?.[key];
    return typeof value === "string" && value.trim() ? value : fallback;
  }

  function runtimeTextHtml(key, fallback = "") {
    const value = runtimeText(key, fallback);
    return window.GameAdminConfig?.renderText
      ? window.GameAdminConfig.renderText(value, number => engine?.formatNumber ? engine.formatNumber(number) : number)
      : escapeHtml(value);
  }


  function companyIconMarkup(company) {
    const icon = String(company?.icon || "");
    if (/^(?:data:image\/|.*\.(?:png|webp|svg)$)/i.test(icon)) {
      return `<img src="${escapeHtml(icon)}" alt="">`;
    }
    return escapeHtml(icon);
  }

  function enrichResourceText(message) {
    let html = window.GameAdminConfig?.renderText
      ? window.GameAdminConfig.renderText(message, value => engine?.formatNumber ? engine.formatNumber(value) : value)
      : escapeHtml(message);
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
    replace("xp", "(?:pontos? de )?xp|experiência");
    return html;
  }



  function formatOfflineDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes}min ${secs}s`;
    return `${secs}s`;
  }

  function showOfflineProgressDialog(report) {
    if (!report || !dom.offlineProgressDialog) return false;
    const seconds = Math.max(0, Number(report.simulatedSeconds ?? report.seconds) || 0);
    const gains = {
      coins: Math.max(0, Number(report.coins) || 0),
      research: Math.max(0, Number(report.research) || 0),
      xp: Math.max(0, Number(report.xp) || 0),
      levels: Math.max(0, Math.floor(Number(report.levels) || 0)),
      contracts: Math.max(0, Math.floor(Number(report.contractsCompleted) || 0))
    };
    const hasAnything = gains.coins > 0 || gains.research > 0 || gains.xp > 0 || gains.levels > 0 || gains.contracts > 0;
    const milestones = Array.isArray(report.milestones) ? report.milestones.slice() : [];
    // O progresso offline sempre é creditado pelo motor. O resumo visual só é
    // exibido somente quando a ausência ultrapassa um minuto completo.
    if (seconds <= 60 || !hasAnything) {
      if (gains.levels > 0) soundEngine.playConcurrent("levelUp");
      if (milestones.length) window.setTimeout(() => showMilestoneDialog({ milestones }), 80);
      return false;
    }

    pendingOfflineMilestones = milestones;
    if (dom.offlineProgressTime) dom.offlineProgressTime.textContent = formatOfflineDuration(seconds);
    if (dom.offlineProgressSummary) {
      const offlineCard = (icon, label, value, detail = "") => `<article class="offline-gain-card"><img src="${icon}" alt=""><div><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ""}</div></article>`;
      const cards = [];
      if (gains.coins > 0) cards.push(offlineCard("assets/icons/moeda.webp", "Moedas", engine.formatNumber(gains.coins)));
      if (gains.research > 0) cards.push(offlineCard("assets/icons/pocao-pesquisa.webp", "Pesquisa", engine.formatNumber(gains.research)));
      if (gains.xp > 0) cards.push(offlineCard("assets/icons/xp.webp", "XP", engine.formatNumber(Math.round(gains.xp))));
      if (gains.levels > 0) cards.push(offlineCard("assets/icons/marco-nivel.webp", "Níveis", `+${engine.formatNumber(gains.levels)}`, `${engine.formatNumber(Math.max(1, Number(report.levelBefore) || 1))} → ${engine.formatNumber(Math.max(1, Number(report.levelAfter) || 1))}`));
      if (gains.contracts > 0) cards.push(offlineCard("assets/icons/contrato-comercial.webp", "Contratos", engine.formatNumber(gains.contracts)));
      dom.offlineProgressSummary.innerHTML = cards.join("");
    }
    if (gains.levels > 0) soundEngine.playConcurrent("levelUp");
    if (typeof dom.offlineProgressDialog.showModal === "function" && !dom.offlineProgressDialog.open) {
      dom.offlineProgressDialog.showModal();
      window.requestAnimationFrame(() => {
        if (dom.offlineProgressSummary) dom.offlineProgressSummary.scrollTop = 0;
      });
    }
    return true;
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
      dom.milestoneDialogList.innerHTML = unique.flatMap(milestone => (milestone.unlocks || []).map(item => {
        const detail = typeof item === "string" ? { text: item, icon: "" } : (item || {});
        const icon = detail.icon || "assets/icons/marco-nivel.webp";
        return `<article class="milestone-preview-card"><img src="${escapeHtml(icon)}" alt=""><div><strong>Nível ${Number(milestone.level) || 0}</strong><span>${escapeHtml(detail.text || "Novo recurso liberado.")}</span></div></article>`;
      })).join("");
    }
    if (typeof dom.milestoneDialog.showModal === "function" && !dom.milestoneDialog.open) {
      dom.milestoneDialog.showModal();
    }
  }

  function handleEngineEvent(event) {
    if (!event) return;
    if (event.type === "level") {
      const count = Math.max(1, Math.floor(Number(event.levelsGained) || 1));
      for (let index = 0; index < count; index += 1) {
        window.setTimeout(() => soundEngine.playConcurrent("levelUp"), index * 180);
      }
      if (Array.isArray(event.milestones) && event.milestones.length) showMilestoneDialog(event);

      // Revisão 39: subir de nível não remonta a tela inteira. A estrutura só
      // é refeita quando o intervalo atravessa um desbloqueio real.
      window.setTimeout(() => {
        const endLevel = Math.max(1, Math.floor(Number(event.level) || engine.state.farmLevel || 1));
        const startLevel = Math.max(1, endLevel - count + 1);
        const crossed = level => Number(level) >= startLevel && Number(level) <= endLevel;
        const cropUnlocked = engine.data.crops.some(crop => crossed(crop.unlockLevel));
        const ordersUnlocked = crossed(GameEngine.ORDER_UNLOCK_LEVEL);
        const evolutionsUnlocked = crossed(GameEngine.EVOLUTION_UNLOCK_LEVEL);
        const prestigeUnlocked = crossed(GameEngine.PRESTIGE_UNLOCK_LEVEL);

        updateLiveHeader(performance.now(), true);
        syncFeatureLocks();
        updateLiveNavigationBadges?.();

        if (activeView === "farmView" && cropUnlocked) renderCrops();
        if (activeView === "officeView" && activeOfficeTab === "orders" && ordersUnlocked) renderOrders();
        if (activeView === "officeView" && activeOfficeTab === "evolutions" && evolutionsUnlocked) {
          lastResearchRenderSignature = "";
          lastPrestigeRenderSignature = "";
          renderResearch();
          renderPrestigeUpgrades();
        }
        if (activeView === "profileView" && activeProfileTab === "missions" && cropUnlocked) renderMissions();
        if (activeView === "profileView" && activeProfileTab === "account" && prestigeUnlocked) renderPrestigeDashboard();
        updateLiveGameUI?.(performance.now(), true);
      }, 0);
    }
  }

