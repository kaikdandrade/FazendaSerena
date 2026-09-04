<p align="center">
  <a href="https://fazenda-serena.web.app/">
    <img src="assets/logo.webp" width="280" alt="Fazenda Serena">
  </a>
</p>

<h1 align="center">Fazenda Serena</h1>

<p align="center">
  <strong>Jogo incremental de agricultura, produção, contratos e progressão para navegador.</strong>
</p>

<p align="center">
  <a href="https://fazenda-serena.web.app/"><strong>Jogar agora</strong></a>
  ·
  <a href="https://fazenda-serena.web.app/tutorial.html">Tutorial</a>
  ·
  <a href="https://fazenda-serena.web.app/privacy.html">Privacidade</a>
</p>

<p align="center">
  <img alt="Versão 1.2.0" src="https://img.shields.io/badge/versão-1.2.0-52765b?style=flat-square">
  <img alt="HTML CSS JavaScript" src="https://img.shields.io/badge/stack-HTML%20·%20CSS%20·%20JavaScript-52765b?style=flat-square">
  <img alt="Firebase" src="https://img.shields.io/badge/backend-Firebase-ef9f35?style=flat-square">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-instalável-52765b?style=flat-square">
  <img alt="Licença proprietária" src="https://img.shields.io/badge/licença-proprietária-735c3d?style=flat-square">
</p>

---

## Sobre o projeto

**Fazenda Serena** é um jogo idle/incremental em que o jogador desenvolve uma fazenda, desbloqueia culturas, aprimora a produção, cumpre contratos, investe em pesquisas e acumula benefícios permanentes por meio do prestígio.

A aplicação é construída em **HTML, CSS e JavaScript puro**. Os recursos online utilizam **Firebase Authentication**, **Cloud Firestore** e **Firebase Hosting**. O projeto também funciona como **PWA instalável** e possui distribuição opcional para Windows.

A versão pública atual é **1.2.0**.

---

## O que existe na versão 1.2.0

### Fazenda e culturas

- Culturas com compra, nível, rendimento e tempo de produção próprios.
- Desbloqueio progressivo conforme o nível da fazenda.
- Produção contínua com vendas automáticas.
- Progresso offline respeitando o limite configurado no Admin.
- Busca e filtros responsivos no catálogo de plantas.
- Aprimoramento de culturas com custo dinâmico.
- Plantas platinadas com identidade dourada, nível máximo e produção otimizada.
- Indicador circular de produção por planta.
- Grade responsiva adaptada para desktop, tablet e celular.

### Nível da fazenda e recursos

- XP da fazenda com progresso animado diretamente na borda do counter.
- Counters para XP, Moedas, Pesquisa e Prestígio.
- Counter flutuante durante a rolagem.
- Estatísticas de progressão, saldo, produção, tempo jogado e recordes da conta.

### Contratos

- Grade única contendo propostas, contratos em andamento e contratos encerrados.
- O contrato permanece no mesmo card depois de ser assinado.
- Estados de **Entregue**, **Quebrado** e **Multado** permanecem visíveis até a próxima atualização das propostas.
- Atualizar contratos preserva contratos em andamento e preenche apenas as posições disponíveis.
- Recompensas e parâmetros de uma proposta ficam congelados no momento em que ela é gerada.
- Quantidade máxima de propostas exibidas varia conforme os slots ativos: 6, 9 ou 12.
- Janela de culturas recentes usada na geração dos contratos configurável pelo Admin, com padrão de 5.
- Multas, prazos, recompensas e tipos de contrato configuráveis pelo painel administrativo.

### Pesquisas e prestígio

- Evoluções de pesquisa com identidade azul.
- Evoluções de prestígio com identidade roxa e benefícios permanentes.
- Prestígio da conta com reinício da jornada e preservação dos recursos permanentes definidos pelo sistema.
- Nível máximo da fazenda configurável pelo Admin e propagado para os sistemas que dependem desse limite.

### Missões

- Missões organizadas em séries.
- Objetivos por produção, venda, compra, desbloqueio, tempo online, tempo total jogado e outras métricas.
- Recompensas em Moedas, Pesquisa, Prestígio, XP, títulos de jogador e avatares.
- Contador de progresso `concluídas/total` no bloco de Missões.
- Missões concluídas podem ser exibidas ou ocultadas pelo jogador.
- Missões ficam dentro de **Perfil**, logo após Prestígio.

### Perfil, ranking e conta

- Entrada com Google e conta visitante.
- Save local para visitante e save em nuvem para usuário autenticado.
- Apelido, avatar e título de jogador configuráveis.
- Galerias de avatares e títulos com estados bloqueados/desbloqueados.
- Ranking global de prestígio.
- Perfil público do ranking.
- Estatísticas e histórico da conta dentro de Perfil.

### Social e Agenda da comunidade

- Agenda semanal de eventos configurada pelo Admin.
- Eventos recorrentes mostram a próxima ocorrência válida.
- Cards responsivos com ícone, nome, descrição, data, horário, duração e andamento.
- Evento ativo recebe identidade visual própria e contagem de tempo restante.
- Bônus de evento afetam recompensas e resultados, sem inflar requisitos já gerados.

### Interface

- Tema automático, claro e escuro.
- Navegação em linha ou em grade.
- Layout adaptado para desktop, tablet e celular.
- Configurações de escala de fonte, áudio, música, aparência e formato numérico.
- Banner e preferências de cookies.
- Feedback enviado diretamente pelo jogo para o painel administrativo.
- Footer com versão pública carregada a partir de `js/appConfig.js`.

### PWA e Windows

