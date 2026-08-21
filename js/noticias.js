"use strict";
(() => {
  const feed = document.getElementById("newsFeed");
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const formatDate = timestamp => new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeStyle:"short"}).format(new Date(Number(timestamp)||Date.now()));
  const formatBody = value => escapeHtml(value).replace(/\r?\n/g,"<br>");
  function showFallbackStatus(message){
    if(!feed || feed.querySelector(".news-fallback-status")) return;
    const status=document.createElement("p");status.className="news-fallback-status";status.textContent=message;feed.prepend(status);
  }
  async function render(){
    if(!feed) return;
    try{
      const config=await window.FazendaSerenaPublicCloud.loadConfig({force:true});
      const notes=(config?.updateNotes||[]).slice().sort((a,b)=>Number(b?.publishedAt||0)-Number(a?.publishedAt||0));
      if(config) window.FazendaSerenaConfig?.applyCloudVersion?.(window.FazendaSerenaConfig.versionFromConfig(config));
      if(!notes.length) return;

      // A nota de lançamento 1.0.0 é parte permanente da página. Notas publicadas
      // pelo Admin entram acima dela, sem apagar o conteúdo editorial do release.
      feed.querySelectorAll("[data-cloud-news]").forEach(node=>node.remove());
      const staticVersion=String(feed.querySelector("[data-static-release]")?.dataset.staticRelease||"").trim();
      const cloudNotes=notes.filter(note=>String(note?.version||"").trim()!==staticVersion);
      if(!cloudNotes.length) return;
      feed.querySelector("[data-static-release]")?.classList.remove("latest");

      const fragment=document.createDocumentFragment();
      cloudNotes.forEach((note,index)=>{
        const article=document.createElement("article");
        article.className=`news-card ${index===0?"latest":""}`;
        article.dataset.cloudNews="true";
        article.innerHTML=`
          <header><div><span class="news-version">v${escapeHtml(note.version||"Atualização")}</span>${index===0?'<span class="news-latest">mais recente</span>':""}</div>
          <time datetime="${new Date(Number(note.publishedAt)||Date.now()).toISOString()}">${escapeHtml(formatDate(note.publishedAt))}</time></header>
          <h2>${escapeHtml(note.title||"Atualização")}</h2><p>${formatBody(note.body||"")}</p>`;
        fragment.appendChild(article);
      });
      feed.prepend(fragment);
    }catch(error){console.warn(error);showFallbackStatus("As notícias em nuvem não puderam ser atualizadas agora. A nota oficial continua disponível abaixo.");}
  }
  render();
})();
