'use strict';

const STORAGE_KEY = 'fazenda-industrial-svg-save-v1';
const TICK_SAVE_EVERY = 2500;
const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

const CATEGORIES = {
  leaf: 'Folhas',
  root: 'Raízes',
  vine: 'Rasteiras',
  fruit: 'Frutos',
  tree: 'Árvores',
  grain: 'Grãos',
  bush: 'Arbustos',
  tropical: 'Tropicais',
  beverage: 'Bebidas',
  fiber: 'Fibras'
};

const SEASONS = [
  {
    id: 'spring',
    name: 'Primavera',
    icon: 'sprout',
    color: '#57d57e',
    duration: 90,
    description: 'Crescimento forte para folhas, raízes e morangos. Ótima fase para expandir a fazenda.',
    goodTypes: ['leaf', 'root', 'vine', 'bush'],
    weakTypes: ['tropical'],
    priceTypes: { leaf: 1.12, root: 1.08, bush: 1.10 }
  },
  {
    id: 'summer',
    name: 'Verão',
    icon: 'sun',
    color: '#ffc856',
    duration: 90,
    description: 'Frutas tropicais, árvores e bebidas rendem mais. Plantas sensíveis podem crescer um pouco mais devagar.',
    goodTypes: ['tree', 'tropical', 'beverage', 'fruit'],
    weakTypes: ['leaf'],
    priceTypes: { tropical: 1.22, beverage: 1.15, fruit: 1.10 }
  },
  {
    id: 'autumn',
    name: 'Outono',
    icon: 'leaf',
    color: '#ff9f43',
    duration: 90,
    description: 'Safra estável e bons preços para grãos, raízes e conservas industriais.',
    goodTypes: ['grain', 'root', 'fruit'],
    weakTypes: ['tropical'],
    priceTypes: { grain: 1.18, root: 1.14, fruit: 1.08 }
  },
  {
    id: 'winter',
    name: 'Inverno',
    icon: 'snow',
    color: '#8ee8ff',
    duration: 90,
    description: 'Crescimento mais difícil para tropicais, mas folhas resistentes, fibras e grãos ficam valorizados.',
    goodTypes: ['leaf', 'grain', 'fiber'],
    weakTypes: ['tropical', 'tree'],
    priceTypes: { leaf: 1.18, grain: 1.12, fiber: 1.20 }
  }
];

