"use strict";

/*
 * Integração exclusiva com Firebase Authentication e Cloud Firestore.
 * O jogo nunca grava progresso no localStorage. Visitantes jogam apenas em
 * memória; usuários autenticados mantêm um único save privado na nuvem.
 */
class FirebaseManager {
  static SDK_VERSION = "12.17.0";
  static SAVE_COLLECTION = "players";
  static SAVE_SUBCOLLECTION = "saves";
  static SAVE_DOCUMENT = "main";
  static LEADERBOARD_COLLECTION = "prestigeLeaderboard";

  constructor() {
    this.available = false;
    this.currentUser = null;
    this.initialAuthResolved = false;
    this.authListeners = new Set();
    this.saveQueue = Promise.resolve();
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
      this.db = firestoreSdk.getFirestore(this.app);

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

  getAvatarEntry(avatarId) {
    const safeId = String(avatarId || "").replace(/[^a-z0-9_]/gi, "").slice(0, 48);
    return (window.AvatarData || []).find(avatar => avatar.id === safeId) || null;
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
      maxFarmLevel: Math.max(1, Math.floor(Number(state?.stats?.maxFarmLevel || state?.farmLevel) || 1)),
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

  saveGame(state) {
    const snapshot = JSON.parse(JSON.stringify(state || {}));

    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(async () => {
        await this.ready();
        const user = this.currentUser;
        const reference = this.getSaveReference(user);
        if (!user || !reference) {
          this.emitSaveStatus("guest");
          return { ok: false, reason: "guest" };
        }

        this.emitSaveStatus("saving");
        try {
          const savedAt = new Date();
          const leaderboardReference = this.getLeaderboardReference(user);
          const batch = this.sdk.writeBatch(this.db);
          batch.set(reference, {
            state: snapshot,
            saveVersion: Number(snapshot.version || 0),
            updatedAt: this.sdk.serverTimestamp(),
            updatedAtClient: savedAt.getTime()
          });
          if (leaderboardReference) {
            const leaderboardEntry = this.buildLeaderboardEntry(snapshot, user);
            if (leaderboardEntry) batch.set(leaderboardReference, leaderboardEntry);
            else batch.delete(leaderboardReference);
          }
          await batch.commit();
          this.emitSaveStatus("saved", { savedAt });
          return { ok: true, savedAt };
        } catch (error) {
          this.emitSaveStatus("error", { error });
          console.warn("Não foi possível salvar no Firestore:", error);
          return { ok: false, reason: "firestore", error };
        }
      });

    return this.saveQueue;
  }

  async loadPrestigeLeaderboard(maximum = 5) {
    await this.ready();
    if (!this.available || !this.db || !this.sdk) {
      return { authenticated: false, top: [], rank: null, player: null };
    }

    const outputLimit = Math.max(1, Math.min(5, Math.floor(Number(maximum) || 5)));
    const collectionReference = this.sdk.collection(this.db, FirebaseManager.LEADERBOARD_COLLECTION);
    const rankingQuery = this.sdk.query(
      collectionReference,
      this.sdk.orderBy("prestigeTotal", "desc")
    );
    const rankingSnapshot = await this.sdk.getDocs(rankingQuery);
    const validEntries = rankingSnapshot.docs
      .map(document => ({ uid: document.id, ...document.data() }))
      .filter(entry => {
        const nickname = this.normalizeNickname(entry.displayName);
        return entry.profileComplete === true
          && nickname.length >= 4
          && nickname.length <= 24
          && Boolean(this.getAvatarEntry(entry.avatarId));
      })
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    const user = this.currentUser;
    const player = user ? validEntries.find(entry => entry.uid === user.uid) || null : null;
    return {
      authenticated: Boolean(user),
      top: validEntries.slice(0, outputLimit),
      rank: player?.position || null,
      player
    };
  }

  resetProgress() {
    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(async () => {
        await this.ready();
        const user = this.currentUser;
        const saveReference = this.getSaveReference(user);
        const leaderboardReference = this.getLeaderboardReference(user);
        if (!user || !saveReference || !leaderboardReference) {
          return { ok: false, reason: "guest" };
        }
        const batch = this.sdk.writeBatch(this.db);
        batch.delete(saveReference);
        batch.delete(leaderboardReference);
        await batch.commit();
        return { ok: true };
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
      "permission-denied": "As regras do Firestore não permitiram acessar este save.",
      "unavailable": "O Firestore está temporariamente indisponível."
    };
    return messages[code] || error?.message || "Não foi possível concluir a operação com o Firebase.";
  }
}

window.FirebaseManager = new FirebaseManager();
