/* ═══════════════════════════════════════════════════════════════
   Server minimale — serve i file statici su porta 4600
   ═══════════════════════════════════════════════════════════════ */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4600;
const HOST = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2':'font/woff2'
};

const ROOT = __dirname;

const server = http.createServer(function (req, res) {
  // Normalize URL: strip query, decode, prevent directory traversal
  var urlPath = req.url.split('?')[0];
  urlPath = decodeURIComponent(urlPath);

  // Security: prevent path traversal
  if (urlPath.indexOf('..') !== -1) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Default to index.html
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  var filePath = path.join(ROOT, urlPath);
  var ext = path.extname(filePath).toLowerCase();
  var contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, function (err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, HOST, function () {
  console.log('Server avviato su http://' + HOST + ':' + PORT);
  console.log('URL locale: http://localhost:' + PORT);
});
