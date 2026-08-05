"use strict";

class GameEngine {
  static SAVE_VERSION = 46;
  static MAX_OFFLINE_SECONDS = 60 * 60 * 8;
  static FEATURE_UNLOCK_LEVEL = 5;
  static PRESTIGE_UNLOCK_LEVEL = 40;
  static SECOND_CONTRACT_SLOT_LEVEL = 20;
  static MAX_ACTIVE_CONTRACTS = 7;
  static CONTRACT_OFFER_COUNT = 6;
  static CONTRACT_COOLDOWN_SECONDS = 5 * 60;
  // Revisão 39: 30% menos tempo em relação à revisão 38 (0,72 × 0,70).
  static CONTRACT_DURATION_FACTOR = 0.504;
  static CONTRACT_REWARD_FACTOR = 1.10;
  static BASE_STARTING_COINS = 120;
  static TREASURY_COINS_PER_LEVEL = 5000;
  static BASE_STORAGE_CAPACITY = 200;
  static MAX_BATCH_UPGRADES = 1000;
  static MAX_CROP_LEVEL = 300;
  static MAX_FARM_LEVEL = 1000;
  static INSTANT_GROWTH_LEVEL = 300;
  static MIN_INSTANT_GROWTH_LEVEL = 250;
  static MUSIC_TRACKS = Object.freeze([
    "betweenLightAndShadows", "pixelSprouts", "moonlitFields", "fieldRain",
    "electricHarvest", "dirtRoad", "enchantedGreenhouse", "solarFarm",
    "barnHay", "harvestFestival", "tropicalOrchard"
  ]);

  constructor(onEvent = () => {}, initialState = null) {
    this.data = window.GameData;
    this.onEvent = onEvent;
    this.state = this.load(initialState);
  }

  createState(permanent = {}) {
    const prestigeUpgrades = { ...(permanent.prestigeUpgrades || {}) };
    const prestigePoints = Number(permanent.prestigePoints || 0);
    const prestiges = Number(permanent.prestiges || 0);
    const settings = {
      ambient: permanent.settings?.ambient ?? true,
      uiScale: permanent.settings?.uiScale ?? 100,
      masterVolume: permanent.settings?.masterVolume ?? 100,
      effectVolume: permanent.settings?.effectVolume ?? permanent.settings?.soundVolume ?? 55,
      musicVolume: permanent.settings?.musicVolume ?? 30,
      musicTrack: GameEngine.MUSIC_TRACKS.includes(permanent.settings?.musicTrack) ? permanent.settings.musicTrack : "betweenLightAndShadows",
      numberFormat: permanent.settings?.numberFormat === "international" ? "international" : "brazilian",
      playerNickname: String(permanent.settings?.playerNickname || "").replace(/[<>]/g, "").trim().slice(0, 24),
      playerAvatar: String(permanent.settings?.playerAvatar || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48),
      playerRankingOptOut: Boolean(permanent.settings?.playerRankingOptOut)
    };

    const royalTreasury = Number(prestigeUpgrades.royalTreasury || 0);
    const immortalAcademy = Number(prestigeUpgrades.immortalAcademy || 0);
    const crops = {};
    const orders = {};

    this.data.crops.forEach(crop => {
      crops[crop.id] = {
        owned: false,
        level: 0,
        progress: 0,
        stock: 0,
        totalHarvested: 0,
        totalSold: 0,
        autoSell: false,
        productionBuffer: 0
      };
      orders[crop.id] = { tier: 0, delivered: 0, autoDeliver: false };
    });

    return {
      version: GameEngine.SAVE_VERSION,
      coins: GameEngine.BASE_STARTING_COINS + Math.max(0, royalTreasury) * GameEngine.TREASURY_COINS_PER_LEVEL,
      research: immortalAcademy * 3,
      prestigePoints,
      farmLevel: 1,
      farmXP: 0,
      crops,
      orders,
      upgrades: Object.fromEntries(this.data.upgrades.map(item => [item.id, 0])),
      storageExpansions: 0,
      researchTechs: Object.fromEntries(this.data.research.map(item => [item.id, 0])),
      prestigeUpgrades,
      permanentBonuses: { prestigeDouble: Boolean(permanent.permanentBonuses?.prestigeDouble) },
      cropsDiscovered: { ...(permanent.cropsDiscovered || {}) },
      contractOffers: [],
      contractCooldowns: [],
      activeContracts: [],
      contractSerial: 1,
      missionsClaimed: { ...(permanent.missionsClaimed || {}) },
      stats: {
        totalHarvested: 0,
        lifetimeHarvested: Number(permanent.lifetimeHarvested || 0),
        totalSold: 0,
        lifetimeSold: Number(permanent.lifetimeSold || 0),
        soldByCategory: Object.fromEntries(Object.keys(this.data.categories).map(id => [id, 0])),
        lifetimeSoldByCategory: { ...Object.fromEntries(Object.keys(this.data.categories).map(id => [id, 0])), ...(permanent.lifetimeSoldByCategory || {}) },
        ordersCompleted: 0,
        lifetimeOrdersCompleted: Number(permanent.lifetimeOrdersCompleted || 0),
        orderUnitsDelivered: 0,
        lifetimeOrderUnitsDelivered: Number(permanent.lifetimeOrderUnitsDelivered || 0),
        lifetimeCropPurchases: Number(permanent.lifetimeCropPurchases || 0),
        lifetimeCropUpgrades: Number(permanent.lifetimeCropUpgrades || 0),
        completedOrderSeries: Number(permanent.completedOrderSeries || 0),
        contractsCompleted: 0,
        lifetimeContractsCompleted: Number(permanent.lifetimeContractsCompleted || 0),
        contractsFailed: 0,
        lifetimeContractsFailed: Number(permanent.lifetimeContractsFailed || 0),
        contractsBroken: 0,
        lifetimeContractsBroken: Number(permanent.lifetimeContractsBroken || 0),
        contractUnitsDelivered: 0,
        lifetimeContractUnitsDelivered: Number(permanent.lifetimeContractUnitsDelivered || 0),
        runCoinsEarned: 0,
        lifetimeCoins: Number(permanent.lifetimeCoins || 0),
        totalPrestigeEarned: Number(permanent.totalPrestigeEarned || 0),
        maxFarmLevel: Math.max(1, Number(permanent.maxFarmLevel || 1)),
        maxCropLevel: Math.max(0, Number(permanent.maxCropLevel || 0)),
        maxCropsOwned: Math.max(0, Number(permanent.maxCropsOwned || 0)),
        maxCoinsHeld: Math.max(GameEngine.BASE_STARTING_COINS, Number(permanent.maxCoinsHeld || GameEngine.BASE_STARTING_COINS)),
        maxStorageUsed: Math.max(0, Number(permanent.maxStorageUsed || 0)),
        prestiges
      },
      settings,
      lastUpdate: Date.now(),
      createdAt: Number(permanent.accountCreatedAt || Date.now())
    };
  }

  load(initialState = null) {
    const hasCloudState = Boolean(initialState && typeof initialState === "object");
    const state = this.normalizeState(hasCloudState ? initialState : this.createState());
    this.state = state;
    this.ensureContractOffers();
    this.expireContracts(true);

    const now = Date.now();
    if (hasCloudState) {
      const elapsed = Math.max(0, Math.min(
        GameEngine.MAX_OFFLINE_SECONDS,
        (now - Number(state.lastUpdate || now)) / 1000
      ));
      if (elapsed > 0.05) this.simulate(elapsed, true);
    }

    state.lastUpdate = now;
    return state;
  }

  replaceState(input = null, { simulateOffline = false } = {}) {
    const hasState = Boolean(input && typeof input === "object");
    this.state = this.normalizeState(hasState ? input : this.createState());
    this.ensureContractOffers();
    this.expireContracts(true);

    const now = Date.now();
    if (hasState && simulateOffline) {
      const elapsed = Math.max(0, Math.min(
        GameEngine.MAX_OFFLINE_SECONDS,
        (now - Number(this.state.lastUpdate || now)) / 1000
      ));
      if (elapsed > 0.05) this.simulate(elapsed, true);
    }

    this.state.lastUpdate = now;
    return this.state;
  }

