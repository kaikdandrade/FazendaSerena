"use strict";

(() => {
  const state = { ready: false, failed: false, progress: 8, watchdog: 0 };
  const get = id => document.getElementById(id);

  function setProgress(value) {
    state.progress = Math.max(state.progress, Math.min(100, Number(value) || 0));
    const bar = get("gameLoadingProgress");
    if (bar) bar.style.width = `${state.progress}%`;
  }

  function update(message, progress) {
    if (state.ready || state.failed) return;
    const status = get("gameLoadingStatus");
    if (status && message) status.textContent = String(message);
    if (progress != null) setProgress(progress);
  }

  function fail(error) {
    if (state.ready || state.failed) return;
    state.failed = true;
    clearTimeout(state.watchdog);
    const screen = get("gameLoadingScreen");
    const status = get("gameLoadingStatus");
    const retry = get("gameLoadingRetry");
    screen?.classList.add("is-error");
    if (status) status.textContent = "Não foi possível iniciar o jogo. Tente recarregar a página.";
    if (retry) retry.hidden = false;
    setProgress(100);
    console.error("Falha durante a inicialização da Fazenda Serena:", error);
  }

  function complete() {
    if (state.ready) return;
    state.ready = true;
    state.failed = false;
    clearTimeout(state.watchdog);
    setProgress(100);
    const status = get("gameLoadingStatus");
    if (status) status.textContent = "Fazenda pronta!";
    document.body?.classList.remove("is-loading");
    document.body?.classList.add("game-ready");
    const shell = document.querySelector(".app-shell");
    if (shell) {
      shell.style.removeProperty("visibility");
      shell.style.removeProperty("display");
      shell.style.removeProperty("opacity");
    }
    const screen = get("gameLoadingScreen");
    if (screen) {
      screen.setAttribute("aria-busy", "false");
      setTimeout(() => {
        screen.classList.add("is-finished");
        setTimeout(() => screen.remove(), 360);
      }, 120);
    }
  }

  function armWatchdog() {
    clearTimeout(state.watchdog);
    state.watchdog = window.setTimeout(() => {
      if (!state.ready && !state.failed) fail(new Error("Tempo limite de inicialização excedido."));
    }, 25000);
  }

  window.addEventListener("error", event => {
    const target = event.target;
    if (target && target !== window && ["SCRIPT", "LINK"].includes(target.tagName)) {
      const resource = target.src || target.href || "";
      try {
        const url = new URL(resource, location.href);
        if (url.origin === location.origin) fail(new Error(`Recurso essencial não carregado: ${url.pathname}`));
      } catch {}
    }
  }, true);

  window.addEventListener("unhandledrejection", event => {
    // Rejeições não críticas de rede são tratadas pelos módulos. Só converte em
    // falha enquanto o boot explicitamente não tiver finalizado e se o módulo
    // principal reportar a rejeição por fail().
    console.warn("Rejeição durante a inicialização:", event.reason);
  });

  document.addEventListener("DOMContentLoaded", () => {
    get("gameLoadingRetry")?.addEventListener("click", () => location.reload());
    setProgress(12);
    armWatchdog();
  }, { once: true });

  window.FazendaSerenaLoading = Object.freeze({ update, setProgress, complete, fail, getState: () => ({ ...state }) });
})();
