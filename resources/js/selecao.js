/* Tela de seleção: lê resources/data/modelos.json, monta o <select> e os cartões de modelos. */
var MODELOS_URL = 'resources/data/modelos.json';
var DATA_DIR = 'resources/data/';

$(function () {
  $.getJSON(MODELOS_URL)
    .done(function (data) {
      var modelos = data.modelos || [];
      montarSelect(modelos);
      montarCartoes(modelos);
      bindForm();
    })
    .fail(function () {
      $('#selectModelo').html('<option value="">Não foi possível carregar os modelos</option>');
      $('#avisoErro').removeClass('d-none').html(
        'Não foi possível carregar <b>' + MODELOS_URL + '</b>. Verifique se o arquivo existe, se o JSON está ' +
        'válido e se a página está sendo servida por um servidor web (use o <code>iniciar.bat</code> / ' +
        '<code>iniciar.sh</code>).'
      );
    });
});

/* <select>: modelo com 1 documento = 1 opção; com vários = grupo (optgroup) com uma opção por documento */
function montarSelect(modelos) {
  var $sel = $('#selectModelo').empty().prop('disabled', false);
  $sel.append($('<option>', { value: '', text: 'Selecione o modelo da central…' }));

  modelos.forEach(function (m) {
    var docs = m.documentos || [];
    if (docs.length === 1) {
      $sel.append($('<option>', { value: docs[0].arquivo, text: m.nome }));
      return;
    }
    var $g = $('<optgroup>', { label: m.nome });
    docs.forEach(function (d) {
      $g.append($('<option>', { value: d.arquivo, text: m.nome + ' – ' + d.rotulo }));
    });
    $sel.append($g);
  });
}

function bindForm() {
  $('#selectModelo').on('change', function () {
    $('#btnAbrir').prop('disabled', !$(this).val());
  });
  $('#formModelo').on('submit', function (e) {
    e.preventDefault();
    var m = $('#selectModelo').val();
    if (m) { window.location.href = 'changelog.html?modelo=' + encodeURIComponent(m); }
  });
}

/* Cartões: um por modelo, com um link por documento e a última versão publicada */
function montarCartoes(modelos) {
  var $lista = $('#listaModelos').empty();

  modelos.forEach(function (m) {
    var $card = $('<div class="card cartao-modelo h-100">');
    var $body = $('<div class="card-body">').appendTo($card);
    $body.append($('<h5 class="card-title">').text(m.nome));

    var $docs = $('<ul class="cartao-docs">').appendTo($body);
    (m.documentos || []).forEach(function (d) {
      var $li = $('<li>');
      $li.append($('<a>', { href: 'changelog.html?modelo=' + encodeURIComponent(d.arquivo) })
        .append('<i class="fas fa-file-alt me-2"></i>')
        .append(document.createTextNode(d.rotulo)));
      var $ultima = $('<small class="text-muted d-block ms-4 ultima-versao">');
      $li.append($ultima);
      $docs.append($li);
    
    });

    $lista.append($('<div class="col">').append($card));
  });
}

/* Lê o JSON do documento e mostra "Versão X · dd/mm/aaaa" (a mais recente pela data). Falha em silêncio. */
function carregarUltimaVersao(arquivo, $alvo) {
  $.getJSON(DATA_DIR + arquivo + '.json').done(function (data) {
    var v = (data.versoes || []).slice().sort(function (a, b) {
      return parseData(b.data) - parseData(a.data);
    })[0];
    if (v) { $alvo.text('Versão ' + v.versao + ' · ' + v.data); }
  });
}

function parseData(str) {
  var p = String(str).split('/');
  return new Date(p[2], p[1] - 1, p[0]);
}
