// Servidor local simples para desenvolver: npm start -> http://localhost:5173
// (Módulos JavaScript não funcionam abrindo o index.html direto do disco.)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORTA = Number(process.env.PORT) || 5173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const servidor = createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, 'http://local').pathname);
    let arquivo = normalize(join(RAIZ, caminho));
    if (!arquivo.startsWith(RAIZ)) {
      res.writeHead(403).end('Proibido');
      return;
    }
    const info = await stat(arquivo).catch(() => null);
    if (info?.isDirectory()) arquivo = join(arquivo, 'index.html');
    const conteudo = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
  }
});

servidor.listen(PORTA, () => {
  console.log(`Trilha rodando em http://localhost:${PORTA}`);
});
