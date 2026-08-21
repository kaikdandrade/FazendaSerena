"use strict";

(() => {
  const safeIndex = value => Math.max(0, Math.floor(Number(value) || 0));
  const safeCategoryIndex = value => Math.max(0, Math.floor(Number(value) || 0));
  const finitePow10 = exponent => Math.pow(10, Math.min(295, Math.max(-295, Number(exponent) || 0)));
  const categoryFactor = categoryIndex => 1 + Math.min(30, safeCategoryIndex(categoryIndex)) * 0.12;

  // Economia idle: a ordem da cultura define o salto econômico principal e a
  // categoria faz apenas um ajuste moderado. Isso evita que uma cultura nova
  // custe quase o mesmo que dezenas de níveis da cultura anterior.
  const basePrice = (value, categoryIndex = 0) => {
    const index = safeIndex(value);
    const exponent = 0.58 * index + 0.0095 * index * index;
    return Math.max(1, 5 * finitePow10(exponent) * categoryFactor(categoryIndex));
  };

  const purchaseCost = (value, categoryIndex = 0) => {
    const index = safeIndex(value);
    if (index === 0) return 100;
    const gate = 4000 * Math.pow(1.25, Math.min(index, 24));
    return Math.max(100, basePrice(index - 1, categoryIndex) * gate);
  };

  const upgradeBase = (value, categoryIndex = 0) => {
    const index = safeIndex(value);
    if (index === 0) return 140;
    return Math.max(140, purchaseCost(index, categoryIndex) * 0.12);
  };

  const baseYield = (value, categoryIndex = 0) => {
    const index = safeIndex(value);
    const yieldValue = 2 * (1 + safeCategoryIndex(categoryIndex) * 0.10) * Math.pow(1.08, Math.min(index, 180));
    return Math.max(1, Math.round(yieldValue * 100) / 100);
  };

  // Aprimorar uma cultura melhora os três pilares do idle: tempo, quantidade
  // por ciclo e valor unitário. Isso permite sentir progresso no início sem
  // tornar as últimas culturas triviais antes dos prestígios e legados.
  const levelValueMultiplier = levelValue => {
    const level = Math.max(1, Math.min(500, Math.floor(Number(levelValue) || 1)));
    const steps = Math.floor((level - 1) / 25);
    return Math.pow(1.018, level - 1) * (1 + steps * 0.06);
  };

  const levelYieldMultiplier = levelValue => {
    const level = Math.max(1, Math.min(500, Math.floor(Number(levelValue) || 1)));
    const steps = Math.floor((level - 1) / 25);
    return Math.pow(1.022, level - 1) * (1 + steps * 0.05);
  };

  Object.defineProperty(window, "FazendaSerenaCropEconomy", {
    value: Object.freeze({ purchaseCost, upgradeBase, basePrice, baseYield, levelValueMultiplier, levelYieldMultiplier }),
    configurable: false,
    enumerable: true,
    writable: false
  });
})();
