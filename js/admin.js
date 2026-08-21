"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const dom = {
    gate: $("#adminGate"), gateMessage: $("#adminGateMessage"), loader: $("#adminLoader"), signIn: $("#adminSignIn"), app: $("#adminApp"),
    userActions: $("#adminUserActions"), userLabel: $("#adminUserLabel"), signOut: $("#adminSignOut"), cloudStatus: $("#adminCloudStatus"), feedback: $("#adminFeedback"),
    actionXP: $("#adminActionXP"), passiveXP: $("#adminPassiveXP"), passiveResearch: $("#adminPassiveResearch"),
    ordersUnlockLevel: $("#adminOrdersUnlockLevel"), evolutionsUnlockLevel: $("#adminEvolutionsUnlockLevel"), prestigeUnlockLevel: $("#adminPrestigeUnlockLevel"), startingCoins: $("#adminStartingCoins"), storageCapacity: $("#adminStorageCapacity"),
    contractSignedCooldown: $("#adminContractSignedCooldown"), contractExpiredCooldown: $("#adminContractExpiredCooldown"), contractDeclinedCooldown: $("#adminContractDeclinedCooldown"), contractBrokenCooldown: $("#adminContractBrokenCooldown"),
    workspaceSelect: $("#adminWorkspaceSelect"),
    textsEditor: $("#adminTextsEditor"), saveBalance: $("#adminSaveBalance"), saveTexts: $("#adminSaveTexts"),
    administratorForm: $("#adminAdministratorForm"), administratorEmail: $("#adminAdministratorEmail"), administratorName: $("#adminAdministratorName"), administratorList: $("#adminAdministratorList")
  };
  const balanceFields = [
    ["actionXPPercent", dom.actionXP, true, false],
    ["passiveXPPercentPerSecond", dom.passiveXP, true, false],
    ["passiveResearchPercentPerSecond", dom.passiveResearch, true, false],
    ["ordersUnlockLevel", dom.ordersUnlockLevel, false, true], ["evolutionsUnlockLevel", dom.evolutionsUnlockLevel, false, true], ["prestigeUnlockLevel", dom.prestigeUnlockLevel, false, true], ["startingCoins", dom.startingCoins, false, true], ["storageCapacity", dom.storageCapacity, false, true],
    ["contractSignedCooldownSeconds", dom.contractSignedCooldown, false, true], ["contractExpiredCooldownSeconds", dom.contractExpiredCooldown, false, true], ["contractDeclinedCooldownSeconds", dom.contractDeclinedCooldown, false, true], ["contractBrokenCooldownSeconds", dom.contractBrokenCooldown, false, true]
  ];
  const catalogNames = ["pointTypes", "categories", "crops", "companies", "contractTypes", "contractSlots", "orderSteps", "missions", "research", "prestigeUpgrades", "events", "updateNotes"];
  const PRIMARY_ADMIN_EMAIL = "kaikdossantossilva2@gmail.com";
  const clone = value => JSON.parse(JSON.stringify(value));
  let authorized = false, currentConfig = window.GameAdminConfig.getDefaults(), saveQueue = Promise.resolve(), validationToken = 0;

  const setFeedback = (message = "", type = "") => { dom.feedback.textContent = message; dom.feedback.dataset.type = type; };
  const parseJSON = value => { try { return JSON.parse(String(value || "{}")); } catch (error) { throw new Error(`JSON inválido em “Textos públicos”: ${error.message}`); } };
  const sanitize = (value, integer = false) => window.AdminInputTools?.sanitizePositive(value, integer) ?? String(value || "").replace(/[^0-9.,]/g, "");
  const parsePositive = (value, integer = false) => { const normalized = sanitize(value, integer).replace(",", "."); const number = Number(normalized || 0); return integer ? Math.max(0, Math.floor(number || 0)) : Math.max(0, Number.isFinite(number) ? number : 0); };
  const percent = value => `${sanitize(value)}%`;

  function selectWorkspace(name) {
    const selected = String(name || "balance");
    document.querySelectorAll("[data-admin-section]").forEach(section => {
      section.hidden = section.dataset.adminSection !== selected;
    });
    if (dom.workspaceSelect && dom.workspaceSelect.value !== selected) dom.workspaceSelect.value = selected;
    try { sessionStorage.setItem("fazenda-serena-admin-section", selected); } catch {}
  }

  function bindPositiveInputs() {
    document.querySelectorAll("[data-admin-number]").forEach(input => {
      input.addEventListener("input", () => {
        const integer = input.hasAttribute("data-admin-integer");
        const sanitized = sanitize(input.value, integer);
        input.value = input.hasAttribute("data-admin-percent") && sanitized !== "" ? percent(sanitized) : sanitized;
        const caret = input.hasAttribute("data-admin-percent") && input.value ? Math.max(0, input.value.length - 1) : input.value.length;
        try { input.setSelectionRange(caret, caret); } catch {}
      });
      input.addEventListener("focus", () => {
        if (!input.hasAttribute("data-admin-percent") || !input.value) return;
        const caret = Math.max(0, input.value.length - 1);
        try { input.setSelectionRange(caret, caret); } catch {}
      });
      input.addEventListener("blur", () => { if (input.hasAttribute("data-admin-percent") && input.value !== "") input.value = percent(input.value); });
      input.addEventListener("keydown", event => {
        if (["e", "E", "-", "+"].includes(event.key)) event.preventDefault();
        if (input.hasAttribute("data-admin-integer") && [".", ","].includes(event.key)) event.preventDefault();
      });
    });
  }

  function balanceFromForm() { return Object.fromEntries(balanceFields.map(([key, element,, integer]) => [key, parsePositive(element.value, integer)])); }
  function fillEditors(input, { source = "editor" } = {}) {
    const config = window.GameAdminConfig.normalize(input); currentConfig = clone(config);
    balanceFields.forEach(([key, element, isPercent]) => { const value = String(config.balance[key]); element.value = isPercent ? `${value}%` : value; });
    catalogNames.forEach(name => window.AdminCatalogEditors.set(name, config[name])); dom.textsEditor.value = JSON.stringify(config.texts, null, 2);
    dom.cloudStatus.textContent = source === "cloud" ? "Configuração carregada da nuvem." : source === "empty" ? "Ainda não existe configuração publicada." : "Configuração carregada."; return config;
  }
  function setBusy(busy) { [dom.saveBalance, dom.saveTexts, dom.textsEditor, ...balanceFields.map(([, element]) => element)].filter(Boolean).forEach(element => { element.disabled = Boolean(busy); }); window.AdminCatalogEditors?.setBusy(Boolean(busy)); }
  function showGate(message, { login = false, loading = false } = {}) { authorized = false; dom.app.hidden = true; dom.gate.hidden = false; dom.gateMessage.textContent = message; dom.signIn.hidden = !login; dom.loader.hidden = !loading; dom.userActions.hidden = true; }
  function showApp(user) {
    authorized = true;
    dom.gate.hidden = true;
    dom.app.hidden = false;
    dom.userActions.hidden = false;
    dom.userLabel.textContent = user.email || user.displayName || "Administrador";
    const remembered = (() => { try { return sessionStorage.getItem("fazenda-serena-admin-section") || "balance"; } catch { return "balance"; } })();
    selectWorkspace(remembered);
  }
  const redirectUnauthorized = () => window.setTimeout(() => window.location.replace("index.html"), 900);
  function queueCloudSave(message, task) { const run = async () => { setFeedback(message, "pending"); try { const result = await task(); setFeedback("Alteração salva na nuvem.", "success"); return result; } catch (error) { setFeedback(window.FirebaseManager.getFriendlyError(error), "error"); throw error; } }; saveQueue = saveQueue.then(run, run); return saveQueue; }
  async function publishConfig(nextConfig, successMessage = "Alteração publicada.") { if (!authorized) throw new Error("Esta conta não possui acesso administrativo."); const validated = window.GameAdminConfig.validateForSave(nextConfig); await window.FirebaseManager.savePublicGameConfig(validated); currentConfig = clone(validated); dom.cloudStatus.textContent = successMessage; return validated; }
  async function saveCatalog(name) { return queueCloudSave("Salvando na nuvem...", async () => {
    const next = clone(currentConfig);
    next[name] = window.AdminCatalogEditors.get(name);
    if (name === "categories") { next.crops = window.AdminCatalogEditors.get("crops"); next.missions = window.AdminCatalogEditors.get("missions"); }
    if (name === "prestigeUpgrades") next.missions = window.AdminCatalogEditors.get("missions");
    if (name === "updateNotes") {
      const newest = next.updateNotes.slice().sort((a, b) => Number(b.publishedAt || 0) - Number(a.publishedAt || 0))[0];
      if (newest?.version) next.gameVersion = newest.version;
    }
    const published = await publishConfig(next, name === "updateNotes" ? "Nota publicada e versão do jogo atualizada." : "Alteração publicada.");
    window.FazendaSerenaPublicCloud?.clearCache?.();
    window.FazendaSerenaConfig?.applyCloudVersion?.(published.gameVersion);
    return published;
  }); }

  window.AdminCloudActions = { async beforeCatalogSave(kind, previous, next) { if (previous?.id && next?.id && previous.id !== next.id) window.AdminCatalogEditors.updateReferences(kind, previous.id, next.id); }, saveCatalog, restoreEditors() { fillEditors(currentConfig, { source: "cloud" }); }, showError(error) { setFeedback(window.FirebaseManager.getFriendlyError(error), "error"); } };

  async function renderAdministrators() {
    if (!authorized || !dom.administratorList) return;
    dom.administratorList.innerHTML = '<div class="admin-catalog-empty">Carregando administradores...</div>';
    try {
      const administrators = await window.FirebaseManager.listAdministrators();
      dom.administratorList.innerHTML = administrators.length ? administrators.map(item => {
        const email = String(item.email || item.id || "").trim().toLowerCase();
        const primary = email === PRIMARY_ADMIN_EMAIL;
        return `<article class="admin-administrator-item"><div><strong>${String(item.displayName || "Administrador").replace(/[<>]/g, "")}</strong><small>${email.replace(/[<>]/g, "")}${primary ? " · administrador principal" : ""}</small></div>${primary ? '<button class="admin-button compact" type="button" disabled title="O administrador principal não pode ser removido pelo painel.">Principal</button>' : `<button class="admin-button compact danger" data-remove-admin="${email.replace(/["<>]/g, "")}" type="button">Remover</button>`}</article>`;
      }).join("") : '<div class="admin-catalog-empty">Nenhuma conta administrativa cadastrada.</div>';
    } catch (error) { dom.administratorList.innerHTML = `<div class="admin-catalog-empty">${window.FirebaseManager.getFriendlyError(error)}</div>`; }
  }
  async function loadConfiguration() { if (!authorized) return; setBusy(true); setFeedback("Carregando configuração...", "pending"); try { const cloud = await window.FirebaseManager.loadPublicGameConfig({ throwOnError: true }); fillEditors(cloud || window.GameAdminConfig.getDefaults(), { source: cloud ? "cloud" : "empty" }); await renderAdministrators(); setFeedback(cloud ? "Configuração pronta para edição." : "Nenhuma configuração publicada ainda.", cloud ? "success" : "pending"); } catch (error) { setFeedback(window.FirebaseManager.getFriendlyError(error), "error"); } finally { setBusy(false); } }
  async function validateSession(user) {
    const token = ++validationToken;
    if (!user) return showGate("Entre com uma conta Google autorizada.", { login: true });
    showGate("Validando acesso administrativo...", { loading: true });
    try {
      const isAdmin = await window.FirebaseManager.isCurrentUserAdmin({ force: true });
      if (token !== validationToken) return;
      if (!isAdmin) throw new Error("Esta conta não possui acesso administrativo.");
      showApp(user);
      await loadConfiguration();
    } catch (error) {
      if (token !== validationToken) return;
      showGate("Conta sem permissão para acessar a administração. Redirecionando para o jogo.");
      redirectUnauthorized();
    }
  }

  dom.signIn.addEventListener("click", async () => { dom.signIn.disabled = true; try { await window.FirebaseManager.signInWithGoogle(); } catch (error) { showGate(window.FirebaseManager.getFriendlyError(error), { login: true }); } finally { dom.signIn.disabled = false; } });
  dom.signOut.addEventListener("click", async () => { dom.signOut.disabled = true; try { await window.FirebaseManager.signOut(); } finally { dom.signOut.disabled = false; } });
  dom.saveBalance.addEventListener("click", () => queueCloudSave("Salvando parâmetros...", async () => { const next = clone(currentConfig); next.balance = balanceFromForm(); return publishConfig(next, "Parâmetros atualizados."); }).catch(() => {}));
  dom.saveTexts.addEventListener("click", () => queueCloudSave("Salvando textos...", async () => { const next = clone(currentConfig); next.texts = parseJSON(dom.textsEditor.value); return publishConfig(next, "Textos atualizados."); }).catch(() => {}));
  dom.administratorForm?.addEventListener("submit", event => { event.preventDefault(); queueCloudSave("Cadastrando administrador...", async () => { await window.FirebaseManager.addAdministrator(dom.administratorEmail.value, dom.administratorName.value); dom.administratorForm.reset(); await renderAdministrators(); }).catch(() => {}); });
  dom.administratorList?.addEventListener("click", event => { const button = event.target.closest("[data-remove-admin]"); if (!button) return; const email = String(button.dataset.removeAdmin || "").trim().toLowerCase(); if (email === PRIMARY_ADMIN_EMAIL) return; if (!confirm(`Remover ${email} da administração?`)) return; queueCloudSave("Removendo administrador...", async () => { await window.FirebaseManager.removeAdministrator(email); await renderAdministrators(); }).catch(() => {}); });

  bindPositiveInputs();
  dom.workspaceSelect?.addEventListener("change", () => selectWorkspace(dom.workspaceSelect.value));
  selectWorkspace("balance");
  window.FirebaseManager.subscribeAuth((user, error) => { if (error) return showGate(window.FirebaseManager.getFriendlyError(error), { login: true }); validateSession(user).catch(failure => { console.warn(failure); showGate("Não foi possível validar o acesso administrativo.", { user }); redirectUnauthorized(); }); });
})();
