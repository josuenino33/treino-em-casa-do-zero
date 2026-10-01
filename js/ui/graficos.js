// Gráficos em SVG desenhados à mão: linha (com cruz de leitura), colunas e
// mapa de atividade. Cada gráfico tem uma tabela equivalente para leitura
// sem depender de cor ou de passar o dedo.

import { h, s, limpar, numCurto } from './dom.js';
import { diffDias, formatarData, mesCurto, NOMES_DIAS } from '../core/datas.js';

function passoBonito(bruto) {
  const exp = Math.floor(Math.log10(bruto));
  const f = bruto / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

export function escala(min, max, alvo = 4) {
  let a = min;
  let b = max;
  if (a === b) {
    a -= 1;
    b += 1;
  }
  const passo = passoBonito((b - a) / alvo);
  const ini = Math.floor(a / passo) * passo;
  const fim = Math.ceil(b / passo) * passo;
  const marcas = [];
  for (let v = ini; v <= fim + passo / 2; v += passo) marcas.push(Number(v.toFixed(6)));
  return { marcas, min: ini, max: fim };
}

function observarLargura(area, desenhar) {
  let largura = 0;
  const ro = new ResizeObserver(() => {
    const w = Math.floor(area.clientWidth);
    if (!w || w === largura) return;
    largura = w;
    desenhar(w);
  });
  ro.observe(area);
}

function posicionarDica(dica, area, x, y = 8) {
  dica.hidden = false;
  const larg = dica.offsetWidth;
  const total = area.clientWidth;
  let esquerda = x + 12;
  if (esquerda + larg > total) esquerda = x - 12 - larg;
  dica.style.left = `${Math.max(0, esquerda)}px`;
  dica.style.top = `${y}px`;
}

function linhaDica(classe, chave, valor, nome) {
  return h(
    'div',
    { class: 'dica-linha' },
    h('span', { class: `dica-chave ${chave === 'ponto' ? 'chave-ponto' : 'chave-linha'} ${classe}` }),
    h('strong', null, valor),
    nome ? h('span', null, nome) : null,
  );
}

function legenda(series) {
  return h(
    'div',
    { class: 'legenda' },
    series.map((se) =>
      h('span', { class: 'legenda-item' }, h('span', { class: `legenda-chave ${se.tipo === 'pontos' ? 'chave-ponto' : 'chave-linha'} ${se.classe}` }), se.nome),
    ),
  );
}

function tabela(cabecalho, linhas) {
  return h(
    'details',
    { class: 'grafico-tabela' },
    h('summary', null, 'Ver tabela'),
    h(
      'div',
      { class: 'tabela-rolagem' },
      h(
        'table',
        null,
        h('thead', null, h('tr', null, cabecalho.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', null, linhas.map((l) => h('tr', null, l.map((c, i) => (i === 0 ? h('th', { scope: 'row' }, c) : h('td', null, c)))))),
      ),
    ),
  );
}

// series: [{ nome, tipo: 'linha' | 'pontos', classe, pontos: [{ data, valor }] }]
export function graficoLinha({ series, referencia = null, formatar = (v) => numCurto(v), unidade = '', altura = 200, vazio = 'Sem dados ainda.', descricao = '' }) {
  const raiz = h('figure', { class: 'grafico' });
  const datas = [...new Set(series.flatMap((se) => se.pontos.map((p) => p.data)))].sort();
  if (!datas.length) {
    raiz.append(h('p', { class: 'grafico-vazio' }, vazio));
    return raiz;
  }
  if (series.length >= 2) raiz.append(legenda(series));
  const area = h('div', { class: 'grafico-area', style: { height: `${altura}px` } });
  const dica = h('div', { class: 'grafico-dica', hidden: true });
  raiz.append(area);
  const comUnidade = (v) => `${formatar(v)}${unidade ? ` ${unidade}` : ''}`;

  const mapas = series.map((se) => new Map(se.pontos.map((p) => [p.data, p.valor])));
  raiz.append(
    tabela(
      ['Data', ...series.map((se) => se.nome)],
      [...datas].reverse().map((d) => [formatarData(d, { ano: true }), ...mapas.map((m) => (m.has(d) ? comUnidade(m.get(d)) : '—'))]),
    ),
  );

  observarLargura(area, (w) => {
    limpar(area);
    const m = { t: 16, r: 16, b: 26, l: 44 };
    const larguraPlot = w - m.l - m.r;
    const alturaPlot = altura - m.t - m.b;
    const d0 = datas[0];
    const vao = Math.max(1, diffDias(d0, datas.at(-1)));
    const unico = datas.length === 1;
    const xDe = (iso) => m.l + (unico ? larguraPlot / 2 : (diffDias(d0, iso) / vao) * larguraPlot);

    const valores = series.flatMap((se) => se.pontos.map((p) => p.valor));
    if (referencia) valores.push(referencia.valor);
    let vmin = Math.min(...valores);
    let vmax = Math.max(...valores);
    const folga = (vmax - vmin) * 0.08 || 1;
    vmin -= folga;
    vmax += folga;
    const esc = escala(vmin, vmax, alturaPlot < 150 ? 3 : 4);
    const yDe = (v) => m.t + (1 - (v - esc.min) / (esc.max - esc.min)) * alturaPlot;

    const svg = s('svg', { width: w, height: altura, viewBox: `0 0 ${w} ${altura}`, role: 'img', 'aria-label': descricao || series.map((se) => se.nome).join(', ') });

    for (const v of esc.marcas) {
      const y = yDe(v);
      svg.append(
        s('line', { class: 'grade', x1: m.l, x2: w - m.r, y1: y, y2: y }),
        s('text', { class: 'eixo-texto', x: m.l - 8, y, 'text-anchor': 'end', 'dominant-baseline': 'middle' }, formatar(v)),
      );
    }

    const maxRotulos = Math.max(2, Math.floor(larguraPlot / 78));
    const passoRot = Math.max(1, Math.ceil(datas.length / maxRotulos));
    const indices = new Set();
    for (let i = 0; i < datas.length; i += passoRot) indices.add(i);
    indices.add(datas.length - 1);
    if (indices.size > 1) {
      const penultimo = [...indices].sort((a, b) => a - b).at(-2);
      if (xDe(datas.at(-1)) - xDe(datas[penultimo]) < 60) indices.delete(penultimo);
    }
    for (const i of indices) {
      const x = xDe(datas[i]);
      const ancora = unico ? 'middle' : i === 0 ? 'start' : i === datas.length - 1 ? 'end' : 'middle';
      svg.append(s('text', { class: 'eixo-texto', x, y: altura - 8, 'text-anchor': ancora }, formatarData(datas[i])));
    }
    svg.append(s('line', { class: 'eixo', x1: m.l, x2: w - m.r, y1: m.t + alturaPlot, y2: m.t + alturaPlot }));

    if (referencia) {
      const y = yDe(referencia.valor);
      svg.append(
        s('line', { class: 'referencia', x1: m.l, x2: w - m.r, y1: y, y2: y }),
        s('text', { class: 'referencia-texto', x: m.l + 6, y: y - 6 }, `${referencia.rotulo} ${comUnidade(referencia.valor)}`),
      );
    }

    for (const se of series) {
      if (se.tipo === 'pontos') {
        for (const p of se.pontos) svg.append(s('circle', { class: `ponto ${se.classe}`, cx: xDe(p.data), cy: yDe(p.valor), r: 4 }));
      } else if (se.pontos.length) {
        const d = se.pontos.map((p, i) => `${i ? 'L' : 'M'}${xDe(p.data).toFixed(1)},${yDe(p.valor).toFixed(1)}`).join(' ');
        if (se.pontos.length > 1) svg.append(s('path', { class: `linha ${se.classe}`, d }));
        const ultimo = se.pontos.at(-1);
        const ux = xDe(ultimo.data);
        const uy = yDe(ultimo.valor);
        svg.append(s('circle', { class: `ponto ${se.classe}`, cx: ux, cy: uy, r: 4.5 }));
        if (se.rotularFim !== false) {
          const acima = uy - 10 > m.t + 4;
          svg.append(s('text', { class: 'rotulo-fim', x: Math.min(ux, w - m.r), y: acima ? uy - 10 : uy + 18, 'text-anchor': 'end' }, comUnidade(ultimo.valor)));
        }
      }
    }

    // Camada de leitura: cruz vertical que acompanha o dedo/mouse.
    const cruz = s('line', { class: 'cruz', y1: m.t, y2: m.t + alturaPlot, visibility: 'hidden' });
    const marcadores = series.map((se) => s('circle', { class: `ponto marcador ${se.classe}`, r: 5, visibility: 'hidden' }));
    const camada = s('rect', { class: 'camada', x: m.l - 8, y: 0, width: larguraPlot + 16, height: altura, tabindex: 0, 'aria-label': 'Explorar valores com as setas' });
    svg.append(cruz, ...marcadores, camada);
    area.append(svg, dica);

    let atual = -1;
    const mostrar = (i) => {
      atual = Math.max(0, Math.min(datas.length - 1, i));
      const data = datas[atual];
      const x = xDe(data);
      cruz.setAttribute('x1', x);
      cruz.setAttribute('x2', x);
      cruz.setAttribute('visibility', 'visible');
      limpar(dica);
      dica.append(h('div', { class: 'dica-titulo' }, formatarData(data, { ano: true, diaSemana: true })));
      series.forEach((se, k) => {
        const v = mapas[k].get(data);
        const mk = marcadores[k];
        if (v == null) {
          mk.setAttribute('visibility', 'hidden');
          return;
        }
        mk.setAttribute('cx', x);
        mk.setAttribute('cy', yDe(v));
        mk.setAttribute('visibility', 'visible');
        dica.append(linhaDica(se.classe, se.tipo === 'pontos' ? 'ponto' : 'linha', comUnidade(v), series.length > 1 ? se.nome : null));
      });
      posicionarDica(dica, area, x);
    };
    const esconder = () => {
      cruz.setAttribute('visibility', 'hidden');
      for (const mk of marcadores) mk.setAttribute('visibility', 'hidden');
      dica.hidden = true;
    };
    const maisProximo = (px) => {
      let melhor = 0;
      let dist = Infinity;
      datas.forEach((d, i) => {
        const dd = Math.abs(xDe(d) - px);
        if (dd < dist) {
          dist = dd;
          melhor = i;
        }
      });
      return melhor;
    };
    camada.addEventListener('pointermove', (ev) => {
      const r = svg.getBoundingClientRect();
      mostrar(maisProximo(ev.clientX - r.left));
    });
    camada.addEventListener('pointerdown', (ev) => {
      const r = svg.getBoundingClientRect();
      mostrar(maisProximo(ev.clientX - r.left));
    });
    camada.addEventListener('pointerleave', esconder);
    camada.addEventListener('focus', () => mostrar(datas.length - 1));
    camada.addEventListener('blur', esconder);
    camada.addEventListener('keydown', (ev) => {
      const mapaTeclas = { ArrowLeft: atual - 1, ArrowRight: atual + 1, Home: 0, End: datas.length - 1 };
      if (ev.key in mapaTeclas) {
        ev.preventDefault();
        mostrar(mapaTeclas[ev.key]);
      } else if (ev.key === 'Escape') {
        esconder();
      }
    });
  });

  return raiz;
}

function caminhoColuna(x, y, largura, alturaBarra) {
  const r = Math.min(4, largura / 2, alturaBarra);
  const base = y + alturaBarra;
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${base} Z`;
}

// barras: [{ rotulo, rotuloLongo, valor }]
export function graficoColunas({ barras, formatar = (v) => numCurto(v), unidade = '', altura = 170, vazio = 'Sem dados ainda.', descricao = '', nomeSerie = 'Valor' }) {
  const raiz = h('figure', { class: 'grafico' });
  if (!barras.some((b) => b.valor > 0)) {
    raiz.append(h('p', { class: 'grafico-vazio' }, vazio));
    return raiz;
  }
  const area = h('div', { class: 'grafico-area', style: { height: `${altura}px` } });
  const dica = h('div', { class: 'grafico-dica', hidden: true });
  const comUnidade = (v) => `${formatar(v)}${unidade ? ` ${unidade}` : ''}`;
  raiz.append(area, tabela(['Período', nomeSerie], [...barras].reverse().map((b) => [b.rotuloLongo || b.rotulo, comUnidade(b.valor)])));

  observarLargura(area, (w) => {
    limpar(area);
    const m = { t: 22, r: 8, b: 26, l: 36 };
    const larguraPlot = w - m.l - m.r;
    const alturaPlot = altura - m.t - m.b;
    const banda = larguraPlot / barras.length;
    const larguraBarra = Math.max(4, Math.min(24, banda * 0.62));
    const esc = escala(0, Math.max(...barras.map((b) => b.valor)), 3);
    const yDe = (v) => m.t + (1 - v / esc.max) * alturaPlot;
    const svg = s('svg', { width: w, height: altura, viewBox: `0 0 ${w} ${altura}`, role: 'img', 'aria-label': descricao || nomeSerie });

    for (const v of esc.marcas) {
      const y = yDe(v);
      svg.append(
        s('line', { class: v === 0 ? 'eixo' : 'grade', x1: m.l, x2: w - m.r, y1: y, y2: y }),
        s('text', { class: 'eixo-texto', x: m.l - 8, y, 'text-anchor': 'end', 'dominant-baseline': 'middle' }, formatar(v)),
      );
    }

    const iMax = barras.reduce((mi, b, i) => (b.valor > barras[mi].valor ? i : mi), 0);
    const iUlt = barras.length - 1;
    const cada = Math.max(1, Math.ceil(barras.length / Math.max(2, Math.floor(larguraPlot / 44))));
    const colunas = barras.map((b, i) => {
      const cx = m.l + banda * i + banda / 2;
      if (i % cada === 0 || i === iUlt) {
        if (i === iUlt || iUlt - i >= cada) svg.append(s('text', { class: 'eixo-texto', x: cx, y: altura - 8, 'text-anchor': 'middle' }, b.rotulo));
      }
      if (!(b.valor > 0)) return null;
      const y = yDe(b.valor);
      const col = s('path', { class: 'coluna', d: caminhoColuna(cx - larguraBarra / 2, y, larguraBarra, m.t + alturaPlot - y) });
      svg.append(col);
      if (i === iMax || i === iUlt) svg.append(s('text', { class: 'rotulo-fim', x: cx, y: y - 6, 'text-anchor': 'middle' }, formatar(b.valor)));
      return col;
    });

    const camada = s('rect', { class: 'camada', x: m.l, y: 0, width: larguraPlot, height: altura, tabindex: 0, 'aria-label': 'Explorar valores com as setas' });
    svg.append(camada);
    area.append(svg, dica);

    let atual = -1;
    const mostrar = (i) => {
      atual = Math.max(0, Math.min(iUlt, i));
      colunas.forEach((c, k) => c?.classList.toggle('ativa', k === atual));
      const b = barras[atual];
      limpar(dica);
      dica.append(h('div', { class: 'dica-titulo' }, b.rotuloLongo || b.rotulo), linhaDica('', 'barra', comUnidade(b.valor), null));
      posicionarDica(dica, area, m.l + banda * atual + banda / 2);
    };
    const esconder = () => {
      colunas.forEach((c) => c?.classList.remove('ativa'));
      dica.hidden = true;
    };
    const indice = (ev) => Math.floor((ev.clientX - svg.getBoundingClientRect().left - m.l) / banda);
    camada.addEventListener('pointermove', (ev) => mostrar(indice(ev)));
    camada.addEventListener('pointerdown', (ev) => mostrar(indice(ev)));
    camada.addEventListener('pointerleave', esconder);
    camada.addEventListener('focus', () => mostrar(iUlt));
    camada.addEventListener('blur', esconder);
    camada.addEventListener('keydown', (ev) => {
      const mapa = { ArrowLeft: atual - 1, ArrowRight: atual + 1, Home: 0, End: iUlt };
      if (ev.key in mapa) {
        ev.preventDefault();
        mostrar(mapa[ev.key]);
      }
    });
  });
  return raiz;
}

// semanas: [[{ data, nivel, futuro }, ...7], ...]
export function mapaAtividade({ semanas, rotulos }) {
  const raiz = h('figure', { class: 'grafico mapa' });
  const dica = h('div', { class: 'grafico-dica', hidden: true });
  const grade = h('div', { class: 'mapa-grade', role: 'grid', 'aria-label': 'Atividade por dia' });
  const meses = h('div', { class: 'mapa-meses', 'aria-hidden': 'true' });
  let mesAnterior = null;
  semanas.forEach((semana) => {
    const mes = mesCurto(semana[0].data);
    meses.append(h('span', null, mes !== mesAnterior ? mes : ''));
    mesAnterior = mes;
    for (const dia of semana) {
      const texto = `${formatarData(dia.data, { diaSemana: true })}: ${dia.futuro ? 'ainda não chegou' : rotulos[dia.nivel]}`;
      const cel = h('span', { class: `mapa-celula n${dia.futuro ? 'f' : dia.nivel}`, role: 'gridcell', 'aria-label': texto, tabindex: -1 });
      cel.addEventListener('pointerenter', () => {
        dica.textContent = texto;
        const r = cel.getBoundingClientRect();
        const base = raiz.getBoundingClientRect();
        posicionarDica(dica, raiz, r.left - base.left, r.top - base.top - 40);
      });
      cel.addEventListener('pointerleave', () => {
        dica.hidden = true;
      });
      grade.append(cel);
    }
  });
  const dias = h('div', { class: 'mapa-dias', 'aria-hidden': 'true' }, [1, 2, 3, 4, 5, 6, 0].map((d) => h('span', null, d % 2 ? NOMES_DIAS[d] : '')));
  const legendaEl = h(
    'div',
    { class: 'legenda mapa-legenda' },
    rotulos.map((r, i) => h('span', { class: 'legenda-item' }, h('span', { class: `mapa-celula n${i}` }), r)),
  );
  const linhas = semanas.map((sem) => {
    const forca = sem.filter((d) => d.nivel >= 2).length;
    const caminhada = sem.filter((d) => d.nivel === 1 || d.nivel === 3).length;
    return [`Semana de ${formatarData(sem[0].data)}`, String(forca), String(caminhada)];
  });
  // A grade rola na horizontal; começa mostrando as semanas mais recentes.
  const rolagem = h('div', { class: 'mapa-rolagem' }, meses, grade);
  raiz.append(
    h('div', { class: 'mapa-corpo' }, dias, rolagem),
    dica,
    legendaEl,
    tabela(['Semana', 'Dias de força', 'Dias de caminhada'], linhas.reverse()),
  );
  setTimeout(() => {
    rolagem.scrollLeft = rolagem.scrollWidth;
  }, 0);
  return raiz;
}
