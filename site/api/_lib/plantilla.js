'use strict';

const { ORIGIN, esc, safeImg, plain, renderContent } = require('./casos');

const WA = 'https://wa.me/51986186192?text=Hola%2C%20quiero%20una%20EVALUACI%C3%93N';
const FALLBACK_IMG = `${ORIGIN}/img/og-cover.jpg`;
const FONTS = 'https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap';

const AUTHORS = [
  { match: /anthony\s*de\s*jes/i, id: `${ORIGIN}/dr-anthony-de-jesus.html#dr-anthony-de-jesus`, name: 'Dr. Anthony De Jesús' },
  { match: /bel[eé]n\s*torres/i, id: `${ORIGIN}/#dra-belen-torres`, name: 'Dra. Belén Torres' }
];

const GTAG = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-Q484C5FLTL"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-Q484C5FLTL');
</script>`;

const CSS = `
.caso-sec{background:var(--bone);padding:clamp(36px,5vw,64px) 0 clamp(48px,6vw,80px)}
.caso-wrap{width:min(860px,100% - var(--pad)*2);margin-inline:auto}
.caso-meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.84rem;color:var(--ink-light);margin-top:14px}
.caso-fotos{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:28px}
.caso-fotos--1{grid-template-columns:1fr;max-width:640px;margin-inline:auto}
.caso-foto{margin:0;position:relative;border-radius:10px;overflow:hidden;aspect-ratio:4/3;background:var(--navy-900);border:1px solid rgba(16,23,40,.1)}
.caso-foto a{display:block;width:100%;height:100%}
.caso-foto img{width:100%;height:100%;object-fit:cover;display:block}
.caso-foto figcaption{position:absolute;top:10px;left:10px;background:rgba(255,255,255,.9);color:var(--navy-900);font-size:.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:4px 10px;border-radius:4px}
.caso-texto{font-size:1.02rem;line-height:1.75;color:var(--ink-75)}
.caso-texto h2,.caso-texto h3{font-family:var(--ff-display);font-weight:500;color:var(--navy-900);margin:1.5em 0 .4em}
.caso-texto h2{font-size:1.5rem}.caso-texto h3{font-size:1.28rem}
.caso-texto h3:first-child,.caso-texto h2:first-child{margin-top:0}
.caso-texto p{margin:0 0 1em}.caso-texto ul,.caso-texto ol{padding-left:1.3em;margin:0 0 1em}
.caso-texto mark{padding:2px 6px;border-radius:4px;color:#101728;font-weight:500}
.caso-texto a{color:var(--gold-700);text-decoration:underline;text-underline-offset:3px}
.caso-tags{display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 0;padding:0;list-style:none}
.caso-tags li{font-size:.78rem;padding:4px 12px;border-radius:99px;background:var(--bone-2);color:var(--ink-60);border:1px solid rgba(16,23,40,.08)}
.caso-firma{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:34px;padding:20px 22px;background:var(--bone-2);border:1px solid rgba(16,23,40,.08);border-radius:12px}
.caso-firma strong{display:block;color:var(--navy-900);font-size:.95rem}
.caso-firma span{font-size:.8rem;color:var(--ink-60)}
.caso-firma a.firma-link{color:inherit;text-decoration:none}
.caso-firma a.firma-link:hover strong{text-decoration:underline;text-underline-offset:3px}
.caso-mas{margin-top:clamp(40px,5vw,64px)}
.caso-mas h2{font-family:var(--ff-display);font-weight:500;color:var(--navy-900);font-size:1.6rem;margin:0 0 20px}
.caso-mas__all{display:inline-block;margin-top:22px;color:var(--gold-700);font-weight:600}
`;

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

function authorOf(c) {
  for (const a of AUTHORS) if (a.match.test(c.doctor)) return { id: a.id, name: a.name };
  return null;
}

function fotos(c) {
  const items = [];
  const add = (src, label, alt) => { const u = safeImg(src); if (u) items.push({ u, label, alt }); };

  if (c.images.length) {
    c.images.forEach((src, i) => add(src, '', `${c.title} — fotografía clínica ${i + 1}`));
  } else {
    add(c.beforeImg, 'Antes', `${c.title} — antes del tratamiento`);
    add(c.duringImg, 'Durante', `${c.title} — durante el tratamiento`);
    add(c.afterImg, 'Después', `${c.title} — resultado`);
  }
  if (!items.length) add(c.coverImg, '', c.title);
  if (!items.length) return { html: '', urls: [] };

  const html = `<div class="caso-fotos${items.length === 1 ? ' caso-fotos--1' : ''}">${items.map((it, i) => `
      <figure class="caso-foto">
        <a href="${esc(it.u)}" target="_blank" rel="noopener">
          <img src="${esc(it.u)}" alt="${esc(it.alt)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        </a>${it.label ? `<figcaption>${esc(it.label)}</figcaption>` : ''}
      </figure>`).join('')}
    </div>`;
  return { html, urls: items.map(it => it.u) };
}

function tarjeta(c) {
  const img = safeImg(c.coverImg || c.afterImg || c.beforeImg) || FALLBACK_IMG;
  return `
        <article class="blog-card">
          <div class="blog-card__media">
            <img src="${esc(img)}" alt="${esc(c.title)}" loading="lazy" decoding="async">
          </div>
          <div class="blog-card__body">
            <div class="blog-card__meta"><time datetime="${esc(c.date)}">${esc(fmtDate(c.date))}</time></div>
            <h3 class="blog-card__title"><a href="/casos/${esc(c.slug)}">${esc(c.title)}</a></h3>
            <p class="blog-card__excerpt">${esc(plain(c.excerpt, 140))}</p>
            <div class="blog-card__foot">
              <span class="blog-card__doc">${esc(c.doctor)}</span>
              <span class="blog-card__cta">Ver caso</span>
            </div>
          </div>
        </article>`;
}

function jsonLd(c, url, title, desc, imgs) {
  const author = authorOf(c);
  const graph = [
    {
      '@type': ['Article', 'MedicalWebPage'],
      '@id': `${url}#article`,
      url,
      headline: plain(c.title, 110),
      description: desc,
      image: imgs.length ? imgs : [FALLBACK_IMG],
      datePublished: c.date || undefined,
      dateModified: c.date || undefined,
      inLanguage: 'es-PE',
      keywords: c.tags.length ? c.tags.join(', ') : undefined,
      articleSection: c.category,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      isPartOf: { '@id': `${ORIGIN}/casos-clinicos.html#webpage` },
      author: author
        ? { '@id': author.id, name: author.name }
        : { '@type': 'Person', name: c.doctor, worksFor: { '@id': `${ORIGIN}/#clinica` } },
      publisher: { '@id': `${ORIGIN}/#clinica` },
      about: { '@type': 'MedicalCondition', name: c.category === 'Ortodoncia' ? 'Maloclusión dental' : c.category }
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: title,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      inLanguage: 'es-PE'
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Casos clínicos', item: `${ORIGIN}/casos-clinicos.html` },
        { '@type': 'ListItem', position: 3, name: plain(c.title, 80) }
      ]
    }
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

