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
{ id: 'algodao', name: 'Algodão', type: 'fiber', industry: 'Indústria Têxtil', color: '#f8f8f0', accent: '#97d58b', basePrice: 382, baseGrowth: 41.4, baseYield: 2, best: ['winter', 'summer'] },
  { id: 'repolho', name: 'Repolho', type: 'leaf', industry: 'Conservas Verdes', color: '#8fdc73', accent: '#dfffd1', basePrice: 420, baseGrowth: 42.8, baseYield: 2, best: ['winter', 'autumn'] },
  { id: 'espinafre', name: 'Espinafre', type: 'leaf', industry: 'Mix Nutritivo', color: '#2b9a52', accent: '#b9f1a7', basePrice: 462, baseGrowth: 44.2, baseYield: 2, best: ['winter', 'spring'] },
  { id: 'couve', name: 'Couve', type: 'leaf', industry: 'Verdes Funcionais', color: '#3ba85a', accent: '#c9ffa0', basePrice: 508, baseGrowth: 45.8, baseYield: 2, best: ['winter', 'autumn'] },
  { id: 'brocolis', name: 'Brócolis', type: 'leaf', industry: 'Legumes Premium', color: '#4ea64e', accent: '#bce685', basePrice: 559, baseGrowth: 47.3, baseYield: 2, best: ['winter', 'autumn'] },
  { id: 'couve-flor', name: 'Couve-flor', type: 'leaf', industry: 'Congelados Nobres', color: '#f2efe2', accent: '#8ad067', basePrice: 615, baseGrowth: 49.0, baseYield: 2, best: ['winter'] },
  { id: 'mandioca', name: 'Mandioca', type: 'root', industry: 'Farinhas da Roça', color: '#c49d73', accent: '#9fd46b', basePrice: 677, baseGrowth: 50.8, baseYield: 2, best: ['summer', 'autumn'] },
  { id: 'rabanete', name: 'Rabanete', type: 'root', industry: 'Conservas Crocantes', color: '#db4a74', accent: '#7ed95f', basePrice: 744, baseGrowth: 52.6, baseYield: 2, best: ['spring', 'winter'] },
  { id: 'ervilha', name: 'Ervilha', type: 'vine', industry: 'Vegetais Enlatados', color: '#5fba57', accent: '#d8ff8a', basePrice: 818, baseGrowth: 54.5, baseYield: 2, best: ['spring', 'winter'] },
  { id: 'soja', name: 'Soja', type: 'grain', industry: 'Proteína Vegetal', color: '#dfcf7b', accent: '#85c765', basePrice: 900, baseGrowth: 56.5, baseYield: 2, best: ['summer', 'autumn'] },
  { id: 'trigo', name: 'Trigo', type: 'grain', industry: 'Moinhos Dourados', color: '#efc95a', accent: '#88c567', basePrice: 990, baseGrowth: 58.6, baseYield: 2, best: ['autumn', 'winter'] },
  { id: 'aveia', name: 'Aveia', type: 'grain', industry: 'Cereais Matinais', color: '#d7c07f', accent: '#95cf74', basePrice: 1089, baseGrowth: 60.8, baseYield: 2, best: ['winter'] },
  { id: 'tangerina', name: 'Tangerina', type: 'tree', industry: 'Cítricos Doces', color: '#ff9d42', accent: '#72c85a', basePrice: 1198, baseGrowth: 63.2, baseYield: 2, best: ['winter', 'summer'] },
  { id: 'acerola', name: 'Acerola', type: 'bush', industry: 'Vitaminas Naturais', color: '#df3340', accent: '#82d95b', basePrice: 1318, baseGrowth: 65.7, baseYield: 2, best: ['spring', 'summer'] },
  { id: 'figo', name: 'Figo', type: 'tree', industry: 'Doces Artesanais', color: '#7f3f95', accent: '#7ec36f', basePrice: 1450, baseGrowth: 68.3, baseYield: 2, best: ['summer', 'autumn'] },
  { id: 'ameixa', name: 'Ameixa', type: 'tree', industry: 'Compotas Roxas', color: '#7f2d80', accent: '#9fd66b', basePrice: 1595, baseGrowth: 71.0, baseYield: 2, best: ['spring', 'autumn'] },
  { id: 'framboesa', name: 'Framboesa', type: 'bush', industry: 'Geleias Finas', color: '#d93c74', accent: '#94dd68', basePrice: 1755, baseGrowth: 73.8, baseYield: 2, best: ['spring', 'winter'] }
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

