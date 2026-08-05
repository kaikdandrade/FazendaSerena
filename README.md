<p align="center">
  <a href="https://fazenda-serena.web.app/">
    <img src="assets/logo.png" width="150" alt="Logo da Fazenda Serena">
  </a>
</p>

<h1 align="center">Fazenda Serena</h1>

<p align="center">
  <strong>Agricultura Industrial</strong><br>
  Um jogo idle de fazenda para navegador sobre produção, comércio, pesquisa e construção de um legado agrícola.
</p>

<p align="center">
  <a href="https://fazenda-serena.web.app/">
    <img alt="Jogar agora" src="https://img.shields.io/badge/Jogar_agora-Firebase_Hosting-2f6f4e?style=for-the-badge&logo=firebase&logoColor=white">
  </a>
  <a href="https://github.com/kaikedandrade/paisagemserena/releases">
    <img alt="Versão 1.0.0" src="https://img.shields.io/badge/vers%C3%A3o-1.0.0-466f55?style=for-the-badge">
  </a>
  <a href="LICENSE">
    <img alt="Licença proprietária" src="https://img.shields.io/badge/licen%C3%A7a-propriet%C3%A1ria-735c3d?style=for-the-badge">
  </a>
</p>

<p align="center">
  <a href="https://fazenda-serena.web.app/"><strong>Jogar no navegador</strong></a>
  ·
  <a href="https://github.com/kaikedandrade/paisagemserena/issues">Reportar um problema</a>
  ·
  <a href="https://fazenda-serena.web.app/privacy.html">Política de Privacidade</a>
</p>

---

## Sobre o projeto

**Fazenda Serena** é um jogo idle de agricultura desenvolvido com HTML, CSS e JavaScript puro. O jogador cultiva dezenas de plantas, administra o estoque, negocia contratos, conclui pedidos e missões, investe em pesquisas e reinicia sua jornada por meio do sistema de prestígio para construir bônus permanentes.

A versão **1.0.0** marca o primeiro lançamento público estável do projeto. O jogo não utiliza framework de interface nem etapa de build: basta servi-lo por HTTP e abrir no navegador.

## Destaques

- **71 culturas** com desbloqueio progressivo, categorias, níveis individuais e domínio até o nível 300.
- Produção automática, progresso offline limitado e venda automática por cultura.
- Estoque compartilhado, capacidade expansível e escoamento atacadista do excedente.
- Contratos empresariais, pedidos permanentes e **83 etapas de missões**.
- Aprimoramentos por moedas, **12 pesquisas** e **12 legados de prestígio**.
- Ganho de experiência por tempo jogado e geração passiva de pontos de pesquisa.
- Marcos de nível com modal, som e apresentação dos novos desbloqueios.
- Login exclusivo com Google e save automático privado no Cloud Firestore.
- Ranking global de prestígio com **40 avatares de animais**.
- Trilha musical, efeitos sonoros, controles independentes de volume e ambiente animado.
- Interface responsiva para computador, tablet e celular.
- Política de privacidade, preferências de cookies e integração preparada para Google AdSense.

## Ciclo de jogo

```text
Cultivar → Armazenar ou vender → Cumprir contratos e pedidos
    ↓                                      ↓
Melhorar plantações ← Pesquisar ← Ganhar moedas e pesquisa
    ↓
Alcançar o nível 40 → Prestigiar → Comprar legados permanentes
```

## Tecnologias

| Área | Tecnologia |
| --- | --- |
| Interface | HTML5, CSS3 e JavaScript puro |
| Autenticação | Firebase Authentication com Google |
| Banco de dados | Cloud Firestore |
| Hospedagem | Firebase Hosting |
| Monetização | Google AdSense |
| Persistência | Save em nuvem para contas autenticadas |
| Áudio | Web Audio API e elementos de áudio do navegador |

## Estrutura principal

```text
FazendaSerena/
├── assets/                 # Imagens, ícones, avatares, culturas e sons
├── css/
│   ├── style.css           # Interface principal e responsividade
│   ├── monetization.css    # Publicidade e consentimento
│   └── privacy.css         # Política de Privacidade
├── js/
│   ├── appConfig.js        # Versão pública e configurações globais
│   ├── data.js             # Culturas, pesquisas, prestígios e missões
│   ├── GameEngine.js       # Estado, economia e regras do jogo
│   ├── main.js             # Renderização e eventos da interface
│   ├── firebaseManager.js  # Login, save, ranking e reset da conta
│   ├── soundEngine.js      # Música, efeitos e volumes
│   └── ambientBackground.js# Folhas sazonais e orbes animadas
├── index.html              # Aplicação principal
├── privacy.html            # Política de Privacidade e Cookies
├── firebase.json           # Hosting e regras de publicação
├── firestore.rules         # Segurança do banco de dados
├── ads.txt                 # Autorização pública do AdSense
└── LICENSE                 # Licença proprietária do projeto
```

