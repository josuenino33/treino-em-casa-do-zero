// Ícones de traço em grade 24×24, desenhados para o app.

import { s } from './dom.js';

const TRACOS = {
  inicio: ['M3 11l9-7 9 7', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  trilha: ['M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7', { c: [5.5, 19, 2] }, { c: [18.5, 7, 2] }],
  progresso: ['M3 20h18', 'M7 16v-4', 'M12 16V7', 'M17 16v-7'],
  nutricao: ['M12 8c-2-3-7-3-8 1-1 5 3 11 8 11s9-6 8-11c-1-4-6-4-8-1z', 'M12 8c0-2 1-4 3-5'],
  mais: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  play: ['M8 5l11 7-11 7z'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  somar: ['M12 5v14', 'M5 12h14'],
  subtrair: ['M5 12h14'],
  relogio: [{ c: [12, 13, 8] }, 'M12 9v4l2.5 2', 'M9.5 2.5h5'],
  cadeado: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  trofeu: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H5a3 3 0 0 0 3 4', 'M16 6h3a3 3 0 0 1-3 4', 'M12 13v4', 'M8.5 21h7', 'M10 17h4v4h-4z'],
  chama: ['M12 3c.5 3 4.5 5 4.5 10a4.5 4.5 0 0 1-9 0c0-2.5 1.5-3.5 2-5.5 1.5 1 2.5 2.5 2.5 4.5 1-1 1.5-2.5 1-5'],
  balanca: ['M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 10a5 5 0 0 1 8 0', 'M12 10l1.5-2.5'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', { c: [12, 13, 3.5] }],
  ajustes: ['M4 6h9', 'M17 6h3', 'M4 12h3', 'M11 12h9', 'M4 18h11', 'M19 18h1', { c: [15, 6, 2] }, { c: [9, 12, 2] }, { c: [17, 18, 2] }],
  direita: ['M9 6l6 6-6 6'],
  esquerda: ['M15 6l-6 6 6 6'],
  caminhada: [{ c: [13, 4.5, 2] }, 'M10 21l2-6 3 3v3', 'M12 15l-.5-5-3.5 2.5V15', 'M11.5 10l4 2.5 2.5-.5'],
  forca: ['M6.5 7v10', 'M17.5 7v10', 'M3.5 9.5v5', 'M20.5 9.5v5', 'M6.5 12h11'],
  alerta: ['M12 3.5l9.5 16.5h-19z', 'M12 10v4.5', 'M12 17.5v.01'],
  info: [{ c: [12, 12, 9] }, 'M12 11v5', 'M12 8v.01'],
  coracao: ['M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z'],
  livro: ['M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z', 'M5 19.5A1.5 1.5 0 0 0 6.5 21H19'],
  historico: ['M3.5 12a8.5 8.5 0 1 0 2.5-6', 'M3.5 4v4h4', 'M12 8v4l3 2'],
  baixar: ['M12 4v11', 'M7 10.5l5 5 5-5', 'M5 20h14'],
  enviar: ['M12 20V9', 'M7 13.5l5-5 5 5', 'M5 4h14'],
  calendario: ['M4 6h16v14H4z', 'M4 10.5h16', 'M8.5 3.5v4', 'M15.5 3.5v4'],
  lixeira: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6.5 7l1 13h9l1-13'],
  editar: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  pausa: ['M8.5 5v14', 'M15.5 5v14'],
  pular: ['M6 5.5l9 6.5-9 6.5z', 'M18 5.5v13'],
  alvo: [{ c: [12, 12, 9] }, { c: [12, 12, 5] }, { c: [12, 12, 1] }],
  estrela: ['M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z'],
  agua: ['M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z'],
  sono: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'],
  subir: ['M12 19V5', 'M6 11l6-6 6 6'],
  descer: ['M12 5v14', 'M6 13l6 6 6-6'],
  escudo: ['M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z', 'M9 12l2 2 4-4'],
  fita: ['M4 17l13-13 3 3L7 20z', 'M8 13l1.5 1.5', 'M11 10l1.5 1.5', 'M14 7l1.5 1.5'],
};

export function icone(nome, { tamanho = 20, classe = '', rotulo = null } = {}) {
  const tracos = TRACOS[nome] || TRACOS.info;
  const filhos = tracos.map((t) => (typeof t === 'string' ? s('path', { d: t }) : s('circle', { cx: t.c[0], cy: t.c[1], r: t.c[2] })));
  return s(
    'svg',
    {
      class: `icone ${classe}`.trim(),
      width: tamanho,
      height: tamanho,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.8,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': rotulo ? null : 'true',
      role: rotulo ? 'img' : null,
      'aria-label': rotulo,
    },
    ...filhos,
  );
}