const CROPS = [
  { id: 'folha', name: 'Folha', type: 'leaf', industry: 'Hortifruti Verde', color: '#55c863', accent: '#d7ffd7', basePrice: 2, baseGrowth: 5.2, baseYield: 3, best: ['spring', 'winter'] },
  { id: 'cebola', name: 'Cebola', type: 'root', industry: 'Conservas Raiz Forte', color: '#d9b57c', accent: '#fff0c8', basePrice: 4, baseGrowth: 6.3, baseYield: 2, best: ['spring', 'autumn'] },
  { id: 'batata', name: 'Batata', type: 'root', industry: 'Fábrica de Chips', color: '#c89b61', accent: '#ffe0a1', basePrice: 5, baseGrowth: 6.8, baseYield: 2, best: ['autumn'] },
  { id: 'batata-doce', name: 'Batata Doce', type: 'root', industry: 'Doces da Terra', color: '#b9697f', accent: '#ffd1dd', basePrice: 6, baseGrowth: 7.2, baseYield: 2, best: ['spring', 'autumn'] },
  { id: 'cenoura', name: 'Cenoura', type: 'root', industry: 'Sopas Industriais', color: '#ff8f2c', accent: '#bcff71', basePrice: 7, baseGrowth: 7.8, baseYield: 2, best: ['spring'] },
  { id: 'tomate', name: 'Tomate', type: 'vine', industry: 'Molhos Rubi', color: '#ed3939', accent: '#7ce06d', basePrice: 9, baseGrowth: 8.2, baseYield: 2, best: ['spring', 'summer'] },
  { id: 'alho', name: 'Alho', type: 'root', industry: 'Temperos Finos', color: '#ece3d0', accent: '#b9e27a', basePrice: 10, baseGrowth: 8.5, baseYield: 2, best: ['autumn'] },
  { id: 'pimentao', name: 'Pimentão', type: 'fruit', industry: 'Legumes Selecionados', color: '#2dbb63', accent: '#f24949', basePrice: 12, baseGrowth: 9.0, baseYield: 2, best: ['summer'] },
  { id: 'banana', name: 'Banana', type: 'tropical', industry: 'Vitaminas Tropicais', color: '#ffe257', accent: '#2faa67', basePrice: 14, baseGrowth: 9.7, baseYield: 2, best: ['summer'] },
  { id: 'melao', name: 'Melão', type: 'vine', industry: 'Sucos Claros', color: '#d4e56b', accent: '#79c25d', basePrice: 16, baseGrowth: 10.2, baseYield: 2, best: ['summer'] },
  { id: 'melancia', name: 'Melancia', type: 'vine', industry: 'Refrescos Gigantes', color: '#2ca85f', accent: '#ff4e66', basePrice: 18, baseGrowth: 10.8, baseYield: 2, best: ['summer'] },
  { id: 'maca', name: 'Maçã', type: 'tree', industry: 'Compotas de Pomares', color: '#dd2525', accent: '#7bd36e', basePrice: 20, baseGrowth: 11.5, baseYield: 2, best: ['autumn'] },
  { id: 'limao', name: 'Limão', type: 'tree', industry: 'Citrus Lab', color: '#cbf246', accent: '#5ab84e', basePrice: 22, baseGrowth: 12.2, baseYield: 2, best: ['summer'] },
  { id: 'caju', name: 'Caju', type: 'tropical', industry: 'Polpas Tropicais', color: '#ff9a39', accent: '#b54b2a', basePrice: 24, baseGrowth: 12.7, baseYield: 2, best: ['summer'] },
  { id: 'pepino', name: 'Pepino', type: 'vine', industry: 'Pickles Premium', color: '#57b557', accent: '#d7ff90', basePrice: 26, baseGrowth: 13.2, baseYield: 2, best: ['spring', 'summer'] },
  { id: 'alface', name: 'Alface', type: 'leaf', industry: 'Saladas Prontas', color: '#8be36b', accent: '#d7ffd1', basePrice: 28, baseGrowth: 13.8, baseYield: 2, best: ['spring', 'winter'] },
  { id: 'berinjela', name: 'Berinjela', type: 'fruit', industry: 'Antepastos Roxos', color: '#6834a1', accent: '#b990ff', basePrice: 32, baseGrowth: 14.4, baseYield: 2, best: ['summer', 'autumn'] },
  { id: 'maracuja', name: 'Maracujá', type: 'tropical', industry: 'Sucos Ácidos', color: '#ffd34e', accent: '#7b42b3', basePrice: 35, baseGrowth: 15.0, baseYield: 2, best: ['summer'] },
  { id: 'pimenta', name: 'Pimenta', type: 'fruit', industry: 'Molhos Ardentes', color: '#e32727', accent: '#74d16b', basePrice: 38, baseGrowth: 15.5, baseYield: 2, best: ['summer'] },
  { id: 'cereja', name: 'Cereja', type: 'tree', industry: 'Doceria Cereja Real', color: '#b91037', accent: '#7cd65b', basePrice: 42, baseGrowth: 16.2, baseYield: 2, best: ['spring'] },
  { id: 'uva', name: 'Uva', type: 'vine', industry: 'Sucos de Parreira', color: '#7138d4', accent: '#9be06c', basePrice: 46, baseGrowth: 16.8, baseYield: 2, best: ['autumn'] },
  { id: 'morango', name: 'Morango', type: 'bush', industry: 'Geleias Vermelhas', color: '#ef3152', accent: '#9fe65b', basePrice: 50, baseGrowth: 17.4, baseYield: 2, best: ['spring'] },
  { id: 'kiwi', name: 'Kiwi', type: 'vine', industry: 'Vitaminas Verdes', color: '#78b84a', accent: '#e4d0a2', basePrice: 55, baseGrowth: 18.1, baseYield: 2, best: ['autumn'] },
  { id: 'abacate', name: 'Abacate', type: 'tree', industry: 'Cremes Naturais', color: '#4a9b48', accent: '#ffe084', basePrice: 60, baseGrowth: 18.8, baseYield: 2, best: ['summer'] },
  { id: 'mamao', name: 'Mamão', type: 'tropical', industry: 'Polpas Doces', color: '#ff9d3e', accent: '#58b46c', basePrice: 66, baseGrowth: 19.6, baseYield: 2, best: ['summer'] },
  { id: 'abobora', name: 'Abóbora', type: 'vine', industry: 'Sopas Douradas', color: '#f1892d', accent: '#72bc52', basePrice: 72, baseGrowth: 20.3, baseYield: 2, best: ['autumn'] },
  { id: 'beterraba', name: 'Beterraba', type: 'root', industry: 'Corantes Naturais', color: '#a51f51', accent: '#7fdd5a', basePrice: 79, baseGrowth: 21.1, baseYield: 2, best: ['winter', 'autumn'] },
  { id: 'laranja', name: 'Laranja', type: 'tree', industry: 'Citrus Lab', color: '#ff9b2f', accent: '#6ccf57', basePrice: 86, baseGrowth: 22.0, baseYield: 2, best: ['summer'] },
  { id: 'mirtilo', name: 'Mirtilo', type: 'bush', industry: 'Geleias Nobres', color: '#445fd8', accent: '#8be282', basePrice: 94, baseGrowth: 22.8, baseYield: 2, best: ['spring'] },
  { id: 'pera', name: 'Pera', type: 'tree', industry: 'Compotas de Pomares', color: '#b9d957', accent: '#65b252', basePrice: 103, baseGrowth: 23.7, baseYield: 2, best: ['autumn'] },
  { id: 'pitaya', name: 'Pitaya', type: 'tropical', industry: 'Frutas Exóticas', color: '#ff4da6', accent: '#f4f4f4', basePrice: 113, baseGrowth: 24.6, baseYield: 2, best: ['summer'] },
  { id: 'carambola', name: 'Carambola', type: 'tree', industry: 'Frutas Estrela', color: '#e4d947', accent: '#6bc261', basePrice: 124, baseGrowth: 25.6, baseYield: 2, best: ['summer'] },
  { id: 'pessego', name: 'Pêssego', type: 'tree', industry: 'Doces Aveludados', color: '#ffad7d', accent: '#76cf61', basePrice: 136, baseGrowth: 26.6, baseYield: 2, best: ['spring', 'summer'] },
  { id: 'abacaxi', name: 'Abacaxi', type: 'tropical', industry: 'Sucos Tropicais', color: '#e9bc38', accent: '#3fad5b', basePrice: 149, baseGrowth: 27.6, baseYield: 2, best: ['summer'] },
  { id: 'coco', name: 'Coco', type: 'tropical', industry: 'Águas Naturais', color: '#93643e', accent: '#f5f1df', basePrice: 164, baseGrowth: 28.8, baseYield: 2, best: ['summer'] },
  { id: 'goiaba', name: 'Goiaba', type: 'tree', industry: 'Goiabadas', color: '#77ba58', accent: '#ff8195', basePrice: 180, baseGrowth: 30.0, baseYield: 2, best: ['summer'] },
  { id: 'manga', name: 'Manga', type: 'tropical', industry: 'Polpas Tropicais', color: '#ffbd3d', accent: '#e85a3b', basePrice: 198, baseGrowth: 31.2, baseYield: 2, best: ['summer'] },
  { id: 'amora', name: 'Amora', type: 'bush', industry: 'Geleias Nobres', color: '#512070', accent: '#9b67d8', basePrice: 217, baseGrowth: 32.4, baseYield: 2, best: ['spring'] },
  { id: 'milho', name: 'Milho', type: 'grain', industry: 'Cereal & Ração', color: '#ffd957', accent: '#73bf4d', basePrice: 238, baseGrowth: 33.7, baseYield: 2, best: ['autumn', 'winter'] },
  { id: 'guarana', name: 'Guaraná', type: 'beverage', industry: 'Bebidas Energéticas', color: '#ca3044', accent: '#f2e6c8', basePrice: 262, baseGrowth: 35.2, baseYield: 2, best: ['summer'] },
  { id: 'cafe', name: 'Café', type: 'beverage', industry: 'Torrefação Premium', color: '#7a4a2a', accent: '#65b95a', basePrice: 288, baseGrowth: 36.7, baseYield: 2, best: ['autumn'] },
  { id: 'arroz', name: 'Arroz', type: 'grain', industry: 'Grãos Selecionados', color: '#f4ead0', accent: '#86d472', basePrice: 316, baseGrowth: 38.2, baseYield: 2, best: ['spring', 'autumn'] },
  { id: 'feijao', name: 'Feijão', type: 'grain', industry: 'Grãos Selecionados', color: '#8f4a32', accent: '#71c65b', basePrice: 347, baseGrowth: 39.8, baseYield: 2, best: ['autumn'] },
  { id: 'algodao', name: 'Algodão', type: 'fiber', industry: 'Indústria Têxtil', color: '#f8f8f0', accent: '#97d58b', basePrice: 382, baseGrowth: 41.4, baseYield: 2, best: ['winter', 'summer'] }
].map((crop, index) => ({
  ...crop,
  index,
  cost: Math.round((index === 0 ? 0 : 32 * Math.pow(1.19, index)) + index * 18),
  unlockRep: Math.max(0, Math.floor((index - 9) / 4) * 3)
}));

const CROP_MAP = Object.fromEntries(CROPS.map(crop => [crop.id, crop]));

