/*
 * Comportamentos da navegação lateral:
 * alternância do menu, fechamento em telas pequenas e rolagem até as âncoras.
 */
$(function () {

  // Abre ou fecha a sidebar ao acionar o botão hamburger.
  $('#hamburger').on('click', function (e) {
    e.preventDefault();
    $('#sidebar').toggleClass('active');
  });

  // Em telas pequenas, fecha o menu após escolher um caso ou uma versão.
  $(document).on('click', '#sidebarVersions a', function () {
    if ($(window).width() < 768) {
      $('#sidebar').removeClass('active');
    }
  });

  // Faz rolagem suave até o registro associado ao link clicado.
  $(document).on('click', 'a[href^="#versao-"]', function (e) {
    e.preventDefault();

    var $link = $(this);
    // O fragmento do link corresponde ao id criado durante a renderização.
    var id = $link.attr('href').substring(1);
    var $item = $('#' + id);
    // Se o filtro ocultou o registro, adcasos.js restaura a lista antes de navegar.
    if (!$item.length) { return; }

    $('#sidebarVersions a.sidebar-link').removeClass('active');
    $link.addClass('active');

    $('html, body').stop(true).animate({ scrollTop: $item.offset().top - 80 }, 350);
  });

  // Intercepta o link de topo para rolar suavemente até o início do conteúdo.
  $(document).on('click', 'a[href="#content"]', function (e) {
    e.preventDefault();
    $('html, body').stop(true).animate({ scrollTop: 0 }, 350);
  });

});
