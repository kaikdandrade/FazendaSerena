let initializeApp;
let browserLocalPersistence;
let createUserWithEmailAndPassword;
let getAuth;
let GoogleAuthProvider;
let onAuthStateChanged;
let sendPasswordResetEmail;
let setPersistence;
let signInWithEmailAndPassword;
let signInWithPopup;
let firebaseSignOut;
let updateProfile;
let deleteDoc;
let doc;
let getDoc;
let getFirestore;
let serverTimestamp;
let setDoc;

async function loadFirebaseSdk() {
  const [appSdk, authSdk, firestoreSdk] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js")
  ]);

  ({ initializeApp } = appSdk);
  ({
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut: firebaseSignOut,
    updateProfile
  } = authSdk);
  ({ deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc } = firestoreSdk);
}

const FIREBASE_SAVE_COLLECTION = "players";
const listeners = new Set();

const state = {
  configured: false,
  ready: false,
  busy: false,
  user: null,
  cloudStatus: "unconfigured",
  message: "Adicione as chaves do Firebase para ativar a conta.",
  lastSyncedAt: null
};

let app = null;
let auth = null;
let db = null;

function publicUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    emailVerified: Boolean(user.emailVerified),
    providerIds: (user.providerData || []).map(item => item.providerId).filter(Boolean)
  };
}

function snapshot() {
  return {
    ...state,
    user: state.user ? { ...state.user, providerIds: [...state.user.providerIds] } : null
  };
}

function emit(patch = {}) {
  Object.assign(state, patch);
  const current = snapshot();
  listeners.forEach(listener => {
    try { listener(current); } catch (error) { console.warn("Falha ao atualizar a interface do Firebase:", error); }
  });
  window.dispatchEvent(new CustomEvent("fazenda-firebase-state", { detail: current }));
}

function isPlaceholder(value) {
  const text = String(value || "").trim();
  return !text || /COLE_|SEU_PROJETO|XXXXXXXX/i.test(text);
}

function hasValidConfig(config) {
  return Boolean(config)
    && !isPlaceholder(config.apiKey)
    && !isPlaceholder(config.authDomain)
    && !isPlaceholder(config.projectId)
    && !isPlaceholder(config.appId);
}

function friendlyError(error) {
  const code = String(error?.code || "");
  const messages = {
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/popup-closed-by-user": "A janela de login foi fechada antes da conclusão.",
    "auth/popup-blocked": "O navegador bloqueou a janela de login do Google.",
    "auth/cancelled-popup-request": "Já existe uma tentativa de login em andamento.",
    "auth/network-request-failed": "Não foi possível acessar o Firebase. Verifique a conexão.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
    "permission-denied": "O Firestore recusou o acesso. Confira as regras de segurança.",
    "failed-precondition": "O Firestore ainda não está configurado para este projeto."
  };
  return messages[code] || error?.message || "Não foi possível concluir a operação no Firebase.";
}

function requireConfigured() {
  if (!state.configured || !auth || !db) {
    throw new Error("O Firebase ainda não foi configurado em js/firebase-config.js.");
  }
}

function requireUser() {
  requireConfigured();
  if (!auth.currentUser) throw new Error("Entre em uma conta para acessar o save na nuvem.");
  return auth.currentUser;
}

function saveReference(uid) {
  return doc(db, FIREBASE_SAVE_COLLECTION, uid);
}

async function withBusy(task, startMessage) {
  emit({ busy: true, message: startMessage || state.message });
  try {
    return await task();
  } catch (error) {
    const message = friendlyError(error);
    emit({ cloudStatus: "error", message });
    throw new Error(message, { cause: error });
  } finally {
    emit({ busy: false });
  }
}

