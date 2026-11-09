'use strict';

const { ORIGIN, getAllCases, esc, safeImg } = require('./_lib/casos');

module.exports = async function handler(req, res) {
  try {
    const casos = await getAllCases();

    const urls = casos.map(c => {
      const imgs = [...new Set([c.coverImg, c.beforeImg, c.duringImg, c.afterImg, ...c.images]
        .map(safeImg).filter(Boolean))];
      return `  <url>
    <loc>${ORIGIN}/casos/${esc(c.slug)}</loc>${c.date ? `
    <lastmod>${esc(c.date)}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${imgs.map(u => `
    <image:image>
      <image:loc>${esc(u)}</image:loc>
      <image:title>${esc(c.title)}</image:title>
    </image:image>`).join('')}
  </url>`;
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
    res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`);
  } catch (err) {
    console.error('sitemap-casos.js:', err);
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.end('Servicio no disponible');
  }
};
