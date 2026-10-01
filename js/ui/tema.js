// Tema claro/escuro: 'auto' segue o sistema; os outros fixam no <html>.

const CORES = { light: '#f9f9f7', dark: '#0d0d0d' };

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro') raiz.dataset.theme = 'light';
  else if (tema === 'escuro') raiz.dataset.theme = 'dark';
  else delete raiz.dataset.theme;
  atualizarCorBarra();
}

export function atualizarCorBarra() {
  const raiz = document.documentElement;
  const escuro = raiz.dataset.theme === 'dark' || (!raiz.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', escuro ? CORES.dark : CORES.light);
}

export function observarTemaDoSistema() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', atualizarCorBarra);
}
