"use strict";

  let liveSocialRefreshTimer = 0;
  let liveSocialCountdownTimer = 0;
  let liveSocialStructureSignature = null;

  const weekdayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  function formatEventDuration(minutesValue) {
    const minutes = Math.max(1, Math.round(Number(minutesValue) || 60));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h${rest ? ` ${rest}min` : ""}` : `${minutes} min`;
  }

  function formatEventCountdown(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function weeklyEvents(now = Date.now()) {
    const runtime = window.FazendaSerenaRuntimeConfig || {};
    const weekStart = window.GameAdminConfig?.getWeekStart?.(now) || now;
    const weekEnd = weekStart + 7 * 86400000;
    return (runtime.events || []).map(event => {
      const occurrence = window.GameAdminConfig?.getEventOccurrence?.(event, now);
      return occurrence ? { event, ...occurrence } : null;
    }).filter(entry => entry && entry.start >= weekStart && entry.start < weekEnd && (entry.event.repeatWeekly !== false || entry.weekStart === Number(entry.event.weekAnchor)))
      .sort((a, b) => a.start - b.start);
  }

  function updateEventCountdowns() {
    const now = Date.now();
    document.querySelectorAll("[data-event-countdown]").forEach(node => {
      const end = Number(node.dataset.eventEnd) || now;
      node.textContent = formatEventCountdown(end - now);
    });
  }

  function renderLiveSocialContent() {
    const now = Date.now();
    const entries = weeklyEvents(now);
    const activeCount = entries.filter(entry => entry.active).length;
    if (dom.socialEventsSummary) {
      const summary = entries.length
        ? `${entries.length} ${entries.length === 1 ? "evento nesta semana" : "eventos nesta semana"}${activeCount ? ` · ${activeCount} agora` : ""}.`
        : runtimeText("socialEventsEmpty", "Nenhum evento programado para esta semana.");
      if (dom.socialEventsSummary.textContent !== summary) dom.socialEventsSummary.textContent = summary;
    }

    if (!dom.socialEventsList) return;
    const signature = entries.map(({ event, start, end, active }) => `${event.id}:${event.name}:${event.icon || ""}:${event.description || ""}:${event.durationMinutes}:${start}:${end}:${active ? 1 : 0}`).join("|");
    if (signature === liveSocialStructureSignature) {
      updateEventCountdowns();
      return;
    }
    liveSocialStructureSignature = signature;
    dom.socialEventsList.innerHTML = entries.length ? entries.map(({ event, start, end, active }) => {
      const date = new Date(start);
      const weekday = weekdayNames[(event.weekday || 1) - 1] || "Dia";
      const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      const eventIcon = String(event.icon || "assets/icons/calendario-eventos.webp");
      return `<article class="social-live-card ${active ? "active" : ""}" data-event-id="${escapeHtml(event.id)}">
        <div class="social-event-icon" aria-hidden="true"><img src="${escapeHtml(eventIcon)}" alt=""></div>
        <div class="social-event-copy"><small>${active ? "Acontecendo agora" : `${weekday} · ${time}`}</small><h3>${enrichResourceText(event.name)}</h3><p>${enrichResourceText(event.description || "Evento especial da comunidade.")}</p></div>
        <div class="social-event-time ${active ? "is-running" : ""}"><img src="assets/icons/relogio.webp" alt=""><span>${active ? `<b data-event-countdown data-event-end="${end}">${formatEventCountdown(end - now)}</b>` : formatEventDuration(event.durationMinutes)}</span></div>
      </article>`;
    }).join("") : `<div class="empty-state social-live-empty">${runtimeTextHtml("socialEventsEmpty", "Nenhum evento programado para esta semana.")}</div>`;
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
    window.clearInterval(liveSocialCountdownTimer);
    liveSocialRefreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && activeView === "profileView" && activeProfileTab === "social") renderLiveSocialContent();
    }, 30000);
    liveSocialCountdownTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") updateEventCountdowns();
    }, 1000);
  }
