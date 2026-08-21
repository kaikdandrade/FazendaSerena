"use strict";

(() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const autoId = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 64) || "item";
  const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  const setPath = (object, path, value) => { const keys = path.split("."); const last = keys.pop(); const parent = keys.reduce((target, key) => target[key] ||= {}, object); parent[last] = value; };
  const option = (value, label) => ({ value: String(value ?? ""), label: String(label ?? value ?? "") });
  const fixedOptions = values => values.map(([value, label]) => option(value, label));
  const catalogOptions = (name, mapper = item => option(item.id, item.name || item.label || item.title || item.id)) => window.AdminCatalogEditors?.options(name, mapper) || [];
  const assetOptions = kind => window.AdminAssetRegistry?.options(kind) || [];
  const automaticCropPurchaseCost = (index, categoryId = "") => { const categories = window.AdminCatalogEditors?.get?.("categories") || []; const categoryIndex = Math.max(0, categories.findIndex(item => item.id === categoryId)); return window.FazendaSerenaCropEconomy?.purchaseCost(index, categoryIndex) ?? 100; };

  const numberField = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });
  const percentField = (key, label, extra = {}) => numberField(key, label, { suffix: "%", ...extra });
  const imageField = (key, label, kind) => ({ key, label, type: "select", required: true, options: () => assetOptions(kind), preview: "image", emptyLabel: "Nenhuma imagem local disponível" });

  const metricOptions = fixedOptions([
    ["harvested", "Quantidade colhida"], ["owned", "Quantidade possuída"], ["cropPurchases", "Compras de plantas"], ["sold", "Itens vendidos"],
    ["cropLevels", "Níveis de plantas"], ["cropUpgrades", "Melhorias de plantas"], ["orders", "Pedidos entregues"], ["contracts", "Contratos concluídos"],
    ["maxCropLevel", "Maior nível de planta"], ["farmLevel", "Nível da fazenda"], ["stock", "Quantidade em estoque"], ["coinsEarned", "Moedas obtidas"],
    ["prestiges", "Prestígios realizados"], ["categorySold", "Itens vendidos por categoria"]
  ]);
  const rewardOptions = fixedOptions([["coins", "Moedas"], ["research", "Pesquisa"], ["prestige", "Prestígio"]]);
  const rewardSelectionLabel = value => {
    const selected = Array.isArray(value) ? value : [];
    return selected.length ? selected.map(key => rewardOptions.find(option => option.value === key)?.label || key).join(" + ") : "Sem recompensa de recursos";
  };
  const effectLabel = value => window.GameAdminConfig?.getEvolutionEffectOptions?.().find(option => option.value === value)?.label || "Bônus configurável";
  const eventTypeOptions = fixedOptions([["harvest", "Produção das safras"], ["xp", "Experiência (XP)"], ["research", "Pontos de pesquisa"], ["coins", "Moedas recebidas"]]);
  const effectOptions = () => [{ value: "", label: "Sem segundo bônus" }, ...(window.GameAdminConfig?.getEvolutionEffectOptions?.() || [])];

  function evolutionFields(prestige) {
    return [
      { key: "name", label: "Nome", type: "text", required: true },
      imageField("icon", "Ícone", "icone"),
      { key: "desc", label: "Descrição", type: "textarea", required: true },
      numberField("max", "Quantidade de níveis", { min: 1, integer: true, required: true }),
      numberField("baseCost", prestige ? "Custo inicial em prestígio" : "Custo inicial em pesquisa", { min: 0, required: true }),
      numberField("growth", "Multiplicador de crescimento do custo", { min: 0.01, required: true }),
      { key: "stageCosts", label: "Custos exatos por estágio (opcional)", type: "text", placeholder: "5, 10, 25, 50", transform: "numberArray", help: "Se preenchido, cada posição define o custo exato daquele estágio e substitui a progressão automática de custo." },
      { key: "bonuses", label: "Bônus concedidos", type: "effects", required: true, help: "Adicione quantos bônus forem necessários. Cada bônus pode ter um valor fixo por nível ou valores específicos para cada estágio." }
    ];
  }

  const schemas = {
    pointTypes: { label: "tipo de ponto", idSource: "key", idTarget: "key", title: item => item.key ? `[[${item.key}]]` : "Novo tipo de ponto", subtitle: item => item.icon || "Ícone não definido", fields: [
      { key: "key", label: "Chave", type: "text", required: true, placeholder: "coin", transform: "slug" }, imageField("icon", "Ícone", "icone")
    ]},
    categories: { label: "categoria", idSource: "name", title: item => item.name || "Nova categoria", subtitle: item => `${item.baseGrowth || 0}s por ciclo`, fields: [
      { key: "name", label: "Nome da categoria", type: "text", required: true },
      numberField("baseGrowth", "Tempo para produção (segundos)", { min: 0.01, required: true, defaultValue: 0 })
    ] },
    crops: { label: "planta", idSource: "name", title: item => item.name || "Nova planta", subtitle: (item, index) => `${item.category || "sem categoria"} · nível ${item.unlockLevel || 1} · compra ${automaticCropPurchaseCost(index, item.category)}`, fields: [
      { key: "name", label: "Nome da planta", type: "text", required: true },
      { key: "category", label: "Categoria", type: "select", required: true, options: () => catalogOptions("categories"), emptyLabel: "Cadastre uma categoria primeiro" },
      imageField("image", "Imagem da planta", "planta"),
      numberField("unlockLevel", "Nível para desbloquear", { min: 1, integer: true, required: true })
    ]},
    companies: { label: "indústria", idSource: "name", title: item => item.name || "Nova indústria", subtitle: item => item.category ? `Categoria: ${catalogOptions("categories").find(option => option.value === item.category)?.label || item.category}` : (item.specialty || "Todas as categorias"), fields: [
      { key: "name", label: "Nome da indústria", type: "text", required: true },
      { key: "specialty", label: "Especialidade", type: "text", required: true },
      { key: "category", label: "Categoria de plantas", type: "select", options: () => catalogOptions("categories"), allowEmpty: true, emptyOptionLabel: "Todas as categorias" },
      imageField("icon", "Ícone", "icone")
    ]},
    contractTypes: { label: "tipo de contrato", idSource: "label", title: item => item.label || "Novo tipo de contrato", subtitle: item => `${item.minDurationSeconds || item.durationSeconds || 0}s–${item.maxDurationSeconds || item.durationSeconds || 0}s · ${item.chancePercent ?? 100}% chance · prioridade ${item.priority || 0} · multa ${item.penaltyPercent ?? 20}% · ${item.offerCountdown === false ? "proposta sem prazo" : "proposta com prazo"} · ${rewardSelectionLabel(item.rewards)} · ${item.xpPercent || 0}% XP`, fields: [
      { key: "label", label: "Nome do tipo de contrato", type: "text", required: true },
      percentField("chancePercent", "Chance de aparecer (%)", { min: 0, max: 100, required: true, defaultValue: 100, help: "Use como peso de raridade. Ex.: comum 100%, raro 20% e muito raro 5%." }),
      numberField("priority", "Prioridade de entrega", { min: 0, integer: true, required: true, defaultValue: 0, help: "Quando dois contratos pedirem a mesma planta, a produção é entregue primeiro ao contrato com maior prioridade." }),
      percentField("penaltyPercent", "Multa / quebra do contrato (%)", { min: 0, required: true, defaultValue: 20, help: "Percentual adicional aplicado sobre (quantidade que falta × valor unitário atual da planta)." }),
      { key: "offerCountdown", label: "Tempo para proposta do contrato?", type: "select", required: true, defaultValue: "true", options: fixedOptions([["true", "Sim, mostrar e contar o tempo da proposta"], ["false", "Não, a proposta não possui cronômetro"]]) },
      numberField("minDurationSeconds", "Tempo mínimo (segundos)", { min: 5, integer: true, required: true, defaultValue: 60, help: "Menor prazo que um contrato deste tipo pode receber." }),
      numberField("maxDurationSeconds", "Tempo máximo (segundos)", { min: 5, integer: true, required: true, defaultValue: 360, help: "Maior prazo possível. Cada nova proposta sorteia um valor entre o mínimo e o máximo." }),
      numberField("quantityMultiplier", "Multiplicador de quantidade", { min: 0.01, required: true }),
      { key: "rewards", label: "Recompensas do contrato", type: "checkboxes", required: true, options: rewardOptions, help: "Marque uma ou mais recompensas. Os campos correspondentes aparecem abaixo." },
      percentField("coinMultiplierPercent", "Multiplicador de moedas (%)", { min: 0, showWhenIncludes: { key: "rewards", value: "coins" }, defaultValue: 100 }),
      percentField("researchMultiplierPercent", "Multiplicador de pesquisa (%)", { min: 0, showWhenIncludes: { key: "rewards", value: "research" }, defaultValue: 100 }),
      percentField("prestigeMultiplierPercent", "Multiplicador de prestígio (%)", { min: 0, showWhenIncludes: { key: "rewards", value: "prestige" }, defaultValue: 1 }),
      percentField("xpPercent", "Recompensa de XP (%)", { min: 0, max: 100, required: true, defaultValue: 0 }),
      { key: "color", alphaKey: "colorAlpha", label: "Cor de destaque", type: "contractColor", required: true, defaultValue: "#e6c35f", alphaDefault: 18 }
    ]},
    contractSlots: { label: "slot de contrato", idSource: "name", title: item => item.name || "Novo slot", subtitle: item => `Libera no nível ${item.unlockLevel || 1}`, fields: [
      { key: "name", label: "Nome do slot", type: "text", required: true }, numberField("unlockLevel", "Nível da fazenda para desbloquear", { min: 1, integer: true, required: true })
    ]},
    orderSteps: { label: "etapa de pedido", idSource: "name", title: (_item, index) => `Etapa ${index + 1}`, subtitle: item => `${item.amount || 0} un. · +${item.coinBonusPercent || 0}% moedas · ${item.xpPercent || 0}% XP`, fields: [
      numberField("amount", "Quantidade necessária", { min: 0, integer: true, required: true, defaultValue: 0 }),
      percentField("coinBonusPercent", "Multiplicador de moedas (%)", { min: 0, required: true, defaultValue: 0, help: "Percentual adicional aplicado ao valor total do pedido (quantidade × valor unitário da planta)." }),
      numberField("rewardResearch", "Recompensa de pesquisa", { min: 0, integer: true, required: true, defaultValue: 0 }),
      numberField("rewardPrestige", "Recompensa de prestígio", { min: 0, integer: true, required: true, defaultValue: 0 }),
      percentField("xpPercent", "Recompensa de XP (%)", { min: 0, max: 100, required: true, defaultValue: 0 })
    ]},
    missions: { label: "missão", idSource: "title", title: item => item.title || "Nova missão", subtitle: item => `${Array.isArray(item.series) ? item.series.length : 0} ${Array.isArray(item.series) && item.series.length === 1 ? "série" : "séries"}`, fields: [
      { key: "title", label: "Título da missão", type: "text", required: true }, { key: "desc", label: "Descrição", type: "textarea", required: true },
      { key: "metric", label: "O que será medido", type: "select", required: true, options: metricOptions },
      { key: "category", label: "Categoria da planta, quando necessária", type: "select", options: () => catalogOptions("categories"), allowEmpty: true, emptyOptionLabel: "Não se aplica" }
    ]},
    research: { label: "pesquisa", idSource: "name", title: item => item.name || "Nova pesquisa", subtitle: item => `${item.max || 1} níveis · ${(item.bonuses || []).map(bonus => effectLabel(bonus.type)).filter(Boolean).join(" + ") || effectLabel(item.bonusType)}`, fields: evolutionFields(false) },
    prestigeUpgrades: { label: "legado", idSource: "name", title: item => item.name || "Novo legado", subtitle: item => `${item.max || 1} níveis · ${(item.bonuses || []).map(bonus => effectLabel(bonus.type)).filter(Boolean).join(" + ") || effectLabel(item.bonusType)}`, fields: evolutionFields(true) },
    events: { label: "evento", idSource: "name", title: item => item.name || "Novo evento", subtitle: item => `${item.bonusPercent || 0}% extra · ${new Date(Number(item.startAt) || Date.now()).toLocaleString("pt-BR")}`, fields: [
      { key: "name", label: "Nome do evento", type: "text", required: true }, { key: "type", label: "Bônus do evento", type: "select", required: true, options: eventTypeOptions },
      percentField("bonusPercent", "Ganho extra", { min: 0, required: true }), { key: "startAt", label: "Data e hora de início", type: "datetime", transform: "datetimeMs", required: true },
      numberField("durationMinutes", "Duração (minutos)", { min: 1, integer: true, required: true })
    ]},
    updateNotes: { label: "nota de atualização", idSource: "title", title: item => item.title || "Nova nota", subtitle: item => `${item.version || ""} · ${new Date(Number(item.publishedAt) || Date.now()).toLocaleString("pt-BR")}`, fields: [
      { key: "title", label: "Título", type: "text", required: true }, { key: "version", label: "Versão do jogo", type: "text", required: true, help: "A nota mais recente define automaticamente a versão pública exibida em todo o site." },
      { key: "publishedAt", label: "Data e hora da publicação", type: "datetime", transform: "datetimeMs", required: true }, { key: "body", label: "Notas da atualização", type: "textarea", required: true }
    ]}
  };

  function normalizeOptions(field, currentValue) {
    const raw = typeof field.options === "function" ? field.options() : (field.options || []);
    const options = raw.map(entry => typeof entry === "object" ? option(entry.value, entry.label) : option(entry, entry));
    if (currentValue !== "" && currentValue != null && !options.some(entry => entry.value === String(currentValue))) options.unshift(option(currentValue, `Valor atual: ${currentValue}`));
    return options;
  }

  const sanitizePositive = (value, integer = false) => {
    let normalized = String(value ?? "").replace("%", "").replace(/[^0-9.,]/g, "").replace(",", ".");
    const parts = normalized.split(".");
    if (parts.length > 1) normalized = parts.shift() + "." + parts.join("");
    if (integer) normalized = normalized.split(".")[0];
    return normalized;
  };
  const numberValue = (value, field) => {
    const sanitized = sanitizePositive(value, field.integer);
    const number = Number(sanitized || 0);
    if (!Number.isFinite(number)) return 0;
    return Math.max(field.min ?? 0, field.max != null ? Math.min(field.max, number) : number);
  };
  const percentDisplay = value => value === "" || value == null ? "" : `${sanitizePositive(value)}%`;
  const isPercentEffect = type => (window.GameAdminConfig?.getEvolutionEffectOptions?.() || []).some(option => option.value === type && /\(%\)/.test(option.label));
  const toLocalDateTime = ms => { const date = new Date(Number(ms) || Date.now()); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); };


  function checkedValues(form, name) {
    return [...form.querySelectorAll(`input[type="checkbox"][name="${CSS.escape(name)}"]`)].filter(input => input.checked).map(input => input.value);
  }

  class CatalogEditor {
    constructor(root) {
      this.root = root; this.name = root.dataset.catalogEditor; this.schema = schemas[this.name]; this.items = []; this.list = root.querySelector("[data-catalog-list]"); this.count = root.querySelector("[data-catalog-count]"); this.seriesMutationLocked = false;
      root.querySelector("[data-catalog-add]")?.addEventListener("click", () => this.open(-1));
      this.list?.addEventListener("click", event => {
        const seriesButton = event.target.closest("[data-series-action]");
        if (seriesButton && this.name === "missions") { event.preventDefault(); event.stopPropagation(); this.handleMissionSeriesAction(seriesButton); return; }
        const button = event.target.closest("[data-catalog-action]");
        if (!button) return;
        const index = Number(button.dataset.index); const action = button.dataset.catalogAction;
        if (this.name === "missions") this.syncMissionSeriesFromDom(index);
        if (action === "edit") this.open(index);
        if (action === "delete") this.remove(index);
        if (action === "up") this.move(index, -1);
        if (action === "down") this.move(index, 1);
      });
    }
    normalizeOrderedLabels() {
      if (this.name !== "orderSteps") return;
      this.items.forEach((item, index) => { item.name = `Etapa ${index + 1}`; });
    }
    setValue(items) { this.items = Array.isArray(items) ? clone(items) : []; this.normalizeOrderedLabels(); this.render(); }
    getValue() { this.normalizeOrderedLabels(); return clone(this.items); }
    makeUniqueId(sourceValue, currentIndex) { const base = autoId(sourceValue); const used = new Set(this.items.filter((_, index) => index !== currentIndex).map(item => item.id)); let candidate = base; let suffix = 2; while (used.has(candidate)) candidate = `${base}${suffix++}`; return candidate; }
    missionSeriesRowMarkup(serie = {}, index = 0, missionIndex = 0) {
      const reward = serie.reward || {};
      const numeric = value => sanitizePositive(value ?? "", true);
      return `<article class="admin-series-card admin-series-inline-card" data-series-index="${index}">
        <header><strong>Série ${index + 1}</strong><div class="admin-series-card-actions">
          <button class="admin-button compact secondary" data-series-action="up" data-mission-index="${missionIndex}" data-series-index="${index}" type="button" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="admin-button compact secondary" data-series-action="down" data-mission-index="${missionIndex}" data-series-index="${index}" type="button">↓</button>
          <button class="admin-button compact danger" data-series-action="remove" data-mission-index="${missionIndex}" data-series-index="${index}" type="button">Excluir</button>
        </div></header>
        <div class="admin-series-fields">
          <label><span>Meta da série</span><input autocomplete="off" type="text" inputmode="numeric" data-series-field="target" value="${escapeHtml(numeric(serie.target || 1))}"></label>
          <label><span>Recompensa em moedas</span><input autocomplete="off" type="text" inputmode="numeric" data-series-field="reward.coins" value="${escapeHtml(numeric(reward.coins || 0))}"></label>
          <label><span>Recompensa em pesquisa</span><input autocomplete="off" type="text" inputmode="numeric" data-series-field="reward.research" value="${escapeHtml(numeric(reward.research || 0))}"></label>
          <label><span>Recompensa em prestígio</span><input autocomplete="off" type="text" inputmode="numeric" data-series-field="reward.prestige" value="${escapeHtml(numeric(reward.prestige || 0))}"></label>
        </div>
      </article>`;
    }
    missionSeriesMarkup(item, missionIndex) {
      const series = Array.isArray(item.series) ? item.series : [];
      return `<details class="admin-mission-series-accordion" data-mission-series-accordion="${missionIndex}">
        <summary><span>Séries da missão</span><b>${series.length}</b></summary>
        <div class="admin-mission-series-body">
          <div class="admin-series-inline-list" data-mission-series-list="${missionIndex}">${series.length ? series.map((serie, index) => this.missionSeriesRowMarkup(serie, index, missionIndex)).join("") : '<div class="admin-catalog-empty">Nenhuma série cadastrada nesta missão.</div>'}</div>
          <div class="admin-series-inline-actions">
            <button class="admin-button secondary" data-series-action="add" data-mission-index="${missionIndex}" type="button">Adicionar série</button>
            <button class="admin-button primary" data-series-action="save" data-mission-index="${missionIndex}" type="button">Salvar séries</button>
          </div>
        </div>
      </details>`;
    }
    collectMissionSeries(missionIndex) {
      const list = this.list?.querySelector(`[data-mission-series-list="${missionIndex}"]`);
      if (!list) return Array.isArray(this.items[missionIndex]?.series) ? clone(this.items[missionIndex].series) : [];
      return [...list.querySelectorAll(":scope > [data-series-index]")].slice(0, 200).map(card => {
        const serie = { target: 1, reward: {} };
        card.querySelectorAll("[data-series-field]").forEach(input => {
          const path = input.dataset.seriesField;
          input.value = sanitizePositive(input.value, true);
          const value = Math.max(0, Math.floor(Number(input.value) || 0));
          if (path === "target") serie.target = Math.max(1, value || 1);
          else if (path?.startsWith("reward.") && value > 0) serie.reward[path.slice(7)] = value;
        });
        return serie;
      });
    }
    syncMissionSeriesFromDom(missionIndex) {
      if (this.name !== "missions" || !Number.isInteger(missionIndex) || !this.items[missionIndex]) return;
      const list = this.list?.querySelector(`[data-mission-series-list="${missionIndex}"]`);
      if (list) this.items[missionIndex].series = this.collectMissionSeries(missionIndex);
    }
    reopenMissionAccordion(index) {
      window.requestAnimationFrame(() => { const details = this.list?.querySelector(`[data-mission-series-accordion="${index}"]`); if (details) details.open = true; });
    }
    async handleMissionSeriesAction(button) {
      if (this.seriesMutationLocked) return;
      const missionIndex = Number(button.dataset.missionIndex);
      const seriesIndex = Number(button.dataset.seriesIndex);
      if (!Number.isInteger(missionIndex) || !this.items[missionIndex]) return;
      const action = button.dataset.seriesAction;

      if (action === "save") {
        this.syncMissionSeriesFromDom(missionIndex);
        button.disabled = true;
        try { await window.AdminCloudActions?.saveCatalog?.("missions"); }
        catch (error) { window.AdminCloudActions?.showError?.(error); }
        finally { button.disabled = false; }
        return;
      }

      if (!["add", "remove", "up", "down"].includes(action)) return;
      this.seriesMutationLocked = true;
      try {
        const current = this.collectMissionSeries(missionIndex);
        const nextSeries = current.map(serie => clone(serie));
        if (action === "add") {
          if (nextSeries.length >= 200) throw new Error("Uma missão pode possuir no máximo 200 séries.");
          nextSeries.push({ target: 1, reward: {} });
        } else if (action === "remove" && Number.isInteger(seriesIndex) && seriesIndex >= 0 && seriesIndex < nextSeries.length) {
          nextSeries.splice(seriesIndex, 1);
        } else if (action === "up" && seriesIndex > 0 && seriesIndex < nextSeries.length) {
          [nextSeries[seriesIndex - 1], nextSeries[seriesIndex]] = [nextSeries[seriesIndex], nextSeries[seriesIndex - 1]];
        } else if (action === "down" && seriesIndex >= 0 && seriesIndex < nextSeries.length - 1) {
          [nextSeries[seriesIndex + 1], nextSeries[seriesIndex]] = [nextSeries[seriesIndex], nextSeries[seriesIndex + 1]];
        }
        this.items[missionIndex] = { ...this.items[missionIndex], series: nextSeries };
        this.render();
        this.reopenMissionAccordion(missionIndex);
      } catch (error) {
        window.AdminCloudActions?.showError?.(error);
      } finally {
        window.setTimeout(() => { this.seriesMutationLocked = false; }, 0);
      }
    }
    render() {
      this.normalizeOrderedLabels();
      if (this.count) this.count.textContent = String(this.items.length);
      if (!this.list) return;
      this.list.innerHTML = this.items.length ? this.items.map((item, index) => {
        const locked = this.name === "pointTypes" && item.locked === true;
        const actions = locked
          ? '<span class="admin-fixed-point-badge">Padrão</span>'
          : `<button aria-label="Mover para cima" class="admin-button compact secondary" data-catalog-action="up" data-index="${index}" type="button" ${index === 0 ? "disabled" : ""}>↑</button><button aria-label="Mover para baixo" class="admin-button compact secondary" data-catalog-action="down" data-index="${index}" type="button" ${index === this.items.length - 1 ? "disabled" : ""}>↓</button><button class="admin-button compact secondary" data-catalog-action="edit" data-index="${index}" type="button">Editar</button><button class="admin-button compact danger" data-catalog-action="delete" data-index="${index}" type="button">Excluir</button>`;
        return `<article class="admin-catalog-item ${this.name === "missions" ? "admin-mission-catalog-item" : ""} ${locked ? "admin-fixed-point-item" : ""}" data-mission-index="${this.name === "missions" ? index : ""}"><div class="admin-catalog-item-main"><div><strong>${escapeHtml(this.schema.title(item, index))}</strong><small>${escapeHtml(this.schema.subtitle(item, index))}</small></div><div class="admin-catalog-item-actions">${actions}</div></div>${this.name === "missions" ? this.missionSeriesMarkup(item, index) : ""}</article>`;
      }).join("") : `<div class="admin-catalog-empty">Nenhum conteúdo cadastrado.</div>`;
    }
    open(index) {
      if (this.name === "pointTypes" && index >= 0 && this.items[index]?.locked) return;
      const item = index >= 0 ? clone(this.items[index]) : {};
      window.AdminItemDialog.open({ title: index >= 0 ? `Editar ${this.schema.label}` : `Adicionar ${this.schema.label}`, fields: this.schema.fields, item, saveLabel: index >= 0 ? "Salvar alteração" : "Cadastrar", onSave: async value => {
        const previous = index >= 0 ? clone(this.items[index]) : null;
        if (this.name === "orderSteps") value.name = `Etapa ${index >= 0 ? index + 1 : this.items.length + 1}`;
        if (this.name === "missions" && !Array.isArray(value.series)) value.series = Array.isArray(previous?.series) ? clone(previous.series) : [];
        value.id = this.makeUniqueId(getPath(value, this.schema.idSource), index); if (this.schema.idTarget) setPath(value, this.schema.idTarget, value.id);
        if (index >= 0) this.items[index] = value; else this.items.push(value); this.normalizeOrderedLabels(); this.render();
        try { await window.AdminCloudActions?.beforeCatalogSave?.(this.name, previous, value); await window.AdminCloudActions?.saveCatalog?.(this.name); }
        catch (error) { if (index >= 0) this.items[index] = previous; else this.items.pop(); this.render(); window.AdminCloudActions?.restoreEditors?.(); throw error; }
      }});
    }
    async move(index, direction) { if (this.name === "pointTypes" && this.items[index]?.locked) return; const target = index + direction; if (index < 0 || target < 0 || index >= this.items.length || target >= this.items.length) return; if (this.name === "pointTypes" && this.items[target]?.locked) return; [this.items[index], this.items[target]] = [this.items[target], this.items[index]]; this.render(); try { await window.AdminCloudActions?.saveCatalog?.(this.name); } catch (error) { [this.items[index], this.items[target]] = [this.items[target], this.items[index]]; this.render(); window.AdminCloudActions?.showError?.(error); } }
    async remove(index) { const item = this.items[index]; if (this.name === "pointTypes" && item?.locked) return; if (!item || !confirm(`Excluir “${this.schema.title(item, index)}” da nuvem?`)) return; const previous = clone(item); this.items.splice(index, 1); this.render(); try { await window.AdminCloudActions?.saveCatalog?.(this.name); } catch (error) { this.items.splice(index, 0, previous); this.render(); window.AdminCloudActions?.showError?.(error); } }
  }

  class ItemDialog {
    constructor(dialog) {
      this.dialog = dialog; this.form = dialog.querySelector("form"); this.form.autocomplete = "off"; this.title = dialog.querySelector("[data-admin-dialog-title]"); this.fields = dialog.querySelector("[data-admin-dialog-fields]"); this.cancel = dialog.querySelector("[data-admin-dialog-cancel]"); this.submit = this.form.querySelector('button[type="submit"]');
      this.cancel.addEventListener("click", () => dialog.close("cancel"));
      this.form.addEventListener("keydown", event => this.handleKeydown(event));
      this.form.addEventListener("input", event => this.handleInput(event)); this.form.addEventListener("focusin", event => this.handleFocus(event)); this.form.addEventListener("focusout", event => this.handleBlur(event));
      this.form.addEventListener("change", event => this.handleChange(event.target));
      this.form.addEventListener("click", event => this.handleClick(event));
      this.form.addEventListener("submit", event => this.submitForm(event));
    }
    fieldUsesPercent(field, item = null) {
      if (!field) return false;
      if (field.suffix === "%") return true;
      if (!field.percentWhen) return false;
      const selected = item != null
        ? getPath(item, field.percentWhen)
        : (this.form?.elements?.namedItem(field.percentWhen)?.value ?? getPath(this.currentItem || {}, field.percentWhen));
      return isPercentEffect(selected);
    }
    getLegacyEffects(item = this.currentItem || {}) {
      const rows = [];
      [["bonusType", "bonusAmount", "stageRates"], ["bonus2Type", "bonus2Amount", null], ["bonus3Type", "bonus3Amount", null]].forEach(([typeKey, amountKey, stagesKey]) => {
        const type = item?.[typeKey];
        if (!type) return;
        rows.push({ type, amount: Math.max(0, Number(item?.[amountKey]) || 0), stageValues: stagesKey && Array.isArray(item?.[stagesKey]) ? item[stagesKey] : [] });
      });
      return rows;
    }
    getEffectRows(item = this.currentItem || {}) {
      return Array.isArray(item?.bonuses) && item.bonuses.length ? item.bonuses : this.getLegacyEffects(item);
    }
    effectRowMarkup(effect = {}) {
      const options = window.GameAdminConfig?.getEvolutionEffectOptions?.() || [];
      const selectedType = String(effect.type || options[0]?.value || "");
      const amount = Math.max(0, Number(effect.amount) || 0);
      const shownAmount = isPercentEffect(selectedType) ? percentDisplay(amount) : String(amount);
      const stages = Array.isArray(effect.stageValues) ? effect.stageValues.join(", ") : "";
      return `<div class="admin-effect-row" data-effect-row>
        <label><span>Tipo de bônus</span><select data-effect-type>${options.map(entry => `<option value="${escapeHtml(entry.value)}" ${entry.value === selectedType ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select></label>
        <label><span>Quantidade por nível</span><input type="text" inputmode="decimal" autocomplete="off" data-effect-amount value="${escapeHtml(shownAmount)}"></label>
        <label><span>Valores por estágio (opcional)</span><input type="text" inputmode="decimal" autocomplete="off" data-effect-stages value="${escapeHtml(stages)}" placeholder="Ex.: 0.01, 0.02, 0.02"></label>
        <button type="button" class="admin-button compact danger" data-effect-remove>Remover bônus</button>
      </div>`;
    }
    handleClick(event) {
      const add = event.target.closest("[data-effect-add]");
      if (add) {
        const editor = add.closest("[data-effects-editor]");
        editor?.querySelector("[data-effect-list]")?.insertAdjacentHTML("beforeend", this.effectRowMarkup({}));
        return;
      }
      const remove = event.target.closest("[data-effect-remove]");
      if (remove) {
        const list = remove.closest("[data-effect-list]");
        remove.closest("[data-effect-row]")?.remove();
        if (list && !list.querySelector("[data-effect-row]")) list.insertAdjacentHTML("beforeend", this.effectRowMarkup({}));
      }
    }
    handleKeydown(event) {
      const input = event.target;
      if (input.matches("[data-effect-amount]")) {
        if (["e", "E", "-", "+"].includes(event.key)) event.preventDefault();
        return;
      }
      if (input.matches("[data-effect-stages]")) {
        if (["e", "E", "-", "+"].includes(event.key) || (event.key.length === 1 && !/[0-9.,\s]/.test(event.key))) event.preventDefault();
        return;
      }
      const field = this.currentFields?.find(item => item.key === input.name);
      if (!field || (field.type !== "number" && field.transform !== "numberArray")) return;
      if (field.transform === "numberArray") {
        if (["e", "E", "-", "+"].includes(event.key) || (event.key.length === 1 && !/[0-9.,\s]/.test(event.key))) event.preventDefault();
        return;
      }
      if (["e", "E", "-", "+"].includes(event.key)) event.preventDefault();
      if (field.integer && [".", ","].includes(event.key)) event.preventDefault();
    }
    handleInput(event) {
      const input = event.target;
      if (input.matches("[data-contract-alpha]")) {
        const clean = sanitizePositive(input.value, true);
        const value = Math.max(0, Math.min(100, Number(clean || 0)));
        input.value = `${value}%`;
        try { input.setSelectionRange(Math.max(0, input.value.length - 1), Math.max(0, input.value.length - 1)); } catch {}
        this.updateContractColorPreview();
        return;
      }
      if (input.matches("[data-effect-amount]")) {
        const clean = sanitizePositive(input.value);
        const type = input.closest("[data-effect-row]")?.querySelector("[data-effect-type]")?.value || "";
        input.value = isPercentEffect(type) && clean !== "" ? percentDisplay(clean) : clean;
        const caret = isPercentEffect(type) && input.value ? Math.max(0, input.value.length - 1) : input.value.length;
        try { input.setSelectionRange(caret, caret); } catch {}
        return;
      }
      if (input.matches("[data-effect-stages]")) {
        input.value = String(input.value || "").replace(/[^0-9.,\s]/g, "");
        return;
      }
      const field = this.currentFields?.find(item => item.key === input.name);
      if (field?.transform === "numberArray") {
        input.value = String(input.value || "").replace(/[^0-9.,\s]/g, "");
        return;
      }
      if (!field || field.type !== "number") return;
      const sanitized = sanitizePositive(input.value, field.integer);
      const percentField = this.fieldUsesPercent(field);
      input.value = percentField && sanitized !== "" ? percentDisplay(sanitized) : sanitized;
      const caret = percentField && input.value ? Math.max(0, input.value.length - 1) : input.value.length;
      try { input.setSelectionRange(caret, caret); } catch {}
    }
    handleFocus(event) {
      const input = event.target;
      if (input.matches("[data-effect-amount]")) {
        const type = input.closest("[data-effect-row]")?.querySelector("[data-effect-type]")?.value || "";
        if (isPercentEffect(type) && input.value) {
          const caret = Math.max(0, input.value.length - 1);
          try { input.setSelectionRange(caret, caret); } catch {}
        }
        return;
      }
      const field = this.currentFields?.find(item => item.key === input.name);
      if (field?.type === "number" && this.fieldUsesPercent(field) && input.value) {
        const caret = Math.max(0, input.value.length - 1);
        try { input.setSelectionRange(caret, caret); } catch {}
      }
    }
    handleBlur(event) {
      const input = event.target;
      if (input.matches("[data-effect-amount]")) {
        const type = input.closest("[data-effect-row]")?.querySelector("[data-effect-type]")?.value || "";
        if (isPercentEffect(type) && input.value !== "") input.value = percentDisplay(input.value);
        return;
      }
      const field = this.currentFields?.find(item => item.key === input.name);
      if (this.fieldUsesPercent(field) && input.value !== "") input.value = percentDisplay(input.value);
    }
    handleChange(input) {
      this.updatePreview(input);
      if (input?.name === "rewards") this.refreshConditionalFields();
      if (input.matches("[data-effect-type]")) {
        const amount = input.closest("[data-effect-row]")?.querySelector("[data-effect-amount]");
        if (amount) {
          const clean = sanitizePositive(amount.value);
          amount.value = isPercentEffect(input.value) && clean !== "" ? percentDisplay(clean) : clean;
        }
        return;
      }
      this.currentFields?.filter(field => field.percentWhen === input.name).forEach(field => {
        const target = this.form.elements.namedItem(field.key);
        if (!target) return;
        const clean = sanitizePositive(target.value, field.integer);
        target.value = this.fieldUsesPercent(field) && clean !== "" ? percentDisplay(clean) : clean;
      });
    }
    updatePreview(input) {
      const field = this.currentFields?.find(item => item.key === input.name || item.alphaKey === input.name);
      if (!field) return;
      if (field.preview === "image") {
        const preview = this.fields.querySelector(`[data-preview-for="${CSS.escape(field.key)}"]`);
        const img = preview?.querySelector("img");
        if (img) { img.src = input.value || "assets/logo.webp"; img.alt = input.options?.[input.selectedIndex]?.textContent || "Prévia"; }
      }
      if (field.type === "contractColor") this.updateContractColorPreview();
    }
    updateContractColorPreview() {
      const colorInput = this.form.elements.namedItem("color");
      const alphaInput = this.form.elements.namedItem("colorAlpha");
      if (!colorInput || !alphaInput) return;
      const alpha = Math.max(0, Math.min(100, Number(sanitizePositive(alphaInput.value, true) || 0)));
      alphaInput.value = `${alpha}%`;
      const preview = this.fields.querySelector('[data-preview-for="color"]');
      preview?.style.setProperty("--preview-color", colorInput.value || "#e6c35f");
      preview?.style.setProperty("--preview-alpha", `${alpha}%`);
      if (preview?.querySelector("strong")) preview.querySelector("strong").textContent = `${colorInput.value || "#e6c35f"} · ${alpha}%`;
      this.dialog.style.setProperty("--contract-preview-color", colorInput.value || "#e6c35f");
      this.dialog.style.setProperty("--contract-preview-alpha", `${alpha}%`);
    }
    refreshConditionalFields() {
      (this.currentFields || []).forEach(field => {
        const wrapper = this.fields.querySelector(`[data-admin-field-key="${CSS.escape(field.key)}"]`);
        if (!wrapper || !field.showWhenIncludes) return;
        const selected = checkedValues(this.form, field.showWhenIncludes.key);
        const visible = selected.includes(field.showWhenIncludes.value);
        wrapper.hidden = !visible;
        const input = this.form.elements.namedItem(field.key);
        if (input) input.disabled = !visible;
      });
    }
    async submitForm(event) {
      event.preventDefault();
      if (this.busy) return;
      const requiredCheckboxGroup = (this.currentFields || []).find(field => field.type === "checkboxes" && field.required && !checkedValues(this.form, field.key).length);
      if (requiredCheckboxGroup) {
        const first = this.form.querySelector(`input[type="checkbox"][name="${CSS.escape(requiredCheckboxGroup.key)}"]`);
        first?.setCustomValidity("Selecione pelo menos uma opção.");
        first?.reportValidity();
        first?.addEventListener("change", () => first.setCustomValidity(""), { once: true });
        return;
      }
      if (!this.form.reportValidity()) return;
      const output = clone(this.currentItem || {});
      this.currentFields.forEach(field => {
        if (field.type === "checkboxes") {
          const values = checkedValues(this.form, field.key);
          if (values.length) setPath(output, field.key, values); else this.deletePath(output, field.key);
          return;
        }
        if (field.type === "contractColor") {
          const colorInput = this.form.elements.namedItem(field.key);
          const alphaInput = this.form.elements.namedItem(field.alphaKey || "colorAlpha");
          setPath(output, field.key, String(colorInput?.value || field.defaultValue || "#e6c35f"));
          setPath(output, field.alphaKey || "colorAlpha", Math.max(0, Math.min(100, Number(sanitizePositive(alphaInput?.value || field.alphaDefault || 18, true) || 0))));
          return;
        }
        if (field.type === "effects") {
          const root = this.fields.querySelector(`[data-effects-editor="${CSS.escape(field.key)}"]`);
          const bonuses = [...(root?.querySelectorAll("[data-effect-row]") || [])].map(row => {
            const type = row.querySelector("[data-effect-type]")?.value || "";
            const amount = Number(sanitizePositive(row.querySelector("[data-effect-amount]")?.value || "")) || 0;
            const rawStages = String(row.querySelector("[data-effect-stages]")?.value || "").trim();
            const stageValues = rawStages
              ? rawStages.split(",").map(part => sanitizePositive(part)).filter(part => part !== "").map(Number).filter(Number.isFinite)
              : [];
            return { type, amount, ...(stageValues.length ? { stageValues } : {}) };
          }).filter(effect => effect.type);
          output.bonuses = bonuses;
          ["bonusType", "bonusAmount", "bonus2Type", "bonus2Amount", "bonus3Type", "bonus3Amount", "stageRates"].forEach(key => delete output[key]);
          return;
        }
        const input = this.form.elements.namedItem(field.key); if (!input) return;
        let value = String(input.value ?? "").trim();
        if (field.type === "number") value = numberValue(value, field);
        if (field.transform === "numberArray") value = value ? value.split(",").map(part => Number(sanitizePositive(part))).filter(Number.isFinite) : [];
        if (field.transform === "slug") value = autoId(value);
        if (field.transform === "datetimeMs") value = new Date(value).getTime();
        if (value === "" || (Array.isArray(value) && !value.length)) this.deletePath(output, field.key); else setPath(output, field.key, value);
      });
      this.setBusy(true); try { await this.onSave?.(output); this.dialog.close("save"); } catch (error) { window.AdminCloudActions?.showError?.(error); } finally { this.setBusy(false); }
    }
    setBusy(busy) { this.busy = Boolean(busy); [...this.form.elements].forEach(element => { element.disabled = this.busy; }); if (!this.busy) this.cancel.disabled = false; if (this.submit) this.submit.textContent = this.busy ? "Salvando..." : (this.saveLabel || "Salvar"); }
    deletePath(object, path) { const keys = path.split("."); const last = keys.pop(); const parent = keys.reduce((target, key) => target?.[key], object); if (parent && last in parent) delete parent[last]; }
    fieldMarkup(field, item) {
      if (field.type === "effects") {
        const rows = this.getEffectRows(item);
        const content = (rows.length ? rows : [{}]).map(effect => this.effectRowMarkup(effect)).join("");
        const help = field.help ? `<small class="admin-field-help">${escapeHtml(field.help)}</small>` : "";
        return `<section class="admin-dialog-field full admin-effects-editor" data-admin-field-key="${escapeHtml(field.key)}" data-effects-editor="${escapeHtml(field.key)}"><span>${escapeHtml(field.label)}</span><div class="admin-effect-list" data-effect-list>${content}</div><button type="button" class="admin-button secondary compact" data-effect-add>+ Adicionar bônus</button>${help}</section>`;
      }
      const raw = getPath(item, field.key); let value = Array.isArray(raw) ? raw : (raw ?? field.defaultValue ?? ""); if (field.transform === "datetimeMs") value = toLocalDateTime(value);
      const required = field.required ? "required" : "";
      const help = field.help ? `<small class="admin-field-help">${escapeHtml(field.help)}</small>` : "";
      const full = field.type === "textarea" || field.type === "checkboxes" || field.type === "contractColor" || field.key === "desc" || field.key === "body" ? " full" : "";
      const fieldAttr = `data-admin-field-key="${escapeHtml(field.key)}"`;
      if (field.type === "textarea") return `<label ${fieldAttr} class="admin-dialog-field${full}"><span>${escapeHtml(field.label)}</span><textarea autocomplete="off" name="${escapeHtml(field.key)}" ${required}>${escapeHtml(value)}</textarea>${help}</label>`;
      if (field.type === "checkboxes") {
        const selected = new Set(Array.isArray(value) ? value.map(String) : []);
        const options = normalizeOptions(field, "");
        return `<fieldset ${fieldAttr} class="admin-dialog-field full admin-check-options"><legend>${escapeHtml(field.label)}</legend><div>${options.map(entry => `<label><input autocomplete="off" type="checkbox" name="${escapeHtml(field.key)}" value="${escapeHtml(entry.value)}" ${selected.has(entry.value) ? "checked" : ""}><span>${escapeHtml(entry.label)}</span></label>`).join("")}</div>${help}</fieldset>`;
      }
      if (field.type === "select") {
        const options = normalizeOptions(field, value);
        const first = field.allowEmpty ? `<option value="">${escapeHtml(field.emptyOptionLabel || "Selecione")}</option>` : (!options.length ? `<option value="" disabled selected>${escapeHtml(field.emptyLabel || "Nenhuma opção disponível")}</option>` : "");
        const imageSelect = field.preview === "image" ? " data-image-select" : "";
        const tag = field.preview === "image" ? "section" : "label";
        return `<${tag} ${fieldAttr} class="admin-dialog-field${field.preview ? " admin-dialog-image-field" : ""}"><span>${escapeHtml(field.label)}</span><select autocomplete="off" name="${escapeHtml(field.key)}"${imageSelect} ${required}>${first}${options.map(entry => `<option value="${escapeHtml(entry.value)}" ${entry.value === String(value) ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select>${help}</${tag}>`;
      }
      if (field.type === "number") {
        const shown = this.fieldUsesPercent(field, item) && value !== "" ? percentDisplay(value) : value;
        return `<label ${fieldAttr} class="admin-dialog-field${full}"><span>${escapeHtml(field.label)}</span><input autocomplete="off" type="text" inputmode="${field.integer ? "numeric" : "decimal"}" data-admin-number name="${escapeHtml(field.key)}" value="${escapeHtml(shown)}" ${required}>${help}</label>`;
      }
      if (field.type === "contractColor") {
        const safe = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : "#e6c35f";
        const alphaRaw = getPath(item, field.alphaKey || "colorAlpha");
        const alpha = Math.max(0, Math.min(100, Number(alphaRaw ?? field.alphaDefault ?? 18) || 0));
        return `<section ${fieldAttr} class="admin-dialog-field full admin-contract-color-field"><span>${escapeHtml(field.label)}</span><div class="admin-contract-color-controls"><label><small>Cor</small><input autocomplete="off" type="color" name="${escapeHtml(field.key)}" value="${escapeHtml(safe)}" ${required}></label><label><small>Alpha (%)</small><input autocomplete="off" type="text" inputmode="numeric" data-contract-alpha name="${escapeHtml(field.alphaKey || "colorAlpha")}" value="${escapeHtml(alpha)}%"></label></div><div class="admin-contract-color-preview" data-preview-for="${escapeHtml(field.key)}" style="--preview-color:${escapeHtml(safe)};--preview-alpha:${alpha}%"><span>Prévia da cor de destaque</span><strong>${escapeHtml(safe)} · ${alpha}%</strong></div></section>`;
      }
      const type = field.type === "datetime" ? "datetime-local" : "text";
      return `<label ${fieldAttr} class="admin-dialog-field${full}"><span>${escapeHtml(field.label)}</span><input autocomplete="off" type="${type}" name="${escapeHtml(field.key)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}" ${required}>${help}</label>`;
    }
    open({ title, fields, item, onSave, saveLabel }) {
      this.currentItem = item; this.currentFields = fields; this.onSave = onSave; this.saveLabel = saveLabel || "Salvar";
      this.title.textContent = title; this.fields.innerHTML = fields.map(field => this.fieldMarkup(field, item)).join("");
      if (this.submit) this.submit.textContent = this.saveLabel;
      const contractColor = fields.some(field => field.type === "contractColor");
      this.dialog.classList.toggle("contract-type-previewing", contractColor);
      fields.forEach(field => { const input = this.form.elements.namedItem(field.key); if (input && !(input instanceof RadioNodeList)) this.updatePreview(input); });
      this.refreshConditionalFields();
      if (contractColor) this.updateContractColorPreview();
      window.AdminImageSelect?.enhance?.(this.fields);
      this.dialog.showModal();
    }
  }


  const dialog = new ItemDialog(document.getElementById("adminItemDialog"));
  const editors = new Map([...document.querySelectorAll("[data-catalog-editor]")].map(root => { const editor = new CatalogEditor(root); return [editor.name, editor]; }));
  window.AdminItemDialog = dialog;
  window.AdminInputTools = { sanitizePositive, numberValue, percentDisplay };
  window.AdminCatalogEditors = {
    set(name, value) { editors.get(name)?.setValue(value); }, get(name) { return editors.get(name)?.getValue() || []; }, options(name, mapper = item => option(item.id, item.name || item.label || item.title || item.id)) { return (editors.get(name)?.getValue() || []).map(mapper); },
    updateReferences(kind, oldId, newId) { if (!oldId || !newId || oldId === newId) return; if (kind === "categories") { const crops = editors.get("crops"), missions = editors.get("missions"), companies = editors.get("companies"); crops?.items.forEach(item => { if (item.category === oldId) item.category = newId; }); missions?.items.forEach(item => { if (item.category === oldId) item.category = newId; }); companies?.items.forEach(item => { if (item.category === oldId) item.category = newId; }); crops?.render(); missions?.render(); companies?.render(); } },
    setBusy(busy) { document.querySelectorAll("[data-catalog-editor] button").forEach(button => { button.disabled = Boolean(busy); }); }
  };
})();