const GLOBAL_UPGRADES = [
  { id: 'irrigation', name: 'Irrigação pressurizada', desc: '+8% velocidade de crescimento por nível.', max: 25, baseCost: 190, growth: 1.72, currency: 'coins' },
  { id: 'fertilizer', name: 'Biofertilizante', desc: '+10% produção por colheita por nível.', max: 25, baseCost: 240, growth: 1.78, currency: 'coins' },
  { id: 'warehouse', name: 'Armazém modular', desc: '+70 de limite de estoque por planta por nível.', max: 30, baseCost: 320, growth: 1.62, currency: 'coins' },
  { id: 'logistics', name: 'Frota logística', desc: '+7% valor de venda comum e industrial por nível.', max: 20, baseCost: 3, growth: 1.55, currency: 'research' },
  { id: 'lab', name: 'Laboratório de sementes', desc: 'Reduz custo de compra e upgrade das plantas.', max: 18, baseCost: 4, growth: 1.66, currency: 'research' },
  { id: 'contracts', name: 'Negociação industrial', desc: '+9% bônus nos contratos por nível.', max: 18, baseCost: 5, growth: 1.74, currency: 'research' },
  { id: 'greenhouse', name: 'Estufa climatizada', desc: 'Diminui penalidades de estação e fortalece plantas fora de época.', max: 15, baseCost: 7, growth: 1.82, currency: 'research' }
];

const MISSIONS = [
  { id: 'first_contract', title: 'Primeiro contrato', desc: 'Entregue 1 contrato industrial.', metric: 'contractsCompleted', target: 1, reward: { coins: 250, research: 1, reputation: 1 } },
  { id: 'five_plants', title: 'Fazenda ganhando corpo', desc: 'Compre 5 plantas diferentes.', metric: 'ownedCount', target: 5, reward: { coins: 500, research: 2, reputation: 2 } },
  { id: 'fifteen_plants', title: 'Catálogo agrícola', desc: 'Compre 15 plantas diferentes.', metric: 'ownedCount', target: 15, reward: { coins: 2500, research: 5, reputation: 4 } },
  { id: 'all_plants', title: 'Coleção completa', desc: 'Compre todas as plantas do projeto.', metric: 'ownedCount', target: CROPS.length, reward: { coins: 18000, research: 18, reputation: 12 } },
  { id: 'stock_500', title: 'Armazém cheio', desc: 'Tenha 500 produtos em estoque.', metric: 'totalStock', target: 500, reward: { coins: 1600, research: 3, reputation: 2 } },
  { id: 'ten_contracts', title: 'Fornecedor confiável', desc: 'Entregue 10 contratos industriais.', metric: 'contractsCompleted', target: 10, reward: { coins: 7000, research: 8, reputation: 8 } },
  { id: 'plant_level_10', title: 'Cultivo especializado', desc: 'Faça qualquer planta chegar ao nível 10.', metric: 'maxCropLevel', target: 10, reward: { coins: 4200, research: 5, reputation: 3 } },
  { id: 'earn_50k', title: 'Capital agrícola', desc: 'Acumule 50k moedas ganhas no total.', metric: 'coinsEarned', target: 50000, reward: { coins: 12000, research: 10, reputation: 6 } }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ui = {
  cropGrid: $('#cropGrid'),
  contractList: $('#contractList'),
  upgradeList: $('#upgradeList'),
  missionList: $('#missionList'),
  logList: $('#logList'),
  toastZone: $('#toastZone'),
  searchCrop: $('#searchCrop'),
  categoryFilter: $('#categoryFilter'),
  sortMode: $('#sortMode'),
  saveBox: $('#saveBox')
};

let state = loadState();
let lastFrame = performance.now();
let lastRender = 0;
let lastSave = 0;

function defaultCropState(crop, index) {
  const starter = index === 0;
  return {
    owned: starter,
    level: starter ? 1 : 0,
    progress: 0,
    stock: 0,
    sold: 0
  };
}

function createState() {
  return {
    version: 1,
    coins: 120,
    research: 0,
    reputation: 0,
    seasonIndex: 0,
    seasonTime: 0,
    crops: Object.fromEntries(CROPS.map((crop, index) => [crop.id, defaultCropState(crop, index)])),
    upgrades: Object.fromEntries(GLOBAL_UPGRADES.map(up => [up.id, 0])),
    contracts: [],
    claimedMissions: [],
    stats: {
      coinsEarned: 120,
      totalSold: 0,
      totalHarvested: 0,
      contractsCompleted: 0
    },
    logs: ['Bem-vindo! A Folha já está pronta para iniciar sua fazenda.'],
    lastUpdate: Date.now()
  };
}

function loadState() {
  let parsed = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Save inválido. Criando novo jogo.', error);
  }

  const fresh = createState();
  if (!parsed || typeof parsed !== 'object') return fresh;

  const merged = {
    ...fresh,
    ...parsed,
    crops: { ...fresh.crops, ...(parsed.crops || {}) },
    upgrades: { ...fresh.upgrades, ...(parsed.upgrades || {}) },
    stats: { ...fresh.stats, ...(parsed.stats || {}) },
    logs: Array.isArray(parsed.logs) ? parsed.logs.slice(0, 16) : fresh.logs,
    contracts: Array.isArray(parsed.contracts) ? parsed.contracts : []
  };

  for (const crop of CROPS) {
    merged.crops[crop.id] = { ...defaultCropState(crop, crop.index), ...(merged.crops[crop.id] || {}) };
  }

  const offlineSeconds = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (Date.now() - (merged.lastUpdate || Date.now())) / 1000));
  if (offlineSeconds > 15) {
    simulateProduction(merged, offlineSeconds, true);
    merged.logs.unshift(`Produção offline processada: ${formatTime(offlineSeconds)}.`);
  }
  merged.lastUpdate = Date.now();

  if (!merged.contracts.length) {
    merged.contracts = createContracts(merged, 5);
  }

  return merged;
}

function saveState(showToast = false) {
  state.lastUpdate = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (showToast) toast('Jogo salvo no navegador.');
}

function simulateProduction(targetState, seconds, offline = false) {
  advanceSeason(targetState, seconds, !offline);
  produce(targetState, seconds, offline);
  tickContracts(targetState, seconds);
}

function currentSeason(targetState = state) {
  return SEASONS[targetState.seasonIndex % SEASONS.length];
}

function advanceSeason(targetState, dt, log = true) {
  let season = currentSeason(targetState);
  targetState.seasonTime += dt;

  while (targetState.seasonTime >= season.duration) {
    targetState.seasonTime -= season.duration;
    targetState.seasonIndex = (targetState.seasonIndex + 1) % SEASONS.length;
    season = currentSeason(targetState);
    rerollMarketDemand(targetState);
    targetState.contracts = createContracts(targetState, 5);
    if (log) addLog(`A estação mudou para ${season.name}. Novos contratos chegaram.`);
  }
}

