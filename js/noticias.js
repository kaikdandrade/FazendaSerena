"use strict";

(() => {
  const feed = document.getElementById("newsFeed");
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const formatDate = timestamp => {
    const date = new Date(Number(timestamp) || Date.now());
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(date);
  };

  const formatBody = value => escapeHtml(value).replace(/\r?\n/g, "<br>");

  async function render() {
    if (!feed) return;
    try {
      const config = await window.FazendaSerenaPublicCloud.loadConfig({ force: true });
      const notes = (config?.updateNotes || [])
        .slice()
        .sort((a, b) => Number(b?.publishedAt || 0) - Number(a?.publishedAt || 0));
      if (config) window.FazendaSerenaConfig?.applyCloudVersion?.(window.FazendaSerenaConfig.versionFromConfig(config));
      feed.innerHTML = notes.length ? notes.map((note, index) => `
        <article class="news-card ${index === 0 ? "latest" : ""}">
          <header>
            <div><span class="news-version">v${escapeHtml(note.version || "Atualização")}</span>${index === 0 ? '<span class="news-latest">mais recente</span>' : ""}</div>
            <time datetime="${new Date(Number(note.publishedAt) || Date.now()).toISOString()}">${escapeHtml(formatDate(note.publishedAt))}</time>
          </header>
          <h2>${escapeHtml(note.title || "Atualização")}</h2>
          <p>${formatBody(note.body || "")}</p>
        </article>`).join("") : '<div class="news-state">Nenhuma nota de atualização foi publicada ainda.</div>';
    } catch (error) {
      console.warn(error);
      feed.innerHTML = '<div class="news-state error">Não foi possível carregar as notícias agora. Tente novamente em alguns instantes.</div>';
    }
  }

  render();
})();