## Executar localmente

O jogo precisa ser aberto por HTTP. Abrir o `index.html` diretamente pelo explorador de arquivos pode impedir o funcionamento correto dos recursos do Firebase.

### Usando Python

```bash
python -m http.server 8000
```

Acesse:

```text
http://localhost:8000
```

### Usando o Firebase CLI

```bash
firebase serve
```

Ou, para testar Hosting e Firestore localmente:

```bash
firebase emulators:start
```

## Configuração do Firebase

1. Crie ou selecione um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Habilite o provedor Google em **Authentication → Sign-in method**.
3. Adicione os domínios usados em **Authentication → Settings → Authorized domains**.
4. Crie um banco Cloud Firestore.
5. Preencha `js/firebase-config.js` com a configuração pública do aplicativo web.
6. Confirme o projeto padrão em `.firebaserc`.
7. Publique as regras e o site:

```bash
firebase deploy
```

Os saves privados são armazenados em:

```text
players/{uid}/saves/main
```

O ranking público utiliza:

```text
prestigeLeaderboard/{uid}
```

As regras garantem que cada conta possa ler e alterar apenas o próprio save. O ranking expõe somente os dados públicos necessários para a classificação.

## Publicação

Para instalar o Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

Para publicar somente o site:

```bash
firebase deploy --only hosting
```

Para publicar Hosting e regras do Firestore:

```bash
firebase deploy
```

A aplicação de produção está configurada para:

```text
https://fazenda-serena.web.app/
```

## Versionamento

A versão do jogo é definida em **um único lugar**:

```text
js/appConfig.js
```

```javascript
const config = Object.freeze({
  appVersion: "1.0.0",
  releaseChannel: "release",
  audioDefaults: Object.freeze({
    musicVolume: 10
  })
});
```

Para lançar a versão `1.0.1`, altere somente `appVersion`. O HTML, o motor do jogo, o save e o Firestore utilizam essa mesma fonte.

O projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/):

- `MAJOR`: alterações incompatíveis ou grandes mudanças de produto;
- `MINOR`: novos recursos compatíveis;
- `PATCH`: correções e pequenos ajustes compatíveis.

## AdSense, cookies e privacidade

A configuração do AdSense está documentada em [`ADSENSE_SETUP.md`](ADSENSE_SETUP.md). Os identificadores presentes em `ads.txt`, na metatag do AdSense e na configuração web do Firebase são informações públicas necessárias ao funcionamento dos respectivos serviços; eles não são senhas.

Não publique chaves privadas, contas de serviço, arquivos `.env`, credenciais administrativas ou tokens de acesso no repositório.

O aviso local de cookies permite configurar a análise opcional. Para regiões nas quais o Google exige uma plataforma de consentimento certificada, a mensagem correspondente também deve ser configurada em **AdSense → Privacidade e mensagens**.

## Feedback e problemas

Encontrou um erro ou tem uma sugestão? Abra uma [issue](https://github.com/kaikedandrade/paisagemserena/issues) com:

- descrição clara do comportamento;
- passos para reproduzir;
- navegador e dispositivo usados;
- captura de tela ou log do console, quando possível.

## Licença

Este projeto usa uma **licença proprietária**. O código-fonte está visível para apresentação e manutenção do projeto, mas isso **não concede autorização para copiar, redistribuir, modificar, hospedar ou comercializar** o jogo e seus recursos.

Antes de publicar, preencha os campos entre colchetes no arquivo [`LICENSE`](LICENSE) com o nome e o contato do titular.

Componentes e serviços de terceiros continuam sujeitos às suas próprias licenças e termos.

## Autor

Desenvolvido por **Kaik D'Andrade**.

- Repositório: [github.com/kaikedandrade/paisagemserena](https://github.com/kaikedandrade/paisagemserena)
- Jogo: [fazenda-serena.web.app](https://fazenda-serena.web.app/)

---

<p align="center">
  Feito com dedicação, estratégia e muitas colheitas. 🌱
</p>
