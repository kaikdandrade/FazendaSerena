"use strict";

(() => {
  const icons = [
  {
    "value": "assets/icons/agenda-comunicados.webp",
    "label": "Agenda de comunicados",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/arcos-azuis.webp",
    "label": "Arcos azuis",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/cadeado.webp",
    "label": "Cadeado",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/caixa-colheita.webp",
    "label": "Caixa de colheita",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/calculadora-moeda.webp",
    "label": "Calculadora e moeda",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/calendario-eventos.webp",
    "label": "Calendário de eventos",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/caminhao-entrega.webp",
    "label": "Caminhão de entrega",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/campo-ensolarado.webp",
    "label": "Campo ensolarado",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/carteira-moedas.webp",
    "label": "Carteira de moedas",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/chapeu-formatura.webp",
    "label": "Chapéu de formatura",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/compra.webp",
    "label": "Compra",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/comunicado.webp",
    "label": "Comunicado",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/configuracoes.webp",
    "label": "Configurações",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/contrato-agricola.webp",
    "label": "Contrato agrícola",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/contrato-comercial.webp",
    "label": "Contrato comercial",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/coroa.webp",
    "label": "Coroa",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/crescimento-planta.webp",
    "label": "Crescimento de planta",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/crescimento-producao.webp",
    "label": "Crescimento de produção",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/dna.webp",
    "label": "DNA",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/documento-assinatura.webp",
    "label": "Documento e assinatura",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/emblema-conquista.webp",
    "label": "Emblema de conquista",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/engrenagem-azul.webp",
    "label": "Engrenagem azul",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/engrenagem-folha.webp",
    "label": "Engrenagem e folha",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/escritorio-computador.webp",
    "label": "Escritório com computador",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/escritorio-estudos.webp",
    "label": "Escritório de estudos",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/estimativa-preco.webp",
    "label": "Estimativa de preço",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/estrela-dominio-cultura.webp",
    "label": "Estrela de domínio da cultura",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/fazenda-celeiro.webp",
    "label": "Fazenda e celeiro",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/fazendeiro.webp",
    "label": "Fazendeiro",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/ferramentas.webp",
    "label": "Ferramentas",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/fertilizante.webp",
    "label": "Fertilizante",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/galpao-industrial.webp",
    "label": "Galpão industrial",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/galpao-madeira.webp",
    "label": "Galpão de madeira",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/google-colorido.webp",
    "label": "Google colorido",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/ideia-verde.webp",
    "label": "Ideia verde",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/irrigacao.webp",
    "label": "Irrigação",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/livros.webp",
    "label": "Livros",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/logo-bauduque.webp",
    "label": "Logo Bauduque",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/logo-google.webp",
    "label": "Logo do Google",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/mapa.webp",
    "label": "Mapa",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/marco-nivel.webp",
    "label": "Marco de nível",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/medalha-fora-top-5.webp",
    "label": "Medalha fora do Top 5",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/medalha-ranking-1.webp",
    "label": "Medalha de ranking — 1º lugar",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/medalha-ranking-2.webp",
    "label": "Medalha de ranking — 2º lugar",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/medalha-ranking-3.webp",
    "label": "Medalha de ranking — 3º lugar",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/medalha-ranking-4.webp",
    "label": "Medalha de ranking — 4º lugar",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/medalha-ranking-5.webp",
    "label": "Medalha de ranking — 5º lugar",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/moeda.webp",
    "label": "Moeda",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/muda-vaso.webp",
    "label": "Muda em vaso",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/pacote.webp",
    "label": "Pacote",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/perfil.webp",
    "label": "Perfil",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/pocao-pesquisa.webp",
    "label": "Poção de pesquisa",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/prancheta-tarefas.webp",
    "label": "Prancheta de tarefas",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/precificacao.webp",
    "label": "Precificação",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/prestigio-conta.webp",
    "label": "Prestígio de conta",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/prestigio.webp",
    "label": "Prestígio",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/raizes.webp",
    "label": "Raízes",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/ranking.webp",
    "label": "Ranking",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/refeicao.webp",
    "label": "Refeição",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/regador-muda.webp",
    "label": "Regador e muda",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/relogio-azul.webp",
    "label": "Relógio azul",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/relogio.webp",
    "label": "Relógio",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/renovar-contrato.webp",
    "label": "Renovar contrato",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/retorno-financeiro.webp",
    "label": "Retorno financeiro",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/retorno-offline.webp",
    "label": "Retorno offline",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/sal.webp",
    "label": "Sal",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/seta-cima.webp",
    "label": "Seta para cima",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/silo.webp",
    "label": "Silo",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/social.webp",
    "label": "Social",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/sol-horizonte.webp",
    "label": "Sol no horizonte",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/trofeu.webp",
    "label": "Troféu",
    "kind": "icone",
    "source": "local"
  },
  {
    "value": "assets/icons/xp.webp",
    "label": "Experiência (XP)",
    "kind": "icone",
    "source": "local"
  }
];
  const plants = [
  {
    "value": "assets/plants/abacate.webp",
    "label": "Abacate",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/abacaxi.webp",
    "label": "Abacaxi",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/abobora.webp",
    "label": "Abobora",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/acai.webp",
    "label": "Açaí",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/acerola.webp",
    "label": "Acerola",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/aipim.webp",
    "label": "Aipim",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/alface.webp",
    "label": "Alface",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/algodao.webp",
    "label": "Algodao",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/alho-poro.webp",
    "label": "Alho Poro",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/alho.webp",
    "label": "Alho",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/ameixa.webp",
    "label": "Ameixa",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/amendoim.webp",
    "label": "Amendoim",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/amora.webp",
    "label": "Amora",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/arroz.webp",
    "label": "Arroz",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/aveia.webp",
    "label": "Aveia",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/azeitona.webp",
    "label": "Azeitona",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/banana.webp",
    "label": "Banana",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/batata-doce.webp",
    "label": "Batata Doce",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/batata.webp",
    "label": "Batata",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/berinjela.webp",
    "label": "Berinjela",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/beterraba.webp",
    "label": "Beterraba",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/brocolis.webp",
    "label": "Brócolis",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/cacau.webp",
    "label": "Cacau",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/cafe.webp",
    "label": "Café",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/caju.webp",
    "label": "Caju",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/carambola.webp",
    "label": "Carambola",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/cebola.webp",
    "label": "Cebola",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/cenoura.webp",
    "label": "Cenoura",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/cereja.webp",
    "label": "Cereja",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/coco.webp",
    "label": "Coco",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/couve-flor.webp",
    "label": "Couve Flor",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/couve.webp",
    "label": "Couve",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/cupuacu.webp",
    "label": "Cupuacu",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/ervilha.webp",
    "label": "Ervilha",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/espinafre.webp",
    "label": "Espinafre",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/feijao.webp",
    "label": "Feijão",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/figo.webp",
    "label": "Figo",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/folha.webp",
    "label": "Folha",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/framboesa.webp",
    "label": "Framboesa",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/gengibre.webp",
    "label": "Gengibre",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/goiaba.webp",
    "label": "Goiaba",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/graviola.webp",
    "label": "Graviola",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/guarana.webp",
    "label": "Guaraná",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/inhame.webp",
    "label": "Inhame",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/jaca.webp",
    "label": "Jaca",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/kiwi.webp",
    "label": "Kiwi",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/laranja.webp",
    "label": "Laranja",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/limao.webp",
    "label": "Limão",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/maca.webp",
    "label": "Maçã",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/mamao.webp",
    "label": "Mamão",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/manga.webp",
    "label": "Manga",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/maracuja.webp",
    "label": "Maracujá",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/melancia.webp",
    "label": "Melancia",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/melao.webp",
    "label": "Melão",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/milho.webp",
    "label": "Milho",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/mirtilo.webp",
    "label": "Mirtilo",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/morango.webp",
    "label": "Morango",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/pepino.webp",
    "label": "Pepino",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/pera.webp",
    "label": "Pera",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/pessego.webp",
    "label": "Pêssego",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/pimenta.webp",
    "label": "Pimenta",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/pimentao.webp",
    "label": "Pimentão",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/pitaya.webp",
    "label": "Pitaya",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/rabanete.webp",
    "label": "Rabanete",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/repolho.webp",
    "label": "Repolho",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/soja.webp",
    "label": "Soja",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/tamarindo.webp",
    "label": "Tamarindo",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/tangerina.webp",
    "label": "Tangerina",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/tomate.webp",
    "label": "Tomate",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/trigo.webp",
    "label": "Trigo",
    "kind": "planta",
    "source": "local"
  },
  {
    "value": "assets/plants/uva.webp",
    "label": "Uva",
    "kind": "planta",
    "source": "local"
  }
];
  const avatars = () => (window.AvatarData || []).map(avatar => ({ value: avatar.src, label: avatar.label, kind: "avatar", source: "local" }));
  const all = () => [...icons, ...plants, ...avatars()];
  const registry = Object.freeze({
    all,
    byKind(kind) { return all().filter(item => item.kind === kind); },
    options(kind) { return this.byKind(kind).map(item => ({ value: item.value, label: item.label })); }
  });
  window.LocalAssetLibrary = registry;
  window.AdminAssetRegistry = registry;
})();
