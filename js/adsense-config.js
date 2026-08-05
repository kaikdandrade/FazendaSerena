"use strict";

/*
 * Configuração pública do Google AdSense.
 *
 * 1. Depois que o AdSense fornecer o seu identificador, preencha publisherId
 *    com o valor completo no formato "ca-pub-0000000000000000".
 * 2. Para Anúncios automáticos, mantenha autoAds como true.
 * 3. Para usar a posição manual antes do rodapé, crie uma unidade responsiva
 *    no AdSense e informe o data-ad-slot em slots.footer.
 *
 * Enquanto os IDs estiverem vazios, nenhum script ou anúncio do AdSense será
 * carregado e o jogo continuará funcionando normalmente.
 */
window.ADSENSE_CONFIG = Object.freeze({
  publisherId: "",
  autoAds: true,
  slots: Object.freeze({
    footer: ""
  })
});
