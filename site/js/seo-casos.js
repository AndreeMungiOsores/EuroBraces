/**
 * @file seo-casos.js
 * @description Datos estructurados del listado de Casos Clínicos.
 *
 * Inyecta un ItemList schema.org con los casos que realmente hay en Supabase, apuntando
 * a la página propia de cada uno (/casos/<slug>, generada en servidor por api/caso.js).
 * Cada una de esas páginas lleva su propio <title>, canonical, Article y fotos, así que
 * aquí ya no hace falta tocar metadatos al abrir un caso.
 */
(function () {
  'use strict';

  var ORIGIN = 'https://www.eurobraces.com';
  var PAGE = ORIGIN + '/casos-clinicos.html';
  var FALLBACK_IMG = ORIGIN + '/img/og-cover.jpg';
  var UUID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

  /** URL absoluta, o la imagen por defecto si es base64 (Google no indexa data: URIs). */
  function absolute(url) {
    if (!url) return FALLBACK_IMG;
    var u = String(url);
    if (/^data:/i.test(u) || /^blob:/i.test(u)) return FALLBACK_IMG;
    if (/^https?:\/\//i.test(u)) return u;
    return ORIGIN + '/' + u.replace(/^\.?\//, '').split('?')[0];
  }

  function plain(text, max) {
    var s = String(text || '').replace(/<[^>]+>/g, ' ').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    var cut = s.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-]$/, '') + '…';
  }

  function buildItemList(cases) {
    var items = cases.map(function (c, i) {
      var url = ORIGIN + '/casos/' + encodeURIComponent(c.slug);
      return {
        '@type': 'ListItem',
        position: i + 1,
        url: url,
        name: plain(c.title, 110),
        image: absolute(c.coverImg || c.afterImg || c.beforeImg)
      };
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': PAGE + '#casos',
      name: 'Casos clínicos documentados de EuroBraces Center',
      description: 'Catálogo de casos clínicos de ortodoncia tratados en Miraflores, Lima.',
      numberOfItems: items.length,
      itemListElement: items
    };
  }

  function injectItemList() {
    if (!window.BlogStore || typeof window.BlogStore.getCases !== 'function') return;

    var cases;
    try {
      // Los casos de ejemplo (seed) no tienen página: solo los de Supabase.
      cases = (window.BlogStore.getCases() || []).filter(function (c) { return UUID.test(String(c.id)); });
    } catch (err) {
      return;
    }
    if (!cases.length) return;

    var id = 'ld-casos-itemlist';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(buildItemList(cases), null, 2);
  }

  function init() {
    injectItemList();
    // BlogStore refresca desde Supabase de forma asíncrona: reintentamos para
    // que el ItemList refleje el catálogo remoto y no solo la caché local.
    setTimeout(injectItemList, 1200);
    setTimeout(injectItemList, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