  normalizeState(input) {
    const permanent = {
      prestigePoints: input?.prestigePoints,
      prestigeUpgrades: input?.prestigeUpgrades,
      permanentBonuses: input?.permanentBonuses,
      missionsClaimed: input?.missionsClaimed,
      cropsDiscovered: input?.cropsDiscovered,
      prestiges: input?.stats?.prestiges,
      lifetimeCoins: input?.stats?.lifetimeCoins,
      lifetimeHarvested: input?.stats?.lifetimeHarvested ?? input?.stats?.totalHarvested,
      lifetimeSold: input?.stats?.lifetimeSold ?? input?.stats?.totalSold,
      lifetimeSoldByCategory: input?.stats?.lifetimeSoldByCategory ?? input?.stats?.soldByCategory,
      lifetimeOrdersCompleted: input?.stats?.lifetimeOrdersCompleted ?? input?.stats?.ordersCompleted,
      lifetimeOrderUnitsDelivered: input?.stats?.lifetimeOrderUnitsDelivered ?? input?.stats?.orderUnitsDelivered,
      lifetimeCropPurchases: input?.stats?.lifetimeCropPurchases,
      lifetimeCropUpgrades: input?.stats?.lifetimeCropUpgrades,
      completedOrderSeries: input?.stats?.completedOrderSeries,
      lifetimeContractsCompleted: input?.stats?.lifetimeContractsCompleted ?? input?.stats?.contractsCompleted,
      lifetimeContractsFailed: input?.stats?.lifetimeContractsFailed ?? input?.stats?.contractsFailed,
      lifetimeContractsBroken: input?.stats?.lifetimeContractsBroken ?? input?.stats?.contractsBroken,
      lifetimeContractUnitsDelivered: input?.stats?.lifetimeContractUnitsDelivered ?? input?.stats?.contractUnitsDelivered,
      totalPrestigeEarned: input?.stats?.totalPrestigeEarned,
      maxFarmLevel: input?.stats?.maxFarmLevel ?? input?.farmLevel,
      maxCropLevel: input?.stats?.maxCropLevel,
      maxCropsOwned: input?.stats?.maxCropsOwned,
      maxCoinsHeld: input?.stats?.maxCoinsHeld ?? input?.coins,
      maxStorageUsed: input?.stats?.maxStorageUsed,
      accountCreatedAt: input?.createdAt,
      settings: input?.settings
    };
    const base = this.createState(permanent);
    if (!input || typeof input !== "object") return base;

    const merged = {
      ...base,
      ...input,
      settings: { ...base.settings, ...(input.settings || {}) },
      upgrades: { ...base.upgrades, ...(input.upgrades || {}) },
      storageExpansions: Math.max(0, Math.floor(Number(input.storageExpansions) || 0)),
      researchTechs: { ...base.researchTechs, ...(input.researchTechs || {}) },
      prestigeUpgrades: { ...base.prestigeUpgrades, ...(input.prestigeUpgrades || {}) },
      permanentBonuses: { ...base.permanentBonuses, ...(input.permanentBonuses || {}) },
      missionsClaimed: { ...base.missionsClaimed, ...(input.missionsClaimed || {}) },
      cropsDiscovered: { ...base.cropsDiscovered, ...(input.cropsDiscovered || {}) },
      stats: { ...base.stats, ...(input.stats || {}) },
      crops: {},
      orders: {}
    };

    const legacyEffectsEnabled = merged.settings.soundEnabled !== false;
    const legacyMusicEnabled = merged.settings.musicEnabled !== false;
    merged.settings.masterVolume = Math.max(0, Math.min(100, Number(merged.settings.masterVolume ?? 100) || 0));
    merged.settings.effectVolume = Math.max(0, Math.min(100, legacyEffectsEnabled ? Number(merged.settings.effectVolume ?? merged.settings.soundVolume ?? 55) || 0 : 0));
    merged.settings.musicVolume = Math.max(0, Math.min(100, legacyMusicEnabled ? Number(merged.settings.musicVolume ?? 30) || 0 : 0));
    merged.settings.musicTrack = GameEngine.MUSIC_TRACKS.includes(merged.settings.musicTrack) ? merged.settings.musicTrack : "betweenLightAndShadows";
    merged.settings.numberFormat = merged.settings.numberFormat === "international" ? "international" : "brazilian";
    merged.settings.playerNickname = String(merged.settings.playerNickname || "").replace(/[<>]/g, "").trim().slice(0, 24);
    merged.settings.playerAvatar = String(merged.settings.playerAvatar || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48);
    merged.settings.playerRankingOptOut = Boolean(merged.settings.playerRankingOptOut);
    if (Number(input.version || 0) < 42) {
      const legacyAvatarMap = { frog_1: "chameleon", frog_2: "frog_1", frog_3: "frog_2", owl: "hawk" };
      merged.settings.playerAvatar = legacyAvatarMap[merged.settings.playerAvatar] || merged.settings.playerAvatar;
    }
    if (Array.isArray(window.AvatarData) && !window.AvatarData.some(avatar => avatar.id === merged.settings.playerAvatar)) {
      merged.settings.playerAvatar = "";
    }
    Reflect.deleteProperty(merged.settings, "soundEnabled");
    Reflect.deleteProperty(merged.settings, "soundVolume");
    Reflect.deleteProperty(merged.settings, "musicEnabled");
    Reflect.deleteProperty(merged.settings, "soundMappings");

    if (Number(input.version || 0) < 14) {
      const migrateLevels = (target, source, map) => {
        Object.entries(map).forEach(([oldId, newId]) => {
          const oldLevel = Math.max(0, Math.floor(Number(source?.[oldId]) || 0));
          if (oldLevel > 0) target[newId] = Math.max(Number(target[newId] || 0), oldLevel);
        });
      };
      migrateLevels(merged.upgrades, input.upgrades, {
        irrigation: "irrigationNetwork", fertilizer: "harvestCrew", logistics: "regionalMarket",
        warehouse: "reinforcedBarn", seedWorkshop: "seedCooperative", maintenance: "precisionTools",
        fieldTraining: "fieldAcademy", contractOffice: "contractBureau", orderCounter: "orderCenter",
        packingStation: "expressPacking"
      });
      migrateLevels(merged.researchTechs, input.researchTechs, {
        hydroponics: "acceleratedGermination", genetics: "hybridGenetics", marketData: "priceForecast",
        storageScience: "coldChain", seedCatalog: "smartSeedCatalog", soilMapping: "cultivationAlgorithms",
        contractAI: "negotiationModels", orderAnalytics: "orderOptimization", deadlineModel: "logisticsSimulation",
        farmEducation: "agriculturalPedagogy"
      });
      migrateLevels(merged.prestigeUpgrades, input.prestigeUpgrades, {
        seedCapital: "royalTreasury", greenLegacy: "eternalHarvest", merchantCrown: "goldenExchange",
        storageLegacy: "endlessGranary", rootMemory: "ancestralMastery", academyLegacy: "immortalAcademy"
      });
    }
    if (Number(input.version || 0) < 15) {
      const removedLevel = (...values) => Math.max(0, ...values.map(value => Math.floor(Number(value) || 0)));
      const spent = (level, baseCost, growth) => {
        let total = 0;
        for (let index = 0; index < level; index += 1) total += Math.ceil(baseCost * Math.pow(growth, index));
        return total;
      };
      const auctionLevel = removedLevel(input.upgrades?.autoAuction, input.upgrades?.autoMarket);
      const machineryLevel = removedLevel(input.upgrades?.continuousMachinery, input.upgrades?.mechanization);
      const autonomousLevel = removedLevel(input.researchTechs?.autonomousMarket, input.researchTechs?.marketAutomation);
      const mathematicsLevel = removedLevel(input.researchTechs?.prestigeMathematics, input.researchTechs?.prestigeTheory);
      merged.coins = Number(merged.coins || 0) + spent(auctionLevel, 900, 1.60) + spent(machineryLevel, 1200, 1.63);
      merged.research = Number(merged.research || 0) + spent(autonomousLevel, 4, 1.53) + spent(mathematicsLevel, 5, 1.56);
      Reflect.deleteProperty(merged.upgrades, "autoAuction");
      Reflect.deleteProperty(merged.upgrades, "continuousMachinery");
      Reflect.deleteProperty(merged.researchTechs, "autonomousMarket");
      Reflect.deleteProperty(merged.researchTechs, "prestigeMathematics");
    }
    if (Number(input?.version || 0) < 16) {
      // Revisão 15: propostas antigas são recriadas pelo novo sistema de equilíbrio.
      merged.contractOffers = [];
      merged.contractCooldowns = [];
    }
    if (Number(input?.version || 0) < 18) {
      // Revisão 17: propostas antigas são recriadas com o novo bônus por modalidade.
      // Contratos já assinados são preservados e nunca têm a recompensa reduzida.
      merged.contractOffers = [];
      merged.contractCooldowns = [];
      // Compensa saves anteriores pela mudança do capital inicial do Tesouro.
      const treasuryLevel = Math.max(0, Math.floor(Number(merged.prestigeUpgrades.royalTreasury) || 0));
      merged.coins = Number(merged.coins || 0) + 1900 + treasuryLevel * 500;
    }

    this.data.upgrades.forEach(item => {
      merged.upgrades[item.id] = Math.max(0, Math.min(item.max, Math.floor(Number(merged.upgrades[item.id]) || 0)));
    });
    this.data.research.forEach(item => {
      merged.researchTechs[item.id] = Math.max(0, Math.min(item.max, Math.floor(Number(merged.researchTechs[item.id]) || 0)));
    });
    this.data.prestigeUpgrades.forEach(item => {
      merged.prestigeUpgrades[item.id] = Math.max(0, Math.min(item.max, Math.floor(Number(merged.prestigeUpgrades[item.id]) || 0)));
    });

    // Na Revisão 10, a antiga escala visual de 85% passou a ser o novo 100%.
    // Preserva a aparência de quem havia escolhido explicitamente 85% antes da migração.
    if (Number(input.version || 0) < 12 && Number(input.settings?.uiScale) === 85) {
      merged.settings.uiScale = 100;
    }

    this.data.crops.forEach(crop => {
      const previous = input.crops?.[crop.id] || {};
      merged.crops[crop.id] = {
        owned: Boolean(previous.owned ?? base.crops[crop.id].owned),
        level: Math.max(0, Math.min(GameEngine.MAX_CROP_LEVEL, Math.floor(Number(previous.level ?? previous.tier ?? base.crops[crop.id].level) || 0))),
        progress: Math.max(0, Math.min(0.999, Number(previous.progress) || 0)),
        stock: Math.max(0, Math.floor(Number(previous.stock) || 0)),
        totalHarvested: Math.max(0, Math.floor(Number(previous.totalHarvested) || 0)),
        totalSold: Math.max(0, Math.floor(Number(previous.totalSold) || 0)),
        autoSell: Boolean(previous.autoSell),
        productionBuffer: Math.max(0, Number(previous.productionBuffer) || 0)
      };
      if (merged.crops[crop.id].owned && merged.crops[crop.id].level < 1) merged.crops[crop.id].level = 1;
      const previousOrder = input.orders?.[crop.id] || {};
      const previousDelivered = Math.max(0, Math.floor(Number(previousOrder.delivered) || 0));
      merged.orders[crop.id] = {
        tier: Math.max(0, Math.min(this.data.orderSteps.length, Math.floor(Number(previousOrder.tier) || 0))),
        delivered: Number(input.version || 0) < 19 ? 0 : previousDelivered,
        autoDeliver: false
      };
      const step = this.data.orderSteps[merged.orders[crop.id].tier];
      if (Number(input.version || 0) < 19 && previousDelivered > 0 && step) merged.crops[crop.id].stock += Math.min(step.amount, previousDelivered);
      merged.orders[crop.id].delivered = 0;
    });

    const legacyOwned = this.data.crops.filter(crop => merged.crops[crop.id].owned);
    const untouchedRevisionFive = Number(input.version || 0) < 9
      && legacyOwned.length === 1
      && legacyOwned[0].id === "onion"
      && merged.crops.onion.level <= 1
      && Number(input.stats?.totalHarvested || 0) === 0
      && Number(input.stats?.totalSold || 0) === 0
      && Number(input.stats?.ordersCompleted || 0) === 0
      && Number(input.stats?.contractsCompleted || 0) === 0;
    if (untouchedRevisionFive) {
      Object.assign(merged.crops.onion, { owned: false, level: 0, progress: 0, stock: 0, totalHarvested: 0, totalSold: 0 });
      merged.orders.onion = { tier: 0, delivered: 0, autoDeliver: false };
      merged.coins = GameEngine.BASE_STARTING_COINS + Math.max(0, Number(merged.prestigeUpgrades.royalTreasury || 0)) * GameEngine.TREASURY_COINS_PER_LEVEL;
    } else if (Number(input.version || 0) < 9 && legacyOwned.length === 0 && Number(input.stats?.totalHarvested || 0) === 0) {
      merged.coins = Math.min(merged.coins, GameEngine.BASE_STARTING_COINS + Math.max(0, Number(merged.prestigeUpgrades.royalTreasury || 0)) * GameEngine.TREASURY_COINS_PER_LEVEL);
    }

    const legacyStarterOnly = Number(input.version || 0) < 5
      && legacyOwned.length === 1
      && legacyOwned[0].id === "onion"
      && merged.crops.onion.level <= 1
      && Number(input.stats?.totalSold || 0) === 0
      && Number(input.stats?.contractsCompleted || 0) === 0;
    if (legacyStarterOnly) {
      Object.assign(merged.crops.onion, { owned: false, level: 0, progress: 0, stock: 0, totalHarvested: 0, totalSold: 0 });
      merged.orders.onion = { tier: 0, delivered: 0, autoDeliver: false };
    }

    const legacyContracts = legacyStarterOnly ? [] : (Array.isArray(input.contracts) ? input.contracts.filter(Boolean) : []);
    const rawOffers = Number(input.version || 0) < 19 ? [] : (Array.isArray(input.contractOffers) ? input.contractOffers : legacyContracts);
    const rawActive = Array.isArray(input.activeContracts) ? input.activeContracts : [];
    merged.contractOffers = rawOffers.map(contract => this.normalizeContract(contract, false)).filter(Boolean).slice(0, GameEngine.CONTRACT_OFFER_COUNT);
    merged.contractCooldowns = (Number(input.version || 0) < 19 ? [] : (Array.isArray(input.contractCooldowns) ? input.contractCooldowns : []))
      .map(value => this.normalizeContractCooldown(value))
      .filter(Boolean)
      .slice(0, GameEngine.CONTRACT_OFFER_COUNT);
    merged.activeContracts = rawActive.map(contract => this.normalizeContract(contract, true)).filter(Boolean).slice(0, GameEngine.MAX_ACTIVE_CONTRACTS);
    if (Number(input.version || 0) < 19) {
      merged.activeContracts.forEach(contract => {
        const crop = this.getCrop(contract.cropId);
        const difficulty = this.getContractDifficulty(contract.difficulty);
        if (!crop) return;
        const salePrice = this.getSalePriceForState(crop.id, merged);
        const rewardBonus = 1
          + Number(merged.researchTechs.negotiationModels || 0) * 0.08
          + Number(merged.upgrades.contractBureau || 0) * 0.08
          + Number(merged.prestigeUpgrades.sovereignNetwork || 0) * 0.20;
        contract.rewardCoins = Math.max(1, Math.floor(contract.amount * salePrice * difficulty.reward * rewardBonus));
        contract.rewardResearch = this.getContractResearchReward(contract.difficulty, contract.amount, merged);
      });
    }

    // Revisão 39: propostas e contratos existentes recebem o mesmo ajuste dos
    // novos contratos, sem aplicar novamente após o save já estar na versão 39.
    if (Number(input.version || 0) < 39) {
      const migrateContractBalance = (contract, active = false) => {
        const previousDuration = Math.max(1, Number(contract.durationSeconds) || 1);
        contract.durationSeconds = Math.max(22, Math.round(previousDuration * 0.70));
        if (active && !contract.defaultedAt && !contract.completedAt) {
          contract.timeRemaining = Math.max(0, Math.min(
            contract.durationSeconds,
            Number(contract.timeRemaining || 0) * 0.70
          ));
        } else if (!active) {
          contract.timeRemaining = contract.durationSeconds;
        }
        contract.rewardCoins = Math.max(1, Math.floor(Number(contract.rewardCoins || 1) * GameEngine.CONTRACT_REWARD_FACTOR));
        if (contract.defaultedAt) contract.penaltyCoins = Math.max(1, Math.ceil(contract.rewardCoins * 1.20));
      };
      merged.contractOffers.forEach(contract => migrateContractBalance(contract, false));
      merged.activeContracts.forEach(contract => migrateContractBalance(contract, true));
    }
    Reflect.deleteProperty(merged, "contracts");

    // Revisão 36: contas realmente intocadas passam a usar o novo capital
    // inicial de 120 moedas. Jornadas em andamento preservam o saldo atual.
    if (Number(input.version || 0) < 36) {
      const hasJourneyProgress = Number(input.farmLevel || 1) > 1
        || Number(input.farmXP || 0) > 0
        || Object.values(input.crops || {}).some(crop => crop?.owned || Number(crop?.totalHarvested || 0) > 0 || Number(crop?.totalSold || 0) > 0)
        || Object.values(input.upgrades || {}).some(level => Number(level || 0) > 0)
        || Object.values(input.researchTechs || {}).some(level => Number(level || 0) > 0)
        || Number(input.storageExpansions || 0) > 0
        || Number(input.stats?.ordersCompleted || 0) > 0
        || Number(input.stats?.contractsCompleted || 0) > 0
        || Number(input.stats?.contractsFailed || 0) > 0
        || Number(input.stats?.contractsBroken || 0) > 0;
      if (!hasJourneyProgress) {
        const treasuryLevel = Math.max(0, Math.floor(Number(merged.prestigeUpgrades.royalTreasury) || 0));
        merged.coins = GameEngine.BASE_STARTING_COINS + treasuryLevel * GameEngine.TREASURY_COINS_PER_LEVEL;
      }
    }

    merged.farmLevel = Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(merged.farmLevel) || 1)));
    const loadedFarmXP = Math.max(0, Number(merged.farmXP) || 0);
    if (Number(input.version || 0) < 38 && merged.farmLevel < GameEngine.MAX_FARM_LEVEL) {
      // Preserva a porcentagem já preenchida da barra ao migrar da curva antiga
      // para a escala longa que alcança os sufixos Aa–Az nos níveis avançados.
      const previousNeed = Math.round(160 + 72 * Math.pow(merged.farmLevel, 1.52));
      const previousProgress = previousNeed > 0 ? Math.min(0.999999, loadedFarmXP / previousNeed) : 0;
      merged.farmXP = this.getFarmXPNeed(merged.farmLevel) * previousProgress;
    } else {
      merged.farmXP = loadedFarmXP;
    }
    merged.version = GameEngine.SAVE_VERSION;
    merged.coins = Math.max(0, Number(merged.coins) || 0);
    merged.research = Math.max(0, Number(merged.research) || 0);
    merged.prestigePoints = Math.max(0, Number(merged.prestigePoints) || 0);
    Reflect.deleteProperty(merged, ["repu", "tation"].join(""));
    merged.stats.soldByCategory = { ...base.stats.soldByCategory, ...(input.stats?.soldByCategory || {}) };
    merged.stats.lifetimeSoldByCategory = { ...base.stats.lifetimeSoldByCategory, ...(input.stats?.lifetimeSoldByCategory || input.stats?.soldByCategory || {}) };
    for (const category of Object.keys(this.data.categories)) {
      merged.stats.soldByCategory[category] = Math.max(0, Math.floor(Number(merged.stats.soldByCategory[category]) || 0));
      merged.stats.lifetimeSoldByCategory[category] = Math.max(0, Math.floor(Number(merged.stats.lifetimeSoldByCategory[category]) || 0));
    }
    merged.stats.totalHarvested = Math.max(0, Math.floor(Number(merged.stats.totalHarvested) || 0));
    merged.stats.lifetimeHarvested = Math.max(merged.stats.totalHarvested, Math.floor(Number(merged.stats.lifetimeHarvested) || 0));
    merged.stats.totalSold = Math.max(0, Math.floor(Number(merged.stats.totalSold) || 0));
    merged.stats.lifetimeSold = Math.max(merged.stats.totalSold, Math.floor(Number(merged.stats.lifetimeSold) || 0));
    merged.stats.ordersCompleted = Math.max(0, Math.floor(Number(merged.stats.ordersCompleted) || 0));
    merged.stats.lifetimeOrdersCompleted = Math.max(merged.stats.ordersCompleted, Math.floor(Number(merged.stats.lifetimeOrdersCompleted) || 0));
    merged.stats.orderUnitsDelivered = Math.max(0, Math.floor(Number(merged.stats.orderUnitsDelivered) || 0));
    merged.stats.lifetimeOrderUnitsDelivered = Math.max(merged.stats.orderUnitsDelivered, Math.floor(Number(merged.stats.lifetimeOrderUnitsDelivered) || 0));
    const discoveredCount = Object.keys(merged.cropsDiscovered || {}).filter(id => merged.cropsDiscovered[id]).length;
    const ownedCount = Object.values(merged.crops).filter(item => item.owned).length;
    const currentCropUpgradeCount = Object.values(merged.crops).reduce((sum, item) => sum + Math.max(0, Number(item.level || 0) - (item.owned ? 1 : 0)), 0);
    merged.stats.lifetimeCropPurchases = Math.max(ownedCount, discoveredCount, Math.floor(Number(merged.stats.lifetimeCropPurchases) || 0));
    merged.stats.lifetimeCropUpgrades = Math.max(currentCropUpgradeCount, Math.floor(Number(merged.stats.lifetimeCropUpgrades) || 0));
    merged.stats.completedOrderSeries = Math.max(0, Math.floor(Number(merged.stats.completedOrderSeries) || 0));
    merged.stats.contractsCompleted = Math.max(0, Math.floor(Number(merged.stats.contractsCompleted) || 0));
    merged.stats.lifetimeContractsCompleted = Math.max(merged.stats.contractsCompleted, Math.floor(Number(merged.stats.lifetimeContractsCompleted) || 0));
    merged.stats.contractsFailed = Math.max(0, Math.floor(Number(merged.stats.contractsFailed) || 0));
    merged.stats.lifetimeContractsFailed = Math.max(merged.stats.contractsFailed, Math.floor(Number(merged.stats.lifetimeContractsFailed) || 0));
    merged.stats.contractsBroken = Math.max(0, Math.floor(Number(merged.stats.contractsBroken) || 0));
    merged.stats.lifetimeContractsBroken = Math.max(merged.stats.contractsBroken, Math.floor(Number(merged.stats.lifetimeContractsBroken) || 0));
    merged.stats.contractUnitsDelivered = Math.max(0, Math.floor(Number(merged.stats.contractUnitsDelivered) || 0));
    merged.stats.lifetimeContractUnitsDelivered = Math.max(merged.stats.contractUnitsDelivered, Math.floor(Number(merged.stats.lifetimeContractUnitsDelivered) || 0));
    merged.stats.totalPrestigeEarned = Math.max(0, Math.floor(Number(merged.stats.totalPrestigeEarned) || 0));
    merged.stats.maxFarmLevel = Math.min(GameEngine.MAX_FARM_LEVEL, Math.max(merged.farmLevel || 1, Math.floor(Number(merged.stats.maxFarmLevel) || 1)));
    merged.stats.maxCropLevel = Math.max(0, Math.floor(Number(merged.stats.maxCropLevel) || 0), ...Object.values(merged.crops).map(item => item.level || 0));
    merged.stats.maxCropsOwned = Math.max(0, Math.floor(Number(merged.stats.maxCropsOwned) || 0), Object.values(merged.crops).filter(item => item.owned).length);
    merged.stats.maxCoinsHeld = Math.max(merged.coins || 0, Math.floor(Number(merged.stats.maxCoinsHeld) || 0));
    merged.stats.maxStorageUsed = Math.max(this.getStorageUsedFromState(merged), Math.floor(Number(merged.stats.maxStorageUsed) || 0));
    for (const crop of this.data.crops) if (merged.crops[crop.id]?.owned) merged.cropsDiscovered[crop.id] = true;
    merged.permanentBonuses.prestigeDouble = Boolean(merged.permanentBonuses.prestigeDouble);
    merged.farmLevel = Math.max(1, Math.floor(Number(merged.farmLevel) || 1));
    merged.farmXP = Math.max(0, Number(merged.farmXP) || 0);
    Reflect.deleteProperty(merged, "seasonIndex");
    Reflect.deleteProperty(merged, "seasonElapsed");
    Reflect.deleteProperty(merged.upgrades, "greenhouse");
    return merged;
  }

  save() {
    this.state.lastUpdate = Date.now();
    if (!window.FirebaseManager?.isAuthenticated()) {
      return Promise.resolve({ ok: false, reason: "guest" });
    }
    return window.FirebaseManager.saveGame(this.state);
  }


  emit(type, payload = {}) {
    try { this.onEvent({ type, ...payload }); } catch (error) { console.warn(error); }
  }

  tick(seconds) {
    const safe = Math.min(5, Math.max(0, Number(seconds) || 0));
    if (safe <= 0) return;
    this.simulate(safe, false);
  }

  simulate(seconds, offline = false) {
    let remaining = Math.max(0, Math.min(GameEngine.MAX_OFFLINE_SECONDS, Number(seconds) || 0));
    this.expireContracts(offline);

    while (remaining > 0.0001) {
      const activeTimes = this.state.activeContracts
        .filter(contract => contract.delivered < contract.amount && !contract.completedAt)
        .map(contract => Math.max(0, Number(contract.timeRemaining) || 0))
        .filter(time => time > 0);
      const nearestDeadline = activeTimes.length ? Math.min(...activeTimes) : Infinity;
      const normalStep = offline ? 60 : remaining;
      const step = Math.min(remaining, normalStep, nearestDeadline);

      if (!Number.isFinite(step) || step <= 0.0001) {
        this.expireContracts(offline);
        if (!this.state.activeContracts.length) continue;
        break;
      }

      this.produce(step, offline);
      this.advanceContractTimers(step, offline);
      this.ensureContractOffers();
      remaining -= step;
    }
  }

  produce(seconds, offline) {
    for (const crop of this.data.crops) {
      const cropState = this.state.crops[crop.id];
      if (!cropState.owned || cropState.level <= 0) continue;

      const directRoute = cropState.autoSell || this.hasActiveContractForCrop(crop.id);
      if (!directRoute && this.getStorageRemaining() <= 0) {
        cropState.progress = Math.min(cropState.progress, 0.995);
        continue;
      }

      const growthTime = this.getGrowthTime(crop.id);
      cropState.progress += growthTime <= 0
        ? seconds * this.getInstantCyclesPerSecond(crop.id)
        : seconds / growthTime;

      const cycles = Math.floor(cropState.progress);
      if (cycles < 1) continue;

      const perCycle = this.getYield(crop.id);
      cropState.progress -= cycles;
      cropState.productionBuffer = Math.max(0, Number(cropState.productionBuffer) || 0) + cycles * perCycle;
      const requested = Math.floor(cropState.productionBuffer);
      if (requested < 1) continue;
      const routed = this.routeProducedCrop(crop.id, requested, offline);
      cropState.productionBuffer = Math.max(0, cropState.productionBuffer - routed.accepted);
      if (routed.accepted < 1) continue;

      cropState.totalHarvested += routed.accepted;
      this.state.stats.totalHarvested += routed.accepted;
      this.state.stats.lifetimeHarvested += routed.accepted;
      this.state.stats.maxStorageUsed = Math.max(this.state.stats.maxStorageUsed, this.getStorageUsed());
    }
  }

  routeProducedCrop(cropId, amount, silent = false) {
    const cropState = this.state.crops[cropId];
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let delivered = 0;
    let autoSold = 0;
    let stored = 0;
    let gain = 0;

    const contracts = this.state.activeContracts
      .filter(contract => contract.cropId === cropId && contract.delivered < contract.amount && !contract.completedAt && (contract.timeRemaining > 0 || contract.defaultedAt))
      .sort((a, b) => (a.timeRemaining - b.timeRemaining) || (a.acceptedAt - b.acceptedAt));

    for (const contract of contracts) {
      if (remaining < 1) break;
      const needed = Math.max(0, contract.amount - contract.delivered);
      const sent = Math.min(remaining, needed);
      if (sent < 1) continue;
      contract.delivered += sent;
      remaining -= sent;
      delivered += sent;
      this.state.stats.contractUnitsDelivered += sent;
      this.state.stats.lifetimeContractUnitsDelivered += sent;
      if (contract.delivered >= contract.amount) this.markContractComplete(contract.id, silent, true);
    }

    const orderDelivered = 0;

    if (remaining > 0 && cropState.autoSell) {
      autoSold = remaining;
      gain = Math.floor(autoSold * this.getAutoSalePrice(cropId));
      this.recordSale(cropId, autoSold, gain, silent);
      remaining = 0;
    }

    if (remaining > 0) {
      stored = Math.min(remaining, this.getStorageRemaining());
      cropState.stock += stored;
      remaining -= stored;
    }

    return {
      accepted: Math.max(0, amount - remaining),
      delivered,
      orderDelivered,
      autoSold,
      stored,
      gain,
      blocked: remaining
    };
  }

  hasActiveContractForCrop(cropId) {
    return this.state.activeContracts.some(contract => contract.cropId === cropId && contract.delivered < contract.amount && !contract.completedAt && (contract.timeRemaining > 0 || contract.defaultedAt));
  }

  isEvolutionUnlocked() {
    return this.state.farmLevel >= GameEngine.FEATURE_UNLOCK_LEVEL;
  }

  isContractsUnlocked() {
    return true;
  }

  isOrdersUnlocked() {
    return this.state.farmLevel >= GameEngine.FEATURE_UNLOCK_LEVEL;
  }

  isOfficeCommerceUnlocked() {
    return this.isContractsUnlocked();
  }

  isPrestigeUnlocked() {
    return this.state.farmLevel >= GameEngine.PRESTIGE_UNLOCK_LEVEL;
  }

  getStartingCoins(state = this.state) {
    const treasuryLevel = Math.max(0, Math.floor(Number(state?.prestigeUpgrades?.royalTreasury) || 0));
    return GameEngine.BASE_STARTING_COINS + treasuryLevel * GameEngine.TREASURY_COINS_PER_LEVEL;
  }

  getActiveContractSlotLimit(state = this.state) {
    const levelSlot = Number(state?.farmLevel || 1) >= GameEngine.SECOND_CONTRACT_SLOT_LEVEL ? 1 : 0;
    const researchSlots = Math.max(0, Math.min(2, Math.floor(Number(state?.researchTechs?.contractPortfolio) || 0)));
    const prestigeSlots = Math.max(0, Math.min(3, Math.floor(Number(state?.prestigeUpgrades?.contractEmpire) || 0)));
    return Math.min(GameEngine.MAX_ACTIVE_CONTRACTS, 1 + levelSlot + researchSlots + prestigeSlots);
  }

  getContractSlotBreakdown(state = this.state) {
    return {
      total: this.getActiveContractSlotLimit(state),
      base: 1,
      level: Number(state?.farmLevel || 1) >= GameEngine.SECOND_CONTRACT_SLOT_LEVEL ? 1 : 0,
      research: Math.max(0, Math.min(2, Math.floor(Number(state?.researchTechs?.contractPortfolio) || 0))),
      prestige: Math.max(0, Math.min(3, Math.floor(Number(state?.prestigeUpgrades?.contractEmpire) || 0)))
    };
  }

  advanceContractTimers(seconds, silent = false) {
    const elapsed = Math.max(0, Number(seconds) || 0);
    this.state.activeContracts.forEach(contract => {
      if (contract.completedAt || contract.delivered >= contract.amount) return;
      contract.timeRemaining = Math.max(0, Number(contract.timeRemaining || 0) - elapsed);
    });
    this.expireContracts(silent);
  }

  expireContracts(silent = false) {
    const expired = this.state.activeContracts.filter(contract =>
      !contract.completedAt
      && !contract.defaultedAt
      && Number(contract.timeRemaining || 0) <= 0
      && contract.delivered < contract.amount
    );
    if (!expired.length) return [];

    const defaultedAt = Date.now();
    expired.forEach(contract => {
      contract.timeRemaining = 0;
      contract.defaultedAt = defaultedAt;
      contract.penaltyCoins = Math.max(1, Math.ceil(contract.rewardCoins * 1.20));
      this.state.stats.contractsFailed += 1;
      this.state.stats.lifetimeContractsFailed += 1;
    });
    return expired;
  }

  addFarmXP(amount, silent = false) {
    const training = Number(this.state.upgrades.fieldAcademy || 0);
    const education = Number(this.state.researchTechs.agriculturalPedagogy || 0);
    const multiplier = 1 + training * 0.07 + education * 0.07;
    this.state.farmXP += Math.max(0, amount) * multiplier;

    // No nível máximo, a experiência continua sendo registrada, mas nunca cria
    // níveis 1.001 ou superiores.
    if (this.state.farmLevel >= GameEngine.MAX_FARM_LEVEL) {
      this.state.farmLevel = GameEngine.MAX_FARM_LEVEL;
      this.state.stats.maxFarmLevel = GameEngine.MAX_FARM_LEVEL;
      return;
    }

    let leveled = false;
    let rewardCoins = 0;
    const milestones = [];
    while (this.state.farmLevel < GameEngine.MAX_FARM_LEVEL && this.state.farmXP >= this.getFarmXPNeed()) {
      this.state.farmXP -= this.getFarmXPNeed();
      this.state.farmLevel += 1;
      this.state.stats.maxFarmLevel = Math.max(this.state.stats.maxFarmLevel, this.state.farmLevel);
      const reward = Math.floor(120 * Math.pow(this.state.farmLevel, 1.35));
      this.addCoins(reward);
      rewardCoins += reward;
      leveled = true;
      if (this.state.farmLevel % 5 === 0) {
        milestones.push({
          level: this.state.farmLevel,
          unlocks: this.getMilestoneUnlocks(this.state.farmLevel)
        });
      }
    }
    if (leveled && !silent) this.emit("level", { level: this.state.farmLevel, rewardCoins, milestones });
  }

  addFarmXPPercent(rate, occurrences = 1, silent = false) {
    const percentage = Math.max(0, Number(rate) || 0);
    const count = Math.max(0, Math.floor(Number(occurrences) || 0));
    for (let index = 0; index < count; index += 1) {
      this.addFarmXP(this.getFarmXPNeed() * percentage, silent);
    }
  }

  getFarmXPNeed(level = this.state.farmLevel) {
    const normalizedLevel = Math.max(1, Math.min(GameEngine.MAX_FARM_LEVEL, Math.floor(Number(level) || 1)));
    const baseCurve = 160 + 72 * Math.pow(normalizedLevel, 1.52);
    const journeyProgress = (normalizedLevel - 1) / Math.max(1, GameEngine.MAX_FARM_LEVEL - 1);

    // A aceleração exponencial é suave nos níveis iniciais e cresce ao longo da
    // jornada. No nível 1.000, o requisito chega à faixa Az. Como as fontes de
    // XP concedem percentuais do requisito atual, o ritmo de ações por nível é
    // preservado enquanto a escala numérica acompanha a progressão completa.
    const extendedScale = Math.pow(10, 84 * Math.pow(journeyProgress, 2));
    return Math.round(baseCurve * extendedScale);
  }

  getMilestoneUnlocks(level) {
    const milestoneLevel = Math.max(1, Math.floor(Number(level) || 1));
    const unlocks = this.data.crops
      .filter(crop => Number(crop.unlockLevel) === milestoneLevel)
      .sort((cropA, cropB) => cropA.index - cropB.index)
      .map(crop => `Nova cultura disponível para compra: ${crop.name}.`);

    if (milestoneLevel === GameEngine.FEATURE_UNLOCK_LEVEL) {
      unlocks.push("Pedidos liberados no Escritório.");
      unlocks.push("Aprimoramentos e pesquisas liberados no Centro de evoluções.");
    }
    if (milestoneLevel === GameEngine.SECOND_CONTRACT_SLOT_LEVEL) {
      unlocks.push("Segundo slot de contrato ativo liberado.");
    }
    if (milestoneLevel === GameEngine.PRESTIGE_UNLOCK_LEVEL) {
      unlocks.push("A ação de prestigiar foi liberada.");
    }
    if (!unlocks.length) unlocks.push("Novo marco de desenvolvimento alcançado pela fazenda.");
    return unlocks;
  }

  getCrop(cropId) {
    return this.data.crops.find(item => item.id === cropId);
  }

  getOwnedCrops() {
    return this.data.crops.filter(crop => this.state.crops[crop.id]?.owned);
  }

  getGlobalGrowthSpeed() {
    const irrigation = Number(this.state.upgrades.irrigationNetwork || 0);
    const germination = Number(this.state.researchTechs.acceleratedGermination || 0);
    const legacy = Number(this.state.prestigeUpgrades.eternalHarvest || 0);
    return 1 + irrigation * 0.06 + germination * 0.07 + legacy * 0.12;
  }

  getInstantGrowthLevel() {
    const irrigation = Number(this.state.upgrades.irrigationNetwork || 0) * 0.06;
    const germination = Number(this.state.researchTechs.acceleratedGermination || 0) * 0.07;
    const legacy = Number(this.state.prestigeUpgrades.eternalHarvest || 0) * 0.12;
    const maximumBonus = 15 * 0.06 + 10 * 0.07 + 12 * 0.12;
    const progress = Math.max(0, Math.min(1, (irrigation + germination + legacy) / maximumBonus));
    const reduction = Math.round((GameEngine.INSTANT_GROWTH_LEVEL - GameEngine.MIN_INSTANT_GROWTH_LEVEL) * progress);
    return Math.max(GameEngine.MIN_INSTANT_GROWTH_LEVEL, GameEngine.INSTANT_GROWTH_LEVEL - reduction);
  }

  getGrowthTime(cropId) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!crop || !cropState) return Infinity;
    const level = Math.max(1, Math.min(GameEngine.MAX_CROP_LEVEL, Number(cropState.level) || 1));
    const instantLevel = this.getInstantGrowthLevel();
    if (level >= instantLevel) return 0;

    const levelProgress = Math.max(0, Math.min(1, (level - 1) / (instantLevel - 1)));
    const remainingFactor = 1 - Math.sqrt(levelProgress);
    const levelAdjustedTime = crop.baseGrowth * remainingFactor;
    return Math.max(0.01, levelAdjustedTime / this.getGlobalGrowthSpeed());
  }

  getInstantCyclesPerSecond(cropId) {
    const crop = this.getCrop(cropId);
    if (!crop) return 0;
    const instantLevel = this.getInstantGrowthLevel();
    const previousProgress = Math.max(0, (instantLevel - 2) / (instantLevel - 1));
    const previousFactor = Math.max(0.0001, 1 - Math.sqrt(previousProgress));
    const previousTime = Math.max(0.01, (crop.baseGrowth * previousFactor) / this.getGlobalGrowthSpeed());
    return Math.max(1, 1 / previousTime);
  }

  getYield(cropId) {
    const crop = this.getCrop(cropId);
    const harvestCrew = Number(this.state.upgrades.harvestCrew || 0);
    const genetics = Number(this.state.researchTechs.hybridGenetics || 0);
    const legacy = Number(this.state.prestigeUpgrades.eternalHarvest || 0);
    const globalYieldMultiplier = 1 + harvestCrew * 0.07 + genetics * 0.08 + legacy * 0.10;
    return crop.baseYield * globalYieldMultiplier;
  }

  getProductionRate(cropId) {
    const growthTime = this.getGrowthTime(cropId);
    const cyclesPerSecond = growthTime <= 0 ? this.getInstantCyclesPerSecond(cropId) : 1 / growthTime;
    return Math.max(0, this.getYield(cropId) * cyclesPerSecond);
  }

  getStorageCap() {
    const warehouseBonus = Number(this.state.upgrades.reinforcedBarn || 0) * 0.20;
    const researchBonus = Number(this.state.researchTechs.coldChain || 0) * 0.20;
    const legacyBonus = Number(this.state.prestigeUpgrades.endlessGranary || 0) * 0.60;
    const percentageCapacity = Math.round(GameEngine.BASE_STORAGE_CAPACITY * (1 + warehouseBonus + researchBonus + legacyBonus));
    const directCapacity = Math.max(0, Number(this.state.storageExpansions || 0)) * 100;
    return Math.max(GameEngine.BASE_STORAGE_CAPACITY, percentageCapacity + directCapacity);
  }

  getDirectStorageExpansionCost() {
    const level = Math.max(0, Number(this.state.storageExpansions || 0));
    return Math.ceil(1200 * Math.pow(1.85, level));
  }

  expandStorage() {
    const cost = this.getDirectStorageExpansionCost();
    if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
    this.state.coins -= cost;
    this.state.storageExpansions = Math.max(0, Number(this.state.storageExpansions || 0)) + 1;
    this.addFarmXPPercent(0.017);
    return { ok: true, cost, added: 100, capacity: this.getStorageCap() };
  }

  getStorageUsedFromState(state = this.state) {
    return Object.values(state?.crops || {}).reduce((sum, cropState) => sum + Math.max(0, Number(cropState.stock) || 0), 0);
  }

  getStorageUsed() {
    return this.getStorageUsedFromState(this.state);
  }

  getStorageRemaining() {
    return Math.max(0, this.getStorageCap() - this.getStorageUsed());
  }

  getSalePriceForState(cropId, state) {
    const crop = this.getCrop(cropId);
    if (!crop || !state) return 0;
    const regional = Number(state.upgrades?.regionalMarket || 0) * 0.06;
    const forecast = Number(state.researchTechs?.priceForecast || 0) * 0.06;
    const legacy = Number(state.prestigeUpgrades?.goldenExchange || 0) * 0.15;
    const cropLevel = Math.max(1, Number(state.crops?.[cropId]?.level || 1));
    const cultivationValue = 1 + Math.max(0, cropLevel - 1) * 0.0035;
    return Math.max(1, crop.basePrice * cultivationValue * (1 + regional + forecast + legacy));
  }

  getSalePrice(cropId) {
    const crop = this.getCrop(cropId);
    const market = Number(this.state.upgrades.regionalMarket || 0);
    const forecast = Number(this.state.researchTechs.priceForecast || 0);
    const legacy = Number(this.state.prestigeUpgrades.goldenExchange || 0);
    const cropLevel = Math.max(1, Number(this.state.crops[cropId]?.level || 1));
    const cultivationValue = 1 + Math.max(0, cropLevel - 1) * 0.0035;
    return Math.max(1, crop.basePrice * cultivationValue * (1 + market * 0.06 + forecast * 0.06 + legacy * 0.15));
  }

  getAutoSalePrice(cropId) {
    const sovereign = Number(this.state.prestigeUpgrades.sovereignNetwork || 0);
    return this.getSalePrice(cropId) * (1 + sovereign * 0.10);
  }

  getBuyCost(cropId) {
    const crop = this.getCrop(cropId);
    if (!crop) return Infinity;
    const inheritedDiscount = Number(this.state.prestigeUpgrades.ancestralMastery || 0) * 0.08;
    const cooperativeDiscount = Number(this.state.upgrades.seedCooperative || 0) * 0.04;
    const catalogDiscount = Number(this.state.researchTechs.smartSeedCatalog || 0) * 0.04;
    const totalDiscount = Math.min(0.80, inheritedDiscount + cooperativeDiscount + catalogDiscount);
    return Math.max(0, Math.floor(crop.cost * (1 - totalDiscount)));
  }

  getCropUpgradeCost(cropId, levelOverride = null) {
    const crop = this.getCrop(cropId);
    const level = Math.max(1, Number(levelOverride ?? this.state.crops[cropId]?.level) || 1);
    if (!crop || level >= GameEngine.MAX_CROP_LEVEL) return Infinity;

    // Curva híbrida: mantém os primeiros níveis compreensíveis, mas faz os
    // níveis avançados acompanharem a economia de milhões, bilhões e trilhões.
    const base = Math.max(140, crop.basePrice * 10 + Math.sqrt(crop.cost) * 3);
    const exponential = Math.pow(1.04, level - 1);
    const masteryCurve = Math.pow(1 + (level - 1) * 0.025, 1.65);
    const milestone = 1 + Math.floor((level - 1) / 50) * 0.28;
    const precisionDiscount = Number(this.state.upgrades.precisionTools || 0) * 0.04;
    const algorithmDiscount = Number(this.state.researchTechs.cultivationAlgorithms || 0) * 0.04;
    const legacyDiscount = Number(this.state.prestigeUpgrades.ancestralMastery || 0) * 0.06;
    const discount = Math.min(0.70, precisionDiscount + algorithmDiscount + legacyDiscount);
    return Math.max(1, Math.ceil(base * exponential * masteryCurve * milestone * (1 - discount)));
  }

  getCropAffordableUpgrades(cropId, budget = this.state.coins) {
    const cropState = this.state.crops[cropId];
    if (!cropState?.owned) {
      return { levels: 0, totalCost: 0, nextCost: 0 };
    }

    let levels = 0;
    let totalCost = 0;
    let simulatedLevel = cropState.level;
    const available = Math.max(0, Number(budget) || 0);

    while (levels < GameEngine.MAX_BATCH_UPGRADES && simulatedLevel < GameEngine.MAX_CROP_LEVEL) {
      const cost = this.getCropUpgradeCost(cropId, simulatedLevel);
      if (!Number.isFinite(cost) || totalCost + cost > available) break;
      totalCost += cost;
      levels += 1;
      simulatedLevel += 1;
    }

    return {
      levels,
      totalCost,
      nextCost: this.getCropUpgradeCost(cropId, cropState.level)
    };
  }


  isCropUnlocked(cropId) {
    const crop = this.getCrop(cropId);
    return Boolean(crop && this.state.farmLevel >= crop.unlockLevel);
  }

  buyCrop(cropId) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!crop || !cropState || cropState.owned) return { ok: false, message: "Esta cultura já está na fazenda." };
    if (!this.isCropUnlocked(cropId)) return { ok: false, message: `Esta cultura libera no nível ${crop.unlockLevel} da fazenda.` };
    const cost = this.getBuyCost(cropId);
    if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
    this.state.coins -= cost;
    Object.assign(cropState, { owned: true, level: 1, progress: 0 });
    this.state.cropsDiscovered[cropId] = true;
    this.state.stats.lifetimeCropPurchases += 1;
    this.addFarmXPPercent(0.017);
    this.state.stats.maxCropsOwned = Math.max(this.state.stats.maxCropsOwned, this.getOwnedCrops().length);
    this.state.stats.maxCropLevel = Math.max(this.state.stats.maxCropLevel, 1);
    this.ensureContractOffers();
    return { ok: true };
  }

  upgradeCrop(cropId, requestedLevels = 1) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!cropState?.owned) return { ok: false, message: "Compre a cultura primeiro." };

    if (cropState.level >= GameEngine.MAX_CROP_LEVEL) return { ok: false, message: "Esta plantação já alcançou o nível máximo 300." };
    const target = Math.min(GameEngine.MAX_BATCH_UPGRADES, GameEngine.MAX_CROP_LEVEL - cropState.level, Math.max(1, Math.floor(Number(requestedLevels) || 1)));
    let purchased = 0;
    let totalCost = 0;

    while (purchased < target) {
      const cost = this.getCropUpgradeCost(cropId, cropState.level + purchased);
      if (!Number.isFinite(cost) || totalCost + cost > this.state.coins) break;
      totalCost += cost;
      purchased += 1;
    }

    if (purchased < 1) {
      const nextCost = this.getCropUpgradeCost(cropId);
      return { ok: false, message: `Faltam ${this.formatMoney(nextCost - this.state.coins)}.` };
    }

    const previousLevel = cropState.level;
    this.state.coins -= totalCost;
    cropState.level += purchased;
    this.state.stats.lifetimeCropUpgrades += purchased;
    this.addFarmXPPercent(0.017, purchased);
    const reachedCropPrestige = previousLevel < GameEngine.MAX_CROP_LEVEL
      && cropState.level >= GameEngine.MAX_CROP_LEVEL;
    if (reachedCropPrestige) this.addFarmXPPercent(0.10);
    this.state.stats.maxCropLevel = Math.max(this.state.stats.maxCropLevel, cropState.level);
    return { ok: true, purchased, totalCost, level: cropState.level, crop, reachedCropPrestige, masteryXpRate: reachedCropPrestige ? 0.10 : 0 };
  }

  upgradeCropMax(cropId) {
    const affordable = this.getCropAffordableUpgrades(cropId);
    if (affordable.levels < 1) {
      return { ok: false, message: "Ainda não há moedas suficientes para outro aprimoramento." };
    }
    return this.upgradeCrop(cropId, affordable.levels);
  }

  recordSale(cropId, sold, gain, silent = false) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    const amount = Math.max(0, Math.floor(Number(sold) || 0));
    const coins = Math.max(0, Math.floor(Number(gain) || 0));
    if (!crop || !cropState || amount < 1) return;
    cropState.totalSold += amount;
    this.state.stats.totalSold += amount;
    this.state.stats.lifetimeSold += amount;
    this.state.stats.soldByCategory[crop.category] = (this.state.stats.soldByCategory[crop.category] || 0) + amount;
    this.state.stats.lifetimeSoldByCategory[crop.category] = (this.state.stats.lifetimeSoldByCategory[crop.category] || 0) + amount;
    this.addCoins(coins);
  }

  sellCrop(cropId, amount = Infinity) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!crop || !cropState?.owned || cropState.stock <= 0) return { ok: false, message: "Não há produtos para vender." };
    const sold = Math.max(0, Math.min(cropState.stock, Math.floor(Number(amount) || 0)));
    if (sold <= 0) return { ok: false, message: "Escolha uma quantidade válida." };
    const gain = Math.floor(sold * this.getSalePrice(cropId));
    cropState.stock -= sold;
    this.recordSale(cropId, sold, gain);
    return { ok: true, sold, gain };
  }

  sellAll() {
    let totalSold = 0;
    let totalGain = 0;
    for (const crop of this.data.crops) {
      const stock = this.state.crops[crop.id].stock;
      if (stock <= 0) continue;
      const result = this.sellCrop(crop.id, stock);
      if (result.ok) {
        totalSold += result.sold;
        totalGain += result.gain;
      }
    }
    return totalSold > 0 ? { ok: true, sold: totalSold, gain: totalGain } : { ok: false, message: "O estoque ainda está vazio." };
  }

  setAutoSell(cropId, enabled) {
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    if (!crop || !cropState?.owned) return { ok: false, message: "Compre a cultura antes de configurar a venda automática." };
    cropState.autoSell = Boolean(enabled);
    return { ok: true, crop, enabled: cropState.autoSell };
  }

  toggleAutoSell(cropId) {
    const cropState = this.state.crops[cropId];
    return this.setAutoSell(cropId, !cropState?.autoSell);
  }

  setAllAutoSell(enabled) {
    const owned = this.data.crops.filter(crop => this.state.crops[crop.id]?.owned);
    if (!owned.length) return { ok: false, message: "Compre uma cultura antes de configurar as vendas automáticas." };
    const nextState = Boolean(enabled);
    owned.forEach(crop => {
      this.state.crops[crop.id].autoSell = nextState;
    });
    return { ok: true, enabled: nextState, count: owned.length };
  }

  addCoins(value) {
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    this.state.coins += amount;
    this.state.stats.runCoinsEarned += amount;
    this.state.stats.lifetimeCoins += amount;
    this.state.stats.maxCoinsHeld = Math.max(this.state.stats.maxCoinsHeld, this.state.coins);
  }

  getUpgradeCost(item, source) {
    const level = Number(source[item.id] || 0);
    return Math.ceil(item.baseCost * Math.pow(item.growth, level));
  }

  buyUpgrade(id) {
    if (!this.isEvolutionUnlocked()) return { ok: false, message: `As evoluções liberam no nível ${GameEngine.FEATURE_UNLOCK_LEVEL} da fazenda.` };
    const item = this.data.upgrades.find(entry => entry.id === id);
    if (!item) return { ok: false };
    const level = Number(this.state.upgrades[id] || 0);
    if (level >= item.max) return { ok: false, message: "Melhoria já está no nível máximo." };
    const cost = this.getUpgradeCost(item, this.state.upgrades);
    if (this.state.coins < cost) return { ok: false, message: `Faltam ${this.formatMoney(cost - this.state.coins)}.` };
    this.state.coins -= cost;
    this.state.upgrades[id] = level + 1;
    this.addFarmXPPercent(0.017);
    return { ok: true };
  }

  buyResearch(id) {
    if (!this.isEvolutionUnlocked()) return { ok: false, message: `As pesquisas liberam no nível ${GameEngine.FEATURE_UNLOCK_LEVEL} da fazenda.` };
    const item = this.data.research.find(entry => entry.id === id);
    if (!item) return { ok: false };
    const level = Number(this.state.researchTechs[id] || 0);
    if (level >= item.max) return { ok: false, message: "Tecnologia já está no nível máximo." };
    const cost = this.getUpgradeCost(item, this.state.researchTechs);
    if (this.state.research < cost) return { ok: false, message: `São necessários ${cost} pontos de pesquisa.` };
    this.state.research -= cost;
    this.state.researchTechs[id] = level + 1;
    this.addFarmXPPercent(0.017);
    return { ok: true };
  }

  buyPrestigeUpgrade(id) {
    const item = this.data.prestigeUpgrades.find(entry => entry.id === id);
    if (!item) return { ok: false };
    const level = Number(this.state.prestigeUpgrades[id] || 0);
    if (level >= item.max) return { ok: false, message: "Legado já está no nível máximo." };
    const cost = this.getUpgradeCost(item, this.state.prestigeUpgrades);
    if (this.state.prestigePoints < cost) return { ok: false, message: `São necessários ${cost} pontos de prestígio.` };
    this.state.prestigePoints -= cost;
    this.state.prestigeUpgrades[id] = level + 1;
    return { ok: true };
  }

  normalizeContract(contract, active = false) {
    if (!contract || !this.getCrop(contract.cropId)) return null;
    const company = this.data.companies.find(item => item.id === contract.companyId)
      || this.data.companies[Math.abs(Number(contract.companyIndex || 0)) % this.data.companies.length]
      || this.data.companies[0];
    const amount = Math.max(1, Math.floor(Number(contract.amount) || 1));
    const delivered = active ? Math.max(0, Math.min(amount, Math.floor(Number(contract.delivered) || 0))) : 0;
    const difficulty = ["calm", "standard", "urgent", "bulk"].includes(contract.difficulty) ? contract.difficulty : "standard";
    const durationSeconds = Math.max(22, Math.floor(Number(contract.durationSeconds) || this.getContractDifficulty(difficulty).duration * GameEngine.CONTRACT_DURATION_FACTOR));
    const legacyDeadline = Number(contract.deadlineAt || 0);
    const legacyRemaining = legacyDeadline > 0 ? Math.max(0, (legacyDeadline - Date.now()) / 1000) : durationSeconds;
    const completedAt = active && (Number(contract.completedAt || 0) > 0 || delivered >= amount)
      ? Number(contract.completedAt || Date.now())
      : 0;
    const timeRemaining = active
      ? Math.max(0, Number.isFinite(Number(contract.timeRemaining)) ? Number(contract.timeRemaining) : legacyRemaining)
      : durationSeconds;
    const rewardCoins = Math.max(1, Math.floor(Number(contract.rewardCoins) || amount * (this.getCrop(contract.cropId)?.basePrice || 1)));
    const defaultedAt = active && Number(contract.defaultedAt || 0) > 0 ? Number(contract.defaultedAt) : 0;
    return {
      id: String(contract.id || `contract-${Date.now()}-${this.state?.contractSerial || 1}`),
      companyId: company.id,
      cropId: contract.cropId,
      amount,
      delivered,
      rewardCoins,
      rewardResearch: Math.max(0, Math.floor(Number(contract.rewardResearch) || 0)),
      difficulty,
      durationSeconds,
      timeRemaining: defaultedAt ? 0 : timeRemaining,
      createdAt: Number(contract.createdAt || Date.now()),
      acceptedAt: active ? Number(contract.acceptedAt || Date.now()) : 0,
      completedAt,
      defaultedAt,
      penaltyCoins: defaultedAt
        ? Math.max(1, Math.ceil(Number(contract.penaltyCoins) || rewardCoins * 1.20))
        : 0
    };
  }

  getContractDifficulty(id) {
    const profiles = {
      calm: { id: "calm", label: "Entrega comercial", duration: 540, load: 0.26, reward: 2.50, researchMode: "commercial" },
      standard: { id: "standard", label: "Entrega comercial", duration: 360, load: 0.36, reward: 2.50, researchMode: "commercial" },
      urgent: { id: "urgent", label: "Entrega emergencial", duration: 150, load: 0.72, reward: 5.00, researchMode: "none" },
      bulk: { id: "bulk", label: "Grande fornecimento", duration: 720, load: 0.58, reward: 2.50, researchMode: "bulk" }
    };
    return profiles[id] || profiles.standard;
  }

  getContractEligibleCrops() {
    if (!this.isContractsUnlocked()) return [];
    return this.data.crops.filter(crop => crop.unlockLevel <= this.state.farmLevel);
  }

  getContractResearchReward(difficultyId, amount, state = this.state) {
    const difficulty = this.getContractDifficulty(difficultyId);
    if (difficulty.researchMode === "none") return 0;
    const academyLevel = Number(state?.prestigeUpgrades?.immortalAcademy || 0);
    const researchMultiplier = 1 + academyLevel * 0.25;
    if (difficulty.researchMode === "commercial") return Math.max(0, Math.floor(6 * researchMultiplier));
    const volume = Math.max(1, Number(amount) || 1);
    const proceduralBase = Math.max(10, Math.round(6 + Math.log10(volume + 1) * 3 + Math.sqrt(volume) / 18));
    return Math.max(0, Math.floor(proceduralBase * researchMultiplier));
  }


  chooseContractCrop(crops, offerIndex = 0, excluded = new Set()) {
    if (!crops.length) return null;
    const uniquePool = crops.filter(crop => !excluded.has(crop.id));
    const pool = uniquePool.length ? uniquePool : crops;
    if (pool.length === 1) return pool[0];
    const sorted = [...pool].sort((a, b) => a.index - b.index);
    const maxIndex = Math.max(1, sorted.at(-1).index);
    const weighted = sorted.map(crop => {
      const owned = this.state.crops[crop.id]?.owned ? 1 : 0;
      const recentUnlock = crop.unlockLevel >= Math.max(1, this.state.farmLevel - 4) ? 0.55 : 0;
      const varietyBoost = offerIndex === 0 && crop.index >= maxIndex * 0.65 ? 0.45 : 0;
      return { crop, weight: 1 + (crop.index / maxIndex) * 0.85 + recentUnlock + varietyBoost + owned * 0.18 };
    });
    let roll = Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) return item.crop;
    }
    return sorted[0];
  }

  roundContractAmount(value) {
    const amount = Math.max(5, Number(value) || 5);
    const step = amount < 50 ? 5 : amount < 250 ? 10 : amount < 1000 ? 25 : amount < 5000 ? 100 : amount < 25000 ? 500 : 1000;
    return Math.max(5, Math.round(amount / step) * step);
  }

  createContractOffers(count = 1) {
    const eligible = this.getContractEligibleCrops();
    if (!eligible.length) return [];
    const owned = this.getOwnedCrops();
    const result = [];
    const usedCompanies = new Set([
      ...(this.state.contractOffers || []).map(contract => contract.companyId),
      ...(this.state.activeContracts || []).map(contract => contract.companyId)
    ]);
    const usedCrops = new Set([
      ...(this.state.contractOffers || []).map(contract => contract.cropId),
      ...(this.state.activeContracts || []).map(contract => contract.cropId)
    ]);
    const difficultyCycle = ["urgent", "standard", "calm", "bulk", "standard", "urgent"];
    const difficultyOffset = this.state.contractSerial % difficultyCycle.length;
    const averageLevel = owned.length
      ? owned.reduce((sum, crop) => sum + Math.max(1, Number(this.state.crops[crop.id]?.level || 1)), 0) / owned.length
      : 1;
    const journeyScale = 1 + Math.min(3.2, this.state.farmLevel * 0.012) + Math.min(1.5, averageLevel / 250);
    const deadlineScale = 1 + Math.min(0.42, this.state.farmLevel / 120);

    for (let i = 0; i < count; i += 1) {
      const crop = this.chooseContractCrop(eligible, i, usedCrops);
      if (!crop) break;
      usedCrops.add(crop.id);
      const cropState = this.state.crops[crop.id];
      const cropLevel = Math.max(1, Number(cropState?.level || 1));
      const availableCompanies = this.data.companies.filter(company => !usedCompanies.has(company.id));
      const pool = availableCompanies.length ? availableCompanies : this.data.companies;
      const company = pool[Math.floor(Math.random() * pool.length)];
      usedCompanies.add(company.id);

      const difficultyId = difficultyCycle[(difficultyOffset + i) % difficultyCycle.length];
      const difficulty = this.getContractDifficulty(difficultyId);
      const durationMultiplier = deadlineScale
        + Number(this.state.upgrades.expressPacking || 0) * 0.05
        + Number(this.state.researchTechs.logisticsSimulation || 0) * 0.06
        + Number(this.state.prestigeUpgrades.sovereignNetwork || 0) * 0.10;
      const durationSeconds = Math.max(22, Math.round(difficulty.duration * durationMultiplier * GameEngine.CONTRACT_DURATION_FACTOR));
      const rate = Math.max(0.08, this.getProductionRate(crop.id));
      const variation = 0.88 + Math.random() * 0.24;
      const minimumByProgress = 8 + this.state.farmLevel * 2.4 + eligible.length * 1.35 + Math.floor(cropLevel / 10);
      const urgencyVolume = difficultyId === "urgent" ? 1.14 : 1;
      const roughAmount = Math.max(minimumByProgress, rate * durationSeconds * difficulty.load * journeyScale * variation) * urgencyVolume;
      const amount = this.roundContractAmount(roughAmount);
      const researchLevel = Number(this.state.researchTechs.negotiationModels || 0);
      const officeLevel = Number(this.state.upgrades.contractBureau || 0);
      const sovereignLevel = Number(this.state.prestigeUpgrades.sovereignNetwork || 0);
      const progressionReward = 1 + this.state.farmLevel * 0.012 + crop.index * 0.025 + averageLevel * 0.0015;
      const rewardMultiplier = difficulty.reward
        * (1 + researchLevel * 0.08 + officeLevel * 0.08 + sovereignLevel * 0.20)
        * progressionReward
        * GameEngine.CONTRACT_REWARD_FACTOR;
      const rewardCoins = Math.max(1, Math.floor(amount * this.getSalePrice(crop.id) * rewardMultiplier));
      const rewardResearch = this.getContractResearchReward(difficulty.id, amount);

      result.push({
        id: `contract-${Date.now()}-${this.state.contractSerial++}-${i}`,
        companyId: company.id,
        cropId: crop.id,
        amount,
        delivered: 0,
        rewardCoins,
        rewardResearch,
        difficulty: difficulty.id,
        durationSeconds,
        timeRemaining: durationSeconds,
        createdAt: Date.now(),
        acceptedAt: 0
      });
    }
    return result;
  }

  normalizeContractCooldown(value, now = Date.now()) {
    const rawAvailableAt = typeof value === "object" && value !== null ? value.availableAt : value;
    const availableAt = Math.floor(Number(rawAvailableAt) || 0);
    if (availableAt <= now) return null;
    const remainingSeconds = Math.max(1, Math.ceil((availableAt - now) / 1000));
    const rawDuration = typeof value === "object" && value !== null ? value.durationSeconds : remainingSeconds;
    const durationSeconds = Math.max(remainingSeconds, Math.min(GameEngine.CONTRACT_COOLDOWN_SECONDS, Math.max(1, Math.floor(Number(rawDuration) || remainingSeconds))));
    const startedAt = typeof value === "object" && value !== null
      ? Math.floor(Number(value.startedAt) || (availableAt - durationSeconds * 1000))
      : availableAt - durationSeconds * 1000;
    return { availableAt, startedAt, durationSeconds };
  }

  ensureContractOffers() {
    if (!Array.isArray(this.state.contractOffers)) this.state.contractOffers = [];
    if (!Array.isArray(this.state.contractCooldowns)) this.state.contractCooldowns = [];
    if (!Array.isArray(this.state.activeContracts)) this.state.activeContracts = [];
    this.state.contractOffers = this.state.contractOffers
      .map(contract => this.normalizeContract(contract, false))
      .filter(Boolean)
      .slice(0, GameEngine.CONTRACT_OFFER_COUNT);
    this.state.activeContracts = this.state.activeContracts
      .map(contract => this.normalizeContract(contract, true))
      .filter(Boolean)
      .slice(0, GameEngine.MAX_ACTIVE_CONTRACTS);

    const now = Date.now();
    const normalizedCooldowns = this.state.contractCooldowns.map(value => this.normalizeContractCooldown(value, now));
    const expiredCooldowns = normalizedCooldowns.filter(value => !value).length;
    this.state.contractCooldowns = normalizedCooldowns.filter(Boolean).slice(0, GameEngine.CONTRACT_OFFER_COUNT);

    if (!this.getContractEligibleCrops().length) {
      this.state.contractOffers = [];
      this.state.contractCooldowns = [];
      return;
    }

    if (expiredCooldowns > 0) {
      this.state.contractOffers.push(...this.createContractOffers(Math.min(expiredCooldowns, GameEngine.CONTRACT_OFFER_COUNT - this.state.contractOffers.length)));
    }
    const occupiedSlots = this.state.contractOffers.length + this.state.contractCooldowns.length;
    if (occupiedSlots < GameEngine.CONTRACT_OFFER_COUNT) {
      this.state.contractOffers.push(...this.createContractOffers(GameEngine.CONTRACT_OFFER_COUNT - occupiedSlots));
    }
    this.state.contractOffers = this.state.contractOffers.slice(0, Math.max(0, GameEngine.CONTRACT_OFFER_COUNT - this.state.contractCooldowns.length));
  }

  getCompany(companyId) {
    return this.data.companies.find(item => item.id === companyId) || this.data.companies[0];
  }

  getContractProgress(contract) {
    const amount = Math.max(1, Number(contract?.amount) || 1);
    const delivered = Math.max(0, Math.min(amount, Number(contract?.delivered) || 0));
    const completed = Boolean(contract?.completedAt) || delivered >= amount;
    const defaulted = Boolean(contract?.defaultedAt);
    const remaining = completed ? 0 : Math.max(0, amount - delivered);
    const stock = Math.max(0, Math.floor(Number(this.state.crops[contract?.cropId]?.stock) || 0));
    let stockPool = stock;
    let availableNow = 0;
    if (!completed) {
      const queue = this.state.activeContracts
        .filter(item => item.cropId === contract?.cropId && item.delivered < item.amount && !item.completedAt)
        .sort((a, b) => {
          if (Boolean(a.defaultedAt) !== Boolean(b.defaultedAt)) return a.defaultedAt ? -1 : 1;
          return (a.timeRemaining - b.timeRemaining) || (a.acceptedAt - b.acceptedAt);
        });
      for (const queued of queue) {
        const queuedRemaining = Math.max(0, queued.amount - queued.delivered);
        const allocation = Math.min(stockPool, queuedRemaining);
        if (queued.id === contract?.id) {
          availableNow = allocation;
          break;
        }
        stockPool -= allocation;
      }
    }
    const fulfillable = completed ? amount : Math.min(amount, delivered + availableNow);
    return {
      delivered,
      remaining,
      stock,
      availableNow,
      fulfillable,
      completed,
      defaulted,
      penaltyCoins: defaulted ? Math.max(1, Math.ceil(Number(contract.penaltyCoins) || contract.rewardCoins * 1.20)) : 0,
      readyToClaim: completed && !defaulted,
      readyToPayPenalty: completed && defaulted,
      percent: completed ? 100 : Math.max(0, Math.min(100, (delivered / amount) * 100)),
      availablePercent: completed ? 100 : Math.max(0, Math.min(100, (fulfillable / amount) * 100)),
      readyToComplete: !completed && remaining > 0 && availableNow >= remaining
    };
  }

  acceptContract(id) {
    this.ensureContractOffers();
    if (!this.isContractsUnlocked()) return { ok: false, message: "Os contratos não estão disponíveis agora." };
    const slotLimit = this.getActiveContractSlotLimit();
    if (this.state.activeContracts.length >= slotLimit) return { ok: false, message: `Você já utiliza todos os ${slotLimit} slots de contratos ativos.` };
    const index = this.state.contractOffers.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Esta proposta não está mais disponível." };
    const [offer] = this.state.contractOffers.splice(index, 1);
    const contract = { ...offer, delivered: 0, acceptedAt: Date.now(), timeRemaining: offer.durationSeconds, completedAt: 0 };
    this.state.activeContracts.push(contract);
    const stockDelivery = this.deliverStockToContract(contract.id, true);
    this.ensureContractOffers();
    return { ok: true, contract, autoDelivered: stockDelivery.delivered || 0, completed: Boolean(contract.completedAt) };
  }

  startContractCooldown(durationSeconds = GameEngine.CONTRACT_COOLDOWN_SECONDS) {
    const seconds = Math.max(1, Math.floor(Number(durationSeconds) || GameEngine.CONTRACT_COOLDOWN_SECONDS));
    const startedAt = Date.now();
    const cooldown = {
      startedAt,
      availableAt: startedAt + seconds * 1000,
      durationSeconds: seconds
    };
    this.state.contractCooldowns.push(cooldown);
    return cooldown;
  }

  declineContract(id) {
    this.ensureContractOffers();
    if (!this.isContractsUnlocked()) return { ok: false, message: "Os contratos não estão disponíveis agora." };
    const index = this.state.contractOffers.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Esta proposta não está mais disponível." };
    const [contract] = this.state.contractOffers.splice(index, 1);
    const cooldown = this.startContractCooldown();
    this.ensureContractOffers();
    return { ok: true, contract, cooldownSeconds: cooldown.durationSeconds };
  }

  breakContract(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (contract.completedAt && !contract.defaultedAt) return { ok: false, message: "Receba a recompensa deste contrato concluído." };
    const penaltyCoins = Math.max(1, Math.ceil(Number(contract.penaltyCoins) || contract.rewardCoins * 1.20));
    // A quebra é a única ação do jogo autorizada a deixar o saldo negativo.
    this.state.coins -= penaltyCoins;
    this.state.activeContracts.splice(index, 1);
    this.state.stats.contractsBroken += 1;
    this.state.stats.lifetimeContractsBroken += 1;
    const cooldown = this.startContractCooldown();
    this.ensureContractOffers();
    return { ok: true, contract, penaltyCoins, cooldownSeconds: cooldown.durationSeconds };
  }

  deliverStockToContract(id, silent = false) {
    const contract = this.state.activeContracts.find(item => item.id === id);
    if (!contract || contract.completedAt) return { ok: false, delivered: 0, contract };
    if (contract.timeRemaining <= 0 && !contract.defaultedAt) this.expireContracts(silent);
    const cropState = this.state.crops[contract.cropId];
    const needed = Math.max(0, contract.amount - contract.delivered);
    const delivered = Math.min(Math.max(0, cropState.stock), needed);
    if (delivered > 0) {
      cropState.stock -= delivered;
      contract.delivered += delivered;
      this.state.stats.contractUnitsDelivered += delivered;
      this.state.stats.lifetimeContractUnitsDelivered += delivered;
    }
    if (contract.delivered >= contract.amount) this.markContractComplete(contract.id, silent, false);
    return { ok: delivered > 0, delivered, completed: Boolean(contract.completedAt), contract };
  }

  markContractComplete(id, silent = false, automatic = false) {
    const contract = this.state.activeContracts.find(item => item.id === id);
    if (!contract || contract.delivered < contract.amount) return null;
    if (contract.completedAt) return contract;
    contract.delivered = contract.amount;
    contract.completedAt = Date.now();
    contract.timeRemaining = Math.max(0, Number(contract.timeRemaining) || 0);

    if (!contract.defaultedAt) {
      this.state.stats.contractsCompleted += 1;
      this.state.stats.lifetimeContractsCompleted += 1;
      this.addFarmXPPercent(0.08, 1, silent);
    }
    return contract;
  }

  claimContractReward(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (contract.defaultedAt) return { ok: false, message: "Este contrato perdeu a recompensa. Conclua a entrega e pague a multa." };
    if (!contract.completedAt || contract.delivered < contract.amount) return { ok: false, message: "Este contrato ainda não foi concluído." };
    this.state.activeContracts.splice(index, 1);
    this.addCoins(contract.rewardCoins);
    this.state.research += contract.rewardResearch;
    this.ensureContractOffers();
    return { ok: true, contract };
  }

  payContractPenalty(id) {
    const index = this.state.activeContracts.findIndex(contract => contract.id === id);
    if (index < 0) return { ok: false, message: "Contrato não encontrado." };
    const contract = this.state.activeContracts[index];
    if (!contract.defaultedAt) return { ok: false, message: "Este contrato não possui multa." };
    if (!contract.completedAt || contract.delivered < contract.amount) {
      return { ok: false, message: "Conclua 100% da entrega antes de pagar a multa." };
    }
    const penaltyCoins = Math.max(1, Math.ceil(Number(contract.penaltyCoins) || contract.rewardCoins * 1.20));
    if (this.state.coins < penaltyCoins) return { ok: false, message: `Faltam ${this.formatMoney(penaltyCoins - this.state.coins)} para pagar a multa.` };
    this.state.coins -= penaltyCoins;
    this.state.activeContracts.splice(index, 1);
    this.addFarmXPPercent(0.017);
    this.ensureContractOffers();
    return { ok: true, contract, penaltyCoins, xpRate: 0.017 };
  }

  getReadyContractCount() {
    return this.state.activeContracts.filter(contract => Boolean(contract.completedAt)).length;
  }

  getOrder(cropId) {
    if (!this.isOrdersUnlocked()) return null;
    const crop = this.getCrop(cropId);
    const cropState = this.state.crops[cropId];
    const orderState = this.state.orders[cropId];
    if (!crop || !cropState?.owned || !orderState) return null;
    const step = this.data.orderSteps[orderState.tier];
    if (!step) return { crop, complete: true, tier: orderState.tier, totalTiers: this.data.orderSteps.length };
    const counterBonus = Number(this.state.upgrades.orderCenter || 0) * 0.08;
    const analyticsBonus = Number(this.state.researchTechs.orderOptimization || 0) * 0.08;
    const sovereignBonus = Number(this.state.prestigeUpgrades.sovereignNetwork || 0) * 0.20;
    const rewardCoins = Math.max(1, Math.floor(step.amount * crop.basePrice * step.rewardMultiplier * (1 + counterBonus + analyticsBonus + sovereignBonus)));
    const available = Math.max(0, Math.floor(Number(cropState.stock) || 0));
    return {
      crop,
      complete: false,
      readyToClaim: false,
      readyToDeliver: available >= step.amount,
      tier: orderState.tier,
      totalTiers: this.data.orderSteps.length,
      amount: step.amount,
      delivered: 0,
      available,
      remaining: Math.max(0, step.amount - available),
      rewardCoins,
      rewardResearch: Math.floor(step.research * (1 + Number(this.state.prestigeUpgrades.immortalAcademy || 0) * 0.25))
    };
  }

  completeOrderStage(cropId, order, silent = false) {
    this.state.orders[cropId].tier += 1;
    this.state.orders[cropId].delivered = 0;
    this.state.orders[cropId].autoDeliver = false;
    if (this.state.orders[cropId].tier >= this.data.orderSteps.length) this.state.stats.completedOrderSeries += 1;
    this.state.stats.ordersCompleted += 1;
    this.state.stats.lifetimeOrdersCompleted += 1;
    this.addCoins(order.rewardCoins);
    this.state.research += order.rewardResearch;
    this.addFarmXPPercent(0.017, 1, silent);
    return { coins: order.rewardCoins, research: order.rewardResearch };
  }

  deliverOrder(cropId) {
    const order = this.getOrder(cropId);
    if (!order) return { ok: false, message: "Compre esta cultura para liberar seus pedidos." };
    if (order.complete) return { ok: false, message: "Todos os pedidos desta cultura já foram concluídos." };
    const cropState = this.state.crops[cropId];
    if (cropState.stock < order.amount) return { ok: false, message: `É necessário ter ${this.formatNumber(order.amount)} unidades de ${order.crop.name.toLowerCase()} no estoque.` };

    cropState.stock -= order.amount;
    this.state.stats.orderUnitsDelivered += order.amount;
    this.state.stats.lifetimeOrderUnitsDelivered += order.amount;
    const rewards = this.completeOrderStage(cropId, order, false);
    const nextOrder = this.getOrder(cropId);
    return { ok: true, delivered: order.amount, order, rewards, seriesComplete: Boolean(nextOrder?.complete), nextOrder };
  }

  getReadyOrderCount() {
    return this.getOwnedCrops().filter(crop => {
      const order = this.getOrder(crop.id);
      return order && !order.complete && order.readyToDeliver;
    }).length;
  }

  missionValue(metric, mission = null) {
    const map = {
      harvested: this.state.stats.lifetimeHarvested,
      owned: this.state.stats.lifetimeCropPurchases,
      cropPurchases: this.state.stats.lifetimeCropPurchases,
      sold: this.state.stats.lifetimeSold,
      cropLevels: this.state.stats.lifetimeCropUpgrades,
      cropUpgrades: this.state.stats.lifetimeCropUpgrades,
      orders: this.state.stats.lifetimeOrdersCompleted,
      contracts: this.state.stats.lifetimeContractsCompleted,
      maxCropLevel: this.state.stats.maxCropLevel,
      farmLevel: this.state.stats.maxFarmLevel,
      stock: this.state.stats.maxStorageUsed,
      coinsEarned: this.state.stats.lifetimeCoins,
      prestiges: this.state.stats.prestiges,
      categorySold: mission?.category ? Number(this.state.stats.lifetimeSoldByCategory[mission.category] || 0) : 0
    };
    return Number(map[metric] || 0);
  }

  getActiveMissions() {
    const seen = new Set();
    const active = [];
    for (const mission of this.data.missions) {
      const series = mission.series || mission.id;
      if (seen.has(series)) continue;
      const next = this.data.missions.find(item => (item.series || item.id) === series && !this.state.missionsClaimed[item.id]);
      if (next) active.push(next);
      seen.add(series);
    }
    return active;
  }

  getReadyMissionCount() {
    return this.getActiveMissions().filter(mission => this.missionValue(mission.metric, mission) >= mission.target).length;
  }

  claimMission(id) {
    const mission = this.data.missions.find(item => item.id === id);
    if (!mission || this.state.missionsClaimed[id]) return { ok: false, message: "Missão indisponível." };
    if (this.missionValue(mission.metric, mission) < mission.target) return { ok: false, message: "Objetivo ainda não foi concluído." };
    const reward = mission.reward || {};
    if (reward.coins) this.addCoins(reward.coins);
    if (reward.research) this.state.research += reward.research;
    if (reward.prestige) this.state.prestigePoints += reward.prestige;
    if (reward.permanent === "prestigeDouble") this.state.permanentBonuses.prestigeDouble = true;
    this.state.missionsClaimed[id] = true;
    return { ok: true, mission };
  }

  getPrestigeEstimate() {
    if (!this.isPrestigeUnlocked()) return 0;
    const owned = Object.values(this.state.crops).filter(item => item.owned).length;
    // Revisão 14: o prestígio acompanha melhor uma jornada consistente sem
    // ultrapassar a importância das missões e dos legados permanentes.
    const score = Math.sqrt(Math.max(0, this.state.stats.runCoinsEarned) / 36000)
      + owned / 8
      + this.state.farmLevel / 8
      + this.state.stats.contractsCompleted / 6
      - 2.8;
    const resonance = 1 + Number(this.state.prestigeUpgrades.prestigeResonance || 0) * 0.20;
    const missionMultiplier = this.state.permanentBonuses.prestigeDouble ? 2 : 1;
    return Math.max(0, Math.floor(score * resonance * missionMultiplier));
  }

  performPrestige() {
    if (!this.isPrestigeUnlocked()) return { ok: false, message: `O prestígio fica disponível no nível ${GameEngine.PRESTIGE_UNLOCK_LEVEL} da fazenda.` };
    const gain = this.getPrestigeEstimate();
    if (gain < 1) return { ok: false, message: "Fortaleça mais a fazenda antes de prestigiar." };
    const permanent = {
      prestigePoints: this.state.prestigePoints + gain,
      prestigeUpgrades: { ...this.state.prestigeUpgrades },
      permanentBonuses: { ...this.state.permanentBonuses },
      missionsClaimed: { ...this.state.missionsClaimed },
      prestiges: this.state.stats.prestiges + 1,
      lifetimeCoins: this.state.stats.lifetimeCoins,
      lifetimeHarvested: this.state.stats.lifetimeHarvested,
      lifetimeSold: this.state.stats.lifetimeSold,
      lifetimeSoldByCategory: { ...this.state.stats.lifetimeSoldByCategory },
      lifetimeOrdersCompleted: this.state.stats.lifetimeOrdersCompleted,
      lifetimeOrderUnitsDelivered: this.state.stats.lifetimeOrderUnitsDelivered,
      lifetimeCropPurchases: this.state.stats.lifetimeCropPurchases,
      lifetimeCropUpgrades: this.state.stats.lifetimeCropUpgrades,
      completedOrderSeries: this.state.stats.completedOrderSeries,
      lifetimeContractsCompleted: this.state.stats.lifetimeContractsCompleted,
      lifetimeContractsFailed: this.state.stats.lifetimeContractsFailed,
      lifetimeContractsBroken: this.state.stats.lifetimeContractsBroken,
      lifetimeContractUnitsDelivered: this.state.stats.lifetimeContractUnitsDelivered,
      totalPrestigeEarned: this.state.stats.totalPrestigeEarned + gain,
      maxFarmLevel: this.state.stats.maxFarmLevel,
      maxCropLevel: this.state.stats.maxCropLevel,
      maxCropsOwned: this.state.stats.maxCropsOwned,
      maxCoinsHeld: this.state.stats.maxCoinsHeld,
      maxStorageUsed: this.state.stats.maxStorageUsed,
      cropsDiscovered: { ...this.state.cropsDiscovered },
      accountCreatedAt: this.state.createdAt,
      settings: { ...this.state.settings }
    };
    this.state = this.createState(permanent);
    this.state.contractOffers = [];
    this.state.contractCooldowns = [];
    this.state.activeContracts = [];
    this.save();
    return { ok: true, gain };
  }

  setSetting(key, value) {
    if (!(key in this.state.settings)) return;
    this.state.settings[key] = value;
  }

  getMetrics() {
    const cropStates = Object.values(this.state.crops);
    return {
      owned: cropStates.filter(item => item.owned).length,
      stock: cropStates.reduce((sum, item) => sum + item.stock, 0),
      sold: this.state.stats.totalSold,
      harvested: this.state.stats.totalHarvested,
      contracts: this.state.stats.contractsCompleted,
      activeContracts: this.state.activeContracts.length,
      activeContractSlots: this.getActiveContractSlotLimit(),
      contractOffers: this.state.contractOffers.length,
      orders: this.state.stats.ordersCompleted,
      maxCropLevel: Math.max(0, ...cropStates.map(item => item.level || 0)),
      storageCapacity: this.getStorageCap(),
      storageRemaining: this.getStorageRemaining()
    };
  }

  formatNumber(value, digits = 1) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);
    const precision = Math.max(0, Math.min(3, Math.floor(Number(digits) || 0)));
    const international = this.state.settings.numberFormat === "international";
    const decimalSeparator = international ? "." : ",";
    const locale = international ? "en-US" : "pt-BR";

    if (abs < 1000) return Math.floor(number).toLocaleString(locale);

    let group = Math.max(1, Math.floor(Math.log10(abs) / 3));
    let scaled = number / Math.pow(1000, group);
    const roundingFactor = Math.pow(10, precision);
    let rounded = Math.round(scaled * roundingFactor) / roundingFactor;

    // Evita resultados como 1000K quando o arredondamento já alcançou a
    // próxima ordem de grandeza.
    if (Math.abs(rounded) >= 1000) {
      group += 1;
      scaled = number / Math.pow(1000, group);
      rounded = Math.round(scaled * roundingFactor) / roundingFactor;
    }

    const fixed = Math.abs(rounded)
      .toFixed(precision)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1");
    const formatted = `${rounded < 0 ? "-" : ""}${fixed.replace(".", decimalSeparator)}`;

    const standardSuffixes = ["", "K", "M", "B", "T"];
    if (group < standardSuffixes.length) return `${formatted}${standardSuffixes[group]}`;

    // Após T: Aa, Ab, ... Az, Ba, Bb... para manter a função preparada para
    // economias maiores sem voltar a nomes longos ou inserir espaços.
    const extendedIndex = group - standardSuffixes.length;
    const trailing = String.fromCharCode(97 + (extendedIndex % 26));
    let leadingIndex = Math.floor(extendedIndex / 26);
    let leading = "";
    do {
      leading = String.fromCharCode(65 + (leadingIndex % 26)) + leading;
      leadingIndex = Math.floor(leadingIndex / 26) - 1;
    } while (leadingIndex >= 0);

    return `${formatted}${leading}${trailing}`;
  }

  formatMoney(value) {
    return `${this.formatNumber(Math.floor(value))} moedas`;
  }

  formatTime(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }
}

window.GameEngine = GameEngine;
