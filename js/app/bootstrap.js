"use strict";
let maintenanceModeActive = false;
function showMaintenanceMode() {
  maintenanceModeActive = true;
  try { window.clearTimeout(gameLoopTimer); gameLoopTimer = 0; } catch {}
  document.body.classList.add("maintenance-mode");
  document.body.classList.remove("is-loading");
  const screen = document.getElementById("maintenanceScreen");
  const shell = document.querySelector(".app-shell");
  if (screen) screen.hidden = false;
  if (shell) {
    shell.setAttribute("aria-hidden", "true");
    try { shell.inert = true; } catch {}
  }
  window.FazendaSerenaLoading?.complete?.();
}
function leaveMaintenanceMode() {
  if (!maintenanceModeActive) return;
  window.location.reload();
}
async function boot() {
  const loading = window.FazendaSerenaLoading;
  loading?.update("Conectando aos serviços do jogo...", 20);
  let initialUser = null;
  let initialState = null;
  let publicGameConfig = null;
  let cloudLoadFailed = false;
  let initialCloudSaveMissing = false;
  let migrateGuestSaveOnBoot = false;
  try {
    initialUser = await window.FirebaseManager.ready();
    if (initialUser) {
      const [moderation] = await Promise.all([
        window.FirebaseManager.getOwnModeration?.({ force: true }),
        window.FirebaseManager.isCurrentUserAdmin?.({ force: true })
      ]);
      if (moderation?.banned) {
        throw new Error(moderation.reason ? `Esta conta foi bloqueada: ${moderation.reason}` : "Esta conta foi bloqueada pela administração.");
      }
      window.FirebaseManager.lockCloudWrites?.();
    }
    loading?.update(initialUser ? "Carregando sua fazenda..." : "Carregando catálogo da fazenda...", 38);
    currentAuthUid = initialUser?.uid || null;
    const [loadedState, loadedConfig] = await Promise.all([
      initialUser ? window.FirebaseManager.loadGame() : Promise.resolve(window.FirebaseManager.loadGuestGame?.() || null),
      window.FirebaseManager.loadPublicGameConfig()
    ]);
    initialState = loadedState;
    publicGameConfig = loadedConfig;
    if (initialUser) {
      initialCloudSaveMissing = !loadedState;
      // Conta nova: promove o save de visitante para a nuvem. A remoção do
      // localStorage só acontece depois que a primeira gravação remota confirma.
      if (initialCloudSaveMissing) {
        const guestState = window.FirebaseManager.loadGuestGame?.();
        initialState = guestState || null;
        migrateGuestSaveOnBoot = Boolean(guestState);
      }
      window.FirebaseManager.unlockCloudWrites?.();
    }
    loading?.update("Organizando dados e catálogos...", 58);
  } catch (error) {
    cloudLoadFailed = true;
    console.warn("Inicialização em modo resiliente:", error);
    publicGameConfig = null;
  }

  const initialRoute = new URLSearchParams(window.location.search);
  const requestedView = initialRoute.get("view");
  if (["farmView", "officeView", "profileView", "settingsView"].includes(requestedView)) activeView = requestedView;
  const requestedOffice = initialRoute.get("office");
  if (["contracts", "evolutions"].includes(requestedOffice)) activeOfficeTab = requestedOffice;
  const requestedProfile = initialRoute.get("profile");
  if (["account", "social"].includes(requestedProfile)) activeProfileTab = requestedProfile;

  loading?.update("Preparando a interface...", 70);
  const normalizedSourceConfig = window.GameAdminConfig.normalize(publicGameConfig || window.GameAdminConfig.getDefaults());
  const normalizedConfig = window.GameAdminConfig.apply(normalizedSourceConfig);
  if (normalizedConfig.globalSettings?.maintenanceMode === true) {
    showMaintenanceMode();
    let maintenanceSignature = JSON.stringify(normalizedConfig);
    window.FirebaseManager.subscribePublicGameConfig?.((cloudConfig) => {
      const liveConfig = window.GameAdminConfig.normalize(cloudConfig);
      const signature = JSON.stringify(liveConfig);
      if (signature === maintenanceSignature) return;
      maintenanceSignature = signature;
      if (liveConfig.globalSettings?.maintenanceMode !== true) leaveMaintenanceMode();
    }, error => console.warn("Atualização do modo manutenção indisponível:", error));
    return;
  }
  engine = new GameEngine(handleEngineEvent, initialState);
  window.FazendaSerenaEngineSecurity?.hardenInstance(engine);
  setupCategoryFilter();
  setupEvents();
  setupFeedback();
  setupLiveSocialContent();
  showView(activeView, false);
  applySettings();
  loading?.update("Finalizando sua fazenda...", 88);
  updateAccountUI(initialUser);
  if (initialUser && initialState && !initialCloudSaveMissing) setCloudSaveStatus("loaded");
  render(true);

  // Só retira a tela de carregamento depois de confirmar que o shell e uma view
  // ativa continuam presentes após o primeiro render.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const shell = document.querySelector(".app-shell");
  const activePanel = document.querySelector(".view.active");
  if (!shell || !activePanel) throw new Error("A interface principal não foi montada corretamente.");
  loading?.complete();

  const initialOfflineReport = engine.consumeOfflineReport?.();
  if (initialOfflineReport) window.setTimeout(() => showOfflineProgressDialog(initialOfflineReport), 240);
  if (initialUser && !cloudLoadFailed) {
    // Uma gravação ao entrar garante a criação/atualização automática do ranking
    // e conclui a migração do visitante quando esta é a primeira conta.
    engine.save().then(async result => {
      if (result?.ok && migrateGuestSaveOnBoot) window.FirebaseManager.clearGuestGame?.();
      try { await window.FirebaseManager.syncOwnLeaderboard?.(engine.state, { forceModeration: true }); }
      catch (error) { console.warn("Ranking será sincronizado novamente depois:", error); }
    }).catch(error => setCloudSaveStatus("error", { error }));
  }
  // Configuração administrativa em tempo real: alterações salvas no painel
  // passam a valer no jogo aberto sem depender de F5.
  let runtimeConfigSignature = JSON.stringify(window.GameAdminConfig.getCurrent());
  window.FirebaseManager.subscribePublicGameConfig?.((cloudConfig) => {
    const normalized = window.GameAdminConfig.normalize(cloudConfig);
    const signature = JSON.stringify(normalized);
    if (signature === runtimeConfigSignature || !engine) return;
    runtimeConfigSignature = signature;
    if (maintenanceModeActive && normalized.globalSettings?.maintenanceMode !== true) {
      leaveMaintenanceMode();
      return;
    }
    if (normalized.globalSettings?.maintenanceMode === true) {
      showMaintenanceMode();
      return;
    }
    window.GameAdminConfig.apply(normalized);
    engine.data = window.GameData;
    engine.cropById = new Map(engine.data.crops.map(crop => [crop.id, crop]));
    engine.replaceState(engine.state, { simulateOffline: false });
    setupCategoryFilter();
    applySettings(true);
    render(true);
  }, error => console.warn("Atualização administrativa em tempo real indisponível:", error));

  scheduleGameLoop(0);
}
boot().catch(error => {
  console.error("Não foi possível iniciar o jogo:", error);
  window.FazendaSerenaLoading?.fail(error);
});
