/**
 * @file blog-store.js
 * @description Gestor de persistencia y datos para Casos Clínicos y Blog de EuroBraces Center.
 * Conexión nativa con Supabase (PostgreSQL) + caché local, fallback offline y gestión dinámica de categorías.
 */

(function (global) {
  'use strict';

  // Configuración Supabase
  const SUPABASE_URL = 'https://ufgfsethtoefnzmlwdhv.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_uQttPnSYcDP9kjAD79TG6w_ZfcnGxJj';
  const STORAGE_KEY = 'eurobraces_clinical_cases';
  const CATEGORIES_KEY = 'eurobraces_categories';
  const PATIENT_PHOTOS_KEY = 'eurobraces_patient_photos';
  const DR_ANTHONY_KEY = 'eurobraces_dr_anthony_profile';

  /**
   * Perfil inicial por defecto del Dr. Anthony De Jesús (Seed desde su CV)
   */
  const DEFAULT_DR_ANTHONY_PROFILE = {
    name: 'Dr. Anthony De Jesús',
    title: 'Especialista en Ortodoncia | Ortodoncia Cráneo-Mandibular | Conferencista Internacional',
    shortBio: 'Odontólogo egresado de la Universidad Rómulo Gallegos con especialización en Ortodoncia por la Universidad Privada San Juan Bautista. Experto en la resolución clínica de casos de alta complejidad con enfoque biomecánico, funcional y 3D.',
    philosophy: 'Diagnóstico preciso · Biomecánica inteligente · Función · Experiencia clínica · Educación',
    photoUrl: 'img/dr-anthony.jpg?v=3',
    academicContent: `<ul><li><strong>Odontólogo</strong> – Universidad Rómulo Gallegos.</li><li><strong>Especialización en Ortodoncia</strong> – Universidad Privada San Juan Bautista.</li><li><strong>Diplomado Internacional en Ortodoncia Cráneo-Mandibular</strong> – Con la Dra. Paola Caballero (posición mandibular, oclusión, ATM y planificación ortodóncica).</li><li><strong>Tomografía y Diagnóstico 3D</strong> – Con el Dr. Luis Tapia (análisis de imágenes tridimensionales).</li><li><strong>Formación Internacional en Ortodoncia Cráneo-Mandibular y Filosofía MEAW/GEAW</strong> – Con el Dr. Roberto Velásquez Torres y el Dr. Akiyoshi Shirasu.</li><li><strong>Entrenamiento en Microimplantes y Manejo de Sonrisa Gingival</strong> – Con la Dra. Patricia Vergara Villarreal.</li><li><strong>Residencia Clínica en Ortodoncia (MEAW y Bioprogresiva de Ricketts)</strong> – Bajo la tutoría del Dr. Luis Fernando Pérez Vargas.</li></ul>`,
    clinicalFocusContent: `<p>Especialista en el diagnóstico integral y la resolución biomecánica de maloclusiones de alta complejidad:</p><ul><li>Maloclusiones Clase II y Clase III severas.</li><li>Asimetrías dentofaciales y laterodesviaciones mandibulares.</li><li>Alteraciones severas del plano oclusal y dimensión vertical.</li><li>Mordida abierta anterior y colapso de arcada.</li><li>Ortodoncia Cráneo-Mandibular y manejo de la articulación temporomandibular (ATM).</li><li>Biomecánica avanzada con técnicas MEAW, GEAW, Bioprogresiva y MBT.</li><li>Anclaje esquelético avanzado con microimplantes (MARPE, Microtornillos).</li><li>Diagnóstico funcional 3D y tomografía tridimensional.</li></ul>`,
    teachingContent: `<ul><li><strong>Conferencista Nacional e Internacional</strong>: Expositor en congresos académicos compartiendo protocolos de resolución de casos complejos, manejo del plano oclusal y biomecánica avanzada.</li><li><strong>Creador y Speaker Principal de "El Arte de Doblar"</strong>: Programa de formación profesional en ortodoncia enfocado en biomecánica aplicada, dobleces de arcos, MEAW, GEAW y estrategias clínicas.</li><li><strong>Fundador de "OrthoTube"</strong>: Canal educativo en YouTube dedicado a la divulgación científica y enseñanza clínica de la ortodoncia para odontólogos y especialistas de Latinoamérica.</li></ul>`,
    galleryPhotos: [
      { id: 'dr-g1', url: 'img/pac-3.jpg', caption: 'Conferencia y Docencia Clínica en Ortodoncia' },
      { id: 'dr-g2', url: 'img/pac-1.jpg', caption: 'Programa Formativo El Arte de Doblar' },
      { id: 'dr-g3', url: 'img/pac-4.jpg', caption: 'Atención y Diagnóstico Cráneo-Mandibular' }
    ]
  };

  /**
   * Fotos de pacientes iniciales por defecto (Seed).
   */
  const DEFAULT_PATIENT_PHOTOS = [
    { id: 'pac-3', url: 'img/pac-3.jpg', caption: 'Paciente atendido en EuroBraces Center' },
    { id: 'pac-1', url: 'img/pac-1.jpg', caption: 'Pacientes de EuroBraces Center' },
    { id: 'pac-4', url: 'img/pac-4.jpg', caption: 'Paciente de EuroBraces Center' },
    { id: 'pac-5', url: 'img/pac-5.jpg', caption: 'Paciente en consulta EuroBraces' },
    { id: 'pac-2', url: 'img/pac-2.jpg', caption: 'Paciente de EuroBraces Center' }
  ];

  /**
   * Categorías iniciales por defecto.
   */
  const DEFAULT_CATEGORIES = [
    'Ortodoncia',
    'Alineadores',
    'Estética Dental',
    'Cirugía e Implantes',
    'Odontopediatría'
  ];

  /**
   * Datos iniciales por defecto (Seed).
   */
  const DEFAULT_CASES = [
    {
      id: 'caso-01-apinamiento-arcada',
      slug: 'apinamiento-severo-correccion-arcada',
      title: 'Alineación de arcada y corrección de apiñamiento severo',
      category: 'Ortodoncia',
      excerpt: 'Corrección gradual de inclinación dental y descompresión de arcada mediante aparatología de baja fricción sin extracciones.',
      content: `### Diagnóstico Inicial
Paciente adulto acudió a consulta presentando apiñamiento severo en el sector anterosuperior y anteroinferior, con colapso transversal leve de ambas arcadas y falta de espacio para los incisivos laterales.

### Plan de Tratamiento
1. **Fase 1 — Descompresión y Alineación**: Instalación de aparatología fija estética con arcos termoactivados de níquel-titanio para desrotar y ganar espacio de forma biológica.
2. **Fase 2 — Nivelación y Torque**: Corrección del plano oclusal y alineación de los ejes coronarios.
3. **Fase 3 — Detallado y Retención**: Interdigitación oclusal fina y colocación de retenedores fijos y transparentes de uso nocturno.

### Resultados y Beneficios
Se logró una línea de sonrisa armónica y amplia, mejorando notablemente la función masticatoria y facilitando la higiene dental diaria. El paciente completó su fase de alineación activa en 14 meses.`,
      doctor: 'Dr. Anthony De Jesús',
      doctorRole: 'Especialista en Ortodoncia',
      date: '2026-06-12',
      readTime: '4 min',
      beforeImg: 'img/caso1-inicio.jpg',
      afterImg: 'img/caso1-progreso.jpg',
      coverImg: 'img/caso1-progreso.jpg',
      tags: ['Ortodoncia', 'Apiñamiento', 'Brackets Estéticos', 'Adultos'],
      featured: true
    },
    {
      id: 'caso-02-caninos-ectopicos',
      slug: 'caninos-ectopicos-espacio-arcada',
      title: 'Tracción de caninos ectópicos y reapertura guiada de espacio',
      category: 'Ortodoncia',
      excerpt: 'Apertura de espacio guiada y reubicación anatómica de caninos superiores hacia una línea de sonrisa simétrica.',
      content: `### Diagnóstico Inicial
Paciente joven de 16 años presentó erupción ectópica alta de los caninos superiores (piezas 1.3 y 2.3) con mordida cruzada posterior unilateral y desviación de línea media dental.

### Plan de Tratamiento
- **Apertura de espacio**: Expansión controlada de arcada superior utilizando resortes de apertura de níquel-titanio.
- **Tracción guiada**: Mecánica elástica de tracción vertical y palatina para descender ambos caninos a su posición anatómica sin afectar las raíces contiguas.
- **Centrado de línea media**: Coordinación de arcadas mediante elásticos intermaxilares de precisión.

### Evolución Clínica
El tratamiento permitió preservar todas las piezas dentales permanentes, logrando una guía canina funcional y una sonrisa simétrica con alta satisfacción estética.`,
      doctor: 'Dr. Anthony De Jesús',
      doctorRole: 'Especialista en Ortodoncia',
      date: '2026-05-20',
      readTime: '3 min',
      beforeImg: 'img/caso2-inicio.jpg',
      afterImg: 'img/caso2-progreso.jpg',
      coverImg: 'img/caso2-progreso.jpg',
      tags: ['Ortodoncia Interceptiva', 'Caninos Ectópicos', 'Guía Oclusal'],
      featured: true
    },
    {
      id: 'caso-03-desalineacion-estetica',
      slug: 'nivelacion-anterior-armonizacion-estetica',
      title: 'Nivelación anterior y oclusión estética con alineadores transparentes',
      category: 'Alineadores',
      excerpt: 'Restablecimiento del plano oclusal y armonía estética de los dientes frontales mediante alineadores invisibles de alta precisión.',
      content: `### Diagnóstico Inicial
Paciente profesional que solicitó una alternativa estética para corregir giroversiones en incisivos centrales y laterales sin el uso de brackets metálicos.

### Plan Digitalizado
1. **Escaneo Intraoral 3D**: Modelado digital de alta resolución para planificación biomecánica virtual.
2. **Secuencia de Alineadores**: Serie de 18 pares de alineadores transparentes de cambio quincenal con ataches estéticos de color dental.
3. **Microestética Final**: Pulido de bordes incisales y profilaxis profunda post-tratamiento.

### Logros Clínicos
El paciente completó el plan en 9 meses con total comodidad, estética imperceptible y una adaptación oclusal óptima.`,
      doctor: 'Dra. Belén Torres',
      doctorRole: 'Odontóloga Integral',
      date: '2026-04-15',
      readTime: '3 min',
      beforeImg: 'img/ba-desalineados-antes.jpg',
      afterImg: 'img/ba-desalineados-despues.jpg',
      coverImg: 'img/ba-desalineados-despues.jpg',
      tags: ['Alineadores Invisibles', 'Estética Dental', 'Digital'],
      featured: true
    },
    {
      id: 'caso-04-mordida-abierta',
      slug: 'correccion-mordida-abierta-anterior',
      title: 'Corrección de mordida abierta anterior y reeducación funcional',
      category: 'Ortodoncia',
      excerpt: 'Cierre de mordida abierta anterior con biomecánica de intrusión molar y restauración del contacto anterior.',
      content: `### Diagnóstico Inicial
Paciente con hábito previo de deglución atípica presentaba mordida abierta anterior de 4mm, imposibilitando el corte adecuado de alimentos y provocando fatiga articular.

### Tratamiento Aplicado
- **Control de Hábitos**: Terapia miofuncional complementaria para posición lingual correcta.
- **Ortodoncia Fija de Prescripción MBT**: Intrusión pasiva de molares superiores y extrusión fisiológica controlada de piezas anteriores.
- **Asentamiento Oclusal**: Logro de sobremordida vertical (overbite) y horizontal (overjet) ideal de 2mm.

### Conclusión
Se restableció la competencia labial y la eficiencia masticatoria con estabilidad oclusal comprobada en los controles periódicos.`,
      doctor: 'Dr. Anthony De Jesús',
      doctorRole: 'Especialista en Ortodoncia',
      date: '2026-03-08',
      readTime: '5 min',
      beforeImg: 'img/ba-mordida-antes.jpg',
      afterImg: 'img/ba-mordida-despues.jpg',
      coverImg: 'img/ba-mordida-despues.jpg',
      tags: ['Mordida Abierta', 'Oclusión Funcional', 'Salud Articular'],
      featured: false
    }
  ];

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  function calculateReadTime(text) {
    if (!text || !text.trim()) return '1 min';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 180);
    return `${Math.max(1, minutes)} min`;
  }

  async function syncPatientPhotosToSupabase(photos) {
    try {
      const payload = {
        slug: 'system-patient-photos',
        title: 'System Patient Photos Data',
        category: 'System',
        excerpt: 'Persistencia de fotos de pacientes',
        content: JSON.stringify(photos),
        doctor: 'System',
        doctor_role: 'System',
        date: new Date().toISOString().split('T')[0],
        read_time: '1 min',
        before_img: '',
        after_img: '',
        cover_img: '',
        tags: ['system'],
        featured: false
      };

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases?slug=eq.system-patient-photos`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ content: JSON.stringify(photos) })
      });

      let updatedRows = [];
      if (patchRes.ok) {
        try {
          updatedRows = await patchRes.json();
        } catch (e) {}
      }

      if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn('Nota: Sincronización diferida de fotos de pacientes:', err);
    }
  }

  async function syncDrAnthonyProfileToSupabase(profile) {
    try {
      const payload = {
        slug: 'system-dr-anthony',
        title: profile.name || 'Dr. Anthony De Jesús',
        category: 'System',
        excerpt: profile.title || 'Especialista en Ortodoncia',
        content: JSON.stringify(profile),
        doctor: 'System',
        doctor_role: 'System',
        date: new Date().toISOString().split('T')[0],
        read_time: '1 min',
        before_img: '',
        after_img: '',
        cover_img: '',
        tags: ['system'],
        featured: false
      };

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases?slug=eq.system-dr-anthony`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: payload.title,
          excerpt: payload.excerpt,
          content: payload.content,
          date: payload.date
        })
      });

      let updatedRows = [];
      if (patchRes.ok) {
        try {
          updatedRows = await patchRes.json();
        } catch (e) {}
      }

      if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (err) {
      console.warn('Nota: Sincronización diferida del perfil del Dr. Anthony:', err);
    }
  }

  function mapFromSupabase(row) {
    const computedReadTime = row.read_time || calculateReadTime((row.content || '') + ' ' + (row.excerpt || ''));

    let photoMode = 'beforeAfter';
    let images = [];
    let beforeImg = row.before_img || '';
    let afterImg = row.after_img || '';
    let coverImg = row.cover_img || row.after_img || row.before_img || '';

    if (beforeImg && beforeImg.startsWith('[GALLERY_MODE]')) {
      photoMode = 'gallery';
      try {
        images = JSON.parse(afterImg || '[]');
      } catch (e) {
        images = coverImg ? [coverImg] : [];
      }
      beforeImg = '';
      afterImg = '';
      coverImg = coverImg || (images && images[0]) || '';
    } else if (row.photo_mode === 'gallery' || (Array.isArray(row.images) && row.images.length > 0)) {
      photoMode = 'gallery';
      images = Array.isArray(row.images) ? row.images : [];
    }

    return {
      id: row.id,
      slug: row.slug,
      title: row.title || '',
      category: row.category || 'Sin etiqueta',
      excerpt: row.excerpt || '',
      content: row.content || '',
      doctor: row.doctor || 'Dr. Anthony De Jesús',
      doctorRole: row.doctor_role || 'Especialista en Ortodoncia',
      date: row.date || new Date().toISOString().split('T')[0],
      readTime: computedReadTime,
      photoMode: photoMode,
      images: images,
      beforeImg: beforeImg,
      afterImg: afterImg,
      coverImg: coverImg,
      tags: Array.isArray(row.tags) ? row.tags : [],
      featured: Boolean(row.featured)
    };
  }

  function mapToSupabase(item) {
    const isGallery = item.photoMode === 'gallery' || (Array.isArray(item.images) && item.images.length > 0 && !item.beforeImg);

    let beforeImgStr = item.beforeImg || '';
    let afterImgStr = item.afterImg || '';
    let coverImgStr = item.coverImg || item.afterImg || item.beforeImg || '';

    if (isGallery) {
      const imgs = Array.isArray(item.images) && item.images.length > 0 ? item.images : (coverImgStr ? [coverImgStr] : []);
      beforeImgStr = '[GALLERY_MODE]';
      afterImgStr = JSON.stringify(imgs);
      coverImgStr = imgs[0] || coverImgStr || '';
    }

    const payload = {
      slug: item.slug || slugify(item.title),
      title: item.title,
      category: item.category || 'Sin etiqueta',
      excerpt: item.excerpt || '',
      content: item.content || '',
      doctor: item.doctor || 'Dr. Anthony De Jesús',
      doctor_role: item.doctorRole || 'Especialista en Ortodoncia',
      date: item.date || new Date().toISOString().split('T')[0],
      read_time: item.readTime || '3 min',
      before_img: beforeImgStr,
      after_img: afterImgStr,
      cover_img: coverImgStr,
      tags: Array.isArray(item.tags) ? item.tags : [],
      featured: Boolean(item.featured)
    };

    if (item.id && !item.id.startsWith('caso-')) {
      payload.id = item.id;
    }
    return payload;
  }

  const BlogStore = {
    config: {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY
    },

    // ── GESTIÓN DE CATEGORÍAS ──
    getCategories: function () {
      try {
        const raw = localStorage.getItem(CATEGORIES_KEY);
        if (!raw) {
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
          return DEFAULT_CATEGORIES.slice();
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
          return DEFAULT_CATEGORIES.slice();
        }
        return parsed;
      } catch (err) {
        return DEFAULT_CATEGORIES.slice();
      }
    },

    addCategory: function (name) {
      const cleanName = (name || '').trim();
      if (!cleanName) {
        throw new Error('El nombre de la categoría no puede estar vacío.');
      }
      if (cleanName.toLowerCase() === 'sin etiqueta' || cleanName.toLowerCase() === 'todas las categorías') {
        throw new Error('Ese nombre de categoría está reservado por el sistema.');
      }

      const categories = this.getCategories();
      const exists = categories.some(c => c.toLowerCase() === cleanName.toLowerCase());
      if (exists) {
        throw new Error(`La categoría "${cleanName}" ya existe.`);
      }

      categories.push(cleanName);
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
      return categories;
    },

    deleteCategory: async function (name) {
      const targetName = (name || '').trim();
      const categories = this.getCategories();
      const filtered = categories.filter(c => c.toLowerCase() !== targetName.toLowerCase());
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));

      // Reasignar publicaciones que tenían esta categoría a "Sin etiqueta"
      const cases = this.getCases();
      let modified = false;

      for (let i = 0; i < cases.length; i++) {
        if ((cases[i].category || '').toLowerCase() === targetName.toLowerCase()) {
          cases[i].category = 'Sin etiqueta';
          modified = true;
          // Actualizar en Supabase en segundo plano
          try {
            const payload = mapToSupabase(cases[i]);
            fetch(`${SUPABASE_URL}/rest/v1/clinical_cases`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify(payload)
            }).catch(() => {});
          } catch (e) {}
        }
      }

      if (modified) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
      }

      return filtered;
    },

    // ── GESTIÓN DE FOTOS DE PACIENTES ("Nuestros Pacientes") ──
    getPatientPhotos: function () {
      try {
        const raw = localStorage.getItem(PATIENT_PHOTOS_KEY);
        if (!raw) {
          localStorage.setItem(PATIENT_PHOTOS_KEY, JSON.stringify(DEFAULT_PATIENT_PHOTOS));
          return DEFAULT_PATIENT_PHOTOS.slice();
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          localStorage.setItem(PATIENT_PHOTOS_KEY, JSON.stringify(DEFAULT_PATIENT_PHOTOS));
          return DEFAULT_PATIENT_PHOTOS.slice();
        }
        return parsed;
      } catch (err) {
        return DEFAULT_PATIENT_PHOTOS.slice();
      }
    },

    fetchPatientPhotosAsync: async function () {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases?slug=eq.system-patient-photos`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (!res.ok) {
          return this.getPatientPhotos();
        }

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].content) {
          try {
            const parsed = JSON.parse(data[0].content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(PATIENT_PHOTOS_KEY, JSON.stringify(parsed));
              return parsed;
            }
          } catch (e) {}
        }
        return this.getPatientPhotos();
      } catch (err) {
        return this.getPatientPhotos();
      }
    },

    savePatientPhoto: async function (photoData) {
      if (!photoData || !photoData.url) {
        throw new Error('La imagen del paciente es obligatoria.');
      }

      const photos = this.getPatientPhotos();
      const targetId = photoData.id || 'pac-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);

      const newItem = {
        id: targetId,
        url: photoData.url,
        caption: photoData.caption ? photoData.caption.trim() : 'Paciente EuroBraces Center'
      };

      const existingIndex = photos.findIndex(p => p.id === targetId);
      if (existingIndex >= 0) {
        photos[existingIndex] = newItem;
      } else {
        photos.unshift(newItem);
      }

      try {
        localStorage.setItem(PATIENT_PHOTOS_KEY, JSON.stringify(photos));
      } catch (e) {}

      // Sincronización robusta en Supabase (PATCH primero, fallback a POST)
      await syncPatientPhotosToSupabase(photos);

      return newItem;
    },

    deletePatientPhoto: async function (id) {
      const photos = this.getPatientPhotos();
      const filtered = photos.filter(p => p.id !== id);

      try {
        localStorage.setItem(PATIENT_PHOTOS_KEY, JSON.stringify(filtered));
      } catch (e) {}

      // Sincronización robusta en Supabase (PATCH primero, fallback a POST)
      await syncPatientPhotosToSupabase(filtered);

      return filtered;
    },

    deleteMultiplePatientPhotos: async function (ids) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return this.getPatientPhotos();
      }
      const idsSet = new Set(ids);
      const photos = this.getPatientPhotos();
      const filtered = photos.filter(p => !idsSet.has(p.id));

      try {
        localStorage.setItem(PATIENT_PHOTOS_KEY, JSON.stringify(filtered));
      } catch (e) {}

      // Sincronización en lote con Supabase
      await syncPatientPhotosToSupabase(filtered);

      return filtered;
    },

    // ── GESTIÓN DEL PERFIL PROFESIONAL DEL DR. ANTHONY DE JESÚS ──
    getDrAnthonyProfile: function () {
      try {
        const raw = localStorage.getItem(DR_ANTHONY_KEY);
        if (!raw) return DEFAULT_DR_ANTHONY_PROFILE;
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_DR_ANTHONY_PROFILE, ...parsed };
      } catch (e) {
        return DEFAULT_DR_ANTHONY_PROFILE;
      }
    },

    fetchDrAnthonyProfileAsync: async function () {
      try {
        const url = `${SUPABASE_URL}/rest/v1/clinical_cases?slug=eq.system-dr-anthony&select=*`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && data[0].content) {
            const profile = JSON.parse(data[0].content);
            const merged = { ...DEFAULT_DR_ANTHONY_PROFILE, ...profile };
            localStorage.setItem(DR_ANTHONY_KEY, JSON.stringify(merged));
            return merged;
          }
        }
      } catch (err) {
        console.warn('Usando perfil del Dr. Anthony en caché local:', err);
      }
      return this.getDrAnthonyProfile();
    },

    saveDrAnthonyProfile: async function (profileData) {
      const current = this.getDrAnthonyProfile();
      const updated = { ...current, ...profileData };

      try {
        localStorage.setItem(DR_ANTHONY_KEY, JSON.stringify(updated));
      } catch (e) {}

      await syncDrAnthonyProfileToSupabase(updated);
      return updated;
    },

    // ── GESTIÓN DE CASOS CLÍNICOS ──
    getCases: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          this.resetDefaults();
          return DEFAULT_CASES.slice();
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          this.resetDefaults();
          return DEFAULT_CASES.slice();
        }
        return parsed.filter(c => c.slug !== 'system-patient-photos' && c.slug !== 'system-dr-anthony' && c.category !== 'System');
      } catch (err) {
        return DEFAULT_CASES.slice();
      }
    },

    fetchCasesAsync: async function () {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases?select=*&order=date.desc`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (!res.ok) {
          return this.getCases();
        }

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const cleanData = data.filter(c => c.slug !== 'system-patient-photos' && c.slug !== 'system-dr-anthony' && c.category !== 'System');
          const mapped = cleanData.map(mapFromSupabase);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          } catch (e) {}

          // Actualizar lista de categorías con las que vienen de Supabase
          const existingCats = this.getCategories();
          const supabaseCats = cleanData.map(c => c.category).filter(c => c && c !== 'Sin etiqueta' && c !== 'System');
          const merged = Array.from(new Set([...existingCats, ...supabaseCats]));
          try {
            localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));
          } catch (e) {}

          return mapped;
        } else {
          return this.getCases();
        }
      } catch (err) {
        return this.getCases();
      }
    },

    getCaseById: function (idOrSlug) {
      if (!idOrSlug) return null;
      const cases = this.getCases();
      return cases.find(c => c.id === idOrSlug || c.slug === idOrSlug) || null;
    },

    saveCase: async function (caseData) {
      const cases = this.getCases();
      const now = new Date().toISOString().split('T')[0];

      if (!caseData.title || !caseData.title.trim()) {
        throw new Error('El título del caso clínico es obligatorio.');
      }

      const cleanSlug = slugify(caseData.slug || caseData.title);
      let targetId = caseData.id;

      if (!targetId) {
        targetId = 'caso-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      }

      const selectedCategory = (caseData.category || '').trim() || 'Sin etiqueta';

      // Si la categoría no existe en la lista y no es "Sin etiqueta", agregarla automáticamente
      if (selectedCategory !== 'Sin etiqueta') {
        const currentCats = this.getCategories();
        if (!currentCats.some(c => c.toLowerCase() === selectedCategory.toLowerCase())) {
          currentCats.push(selectedCategory);
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(currentCats));
        }
      }

      const caseItem = {
        id: targetId,
        slug: cleanSlug,
        title: caseData.title.trim(),
        category: selectedCategory,
        excerpt: caseData.excerpt ? caseData.excerpt.trim() : '',
        content: caseData.content ? caseData.content.trim() : '',
        doctor: caseData.doctor || 'Dr. Anthony De Jesús',
        doctorRole: caseData.doctorRole || 'Especialista en Ortodoncia',
        date: caseData.date || now,
        readTime: caseData.readTime || calculateReadTime((caseData.content || '') + ' ' + (caseData.excerpt || '')),
        photoMode: caseData.photoMode || (caseData.images && caseData.images.length ? 'gallery' : 'beforeAfter'),
        images: Array.isArray(caseData.images) ? caseData.images : [],
        beforeImg: caseData.beforeImg || '',
        afterImg: caseData.afterImg || '',
        coverImg: caseData.coverImg || caseData.afterImg || (caseData.images && caseData.images[0]) || '',
        tags: Array.isArray(caseData.tags)
          ? caseData.tags
          : (caseData.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        featured: Boolean(caseData.featured)
      };

      const existingIndex = cases.findIndex(c => c.id === targetId || c.slug === cleanSlug);
      if (existingIndex >= 0) {
        cases[existingIndex] = caseItem;
      } else {
        cases.unshift(caseItem);
      }

      // Guardado seguro en caché local (sin bloquear si la cuota del navegador es excedida)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
      } catch (storageErr) {
        console.warn('Advertencia: La cuota de localStorage fue superada. Se prioriza la persistencia en Supabase:', storageErr);
      }

      // Sincronización directa con Supabase
      try {
        const payload = mapToSupabase(caseItem);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('Error al guardar en Supabase:', res.status, errText);
          throw new Error(`Error al guardar en la base de datos (${res.status}): ${errText}`);
        }
      } catch (err) {
        console.error('Fallo en sincronización con Supabase:', err);
        throw err;
      }

      return caseItem;
    },

    deleteCase: async function (id) {
      const cases = this.getCases();
      const target = cases.find(c => c.id === id);
      const filtered = cases.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      // Eliminar de Supabase
      if (target) {
        try {
          const matchParam = target.slug ? `slug=eq.${target.slug}` : `id=eq.${id}`;
          await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases?${matchParam}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          });
        } catch (err) {
          console.warn('Nota: Eliminado localmente. Supabase delete diferido:', err);
        }
      }
      return true;
    },

    resetDefaults: function () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CASES));
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CASES.slice();
    },

    syncSeedToSupabase: async function () {
      const cases = this.getCases();
      const payloads = cases.map(mapToSupabase);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payloads)
      });
      if (!res.ok) {
        throw new Error('Asegúrate de haber creado la tabla en el SQL Editor de Supabase primero.');
      }
      return true;
    },

    exportJSON: function () {
      return JSON.stringify(this.getCases(), null, 2);
    },

    importJSON: function (data) {
      let parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!Array.isArray(parsed)) throw new Error('Formato JSON no válido.');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  };

  global.BlogStore = BlogStore;

})(typeof window !== 'undefined' ? window : this);