const FirebaseManager = {
  getState: snapshot,

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  },

  async signInWithGoogle() {
    requireConfigured();
    return withBusy(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      emit({ message: "Login com Google concluído." });
      return publicUser(credential.user);
    }, "Abrindo o login do Google...");
  },

  async signInWithEmail(email, password) {
    requireConfigured();
    return withBusy(async () => {
      const credential = await signInWithEmailAndPassword(auth, String(email || "").trim(), String(password || ""));
      emit({ message: "Login concluído." });
      return publicUser(credential.user);
    }, "Entrando na conta...");
  },

  async createAccount(email, password) {
    requireConfigured();
    return withBusy(async () => {
      const normalizedEmail = String(email || "").trim();
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, String(password || ""));
      const suggestedName = normalizedEmail.split("@")[0].slice(0, 32);
      if (suggestedName) await updateProfile(credential.user, { displayName: suggestedName });
      emit({ user: publicUser(auth.currentUser), message: "Conta criada e conectada." });
      return publicUser(auth.currentUser);
    }, "Criando a conta...");
  },

  async resetPassword(email) {
    requireConfigured();
    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) throw new Error("Digite o e-mail da conta primeiro.");
    return withBusy(async () => {
      await sendPasswordResetEmail(auth, normalizedEmail);
      emit({ message: "E-mail de recuperação enviado." });
      return true;
    }, "Enviando recuperação de senha...");
  },

  async signOut() {
    requireConfigured();
    return withBusy(async () => {
      await firebaseSignOut(auth);
      emit({ cloudStatus: "local", message: "Você saiu da conta. O jogo continua salvo neste navegador." });
      return true;
    }, "Saindo da conta...");
  },

  async loadGame() {
    const user = requireUser();
    emit({ cloudStatus: "loading", message: "Buscando o progresso da conta..." });
    try {
      const snapshotDoc = await getDoc(saveReference(user.uid));
      if (!snapshotDoc.exists()) {
        emit({ cloudStatus: "empty", message: "Esta conta ainda não possui progresso na nuvem." });
        return null;
      }
      const data = snapshotDoc.data() || {};
      emit({
        cloudStatus: "loaded",
        message: "Progresso da nuvem encontrado.",
        lastSyncedAt: Number(data.clientUpdatedAt || 0) || null
      });
      return {
        save: data.save || null,
        clientUpdatedAt: Number(data.clientUpdatedAt || 0) || null,
        saveVersion: Number(data.saveVersion || data.save?.version || 0) || 0
      };
    } catch (error) {
      const message = friendlyError(error);
      emit({ cloudStatus: "error", message });
      throw new Error(message, { cause: error });
    }
  },

  async saveGame(gameState) {
    const user = requireUser();
    const cleanState = JSON.parse(JSON.stringify(gameState || {}));
    const clientUpdatedAt = Date.now();
    emit({ cloudStatus: "saving", message: "Sincronizando o progresso..." });
    try {
      await setDoc(saveReference(user.uid), {
        save: cleanState,
        saveVersion: Number(cleanState.version || 0),
        clientUpdatedAt,
        updatedAt: serverTimestamp(),
        profile: {
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || ""
        }
      }, { merge: true });
      emit({ cloudStatus: "synced", message: "Progresso sincronizado com a nuvem.", lastSyncedAt: clientUpdatedAt });
      return true;
    } catch (error) {
      const message = friendlyError(error);
      emit({ cloudStatus: "error", message });
      throw new Error(message, { cause: error });
    }
  },

  async deleteGame() {
    const user = requireUser();
    return withBusy(async () => {
      await deleteDoc(saveReference(user.uid));
      emit({ cloudStatus: "empty", message: "O progresso anterior foi removido da nuvem.", lastSyncedAt: null });
      return true;
    }, "Removendo o progresso da nuvem...");
  }
};

window.FirebaseManager = FirebaseManager;
window.dispatchEvent(new CustomEvent("fazenda-firebase-manager-ready", { detail: FirebaseManager }));

async function initializeFirebase() {
  const config = window.FIREBASE_CONFIG;
  if (!hasValidConfig(config)) {
    emit({
      configured: false,
      ready: true,
      cloudStatus: "unconfigured",
      message: "Firebase não configurado. Preencha js/firebase-config.js."
    });
    return;
  }

  try {
    emit({ configured: true, ready: false, cloudStatus: "loading", message: "Carregando os serviços do Firebase..." });
    await loadFirebaseSdk();
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.warn("A persistência local da sessão do Firebase não pôde ser ativada:", error);
    }
    emit({ configured: true, ready: true, cloudStatus: "local", message: "Firebase pronto. Entre para sincronizar sua fazenda." });

    onAuthStateChanged(auth, user => {
      emit({
        user: publicUser(user),
        cloudStatus: user ? "loading" : "local",
        message: user ? "Conta conectada. Preparando a sincronização..." : "Entre para sincronizar o progresso entre dispositivos."
      });
    }, error => {
      emit({ ready: true, cloudStatus: "error", message: friendlyError(error) });
    });
  } catch (error) {
    emit({
      configured: true,
      ready: true,
      cloudStatus: "error",
      message: friendlyError(error)
    });
  }
}

initializeFirebase();
