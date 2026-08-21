"use strict";

(() => {
  // Tutorial propositalmente isolado: nenhum Firebase, localStorage, cookie ou
  // objeto do GameEngine é lido ou alterado. Todo o estado existe só em memória.
  const initialState = () => ({
    coins: 120, stock: 0, research: 0, xp: 0, cropOwned: false, soldOnce: false,
    orderDone: false, contractAccepted: false, contractDelivered: 0, contractClaimed: false,
    researchDone: false, prestigeSeen: false
  });
  let state = initialState();

  const $ = id => document.getElementById(id);
  const dom = {
    coins: $("tutorialCoins"), stock: $("tutorialStock"), research: $("tutorialResearch"), xp: $("tutorialXP"),
    objective: $("tutorialObjective"), hint: $("tutorialHint"), message: $("tutorialMessage"), reset: $("tutorialReset"),
    buy: $("tutorialBuy"), produce: $("tutorialProduce"), sell: $("tutorialSell"), order: $("tutorialOrder"),
    orderProgress: $("tutorialOrderProgress"), contractAccept: $("tutorialContractAccept"),
    contractProduce: $("tutorialContractProduce"), contractClaim: $("tutorialContractClaim"),
    contractProgress: $("tutorialContractProgress"), researchBuy: $("tutorialResearchBuy"), prestige: $("tutorialPrestige")
  };

  const steps = [...document.querySelectorAll(".tutorial-step")];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function currentStep() {
    if (!state.cropOwned) return 1;
    if (state.stock < 8 && !state.soldOnce) return 2;
    if (!state.soldOnce) return 3;
    if (!state.orderDone) return 4;
    if (!state.contractClaimed) return 5;
    if (!state.researchDone) return 6;
    return 7;
  }

  const copy = {
    1: ["Compre sua primeira planta", "Use o botão Comprar. No jogo real, cada planta possui preço, nível de desbloqueio, produção e rendimento próprios."],
    2: ["Veja a produção chegar ao estoque", "Simule um ciclo de produção. O jogo real produz continuamente conforme o tempo de cada cultura."],
    3: ["Venda o que você produziu", "Venda o estoque para transformar produtos em moedas. No jogo real também existem venda automática e contratos."],
    4: ["Complete um pedido", "Produza até possuir 10 unidades e entregue o pedido. Pedidos reais usam etapas configuradas pelo jogo."],
    5: ["Aprenda como funcionam contratos", "Assine o contrato, produza as 15 unidades reservadas e depois colete a recompensa."],
    6: ["Invista seus pontos de pesquisa", "Use os pontos recebidos para comprar a pesquisa demonstrativa. Pesquisas reais melhoram sistemas da jornada."],
    7: ["Entenda quando prestigiar", "O prestígio inicia uma nova jornada em troca de pontos permanentes. Esta demonstração não reinicia nada de verdade."]
  };

  function setMessage(text, type = "") {
    dom.message.textContent = text;
    dom.message.dataset.type = type;
  }

  function render() {
    const step = currentStep();
    dom.coins.textContent = Math.floor(state.coins).toLocaleString("pt-BR");
    dom.stock.textContent = Math.floor(state.stock).toLocaleString("pt-BR");
    dom.research.textContent = Math.floor(state.research).toLocaleString("pt-BR");
    dom.xp.textContent = `${Math.floor(clamp(state.xp, 0, 100))}%`;
    dom.objective.textContent = copy[step][0];
    dom.hint.textContent = copy[step][1];

    steps.forEach(element => {
      const number = Number(element.dataset.step);
      element.classList.toggle("active", number === step);
      element.classList.toggle("done", number < step || (number === 7 && state.prestigeSeen));
    });

    dom.buy.disabled = state.cropOwned || state.coins < 40;
    dom.buy.textContent = state.cropOwned ? "Planta comprada" : "Comprar · 40 moedas";
    dom.produce.disabled = !state.cropOwned || state.stock >= 40;
    dom.sell.disabled = !state.cropOwned || state.stock <= 0 || (!state.soldOnce && step < 3);

    dom.orderProgress.textContent = state.orderDone ? "Pedido concluído" : `${Math.min(10, state.stock)}/10 disponíveis`;
    dom.order.disabled = state.orderDone || state.stock < 10 || step < 4;

    dom.contractAccept.disabled = step < 5 || state.contractAccepted || state.contractClaimed;
    dom.contractAccept.textContent = state.contractAccepted ? "Contrato assinado" : (state.contractClaimed ? "Contrato concluído" : "Assinar contrato");
    dom.contractProduce.disabled = !state.contractAccepted || state.contractClaimed || state.contractDelivered >= 15;
    dom.contractClaim.disabled = !state.contractAccepted || state.contractClaimed || state.contractDelivered < 15;
    dom.contractProgress.textContent = state.contractClaimed ? "Recompensa coletada" : state.contractAccepted ? `${state.contractDelivered}/15 entregues` : "Ainda não assinado";

    dom.researchBuy.disabled = step < 6 || state.researchDone || state.research < 2;
    dom.researchBuy.textContent = state.researchDone ? "Pesquisa concluída" : "Pesquisar · 2 pontos";
    dom.prestige.disabled = step < 7 || state.prestigeSeen;
    dom.prestige.textContent = state.prestigeSeen ? "Prestígio explicado" : "Simular explicação do prestígio";
  }

  dom.buy.addEventListener("click", () => {
    state.coins -= 40; state.cropOwned = true; state.xp += 4;
    setMessage("Ótimo. Agora a planta pode produzir. No jogo real, ela continuará gerando conforme seu tempo de produção.", "success"); render();
  });
  dom.produce.addEventListener("click", () => {
    state.stock = Math.min(40, state.stock + 8); state.xp += 2;
    setMessage("Ciclo concluído: 8 unidades foram para o estoque. Produza novamente sempre que precisar de mais itens.", "success"); render();
  });
  dom.sell.addEventListener("click", () => {
    const amount = state.stock; state.stock = 0; state.coins += amount * 3; state.soldOnce = true; state.xp += 4;
    setMessage(`Você vendeu ${amount} unidades. A venda manual é uma das formas de transformar produção em moedas.`, "success"); render();
  });
  dom.order.addEventListener("click", () => {
    state.stock -= 10; state.coins += 70; state.research += 1; state.xp += 12; state.orderDone = true;
    setMessage("Pedido entregue. Você recebeu moedas, pesquisa e experiência de treinamento.", "success"); render();
  });
  dom.contractAccept.addEventListener("click", () => {
    state.contractAccepted = true;
    setMessage("Contrato assinado. A produção destinada ao contrato não precisa entrar primeiro no estoque da simulação.", "success"); render();
  });
  dom.contractProduce.addEventListener("click", () => {
    state.contractDelivered = Math.min(15, state.contractDelivered + 5);
    setMessage(state.contractDelivered >= 15 ? "Quantidade do contrato concluída. Agora colete a recompensa." : "Produção reservada para o contrato entregue.", "success"); render();
  });
  dom.contractClaim.addEventListener("click", () => {
    state.contractClaimed = true; state.coins += 180; state.research += 2; state.xp += 18;
    setMessage("Recompensa coletada. No jogo real, o XP do contrato é concedido no momento da coleta.", "success"); render();
  });
  dom.researchBuy.addEventListener("click", () => {
    state.research -= 2; state.researchDone = true; state.xp += 8;
    setMessage("Pesquisa concluída. Evoluções reais podem alterar produção, estoque, XP e outros sistemas.", "success"); render();
  });
  dom.prestige.addEventListener("click", () => {
    state.prestigeSeen = true;
    setMessage("Tutorial concluído. No jogo real, leia o resumo de Prestigiar antes de confirmar um novo ciclo. Nada foi alterado na sua fazenda real.", "success"); render();
  });
  dom.reset.addEventListener("click", () => { state = initialState(); setMessage("Tutorial reiniciado. Nenhum dado real foi alterado."); render(); });

  render();
})();
