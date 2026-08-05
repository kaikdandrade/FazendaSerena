# Fazenda Serena — Agricultura Industrial

Jogo idle de agricultura desenvolvido em HTML, CSS e JavaScript puro, com Firebase Authentication e Cloud Firestore carregados pelo CDN oficial.

## Como executar

O projeto não possui etapa de build, mas precisa ser servido por HTTP para que o login do Google e os módulos do Firebase funcionem corretamente.

Para servir a pasta localmente:

```bash
python -m http.server 8000
```

Depois, acesse `http://localhost:8000`.


## Configuração do Firebase

1. Em **Firebase Authentication > Sign-in method**, habilite o provedor Google.
2. Em **Authentication > Settings > Authorized domains**, mantenha `localhost`, adicione `127.0.0.1` para testes locais e adicione o domínio usado em produção.
3. Crie o banco **Cloud Firestore**.
4. Publique o conteúdo de `firestore.rules` na aba de regras do Firestore ou execute `firebase deploy --only firestore:rules`.
5. O arquivo `js/firebase-config.js` contém a identificação do projeto usada pelo navegador.
6. Os saves ficam em `players/{uid}/saves/main`; as regras permitem que cada usuário leia e altere somente o próprio documento.
7. O rank público fica em `prestigeLeaderboard/{uid}`, pode ser consultado também por visitantes e é atualizado no mesmo lote do save privado somente quando o usuário salvou um apelido e um avatar válidos.

Visitantes não possuem save persistente: o estado existe apenas na memória e é perdido ao recarregar ou fechar a página. Ao entrar com Google, o jogo procura um save da conta no Firestore. Quando não existe save anterior, a sessão atual do visitante é enviada para a nuvem e passa a ser salva automaticamente a cada 15 segundos.

## Sistemas atuais