function produce(targetState, dt, offline = false) {
  for (const crop of CROPS) {
    const data = targetState.crops[crop.id];
    if (!data.owned || data.level <= 0) continue;

    const cap = getStorageCap(crop.id, targetState);
    if (data.stock >= cap) continue;

    data.progress += dt / getGrowthTime(crop, targetState);
    const cycles = Math.floor(data.progress);
    if (cycles <= 0) continue;

    const amount = Math.max(1, Math.floor(getYield(crop, targetState) * cycles));
    const accepted = Math.max(0, Math.min(cap - data.stock, amount));
    data.stock += accepted;
    data.progress -= cycles;
    targetState.stats.totalHarvested += accepted;

    if (!offline && accepted > 0 && Math.random() < 0.018) {
      addLog(`${crop.name} gerou uma colheita excelente: +${accepted} produtos.`);
    }
  }
}

function tickContracts(targetState, dt) {
  let changed = false;
  for (const contract of targetState.contracts) {
    contract.timeLeft -= dt;
  }
  const kept = targetState.contracts.filter(contract => contract.timeLeft > 0);
  if (kept.length !== targetState.contracts.length) changed = true;
  while (kept.length < 5) {
    kept.push(...createContracts(targetState, 1));
    changed = true;
  }
  targetState.contracts = kept.slice(0, 5);
  return changed;
}

function rerollMarketDemand(targetState) {
  for (const crop of CROPS) {
    const data = targetState.crops[crop.id];
    data.demand = Number((0.88 + Math.random() * 0.34).toFixed(2));
  }
}

function getSeasonEffect(crop, targetState = state) {
  const season = currentSeason(targetState);
  const greenhouse = targetState.upgrades.greenhouse || 0;
  const softener = Math.min(0.22, greenhouse * 0.018);
  let speed = 1;
  let yieldBonus = 1;
  let label = 'Neutro';

  if (crop.best.includes(season.id) || season.goodTypes.includes(crop.type)) {
    speed += 0.20 + greenhouse * 0.006;
    yieldBonus += 0.18 + greenhouse * 0.004;
    label = 'Safra forte';
  } else if (season.weakTypes.includes(crop.type)) {
    speed -= Math.max(0.04, 0.24 - softener);
    yieldBonus -= Math.max(0.02, 0.16 - softener);
    label = 'Fora de época';
  }

  return { speed, yieldBonus, label };
}

function getGrowthTime(crop, targetState = state) {
  const data = targetState.crops[crop.id];
  const seasonEffect = getSeasonEffect(crop, targetState);
  const irrigation = targetState.upgrades.irrigation || 0;
  const levelSpeed = Math.max(0, data.level - 1) * 0.055;
  const speed = seasonEffect.speed + irrigation * 0.08 + levelSpeed;
  return Math.max(1.2, crop.baseGrowth / speed);
}

function getYield(crop, targetState = state) {
  const data = targetState.crops[crop.id];
  const seasonEffect = getSeasonEffect(crop, targetState);
  const fertilizer = targetState.upgrades.fertilizer || 0;
  const levelYield = Math.max(0, data.level - 1) * 0.18;
  return crop.baseYield * seasonEffect.yieldBonus * (1 + fertilizer * 0.10 + levelYield);
}

function getStorageCap(cropId, targetState = state) {
  const warehouse = targetState.upgrades.warehouse || 0;
  return 90 + warehouse * 70 + Math.max(0, targetState.crops[cropId].level - 1) * 9;
}

function getSalePrice(crop, targetState = state) {
  const season = currentSeason(targetState);
  const logistics = targetState.upgrades.logistics || 0;
  const demand = targetState.crops[crop.id].demand || 1;
  const seasonPrice = season.priceTypes[crop.type] || 1;
  const repBonus = 1 + Math.min(0.3, targetState.reputation * 0.004);
  return crop.basePrice * demand * seasonPrice * (1 + logistics * 0.07) * repBonus;
}

function getBuyCost(crop, targetState = state) {
  const lab = targetState.upgrades.lab || 0;
  return Math.max(0, Math.ceil(crop.cost * (1 - Math.min(0.38, lab * 0.018))));
}

function getCropUpgradeCost(crop, targetState = state) {
  const level = targetState.crops[crop.id].level;
  const lab = targetState.upgrades.lab || 0;
  const base = Math.max(35, crop.cost + crop.basePrice * 18);
  return Math.ceil(base * Math.pow(1.38, Math.max(0, level - 1)) * (1 - Math.min(0.35, lab * 0.016)));
}

function getGlobalUpgradeCost(upgrade, targetState = state) {
  const level = targetState.upgrades[upgrade.id] || 0;
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

function canUnlockCrop(crop) {
  return state.reputation >= crop.unlockRep;
}

function buyCrop(cropId) {
  const crop = CROP_MAP[cropId];
  const data = state.crops[cropId];
  if (!crop || data.owned) return;

  const cost = getBuyCost(crop);
  if (!canUnlockCrop(crop)) return toast(`Reputação insuficiente para ${crop.name}.`);
  if (state.coins < cost) return toast(`Moedas insuficientes para comprar ${crop.name}.`);

  state.coins -= cost;
  data.owned = true;
  data.level = 1;
  data.progress = 0;
  addLog(`${crop.name} entrou na fazenda.`);
  toast(`${crop.name} comprado!`);
  render(true);
}

function upgradeCrop(cropId) {
  const crop = CROP_MAP[cropId];
  const data = state.crops[cropId];
  if (!crop || !data.owned) return;

  const cost = getCropUpgradeCost(crop);
  if (state.coins < cost) return toast(`Moedas insuficientes para aprimorar ${crop.name}.`);

  state.coins -= cost;
  data.level += 1;
  addLog(`${crop.name} subiu para o nível ${data.level}.`);
  render(true);
}

function sellCrop(cropId, fraction = 1, industrialMultiplier = 1) {
  const crop = CROP_MAP[cropId];
  const data = state.crops[cropId];
  if (!crop || !data.owned || data.stock <= 0) return;

  const amount = Math.max(1, Math.floor(data.stock * fraction));
  const sold = Math.min(data.stock, amount);
  const gain = Math.floor(sold * getSalePrice(crop) * industrialMultiplier);

  data.stock -= sold;
  data.sold += sold;
  state.coins += gain;
  state.stats.coinsEarned += gain;
  state.stats.totalSold += sold;
  addLog(`${sold}x ${crop.name} vendidos por ${formatNumber(gain)} moedas.`);
  toast(`Venda concluída: +${formatNumber(gain)} moedas.`);
  render(true);
}

function sellAllUnlocked() {
  let total = 0;
  let count = 0;
  for (const crop of CROPS) {
    const data = state.crops[crop.id];
    if (!data.owned || data.stock <= 0) continue;
    const gain = Math.floor(data.stock * getSalePrice(crop) * 0.92);
    total += gain;
    count += data.stock;
    data.sold += data.stock;
    state.stats.totalSold += data.stock;
    data.stock = 0;
  }

  if (total <= 0) return toast('Nenhum estoque disponível para venda comum.');
  state.coins += total;
  state.stats.coinsEarned += total;
  addLog(`${count} produtos vendidos em lote por ${formatNumber(total)} moedas.`);
  toast(`Venda em lote: +${formatNumber(total)} moedas.`);
  render(true);
}

function buyGlobalUpgrade(upgradeId) {
  const upgrade = GLOBAL_UPGRADES.find(item => item.id === upgradeId);
  if (!upgrade) return;
  const level = state.upgrades[upgrade.id] || 0;
  if (level >= upgrade.max) return toast(`${upgrade.name} já está no nível máximo.`);

  const cost = getGlobalUpgradeCost(upgrade);
  if (state[upgrade.currency] < cost) return toast(`${currencyLabel(upgrade.currency)} insuficiente para ${upgrade.name}.`);

  state[upgrade.currency] -= cost;
  state.upgrades[upgrade.id] = level + 1;
  addLog(`${upgrade.name} aprimorado para nível ${level + 1}.`);
  toast(`${upgrade.name} melhorado!`);
  render(true);
}

function createContracts(targetState = state, amount = 5) {
  const owned = CROPS.filter(crop => targetState.crops[crop.id]?.owned);
  const pool = owned.length ? owned : [CROPS[0]];
  const contracts = [];

  for (let i = 0; i < amount; i++) {
    const crop = weightedPick(pool);
    const level = targetState.crops[crop.id].level || 1;
    const qty = Math.max(8, Math.floor((8 + Math.random() * 24) * (1 + Math.min(7, level) * 0.12)));
    const multiplier = Number((1.22 + Math.random() * 0.58 + (targetState.upgrades.contracts || 0) * 0.09).toFixed(2));
    const value = Math.floor(qty * getSalePrice(crop, targetState) * multiplier);
    const buyer = crop.industry;
    contracts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      cropId: crop.id,
      qty,
      multiplier,
      value,
      buyer,
      research: 1 + Math.floor(Math.random() * 2),
      reputation: Math.random() > .55 ? 1 : 0,
      timeLeft: 120 + Math.floor(Math.random() * 180)
    });
  }

  return contracts;
}

