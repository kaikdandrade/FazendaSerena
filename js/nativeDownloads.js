"use strict";

(() => {
  const status = document.getElementById("pwaInstallStatus");
  const windowsButton = document.querySelector('[data-native-download="windows"]');
  const androidButton = document.querySelector('[data-native-download="android"]');
  const androidDetail = document.querySelector('[data-native-detail="android"]');
  const windowsDetail = document.querySelector('[data-native-detail="windows"]');

  const ua = navigator.userAgent || "";
  const isWindows = /Windows/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  function setStatus(text, state = "ready") {
    if (!status) return;
    status.dataset.state = state;
    const node = status.querySelector("span:last-child");
    if (node) node.textContent = text;
  }

  async function selectWindowsDownload() {
    if (!windowsButton || !isWindows) return;
    let architecture = "x64";
    try {
      const uad = navigator.userAgentData;
      if (uad?.getHighEntropyValues) {
        const values = await uad.getHighEntropyValues(["architecture", "bitness"]);
        if (/arm/i.test(values.architecture || "")) architecture = "arm64";
        else if (values.bitness === "64") architecture = "x64";
      }
    } catch (_) {}
    windowsButton.href = architecture === "arm64"
      ? "downloads/FazendaSerena-Setup-arm64.exe"
      : "downloads/FazendaSerena-Setup-x64.exe";
    if (windowsDetail) windowsDetail.textContent = architecture === "arm64"
      ? "Windows ARM64 detectado · instalador por usuário"
      : "Windows x64 detectado · instalador por usuário · sem exigir administrador";
    setStatus("Seu Windows foi detectado. O instalador correto está pronto para download.", "available");
  }

  async function probeAndroidApk() {
    if (!androidButton) return;
    try {
      const response = await fetch(androidButton.getAttribute("href"), { method: "HEAD", cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      androidButton.classList.remove("is-unavailable");
      androidButton.removeAttribute("aria-disabled");
      androidButton.textContent = "Baixar APK para Android";
      if (androidDetail) androidDetail.textContent = "APK disponível · instalação direta no Android";
      if (isAndroid) setStatus("APK Android disponível. Baixe, instale e abra pelo ícone do jogo.", "available");
    } catch (_) {
      androidButton.classList.add("is-unavailable");
      androidButton.setAttribute("aria-disabled", "true");
      androidButton.textContent = "APK ainda não publicado";
      if (androidDetail) androidDetail.textContent = "Wrapper Android preparado; falta gerar e publicar o APK assinado.";
      androidButton.addEventListener("click", event => event.preventDefault(), { once: false });
    }
  }

  selectWindowsDownload();
  probeAndroidApk();
})();
