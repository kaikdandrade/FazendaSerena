"use strict";

/*
 * Firebase Authentication + Cloud Firestore para contas conectadas.
 * Visitantes usam um save local no navegador; no primeiro login, esse save é
 * enviado para a nuvem apenas quando a conta ainda não possui progresso.
 */
class FirebaseManager {
  static SDK_VERSION = "12.17.0";
  static SAVE_COLLECTION = "players";
  static SAVE_SUBCOLLECTION = "saves";
  static SAVE_DOCUMENT = "main";
  static LEADERBOARD_COLLECTION = "prestigeLeaderboard";
  static FRIEND_PROFILE_COLLECTION = "friendProfiles";
  static FRIENDSHIP_COLLECTION = "friendships";
  static GAME_CONFIG_COLLECTION = "gameConfig";
  static GAME_CONFIG_DOCUMENT = "public";
  static ADMIN_COLLECTION = "administrators";
  static FEEDBACK_COLLECTION = "playerFeedback";
  static MODERATION_COLLECTION = "playerModeration";
  static GUEST_SAVE_KEY = "fazenda-serena-guest-save-v1";
  static cloudWritesLocked = false;

  constructor() {
    this.available = false;
    this.currentUser = null;
    this.initialAuthResolved = false;
    this.authListeners = new Set();
    this.saveQueue = Promise.resolve();
    this.friendProfileSignatureByUid = new Map();
    this.adminAccessCache = new Map();
    this.moderationCache = new Map();
    this.initialization = this.initialize();
  }