const NAV = `
<div class="scroll-rail"><span id="scrollBar"></span></div>
<header class="nav" id="nav">
  <a class="nav__brand" href="/#top" aria-label="EuroBraces Center — inicio">
    <img src="/img/logo-navy.png" alt="" class="nav__mark">
    <span class="nav__word">EuroBraces<em>Center</em></span>
  </a>
  <nav class="nav__links" id="navLinks">
    <a href="/#diagnostico">Diagnóstico</a>
    <a href="/#tratamientos">Tratamientos</a>
    <a href="/casos-clinicos.html" style="color:var(--gold-300);font-weight:600">Casos Clínicos</a>
    <a href="/#pacientes">Pacientes</a>
    <a href="/dr-anthony-de-jesus.html">Dr. Anthony De Jesús</a>
    <a href="/#equipo">Equipo</a>
    <a href="/#ubicacion">Ubicación</a>
  </nav>
  <a class="btn btn--ghost nav__cta" href="${WA}" target="_blank" rel="noopener">Agenda tu evaluación</a>
  <button class="nav__burger" id="burger" aria-label="Menú" aria-expanded="false"><i></i><i></i></button>
</header>`;

const FOOTER = `
<footer class="foot">
  <div class="wrap foot__grid">
    <a class="foot__logo" href="/#top" aria-label="EuroBraces Center — inicio">
      <img src="/img/logo-navy.png" alt="">
      <span>EuroBraces<em>Center</em></span>
    </a>
    <nav class="foot__nav">
      <a href="/#diagnostico">Diagnóstico</a><a href="/#tratamientos">Tratamientos</a>
      <a href="/casos-clinicos.html">Casos Clínicos</a><a href="/#pacientes">Pacientes</a>
      <a href="/#equipo">Equipo</a><a href="/dr-anthony-de-jesus.html">Dr. Anthony De Jesús</a><a href="/#ubicacion">Ubicación</a>
    </nav>
    <p class="foot__legal">
      © <span id="year"></span> EuroBraces Center · Elías Aguirre 126, Miraflores 15074, Lima — Perú<br>
      <small>Los resultados varían según cada paciente.</small>
    </p>
  </div>
</footer>
<a class="wa" href="${WA}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.19-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05s.88 2.38 1 2.54c.13.16 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.18 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z"/></svg>
</a>
<script defer src="/js/track-contacto.js"></script>
<script>
(function () {
  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  var burger = document.getElementById('burger'), links = document.getElementById('navLinks');
  if (burger && links) burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  var nav = document.getElementById('nav'), bar = document.getElementById('scrollBar');
  function onScroll() {
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 40);
    if (bar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
</script>`;

