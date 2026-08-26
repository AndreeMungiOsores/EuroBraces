/**
 * @file seo-casos.js
 * @description Capa SEO de la página de Casos Clínicos.
 *
 * Resuelve dos problemas de indexación propios de un catálogo renderizado por JS:
 *
 *  1. ItemList dinámico — inyecta datos estructurados schema.org con los casos que
 *     realmente hay en BlogStore (Supabase), no con una lista estática que envejece.
 *
 *  2. Metadatos por caso — al abrir un caso, la URL cambia a `?caso=<slug>` mediante
 *     history.replaceState. Sin esto, esa URL compartiría título, descripción e imagen
 *     con el listado: WhatsApp, Facebook y X mostrarían siempre la misma tarjeta.
 *     Aquí se actualizan <title>, description y Open Graph al vuelo, y se restauran
 *     al cerrar. El <link rel="canonical"> NO se toca a propósito: sigue apuntando a
 *     /casos-clinicos.html para que Google consolide todas las variantes ?caso= en
 *     una sola URL canónica y no genere contenido duplicado.
 */
(function () {
  'use strict';

  var ORIGIN = 'https://www.eurobraces.com';
  var PAGE = ORIGIN + '/casos-clinicos.html';

  /* ── Estado original de la página, para poder restaurarlo ── */
  var base = {
    title: document.title,
    description: meta('name', 'description'),
    ogTitle: meta('property', 'og:title'),
    ogDescription: meta('property', 'og:description'),
    ogUrl: meta('property', 'og:url'),
    ogImage: meta('property', 'og:image')
  };

  function meta(attr, key) {
    var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    return el ? el.getAttribute('content') : '';
  }

  function setMeta(attr, key, value) {
    if (value == null) return;
    var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  var FALLBACK_IMG = ORIGIN + '/img/og-cover.jpg';

  /**
   * Convierte una ruta relativa (img/x.jpg) o absoluta en URL absoluta.
   * Las imágenes que el panel guarda como data:base64 se descartan: Google no puede
   * rastrearlas ni indexarlas, y concatenarlas al dominio produciría una URL inválida.
   */
  function absolute(url) {
    if (!url) return FALLBACK_IMG;
    var u = String(url);
    if (/^data:/i.test(u) || /^blob:/i.test(u)) return FALLBACK_IMG;
    if (/^https?:\/\//i.test(u)) return u;
    return ORIGIN + '/' + u.replace(/^\.?\//, '').split('?')[0];
  }

  /**
   * Autores conocidos del sitio, con el @id de su nodo Person.
   *
   * Referenciar el @id en lugar de crear un Person suelto en cada caso es lo que
   * consolida la autoría: Google ve UNA entidad con N artículos firmados, no N
   * personas distintas que casualmente comparten nombre. Es la señal E-E-A-T que
   * hace que la ficha del profesional gane peso al buscar su nombre.
   */
  var AUTHORS = [
    {
      match: /anthony\s*de\s*jes/i,
      id: ORIGIN + '/dr-anthony-de-jesus.html#dr-anthony-de-jesus',
      name: 'Dr. Anthony De Jesús',
      role: 'Especialista en Ortodoncia'
    },
    {
      match: /bel[eé]n\s*torres/i,
      id: ORIGIN + '/#dra-belen-torres',
      name: 'Dra. Belén Torres',
      role: 'Odontóloga'
    }
  ];

  /** Devuelve una referencia al Person conocido, o un Person mínimo si no lo es. */
  function authorOf(c) {
    var raw = c.doctor || 'Dr. Anthony De Jesús';
    for (var i = 0; i < AUTHORS.length; i++) {
      if (AUTHORS[i].match.test(raw)) {
        return { '@id': AUTHORS[i].id, name: AUTHORS[i].name };
      }
    }
    return {
      '@type': 'Person',
      name: raw,
      jobTitle: c.doctorRole || undefined,
      worksFor: { '@id': ORIGIN + '/#clinica' }
    };
  }

  /** Elimina duplicados manteniendo el orden. */
  function unique(list) {
    var seen = {}, out = [];
    for (var i = 0; i < list.length; i++) {
      if (!seen[list[i]]) { seen[list[i]] = 1; out.push(list[i]); }
    }
    return out;
  }

  /** Texto plano a partir del markdown/HTML del caso, recortado a `max`. */
  function plain(text, max) {
    if (!text) return '';
    var s = String(text)
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#*_`>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (s.length <= max) return s;
    var cut = s.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-]$/, '') + '…';
  }

  /* ═══════════ 1. ItemList + Article de cada caso ═══════════ */

  function buildItemList(cases) {
    var items = cases.map(function (c, i) {
      var url = PAGE + '?caso=' + encodeURIComponent(c.slug || c.id);
      var images = unique([c.coverImg, c.beforeImg, c.duringImg, c.afterImg]
        .filter(Boolean).map(absolute));

      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': ['Article', 'MedicalWebPage'],
          '@id': url,
          url: url,
          headline: plain(c.title, 110),
          name: plain(c.title, 110),
          description: plain(c.excerpt || c.content, 200),
          image: images.length ? images : [FALLBACK_IMG],
          datePublished: c.date || undefined,
          dateModified: c.updatedAt || c.date || undefined,
          inLanguage: 'es-PE',
          keywords: Array.isArray(c.tags) ? c.tags.join(', ') : undefined,
          articleSection: c.category || 'Ortodoncia',
          isPartOf: { '@id': PAGE + '#webpage' },
          author: authorOf(c),
          publisher: { '@id': ORIGIN + '/#clinica' },
          about: { '@type': 'MedicalCondition', name: c.category || 'Maloclusión dental' }
        }
      };
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': PAGE + '#casos',
      name: 'Casos clínicos documentados de EuroBraces Center',
      description: 'Catálogo de casos clínicos de ortodoncia tratados en Miraflores, Lima.',
      numberOfItems: items.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: items
    };
  }

  function injectItemList() {
    if (!window.BlogStore || typeof window.BlogStore.getCases !== 'function') return;

    var cases;
    try {
      cases = window.BlogStore.getCases() || [];
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

  /* ═══════════ 2. Metadatos por caso abierto ═══════════ */

  function applyCaseMeta(c) {
    if (!c) return;
    var title = plain(c.title, 62) + ' · EuroBraces Center';
    var desc = plain(c.excerpt || c.content, 155);
    var img = absolute(c.coverImg || c.afterImg || c.beforeImg);
    var url = PAGE + '?caso=' + encodeURIComponent(c.slug || c.id);

    document.title = title;
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:type', 'article');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);
  }

  function restoreMeta() {
    document.title = base.title;
    setMeta('name', 'description', base.description);
    setMeta('property', 'og:title', base.ogTitle);
    setMeta('property', 'og:description', base.ogDescription);
    setMeta('property', 'og:url', base.ogUrl);
    setMeta('property', 'og:image', base.ogImage);
    setMeta('property', 'og:type', 'website');
    setMeta('name', 'twitter:title', base.ogTitle);
    setMeta('name', 'twitter:description', base.ogDescription);
    setMeta('name', 'twitter:image', base.ogImage);
  }

  /**
   * El modal no emite eventos propios, así que observamos el atributo `hidden`
   * del overlay y leemos el slug de la URL que el propio modal acaba de escribir.
   */
  function watchModal() {
    var overlay = document.getElementById('caseModalOverlay');
    if (!overlay || typeof MutationObserver === 'undefined') return;

    var sync = function () {
      var open = !overlay.hasAttribute('hidden');
      if (!open) return restoreMeta();

      var slug = new URL(window.location.href).searchParams.get('caso');
      if (!slug || !window.BlogStore) return;

      var list = window.BlogStore.getCases() || [];
      var found = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].slug === slug || list[i].id === slug) { found = list[i]; break; }
      }
      applyCaseMeta(found);
    };

    new MutationObserver(sync).observe(overlay, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  /* ═══════════ Arranque ═══════════ */

  function init() {
    injectItemList();
    watchModal();
    // BlogStore refresca desde Supabase de forma asíncrona: reintentamos para
    // que el ItemList refleje el catálogo remoto y no sólo la caché local.
    setTimeout(injectItemList, 1200);
    setTimeout(injectItemList, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
