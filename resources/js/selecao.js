/*
 * Tela de seleção de modelos.
 * Lê resources/data/modelos.json e usa cada modelo.nome e seu primeiro
 * documento (documentos[0]) para preencher a interface e criar os links.
 */
// Caminho do catálogo JSON que alimenta a página de seleção.
var MODELOS_URL = 'resources/data/modelos.json';

// Carrega o catálogo quando a página estiver pronta e apresenta erro se falhar.
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

/**
 * Preenche o seletor com o nome de cada modelo e o identificador do documento.
 * Modelos sem documentos não podem ser selecionados e são ignorados.
 * @param {Array<Object>} modelos Modelos lidos do catálogo.
 */
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

/** Ativa os eventos de seleção e envio do formulário de modelos. */
function bindForm() {
  // O botão só pode ser usado depois que um modelo for escolhido.
  $('#selectModelo').on('change', function () {
    $('#btnAbrir').prop('disabled', !$(this).val());
  });

  // Abre a página de detalhes do documento selecionado.
  $('#formModelo').on('submit', function (e) {
    e.preventDefault();
    var m = $('#selectModelo').val();

    if (m) {
      window.location.href = 'painel.html?modelo=' + encodeURIComponent(m);
    }
  });
}

/**
 * Cria um cartão clicável para cada modelo que tenha pelo menos um documento.
 * O link ocupa todo o cartão por meio da classe stretched-link do framework.
 * @param {Array<Object>} modelos Modelos que serão apresentados.
 */
function montarCartoes(modelos) {
  var $lista = $('#listaModelos').empty();

  modelos.forEach(function (m) {
    var documento = (m.documentos || [])[0];

    if (!documento) {
      return;
    }

    var url = 'painel.html?modelo=' + encodeURIComponent(documento.arquivo);

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
