"use strict";

(() => {
  const crops = {
    leaf: { id:"leaf", name:"Folha", category:"Folhas e hortaliças", image:"assets/plants/folha.webp", cost:30, cycle:1.8, yield:2, sell:3, glow:"rgba(131,187,101,.20)" },
    tomato: { id:"tomato", name:"Tomate", category:"Frutas", image:"assets/plants/tomate.webp", cost:55, cycle:2.6, yield:3, sell:5, glow:"rgba(217,115,91,.18)" }
  };

  const orderStages = [
    { crop:"leaf", amount:8, coins:35, research:0, xp:20 },
    { crop:"tomato", amount:6, coins:55, research:0, xp:25 },
    { crop:"leaf", amount:14, coins:80, research:0, xp:30 }
  ];

  const initialState = () => ({
    coins:120,
    research:0,
    prestige:0,
    prestiges:0,
    xp:0,
    level:1,
    crops:{
      leaf:{owned:false,level:0,stock:0,progress:0},
      tomato:{owned:false,level:0,stock:0,progress:0}
    },
    orderStage:0,
    contract:{accepted:false,delivered:0,claimed:false},
    researchLevels:{germination:0,prices:0},
    legacy:false,
    prestigeReady:false,
    prestiged:false,
    tutorialComplete:false,
    unlocks:{tomato:false,orders:false,contracts:false,evolutions:false,prestige:false,legacy:false}
  });

  let state = initialState();
  let lastTick = performance.now();
  let lastRender = 0;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.max(0,Math.floor(Number(n)||0)).toLocaleString("pt-BR");
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const resource = (type,value,compact=false) => {
    const icons={coins:"assets/icons/moeda.webp",research:"assets/icons/pocao-pesquisa.webp",prestige:"assets/icons/prestigio.webp",xp:"assets/icons/xp.webp"};
    return `<span class="resource-amount resource-${type}${compact?" compact":""}"><img src="${icons[type]}" alt=""><b>${fmt(value)}</b></span>`;
  };

  const totalStock = () => state.crops.leaf.stock + state.crops.tomato.stock;
  const stockCapacity = 60;
  const TUTORIAL_MAX_CROP_LEVEL = 10;
  const researchSpeed = () => 1 + state.researchLevels.germination * .10;
  const sellMultiplier = () => 1 + state.researchLevels.prices * .15 + (state.legacy ? .10 : 0);
  const cropCycle = (c) => c.cycle / researchSpeed();

  const panelRequirement = {
    farm: () => true,
    orders: () => state.unlocks.orders,
    contracts: () => state.unlocks.contracts,
    evolutions: () => state.unlocks.evolutions || state.unlocks.legacy,
    prestige: () => state.unlocks.prestige
  };

  function showMilestone({ title, eyebrow="Marco alcançado", items=[], complete=false }) {
    const dialog = $("tutorialMilestoneDialog");
    if (!dialog) return;
    $("tutorialMilestoneTitle").textContent = title;
    $("tutorialMilestoneEyebrow").textContent = eyebrow;
    $("tutorialMilestoneList").innerHTML = items.map((item) => `
      <article class="milestone-preview-card${complete?" tutorial-complete-card":""}">
        <img src="${item.icon || "assets/icons/marco-nivel.webp"}" alt="">
        <div><strong>${item.title}</strong><span>${item.text}</span></div>
      </article>`).join("");
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute("open","");
  }

  function closeMilestone() {
    const dialog = $("tutorialMilestoneDialog");
    if (dialog?.open) dialog.close("confirm");
    else dialog?.removeAttribute("open");
  }

  function setMessage(text,type="") {
    const el=$("tutorialMessage");
    el.textContent=text;
    el.dataset.type=type;
  }

  function showPanel(name, { silent=false } = {}) {
    const allowed = panelRequirement[name]?.() ?? false;
    if (!allowed) {
      if (!silent) {
        const labels={orders:"Pedidos",contracts:"Contratos",evolutions:"Evoluções",prestige:"Prestígio"};
        setMessage(`${labels[name] || "Esta área"} ainda está bloqueada. Conclua o objetivo atual para continuar.`,"notice");
      }
      return false;
    }
    document.querySelectorAll("[data-tutorial-panel]").forEach((el)=>el.classList.toggle("active",el.dataset.tutorialPanel===name));
    document.querySelectorAll("[data-tutorial-tab]").forEach((el)=>el.classList.toggle("active",el.dataset.tutorialTab===name));
    return true;
  }

  function setLevel(level) {
    if (level <= state.level) return;
    state.level = level;
    state.xp = 0;

    if (level === 2) {
      state.unlocks.tomato = true;
      state.unlocks.orders = true;
      showMilestone({
        title:"Marco alcançado: nível 2",
        items:[
          { icon:"assets/plants/tomate.webp", title:"Tomate desbloqueado", text:"Uma nova cultura já pode ser comprada na Fazenda." },
          { icon:"assets/icons/pacote.webp", title:"Pedidos desbloqueados", text:"Entregue culturas em etapas para avançar no treinamento." }
        ]
      });
      setMessage("Nível 2 alcançado. Tomate e Pedidos foram desbloqueados.","success");
    } else if (level === 3) {
      state.unlocks.contracts = true;
      showMilestone({
        title:"Marco alcançado: nível 3",
        items:[{ icon:"assets/icons/contrato-comercial.webp", title:"Contratos desbloqueados", text:"Assine uma proposta e complete a entrega para receber moedas e pesquisa." }]
      });
      setMessage("Pedidos concluídos. Contratos foram desbloqueados.","success");
    } else if (level === 4) {
      state.unlocks.evolutions = true;
      showMilestone({
        title:"Marco alcançado: nível 4",
        items:[{ icon:"assets/icons/livros.webp", title:"Evoluções desbloqueadas", text:"Use os pontos de pesquisa recebidos no contrato para melhorar a fazenda." }]
      });
      setMessage("A recompensa do contrato liberou as Evoluções.","success");
    } else if (level === 40) {
      state.unlocks.prestige = true;
      showMilestone({
        title:"Marco alcançado: nível 40",
        items:[{ icon:"assets/icons/prestigio.webp", title:"Prestígio desbloqueado", text:"A jornada pode ser convertida em um ponto permanente de prestígio." }]
      });
      setMessage("Pesquisa concluída. A demonstração avançou ao nível 40 para apresentar o Prestígio.","notice");
    }
    renderAll();
  }

  function addXP(value) {
    if (state.prestigeReady || state.prestiged) return;
    state.xp += Math.max(0, Number(value) || 0);

    if (state.level === 1 && state.xp >= 100) {
      setLevel(2);
      return;
    }

    // A partir do nível 2, o tutorial segura o próximo nível até o objetivo
    // de Pedidos ser concluído para ensinar os sistemas na ordem correta.
    if (state.level === 2 && state.orderStage < orderStages.length) {
      state.xp = Math.min(state.xp, 99);
    }
  }

  function currentStep() {
    if (state.tutorialComplete) return 6;
    if (state.level < 2) return 1;
    if (state.orderStage < orderStages.length) return 2;
    if (!state.contract.claimed) return 3;
    if (!state.researchLevels.germination && !state.researchLevels.prices) return 4;
    if (!state.prestiged) return 5;
    return 6;
  }

  const copy={
    1:["Produza Folha e alcance o nível 2","No começo somente a Folha está disponível. Cada ciclo rende XP. Ao subir de nível, o primeiro marco libera Tomate e Pedidos."],
    2:["Complete as três etapas de Pedidos","O Tomate já está liberado. Produza o que cada etapa pede e entregue o estoque para avançar."],
    3:["Assine e conclua o contrato","O contrato comercial dá moedas e, principalmente, os pontos de pesquisa necessários para continuar."],
    4:["Invista a pesquisa em uma Evolução","Escolha uma pesquisa. Depois dela, a demonstração apresenta o desbloqueio do Prestígio."],
    5:["Faça seu primeiro Prestígio","Converta esta jornada de treinamento em 1 ponto permanente."],
    6:[state.tutorialComplete?"Tutorial concluído":"Compre seu primeiro Legado",state.tutorialComplete?"Você percorreu o ciclo principal da Fazenda Serena. Agora pode começar sua fazenda de verdade.":"Use o ponto de prestígio para desenvolver Colheita experiente e encerrar o tutorial."]
  };

  function cropMarkup(crop) {
    const d=state.crops[crop.id];
    const levelLocked = crop.id === "tomato" && !state.unlocks.tomato;

    if (levelLocked) {
      return `<article class="crop-card locked tutorial-crop-level-locked" data-tutorial-crop="${crop.id}" style="--crop-glow:${crop.glow}"><div class="crop-level-strip locked-level-strip"><span class="crop-level-compact">Nível <strong>0</strong><small>/ ${TUTORIAL_MAX_CROP_LEVEL}</small></span></div><div class="crop-head"><div class="crop-art locked-art tutorial-level-lock"><img src="assets/icons/cadeado.webp" alt="Bloqueado"></div><div class="crop-info"><div class="crop-title-row"><h3>${crop.name}</h3></div><div class="crop-meta-row"><span class="crop-category-list">${crop.category}</span></div></div></div><button class="button secondary full crop-buy-button" type="button" disabled>Disponível no nível 2</button></article>`;
    }

    if(!d.owned){
      const afford=state.coins>=crop.cost;
      return `<article class="crop-card locked ${afford?"":"insufficient"}" data-tutorial-crop="${crop.id}" style="--crop-glow:${crop.glow}"><div class="crop-level-strip locked-level-strip"><span class="crop-level-compact">Nível <strong>0</strong><small>/ ${TUTORIAL_MAX_CROP_LEVEL}</small></span></div><div class="crop-head"><div class="crop-art locked-art crop-preview-unlocked"><img src="${crop.image}" alt="${crop.name}"></div><div class="crop-info"><div class="crop-title-row"><h3>${crop.name}</h3></div><div class="crop-meta-row"><span class="crop-category-list">${crop.category}</span></div></div></div><button class="button primary full crop-buy-button" type="button" data-buy-crop="${crop.id}" ${afford?"":"disabled"}>Comprar ${resource("coins",crop.cost,true)}</button></article>`;
    }

    const cycle=cropCycle(crop), remaining=Math.max(0,(1-d.progress)*cycle);
    const cropMaxed = d.level >= TUTORIAL_MAX_CROP_LEVEL;
    const upgradeDisabled = cropMaxed || state.coins < 20;
    const upgradeLabel = cropMaxed ? "Nível máximo do tutorial" : `Aprimorar ${resource("coins",20,true)}`;
    return `<article class="crop-card ${cropMaxed ? "tutorial-crop-maxed" : ""}" data-tutorial-crop="${crop.id}" style="--crop-glow:${crop.glow}"><div class="crop-level-strip"><span class="crop-level-compact">Nível <strong>${d.level}</strong><small>/ ${TUTORIAL_MAX_CROP_LEVEL}</small></span></div><div class="crop-head"><div class="crop-art-progress" style="--growth-progress:${Math.floor(d.progress*100)}%"><div class="crop-art"><img src="${crop.image}" alt="${crop.name}"></div><span class="crop-progress-percent">${Math.floor(d.progress*100)}%</span></div><div class="crop-info"><div class="crop-title-row"><h3>${crop.name}</h3></div><div class="crop-meta-row"><span class="crop-category-list">${crop.category}</span></div><div class="crop-quick-stats"><span title="Tempo restante"><i class="crop-time-icon"><img src="assets/icons/relogio.webp" alt=""></i><b>${remaining.toFixed(1).replace(".",",")}s</b></span><span title="Produção por ciclo"><b>+${crop.yield}</b></span></div></div></div><div class="crop-upgrade-panel crop-upgrade-redesign"><div class="upgrade-mode-selector" role="group"><button class="upgrade-mode-option active" type="button">+1</button><button class="upgrade-mode-option" type="button" disabled>Max</button></div><div class="crop-upgrade-summary"><strong>${cropMaxed ? "Limite do tutorial alcançado" : "Produção automática"}</strong></div><button class="button primary full crop-upgrade-cta" type="button" data-upgrade-crop="${crop.id}" ${upgradeDisabled?"disabled":""}>${upgradeLabel}</button></div></article>`;
  }

  function renderCrops(){
    $("tutorialCropGrid").innerHTML=cropMarkup(crops.leaf)+cropMarkup(crops.tomato);
    $("tutorialStockTotal").textContent=fmt(totalStock());
    $("tutorialStockBreakdown").textContent=`Folha ${fmt(state.crops.leaf.stock)} · Tomate ${fmt(state.crops.tomato.stock)}`;
    $("tutorialSell").disabled=totalStock()<=0;
  }

  function updateCropsLive(){
    for(const [id,crop] of Object.entries(crops)){
      const d=state.crops[id];
      if(!d.owned) continue;
      const card=document.querySelector(`[data-tutorial-crop="${id}"]`);
      if(!card) continue;
      const art=card.querySelector(".crop-art-progress");
      const percent=card.querySelector(".crop-progress-percent");
      const time=card.querySelector(".crop-quick-stats span:first-child b");
      const pct=Math.floor(d.progress*100);
      if(art) art.style.setProperty("--growth-progress",`${pct}%`);
      if(percent) percent.textContent=`${pct}%`;
      if(time) time.textContent=`${Math.max(0,(1-d.progress)*cropCycle(crop)).toFixed(1).replace(".",",")}s`;
    }
    $("tutorialStockTotal").textContent=fmt(totalStock());
    $("tutorialStockBreakdown").textContent=`Folha ${fmt(state.crops.leaf.stock)} · Tomate ${fmt(state.crops.tomato.stock)}`;
    $("tutorialSell").disabled=totalStock()<=0;
  }

  function orderMarkup(){
    if(!state.unlocks.orders) return `<article class="order-card normalized-order-card"><div class="order-head"><div class="contract-crop"><img src="assets/icons/cadeado.webp" alt=""><div><small>Bloqueado</small><h3>Pedidos</h3></div></div></div><p>Alcance o nível 2 para liberar Pedidos e o Tomate.</p></article>`;
    if(state.orderStage>=orderStages.length) return `<article class="order-card order-complete compact-completed-order"><div class="completed-order-identity"><img src="assets/icons/pacote.webp" alt=""><div><small>Série completa</small><h3>Pedidos de treinamento</h3><p>3 etapas concluídas</p></div></div><strong class="completed-order-status">Pedido finalizado</strong></article>`;
    const o=orderStages[state.orderStage], c=crops[o.crop], available=Math.min(state.crops[o.crop].stock,o.amount), pct=clamp(available/o.amount*100,0,100), ready=available>=o.amount;
    return `<article class="order-card normalized-order-card ${ready?"order-ready-to-deliver":""}"><div class="order-head"><div class="contract-crop"><img src="${c.image}" alt="${c.name}"><div><small>Etapa ${state.orderStage+1} de ${orderStages.length}</small><h3>${c.name}</h3></div></div></div><p>${ready?"Lote completo disponível no estoque. Entregue para avançar.":`Reúna ${o.amount} unidades no estoque. Faltam ${Math.max(0,o.amount-available)}.`}</p><div class="order-progress"><div class="progress-label"><span>Disponível no estoque</span><strong>${available} / ${o.amount}</strong></div><div class="progress-track growth"><span style="width:${pct}%"></span></div></div><div class="contract-reward-unified"><span>Recompensa</span><strong class="resource-reward-group">${resource("coins",o.coins)}${resource("xp",o.xp)}</strong></div><button class="button ${ready?"primary":"secondary"} full" type="button" data-deliver-order ${ready?"":"disabled"}>Entregar pedido</button></article>`;
  }

  function renderOrders(){ $("tutorialOrderList").innerHTML=orderMarkup(); }

  function updateOrderLive(){
    if(!state.unlocks.orders || state.orderStage>=orderStages.length) return;
    const card=$("tutorialOrderList")?.querySelector(".order-card");
    if(!card) return;
    const o=orderStages[state.orderStage], available=Math.min(state.crops[o.crop].stock,o.amount), ready=available>=o.amount, pct=clamp(available/o.amount*100,0,100);
    const body=card.querySelector(":scope > p");
    const count=card.querySelector(".progress-label strong");
    const bar=card.querySelector(".progress-track span");
    const button=card.querySelector("[data-deliver-order]");
    card.classList.toggle("order-ready-to-deliver",ready);
    if(body) body.textContent=ready?"Lote completo disponível no estoque. Entregue para avançar.":`Reúna ${o.amount} unidades no estoque. Faltam ${Math.max(0,o.amount-available)}.`;
    if(count) count.textContent=`${available} / ${o.amount}`;
    if(bar) bar.style.width=`${pct}%`;
    if(button){ button.disabled=!ready; button.classList.toggle("primary",ready); button.classList.toggle("secondary",!ready); }
  }

  function contractMarkup(){
    const c=state.contract, stock=state.crops.leaf.stock;
    if(!state.unlocks.contracts) return `<article class="contract-card contract-card-v2"><div class="contract-main-v2"><img src="assets/icons/cadeado.webp" alt=""><div><span class="contract-type-label"><i></i>Bloqueado</span><h3>Contratos</h3><div class="contract-main-meta"><span>Conclua as três etapas de Pedidos.</span></div></div></div></article>`;
    if(!c.accepted&&!c.claimed) return `<article class="contract-card contract-card-v2 contract-offer-card" style="--contract-type-color:#7aa668"><header class="contract-card-header-v2"><div class="contract-company-v2"><span><img src="assets/icons/contrato-comercial.webp" alt=""></span><div><small>Parceiro comercial</small><strong>Mercado Escola</strong></div></div><span class="contract-time-v2"><img src="assets/icons/relogio.webp" alt="">02:00</span></header><div class="contract-main-v2"><img src="assets/plants/folha.webp" alt="Folha"><div><span class="contract-type-label"><i></i>Comercial</span><h3>12 <span>Folha</span></h3><div class="contract-main-meta"><span>Estoque</span><span class="contract-stock-chip"><img src="assets/icons/galpao-industrial.webp" alt=""><b>${fmt(stock)}</b></span></div></div></div><div class="contract-delivery-time-v3"><span><img src="assets/icons/relogio.webp" alt="">Tempo para concluir</span><strong>02:00</strong></div><div class="contract-reward-strip"><span>Recompensa</span><strong>${resource("coins",120)}${resource("research",3)}${resource("xp",20)}</strong></div><footer class="contract-offer-actions-v2"><button class="button primary" type="button" data-contract-accept>Assinar</button><button class="button secondary contract-decline-button-v2" type="button" disabled>Recusar</button></footer></article>`;
    if(c.claimed) return `<article class="contract-card contract-card-v2 contract-completed-card" style="--contract-type-color:#7aa668"><header class="contract-card-header-v2"><div class="contract-company-v2"><span><img src="assets/icons/contrato-comercial.webp" alt=""></span><div><small>Parceiro comercial</small><strong>Mercado Escola</strong></div></div><span class="contract-time-v2">Concluído</span></header><div class="contract-main-v2"><img src="assets/plants/folha.webp" alt="Folha"><div><span class="contract-type-label"><i></i>Comercial</span><h3>12 <span>Folha</span></h3></div></div><div class="contract-reward-strip"><span>Recompensa recebida</span><strong>${resource("coins",120)}${resource("research",3)}${resource("xp",20)}</strong></div></article>`;
    const pct=clamp(c.delivered/12*100,0,100), done=c.delivered>=12;
    return `<article class="contract-card contract-card-v2 ${done?"contract-completed-card":""}" style="--contract-type-color:#7aa668"><header class="contract-card-header-v2"><div class="contract-company-v2"><span><img src="assets/icons/contrato-comercial.webp" alt=""></span><div><small>Parceiro comercial</small><strong>Mercado Escola</strong></div></div><span class="contract-time-v2"><img src="assets/icons/relogio.webp" alt="">02:00</span></header><div class="contract-main-v2"><img src="assets/plants/folha.webp" alt="Folha"><div><span class="contract-type-label"><i></i>Comercial</span><h3>12 <span>Folha</span></h3><div class="contract-main-meta"><span>A produção da Folha vai direto para a entrega.</span></div></div></div><div class="contract-progress-v2"><div><span>Entregue</span><strong>${c.delivered} / 12</strong></div><div class="progress-track"><span style="width:${pct}%"></span></div></div><div class="contract-reward-strip"><span>Recompensa</span><strong>${resource("coins",120)}${resource("research",3)}${resource("xp",20)}</strong></div>${done?'<footer class="contract-card-footer-v2 contract-full-action-footer"><button class="button gold contract-full-action contract-claim-action" type="button" data-contract-claim>Receber recompensa</button></footer>':'<footer class="contract-card-footer-v2"><button class="button secondary" type="button" disabled>Produzindo para o contrato...</button></footer>'}</article>`;
  }

  function renderContract(){ $("tutorialContractList").innerHTML=contractMarkup(); }

  function updateContractLive(){
    const root=$("tutorialContractList");
    if(!root || !state.unlocks.contracts) return;
    const c=state.contract;
    if(!c.accepted&&!c.claimed){
      const stock=root.querySelector(".contract-stock-chip b");
      if(stock) stock.textContent=fmt(state.crops.leaf.stock);
      return;
    }
    if(c.claimed) return;
    const progress=root.querySelector(".contract-progress-v2");
    if(!progress) return;
    const count=progress.querySelector("strong");
    const bar=progress.querySelector(".progress-track span");
    if(count) count.textContent=`${c.delivered} / 12`;
    if(bar) bar.style.width=`${clamp(c.delivered/12*100,0,100)}%`;
    if(c.delivered>=12 && !root.querySelector("[data-contract-claim]")) renderContract();
  }

  function renderResearch(){
    [["germination",3],["prices",3]].forEach(([id,max])=>{
      const card=document.querySelector(`[data-research-card="${id}"]`), level=state.researchLevels[id];
      if(!card)return;
      card.querySelector(".upgrade-level-badge strong").textContent=level>=max?"Máximo":`Nível ${level}/${max}`;
      card.classList.toggle("evolution-upgrade-completed",level>=max);
      const btn=card.querySelector(`[data-buy-research="${id}"]`);
      btn.disabled=!state.unlocks.evolutions||level>=max||state.research<2||!state.contract.claimed;
      btn.innerHTML=level>=max?"Concluído":`Pesquisar ${resource("research",2,true)}`;
    });

    const legacy=document.querySelector("[data-legacy-card]");
    if(legacy){
      legacy.querySelector(".upgrade-level-badge strong").textContent=state.legacy?"Máximo":"Nível 0/1";
      legacy.classList.toggle("evolution-upgrade-completed",state.legacy);
      const btn=legacy.querySelector("[data-buy-legacy]");
      btn.disabled=!state.unlocks.legacy||state.legacy||state.prestige<1;
      btn.innerHTML=state.legacy?"Concluído":`Desenvolver ${resource("prestige",1,true)}`;
    }
  }

  function renderPrestige(){
    const ready=state.prestigeReady||state.prestiged, owned=Object.values(state.crops).filter((c)=>c.owned).length, avg=Math.floor(Object.values(state.crops).reduce((a,c)=>a+c.level,0)/2), gain=state.prestiged?0:1, root=$("tutorialPrestigeDashboard");
    root.classList.toggle("prestige-locked",!ready);
    root.innerHTML=`<div class="prestige-rework-gain"><span class="prestige-rework-kicker">${ready?"Prestígio desta jornada":"Disponível no nível 40"}</span><div class="prestige-rework-icon"><img src="assets/icons/prestigio.webp" alt=""></div><strong>${resource("prestige",ready?gain:0)}</strong>${ready&&!state.prestiged?'<small>Converta a jornada de demonstração em um ponto permanente.</small>':''}<div class="prestige-rework-details"><article><small>Níveis úteis</small><strong>${ready?"1":"0"} / 960</strong></article><article><small>Culturas</small><strong>${owned} / 2</strong></article><article><small>Nível médio</small><strong>${avg} / ${TUTORIAL_MAX_CROP_LEVEL}</strong></article><article><small>Platinadas</small><strong>0 / 2</strong></article></div></div>${ready&&!state.prestiged?'<footer class="prestige-rework-footer"><p>Converta a jornada atual em pontos permanentes. A fazenda recomeça; seus legados continuam.</p><button class="button prestige-rework-action" type="button" data-prestige-action>Prestigiar</button></footer>':state.prestiged?'<footer class="prestige-rework-footer"><p>Prestígio concluído. O ponto recebido já pode ser usado em um legado permanente.</p><button class="button prestige-rework-action" type="button" data-go-evolutions>Ver legados</button></footer>':''}`;
  }

  function renderHeader(){
    $("tutorialCoins").textContent=fmt(state.coins);
    $("tutorialResearch").textContent=fmt(state.research);
    $("tutorialPrestigePoints").textContent=fmt(state.prestige);
    $("tutorialLevel").textContent=state.level;
    const xpInLevel=state.level>=40?100:clamp(state.xp,0,100);
    $("tutorialXPText").textContent=state.level>=40?"Nível de prestígio alcançado":`${fmt(xpInLevel)} / 100`;
    $("tutorialXPBar").style.width=`${xpInLevel}%`;
    $("tutorialXPProgress").setAttribute("aria-valuenow",String(xpInLevel));
  }

  function renderLocks(){
    const unlocked={farm:true,orders:state.unlocks.orders,contracts:state.unlocks.contracts,evolutions:state.unlocks.evolutions||state.unlocks.legacy,prestige:state.unlocks.prestige};
    document.querySelectorAll(".tutorial-game-nav [data-tutorial-tab]").forEach((tab)=>{
      const name=tab.dataset.tutorialTab;
      const isLocked=!unlocked[name];
      tab.dataset.featureLocked=isLocked?"true":"false";
      tab.setAttribute("aria-disabled",isLocked?"true":"false");
      const img=tab.querySelector("img");
      if(img){
        const original=img.dataset.unlockedIcon || img.src.split(location.host).pop().replace(/^\//,"");
        if(!img.dataset.unlockedIcon && name!=="farm") img.dataset.unlockedIcon=original;
        if(name!=="farm") img.src=isLocked?"assets/icons/cadeado.webp":img.dataset.unlockedIcon;
      }
    });
  }

  function renderGuide(){
    const step=currentStep();
    let [title,hint]=copy[step];
    if(step===6 && state.tutorialComplete){
      title="Tutorial concluído";
      hint="Você percorreu o ciclo principal da Fazenda Serena. Agora pode começar sua fazenda de verdade.";
    }
    $("tutorialObjective").textContent=title;
    $("tutorialHint").textContent=hint;
    const stepAllowed={1:true,2:state.unlocks.orders,3:state.unlocks.contracts,4:state.unlocks.evolutions,5:state.unlocks.prestige,6:state.unlocks.legacy};
    document.querySelectorAll(".tutorial-step").forEach((el)=>{
      const n=Number(el.dataset.step);
      el.classList.toggle("active",n===step&&!state.tutorialComplete);
      el.classList.toggle("done",n<step||(n===6&&state.tutorialComplete));
      el.classList.toggle("is-locked",!stepAllowed[n]);
      el.setAttribute("aria-disabled",stepAllowed[n]?"false":"true");
    });
  }

  function renderAll(){ renderHeader();renderCrops();renderOrders();renderContract();renderResearch();renderPrestige();renderLocks();renderGuide(); }
  function updateLive(){ renderHeader();updateCropsLive();updateOrderLive();updateContractLive();renderGuide(); }

  $("tutorialMilestoneClose")?.addEventListener("click", closeMilestone);

  document.addEventListener("click",(e)=>{
    const tab=e.target.closest("[data-tutorial-tab]");
    if(tab){ e.preventDefault(); showPanel(tab.dataset.tutorialTab); return; }

    const step=e.target.closest("[data-jump]");
    if(step){
      const n=Number(step.dataset.step);
      if(step.classList.contains("is-locked")){ setMessage("Essa etapa ainda está bloqueada. Siga o objetivo atual.","notice"); return; }
      showPanel(step.dataset.jump); return;
    }

    const buy=e.target.closest("[data-buy-crop]");
    if(buy){
      const id=buy.dataset.buyCrop,c=crops[id],d=state.crops[id];
      if(id==="tomato"&&!state.unlocks.tomato) return;
      if(!d.owned&&state.coins>=c.cost){ state.coins-=c.cost;d.owned=true;d.level=1;addXP(10);setMessage(`${c.name} comprada. A produção começou automaticamente.`,"success");renderAll(); }
      return;
    }

    const up=e.target.closest("[data-upgrade-crop]");
    if(up){
      const d=state.crops[up.dataset.upgradeCrop];
      if(d.owned && d.level < TUTORIAL_MAX_CROP_LEVEL && state.coins>=20){
        state.coins-=20;
        d.level=Math.min(TUTORIAL_MAX_CROP_LEVEL,d.level+1);
        addXP(5);
        setMessage(d.level >= TUTORIAL_MAX_CROP_LEVEL ? "Nível 10 alcançado. Este é o limite das plantas dentro do tutorial." : "Plantação aprimorada. No jogo, os níveis aumentam a eficiência da cultura.","success");
        renderAll();
      }
      return;
    }

    if(e.target.closest("#tutorialSell")){
      let earned=0;
      for(const [id,c] of Object.entries(crops)){ earned+=state.crops[id].stock*c.sell;state.crops[id].stock=0; }
      earned=Math.floor(earned*sellMultiplier());
      if(earned>0){ state.coins+=earned;addXP(8);setMessage(`Estoque vendido por ${fmt(earned)} moedas.`,"success");renderAll(); }
      return;
    }

    if(e.target.closest("[data-deliver-order]")){
      const o=orderStages[state.orderStage];
      if(state.unlocks.orders&&o&&state.crops[o.crop].stock>=o.amount){
        state.crops[o.crop].stock-=o.amount;state.coins+=o.coins;addXP(o.xp);state.orderStage+=1;
        if(state.orderStage>=orderStages.length){
          setLevel(3);
        } else {
          setMessage(`Etapa ${state.orderStage} concluída. A próxima entrega já está disponível.`,"success");
          renderAll();
        }
      }
      return;
    }

    if(e.target.closest("[data-contract-accept]")){
      if(state.unlocks.contracts){ state.contract.accepted=true;setMessage("Contrato assinado. A produção de Folha agora será enviada primeiro para o contrato.","success");renderAll(); }
      return;
    }

    if(e.target.closest("[data-contract-claim]")){
      if(state.contract.delivered>=12&&!state.contract.claimed){
        state.contract.claimed=true;state.coins+=120;state.research+=3;addXP(20);setLevel(4);
      }
      return;
    }

    const research=e.target.closest("[data-buy-research]");
    if(research){
      const id=research.dataset.buyResearch;
      if(state.unlocks.evolutions&&state.research>=2&&state.researchLevels[id]<3&&state.contract.claimed){
        state.research-=2;state.researchLevels[id]+=1;state.prestigeReady=true;setLevel(40);
      }
      return;
    }

    if(e.target.closest("[data-prestige-action]")){
      if(state.unlocks.prestige&&state.prestigeReady&&!state.prestiged){
        state.prestiged=true;state.prestiges+=1;state.prestige+=1;state.unlocks.legacy=true;state.coins=120;state.research=0;state.xp=0;state.level=1;
        for(const d of Object.values(state.crops)){ d.owned=false;d.level=0;d.stock=0;d.progress=0; }
        showMilestone({ title:"Novo legado disponível", eyebrow:"Prestígio concluído", items:[{icon:"assets/icons/prestigio.webp",title:"1 ponto de prestígio recebido",text:"Use esse ponto em Evoluções para comprar um benefício permanente."}] });
        setMessage("Prestígio concluído. Abra Evoluções e compre seu primeiro Legado.","success");
        renderAll();
      }
      return;
    }

    if(e.target.closest("[data-go-evolutions]")){ showPanel("evolutions"); return; }

    if(e.target.closest("[data-buy-legacy]")){
      if(state.unlocks.legacy&&state.prestige>=1&&!state.legacy){
        state.prestige-=1;state.legacy=true;state.tutorialComplete=true;
        showMilestone({
          title:"Tutorial concluído",
          eyebrow:"Sua primeira jornada está pronta",
          complete:true,
          items:[
            {icon:"assets/icons/prestigio.webp",title:"Colheita experiente desenvolvida",text:"Você aprendeu como pontos de prestígio se transformam em benefícios permanentes."},
            {icon:"assets/logo.webp",title:"Hora de começar sua fazenda",text:"O treinamento terminou. Seu progresso real continua separado desta demonstração."}
          ]
        });
        setMessage("Tutorial concluído. Você percorreu cultivo, pedidos, contratos, pesquisa, prestígio e legado.","success");
        renderAll();
      }
      return;
    }
  });

  $("tutorialReset").addEventListener("click",()=>{
    state=initialState();lastTick=performance.now();showPanel("farm",{silent:true});setMessage("Tutorial reiniciado. Seu progresso real continua intacto.");renderAll();
  });

  function tick(now){
    const dt=Math.min(.2,(now-lastTick)/1000);lastTick=now;
    for(const [id,c] of Object.entries(crops)){
      const d=state.crops[id];if(!d.owned)continue;
      d.progress+=dt/cropCycle(c);
      while(d.progress>=1){
        d.progress-=1;
        const amount=c.yield+Math.floor((d.level-1)/5);
        if(id==="leaf"&&state.contract.accepted&&!state.contract.claimed&&state.contract.delivered<12){
          const needed=12-state.contract.delivered,delivered=Math.min(needed,amount);
          state.contract.delivered+=delivered;
          const rest=amount-delivered;
          if(rest>0&&totalStock()<stockCapacity)d.stock+=Math.min(rest,stockCapacity-totalStock());
        } else if(totalStock()<stockCapacity) {
          d.stock+=Math.min(amount,stockCapacity-totalStock());
        }
        addXP(state.level===1?25:2);
      }
    }
    if(now-lastRender>=100){lastRender=now;updateLive();}
    requestAnimationFrame(tick);
  }

  renderAll();showPanel("farm",{silent:true});
  window.__FazendaSerenaTutorial={
    getState:()=>JSON.parse(JSON.stringify(state)),
    addStock:(id,amount)=>{ if(state.crops[id]){state.crops[id].stock=Math.min(stockCapacity,state.crops[id].stock+Math.max(0,Number(amount)||0));updateLive();} },
    setOrderReady:()=>{const o=orderStages[state.orderStage];if(o){state.crops[o.crop].stock=Math.max(state.crops[o.crop].stock,o.amount);updateLive();}},
    setContractReady:()=>{state.contract.delivered=12;updateContractLive();},
    showPanel,
    closeMilestone
  };
  requestAnimationFrame(tick);
})();