const RESEARCH_TECHS = [
  { id: 'genetics', name: 'Genética de sementes', desc: '+7% produção por colheita por nível.', max: 16, baseCost: 2, growth: 1.48 },
  { id: 'hydroponics', name: 'Hidroponia modular', desc: '+6% velocidade de crescimento por nível.', max: 16, baseCost: 2, growth: 1.52 },
  { id: 'seedBank', name: 'Banco de germoplasma', desc: 'Reduz custo de compra e upgrade das plantas.', max: 14, baseCost: 3, growth: 1.58 },
  { id: 'seasonalAnalytics', name: 'Mapeamento sazonal', desc: 'Melhora safras fortes e suaviza penalidades fora de época.', max: 12, baseCost: 3, growth: 1.62 },
  { id: 'marketData', name: 'Análise de mercado', desc: '+4% preço de venda por nível.', max: 18, baseCost: 4, growth: 1.55 },
  { id: 'contractAI', name: 'IA de contratos', desc: 'Aumenta valor e recompensas dos contratos industriais.', max: 14, baseCost: 5, growth: 1.66 },
  { id: 'storageScience', name: 'Ciência de armazenamento', desc: '+40 de estoque máximo por planta por nível.', max: 15, baseCost: 4, growth: 1.57 },
  { id: 'prestigeTheory', name: 'Teoria de prestígio', desc: '+8% pontos de prestígio estimados por nível.', max: 12, baseCost: 7, growth: 1.74 }
];

