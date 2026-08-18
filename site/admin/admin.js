/**
 * @file admin.js
 * @description Lógica del Panel Administrativo de EuroBraces Center.
 * Controla autenticación, sesión, CRUD de casos clínicos, selector de fotos (Antes/Después vs Galería normal),
 * editor visual WYSIWYG y sincronización en tiempo real.
 */

(function () {
  'use strict';

  // Constantes de Autenticación
  const AUTH_USER = 'admin';
  const AUTH_PASS = 'eurobraces@2026';
  const SESSION_KEY = 'eurobraces_admin_auth';

  // Selectores DOM
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => el.querySelectorAll(s);

  const loginSection = $('#loginSection');
  const dashboardSection = $('#dashboardSection');
  const loginForm = $('#loginForm');
  const adminUser = $('#adminUser');
  const adminPass = $('#adminPass');
  const logoutBtn = $('#logoutBtn');

  const casesTableBody = $('#casesTableBody');
  const tableSearch = $('#tableSearch');

  const newCaseBtn = $('#newCaseBtn');

  const formModalBackdrop = $('#formModalBackdrop');
  const formModalTitle = $('#formModalTitle');
  const closeFormModalBtn = $('#closeFormModalBtn');
  const cancelFormBtn = $('#cancelFormBtn');
  const caseForm = $('#caseForm');

  const caseIdInput = $('#caseId');
  const caseTitleInput = $('#caseTitle');
  const caseDateInput = $('#caseDate');
  const caseDoctorInput = $('#caseDoctor');
  const caseExcerptInput = $('#caseExcerpt');
  const caseContentEditor = $('#caseContentEditor');
  const caseContentInput = $('#caseContent');

  // Selector de Modo de Fotos
  const modeBeforeAfterBtn = $('#modeBeforeAfterBtn');
  const modeNormalBtn = $('#modeNormalBtn');
  const panelBeforeAfter = $('#panelBeforeAfter');
  const panelNormalGallery = $('#panelNormalGallery');

  // Fotos Antes / Después
  const beforeImgUrlInput = $('#beforeImgUrl');
  const afterImgUrlInput = $('#afterImgUrl');
  const beforeFileInput = $('#beforeFileInput');
  const afterFileInput = $('#afterFileInput');
  const beforePreview = $('#beforePreview');
  const afterPreview = $('#afterPreview');

  // Fotos Galería Normal
  const galleryFileInput = $('#galleryFileInput');
  const galleryPreviewGrid = $('#galleryPreviewGrid');

  // Herramientas de Formato del Editor
  const btnFormatBold = $('#btnFormatBold');
  const btnFormatItalic = $('#btnFormatItalic');
  const btnFormatHeading = $('#btnFormatHeading');
  const btnFormatList = $('#btnFormatList');
  const colorChips = $$('.color-chip[data-color]');
  const customHighlightColor = $('#customHighlightColor');

  const deleteModalBackdrop = $('#deleteModalBackdrop');
  const delModalText = $('#delModalText');
  const cancelDelBtn = $('#cancelDelBtn');
  const confirmDelBtn = $('#confirmDelBtn');

  const toastContainer = $('#toastContainer');

  let caseToDeleteId = null;
  let activeHighlightColor = '#FEF08A';
  let currentPhotoMode = 'beforeAfter';
  let galleryImages = [];

  /**
   * Convierte texto estructurado o markdown heredado a HTML visual para el editor WYSIWYG.
   */
  function markdownToVisualHtml(text) {
    if (!text) return '';
    if (/<(h2|h3|p|ul|li|strong|em|span|mark)/i.test(text)) {
      return text;
    }
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .split('\n\n')
      .map(block => {
        if (block.includes('<li>')) return `<ul>${block}</ul>`;
        if (block.startsWith('<h3>') || block.startsWith('<h2>')) return block;
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  }

  // ── Cálculo Automático de Tiempo de Lectura ──
  function calculateReadTime(text) {
    if (!text || !text.trim()) return '1 min';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 180);
    return `${Math.max(1, minutes)} min`;
  }

  // ── 1. Notificaciones Toast ──
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠'}</span>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all .3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ── 2. Control de Autenticación y Sesión ──
  function checkAuth() {
    const isAuthed = sessionStorage.getItem(SESSION_KEY) === 'true';
    if (isAuthed) {
      loginSection.style.display = 'none';
      dashboardSection.style.display = 'flex';
      renderDashboard();
    } else {
      loginSection.style.display = 'grid';
      dashboardSection.style.display = 'none';
      if (adminUser) adminUser.focus();
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = adminUser.value.trim();
      const pass = adminPass.value;

      if (user === AUTH_USER && pass === AUTH_PASS) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        showToast('Sesión iniciada correctamente.', 'success');
        checkAuth();
      } else {
        showToast('Usuario o contraseña incorrectos.', 'error');
        adminPass.value = '';
        adminPass.focus();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      showToast('Sesión finalizada.', 'success');
      checkAuth();
    });
  }

  // ── 3. Renderizado del Dashboard y Tabla ──
  function renderDashboard() {
    if (!window.BlogStore) return;
    renderTable();
  }

  function renderTable() {
    if (!window.BlogStore || !casesTableBody) return;
    const cases = window.BlogStore.getCases();
    const query = (tableSearch ? tableSearch.value : '').toLowerCase().trim();

    const filtered = cases.filter(c => {
      const rawText = (c.content || '').replace(/<[^>]*>?/gm, '');
      return !query ||
        c.title.toLowerCase().includes(query) ||
        (c.doctor && c.doctor.toLowerCase().includes(query)) ||
        (c.excerpt && c.excerpt.toLowerCase().includes(query)) ||
        rawText.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
      casesTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:40px 20px;color:var(--ink-60)">
            No se encontraron publicaciones que coincidan con la búsqueda.
          </td>
        </tr>
      `;
      return;
    }

    casesTableBody.innerHTML = filtered.map(c => {
      const thumb = c.coverImg || c.afterImg || (c.images && c.images[0]) || '../img/caso1-progreso.jpg';
      const formattedDate = c.date
        ? new Date(c.date).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Reciente';

      return `
        <tr>
          <td>
            <img src="${thumb.startsWith('data:') ? thumb : (thumb.startsWith('img/') ? '../' + thumb : thumb)}" class="table-thumb" alt="Miniatura" onerror="this.src='../img/caso1-progreso.jpg'">
          </td>
          <td>
            <strong style="color:var(--navy-900)">${c.title}</strong>
            <div style="font-size:.78rem;color:var(--ink-60)">${c.excerpt ? c.excerpt.substring(0, 80) + '...' : ''}</div>
          </td>
          <td>${c.doctor || 'Dr. Anthony De Jesús'}</td>
          <td style="white-space:nowrap">${formattedDate}</td>
          <td style="text-align:right">
            <div class="action-btns" style="justify-content:flex-end">
              <a href="../casos-clinicos.html?caso=${c.slug || c.id}" target="_blank" class="action-btn action-btn--view" title="Ver en web">Ver</a>
              <button type="button" class="action-btn action-btn--edit" data-id="${c.id}" title="Editar caso">Editar</button>
              <button type="button" class="action-btn action-btn--del" data-id="${c.id}" title="Eliminar caso">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    $$('.action-btn--edit', casesTableBody).forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    $$('.action-btn--del', casesTableBody).forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
  }

  if (tableSearch) tableSearch.addEventListener('input', renderTable);

  // ── 4. Control del Selector de Modo de Fotos (Antes/Después vs Galería) ──
  function setPhotoMode(mode) {
    currentPhotoMode = mode;
    if (mode === 'gallery') {
      modeNormalBtn.classList.add('is-active');
      modeNormalBtn.setAttribute('aria-checked', 'true');
      modeBeforeAfterBtn.classList.remove('is-active');
      modeBeforeAfterBtn.setAttribute('aria-checked', 'false');
      panelBeforeAfter.style.display = 'none';
      panelNormalGallery.style.display = 'block';
    } else {
      modeBeforeAfterBtn.classList.add('is-active');
      modeBeforeAfterBtn.setAttribute('aria-checked', 'true');
      modeNormalBtn.classList.remove('is-active');
      modeNormalBtn.setAttribute('aria-checked', 'false');
      panelBeforeAfter.style.display = 'grid';
      panelNormalGallery.style.display = 'none';
    }
  }

  if (modeBeforeAfterBtn) {
    modeBeforeAfterBtn.addEventListener('click', () => setPhotoMode('beforeAfter'));
  }
  if (modeNormalBtn) {
    modeNormalBtn.addEventListener('click', () => setPhotoMode('gallery'));
  }

  // Gestión de Fotos Antes / Después
  function setupFileInput(inputEl, urlInputEl, previewEl) {
    if (!inputEl) return;
    inputEl.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('El archivo debe ser una imagen válida.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = function (evt) {
        const base64 = evt.target.result;
        urlInputEl.value = base64;
        previewEl.src = base64;
        previewEl.style.display = 'block';
        showToast('Foto cargada correctamente.', 'success');
      };
      reader.readAsDataURL(file);
    });

    urlInputEl.addEventListener('input', () => {
      const val = urlInputEl.value.trim();
      if (val) {
        previewEl.src = val.startsWith('img/') ? '../' + val : val;
        previewEl.style.display = 'block';
      } else {
        previewEl.style.display = 'none';
      }
    });
  }

  setupFileInput(beforeFileInput, beforeImgUrlInput, beforePreview);
  setupFileInput(afterFileInput, afterImgUrlInput, afterPreview);

  // Gestión de Galería de Fotos Normales (Múltiples fotos)
  if (galleryFileInput) {
    galleryFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      let loadedCount = 0;
      files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          galleryImages.push(evt.target.result);
          loadedCount++;
          if (loadedCount === files.length) {
            renderGalleryPreviews();
            showToast(`${loadedCount} foto(s) adjuntada(s).`, 'success');
          }
        };
        reader.readAsDataURL(file);
      });
      galleryFileInput.value = '';
    });
  }

  function renderGalleryPreviews() {
    if (!galleryPreviewGrid) return;
    if (galleryImages.length === 0) {
      galleryPreviewGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:18px 10px;color:var(--ink-60);font-size:0.84rem">
          No hay fotos adjuntadas aún. Haz clic en <strong>Adjuntar Fotos</strong> para añadir imágenes.
        </div>
      `;
      return;
    }

    galleryPreviewGrid.innerHTML = galleryImages.map((src, idx) => `
      <div class="gallery-thumb-card" data-idx="${idx}">
        <img src="${src}" alt="Foto ${idx + 1}" onerror="this.src='../img/caso1-progreso.jpg'">
        ${idx === 0 ? '<span class="gallery-thumb-badge">Portada</span>' : ''}
        <button type="button" class="gallery-thumb-del" data-idx="${idx}" title="Eliminar foto" aria-label="Eliminar foto ${idx + 1}">×</button>
      </div>
    `).join('');

    $$('.gallery-thumb-del', galleryPreviewGrid).forEach(delBtn => {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idxToRemove = parseInt(delBtn.dataset.idx, 10);
        galleryImages.splice(idxToRemove, 1);
        renderGalleryPreviews();
      });
    });
  }

  // ── 5. Herramientas Visuales del Editor (Negrita, Cursiva, Resaltado WYSIWYG) ──
  if (btnFormatBold) {
    btnFormatBold.addEventListener('click', () => {
      if (caseContentEditor) caseContentEditor.focus();
      document.execCommand('bold', false, null);
    });
  }

  if (btnFormatItalic) {
    btnFormatItalic.addEventListener('click', () => {
      if (caseContentEditor) caseContentEditor.focus();
      document.execCommand('italic', false, null);
    });
  }

  if (btnFormatHeading) {
    btnFormatHeading.addEventListener('click', () => {
      if (caseContentEditor) caseContentEditor.focus();
      document.execCommand('formatBlock', false, '<h3>');
    });
  }

  if (btnFormatList) {
    btnFormatList.addEventListener('click', () => {
      if (caseContentEditor) caseContentEditor.focus();
      document.execCommand('insertUnorderedList', false, null);
    });
  }

  function applyVisualHighlight(color) {
    activeHighlightColor = color;
    colorChips.forEach(chip => {
      chip.classList.toggle('is-selected', chip.dataset.color.toLowerCase() === color.toLowerCase());
    });

    if (!caseContentEditor) return;
    caseContentEditor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      document.execCommand('hiliteColor', false, color);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.backgroundColor = color;
      span.style.color = '#101728';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
      span.style.fontWeight = '500';

      span.appendChild(range.extractContents());
      range.insertNode(span);

      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    } catch (err) {
      document.execCommand('hiliteColor', false, color);
    }
  }

  colorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      applyVisualHighlight(chip.dataset.color);
    });
  });

  if (customHighlightColor) {
    customHighlightColor.addEventListener('input', (e) => {
      applyVisualHighlight(e.target.value);
    });
  }

  if (caseContentEditor) {
    caseContentEditor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        document.execCommand('bold', false, null);
      }
    });
  }

  // ── 6. Modal Crear / Editar Caso ──
  function openNewModal() {
    formModalTitle.textContent = 'Nueva Publicación / Caso Clínico';
    caseIdInput.value = '';
    caseForm.reset();
    caseDateInput.value = new Date().toISOString().split('T')[0];
    caseDoctorInput.value = 'Dr. Anthony De Jesús';

    // Editor limpio sin texto plantilla
    if (caseContentEditor) {
      caseContentEditor.innerHTML = '';
    }

    // Limpiar fotos previas
    beforeImgUrlInput.value = '';
    afterImgUrlInput.value = '';
    beforePreview.src = '';
    beforePreview.style.display = 'none';
    afterPreview.src = '';
    afterPreview.style.display = 'none';

    galleryImages = [];
    renderGalleryPreviews();
    setPhotoMode('beforeAfter');

    formModalBackdrop.classList.add('is-open');
    caseTitleInput.focus();
  }

  function openEditModal(id) {
    if (!window.BlogStore) return;
    const item = window.BlogStore.getCaseById(id);
    if (!item) return;

    formModalTitle.textContent = 'Editar Caso Clínico';
    caseIdInput.value = item.id;
    caseTitleInput.value = item.title || '';
    caseDateInput.value = item.date || new Date().toISOString().split('T')[0];
    caseDoctorInput.value = item.doctor || 'Dr. Anthony De Jesús';
    caseExcerptInput.value = item.excerpt || '';

    // Cargar contenido visual limpio
    if (caseContentEditor) {
      caseContentEditor.innerHTML = markdownToVisualHtml(item.content || item.excerpt || '');
    }

    // Configurar modo de fotos y valores existentes
    if (item.photoMode === 'gallery' || (Array.isArray(item.images) && item.images.length > 0 && !item.beforeImg)) {
      setPhotoMode('gallery');
      galleryImages = Array.isArray(item.images) && item.images.length > 0
        ? [...item.images]
        : (item.coverImg ? [item.coverImg] : []);
      renderGalleryPreviews();
      beforeImgUrlInput.value = '';
      afterImgUrlInput.value = '';
      beforePreview.style.display = 'none';
      afterPreview.style.display = 'none';
    } else {
      setPhotoMode('beforeAfter');
      galleryImages = [];
      renderGalleryPreviews();

      beforeImgUrlInput.value = item.beforeImg || '';
      afterImgUrlInput.value = item.afterImg || '';

      if (item.beforeImg) {
        const bImg = item.beforeImg;
        beforePreview.src = bImg.startsWith('data:') ? bImg : (bImg.startsWith('img/') ? '../' + bImg : bImg);
        beforePreview.style.display = 'block';
      } else {
        beforePreview.style.display = 'none';
      }

      if (item.afterImg) {
        const aImg = item.afterImg;
        afterPreview.src = aImg.startsWith('data:') ? aImg : (aImg.startsWith('img/') ? '../' + aImg : aImg);
        afterPreview.style.display = 'block';
      } else {
        afterPreview.style.display = 'none';
      }
    }

    formModalBackdrop.classList.add('is-open');
    caseTitleInput.focus();
  }

  function closeFormModal() {
    formModalBackdrop.classList.remove('is-open');
  }

  if (newCaseBtn) newCaseBtn.addEventListener('click', openNewModal);
  if (closeFormModalBtn) closeFormModalBtn.addEventListener('click', closeFormModal);
  if (cancelFormBtn) cancelFormBtn.addEventListener('click', closeFormModal);

  // Guardar Formulario
  if (caseForm) {
    caseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const fullHtml = caseContentEditor ? caseContentEditor.innerHTML.trim() : '';
        const plainText = caseContentEditor ? caseContentEditor.textContent || '' : '';
        const autoReadTime = calculateReadTime(plainText + ' ' + (caseExcerptInput.value || ''));

        if (!plainText.trim()) {
          showToast('El contenido clínico detallado no puede estar vacío.', 'error');
          if (caseContentEditor) caseContentEditor.focus();
          return;
        }

        let beforeImgVal = '';
        let afterImgVal = '';
        let coverImgVal = '';
        let imagesArray = [];

        if (currentPhotoMode === 'gallery') {
          imagesArray = [...galleryImages];
          coverImgVal = galleryImages[0] || '';
        } else {
          beforeImgVal = beforeImgUrlInput.value.trim();
          afterImgVal = afterImgUrlInput.value.trim();
          coverImgVal = afterImgVal || beforeImgVal || '';
        }

        const caseData = {
          id: caseIdInput.value || undefined,
          title: caseTitleInput.value.trim(),
          date: caseDateInput.value,
          doctor: caseDoctorInput.value.trim(),
          doctorRole: caseDoctorInput.value.includes('Belén') ? 'Odontóloga Integral' : 'Especialista en Ortodoncia',
          readTime: autoReadTime,
          excerpt: caseExcerptInput.value.trim(),
          content: fullHtml,
          photoMode: currentPhotoMode,
          beforeImg: beforeImgVal,
          afterImg: afterImgVal,
          coverImg: coverImgVal,
          images: imagesArray,
          featured: true
        };

        await window.BlogStore.saveCase(caseData);
        showToast(caseData.id ? 'Publicación actualizada con éxito.' : 'Publicación creada con éxito.', 'success');
        closeFormModal();
        renderDashboard();
      } catch (err) {
        showToast(err.message || 'Error guardando la publicación.', 'error');
      }
    });
  }

  // ── 7. Modal de Eliminación ──
  function openDeleteModal(id) {
    if (!window.BlogStore) return;
    const item = window.BlogStore.getCaseById(id);
    if (!item) return;

    caseToDeleteId = id;
    delModalText.innerHTML = `¿Seguro que deseas eliminar el caso <strong>"${item.title}"</strong>?<br>Esta acción no se puede deshacer.`;
    deleteModalBackdrop.classList.add('is-open');
  }

  function closeDeleteModal() {
    deleteModalBackdrop.classList.remove('is-open');
    caseToDeleteId = null;
  }

  if (cancelDelBtn) cancelDelBtn.addEventListener('click', closeDeleteModal);
  if (confirmDelBtn) {
    confirmDelBtn.addEventListener('click', async () => {
      if (!caseToDeleteId || !window.BlogStore) return;
      await window.BlogStore.deleteCase(caseToDeleteId);
      showToast('Caso clínico eliminado correctamente.', 'success');
      closeDeleteModal();
      renderDashboard();
    });
  }

  // Cerrar modales con Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (formModalBackdrop.classList.contains('is-open')) closeFormModal();
      if (deleteModalBackdrop.classList.contains('is-open')) closeDeleteModal();
    }
  });

  // Revalidación asíncrona con Supabase al abrir el dashboard
  if (window.BlogStore && typeof window.BlogStore.fetchCasesAsync === 'function') {
    window.BlogStore.fetchCasesAsync().then(() => {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        renderDashboard();
      }
    }).catch(err => {
      console.warn('Nota: Usando caché local:', err);
    });
  }

  // Inicializar autenticación
  checkAuth();

})();
