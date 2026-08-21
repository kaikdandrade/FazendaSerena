"use strict";

(() => {
  const root = document.documentElement;
  let lockCount = 0;
  let savedScrollY = 0;

  const openDialogs = () => [...document.querySelectorAll("dialog[open]")];
  const syncLock = () => {
    const dialogs = openDialogs();
    const shouldLock = dialogs.length > 0;
    if (shouldLock && lockCount === 0) {
      savedScrollY = window.scrollY || 0;
      root.classList.add("modal-open");
      document.body?.classList.add("modal-open");
      document.body?.style.setProperty("--modal-scroll-y", `${savedScrollY}px`);
    } else if (!shouldLock && lockCount > 0) {
      root.classList.remove("modal-open");
      document.body?.classList.remove("modal-open");
      document.body?.style.removeProperty("--modal-scroll-y");
      window.scrollTo(0, savedScrollY);
    }
    lockCount = dialogs.length;
  };

  const blockBackdropInteraction = event => {
    const dialogs = openDialogs();
    if (!dialogs.length) return;
    const topDialog = dialogs.at(-1);
    if (!topDialog) return;
    // Em showModal(), o clique no ::backdrop chega com target === dialog.
    // O segundo teste cobre o fallback antigo que apenas usa o atributo open.
    const clickedBackdrop = event.target === topDialog;
    const clickedOutside = !topDialog.contains(event.target);
    if (clickedBackdrop || clickedOutside) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  document.addEventListener("pointerdown", blockBackdropInteraction, true);
  document.addEventListener("click", blockBackdropInteraction, true);
  document.addEventListener("wheel", event => {
    const dialogs = openDialogs();
    if (!dialogs.length) return;
    const topDialog = dialogs.at(-1);
    if (!topDialog?.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });
  document.addEventListener("touchmove", event => {
    const dialogs = openDialogs();
    if (!dialogs.length) return;
    const topDialog = dialogs.at(-1);
    if (!topDialog?.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });

  const observer = new MutationObserver(syncLock);
  const start = () => {
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    document.querySelectorAll("dialog").forEach(dialog => {
      dialog.addEventListener("close", syncLock);
      dialog.addEventListener("cancel", event => {
        // Esc continua funcionando. Apenas o fundo do modal fica totalmente inerte.
        queueMicrotask(syncLock);
      });
    });
    syncLock();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
