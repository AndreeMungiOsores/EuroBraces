'use strict';

/**
 * Acceso a datos y saneamiento de contenido para las páginas /casos/<slug>.
 *
 * La tabla `clinical_cases` se puede escribir con la clave pública (el panel valida la
 * contraseña solo en el navegador), así que TODO lo que viene de la base se trata como
 * no confiable: el HTML del caso pasa por una lista blanca y las imágenes solo se aceptan
 * desde el Storage del proyecto o desde /img/.
 */

const ORIGIN = 'https://www.eurobraces.com';
const SUPABASE_URL = 'https://ufgfsethtoefnzmlwdhv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uQttPnSYcDP9kjAD79TG6w_ZfcnGxJj';
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,200}$/;

async function supabase(query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/clinical_cases?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug) && !slug.startsWith('system-');
}

async function getCase(slug) {
  if (!isValidSlug(slug)) return null;
  const rows = await supabase(`slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
  return rows && rows[0] ? mapCase(rows[0]) : null;
}

async function getAllCases() {
  const rows = await supabase(
    'slug=not.like.system-*&select=slug,title,excerpt,date,cover_img,before_img,after_img,doctor&order=date.desc'
  );
  return (rows || []).map(mapCase);
}

/* Réplica de mapFromSupabase() de js/blog-store.js: el esquema serializa modo galería
   y foto "durante" dentro de before_img / after_img para no añadir columnas. */
function mapCase(row) {
  let beforeImg = row.before_img || '';
  let afterImg = row.after_img || '';
  let coverImg = row.cover_img || row.after_img || row.before_img || '';
  let duringImg = '';
  let images = [];

  if (beforeImg.startsWith('[GALLERY_MODE]')) {
    try { images = JSON.parse(afterImg || '[]'); } catch (e) { images = coverImg ? [coverImg] : []; }
    if (!Array.isArray(images)) images = [];
    beforeImg = '';
    afterImg = '';
    coverImg = coverImg || images[0] || '';
  } else if (afterImg.startsWith('{')) {
    try {
      const parsed = JSON.parse(afterImg);
      if (parsed && parsed.url !== undefined) {
        if (coverImg === row.after_img) coverImg = parsed.url;
        afterImg = parsed.url;
        duringImg = parsed.during || '';
      }
    } catch (e) { /* se deja tal cual */ }
  }

  return {
    slug: row.slug,
    title: row.title || '',
    category: row.category && row.category !== 'Sin etiqueta' ? row.category : 'Ortodoncia',
    excerpt: row.excerpt || '',
    content: row.content || '',
    doctor: row.doctor || 'Dr. Anthony De Jesús',
    doctorRole: row.doctor_role || 'Especialista en Ortodoncia',
    date: row.date || '',
    images,
    beforeImg,
    duringImg,
    afterImg,
    coverImg,
    tags: Array.isArray(row.tags) ? row.tags : []
  };
}

/* ───────── Texto e imágenes ───────── */

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** URL absoluta y segura, o '' si no es una imagen que aceptemos. */
function safeImg(url) {
  const u = String(url || '').trim();
  if (u.startsWith(`${SUPABASE_URL}/storage/`)) return u;
  if (/^(\.\/)?img\/[\w./-]+$/.test(u) && !u.includes('..')) return `${ORIGIN}/${u.replace(/^\.\//, '')}`;
  return '';
}

function plain(html, max) {
  const s = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[#*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-]$/, '') + '…';
}

/* ───────── Saneamiento de HTML (lista blanca) ───────── */

const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
  'br', 'hr', 'mark', 'span', 'blockquote', 'a', 'sub', 'sup']);
const VOID = new Set(['br', 'hr']);
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.\s,%]+\)|[a-z]{3,20})$/i;

function escText(text) {
  return text
    .replace(/&(?!(?:[a-zA-Z]{2,8}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cleanStyle(style) {
  const out = [];
  for (const decl of String(style).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if ((prop === 'color' || prop === 'background-color') && COLOR_RE.test(val)) out.push(`${prop}:${val}`);
    else if (prop === 'text-align' && /^(left|right|center|justify)$/i.test(val)) out.push(`${prop}:${val.toLowerCase()}`);
  }
  return out.join(';');
}

function cleanAttrs(name, raw) {
  const out = [];
  const ATTR = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = ATTR.exec(raw))) {
    const key = m[1].toLowerCase();
    const val = m[2] != null ? m[2] : m[3];
    if (key === 'style') {
      const s = cleanStyle(val);
      if (s) out.push(` style="${esc(s)}"`);
    } else if (key === 'href' && name === 'a' && /^(https?:\/\/|\/)/i.test(val.trim())) {
      out.push(` href="${esc(val.trim())}" rel="noopener"`);
    }
  }
  return out.join('');
}

function sanitizeHtml(input) {
  const s = String(input || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, '');

  const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)>/g;
  const stack = [];
  let out = '';
  let last = 0;
  let m;

  while ((m = TAG.exec(s))) {
    out += escText(s.slice(last, m.index));
    last = TAG.lastIndex;
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    if (!ALLOWED.has(name)) continue;

    if (closing) {
      if (VOID.has(name)) continue;
      const idx = stack.lastIndexOf(name);
      if (idx < 0) continue;
      while (stack.length - 1 > idx) out += `</${stack.pop()}>`;
      stack.pop();
      out += `</${name}>`;
      continue;
    }

    out += `<${name}${cleanAttrs(name, m[3] || '')}>`;
    if (!VOID.has(name)) stack.push(name);
  }
  out += escText(s.slice(last));
  while (stack.length) out += `</${stack.pop()}>`;

  return out.replace(/<p>\s*(?:<br>)?\s*<\/p>/g, '');
}

/** Contenido guardado como Markdown simple (casos antiguos o sin editor visual). */
function markdownToHtml(text) {
  return esc(text)
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .split('\n\n')
    .map(p => {
      if (p.includes('<li>')) return `<ul>${p}</ul>`;
      if (p.startsWith('<h3>')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

function renderContent(content) {
  const raw = String(content || '');
  const isHtml = /<(h2|h3|h4|p|ul|ol|li|strong|em|b|i|u|br|span|mark|a|blockquote|img)\b/i.test(raw);
  return sanitizeHtml(isHtml ? raw : markdownToHtml(raw));
}

module.exports = {
  ORIGIN, isValidSlug, getCase, getAllCases, esc, safeImg, plain, renderContent
};
