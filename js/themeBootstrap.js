"use strict";

(() => {
  const STORAGE_KEY = "fazenda-serena-theme-mode";
  const MODES = Object.freeze(["automatic", "light", "dark"]);

  const normalizeMode = value => MODES.includes(String(value || "")) ? String(value) : "automatic";
  const systemPrefersDark = () => Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  const resolveTheme = mode => {
    const normalized = normalizeMode(mode);
    return normalized === "automatic" ? (systemPrefersDark() ? "dark" : "light") : normalized;
  };
  const readMode = () => {
    try { return normalizeMode(localStorage.getItem(STORAGE_KEY) || "automatic"); }
    catch { return "automatic"; }
  };
  const updateMetaColor = theme => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b100d" : "#eef4e8");
  };
  const apply = (mode = readMode(), { persist = false } = {}) => {
    const normalized = normalizeMode(mode);
    const theme = resolveTheme(normalized);
    const root = document.documentElement;
    root.dataset.themeMode = normalized;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (document.body) document.body.dataset.theme = theme;
    updateMetaColor(theme);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, normalized); } catch {}
    }
    return { mode: normalized, theme };
  };

  const api = Object.freeze({ STORAGE_KEY, MODES, normalizeMode, resolveTheme, readMode, apply });
  Object.defineProperty(window, "FazendaSerenaTheme", { value: api, configurable: false, writable: false });

  // Aplicação crítica: ocorre antes dos CSS para a tela de carregamento já nascer no tema correto.
  apply(readMode());
})();
