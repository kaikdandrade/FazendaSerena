"use strict";

window.GameData = (() => {
  const categories = {
    leaf: "Folhas e hortaliças",
    root: "Raízes e tubérculos",
    fruit: "Frutos",
    tree: "Pomares",
    grain: "Grãos",
    tropical: "Tropicais",
    bush: "Arbustos",
    industry: "Culturas industriais"
  };

  const categoryGrowth = {
    root: 5,
    leaf: 6,
    fruit: 7,
    grain: 8,
    bush: 9,
    tropical: 10,
    industry: 11,
    tree: 12
  };

  const cropRows = [
    ["leaf", "Folha", "leaf", "folha"],
    ["lettuce", "Alface", "leaf", "alface"],
    ["spinach", "Espinafre", "leaf", "espinafre"],
    ["kale", "Couve", "leaf", "couve"],
    ["cabbage", "Repolho", "leaf", "repolho"],
    ["leek", "Alho-poró", "leaf", "alho_poro"],
    ["onion", "Cebola", "root", "cebola"],
    ["radish", "Rabanete", "root", "rabanete"],
    ["carrot", "Cenoura", "root", "cenoura"],
    ["beet", "Beterraba", "root", "beterraba"],
    ["garlic", "Alho", "root", "alho"],
    ["potato", "Batata", "root", "batata"],
    ["sweetPotato", "Batata-doce", "root", "batata_doce"],
    ["cucumber", "Pepino", "fruit", "pepino"],
    ["tomato", "Tomate", "fruit", "tomate"],
    ["bellPepper", "Pimentão", "fruit", "pimentao"],
    ["eggplant", "Berinjela", "fruit", "berinjela"],
    ["chili", "Pimenta", "fruit", "pimenta"],
    ["broccoli", "Brócolis", "leaf", "brocolis"],
    ["cauliflower", "Couve-flor", "leaf", "couve_flor"],
    ["pea", "Ervilha", "grain", "ervilha"],
    ["bean", "Feijão", "grain", "feijao"],
    ["corn", "Milho", "grain", "milho"],
    ["wheat", "Trigo", "grain", "trigo"],
    ["rice", "Arroz", "grain", "arroz"],
    ["oat", "Aveia", "grain", "aveia"],
    ["peanut", "Amendoim", "grain", "amendoim"],
    ["soy", "Soja", "grain", "soja"],
    ["pumpkin", "Abóbora", "fruit", "abobora"],
    ["melon", "Melão", "fruit", "melao"],
    ["watermelon", "Melancia", "fruit", "melancia"],
    ["strawberry", "Morango", "bush", "morango"],
    ["raspberry", "Framboesa", "bush", "framboesa"],
    ["blackberry", "Amora", "bush", "amora"],
    ["blueberry", "Mirtilo", "bush", "mirtilo"],
    ["apple", "Maçã", "tree", "maca"],
    ["pear", "Pera", "tree", "pera"],
    ["lemon", "Limão", "tree", "limao"],
    ["orange", "Laranja", "tree", "laranja"],
    ["tangerine", "Tangerina", "tree", "tangerina"],
    ["peach", "Pêssego", "tree", "pessego"],
    ["plum", "Ameixa", "tree", "ameixa"],
    ["cherry", "Cereja", "tree", "cereja"],
    ["fig", "Figo", "tree", "figo"],
    ["grape", "Uva", "tree", "uva"],
    ["olive", "Azeitona", "tree", "azeitona"],
    ["avocado", "Abacate", "tree", "abacate"],
    ["banana", "Banana", "tropical", "banana"],
    ["papaya", "Mamão", "tropical", "mamão"],
    ["pineapple", "Abacaxi", "tropical", "abacaxi"],
    ["mango", "Manga", "tropical", "manga"],
    ["guava", "Goiaba", "tropical", "goiaba"],
    ["passionFruit", "Maracujá", "tropical", "maracuja"],
    ["coconut", "Coco", "tropical", "coco"],
    ["cashew", "Caju", "tropical", "caju"],
    ["acerola", "Acerola", "tropical", "acerola"],
    ["starFruit", "Carambola", "tropical", "carambola"],
    ["kiwi", "Kiwi", "tree", "kiwi"],
    ["dragonFruit", "Pitaya", "tropical", "pitaya"],
    ["acai", "Açaí", "tropical", "acai"],
    ["guarana", "Guaraná", "industry", "guarana"],
    ["coffee", "Café", "industry", "cafe"],
    ["cocoa", "Cacau", "industry", "cacau"],
    ["cotton", "Algodão", "industry", "algodao"],
    ["cassava", "Mandioca", "root", "aipim"],
    ["yam", "Inhame", "root", "inhame"],
    ["ginger", "Gengibre", "root", "gengibre"],
    ["soursop", "Graviola", "tropical", "graviola"],
    ["cupuacu", "Cupuaçu", "tropical", "cupuacu"],
    ["tamarind", "Tamarindo", "tree", "tamarindo"],
    ["jackfruit", "Jaca", "tropical", "jaca"],
  ];

  const crops = cropRows.map(([id, name, category, imageFile], index) => ({
    id,
    name,
    category,
    image: `assets/plants/${imageFile}.png`,
    index,
    // A Folha abre a jornada. Depois dela, exatamente uma nova cultura é
    // liberada a cada cinco níveis da fazenda.
    unlockLevel: index === 0 ? 1 : index * 5,
    // A curva atravessa milhares, milhões, bilhões e trilhões. A cultura final
    // custa mais de seis trilhões antes dos descontos permanentes.
    cost: Math.max(100, Math.round(100 * Math.pow(1.46, index))),
    basePrice: Math.max(5, Math.round(5 * Math.pow(1.23, index))),
    baseGrowth: categoryGrowth[category] || 8,
    baseYield: 2
  }));

  const upgrades = [
    { id: "irrigationNetwork", name: "Rede de irrigação", icon: "assets/icons/irrigation.png", desc: "+6% de velocidade de safra para todas as culturas.", max: 15, baseCost: 900, growth: 1.78, currency: "coins" },
    { id: "harvestCrew", name: "Equipe de colheita", icon: "assets/icons/harvest-crate.png", desc: "+7% de rendimento das safras.", max: 15, baseCost: 1250, growth: 1.80, currency: "coins" },
    { id: "regionalMarket", name: "Feira regional", icon: "assets/icons/shop.png", desc: "+6% de aumento do valor de todas as vendas.", max: 15, baseCost: 1750, growth: 1.82, currency: "coins" },
    { id: "reinforcedBarn", name: "Celeiro reforçado", icon: "assets/icons/barn.png", desc: "+20% de capacidade no estoque.", max: 12, baseCost: 2300, growth: 1.86, currency: "coins" },
    { id: "seedCooperative", name: "Cooperativa de sementes", icon: "assets/icons/seedling-pot.png", desc: "−4% no custo de compra das culturas.", max: 12, baseCost: 3200, growth: 1.88, currency: "coins" },
    { id: "precisionTools", name: "Ferramentas de precisão", icon: "assets/icons/tools.png", desc: "−4% no custo dos níveis das plantações.", max: 12, baseCost: 4200, growth: 1.90, currency: "coins" },
    { id: "fieldAcademy", name: "Academia de campo", icon: "assets/icons/graduation-cap.png", desc: "+7% de experiência da fazenda ganha.", max: 12, baseCost: 5600, growth: 1.92, currency: "coins" },
    { id: "contractBureau", name: "Escritório comercial", icon: "assets/icons/commercial-contract.png", desc: "+8% de ganhos nas recompensas oferecidas por contratos.", max: 12, baseCost: 7200, growth: 1.94, currency: "coins" },
    { id: "orderCenter", name: "Central de encomendas", icon: "assets/icons/clipboard.png", desc: "+8% nas recompensas recebidas por pedidos.", max: 12, baseCost: 6800, growth: 1.93, currency: "coins" },
    { id: "expressPacking", name: "Embalagem expressa", icon: "assets/icons/package.png", desc: "+5% de aumento nos prazos dos contratos.", max: 10, baseCost: 8600, growth: 1.98, currency: "coins" }
  ];

  const research = [
    { id: "acceleratedGermination", name: "Germinação acelerada", icon: "assets/icons/fertilizer.png", desc: "+7% de velocidade para todas as safras.", max: 10, baseCost: 5, growth: 1.72 },
    { id: "hybridGenetics", name: "Genética híbrida", icon: "assets/icons/dna.png", desc: "+8% de rendimento nas safras.", max: 10, baseCost: 6, growth: 1.74 },
    { id: "priceForecast", name: "Previsão de preços", icon: "assets/icons/price-estimate.png", desc: "+6% de aumento do valor de todas as vendas.", max: 10, baseCost: 7, growth: 1.76 },
    { id: "coldChain", name: "Cadeia de conservação", icon: "assets/icons/silo.png", desc: "+20% de capacidade no estoque.", max: 10, baseCost: 8, growth: 1.78 },
    { id: "smartSeedCatalog", name: "Catálogo inteligente", icon: "assets/icons/books.png", desc: "−4% no custo de compra das culturas.", max: 10, baseCost: 9, growth: 1.80 },
    { id: "cultivationAlgorithms", name: "Algoritmos de cultivo", icon: "assets/icons/field-map.png", desc: "−4% no custo dos níveis das plantações.", max: 10, baseCost: 10, growth: 1.82 },
    { id: "negotiationModels", name: "Modelos de negociação", icon: "assets/icons/pricing.png", desc: "+8% de ganhos nas recompensas oferecidas por contratos.", max: 10, baseCost: 12, growth: 1.84 },
    { id: "orderOptimization", name: "Otimização de pedidos", icon: "assets/icons/delivery-truck.png", desc: "+8% nas recompensas recebidas por pedidos.", max: 10, baseCost: 12, growth: 1.84 },
    { id: "logisticsSimulation", name: "Simulação logística", icon: "assets/icons/clock.png", desc: "+6% de aumento nos prazos dos contratos.", max: 10, baseCost: 14, growth: 1.86 },
    { id: "agriculturalPedagogy", name: "Pedagogia agrícola", icon: "assets/icons/graduation-cap.png", desc: "+7% de experiência da fazenda ganha.", max: 10, baseCost: 15, growth: 1.88 },
    { id: "continuousLearning", name: "Aprendizado contínuo", icon: "assets/icons/clock.png", desc: "+0,01% do XP necessário por segundo jogado por nível.", max: 10, baseCost: 5, growth: 1.50 },
    { id: "contractPortfolio", name: "Portfólio de contratos", icon: "assets/icons/commercial-contract.png", desc: "+1 slot de contrato ativo por nível. Possui somente 2 níveis.", max: 2, baseCost: 320, growth: 4.50 }
  ];

  const prestigeUpgrades = [
    { id: "royalTreasury", name: "Tesouro da dinastia", icon: "assets/icons/crown.png", desc: "+5K moedas no capital inicial de cada nova jornada por nível.", max: 10, baseCost: 5, growth: 2.00 },
    { id: "eternalHarvest", name: "Colheita eterna", icon: "assets/icons/harvest-crate.png", desc: "+12% de velocidade e +10% de rendimento permanentes por nível.", max: 12, baseCost: 3, growth: 2.05 },
    { id: "goldenExchange", name: "Bolsa dourada", icon: "assets/icons/coin.png", desc: "+15% no valor de todas as vendas permanentemente por nível.", max: 10, baseCost: 4, growth: 2.10 },
    { id: "endlessGranary", name: "Celeiro sem fim", icon: "assets/icons/silo.png", desc: "+60% de capacidade permanente no estoque por nível.", max: 10, baseCost: 4, growth: 2.10 },
    { id: "ancestralMastery", name: "Domínio ancestral", icon: "assets/icons/seedling-pot.png", desc: "−8% no custo das culturas e −6% nos níveis das plantações por nível.", max: 8, baseCost: 5, growth: 2.15 },
    { id: "immortalAcademy", name: "Academia imortal", icon: "assets/icons/books.png", desc: "25% a mais de pesquisa recebida e 3 pontos iniciais permanentes por nível.", max: 8, baseCost: 6, growth: 2.18 },
    { id: "laboratoryFunding", name: "Financiamento de pesquisas", icon: "assets/icons/potion.png", desc: "Gera pesquisa passivamente. Aumenta parcialmente o ganho passivo de postos de pesquisa.", max: 3, baseCost: 18, growth: 2.50, stageRates: [0.03, 0.03, 0.04] },
    { id: "prestigeResonance", name: "Ressonância de prestígio", icon: "assets/icons/prestige.png", desc: "20% a mais nos pontos obtidos em todos os próximos prestígios por nível.", max: 8, baseCost: 7, growth: 2.22 },
    { id: "sovereignNetwork", name: "Rede soberana", icon: "assets/icons/delivery-truck.png", desc: "20% a mais nas moedas de contratos e pedidos e 10% a mais nos prazos e vendas automáticas por nível.", max: 8, baseCost: 8, growth: 2.25 },
    { id: "wholesaleHub", name: "Central atacadista", icon: "assets/icons/shop.png", desc: "Quando o estoque chega a 100%, o excedente continua sendo produzido e é vendido automaticamente por 50% do valor normal. Possui somente 1 nível.", max: 1, baseCost: 28, growth: 1.00 },
    { id: "experienceLegacy", name: "Legado da experiência", icon: "assets/icons/graduation-cap.png", desc: "Aumento percentual do ganho passivo de XP por nível.", max: 5, baseCost: 10, growth: 2.25 },
    { id: "contractEmpire", name: "Império contratual", icon: "assets/icons/commercial-contract.png", desc: "Desbloqueia +1 slot de contrato ativo.", max: 3, baseCost: 90, growth: 3.00 }
  ];


  const companies = [
    { id: "aurora", name: "Alimentos Aurora", icon: "assets/icons/company-aurora-foods.png", specialty: "Cestas frescas" },
    { id: "verdevale", name: "Mercado Verde Vale", icon: "assets/icons/company-green-valley-market.png", specialty: "Rede de mercados" },
    { id: "campodourado", name: "Campo Dourado", icon: "assets/icons/company-golden-field.png", specialty: "Distribuição regional" },
    { id: "boamesa", name: "Boa Mesa Refeições", icon: "assets/icons/company-good-table-meals.png", specialty: "Cozinhas industriais" },
    { id: "raizes", name: "Raízes & Companhia", icon: "assets/icons/company-roots-and-company.png", specialty: "Produtos naturais" },
    { id: "estacao", name: "Sabor em Rota", icon: "assets/icons/company-flavor-route.png", specialty: "Logística de alimentos" },
    { id: "colheita", name: "Colheita Serena", icon: "assets/icons/company-serene-harvest.png", specialty: "Empório sustentável" },
    { id: "horizonte", name: "Horizonte Orgânicos", icon: "assets/icons/company-organic-horizon.png", specialty: "Assinaturas semanais" }
  ];

  const orderSteps = [
    { amount: 5, rewardMultiplier: 1.25, research: 0 },
    { amount: 20, rewardMultiplier: 1.30, research: 0 },
    { amount: 50, rewardMultiplier: 1.35, research: 1 },
    { amount: 120, rewardMultiplier: 1.40, research: 1 },
    { amount: 250, rewardMultiplier: 1.45, research: 2 },
    { amount: 500, rewardMultiplier: 1.50, research: 2 },
    { amount: 1000, rewardMultiplier: 1.56, research: 3 },
    { amount: 2000, rewardMultiplier: 1.63, research: 4 },
    { amount: 3500, rewardMultiplier: 1.70, research: 5 },
    { amount: 5500, rewardMultiplier: 1.78, research: 7 },
    { amount: 7500, rewardMultiplier: 1.88, research: 9 },
    { amount: 10000, rewardMultiplier: 2.00, research: 12 }
  ];

  const missions = [
    { id: "sellRoots100", series: "rootsMarket", stage: 1, title: "Raízes na feira I", desc: "Venda 150 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 150, reward: { coins: 1800 } },
    { id: "sellRoots300", series: "rootsMarket", stage: 2, title: "Raízes na feira II", desc: "Venda 500 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 500, reward: { coins: 5200, research: 3 } },
    { id: "sellRoots1000", series: "rootsMarket", stage: 3, title: "Raízes na feira III", desc: "Venda 1.800 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 1800, reward: { coins: 18000, research: 8 } },
    { id: "sellRoots3000", series: "rootsMarket", stage: 4, title: "Raízes na feira IV", desc: "Venda 6.000 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 6000, reward: { prestige: 2, research: 18 } },
    { id: "sellRoots15000", series: "rootsMarket", stage: 5, title: "Raízes na feira V", desc: "Venda 15.000 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 15000, reward: { prestige: 5, research: 34 } },
    { id: "sellRoots40000", series: "rootsMarket", stage: 6, title: "Raízes na feira VI", desc: "Venda 40.000 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 40000, reward: { coins: 1800000, prestige: 8, research: 70 } },
    { id: "sellRoots100000", series: "rootsMarket", stage: 7, title: "Raízes na feira VII", desc: "Venda 100.000 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 100000, reward: { prestige: 14, research: 130 } },
    { id: "sellRoots250000", series: "rootsMarket", stage: 8, title: "Raízes na feira VIII", desc: "Venda 250.000 raízes e tubérculos ao longo das jornadas.", metric: "categorySold", category: "root", target: 250000, reward: { prestige: 24, research: 240 } },

    { id: "orders3", series: "orders", stage: 1, title: "Caderno de encomendas I", desc: "Conclua 5 pedidos permanentes.", metric: "orders", target: 5, reward: { research: 5 } },
    { id: "orders15", series: "orders", stage: 2, title: "Caderno de encomendas II", desc: "Conclua 20 pedidos permanentes.", metric: "orders", target: 20, reward: { coins: 24000, research: 12 } },
    { id: "orders50", series: "orders", stage: 3, title: "Caderno de encomendas III", desc: "Conclua 60 pedidos ao longo das jornadas.", metric: "orders", target: 60, reward: { prestige: 3, research: 28 } },
    { id: "orders120", series: "orders", stage: 4, title: "Caderno de encomendas IV", desc: "Conclua 150 pedidos ao longo das jornadas.", metric: "orders", target: 150, reward: { prestige: 7, research: 58 } },
    { id: "orders350", series: "orders", stage: 5, title: "Caderno de encomendas V", desc: "Conclua 350 pedidos ao longo das jornadas.", metric: "orders", target: 350, reward: { prestige: 14, research: 110 } },
    { id: "orders700", series: "orders", stage: 6, title: "Caderno de encomendas VI", desc: "Conclua 700 pedidos ao longo das jornadas.", metric: "orders", target: 700, reward: { coins: 8000000, prestige: 22, research: 210 } },
    { id: "orders1200", series: "orders", stage: 7, title: "Caderno de encomendas VII", desc: "Conclua 1.200 pedidos ao longo das jornadas.", metric: "orders", target: 1200, reward: { prestige: 32, research: 340 } },
    { id: "orders2000", series: "orders", stage: 8, title: "Caderno de encomendas VIII", desc: "Conclua 2.000 pedidos ao longo das jornadas.", metric: "orders", target: 2000, reward: { prestige: 48, research: 520 } },
    { id: "orders3500", series: "orders", stage: 9, title: "Caderno de encomendas IX", desc: "Conclua 3.500 pedidos ao longo das jornadas.", metric: "orders", target: 3500, reward: { prestige: 72, research: 800 } },
    { id: "orders6000", series: "orders", stage: 10, title: "Caderno de encomendas X", desc: "Conclua 6.000 pedidos ao longo das jornadas.", metric: "orders", target: 6000, reward: { prestige: 110, research: 1250 } },

    { id: "contracts3", series: "contracts", stage: 1, title: "Acordos empresariais I", desc: "Conclua 5 contratos dentro do prazo.", metric: "contracts", target: 5, reward: { coins: 5000, research: 4 } },
    { id: "contracts10", series: "contracts", stage: 2, title: "Acordos empresariais II", desc: "Conclua 15 contratos dentro do prazo.", metric: "contracts", target: 15, reward: { coins: 22000, research: 10 } },
    { id: "contracts25", series: "contracts", stage: 3, title: "Acordos empresariais III", desc: "Conclua 40 contratos dentro do prazo.", metric: "contracts", target: 40, reward: { coins: 75000, research: 22 } },
    { id: "contracts60", series: "contracts", stage: 4, title: "Acordos empresariais IV", desc: "Conclua 90 contratos dentro do prazo.", metric: "contracts", target: 90, reward: { prestige: 6, research: 44 } },
    { id: "contracts180", series: "contracts", stage: 5, title: "Acordos empresariais V", desc: "Conclua 180 contratos dentro do prazo.", metric: "contracts", target: 180, reward: { prestige: 12, research: 84 } },
    { id: "contracts350", series: "contracts", stage: 6, title: "Acordos empresariais VI", desc: "Conclua 350 contratos dentro do prazo.", metric: "contracts", target: 350, reward: { coins: 12000000, prestige: 20, research: 160 } },
    { id: "contracts650", series: "contracts", stage: 7, title: "Acordos empresariais VII", desc: "Conclua 650 contratos dentro do prazo.", metric: "contracts", target: 650, reward: { prestige: 30, research: 280 } },
    { id: "contracts1100", series: "contracts", stage: 8, title: "Acordos empresariais VIII", desc: "Conclua 1.100 contratos dentro do prazo.", metric: "contracts", target: 1100, reward: { prestige: 46, research: 460 } },
    { id: "contracts1800", series: "contracts", stage: 9, title: "Acordos empresariais IX", desc: "Conclua 1.800 contratos dentro do prazo.", metric: "contracts", target: 1800, reward: { prestige: 70, research: 740 } },
    { id: "contracts3000", series: "contracts", stage: 10, title: "Acordos empresariais X", desc: "Conclua 3.000 contratos dentro do prazo.", metric: "contracts", target: 3000, reward: { prestige: 108, research: 1180 } },

    { id: "own5", series: "collection", stage: 1, title: "Horta variada I", desc: "Compre 8 culturas ao longo das jornadas.", metric: "cropPurchases", target: 8, reward: { research: 6 } },
    { id: "own20", series: "collection", stage: 2, title: "Horta variada II", desc: "Compre 25 culturas ao longo das jornadas.", metric: "cropPurchases", target: 25, reward: { coins: 45000, research: 15 } },
    { id: "own40", series: "collection", stage: 3, title: "Horta variada III", desc: "Compre 60 culturas ao longo das jornadas.", metric: "cropPurchases", target: 60, reward: { prestige: 4, research: 30 } },
    { id: "own60", series: "collection", stage: 4, title: "Horta variada IV", desc: "Compre 120 culturas ao longo das jornadas.", metric: "cropPurchases", target: 120, reward: { prestige: 10, research: 60 } },
    { id: "own250", series: "collection", stage: 5, title: "Horta variada V", desc: "Compre 250 culturas ao longo das jornadas.", metric: "cropPurchases", target: 250, reward: { prestige: 18, research: 115 } },
    { id: "own500", series: "collection", stage: 6, title: "Horta variada VI", desc: "Compre 500 culturas ao longo das jornadas.", metric: "cropPurchases", target: 500, reward: { prestige: 30, research: 220 } },
    { id: "own900", series: "collection", stage: 7, title: "Horta variada VII", desc: "Compre 900 culturas ao longo das jornadas.", metric: "cropPurchases", target: 900, reward: { prestige: 50, research: 400 } },
    { id: "own1400", series: "collection", stage: 8, title: "Horta variada VIII", desc: "Compre 1.400 culturas ao longo das jornadas.", metric: "cropPurchases", target: 1400, reward: { prestige: 82, research: 700 } },

    { id: "cropLevels20", series: "cropLevels", stage: 1, title: "Canteiros experientes I", desc: "Compre 50 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 50, reward: { coins: 14000 } },
    { id: "cropLevels200", series: "cropLevels", stage: 2, title: "Canteiros experientes II", desc: "Compre 400 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 400, reward: { coins: 95000, research: 16 } },
    { id: "cropLevels1000", series: "cropLevels", stage: 3, title: "Canteiros experientes III", desc: "Compre 1.500 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 1500, reward: { prestige: 5, research: 38 } },
    { id: "cropLevels5000", series: "cropLevels", stage: 4, title: "Canteiros experientes IV", desc: "Compre 5.000 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 5000, reward: { prestige: 12, research: 82 } },
    { id: "cropLevels12000", series: "cropLevels", stage: 5, title: "Canteiros experientes V", desc: "Compre 12.000 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 12000, reward: { prestige: 22, research: 160 } },
    { id: "cropLevels25000", series: "cropLevels", stage: 6, title: "Canteiros experientes VI", desc: "Compre 25.000 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 25000, reward: { prestige: 38, research: 300 } },
    { id: "cropLevels50000", series: "cropLevels", stage: 7, title: "Canteiros experientes VII", desc: "Compre 50.000 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 50000, reward: { prestige: 62, research: 520 } },
    { id: "cropLevels90000", series: "cropLevels", stage: 8, title: "Canteiros experientes VIII", desc: "Compre 90.000 níveis de plantações ao longo das jornadas.", metric: "cropUpgrades", target: 90000, reward: { prestige: 100, research: 900 } },

    { id: "sellFruit500", series: "fruitMarket", stage: 1, title: "Banca colorida I", desc: "Venda 800 frutos ao longo das jornadas.", metric: "categorySold", category: "fruit", target: 800, reward: { research: 10 } },
    { id: "sellFruit2000", series: "fruitMarket", stage: 2, title: "Banca colorida II", desc: "Venda 3.000 frutos ao longo das jornadas.", metric: "categorySold", category: "fruit", target: 3000, reward: { coins: 60000, research: 22 } },
    { id: "sellFruit8000", series: "fruitMarket", stage: 3, title: "Banca colorida III", desc: "Venda 10.000 frutos ao longo das jornadas.", metric: "categorySold", category: "fruit", target: 10000, reward: { prestige: 5, research: 42 } },
    { id: "sellFruit30000", series: "fruitMarket", stage: 4, title: "Banca colorida IV", desc: "Venda 30.000 frutos ao longo das jornadas.", metric: "categorySold", category: "fruit", target: 30000, reward: { prestige: 10, research: 85 } },
    { id: "sellFruit90000", series: "fruitMarket", stage: 5, title: "Banca colorida V", desc: "Venda 90.000 frutos ao longo das jornadas.", metric: "categorySold", category: "fruit", target: 90000, reward: { prestige: 20, research: 170 } },
    { id: "sellFruit250000", series: "fruitMarket", stage: 6, title: "Banca colorida VI", desc: "Venda 250.000 frutos ao longo das jornadas.", metric: "categorySold", category: "fruit", target: 250000, reward: { prestige: 38, research: 320 } },

    { id: "sellGrain1500", series: "grainMarket", stage: 1, title: "Safra de grãos I", desc: "Venda 2.000 grãos ao longo das jornadas.", metric: "categorySold", category: "grain", target: 2000, reward: { prestige: 1, research: 16 } },
    { id: "sellGrain6000", series: "grainMarket", stage: 2, title: "Safra de grãos II", desc: "Venda 8.000 grãos ao longo das jornadas.", metric: "categorySold", category: "grain", target: 8000, reward: { prestige: 5, research: 38 } },
    { id: "sellGrain25000", series: "grainMarket", stage: 3, title: "Safra de grãos III", desc: "Venda 25.000 grãos ao longo das jornadas.", metric: "categorySold", category: "grain", target: 25000, reward: { prestige: 10, research: 80 } },
    { id: "sellGrain75000", series: "grainMarket", stage: 4, title: "Safra de grãos IV", desc: "Venda 75.000 grãos ao longo das jornadas.", metric: "categorySold", category: "grain", target: 75000, reward: { prestige: 19, research: 155 } },
    { id: "sellGrain200000", series: "grainMarket", stage: 5, title: "Safra de grãos V", desc: "Venda 200.000 grãos ao longo das jornadas.", metric: "categorySold", category: "grain", target: 200000, reward: { prestige: 34, research: 290 } },
    { id: "sellGrain500000", series: "grainMarket", stage: 6, title: "Safra de grãos VI", desc: "Venda 500.000 grãos ao longo das jornadas.", metric: "categorySold", category: "grain", target: 500000, reward: { prestige: 58, research: 500 } },

    { id: "stock1000", series: "storage", stage: 1, title: "Celeiro movimentado I", desc: "Alcance 1.500 produtos simultâneos no estoque.", metric: "stock", target: 1500, reward: { research: 14 } },
    { id: "stock5000", series: "storage", stage: 2, title: "Celeiro movimentado II", desc: "Alcance 6.500 produtos simultâneos no estoque.", metric: "stock", target: 6500, reward: { prestige: 4, research: 36 } },
    { id: "stock20000", series: "storage", stage: 3, title: "Celeiro movimentado III", desc: "Alcance 20.000 produtos simultâneos no estoque.", metric: "stock", target: 20000, reward: { prestige: 9, research: 75 } },
    { id: "stock60000", series: "storage", stage: 4, title: "Celeiro movimentado IV", desc: "Alcance 60.000 produtos simultâneos no estoque.", metric: "stock", target: 60000, reward: { prestige: 17, research: 145 } },
    { id: "stock150000", series: "storage", stage: 5, title: "Celeiro movimentado V", desc: "Alcance 150.000 produtos simultâneos no estoque.", metric: "stock", target: 150000, reward: { prestige: 30, research: 260 } },
    { id: "stock350000", series: "storage", stage: 6, title: "Celeiro movimentado VI", desc: "Alcance 350.000 produtos simultâneos no estoque.", metric: "stock", target: 350000, reward: { prestige: 52, research: 470 } },

    { id: "farm20", series: "farmLevel", stage: 1, title: "Fazenda consolidada I", desc: "Alcance o nível 20 da fazenda.", metric: "farmLevel", target: 20, reward: { coins: 90000, research: 20 } },
    { id: "farm35", series: "farmLevel", stage: 2, title: "Fazenda consolidada II", desc: "Alcance o nível 35 da fazenda.", metric: "farmLevel", target: 35, reward: { prestige: 5, research: 34 } },
    { id: "farm50", series: "farmLevel", stage: 3, title: "Fazenda consolidada III", desc: "Alcance o nível 50 da fazenda.", metric: "farmLevel", target: 50, reward: { prestige: 9, research: 65 } },
    { id: "farm75", series: "farmLevel", stage: 4, title: "Fazenda consolidada IV", desc: "Alcance o nível 75 da fazenda.", metric: "farmLevel", target: 75, reward: { prestige: 16, research: 120 } },
    { id: "farm120", series: "farmLevel", stage: 5, title: "Fazenda consolidada V", desc: "Alcance o nível 120 da fazenda.", metric: "farmLevel", target: 120, reward: { prestige: 28, research: 220 } },
    { id: "farm200", series: "farmLevel", stage: 6, title: "Fazenda consolidada VI", desc: "Alcance o nível 200 da fazenda.", metric: "farmLevel", target: 200, reward: { prestige: 48, research: 400 } },
    { id: "farm350", series: "farmLevel", stage: 7, title: "Fazenda consolidada VII", desc: "Alcance o nível 350 e libere toda a linha de culturas.", metric: "farmLevel", target: 350, reward: { prestige: 85, research: 720 } },

    { id: "prestige1", series: "prestige", stage: 1, title: "Um novo começo", desc: "Realize seu primeiro prestígio.", metric: "prestiges", target: 1, reward: { prestige: 2 } },
    { id: "prestige2", series: "prestige", stage: 2, title: "Prestígio dos prestígios", desc: "Realize 3 prestígios e dobre permanentemente os pontos dos próximos prestígios.", metric: "prestiges", target: 3, reward: { permanent: "prestigeDouble" } },
    { id: "prestige5", series: "prestige", stage: 3, title: "Ciclos da terra", desc: "Realize 7 prestígios.", metric: "prestiges", target: 7, reward: { prestige: 9 } },
    { id: "prestige10", series: "prestige", stage: 4, title: "Legado de muitas safras", desc: "Realize 15 prestígios.", metric: "prestiges", target: 15, reward: { prestige: 22 } },
    { id: "prestige30", series: "prestige", stage: 5, title: "Dinastia agrícola", desc: "Realize 30 prestígios.", metric: "prestiges", target: 30, reward: { prestige: 45 } },
    { id: "prestige60", series: "prestige", stage: 6, title: "Séculos de colheita", desc: "Realize 60 prestígios.", metric: "prestiges", target: 60, reward: { prestige: 90 } },
    { id: "prestige100", series: "prestige", stage: 7, title: "Terra eterna", desc: "Realize 100 prestígios.", metric: "prestiges", target: 100, reward: { prestige: 160 } },

    { id: "market10000", series: "market", stage: 1, title: "Referência regional I", desc: "Venda 15.000 produtos ao longo das jornadas.", metric: "sold", target: 15000, reward: { prestige: 6, research: 40 } },
    { id: "market50000", series: "market", stage: 2, title: "Referência regional II", desc: "Venda 75.000 produtos ao longo das jornadas.", metric: "sold", target: 75000, reward: { prestige: 14, research: 90 } },
    { id: "market250000", series: "market", stage: 3, title: "Referência regional III", desc: "Venda 250.000 produtos ao longo das jornadas.", metric: "sold", target: 250000, reward: { prestige: 28, research: 175 } },
    { id: "market750000", series: "market", stage: 4, title: "Referência regional IV", desc: "Venda 750.000 produtos ao longo das jornadas.", metric: "sold", target: 750000, reward: { prestige: 46, research: 320 } },
    { id: "market2000000", series: "market", stage: 5, title: "Referência regional V", desc: "Venda 2 milhões de produtos ao longo das jornadas.", metric: "sold", target: 2000000, reward: { prestige: 74, research: 560 } },
    { id: "market5000000", series: "market", stage: 6, title: "Referência regional VI", desc: "Venda 5 milhões de produtos ao longo das jornadas.", metric: "sold", target: 5000000, reward: { prestige: 118, research: 950 } },
    { id: "market12000000", series: "market", stage: 7, title: "Referência regional VII", desc: "Venda 12 milhões de produtos ao longo das jornadas.", metric: "sold", target: 12000000, reward: { prestige: 190, research: 1600 } }
  ];

  return { categories, crops, upgrades, research, prestigeUpgrades, companies, orderSteps, missions };
})();