function weightedPick(list) {
  const unlockedLate = list.filter(crop => crop.index > 3);
  const pool = unlockedLate.length && Math.random() > .28 ? unlockedLate : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

function rerollContracts() {
  const cost = 75 + state.reputation * 8;
  if (state.coins < cost) return toast(`Precisa de ${formatNumber(cost)} moedas para buscar novos contratos.`);
  state.coins -= cost;
  state.contracts = createContracts(state, 5);
  addLog('Novos contratos industriais foram negociados.');
  render(true);
}

function completeContract(contractId) {
  const contract = state.contracts.find(item => item.id === contractId);
  if (!contract) return;
  const crop = CROP_MAP[contract.cropId];
  const data = state.crops[contract.cropId];

  if (data.stock < contract.qty) return toast(`Estoque insuficiente de ${crop.name}.`);

  data.stock -= contract.qty;
  data.sold += contract.qty;
  state.coins += contract.value;
  state.research += contract.research;
  state.reputation += contract.reputation;
  state.stats.totalSold += contract.qty;
  state.stats.coinsEarned += contract.value;
  state.stats.contractsCompleted += 1;
  state.contracts = state.contracts.filter(item => item.id !== contractId);
  state.contracts.push(...createContracts(state, 1));
  addLog(`${crop.name} entregue para ${contract.buyer}: +${formatNumber(contract.value)} moedas.`);
  toast(`Contrato entregue! +${formatNumber(contract.value)} moedas.`);
  render(true);
}

function claimMission(missionId) {
  const mission = MISSIONS.find(item => item.id === missionId);
  if (!mission || state.claimedMissions.includes(mission.id)) return;
  const progress = getMissionProgress(mission);
  if (progress.current < mission.target) return toast('Missão ainda não concluída.');

  state.claimedMissions.push(mission.id);
  state.coins += mission.reward.coins || 0;
  state.research += mission.reward.research || 0;
  state.reputation += mission.reward.reputation || 0;
  state.stats.coinsEarned += mission.reward.coins || 0;
  addLog(`Missão concluída: ${mission.title}.`);
  toast(`Recompensa recebida: ${mission.title}.`);
  render(true);
}

function getMissionProgress(mission) {
  const metrics = getMetrics();
  return {
    current: Math.min(metrics[mission.metric] || 0, mission.target),
    raw: metrics[mission.metric] || 0,
    target: mission.target
  };
}

function getMetrics() {
  const cropStates = CROPS.map(crop => state.crops[crop.id]);
  return {
    ownedCount: cropStates.filter(item => item.owned).length,
    totalStock: cropStates.reduce((sum, item) => sum + item.stock, 0),
    contractsCompleted: state.stats.contractsCompleted,
    maxCropLevel: Math.max(...cropStates.map(item => item.level || 0)),
    coinsEarned: state.stats.coinsEarned
  };
}

function addLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 18);
}

function toast(message) {
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = message;
  ui.toastZone.appendChild(toastEl);
  setTimeout(() => toastEl.remove(), 3200);
}

function render(force = false) {
  const now = performance.now();
  if (!force && now - lastRender < 650) return;
  lastRender = now;

  updateCounters();
  renderSeason();
  renderStats();
  renderLogs();
  renderCropGrid();
  renderContracts();
  renderUpgrades();
  renderMissions();
}

function updateCounters() {
  $('[data-counter="coins"]').textContent = formatNumber(state.coins);
  $('[data-counter="research"]').textContent = formatNumber(state.research);
  $('[data-counter="reputation"]').textContent = formatNumber(state.reputation);
}

function renderSeason() {
  const season = currentSeason();
  const pct = Math.min(100, (state.seasonTime / season.duration) * 100);
  document.documentElement.style.setProperty('--season', season.color);
  document.documentElement.style.setProperty('--season-soft', hexToRgba(season.color, .18));
  $('[data-season-name]').textContent = season.name;
  $('[data-season-description]').textContent = season.description;
  $('[data-season-progress]').style.width = `${pct}%`;
  $('[data-season-time]').textContent = `${formatTime(season.duration - state.seasonTime)} restantes`;
  $('[data-season-bonus]').textContent = `Bônus: ${season.goodTypes.map(type => CATEGORIES[type]).join(', ')}`;
  $('[data-season-icon]').innerHTML = seasonSvg(season.icon, season.color);
}

function renderStats() {
  const metrics = getMetrics();
  $('[data-stat="owned"]').textContent = `${metrics.ownedCount}/${CROPS.length}`;
  $('[data-stat="stock"]').textContent = formatNumber(metrics.totalStock);
  $('[data-stat="contracts"]').textContent = formatNumber(state.stats.contractsCompleted);
  $('[data-stat="sold"]').textContent = formatNumber(state.stats.totalSold);
}

function renderLogs() {
  ui.logList.innerHTML = state.logs.map(log => `<div class="log-item">${escapeHtml(log)}</div>`).join('');
}

function renderCropGrid() {
  const term = normalize(ui.searchCrop.value || '');
  const category = ui.categoryFilter.value || 'all';
  const sortMode = ui.sortMode.value || 'progression';

  let list = CROPS.filter(crop => {
    const matchesTerm = normalize(crop.name).includes(term) || normalize(crop.industry).includes(term) || crop.id.includes(term);
    const matchesCategory = category === 'all' || crop.type === category;
    return matchesTerm && matchesCategory;
  });

  list = sortCrops(list, sortMode);

  ui.cropGrid.innerHTML = list.map(crop => cropCard(crop)).join('');
}

