"use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const experienceDefaults = window.FazendaSerenaConfig.experienceDefaults;
  const audioDefaults = window.FazendaSerenaConfig.audioDefaults;
  const soundEngine = new SoundEngine();
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  const mobileViewportQuery = window.matchMedia("(max-width: 768px)");
  const tabletViewportQuery = window.matchMedia("(max-width: 1024px)");
  const getPerformanceProfile = () => {
    const mobile = mobileViewportQuery.matches;
    const touchDevice = coarsePointerQuery.matches;
    return {
      loopInterval: mobile ? 180 : touchDevice || tabletViewportQuery.matches ? 135 : 90,
      renderInterval: mobile ? 3200 : touchDevice || tabletViewportQuery.matches ? 2400 : 1800,
      liveHeaderInterval: mobile ? 260 : touchDevice ? 180 : 100,
      cropControlsInterval: mobile ? 900 : touchDevice ? 700 : 450
    };
  };
  let lastFrame = performance.now();
  let lastRender = 0;
  let lastLiveHeader = 0;
  let lastCropControls = 0;
  let lastSave = 0;
  let gameLoopTimer = 0;
  let navigationScrollActiveUntil = 0;
  let appliedSettingsSignature = "";
  let liveCropEntries = [];
  let lockedCropEntries = [];
  let cropVisibilityObserver = null;
  let activeView = "farmView";
  let engine = null;
  let currentAuthUid = null;
  let authTransitionQueue = Promise.resolve();
  let activeOfficeTab = "contracts";
  let activeProfileTab = "account";
  let showCompletedMissions = false;
  let contractDockCollapsed = false;
  let leaderboardState = { status: "idle", top: [], rank: null, player: null, error: null, loadedAt: 0 };
  let leaderboardRequest = null;
  let friendsState = { status: "idle", selfProfile: null, friends: [], incoming: [], outgoing: [], error: null, loadedAt: 0 };
  let friendsRequest = null;
  let pendingOfflineMilestones = [];
  let pendingContractBreakId = "";
  let lastResearchRenderSignature = "";
  let lastPrestigeRenderSignature = "";
  const cropUpgradeModes = new Map();

  // Elementos persistentes da interface.
  const dom = {
    tabs: $$(".nav-tab[data-view]"),
    views: $$("[data-view-panel]"),
    cropGrid: $("#cropGrid"),
    cropEmpty: $("#cropEmpty"),
    searchCrop: $("#searchCrop"),
    categoryFilter: $("#categoryFilter"),
    stockCategoryFilter: $("#stockCategoryFilter"),
    stockGrid: $("#stockGrid"),
    stockSummary: $("#stockSummary"),
    researchList: $("#researchList"),
    prestigeDashboard: $("#prestigeDashboard"),
    prestigeList: $("#prestigeList"),
    activeContractList: $("#activeContractList"),
    contractOfferList: $("#contractOfferList"),
    contractDock: $("#contractDock"),
    orderList: $("#orderList"),
    completedOrderList: $("#completedOrderList"),
    completedOrderCount: $("#completedOrderCount"),
    completedOrderBoard: $("#completedOrderBoard"),
    missionList: $("#missionList"),
    toggleCompletedMissions: $("#toggleCompletedMissions"),
    completedMissionCount: $("#completedMissionCount"),
    officeTabs: $$("[data-office-tab]"),
    officePanels: $$("[data-office-panel]"),
    profileTabs: $$("[data-profile-tab]"),
    profilePanels: $$("[data-profile-panel]"),
    contextNavBlocks: $$(`[data-context-for]`),
    contractTabCount: $("#contractTabCount"),
    orderTabCount: $("#orderTabCount"),
    missionTabCount: $("#missionTabCount"),
    coinsCounter: $("#coinsCounter"),
    researchCounter: $("#researchCounter"),
    prestigeCounter: $("#prestigeCounter"),
    floatingCoinsCounter: $("#floatingCoinsCounter"),
    floatingResearchCounter: $("#floatingResearchCounter"),
    floatingPrestigeCounter: $("#floatingPrestigeCounter"),
    farmProgress: $(".farm-progress"),
    farmXPTrack: $(".farm-progress .soft-progress"),
    farmLevelLabel: $("#farmLevelLabel"),
    farmXPBar: $("#farmXPBar"),
    farmXPText: $("#farmXPText"),
    stockNavTab: $("#stockNavTab"),
    stockNavBadge: $("#stockNavBadge"),
    contractsOfficeTab: $("#contractsOfficeTab"),
    ordersOfficeTab: $("#ordersOfficeTab"),
    evolutionsOfficeTab: $("#evolutionsOfficeTab"),
    friendsTabCount: $("#friendsTabCount"),
    friendsContent: $("#friendsContent"),
    statsHero: $("#statsHero"),
    prestigeLeaderboard: $("#prestigeLeaderboard"),
    socialEventsList: $("#socialEventsList"),
    socialEventsSummary: $("#socialEventsSummary"),
    socialEventsAccordion: $("#socialEventsAccordion"),
    lifetimeStats: $("#lifetimeStats"),
    recordStats: $("#recordStats"),
    achievementSummary: $("#achievementSummary"),
    achievementGrid: $("#achievementGrid"),
    ambientSetting: $("#ambientSetting"),
    fontScaleSetting: $("#fontScaleSetting"),
    fontScaleText: $("#fontScaleText"),
    numberFormatSetting: $("#numberFormatSetting"),
    masterVolumeSetting: $("#masterVolumeSetting"),
    masterVolumeText: $("#masterVolumeText"),
    effectVolumeSetting: $("#effectVolumeSetting"),
    effectVolumeText: $("#effectVolumeText"),
    musicVolumeSetting: $("#musicVolumeSetting"),
    musicVolumeText: $("#musicVolumeText"),
    musicTrackSetting: $("#musicTrackSetting"),
    accountAvatar: $("#accountAvatar"),
    accountName: $("#accountName"),
    accountEmail: $("#accountEmail"),
    accountDescription: $("#accountDescription"),
    googleSignIn: $("#googleSignIn"),
    googleSignOut: $("#googleSignOut"),
    resetProgressButton: $("#resetProgressButton"),
    resetProgressDialog: $("#resetProgressDialog"),
    cancelResetProgress: $("#cancelResetProgress"),
    confirmResetProgress: $("#confirmResetProgress"),
    playerProfileForm: $("#playerProfileForm"),
    playerNicknameSetting: $("#playerNicknameSetting"),
    playerAvatarPicker: $("#playerAvatarPicker"),
    playerAvatarSetting: $("#playerAvatarSetting"),
    playerRankingOptOut: $("#playerRankingOptOut"),
    selectedAvatarImage: $("#selectedAvatarImage"),
    selectedAvatarName: $("#selectedAvatarName"),
    toggleAvatarPicker: $("#toggleAvatarPicker"),
    avatarPickerPanel: $("#avatarPickerPanel"),
    savePlayerProfile: $("#savePlayerProfile"),
    playerProfileFeedback: $("#playerProfileFeedback"),
    rankingProfileLaunch: $("#rankingProfileLaunch"),
    rankingProfileDialog: $("#rankingProfileDialog"),
    openRankingProfileButton: $("#openRankingProfileButton"),
    cancelRankingProfile: $("#cancelRankingProfile"),
    prestigeConfirmDialog: $("#prestigeConfirmDialog"),
    prestigeConfirmText: $("#prestigeConfirmText"),
    cancelPrestigeConfirm: $("#cancelPrestigeConfirm"),
    confirmPrestigeConfirm: $("#confirmPrestigeConfirm"),
    milestoneDialog: $("#milestoneDialog"),
    milestoneDialogTitle: $("#milestoneDialogTitle"),
    milestoneDialogDescription: $("#milestoneDialogDescription"),
    milestoneDialogList: $("#milestoneDialogList"),
    closeMilestoneDialog: $("#closeMilestoneDialog"),
    offlineProgressDialog: $("#offlineProgressDialog"),
    offlineProgressTime: $("#offlineProgressTime"),
    offlineProgressSummary: $("#offlineProgressSummary"),
    contractBreakDialog: $("#contractBreakDialog"),
    contractBreakText: $("#contractBreakText"),
    contractBreakMissing: $("#contractBreakMissing"),
    contractBreakUnitPrice: $("#contractBreakUnitPrice"),
    contractBreakPercent: $("#contractBreakPercent"),
    contractBreakAmount: $("#contractBreakAmount"),
    cancelContractBreak: $("#cancelContractBreak"),
    confirmContractBreak: $("#confirmContractBreak"),
    openPlayerFeedback: $("#openPlayerFeedback"),
    playerFeedbackHint: $("#playerFeedbackHint"),
    playerFeedbackDialog: $("#playerFeedbackDialog"),
    playerFeedbackForm: $("#playerFeedbackForm"),
    playerFeedbackType: $("#playerFeedbackType"),
    playerFeedbackSubject: $("#playerFeedbackSubject"),
    playerFeedbackMessage: $("#playerFeedbackMessage"),
    playerFeedbackStatus: $("#playerFeedbackStatus"),
    cancelPlayerFeedback: $("#cancelPlayerFeedback"),
    submitPlayerFeedback: $("#submitPlayerFeedback"),
    backToTop: $("#backToTop")
  };

  // Utilitários de formatação e marcação segura.