const PRESTIGE_UPGRADES = [
  { id: 'seedCapital', name: 'Capital ancestral', desc: '+250 moedas iniciais após cada prestígio por nível.', max: 20, baseCost: 1, growth: 1.45 },
  { id: 'rootMemory', name: 'Memória das raízes', desc: 'Começa cada ciclo com +1 planta inicial comprada por nível.', max: 12, baseCost: 2, growth: 1.62 },
  { id: 'greenLegacy', name: 'Legado verde', desc: '+4% crescimento e +3% produção por nível.', max: 20, baseCost: 1, growth: 1.58 },
  { id: 'merchantCrown', name: 'Coroa mercante', desc: '+5% valor de venda comum e industrial por nível.', max: 18, baseCost: 2, growth: 1.64 },
  { id: 'industrySeal', name: 'Selo industrial', desc: '+6% multiplicador de contratos por nível.', max: 16, baseCost: 2, growth: 1.68 },
  { id: 'academyLegacy', name: 'Academia permanente', desc: '+10% pesquisa recebida em contratos por nível e +1 pesquisa inicial.', max: 12, baseCost: 3, growth: 1.72 },
  { id: 'seasonCrown', name: 'Coroa das estações', desc: 'Suaviza penalidades sazonais e amplia safras fortes.', max: 12, baseCost: 3, growth: 1.7 },
  { id: 'storageLegacy', name: 'Celeiro eterno', desc: '+50 de limite de estoque por planta por nível.', max: 18, baseCost: 2, growth: 1.58 }
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
  researchTechList: $('#researchTechList'),
  prestigeDashboard: $('#prestigeDashboard'),
  prestigeUpgradeList: $('#prestigeUpgradeList'),
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
    prestigePoints: 0,
    lifetimePrestigePoints: 0,
    totalPrestiges: 0,
    seasonIndex: 0,
    seasonTime: 0,
    crops: Object.fromEntries(CROPS.map((crop, index) => [crop.id, defaultCropState(crop, index)])),
    upgrades: Object.fromEntries(GLOBAL_UPGRADES.map(up => [up.id, 0])),
    researchTechs: Object.fromEntries(RESEARCH_TECHS.map(up => [up.id, 0])),
    prestigeUpgrades: Object.fromEntries(PRESTIGE_UPGRADES.map(up => [up.id, 0])),
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
    researchTechs: { ...fresh.researchTechs, ...(parsed.researchTechs || {}) },
    prestigeUpgrades: { ...fresh.prestigeUpgrades, ...(parsed.prestigeUpgrades || {}) },
    prestigePoints: Number(parsed.prestigePoints || 0),
    lifetimePrestigePoints: Number(parsed.lifetimePrestigePoints || 0),
    totalPrestiges: Number(parsed.totalPrestiges || 0),
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
  const seasonalAnalytics = getResearchLevel('seasonalAnalytics', targetState);
  const seasonCrown = getPrestigeLevel('seasonCrown', targetState);
  const softener = Math.min(0.42, greenhouse * 0.018 + seasonalAnalytics * 0.018 + seasonCrown * 0.022);
  let speed = 1;
  let yieldBonus = 1;
  let label = 'Neutro';

  if (crop.best.includes(season.id) || season.goodTypes.includes(crop.type)) {
    speed += 0.20 + greenhouse * 0.006 + seasonalAnalytics * 0.008 + seasonCrown * 0.01;
    yieldBonus += 0.18 + greenhouse * 0.004 + seasonalAnalytics * 0.006 + seasonCrown * 0.008;
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
  const hydroponics = getResearchLevel('hydroponics', targetState);
  const greenLegacy = getPrestigeLevel('greenLegacy', targetState);
  const levelSpeed = Math.max(0, data.level - 1) * 0.055;
  const speed = seasonEffect.speed + irrigation * 0.08 + hydroponics * 0.06 + greenLegacy * 0.04 + levelSpeed;
  return Math.max(1.2, crop.baseGrowth / speed);
}

function getYield(crop, targetState = state) {
  const data = targetState.crops[crop.id];
  const seasonEffect = getSeasonEffect(crop, targetState);
  const fertilizer = targetState.upgrades.fertilizer || 0;
  const genetics = getResearchLevel('genetics', targetState);
  const greenLegacy = getPrestigeLevel('greenLegacy', targetState);
  const levelYield = Math.max(0, data.level - 1) * 0.18;
  return crop.baseYield * seasonEffect.yieldBonus * (1 + fertilizer * 0.10 + genetics * 0.07 + greenLegacy * 0.03 + levelYield);
}

function getStorageCap(cropId, targetState = state) {
  const warehouse = targetState.upgrades.warehouse || 0;
  const storageScience = getResearchLevel('storageScience', targetState);
  const storageLegacy = getPrestigeLevel('storageLegacy', targetState);
  return 90 + warehouse * 70 + storageScience * 40 + storageLegacy * 50 + Math.max(0, targetState.crops[cropId].level - 1) * 9;
}

function getSalePrice(crop, targetState = state) {
  const season = currentSeason(targetState);
  const logistics = targetState.upgrades.logistics || 0;
  const marketData = getResearchLevel('marketData', targetState);
  const merchantCrown = getPrestigeLevel('merchantCrown', targetState);
  const demand = targetState.crops[crop.id].demand || 1;
  const seasonPrice = season.priceTypes[crop.type] || 1;
  const repBonus = 1 + Math.min(0.3, targetState.reputation * 0.004);
  return crop.basePrice * demand * seasonPrice * (1 + logistics * 0.07 + marketData * 0.04 + merchantCrown * 0.05) * repBonus;
}

function getBuyCost(crop, targetState = state) {
  const lab = targetState.upgrades.lab || 0;
  const seedBank = getResearchLevel('seedBank', targetState);
  return Math.max(0, Math.ceil(crop.cost * (1 - Math.min(0.52, lab * 0.018 + seedBank * 0.02))));
}

function getCropUpgradeCost(crop, targetState = state) {
  const level = targetState.crops[crop.id].level;
  const lab = targetState.upgrades.lab || 0;
  const seedBank = getResearchLevel('seedBank', targetState);
  const base = Math.max(35, crop.cost + crop.basePrice * 18);
  return Math.ceil(base * Math.pow(1.38, Math.max(0, level - 1)) * (1 - Math.min(0.48, lab * 0.016 + seedBank * 0.018)));
}

function getGlobalUpgradeCost(upgrade, targetState = state) {
  const level = targetState.upgrades[upgrade.id] || 0;
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

function getResearchLevel(id, targetState = state) {
  return Number(targetState.researchTechs?.[id] || 0);
}

function getPrestigeLevel(id, targetState = state) {
  return Number(targetState.prestigeUpgrades?.[id] || 0);
}

function getResearchTechCost(tech, targetState = state) {
  const level = getResearchLevel(tech.id, targetState);
  return Math.ceil(tech.baseCost * Math.pow(tech.growth, level));
}

function getPrestigeUpgradeCost(upgrade, targetState = state) {
  const level = getPrestigeLevel(upgrade.id, targetState);
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

function getPrestigeEstimate(targetState = state) {
  const metrics = getMetrics(targetState);
  const coinScore = Math.sqrt(Math.max(0, targetState.stats.coinsEarned || 0) / 24000);
  const plantScore = metrics.ownedCount / 8;
  const contractScore = (targetState.stats.contractsCompleted || 0) / 7;
  const levelScore = metrics.maxCropLevel / 11;
  const harvestScore = Math.sqrt(Math.max(0, targetState.stats.totalHarvested || 0) / 900);
  const theoryBonus = 1 + getResearchLevel('prestigeTheory', targetState) * 0.08;
  const raw = Math.max(0, coinScore + plantScore + contractScore + levelScore + harvestScore - 2.5);
  const gain = Math.floor(raw * theoryBonus);
  return {
    gain,
    raw,
    theoryBonus,
    nextHint: Math.max(24000, Math.pow(Math.ceil(raw + 1) + 2.5, 2) * 24000)
  };
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

function buyResearchTech(techId) {
  const tech = RESEARCH_TECHS.find(item => item.id === techId);
  if (!tech) return;
  const level = getResearchLevel(tech.id);
  if (level >= tech.max) return toast(`${tech.name} já está no nível máximo.`);

  const cost = getResearchTechCost(tech);
  if (state.research < cost) return toast(`Pesquisa insuficiente para ${tech.name}.`);

  state.research -= cost;
  state.researchTechs[tech.id] = level + 1;
  addLog(`Pesquisa concluída: ${tech.name} nível ${level + 1}.`);
  toast(`${tech.name} pesquisada!`);
  render(true);
}

function buyPrestigeUpgrade(upgradeId) {
  const upgrade = PRESTIGE_UPGRADES.find(item => item.id === upgradeId);
  if (!upgrade) return;
  const level = getPrestigeLevel(upgrade.id);
  if (level >= upgrade.max) return toast(`${upgrade.name} já está no nível máximo.`);

  const cost = getPrestigeUpgradeCost(upgrade);
  if (state.prestigePoints < cost) return toast(`Pontos de prestígio insuficientes para ${upgrade.name}.`);

  state.prestigePoints -= cost;
  state.prestigeUpgrades[upgrade.id] = level + 1;
  addLog(`Legado aprimorado: ${upgrade.name} nível ${level + 1}.`);
  toast(`${upgrade.name} comprado!`);
  render(true);
}

function performPrestige() {
  const estimate = getPrestigeEstimate();
  if (estimate.gain < 1) return toast('Sua fazenda ainda não gera prestígio. Expanda, venda e complete contratos.');

  const ok = confirm(`Realizar prestígio agora e ganhar ${estimate.gain} ponto(s)? A fazenda reinicia, mas os upgrades de prestígio permanecem.`);
  if (!ok) return;

  const prestigeUpgrades = { ...state.prestigeUpgrades };
  const totalPrestiges = (state.totalPrestiges || 0) + 1;
  const prestigePoints = (state.prestigePoints || 0) + estimate.gain;
  const lifetimePrestigePoints = (state.lifetimePrestigePoints || 0) + estimate.gain;
  const seedCapital = Number(prestigeUpgrades.seedCapital || 0);
  const rootMemory = Number(prestigeUpgrades.rootMemory || 0);
  const academyLegacy = Number(prestigeUpgrades.academyLegacy || 0);

  const fresh = createState();
  fresh.prestigeUpgrades = prestigeUpgrades;
  fresh.prestigePoints = prestigePoints;
  fresh.lifetimePrestigePoints = lifetimePrestigePoints;
  fresh.totalPrestiges = totalPrestiges;
  fresh.coins = 120 + seedCapital * 250;
  fresh.research = academyLegacy;
  fresh.stats.coinsEarned = fresh.coins;
  fresh.logs = [`Prestígio ${totalPrestiges} realizado! Legado recebido: +${estimate.gain} ponto(s).`];

  const remembered = Math.min(CROPS.length, 1 + rootMemory);
  for (let i = 0; i < remembered; i++) {
    const crop = CROPS[i];
    fresh.crops[crop.id].owned = true;
    fresh.crops[crop.id].level = 1;
  }

  fresh.contracts = createContracts(fresh, 5);
  state = fresh;
  saveState(false);
  toast(`Prestígio realizado: +${estimate.gain} ponto(s)!`);
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
    const contractAI = getResearchLevel('contractAI', targetState);
    const industrySeal = getPrestigeLevel('industrySeal', targetState);
    const merchantCrown = getPrestigeLevel('merchantCrown', targetState);
    const multiplier = Number((1.22 + Math.random() * 0.58 + (targetState.upgrades.contracts || 0) * 0.09 + contractAI * 0.08 + industrySeal * 0.06).toFixed(2));
    const value = Math.floor(qty * getSalePrice(crop, targetState) * multiplier * (1 + merchantCrown * 0.02));
    const buyer = crop.industry;
    const researchReward = Math.max(1, Math.floor((1 + Math.floor(Math.random() * 2)) * (1 + contractAI * 0.08 + getPrestigeLevel('academyLegacy', targetState) * 0.10)));
    contracts.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      cropId: crop.id,
      qty,
      multiplier,
      value,
      buyer,
      research: researchReward,
      reputation: Math.random() > .55 ? 1 + Math.floor(contractAI / 6) : 0,
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

function getMetrics(targetState = state) {
  const cropStates = CROPS.map(crop => targetState.crops[crop.id]);
  return {
    ownedCount: cropStates.filter(item => item.owned).length,
    totalStock: cropStates.reduce((sum, item) => sum + item.stock, 0),
    contractsCompleted: targetState.stats.contractsCompleted,
    maxCropLevel: Math.max(...cropStates.map(item => item.level || 0)),
    coinsEarned: targetState.stats.coinsEarned
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
  renderResearchTechs();
  renderMissions();
  renderPrestige();
}

function updateCounters() {
  $('[data-counter="coins"]').textContent = formatNumber(state.coins);
  $('[data-counter="research"]').textContent = formatNumber(state.research);
  $('[data-counter="reputation"]').textContent = formatNumber(state.reputation);
  $('[data-counter="prestigePoints"]').textContent = formatNumber(state.prestigePoints || 0);
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
  $('[data-stat="prestiges"]').textContent = formatNumber(state.totalPrestiges || 0);
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
        <div class="crop-icon" aria-hidden="true">${cropImage(crop)}</div>
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

function renderResearchTechs() {
  ui.researchTechList.innerHTML = RESEARCH_TECHS.map(tech => {
    const level = getResearchLevel(tech.id);
    const cost = getResearchTechCost(tech);
    const maxed = level >= tech.max;
    const canBuy = !maxed && state.research >= cost;

    return `
      <article class="research-card">
        <div class="upgrade-head">
          <div>
            <h3>${tech.name}</h3>
            <p>${tech.desc}</p>
          </div>
          <span class="badge ${maxed ? 'good' : ''}">Nv. ${level}/${tech.max}</span>
        </div>
        <div class="upgrade-lines">
          <div class="upgrade-line"><span>Custo</span><strong>${maxed ? 'Máximo' : `${formatNumber(cost)} pesquisa`}</strong></div>
        </div>
        <button class="secondary" type="button" data-action="buy-research-tech" data-tech="${tech.id}" ${canBuy ? '' : 'disabled'}>${maxed ? 'Pesquisada' : 'Pesquisar'}</button>
      </article>`;
  }).join('');
}

function renderPrestige() {
  const estimate = getPrestigeEstimate();
  const metrics = getMetrics();
  ui.prestigeDashboard.innerHTML = `
    <article class="prestige-panel prestige-hero">
      <div>
        <p class="eyebrow">legado atual</p>
        <h3>${formatNumber(state.prestigePoints || 0)} ponto(s) disponíveis</h3>
        <p>Ao prestigiar, moedas, plantas, upgrades comuns, pesquisas, missões e contratos reiniciam. Seus pontos e upgrades de prestígio ficam para sempre.</p>
      </div>
      <button class="prestige-button" type="button" data-action="perform-prestige" ${estimate.gain > 0 ? '' : 'disabled'}>Prestigiar +${formatNumber(estimate.gain)}</button>
    </article>
    <article class="prestige-panel"><span>Ganho estimado</span><strong>+${formatNumber(estimate.gain)}</strong><small>Teoria: x${estimate.theoryBonus.toFixed(2)}</small></article>
    <article class="prestige-panel"><span>Prestígios</span><strong>${formatNumber(state.totalPrestiges || 0)}</strong><small>Total vitalício: ${formatNumber(state.lifetimePrestigePoints || 0)} pts</small></article>
    <article class="prestige-panel"><span>Base atual</span><strong>${formatNumber(metrics.ownedCount)}/${CROPS.length}</strong><small>${formatNumber(state.stats.contractsCompleted)} contratos · nível máx. ${formatNumber(metrics.maxCropLevel)}</small></article>
  `;

  ui.prestigeUpgradeList.innerHTML = PRESTIGE_UPGRADES.map(upgrade => {
    const level = getPrestigeLevel(upgrade.id);
    const cost = getPrestigeUpgradeCost(upgrade);
    const maxed = level >= upgrade.max;
    const canBuy = !maxed && (state.prestigePoints || 0) >= cost;

    return `
      <article class="prestige-upgrade-card">
        <div class="upgrade-head">
          <div>
            <h3>${upgrade.name}</h3>
            <p>${upgrade.desc}</p>
          </div>
          <span class="badge ${maxed ? 'good' : 'prestige-badge'}">Nv. ${level}/${upgrade.max}</span>
        </div>
        <div class="upgrade-lines">
          <div class="upgrade-line"><span>Custo</span><strong>${maxed ? 'Máximo' : `${formatNumber(cost)} prestígio`}</strong></div>
        </div>
        <button class="prestige-action" type="button" data-action="buy-prestige-upgrade" data-prestige="${upgrade.id}" ${canBuy ? '' : 'disabled'}>${maxed ? 'Eterno' : 'Comprar legado'}</button>
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


function cropImage(crop) {
  const label = escapeHtml(crop.name);
  return `<img src="img/${crop.id}.svg" alt="${label}" loading="lazy" width="80" height="80">`;
}

function plantSvg(crop) {
  const c = crop.color;
  const a = crop.accent;
  const dark = shade(c, -28);
  const darker = shade(c, -42);
  const light = shade(c, 24);
  const accentDark = shade(a, -30);
  const accentLight = shade(a, 18);
  const uid = `plant-${crop.id.replace(/[^a-z0-9-]/gi, '')}`;
  const defs = `
    <defs>
      <linearGradient id="${uid}-body" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${light}"/>
        <stop offset=".48" stop-color="${c}"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <linearGradient id="${uid}-accent" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${accentLight}"/>
        <stop offset="1" stop-color="${a}"/>
      </linearGradient>
      <radialGradient id="${uid}-shine" cx="35%" cy="28%" r="62%">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".72"/>
        <stop offset=".42" stop-color="#ffffff" stop-opacity=".18"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <filter id="${uid}-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#03130b" flood-opacity=".35"/>
      </filter>
    </defs>`;

  const wrap = body => `<svg viewBox="0 0 100 100" role="img" aria-label="${crop.name}">${defs}<ellipse cx="50" cy="86" rx="31" ry="7" fill="rgba(0,0,0,.22)"/>${body}</svg>`;
  const veins = (x1 = 50, y1 = 22, x2 = 50, y2 = 76) => `<path d="M${x1} ${y1}C${x1 - 7} ${y1 + 20} ${x2 + 7} ${y2 - 20} ${x2} ${y2}" fill="none" stroke="${darker}" stroke-width="2.3" stroke-linecap="round" opacity=".55"/>`;
  const leaves = `<g filter="url(#${uid}-shadow)">
    <path d="M45 39C20 34 13 18 21 8c19 2 30 13 33 31-2 2-5 2-9 0Z" fill="url(#${uid}-accent)" stroke="${accentDark}" stroke-width="2.4"/>
    <path d="M55 41C80 35 87 20 79 10c-19 1-31 12-35 30 3 2 7 3 11 1Z" fill="${accentLight}" stroke="${accentDark}" stroke-width="2.4"/>
    <path d="M50 50c-13-13-25-25-31-36M51 49c13-14 23-25 30-36" fill="none" stroke="${accentDark}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
  </g>`;
  const fruitStem = `<path d="M50 36c3-9 9-15 18-18" fill="none" stroke="#6f4c25" stroke-width="5" stroke-linecap="round"/>`;
  const seedDots = (points, color = '#fff7c9', opacity = '.75') => points.map(([x, y, r = 1.5]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`).join('');

  switch (crop.id) {
    case 'folha':
    case 'alface':
      return wrap(`<g filter="url(#${uid}-shadow)">
        <path d="M50 84c-16-4-27-17-25-34 12-1 21 5 27 18 5-17 17-27 33-26 2 19-11 35-32 42Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <path d="M49 83c-19-6-35-20-35-42 18-1 31 12 39 37" fill="${accentLight}" stroke="${accentDark}" stroke-width="2.6" opacity=".88"/>
        <path d="M53 82c18-7 31-22 32-43-17 1-30 14-36 38" fill="${c}" stroke="${dark}" stroke-width="2.6" opacity=".9"/>
        ${veins(50, 43, 50, 82)}
      </g>`);

    case 'cebola':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M50 30c-14 13-24 25-24 41 0 14 10 21 24 21s24-7 24-21c0-16-10-28-24-41Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <path d="M37 53c-3 12-1 25 5 33M50 38c-4 15-4 34 0 50M63 53c3 12 1 25-5 33" fill="none" stroke="#fff7da" stroke-width="2" opacity=".52"/>
      </g>`);

    case 'alho':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M32 52c-8 13-5 32 8 37 5-11 5-26-8-37Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="2.6"/>
        <path d="M50 39c-13 14-16 37 0 51 16-14 13-37 0-51Z" fill="${light}" stroke="${dark}" stroke-width="2.6"/>
        <path d="M68 52c8 13 5 32-8 37-5-11-5-26 8-37Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="2.6"/>
        <path d="M50 47v38" stroke="#fff" stroke-width="2" opacity=".45"/>
      </g>`);

    case 'cenoura':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M50 31c-12 9-21 20-17 36l14 25c2 4 5 4 7 0l14-25c4-16-5-27-18-36Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <path d="M40 56h18M42 68h13M45 79h8" stroke="${darker}" stroke-width="2.2" stroke-linecap="round" opacity=".45"/>
      </g>`);

    case 'batata':
    case 'batata-doce':
    case 'beterraba':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M30 59c2-17 16-25 31-20 15 5 22 20 14 34-8 15-31 21-45 9-7-6-8-15 0-23Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <circle cx="45" cy="57" r="2.4" fill="${darker}" opacity=".35"/><circle cx="60" cy="69" r="2" fill="${darker}" opacity=".35"/><circle cx="39" cy="76" r="1.8" fill="${darker}" opacity=".35"/>
        ${crop.id === 'beterraba' ? '<path d="M49 41c-5 13-4 27 3 42" fill="none" stroke="#ffd6e6" stroke-width="2" opacity=".55"/>' : ''}
      </g>`);

    case 'tomate':
    case 'pimentao':
    case 'pimenta':
    case 'berinjela':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M50 30v15" stroke="#5d7f36" stroke-width="5" stroke-linecap="round"/>
        ${crop.id === 'pimenta'
          ? `<path d="M47 42c20 9 22 27 2 45-7-15-13-31-2-45Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>`
          : crop.id === 'berinjela'
            ? `<path d="M52 40c18 13 18 41-2 49-21-8-21-36 2-49Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/><ellipse cx="45" cy="54" rx="5" ry="10" fill="url(#${uid}-shine)"/>`
            : crop.id === 'pimentao'
              ? `<path d="M50 41c18 0 27 14 23 29-4 14-16 20-23 15-7 5-19-1-23-15-4-15 5-29 23-29Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/><path d="M50 43c-7 13-7 27 0 41" fill="none" stroke="${darker}" stroke-width="2" opacity=".4"/>`
              : `<circle cx="50" cy="64" r="22" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/><path d="M34 53c10-4 22-4 32 0" stroke="${darker}" stroke-width="2" opacity=".25"/>`}
      </g>`);

    case 'banana':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)" stroke="${dark}" stroke-width="3" stroke-linecap="round">
        <path d="M35 43c-3 21 7 37 29 43-17-18-21-34-14-48" fill="url(#${uid}-body)"/>
        <path d="M44 39c-1 20 9 33 28 39-13-16-15-30-7-42" fill="${light}"/>
        <path d="M28 48c0 18 11 33 31 40-14-18-17-31-9-43" fill="${shade(c, -5)}"/>
      </g>`);

    case 'melao':
    case 'melancia':
    case 'abobora':
    case 'pepino':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M23 65c0-16 12-28 28-28s28 12 28 28-12 25-28 25-28-9-28-25Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        ${crop.id === 'pepino' ? `<ellipse cx="51" cy="64" rx="16" ry="28" transform="rotate(75 51 64)" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>` : ''}
        <path d="M38 40c-9 15-9 32 0 47M51 37c-5 17-5 35 0 52M64 42c8 14 8 29 0 44" fill="none" stroke="${crop.id === 'melancia' ? '#123d24' : darker}" stroke-width="2.3" opacity=".45"/>
        ${crop.id === 'melancia' ? `<path d="M31 68c12 7 28 8 43 1" stroke="${a}" stroke-width="5" stroke-linecap="round" opacity=".7"/>` : ''}
      </g>`);

    case 'uva':
    case 'mirtilo':
    case 'amora':
    case 'cereja':
    case 'morango':
      if (crop.id === 'morango') {
        return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
          <path d="M50 41c19 0 27 15 17 31L51 92 34 72c-10-16-3-31 16-31Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
          ${seedDots([[43,56,1.4],[55,56,1.4],[38,68,1.3],[50,70,1.3],[62,68,1.3],[46,80,1.2],[56,81,1.2]], '#ffe98b', '.9')}
        </g>`);
      }
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <path d="M50 30c5 14-4 24-13 33" fill="none" stroke="#6f4c25" stroke-width="4" stroke-linecap="round"/>
        <g stroke="${dark}" stroke-width="2.3">
          <circle cx="42" cy="47" r="9" fill="url(#${uid}-body)"/><circle cx="55" cy="47" r="9" fill="${light}"/><circle cx="35" cy="61" r="9" fill="${shade(c, -4)}"/><circle cx="50" cy="62" r="10" fill="url(#${uid}-body)"/><circle cx="64" cy="62" r="9" fill="${light}"/><circle cx="43" cy="77" r="9" fill="${shade(c, -6)}"/><circle cx="57" cy="77" r="9" fill="url(#${uid}-body)"/>
        </g>
        ${crop.id === 'cereja' ? `<path d="M42 47C38 33 49 27 56 22M55 47c2-14 11-18 18-20" fill="none" stroke="#6f4c25" stroke-width="3"/>` : ''}
      </g>`);

    case 'kiwi':
    case 'limao':
    case 'laranja':
    case 'maca':
    case 'pera':
    case 'pessego':
    case 'goiaba':
    case 'manga':
    case 'abacate':
    case 'caju':
    case 'carambola':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        ${fruitStem}
        ${crop.id === 'pera'
          ? `<path d="M50 38c15 10 20 36 5 50-17 8-34-5-31-23 1-10 8-16 15-20 2-4 5-6 11-7Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>`
          : crop.id === 'carambola'
            ? `<path d="M50 36 58 53l19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-17Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>`
            : crop.id === 'caju'
              ? `<path d="M47 38c17 8 23 27 11 42-16 16-37 5-34-14 1-14 10-23 23-28Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/><path d="M64 74c8 1 12 8 8 14-8 4-17 0-19-8 2-4 5-6 11-6Z" fill="${a}" stroke="${accentDark}" stroke-width="3"/>`
              : crop.id === 'abacate'
                ? `<path d="M50 35c19 12 23 38 6 52-18 10-35-3-31-23 2-12 11-23 25-29Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/><circle cx="50" cy="67" r="9" fill="${a}" stroke="${accentDark}" stroke-width="2"/>`
                : crop.id === 'kiwi'
                  ? `<circle cx="50" cy="64" r="25" fill="${a}" stroke="${accentDark}" stroke-width="3"/><circle cx="50" cy="64" r="18" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="2"/>${seedDots([[50,45,1],[61,50,1],[68,62,1],[63,75,1],[50,82,1],[37,76,1],[32,63,1],[38,50,1]], '#1d2617', '.85')}`
                  : `<circle cx="50" cy="64" r="24" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>`}
        <ellipse cx="42" cy="55" rx="7" ry="11" fill="url(#${uid}-shine)"/>
      </g>`);

    case 'maracuja':
    case 'pitaya':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <circle cx="50" cy="64" r="25" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        ${crop.id === 'pitaya'
          ? `<path d="M29 54 16 46l13-3M72 54l13-8-12-4M37 84l-5 13 12-7M64 83l7 12 4-14" fill="${a}" stroke="${accentDark}" stroke-width="2" stroke-linejoin="round"/>`
          : `<circle cx="50" cy="64" r="15" fill="${a}" stroke="${accentDark}" stroke-width="2"/>${seedDots([[45,59,1.6],[54,59,1.6],[50,67,1.6],[43,70,1.2],[58,70,1.2]], '#2a1735', '.9')}`}
      </g>`);

    case 'abacaxi':
      return wrap(`<g filter="url(#${uid}-shadow)">
        <path d="M50 39C35 24 31 12 38 6c8 7 11 16 12 28 3-14 10-25 20-27 4 13-3 25-20 32Z" fill="url(#${uid}-accent)" stroke="${accentDark}" stroke-width="2.5"/>
        <path d="M31 51c0-15 9-23 20-23s20 8 20 23v19c0 14-9 22-20 22s-20-8-20-22V51Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <path d="M34 48h34M32 60h38M34 72h34M39 37l26 48M63 37 37 85" stroke="${darker}" stroke-width="2" opacity=".42"/>
      </g>`);

    case 'coco':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)">
        <circle cx="50" cy="65" r="25" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <circle cx="43" cy="58" r="3" fill="${darker}"/><circle cx="55" cy="58" r="3" fill="${darker}"/><circle cx="50" cy="68" r="3" fill="${darker}"/>
        <path d="M33 77c10 8 25 8 35 0" stroke="${light}" stroke-width="3" opacity=".45" fill="none"/>
      </g>`);

    case 'milho':
      return wrap(`<g filter="url(#${uid}-shadow)">
        <path d="M50 84V19" stroke="${accentDark}" stroke-width="6" stroke-linecap="round"/>
        <path d="M49 77C27 67 24 45 35 28c15 8 20 26 14 49Z" fill="url(#${uid}-accent)" stroke="${accentDark}" stroke-width="3"/>
        <path d="M53 78c22-10 25-32 14-49-15 8-20 26-14 49Z" fill="${accentLight}" stroke="${accentDark}" stroke-width="3"/>
        <path d="M50 23c13 11 18 34 7 58H43c-11-24-6-47 7-58Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/>
        <path d="M43 39h14M41 51h18M42 63h16M47 29v50M54 31v47" stroke="${darker}" stroke-width="1.8" opacity=".38"/>
      </g>`);

    case 'guarana':
    case 'cafe':
    case 'feijao':
      return wrap(`${leaves}<g filter="url(#${uid}-shadow)" stroke="${dark}" stroke-width="2.6">
        <ellipse cx="39" cy="57" rx="12" ry="17" transform="rotate(-23 39 57)" fill="url(#${uid}-body)"/>
        <ellipse cx="60" cy="57" rx="12" ry="17" transform="rotate(23 60 57)" fill="${light}"/>
        <ellipse cx="50" cy="74" rx="13" ry="18" fill="${shade(c, -4)}"/>
        <path d="M39 45c4 7 4 16 0 25M60 45c-4 7-4 16 0 25M50 61c4 7 4 16 0 25" fill="none" stroke="${darker}" stroke-width="2" opacity=".55"/>
        ${crop.id === 'guarana' ? `<circle cx="39" cy="56" r="5" fill="#f8efe0"/><circle cx="39" cy="56" r="2.5" fill="#1f1715"/>` : ''}
      </g>`);

    case 'arroz':
    case 'algodao':
      return wrap(`<g filter="url(#${uid}-shadow)">
        <path d="M49 86c0-35 0-51 1-72" stroke="${accentDark}" stroke-width="5" stroke-linecap="round"/>
        <path d="M50 39c-17-7-25-18-22-31 15 2 24 11 28 30" fill="url(#${uid}-accent)" stroke="${accentDark}" stroke-width="2.4"/>
        <path d="M53 48c18-5 27-16 25-30-16 1-26 11-31 29" fill="${accentLight}" stroke="${accentDark}" stroke-width="2.4"/>
        ${crop.id === 'algodao'
          ? `<circle cx="38" cy="52" r="13" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="2.5"/><circle cx="56" cy="45" r="14" fill="${light}" stroke="${dark}" stroke-width="2.5"/><circle cx="64" cy="62" r="12" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="2.5"/>`
          : `<path d="M42 31c-8 12-6 24 5 34 8-12 6-25-5-34ZM59 39c9 11 9 24-1 35-9-11-9-24 1-35ZM43 59c-8 11-6 22 4 31 8-10 6-22-4-31Z" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="2.4"/>`}
      </g>`);
  }

  return wrap(`${leaves}<g filter="url(#${uid}-shadow)">${fruitStem}<circle cx="50" cy="64" r="24" fill="url(#${uid}-body)" stroke="${dark}" stroke-width="3"/><ellipse cx="42" cy="55" rx="7" ry="11" fill="url(#${uid}-shine)"/></g>`);
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
  $('.prestige-svg').innerHTML = `<svg viewBox="0 0 64 64"><defs><linearGradient id="prestigeMini" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".45" stop-color="#d99cff"/><stop offset="1" stop-color="#6de7ff"/></linearGradient></defs><path d="M32 5 45 25l14 7-14 7-13 20-13-20-14-7 14-7L32 5Z" fill="url(#prestigeMini)" stroke="#4b2673" stroke-width="4"/><circle cx="32" cy="32" r="7" fill="#fff" opacity=".8"/></svg>`;
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
    if (action === 'buy-research-tech') buyResearchTech(button.dataset.tech);
    if (action === 'buy-prestige-upgrade') buyPrestigeUpgrade(button.dataset.prestige);
    if (action === 'perform-prestige') performPrestige();
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
