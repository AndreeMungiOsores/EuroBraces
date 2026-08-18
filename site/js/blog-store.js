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

  function mapFromSupabase(row) {
    const computedReadTime = row.read_time || calculateReadTime((row.content || '') + ' ' + (row.excerpt || ''));
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category || 'Sin etiqueta',
      excerpt: row.excerpt,
      content: row.content,
      doctor: row.doctor,
      doctorRole: row.doctor_role,
      date: row.date,
      readTime: computedReadTime,
      photoMode: row.photo_mode || (row.images && row.images.length ? 'gallery' : 'beforeAfter'),
      images: Array.isArray(row.images) ? row.images : [],
      beforeImg: row.before_img || '',
      afterImg: row.after_img || '',
      coverImg: row.cover_img || row.after_img || (row.images && row.images[0]) || '',
      tags: row.tags || [],
      featured: Boolean(row.featured)
    };
  }

  function mapToSupabase(item) {
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
      before_img: item.beforeImg || '',
      after_img: item.afterImg || '',
      cover_img: item.coverImg || item.afterImg || (item.images && item.images[0]) || '',
      photo_mode: item.photoMode || 'beforeAfter',
      images: Array.isArray(item.images) ? item.images : [],
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
        return parsed;
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
          const mapped = data.map(mapFromSupabase);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));

          // Actualizar lista de categorías con las que vienen de Supabase
          const existingCats = this.getCategories();
          const supabaseCats = data.map(c => c.category).filter(c => c && c !== 'Sin etiqueta');
          const merged = Array.from(new Set([...existingCats, ...supabaseCats]));
          localStorage.setItem(CATEGORIES_KEY, JSON.stringify(merged));

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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));

      // Sincronización asíncrona con Supabase
      try {
        const payload = mapToSupabase(caseItem);
        await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Nota: Guardado local exitoso. Supabase sync diferido:', err);
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
