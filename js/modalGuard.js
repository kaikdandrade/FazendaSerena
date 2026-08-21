"use strict";

(() => {
  const root = document.documentElement;
  let lockCount = 0;
  let savedScrollY = 0;
  let modalSequence = 0;

  const markDialogOrder = dialog => {
    if (!(dialog instanceof HTMLDialogElement)) return;
    dialog.dataset.modalOpenOrder = String(++modalSequence);
  };

  // A ordem visual de dialogs modais segue a ordem em que showModal() é chamado,
  // não a posição do elemento no HTML. Guardamos essa ordem para o bloqueador de
  // interação usar a mesma pilha do navegador.
  if (window.HTMLDialogElement?.prototype) {
    const proto = window.HTMLDialogElement.prototype;
    const nativeShowModal = proto.showModal;
    const nativeShow = proto.show;
    if (typeof nativeShowModal === "function" && !nativeShowModal.__fazendaSerenaWrapped) {
      const wrappedShowModal = function(...args) {
        markDialogOrder(this);
        return nativeShowModal.apply(this, args);
      };
      wrappedShowModal.__fazendaSerenaWrapped = true;
      proto.showModal = wrappedShowModal;
    }
    if (typeof nativeShow === "function" && !nativeShow.__fazendaSerenaWrapped) {
      const wrappedShow = function(...args) {
        markDialogOrder(this);
        return nativeShow.apply(this, args);
      };
      wrappedShow.__fazendaSerenaWrapped = true;
      proto.show = wrappedShow;
    }
  }

  const openDialogs = () => [...document.querySelectorAll("dialog[open]")];
  const dialogPriority = dialog => dialog?.id === "offlineProgressDialog" ? 1 : 0;
  const getTopDialog = dialogs => dialogs.reduce((top, dialog) => {
    if (!top) return dialog;
    const priority = dialogPriority(dialog) - dialogPriority(top);
    if (priority !== 0) return priority > 0 ? dialog : top;
    const order = Number(dialog.dataset.modalOpenOrder || 0) - Number(top.dataset.modalOpenOrder || 0);
    return order >= 0 ? dialog : top;
  }, null);

  const syncLock = () => {
    const dialogs = openDialogs();
    dialogs.forEach(dialog => {
      if (!dialog.dataset.modalOpenOrder) markDialogOrder(dialog);
    });
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
    const topDialog = getTopDialog(dialogs);
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
    const topDialog = getTopDialog(dialogs);
    if (!topDialog?.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });
  document.addEventListener("touchmove", event => {
    const dialogs = openDialogs();
    if (!dialogs.length) return;
    const topDialog = getTopDialog(dialogs);
    if (!topDialog?.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: false });

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      const dialog = record.target;
      if (dialog instanceof HTMLDialogElement && dialog.open && !dialog.dataset.modalOpenOrder) markDialogOrder(dialog);
      if (dialog instanceof HTMLDialogElement && !dialog.open) delete dialog.dataset.modalOpenOrder;
    });
    syncLock();
  });
  const start = () => {
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    document.querySelectorAll("dialog").forEach(dialog => {
      dialog.addEventListener("close", () => {
        delete dialog.dataset.modalOpenOrder;
        syncLock();
      });
      dialog.addEventListener("cancel", () => {
        queueMicrotask(syncLock);
      });
    });
    syncLock();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
