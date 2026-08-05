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

  const seasons = [
    { id: "spring", name: "Primavera", icon: "img/spring.png", color: "#82bd68", soft: "#e9f6df", description: "Brotação gentil: folhas e raízes crescem melhor." },
    { id: "summer", name: "Verão", icon: "img/summer.png", color: "#e7ad47", soft: "#fff0c9", description: "Dias longos: frutos e culturas tropicais prosperam." },
    { id: "autumn", name: "Outono", icon: "img/autumn.png", color: "#c7794f", soft: "#f9dfcf", description: "Safra abundante: grãos e pomares rendem mais." },
    { id: "winter", name: "Inverno", icon: "img/winter.png", color: "#70aeba", soft: "#dff1f4", description: "Ritmo sereno: armazenamento e pesquisa recebem bônus." }
  ];

  const cropRows = [
    ["onion", "Cebola", "root", 0, ["spring", "autumn"]],
    ["carrot", "Cenoura", "root", 1, ["spring"]],
    ["bellPepper", "Pimentão", "fruit", 2, ["summer"]],
    ["sweetPotato", "Batata-doce", "root", 3, ["autumn"]],
    ["leaf", "Folha", "leaf", 4, ["spring"]],
    ["garlic", "Alho", "root", 5, ["spring", "autumn"]],
    ["tomato", "Tomate", "fruit", 6, ["summer"]],
    ["banana", "Banana", "tropical", 7, ["summer"]],
    ["melon", "Melão", "fruit", 8, ["summer"]],
    ["potato", "Batata", "root", 9, ["autumn"]],
    ["watermelon", "Melancia", "fruit", 10, ["summer"]],
    ["cashew", "Caju", "tropical", 11, ["summer"]],
    ["lettuce", "Alface", "leaf", 12, ["spring", "winter"]],
    ["eggplant", "Berinjela", "fruit", 13, ["summer"]],
    ["apple", "Maçã", "tree", 14, ["autumn"]],
    ["cucumber", "Pepino", "fruit", 15, ["spring", "summer"]],
    ["chili", "Pimenta", "fruit", 16, ["summer"]],
    ["cherry", "Cereja", "tree", 17, ["spring"]],
    ["lemon", "Limão", "tree", 18, ["summer"]],
    ["passionFruit", "Maracujá", "tropical", 19, ["summer"]],
    ["papaya", "Mamão", "tropical", 20, ["summer"]],
    ["beet", "Beterraba", "root", 21, ["spring", "autumn"]],
    ["grape", "Uva", "tree", 22, ["autumn"]],
    ["pumpkin", "Abóbora", "fruit", 23, ["autumn"]],
    ["pear", "Pera", "tree", 24, ["autumn"]],
    ["avocado", "Abacate", "tree", 25, ["summer"]],
    ["strawberry", "Morango", "bush", 26, ["spring"]],
    ["orange", "Laranja", "tree", 27, ["winter"]],
    ["kiwi", "Kiwi", "tree", 28, ["autumn"]],
    ["blueberry", "Mirtilo", "bush", 29, ["spring"]],
    ["pineapple", "Abacaxi", "tropical", 30, ["summer"]],
    ["dragonFruit", "Pitaya", "tropical", 31, ["summer"]],
    ["corn", "Milho", "grain", 32, ["summer", "autumn"]],
    ["starFruit", "Carambola", "tropical", 33, ["summer"]],
    ["mango", "Manga", "tropical", 34, ["summer"]],
    ["guava", "Goiaba", "tropical", 35, ["summer"]],
    ["blackberry", "Amora", "bush", 36, ["spring"]],
    ["guarana", "Guaraná", "industry", 37, ["summer"]],
    ["peach", "Pêssego", "tree", 38, ["spring", "summer"]],
    ["coconut", "Coco", "tropical", 39, ["summer"]],
    ["cabbage", "Repolho", "leaf", 40, ["winter"]],
    ["kale", "Couve", "leaf", 41, ["winter"]],
    ["broccoli", "Brócolis", "leaf", 42, ["winter"]],
    ["cotton", "Algodão", "industry", 43, ["summer"]],
    ["spinach", "Espinafre", "leaf", 44, ["winter"]],
    ["rice", "Arroz", "grain", 45, ["summer"]],
    ["cassava", "Mandioca", "root", 46, ["summer", "autumn"]],
    ["coffee", "Café", "industry", 47, ["autumn"]],
    ["cauliflower", "Couve-flor", "leaf", 48, ["winter"]],
    ["bean", "Feijão", "grain", 49, ["spring"]],
    ["wheat", "Trigo", "grain", 50, ["autumn"]],
    ["radish", "Rabanete", "root", 51, ["spring"]],
    ["oat", "Aveia", "grain", 52, ["autumn"]],
    ["pea", "Ervilha", "grain", 53, ["spring"]],
    ["soy", "Soja", "grain", 54, ["summer"]],
    ["raspberry", "Framboesa", "bush", 55, ["spring"]],
    ["tangerine", "Tangerina", "tree", 56, ["winter"]],
    ["fig", "Figo", "tree", 57, ["summer", "autumn"]],
    ["plum", "Ameixa", "tree", 58, ["spring"]],
    ["acerola", "Acerola", "tropical", 59, ["summer"]]
  ];

  const crops = cropRows.map(([id, name, category, imageIndex, best], index) => {
    const band = Math.floor(index / 10);
    return {
      id,
      name,
      category,
      image: `img/${imageIndex}.png`,
      best,
      index,
      unlockLevel: 1 + Math.floor(index * 0.58),
      cost: index === 0 ? 0 : Math.round(42 * Math.pow(1.43, index) + index * 18),
      basePrice: Math.max(2, Math.round(2.2 * Math.pow(1.205, index))),
      baseGrowth: Number((5.2 + index * 0.52 + band * 0.9).toFixed(1)),
      baseYield: 2 + Math.floor(index / 9)
    };
  });

  const upgrades = [
    { id: "irrigation", name: "Irrigação silenciosa", icon: "💧", desc: "+8% de velocidade para todas as culturas.", max: 25, baseCost: 180, growth: 1.72, currency: "coins" },
    { id: "fertilizer", name: "Composto orgânico", icon: "🌱", desc: "+10% de rendimento por colheita.", max: 25, baseCost: 230, growth: 1.76, currency: "coins" },
    { id: "warehouse", name: "Celeiro modular", icon: "🏡", desc: "+100 espaços no estoque compartilhado.", max: 30, baseCost: 300, growth: 1.62, currency: "coins" },
    { id: "logistics", name: "Rotas tranquilas", icon: "🚚", desc: "+7% no valor de todas as vendas.", max: 20, baseCost: 520, growth: 1.69, currency: "coins" },
    { id: "greenhouse", name: "Estufa acolhedora", icon: "☀️", desc: "Fortalece bônus sazonais e reduz penalidades.", max: 15, baseCost: 760, growth: 1.78, currency: "coins" }
  ];

  const research = [
    { id: "genetics", name: "Sementes resilientes", icon: "🧬", desc: "+7% de produção por nível.", max: 16, baseCost: 2, growth: 1.55 },
    { id: "hydroponics", name: "Hidroponia modular", icon: "🫧", desc: "+6% de velocidade por nível.", max: 16, baseCost: 2, growth: 1.57 },
    { id: "marketData", name: "Mercado cooperativo", icon: "📈", desc: "+4% no preço de venda por nível.", max: 18, baseCost: 3, growth: 1.6 },
    { id: "storageScience", name: "Conservação natural", icon: "🧺", desc: "+50 espaços no estoque compartilhado.", max: 15, baseCost: 3, growth: 1.61 },
    { id: "contractAI", name: "Planejamento industrial", icon: "📋", desc: "+8% nas recompensas de contratos.", max: 14, baseCost: 4, growth: 1.67 },
    { id: "prestigeTheory", name: "Memória da terra", icon: "✨", desc: "+8% nos pontos obtidos ao prestigiar.", max: 12, baseCost: 6, growth: 1.74 }
  ];

  const prestigeUpgrades = [
    { id: "seedCapital", name: "Capital de sementes", icon: "🪙", desc: "+250 moedas iniciais por nível.", max: 20, baseCost: 1, growth: 1.48 },
    { id: "rootMemory", name: "Herança de sementes", icon: "🌿", desc: "Reduz em 4% o custo de compra das culturas por nível.", max: 12, baseCost: 2, growth: 1.62 },
    { id: "greenLegacy", name: "Legado verde", icon: "🍃", desc: "+4% de velocidade e +3% de produção por nível.", max: 20, baseCost: 1, growth: 1.58 },
    { id: "merchantCrown", name: "Feira permanente", icon: "🏷️", desc: "+5% no valor de venda por nível.", max: 18, baseCost: 2, growth: 1.64 },
    { id: "academyLegacy", name: "Caderno ancestral", icon: "📚", desc: "+10% de pesquisa recebida por nível.", max: 12, baseCost: 3, growth: 1.72 },
    { id: "storageLegacy", name: "Celeiro ancestral", icon: "🪵", desc: "+75 espaços permanentes no estoque compartilhado.", max: 15, baseCost: 2, growth: 1.66 }
  ];


  const companies = [
    { id: "aurora", name: "Alimentos Aurora", icon: "🌤️", specialty: "Cestas frescas" },
    { id: "verdevale", name: "Mercado Verde Vale", icon: "🏪", specialty: "Rede de mercados" },
    { id: "campodourado", name: "Campo Dourado", icon: "🌾", specialty: "Distribuição regional" },
    { id: "boamesa", name: "Boa Mesa Refeições", icon: "🍲", specialty: "Cozinhas industriais" },
    { id: "raizes", name: "Raízes & Companhia", icon: "🧺", specialty: "Produtos naturais" },
    { id: "estacao", name: "Estação Sabor", icon: "🚚", specialty: "Logística de alimentos" },
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
    { id: "sellRoots100", title: "Raízes na feira", desc: "Venda 100 raízes e tubérculos diretamente no mercado.", metric: "categorySold", category: "root", target: 100, reward: { coins: 700 } },
    { id: "orders3", title: "Caderno de encomendas", desc: "Conclua 3 pedidos estáticos de qualquer cultura.", metric: "orders", target: 3, reward: { research: 3 } },
    { id: "contracts3", title: "Primeiros acordos", desc: "Conclua 3 contratos aceitos de empresas parceiras.", metric: "contracts", target: 3, reward: { coins: 1400, research: 2 } },
    { id: "own5", title: "Horta variada", desc: "Compre 5 culturas diferentes.", metric: "owned", target: 5, reward: { research: 4 } },
    { id: "cropLevels20", title: "Canteiros experientes", desc: "Some 20 níveis de aprimoramento entre as plantações.", metric: "cropLevels", target: 20, reward: { coins: 3500 } },
    { id: "sellFruit500", title: "Banca colorida", desc: "Venda 500 frutos diretamente no mercado.", metric: "categorySold", category: "fruit", target: 500, reward: { research: 7 } },
    { id: "orders15", title: "Clientes recorrentes", desc: "Conclua 15 pedidos estáticos.", metric: "orders", target: 15, reward: { coins: 8500, research: 8 } },
    { id: "stock1000", title: "Celeiro movimentado", desc: "Mantenha 1.000 produtos ao mesmo tempo no estoque compartilhado.", metric: "stock", target: 1000, reward: { research: 10 } },
    { id: "contracts25", title: "Parceiro confiável", desc: "Conclua 25 contratos aceitos de empresas parceiras.", metric: "contracts", target: 25, reward: { coins: 18000, research: 12 } },
    { id: "sellGrain1500", title: "Safra de grãos", desc: "Venda 1.500 grãos diretamente no mercado.", metric: "categorySold", category: "grain", target: 1500, reward: { prestige: 1, research: 12 } },
    { id: "farm20", title: "Fazenda consolidada", desc: "Alcance o nível 20 da fazenda.", metric: "farmLevel", target: 20, reward: { coins: 30000, research: 15 } },
    { id: "orders50", title: "Livro-caixa completo", desc: "Conclua 50 pedidos estáticos ao longo das jornadas.", metric: "orders", target: 50, reward: { prestige: 3, research: 20 } },
    { id: "prestige1", title: "Uma nova primavera", desc: "Realize seu primeiro prestígio.", metric: "prestiges", target: 1, reward: { prestige: 2 } },
    { id: "prestige2", title: "Prestígio dos prestígios", desc: "Realize 2 prestígios. Depois disso, todos os próximos prestígios concedem o dobro de pontos.", metric: "prestiges", target: 2, reward: { permanent: "prestigeDouble" } },
    { id: "market10000", title: "Referência regional", desc: "Venda 10.000 produtos diretamente no mercado ao longo das jornadas.", metric: "sold", target: 10000, reward: { prestige: 5, research: 30 } }
  ];

  return { categories, seasons, crops, upgrades, research, prestigeUpgrades, companies, orderSteps, missions };
})();
