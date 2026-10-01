// Desenho do trajeto da caminhada (só o formato, sem mapa de fundo: não
// depende de internet e não envia sua localização para nenhum serviço).

import { s } from './dom.js';

export function desenharRota(rota, { largura = 260, altura = 140 } = {}) {
  if (!rota || rota.length < 2) return null;
  const lat0 = rota[0][0];
  const cos = Math.cos((lat0 * Math.PI) / 180);
  const pts = rota.map(([lat, lon]) => [(lon - rota[0][1]) * cos * 111320, -(lat - lat0) * 111320]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1;
  const hh = Math.max(...ys) - minY || 1;
  const margem = 12;
  const k = Math.min((largura - 2 * margem) / w, (altura - 2 * margem) / hh);
  const ox = (largura - w * k) / 2;
  const oy = (altura - hh * k) / 2;
  const tela = pts.map(([x, y]) => [ox + (x - minX) * k, oy + (y - minY) * k]);
  const d = tela.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const [x0, y0] = tela[0];
  const [x1, y1] = tela.at(-1);
  return s(
    'svg',
    { class: 'rota', viewBox: `0 0 ${largura} ${altura}`, role: 'img', 'aria-label': 'Formato do trajeto da caminhada' },
    s('path', { class: 'rota-linha', d }),
    s('circle', { class: 'rota-inicio', cx: x0, cy: y0, r: 5 }),
    s('circle', { class: 'rota-fim', cx: x1, cy: y1, r: 5 }),
  );
}
