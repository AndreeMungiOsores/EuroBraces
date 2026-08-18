/* EuroBraces Center — interacciones */
(() => {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── año ── */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── nav: estado al hacer scroll + barra de progreso ── */
  const nav = $('#nav'), bar = $('#scrollBar');
  const onScroll = () => {
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 40);
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── menú móvil ── */
  const burger = $('#burger'), links = $('#navLinks');
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', links).forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  /* ── reveal on scroll ── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  const revealables = $$('.reveal');
  revealables.forEach(el => io.observe(el));
  // red de seguridad: si el observer nunca reporta, el contenido se muestra igual
  setTimeout(() => {
    if (!document.querySelector('.reveal.in')) {
      io.disconnect();
      revealables.forEach(el => el.classList.add('in'));
    }
  }, 2500);

  /* ══════════════════════════════════════════
     DIAGNÓSTICO — selector + comparador antes/después
     ══════════════════════════════════════════ */
  const CASES = {
    apinados:     { t: 'Dientes apiñados',       d: 'Cuando no hay suficiente espacio en la arcada.' },
    espacios:     { t: 'Espacios entre dientes', d: 'Separaciones visibles al sonreír.' },
    desalineados: { t: 'Dientes desalineados',   d: 'Posición irregular de las piezas.' },
    mordida:      { t: 'Mordida abierta',        d: 'Tus dientes no cierran por completo.', c: 'Imagen de referencia: Clínica Manzanera' },
    pieza:        { t: 'Falta de una pieza',     d: 'La armonía también se puede recuperar.' },
    manchas:      { t: 'Manchas o desgaste',     d: 'Tu sonrisa puede recuperar brillo y forma.' }
  };

  const tabs   = $$('.diag__list button');
  const before = $('#cmpBefore'), after = $('#cmpAfter');
  const title  = $('#cmpTitle'),  desc  = $('#cmpDesc'), credit = $('#cmpCredit');
  const cmp    = $('#compare'),   handle = $('#cmpHandle');

  function selectCase(key) {
    const c = CASES[key];
    if (!c || !before || !after) return;
    before.src = `img/ba-${key}-antes.jpg`;
    after.src  = `img/ba-${key}-despues.jpg`;
    if (title) title.textContent = c.t;
    if (desc) desc.textContent  = c.d;
    if (credit) {
      credit.hidden = !c.c;
      credit.textContent = c.c || '';
    }
    tabs.forEach(b => b.setAttribute('aria-selected', String(b.dataset.case === key)));
    setSplit(50);
  }
  tabs.forEach(b => b.addEventListener('click', () => selectCase(b.dataset.case)));

  let split = 50;
  function setSplit(pct) {
    if (!before || !handle) return;
    split = Math.max(0, Math.min(100, pct));
    before.style.clipPath = `inset(0 ${100 - split}% 0 0)`;
    handle.style.left  = split + '%';
    handle.setAttribute('aria-valuenow', Math.round(split));
  }

  if (cmp && handle) {
    const fromEvent = e => {
      const r = cmp.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      setSplit((x / r.width) * 100);
    };

    let dragging = false;
    const start = e => { dragging = true; fromEvent(e); };
    const move  = e => { if (dragging) { fromEvent(e); e.preventDefault?.(); } };
    const end   = () => { dragging = false; };

    cmp.addEventListener('pointerdown', start);
    addEventListener('pointermove', move, { passive: false });
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);

    handle.addEventListener('keydown', e => {
      const step = e.shiftKey ? 10 : 3;
      if (e.key === 'ArrowLeft')  { setSplit(split - step); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setSplit(split + step); e.preventDefault(); }
    });

    new IntersectionObserver((en, obs) => {
      en.forEach(e => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        let p = 50, dir = 1, n = 0;
        const t = setInterval(() => {
          p += dir * 2.4; n++;
          if (p > 72 || p < 28) dir *= -1;
          setSplit(p);
          if (n > 36) { clearInterval(t); setSplit(50); }
        }, 22);
      });
    }, { threshold: 0.5 }).observe(cmp);

    setSplit(50);
  }

  /* ══════════════════════════════════════════
     CASOS CLÍNICOS — 2 Casos Más Recientes en Portada
     ══════════════════════════════════════════ */
  function renderHomeCases() {
    const container = $('#homeCasesGrid');
    if (!container || !window.BlogStore) return;
    const allCases = window.BlogStore.getCases();
    const latestCases = allCases.slice(0, 2);
    if (!latestCases.length) return;

    container.innerHTML = latestCases.map((c, idx) => {
      const caseNum = `Caso 0${idx + 1}`;
      const hasBeforeAfter = (c.photoMode === 'beforeAfter' || (!c.photoMode && c.beforeImg && c.afterImg)) && Boolean(c.beforeImg && c.afterImg);
      const rawExcerpt = c.excerpt || (c.content ? c.content.replace(/<[^>]*>?/gm, '').substring(0, 140) + '...' : '');

      let mediaHtml = '';
      if (hasBeforeAfter) {
        mediaHtml = `
          <div class="case-card__pair">
            <figure class="case-card__fig">
              <img src="${c.beforeImg}" alt="${c.title} al inicio" loading="lazy" onerror="this.src='img/caso1-inicio.jpg'">
              <span class="case-card__tag case-card__tag--before">Inicio</span>
            </figure>
            <figure class="case-card__fig">
              <img src="${c.afterImg}" alt="${c.title} en progreso" loading="lazy" onerror="this.src='img/caso1-progreso.jpg'">
              <span class="case-card__tag case-card__tag--progress">Progreso</span>
            </figure>
          </div>
        `;
      } else {
        const singleImg = c.coverImg || (c.images && c.images[0]) || 'img/caso1-progreso.jpg';
        mediaHtml = `
          <div class="case-card__single-media">
            <figure class="case-card__fig" style="aspect-ratio:16/9">
              <img src="${singleImg}" alt="${c.title}" loading="lazy" onerror="this.src='img/caso1-progreso.jpg'">
            </figure>
          </div>
        `;
      }

      return `
        <article class="case-card reveal in" onclick="window.location.href='casos-clinicos.html?caso=${c.slug || c.id}'" style="cursor:pointer" tabindex="0" role="link" aria-label="Ver caso clínico: ${c.title}">
          <header class="case-card__head">
            <span class="case-card__num">${caseNum}</span>
            <span class="case-card__type">${c.doctor || 'EuroBraces Center'}</span>
            <span class="case-card__status">${c.readTime || 'Reciente'}</span>
          </header>
          ${mediaHtml}
          <footer class="case-card__foot">
            <h4>${c.title}</h4>
            <p>${rawExcerpt}</p>
          </footer>
        </article>
      `;
    }).join('');
  }

  renderHomeCases();
  if (window.BlogStore && typeof window.BlogStore.fetchCasesAsync === 'function') {
    window.BlogStore.fetchCasesAsync().then(() => {
      renderHomeCases();
    }).catch(() => {});
  }

  /* ══════════════════════════════════════════
     GALERÍA — Pacientes
     ══════════════════════════════════════════ */
  $$('.pacs__nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const rail = $(`#${targetId}`);
      if (!rail) return;

      const firstCard = rail.querySelector('.pac-card');
      const cardWidth = firstCard ? firstCard.offsetWidth + 24 : rail.clientWidth * 0.75;
      const isNext = btn.classList.contains('pacs__nav-btn--next');

      rail.scrollBy({
        left: isNext ? cardWidth : -cardWidth,
        behavior: 'smooth'
      });
    });
  });

  /* ── arrastre suave por ratón y toque para pacientes ── */
  $$('.rail').forEach(rail => {
    let rx = 0, rl = 0, rDrag = false;

    rail.addEventListener('pointerdown', e => {
      if (e.target.closest('button, a')) return;
      rDrag = true;
      rx = e.clientX;
      rl = rail.scrollLeft;
      rail.classList.add('is-drag');
    });

    addEventListener('pointermove', e => {
      if (!rDrag) return;
      const diff = e.clientX - rx;
      rail.scrollLeft = rl - diff;
    });

    addEventListener('pointerup', () => {
      if (!rDrag) return;
      rDrag = false;
      rail.classList.remove('is-drag');
    });

    addEventListener('pointercancel', () => {
      if (!rDrag) return;
      rDrag = false;
      rail.classList.remove('is-drag');
    });

    rail.addEventListener('dragstart', e => e.preventDefault());
  });
})();
