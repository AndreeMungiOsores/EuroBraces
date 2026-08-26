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

  /**
   * Optimiza y comprime imágenes del lado del cliente usando un Canvas off-screen.
   * Convierte fotos de alta resolución a un tamaño web óptimo (máx 1280px, ~150KB) sin pérdida de nitidez clínica.
   */
  function optimizeImageFile(file, maxDimension = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        return reject(new Error('El archivo debe ser una imagen válida.'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(file);
    });
  }

  // Gestión de Fotos Antes / Después
  function setupFileInput(inputEl, urlInputEl, previewEl) {
    if (!inputEl) return;
    inputEl.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const optimizedBase64 = await optimizeImageFile(file);
        urlInputEl.value = optimizedBase64;
        previewEl.src = optimizedBase64;
        previewEl.style.display = 'block';
        showToast('Foto cargada y optimizada con éxito.', 'success');
      } catch (err) {
        showToast(err.message || 'Error al procesar la imagen.', 'error');
      }
      inputEl.value = '';
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
    galleryFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      let loadedCount = 0;
      for (const file of files) {
        try {
          const optimizedBase64 = await optimizeImageFile(file);
          galleryImages.push(optimizedBase64);
          loadedCount++;
        } catch (err) {
          console.error('Error optimizando foto de galería:', err);
        }
      }

      if (loadedCount > 0) {
        renderGalleryPreviews();
        showToast(`${loadedCount} foto(s) adjuntada(s) y optimizada(s).`, 'success');
      }
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
      const submitBtn = caseForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Guardar Publicación';

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

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Guardando en Supabase...';
        }

        await window.BlogStore.saveCase(caseData);
        showToast(caseData.id ? 'Publicación actualizada y sincronizada en Supabase.' : 'Publicación creada y sincronizada en Supabase.', 'success');
        closeFormModal();
        renderDashboard();
      } catch (err) {
        console.error('Error al guardar caso:', err);
        showToast(err.message || 'Error guardando la publicación en Supabase.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
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

  // Cerrar modales con Escape y cancelar modo selección
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (formModalBackdrop && formModalBackdrop.classList.contains('is-open')) closeFormModal();
      if (deleteModalBackdrop && deleteModalBackdrop.classList.contains('is-open')) closeDeleteModal();
      if (patientModalBackdrop && patientModalBackdrop.classList.contains('is-open')) closePatientModal();
      if (deletePatientModalBackdrop && deletePatientModalBackdrop.classList.contains('is-open')) closeDeletePatientModal();
      if (deleteBatchPatientModalBackdrop && deleteBatchPatientModalBackdrop.classList.contains('is-open')) closeDeleteBatchPatientModal();
      if (isMultiSelectMode) disableMultiSelectMode();
    }
  });

  // ── 8. Conmutación de Pestañas (Casos Clínicos vs Fotos de Pacientes vs Dr. Anthony) ──
  const tabCasesBtn = $('#tabCasesBtn');
  const tabPatientsBtn = $('#tabPatientsBtn');
  const tabDrAnthonyBtn = $('#tabDrAnthonyBtn');
  const viewCasesPanel = $('#viewCasesPanel');
  const viewPatientsPanel = $('#viewPatientsPanel');
  const viewDrAnthonyPanel = $('#viewDrAnthonyPanel');

  function switchAdminTab(targetView) {
    [tabCasesBtn, tabPatientsBtn, tabDrAnthonyBtn].forEach(btn => {
      if (btn) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    [viewCasesPanel, viewPatientsPanel, viewDrAnthonyPanel].forEach(panel => {
      if (panel) panel.style.display = 'none';
    });

    if (targetView === 'patients') {
      if (tabPatientsBtn) { tabPatientsBtn.classList.add('is-active'); tabPatientsBtn.setAttribute('aria-selected', 'true'); }
      if (viewPatientsPanel) viewPatientsPanel.style.display = 'block';
      renderPatientsGrid();
    } else if (targetView === 'dr-anthony') {
      if (tabDrAnthonyBtn) { tabDrAnthonyBtn.classList.add('is-active'); tabDrAnthonyBtn.setAttribute('aria-selected', 'true'); }
      if (viewDrAnthonyPanel) viewDrAnthonyPanel.style.display = 'block';
      renderDrAnthonyAdminForm();
    } else {
      if (tabCasesBtn) { tabCasesBtn.classList.add('is-active'); tabCasesBtn.setAttribute('aria-selected', 'true'); }
      if (viewCasesPanel) viewCasesPanel.style.display = 'block';
      renderTable();
    }
  }

  if (tabCasesBtn) tabCasesBtn.addEventListener('click', () => switchAdminTab('cases'));
  if (tabPatientsBtn) tabPatientsBtn.addEventListener('click', () => switchAdminTab('patients'));
  if (tabDrAnthonyBtn) tabDrAnthonyBtn.addEventListener('click', () => switchAdminTab('dr-anthony'));

  // ── 9. Renderizado y Gestión de Fotos de Pacientes (Con Selección Múltiple) ──
  const patientsAdminGrid = $('#patientsAdminGrid');
  const newPatientPhotoBtn = $('#newPatientPhotoBtn');
  const patientModalBackdrop = $('#patientModalBackdrop');
  const closePatientModalBtn = $('#closePatientModalBtn');
  const cancelPatientBtn = $('#cancelPatientBtn');
  const patientForm = $('#patientForm');
  const patientPhotoIdInput = $('#patientPhotoId');
  const patientImgUrlInput = $('#patientImgUrlInput');
  const patientFileInput = $('#patientFileInput');
  const patientPreview = $('#patientPreview');
  const patientCaptionInput = $('#patientCaptionInput');
  const patientModalTitle = $('#patientModalTitle');

  const enableMultiSelectBtn = $('#enableMultiSelectBtn');
  const cancelMultiSelectBtn = $('#cancelMultiSelectBtn');
  const deleteSelectedPatientsBtn = $('#deleteSelectedPatientsBtn');
  const patientNormalActions = $('#patientNormalActions');
  const patientMultiSelectActions = $('#patientMultiSelectActions');
  const selectedCountBadge = $('#selectedCountBadge');

  const deletePatientModalBackdrop = $('#deletePatientModalBackdrop');
  const cancelDelPatientBtn = $('#cancelDelPatientBtn');
  const confirmDelPatientBtn = $('#confirmDelPatientBtn');
  let patientToDeleteId = null;

  const deleteBatchPatientModalBackdrop = $('#deleteBatchPatientModalBackdrop');
  const cancelDelBatchPatientBtn = $('#cancelDelBatchPatientBtn');
  const confirmDelBatchPatientBtn = $('#confirmDelBatchPatientBtn');
  const delBatchPatientModalText = $('#delBatchPatientModalText');

  let isMultiSelectMode = false;
  let selectedPatientIds = new Set();

  function enableMultiSelectMode() {
    isMultiSelectMode = true;
    selectedPatientIds.clear();
    if (patientNormalActions) patientNormalActions.style.display = 'none';
    if (patientMultiSelectActions) patientMultiSelectActions.style.display = 'flex';
    updateMultiSelectUI();
    renderPatientsGrid();
  }

  function disableMultiSelectMode() {
    isMultiSelectMode = false;
    selectedPatientIds.clear();
    if (patientMultiSelectActions) patientMultiSelectActions.style.display = 'none';
    if (patientNormalActions) patientNormalActions.style.display = 'flex';
    renderPatientsGrid();
  }

  function togglePatientSelection(id) {
    if (selectedPatientIds.has(id)) {
      selectedPatientIds.delete(id);
    } else {
      selectedPatientIds.add(id);
    }
    updateMultiSelectUI();
    renderPatientsGrid();
  }

  function updateMultiSelectUI() {
    const count = selectedPatientIds.size;
    if (selectedCountBadge) {
      selectedCountBadge.textContent = `${count} seleccionada${count === 1 ? '' : 's'}`;
    }
    if (deleteSelectedPatientsBtn) {
      deleteSelectedPatientsBtn.disabled = count === 0;
      deleteSelectedPatientsBtn.textContent = `Eliminar Seleccionadas (${count})`;
    }
  }

  if (enableMultiSelectBtn) enableMultiSelectBtn.addEventListener('click', enableMultiSelectMode);
  if (cancelMultiSelectBtn) cancelMultiSelectBtn.addEventListener('click', disableMultiSelectMode);

  function renderPatientsGrid() {
    if (!patientsAdminGrid || !window.BlogStore) return;
    const photos = window.BlogStore.getPatientPhotos();

    if (photos.length === 0) {
      if (isMultiSelectMode) disableMultiSelectMode();
      patientsAdminGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px 20px;background:#FFF;border-radius:12px;border:1px solid var(--border);color:var(--ink-60)">
          No hay fotografías de pacientes aún. Haz clic en <strong>+ Subir Foto de Paciente</strong> para agregar una.
        </div>
      `;
      return;
    }

    patientsAdminGrid.innerHTML = photos.map(p => {
      const isSelected = selectedPatientIds.has(p.id);
      const imgSrc = p.url.startsWith('data:') ? p.url : (p.url.startsWith('img/') ? '../' + p.url : p.url);

      const checkboxHtml = isMultiSelectMode ? `
        <div class="patient-card-admin__checkbox-wrap" aria-hidden="true">
          ${isSelected ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
        </div>
      ` : '';

      const actionsHtml = isMultiSelectMode ? '' : `
        <div class="action-btns">
          <button type="button" class="action-btn action-btn--edit edit-patient-btn" data-id="${p.id}" title="Editar leyenda o reemplazar foto">Editar</button>
          <button type="button" class="action-btn action-btn--del del-patient-btn" data-id="${p.id}" title="Eliminar foto">Eliminar</button>
        </div>
      `;

      return `
        <div class="patient-card-admin ${isMultiSelectMode ? 'is-selectable' : ''} ${isSelected ? 'is-selected' : ''}" data-id="${p.id}">
          ${checkboxHtml}
          <img src="${imgSrc}" class="patient-card-admin__img" alt="${p.caption || 'Paciente'}" onerror="this.src='../img/pac-1.jpg'">
          <div class="patient-card-admin__body">
            <span class="patient-card-admin__title" title="${p.caption || 'Paciente EuroBraces'}">${p.caption || 'Paciente EuroBraces'}</span>
            ${actionsHtml}
          </div>
        </div>
      `;
    }).join('');

    if (isMultiSelectMode) {
      $$('.patient-card-admin', patientsAdminGrid).forEach(card => {
        card.addEventListener('click', () => {
          togglePatientSelection(card.dataset.id);
        });
      });
    } else {
      $$('.edit-patient-btn', patientsAdminGrid).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditPatientModal(btn.dataset.id);
        });
      });

      $$('.del-patient-btn', patientsAdminGrid).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDeletePatientModal(btn.dataset.id);
        });
      });
    }
  }

  // Upload handler para fotos de paciente (soporta 1 foto con edición o múltiples fotos automáticas)
  if (patientFileInput) {
    patientFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      // Si se selecciona 1 sola foto: cargar en vista previa para opcionalmente cambiar la leyenda
      if (files.length === 1) {
        try {
          const optimizedBase64 = await optimizeImageFile(files[0]);
          if (patientImgUrlInput) patientImgUrlInput.value = optimizedBase64;
          if (patientPreview) {
            patientPreview.src = optimizedBase64;
            patientPreview.style.display = 'block';
          }
          showToast('Foto cargada y optimizada.', 'success');
        } catch (err) {
          showToast(err.message || 'Error al procesar la foto.', 'error');
        }
        patientFileInput.value = '';
        return;
      }

      // Si se seleccionan MÚLTIPLES fotos: procesar, guardar y sincronizar automáticamente mostrando estado de carga
      const saveBtn = patientForm ? patientForm.querySelector('button[type="submit"]') : $('#savePatientBtn');
      const cancelBtn = $('#cancelPatientBtn');
      const originalText = saveBtn ? saveBtn.textContent : 'Guardar Foto';

      let count = 0;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
      }
      if (cancelBtn) cancelBtn.disabled = true;

      showToast(`Procesando ${files.length} fotos...`, 'info');

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            if (saveBtn && files.length > 1) {
              saveBtn.textContent = `Guardando (${i + 1}/${files.length})...`;
            }
            const base64 = await optimizeImageFile(file);
            await window.BlogStore.savePatientPhoto({
              url: base64,
              caption: 'Paciente EuroBraces Center'
            });
            count++;
          } catch (err) {
            console.error('Error al procesar foto de paciente:', err);
          }
        }

        if (count > 0) {
          showToast(`${count} foto(s) de paciente subida(s) y sincronizada(s) con éxito.`, 'success');
          closePatientModal();
          renderPatientsGrid();
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }
        if (cancelBtn) cancelBtn.disabled = false;
        patientFileInput.value = '';
      }
    });
  }

  const patientDropzone = $('#patientDropzone');
  const patientSelectLabel = $('#patientSelectLabel');

  function openNewPatientModal() {
    if (patientForm) patientForm.reset();
    if (patientModalTitle) patientModalTitle.textContent = 'Agregar Fotos de Paciente';
    if (patientSelectLabel) patientSelectLabel.textContent = 'Fotografía(s) del Paciente *';
    if (patientDropzone) patientDropzone.style.display = 'block';
    if (patientPhotoIdInput) patientPhotoIdInput.value = '';
    if (patientImgUrlInput) patientImgUrlInput.value = '';
    if (patientPreview) { patientPreview.src = ''; patientPreview.style.display = 'none'; }
    if (patientCaptionInput) patientCaptionInput.value = '';
    if (patientModalBackdrop) patientModalBackdrop.classList.add('is-open');
  }

  function openEditPatientModal(id) {
    if (!window.BlogStore) return;
    const photos = window.BlogStore.getPatientPhotos();
    const item = photos.find(p => p.id === id);
    if (!item) return;

    if (patientForm) patientForm.reset();
    if (patientModalTitle) patientModalTitle.textContent = 'Editar Foto de Paciente';
    if (patientSelectLabel) patientSelectLabel.textContent = 'Fotografía del Paciente';
    if (patientDropzone) patientDropzone.style.display = 'none';
    if (patientPhotoIdInput) patientPhotoIdInput.value = item.id;
    if (patientImgUrlInput) patientImgUrlInput.value = item.url;
    if (patientCaptionInput) patientCaptionInput.value = item.caption || '';
    if (patientPreview) {
      const imgSrc = item.url.startsWith('data:') ? item.url : (item.url.startsWith('img/') ? '../' + item.url : item.url);
      patientPreview.src = imgSrc;
      patientPreview.style.display = 'block';
    }
    if (patientModalBackdrop) patientModalBackdrop.classList.add('is-open');
    if (patientCaptionInput) patientCaptionInput.focus();
  }

  function closePatientModal() {
    if (patientModalBackdrop) patientModalBackdrop.classList.remove('is-open');
  }

  if (newPatientPhotoBtn) newPatientPhotoBtn.addEventListener('click', openNewPatientModal);
  if (closePatientModalBtn) closePatientModalBtn.addEventListener('click', closePatientModal);
  if (cancelPatientBtn) cancelPatientBtn.addEventListener('click', closePatientModal);

  if (patientForm) {
    patientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = patientForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Guardar Foto';

      try {
        const urlVal = patientImgUrlInput ? patientImgUrlInput.value.trim() : '';
        if (!urlVal) {
          showToast('Debes seleccionar al menos una fotografía.', 'error');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Guardando...';
        }

        await window.BlogStore.savePatientPhoto({
          id: patientPhotoIdInput ? patientPhotoIdInput.value : undefined,
          url: urlVal,
          caption: patientCaptionInput ? patientCaptionInput.value.trim() : 'Paciente EuroBraces Center'
        });

        showToast('Foto de paciente guardada y sincronizada.', 'success');
        closePatientModal();
        renderPatientsGrid();
      } catch (err) {
        showToast(err.message || 'Error al guardar foto de paciente.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  function openDeletePatientModal(id) {
    patientToDeleteId = id;
    if (deletePatientModalBackdrop) deletePatientModalBackdrop.classList.add('is-open');
  }

  function closeDeletePatientModal() {
    if (deletePatientModalBackdrop) deletePatientModalBackdrop.classList.remove('is-open');
    patientToDeleteId = null;
  }

  if (cancelDelPatientBtn) cancelDelPatientBtn.addEventListener('click', closeDeletePatientModal);
  if (confirmDelPatientBtn) {
    confirmDelPatientBtn.addEventListener('click', async () => {
      if (!patientToDeleteId || !window.BlogStore) return;
      await window.BlogStore.deletePatientPhoto(patientToDeleteId);
      showToast('Foto de paciente eliminada correctamente.', 'success');
      closeDeletePatientModal();
      renderPatientsGrid();
    });
  }

  // ── Modal y Gestión de Eliminación en Lote (Selección Múltiple) ──
  function openDeleteBatchPatientModal() {
    if (selectedPatientIds.size === 0) return;
    const count = selectedPatientIds.size;
    if (delBatchPatientModalText) {
      delBatchPatientModalText.innerHTML = `¿Seguro que deseas eliminar las <strong>${count}</strong> foto(s) de paciente(s) seleccionada(s)?<br>Esta acción no se puede deshacer.`;
    }
    if (deleteBatchPatientModalBackdrop) deleteBatchPatientModalBackdrop.classList.add('is-open');
  }

  function closeDeleteBatchPatientModal() {
    if (deleteBatchPatientModalBackdrop) deleteBatchPatientModalBackdrop.classList.remove('is-open');
  }

  if (deleteSelectedPatientsBtn) deleteSelectedPatientsBtn.addEventListener('click', openDeleteBatchPatientModal);
  if (cancelDelBatchPatientBtn) cancelDelBatchPatientBtn.addEventListener('click', closeDeleteBatchPatientModal);

  if (confirmDelBatchPatientBtn) {
    confirmDelBatchPatientBtn.addEventListener('click', async () => {
      if (selectedPatientIds.size === 0 || !window.BlogStore) return;
      const idsArray = Array.from(selectedPatientIds);
      const count = idsArray.length;

      confirmDelBatchPatientBtn.disabled = true;
      confirmDelBatchPatientBtn.textContent = 'Eliminando...';

      try {
        await window.BlogStore.deleteMultiplePatientPhotos(idsArray);
        showToast(`${count} foto(s) de paciente eliminada(s) con éxito.`, 'success');
        closeDeleteBatchPatientModal();
        disableMultiSelectMode();
      } catch (err) {
        showToast(err.message || 'Error al eliminar fotos seleccionadas.', 'error');
      } finally {
        confirmDelBatchPatientBtn.disabled = false;
        confirmDelBatchPatientBtn.textContent = 'Sí, eliminar todas';
      }
    });
  }

  // ── 10. Gestión del Perfil del Dr. Anthony De Jesús ──
  const drAnthonyForm = $('#drAnthonyForm');
  const drAdminName = $('#drAdminName');
  const drAdminTitle = $('#drAdminTitle');
  const drAdminPhilosophy = $('#drAdminPhilosophy');
  const drAdminShortBio = $('#drAdminShortBio');
  const drAdminAcademicEditor = $('#drAdminAcademicEditor');
  const drAdminClinicalEditor = $('#drAdminClinicalEditor');
  const drAdminTeachingEditor = $('#drAdminTeachingEditor');
  const drAdminPhotoPreview = $('#drAdminPhotoPreview');
  const drAdminPhotoInput = $('#drAdminPhotoInput');
  const drAdminPhotoFileInput = $('#drAdminPhotoFileInput');
  const drGalleryFileInput = $('#drGalleryFileInput');
  const drAdminGalleryGrid = $('#drAdminGalleryGrid');

  let currentDrGallery = [];

  function formatRawToWysiwygHtml(str) {
    if (!str) return '';
    let html = str;

    if (!/<(h2|h3|p|ul|li|strong|em|span|div|a|iframe)/i.test(html)) {
      html = html
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/^\• (.*$)/gim, '<li>$1</li>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .split('\n\n')
        .map(p => {
          if (p.includes('<li>')) return `<ul>${p}</ul>`;
          if (p.startsWith('<h3>') || p.startsWith('<h2>')) return p;
          return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        })
        .join('');
    }

    try {
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Convertir cualquier elemento de YouTube antiguo o suelto al nuevo formato pastilla compacta
      const legacyCards = temp.querySelectorAll('.yt-card-preview, .yt-link-badge');
      legacyCards.forEach(card => {
        const href = card.getAttribute('href') || '#';
        const titleText = card.querySelector('.yt-card-preview__title, span') ? card.querySelector('.yt-card-preview__title, span').textContent.trim() : 'Ver en YouTube';
        const videoId = extractYouTubeId(href);
        const thumbSrc = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

        const block = document.createElement('div');
        block.className = 'yt-editor-block';
        block.setAttribute('contenteditable', 'false');

        if (videoId && thumbSrc) {
          block.innerHTML = `<a href="${href}" target="_blank" rel="noopener" class="yt-card-pill"><div class="yt-card-pill__thumb"><img src="${thumbSrc}" alt="${titleText}"><div class="yt-card-pill__play">▶</div></div><div class="yt-card-pill__text"><strong class="yt-card-pill__title">${titleText}</strong><span class="yt-card-pill__link">Ver video en YouTube &rarr;</span></div></a><button type="button" class="yt-block-delete-btn" title="Eliminar este video" onclick="this.closest('.yt-editor-block').remove()"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Borrar</span></button>`;
        } else {
          block.innerHTML = `<a href="${href}" target="_blank" rel="noopener" class="yt-card-pill"><div class="yt-card-pill__thumb" style="background:#FF0000"><svg viewBox="0 0 24 24" width="18" height="18" fill="#FFF"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></div><div class="yt-card-pill__text"><strong class="yt-card-pill__title">${titleText}</strong><span class="yt-card-pill__link">Enlace de YouTube &rarr;</span></div></a><button type="button" class="yt-block-delete-btn" title="Eliminar este enlace" onclick="this.closest('.yt-editor-block').remove()"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Borrar</span></button>`;
        }

        const parentP = card.closest('p');
        if (parentP && parentP.children.length === 1) {
          parentP.parentNode.replaceChild(block, parentP);
        } else {
          card.parentNode.replaceChild(block, card);
        }
      });

      // Asegurar que cualquier .yt-editor-block existente tenga contenteditable="false" y su botón Borrar
      const blocks = temp.querySelectorAll('.yt-editor-block');
      blocks.forEach(block => {
        block.setAttribute('contenteditable', 'false');
        if (!block.querySelector('.yt-block-delete-btn')) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'yt-block-delete-btn';
          btn.title = 'Eliminar este elemento';
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Borrar</span>';
          block.appendChild(btn);
        }
      });

      return temp.innerHTML;
    } catch (e) {
      return html;
    }
  }

  function renderDrAnthonyAdminForm() {
    if (!window.BlogStore) return;
    const p = window.BlogStore.getDrAnthonyProfile();

    if (drAdminName) drAdminName.value = p.name || '';
    if (drAdminTitle) drAdminTitle.value = p.title || '';
    if (drAdminPhilosophy) drAdminPhilosophy.value = p.philosophy || '';
    if (drAdminShortBio) drAdminShortBio.value = p.shortBio || '';
    
    if (drAdminAcademicEditor) drAdminAcademicEditor.innerHTML = formatRawToWysiwygHtml(p.academicContent);
    if (drAdminClinicalEditor) drAdminClinicalEditor.innerHTML = formatRawToWysiwygHtml(p.clinicalFocusContent);
    if (drAdminTeachingEditor) drAdminTeachingEditor.innerHTML = formatRawToWysiwygHtml(p.teachingContent);

    const rawPhoto = p.photoUrl || 'img/dr-anthony.jpg?v=3';
    const previewSrc = rawPhoto.startsWith('data:') ? rawPhoto : (rawPhoto.startsWith('img/') ? '../' + rawPhoto : rawPhoto);

    if (drAdminPhotoPreview) {
      drAdminPhotoPreview.src = previewSrc;
      drAdminPhotoPreview.onerror = function() {
        this.src = '../img/dr-anthony.jpg?v=3';
      };
    }
    if (drAdminPhotoInput) drAdminPhotoInput.value = rawPhoto;

    currentDrGallery = Array.isArray(p.galleryPhotos) ? [...p.galleryPhotos] : [];
    renderDrGalleryAdminGrid();
    setupDrTextareaFormatters();
  }

  let currentTargetEditor = null;
  let savedYouTubeRange = null;

  // Escuchar cambios de selección en tiempo real para recordar la posición exacta del cursor
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.classList && activeEl.classList.contains('wysiwyg-editor')) {
        const range = sel.getRangeAt(0);
        if (activeEl.contains(range.commonAncestorContainer)) {
          currentTargetEditor = activeEl;
          savedYouTubeRange = range.cloneRange();
        }
      }
    }
  });

  function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.trim().match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  function saveCaretPosition(targetEl) {
    currentTargetEditor = targetEl;
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (targetEl.contains(range.commonAncestorContainer)) {
        savedYouTubeRange = range.cloneRange();
        return;
      }
    }

    // Si no había selección guardada dentro del editor objetivo, colocar al FINAL del contenido
    const range = document.createRange();
    range.selectNodeContents(targetEl);
    range.collapse(false);
    savedYouTubeRange = range;
  }

  function restoreCaretPosition() {
    if (!currentTargetEditor) return;
    currentTargetEditor.focus();
    const sel = window.getSelection();

    if (savedYouTubeRange) {
      sel.removeAllRanges();
      sel.addRange(savedYouTubeRange);
    }
  }

  function openYouTubeModal(targetEl) {
    saveCaretPosition(targetEl);

    const ytModalBackdrop = $('#youtubeModalBackdrop');
    const ytModalUrl = $('#ytModalUrl');
    const ytModalText = $('#ytModalText');
    const ytModalPreviewMode = $('#ytModalPreviewMode');

    if (ytModalUrl) ytModalUrl.value = '';
    if (ytModalText) ytModalText.value = '';
    if (ytModalPreviewMode) ytModalPreviewMode.value = 'card';

    if (ytModalBackdrop) ytModalBackdrop.classList.add('is-open');
  }

  function closeYouTubeModal() {
    const ytModalBackdrop = $('#youtubeModalBackdrop');
    if (ytModalBackdrop) ytModalBackdrop.classList.remove('is-open');
  }

  const closeYtModalBtn = $('#closeYtModalBtn');
  const cancelYtModalBtn = $('#cancelYtModalBtn');
  const youtubeForm = $('#youtubeForm');

  if (closeYtModalBtn) closeYtModalBtn.addEventListener('click', closeYouTubeModal);
  if (cancelYtModalBtn) cancelYtModalBtn.addEventListener('click', closeYouTubeModal);

  // Prevenir navegación por clic en enlaces o tarjetas dentro de los editores de administración
  document.addEventListener('click', (e) => {
    const editor = e.target.closest('.wysiwyg-editor');
    if (editor) {
      const delBtn = e.target.closest('.yt-block-delete-btn');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        const block = delBtn.closest('.yt-editor-block');
        if (block) {
          block.remove();
          showToast('Bloque de YouTube eliminado con éxito.', 'info');
        }
        return;
      }

      const link = e.target.closest('a') || e.target.closest('.yt-card-pill') || e.target.closest('.yt-card-preview') || e.target.closest('.yt-embed-wrap');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  // Escuchar teclas Backspace y Delete para eliminación limpia y atómica de bloques de YouTube
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;

    const activeEl = document.activeElement;
    if (!activeEl || !activeEl.classList || !activeEl.classList.contains('wysiwyg-editor')) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    let targetBlock = null;

    if (range.commonAncestorContainer.nodeType === 1 && range.commonAncestorContainer.classList.contains('yt-editor-block')) {
      targetBlock = range.commonAncestorContainer;
    } else if (range.commonAncestorContainer.parentElement) {
      targetBlock = range.commonAncestorContainer.parentElement.closest('.yt-editor-block');
    }

    if (!targetBlock && range.collapsed) {
      const node = range.startContainer;
      const offset = range.startOffset;

      if (e.key === 'Backspace' && offset === 0) {
        let prev = node.previousSibling || (node.parentElement ? node.parentElement.previousSibling : null);
        if (prev && prev.classList && prev.classList.contains('yt-editor-block')) {
          targetBlock = prev;
        }
      } else if (e.key === 'Delete') {
        let next = node.nextSibling || (node.parentElement ? node.parentElement.nextSibling : null);
        if (next && next.classList && next.classList.contains('yt-editor-block')) {
          targetBlock = next;
        }
      }
    }

    if (targetBlock) {
      e.preventDefault();
      targetBlock.remove();
    }
  });

  if (youtubeForm) {
    youtubeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = $('#ytModalUrl') ? $('#ytModalUrl').value.trim() : '';
      const titleText = $('#ytModalText') ? $('#ytModalText').value.trim() : 'Ver contenido en YouTube';
      const mode = $('#ytModalPreviewMode') ? $('#ytModalPreviewMode').value : 'card';

      if (!url) return;
      const videoId = extractYouTubeId(url);
      let htmlToInsert = '';

      if (mode === 'embed' && videoId) {
        htmlToInsert = `<div class="yt-editor-block yt-editor-block--embed" contenteditable="false"><button type="button" class="yt-block-delete-btn" title="Eliminar reproductor de video" onclick="this.closest('.yt-editor-block').remove()"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Borrar Video</span></button><div class="yt-embed-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${titleText}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div></div>`;
      } else if (mode === 'card' && videoId) {
        htmlToInsert = `<div class="yt-editor-block" contenteditable="false"><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener" class="yt-card-pill"><div class="yt-card-pill__thumb"><img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${titleText}"><div class="yt-card-pill__play">▶</div></div><div class="yt-card-pill__text"><strong class="yt-card-pill__title">${titleText}</strong><span class="yt-card-pill__link">Ver video en YouTube &rarr;</span></div></a><button type="button" class="yt-block-delete-btn" title="Eliminar este video" onclick="this.closest('.yt-editor-block').remove()"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Borrar</span></button></div>`;
      } else {
        htmlToInsert = `<div class="yt-editor-block" contenteditable="false"><a href="${url}" target="_blank" rel="noopener" class="yt-card-pill"><div class="yt-card-pill__thumb" style="background:#FF0000"><svg viewBox="0 0 24 24" width="18" height="18" fill="#FFF"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></div><div class="yt-card-pill__text"><strong class="yt-card-pill__title">${titleText}</strong><span class="yt-card-pill__link">Enlace de YouTube &rarr;</span></div></a><button type="button" class="yt-block-delete-btn" title="Eliminar este enlace" onclick="this.closest('.yt-editor-block').remove()"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg><span>Borrar</span></button></div>`;
      }

      if (currentTargetEditor) {
        restoreCaretPosition();
        if (!document.execCommand('insertHTML', false, htmlToInsert)) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const div = document.createElement('div');
            div.innerHTML = htmlToInsert;
            const frag = document.createDocumentFragment();
            let node;
            while ((node = div.firstChild)) {
              frag.appendChild(node);
            }
            range.insertNode(frag);
          }
        }
      }

      closeYouTubeModal();
      showToast('Enlace de YouTube insertado con éxito.', 'success');
    });
  }

  function setupDrTextareaFormatters() {
    $$('.btn-dr-bold').forEach(btn => {
      btn.onclick = () => {
        const targetEl = $('#' + btn.dataset.target);
        if (targetEl) {
          targetEl.focus();
          document.execCommand('bold', false, null);
        }
      };
    });

    $$('.btn-dr-italic').forEach(btn => {
      btn.onclick = () => {
        const targetEl = $('#' + btn.dataset.target);
        if (targetEl) {
          targetEl.focus();
          document.execCommand('italic', false, null);
        }
      };
    });

    $$('.btn-dr-heading').forEach(btn => {
      btn.onclick = () => {
        const targetEl = $('#' + btn.dataset.target);
        if (targetEl) {
          targetEl.focus();
          document.execCommand('formatBlock', false, '<h3>');
        }
      };
    });

    $$('.btn-dr-list').forEach(btn => {
      btn.onclick = () => {
        const targetEl = $('#' + btn.dataset.target);
        if (targetEl) {
          targetEl.focus();
          document.execCommand('insertUnorderedList', false, null);
        }
      };
    });

    $$('.btn-dr-youtube').forEach(btn => {
      btn.onclick = () => {
        const targetEl = $('#' + btn.dataset.target);
        if (targetEl) {
          openYouTubeModal(targetEl);
        }
      };
    });
  }

  function renderDrGalleryAdminGrid() {
    if (!drAdminGalleryGrid) return;
    if (currentDrGallery.length === 0) {
      drAdminGalleryGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:24px;background:#FFF;border-radius:12px;border:1px solid var(--border);color:var(--ink-60)">
          No hay fotografías en la galería del Doctor. Haz clic en <strong>+ Subir Fotos a la Galería</strong>.
        </div>
      `;
      return;
    }

    drAdminGalleryGrid.innerHTML = currentDrGallery.map(g => {
      const imgSrc = g.url.startsWith('data:') ? g.url : (g.url.startsWith('img/') ? '../' + g.url : g.url);
      return `
        <div class="patient-card-admin">
          <img src="${imgSrc}" class="patient-card-admin__img" alt="${g.caption || 'Foto del Dr. Anthony'}" onerror="this.src='../img/pac-1.jpg'">
          <div class="patient-card-admin__body">
            <span class="patient-card-admin__title" title="${g.caption || 'Galería Dr. Anthony'}">${g.caption || 'Dr. Anthony De Jesús'}</span>
            <button type="button" class="action-btn action-btn--del del-dr-photo-btn" data-id="${g.id}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    $$('.del-dr-photo-btn', drAdminGalleryGrid).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        currentDrGallery = currentDrGallery.filter(item => item.id !== id);
        renderDrGalleryAdminGrid();
      });
    });
  }

  // Upload handler para foto de perfil del Dr. Anthony
  if (drAdminPhotoFileInput) {
    drAdminPhotoFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const base64 = await optimizeImageFile(file, 1000, 0.85);
        if (drAdminPhotoInput) drAdminPhotoInput.value = base64;
        if (drAdminPhotoPreview) drAdminPhotoPreview.src = base64;
        showToast('Foto de perfil cargada y optimizada.', 'success');
      } catch (err) {
        showToast(err.message || 'Error al procesar foto de perfil.', 'error');
      }
      drAdminPhotoFileInput.value = '';
    });
  }

  // Upload handler para galería del Dr. Anthony
  if (drGalleryFileInput) {
    drGalleryFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      showToast(`Procesando ${files.length} fotos para la galería...`, 'info');
      let added = 0;

      for (const file of files) {
        try {
          const base64 = await optimizeImageFile(file, 1280, 0.82);
          currentDrGallery.push({
            id: 'dr-g-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            url: base64,
            caption: 'Dr. Anthony De Jesús'
          });
          added++;
        } catch (err) {
          console.error('Error procesando foto de galería:', err);
        }
      }

      if (added > 0) {
        showToast(`${added} foto(s) agregada(s) a la galería.`, 'success');
        renderDrGalleryAdminGrid();
      }
      drGalleryFileInput.value = '';
    });
  }

  // Submit handler para el perfil del Dr. Anthony
  if (drAnthonyForm) {
    drAnthonyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = $('#saveDrAnthonyProfileBtn') || drAnthonyForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Guardar Cambios del Perfil';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Guardando...';
        }

        const profileData = {
          name: drAdminName ? drAdminName.value.trim() : 'Dr. Anthony De Jesús',
          title: drAdminTitle ? drAdminTitle.value.trim() : '',
          philosophy: drAdminPhilosophy ? drAdminPhilosophy.value.trim() : '',
          shortBio: drAdminShortBio ? drAdminShortBio.value.trim() : '',
          academicContent: drAdminAcademicEditor ? drAdminAcademicEditor.innerHTML.trim() : '',
          clinicalFocusContent: drAdminClinicalEditor ? drAdminClinicalEditor.innerHTML.trim() : '',
          teachingContent: drAdminTeachingEditor ? drAdminTeachingEditor.innerHTML.trim() : '',
          photoUrl: drAdminPhotoInput && drAdminPhotoInput.value ? drAdminPhotoInput.value : 'img/dr-anthony.jpg?v=3',
          galleryPhotos: currentDrGallery
        };

        await window.BlogStore.saveDrAnthonyProfile(profileData);
        showToast('Perfil del Dr. Anthony De Jesús guardado y sincronizado.', 'success');
      } catch (err) {
        showToast(err.message || 'Error al guardar el perfil del Dr. Anthony.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

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

  if (window.BlogStore && typeof window.BlogStore.fetchPatientPhotosAsync === 'function') {
    window.BlogStore.fetchPatientPhotosAsync().then(() => {
      if (sessionStorage.getItem(SESSION_KEY) === 'true' && tabPatientsBtn && tabPatientsBtn.classList.contains('is-active')) {
        renderPatientsGrid();
      }
    }).catch(() => {});
  }

  if (window.BlogStore && typeof window.BlogStore.fetchDrAnthonyProfileAsync === 'function') {
    window.BlogStore.fetchDrAnthonyProfileAsync().then(() => {
      if (sessionStorage.getItem(SESSION_KEY) === 'true' && tabDrAnthonyBtn && tabDrAnthonyBtn.classList.contains('is-active')) {
        renderDrAnthonyAdminForm();
      }
    }).catch(() => {});
  }

  // Inicializar autenticación
  checkAuth();

})();