function head({ title, desc, url, image, robots, extra }) {
  return `<!DOCTYPE html>
<html lang="es-PE">
<head>
${GTAG}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${robots}">
<meta name="author" content="EuroBraces Center">
<link rel="alternate" hreflang="es-pe" href="${esc(url)}">
<link rel="alternate" hreflang="x-default" href="${esc(url)}">
<meta name="geo.region" content="PE-LIM">
<meta name="geo.placename" content="Miraflores, Lima, Perú">
<meta property="og:type" content="article">
<meta property="og:site_name" content="EuroBraces Center">
<meta property="og:locale" content="es_PE">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#0B1E3D">
<link rel="icon" type="image/png" href="/img/logo-navy.png" sizes="170x163">
<link rel="apple-touch-icon" href="/img/logo-navy.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/css/style.css?v=8">
<link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONTS}"></noscript>
<style>${CSS}</style>
${extra || ''}
</head>`;
}

function paginaCaso(c, otros) {
  const url = `${ORIGIN}/casos/${c.slug}`;
  const title = `${plain(c.title, 52).replace(/…$/, '')} | EuroBraces`;
  const desc = plain(c.excerpt || c.content, 155) || 'Caso clínico de ortodoncia documentado en EuroBraces Center, Miraflores, Lima.';
  const { html: galeria, urls } = fotos(c);
  const image = urls[0] || FALLBACK_IMG;
  const author = authorOf(c);
  const waText = encodeURIComponent(`Hola, vi el caso clínico "${c.title}" en su web y me gustaría agendar una evaluación.`);
  const firma = author
    ? `<a class="firma-link" href="/dr-anthony-de-jesus.html"><strong>${esc(c.doctor)}</strong></a>`
    : `<strong>${esc(c.doctor)}</strong>`;
  const meta = [
    `<span>${esc(c.doctor)}</span>`,
    c.date ? `<time datetime="${esc(c.date)}">${esc(fmtDate(c.date))}</time>` : ''
  ].filter(Boolean).join('<span>•</span>');

  return `${head({
    title, desc, url, image,
    robots: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    extra: `<script type="application/ld+json">${jsonLd(c, url, title, desc, urls)}</script>`
  })}
<body>
${NAV}
<main id="main-content">
  <section class="blog-hero">
    <div class="grain" aria-hidden="true"></div>
    <div class="wrap">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <ol>
          <li><a href="/">Inicio</a></li>
          <li><a href="/casos-clinicos.html">Casos clínicos</a></li>
          <li aria-current="page">${esc(plain(c.title, 60))}</li>
        </ol>
      </nav>
      <header class="sec-head">
        <p class="eyebrow">${esc(c.category)} · Caso clínico</p>
        <h1 class="h2 h2--light">${esc(c.title)}</h1>
        <div class="caso-meta">${meta}</div>
      </header>
    </div>
  </section>

  <article class="caso-sec">
    <div class="caso-wrap">
      ${galeria}
      <div class="caso-texto">${renderContent(c.content)}</div>
      ${c.tags.length ? `<ul class="caso-tags" aria-label="Temas">${c.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <div class="caso-firma">
        <div>${firma}<span>${esc(c.doctorRole)} · EuroBraces Center</span></div>
        <a class="btn btn--gold" href="https://wa.me/51986186192?text=${waText}" target="_blank" rel="noopener">Consultar por un caso similar</a>
      </div>

      ${otros.length ? `<section class="caso-mas" aria-labelledby="mas-casos">
        <h2 id="mas-casos">Otros casos clínicos</h2>
        <div class="blog-grid">${otros.map(tarjeta).join('')}
        </div>
        <a class="caso-mas__all" href="/casos-clinicos.html">Ver todos los casos →</a>
      </section>` : ''}
    </div>
  </article>
</main>
${FOOTER}
</body>
</html>`;
}

function paginaNoEncontrado() {
  const url = `${ORIGIN}/casos-clinicos.html`;
  return `${head({
    title: 'Caso no encontrado | EuroBraces Center',
    desc: 'El caso clínico que buscas no está disponible. Mira todos nuestros casos de ortodoncia en Miraflores.',
    url, image: FALLBACK_IMG, robots: 'noindex, follow'
  })}
<body>
${NAV}
<main id="main-content">
  <section class="blog-hero">
    <div class="grain" aria-hidden="true"></div>
    <div class="wrap">
      <header class="sec-head">
        <p class="eyebrow">Error 404</p>
        <h1 class="h2 h2--light">No encontramos <i>este caso clínico.</i></h1>
        <p class="sec-head__sub">Puede que se haya movido o que el enlace tenga un error.</p>
        <p style="margin-top:22px"><a class="btn btn--gold" href="/casos-clinicos.html">Ver todos los casos</a></p>
      </header>
    </div>
  </section>
</main>
${FOOTER}
</body>
</html>`;
}

module.exports = { paginaCaso, paginaNoEncontrado };
