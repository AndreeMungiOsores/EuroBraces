'use strict';

const { isValidSlug, getCase, getAllCases } = require('./_lib/casos');
const { paginaCaso, paginaNoEncontrado } = require('./_lib/plantilla');

function send(res, status, body, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(body);
}

module.exports = async function handler(req, res) {
  const raw = req.query && req.query.slug;
  const slug = String(Array.isArray(raw) ? raw[0] : raw || '').toLowerCase();

  if (!isValidSlug(slug)) {
    return send(res, 404, paginaNoEncontrado(), 'public, s-maxage=60');
  }

  try {
    const caso = await getCase(slug);
    if (!caso) return send(res, 404, paginaNoEncontrado(), 'public, s-maxage=60');

    let otros = [];
    try {
      otros = (await getAllCases()).filter(c => c.slug !== slug).slice(0, 3);
    } catch (e) { /* los casos relacionados son opcionales */ }

    return send(res, 200, paginaCaso(caso, otros), 'public, s-maxage=300, stale-while-revalidate=86400');
  } catch (err) {
    console.error('caso.js:', err);
    return send(res, 503, paginaNoEncontrado(), 'no-store');
  }
};