function sortCrops(list, mode) {
  const sorted = [...list];
  if (mode === 'price') sorted.sort((a, b) => getSalePrice(b) - getSalePrice(a));
  else if (mode === 'stock') sorted.sort((a, b) => state.crops[b.id].stock - state.crops[a.id].stock);
  else if (mode === 'level') sorted.sort((a, b) => state.crops[b.id].level - state.crops[a.id].level);
  else sorted.sort((a, b) => a.index - b.index);
  return sorted;
}

function cropCard(crop) {
  const data = state.crops[crop.id];
  const owned = data.owned;
  const seasonEffect = getSeasonEffect(crop);
  const salePrice = getSalePrice(crop);
  const cap = getStorageCap(crop.id);
  const progress = owned ? Math.min(100, data.progress * 100) : 0;
  const cropColor = crop.color;
  const cropSoft = hexToRgba(crop.color, .22);
  const buyCost = getBuyCost(crop);
  const upgradeCost = getCropUpgradeCost(crop);
  const unlockText = crop.unlockRep > 0 ? `${crop.unlockRep} rep.` : 'Livre';
  const canBuy = !owned && canUnlockCrop(crop) && state.coins >= buyCost;
  const canUpgrade = owned && state.coins >= upgradeCost;
  const canSell = owned && data.stock > 0;
  const lockReason = !canUnlockCrop(crop) ? `Exige ${unlockText}` : `${formatNumber(buyCost)} moedas`;

  return `
    <article class="crop-card ${owned ? '' : 'locked'}" style="--crop-color:${cropColor};--crop-soft:${cropSoft}">
      <div class="crop-top">
        <div class="crop-icon" aria-hidden="true">${plantSvg(crop)}</div>
        <div>
          <div class="crop-title">
            <h3>${crop.name}</h3>
            <span class="badge ${owned ? 'good' : 'lock'}">${owned ? `Nv. ${data.level}` : 'Bloqueada'}</span>
          </div>
          <div class="crop-meta">
            <span>${CATEGORIES[crop.type]}</span>
            <span>•</span>
            <span>${crop.industry}</span>
          </div>
        </div>
      </div>

      <div class="crop-body">
        <div class="crop-data">
          <div class="data-pill"><small>Estoque</small><strong>${formatNumber(data.stock)} / ${formatNumber(cap)}</strong></div>
          <div class="data-pill"><small>Preço un.</small><strong>${formatMoney(salePrice)}</strong></div>
          <div class="data-pill"><small>Crescimento</small><strong>${owned ? formatTime(getGrowthTime(crop)) : '---'}</strong></div>
          <div class="data-pill"><small>Estação</small><strong>${seasonEffect.label}</strong></div>
        </div>

        <div class="progress-wrap">
          <div class="progress-label"><span>Produção automática</span><span>${owned ? `${progress.toFixed(0)}%` : lockReason}</span></div>
          <div class="progress-bar"><span style="width:${progress}%"></span></div>
        </div>

        <div class="crop-actions">
          ${owned
            ? `<button class="card-action upgrade" type="button" data-action="upgrade-crop" data-crop="${crop.id}" ${canUpgrade ? '' : 'disabled'}>Upgrade ${formatMoney(upgradeCost)}</button>
               <button class="card-action sell" type="button" data-action="sell-crop" data-crop="${crop.id}" ${canSell ? '' : 'disabled'}>Vender tudo</button>`
            : `<button class="card-action buy full" type="button" data-action="buy-crop" data-crop="${crop.id}" ${canBuy ? '' : 'disabled'}>Comprar ${formatMoney(buyCost)} · ${unlockText}</button>`}
        </div>
      </div>
    </article>`;
}

function renderContracts() {
  ui.contractList.innerHTML = state.contracts.map(contract => {
    const crop = CROP_MAP[contract.cropId];
    const data = state.crops[contract.cropId];
    const available = data.stock >= contract.qty;
    const progress = Math.min(100, (data.stock / contract.qty) * 100);

    return `
      <article class="contract-card" style="--crop-color:${crop.color};--crop-soft:${hexToRgba(crop.color, .18)}">
        <div class="contract-head">
          <div>
            <h3>${contract.buyer}</h3>
            <p class="contract-meta">Pedido industrial de <strong>${crop.name}</strong> com multiplicador ${contract.multiplier.toFixed(2)}x.</p>
          </div>
          <span class="badge ${available ? 'good' : 'warn'}">${formatTime(contract.timeLeft)}</span>
        </div>
        <div class="contract-lines">
          <div class="contract-line"><span>Quantidade</span><strong>${formatNumber(data.stock)} / ${formatNumber(contract.qty)}</strong></div>
          <div class="contract-line"><span>Pagamento</span><strong>${formatMoney(contract.value)}</strong></div>
          <div class="contract-line"><span>Pesquisa</span><strong>+${contract.research}</strong></div>
          <div class="contract-line"><span>Reputação</span><strong>+${contract.reputation}</strong></div>
        </div>
        <div class="mission-progress"><span style="width:${progress}%"></span></div>
        <button class="primary" type="button" data-action="complete-contract" data-contract="${contract.id}" ${available ? '' : 'disabled'}>Entregar contrato</button>
      </article>`;
  }).join('');
}

function renderUpgrades() {
  ui.upgradeList.innerHTML = GLOBAL_UPGRADES.map(upgrade => {
    const level = state.upgrades[upgrade.id] || 0;
    const cost = getGlobalUpgradeCost(upgrade);
    const maxed = level >= upgrade.max;
    const canBuy = !maxed && state[upgrade.currency] >= cost;

    return `
      <article class="upgrade-card">
        <div class="upgrade-head">
          <div>
            <h3>${upgrade.name}</h3>
            <p>${upgrade.desc}</p>
          </div>
          <span class="badge ${maxed ? 'good' : ''}">Nv. ${level}/${upgrade.max}</span>
        </div>
        <div class="upgrade-lines">
          <div class="upgrade-line"><span>Custo</span><strong>${maxed ? 'Máximo' : `${formatNumber(cost)} ${currencyLabel(upgrade.currency)}`}</strong></div>
        </div>
        <button class="primary" type="button" data-action="buy-global-upgrade" data-upgrade="${upgrade.id}" ${canBuy ? '' : 'disabled'}>${maxed ? 'Completo' : 'Aprimorar'}</button>
      </article>`;
  }).join('');
}

