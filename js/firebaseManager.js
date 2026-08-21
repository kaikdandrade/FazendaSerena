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
  static FRIEND_PROFILE_COLLECTION = "friendProfiles";
  static FRIENDSHIP_COLLECTION = "friendships";
  static GAME_CONFIG_COLLECTION = "gameConfig";
  static GAME_CONFIG_DOCUMENT = "public";
  static ADMIN_COLLECTION = "administrators";
  static FEEDBACK_COLLECTION = "playerFeedback";

  constructor() {
    this.available = false;
    this.currentUser = null;
    this.initialAuthResolved = false;
    this.authListeners = new Set();
    this.saveQueue = Promise.resolve();
    this.friendProfileSignatureByUid = new Map();
    this.adminAccessCache = new Map();
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
            this.adminAccessCache.clear();
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

  getAdminReference(user = this.currentUser) {
    if (!user?.email || !this.db || !this.sdk) return null;
    return this.sdk.doc(this.db, FirebaseManager.ADMIN_COLLECTION, String(user.email).trim().toLowerCase());
  }

  async isCurrentUserAdmin({ force = false } = {}) {
    await this.ready();
    const user = this.currentUser;
    if (!user) return false;
    const email = String(user.email || "").trim().toLowerCase();
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
    if (!(await this.isCurrentUserAdmin({ force: true }))) throw new Error("Esta conta não possui acesso administrativo.");
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
    if (!(await this.isCurrentUserAdmin({ force: true }))) throw new Error("Esta conta não possui acesso administrativo.");
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
    if (!(await this.isCurrentUserAdmin({ force: true }))) throw new Error("Esta conta não possui acesso administrativo.");
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
    if (!(await this.isCurrentUserAdmin({ force: true }))) throw new Error("Esta conta não possui acesso administrativo.");
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
          const friendProfileReference = this.getFriendProfileReference(user);
          const batch = this.sdk.writeBatch(this.db);
          batch.set(reference, {
            state: snapshot,
            saveVersion: String(snapshot.version || window.FazendaSerenaConfig.appVersion),
            updatedAt: this.sdk.serverTimestamp(),
            updatedAtClient: savedAt.getTime()
          });
          if (leaderboardReference) {
            const administrator = await this.isCurrentUserAdmin();
            const leaderboardEntry = administrator ? null : this.buildLeaderboardEntry(snapshot, user);
            if (leaderboardEntry) batch.set(leaderboardReference, leaderboardEntry);
            else batch.delete(leaderboardReference);
          }
          const friendProfileEntry = friendProfileReference
            ? this.buildFriendProfileEntry(snapshot, user)
            : null;
          const friendProfileSignature = friendProfileEntry
            ? `${friendProfileEntry.displayName}\u0000${friendProfileEntry.avatarId}`
            : "";
          const shouldSyncFriendProfile = friendProfileReference
            && this.friendProfileSignatureByUid.get(user.uid) !== friendProfileSignature;
          if (shouldSyncFriendProfile) {
            if (friendProfileEntry) batch.set(friendProfileReference, friendProfileEntry);
            else batch.delete(friendProfileReference);
          }
          await batch.commit();
          if (shouldSyncFriendProfile) {
            this.friendProfileSignatureByUid.set(user.uid, friendProfileSignature);
          }
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
    const existing = await this.sdk.getDoc(reference);
    if (existing.exists()) {
      const status = existing.data()?.status;
      throw new Error(status === "accepted" ? "Esse jogador já está na sua lista de amigos." : "Já existe uma solicitação entre essas contas.");
    }

    await this.sdk.setDoc(reference, {
      members,
      requestedBy: user.uid,
      status: "pending",
      createdAt: this.sdk.serverTimestamp(),
      updatedAt: this.sdk.serverTimestamp(),
      updatedAtClient: Date.now()
    });
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
    await this.ready();
    if (!await this.isCurrentUserAdmin({ force: true })) throw new Error("Esta conta não possui acesso administrativo.");
    const queryRef = this.sdk.query(
      this.sdk.collection(this.db, FirebaseManager.FEEDBACK_COLLECTION),
      this.sdk.orderBy("createdAtClient", "desc"),
      this.sdk.limit(Math.max(1, Math.min(200, Number(limitCount) || 100)))
    );
    const snapshot = await this.sdk.getDocs(queryRef);
    return snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
  }

  async markPlayerFeedbackRead(id, read = true) {
    await this.ready();
    if (!await this.isCurrentUserAdmin({ force: true })) throw new Error("Esta conta não possui acesso administrativo.");
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
    await this.ready();
    if (!await this.isCurrentUserAdmin({ force: true })) throw new Error("Esta conta não possui acesso administrativo.");
    await this.sdk.deleteDoc(this.sdk.doc(this.db, FirebaseManager.FEEDBACK_COLLECTION, String(id || "")));
    return { ok: true };
  }

  resetProgress() {
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
        const batch = this.sdk.writeBatch(this.db);
        batch.delete(saveReference);
        batch.delete(leaderboardReference);
        batch.delete(friendProfileReference);
        await batch.commit();
        this.friendProfileSignatureByUid.set(user.uid, "");
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
      "permission-denied": "As regras do Firestore não permitiram concluir esta operação.",
      "unavailable": "O Firestore está temporariamente indisponível."
    };
    return messages[code] || error?.message || "Não foi possível concluir a operação com o Firebase.";
  }
}

window.FirebaseManager = new FirebaseManager();
