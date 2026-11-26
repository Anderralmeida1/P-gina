/* Tela de seleção: lê resources/data/modelos.json e monta os cartões de modelos. */
var MODELOS_URL = 'resources/data/modelos.json';

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

function montarSelect(modelos) {
  var $sel = $('#selectModelo').empty().prop('disabled', false);
  $sel.append($('<option>', { value: '', text: 'Selecione o modelo da central…' }));

  modelos.forEach(function (m) {
    var documento = (m.documentos || [])[0];

    if (!documento) {
      return;
    }

    $sel.append($('<option>', {
      value: documento.arquivo,
      text: m.nome
    }));
  });
}

function bindForm() {
  $('#selectModelo').on('change', function () {
    $('#btnAbrir').prop('disabled', !$(this).val());
  });

  $('#formModelo').on('submit', function (e) {
    e.preventDefault();
    var m = $('#selectModelo').val();

    if (m) {
      window.location.href = 'changelog.html?modelo=' + encodeURIComponent(m);
    }
  });
}

/* Cada card exibe apenas o título; toda a área do card funciona como link. */
function montarCartoes(modelos) {
  var $lista = $('#listaModelos').empty();

  modelos.forEach(function (m) {
    var documento = (m.documentos || [])[0];

    if (!documento) {
      return;
    }

    var url = 'changelog.html?modelo=' + encodeURIComponent(documento.arquivo);

    var $card = $('<div class="card cartao-modelo h-100 position-relative">')
      .css('cursor', 'pointer');

    var $body = $('<div class="card-body">').appendTo($card);

    $('<h5 class="card-title mb-0">')
      .append(
        $('<a>', {
          href: url,
          class: 'stretched-link text-reset text-decoration-none',
          text: m.nome
        })
      )
      .appendTo($body);

    $lista.append(
      $('<div class="col">').append($card)
    );
  });
}
