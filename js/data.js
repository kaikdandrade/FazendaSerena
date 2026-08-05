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
    ["onion", "Cebola", "root", 0],
    ["carrot", "Cenoura", "root", 1],
    ["bellPepper", "Pimentão", "fruit", 2],
    ["sweetPotato", "Batata-doce", "root", 3],
    ["leaf", "Folha", "leaf", 4],
    ["garlic", "Alho", "root", 5],
    ["tomato", "Tomate", "fruit", 6],
    ["banana", "Banana", "tropical", 7],
    ["melon", "Melão", "fruit", 8],
    ["potato", "Batata", "root", 9],
    ["watermelon", "Melancia", "fruit", 10],
    ["cashew", "Caju", "tropical", 11],
    ["lettuce", "Alface", "leaf", 12],
    ["eggplant", "Berinjela", "fruit", 13],
    ["apple", "Maçã", "tree", 14],
    ["cucumber", "Pepino", "fruit", 15],
    ["chili", "Pimenta", "fruit", 16],
    ["cherry", "Cereja", "tree", 17],
    ["lemon", "Limão", "tree", 18],
    ["passionFruit", "Maracujá", "tropical", 19],
    ["papaya", "Mamão", "tropical", 20],
    ["beet", "Beterraba", "root", 21],
    ["grape", "Uva", "tree", 22],
    ["pumpkin", "Abóbora", "fruit", 23],
    ["pear", "Pera", "tree", 24],
    ["avocado", "Abacate", "tree", 25],
    ["strawberry", "Morango", "bush", 26],
    ["orange", "Laranja", "tree", 27],
    ["kiwi", "Kiwi", "tree", 28],
    ["blueberry", "Mirtilo", "bush", 29],
    ["pineapple", "Abacaxi", "tropical", 30],
    ["dragonFruit", "Pitaya", "tropical", 31],
    ["corn", "Milho", "grain", 32],
    ["starFruit", "Carambola", "tropical", 33],
    ["mango", "Manga", "tropical", 34],
    ["guava", "Goiaba", "tropical", 35],
    ["blackberry", "Amora", "bush", 36],
    ["guarana", "Guaraná", "industry", 37],
    ["peach", "Pêssego", "tree", 38],
    ["coconut", "Coco", "tropical", 39],
    ["cabbage", "Repolho", "leaf", 40],
    ["kale", "Couve", "leaf", 41],
    ["broccoli", "Brócolis", "leaf", 42],
    ["cotton", "Algodão", "industry", 43],
    ["spinach", "Espinafre", "leaf", 44],
    ["rice", "Arroz", "grain", 45],
    ["cassava", "Mandioca", "root", 46],
    ["coffee", "Café", "industry", 47],
    ["cauliflower", "Couve-flor", "leaf", 48],
    ["bean", "Feijão", "grain", 49],
    ["wheat", "Trigo", "grain", 50],
    ["radish", "Rabanete", "root", 51],
    ["oat", "Aveia", "grain", 52],
    ["pea", "Ervilha", "grain", 53],
    ["soy", "Soja", "grain", 54],
    ["raspberry", "Framboesa", "bush", 55],
    ["tangerine", "Tangerina", "tree", 56],
    ["fig", "Figo", "tree", 57],
    ["plum", "Ameixa", "tree", 58],
    ["acerola", "Acerola", "tropical", 59]
  ];

  const crops = cropRows.map(([id, name, category, imageIndex], index) => {
    return {
      id,
      name,
      category,
      image: `img/${imageIndex}.png`,
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
    { id: "irrigation", name: "Irrigação silenciosa", icon: "💧", desc: "+8% de velocidade para todas as culturas.", max: 25, baseCost: 180, growth: 1.72, currency: "coins" },
    { id: "fertilizer", name: "Composto orgânico", icon: "🌱", desc: "+10% de rendimento por colheita.", max: 25, baseCost: 230, growth: 1.76, currency: "coins" },
    { id: "warehouse", name: "Celeiro modular", icon: "🏡", desc: "+20% de capacidade no estoque compartilhado por nível.", max: 30, baseCost: 300, growth: 1.62, currency: "coins" },
    { id: "logistics", name: "Rotas tranquilas", icon: "🚚", desc: "+7% no valor de todas as vendas.", max: 20, baseCost: 520, growth: 1.69, currency: "coins" }
  ];

  const research = [
    { id: "genetics", name: "Sementes resilientes", icon: "🧬", desc: "+7% de produção por nível.", max: 16, baseCost: 2, growth: 1.55 },
    { id: "hydroponics", name: "Hidroponia modular", icon: "🫧", desc: "+6% de velocidade por nível.", max: 16, baseCost: 2, growth: 1.57 },
    { id: "marketData", name: "Mercado cooperativo", icon: "📈", desc: "+4% no preço de venda por nível.", max: 18, baseCost: 3, growth: 1.6 },
    { id: "storageScience", name: "Conservação natural", icon: "🧺", desc: "+12% de capacidade no estoque compartilhado por nível.", max: 15, baseCost: 3, growth: 1.61 },
    { id: "contractAI", name: "Planejamento industrial", icon: "📋", desc: "+8% nas recompensas de contratos.", max: 14, baseCost: 4, growth: 1.67 },
    { id: "prestigeTheory", name: "Memória da terra", icon: "✨", desc: "+8% nos pontos obtidos ao prestigiar.", max: 12, baseCost: 6, growth: 1.74 }
  ];

  const prestigeUpgrades = [
    { id: "seedCapital", name: "Capital de sementes", icon: "🪙", desc: "+250 moedas iniciais por nível.", max: 20, baseCost: 1, growth: 1.48 },
    { id: "rootMemory", name: "Herança de sementes", icon: "🌿", desc: "Reduz em 4% o custo de compra das culturas por nível.", max: 12, baseCost: 2, growth: 1.62 },
    { id: "greenLegacy", name: "Legado verde", icon: "🍃", desc: "+4% de velocidade e +3% de produção por nível.", max: 20, baseCost: 1, growth: 1.58 },
    { id: "merchantCrown", name: "Feira permanente", icon: "🏷️", desc: "+5% no valor de venda por nível.", max: 18, baseCost: 2, growth: 1.64 },
    { id: "academyLegacy", name: "Caderno ancestral", icon: "📚", desc: "+10% de pesquisa recebida por nível.", max: 12, baseCost: 3, growth: 1.72 },
    { id: "storageLegacy", name: "Celeiro ancestral", icon: "🪵", desc: "+25% de capacidade permanente no estoque compartilhado por nível.", max: 15, baseCost: 2, growth: 1.66 }
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
    { id: "sellRoots100", series: "rootsMarket", stage: 1, title: "Raízes na feira I", desc: "Venda 100 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 100, reward: { coins: 700 } },
    { id: "sellRoots300", series: "rootsMarket", stage: 2, title: "Raízes na feira II", desc: "Venda 300 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 300, reward: { coins: 1800, research: 2 } },
    { id: "sellRoots1000", series: "rootsMarket", stage: 3, title: "Raízes na feira III", desc: "Venda 1.000 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 1000, reward: { coins: 5200, research: 5 } },
    { id: "sellRoots3000", series: "rootsMarket", stage: 4, title: "Raízes na feira IV", desc: "Venda 3.000 raízes e tubérculos no mercado.", metric: "categorySold", category: "root", target: 3000, reward: { prestige: 1, research: 10 } },

    { id: "orders3", series: "orders", stage: 1, title: "Caderno de encomendas I", desc: "Conclua 3 pedidos permanentes.", metric: "orders", target: 3, reward: { research: 3 } },
    { id: "orders15", series: "orders", stage: 2, title: "Caderno de encomendas II", desc: "Conclua 15 pedidos permanentes.", metric: "orders", target: 15, reward: { coins: 8500, research: 8 } },
    { id: "orders50", series: "orders", stage: 3, title: "Caderno de encomendas III", desc: "Conclua 50 pedidos permanentes ao longo das jornadas.", metric: "orders", target: 50, reward: { prestige: 3, research: 20 } },
    { id: "orders120", series: "orders", stage: 4, title: "Caderno de encomendas IV", desc: "Conclua 120 pedidos permanentes ao longo das jornadas.", metric: "orders", target: 120, reward: { prestige: 7, research: 45 } },

    { id: "contracts3", series: "contracts", stage: 1, title: "Acordos empresariais I", desc: "Conclua 3 contratos empresariais.", metric: "contracts", target: 3, reward: { coins: 1400, research: 2 } },
    { id: "contracts10", series: "contracts", stage: 2, title: "Acordos empresariais II", desc: "Conclua 10 contratos empresariais.", metric: "contracts", target: 10, reward: { coins: 6000, research: 6 } },
    { id: "contracts25", series: "contracts", stage: 3, title: "Acordos empresariais III", desc: "Conclua 25 contratos empresariais.", metric: "contracts", target: 25, reward: { coins: 18000, research: 12 } },
    { id: "contracts60", series: "contracts", stage: 4, title: "Acordos empresariais IV", desc: "Conclua 60 contratos empresariais.", metric: "contracts", target: 60, reward: { prestige: 5, research: 30 } },

    { id: "own5", series: "collection", stage: 1, title: "Horta variada I", desc: "Compre 5 culturas diferentes em uma jornada.", metric: "owned", target: 5, reward: { research: 4 } },
    { id: "own20", series: "collection", stage: 2, title: "Horta variada II", desc: "Compre 20 culturas diferentes em uma jornada.", metric: "owned", target: 20, reward: { coins: 12000, research: 10 } },
    { id: "own40", series: "collection", stage: 3, title: "Horta variada III", desc: "Compre 40 culturas diferentes em uma jornada.", metric: "owned", target: 40, reward: { prestige: 3, research: 20 } },
    { id: "own60", series: "collection", stage: 4, title: "Catálogo completo", desc: "Compre todas as 60 culturas em uma jornada.", metric: "owned", target: 60, reward: { prestige: 10, research: 50 } },

    { id: "cropLevels20", series: "cropLevels", stage: 1, title: "Canteiros experientes I", desc: "Some 20 níveis entre as plantações.", metric: "cropLevels", target: 20, reward: { coins: 3500 } },
    { id: "cropLevels200", series: "cropLevels", stage: 2, title: "Canteiros experientes II", desc: "Some 200 níveis entre as plantações.", metric: "cropLevels", target: 200, reward: { coins: 18000, research: 10 } },
    { id: "cropLevels1000", series: "cropLevels", stage: 3, title: "Canteiros experientes III", desc: "Some 1.000 níveis entre as plantações.", metric: "cropLevels", target: 1000, reward: { prestige: 4, research: 25 } },

    { id: "sellFruit500", series: "fruitMarket", stage: 1, title: "Banca colorida I", desc: "Venda 500 frutos no mercado.", metric: "categorySold", category: "fruit", target: 500, reward: { research: 7 } },
    { id: "sellFruit2000", series: "fruitMarket", stage: 2, title: "Banca colorida II", desc: "Venda 2.000 frutos no mercado.", metric: "categorySold", category: "fruit", target: 2000, reward: { coins: 15000, research: 15 } },
    { id: "sellFruit8000", series: "fruitMarket", stage: 3, title: "Banca colorida III", desc: "Venda 8.000 frutos no mercado.", metric: "categorySold", category: "fruit", target: 8000, reward: { prestige: 4, research: 30 } },

    { id: "sellGrain1500", series: "grainMarket", stage: 1, title: "Safra de grãos I", desc: "Venda 1.500 grãos no mercado.", metric: "categorySold", category: "grain", target: 1500, reward: { prestige: 1, research: 12 } },
    { id: "sellGrain6000", series: "grainMarket", stage: 2, title: "Safra de grãos II", desc: "Venda 6.000 grãos no mercado.", metric: "categorySold", category: "grain", target: 6000, reward: { prestige: 4, research: 28 } },

    { id: "stock1000", series: "storage", stage: 1, title: "Celeiro movimentado I", desc: "Mantenha 1.000 produtos ao mesmo tempo no estoque.", metric: "stock", target: 1000, reward: { research: 10 } },
    { id: "stock5000", series: "storage", stage: 2, title: "Celeiro movimentado II", desc: "Mantenha 5.000 produtos ao mesmo tempo no estoque.", metric: "stock", target: 5000, reward: { prestige: 3, research: 25 } },

    { id: "farm20", series: "farmLevel", stage: 1, title: "Fazenda consolidada I", desc: "Alcance o nível 20 da fazenda.", metric: "farmLevel", target: 20, reward: { coins: 30000, research: 15 } },
    { id: "farm35", series: "farmLevel", stage: 2, title: "Fazenda consolidada II", desc: "Alcance o nível 35 da fazenda.", metric: "farmLevel", target: 35, reward: { prestige: 4, research: 25 } },
    { id: "farm50", series: "farmLevel", stage: 3, title: "Fazenda consolidada III", desc: "Alcance o nível 50 da fazenda.", metric: "farmLevel", target: 50, reward: { prestige: 8, research: 50 } },

    { id: "prestige1", series: "prestige", stage: 1, title: "Um novo começo", desc: "Realize seu primeiro prestígio.", metric: "prestiges", target: 1, reward: { prestige: 2 } },
    { id: "prestige2", series: "prestige", stage: 2, title: "Prestígio dos prestígios", desc: "Realize 2 prestígios e dobre permanentemente os pontos dos próximos prestígios.", metric: "prestiges", target: 2, reward: { permanent: "prestigeDouble" } },
    { id: "prestige5", series: "prestige", stage: 3, title: "Ciclos da terra", desc: "Realize 5 prestígios.", metric: "prestiges", target: 5, reward: { prestige: 8 } },
    { id: "prestige10", series: "prestige", stage: 4, title: "Legado de muitas safras", desc: "Realize 10 prestígios.", metric: "prestiges", target: 10, reward: { prestige: 20 } },

    { id: "market10000", series: "market", stage: 1, title: "Referência regional I", desc: "Venda 10.000 produtos no mercado ao longo das jornadas.", metric: "sold", target: 10000, reward: { prestige: 5, research: 30 } },
    { id: "market50000", series: "market", stage: 2, title: "Referência regional II", desc: "Venda 50.000 produtos no mercado ao longo das jornadas.", metric: "sold", target: 50000, reward: { prestige: 12, research: 70 } }
  ];

  return { categories, crops, upgrades, research, prestigeUpgrades, companies, orderSteps, missions };
})();
