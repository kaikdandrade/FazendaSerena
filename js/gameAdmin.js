"use strict";

(() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  };
  const integer = (value, minimum, maximum, fallback) => Math.floor(clamp(value, minimum, maximum, fallback));
  const text = (value, maximum = 240, fallback = "") => {
    const normalized = String(value ?? fallback).replace(/[<>]/g, "").trim();
    return normalized.slice(0, maximum) || fallback;
  };
  const id = (value, fallback = "") => {
    const normalized = String(value ?? fallback).trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    return normalized || fallback;
  };
  const legacyAssetAliases = Object.freeze({
    // Ícones/empresas das revisões anteriores. Estes aliases impedem que
    // configurações já salvas no Firestore apontem para arquivos removidos.
    "assets/icons/company-aurora-foods.png": "assets/icons/arcos-azuis.webp",
    "assets/icons/company-organic-horizon.png": "assets/icons/sol-horizonte.webp",
    "assets/icons/company-flavor-route.png": "assets/icons/caminhao-entrega.webp",
    "assets/icons/company-golden-field.png": "assets/icons/campo-ensolarado.webp",
    "assets/icons/company-good-table-meals.png": "assets/icons/refeicao.webp",
    "assets/icons/company-green-valley-market.png": "assets/icons/galpao-industrial.webp",
    "assets/icons/company-roots-and-company.png": "assets/icons/raizes.webp",
    "assets/icons/company-serene-harvest.png": "assets/icons/fazenda-celeiro.webp",
    "assets/icons/account-prestige.png": "assets/icons/prestigio-conta.webp",
    "assets/icons/barn.png": "assets/icons/galpao-madeira.webp",
    "assets/icons/books.png": "assets/icons/livros.webp",
    "assets/icons/clipboard.png": "assets/icons/prancheta-tarefas.webp",
    "assets/icons/clock.png": "assets/icons/relogio.webp",
    "assets/icons/coin.png": "assets/icons/moeda.webp",
    "assets/icons/commercial-contract.png": "assets/icons/contrato-comercial.webp",
    "assets/icons/contract-dock-arrow.png": "assets/icons/seta-cima.webp",
    "assets/icons/crop-mastery-star.png": "assets/icons/estrela-dominio-cultura.webp",
    "assets/icons/crown.png": "assets/icons/coroa.webp",
    "assets/icons/delivery-truck.png": "assets/icons/caminhao-entrega.webp",
    "assets/icons/feature-lock.png": "assets/icons/cadeado.webp",
    "assets/icons/fertilizer.png": "assets/icons/fertilizante.webp",
    "assets/icons/field-map.png": "assets/icons/mapa.webp",
    "assets/icons/google-logo.png": "assets/icons/logo-google.webp",
    "assets/icons/graduation-cap.png": "assets/icons/chapeu-formatura.webp",
    "assets/icons/harvest-crate.png": "assets/icons/caixa-colheita.webp",
    "assets/icons/irrigation.png": "assets/icons/irrigacao.webp",
    "assets/icons/level-milestone.png": "assets/icons/marco-nivel.webp",
    "assets/icons/package.png": "assets/icons/pacote.webp",
    "assets/icons/potion.png": "assets/icons/pocao-pesquisa.webp",
    "assets/icons/prestige.png": "assets/icons/prestigio.webp",
    "assets/icons/price-estimate.png": "assets/icons/estimativa-preco.webp",
    "assets/icons/pricing.png": "assets/icons/precificacao.webp",
    "assets/icons/profile.png": "assets/icons/perfil.webp",
    "assets/icons/purchase.png": "assets/icons/compra.webp",
    "assets/icons/rank-first.png": "assets/icons/medalha-ranking-1.webp",
    "assets/icons/rank-second.png": "assets/icons/medalha-ranking-2.webp",
    "assets/icons/rank-third.png": "assets/icons/medalha-ranking-3.webp",
    "assets/icons/rank-fourth.png": "assets/icons/medalha-ranking-4.webp",
    "assets/icons/rank-fifth.png": "assets/icons/medalha-ranking-5.webp",
    "assets/icons/rank-outside-top-five.png": "assets/icons/medalha-fora-top-5.webp",
    "assets/icons/ranking.webp": "assets/icons/ranking.webp",
    "assets/icons/reload-contract.png": "assets/icons/renovar-contrato.webp",
    "assets/icons/seedling-pot.png": "assets/icons/muda-vaso.webp",
    "assets/icons/settings.png": "assets/icons/configuracoes.webp",
    "assets/icons/shop.png": "assets/icons/carteira-moedas.webp",
    "assets/icons/silo.webp": "assets/icons/silo.webp",
    "assets/icons/social.webp": "assets/icons/social.webp",
    "assets/icons/tools.png": "assets/icons/ferramentas.webp",
    "assets/icons/upgrade-anvil.png": "assets/icons/ferramentas.webp",
    "assets/icons/warehouse.png": "assets/icons/galpao-industrial.webp",
    "assets/icons/xp.webp": "assets/icons/xp.webp",
    // Nomes antigos de plantas que também mudaram a grafia do arquivo.
    "assets/plants/alho_poro.png": "assets/plants/alho-poro.webp",
    "assets/plants/batata_doce.png": "assets/plants/batata-doce.webp",
    "assets/plants/couve_flor.png": "assets/plants/couve-flor.webp",
    "assets/plants/mamão.png": "assets/plants/mamao.webp"
  });
  const modernizeLocalAssetPath = value => {
    const path = String(value || "").trim();
    if (/^assets\/(?:icons|plants|avatars)\/.+\.png$/i.test(path) || /^assets\/logo\.png$/i.test(path)) {
      return path.replace(/\.png$/i, ".webp");
    }
    return path;
  };
  const assetPath = (value, fallback = "assets/logo.webp") => {
    const normalized = String(value || "").trim();
    const resolved = modernizeLocalAssetPath(legacyAssetAliases[normalized] || normalized);
    const safeFallback = modernizeLocalAssetPath(fallback);
    return /^assets\/[a-zA-Z0-9_./À-ÿ-]+\.(?:webp|svg|ico|jpg|jpeg)$/i.test(resolved) ? resolved : safeFallback;
  };
  const color = (value, fallback = "#f4c95d") => /^#[0-9a-f]{6}$/i.test(String(value || "").trim())
    ? String(value).trim().toLowerCase()
    : fallback;

  const defaultTexts = Object.freeze({
    profileDescription: "Gerencie sua conta, faça amizades, cumpra missões e desenvolva legados permanentes.",
    officeDescription: "Gerencie contratos, acompanhe pedidos e desenvolva novas tecnologias para a fazenda.",
    settingsDescription: "Personalize a navegação, a experiência visual, a formatação e o áudio do jogo.",
    missionsDescription: "Avance em séries contínuas e receba recompensas proporcionais ao desafio.",
    prestigeDescription: "Invista pontos de prestígio em melhorias que permanecem após cada recomeço.",
    researchDescription: "Invista pontos de pesquisa em tecnologias que aperfeiçoam toda a operação da fazenda.",
    emptyCropsCatalog: "Nenhuma planta foi publicada no catálogo administrativo.",
    emptyCropFilter: "Nenhuma planta corresponde aos filtros atuais.",
    emptyStockCategory: "Nenhum item pertence à categoria selecionada.",
    emptyContractCropsCatalog: "Nenhuma planta foi publicada no catálogo administrativo. Os contratos serão liberados automaticamente depois que o catálogo for configurado.",
    emptyContractCompaniesCatalog: "Nenhuma indústria foi publicada no catálogo administrativo. As propostas comerciais aparecerão depois que o catálogo for configurado.",
    emptyContractTypesCatalog: "Nenhum tipo de contrato foi publicado no catálogo administrativo. Cadastre pelo menos um tipo para começar a gerar propostas.",
    emptyContractOwnedCrops: "Compre uma cultura para começar a receber oportunidades comerciais.",
    emptyContractRenewal: "As propostas estão em renovação. Aguarde o término dos intervalos.",
    emptyOrdersCatalog: "Nenhuma etapa de pedido foi publicada no catálogo administrativo.",
    emptyOrdersOwnedCrops: "Compre uma cultura para iniciar sua primeira sequência de pedidos.",
    emptyOrdersComplete: "Todas as séries de pedidos foram concluídas.",
    emptyMissionsCatalog: "Nenhuma missão foi publicada no catálogo administrativo.",
    emptyMissionsComplete: "Todas as séries de missões foram concluídas.",
    emptyResearchCatalog: "Nenhuma pesquisa foi publicada no catálogo administrativo.",
    emptyPrestigeCatalog: "Nenhum legado permanente foi publicado no catálogo administrativo.",
    emptyFriends: "Sua lista de amigos ainda está vazia.",
    emptyIncomingFriends: "Nenhuma solicitação recebida.",
    emptyOutgoingFriends: "Nenhuma solicitação enviada.",
    emptyMissionHistory: "Nenhuma missão concluída ainda.",
    leaderboardLoadingTitle: "Atualizando o ranking global...",
    leaderboardLoadingText: "Consultando as fazendas com maior prestígio e nível atual.",
    leaderboardErrorTitle: "Não foi possível carregar o ranking",
    leaderboardIntroTitle: "Top 5 global",
    leaderboardIntroText: "O ranking prioriza a quantidade de prestígios. Em caso de empate, vence o maior nível atual da fazenda.",
    leaderboardEmptyTitle: "Ainda não há fazendas classificadas",
    leaderboardEmptyText: "Jogadores conectados com apelido e avatar configurados participam automaticamente do ranking global.",
    achievementsEmpty: "Missões concluídas, bônus permanentes e legados comprados aparecerão aqui e nunca serão apagados pelo prestígio.",
    socialEventsEmpty: "Nenhum evento futuro foi anunciado."
  });

  const defaultBalance = Object.freeze({
    actionXPPercent: 1.7,
    cropMasteryXPPercent: 10,
    passiveXPPercentPerSecond: 0.05,
    passiveResearchPercentPerSecond: 0,
    ordersUnlockLevel: 5,
    evolutionsUnlockLevel: 5,
    prestigeUnlockLevel: 40,
    prestigeBonus: 0,
    startingCoins: 120,
    storageCapacity: 200,
    baseProductionMin: 1,
    baseProductionCap: 10,
    contractSignedCooldownRange: [25, 35],
    contractExpiredCooldownRange: [25, 35],
    contractDeclinedCooldownRange: [45, 75],
    contractBrokenCooldownRange: [210, 270],
    contractOfferCount: 6,
    maxOfflineMinutes: 15
  });

  const effectLabels = Object.freeze({
    growthSpeedPercent: "Velocidade de produção (%)",
    yieldPercent: "Rendimento das safras (%)",
    salePricePercent: "Valor das vendas (%)",
    storageCapacityPercent: "Capacidade do estoque (%)",
    cropPurchaseDiscountPercent: "Desconto na compra de plantas (%)",
    cropUpgradeDiscountPercent: "Desconto nos níveis das plantas (%)",
    farmXPGainPercent: "XP recebido (%)",
    passiveXPPercentPerSecond: "XP passivo por segundo (%)",
    contractDurationPercent: "Prazo dos contratos (%)",
    contractCoinRewardPercent: "Moedas recebidas em contratos (%)",
    contractResearchRewardPercent: "Pesquisa recebida em contratos (%)",
    contractPrestigeRewardPercent: "Prestígio recebido em contratos (%)",
    activeContractSlots: "Mais contratos ativos (+)",
    contractOfferCount: "Mais espaços para contratos (+)",
    startingCoins: "Moedas iniciais (+)",
    startingResearch: "Pesquisa inicial (+)",
    passiveResearchPercentPerSecond: "Pesquisa passiva por segundo (%)",
    prestigeGainPercent: "Prestígio obtido (%)",
    autoSalePricePercent: "Valor da venda automática (%)",
    wholesaleOverflowUnlock: "Desbloquear venda atacadista (1 = sim)",
    orderRewardPercent: "Recompensas recebidas por pedidos (%)",
    offlineProductionMinutes: "Produção offline (+ minutos)"
  });
  const effectTypes = new Set(Object.keys(effectLabels));

  const legacyEffects = Object.freeze({
    acceleratedGermination: ["growthSpeedPercent", 7],
    hybridGenetics: ["yieldPercent", 8],
    priceForecast: ["salePricePercent", 6],
    coldChain: ["storageCapacityPercent", 20],
    smartSeedCatalog: ["cropPurchaseDiscountPercent", 4],
    cultivationAlgorithms: ["cropUpgradeDiscountPercent", 4],
    negotiationModels: ["contractCoinRewardPercent", 8],
    logisticsSimulation: ["contractDurationPercent", 6],
    agriculturalPedagogy: ["farmXPGainPercent", 7],
    continuousLearning: ["passiveXPPercentPerSecond", 0.01],
    contractPortfolio: ["activeContractSlots", 1],
    royalTreasury: ["startingCoins", 5000],
    eternalHarvest: ["growthSpeedPercent", 12, "yieldPercent", 10],
    goldenExchange: ["salePricePercent", 15],
    endlessGranary: ["storageCapacityPercent", 60],
    ancestralMastery: ["cropPurchaseDiscountPercent", 8, "cropUpgradeDiscountPercent", 6],
    immortalAcademy: ["contractResearchRewardPercent", 25, "startingResearch", 3],
    laboratoryFunding: ["passiveResearchPercentPerSecond", 0.01],
    prestigeResonance: ["prestigeGainPercent", 20],
    sovereignNetwork: ["contractCoinRewardPercent", 20, "contractDurationPercent", 10, "autoSalePricePercent", 10],
    wholesaleHub: ["wholesaleOverflowUnlock", 1],
    experienceLegacy: ["passiveXPPercentPerSecond", 0.05],
    contractEmpire: ["activeContractSlots", 1]
  });

  const defaultContractSlots = Object.freeze([
    { id: "slotinicial", name: "Slot inicial", unlockLevel: 1 }
  ]);


  const defaultNavigationIcons = Object.freeze({
    farm: "assets/icons/muda-vaso.webp",
    stock: "assets/icons/galpao-industrial.webp",
    office: "assets/icons/prancheta-tarefas.webp",
    profile: "assets/icons/perfil.webp",
    settings: "assets/icons/configuracoes.webp",
    contracts: "assets/icons/contrato-comercial.webp",
    orders: "assets/icons/pacote.webp",
    evolutions: "assets/icons/livros.webp",
    account: "assets/icons/logo-google.webp",
    social: "assets/icons/social.webp",
    missions: "assets/icons/chapeu-formatura.webp"
  });
  function normalizeNavigationIcons(raw = {}) {
    return Object.fromEntries(Object.entries(defaultNavigationIcons).map(([key, fallback]) => [key, assetPath(raw?.[key], fallback)]));
  }
  const defaultGridNavigationIcons = Object.freeze({
    farm: defaultNavigationIcons.farm,
    stock: defaultNavigationIcons.stock,
    contracts: defaultNavigationIcons.contracts,
    orders: defaultNavigationIcons.orders,
    evolutions: defaultNavigationIcons.evolutions,
    account: defaultNavigationIcons.account,
    social: defaultNavigationIcons.social,
    missions: defaultNavigationIcons.missions,
    settings: defaultNavigationIcons.settings
  });
  const defaultPrestigeIcons = Object.freeze({
    resource: "assets/icons/prestigio.webp",
    account: "assets/icons/prestigio.webp",
    legacy: "assets/icons/prestigio.webp"
  });
  const defaultPrestigeIconOrder = Object.freeze(["resource", "account", "legacy"]);
  function normalizePrestigeIcons(raw = {}) {
    return Object.fromEntries(Object.entries(defaultPrestigeIcons).map(([key, fallback]) => [key, assetPath(raw?.[key], fallback)]));
  }
  const defaultLineNavigationOrder = Object.freeze(["farm", "stock", "office", "profile", "settings", "contracts", "orders", "evolutions", "account", "social", "missions"]);
  const defaultGridNavigationOrder = Object.freeze(["farm", "stock", "contracts", "orders", "evolutions", "account", "social", "missions", "settings"]);
  function normalizeGridNavigationIcons(raw = {}, line = defaultNavigationIcons) {
    return Object.fromEntries(Object.entries(defaultGridNavigationIcons).map(([key, fallback]) => [key, assetPath(raw?.[key], line?.[key] || fallback)]));
  }
  function normalizeNavigationOrder(raw, allowed, fallback) {
    const allowedSet = new Set(allowed);
    const received = Array.isArray(raw) ? raw.map(value => String(value || "")).filter(value => allowedSet.has(value)) : [];
    return [...new Set([...received, ...fallback])].filter(value => allowedSet.has(value));
  }

  const standardPointTypes = Object.freeze([
    Object.freeze({ id: "coin", key: "coin", icon: "assets/icons/moeda.webp", locked: true }),
    Object.freeze({ id: "research", key: "research", icon: "assets/icons/pocao-pesquisa.webp", locked: true }),
    Object.freeze({ id: "prestige", key: "prestige", icon: "assets/icons/prestigio.webp", locked: true }),
    Object.freeze({ id: "xp", key: "xp", icon: "assets/icons/xp.webp", locked: true })
  ]);

  const defaults = Object.freeze({
    schemaVersion: 18,
    gameVersion: window.FazendaSerenaConfig?.appVersion || "1.0.1",
    balance: clone(defaultBalance),
    pointTypes: clone(standardPointTypes),
    categories: [],
    crops: [],
    companies: [],
    contractTypes: [],
    contractSlots: clone(defaultContractSlots),
    orderSteps: [],
    missions: [],
    research: clone(window.GameData.research),
    prestigeUpgrades: clone(window.GameData.prestigeUpgrades),
    events: [],
    updateNotes: [],
    navigationIcons: clone(defaultNavigationIcons),
    gridNavigationIcons: clone(defaultGridNavigationIcons),
    prestigeIcons: clone(defaultPrestigeIcons),
    prestigeIconOrder: clone(defaultPrestigeIconOrder),
    lineNavigationOrder: clone(defaultLineNavigationOrder),
    gridNavigationOrder: clone(defaultGridNavigationOrder),
    texts: clone(defaultTexts)
  });

  const uniqueById = items => {
    const seen = new Set();
    const output = [];
    items.forEach(item => {
      if (!item?.id || seen.has(item.id)) return;
      seen.add(item.id);
      output.push(item);
    });
    return output;
  };

  function rangePair(value, fallback) {
    const source = Array.isArray(value) ? value : String(value ?? "").split(",");
    const values = source.map(item => Math.max(1, Math.min(86400, Math.floor(Number(String(item).trim().replace(",", ".")) || 0)))).filter(Boolean);
    const base = Array.isArray(fallback) ? fallback : [Number(fallback) || 1, Number(fallback) || 1];
    const first = values[0] || Math.max(1, Math.floor(Number(base[0]) || 1));
    const second = values[1] || values[0] || Math.max(1, Math.floor(Number(base[1]) || first));
    return [Math.min(first, second), Math.max(first, second)];
  }

  function normalizeBalance(raw = {}) {
    const baseProductionMin = integer(raw.baseProductionMin, 1, 1000000, defaultBalance.baseProductionMin);
    const baseProductionCap = Math.max(
      baseProductionMin,
      integer(raw.baseProductionCap, 1, 1000000, defaultBalance.baseProductionCap)
    );
    return {
      actionXPPercent: clamp(raw.actionXPPercent, 0, 100, defaultBalance.actionXPPercent),
      cropMasteryXPPercent: clamp(raw.cropMasteryXPPercent, 0, 100, defaultBalance.cropMasteryXPPercent),
      passiveXPPercentPerSecond: clamp(raw.passiveXPPercentPerSecond, 0, 100, defaultBalance.passiveXPPercentPerSecond),
      // Migra a antiga configuração de pesquisa passiva caso exista, mas a partir
      // desta revisão ela representa a taxa base de geração de pesquisa do jogo.
      passiveResearchPercentPerSecond: clamp(
        raw.passiveResearchPercentPerSecond ?? raw.researchPassiveXPPercentPerLevel,
        0, 100, defaultBalance.passiveResearchPercentPerSecond
      ),
      ordersUnlockLevel: integer(raw.ordersUnlockLevel ?? raw.featureUnlockLevel, 1, 1000, defaultBalance.ordersUnlockLevel),
      evolutionsUnlockLevel: integer(raw.evolutionsUnlockLevel ?? raw.featureUnlockLevel, 1, 1000, defaultBalance.evolutionsUnlockLevel),
      prestigeUnlockLevel: integer(raw.prestigeUnlockLevel, 1, 1000, defaultBalance.prestigeUnlockLevel),
      prestigeBonus: integer(raw.prestigeBonus, 0, Number.MAX_SAFE_INTEGER, defaultBalance.prestigeBonus),
      startingCoins: integer(raw.startingCoins, 0, Number.MAX_SAFE_INTEGER, defaultBalance.startingCoins),
      storageCapacity: integer(raw.storageCapacity, 1, Number.MAX_SAFE_INTEGER, defaultBalance.storageCapacity),
      baseProductionMin,
      baseProductionCap,
      contractSignedCooldownRange: rangePair(raw.contractSignedCooldownRange ?? raw.contractSignedCooldownSeconds, defaultBalance.contractSignedCooldownRange),
      contractExpiredCooldownRange: rangePair(raw.contractExpiredCooldownRange ?? raw.contractExpiredCooldownSeconds, defaultBalance.contractExpiredCooldownRange),
      contractDeclinedCooldownRange: rangePair(raw.contractDeclinedCooldownRange ?? raw.contractDeclinedCooldownSeconds, defaultBalance.contractDeclinedCooldownRange),
      contractBrokenCooldownRange: rangePair(raw.contractBrokenCooldownRange ?? raw.contractBrokenCooldownSeconds, defaultBalance.contractBrokenCooldownRange),
      contractOfferCount: integer(raw.contractOfferCount, 1, 12, defaultBalance.contractOfferCount),
      maxOfflineMinutes: integer(raw.maxOfflineMinutes ?? (Number(raw.maxOfflineSeconds) / 60), 1, 43200, defaultBalance.maxOfflineMinutes)
    };
  }

  function normalizeCategories(raw) {
    if (!Array.isArray(raw)) return [];
    return uniqueById(raw.slice(0, 100).map((item, index) => ({
      id: id(item?.id, `category_${index + 1}`),
      name: text(item?.name, 80, `Categoria ${index + 1}`),
      baseGrowth: clamp(item?.baseGrowth ?? item?.productionSeconds, 0.01, 86400, 8)
    })));
  }

  function normalizeCrops(raw, categories) {
    if (!Array.isArray(raw)) return [];
    const categoryIds = new Set(categories.map(item => item.id));
    return uniqueById(raw.slice(0, 500).map((item, index) => {
      const requestedCategory = id(item?.category, "");
      const category = categoryIds.has(requestedCategory) ? requestedCategory : (categories[0]?.id || requestedCategory || "uncategorized");
      const categoryEntry = categories.find(entry => entry.id === category);
      const categoryIndex = Math.max(0, categories.findIndex(entry => entry.id === category));
      const economy = window.FazendaSerenaCropEconomy;
      return {
        id: id(item?.id, `crop_${index + 1}`),
        name: text(item?.name, 80, `Cultura ${index + 1}`),
        category,
        categoryIndex,
        image: assetPath(item?.image, "assets/logo.webp"),
        index,
        unlockLevel: integer(item?.unlockLevel, 1, 1000, Math.max(1, index * 5 || 1)),
        cost: economy?.purchaseCost(index, categoryIndex) ?? 100,
        basePrice: economy?.basePrice(index, categoryIndex) ?? 5,
        baseGrowth: clamp(categoryEntry?.baseGrowth ?? item?.baseGrowth, 0.01, 86400, 8),
        baseYield: economy?.baseYield(index, categoryIndex) ?? 2
      };
    }));
  }

  function normalizeCompanies(raw) {
    if (!Array.isArray(raw)) return [];
    return uniqueById(raw.slice(0, 200).map((item, index) => ({
      id: id(item?.id, `company_${index + 1}`),
      name: text(item?.name, 80, `Indústria ${index + 1}`),
      icon: assetPath(item?.icon, "assets/icons/contrato-comercial.webp"),
      specialty: text(item?.specialty, 100, "Distribuição agrícola"),
      category: id(item?.category, "")
    })));
  }

  const contractRewardKeys = new Set(["coins", "research", "prestige"]);
  const legacyRewardList = mode => mode === "both" ? ["coins", "research"] : contractRewardKeys.has(mode) ? [mode] : [];
  function normalizeContractTypes(raw, balance = defaultBalance) {
    if (!Array.isArray(raw)) return [];
    const toneColors = { normal: "#e6c35f", urgent: "#d96d5d", bulk: "#6fa4cc" };
    const normalizedTypes = uniqueById(raw.slice(0, 100).map((item, index) => {
      const oldQuantity = (Number(item?.load) || 1) * (Number(item?.volumeMultiplier) || 1);
      const inferredLegacyMode = item?.researchMode && item.researchMode !== "none" ? "both" : "coins";
      const rewards = Array.isArray(item?.rewards)
        ? [...new Set(item.rewards.filter(value => contractRewardKeys.has(value)))].slice(0, 3)
        : legacyRewardList(item?.rewardMode || inferredLegacyMode);
      const legacyCoinPercent = item?.coinMultiplier != null ? Number(item.coinMultiplier) * 100 : 100;
      const legacyResearchPercent = item?.researchMultiplier != null ? Number(item.researchMultiplier) * 100 : 100;
      const legacyPrestigePercent = item?.prestigeMultiplier != null ? Number(item.prestigeMultiplier) : 1;
      return {
        id: id(item?.id, `contract_type_${index + 1}`),
        label: text(item?.label || item?.name, 80, `Tipo de contrato ${index + 1}`),
        chancePercent: clamp(item?.chancePercent, 0, 100, 100),
        priority: integer(item?.priority, 0, 1000, 0),
        penaltyPercent: clamp(item?.penaltyPercent ?? item?.finePercent, 0, 100000, 20),
        proposalDurationRange: (() => {
          const legacyMin = integer(item?.minDurationSeconds ?? item?.durationSeconds ?? item?.duration, 5, 604800, 360);
          const legacyMax = integer(item?.maxDurationSeconds ?? item?.durationSeconds ?? item?.duration, 5, 604800, legacyMin);
          const rawRange = Array.isArray(item?.proposalDurationRange) ? item.proposalDurationRange : [legacyMin, legacyMax];
          const a = integer(rawRange[0], 5, 604800, legacyMin);
          const b = integer(rawRange[1] ?? rawRange[0], 5, 604800, legacyMax);
          return [Math.min(a, b), Math.max(a, b)];
        })(),
        deliveryDurationRange: (() => {
          const legacyMin = integer(item?.minDurationSeconds ?? item?.durationSeconds ?? item?.duration, 5, 604800, 360);
          const legacyMax = integer(item?.maxDurationSeconds ?? item?.durationSeconds ?? item?.duration, 5, 604800, legacyMin);
          const rawRange = Array.isArray(item?.deliveryDurationRange) ? item.deliveryDurationRange : [legacyMin, legacyMax];
          const a = integer(rawRange[0], 5, 604800, legacyMin);
          const b = integer(rawRange[1] ?? rawRange[0], 5, 604800, legacyMax);
          return [Math.min(a, b), Math.max(a, b)];
        })(),
        quantityMultiplier: clamp(item?.quantityMultiplier, 0.01, 1000, Math.max(0.01, oldQuantity || 1)),
        rewards,
        coinMultiplierPercent: clamp(item?.coinMultiplierPercent, 0, 100000, legacyCoinPercent),
        researchMultiplierPercent: clamp(item?.researchMultiplierPercent, 0, 100000, legacyResearchPercent),
        prestigeMultiplierPercent: clamp(item?.prestigeMultiplierPercent, 0, 100000, legacyPrestigePercent),
        xpPercent: clamp(item?.xpPercent, 0, 100, 0),
        color: color(item?.color, toneColors[item?.tone] || "#e6c35f"),
        colorAlpha: clamp(item?.colorAlpha, 0, 100, 18)
      };
    }));
    return normalizedTypes.map(type => ({
      ...type,
      proposalDurationRange: [...type.proposalDurationRange],
      deliveryDurationRange: [...type.deliveryDurationRange]
    }));
  }

  function normalizeContractSlots(raw) {
    if (!Array.isArray(raw)) return clone(defaultContractSlots);
    return uniqueById(raw.slice(0, 50).map((item, index) => ({
      id: id(item?.id, `slot_${index + 1}`),
      name: text(item?.name, 80, `Slot ${index + 1}`),
      unlockLevel: integer(item?.unlockLevel, 1, 1000, index === 0 ? 1 : 5 + index * 5)
    })));
  }

  function normalizeOrderSteps(raw, balance = defaultBalance) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 500).map((item, index) => ({
      id: id(item?.id, `order_${index + 1}`),
      name: `Etapa ${index + 1}`,
      amount: integer(item?.amount, 0, Number.MAX_SAFE_INTEGER, 0),
      coinBonusPercent: clamp(item?.coinBonusPercent, 0, 100000, 0),
      rewardResearch: integer(item?.rewardResearch, 0, Number.MAX_SAFE_INTEGER, 0),
      rewardPrestige: integer(item?.rewardPrestige, 0, Number.MAX_SAFE_INTEGER, 0),
      xpPercent: clamp(item?.xpPercent, 0, 100, 0)
    }));
  }

  function normalizePointTypes(raw) {
    const standardKeys = new Set(standardPointTypes.map(item => item.key));
    const custom = Array.isArray(raw) ? uniqueById(raw.slice(0, 100).map((item, index) => {
      const key = id(item?.key || item?.id, `point${index + 1}`).toLowerCase();
      return { id: key, key, icon: assetPath(item?.icon, "assets/icons/moeda.webp") };
    })).filter(item => !standardKeys.has(item.key)) : [];
    return [...custom, ...clone(standardPointTypes)];
  }

  const missionMetrics = new Set([
    "harvested", "owned", "cropPurchases", "sold", "cropLevels", "cropUpgrades",
    "orders", "contracts", "maxCropLevel", "farmLevel", "stock", "coinsEarned",
    "prestiges", "categorySold"
  ]);

  function normalizeReward(raw = {}) {
    const reward = {};
    ["coins", "research", "prestige"].forEach(key => {
      const value = integer(raw?.[key], 0, Number.MAX_SAFE_INTEGER, 0);
      if (value > 0) reward[key] = value;
    });
    return reward;
  }

  function normalizeMissions(raw) {
    if (!Array.isArray(raw)) return [];
    const normalized = [];
    const legacyGroups = new Map();
    raw.slice(0, 1000).forEach((item, index) => {
      const metric = missionMetrics.has(item?.metric) ? item.metric : "sold";
      if (Array.isArray(item?.series)) {
        const mission = {
          id: id(item?.id, `mission_${index + 1}`),
          title: text(item?.title, 100, `Missão ${index + 1}`),
          desc: text(item?.desc, 500, "Conclua o objetivo desta missão."),
          metric,
          series: item.series.slice(0, 200).map(serie => ({
            target: integer(serie?.target, 1, Number.MAX_SAFE_INTEGER, 1),
            reward: normalizeReward(serie?.reward)
          }))
        };
        if (metric === "categorySold") mission.category = id(item?.category, "");
        normalized.push(mission);
        return;
      }

      // Migração das versões que armazenavam cada série como uma missão plana.
      const legacyKey = id(item?.series || item?.missionId || item?.id, `mission_${index + 1}`);
      if (!legacyGroups.has(legacyKey)) {
        legacyGroups.set(legacyKey, {
          id: legacyKey,
          title: text(item?.title, 100, `Missão ${index + 1}`),
          desc: text(item?.desc, 500, "Conclua o objetivo desta missão."),
          metric,
          ...(metric === "categorySold" ? { category: id(item?.category, "") } : {}),
          legacySeries: []
        });
      }
      legacyGroups.get(legacyKey).legacySeries.push({
        order: integer(item?.stage, 1, 1000, index + 1),
        target: integer(item?.target, 1, Number.MAX_SAFE_INTEGER, 1),
        reward: normalizeReward(item?.reward)
      });
    });
    legacyGroups.forEach(group => {
      group.legacySeries.sort((a, b) => a.order - b.order);
      normalized.push({
        id: group.id,
        title: group.title,
        desc: group.desc,
        metric: group.metric,
        ...(group.category ? { category: group.category } : {}),
        series: group.legacySeries.map(({ target, reward }) => ({ target, reward }))
      });
    });
    return uniqueById(normalized.slice(0, 300));
  }

  function flattenMissions(missions) {
    const output = [];
    (missions || []).forEach(mission => {
      (mission.series || []).forEach((serie, index) => output.push({
        id: `${mission.id}_serie_${index + 1}`,
        missionId: mission.id,
        series: mission.id,
        stage: index + 1,
        title: mission.title,
        desc: mission.desc,
        metric: mission.metric,
        ...(mission.category ? { category: mission.category } : {}),
        target: serie.target,
        reward: clone(serie.reward || {})
      }));
    });
    return output;
  }

  function legacyEffectFor(itemId, position = 0) {
    const values = legacyEffects[itemId] || [];
    return { type: values[position * 2] || "", amount: Number(values[position * 2 + 1]) || 0 };
  }

  function normalizeEvolution(raw, fallback, prestige = false) {
    if (!Array.isArray(raw)) raw = clone(fallback);
    return uniqueById(raw.slice(0, 300).map((item, index) => {
      const legacyRows = [legacyEffectFor(item?.id, 0), legacyEffectFor(item?.id, 1), legacyEffectFor(item?.id, 2)];
      const explicitLegacyRows = [
        { type: item?.bonusType, amount: item?.bonusAmount, stageValues: item?.stageRates },
        { type: item?.bonus2Type, amount: item?.bonus2Amount },
        { type: item?.bonus3Type, amount: item?.bonus3Amount }
      ];
      const sourceBonuses = Array.isArray(item?.bonuses) && item.bonuses.length
        ? item.bonuses
        : explicitLegacyRows.some(row => effectTypes.has(row.type))
          ? explicitLegacyRows
          : legacyRows.map((row, rowIndex) => ({ ...row, stageValues: item?.id === "laboratoryFunding" && rowIndex === 0 ? [0.01, 0.02, 0.02] : undefined }));
      const bonuses = sourceBonuses.slice(0, 50).map(row => {
        const type = effectTypes.has(row?.type) ? row.type : "";
        if (!type) return null;
        const normalizedBonus = {
          type,
          amount: clamp(row?.amount, 0, Number.MAX_SAFE_INTEGER, 0)
        };
        if (Array.isArray(row?.stageValues)) {
          let stageValues = row.stageValues.slice(0, 1000).map(value => clamp(value, 0, Number.MAX_SAFE_INTEGER, 0));
          // Migração defensiva: algumas configurações antigas gravaram um zero
          // na posição 0 e o primeiro upgrade acabava sem efeito real.
          const originalStageCount = stageValues.length;
          while (stageValues.length > 1 && stageValues[0] <= 0 && stageValues.slice(1).some(value => value > 0)) stageValues.shift();
          while (stageValues.length < originalStageCount && stageValues.length) stageValues.push(stageValues.at(-1));
          // r28: o editor antigo convertia o campo vazio em [0]. Isso fazia o
          // nível ser comprado normalmente, mas o bônus configurado em `amount`
          // nunca era aplicado. Um vetor sem nenhum valor positivo é tratado
          // como ausente quando existe quantidade por nível.
          if (stageValues.some(value => value > 0) || normalizedBonus.amount <= 0) {
            if (stageValues.length) normalizedBonus.stageValues = stageValues;
          }
        }
        return normalizedBonus;
      }).filter(Boolean);
      const normalized = {
        id: id(item?.id, `${prestige ? "legacy" : "research"}_${index + 1}`),
        name: text(item?.name, 100, `${prestige ? "Legado" : "Pesquisa"} ${index + 1}`),
        icon: assetPath(item?.icon, prestige ? "assets/icons/prestigio.webp" : "assets/icons/livros.webp"),
        desc: text(item?.desc, 700, "Benefício configurável."),
        max: integer(item?.max, 1, 1000, 1),
        baseCost: clamp(item?.baseCost, 0, Number.MAX_SAFE_INTEGER, 1),
        growth: clamp(item?.growth, 0.01, 1000, 1),
        bonuses
      };
      normalized.bonuses.forEach(bonus => {
        if (Array.isArray(bonus.stageValues)) bonus.stageValues = bonus.stageValues.slice(0, normalized.max);
      });
      // Campos espelhados preservam compatibilidade com saves/configurações
      // antigas e módulos externos que ainda consultem o primeiro trio.
      const [first = {}, second = {}, third = {}] = bonuses;
      normalized.bonusType = first.type || "";
      normalized.bonusAmount = first.amount || 0;
      if (first.stageValues?.length) normalized.stageRates = first.stageValues.slice(0, normalized.max);
      normalized.bonus2Type = second.type || "";
      normalized.bonus2Amount = second.amount || 0;
      normalized.bonus3Type = third.type || "";
      normalized.bonus3Amount = third.amount || 0;
      if (Array.isArray(item?.stageCosts)) {
        normalized.stageCosts = item.stageCosts.slice(0, normalized.max).map(cost => clamp(cost, 0, Number.MAX_SAFE_INTEGER, 0));
      }
      return normalized;
    }));
  }

  const eventTypes = new Set(["harvest", "growthSpeed", "salePrice", "xp", "research", "coins", "contractRewards", "orderRewards"]);
  const eventWeekdays = new Set([1, 2, 3, 4, 5, 6, 7]);
  function mondayStart(timestamp = Date.now()) {
    const date = new Date(Number(timestamp) || Date.now());
    date.setHours(0, 0, 0, 0);
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date.getTime();
  }
  function normalizeClock(value, fallback = "12:00") {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return fallback;
    const hour = Math.max(0, Math.min(23, Number(match[1]) || 0));
    const minute = Math.max(0, Math.min(59, Number(match[2]) || 0));
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  function eventOccurrence(event, at = Date.now()) {
    const reference = Number(at) || Date.now();
    const weekStart = event?.repeatWeekly === false ? Math.max(0, Number(event?.weekAnchor) || mondayStart(reference)) : mondayStart(reference);
    const weekday = eventWeekdays.has(Number(event?.weekday)) ? Number(event.weekday) : 1;
    const [hour, minute] = normalizeClock(event?.startTime).split(":").map(Number);
    const start = weekStart + (weekday - 1) * 86400000 + hour * 3600000 + minute * 60000;
    const end = start + Math.max(1, Number(event?.durationMinutes) || 60) * 60000;
    return { start, end, weekStart, active: reference >= start && reference < end, upcoming: reference < start };
  }
  function normalizeEvents(raw) {
    if (!Array.isArray(raw)) return [];
    return uniqueById(raw.slice(0, 200).map((item, index) => {
      const legacyStart = Number(item?.startAt) || 0;
      const legacyDate = legacyStart ? new Date(legacyStart) : null;
      const legacyDay = legacyDate ? (legacyDate.getDay() || 7) : 1;
      const legacyTime = legacyDate ? `${String(legacyDate.getHours()).padStart(2, "0")}:${String(legacyDate.getMinutes()).padStart(2, "0")}` : "12:00";
      return {
        id: id(item?.id, `event_${index + 1}`),
        name: text(item?.name, 100, `Evento ${index + 1}`),
        description: text(item?.description, 320, "Um evento especial está chegando à Fazenda Serena."),
        type: eventTypes.has(item?.type) ? item.type : "harvest",
        bonusPercent: clamp(item?.bonusPercent, 0, 100000, 100),
        weekday: eventWeekdays.has(Number(item?.weekday)) ? Number(item.weekday) : legacyDay,
        startTime: normalizeClock(item?.startTime, legacyTime),
        durationMinutes: integer(item?.durationMinutes, 1, 60 * 24 * 7, 60),
        repeatWeekly: item?.repeatWeekly === true,
        weekAnchor: Math.max(0, Math.floor(Number(item?.weekAnchor) || mondayStart(legacyStart || Date.now())))
      };
    })).sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  }

  function normalizeUpdateNotes(raw) {
    if (!Array.isArray(raw)) return [];
    return uniqueById(raw.slice(0, 200).map((item, index) => ({
      id: id(item?.id, `note_${index + 1}`),
      title: text(item?.title, 120, `Atualização ${index + 1}`),
      version: text(item?.version, 30, window.FazendaSerenaConfig?.appVersion || "1.0.1"),
      publishedAt: Math.max(0, Math.floor(Number(item?.publishedAt) || Date.now())),
      body: text(item?.body, 2000, "Novidades da Fazenda Serena.")
    }))).sort((a, b) => b.publishedAt - a.publishedAt);
  }

  function normalizeTexts(raw = {}) {
    return Object.fromEntries(Object.entries(defaultTexts).map(([key, fallback]) => [
      key,
      text(raw?.[key], 700, fallback)
    ]));
  }

  function normalizeConfig(raw = {}) {
    const source = raw?.config && typeof raw.config === "object" ? raw.config : raw;
    const acceptsRemoteCatalogs = Number(source?.schemaVersion) >= 2;
    const balance = normalizeBalance(source?.balance);
    const categories = acceptsRemoteCatalogs ? normalizeCategories(source?.categories) : [];
    const updateNotes = normalizeUpdateNotes(source?.updateNotes);
    const newestVersion = updateNotes[0]?.version;
    return {
      schemaVersion: 18,
      gameVersion: text(source?.gameVersion || newestVersion || window.FazendaSerenaConfig?.appVersion, 30, window.FazendaSerenaConfig?.appVersion || "1.0.1"),
      balance,
      pointTypes: normalizePointTypes(source?.pointTypes),
      categories,
      crops: acceptsRemoteCatalogs ? normalizeCrops(source?.crops, categories) : [],
      companies: acceptsRemoteCatalogs ? normalizeCompanies(source?.companies) : [],
      contractTypes: acceptsRemoteCatalogs ? normalizeContractTypes(source?.contractTypes, balance) : [],
      contractSlots: normalizeContractSlots(source?.contractSlots),
      orderSteps: acceptsRemoteCatalogs ? normalizeOrderSteps(source?.orderSteps, balance) : [],
      missions: acceptsRemoteCatalogs ? normalizeMissions(source?.missions) : [],
      research: normalizeEvolution(source?.research, defaults.research, false),
      prestigeUpgrades: normalizeEvolution(source?.prestigeUpgrades, defaults.prestigeUpgrades, true),
      events: normalizeEvents(source?.events),
      updateNotes,
      navigationIcons: normalizeNavigationIcons(source?.navigationIcons),
      gridNavigationIcons: normalizeGridNavigationIcons(source?.gridNavigationIcons || source?.mobileNavigationIcons, normalizeNavigationIcons(source?.navigationIcons)),
      prestigeIcons: normalizePrestigeIcons(source?.prestigeIcons),
      prestigeIconOrder: normalizeNavigationOrder(source?.prestigeIconOrder, Object.keys(defaultPrestigeIcons), defaultPrestigeIconOrder),
      lineNavigationOrder: normalizeNavigationOrder(source?.lineNavigationOrder, Object.keys(defaultNavigationIcons), defaultLineNavigationOrder),
      gridNavigationOrder: normalizeNavigationOrder(source?.gridNavigationOrder || source?.mobileNavigationOrder, Object.keys(defaultGridNavigationIcons), defaultGridNavigationOrder),
      texts: normalizeTexts(source?.texts)
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderText(value, numberFormatter = null, pointTypes = null) {
    const catalog = Array.isArray(pointTypes) ? pointTypes : (window.FazendaSerenaRuntimeConfig?.pointTypes || []);
    const byKey = new Map(catalog.map(item => [String(item.key || item.id || "").toLowerCase(), item]));
    const formatNumber = typeof numberFormatter === "function"
      ? numberFormatter
      : number => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(number);
    let html = escapeHtml(value).replace(/\r?\n/g, "<br>");
    html = html.replace(/\[\[([a-z0-9_-]{1,64})(?:\.([+-]?\d+(?:[.,]\d+)?))?\]\]/gi, (token, rawKey, rawAmount) => {
      const point = byKey.get(String(rawKey).toLowerCase());
      if (!point) return token;
      const icon = assetPath(point.icon, "assets/icons/moeda.webp");
      const amount = rawAmount == null ? "" : String(rawAmount).replace(",", ".");
      const numeric = amount === "" ? null : Number(amount);
      const formatted = numeric == null || !Number.isFinite(numeric) ? "" : escapeHtml(formatNumber(numeric));
      return `<span class="inline-point-token${formatted ? " inline-point-token-valued" : ""}" title="${escapeHtml(point.key)}"><img src="${escapeHtml(icon)}" alt="">${formatted ? `<b>${formatted}</b>` : ""}</span>`;
    });
    return html;
  }

  function replaceArray(target, values) {
    target.splice(0, target.length, ...clone(values));
  }
  function replaceObject(target, entries) {
    Object.keys(target).forEach(key => delete target[key]);
    Object.assign(target, entries);
  }
  function applyTexts(texts, pointTypes) {
    Object.entries(texts).forEach(([key, value]) => {
      document.querySelectorAll(`[data-config-text="${key}"]`).forEach(element => {
        element.innerHTML = renderText(value, null, pointTypes);
      });
    });
  }


  function applyNavigationIcons(lineIcons = {}, gridIcons = {}) {
    const canReplaceNavigationIcon = image => {
      const tab = image?.closest?.(".nav-tab, .office-tab, [data-feature-locked]");
      return !(tab?.classList?.contains("feature-preview") || tab?.dataset?.featureLocked === "true");
    };
    Object.entries(lineIcons).forEach(([key, src]) => {
      document.querySelectorAll(`[data-navigation-icon="${key}"]`).forEach(image => {
        if (image instanceof HTMLImageElement && canReplaceNavigationIcon(image)) image.src = src;
      });
    });
    Object.entries(gridIcons).forEach(([key, src]) => {
      document.querySelectorAll(`[data-grid-navigation-icon="${key}"]`).forEach(image => {
        if (image instanceof HTMLImageElement && canReplaceNavigationIcon(image)) image.src = src;
      });
    });
  }

  function reorderNavigation(container, selector, order, attribute) {
    if (!container) return;
    const rank = new Map((order || []).map((key, index) => [key, index]));
    [...container.querySelectorAll(selector)]
      .sort((a, b) => (rank.get(a.getAttribute(attribute)) ?? 999) - (rank.get(b.getAttribute(attribute)) ?? 999))
      .forEach(element => container.appendChild(element));
  }

  function applyPrestigeIcons(icons = defaultPrestigeIcons) {
    document.querySelectorAll("[data-prestige-icon]").forEach(image => {
      const key = image.dataset.prestigeIcon;
      const src = icons?.[key] || defaultPrestigeIcons[key];
      if (src && image instanceof HTMLImageElement) image.src = src;
    });
  }

  function applyNavigationOrder(lineOrder = defaultLineNavigationOrder, gridOrder = defaultGridNavigationOrder) {
    reorderNavigation(document.querySelector('.desktop-main-nav'), ':scope > [data-navigation-key]', lineOrder, 'data-navigation-key');
    document.querySelectorAll('.desktop-context-nav .context-tabs').forEach(container => {
      reorderNavigation(container, ':scope > [data-navigation-key]', lineOrder, 'data-navigation-key');
    });
    reorderNavigation(document.querySelector('.mobile-direct-nav'), ':scope > [data-grid-navigation-key]', gridOrder, 'data-grid-navigation-key');
  }

  function apply(raw = {}) {
    const config = normalizeConfig(raw);
    const balance = config.balance;
    GameEngine.ACTION_XP_RATE = balance.actionXPPercent / 100;
    GameEngine.CROP_MASTERY_XP_RATE = balance.cropMasteryXPPercent / 100;
    GameEngine.BASE_PASSIVE_XP_RATE = balance.passiveXPPercentPerSecond / 100;
    GameEngine.BASE_PASSIVE_RESEARCH_RATE = balance.passiveResearchPercentPerSecond / 100;
    GameEngine.ORDER_UNLOCK_LEVEL = balance.ordersUnlockLevel;
    GameEngine.EVOLUTION_UNLOCK_LEVEL = balance.evolutionsUnlockLevel;
    GameEngine.FEATURE_UNLOCK_LEVEL = Math.min(balance.ordersUnlockLevel, balance.evolutionsUnlockLevel);
    GameEngine.PRESTIGE_UNLOCK_LEVEL = balance.prestigeUnlockLevel;
    GameEngine.PRESTIGE_BONUS = balance.prestigeBonus;
    GameEngine.BASE_STARTING_COINS = balance.startingCoins;
    GameEngine.CONTRACT_SIGNED_COOLDOWN_RANGE = balance.contractSignedCooldownRange;
    GameEngine.CONTRACT_EXPIRED_COOLDOWN_RANGE = balance.contractExpiredCooldownRange;
    GameEngine.CONTRACT_DECLINED_COOLDOWN_RANGE = balance.contractDeclinedCooldownRange;
    GameEngine.CONTRACT_BROKEN_COOLDOWN_RANGE = balance.contractBrokenCooldownRange;
    GameEngine.CONTRACT_OFFER_COUNT = balance.contractOfferCount;
    GameEngine.BASE_MAX_OFFLINE_SECONDS = Math.max(60, Math.floor(balance.maxOfflineMinutes * 60));
    GameEngine.MAX_OFFLINE_SECONDS = GameEngine.BASE_MAX_OFFLINE_SECONDS;
    GameEngine.BASE_STORAGE_CAPACITY = balance.storageCapacity;
    GameEngine.BASE_PRODUCTION_MIN = balance.baseProductionMin;
    GameEngine.BASE_PRODUCTION_CAP = balance.baseProductionCap;
    // Recompensa, prazo e XP dos contratos/pedidos pertencem aos próprios
    // catálogos administrativos, não aos parâmetros globais.
    GameEngine.CONTRACT_REWARD_FACTOR = 1;
    GameEngine.CONTRACT_DURATION_FACTOR = 1;

    replaceObject(window.GameData.categories, Object.fromEntries(config.categories.map(item => [item.id, item.name])));
    replaceArray(window.GameData.crops, config.crops.map((crop, index) => ({ ...crop, index })));
    replaceArray(window.GameData.companies, config.companies);
    replaceArray(window.GameData.contractTypes, config.contractTypes);
    replaceArray(window.GameData.contractSlots, config.contractSlots);
    replaceArray(window.GameData.orderSteps, config.orderSteps);
    replaceArray(window.GameData.missions, flattenMissions(config.missions));
    replaceArray(window.GameData.research, config.research);
    replaceArray(window.GameData.prestigeUpgrades, config.prestigeUpgrades);
    // Notas de atualização são consumidas somente por noticias.html. Não as
    // mantemos duplicadas na memória do jogo principal.
    const runtimeConfig = clone(config);
    delete runtimeConfig.updateNotes;
    window.FazendaSerenaRuntimeConfig = runtimeConfig;
    window.FazendaSerenaConfig?.applyCloudVersion?.(config.gameVersion);
    applyTexts(config.texts, config.pointTypes);
    applyNavigationIcons(config.navigationIcons, config.gridNavigationIcons);
    applyPrestigeIcons(config.prestigeIcons);
    applyNavigationOrder(config.lineNavigationOrder, config.gridNavigationOrder);
    window.dispatchEvent(new CustomEvent("fazenda-runtime-config", { detail: clone(runtimeConfig) }));
    return clone(config);
  }

  function applyLiveContent(raw = {}) {
    const normalized = normalizeConfig(raw);
    const current = window.FazendaSerenaRuntimeConfig || clone(defaults);
    current.events = clone(normalized.events);
    current.gameVersion = normalized.gameVersion;
    current.texts = { ...(current.texts || {}), ...clone(normalized.texts) };
    window.FazendaSerenaConfig?.applyCloudVersion?.(normalized.gameVersion);
    window.FazendaSerenaRuntimeConfig = current;
    applyTexts(current.texts, current.pointTypes || []);
    current.navigationIcons = clone(normalized.navigationIcons);
    current.gridNavigationIcons = clone(normalized.gridNavigationIcons);
    current.lineNavigationOrder = clone(normalized.lineNavigationOrder);
    current.gridNavigationOrder = clone(normalized.gridNavigationOrder);
    current.prestigeIcons = clone(normalized.prestigeIcons);
    current.prestigeIconOrder = clone(normalized.prestigeIconOrder);
    applyNavigationIcons(current.navigationIcons, current.gridNavigationIcons);
    applyPrestigeIcons(current.prestigeIcons);
    applyNavigationOrder(current.lineNavigationOrder, current.gridNavigationOrder);
    window.dispatchEvent(new CustomEvent("fazenda-live-content", { detail: { events: clone(current.events) } }));
  }

  function validateForSave(raw) {
    if (!raw || typeof raw !== "object") throw new Error("A configuração precisa ser um objeto JSON.");
    const requiredArrays = [
      "pointTypes", "categories", "crops", "companies", "contractTypes", "contractSlots", "orderSteps", "missions", "research", "prestigeUpgrades", "events", "updateNotes"
    ];
    requiredArrays.forEach(key => {
      if (!Array.isArray(raw[key])) throw new Error(`A seção “${key}” precisa ser uma lista.`);
    });
    const normalized = normalizeConfig(raw);
    const sourceIds = [
      ["tipos de pontos", normalized.pointTypes], ["categorias", normalized.categories], ["plantas", normalized.crops], ["indústrias", normalized.companies],
      ["tipos de contrato", normalized.contractTypes], ["slots de contrato", normalized.contractSlots], ["etapas de pedidos", normalized.orderSteps],
      ["missões", normalized.missions], ["pesquisas", normalized.research], ["legados", normalized.prestigeUpgrades], ["eventos", normalized.events], ["notas", normalized.updateNotes]
    ];
    sourceIds.forEach(([label, items]) => {
      if (new Set(items.map(item => item.id)).size !== items.length) throw new Error(`Existem IDs duplicados em ${label}.`);
    });
    const categoryIds = new Set(normalized.categories.map(item => item.id));
    const invalidCrop = normalized.crops.find(crop => !categoryIds.has(crop.category));
    if (invalidCrop) throw new Error(`A planta “${invalidCrop.name}” usa uma categoria que não existe.`);
    const invalidMission = normalized.missions.find(mission => mission.metric === "categorySold" && !categoryIds.has(mission.category));
    if (invalidMission) throw new Error(`A missão “${invalidMission.title}” usa uma categoria que não existe.`);
    const invalidCompany = normalized.companies.find(company => company.category && !categoryIds.has(company.category));
    if (invalidCompany) throw new Error(`A indústria “${invalidCompany.name}” usa uma categoria que não existe.`);
    return normalized;
  }

  window.GameAdminConfig = Object.freeze({
    getDefaults: () => clone(defaults),
    getCurrent: () => clone(window.FazendaSerenaRuntimeConfig || defaults),
    getEvolutionEffectOptions: () => Object.entries(effectLabels).map(([value, label]) => ({ value, label })),
    getEventOccurrence: (event, at) => eventOccurrence(event, at),
    getWeekStart: at => mondayStart(at),
    normalize: normalizeConfig,
    validateForSave,
    renderText,
    apply,
    applyLiveContent
  });
})();
