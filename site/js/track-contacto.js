/* Medición de contactos en GA4: clics a WhatsApp y llamadas.
   Un solo listener delegado cubre también los enlaces que se inyectan por JS. */
(function () {
  'use strict';

  function evento(link) {
    var href = link.getAttribute('href') || '';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) return 'whatsapp_click';
    if (/^tel:/i.test(href)) return 'phone_click';
    return null;
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || typeof window.gtag !== 'function') return;

    var nombre = evento(link);
    if (!nombre) return;

    window.gtag('event', nombre, {
      link_text: (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      page_path: location.pathname,
      transport_type: 'beacon'
    });
  });
})();
