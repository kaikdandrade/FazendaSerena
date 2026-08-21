"use strict";
  function statIcon(source, label = "") {
    return `<img alt="" aria-hidden="true" src="${escapeHtml(source)}" title="${escapeHtml(label)}">`;
  }

  function statCard(iconSource, label, value, note = "", variant = "") {
    return `<article class="player-stat-card ${variant ? `stat-${escapeHtml(variant)}` : ""}"><span class="player-stat-icon">${statIcon(iconSource, label)}</span><div><small>${escapeHtml(label)}</small><strong>${value}</strong>${note ? `<p>${escapeHtml(note)}</p>` : ""}</div></article>`;
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
      const titleRarity = ["common", "uncommon", "rare", "epic", "legendary"].includes(title?.rarity) ? title.rarity : "common";
      return `<article class="leaderboard-row rank-position-${Math.min(position, 6)} ${current && personal ? "current-player" : ""} ${personal ? "personal-rank-row" : ""}">
        <strong class="leaderboard-position">${renderPosition(player.position, personal)}</strong>
        <img class="leaderboard-avatar" src="${escapeHtml(avatar.src)}" alt="Avatar de ${escapeHtml(player?.displayName || "jogador")}">
        <div class="leaderboard-player">
          <div class="leaderboard-identity-line"><strong class="leaderboard-display-name">${escapeHtml(player?.displayName || "Fazendeiro")}</strong>${current ? '<span class="leaderboard-self-badge">Você</span>' : ""}<span class="social-title-dot" data-title-rarity="${titleRarity}" aria-hidden="true"></span>${playerTitleMarkup(title, { compact: true })}</div>
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
    const claimed = engine.data.missions.filter(mission => state.missionsClaimed[mission.id]);
    const legacyEntries = engine.data.prestigeUpgrades.map(item => ({ item, level: Number(state.prestigeUpgrades[item.id] || 0) })).filter(entry => entry.level > 0);
    const researchEntries = engine.data.research.map(item => ({ item, level: Number(state.researchTechs[item.id] || 0) })).filter(entry => entry.level > 0);
    const legacyLevels = legacyEntries.reduce((sum, entry) => sum + entry.level, 0);
    const researchLevels = researchEntries.reduce((sum, entry) => sum + entry.level, 0);
    if (dom.statsHero) { dom.statsHero.innerHTML = ""; dom.statsHero.hidden = true; }

    dom.lifetimeStats.innerHTML = [
      statCard("assets/icons/moeda.webp", "Moedas recebidas", resourceAmount("coins", stats.lifetimeCoins), "", "featured"),
      statCard("assets/icons/caixa-colheita.webp", "Produção total", engine.formatNumber(stats.lifetimeHarvested), "itens", "featured"),
      statCard("assets/icons/carteira-moedas.webp", "Vendas", engine.formatNumber(stats.lifetimeSold), "itens vendidos", "featured"),
      statCard("assets/icons/contrato-comercial.webp", "Contratos", engine.formatNumber(stats.lifetimeContractsCompleted), `${engine.formatNumber(stats.lifetimeContractUnitsDelivered)} unidades`),
      statCard("assets/icons/prancheta-tarefas.webp", "Pedidos", engine.formatNumber(stats.lifetimeOrdersCompleted), `${engine.formatNumber(stats.lifetimeOrderUnitsDelivered)} unidades`),
      statCard("assets/icons/prestigio.webp", "Ciclos concluídos", engine.formatNumber(stats.prestiges), "")
    ].join("");
    dom.recordStats.innerHTML = [
      statCard("assets/icons/fazenda-celeiro.webp", "Maior nível", engine.formatNumber(stats.maxFarmLevel), "", "record"),
      statCard("assets/icons/estrela-dominio-cultura.webp", "Platinadas", engine.formatNumber(stats.lifetimeCropPrestiges || 0), "", "record"),
      statCard("assets/icons/galpao-industrial.webp", "Maior estoque", engine.formatNumber(stats.maxStorageUsed), "", "record"),
      statCard("assets/icons/moeda.webp", "Maior saldo", resourceAmount("coins", stats.maxCoinsHeld), "", "record")
    ].join("");
    dom.achievementSummary.innerHTML = `
      <article><span>${statIcon("assets/icons/livros.webp", "Pesquisa")}</span><div><small>Pesquisa adquirida</small><strong>${researchLevels} níveis</strong></div></article>
      <article><span>${statIcon("assets/icons/coroa.webp", "Legados")}</span><div><small>Legados permanentes</small><strong>${legacyLevels} níveis</strong></div></article>
      <article><span>${statIcon("assets/icons/prancheta-tarefas.webp", "Missões")}</span><div><small>Missões concluídas</small><strong>${claimed.length} / ${engine.data.missions.length}</strong></div></article>`;

    const researchMarkup = researchEntries.length ? researchEntries.map(({ item, level }) => {
      const benefits = summarizeEvolutionBenefits(item, level);
      return `<article class="achievement-card progression-benefit-card"><span>${statIcon(typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon) ? item.icon : "assets/icons/livros.webp", item.name)}</span><div><small>Pesquisa · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${benefits.length ? benefits.map(escapeHtml).join(" · ") : enrichResourceText(item.desc)}</p></div></article>`;
    }).join("") : `<div class="friends-empty-state">Nenhuma pesquisa adquirida ainda.</div>`;

    const legacyMarkup = legacyEntries.length ? legacyEntries.map(({ item, level }) => {
      const benefits = summarizeEvolutionBenefits(item, level);
      const icon = typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon) ? item.icon : "assets/icons/prestigio.webp";
      return `<article class="achievement-card legacy-achievement progression-benefit-card"><span>${statIcon(icon, item.name)}</span><div><small>Legado · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${benefits.length ? benefits.map(escapeHtml).join(" · ") : enrichResourceText(item.desc)}</p></div></article>`;
    }).join("") : `<div class="friends-empty-state">Nenhum legado adquirido ainda.</div>`;

    const missionMarkup = claimed.length ? claimed.map(mission => `<article class="achievement-card"><span>${statIcon("assets/icons/prancheta-tarefas.webp", "Missão concluída")}</span><div><small>${mission.series ? `Série ${mission.stage}` : "Conquista"}</small><h3>${escapeHtml(mission.title)}</h3><p>${enrichResourceText(mission.desc)}</p></div></article>`).join("") : `<div class="friends-empty-state stats-mission-empty"><strong>Nenhuma missão concluída ainda.</strong><small>As missões que você concluir aparecerão aqui para registrar as conquistas da sua fazenda.</small></div>`;

    dom.achievementGrid.innerHTML = `
      <section class="stats-benefit-section research-benefit-section"><header><div><small>benefícios acumulados</small><h3>Pesquisa</h3></div><b>${researchLevels}</b></header><div class="stats-benefit-list">${researchMarkup}</div></section>
      <section class="stats-benefit-section legacy-benefit-section"><header><div><small>benefícios permanentes</small><h3>Legado</h3></div><img data-prestige-icon="legacy" src="assets/icons/prestigio.webp" alt=""></header><div class="stats-benefit-list">${legacyMarkup}</div></section>
      <details class="stats-mission-history" ${claimed.length ? "" : "open"}><summary>Missões concluídas <b>${claimed.length}</b></summary><div class="stats-benefit-list">${missionMarkup}</div></details>`;
  }

