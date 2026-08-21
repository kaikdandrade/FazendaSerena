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
      if(!notes.length){showFallbackStatus("Exibindo a nota oficial mais recente disponível no site.");return;}
      feed.innerHTML=notes.map((note,index)=>`
        <article class="news-card ${index===0?"latest":""}">
          <header><div><span class="news-version">v${escapeHtml(note.version||"Atualização")}</span>${index===0?'<span class="news-latest">mais recente</span>':""}</div>
          <time datetime="${new Date(Number(note.publishedAt)||Date.now()).toISOString()}">${escapeHtml(formatDate(note.publishedAt))}</time></header>
          <h2>${escapeHtml(note.title||"Atualização")}</h2><p>${formatBody(note.body||"")}</p>
        </article>`).join("");
    }catch(error){console.warn(error);showFallbackStatus("As notícias em nuvem não puderam ser atualizadas agora. A nota oficial continua disponível abaixo.");}
  }
  render();
})();