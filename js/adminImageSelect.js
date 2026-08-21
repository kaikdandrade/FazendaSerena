"use strict";
(() => {
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const instances = new WeakMap();
  const liveInstances = new Set();
  let active = null;

  const picker = document.createElement("dialog");
  picker.className = "admin-image-picker-dialog admin-image-picker-dialog-r29";
  picker.setAttribute("aria-labelledby", "adminImagePickerTitle");
  picker.innerHTML = `<div class="admin-image-picker-shell">
    <header class="admin-image-picker-head">
      <div><small>Biblioteca local</small><h2 id="adminImagePickerTitle">Selecionar imagem</h2></div>
      <button class="admin-image-picker-close" type="button" aria-label="Fechar">×</button>
    </header>
    <label class="admin-image-picker-search"><span>Buscar imagem</span><input autocomplete="off" type="search" placeholder="Digite para filtrar..."></label>
    <div class="admin-image-picker-options" role="listbox"></div>
  </div>`;
  document.body.appendChild(picker);

  const pickerSearch = picker.querySelector('input[type="search"]');
  const pickerOptions = picker.querySelector(".admin-image-picker-options");
  const pickerTitle = picker.querySelector("h2");

  function closePicker({ restoreFocus = true } = {}) {
    const previous = active;
    if (picker.open) picker.close();
    previous?.trigger?.setAttribute("aria-expanded", "false");
    active = null;
    if (restoreFocus && previous?.trigger?.isConnected) {
      try { previous.trigger.focus({ preventScroll: true }); } catch {}
    }
  }

  class ImageSelect {
    constructor(select) {
      this.select = select;
      this.select.classList.add("admin-image-select-native");
      this.root = document.createElement("div");
      this.root.className = "admin-image-select";
      this.root.innerHTML = `<button class="admin-image-select-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">
        <img alt=""><span><strong></strong><small>Selecionar imagem</small></span><i aria-hidden="true">›</i>
      </button>`;
      select.insertAdjacentElement("afterend", this.root);
      this.trigger = this.root.querySelector(".admin-image-select-trigger");
      this.trigger.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        this.open();
      });
      this.select.addEventListener("change", () => this.renderSelected());
      this.renderSelected();
      instances.set(select, this);
      liveInstances.add(this);
    }

    options() {
      return [...this.select.options].filter(option => option.value);
    }

    renderSelected() {
      const selected = this.select.options[this.select.selectedIndex];
      const image = this.trigger.querySelector("img");
      image.src = selected?.value || "assets/logo.webp";
      image.alt = selected?.textContent?.trim() || "Imagem selecionada";
      this.trigger.querySelector("strong").textContent = selected?.textContent?.trim() || "Selecionar imagem";
    }

    renderPicker(query = "") {
      const term = String(query || "").trim().toLocaleLowerCase("pt-BR");
      const options = this.options().filter(option => {
        const haystack = `${option.textContent || ""} ${option.value || ""}`.toLocaleLowerCase("pt-BR");
        return !term || haystack.includes(term);
      });
      pickerOptions.innerHTML = options.length ? options.map(option => {
        const selected = option.value === this.select.value;
        return `<button type="button" role="option" aria-selected="${String(selected)}" class="${selected ? "is-selected" : ""}" data-image-select-value="${escapeHtml(option.value)}">
          <img loading="lazy" src="${escapeHtml(option.value)}" alt=""><span>${escapeHtml(option.textContent?.trim() || option.value)}</span>${selected ? "<b>Selecionado</b>" : ""}
        </button>`;
      }).join("") : '<div class="admin-image-select-empty">Nenhuma imagem encontrada.</div>';
    }

    open() {
      if (!this.select.isConnected || !this.root.isConnected) return;
      if (active && active !== this) closePicker({ restoreFocus: false });
      active = this;
      const label = this.select.closest("[data-admin-field-key], label, section")?.querySelector(":scope > span")?.textContent?.trim();
      pickerTitle.textContent = label || "Selecionar imagem";
      pickerSearch.value = "";
      this.renderPicker();
      this.trigger.setAttribute("aria-expanded", "true");
      // Um <dialog>.showModal() sempre entra na Top Layer do navegador. Portanto
      // funciona igual dentro de "Adicionar planta", outros modais, com scroll
      // ou em viewport pequeno sem cálculo manual de left/top.
      if (!picker.open) picker.showModal();
      requestAnimationFrame(() => {
        try { pickerSearch.focus({ preventScroll: true }); } catch {}
      });
    }

    choose(value) {
      const option = this.options().find(item => item.value === value);
      if (!option) return;
      this.select.value = value;
      this.renderSelected();
      this.select.dispatchEvent(new Event("input", { bubbles: true }));
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
      closePicker();
    }

    rebuild() {
      this.renderSelected();
      if (active === this && picker.open) this.renderPicker(pickerSearch.value);
    }

    destroy() {
      if (active === this) closePicker({ restoreFocus: false });
      this.root.remove();
      liveInstances.delete(this);
      instances.delete(this.select);
    }
  }

  pickerSearch.addEventListener("input", () => active?.renderPicker(pickerSearch.value));
  pickerOptions.addEventListener("click", event => {
    const button = event.target.closest("[data-image-select-value]");
    if (!button || !active) return;
    event.preventDefault();
    active.choose(button.dataset.imageSelectValue || "");
  });
  picker.querySelector(".admin-image-picker-close").addEventListener("click", () => closePicker());
  picker.addEventListener("click", event => {
    const shell = picker.querySelector(".admin-image-picker-shell");
    if (event.target === picker && shell && !shell.contains(event.target)) closePicker();
  });
  picker.addEventListener("cancel", event => {
    event.preventDefault();
    closePicker();
  });
  picker.addEventListener("close", () => {
    if (!active) return;
    active.trigger?.setAttribute("aria-expanded", "false");
    active = null;
  });

  window.AdminImageSelect = Object.freeze({
    enhance(container = document) {
      [...liveInstances].forEach(instance => {
        if (!instance.select.isConnected) instance.destroy();
      });
      container.querySelectorAll?.("select[data-image-select]").forEach(select => {
        const current = instances.get(select);
        if (current) current.rebuild();
        else new ImageSelect(select);
      });
    },
    refresh(select) { instances.get(select)?.rebuild(); },
    close: closePicker
  });
})();