function renderMissions() {
  ui.missionList.innerHTML = MISSIONS.map(mission => {
    const progress = getMissionProgress(mission);
    const claimed = state.claimedMissions.includes(mission.id);
    const complete = progress.raw >= mission.target;
    const pct = Math.min(100, (progress.raw / mission.target) * 100);

    return `
      <article class="mission-card">
        <div class="mission-head">
          <div>
            <h3>${mission.title}</h3>
            <p>${mission.desc}</p>
          </div>
          <span class="badge ${claimed ? 'good' : complete ? 'warn' : ''}">${claimed ? 'Recebida' : `${formatNumber(progress.current)}/${formatNumber(mission.target)}`}</span>
        </div>
        <div class="mission-progress"><span style="width:${pct}%"></span></div>
        <p>Recompensa: ${formatMoney(mission.reward.coins || 0)}, +${mission.reward.research || 0} pesquisa, +${mission.reward.reputation || 0} reputação.</p>
        <button class="primary" type="button" data-action="claim-mission" data-mission="${mission.id}" ${complete && !claimed ? '' : 'disabled'}>${claimed ? 'Concluída' : 'Resgatar'}</button>
      </article>`;
  }).join('');
}

function plantSvg(crop) {
  const c = crop.color;
  const a = crop.accent;
  const dark = shade(c, -22);
  const light = shade(c, 20);
  const seed = Math.abs(hashCode(crop.id));
  const rotate = (seed % 17) - 8;

  if (crop.type === 'root') {
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">
      <ellipse cx="50" cy="78" rx="28" ry="8" fill="rgba(0,0,0,.18)" />
      <path d="M50 23c-9 11-21 21-21 40 0 17 10 27 21 27s21-10 21-27c0-19-12-29-21-40Z" fill="${c}" stroke="${dark}" stroke-width="3" />
      <path d="M50 31c-7 11-12 20-10 34 2 11 7 17 10 19" fill="none" stroke="${light}" stroke-width="3" stroke-linecap="round" opacity=".55" />
      <path d="M50 28c-4-13-16-13-25-10 7 2 11 7 14 13-8-7-18-7-26-3 9 3 17 9 23 17" fill="${a}" stroke="${shade(a, -18)}" stroke-width="2" stroke-linejoin="round" />
      <path d="M51 28c6-13 18-13 27-9-8 2-13 7-16 14 8-7 18-7 27-1-10 2-18 8-24 16" fill="${shade(a, -8)}" stroke="${shade(a, -26)}" stroke-width="2" stroke-linejoin="round" />
    </svg>`;
  }

  if (crop.type === 'leaf') {
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">
      <ellipse cx="50" cy="82" rx="30" ry="7" fill="rgba(0,0,0,.18)" />
      <path d="M50 83V44" stroke="${dark}" stroke-width="7" stroke-linecap="round" />
      <path d="M47 50C23 44 15 29 21 15c19 0 30 11 34 33-2 2-4 2-8 2Z" fill="${c}" stroke="${dark}" stroke-width="3" />
      <path d="M55 56c24-6 32-21 26-35-19 0-31 11-35 33 2 2 5 3 9 2Z" fill="${light}" stroke="${dark}" stroke-width="3" />
      <path d="M50 78c-19-5-28-17-26-31 17-1 27 8 33 26-2 3-4 4-7 5Z" fill="${shade(c, 8)}" stroke="${dark}" stroke-width="3" />
    </svg>`;
  }

  if (crop.type === 'grain' || crop.type === 'fiber') {
    const cotton = crop.type === 'fiber';
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">
      <ellipse cx="50" cy="84" rx="28" ry="8" fill="rgba(0,0,0,.18)" />
      <path d="M50 84c0-30 0-48 1-68" stroke="${shade(a, -25)}" stroke-width="6" stroke-linecap="round" />
      ${cotton
        ? `<circle cx="39" cy="37" r="13" fill="${c}" stroke="${shade(c, -12)}" stroke-width="3"/><circle cx="57" cy="29" r="14" fill="${shade(c, 10)}" stroke="${shade(c, -12)}" stroke-width="3"/><circle cx="62" cy="49" r="13" fill="${c}" stroke="${shade(c, -12)}" stroke-width="3"/>`
        : `<path d="M51 19c-15 9-17 23-11 34 14-7 18-21 11-34Z" fill="${c}" stroke="${dark}" stroke-width="3"/><path d="M54 30c17 5 22 18 18 31-16-4-23-17-18-31Z" fill="${shade(c, 10)}" stroke="${dark}" stroke-width="3"/><path d="M46 49c-15 6-21 18-17 30 15-4 22-16 17-30Z" fill="${shade(c, -4)}" stroke="${dark}" stroke-width="3"/>`}
      <path d="M52 51c-13 4-20 13-22 25" stroke="${shade(a, -25)}" stroke-width="4" stroke-linecap="round" />
      <path d="M52 44c15 4 22 13 24 26" stroke="${shade(a, -25)}" stroke-width="4" stroke-linecap="round" />
    </svg>`;
  }

  if (crop.type === 'tree' || crop.type === 'tropical' || crop.type === 'beverage') {
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">
      <ellipse cx="51" cy="83" rx="30" ry="8" fill="rgba(0,0,0,.18)" />
      <path d="M50 84c-3-17-1-34 5-51" stroke="#7b4c2b" stroke-width="9" stroke-linecap="round" />
      <path d="M54 46c-14-19-33-17-44-5 15 8 29 9 44 5Z" fill="${a}" stroke="${shade(a, -24)}" stroke-width="3" />
      <path d="M56 39c10-22 31-22 41-10-12 11-26 16-41 10Z" fill="${shade(a, -5)}" stroke="${shade(a, -26)}" stroke-width="3" />
      <g transform="rotate(${rotate} 50 55)">
        <circle cx="50" cy="55" r="17" fill="${c}" stroke="${dark}" stroke-width="3" />
        <ellipse cx="43" cy="49" rx="6" ry="9" fill="${light}" opacity=".45" />
        ${crop.type === 'beverage' ? `<circle cx="57" cy="59" r="5" fill="${shade(c, -30)}" opacity=".75" />` : ''}
      </g>
    </svg>`;
  }

  if (crop.type === 'bush') {
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">
      <ellipse cx="50" cy="83" rx="31" ry="8" fill="rgba(0,0,0,.18)" />
      <path d="M49 80V43" stroke="${shade(a, -35)}" stroke-width="6" stroke-linecap="round" />
      <circle cx="35" cy="52" r="18" fill="${a}" stroke="${shade(a, -25)}" stroke-width="3" />
      <circle cx="58" cy="43" r="22" fill="${shade(a, -6)}" stroke="${shade(a, -25)}" stroke-width="3" />
      <circle cx="66" cy="64" r="17" fill="${a}" stroke="${shade(a, -25)}" stroke-width="3" />
      <circle cx="42" cy="51" r="6" fill="${c}" stroke="${dark}" stroke-width="2" />
      <circle cx="59" cy="39" r="6" fill="${shade(c, 8)}" stroke="${dark}" stroke-width="2" />
      <circle cx="68" cy="64" r="6" fill="${shade(c, -4)}" stroke="${dark}" stroke-width="2" />
    </svg>`;
  }

  return `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">
    <ellipse cx="50" cy="82" rx="30" ry="8" fill="rgba(0,0,0,.18)" />
    <path d="M50 81c0-24 0-39 1-58" stroke="${shade(a, -28)}" stroke-width="7" stroke-linecap="round" />
    <path d="M50 58c-20 0-28-16-22-31 18 0 29 12 22 31Z" fill="${a}" stroke="${shade(a, -25)}" stroke-width="3" />
    <path d="M53 52c20 0 28-16 22-31-18 0-29 12-22 31Z" fill="${shade(a, -8)}" stroke="${shade(a, -25)}" stroke-width="3" />
    <circle cx="52" cy="58" r="18" fill="${c}" stroke="${dark}" stroke-width="3" />
    <ellipse cx="46" cy="51" rx="6" ry="9" fill="${light}" opacity=".45" />
  </svg>`;
}

function seasonSvg(type, color) {
  if (type === 'sun') {
    return `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="15" fill="${color}"/><g stroke="${color}" stroke-width="6" stroke-linecap="round"><path d="M40 6v10M40 64v10M6 40h10M64 40h10M16 16l7 7M57 57l7 7M64 16l-7 7M23 57l-7 7"/></g></svg>`;
  }
  if (type === 'snow') {
    return `<svg viewBox="0 0 80 80"><g stroke="${color}" stroke-width="5" stroke-linecap="round"><path d="M40 9v62M13 25l54 30M67 25 13 55M25 16l15 9 15-9M25 64l15-9 15 9"/></g></svg>`;
  }
  if (type === 'leaf') {
    return `<svg viewBox="0 0 80 80"><path d="M64 10C31 12 12 29 12 54c24 6 48-8 52-44Z" fill="${color}"/><path d="M16 59c17-19 29-29 46-43" fill="none" stroke="#3b2112" stroke-width="5" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 80 80"><path d="M41 69V39" stroke="#2d7a46" stroke-width="7" stroke-linecap="round"/><path d="M39 41C17 38 10 24 16 11c18 0 27 11 29 29-2 1-4 2-6 1Z" fill="${color}"/><path d="M44 47c22-3 29-17 23-30-18 0-28 11-30 29 2 1 4 2 7 1Z" fill="#a4f08c"/></svg>`;
}

function renderStaticIcons() {
  $('.coin-svg').innerHTML = `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="47" rx="22" ry="8" fill="#b87819"/><ellipse cx="32" cy="39" rx="22" ry="8" fill="#f2a529"/><ellipse cx="32" cy="31" rx="22" ry="8" fill="#ffcc61"/><path d="M23 30c5 4 13 4 18 0" fill="none" stroke="#7c4a0e" stroke-width="4" stroke-linecap="round"/></svg>`;
  $('.research-svg').innerHTML = `<svg viewBox="0 0 64 64"><path d="M25 8h14v22l13 20c3 5 0 9-6 9H18c-6 0-9-4-6-9l13-20V8Z" fill="#65d9ff" stroke="#184a5a" stroke-width="4"/><path d="M21 45h22" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`;
  $('.rep-svg').innerHTML = `<svg viewBox="0 0 64 64"><path d="m32 6 8 16 18 3-13 12 3 18-16-8-16 8 3-18L6 25l18-3 8-16Z" fill="#ffdf6e" stroke="#7a4b12" stroke-width="4"/></svg>`;
}

function setupFilters() {
  const options = Object.entries(CATEGORIES).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  ui.categoryFilter.insertAdjacentHTML('beforeend', options);
}

function setupEvents() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(item => item.classList.remove('active'));
      $$('.view').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      $(`#${tab.dataset.view}`).classList.add('active');
      render(true);
    });
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'buy-crop') buyCrop(button.dataset.crop);
    if (action === 'upgrade-crop') upgradeCrop(button.dataset.crop);
    if (action === 'sell-crop') sellCrop(button.dataset.crop, 1);
    if (action === 'complete-contract') completeContract(button.dataset.contract);
    if (action === 'buy-global-upgrade') buyGlobalUpgrade(button.dataset.upgrade);
    if (action === 'claim-mission') claimMission(button.dataset.mission);
  });

  ui.searchCrop.addEventListener('input', () => render(true));
  ui.categoryFilter.addEventListener('change', () => render(true));
  ui.sortMode.addEventListener('change', () => render(true));

  $('#sellAllUnlocked').addEventListener('click', sellAllUnlocked);
  $('#rerollContracts').addEventListener('click', rerollContracts);
  $('#saveNow').addEventListener('click', () => saveState(true));
  $('#exportSave').addEventListener('click', exportSave);
  $('#importSave').addEventListener('click', importSave);
  $('#resetGame').addEventListener('click', resetGame);
}

