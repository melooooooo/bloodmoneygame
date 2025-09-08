#!/usr/bin/env node
/**
 * Simple sitemap.xml generator for a static site
 * - Scans repository root for .html files (excluding 404.html)
 * - Uses file mtime as <lastmod>
 * - Writes sitemap.xml at repo root
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'https://bloodmoney.ink';

function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function walkHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // skip hidden
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Only scan shallow for this site structure
      continue;
    } else if (e.isFile() && e.name.endsWith('.html') && e.name !== '404.html') {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const files = walkHtmlFiles(ROOT);
  const urls = files.map((f) => {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    const loc = rel === 'index.html' ? `${BASE_URL}/` : `${BASE_URL}/${rel}`;
    const stat = fs.statSync(f);
    const lastmod = formatDateISO(stat.mtime);
    const priority = rel === 'index.html' ? '1.0' : '0.8';
    const changefreq = rel === 'index.html' ? 'weekly' : 'monthly';
    return { loc, lastmod, priority, changefreq };
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`),
    '</urlset>',
    ''
  ].join('\n');

  const out = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(out, xml, 'utf8');
  console.log(`Generated ${out} with ${urls.length} URLs`);
}

main();