- 71 culturas em uma progressão reordenada que começa pela Folha; exatamente uma nova cultura é liberada a cada cinco níveis, e a Jaca encerra a linha no nível 350 com custo na casa dos trilhões.
- Jornada inicial com 120 moedas. O capital inicial só aumenta pelo legado de prestígio Tesouro da Dinastia, agora em +5K moedas por nível; a economia mantém curvas longas de compra, aprimoramento, pesquisa e prestígio.
- Desbloqueio progressivo: aparecem as culturas já alcançadas e até as três próximas culturas bloqueadas por nível.
- Produção automática com rendimento-base de 2 unidades por ciclo e progresso offline de até 8 horas.
- Indicador circular suave ao redor da cultura, com reinício instantâneo em zero após completar cada ciclo.
- Aprimoramento individual até o nível 300, com seleção entre `+1` e `Max`; toda cultura recém-comprada já abre com `Max` selecionado. Ao alcançar o nível 300, a cultura concede uma vez por jornada 10% do requisito atual de XP e recebe uma apresentação dourada de planta platinada com estrela própria.
- Cada nível reduz o tempo e valoriza a cultura; a produção contínua ocorre no nível 300 sem bônus e pode chegar ao nível 250 com todas as melhorias de velocidade.
- Estoque único compartilhado, iniciado com 200 espaços, filtro por categoria, venda automática por cultura e controle geral para ativar ou desativar todas as vendas automáticas. Os cards do Estoque permanecem focados somente em quantidade, valor e venda, sem indicadores de contratos.
- Capacidade ampliada em +100 espaços diretamente no Estoque; Aprimoramentos, Pesquisa e Prestígio continuam oferecendo bônus percentuais adicionais.
- Fluxo de produção com prioridade: contrato ativo — inclusive vencido —, venda automática e estoque. Pedidos exigem entrega manual do lote completo.
- Centro de Evoluções separado em Aprimoramentos, Pesquisa e Prestígio. Todos os tabs podem ser consultados desde o começo; compras com moedas e pesquisa liberam no nível 5, legados de prestígio permanecem acessíveis e somente o início de uma nova jornada exige nível 40. A Pesquisa possui 11 tecnologias, incluindo o Portfólio de Contratos com somente dois níveis.
- Escritório dividido em Contratos, Pedidos, Missões e Estatísticas.
- Seis espaços de oportunidades empresariais e capacidade progressiva de um a sete contratos ativos. Contratos e o primeiro slot existem desde o início, o segundo slot libera no nível 20, dois vêm da pesquisa Portfólio de Contratos e três do legado Império Contratual. Recusar ou quebrar uma negociação deixa o respectivo espaço indisponível por cinco minutos. A quebra é imediata, cobra a multa mesmo que o saldo fique negativo e é a única ação capaz de produzir moedas negativas.
- Entregas emergenciais mantêm o maior multiplicador sem pesquisa; contratos comerciais e grandes fornecimentos mantêm seus perfis próprios, e todas as recompensas em moedas recebem 10% adicional na Revisão 39. Os prazos foram reduzidos em 30% sobre a revisão anterior.
- Assinar um contrato envia imediatamente o estoque disponível; a produção futura completa o restante.
- Contratos completos dentro do prazo aguardam o resgate manual. Contratos vencidos permanecem no slot sem limite de tempo, exigem 100% da entrega, perdem toda recompensa e só são removidos após o pagamento de uma multa igual às moedas originais mais 20%; esse encerramento atrasado concede 1,7% do XP necessário para o próximo nível.
- Pedidos por cultura com progressão até 10.000 unidades. A etapa só pode ser entregue quando todo o lote estiver no estoque; a série é renovada a cada prestígio.
- 83 etapas de missões permanentes em 11 séries, com métricas acumuladas entre jornadas; missões concluídas nunca são renovadas pelo prestígio.
- Estatísticas históricas, recordes, conquistas, legados e bônus permanentes dentro do Escritório, além de um top 5 global de prestígio visível inclusive para visitantes. Para participar, a conta autenticada precisa salvar um apelido de 4 a 24 caracteres e um dos 40 avatares de animais disponíveis nas Configurações; também é possível manter o perfil salvo e optar por não aparecer no ranking.
- A interface e os legados de Prestígio podem ser usados desde o início; a ação de prestigiar libera no nível 40, exige confirmação própria e mostra somente os fatores renováveis usados no cálculo e o que será reiniciado.
- Nível máximo da fazenda em 1.000; a curva de requisito de XP cresce suavemente no início e alcança a faixa `Az` nos níveis finais. Como todas as fontes relevantes concedem uma porcentagem do requisito atual, o ritmo por ações é preservado. O som de level up e o modal de desbloqueios aparecem apenas nos marcos de cinco em cinco níveis.
- Login exclusivo com Google e salvamento automático privado no Cloud Firestore. Visitantes não usam `localStorage` e perdem a sessão ao recarregar. A conta autenticada pode resetar todo o progresso por uma confirmação irreversível, removendo save e registro do rank antes de criar uma fazenda limpa.
- Motor global de áudio com canal interrompível para efeitos principais, pools simultâneos para impactos nos contadores, música ambiente em loop e três controles integrados à Experiência: volume geral, efeitos e música. Os impactos de moeda, pesquisa e prestígio usam volume interno fixo de 8%, não podem ser aumentados ou reduzidos e são silenciados quando o volume geral ou de efeitos está em 0%.
- Navegação principal e contextual com a mesma altura, ícones em imagem e cadeado visual nas áreas em prévia. Em tablet e celular, o contêiner contextual usa largura pelo conteúdo, fica centralizado, respeita o limite da tela e preserva a rolagem horizontal por toque ou arraste quando necessário.
- Scroll global controlado pelo elemento raiz, compatível com roda do mouse e toque; counters flutuantes durante a rolagem, atalho com ícone para voltar ao topo e layout responsivo para computador, tablet e celular.
- Indicador circular único de ocupação do estoque contornando o tab da esquerda para a direita em todos os estados; ao lotar, o tab fica vermelho e recebe uma exclamação.

## Perfil público e avatares

A conta conectada pode definir um apelido obrigatório de 4 a 24 caracteres e escolher um avatar em **Configurações > Conta e nuvem**. O catálogo reúne somente 40 avatares de animais em `assets/avatars`. O perfil pode ser editado depois, mas um apelido vazio, curto demais ou sem avatar nunca é publicado. Mesmo com o perfil preenchido, o jogador pode marcar que não deseja participar do ranking global; apelido e avatar continuam salvos normalmente, enquanto o registro público é removido. O top 5 pode ser consultado mesmo sem login. Quando o jogador autenticado estiver participando e estiver fora do top 5, sua posição real também aparece abaixo dos cinco primeiros.

## Contratos

Os contratos estão disponíveis desde o início. A fazenda começa com um slot ativo; o segundo libera no nível 20, o terceiro e o quarto vêm dos dois níveis da pesquisa Portfólio de Contratos, e os três últimos vêm do legado Império Contratual, totalizando até sete. Existem seis espaços de oportunidades. A seleção usa culturas liberadas pelo nível atual, mesmo antes da compra, e procura variar as opções. Cada recusa ou quebra transforma um desses seis espaços em um intervalo fixo de cinco minutos, portanto todas as propostas podem ficar temporariamente indisponíveis. Ao assinar um contrato:

1. o estoque existente da cultura é enviado automaticamente;
2. a produção futura daquela cultura tem prioridade sobre venda automática e armazenamento;
3. ao completar a quantidade, o cronômetro para;
4. a recompensa permanece aguardando resgate no Escritório;
5. se o prazo terminar antes da conclusão, o contrato permanece ativo sem novo limite de tempo;
6. a recompensa é cancelada, a entrega precisa chegar a 100% e uma multa de 120% das moedas prometidas deve ser paga para liberar o slot; esse pagamento concede 1,7% do XP necessário para o próximo nível;
7. um contrato em andamento também pode ser quebrado imediatamente pagando a mesma multa de 120%; a quebra não concede XP e inicia cinco minutos de renovação em uma oportunidade.

## Prestígio

O painel de Prestígio mostra os dados renováveis que influenciam o ganho estimado: moedas recebidas na jornada, culturas compradas, nível da fazenda e contratos concluídos. Pedidos são renovados. Missões, suas etapas concluídas, estatísticas históricas, culturas descobertas, pontos de prestígio, legados e bônus permanentes não são apagados.

## Interface e escala

A escala visual usada anteriormente em 85% passou a representar o novo 100%. O seletor continua disponível entre 85% e 115%, agora sobre essa base mais compacta. Botões de compra sem recursos ficam desabilitados e visualmente neutros.

## Arquivos principais

- `index.html`: estrutura e telas do jogo.
- `css/style.css`: identidade visual, navegação e responsividade.
- `js/firebase-config.js`: configuração pública do projeto Firebase.
- `js/firebaseManager.js`: autenticação Google, leitura do save, fila de gravações, rank global e reset integral no Firestore.
- `js/data.js`: culturas, melhorias, empresas, pedidos e missões.
- `js/GameEngine.js`: economia, produção, estado em memória, contratos e prestígio.
- `js/soundEngine.js`: efeitos permanentes, sequência clique+navegação, música em loop e volumes geral, de efeitos e de música.
- `js/main.js`: renderização, navegação, animações e eventos da interface.
- `firestore.rules` e `firebase.json`: regras dos saves privados, leitura pública do ranking e configuração completa do Firebase Hosting.
- `assets/`: logo, folhas sazonais, culturas, ícones e arquivos de áudio.

## Ícones das empresas

Os contratos usam arquivos PNG em `assets/icons/` para Alimentos Aurora, Mercado Verde Vale, Campo Dourado, Boa Mesa Refeições, Raízes & Companhia, Sabor em Rota, Colheita Serena e Horizonte Orgânicos. Os arquivos foram renomeados em inglês para manter o padrão interno do projeto.


## Ambiente visual

A Revisão 44 usa `js/ambientBackground.js` para controlar todo o ambiente dinâmico. As folhas sazonais entram e saem pelas bordas da tela, variam em tamanho, rotação e duração. Duas orbes percorrem lentamente diferentes cantos e alternam de forma sutil entre azul, verde, amarelo e roxo claro. Todo o conjunto respeita a opção “Ambiente vivo” e a preferência de movimento reduzido do navegador.


## Revisão 45 — counters durante a rolagem

Os counters flutuantes aparecem somente depois que o conjunto original sai completamente da área visível. A transição não modifica o tamanho do cabeçalho nem o fluxo do documento, eliminando o efeito de fricção e a alternância repetida durante o uso da roda do mouse ou do toque.

## Revisão 46 — AdSense, privacidade e cookies

A revisão adiciona a infraestrutura necessária para monetização sem inventar identificadores da conta. O projeto inclui `privacy.html`, aviso e preferências de cookies, Consent Mode v2, carregamento condicional do AdSense, uma posição manual responsiva antes do rodapé, `ads.txt`, `robots.txt`, `sitemap.xml` e configuração de Hosting no `firebase.json`.

Os IDs reais devem ser preenchidos em `js/adsense-config.js` e no `ads.txt` somente depois que forem fornecidos pelo painel do Google AdSense. O passo a passo está em `ADSENSE_SETUP.md`.

O aviso local controla as preferências do próprio site. Para tráfego do Espaço Econômico Europeu, Reino Unido e Suíça, também deve ser publicada a mensagem oficial em **AdSense > Privacidade e mensagens**, pois o Google exige uma CMP certificada nessas regiões.

