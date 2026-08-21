"use strict";
(() => {
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const instances = new WeakMap();
  const allInstances = new Set();
  let activeInstance = null;

  class ImageSelect {
    constructor(select) {
      this.select = select;
      select.classList.add("admin-image-select-native");
      this.root = document.createElement("div");
      this.root.className = "admin-image-select";
      this.root.innerHTML = `<button class="admin-image-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false"><img alt=""><span><strong></strong><small>Selecionar imagem</small></span><i aria-hidden="true">⌄</i></button>`;
      select.insertAdjacentElement("afterend", this.root);
      this.trigger = this.root.querySelector(".admin-image-select-trigger");
      this.popover = document.createElement("div");
      this.popover.className = "admin-image-select-popover";
      this.popover.innerHTML = `<label class="admin-image-select-search"><span>Buscar</span><input autocomplete="off" type="search" placeholder="Digite para filtrar..."></label><div class="admin-image-select-options" role="listbox"></div>`;
      this.supportsPopover = typeof this.popover.showPopover === "function";
      if (this.supportsPopover) this.popover.setAttribute("popover", "manual"); else this.popover.hidden = true;
      this.host = select.closest("dialog") || document.body;
      this.host.appendChild(this.popover);
      this.optionsRoot = this.popover.querySelector(".admin-image-select-options");
      this.search = this.popover.querySelector(".admin-image-select-search input");

      this.trigger.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); this.toggle(); });
      this.search.addEventListener("input", () => this.filter(this.search.value));
      this.optionsRoot.addEventListener("click", event => {
        const button = event.target.closest("[data-image-select-value]");
        if (!button) return;
        event.preventDefault(); event.stopPropagation();
        this.select.value = button.dataset.imageSelectValue || "";
        this.select.dispatchEvent(new Event("input", { bubbles: true }));
        this.select.dispatchEvent(new Event("change", { bubbles: true }));
        this.renderSelected(); this.close();
      });
      this.select.addEventListener("change", () => this.renderSelected());
      this.rebuild(); instances.set(select, this); allInstances.add(this);
    }
    rebuild() {
      const options = [...this.select.options].filter(option => option.value);
      this.optionsRoot.innerHTML = options.length ? options.map(option => `<button type="button" role="option" data-image-select-value="${escapeHtml(option.value)}" data-image-select-label="${escapeHtml(option.textContent)}"><img loading="lazy" src="${escapeHtml(option.value)}" alt=""><span>${escapeHtml(option.textContent)}</span></button>`).join("") : '<div class="admin-image-select-empty">Nenhuma imagem disponível.</div>';
      this.renderSelected();
    }
    renderSelected() {
      const selected = this.select.options[this.select.selectedIndex];
      this.trigger.querySelector("img").src = selected?.value || "assets/logo.webp";
      this.trigger.querySelector("strong").textContent = selected?.textContent || "Selecionar imagem";
      this.optionsRoot.querySelectorAll("[data-image-select-value]").forEach(button => {
        const active = button.dataset.imageSelectValue === this.select.value;
        button.classList.toggle("is-selected", active); button.setAttribute("aria-selected", String(active));
      });
    }
    filter(query) {
      const term = String(query || "").trim().toLocaleLowerCase("pt-BR");
      this.optionsRoot.querySelectorAll("[data-image-select-value]").forEach(button => { button.hidden = Boolean(term) && !String(button.dataset.imageSelectLabel || "").toLocaleLowerCase("pt-BR").includes(term); });
    }
    isVisible() { return activeInstance === this; }
    placePopover() {
      if (!this.isVisible() || !this.trigger.isConnected) return;
      const rect = this.trigger.getBoundingClientRect();
      const gutter = 10, vw = Math.max(320, window.innerWidth || 0), vh = Math.max(320, window.innerHeight || 0);
      const width = Math.min(Math.max(rect.width, 460), vw - gutter * 2);
      const below = vh - rect.bottom - gutter - 6, above = rect.top - gutter - 6;
      const openBelow = below >= 280 || below >= above;
      const maxHeight = Math.min(500, Math.max(190, openBelow ? below : above));
      const left = Math.max(gutter, Math.min(rect.left, vw - width - gutter));
      const top = openBelow ? rect.bottom + 6 : Math.max(gutter, rect.top - maxHeight - 6);
      Object.assign(this.popover.style, { position:"fixed", left:`${left}px`, top:`${Math.min(top, vh-maxHeight-gutter)}px`, right:"auto", bottom:"auto", width:`${width}px`, maxWidth:`${vw-gutter*2}px`, maxHeight:`${maxHeight}px`, margin:"0", transform:"none" });
      this.optionsRoot.style.maxHeight = `${Math.max(120, maxHeight - 62)}px`;
    }
    open() {
      if (activeInstance && activeInstance !== this) activeInstance.close();
      activeInstance = this; this.root.classList.add("is-open"); this.trigger.setAttribute("aria-expanded","true"); this.search.value=""; this.filter("");
      if (this.supportsPopover) { try { this.popover.showPopover(); } catch (_) { this.popover.hidden=false; } } else this.popover.hidden=false;
      requestAnimationFrame(() => { this.placePopover(); try { this.search.focus({preventScroll:true}); } catch (_) { this.search.focus(); } });
    }
    close() {
      this.root.classList.remove("is-open"); this.trigger.setAttribute("aria-expanded","false");
      if (this.supportsPopover) { try { if (this.popover.matches(":popover-open")) this.popover.hidePopover(); } catch (_) { this.popover.hidden=true; } } else this.popover.hidden=true;
      if (activeInstance === this) activeInstance = null;
    }
    toggle() { this.isVisible() ? this.close() : this.open(); }
    destroy() { this.close(); this.popover.remove(); allInstances.delete(this); }
  }
  document.addEventListener("click", event => { if (activeInstance && !activeInstance.root.contains(event.target) && !activeInstance.popover.contains(event.target)) activeInstance.close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape") activeInstance?.close(); });
  window.addEventListener("resize", () => activeInstance?.placePopover(), {passive:true});
  document.addEventListener("scroll", event => { if (activeInstance && !activeInstance.popover.contains(event.target)) requestAnimationFrame(() => activeInstance?.placePopover()); }, {capture:true, passive:true});
  document.addEventListener("close", event => { if (event.target instanceof HTMLDialogElement && activeInstance && event.target.contains(activeInstance.select)) activeInstance.close(); }, true);
  window.AdminImageSelect = Object.freeze({
    enhance(container=document) {
      [...allInstances].forEach(instance => { if (!instance.select.isConnected) instance.destroy(); });
      container.querySelectorAll?.("select[data-image-select]").forEach(select => { const old=instances.get(select); if(old) old.rebuild(); else new ImageSelect(select); });
    },
    refresh(select) { instances.get(select)?.rebuild(); }
  });
})();
