// Service worker: guarda o app no aparelho para funcionar sem internet.
// Na publicação (GitHub Actions), __VERSAO__ vira o hash do commit, então
// cada deploy cria um cache novo e o app avisa que há atualização.

const VERSAO = 'trilha-__VERSAO__';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './js/main.js',
  './js/versao.js',
  './js/core/armazem.js',
  './js/core/datas.js',
  './js/core/esquema.js',
  './js/core/fotos.js',
  './js/data/guia.js',
  './js/data/movimentos.js',
  './js/data/trilhas.js',
  './js/logic/boneco.js',
  './js/logic/calendario.js',
  './js/logic/conquistas.js',
  './js/logic/estatisticas.js',
  './js/logic/gps.js',
  './js/logic/pausas.js',
  './js/logic/nutricao.js',
  './js/logic/passos.js',
  './js/logic/plano.js',
  './js/logic/progressao.js',
  './js/ui/componentes.js',
  './js/ui/dom.js',
  './js/ui/figura.js',
  './js/ui/graficos.js',
  './js/ui/icones.js',
  './js/ui/instalar.js',
  './js/ui/rota.js',
  './js/ui/sensores.js',
  './js/ui/som.js',
  './js/ui/tema.js',
  './js/views/acoes.js',
  './js/views/boasvindas.js',
  './js/views/caminhada.js',
  './js/views/config.js',
  './js/views/fotos.js',
  './js/views/hoje.js',
  './js/views/mais.js',
  './js/views/nutricao.js',
  './js/views/pausa.js',
  './js/views/progresso.js',
  './js/views/testes.js',
  './js/views/treino.js',
  './js/views/trilha.js',
];

// Em desenvolvimento (localhost), busca sempre da rede para ver as mudanças na hora.
const DESENVOLVIMENTO = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c.startsWith('trilha-') && c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (ev) => {
  if (ev.data?.tipo === 'pular-espera') self.skipWaiting();
});

async function daRede(req) {
  const resp = await fetch(req);
  if (resp.ok && resp.type === 'basic') {
    const copia = resp.clone();
    caches.open(VERSAO).then((cache) => cache.put(req, copia));
  }
  return resp;
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (DESENVOLVIMENTO) {
    ev.respondWith(daRede(req).catch(() => caches.match(req)));
    return;
  }

  if (req.mode === 'navigate') {
    ev.respondWith(caches.match('./index.html').then((r) => r || daRede(req)));
    return;
  }

  ev.respondWith(caches.match(req).then((r) => r || daRede(req)));
});
