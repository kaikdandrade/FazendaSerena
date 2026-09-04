"use strict";
  function statIcon(source, label = "") {
    return `<img alt="" aria-hidden="true" src="${escapeHtml(source)}" title="${escapeHtml(label)}">`;
  }

  function statCard(iconSource, label, value, note = "", variant = "", liveKey = "") {
    const liveAttr = liveKey ? ` data-stat-live="${escapeHtml(liveKey)}"` : "";
    return `<article class="player-stat-card ${variant ? `stat-${escapeHtml(variant)}` : ""}"${liveAttr}><span class="player-stat-icon">${statIcon(iconSource, label)}</span><div><small>${escapeHtml(label)}</small><strong data-stat-live-value>${value}</strong>${note ? `<p>${escapeHtml(note)}</p>` : ""}</div></article>`;
  }


  function renderPrestigeLeaderboard() {
    if (!dom.prestigeLeaderboard) return;
    const user = window.FirebaseManager.getUser();
    if (leaderboardState.status === "loading") {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty leaderboard-loading"><strong>${runtimeTextHtml("leaderboardLoadingTitle", "Atualizando o rank global...")}</strong><span>${runtimeTextHtml("leaderboardLoadingText", "Consultando as cinco melhores fazendas e sua posição atual.")}</span></div>`;
      return;
    }
    if (leaderboardState.status === "error") {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>${runtimeTextHtml("leaderboardErrorTitle", "Não foi possível carregar o rank")}</strong><span>${escapeHtml(window.FirebaseManager.getFriendlyError(leaderboardState.error))}</span></div>`;
      return;
    }
    if (leaderboardState.status !== "success") {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>${runtimeTextHtml("leaderboardIntroTitle", "Top 5 global")}</strong><span>${runtimeTextHtml("leaderboardIntroText", "O ranking é público. Todo jogador conectado com apelido e avatar configurados participa automaticamente e também vê a própria classificação.")}</span></div>`;
      return;
    }

    const top = Array.isArray(leaderboardState.top) ? leaderboardState.top.slice(0, 5) : [];
    const currentUid = user?.uid || "";
    const rankBadges = {
      1: "assets/icons/medalha-ranking-1.webp",
      2: "assets/icons/medalha-ranking-2.webp",
      3: "assets/icons/medalha-ranking-3.webp",
      4: "assets/icons/medalha-ranking-4.webp",
      5: "assets/icons/medalha-ranking-5.webp"
    };
    const renderPosition = (position, personal = false) => {
      const badge = personal && position > 5
        ? "assets/icons/medalha-fora-top-5.webp"
        : (rankBadges[position] || "assets/icons/medalha-fora-top-5.webp");
      return `<span class="sr-only">${engine.formatNumber(position)}º lugar</span><img class="leaderboard-rank-badge" alt="" aria-hidden="true" src="${badge}">${personal && position > 5 ? `<b class="leaderboard-position-number">${engine.formatNumber(position)}º</b>` : ""}`;
    };
    const renderRow = (player, personal = false) => {
      const avatar = getAvatarEntry(player?.avatarId) || { src: "assets/icons/perfil.webp" };
      const current = Boolean(currentUid && player.uid === currentUid);
      const prestigeCount = Math.max(0, Number(player?.prestigeCount) || 0);
      const farmLevel = Math.max(1, Number(player?.farmLevel) || 1);
      const position = Math.max(1, Number(player?.position) || 1);
      const title = getPlayerTitleEntry(player?.playerTitleId || "fazendeiro");
      const titleRarity = ["common", "uncommon", "rare", "epic", "legendary", "mystic"].includes(title?.rarity) ? title.rarity : "common";
      return `<article class="leaderboard-row rank-position-${Math.min(position, 6)} ${current && personal ? "current-player" : ""} ${personal ? "personal-rank-row" : ""}">
        <strong class="leaderboard-position">${renderPosition(player.position, personal)}</strong>
        <img class="leaderboard-avatar" src="${escapeHtml(avatar.src)}" alt="Avatar de ${escapeHtml(player?.displayName || "jogador")}">
        <div class="leaderboard-player">
          <div class="leaderboard-identity-line"><span class="leaderboard-name-line"><strong class="leaderboard-display-name">${escapeHtml(player?.displayName || "Fazendeiro")}</strong>${current ? '<span class="leaderboard-self-badge">Você</span>' : ""}</span><span class="leaderboard-title-line"><span class="social-title-dot" data-title-rarity="${titleRarity}" aria-hidden="true"></span>${playerTitleMarkup(title, { compact: true })}</span></div>
          <small class="leaderboard-player-meta"><span class="leaderboard-account-prestige" title="Prestígio de conta"><img src="assets/icons/prestigio-conta.webp" alt="Prestígio de conta"><b>${engine.formatNumber(prestigeCount)}</b></span><span class="leaderboard-current-level" title="Nível da fazenda"><img src="assets/icons/marco-nivel.webp" alt="Nível da fazenda"><b>${engine.formatNumber(farmLevel)}</b></span></small>
        </div>
      </article>`;
    };

    const topRows = top.map(player => renderRow(player)).filter(Boolean);
    const player = leaderboardState.player;
    const playerOutsideTop = Boolean(player && !top.some(entry => entry.uid === player.uid));
    const personalRow = playerOutsideTop
      ? renderRow(player, true)
      : "";

    if (!topRows.length) {
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>${runtimeTextHtml("leaderboardEmptyTitle", "Ainda não há fazendas classificadas")}</strong><span>${runtimeTextHtml("leaderboardEmptyText", "Jogadores conectados com apelido e avatar configurados participam automaticamente do ranking global.")}</span></div>`;
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

  function summarizeEvolutionBenefits(item, level) {
    const options = new Map((window.GameAdminConfig?.getEvolutionEffectOptions?.() || []).map(entry => [entry.value, entry.label]));
    const bonuses = Array.isArray(item?.bonuses) ? item.bonuses : [];
    return bonuses.map(bonus => {
      const stageValues = Array.isArray(bonus.stageValues) ? bonus.stageValues : [];
      const total = stageValues.length
        ? stageValues.slice(0, level).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)
        : Math.max(0, Number(bonus.amount) || 0) * level;
      if (!total) return "";
      const label = options.get(bonus.type) || bonus.type || "Bônus";
      const percent = /\(%\)/.test(label);
      return `${label.replace(/\s*\(%\)/, "")}: +${engine.formatNumber(total, 2)}${percent ? "%" : ""}`;
    }).filter(Boolean);
  }

  function renderStats() {
    const state = engine.state;
    const stats = state.stats;
    const legacyEntries = engine.data.prestigeUpgrades.map(item => ({ item, level: Number(state.prestigeUpgrades[item.id] || 0) })).filter(entry => entry.level > 0);
    const researchEntries = engine.data.research.map(item => ({ item, level: Number(state.researchTechs[item.id] || 0) })).filter(entry => entry.level > 0);
    const legacyLevels = legacyEntries.reduce((sum, entry) => sum + entry.level, 0);
    const researchLevels = researchEntries.reduce((sum, entry) => sum + entry.level, 0);
    const totalLegacyLevels = engine.data.prestigeUpgrades.reduce((sum, item) => sum + Math.max(0, Number(item?.max) || 0), 0);
    const masteredCropCount = engine.data.crops.filter(crop => Number(engine.state.crops?.[crop.id]?.level || 0) >= GameEngine.MAX_CROP_LEVEL).length;
    const totalCropCount = engine.data.crops.length;
    const totalResearchLevels = engine.data.research.reduce((sum, item) => sum + Math.max(0, Number(item?.max) || 0), 0);
    if (dom.statsHero) { dom.statsHero.innerHTML = ""; dom.statsHero.hidden = true; }

    dom.lifetimeStats.innerHTML = [
      statCard("assets/icons/moeda.webp", "Moedas recebidas", resourceAmount("coins", stats.lifetimeCoins), "", "", "lifetimeCoins"),
      statCard("assets/icons/moeda.webp", "Maior saldo", resourceAmount("coins", stats.maxCoinsHeld), "", "", "maxCoinsHeld"),
      statCard("assets/icons/caixa-colheita.webp", "Produção total", engine.formatNumber(stats.lifetimeHarvested), "", "", "lifetimeHarvested"),
      statCard("assets/icons/carteira-moedas.webp", "Itens vendidos", engine.formatNumber(stats.lifetimeSold), "", "", "lifetimeSold"),
      statCard("assets/icons/contrato-comercial.webp", "Contratos entregues", engine.formatNumber(stats.lifetimeContractsCompleted), "", "", "lifetimeContractsCompleted"),
      statCard("assets/icons/relogio.webp", "Horas jogadas", formatGameplayDuration(stats.totalPlaySeconds), "", "", "totalPlaySeconds"),
      statCard("assets/icons/relogio-azul.webp", "Maior tempo online", formatGameplayDuration(stats.maxOnlineSessionSeconds), "", "", "maxOnlineSessionSeconds"),
      statCard("assets/icons/fazenda-celeiro.webp", "Maior nível", engine.formatNumber(stats.maxFarmLevel), "", "", "maxFarmLevel"),
      statCard("assets/icons/prestigio-conta.webp", "Prestígio de conta", engine.formatNumber(stats.prestiges), "", "", "prestiges"),
      statCard("assets/icons/estrela-dominio-cultura.webp", "Plantas platinadas", `${engine.formatNumber(masteredCropCount)} / ${engine.formatNumber(totalCropCount)}`, "", "", "lifetimeCropPrestiges")
    ].join("");
    if (dom.recordStats) {
      dom.recordStats.innerHTML = "";
      const recordSection = dom.recordStats.closest(".stats-section");
      if (recordSection) recordSection.hidden = true;
    }
    dom.achievementSummary.innerHTML = `
      <article><span>${statIcon("assets/icons/livros.webp", "Pesquisa")}</span><div><small>Pesquisas adquiridas</small><strong data-achievement-live="researchLevels">${engine.formatNumber(researchLevels)} / ${engine.formatNumber(totalResearchLevels)} níveis</strong></div></article>
      <article><span>${statIcon("assets/icons/coroa.webp", "Legados")}</span><div><small>Legados permanentes</small><strong data-achievement-live="legacyLevels">${engine.formatNumber(legacyLevels)} / ${engine.formatNumber(totalLegacyLevels)} níveis</strong></div></article>`;

    const emptyState = text => `<div class="stats-empty-state stats-empty-state-normalized"><p>${text}</p></div>`;
    const researchMarkup = researchEntries.length ? researchEntries.map(({ item, level }) => {
      const benefits = summarizeEvolutionBenefits(item, level);
      return `<article class="achievement-card progression-benefit-card"><span>${statIcon(typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon) ? item.icon : "assets/icons/livros.webp", item.name)}</span><div><small>Pesquisa · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${benefits.length ? benefits.map(escapeHtml).join(" · ") : enrichResourceText(item.desc)}</p></div></article>`;
    }).join("") : emptyState("Nenhuma pesquisa adquirida ainda.");

    const legacyMarkup = legacyEntries.length ? legacyEntries.map(({ item, level }) => {
      const benefits = summarizeEvolutionBenefits(item, level);
      const icon = typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon) ? item.icon : "assets/icons/prestigio.webp";
      return `<article class="achievement-card legacy-achievement progression-benefit-card"><span>${statIcon(icon, item.name)}</span><div><small>Legado · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${benefits.length ? benefits.map(escapeHtml).join(" · ") : enrichResourceText(item.desc)}</p></div></article>`;
    }).join("") : emptyState("Nenhum legado adquirido ainda.");
    const benefitSection = ({ eyebrow, title, count, content, className = "" }) => `<section class="stats-benefit-section stats-benefit-section-normalized ${className}"><header><div><small>${eyebrow}</small><h3>${title}</h3></div><b>${count}</b></header><div class="stats-benefit-list">${content}</div></section>`;
    dom.achievementGrid.innerHTML = [
      benefitSection({ eyebrow: "benefícios acumulados", title: "Pesquisa", count: researchLevels, content: researchMarkup, className: "research-benefit-section" }),
      benefitSection({ eyebrow: "benefícios permanentes", title: "Legados", count: legacyLevels, content: legacyMarkup, className: "legacy-benefit-section" })
    ].join("");
  }

