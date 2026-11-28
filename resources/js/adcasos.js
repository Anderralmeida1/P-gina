/*
 * Página de casos e changelog.
 *
 * Lê o modelo do parâmetro `modelo` da URL e carrega o arquivo correspondente
 * em resources/data. Os arquivos podem fornecer registros em `casos` (casos
 * Salesforce) ou `versoes` (changelog tradicional). Os campos comuns usados
 * pelos casos incluem caso, criticidade, dataAbertura, dataLimite e resumo.
 *
 * Exemplo: painel.html?modelo=analises-defeito
 */
// Arquivo de catálogo que relaciona modelos a documentos associados.
var MODELOS_URL = 'resources/data/modelos.json';
var LINHAS_PRODUTO = ['Alarmes', 'Sensores', 'Guardian'];
var linhasProdutoSelecionadas = [];
// Identificador validado recebido na URL.
var MODELO = modeloDaUrl();
// Caminho do JSON de dados do modelo selecionado.
var CHANGELOG_URL = 'resources/data/' + MODELO + '.json';
// Dados carregados; reutilizados pela busca e pela navegação da sidebar.
var changelogData = null;

// Aguarda a página estar pronta antes de validar a URL e solicitar os dados.
$(document).ready(function () {
  if (!MODELO) {
    window.location.replace('index.html');   // sem modelo: volta para a seleção
    return;
  }
  carregarChangelog();
});

/**
 * Lê e valida o parâmetro de modelo para evitar nomes de arquivo inesperados.
 * @returns {string} Slug válido ou string vazia quando o parâmetro é inválido.
 */
function modeloDaUrl() {
  var m = new URLSearchParams(window.location.search).get('modelo') || '';
  m = m.toLowerCase().trim();
  return /^[a-z0-9-]+$/.test(m) ? m : '';
}

/**
 * Carrega os dados do modelo e inicia a renderização da página.
 * Em caso de falha, apresenta uma mensagem orientando sobre o arquivo e o servidor.
 */
function carregarChangelog() {
  $.getJSON(CHANGELOG_URL)
    .done(function (data) {
      changelogData = data;
      // Aceita tanto o formato de casos quanto o formato antigo de versões.
      var registros = data.casos || data.versoes || [];
      atribuirIds(registros);
      renderCabecalho(data);
      renderSidebar(registros);
      renderVersoes(registros);
      renderDocumentosDoModelo();
      bindBusca();
      bindFiltrosLinhaProduto();
    })
    .fail(function () {
      $('#changelogContent').html(
        '<div class="alert alert-danger">Não foi possível carregar o arquivo <b>' + esc(CHANGELOG_URL) +
        '</b>. Verifique se ele existe, se o JSON está válido (vírgulas e aspas) e se a página está ' +
        'sendo servida por um servidor web (use o <code>iniciar.bat</code> / <code>iniciar.sh</code>). ' +
        '<a href="index.html">Escolher outro modelo</a></div>'
      );
    });
}

/**
 * Preenche o título do produto, a data de atualização e o título da guia.
 * @param {Object} data Dados gerais do arquivo JSON do modelo.
 */
function renderCabecalho(data) {
  $('#headerTitulo').text(' ');
  $('#headerProduto').text(data.produto || '');
  $('#headerData').text('Atualizado em ' + (data.atualizadoEm || ''));
  document.title = 'Painel PV';
}

/**
 * Cria os links dos casos/versões e atualiza o contador da sidebar.
 * @param {Array<Object>} versoes Registros já preparados com identificadores.
 */
function renderSidebar(versoes) {
  var $ul = $('#sidebarVersions').empty();
  $('#contadorCasos').text(versoes.length);

  ordenarVersoes(versoes).forEach(function (v) {
    var $li = $('<li>');
    var $a = $('<a>', { 'class': 'sidebar-link', href: '#versao-' + v._id });
    $a.append(document.createTextNode('Caso ' + (v.caso || v.versao || '')));
    $ul.append($li.append($a));
  });

  $ul.append(
    '<li><a class="sidebar-link" href="#content"><i class="fas fa-arrow-up me-2"></i>Voltar ao topo</a></li>'
  );
}

/** Retorna os registros correspondentes às linhas de produto selecionadas. */
function filtrarPorLinhaProduto(versoes) {
  if (!linhasProdutoSelecionadas.length) { return versoes; }
  return versoes.filter(function (versao) {
    return linhasProdutoSelecionadas.indexOf(versao.linhaProduto) !== -1;
  });
}

/**
 * Exibe links para outros documentos cadastrados para o mesmo modelo.
 * Não altera a sidebar se o modelo não possuir documentos relacionados.
 */