  async initialize() {
    try {
      if (!window.FIREBASE_CONFIG) {
        throw new Error("A configuração do Firebase não foi carregada.");
      }

      const version = FirebaseManager.SDK_VERSION;
      const sdkImports = Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
      ]);
      const importTimeout = new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("O carregamento do SDK do Firebase excedeu o tempo limite.")), 8000);
      });
      const [appSdk, authSdk, firestoreSdk] = await Promise.race([sdkImports, importTimeout]);

      this.sdk = { ...appSdk, ...authSdk, ...firestoreSdk };
      this.app = appSdk.initializeApp(window.FIREBASE_CONFIG);
      this.auth = authSdk.getAuth(this.app);

      // Persistência local nativa do Firestore. Além de permitir leitura offline,
      // ela mantém as mutações pendentes no IndexedDB para que um F5/fechamento
      // da aba não descarte uma compra ou aprimoramento que acabou de ser salvo.
      // O próprio SDK sincroniza essas mutações com o servidor ao reabrir.
      try {
        this.db = firestoreSdk.initializeFirestore(this.app, {
          localCache: firestoreSdk.persistentLocalCache({
            tabManager: firestoreSdk.persistentMultipleTabManager()
          })
        });
        this.firestorePersistenceEnabled = true;
      } catch (persistenceError) {
        console.warn("Persistência local do Firestore indisponível; usando cache em memória:", persistenceError);
        this.db = firestoreSdk.getFirestore(this.app);
        this.firestorePersistenceEnabled = false;
      }

      // App Check reduz chamadas originadas fora do aplicativo. A proteção só
      // entra em vigor quando a chave pública for configurada e o enforcement
      // for ativado no Console Firebase. Regras do Firestore continuam sendo
      // a camada de autorização real.
      const appCheckSiteKey = String(window.FIREBASE_APP_CHECK_SITE_KEY || "").trim();
      if (appCheckSiteKey) {
        try {
          const appCheckSdk = await import(`https://www.gstatic.com/firebasejs/${version}/firebase-app-check.js`);
          this.appCheck = appCheckSdk.initializeAppCheck(this.app, {
            provider: new appCheckSdk.ReCaptchaEnterpriseProvider(appCheckSiteKey),
            isTokenAutoRefreshEnabled: true
          });
        } catch (error) {
          console.warn("App Check não pôde ser inicializado:", error);
        }
      }

      try {
        await authSdk.setPersistence(this.auth, authSdk.indexedDBLocalPersistence);
      } catch (indexedDbError) {
        try {
          await authSdk.setPersistence(this.auth, authSdk.browserLocalPersistence);
        } catch (error) {
          console.warn("Não foi possível manter a sessão do Firebase:", error);
        }
      }

      const initialAuthState = new Promise(resolve => {
        authSdk.onAuthStateChanged(
          this.auth,
          user => {
            this.currentUser = user || null;
            this.adminAccessCache.clear();
            this.moderationCache.clear();
            const firstResolution = !this.initialAuthResolved;
            this.initialAuthResolved = true;
            this.emitAuthState();
            if (firstResolution) resolve(this.currentUser);
          },
          error => {
            console.warn("Falha ao observar a autenticação:", error);
            this.currentUser = null;
            this.initialAuthResolved = true;
            this.emitAuthState(error);
            resolve(null);
          }
        );
      });
      await Promise.race([
        initialAuthState,
        new Promise(resolve => window.setTimeout(() => {
          if (!this.initialAuthResolved) {
            this.initialAuthResolved = true;
            this.emitAuthState();
          }
          resolve(null);
        }, 5000))
      ]);

      this.available = true;
      return this.currentUser;
    } catch (error) {
      console.warn("Firebase indisponível:", error);
      this.available = false;
      this.currentUser = null;
      this.initialAuthResolved = true;
      this.emitAuthState(error);
      return null;
    }
  }

  async ready() {
    await this.initialization;
    return this.currentUser;
  }

  isAvailable() {
    return this.available;
  }

  isAuthenticated() {
    return Boolean(this.currentUser);
  }

  getUser() {
    return this.currentUser;
  }

  subscribeAuth(listener) {
    if (typeof listener !== "function") return () => {};
    this.authListeners.add(listener);
    if (this.initialAuthResolved) {
      queueMicrotask(() => listener(this.currentUser, null));
    }
    return () => this.authListeners.delete(listener);
  }

  emitAuthState(error = null) {
    this.authListeners.forEach(listener => {
      try {
        listener(this.currentUser, error);
      } catch (listenerError) {
        console.warn(listenerError);
      }
    });
  }

  emitSaveStatus(status, extra = {}) {
    window.dispatchEvent(new CustomEvent("firebase-save-status", {
      detail: { status, ...extra }
    }));
  }


  loadGuestGame() {
    try {
      const raw = window.localStorage?.getItem(FirebaseManager.GUEST_SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state && typeof parsed.state === "object" ? parsed.state : null;
    } catch (error) {
      console.warn("Não foi possível ler o save local do visitante:", error);
      return null;
    }
  }

  saveGuestGame(state) {
    try {
      const snapshot = JSON.parse(JSON.stringify(state || {}));
      window.localStorage?.setItem(FirebaseManager.GUEST_SAVE_KEY, JSON.stringify({
        state: snapshot,
        savedAt: Date.now(),
        saveVersion: String(snapshot.version || window.FazendaSerenaConfig?.appVersion || "1.0.1")
      }));
      this.emitSaveStatus("local", { savedAt: new Date() });
      return { ok: true, local: true, savedAt: new Date() };
    } catch (error) {
      console.warn("Não foi possível salvar o progresso local do visitante:", error);
      this.emitSaveStatus("error", { error });
      return { ok: false, reason: "local-storage", error };
    }
  }

  clearGuestGame() {
    try { window.localStorage?.removeItem(FirebaseManager.GUEST_SAVE_KEY); } catch (_) {}
  }

  lockCloudWrites() { FirebaseManager.cloudWritesLocked = true; }
  unlockCloudWrites() { FirebaseManager.cloudWritesLocked = false; }
  areCloudWritesLocked() { return Boolean(FirebaseManager.cloudWritesLocked); }

  getSaveReference(user = this.currentUser) {
    if (!user || !this.db || !this.sdk) return null;
    return this.sdk.doc(
      this.db,
      FirebaseManager.SAVE_COLLECTION,
      user.uid,
      FirebaseManager.SAVE_SUBCOLLECTION,
      FirebaseManager.SAVE_DOCUMENT
    );
  }

  getLeaderboardReference(user = this.currentUser) {
    if (!user || !this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.LEADERBOARD_COLLECTION, user.uid);
  }

  async removeOwnLeaderboardEntry() {
    await this.ready();
    const user = this.currentUser;
    const reference = this.getLeaderboardReference(user);
    if (!user || !reference) return { ok: false, reason: "guest" };
    // O uso no painel exige administrador; fora dele, o próprio usuário já
    // pode apagar sua entrada pelas regras quando opta por sair do ranking.
    if (await this.isCurrentUserAdmin({ force: true })) {
      await this.sdk.deleteDoc(reference).catch(() => {});
      return { ok: true, administrator: true };
    }
    await this.sdk.deleteDoc(reference);
    return { ok: true, administrator: false };
  }

  getFriendProfileReference(user = this.currentUser) {
    if (!user || !this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.FRIEND_PROFILE_COLLECTION, user.uid);
  }

  getFriendshipReference(friendshipId) {
    const safeId = String(friendshipId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 180);
    if (!safeId || !this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.FRIENDSHIP_COLLECTION, safeId);
  }

  makeFriendshipId(firstUid, secondUid) {
    const members = [String(firstUid || ""), String(secondUid || "")].filter(Boolean).sort();
    return members.length === 2 && members[0] !== members[1] ? members.join("__") : "";
  }

  getModerationReference(userId = this.currentUser?.uid) {
    const uid = String(userId || "").trim();
    if (!uid || !this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.MODERATION_COLLECTION, uid);
  }

  async requireAdmin() {
    await this.ready();
    if (!(await this.isCurrentUserAdmin({ force: true }))) {
      throw new Error("Esta conta não possui acesso administrativo.");
    }
    return this.currentUser;
  }

  async getOwnModeration({ force = false } = {}) {
    await this.ready();
    const user = this.currentUser;
    if (!user) return { banned: false, rankingBlocked: false };
    if (!force && this.moderationCache.has(user.uid)) return this.moderationCache.get(user.uid);
    try {
      const ref = this.getModerationReference(user.uid);
      const snap = ref ? await this.sdk.getDoc(ref) : null;
      const data = snap?.exists?.() ? snap.data() || {} : {};
      const result = { banned: data.banned === true, rankingBlocked: data.rankingBlocked === true, reason: String(data.reason || "") };
      this.moderationCache.set(user.uid, result);
      return result;
    } catch (error) {
      console.warn("Não foi possível consultar a moderação da conta:", error);
      return { banned: false, rankingBlocked: false };
    }
  }

  async getPlayerModerationForAdmin(userId) {
    await this.requireAdmin();
    const ref = this.getModerationReference(userId);
    const snap = ref ? await this.sdk.getDoc(ref) : null;
    const data = snap?.exists?.() ? snap.data() || {} : {};
    return { banned: data.banned === true, rankingBlocked: data.rankingBlocked === true, reason: String(data.reason || "") };
  }

  async setPlayerModerationForAdmin(userId, patch = {}) {
    const admin = await this.requireAdmin();
    const uid = String(userId || "").trim();
    if (!uid) throw new Error("Jogador inválido.");
    const ref = this.getModerationReference(uid);
    const current = await this.getPlayerModerationForAdmin(uid);
    const next = {
      banned: patch.banned == null ? current.banned : Boolean(patch.banned),
      rankingBlocked: patch.rankingBlocked == null ? current.rankingBlocked : Boolean(patch.rankingBlocked),
      reason: String(patch.reason ?? current.reason ?? "").trim().slice(0, 240),
      updatedAt: this.sdk.serverTimestamp(),
      updatedAtClient: Date.now(),
      updatedBy: admin.uid
    };
    await this.sdk.setDoc(ref, next, { merge: false });
    const leaderboardRef = this.sdk.doc(this.db, FirebaseManager.LEADERBOARD_COLLECTION, uid);
    if (next.banned || next.rankingBlocked) {
      try { await this.sdk.deleteDoc(leaderboardRef); } catch (_) {}
    }
    if (uid === this.currentUser?.uid) this.moderationCache.set(uid, next);
    return { ok: true, ...next };
  }

  getAdminReference(user = this.currentUser) {
    if (!user?.email || !this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.ADMIN_COLLECTION, String(user.email).trim().toLowerCase());
  }

  async isCurrentUserAdmin({ force = false } = {}) {
    await this.ready();
    const user = this.currentUser;
    if (!user) return false;
    const email = String(user.email || "").trim();
    const cacheKey = `${user.uid}:${email}`;
    if (!force && this.adminAccessCache.has(cacheKey)) return this.adminAccessCache.get(cacheKey);
    try {
      const references = [];
      const emailReference = this.getAdminReference(user);
      if (emailReference) references.push(emailReference);
      if (user.uid) references.push(this.sdk.doc(this.db, FirebaseManager.ADMIN_COLLECTION, user.uid));
      for (const reference of references) {
        const snapshot = await this.sdk.getDoc(reference);
        if (snapshot.exists() && snapshot.data()?.enabled === true) {
          this.adminAccessCache.set(cacheKey, true);
          return true;
        }
      }
    } catch (error) {
      console.warn("Não foi possível validar a conta administrativa:", error);
    }
    this.adminAccessCache.set(cacheKey, false);
    return false;
  }

  async listAdministrators() {
    await this.ready();
    await this.requireAdmin();
    const snapshot = await this.sdk.getDocs(this.sdk.collection(this.db, FirebaseManager.ADMIN_COLLECTION));
    const byEmail = new Map();
    snapshot.docs.forEach(document => {
      const data = { id: document.id, ...document.data() };
      const email = String(data.email || (document.id.includes("@") ? document.id : "")).trim().toLowerCase();
      if (!data.enabled || !email.includes("@")) return;
      const existing = byEmail.get(email);
      if (!existing || document.id === email) byEmail.set(email, { ...data, email });
    });
    return [...byEmail.values()].sort((a, b) => String(a.email).localeCompare(String(b.email), "pt-BR"));
  }

  async addAdministrator(email, displayName = "Administrador") {
    await this.ready();
    await this.requireAdmin();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error("Informe um e-mail válido.");
    const reference = this.sdk.doc(this.db, FirebaseManager.ADMIN_COLLECTION, normalizedEmail);
    await this.sdk.setDoc(reference, {
      enabled: true, email: normalizedEmail, displayName: String(displayName || "Administrador").trim().slice(0, 80) || "Administrador",
      createdAt: this.sdk.serverTimestamp(), createdAtClient: Date.now(), createdBy: this.currentUser.uid
    }, { merge: true });
    return { ok: true, email: normalizedEmail };
  }

  async removeAdministrator(email) {
    await this.ready();
    await this.requireAdmin();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (normalizedEmail === "kaikdossantossilva2@gmail.com") throw new Error("O administrador principal não pode ser removido pelo painel.");
    if (normalizedEmail === String(this.currentUser?.email || "").toLowerCase()) throw new Error("Você não pode remover a própria conta enquanto estiver usando o painel.");

    const snapshot = await this.sdk.getDocs(this.sdk.collection(this.db, FirebaseManager.ADMIN_COLLECTION));
    const references = snapshot.docs
      .filter(document => {
        const dataEmail = String(document.data()?.email || (document.id.includes("@") ? document.id : "")).trim().toLowerCase();
        return dataEmail === normalizedEmail;
      })
      .map(document => document.ref);
    if (!references.some(reference => reference.id === normalizedEmail)) {
      references.push(this.sdk.doc(this.db, FirebaseManager.ADMIN_COLLECTION, normalizedEmail));
    }
    await Promise.all(references.map(reference => this.sdk.deleteDoc(reference)));
    this.adminAccessCache.clear();
    return { ok: true };
  }

  getGameConfigReference() {
    if (!this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.GAME_CONFIG_COLLECTION, FirebaseManager.GAME_CONFIG_DOCUMENT);
  }

  async loadPublicGameConfig({ throwOnError = false } = {}) {
    await this.ready();
    const reference = this.getGameConfigReference();
    if (!reference) return null;
    try {
      const snapshot = await this.sdk.getDoc(reference);
      if (!snapshot.exists()) return null;
      const data = snapshot.data();
      return data?.config && typeof data.config === "object" ? data.config : null;
    } catch (error) {
      console.warn("Não foi possível carregar a configuração pública do jogo:", error);
      if (throwOnError) throw error;
      return null;
    }
  }

  async savePublicGameConfig(config) {
    await this.ready();
    const user = this.currentUser;
    const reference = this.getGameConfigReference();
    if (!user || !reference) throw new Error("Entre com uma conta administrativa.");
    await this.requireAdmin();
    const safeConfig = JSON.parse(JSON.stringify(config || {}));
    await this.sdk.setDoc(reference, {
      config: safeConfig,
      schemaVersion: Math.max(1, Math.floor(Number(safeConfig.schemaVersion) || 1)),
      updatedAt: this.sdk.serverTimestamp(),
      updatedAtClient: Date.now(),
      updatedBy: user.uid
    });
    return { ok: true, config: safeConfig };
  }

  getAvatarEntry(avatarId) {
    const safeId = String(avatarId || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48);
    const resolvedId = window.AvatarAliases?.[safeId] || safeId;
    return (window.AvatarData || []).find(avatar => avatar.id === resolvedId) || null;
  }

  normalizeNickname(value) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);
  }

  hasCompleteLeaderboardProfile(state) {
    const nickname = this.normalizeNickname(state?.settings?.playerNickname);
    const avatar = this.getAvatarEntry(state?.settings?.playerAvatar);
    const rankingOptOut = Boolean(state?.settings?.playerRankingOptOut);
    return !rankingOptOut && nickname.length >= 4 && nickname.length <= 24 && Boolean(avatar);
  }

  buildLeaderboardEntry(state, user = this.currentUser) {
    if (!user || !this.hasCompleteLeaderboardProfile(state)) return null;
    const displayName = this.normalizeNickname(state.settings.playerNickname);
    const avatar = this.getAvatarEntry(state.settings.playerAvatar);
    return {
      displayName,
      avatarId: avatar.id,
      profileComplete: true,
      prestigeTotal: Math.max(0, Math.floor(Number(state?.stats?.totalPrestigeEarned) || 0)),
      prestigeCount: Math.max(0, Math.floor(Number(state?.stats?.prestiges) || 0)),
      farmLevel: Math.max(1, Math.floor(Number(state?.farmLevel) || 1)),
      maxFarmLevel: Math.max(1, Math.floor(Number(state?.stats?.maxFarmLevel || state?.farmLevel) || 1)),
      updatedAt: this.sdk.serverTimestamp(),
      updatedAtClient: Date.now()
    };
  }

  hasCompleteFriendProfile(state) {
    const nickname = this.normalizeNickname(state?.settings?.playerNickname);
    const avatar = this.getAvatarEntry(state?.settings?.playerAvatar);
    return nickname.length >= 4 && nickname.length <= 24 && Boolean(avatar);
  }

  buildFriendProfileEntry(state, user = this.currentUser) {
    if (!user || !this.hasCompleteFriendProfile(state)) return null;
    const avatar = this.getAvatarEntry(state.settings.playerAvatar);
    return {
      displayName: this.normalizeNickname(state.settings.playerNickname),
      avatarId: avatar.id,
      friendCode: user.uid,
      profileComplete: true,
      updatedAt: this.sdk.serverTimestamp(),
      updatedAtClient: Date.now()
    };
  }

  async loadGame() {
    await this.ready();
    const user = this.currentUser;
    const reference = this.getSaveReference(user);
    if (!user || !reference) return null;

    this.emitSaveStatus("loading");
    try {
      const snapshot = await this.sdk.getDoc(reference);
      if (!snapshot.exists()) {
        this.emitSaveStatus("empty");
        return null;
      }

      const data = snapshot.data();
      const state = data?.state && typeof data.state === "object" ? data.state : null;
      this.emitSaveStatus(state ? "loaded" : "empty", {
        savedAt: data?.updatedAt?.toDate?.() || null
      });
      return state;
    } catch (error) {
      this.emitSaveStatus("error", { error });
      throw error;
    }
  }

  subscribeOwnSaveState(listener, errorListener = null) {
    let unsubscribe = () => {};
    let cancelled = false;
    this.ready().then(() => {
      if (cancelled || typeof listener !== "function") return;
      const user = this.currentUser;
      const reference = this.getSaveReference(user);
      if (!user || !reference || !this.sdk?.onSnapshot) return;
      unsubscribe = this.sdk.onSnapshot(reference, snapshot => {
        if (!snapshot.exists() || snapshot.metadata?.hasPendingWrites) return;
        const data = snapshot.data() || {};
        const state = data.state && typeof data.state === "object" ? data.state : null;
        if (state) listener(state, {
          updatedAtClient: Number(data.updatedAtClient) || 0,
          savedAt: data.updatedAt?.toDate?.() || null
        });
      }, error => {
        if (typeof errorListener === "function") errorListener(error);
        else console.warn("Não foi possível observar alterações externas do save:", error);
      });
    }).catch(error => {
      if (typeof errorListener === "function") errorListener(error);
    });
    return () => { cancelled = true; try { unsubscribe?.(); } catch (_) {} };
  }

  async mutateCurrentPlayerSaveForAdmin(mutator, mutationType = "admin-test") {
    await this.requireAdmin();
    if (typeof mutator !== "function") throw new Error("A alteração administrativa não possui uma transformação válida.");
    const user = this.currentUser;
    const reference = this.getSaveReference(user);
    if (!user || !reference) throw new Error("Nenhuma conta autenticada foi encontrada.");
    const mutationId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let resultingState = null;
    await this.sdk.runTransaction(this.db, async transaction => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("Abra o jogo com esta conta ao menos uma vez antes de usar os testes.");
      const payload = snapshot.data() || {};
      const state = JSON.parse(JSON.stringify(payload.state || {}));
      const result = await mutator(state, { userId: user.uid, payload });
      if (result === false || result?.changed === false) { resultingState = state; return; }
      const now = Date.now();
      state.lastUpdate = now;
      state.__adminMutation = { id: mutationId, type: String(mutationType || "admin-test").slice(0, 48), at: now };
      resultingState = state;
      transaction.update(reference, {
        state,
        updatedAt: this.sdk.serverTimestamp(),
        updatedAtClient: now
      });
    });
    const verified = await this.sdk.getDoc(reference);
    const verifiedState = verified.exists() && verified.data()?.state && typeof verified.data().state === "object"
      ? verified.data().state
      : resultingState;
    return { ok: true, state: verifiedState, mutationId };
  }

  saveRankingProfile(state) {
    if (FirebaseManager.cloudWritesLocked) {
      return Promise.resolve({ ok: false, reason: "cloud-read-unconfirmed" });
    }

    const requestedState = JSON.parse(JSON.stringify(state || {}));
    const requestedNickname = this.normalizeNickname(requestedState?.settings?.playerNickname);
    const requestedAvatar = this.getAvatarEntry(requestedState?.settings?.playerAvatar);
    const requestedOptOut = Boolean(requestedState?.settings?.playerRankingOptOut);

    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(async () => {
        await this.ready();
        const user = this.currentUser;
        const reference = this.getSaveReference(user);
        const leaderboardReference = this.getLeaderboardReference(user);
        const friendProfileReference = this.getFriendProfileReference(user);
        if (!user || !reference) return { ok: false, reason: "guest" };
        if (requestedNickname.length < 4 || requestedNickname.length > 24 || !requestedAvatar) {
          return { ok: false, reason: "invalid-profile", error: new Error("Apelido ou avatar inválido.") };
        }

        this.emitSaveStatus("saving");
        try {
          const currentSave = await this.sdk.getDoc(reference);
          if (!currentSave.exists()) {
            const error = new Error("O save da conta ainda não existe. Recarregue o jogo e tente novamente.");
            this.emitSaveStatus("error", { error });
            return { ok: false, reason: "missing-save", error };
          }

          const cloudState = JSON.parse(JSON.stringify(currentSave.data()?.state || {}));
          cloudState.settings = {
            ...(cloudState.settings || {}),
            playerNickname: requestedNickname,
            playerAvatar: requestedAvatar.id,
            playerRankingOptOut: requestedOptOut
          };

          // Primeiro confirma o perfil dentro do save. Ranking e amizade são
          // sincronizações secundárias e nunca podem cancelar esta gravação.
          await this.sdk.updateDoc(reference, {
            "state.settings.playerNickname": requestedNickname,
            "state.settings.playerAvatar": requestedAvatar.id,
            "state.settings.playerRankingOptOut": requestedOptOut
          });

          let socialSynced = true;
          try {
            const administrator = await this.isCurrentUserAdmin();
            const moderation = await this.getOwnModeration({ force: false });
            if (leaderboardReference) {
              const leaderboardEntry = (!administrator && !moderation.rankingBlocked && !requestedOptOut)
                ? this.buildLeaderboardEntry(cloudState, user)
                : null;
              if (leaderboardEntry) await this.sdk.setDoc(leaderboardReference, leaderboardEntry, { merge: false });
              else await this.sdk.deleteDoc(leaderboardReference);
            }
          } catch (error) {
            socialSynced = false;
            console.warn("Perfil salvo, mas o ranking não pôde ser atualizado:", error);
          }

          try {
            const friendProfileEntry = friendProfileReference
              ? this.buildFriendProfileEntry(cloudState, user)
              : null;
            if (friendProfileReference) {
              if (friendProfileEntry) await this.sdk.setDoc(friendProfileReference, friendProfileEntry, { merge: false });
              else await this.sdk.deleteDoc(friendProfileReference);
              const friendProfileSignature = friendProfileEntry
                ? `${friendProfileEntry.displayName}\u0000${friendProfileEntry.avatarId}`
                : "";
              this.friendProfileSignatureByUid.set(user.uid, friendProfileSignature);
            }
          } catch (error) {
            socialSynced = false;
            console.warn("Perfil salvo, mas o perfil de amizade não pôde ser atualizado:", error);
          }

          const savedAt = new Date();
          this.emitSaveStatus("saved", { savedAt });
          return { ok: true, savedAt, socialSynced };
        } catch (error) {
          this.emitSaveStatus("error", { error });
          console.warn("Não foi possível salvar o perfil do ranking no Firestore:", error);
          return { ok: false, reason: "firestore", error };
        }
      });

    return this.saveQueue;
  }

  saveGame(state) {
    if (FirebaseManager.cloudWritesLocked) {
      return Promise.resolve({ ok: false, reason: "cloud-read-unconfirmed" });
    }

    const snapshot = JSON.parse(JSON.stringify(state || {}));
    delete snapshot.__adminMutation;
    delete snapshot.__adminTestAppliedAt;

    const run = async () => {
      // Durante o jogo normal o Firebase já está inicializado. Evitar uma
      // consulta de moderação ou qualquer outra leitura antes do setDoc é
      // intencional: a gravação principal precisa entrar na fila local do
      // Firestore imediatamente, inclusive quando o usuário aperta F5.
      if (!this.initialAuthResolved) await this.ready();
      const user = this.currentUser;
      const reference = this.getSaveReference(user);
      if (!user || !reference || !this.sdk || !this.db) {
        this.emitSaveStatus("guest");
        return { ok: false, reason: "guest" };
      }

      const savedAt = new Date();
      this.emitSaveStatus("saving");
      try {
        // O save do jogo é independente do ranking/amigos. Antes, tudo ficava
        // no mesmo batch: uma regra social rejeitada cancelava também a compra,
        // o upgrade e todo o progresso. Agora o estado principal é soberano.
        await this.sdk.setDoc(reference, {
          state: snapshot,
          saveVersion: String(snapshot.version || window.FazendaSerenaConfig.appVersion),
          ownerEmail: String(user.email || "").trim(),
          updatedAt: this.sdk.serverTimestamp(),
          updatedAtClient: savedAt.getTime()
        }, { merge: false });

        this.emitSaveStatus("saved", { savedAt });

        // Ranking e perfil de amizade são projeções públicas do save. Falhas
        // nessas projeções nunca mais podem invalidar o progresso da fazenda.
        Promise.resolve().then(async () => {
          try {
            const leaderboardReference = this.getLeaderboardReference(user);
            const friendProfileReference = this.getFriendProfileReference(user);
            const administrator = await this.isCurrentUserAdmin();
            const moderation = administrator
              ? { banned: false, rankingBlocked: true }
              : await this.getOwnModeration({ force: false });

            if (leaderboardReference) {
              const leaderboardEntry = (!administrator && !moderation.banned && !moderation.rankingBlocked)
                ? this.buildLeaderboardEntry(snapshot, user)
                : null;
              try {
                if (leaderboardEntry) await this.sdk.setDoc(leaderboardReference, leaderboardEntry, { merge: false });
                else await this.sdk.deleteDoc(leaderboardReference);
              } catch (socialError) {
                console.warn("Save concluído, mas o ranking não pôde ser sincronizado:", socialError);
              }
            }

            if (friendProfileReference) {
              const friendProfileEntry = this.buildFriendProfileEntry(snapshot, user);
              const friendProfileSignature = friendProfileEntry
                ? `${friendProfileEntry.displayName}\u0000${friendProfileEntry.avatarId}`
                : "";
              const shouldSyncFriendProfile = this.friendProfileSignatureByUid.get(user.uid) !== friendProfileSignature;
              if (shouldSyncFriendProfile) {
                try {
                  if (friendProfileEntry) await this.sdk.setDoc(friendProfileReference, friendProfileEntry, { merge: false });
                  else await this.sdk.deleteDoc(friendProfileReference);
                  this.friendProfileSignatureByUid.set(user.uid, friendProfileSignature);
                } catch (socialError) {
                  console.warn("Save concluído, mas o perfil social não pôde ser sincronizado:", socialError);
                }
              }
            }
          } catch (socialError) {
            console.warn("Save concluído; sincronização social adiada:", socialError);
          }
        });

        return { ok: true, savedAt };
      } catch (error) {
        this.emitSaveStatus("error", { error });
        console.warn("Não foi possível salvar o progresso principal no Firestore:", error);
        return { ok: false, reason: "firestore", error };
      }
    };

    const operation = run();
    this.saveQueue = operation.catch(() => {});
    return operation;
  }

  async loadPrestigeLeaderboard(maximum = 5) {
    await this.ready();
    if (!this.available || !this.db || !this.sdk) return { authenticated: false, top: [], rank: null, player: null };
    const outputLimit = Math.max(1, Math.min(5, Math.floor(Number(maximum) || 5)));
    const snapshot = await this.sdk.getDocs(this.sdk.collection(this.db, FirebaseManager.LEADERBOARD_COLLECTION));
    const validEntries = snapshot.docs.map(document => ({ uid: document.id, ...document.data() })).filter(entry => {
      const nickname = this.normalizeNickname(entry.displayName);
      return entry.profileComplete === true && nickname.length >= 4 && nickname.length <= 24;
    }).sort((a, b) => {
      const prestige = (Number(b.prestigeCount) || 0) - (Number(a.prestigeCount) || 0);
      if (prestige) return prestige;
      const level = (Number(b.farmLevel) || 1) - (Number(a.farmLevel) || 1);
      if (level) return level;
      const maxLevel = (Number(b.maxFarmLevel) || 1) - (Number(a.maxFarmLevel) || 1);
      if (maxLevel) return maxLevel;
      return (Number(a.updatedAtClient) || 0) - (Number(b.updatedAtClient) || 0);
    }).map((entry, index) => ({ ...entry, position: index + 1 }));
    const user = this.currentUser;
    const player = user ? validEntries.find(entry => entry.uid === user.uid) || null : null;
    return { authenticated: Boolean(user), top: validEntries.slice(0, outputLimit), rank: player?.position || null, player };
  }

  async loadFriendships() {
    await this.ready();
    const user = this.currentUser;
    if (!user || !this.available || !this.db || !this.sdk) {
      return { authenticated: false, selfProfile: null, friends: [], incoming: [], outgoing: [] };
    }

    const selfReference = this.getFriendProfileReference(user);
    const relationshipsQuery = this.sdk.query(
      this.sdk.collection(this.db, FirebaseManager.FRIENDSHIP_COLLECTION),
      this.sdk.where("members", "array-contains", user.uid),
      this.sdk.limit(100)
    );
    const [selfSnapshot, relationshipsSnapshot] = await Promise.all([
      this.sdk.getDoc(selfReference),
      this.sdk.getDocs(relationshipsQuery)
    ]);

    const relationships = relationshipsSnapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));
    const otherUids = [...new Set(relationships.map(item =>
      Array.isArray(item.members) ? item.members.find(uid => uid !== user.uid) : ""
    ).filter(Boolean))];
    const profileEntries = await Promise.all(otherUids.map(async uid => {
      const snapshot = await this.sdk.getDoc(this.sdk.doc(this.db, FirebaseManager.FRIEND_PROFILE_COLLECTION, uid));
      return [uid, snapshot.exists() ? { uid, ...snapshot.data() } : null];
    }));
    const profiles = new Map(profileEntries);
    const enrich = item => {
      const friendUid = Array.isArray(item.members) ? item.members.find(uid => uid !== user.uid) : "";
      return { ...item, friendUid, profile: profiles.get(friendUid) || null };
    };

    return {
      authenticated: true,
      selfProfile: selfSnapshot.exists() ? { uid: user.uid, ...selfSnapshot.data() } : null,
      friends: relationships.filter(item => item.status === "accepted").map(enrich),
      incoming: relationships.filter(item => item.status === "pending" && item.requestedBy !== user.uid).map(enrich),
      outgoing: relationships.filter(item => item.status === "pending" && item.requestedBy === user.uid).map(enrich)
    };
  }

  async subscribeFriendships(listener) {
    await this.ready();
    const user = this.currentUser;
    if (typeof listener !== "function" || !user || !this.available || !this.db || !this.sdk) return () => {};

    const selfReference = this.getFriendProfileReference(user);
    const relationshipsQuery = this.sdk.query(
      this.sdk.collection(this.db, FirebaseManager.FRIENDSHIP_COLLECTION),
      this.sdk.where("members", "array-contains", user.uid),
      this.sdk.limit(100)
    );
    let generation = 0;
    const buildResult = async relationshipsSnapshot => {
      const currentGeneration = ++generation;
      const [selfSnapshot] = await Promise.all([this.sdk.getDoc(selfReference)]);
      const relationships = relationshipsSnapshot.docs.map(document => ({ id: document.id, ...document.data() }));
      const otherUids = [...new Set(relationships.map(item =>
        Array.isArray(item.members) ? item.members.find(uid => uid !== user.uid) : ""
      ).filter(Boolean))];
      const profileEntries = await Promise.all(otherUids.map(async uid => {
        const snapshot = await this.sdk.getDoc(this.sdk.doc(this.db, FirebaseManager.FRIEND_PROFILE_COLLECTION, uid));
        return [uid, snapshot.exists() ? { uid, ...snapshot.data() } : null];
      }));
      if (currentGeneration !== generation) return null;
      const profiles = new Map(profileEntries);
      const enrich = item => {
        const friendUid = Array.isArray(item.members) ? item.members.find(uid => uid !== user.uid) : "";
        return { ...item, friendUid, profile: profiles.get(friendUid) || null };
      };
      return {
        authenticated: true,
        selfProfile: selfSnapshot.exists() ? { uid: user.uid, ...selfSnapshot.data() } : null,
        friends: relationships.filter(item => item.status === "accepted").map(enrich),
        incoming: relationships.filter(item => item.status === "pending" && item.requestedBy !== user.uid).map(enrich),
        outgoing: relationships.filter(item => item.status === "pending" && item.requestedBy === user.uid).map(enrich)
      };
    };

    const unsubscribe = this.sdk.onSnapshot(
      relationshipsQuery,
      snapshot => {
        buildResult(snapshot)
          .then(result => { if (result) listener(result, null); })
          .catch(error => listener(null, error));
      },
      error => listener(null, error)
    );
    return typeof unsubscribe === "function" ? unsubscribe : () => {};
  }

  async sendFriendRequest(friendCode) {
    await this.ready();
    const user = this.currentUser;
    if (!user) throw new Error("Entre com o Google para adicionar amigos.");
    const targetUid = String(friendCode || "").trim().slice(0, 128);
    if (!targetUid) throw new Error("Informe o código de amizade.");
    if (targetUid === user.uid) throw new Error("Você não pode adicionar a própria conta.");

    const ownReference = this.getFriendProfileReference(user);
    const targetReference = this.sdk.doc(this.db, FirebaseManager.FRIEND_PROFILE_COLLECTION, targetUid);
    const [ownSnapshot, targetSnapshot] = await Promise.all([
      this.sdk.getDoc(ownReference),
      this.sdk.getDoc(targetReference)
    ]);
    if (!ownSnapshot.exists()) throw new Error("Configure apelido e avatar em Minha Conta antes de usar o Social.");
    if (!targetSnapshot.exists()) throw new Error("Nenhum jogador foi encontrado com esse código de amizade.");

    const members = [user.uid, targetUid].sort();
    const friendshipId = this.makeFriendshipId(user.uid, targetUid);
    const reference = this.getFriendshipReference(friendshipId);

    // Não faça get() antes da criação. Para um documento inexistente, as regras
    // não têm resource.data.members para provar que o usuário faz parte da
    // amizade e a leitura seria corretamente negada. A própria regra de create
    // garante que somente um dos dois membros possa criar o vínculo pendente.
    try {
      await this.sdk.setDoc(reference, {
        members,
        requestedBy: user.uid,
        status: "pending",
        createdAt: this.sdk.serverTimestamp(),
        updatedAt: this.sdk.serverTimestamp(),
        updatedAtClient: Date.now()
      });
    } catch (error) {
      // Se o documento já existir, setDoc passa a ser um update e as regras
      // recusam a sobrescrita. Nesse cenário o documento existe e a leitura é
      // permitida ao membro, permitindo apresentar uma mensagem amigável.
      if (["permission-denied", "already-exists", "failed-precondition"].includes(String(error?.code || ""))) {
        try {
          const existing = await this.sdk.getDoc(reference);
          if (existing.exists()) {
            const data = existing.data() || {};
            const existingMembers = Array.isArray(data.members) ? data.members : [];
            if (existingMembers.includes(user.uid)) {
              throw new Error(data.status === "accepted"
                ? "Esse jogador já está na sua lista de amigos."
                : "Já existe uma solicitação entre essas contas.");
            }
          }
        } catch (lookupError) {
          if (!String(lookupError?.code || "").includes("permission-denied") && lookupError?.message) throw lookupError;
        }
      }
      throw error;
    }
    return { ok: true, friendshipId };
  }

  async acceptFriendRequest(friendshipId) {
    await this.ready();
    const user = this.currentUser;
    const reference = this.getFriendshipReference(friendshipId);
    if (!user || !reference) throw new Error("Entre com o Google para aceitar amizades.");
    const snapshot = await this.sdk.getDoc(reference);
    const data = snapshot.exists() ? snapshot.data() : null;
    if (!data || data.status !== "pending" || !Array.isArray(data.members) || !data.members.includes(user.uid)) {
      throw new Error("Esta solicitação não está mais disponível.");
    }
    if (data.requestedBy === user.uid) throw new Error("A outra pessoa precisa aceitar esta solicitação.");
    await this.sdk.updateDoc(reference, {
      status: "accepted",
      updatedAt: this.sdk.serverTimestamp(),
      updatedAtClient: Date.now()
    });
    return { ok: true };
  }

  async deleteFriendship(friendshipId) {
    await this.ready();
    const user = this.currentUser;
    const reference = this.getFriendshipReference(friendshipId);
    if (!user || !reference) throw new Error("Entre com o Google para gerenciar amizades.");
    await this.sdk.deleteDoc(reference);
    return { ok: true };
  }

  async submitPlayerFeedback({ type = "feedback", subject = "", message = "" } = {}) {
    await this.ready();
    const user = this.currentUser;
    if (!user || !this.available || !this.sdk || !this.db) throw new Error("Entre com o Google para enviar feedback.");
    const safeType = ["idea", "feedback", "problem"].includes(String(type)) ? String(type) : "feedback";
    const safeSubject = String(subject || "").replace(/[<>]/g, "").trim().slice(0, 100);
    const safeMessage = String(message || "").replace(/[<>]/g, "").trim().slice(0, 1200);
    if (safeSubject.length < 3 || safeMessage.length < 8) throw new Error("Preencha o assunto e escreva uma mensagem um pouco mais detalhada.");
    const reference = this.sdk.doc(this.sdk.collection(this.db, FirebaseManager.FEEDBACK_COLLECTION));
    await this.sdk.setDoc(reference, {
      userId: user.uid,
      email: String(user.email || "").slice(0, 160),
      displayName: String(user.displayName || "Jogador").replace(/[<>]/g, "").slice(0, 80),
      type: safeType,
      subject: safeSubject,
      message: safeMessage,
      status: "new",
      gameVersion: String(window.FazendaSerenaConfig?.appVersion || "1.0.1").slice(0, 30),
      createdAt: this.sdk.serverTimestamp(),
      createdAtClient: Date.now()
    });
    return { ok: true, id: reference.id };
  }

  async listPlayerFeedback(limitCount = 100) {
    await this.requireAdmin();
    const queryRef = this.sdk.query(
      this.sdk.collection(this.db, FirebaseManager.FEEDBACK_COLLECTION),
      this.sdk.orderBy("createdAtClient", "desc"),
      this.sdk.limit(Math.max(1, Math.min(200, Number(limitCount) || 100)))
    );
    const snapshot = await this.sdk.getDocs(queryRef);
    return snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
  }

  async markPlayerFeedbackRead(id, read = true) {
    await this.requireAdmin();
    const reference = this.sdk.doc(this.db, FirebaseManager.FEEDBACK_COLLECTION, String(id || ""));
    await this.sdk.updateDoc(reference, {
      status: read ? "read" : "new",
      reviewedAt: this.sdk.serverTimestamp(),
      reviewedAtClient: Date.now(),
      reviewedBy: this.currentUser?.uid || ""
    });
    return { ok: true };
  }

  async deletePlayerFeedback(id) {
    await this.requireAdmin();
    await this.sdk.deleteDoc(this.sdk.doc(this.db, FirebaseManager.FEEDBACK_COLLECTION, String(id || "")));
    return { ok: true };
  }

  async listPlayerSavesForAdmin() {
    await this.requireAdmin();
    const [snapshot, moderationSnapshot] = await Promise.all([
      this.sdk.getDocs(this.sdk.collectionGroup(this.db, FirebaseManager.SAVE_SUBCOLLECTION)),
      this.sdk.getDocs(this.sdk.collection(this.db, FirebaseManager.MODERATION_COLLECTION))
    ]);
    const moderationByUid = new Map(moderationSnapshot.docs.map(document => [document.id, document.data() || {}]));
    const rows = [];
    for (const document of snapshot.docs) {
      if (document.id !== FirebaseManager.SAVE_DOCUMENT) continue;
      const payload = document.data() || {};
      if (!payload.state || typeof payload.state !== "object") continue;
      const parts = String(document.ref.path || "").split("/");
      const userId = parts[0] === FirebaseManager.SAVE_COLLECTION ? parts[1] : "";
      if (!userId) continue;
      const moderation = moderationByUid.get(userId) || {};
      const state = payload.state;
      rows.push({
        userId,
        email: String(payload.ownerEmail || "").trim().toLowerCase(),
        nickname: this.normalizeNickname(state?.settings?.playerNickname) || String(payload.ownerEmail || "").trim().toLowerCase() || "Sem apelido",
        avatarId: String(state?.settings?.playerAvatar || ""),
        coins: Math.floor(Number(state?.coins) || 0),
        research: Math.floor(Number(state?.research) || 0),
        prestigePoints: Math.floor(Number(state?.prestigePoints) || 0),
        prestigeCount: Math.floor(Number(state?.stats?.prestiges) || 0),
        farmLevel: Math.max(1, Math.floor(Number(state?.farmLevel) || 1)),
        rankingBlocked: moderation.rankingBlocked === true,
        banned: moderation.banned === true,
        updatedAtClient: Number(payload.updatedAtClient) || 0
      });
    }
    return rows.sort((a, b) => a.nickname.localeCompare(b.nickname, "pt-BR", { sensitivity: "base" }));
  }

  async loadPlayerSaveForAdmin(userId) {
    await this.requireAdmin();
    const uid = String(userId || "").trim();
    if (!uid) throw new Error("Selecione um jogador.");
    const ref = this.sdk.doc(this.db, FirebaseManager.SAVE_COLLECTION, uid, FirebaseManager.SAVE_SUBCOLLECTION, FirebaseManager.SAVE_DOCUMENT);
    const snapshot = await this.sdk.getDoc(ref);
    if (!snapshot.exists()) throw new Error("O save desse jogador não existe mais.");
    return { userId: uid, payload: snapshot.data() || {}, state: JSON.parse(JSON.stringify(snapshot.data()?.state || {})), moderation: await this.getPlayerModerationForAdmin(uid) };
  }

  async mutatePlayerSaveForAdmin(userId, mutator, mutationType = "single-player-admin") {
    await this.requireAdmin();
    if (typeof mutator !== "function") throw new Error("A alteração administrativa não possui uma transformação válida.");
    const uid = String(userId || "").trim();
    if (!uid) throw new Error("Selecione um jogador.");
    const reference = this.sdk.doc(this.db, FirebaseManager.SAVE_COLLECTION, uid, FirebaseManager.SAVE_SUBCOLLECTION, FirebaseManager.SAVE_DOCUMENT);
    const mutationId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let resultingState = null;
    await this.sdk.runTransaction(this.db, async transaction => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("O save desse jogador não existe mais.");
      const payload = snapshot.data() || {};
      const state = JSON.parse(JSON.stringify(payload.state || {}));
      const result = await mutator(state, { userId: uid, payload });
      if (result === false || result?.changed === false) { resultingState = state; return; }
      const now = Date.now();
      state.lastUpdate = now;
      state.__adminMutation = { id: mutationId, type: String(mutationType || "single-player-admin").slice(0, 48), at: now };
      resultingState = state;
      transaction.update(reference, { state, updatedAt: this.sdk.serverTimestamp(), updatedAtClient: now });
    });
    return { ok: true, state: resultingState, mutationId };
  }

  async resetPlayerAccountForAdmin(userId) {
    await this.requireAdmin();
    const uid = String(userId || "").trim();
    if (!uid) throw new Error("Selecione um jogador.");
    const relationshipsQuery = this.sdk.query(
      this.sdk.collection(this.db, FirebaseManager.FRIENDSHIP_COLLECTION),
      this.sdk.where("members", "array-contains", uid),
      this.sdk.limit(100)
    );
    const relationships = await this.sdk.getDocs(relationshipsQuery);
    const batch = this.sdk.writeBatch(this.db);
    batch.delete(this.sdk.doc(this.db, FirebaseManager.SAVE_COLLECTION, uid, FirebaseManager.SAVE_SUBCOLLECTION, FirebaseManager.SAVE_DOCUMENT));
    batch.delete(this.sdk.doc(this.db, FirebaseManager.LEADERBOARD_COLLECTION, uid));
    batch.delete(this.sdk.doc(this.db, FirebaseManager.FRIEND_PROFILE_COLLECTION, uid));
    relationships.docs.forEach(document => batch.delete(document.ref));
    await batch.commit();
    return { ok: true, friendshipsRemoved: relationships.size };
  }

  async mutateAllPlayerSavesForAdmin(mutator, { batchSize = 8, mutationType = "global-admin" } = {}) {
    await this.requireAdmin();
    if (typeof mutator !== "function") throw new Error("A ação global não possui uma transformação válida.");
    const queryRef = this.sdk.collectionGroup(this.db, FirebaseManager.SAVE_SUBCOLLECTION);
    const snapshot = await this.sdk.getDocs(queryRef);
    const documents = snapshot.docs.filter(document => document.id === FirebaseManager.SAVE_DOCUMENT && document.data()?.state && typeof document.data().state === "object");
    // Lotes de até 8 mantêm margem para as leituras auxiliares das Security Rules
    // em operações multi-documento; cada escrita administrativa revalida o papel.
    const size = Math.max(1, Math.min(8, Math.floor(Number(batchSize) || 8)));
    const mutationId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let updated = 0;
    let skipped = 0;
    for (let offset = 0; offset < documents.length; offset += size) {
      const batch = this.sdk.writeBatch(this.db);
      let operations = 0;
      for (const document of documents.slice(offset, offset + size)) {
        const payload = document.data() || {};
        const state = JSON.parse(JSON.stringify(payload.state || {}));
        const pathParts = String(document.ref.path || "").split("/");
        const userId = pathParts[0] === FirebaseManager.SAVE_COLLECTION ? pathParts[1] : "";
        const result = await mutator(state, { userId, path: document.ref.path, payload });
        if (result === false || result?.changed === false) { skipped += 1; continue; }
        const now = Date.now();
        state.lastUpdate = now;
        state.__adminMutation = { id: mutationId, type: String(mutationType || "global-admin").slice(0, 48), at: now };
        batch.update(document.ref, {
          state,
          updatedAt: this.sdk.serverTimestamp(),
          updatedAtClient: now
        });
        operations += 1;
        updated += 1;
      }
      if (operations) await batch.commit();
    }
    return { ok: true, scanned: documents.length, updated, skipped, mutationId };
  }

  resetProgress(state) {
    const snapshot = JSON.parse(JSON.stringify(state || {}));
    delete snapshot.__adminMutation;
    delete snapshot.__adminTestAppliedAt;
    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(async () => {
        await this.ready();
        const user = this.currentUser;
        const saveReference = this.getSaveReference(user);
        const leaderboardReference = this.getLeaderboardReference(user);
        const friendProfileReference = this.getFriendProfileReference(user);
        if (!user || !saveReference || !leaderboardReference || !friendProfileReference) {
          return { ok: false, reason: "guest" };
        }
        const now = Date.now();
        snapshot.lastUpdate = now;
        const batch = this.sdk.writeBatch(this.db);
        batch.set(saveReference, {
          state: snapshot,
          saveVersion: String(snapshot.version || window.FazendaSerenaConfig.appVersion),
          ownerEmail: String(user.email || "").trim(),
          updatedAt: this.sdk.serverTimestamp(),
          updatedAtClient: now
        });
        batch.delete(leaderboardReference);
        batch.delete(friendProfileReference);
        await batch.commit();
        this.friendProfileSignatureByUid.set(user.uid, "");
        return { ok: true, state: snapshot };
      });
    return this.saveQueue;
  }

  async signInWithGoogle() {
    await this.ready();
    if (!this.available || !this.auth || !this.sdk) {
      throw new Error("O Firebase não está disponível neste navegador.");
    }

    const provider = new this.sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await this.sdk.signInWithPopup(this.auth, provider);
    return credential.user;
  }

  async signOut() {
    await this.ready();
    if (!this.auth || !this.sdk) return;
    await this.sdk.signOut(this.auth);
  }

  getFriendlyError(error) {
    const code = String(error?.code || "");
    const messages = {
      "auth/popup-closed-by-user": "A janela de login foi fechada antes da conclusão.",
      "auth/popup-blocked": "O navegador bloqueou a janela de login do Google.",
      "auth/cancelled-popup-request": "Já existe uma tentativa de login em andamento.",
      "auth/unauthorized-domain": "Este domínio ainda não foi autorizado no Firebase Authentication.",
      "auth/network-request-failed": "Não foi possível alcançar o Firebase. Verifique a conexão.",
      "permission-denied": "As regras do Firestore não permitiram concluir esta operação.",
      "unavailable": "O Firestore está temporariamente indisponível."
    };
    return messages[code] || error?.message || "Não foi possível concluir a operação com o Firebase.";
  }
}

window.FirebaseManager = new FirebaseManager();
