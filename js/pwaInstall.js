"use strict";

(() => {
  let deferredInstallPrompt = null;
  const installButtons = [...document.querySelectorAll("[data-pwa-install]")];
  const status = document.getElementById("pwaInstallStatus");
  const dialog = document.getElementById("pwaInstallDialog");
  const dialogBody = document.getElementById("pwaInstallDialogBody");
  const platformCards = [...document.querySelectorAll("[data-platform-card]")];

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  const isStandalone = () => window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;

  function currentPlatform() {
    if (isIOS) return "ios";
    if (isAndroid) return "android";
    if (!isMobile) return "desktop";
    return "browser";
  }

  function markPlatform() {
    const platform = currentPlatform();
    platformCards.forEach(card => card.classList.toggle("is-current-platform", card.dataset.platformCard === platform));
  }

  function setStatus(message, state = "ready") {
    if (!status) return;
    status.dataset.state = state;
    const text = status.querySelector("span:last-child");
    if (text) text.textContent = message;
  }

  function dialogHtml(kind) {
    if (kind === "ios") {
      return `
        <ol class="pwa-install-steps">
          <li><strong>Abra esta página no Safari.</strong><span>O iPhone/iPad instala aplicativos web pelo menu do Safari.</span></li>
          <li><strong>Toque em Compartilhar.</strong><span>Use o botão de compartilhamento do navegador.</span></li>
          <li><strong>Escolha “Adicionar à Tela de Início”.</strong><span>Confirme o nome Fazenda Serena e toque em Adicionar.</span></li>
          <li><strong>Abra pelo novo ícone.</strong><span>O jogo será iniciado em modo aplicativo e entrará diretamente em <code>play.html</code>.</span></li>
        </ol>`;
    }
    if (kind === "android") {
      return `
        <ol class="pwa-install-steps">
          <li><strong>Abra esta página no Chrome ou navegador compatível.</strong></li>
          <li><strong>Abra o menu do navegador.</strong><span>Procure por “Instalar app” ou “Adicionar à tela inicial”.</span></li>
          <li><strong>Confirme a instalação.</strong><span>O ícone da Fazenda Serena aparecerá junto aos seus aplicativos.</span></li>
        </ol>`;
    }
    return `
      <ol class="pwa-install-steps">
        <li><strong>Use Chrome, Edge ou outro navegador compatível com instalação de PWA.</strong></li>
        <li><strong>Procure o ícone de instalação na barra de endereço.</strong><span>Também pode aparecer no menu em “Apps” ou “Instalar Fazenda Serena”.</span></li>
        <li><strong>Confirme.</strong><span>O jogo passará a abrir em uma janela própria, como um aplicativo do computador.</span></li>
      </ol>`;
  }

  function showInstructions(kind) {
    if (!dialog || !dialogBody) return;
    dialogBody.innerHTML = dialogHtml(kind);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  async function requestInstall(kind) {
    if (isStandalone()) {
      setStatus("A Fazenda Serena já está instalada neste dispositivo.", "installed");
      return;
    }

    const platform = currentPlatform();
    if (kind === "ios") {
      showInstructions("ios");
      return;
    }
    if (kind === "android" && platform !== "android") {
      showInstructions("android");
      return;
    }
    if (kind === "desktop" && platform !== "desktop") {
      showInstructions("desktop");
      return;
    }

    if (!deferredInstallPrompt) {
      showInstructions(platform === "android" ? "android" : platform === "ios" ? "ios" : "desktop");
      return;
    }

    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setStatus("Instalação iniciada. O jogo será aberto como aplicativo.", "installed");
      } else {
        setStatus("Instalação cancelada. Você pode tentar novamente quando quiser.", "ready");
      }
    } catch (error) {
      console.warn("Não foi possível abrir o instalador da PWA:", error);
      showInstructions(platform === "android" ? "android" : "desktop");
    } finally {
      deferredInstallPrompt = null;
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (currentPlatform() === "android") setStatus("Este Android pode instalar a Fazenda Serena diretamente.", "available");
    else setStatus("Este computador pode instalar a Fazenda Serena como aplicativo.", "available");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setStatus("Fazenda Serena instalada com sucesso.", "installed");
    document.documentElement.dataset.pwaInstalled = "true";
  });

  installButtons.forEach(button => button.addEventListener("click", () => requestInstall(button.dataset.pwaInstall)));

  markPlatform();
  if (isStandalone()) {
    setStatus("Você já está usando a Fazenda Serena em modo aplicativo.", "installed");
    document.documentElement.dataset.pwaInstalled = "true";
  } else if (isIOS) {
    setStatus("No iPhone/iPad, use “Adicionar à Tela de Início” para instalar.", "available");
  } else if (isAndroid) {
    setStatus("Se o instalador automático não aparecer, use “Instalar app” no menu do navegador.", "ready");
  } else {
    setStatus("Em navegadores compatíveis, use “Instalar no computador” para criar o aplicativo.", "ready");
  }
})();