function renderDocumentosDoModelo() {
  $.getJSON(MODELOS_URL).done(function (data) {
    var modelo = (data.modelos || []).filter(function (m) {
      return (m.documentos || []).some(function (d) { return d.arquivo === MODELO; });
    })[0];
    if (!modelo || modelo.documentos.length < 2) { return; }

    var $ul = $('#sidebarDocumentos').empty();
    modelo.documentos.forEach(function (d) {
      var $a = $('<a>', { 'class': 'sidebar-link' + (d.arquivo === MODELO ? ' active' : ''),
                          href: 'painel.html?modelo=' + d.arquivo });
      $a.append('<i class="fas fa-file-alt me-2"></i>').append(document.createTextNode(d.rotulo));
      $ul.append($('<li>').append($a));
    });
    $('#sidebarDocumentosBloco').removeClass('d-none');
  });
}

/**
 * Renderiza todos os casos/versões em ordem cronológica decrescente.
 * @param {Array<Object>} versoes Registros a serem exibidos.
 */
function renderVersoes(versoes) {
  var $c = $('#changelogContent').empty();

  if (!versoes || !versoes.length) {
    $c.html('<div class="alert alert-warning">Nenhum caso disponível.</div>');
    return;
  }

  ordenarVersoes(versoes).forEach(function (v) {
    var id = v._id;
    var classeCriticidade = classeDaCriticidade(v.criticidade);
    var classeDataLimite = dataLimiteEmAte15Dias(
      v.dataLimite,
      changelogData && changelogData.atualizadoEm
    ) ? ' data-limite-proxima' : '';

    var html =
      '<article class="versao-item" id="versao-' + id + '">' +
        '<h2 class="versao-titulo caso-titulo">' +
          '<span class="caso-identificacao">' +
            '<span>CASO - ' + esc(v.caso || 'XXXXXXX') + '</span>' +
            (v.assunto ? '<span class="caso-assunto">' + esc(v.assunto) + '</span>' : '') +
          '</span>' +
          '<span class="version-badge ' + classeCriticidade + '">' +
            esc((v.criticidade || 'Criticidade').toUpperCase()) +
          '</span>' +
        '</h2>' +
        '<div class="versao-corpo">' +
            '<div class="caso-periodo">' +
              '<p class="text-muted"><i>Data de Abertura: ' + esc(v.dataAbertura || '') + '</i></p>' +
              '<p class="text-muted' + classeDataLimite + '"><i>Data Limite: ' + esc(v.dataLimite || '') + '</i></p>' +
            '</div>' +
          '<h5 class="caso-resumo-titulo">Resumo</h5>' +
          renderLista(v.resumo) +
        '</div>' +
      '</article>';

    $c.append(html);
  });
}

/**
 * Informa se a data limite está a até 15 dias da data de atualização.
 * Datas vencidas também retornam true; datas inválidas não recebem destaque.
 * @param {string} dataLimite Data limite no formato DD/MM/AAAA.
 * @param {string} dataAtualizacao Data de atualização no formato DD/MM/AAAA.
 * @returns {boolean} Se o prazo deve receber destaque visual.
 */
function dataLimiteEmAte15Dias(dataLimite, dataAtualizacao) {
  var limite = parseData(dataLimite);
  var atualizacao = parseData(dataAtualizacao);

  if (isNaN(limite.getTime()) || isNaN(atualizacao.getTime())) {
    return false;
  }

  var limiteUtc = Date.UTC(limite.getFullYear(), limite.getMonth(), limite.getDate());
  var atualizacaoUtc = Date.UTC(
    atualizacao.getFullYear(),
    atualizacao.getMonth(),
    atualizacao.getDate()
  );
  var diasRestantes = (limiteUtc - atualizacaoUtc) / 86400000;

  return diasRestantes <= 15;
}

/**
 * Converte a criticidade em uma classe CSS, ignorando diferenças de acentuação.
 * @param {string} criticidade Nível de criticidade informado no JSON.
 * @returns {string} Classe de cor correspondente ou string vazia.
 */
