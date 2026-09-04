"use strict";

  let liveSocialRefreshTimer = 0;
  let liveSocialCountdownTimer = 0;
  let liveSocialStructureSignature = null;

  const weekdayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

  function formatEventDateLabel(date) {
    return monthFormatter.format(date);
  }

  function escapeAttribute(value) {
    return escapeHtml(value ?? "");
  }
  function eventTypeLabel(type) {
    const labels = {
      harvest: "Produção",
      growthSpeed: "Velocidade",
      salePrice: "Venda",
      xp: "XP",
      research: "Pesquisa",
      coins: "Moedas",
      contractRewards: "Contratos"
    };
    return labels[String(type || "")] || "Bônus";
  }


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
    const horizonStart = Number(now) || Date.now();
    const horizonEnd = horizonStart + 7 * 86400000;
    return (runtime.events || []).map(event => {
      const occurrence = window.GameAdminConfig?.getEventOccurrence?.(event, horizonStart);
      if (!occurrence) return null;
      let start = occurrence.start;
      let end = occurrence.end;
      let weekStart = occurrence.weekStart;
      const recurring = event.repeatWeekly !== false;
      if (recurring) {
        while (end <= horizonStart) {
          start += 7 * 86400000;
          end += 7 * 86400000;
          weekStart += 7 * 86400000;
        }
      }
      const active = horizonStart >= start && horizonStart < end;
      const upcoming = horizonStart < start;
      if (!active && !upcoming) return null;
      if (!active && start > horizonEnd) return null;
      return { event, start, end, weekStart, active, upcoming };
    }).filter(Boolean).sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.start - b.start;
    });
  }

  function updateEventCountdowns() {
    const now = Date.now();
    let needsRerender = false;
    document.querySelectorAll("[data-event-live-shell]").forEach(node => {
      const start = Number(node.dataset.eventStart) || now;
      const end = Number(node.dataset.eventEnd) || start;
      const active = now >= start && now < end;
      const ended = now >= end;
      const timerValue = node.querySelector("[data-event-countdown]");
      if (timerValue) timerValue.textContent = formatEventCountdown(end - now);
      const previousState = node.dataset.eventLiveState || "";
      const nextState = ended ? "ended" : active ? "running" : "scheduled";
      if (previousState && previousState !== nextState) needsRerender = true;
      node.dataset.eventLiveState = nextState;
    });
    if (needsRerender) renderLiveSocialContent();
  }

  function renderLiveSocialContent() {
    const now = Date.now();
    const entries = weeklyEvents(now);

    if (!dom.socialEventsList) return;
    const signature = entries.map(({ event, start, end, active }) => `${event.id}:${event.name}:${event.icon || ""}:${event.description || ""}:${start}:${end}:${active ? 1 : 0}`).join("|");
    if (signature === liveSocialStructureSignature) {
      updateEventCountdowns();
      return;
    }
    liveSocialStructureSignature = signature;
    dom.socialEventsList.innerHTML = entries.length ? entries.map(({ event, start, end, active }) => {
      const date = new Date(start);
      const weekday = weekdayNames[(date.getDay() || 7) - 1] || "Dia";
      const startTime = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      const dateLabel = formatEventDateLabel(date);
      const durationLabel = formatEventDuration(event.durationMinutes);
      const eventIcon = String(event.icon || "assets/icons/calendario-eventos.webp");
      const description = String(event.description || "").trim();
      return `<article class="social-live-card social-agenda-card ${active ? "active" : ""}" data-event-id="${escapeAttribute(event.id)}">
        <div class="social-event-main-block">
          <div class="social-event-icon" aria-hidden="true"><img src="${escapeAttribute(eventIcon)}" alt=""></div>
          <div class="social-event-copy social-event-simple-copy">
            <h3>${enrichResourceText(event.name)}</h3>
            ${description ? `<p>${enrichResourceText(description)}</p>` : ""}
          </div>
        </div>
        <div class="social-event-status-panel social-event-schedule-panel ${active ? "is-running" : ""}" data-event-live-shell data-event-start="${start}" data-event-end="${end}" data-event-live-state="${active ? "running" : "scheduled"}">
          <div class="social-event-info-row social-event-day-row"><small>Dia</small><strong>${escapeHtml(weekday)} <span>${escapeHtml(dateLabel)}</span></strong></div>
          <div class="social-event-info-row"><small>Início</small><strong>${escapeHtml(startTime)}</strong></div>
          <div class="social-event-info-row"><small>Duração</small><strong>${escapeHtml(durationLabel)}</strong></div>
          <div class="social-event-info-row social-event-status-row ${active ? "is-live" : ""}"><small>Status</small><strong>${active ? "Em andamento" : "Programado"}</strong></div>
          ${active ? `<div class="social-event-info-row social-event-time-left"><small>Restante</small><strong data-event-countdown>${formatEventCountdown(end - now)}</strong></div>` : ""}
        </div>
      </article>`;
    }).join("") : `<div class="empty-state social-live-empty">${runtimeTextHtml("socialEventsEmpty", "Nenhum evento programado para os próximos dias.")}</div>`;
    updateEventCountdowns();
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
