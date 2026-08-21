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
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>${runtimeTextHtml("leaderboardIntroTitle", "Top 5 global")}</strong><span>${runtimeTextHtml("leaderboardIntroText", "O ranking é público. Jogadores conectados com perfil completo também veem a própria classificação.")}</span></div>`;
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
      return `<article class="leaderboard-row rank-position-${Math.min(position, 6)} ${current && personal ? "current-player" : ""} ${personal ? "personal-rank-row" : ""}">
        <strong class="leaderboard-position">${renderPosition(player.position, personal)}</strong>
        <img class="leaderboard-avatar" src="${escapeHtml(avatar.src)}" alt="Avatar de ${escapeHtml(player?.displayName || "jogador")}">
        <div class="leaderboard-player">
          <div class="leaderboard-player-name"><strong>${escapeHtml(player?.displayName || "Fazendeiro")}</strong>${current ? '<span class="leaderboard-self-badge">Você</span>' : ""}</div>
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
      dom.prestigeLeaderboard.innerHTML = `<div class="empty-state leaderboard-empty"><strong>${runtimeTextHtml("leaderboardEmptyTitle", "Ainda não há fazendas classificadas")}</strong><span>${runtimeTextHtml("leaderboardEmptyText", "Para participar, o jogador precisa estar conectado e ter apelido e avatar salvos.")}</span></div>`;
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
    if (dom.statsHero) {
      dom.statsHero.innerHTML = "";
      dom.statsHero.hidden = true;
    }
    dom.lifetimeStats.innerHTML = [
      statCard("assets/icons/moeda.webp", "Moedas recebidas", resourceAmount("coins", stats.lifetimeCoins), "", "featured"),
      statCard("assets/icons/caixa-colheita.webp", "Itens produzidos", engine.formatNumber(stats.lifetimeHarvested), "", "featured"),
      statCard("assets/icons/carteira-moedas.webp", "Itens vendidos", engine.formatNumber(stats.lifetimeSold), "", "featured"),
      statCard("assets/icons/contrato-comercial.webp", "Contratos concluídos", engine.formatNumber(stats.lifetimeContractsCompleted), `${engine.formatNumber(stats.lifetimeContractUnitsDelivered)} unidades entregues`),
      statCard("assets/icons/prancheta-tarefas.webp", "Pedidos entregues", engine.formatNumber(stats.lifetimeOrdersCompleted), `${engine.formatNumber(stats.lifetimeOrderUnitsDelivered)} unidades entregues`),
      statCard("assets/icons/prancheta-tarefas.webp", "Séries de missão", `${claimed.length} / ${engine.data.missions.length}`),
      statCard("assets/icons/prestigio.webp", "Prestígios realizados", engine.formatNumber(stats.prestiges)),
      statCard("assets/icons/relogio.webp", "Contratos expirados", engine.formatNumber(stats.lifetimeContractsFailed)),
      statCard("assets/icons/ferramentas.webp", "Contratos quebrados", engine.formatNumber(stats.lifetimeContractsBroken))
    ].join("");
    dom.recordStats.innerHTML = [
      statCard("assets/icons/fazenda-celeiro.webp", "Maior nível da fazenda", engine.formatNumber(stats.maxFarmLevel), "", "record"),
      statCard("assets/icons/estrela-dominio-cultura.webp", "Culturas prestigiadas", engine.formatNumber(stats.lifetimeCropPrestiges || 0), "", "record"),
      statCard("assets/icons/galpao-industrial.webp", "Maior estoque ocupado", engine.formatNumber(stats.maxStorageUsed), "", "record"),
      statCard("assets/icons/moeda.webp", "Maior saldo registrado", resourceAmount("coins", stats.maxCoinsHeld), "", "record"),
      statCard("assets/icons/mapa.webp", "Culturas descobertas", `${discovered} / ${engine.data.crops.length}`, "", "record")
    ].join("");
    dom.achievementSummary.innerHTML = `<article><span>${statIcon("assets/icons/prancheta-tarefas.webp", "Missões")}</span><div><small>Missões concluídas</small><strong>${claimed.length} / ${engine.data.missions.length}</strong></div></article><article><span>${statIcon("assets/icons/coroa.webp", "Legados")}</span><div><small>Níveis de legado</small><strong>${legacyLevels}</strong></div></article><article><span>${statIcon("assets/icons/prestigio.webp", "Bônus permanentes")}</span><div><small>Bônus permanentes</small><strong>${state.permanentBonuses.prestigeDouble ? "Prestígio 2× ativo" : "Em construção"}</strong></div></article>`;
    const permanentAchievements = [];
    if (state.permanentBonuses.prestigeDouble) permanentAchievements.push(`<article class="achievement-card permanent-achievement"><span>${statIcon("assets/icons/prestigio.webp", "Bônus permanente")}</span><div><small>Bônus permanente</small><h3>Prestígio dos prestígios</h3><p>Todos os próximos prestígios concedem o dobro de pontos.</p></div></article>`);
    engine.data.prestigeUpgrades.forEach(item => {
      const level = Number(state.prestigeUpgrades[item.id] || 0);
      if (level > 0) {
        const legacyIcon = typeof item.icon === "string" && /\.(?:png|webp|svg)$/i.test(item.icon)
          ? `<img src="${escapeHtml(item.icon)}" alt="">`
          : escapeHtml(item.icon);
        permanentAchievements.push(`<article class="achievement-card legacy-achievement"><span>${legacyIcon}</span><div><small>Legado permanente · nível ${level}/${item.max}</small><h3>${escapeHtml(item.name)}</h3><p>${enrichResourceText(item.desc)}</p></div></article>`);
      }
    });
    const missionAchievements = claimed.map(mission => `<article class="achievement-card"><span>${statIcon("assets/icons/prancheta-tarefas.webp", "Missão concluída")}</span><div><small>${mission.series ? `Série ${mission.stage}` : "Conquista"}</small><h3>${escapeHtml(mission.title)}</h3><p>${enrichResourceText(mission.desc)}</p></div></article>`);
    const achievements = [...permanentAchievements, ...missionAchievements];
    dom.achievementGrid.innerHTML = achievements.length ? achievements.join("") : `<div class="empty-state">${runtimeTextHtml("achievementsEmpty", "Missões concluídas, bônus permanentes e legados comprados aparecerão aqui e nunca serão apagados pelo prestígio.")}</div>`;
  }

