# Fazenda Serena — Aplicativo Windows

Esta pasta contém o código-fonte do instalador/launcher Windows usado na página pública.

## Como funciona

O instalador é **por usuário**, sem exigir privilégios de administrador. Ele instala o launcher em `%LOCALAPPDATA%\FazendaSerena`, cria atalhos na Área de Trabalho e no menu Iniciar e registra a desinstalação em **Aplicativos instalados**.

Ao abrir o aplicativo, o launcher procura o Microsoft Edge disponível no Windows e abre `https://fazenda-serena.web.app/play.html?app=windows` em **modo aplicativo (`--app`)**, sem barra de endereço ou abas. Isso preserva a origem real do jogo e evita duplicar HTML/CSS/JS dentro do executável.

Se o Edge não estiver disponível, o launcher abre o jogo no navegador padrão como fallback.

## Build

O instalador e o launcher agora recebem o ícone **dentro do próprio executável**, além do ícone usado pelos atalhos.

No Windows, o caminho recomendado é:

```powershell
.\BUILD_WINDOWS.ps1
```

O script compila x64 e ARM64, incorpora `favicon.ico` em cada `.exe` usando `embed_icon.py` e deixa os arquivos finais em `downloads/`.

Também é possível compilar manualmente em qualquer sistema com Go:

```bash
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-H windowsgui -s -w" -o payload/FazendaSerena.exe launcher.go
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-H windowsgui -s -w" -o FazendaSerena-Setup-x64.exe setup.go
python embed_icon.py FazendaSerena-Setup-x64.exe favicon.ico
```

Para ARM64, troque `GOARCH=amd64` por `GOARCH=arm64`.

## Assinatura

Os executáveis gerados neste projeto de teste **não possuem assinatura Authenticode**. Para distribuição pública, assine o instalador e o launcher com um certificado de code signing para reduzir alertas do Windows SmartScreen.
