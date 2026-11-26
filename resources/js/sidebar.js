/* Controle do menu lateral / hamburger */
$(function () {

  // Abre/fecha o sidebar
  $('#hamburger').on('click', function (e) {
    e.preventDefault();
    $('#sidebar').toggleClass('active');
  });

  // Em telas pequenas, fecha o sidebar ao escolher uma versão
  $(document).on('click', '#sidebarVersions a', function () {
    if ($(window).width() < 768) {
      $('#sidebar').removeClass('active');
    }
  });

  // Scroll suave até a versão escolhida
  $(document).on('click', 'a[href^="#Caso-"]', function (e) {
    e.preventDefault();

    var $link = $(this);
    var id = $link.attr('href').substring(1);          // ex.: versao-6-80
    var $item = $('#' + id);
    if (!$item.length) { return; }

    $('#sidebarVersions a.sidebar-link').removeClass('active');
    $link.addClass('active');

    $('html, body').stop(true).animate({ scrollTop: $item.offset().top - 80 }, 350);
  });

  // "Voltar ao topo"
  $(document).on('click', 'a[href="#content"]', function (e) {
    e.preventDefault();
    $('html, body').stop(true).animate({ scrollTop: 0 }, 350);
  });

});
