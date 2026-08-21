"use strict";
async function boot() {
  const loading = window.FazendaSerenaLoading;
  loading?.update("Conectando aos serviços do jogo...", 20);
  let initialUser = null;
  let initialState = null;
  let publicGameConfig = null;
  let cloudLoadFailed = false;
  let initialCloudSaveMissing = false;
  let promotedInitialGuest = false;
  try {
    initialUser = await window.FirebaseManager.ready();
    if (initialUser) window.FirebaseManager.lockCloudWrites?.();
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
      if (initialCloudSaveMissing) {
        const localGuest = window.FirebaseManager.loadGuestGame?.();
        if (localGuest) {
          initialState = localGuest;
          promotedInitialGuest = true;
        }
      }
      window.FirebaseManager.unlockCloudWrites?.();
    }
    loading?.update("Organizando dados e catálogos...", 58);
  } catch (error) {
    cloudLoadFailed = true;
    console.warn("Inicialização em modo resiliente:", error);
    publicGameConfig = null;
  }

  loading?.update("Preparando a interface...", 70);
  const normalizedConfig = window.GameAdminConfig.apply(publicGameConfig || window.GameAdminConfig.getDefaults());
  if (publicGameConfig) {
    window.FazendaSerenaConfig?.applyCloudVersion?.(
      window.FazendaSerenaConfig.versionFromConfig(publicGameConfig)
    );
  }
  engine = new GameEngine(handleEngineEvent, initialState);
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
  if (initialUser && initialCloudSaveMissing && !cloudLoadFailed) {
    engine.save()
      .then(result => { if (result?.ok && promotedInitialGuest) window.FirebaseManager.clearGuestGame?.(); })
      .catch(error => setCloudSaveStatus("error", { error }));
  }
  scheduleGameLoop(0);
}
boot().catch(error => {
  console.error("Não foi possível iniciar o jogo:", error);
  window.FazendaSerenaLoading?.fail(error);
});
