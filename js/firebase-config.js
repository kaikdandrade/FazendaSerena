"use strict";

/*
 * Cole aqui o objeto firebaseConfig exibido em:
 * Firebase Console > Configurações do projeto > Seus apps > App da Web.
 *
 * Esta configuração identifica o projeto Firebase no navegador. A proteção dos
 * dados deve ser feita pelas regras do Firestore incluídas em firestore.rules.
 */
window.FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyAFD0xwpeUawcyWvAfKs8EjNvrqxEesPt0",
  authDomain: "fazenda-serena.firebaseapp.com",
  projectId: "fazenda-serena",
  messagingSenderId: "336828044788",
  appId: "1:336828044788:web:68871232bdfdfeb213d5a1",
  measurementId: "G-T2YY4PK49J"
  // measurementId: "G-XXXXXXXXXX" // Opcional, somente se usar Analytics.
});

/*
 * Segurança opcional recomendada: Firebase App Check (reCAPTCHA Enterprise).
 * Informe aqui a SITE KEY pública gerada no Console Firebase e depois ative o
 * enforcement para Cloud Firestore. Deixe vazio enquanto ainda não configurar.
 */
window.FIREBASE_APP_CHECK_SITE_KEY = window.FIREBASE_APP_CHECK_SITE_KEY || "";
