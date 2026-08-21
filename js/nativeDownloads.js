"use strict";
(() => {
  const windowsButton = document.querySelector('[data-native-download="windows"]');

  async function chooseWindowsFile() {
    if (!windowsButton || !/Windows/i.test(navigator.userAgent || "")) return;
    try {
      const data = navigator.userAgentData;
      if (!data?.getHighEntropyValues) return;
      const values = await data.getHighEntropyValues(["architecture"]);
      if (/arm/i.test(values.architecture || "")) {
        windowsButton.href = "downloads/FazendaSerena-Setup-arm64.exe";
      }
    } catch (_) {}
  }

  chooseWindowsFile();
})();
