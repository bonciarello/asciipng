/* ═══════════════════════════════════════════════════════════════
   Test Suite — Convertitore ASCII Art in PNG
   Verifica struttura HTML, accessibilità, rendering canvas
   ═══════════════════════════════════════════════════════════════ */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');

let passed  = 0;
let failed  = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.log('  ✗ ' + name);
    console.log('    ' + e.message.replace(/\n/g, '\n    '));
  }
}

function skip(name, reason) {
  skipped++;
  console.log('  ⊘ ' + name + ' (' + reason + ')');
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertExists(value, msg) {
  if (value === null || value === undefined) throw new Error(msg || 'Expected value to exist');
}

function assertIncludes(haystack, needle, msg) {
  if (haystack.indexOf(needle) === -1) {
    throw new Error(msg || ('Expected to find "' + needle + '"'));
  }
}

/* ── Read files ────────────────────────────────── */
var html, css, js;
var ROOT = __dirname;

try {
  html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
} catch (e) {
  console.error('FATAL: Cannot read index.html');
  process.exit(1);
}
try {
  css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
} catch (e) { css = ''; }
try {
  js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
} catch (e) { js = ''; }

console.log('\n═══ Test Suite: Convertitore ASCII Art in PNG ═══\n');

/* ── 1. Struttura HTML ─────────────────────────── */
console.log('1. Struttura HTML');

test('DOCTYPE presente', function () {
  assertIncludes(html, '<!DOCTYPE html>', 'DOCTYPE mancante');
});

test('lang="it" impostato', function () {
  assert(html.match(/<html[^>]*lang="it"/), 'Attributo lang="it" mancante');
});

test('Meta viewport presente', function () {
  assertIncludes(html, 'name="viewport"', 'Meta viewport mancante');
});

test('Tag <title> presente e non vuoto', function () {
  var m = html.match(/<title>([^<]+)<\/title>/);
  assertExists(m, 'Tag title mancante');
  assert(m[1].trim().length > 10, 'Title troppo corto: "' + m[1].trim() + '"');
});

test('Meta description presente', function () {
  assertIncludes(html, 'name="description"', 'Meta description mancante');
});

test('Link canonical presente', function () {
  assertIncludes(html, 'rel="canonical"', 'Link canonical mancante');
  assertIncludes(html, 'cristianporco.it/app/convertitore-di-disegni-ascii-art-in-immagini-png/', 'URL canonical errato');
});

test('Open Graph tags presenti', function () {
  assertIncludes(html, 'og:title', 'og:title mancante');
  assertIncludes(html, 'og:description', 'og:description mancante');
  assertIncludes(html, 'og:type', 'og:type mancante');
  assertIncludes(html, 'og:url', 'og:url mancante');
});

test('JSON-LD Schema.org presente', function () {
  assertIncludes(html, 'application/ld+json', 'JSON-LD mancante');
  assertIncludes(html, 'WebApplication', 'Schema.org WebApplication type mancante');
});

test('Skip link presente', function () {
  assertIncludes(html, 'skip-link', 'Skip link mancante');
  assertIncludes(html, 'Vai al contenuto', 'Testo skip link mancante o errato');
});

/* ── 2. Elementi semantici e accessibilità ──────── */
console.log('\n2. Semantica e accessibilità');

test('Esattamente un <h1>', function () {
  var matches = html.match(/<h1[>\s]/g);
  assert(matches && matches.length === 1, 'Deve esserci esattamente un h1, trovati: ' + (matches ? matches.length : 0));
});

test('Header, main, footer presenti', function () {
  assertIncludes(html, '<header', 'Header mancante');
  assertIncludes(html, '<main', 'Main mancante');
  assertIncludes(html, '<footer', 'Footer mancante');
});

test('Textarea ha un <label>', function () {
  assertIncludes(html, 'for="ascii-input"', 'Label per textarea mancante');
});

test('Select font ha un <label>', function () {
  assertIncludes(html, 'for="font-family"', 'Label per select font mancante');
});

test('Tutti gli input hanno label', function () {
  // Check that for= attributes match id= attributes
  var forMatches = html.match(/for="([^"]+)"/g) || [];
  var idMatches  = html.match(/id="([^"]+)"/g) || [];
  var ids = idMatches.map(function (m) { return m.replace(/id="/, '').replace(/"$/, ''); });
  var fors = forMatches.map(function (m) { return m.replace(/for="/, '').replace(/"$/, ''); });

  fors.forEach(function (f) {
    assert(ids.indexOf(f) !== -1, 'Label for="' + f + '" non corrisponde a nessun id');
  });
});

test('Textarea ha spellcheck="false"', function () {
  assertIncludes(html, 'spellcheck="false"', 'spellcheck false mancante nel textarea');
});

test('Pulsante download ha stato disabled iniziale', function () {
  assert(html.match(/id="download-btn"[^>]*disabled/), 'Pulsante download non ha attributo disabled iniziale');
});

/* ── 3. CSS — Design System ───────────────────── */
console.log('\n3. CSS — Design System');

