/* Changelog: carrega o JSON do modelo escolhido, monta cabeçalho, sidebar e lista de versões,
   e filtra em tempo real.

   O modelo vem da URL:  changelog.html?modelo=amt-8000-pro
   -> lê  resources/data/amt-8000-pro.json                                              */
var MODELOS_URL = 'resources/data/modelos.json';
var MODELO = modeloDaUrl();
var CHANGELOG_URL = 'resources/data/' + MODELO + '.json';
var changelogData = null;

$(document).ready(function () {
  if (!MODELO) {
    window.location.replace('index.html');   // sem modelo: volta para a seleção
    return;
  }
  carregarChangelog();
});

/* Aceita apenas letras minúsculas, números e hífen (o nome do arquivo .json) */
function modeloDaUrl() {
  var m = new URLSearchParams(window.location.search).get('modelo') || '';
  m = m.toLowerCase().trim();
  return /^[a-z0-9-]+$/.test(m) ? m : '';
}

function carregarChangelog() {
  $.getJSON(CHANGELOG_URL)
    .done(function (data) {
      changelogData = data;
      atribuirIds(data.casos || []);
      renderCabecalho(data);
      renderSidebar(data.casos || []);
      renderCasos(data.casos || []);
      renderDocumentosDoModelo();
      bindBusca();
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

/* ---------------------------------------------------------------- cabeçalho */
function renderCabecalho(data) {
  $('#headerTitulo').text(' ');
  $('#headerProduto').text(data.produto || '');
  $('#headerData').text('Atualizado em ' + (data.atualizadoEm || ''));
  document.title = 'Changelog - ' + data.produto + ' | Intelbras';
}

/* ------------------------------------------------------------------ sidebar */
function renderSidebar(casos) {
  var $ul = $('#sidebarVersions').empty();

  ordenarVersoes(versoes).forEach(function (v) {
    var $li = $('<li>');
    var $a = $('<a>', { 'class': 'sidebar-link', href: '#caso-' + v._id });
    $a.append('<i class="fas fa-tag me-2"></i>');
    $a.append(document.createTextNode('Caso ' + v.versao));
    $a.append($('<small class="text-muted d-block ms-4">').text(v.data));
    $ul.append($li.append($a));
  });

  $ul.append(
    '<li><a class="sidebar-link" href="#content"><i class="fas fa-arrow-up me-2"></i>Voltar ao topo</a></li>'
  );
}

/* Outros documentos do mesmo modelo (ex.: CPU Principal / CPU ETH-GPRS) */
function renderDocumentosDoModelo() {
  $.getJSON(MODELOS_URL).done(function (data) {
    var modelo = (data.modelos || []).filter(function (m) {
      return (m.documentos || []).some(function (d) { return d.arquivo === MODELO; });
    })[0];
    if (!modelo || modelo.documentos.length < 2) { return; }

    var $ul = $('#sidebarDocumentos').empty();
    modelo.documentos.forEach(function (d) {
      var $a = $('<a>', { 'class': 'sidebar-link' + (d.arquivo === MODELO ? ' active' : ''),
                          href: 'changelog.html?modelo=' + d.arquivo });
      $a.append('<i class="fas fa-file-alt me-2"></i>').append(document.createTextNode(d.rotulo));
      $ul.append($('<li>').append($a));
    });
    $('#sidebarDocumentosBloco').removeClass('d-none');
  });
}

/* ----------------------------------------------------------------- conteúdo */
function renderVersoes(casos) {
  var $c = $('#changelogContent').empty();

  if (!casos || !casos.length) {
    $c.html('<div class="alert alert-warning">Nenhum caso disponível.</div>');
    return;
  }

  ordenarCasos(casos).forEach(function (v) {
    var id = v._id;

    // Todos os casos ficam sempre visíveis (sem accordion / sem precisar clicar)
    var html =
      '<article class="caso-item" id="caso-' + id + '">' +
        '<h2 class="caso-titulo">' +
          'Caso ' + esc(v.versao) + '<span class="version-badge">' + esc(v.data) + '</span>' +
        '</h2>' +
        '<div class="caso-corpo">' +
          '<h5>' + esc(v.titulo) + '</h5>' +
          '<p class="text-muted"><i>' + esc(v.dataExtenso) + '</i></p>' +
          renderLista(v.alteracoes) +
        '</div>' +
      '</article>';

    $c.append(html);
  });
}

/* Cada item de "alteracoes" pode ser uma string ou, opcionalmente, um objeto
   { "texto": "...", "subitens": [...], "obs": "...", "nota": "..." } */
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

/* ------------------------------------------------------------------- busca */
function bindBusca() {
  $('#buscaInput').on('input', function () {
    filtrarVersoes($(this).val().toLowerCase().trim());
  });
}

function filtrarCasos(termo) {
  var casos = (changelogData && changelogData.casos) || [];

  if (!termo) {
    renderCasos(casos);
    return;
  }

  var t = normalizar(termo);
  var filtradas = casos.filter(function (v) {
    var texto = [v.versao, v.data, v.dataExtenso, v.titulo].concat(textosDe(v.alteracoes)).join(' ');
    return normalizar(texto).indexOf(t) !== -1;
  });

  if (!filtradas.length) {
    $('#changelogContent').html(
      '<div class="alert alert-warning">Nenhum resultado encontrado para: <b>' + esc(termo) + '</b></div>'
    );
    return;
  }
  renderCasos(filtradas);   // o sidebar NÃO é filtrado
}

/* Clique no sidebar numa versão que o filtro escondeu: limpa a busca e rola até ela */
$(document).on('click', '#sidebarVersions a[href^="#caso-"]', function () {
  var id = $(this).attr('href').substring(1);
  if ($('#' + id).length || !changelogData) { return; }
  $('#buscaInput').val('');
  renderVersoes(changelogData.versoes);
  $(this).trigger('click');
});

/* ---------------------------------------------------------------- utilitários */
function parseData(str) {
  var p = String(str).split('/');
  return new Date(p[2], p[1] - 1, p[0]);
}

function ordenarVersoes(casos) {
  return casos.slice().sort(function (a, b) {
    return parseData(b.data) - parseData(a.data);
  });
}

/* Id da versão para o HTML/âncoras (só letras, números e hífen) */
function slug(casos) {
  return String(casos).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'v';
}

/* Dá a cada versão um id único (se a mesma versão aparecer 2x, o 2º vira "-2", etc.) */
function atribuirIds(casos) {
  var usados = {};
  ordenarVersoes(casos).forEach(function (v) {
    var base = slug(v.caso);
    usados[base] = (usados[base] || 0) + 1;
    v._id = usados[base] > 1 ? base + '-' + usados[base] : base;
  });
}

function esc(s) {
  return $('<div>').text(s == null ? '' : String(s)).html();
}

/* Formatação opcional nos textos: **negrito**  *itálico*  !!vermelho!!   (\n = quebra de linha) */
function fmt(s) {
  return esc(s)
    .replace(/!!(.+?)!!/g, '<strong class="text-danger">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

function normalizar(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

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
