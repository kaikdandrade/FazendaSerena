"use strict";

window.GameData = (() => {
 // Catálogos de conteúdo administráveis. Desde esta, categorias e
  // culturas não possuem fallback local: são preenchidas exclusivamente pela
  // configuração pública publicada no Firestore pelo painel administrativo.
  const categories = {};
  const crops = [];

  // As evoluções da jornada são exclusivamente pesquisas.
  const upgrades = [];

  const research = [
    { id: "acceleratedGermination", name: "Germinação acelerada", icon: "assets/icons/fertilizante.webp", desc: "+7% de velocidade para todas as safras.", max: 10, baseCost: 5, growth: 1.72 },
    { id: "hybridGenetics", name: "Genética híbrida", icon: "assets/icons/dna.webp", desc: "+8% de rendimento nas safras.", max: 10, baseCost: 6, growth: 1.74 },
    { id: "priceForecast", name: "Previsão de preços", icon: "assets/icons/estimativa-preco.webp", desc: "+6% no valor das safras.", max: 10, baseCost: 7, growth: 1.76 },
    { id: "smartSeedCatalog", name: "Catálogo inteligente", icon: "assets/icons/livros.webp", desc: "−4% no custo de compra das culturas.", max: 10, baseCost: 9, growth: 1.80 },
    { id: "cultivationAlgorithms", name: "Algoritmos de cultivo", icon: "assets/icons/mapa.webp", desc: "−4% no custo dos níveis das plantações.", max: 10, baseCost: 10, growth: 1.82 },
    { id: "negotiationModels", name: "Modelos de negociação", icon: "assets/icons/precificacao.webp", desc: "+8% de ganhos nas recompensas oferecidas por contratos.", max: 10, baseCost: 12, growth: 1.84 },
    { id: "logisticsSimulation", name: "Simulação logística", icon: "assets/icons/relogio.webp", desc: "+6% de redução no tempo para concluir contratos.", max: 10, baseCost: 14, growth: 1.86 },
    { id: "agriculturalPedagogy", name: "Pedagogia agrícola", icon: "assets/icons/chapeu-formatura.webp", desc: "+7% de experiência da fazenda ganha.", max: 10, baseCost: 15, growth: 1.88 },
    { id: "continuousLearning", name: "Aprendizado contínuo", icon: "assets/icons/relogio.webp", desc: "+0,01% de progresso para gerar 1 XP por segundo jogado por nível.", max: 10, baseCost: 5, growth: 1.50 },
    { id: "contractPortfolio", name: "Portfólio de contratos", icon: "assets/icons/contrato-comercial.webp", desc: "+1 slot de contrato ativo por nível. Possui somente 2 níveis.", max: 2, baseCost: 320, growth: 4.50 }
  ];

  const prestigeUpgrades = [
    { id: "royalTreasury", name: "Tesouro da dinastia", icon: "assets/icons/coroa.webp", desc: "+5K moedas no capital inicial de cada nova jornada por nível.", max: 10, baseCost: 2, growth: 2.00 },
    { id: "eternalHarvest", name: "Colheita eterna", icon: "assets/icons/caixa-colheita.webp", desc: "+12% de velocidade e +10% de rendimento permanentes por nível.", max: 12, baseCost: 3, growth: 2.05 },
    { id: "goldenExchange", name: "Bolsa dourada", icon: "assets/icons/moeda.webp", desc: "+15% no valor das safras permanentemente por nível.", max: 10, baseCost: 4, growth: 2.10 },
    { id: "ancestralMastery", name: "Domínio ancestral", icon: "assets/icons/muda-vaso.webp", desc: "−8% no custo das culturas e −6% nos níveis das plantações por nível.", max: 8, baseCost: 5, growth: 2.15 },
    { id: "immortalAcademy", name: "Academia imortal", icon: "assets/icons/livros.webp", desc: "25% a mais de pesquisa recebida e 3 pontos iniciais permanentes por nível.", max: 8, baseCost: 6, growth: 2.18 },
    { id: "laboratoryFunding", name: "Financiamento de laboratórios", icon: "assets/icons/pocao-pesquisa.webp", desc: "Gera pesquisa passivamente. O 1º estágio adiciona 0,01% de progresso por segundo; o 2º e o 3º adicionam 0,02% cada, totalizando 0,05% por segundo.", max: 3, baseCost: 8, growth: 2.20, stageRates: [0.01, 0.02, 0.02] },
    { id: "prestigeResonance", name: "Ressonância de prestígio", icon: "assets/icons/prestigio.webp", desc: "20% a mais nos pontos obtidos em todos os próximos prestígios por nível.", max: 8, baseCost: 7, growth: 2.22 },
    { id: "sovereignNetwork", name: "Rede soberana", icon: "assets/icons/caminhao-entrega.webp", desc: "20% a mais nas moedas de contratos, +10% na redução do tempo para concluir contratos e +10% no valor das safras por nível.", max: 8, baseCost: 8, growth: 2.25 },
    { id: "experienceLegacy", name: "Legado da experiência", icon: "assets/icons/chapeu-formatura.webp", desc: "+0,05% de progresso para gerar 1 XP por segundo jogado permanentemente por nível.", max: 5, baseCost: 5, growth: 1.90 },
    { id: "contractEmpire", name: "Império contratual", icon: "assets/icons/contrato-comercial.webp", desc: "+1 slot permanente de contrato ativo por nível. Possui 3 níveis e permanece entre jornadas.", max: 3, baseCost: 90, growth: 3.00 }
  ];


  // Empresas/indústrias e tipos de contrato também são catálogos remotos.
  // Permanecem vazios até serem publicados no ADM.
  const companies = [];
  const contractTypes = [];
  const contractSlots = [];

  const missions = [];
  const playerTitles = [];

  return { categories, crops, upgrades, research, prestigeUpgrades, companies, contractTypes, contractSlots, missions, playerTitles };
})();
