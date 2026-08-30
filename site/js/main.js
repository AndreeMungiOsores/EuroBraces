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
     Los motivos de consulta vienen de BlogStore (editable desde el panel);
     el HTML de origen trae los 6 por defecto como respaldo rastreable.
     ══════════════════════════════════════════ */
  const diagList = $('.diag__list');
  const before = $('#cmpBefore'), after = $('#cmpAfter');
  const title  = $('#cmpTitle'),  desc  = $('#cmpDesc'), credit = $('#cmpCredit');
  const cmp    = $('#compare'),   handle = $('#cmpHandle');

  // Declarado antes de applyDiagnosticCase(): se llama de forma síncrona al
  // cargar (no dentro de un evento), así que setSplit() necesita `split` ya
  // inicializada para no caer en la zona muerta temporal del `let`.
  let split = 50;
  function setSplit(pct) {
    if (!before || !handle) return;
    split = Math.max(0, Math.min(100, pct));
    before.style.clipPath = `inset(0 ${100 - split}% 0 0)`;
    handle.style.left  = split + '%';
    handle.setAttribute('aria-valuenow', Math.round(split));
  }

  function applyDiagnosticCase(c) {
    if (!c || !before || !after) return;
    before.src = c.beforeImg;
    after.src  = c.afterImg;
    before.onerror = () => { before.onerror = null; before.src = 'img/caso1-progreso.jpg'; };
    after.onerror  = () => { after.onerror  = null; after.src  = 'img/caso1-progreso.jpg'; };
    if (title) title.textContent = c.label;
    if (desc) desc.textContent  = c.description;
    if (credit) {
      credit.hidden = !c.credit;
      credit.textContent = c.credit || '';
    }
    $$('.diag__list button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.case === c.id)));
    setSplit(50);
  }

  let diagUserSelected = false;

  function renderDiagnosticTabs() {
    if (!diagList || !window.BlogStore) return;
    const cases = window.BlogStore.getDiagnosticCases();
    if (!Array.isArray(cases) || cases.length === 0) return;

    diagList.innerHTML = cases.map((c, i) => `
      <li><button role="tab" aria-selected="false" data-case="${c.id}"><i>${String(i + 1).padStart(2, '0')}</i><span>${c.label}</span></button></li>
    `).join('');

    $$('.diag__list button').forEach(b => {
      b.addEventListener('click', () => {
        diagUserSelected = true;
        const found = cases.find(c => c.id === b.dataset.case);
        applyDiagnosticCase(found);
      });
    });

    // No pisar la pestaña que el usuario ya eligió si esto se re-renderiza
    // porque terminó de llegar el catálogo vigente desde Supabase.
    if (!diagUserSelected) applyDiagnosticCase(cases[0]);
  }

  renderDiagnosticTabs();
  if (window.BlogStore && typeof window.BlogStore.fetchDiagnosticCasesAsync === 'function') {
    window.BlogStore.fetchDiagnosticCasesAsync().then(() => {
      renderDiagnosticTabs();
    }).catch(() => {});
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
        let items = `
          <div class="case-carousel__item" style="flex: 0 0 100%; width: 100%; height: 100%; position: relative; scroll-snap-align: center;">
            <span class="case-carousel__tag">Antes</span>
            <img src="${c.beforeImg}" alt="${c.title} al inicio" loading="lazy" decoding="async" onerror="this.src='img/caso1-inicio.jpg'" style="width:100%; height:100%; object-fit:cover; display:block;">
          </div>
        `;
        if (c.duringImg) {
          items += `
            <div class="case-carousel__item" style="flex: 0 0 100%; width: 100%; height: 100%; position: relative; scroll-snap-align: center;">
              <span class="case-carousel__tag">Durante</span>
              <img src="${c.duringImg}" alt="${c.title} durante" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover; display:block;">
            </div>
          `;
        }
        items += `
          <div class="case-carousel__item" style="flex: 0 0 100%; width: 100%; height: 100%; position: relative; scroll-snap-align: center;">
            <span class="case-carousel__tag">Después</span>
            <img src="${c.afterImg}" alt="${c.title} en progreso" loading="lazy" decoding="async" onerror="this.src='img/caso1-progreso.jpg'" style="width:100%; height:100%; object-fit:cover; display:block;">
          </div>
        `;
        mediaHtml = `
          <div class="case-card__single-media" style="margin-bottom:16px;">
            <div class="case-carousel-wrap">
              <button class="carousel-btn carousel-btn--prev" onclick="this.parentElement.querySelector('.case-carousel').scrollBy({left: -300, behavior: 'smooth'}); event.stopPropagation();" aria-label="Anterior">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <div class="case-carousel" style="display:flex; flex-direction:row; flex-wrap:nowrap; aspect-ratio:16/9; background:var(--navy-900); border-radius:12px; overflow-x:auto; overflow-y:hidden; scroll-snap-type: x mandatory; width:100%; height:100%;">
                ${items}
              </div>
              <button class="carousel-btn carousel-btn--next" onclick="this.parentElement.querySelector('.case-carousel').scrollBy({left: 300, behavior: 'smooth'}); event.stopPropagation();" aria-label="Siguiente">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
              </button>
            </div>
          </div>
        `;
      } else {
        const singleImg = c.coverImg || (c.images && c.images[0]) || 'img/caso1-progreso.jpg';
        mediaHtml = `
          <div class="case-card__single-media">
            <figure class="case-card__fig" style="aspect-ratio:16/9">
              <img src="${singleImg}" alt="${c.title}" loading="lazy" decoding="async" onerror="this.src='img/caso1-progreso.jpg'">
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
  const railPacientes = $('#rail-pacientes');

  function renderPatientPhotos() {
    if (!railPacientes || !window.BlogStore) return;
    const photos = window.BlogStore.getPatientPhotos();
    if (!Array.isArray(photos) || photos.length === 0) return;

    railPacientes.innerHTML = photos.map(p => `
      <figure class="pac-card reveal in">
        <img src="${p.url}" alt="${p.caption || 'Paciente de EuroBraces Center'}" loading="lazy" decoding="async" onerror="this.src='img/pac-1.jpg'">
      </figure>
    `).join('');
  }

  renderPatientPhotos();
  if (window.BlogStore && typeof window.BlogStore.fetchPatientPhotosAsync === 'function') {
    window.BlogStore.fetchPatientPhotosAsync().then(() => {
      renderPatientPhotos();
    }).catch(() => {});
  }

  /* ══════════════════════════════════════════
     OPINIONES — Google
     ══════════════════════════════════════════ */
  const railResenas = $('#rail-resenas');
  const GOOGLE_G_SVG = '<svg class="review-card__g" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.58-5.17 3.58-8.89z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.32v3.09A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.31 14.3A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.57.38-2.3V6.61H1.32A12 12 0 0 0 0 12c0 1.94.46 3.77 1.32 5.39l3.99-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.32 6.61l3.99 3.09C6.25 6.86 8.89 4.75 12 4.75z"/></svg>';

  function renderGoogleReviews() {
    if (!railResenas || !window.BlogStore) return;
    const reviews = window.BlogStore.getGoogleReviews();
    if (!Array.isArray(reviews) || reviews.length === 0) return;

    railResenas.innerHTML = reviews.map(r => {
      const dateLabel = r.translated ? `${r.dateLabel} · reseña traducida por Google` : r.dateLabel;
      return `
        <a class="review-card reveal in" href="${r.link || 'https://maps.google.com/?cid=4967172387234962248'}" target="_blank" rel="noopener" aria-label="Leer la opinión original de ${r.author} en Google">
          <div class="review-card__head">
            <span class="review-card__stars" aria-hidden="true">★★★★★</span>
            ${GOOGLE_G_SVG}
          </div>
          <blockquote class="review-card__text">${r.text}</blockquote>
          <footer class="review-card__foot">
            <span class="review-card__author">${r.author}</span>
            <span class="review-card__date">${dateLabel}</span>
          </footer>
        </a>
      `;
    }).join('');
  }

  renderGoogleReviews();
  if (window.BlogStore && typeof window.BlogStore.fetchGoogleReviewsAsync === 'function') {
    window.BlogStore.fetchGoogleReviewsAsync().then(() => {
      renderGoogleReviews();
    }).catch(() => {});
  }

  $$('.pacs__nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const rail = $(`#${targetId}`);
      if (!rail) return;

      const firstCard = rail.firstElementChild;
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
