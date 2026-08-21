"use strict";

  let liveSocialRefreshTimer = 0;

  function formatSocialDate(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }

  function eventTypeLabel(type) {
    return ({ harvest: "Safras", xp: "XP", research: "Pesquisa", coins: "Moedas" })[type] || "Bônus";
  }

  function renderLiveSocialContent() {
    const runtime = window.FazendaSerenaRuntimeConfig || {};
    const now = Date.now();
    const events = (runtime.events || []).filter(event => {
      const end = Number(event.startAt) + Math.max(1, Number(event.durationMinutes) || 0) * 60000;
      return end > now;
    }).sort((a, b) => Number(a.startAt) - Number(b.startAt)).slice(0, 8);

    if (dom.openSocialEvents) {
      dom.openSocialEvents.disabled = events.length === 0;
      dom.openSocialEvents.setAttribute("aria-disabled", String(events.length === 0));
    }
    if (dom.socialEventsSummary) {
      const activeCount = events.filter(event => {
        const start = Number(event.startAt) || now;
        const end = start + Math.max(1, Number(event.durationMinutes) || 0) * 60000;
        return now >= start && now < end;
      }).length;
      dom.socialEventsSummary.textContent = events.length
        ? `${events.length} ${events.length === 1 ? "evento programado" : "eventos programados"}${activeCount ? ` · ${activeCount} agora` : ""}.`
        : runtimeText("socialEventsEmpty", "Nenhum evento futuro foi anunciado.");
    }

    if (dom.socialEventsList) {
      dom.socialEventsList.innerHTML = events.length ? events.map(event => {
        const start = Number(event.startAt) || now;
        const end = start + Math.max(1, Number(event.durationMinutes) || 0) * 60000;
        const active = now >= start && now < end;
        return `<article class="social-live-card ${active ? "active" : ""}">
          <div><small>${active ? "Acontecendo agora" : formatSocialDate(start)}</small><h3>${escapeHtml(event.name)}</h3><p>${eventTypeLabel(event.type)}: <strong>+${engine.formatNumber(event.bonusPercent, 2)}%</strong></p></div>
          <span>${active ? `até ${formatSocialDate(end)}` : `${Math.max(1, Math.round(Number(event.durationMinutes) || 0))} min`}</span>
        </article>`;
      }).join("") : `<div class="empty-state social-live-empty">${runtimeTextHtml("socialEventsEmpty", "Nenhum evento futuro foi anunciado.")}</div>`;
    }
  }

  async function refreshLiveSocialContent() {
    try {
      const cloud = await window.FazendaSerenaPublicCloud?.loadConfig?.({ force: true })
        || await window.FirebaseManager.loadPublicGameConfig();
      if (cloud) window.GameAdminConfig.applyLiveContent(cloud);
    } catch (error) {
      console.warn("Não foi possível atualizar a agenda:", error);
    }
    renderLiveSocialContent();
  }

  function setupLiveSocialContent() {
    renderLiveSocialContent();
    window.addEventListener("fazenda-live-content", renderLiveSocialContent);
    window.addEventListener("fazenda-runtime-config", renderLiveSocialContent);
    window.clearInterval(liveSocialRefreshTimer);
    liveSocialRefreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && activeView === "profileView" && activeProfileTab === "social") refreshLiveSocialContent();
    }, 120000);
  }