test('File CSS esiste e non è vuoto', function () {
  assert(css.length > 500, 'CSS assente o troppo corto (' + css.length + ' byte)');
});

test('Custom properties (token) definiti', function () {
  assertIncludes(css, '--color-paper', 'Token --color-paper mancante');
  assertIncludes(css, '--color-ink', 'Token --color-ink mancante');
  assertIncludes(css, '--color-crimson', 'Token --color-crimson mancante');
  assertIncludes(css, '--font-display', 'Token --font-display mancante');
  assertIncludes(css, '--font-body', 'Token --font-body mancante');
});

test('prefers-reduced-motion rispettato', function () {
  assertIncludes(css, 'prefers-reduced-motion', 'Media query prefers-reduced-motion mancante');
});

test('Touch target >= 44px', function () {
  assertIncludes(css, '--touch-target', 'Token --touch-target mancante');
  assertIncludes(css, '44px', '44px non presente nel CSS (touch target)');
});

test('Media query responsive presenti', function () {
  assert(css.match(/@media/g).length >= 2, 'Almeno 2 media query responsive attese');
});

test('Line-height adeguato', function () {
  assert(css.match(/line-height:\s*1\.[5-7]/), 'Line-height tra 1.5 e 1.75 non trovato');
});

/* ── 4. JavaScript — Logica applicativa ────────── */
console.log('\n4. JavaScript — Logica applicativa');

test('File JS esiste e non è vuoto', function () {
  assert(js.length > 500, 'JS assente o troppo corto (' + js.length + ' byte)');
});

test('IIFE wrapper presente', function () {
  assert(js.match(/\(function\s*\(/), 'IIFE wrapper mancante');
  assertIncludes(js, "'use strict'", "'use strict' mancante");
});

test('Funzione render presente', function () {
  assertIncludes(js, 'function render()', 'Funzione render() mancante');
});

test('Funzione downloadPNG presente', function () {
  assertIncludes(js, 'function downloadPNG()', 'Funzione downloadPNG() mancante');
});

test('Funzione measureLines presente', function () {
  assertIncludes(js, 'function measureLines(', 'Funzione measureLines() mancante');
});

test('Canvas context acquisito', function () {
  assertIncludes(js, "getContext('2d')", "Canvas 2D context non acquisito");
});

test('canvas.toBlob usato per download', function () {
  assertIncludes(js, '.toBlob(', 'canvas.toBlob non usato per download');
  assertIncludes(js, "image/png", "MIME type image/png non specificato");
});

test('Debounce rendering presente', function () {
  assertIncludes(js, 'setTimeout', 'setTimeout (debounce) non trovato');
});

test('Dot grid overlay implementato', function () {
  assertIncludes(js, 'drawDotGrid', 'Funzione drawDotGrid mancante');
});

test('Checkerboard per trasparenza implementato', function () {
  assertIncludes(js, 'drawCheckerboard', 'Funzione drawCheckerboard mancante');
});

test('Device pixel ratio considerato', function () {
  assertIncludes(js, 'devicePixelRatio', 'devicePixelRatio non considerato');
});

test('Font loading implementato', function () {
  assertIncludes(js, 'document.fonts.load', 'document.fonts.load non usato per caricamento font');
});

test('Stato iniziale impostato', function () {
  assertIncludes(js, 'initState()', 'initState() non chiamato');
});

/* ── 5. File SEO ───────────────────────────────── */
console.log('\n5. File SEO');

test('robots.txt esiste', function () {
  var robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assertIncludes(robots, 'User-agent', 'robots.txt non valido');
  assertIncludes(robots, 'Sitemap:', 'Sitemap URL mancante in robots.txt');
  assertIncludes(robots, 'cristianporco.it', 'URL dominio mancante in robots.txt');
});

test('sitemap.xml esiste e valido', function () {
  var sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assertIncludes(sitemap, '<urlset', 'sitemap.xml non valido (urlset mancante)');
  assertIncludes(sitemap, '<loc>', 'sitemap.xml non valido (loc mancante)');
  assertIncludes(sitemap, 'cristianporco.it/app/convertitore-di-disegni-ascii-art-in-immagini-png/', 'URL canonico non trovato in sitemap');
});

/* ── 6. Test server HTTP ───────────────────────── */
console.log('\n6. Server HTTP (start e verifica)');

test('server.js esiste', function () {
  var serverCode = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  assert(serverCode.length > 200, 'server.js assente o troppo corto');
  assertIncludes(serverCode, 'createServer', 'http.createServer non presente');
  assertIncludes(serverCode, 'process.env.PORT || 4600', 'Porta non corretta (deve usare process.env.PORT || 4600)');
});

/* ── 7. Riepilogo ──────────────────────────────── */
console.log('\n═══ Riepilogo ═══');
console.log('  Passed:  ' + passed);
console.log('  Failed:  ' + failed);
console.log('  Skipped: ' + skipped);
console.log('  Totale:  ' + (passed + failed + skipped));
console.log('');

if (failed > 0) {
  console.log('❌ Alcuni test hanno fallito.\n');
  process.exit(1);
} else {
  console.log('✅ Tutti i test superati.\n');
  process.exit(0);
}
