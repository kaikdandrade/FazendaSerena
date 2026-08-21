"use strict";

class GameEngine {
  static APP_VERSION = window.FazendaSerenaConfig.appVersion;
  static EXPERIENCE_DEFAULTS = window.FazendaSerenaConfig.experienceDefaults;
  static AUDIO_DEFAULTS = window.FazendaSerenaConfig.audioDefaults;
  static BASE_MAX_OFFLINE_SECONDS = 15 * 60;
  static MAX_OFFLINE_SECONDS = 15 * 60; // compatibilidade; o limite efetivo usa getMaxOfflineSeconds().
  static FEATURE_UNLOCK_LEVEL = 5; // compatibilidade com saves/integrações antigas
  static ORDER_UNLOCK_LEVEL = 5;
  static EVOLUTION_UNLOCK_LEVEL = 5;
  static PRESTIGE_UNLOCK_LEVEL = 40;
  static SECOND_CONTRACT_SLOT_LEVEL = 20;
  static MAX_ACTIVE_CONTRACTS = 7;
  static CONTRACT_OFFER_COUNT = 6;
  static CONTRACT_SIGNED_COOLDOWN_SECONDS = 30;
  static CONTRACT_EXPIRED_COOLDOWN_SECONDS = 30;
  static CONTRACT_DECLINED_COOLDOWN_SECONDS = 60;
  static CONTRACT_BROKEN_COOLDOWN_SECONDS = 4 * 60;
  static CONTRACT_DURATION_FACTOR = 1;
  static CONTRACT_REWARD_FACTOR = 1;
  static BASE_STARTING_COINS = 120;
  static TREASURY_COINS_PER_LEVEL = 5000;
  static BASE_STORAGE_CAPACITY = 200;
  static BASE_PASSIVE_XP_RATE = 0.0005;
  static CONTRACT_CLAIM_XP_RATE = 0.05;
  static ORDER_CLAIM_XP_RATE = 0.05;
  static ACTION_XP_RATE = 0.017;
  static BASE_PASSIVE_RESEARCH_RATE = 0;
  static PASSIVE_RESEARCH_STAGE_RATES = Object.freeze([0.0001, 0.0002, 0.0002]);
  static WHOLESALE_SALE_MULTIPLIER = 0.50;
  static MAX_BATCH_UPGRADES = 1000;
  static MAX_CROP_LEVEL = 500;
  static MAX_FARM_LEVEL = 1000;
  static INSTANT_GROWTH_LEVEL = 500;
  static MIN_INSTANT_GROWTH_LEVEL = 420;
  static MUSIC_TRACKS = Object.freeze([
      "betweenLightAndShadows", "pixelSprouts", "moonlitFields", "fieldRain",
      "electricHarvest", "dirtRoad", "enchantedGreenhouse", "solarFarm",
      "barnHay", "harvestFestival", "tropicalOrchard"
    ]);
  static getLegacySaveFormat(value) {
      if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
      if (typeof value === "string") {
        const normalized = value.trim();
        if (/^\d+$/.test(normalized)) return Math.max(0, Math.floor(Number(normalized)));
        if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) return Number.POSITIVE_INFINITY;
      }
      return 0;
    }
  constructor(onEvent = () => {}, initialState = null) {
      this.data = window.GameData;
      this.cropById = new Map(this.data.crops.map(crop => [crop.id, crop]));
      this.onEvent = onEvent;
      this.lastOfflineReport = null;
      this.state = this.load(initialState);
    }
  createState(permanent = {}) {
      const prestigeUpgrades = { ...(permanent.prestigeUpgrades || {}) };
      const prestigePoints = Number(permanent.prestigePoints || 0);
      const prestiges = Number(permanent.prestiges || 0);
      const experienceDefaults = GameEngine.EXPERIENCE_DEFAULTS;
      const audioDefaults = GameEngine.AUDIO_DEFAULTS;
      const requestedNumberFormat = permanent.settings?.numberFormat;
      const requestedMusicTrack = permanent.settings?.musicTrack;
      const settings = {
        ambient: permanent.settings?.ambient ?? experienceDefaults.ambient,
        fontScale: permanent.settings?.fontScale ?? permanent.settings?.uiScale ?? experienceDefaults.fontScale,
        masterVolume: permanent.settings?.masterVolume ?? audioDefaults.masterVolume,
        effectVolume: permanent.settings?.effectVolume ?? permanent.settings?.soundVolume ?? audioDefaults.effectVolume,
        musicVolume: permanent.settings?.musicVolume ?? audioDefaults.musicVolume,
        musicTrack: GameEngine.MUSIC_TRACKS.includes(requestedMusicTrack) ? requestedMusicTrack : audioDefaults.musicTrack,
        numberFormat: ["brazilian", "international"].includes(requestedNumberFormat) ? requestedNumberFormat : experienceDefaults.numberFormat,
        navigationMode: ["automatic", "line", "grid"].includes(permanent.settings?.navigationMode) ? permanent.settings.navigationMode : "automatic",
        playerNickname: String(permanent.settings?.playerNickname || "").replace(/[<>]/g, "").trim().slice(0, 24),
        playerAvatar: String(permanent.settings?.playerAvatar || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48),
        playerRankingOptOut: Boolean(permanent.settings?.playerRankingOptOut)
      };
  
      const permanentEffectState = { researchTechs: {}, prestigeUpgrades };
      const startingCoinsBonus = Math.max(0, Math.floor(this.getEvolutionBonus("startingCoins", permanentEffectState)));
      const startingResearchBonus = Math.max(0, Math.floor(this.getEvolutionBonus("startingResearch", permanentEffectState)));
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
        version: GameEngine.APP_VERSION,
        coins: GameEngine.BASE_STARTING_COINS + startingCoinsBonus,
        research: startingResearchBonus,
        prestigePoints,
        passiveResearchProgress: Math.max(0, Number(permanent.passiveResearchProgress || 0)) % 1,
        farmLevel: 1,
        farmXP: 0,
        crops,
        orders,
        upgrades: {},
        storageExpansions: 0,
        researchTechs: Object.fromEntries(this.data.research.map(item => [item.id, 0])),
        prestigeUpgrades,
        permanentBonuses: {
          prestigeDouble: Boolean(permanent.permanentBonuses?.prestigeDouble),
          passiveXPPercentPerSecond: Math.max(0, Number(permanent.permanentBonuses?.passiveXPPercentPerSecond) || 0),
          contractRewardPercent: Math.max(0, Number(permanent.permanentBonuses?.contractRewardPercent) || 0),
          orderRewardPercent: Math.max(0, Number(permanent.permanentBonuses?.orderRewardPercent) || 0)
        },
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
          lifetimeCropPrestiges: Number(permanent.lifetimeCropPrestiges || 0),
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
        const elapsed = Math.max(0, (now - Number(state.lastUpdate || now)) / 1000);
        if (elapsed > 0.05) this.simulate(elapsed, true, elapsed);
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
        const elapsed = Math.max(0, (now - Number(this.state.lastUpdate || now)) / 1000);
        if (elapsed > 0.05) this.simulate(elapsed, true, elapsed);
      }
  
      this.state.lastUpdate = now;
      return this.state;
    }
  normalizeState(input) {
      const permanent = {
        prestigePoints: input?.prestigePoints,
        passiveResearchProgress: input?.passiveResearchProgress,
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
        lifetimeCropPrestiges: input?.stats?.lifetimeCropPrestiges,
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
      const legacySaveFormat = GameEngine.getLegacySaveFormat(input.version);
  
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
  
      const experienceDefaults = GameEngine.EXPERIENCE_DEFAULTS;
      const audioDefaults = GameEngine.AUDIO_DEFAULTS;
      const legacyEffectsEnabled = merged.settings.soundEnabled !== false;
      const legacyMusicEnabled = merged.settings.musicEnabled !== false;
      merged.settings.ambient = typeof merged.settings.ambient === "boolean" ? merged.settings.ambient : experienceDefaults.ambient;
      merged.settings.fontScale = Math.max(85, Math.min(130, Number(merged.settings.fontScale ?? merged.settings.uiScale ?? experienceDefaults.fontScale) || experienceDefaults.fontScale));
      delete merged.settings.uiScale;
      merged.settings.masterVolume = Math.max(0, Math.min(100, Number(merged.settings.masterVolume ?? audioDefaults.masterVolume) || 0));
      merged.settings.effectVolume = Math.max(0, Math.min(100, legacyEffectsEnabled ? Number(merged.settings.effectVolume ?? merged.settings.soundVolume ?? audioDefaults.effectVolume) || 0 : 0));
      merged.settings.musicVolume = Math.max(0, Math.min(100, legacyMusicEnabled ? Number(merged.settings.musicVolume ?? audioDefaults.musicVolume) || 0 : 0));
      merged.settings.musicTrack = GameEngine.MUSIC_TRACKS.includes(merged.settings.musicTrack) ? merged.settings.musicTrack : audioDefaults.musicTrack;
      merged.settings.numberFormat = ["brazilian", "international"].includes(merged.settings.numberFormat) ? merged.settings.numberFormat : experienceDefaults.numberFormat;
      merged.settings.navigationMode = ["automatic", "line", "grid"].includes(merged.settings.navigationMode) ? merged.settings.navigationMode : "automatic";
      merged.settings.playerNickname = String(merged.settings.playerNickname || "").replace(/[<>]/g, "").trim().slice(0, 24);
      merged.settings.playerAvatar = String(merged.settings.playerAvatar || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48);
      merged.settings.playerRankingOptOut = Boolean(merged.settings.playerRankingOptOut);
      if (legacySaveFormat < 42) {
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
  
      if (legacySaveFormat < 14) {
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
      if (legacySaveFormat < 15) {
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
      if (legacySaveFormat < 16) {
        // Propostas antigas são recriadas pelo sistema de equilíbrio atual.
        merged.contractOffers = [];
        merged.contractCooldowns = [];
      }
      if (legacySaveFormat < 18) {
        // Propostas antigas são recriadas com o bônus atual de cada modalidade.
        // Contratos já assinados são preservados e nunca têm a recompensa reduzida.
        merged.contractOffers = [];
        merged.contractCooldowns = [];
        // Compensa saves anteriores pela mudança do capital inicial do Tesouro.
        const treasuryLevel = Math.max(0, Math.floor(Number(merged.prestigeUpgrades.royalTreasury) || 0));
        merged.coins = Number(merged.coins || 0) + 1900 + treasuryLevel * 500;
      }
  
  
      // A versão 1.0.1 aposentou os aprimoramentos comprados com moedas. Saves
      // anteriores preservam o progresso convertendo cada melhoria na pesquisa
      // equivalente, respeitando o nível máximo de cada tecnologia.
      const retiredUpgradeResearchMap = {
        irrigationNetwork: "acceleratedGermination",
        harvestCrew: "hybridGenetics",
        regionalMarket: "priceForecast",
        reinforcedBarn: "coldChain",
        seedCooperative: "smartSeedCatalog",
        precisionTools: "cultivationAlgorithms",
        fieldAcademy: "agriculturalPedagogy",
        contractBureau: "negotiationModels",
        orderCenter: "orderOptimization",
        expressPacking: "logisticsSimulation"
      };
      Object.entries(retiredUpgradeResearchMap).forEach(([upgradeId, researchId]) => {
        const oldLevel = Math.max(0, Math.floor(Number(input.upgrades?.[upgradeId]) || 0));
        const researchItem = this.data.research.find(item => item.id === researchId);
        if (!researchItem || oldLevel < 1) return;
        merged.researchTechs[researchId] = Math.max(
          Number(merged.researchTechs[researchId] || 0),
          Math.min(researchItem.max, oldLevel)
        );
      });
      merged.upgrades = {};
  
      this.data.research.forEach(item => {
        merged.researchTechs[item.id] = Math.max(0, Math.min(item.max, Math.floor(Number(merged.researchTechs[item.id]) || 0)));
      });
      this.data.prestigeUpgrades.forEach(item => {
        merged.prestigeUpgrades[item.id] = Math.max(0, Math.min(item.max, Math.floor(Number(merged.prestigeUpgrades[item.id]) || 0)));
      });
  
      // A antiga escala visual de 85% passou a equivaler ao novo 100%.
      // Preserva a aparência de quem havia escolhido explicitamente 85% antes da migração.
      if (legacySaveFormat < 12 && Number(input.settings?.uiScale) === 85 && input.settings?.fontScale == null) {
        merged.settings.fontScale = GameEngine.EXPERIENCE_DEFAULTS.fontScale;
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
          delivered: legacySaveFormat < 19 ? 0 : previousDelivered,
          autoDeliver: false
        };
        const step = this.data.orderSteps[merged.orders[crop.id].tier];
        if (legacySaveFormat < 19 && previousDelivered > 0 && step) merged.crops[crop.id].stock += Math.min(step.amount, previousDelivered);
        merged.orders[crop.id].delivered = 0;
      });
  
      const legacyOwned = this.data.crops.filter(crop => merged.crops[crop.id].owned);
      const untouchedLegacyStarter = legacySaveFormat < 9
        && legacyOwned.length === 1
        && legacyOwned[0].id === "onion"
        && merged.crops.onion.level <= 1
        && Number(input.stats?.totalHarvested || 0) === 0
        && Number(input.stats?.totalSold || 0) === 0
        && Number(input.stats?.ordersCompleted || 0) === 0
        && Number(input.stats?.contractsCompleted || 0) === 0;
      if (untouchedLegacyStarter) {
        Object.assign(merged.crops.onion, { owned: false, level: 0, progress: 0, stock: 0, totalHarvested: 0, totalSold: 0 });
        merged.orders.onion = { tier: 0, delivered: 0, autoDeliver: false };
        merged.coins = GameEngine.BASE_STARTING_COINS + Math.max(0, Number(merged.prestigeUpgrades.royalTreasury || 0)) * GameEngine.TREASURY_COINS_PER_LEVEL;
      } else if (legacySaveFormat < 9 && legacyOwned.length === 0 && Number(input.stats?.totalHarvested || 0) === 0) {
        merged.coins = Math.min(merged.coins, GameEngine.BASE_STARTING_COINS + Math.max(0, Number(merged.prestigeUpgrades.royalTreasury || 0)) * GameEngine.TREASURY_COINS_PER_LEVEL);
      }
  
      const legacyStarterOnly = legacySaveFormat < 5
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
      const rawOffers = legacySaveFormat < 19 ? [] : (Array.isArray(input.contractOffers) ? input.contractOffers : legacyContracts);
      const rawActive = Array.isArray(input.activeContracts) ? input.activeContracts : [];
      merged.contractOffers = rawOffers.map(contract => this.normalizeContract(contract, false)).filter(Boolean).slice(0, GameEngine.CONTRACT_OFFER_COUNT);
      merged.contractCooldowns = (legacySaveFormat < 19 ? [] : (Array.isArray(input.contractCooldowns) ? input.contractCooldowns : []))
        .map(value => this.normalizeContractCooldown(value))
        .filter(Boolean)
        .slice(0, GameEngine.CONTRACT_OFFER_COUNT);
      merged.activeContracts = rawActive.map(contract => this.normalizeContract(contract, true)).filter(Boolean).slice(0, GameEngine.MAX_ACTIVE_CONTRACTS);
      if (legacySaveFormat < 19) {
        merged.activeContracts.forEach(contract => {
          const crop = this.getCrop(contract.cropId);
          const difficulty = this.getContractDifficulty(contract.difficulty);
          if (!crop) return;
          const salePrice = this.getSalePriceForState(crop.id, merged);
          const rewardBonus = 1 + Math.max(0, this.getEvolutionBonus("contractCoinRewardPercent", merged)) / 100;
          const rewardKeys = this.getContractRewardKeys(difficulty);
          contract.rewardCoins = rewardKeys.has("coins") ? Math.max(0, Math.floor(contract.amount * salePrice * (Math.max(0, Number(difficulty?.coinMultiplierPercent) || 0) / 100) * rewardBonus)) : 0;
          contract.rewardResearch = this.getContractResearchReward(difficulty, contract.amount);
          contract.rewardPrestige = rewardKeys.has("prestige") ? Math.max(0, Math.floor(Math.max(1, Math.log10(contract.amount * salePrice + 10)) * (Math.max(0, Number(difficulty?.prestigeMultiplierPercent) || 0) / 100))) : 0;
          contract.xpRate = Math.max(0, Number(difficulty?.xpPercent) || GameEngine.CONTRACT_CLAIM_XP_RATE * 100) / 100;
        });
      }
  
      // Propostas e contratos antigos recebem o mesmo ajuste dos
      // novos contratos, sem reaplicar o ajuste em saves já normalizados.
      if (legacySaveFormat < 39) {
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
  
      // Contas realmente intocadas passam a usar o capital
      // inicial de 120 moedas. Jornadas em andamento preservam o saldo atual.
      if (legacySaveFormat < 36) {
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
      if (legacySaveFormat < 38 && merged.farmLevel < GameEngine.MAX_FARM_LEVEL) {
        // Preserva a porcentagem já preenchida da barra ao migrar da curva antiga
        // para a escala longa que alcança os sufixos Aa–Az nos níveis avançados.
        const previousNeed = Math.round(160 + 72 * Math.pow(merged.farmLevel, 1.52));
        const previousProgress = previousNeed > 0 ? Math.min(0.999999, loadedFarmXP / previousNeed) : 0;
        merged.farmXP = this.getFarmXPNeed(merged.farmLevel) * previousProgress;
      } else {
        merged.farmXP = loadedFarmXP;
      }
      merged.version = GameEngine.APP_VERSION;
      merged.coins = Number.isFinite(Number(merged.coins)) ? Number(merged.coins) : 0;
      merged.research = Math.max(0, Number(merged.research) || 0);
      merged.prestigePoints = Math.max(0, Number(merged.prestigePoints) || 0);
      merged.passiveResearchProgress = Math.max(0, Number(merged.passiveResearchProgress) || 0) % 1;
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
      const currentPrestigedCrops = Object.values(merged.crops).filter(item => Number(item.level || 0) >= GameEngine.MAX_CROP_LEVEL).length;
      merged.stats.lifetimeCropPrestiges = Math.max(currentPrestigedCrops, Math.floor(Number(merged.stats.lifetimeCropPrestiges) || 0));
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
      merged.permanentBonuses.passiveXPPercentPerSecond = Math.max(0, Number(merged.permanentBonuses.passiveXPPercentPerSecond) || 0);
      merged.permanentBonuses.contractRewardPercent = Math.max(0, Number(merged.permanentBonuses.contractRewardPercent) || 0);
      merged.permanentBonuses.orderRewardPercent = Math.max(0, Number(merged.permanentBonuses.orderRewardPercent) || 0);
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
        return Promise.resolve(window.FirebaseManager?.saveGuestGame?.(this.state) || { ok: false, reason: "guest" });
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
      this.addPassiveFarmXP(safe);
    }
  simulate(seconds, offline = false, actualOfflineSeconds = null) {
      const requestedSeconds = Math.max(0, Number(seconds) || 0);
      let remaining = Math.max(0, Math.min(offline ? this.getMaxOfflineSeconds?.(this.state) ?? GameEngine.BASE_MAX_OFFLINE_SECONDS : Number.MAX_SAFE_INTEGER, requestedSeconds));
      const simulatedTotal = remaining;
      const elapsedTotal = offline ? Math.max(requestedSeconds, Number(actualOfflineSeconds) || 0) : requestedSeconds;
      const offlineReport = offline ? {
        seconds: elapsedTotal,
        simulatedSeconds: simulatedTotal,
        maxSeconds: this.getMaxOfflineSeconds?.(this.state) ?? GameEngine.BASE_MAX_OFFLINE_SECONDS,
        coinsBefore: Number(this.state.coins) || 0,
        researchBefore: Number(this.state.research) || 0,
        levelBefore: Math.max(1, Number(this.state.farmLevel) || 1),
        contractsBefore: Math.max(0, Number(this.state.stats?.contractsCompleted) || 0),
        xpGained: 0,
        milestones: []
      } : null;
      this.expireContracts(offline);
  
      while (remaining > 0.0001) {
        const activeTimes = [
          ...this.state.activeContracts
            .filter(contract => contract.delivered < contract.amount && !contract.completedAt)
            .map(contract => Math.max(0, Number(contract.timeRemaining) || 0)),
          ...this.state.contractOffers.map(contract => Math.max(0, Number(contract.timeRemaining) || 0)),
          ...this.state.contractCooldowns.map(cooldown => Math.max(0, Number(cooldown.timeRemaining) || 0))
        ].filter(time => time > 0);
        const nearestDeadline = activeTimes.length ? Math.min(...activeTimes) : Infinity;
        const normalStep = offline ? 60 : remaining;
        const step = Math.min(remaining, normalStep, nearestDeadline);
  
        if (!Number.isFinite(step)) break;
        if (step <= 0.0001) {
          const nudge = Math.min(remaining, 0.001);
          this.produce(nudge, offline);
          this.advancePassiveResearch(nudge);
          if (offlineReport) offlineReport.xpGained += this.addPassiveFarmXP(nudge, true);
          this.advanceContractTimers(nudge, offline);
          this.ensureContractOffers();
          remaining -= nudge;
          continue;
        }
  
        this.produce(step, offline);
        this.advancePassiveResearch(step);
        if (offlineReport) offlineReport.xpGained += this.addPassiveFarmXP(step, true);
        this.advanceContractTimers(step, offline);
        this.ensureContractOffers();
        remaining -= step;
      }

      if (offlineReport) {
        const levelAfter = Math.max(1, Number(this.state.farmLevel) || 1);
        for (let level = offlineReport.levelBefore + 1; level <= levelAfter; level += 1) {
          const unlocks = this.getMilestoneUnlocks(level);
          if (unlocks.length) offlineReport.milestones.push({ level, unlocks });
        }
        this.lastOfflineReport = {
          seconds: elapsedTotal,
          coins: Math.max(0, (Number(this.state.coins) || 0) - offlineReport.coinsBefore),
          research: Math.max(0, (Number(this.state.research) || 0) - offlineReport.researchBefore),
          levels: Math.max(0, levelAfter - offlineReport.levelBefore),
          levelBefore: offlineReport.levelBefore,
          levelAfter,
          xp: Math.max(0, offlineReport.xpGained),
          contractsCompleted: Math.max(0, (Number(this.state.stats?.contractsCompleted) || 0) - offlineReport.contractsBefore),
          milestones: offlineReport.milestones
        };
        return this.lastOfflineReport;
      }
      return null;
    }

  consumeOfflineReport() {
      const report = this.lastOfflineReport;
      this.lastOfflineReport = null;
      return report;
    }
}

window.GameEngine = GameEngine;
