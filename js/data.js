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
      unlockReputation: Math.max(0, Math.floor((index - 3) / 4)),
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
    { id: "rootMemory", name: "Memória das raízes", icon: "🌿", desc: "Comece com +1 cultura já comprada por nível.", max: 12, baseCost: 2, growth: 1.62 },
    { id: "greenLegacy", name: "Legado verde", icon: "🍃", desc: "+4% de velocidade e +3% de produção por nível.", max: 20, baseCost: 1, growth: 1.58 },
    { id: "merchantCrown", name: "Feira permanente", icon: "🏷️", desc: "+5% no valor de venda por nível.", max: 18, baseCost: 2, growth: 1.64 },
    { id: "academyLegacy", name: "Caderno ancestral", icon: "📚", desc: "+10% de pesquisa recebida por nível.", max: 12, baseCost: 3, growth: 1.72 },
    { id: "storageLegacy", name: "Celeiro ancestral", icon: "🪵", desc: "+75 espaços permanentes no estoque compartilhado.", max: 15, baseCost: 2, growth: 1.66 }
  ];

  const missions = [
    { id: "harvest25", title: "Primeiras cestas", desc: "Colha 25 produtos.", metric: "harvested", target: 25, reward: { coins: 160 } },
    { id: "own3", title: "Canteiros variados", desc: "Tenha 3 culturas diferentes.", metric: "owned", target: 3, reward: { research: 2 } },
    { id: "sell100", title: "Feira da vila", desc: "Venda 100 produtos.", metric: "sold", target: 100, reward: { coins: 600, research: 1 } },
    { id: "cropLevels6", title: "Canteiros aprimorados", desc: "Some 6 níveis entre suas plantações.", metric: "cropLevels", target: 6, reward: { coins: 850 } },
    { id: "contract3", title: "Parcerias locais", desc: "Complete 3 contratos.", metric: "contracts", target: 3, reward: { research: 5 } },
    { id: "cropLevel8", title: "Cultivo experiente", desc: "Aprimore uma plantação até o nível 8.", metric: "maxCropLevel", target: 8, reward: { coins: 1800, research: 3 } },
    { id: "farm12", title: "Fazenda florescente", desc: "Alcance o nível 12 da fazenda.", metric: "farmLevel", target: 12, reward: { coins: 5000, research: 5 } },
    { id: "stock1000", title: "Celeiro cheio", desc: "Mantenha 1.000 produtos em estoque.", metric: "stock", target: 1000, reward: { research: 8 } },
    { id: "earn100k", title: "Cooperativa próspera", desc: "Ganhe 100 mil moedas no total.", metric: "coinsEarned", target: 100000, reward: { research: 12 } }
  ];

  return { categories, seasons, crops, upgrades, research, prestigeUpgrades, missions };
})();