- `manifest.webmanifest` para instalação no navegador.
- Service Worker para cache do shell principal.
- Ícones maskable e atalhos de instalação.
- Instaladores Windows x64 e ARM64 disponíveis no diretório `downloads/`.
- Fontes do launcher/instalador Windows em `desktop-windows/`.

---

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| HTML5 | Estrutura das páginas |
| CSS3 | Componentes, temas e responsividade |
| JavaScript | Game engine, interface e integrações |
| Firebase Authentication | Login com Google |
| Cloud Firestore | Saves, ranking, feedback, configuração pública e administração |
| Firebase Hosting | Hospedagem web |
| Web App Manifest | Instalação como PWA |
| Service Worker | Cache da aplicação |
| Go | Launcher e instalador Windows |

---

## Estrutura principal

```text
FazendaSerena/
├── assets/                  # Logos, plantas, ícones, avatares, fundos e sons
├── css/
│   ├── stylish.css          # Componentes e estilos globais
│   ├── play.css             # Interface principal do jogo
│   ├── admin.css            # Painel administrativo
│   ├── index.css            # Página inicial
│   ├── tutorial.css         # Tutorial
│   ├── privacy.css          # Política de Privacidade
│   ├── terms.css            # Termos de Uso
│   ├── 404.css              # Página de erro
│   └── monetization.css     # Cookies, publicidade e monetização
├── js/
│   ├── engine/              # Regras e estado do jogo
│   ├── app/                 # Renderização e comportamento da interface
│   ├── appConfig.js         # Configurações locais e versão pública
│   ├── gameAdmin.js         # Normalização da configuração administrativa
│   ├── firebaseManager.js   # Auth, saves, ranking, feedback e operações Firebase
│   ├── admin.js             # Interface administrativa
│   ├── adminCatalogEditor.js
│   ├── soundEngine.js
│   ├── pwaInstall.js
│   └── ...
├── desktop-windows/         # Fontes e scripts da versão Windows
├── downloads/               # Instaladores distribuídos pelo site
├── index.html               # Página inicial
├── play.html                # Jogo
├── admin.html               # Painel administrativo
├── tutorial.html            # Tutorial
├── privacy.html             # Política de Privacidade
├── terms.html               # Termos de Uso
├── 404.html                 # Página de erro
├── manifest.webmanifest     # PWA
├── sw.js                    # Service Worker
├── firestore.rules          # Regras do Firestore
├── firebase.json            # Firebase Hosting e Firestore
├── LICENSE                  # Licença proprietária
└── README.md
```

---

## Alterando a versão pública

A versão exibida no jogo fica centralizada em:

```text
js/appConfig.js
```

Edite apenas a constante:

```js
const SITE_VERSION = "1.2.0";
```

O footer lê essa informação automaticamente. A versão pública não controla o formato dos saves nem o balanceamento do jogo.

---

## Painel administrativo

O painel fica em:

```text
/admin.html
```

Ele permite administrar, entre outros recursos:

- parâmetros principais e nível máximo;
- plantas e categorias;
- tipos e slots de contrato;
- empresas;
- pesquisas e evoluções de prestígio;
- missões e recompensas;
- títulos de jogador;
- eventos da Agenda da comunidade;
- tipos de pontos;
- ícones e ordem da navegação;
- feedback dos jogadores;
- manutenção e operações administrativas globais.

As permissões reais devem continuar protegidas pelas **Firestore Security Rules**. Ocultar um botão no frontend não substitui autorização no backend.

---

## Executando localmente

O frontend não exige etapa de build. Use um servidor HTTP local para preservar corretamente Service Worker, Firebase e políticas de origem.

Com Firebase CLI:

```bash
firebase emulators:start
```

Para publicar o Hosting:

```bash
firebase deploy --only hosting
```

Para publicar somente as regras:

```bash
firebase deploy --only firestore:rules
```

Para publicar a configuração indicada por `firebase.json`:

```bash
firebase deploy
```

---

## Segurança

- Cada jogador acessa seu próprio save autenticado.
- Operações administrativas exigem uma conta autorizada.
- O ranking público utiliza apenas os dados necessários para a exibição do perfil.
- Feedbacks são enviados por usuários autenticados e administrados separadamente.
- Documentos não autorizados pelas regras são negados por padrão.
- Segredos administrativos, chaves privadas e Service Accounts não devem ser armazenados no repositório.

A economia é executada no navegador. Para uma economia totalmente autoritativa contra manipulação do cliente, as operações críticas precisariam ser processadas em infraestrutura confiável de servidor.

---

## Arquivos sensíveis

O `.gitignore` deve continuar protegendo arquivos como:

```gitignore
.firebase/
node_modules/
.env
.env.*
*.log
*.pem
*.key
*.p12
*.pfx
*.jks
*.keystore
*serviceAccount*.json
*firebase-adminsdk*.json
```

Nunca publique chaves privadas, certificados de assinatura, senhas ou credenciais administrativas.

---

## Páginas públicas

- `index.html` — apresentação e instalação;
- `play.html` — aplicação principal;
- `tutorial.html` — tutorial do jogo;
- `privacy.html` — Política de Privacidade;
- `terms.html` — Termos de Uso;
- `404.html` — página de caminho inexistente.

As novidades da versão atual são mantidas neste README, junto da documentação do projeto.

---

## Licença

Este projeto utiliza uma **licença proprietária**. A disponibilização do código em um repositório público não concede automaticamente permissão para copiar, redistribuir, modificar ou reutilizar o projeto.

Consulte [`LICENSE`](LICENSE) antes de utilizar qualquer parte do código ou dos assets.

---

<p align="center">
  <strong>Fazenda Serena · 1.2.0</strong><br>
  Agricultura, estratégia, produção e progressão em uma experiência incremental para navegador.
</p>
