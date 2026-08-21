# Fazenda Serena — Android (Trusted Web Activity)

O Android usa **Trusted Web Activity (TWA)** para abrir a PWA oficial em tela cheia. O APK é um wrapper leve: a lógica do jogo continua em `https://fazenda-serena.web.app/play.html`.

## Primeira geração

1. Publique esta revisão no Firebase Hosting para que o `manifest.webmanifest` esteja online.
2. No Windows, abra PowerShell nesta pasta.
3. Execute `./BUILD_ANDROID.ps1`.
4. Na primeira execução, o Bubblewrap fará a configuração e solicitará a chave de assinatura. Use o Package ID `com.fazendaserena.game`.
5. **Guarde a chave e as senhas de assinatura em local seguro.** Sem a mesma chave, você não poderá atualizar o mesmo aplicativo.
6. O script copia o APK para `downloads/FazendaSerena-Android.apk` e gera `.well-known/assetlinks.json`.
7. Publique novamente: `firebase deploy --only hosting`.

Depois disso, o botão Android do `index.html` detecta o APK automaticamente e passa a oferecer download direto.

O Bubblewrap oficial gera também `app-release-bundle.aab`, que o script copia para `downloads/FazendaSerena-Android.aab` para futura Play Store.