function classeDaCriticidade(criticidade) {
  var valor = String(criticidade || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  switch (valor) {
    case 'baixa': return 'criticidade-baixa';
    case 'media': return 'criticidade-media';
    case 'alta': return 'criticidade-alta';
    case 'muito alta': return 'criticidade-muito-alta';
    default: return '';
  }
}

/**
 * Converte uma lista de resumo/alterações em HTML, inclusive listas aninhadas.
 * Itens podem ser strings ou objetos com texto, subitens, obs e nota.
 * @param {Array<string|Object>} itens Itens a exibir.
 * @returns {string} HTML da lista ou string vazia se não houver itens.
 */
function renderLista(itens) {
  if (!itens || !itens.length) { return ''; }
  var h = '<ul>';
  itens.forEach(function (it) {
    if (typeof it === 'string') {
      h += '<li>' + fmt(it) + '</li>';
      return;
    }
    var filhos = (it.obs ? ['Obs: ' + it.obs] : []).concat(it.subitens || []);
    h += '<li>' + fmt(it.texto || '') + (filhos.length ? renderLista(filhos) : '') +
         (it.nota ? '<p class="nota">' + fmt(it.nota) + '</p>' : '') + '</li>';
  });
  return h + '</ul>';
}

/** Conecta o campo de busca ao filtro acionado a cada alteração de texto. */
function bindBusca() {
  $('#buscaInput').on('input', function () {
    filtrarVersoes($(this).val().toLowerCase().trim());
  });
}

/** Conecta as caixas de seleção dos filtros por linha de produto. */
function bindFiltrosLinhaProduto() {
  if (!changelogData || !Array.isArray(changelogData.casos)) { return; }

  var $filtros = $('#filtrosLinhaProduto').prop('hidden', false);
  $filtros.on('click', 'button[data-linha-produto]', function () {
    var $button = $(this);
    $button.attr('aria-pressed', $button.attr('aria-pressed') !== 'true');
    linhasProdutoSelecionadas = $filtros.find('button[aria-pressed="true"]').map(function () {
      return this.dataset.linhaProduto;
    }).get().filter(function (linha) {
      return LINHAS_PRODUTO.indexOf(linha) !== -1;
    });

    var registros = changelogData.casos || [];
    renderSidebar(filtrarPorLinhaProduto(registros));
    var termoBusca = String($('#buscaInput').val() || '').toLowerCase().trim();
    filtrarVersoes(termoBusca);
  });
}

/**
 * Filtra os registros pesquisando nos campos principais e textos aninhados.
 * @param {string} termo Texto digitado pelo usuário.
 */
function filtrarVersoes(termo) {
  var versoes = (changelogData && (changelogData.casos || changelogData.versoes)) || [];
  versoes = filtrarPorLinhaProduto(versoes);

  if (!termo) {
    renderVersoes(versoes);
    return;
  }

  var t = normalizar(termo);
  var filtradas = versoes.filter(function (v) {
    var texto = [
      v.caso, v.assunto, v.criticidade, v.dataAbertura, v.dataLimite,
      v.versao, v.data, v.dataExtenso, v.titulo
    ].concat(textosDe(v.resumo), textosDe(v.alteracoes)).join(' ');
    return normalizar(texto).indexOf(t) !== -1;
  });

  if (!filtradas.length) {
    $('#changelogContent').html(
      termo
        ? '<div class="alert alert-warning">Nenhum resultado encontrado para: <b>' + esc(termo) + '</b></div>'
        : '<div class="alert alert-warning">Nenhum caso encontrado para as linhas de produto selecionadas.</div>'
    );
    return;
  }
  renderVersoes(filtradas);   // o sidebar NÃO é filtrado
}

// Se a busca escondeu o destino escolhido na sidebar, restaura os registros antes de navegar.
$(document).on('click', '#sidebarVersions a[href^="#versao-"]', function () {
  var id = $(this).attr('href').substring(1);
  if ($('#' + id).length || !changelogData) { return; }
  $('#buscaInput').val('');
  filtrarVersoes('');
  $(this).trigger('click');
});

/** Converte uma data DD/MM/AAAA em Date local para ordenação e comparação. */
function parseData(str) {
  var p = String(str).split('/');
  return new Date(p[2], p[1] - 1, p[0]);
}

/** Retorna uma cópia dos registros ordenada do mais recente para o mais antigo. */
function ordenarVersoes(versoes) {
  return versoes.slice().sort(function (a, b) {
    return parseData(b.dataAbertura || b.data) - parseData(a.dataAbertura || a.data);
  });
}

/** Gera um fragmento seguro para usar como ID HTML ou âncora. */
function slug(versao) {
  return String(versao).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'v';
}

/**
 * Atribui IDs únicos aos registros, acrescentando sufixos em caso de duplicidade.
 * @param {Array<Object>} versoes Registros que receberão a propriedade _id.
 */
function atribuirIds(versoes) {
  var usados = {};
  ordenarVersoes(versoes).forEach(function (v) {
    var base = slug(v.caso || v.versao);
    usados[base] = (usados[base] || 0) + 1;
    v._id = usados[base] > 1 ? base + '-' + usados[base] : base;
  });
}

/** Escapa texto antes de inseri-lo em uma string HTML. */
function esc(s) {
  return $('<div>').text(s == null ? '' : String(s)).html();
}

/**
 * Escapa o texto e aplica a sintaxe simples de negrito, itálico, vermelho e quebra de linha.
 */
function fmt(s) {
  return esc(s)
    .replace(/!!(.+?)!!/g, '<strong class="text-danger">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

/** Remove acentos e converte texto para facilitar buscas sem distinção de caixa. */
function normalizar(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Extrai textos de itens e subitens para que todos possam ser pesquisados. */
function textosDe(itens) {
  var out = [];
  (itens || []).forEach(function (it) {
    if (typeof it === 'string') { out.push(it); return; }
    out.push(it.texto || '');
    if (it.obs) { out.push(it.obs); }
    if (it.nota) { out.push(it.nota); }
    out = out.concat(textosDe(it.subitens));
  });
  return out;
}
