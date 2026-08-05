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
    ["onion", "Cebola", "root", "cebola"],
    ["carrot", "Cenoura", "root", "cenoura"],
    ["bellPepper", "Pimentão", "fruit", "pimentao"],
    ["sweetPotato", "Batata-doce", "root", "batata_doce"],
    ["leaf", "Folha", "leaf", "folha"],
    ["garlic", "Alho", "root", "alho"],
    ["tomato", "Tomate", "fruit", "tomate"],
    ["banana", "Banana", "tropical", "banana"],
    ["melon", "Melão", "fruit", "melao"],
    ["potato", "Batata", "root", "batata"],
    ["watermelon", "Melancia", "fruit", "melancia"],
    ["cashew", "Caju", "tropical", "caju"],
    ["lettuce", "Alface", "leaf", "alface"],
    ["eggplant", "Berinjela", "fruit", "berinjela"],
    ["apple", "Maçã", "tree", "maca"],
    ["cucumber", "Pepino", "fruit", "pepino"],
    ["chili", "Pimenta", "fruit", "pimenta"],
    ["cherry", "Cereja", "tree", "cereja"],
    ["lemon", "Limão", "tree", "limao"],
    ["passionFruit", "Maracujá", "tropical", "maracuja"],
    ["papaya", "Mamão", "tropical", "mamão"],
    ["beet", "Beterraba", "root", "beterraba"],
    ["grape", "Uva", "tree", "uva"],
    ["pumpkin", "Abóbora", "fruit", "abobora"],
    ["pear", "Pera", "tree", "pera"],
    ["avocado", "Abacate", "tree", "abacate"],
    ["strawberry", "Morango", "bush", "morango"],
    ["orange", "Laranja", "tree", "laranja"],
    ["kiwi", "Kiwi", "tree", "kiwi"],
    ["blueberry", "Mirtilo", "bush", "mirtilo"],
    ["pineapple", "Abacaxi", "tropical", "abacaxi"],
    ["dragonFruit", "Pitaya", "tropical", "pitaya"],
    ["corn", "Milho", "grain", "milho"],
    ["starFruit", "Carambola", "tropical", "carambola"],
    ["mango", "Manga", "tropical", "manga"],
    ["guava", "Goiaba", "tropical", "goiaba"],
    ["blackberry", "Amora", "bush", "amora"],
    ["guarana", "Guaraná", "industry", "guarana"],
    ["peach", "Pêssego", "tree", "pessego"],
    ["coconut", "Coco", "tropical", "coco"],
    ["cabbage", "Repolho", "leaf", "repolho"],
    ["kale", "Couve", "leaf", "couve"],
    ["broccoli", "Brócolis", "leaf", "brocolis"],
    ["cotton", "Algodão", "industry", "algodao"],
    ["spinach", "Espinafre", "leaf", "espinafre"],
    ["rice", "Arroz", "grain", "arroz"],
    ["cassava", "Mandioca", "root", "aipim"],
    ["coffee", "Café", "industry", "cafe"],
    ["cauliflower", "Couve-flor", "leaf", "couve_flor"],
    ["bean", "Feijão", "grain", "feijao"],
    ["wheat", "Trigo", "grain", "trigo"],
    ["radish", "Rabanete", "root", "rabanete"],
    ["oat", "Aveia", "grain", "aveia"],
    ["pea", "Ervilha", "grain", "ervilha"],
    ["soy", "Soja", "grain", "soja"],
    ["raspberry", "Framboesa", "bush", "framboesa"],
    ["tangerine", "Tangerina", "tree", "tangerina"],
    ["fig", "Figo", "tree", "figo"],
    ["plum", "Ameixa", "tree", "ameixa"],
    ["acerola", "Acerola", "tropical", "acerola"],
    ["acai", "Açaí", "tropical", "acai"],
    ["leek", "Alho-poró", "leaf", "alho_poro"],
    ["peanut", "Amendoim", "grain", "amendoim"],
    ["olive", "Azeitona", "tree", "azeitona"],
    ["cocoa", "Cacau", "industry", "cacau"],
    ["cupuacu", "Cupuaçu", "tropical", "cupuacu"],
    ["ginger", "Gengibre", "root", "gengibre"],
    ["soursop", "Graviola", "tropical", "graviola"],
    ["yam", "Inhame", "root", "inhame"],
    ["jackfruit", "Jaca", "tropical", "jaca"],
    ["tamarind", "Tamarindo", "tree", "tamarindo"]
  ];

  const crops = cropRows.map(([id, name, category, imageFile], index) => {
    return {
      id,
      name,
      category,
      image: `assets/plants/${imageFile}.png`,
      index,
      unlockLevel: 1 + Math.floor(index * 0.58),
      // A curva mantém a primeira compra acessível, impede duas culturas no início
      // e continua sustentável até as culturas finais sem saltos impossíveis.
      cost: Math.round(80 * Math.pow(1.235, index) + index * 24),
      basePrice: Math.max(3, Math.round(3 * Math.pow(1.14, index))),
      baseGrowth: categoryGrowth[category] || 8,
      baseYield: 2
    };
  });

  const upgrades = [
    { id: "irrigationNetwork", name: "Rede de irrigação", icon: "assets/icons/irrigation.png", desc: "+6% de velocidade de safra para todas as culturas.", max: 15, baseCost: 160, growth: 1.48, currency: "coins" },
    { id: "harvestCrew", name: "Equipe de colheita", icon: "assets/icons/harvest-crate.png", desc: "+7% de rendimento das safras.", max: 15, baseCost: 220, growth: 1.50, currency: "coins" },
    { id: "regionalMarket", name: "Feira regional", icon: "assets/icons/shop.png", desc: "+6% de aumento do valor de todas as vendas.", max: 15, baseCost: 300, growth: 1.51, currency: "coins" },
    { id: "reinforcedBarn", name: "Celeiro reforçado", icon: "assets/icons/barn.png", desc: "+20% de capacidade no estoque.", max: 12, baseCost: 360, growth: 1.56, currency: "coins" },
    { id: "seedCooperative", name: "Cooperativa de sementes", icon: "assets/icons/seedling-pot.png", desc: "−4% no custo de compra das culturas.", max: 12, baseCost: 480, growth: 1.56, currency: "coins" },
    { id: "precisionTools", name: "Ferramentas de precisão", icon: "assets/icons/tools.png", desc: "−4% no custo dos níveis das plantações.", max: 12, baseCost: 600, growth: 1.58, currency: "coins" },
    { id: "fieldAcademy", name: "Academia de campo", icon: "assets/icons/graduation-cap.png", desc: "+7% de experiência da fazenda ganha.", max: 12, baseCost: 700, growth: 1.58, currency: "coins" },
    { id: "contractBureau", name: "Escritório comercial", icon: "assets/icons/commercial-contract.png", desc: "+8% de ganhos nas recompensas oferecidas por contratos.", max: 12, baseCost: 850, growth: 1.60, currency: "coins" },
    { id: "orderCenter", name: "Central de encomendas", icon: "assets/icons/clipboard.png", desc: "+8% nas recompensas recebidas por pedidos.", max: 12, baseCost: 800, growth: 1.59, currency: "coins" },
    { id: "expressPacking", name: "Embalagem expressa", icon: "assets/icons/package.png", desc: "+5% de aumento nos prazos dos contratos.", max: 10, baseCost: 950, growth: 1.62, currency: "coins" }
  ];

  const research = [
    { id: "acceleratedGermination", name: "Germinação acelerada", icon: "assets/icons/fertilizer.png", desc: "+7% de velocidade para todas as safras.", max: 10, baseCost: 2, growth: 1.48 },
    { id: "hybridGenetics", name: "Genética híbrida", icon: "assets/icons/dna.png", desc: "+8% de rendimento nas safras.", max: 10, baseCost: 2, growth: 1.49 },
    { id: "priceForecast", name: "Previsão de preços", icon: "assets/icons/price-estimate.png", desc: "+6% de aumento do valor de todas as vendas.", max: 10, baseCost: 3, growth: 1.50 },
    { id: "coldChain", name: "Cadeia de conservação", icon: "assets/icons/silo.png", desc: "+20% de capacidade no estoque.", max: 10, baseCost: 3, growth: 1.51 },
    { id: "smartSeedCatalog", name: "Catálogo inteligente", icon: "assets/icons/books.png", desc: "−4% no custo de compra das culturas.", max: 10, baseCost: 3, growth: 1.51 },
    { id: "cultivationAlgorithms", name: "Algoritmos de cultivo", icon: "assets/icons/field-map.png", desc: "−4% no custo dos níveis das plantações.", max: 10, baseCost: 3, growth: 1.52 },
    { id: "negotiationModels", name: "Modelos de negociação", icon: "assets/icons/pricing.png", desc: "+8% de ganhos nas recompensas oferecidas por contratos.", max: 10, baseCost: 4, growth: 1.53 },
    { id: "orderOptimization", name: "Otimização de pedidos", icon: "assets/icons/delivery-truck.png", desc: "+8% nas recompensas recebidas por pedidos.", max: 10, baseCost: 4, growth: 1.53 },
    { id: "logisticsSimulation", name: "Simulação logística", icon: "assets/icons/clock.png", desc: "+6% de aumento nos prazos dos contratos.", max: 10, baseCost: 4, growth: 1.54 },
    { id: "agriculturalPedagogy", name: "Pedagogia agrícola", icon: "assets/icons/graduation-cap.png", desc: "+7% de experiência da fazenda ganha.", max: 10, baseCost: 4, growth: 1.54 }
  ];

  const prestigeUpgrades = [
    { id: "royalTreasury", name: "Tesouro da dinastia", icon: "assets/icons/crown.png", desc: "Amplia o capital inicial de cada nova jornada.", max: 10, baseCost: 1, growth: 1.72 },
    { id: "eternalHarvest", name: "Colheita eterna", icon: "assets/icons/harvest-crate.png", desc: "+12% de velocidade e +10% de rendimento permanentes por nível.", max: 12, baseCost: 1, growth: 1.78 },
    { id: "goldenExchange", name: "Bolsa dourada", icon: "assets/icons/coin.png", desc: "+15% no valor de todas as vendas permanentemente por nível.", max: 10, baseCost: 2, growth: 1.82 },
    { id: "endlessGranary", name: "Celeiro sem fim", icon: "assets/icons/silo.png", desc: "+60% de capacidade permanente no estoque por nível.", max: 10, baseCost: 2, growth: 1.82 },
    { id: "ancestralMastery", name: "Domínio ancestral", icon: "assets/icons/seedling-pot.png", desc: "−8% no custo das culturas e −6% nos níveis das plantações por nível.", max: 8, baseCost: 2, growth: 1.90 },
    { id: "immortalAcademy", name: "Academia imortal", icon: "assets/icons/books.png", desc: "25% a mais de pesquisa recebida e 3 pontos iniciais permanentes por nível.", max: 8, baseCost: 3, growth: 1.92 },
    { id: "prestigeResonance", name: "Ressonância de prestígio", icon: "assets/icons/prestige.png", desc: "20% a mais nos pontos obtidos em todos os próximos prestígios por nível.", max: 8, baseCost: 3, growth: 1.98 },
    { id: "sovereignNetwork", name: "Rede soberana", icon: "assets/icons/commercial-contract.png", desc: "20% a mais nas moedas de contratos e pedidos e 10% a mais nos prazos e vendas automáticas por nível.", max: 8, baseCost: 4, growth: 2.00 }
  ];


  const companies = [
    { id: "aurora", name: "Alimentos Aurora", icon: "🌤️", specialty: "Cestas frescas" },
    { id: "verdevale", name: "Mercado Verde Vale", icon: "🏪", specialty: "Rede de mercados" },
    { id: "campodourado", name: "Campo Dourado", icon: "🌾", specialty: "Distribuição regional" },
    { id: "boamesa", name: "Boa Mesa Refeições", icon: "🍲", specialty: "Cozinhas industriais" },
    { id: "raizes", name: "Raízes & Companhia", icon: "🧺", specialty: "Produtos naturais" },
    { id: "estacao", name: "Sabor em Rota", icon: "🚚", specialty: "Logística de alimentos" },
    { id: "colheita", name: "Colheita Serena", icon: "🍃", specialty: "Empório sustentável" },
    { id: "horizonte", name: "Horizonte Orgânicos", icon: "🌅", specialty: "Assinaturas semanais" }
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
    { id: "sellRoots100", series: "rootsMarket", stage: 1, title: "Raízes na feira I", desc: "Venda 150 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 150, reward: { coins: 900 } },
    { id: "sellRoots300", series: "rootsMarket", stage: 2, title: "Raízes na feira II", desc: "Venda 500 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 500, reward: { coins: 2400, research: 2 } },
    { id: "sellRoots1000", series: "rootsMarket", stage: 3, title: "Raízes na feira III", desc: "Venda 1.800 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 1800, reward: { coins: 6800, research: 6 } },
    { id: "sellRoots3000", series: "rootsMarket", stage: 4, title: "Raízes na feira IV", desc: "Venda 6.000 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 6000, reward: { prestige: 2, research: 14 } },
    { id: "sellRoots15000", series: "rootsMarket", stage: 5, title: "Raízes na feira V", desc: "Venda 15.000 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 15000, reward: { prestige: 5, research: 28 } },

    { id: "orders3", series: "orders", stage: 1, title: "Caderno de encomendas I", desc: "Conclua 5 pedidos permanentes.", metric: "orders", target: 5, reward: { research: 4 } },
    { id: "orders15", series: "orders", stage: 2, title: "Caderno de encomendas II", desc: "Conclua 20 pedidos permanentes.", metric: "orders", target: 20, reward: { coins: 10500, research: 9 } },
    { id: "orders50", series: "orders", stage: 3, title: "Caderno de encomendas III", desc: "Conclua 60 pedidos permanentes ao longo das jornadas.", metric: "orders", target: 60, reward: { prestige: 3, research: 22 } },
    { id: "orders120", series: "orders", stage: 4, title: "Caderno de encomendas IV", desc: "Conclua 150 pedidos permanentes ao longo das jornadas.", metric: "orders", target: 150, reward: { prestige: 7, research: 48 } },
    { id: "orders350", series: "orders", stage: 5, title: "Caderno de encomendas V", desc: "Conclua 350 pedidos permanentes ao longo das jornadas.", metric: "orders", target: 350, reward: { prestige: 14, research: 90 } },

    { id: "contracts3", series: "contracts", stage: 1, title: "Acordos empresariais I", desc: "Conclua 5 contratos empresariais.", metric: "contracts", target: 5, reward: { coins: 2000, research: 3 } },
    { id: "contracts10", series: "contracts", stage: 2, title: "Acordos empresariais II", desc: "Conclua 15 contratos empresariais.", metric: "contracts", target: 15, reward: { coins: 8000, research: 7 } },
    { id: "contracts25", series: "contracts", stage: 3, title: "Acordos empresariais III", desc: "Conclua 40 contratos empresariais.", metric: "contracts", target: 40, reward: { coins: 23000, research: 15 } },
    { id: "contracts60", series: "contracts", stage: 4, title: "Acordos empresariais IV", desc: "Conclua 90 contratos empresariais.", metric: "contracts", target: 90, reward: { prestige: 6, research: 34 } },
    { id: "contracts180", series: "contracts", stage: 5, title: "Acordos empresariais V", desc: "Conclua 180 contratos empresariais.", metric: "contracts", target: 180, reward: { prestige: 12, research: 68 } },

    { id: "own5", series: "collection", stage: 1, title: "Horta variada I", desc: "Compre 8 culturas diferentes em uma jornada.", metric: "owned", target: 8, reward: { research: 5 } },
    { id: "own20", series: "collection", stage: 2, title: "Horta variada II", desc: "Compre 25 culturas diferentes em uma jornada.", metric: "owned", target: 25, reward: { coins: 15000, research: 12 } },
    { id: "own40", series: "collection", stage: 3, title: "Horta variada III", desc: "Compre 45 culturas diferentes em uma jornada.", metric: "owned", target: 45, reward: { prestige: 4, research: 24 } },
    { id: "own60", series: "collection", stage: 4, title: "Catálogo completo", desc: "Compre todas as 60 culturas em uma jornada.", metric: "owned", target: 60, reward: { prestige: 10, research: 50 } },

    { id: "cropLevels20", series: "cropLevels", stage: 1, title: "Canteiros experientes I", desc: "Some 50 níveis entre as plantações.", metric: "cropLevels", target: 50, reward: { coins: 4800 } },
    { id: "cropLevels200", series: "cropLevels", stage: 2, title: "Canteiros experientes II", desc: "Some 400 níveis entre as plantações.", metric: "cropLevels", target: 400, reward: { coins: 23000, research: 12 } },
    { id: "cropLevels1000", series: "cropLevels", stage: 3, title: "Canteiros experientes III", desc: "Some 1.500 níveis entre as plantações.", metric: "cropLevels", target: 1500, reward: { prestige: 5, research: 30 } },
    { id: "cropLevels5000", series: "cropLevels", stage: 4, title: "Canteiros experientes IV", desc: "Some 5.000 níveis entre as plantações.", metric: "cropLevels", target: 5000, reward: { prestige: 12, research: 70 } },

    { id: "sellFruit500", series: "fruitMarket", stage: 1, title: "Banca colorida I", desc: "Venda 800 frutos no mercado.", metric: "categorySold", category: "fruit", target: 800, reward: { research: 8 } },
    { id: "sellFruit2000", series: "fruitMarket", stage: 2, title: "Banca colorida II", desc: "Venda 3.000 frutos no mercado.", metric: "categorySold", category: "fruit", target: 3000, reward: { coins: 19000, research: 17 } },
    { id: "sellFruit8000", series: "fruitMarket", stage: 3, title: "Banca colorida III", desc: "Venda 10.000 frutos no mercado.", metric: "categorySold", category: "fruit", target: 10000, reward: { prestige: 5, research: 34 } },

    { id: "sellGrain1500", series: "grainMarket", stage: 1, title: "Safra de grãos I", desc: "Venda 2.000 grãos no mercado.", metric: "categorySold", category: "grain", target: 2000, reward: { prestige: 1, research: 14 } },
    { id: "sellGrain6000", series: "grainMarket", stage: 2, title: "Safra de grãos II", desc: "Venda 8.000 grãos no mercado.", metric: "categorySold", category: "grain", target: 8000, reward: { prestige: 5, research: 32 } },

    { id: "stock1000", series: "storage", stage: 1, title: "Celeiro movimentado I", desc: "Mantenha 1.500 produtos ao mesmo tempo no estoque.", metric: "stock", target: 1500, reward: { research: 12 } },
    { id: "stock5000", series: "storage", stage: 2, title: "Celeiro movimentado II", desc: "Mantenha 6.500 produtos ao mesmo tempo no estoque.", metric: "stock", target: 6500, reward: { prestige: 4, research: 30 } },

    { id: "farm20", series: "farmLevel", stage: 1, title: "Fazenda consolidada I", desc: "Alcance o nível 20 da fazenda.", metric: "farmLevel", target: 20, reward: { coins: 34000, research: 17 } },
    { id: "farm35", series: "farmLevel", stage: 2, title: "Fazenda consolidada II", desc: "Alcance o nível 35 da fazenda.", metric: "farmLevel", target: 35, reward: { prestige: 5, research: 28 } },
    { id: "farm50", series: "farmLevel", stage: 3, title: "Fazenda consolidada III", desc: "Alcance o nível 50 da fazenda.", metric: "farmLevel", target: 50, reward: { prestige: 9, research: 55 } },

    { id: "prestige1", series: "prestige", stage: 1, title: "Um novo começo", desc: "Realize seu primeiro prestígio.", metric: "prestiges", target: 1, reward: { prestige: 2 } },
    { id: "prestige2", series: "prestige", stage: 2, title: "Prestígio dos prestígios", desc: "Realize 3 prestígios e dobre permanentemente os pontos dos próximos prestígios.", metric: "prestiges", target: 3, reward: { permanent: "prestigeDouble" } },
    { id: "prestige5", series: "prestige", stage: 3, title: "Ciclos da terra", desc: "Realize 7 prestígios.", metric: "prestiges", target: 7, reward: { prestige: 9 } },
    { id: "prestige10", series: "prestige", stage: 4, title: "Legado de muitas safras", desc: "Realize 15 prestígios.", metric: "prestiges", target: 15, reward: { prestige: 22 } },

    { id: "market10000", series: "market", stage: 1, title: "Referência regional I", desc: "Venda 15.000 produtos no mercado ao longo das jornadas.", metric: "sold", target: 15000, reward: { prestige: 6, research: 34 } },
    { id: "market50000", series: "market", stage: 2, title: "Referência regional II", desc: "Venda 75.000 produtos no mercado ao longo das jornadas.", metric: "sold", target: 75000, reward: { prestige: 14, research: 78 } },
    { id: "market250000", series: "market", stage: 3, title: "Referência regional III", desc: "Venda 250.000 produtos no mercado ao longo das jornadas.", metric: "sold", target: 250000, reward: { prestige: 28, research: 150 } }
  ];

  return { categories, crops, upgrades, research, prestigeUpgrades, companies, orderSteps, missions };
})();