function exportSave() {
  saveState(false);
  ui.saveBox.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  ui.saveBox.select();
  toast('Save exportado para a caixa de texto.');
}

function importSave() {
  const raw = ui.saveBox.value.trim();
  if (!raw) return toast('Cole um save exportado antes de importar.');

  try {
    const imported = JSON.parse(decodeURIComponent(escape(atob(raw))));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    state = loadState();
    toast('Save importado com sucesso.');
    render(true);
  } catch (error) {
    toast('Não foi possível importar esse save.');
  }
}

function resetGame() {
  const ok = confirm('Resetar todo o progresso da fazenda?');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = createState();
  state.contracts = createContracts(state, 5);
  toast('Jogo resetado.');
  render(true);
}

function gameLoop(now) {
  const dt = Math.min(2, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  advanceSeason(state, dt);
  produce(state, dt);
  tickContracts(state, dt);
  render(false);

  if (now - lastSave > TICK_SAVE_EVERY) {
    saveState(false);
    lastSave = now;
  }

  requestAnimationFrame(gameLoop);
}

function formatNumber(value) {
  const n = Number(value) || 0;
  if (n < 1000) return String(Math.floor(n));
  const units = ['', 'k', 'mi', 'bi', 'tri'];
  const tier = Math.min(units.length - 1, Math.floor(Math.log10(Math.abs(n)) / 3));
  return `${(n / Math.pow(1000, tier)).toFixed(n >= 10000 ? 1 : 2).replace(/\.0+$/, '')}${units[tier]}`;
}

function formatMoney(value) {
  return `${formatNumber(Math.floor(value))} moedas`;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min <= 0) return `${sec}s`;
  return `${min}m ${String(sec).padStart(2, '0')}s`;
}

function currencyLabel(currency) {
  if (currency === 'research') return 'pesquisa';
  if (currency === 'reputation') return 'reputação';
  return 'moedas';
}

function normalize(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function hexToRgba(hex, alpha) {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed.length === 3 ? parsed.split('').map(char => char + char).join('') : parsed, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex, percent) {
  const parsed = hex.replace('#', '');
  const n = parseInt(parsed.length === 3 ? parsed.split('').map(char => char + char).join('') : parsed, 16);
  const amount = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function boot() {
  renderStaticIcons();
  setupFilters();
  setupEvents();
  rerollMarketDemand(state);
  if (!state.contracts.length) state.contracts = createContracts(state, 5);
  render(true);
  requestAnimationFrame(gameLoop);
}

boot();
