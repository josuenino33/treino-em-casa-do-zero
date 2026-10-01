// Ilustração animada de um exercício: o boneco repete o movimento em loop,
// com os objetos da cena (cadeira, mesa, sofá...). Funciona offline.
//
// Respeita "reduzir movimento" do sistema: aí mostra a pose principal parada,
// com a outra posição em transparência, e um botão para animar.

import { ALTURA, CHAO, CORPO, LARGURA, enquadrar, esqueleto, interpolar, preparar } from '../logic/boneco.js';
import { montarMovimento } from '../data/movimentos.js';
import { h, s } from './dom.js';
import { icone } from './icones.js';

const suave = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

function desenharCena(cena) {
  return cena.map((o) => {
    const classe = `fig-objeto ${o.classe ? `fig-${o.classe}` : ''}`.trim();
    if (o.tipo === 'ret') return s('rect', { class: classe, x: o.x, y: o.y, width: o.w, height: o.h, rx: o.r || 0 });
    if (o.tipo === 'circulo') return s('circle', { class: `${classe} fig-preenchido`, cx: o.cx, cy: o.cy, r: o.r });
    return s('line', { class: `${classe} fig-traco`, x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 });
  });
}

// Cria os elementos do boneco uma vez; 'atualizar' só muda coordenadas.
function criarBoneco(classeExtra = '') {
  const g = s('g', { class: `fig-boneco ${classeExtra}`.trim() });
  const pl = (classe) => s('polyline', { class: classe });
  const partes = {
    pernaLonge: pl('fig-membro fig-longe fig-perna'),
    bracoLonge: pl('fig-membro fig-longe fig-braco'),
    tronco: s('line', { class: 'fig-tronco' }),
    pescoco: s('line', { class: 'fig-pescoco' }),
    cabeca: s('circle', { class: 'fig-cabeca', r: CORPO.cabeca }),
    pernaPerto: pl('fig-membro fig-perto fig-perna'),
    bracoPerto: pl('fig-membro fig-perto fig-braco'),
    mochila: s('rect', { class: 'fig-mochila', rx: 4, visibility: 'hidden' }),
  };
  g.append(...Object.values(partes));
  const pts = (...ps) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  g.atualizar = (e) => {
    partes.pernaLonge.setAttribute('points', pts(e.quadril, e.pernaLonge.joelho, e.pernaLonge.tornozelo, e.pernaLonge.dedo));
    partes.pernaPerto.setAttribute('points', pts(e.quadril, e.pernaPerto.joelho, e.pernaPerto.tornozelo, e.pernaPerto.dedo));
    partes.bracoLonge.setAttribute('points', pts(e.ombro, e.bracoLonge.cotovelo, e.bracoLonge.pulso, e.bracoLonge.ponta));
    partes.bracoPerto.setAttribute('points', pts(e.ombro, e.bracoPerto.cotovelo, e.bracoPerto.pulso, e.bracoPerto.ponta));
    for (const [el, a, b] of [[partes.tronco, e.quadril, e.ombro], [partes.pescoco, e.ombro, e.pescoco]]) {
      el.setAttribute('x1', a[0]);
      el.setAttribute('y1', a[1]);
      el.setAttribute('x2', b[0]);
      el.setAttribute('y2', b[1]);
    }
    partes.cabeca.setAttribute('cx', e.cabeca[0]);
    partes.cabeca.setAttribute('cy', e.cabeca[1]);
    if (e.mochila) {
      const tam = e.mochilaTam || 1;
      const w = 16 * tam;
      const hh = 20 * tam;
      let c;
      if (e.mochila === 'mp') c = [e.bracoPerto.pulso[0], e.bracoPerto.pulso[1] + hh / 2 + 2];
      else if (e.mochila === 'quadril') c = [e.quadril[0] + 2, e.quadril[1] - hh / 2 - 6];
      else {
        const u = [(e.ombro[0] - e.quadril[0]) / CORPO.tronco, (e.ombro[1] - e.quadril[1]) / CORPO.tronco];
        c = [e.ombro[0] - u[0] * 20 - u[1] * 16, e.ombro[1] - u[1] * 20 + u[0] * 16];
      }
      partes.mochila.setAttribute('x', c[0] - w / 2);
      partes.mochila.setAttribute('y', c[1] - hh / 2);
      partes.mochila.setAttribute('width', w);
      partes.mochila.setAttribute('height', hh);
      partes.mochila.setAttribute('visibility', 'visible');
    } else {
      partes.mochila.setAttribute('visibility', 'hidden');
    }
  };
  return g;
}

// Linha do tempo: segura no quadro i, depois vai para o próximo.
function linhaDoTempo(quadros) {
  const etapas = [];
  quadros.forEach((qd, i) => {
    const prox = (i + 1) % quadros.length;
    if (qd.segurar > 0) etapas.push({ de: i, para: i, dur: qd.segurar });
    etapas.push({ de: i, para: prox, dur: quadros[prox].ir });
  });
  const total = etapas.reduce((a, e) => a + e.dur, 0);
  return { etapas, total };
}

function poseNoTempo(preparadas, tempo, t) {
  let resto = t % tempo.total;
  for (const e of tempo.etapas) {
    if (resto <= e.dur) {
      if (e.de === e.para) return preparadas[e.de];
      return interpolar(preparadas[e.de], preparadas[e.para], suave(e.dur ? resto / e.dur : 1));
    }
    resto -= e.dur;
  }
  return preparadas[0];
}

function base(mov, rotulo) {
  const preparadas = mov.quadros.map((q) => preparar(q.p));
  const esqueletos = preparadas.map(esqueleto);
  const { cx, k } = enquadrar(esqueletos, mov.cena);
  const svg = s('svg', { class: 'fig-svg', viewBox: `0 0 ${LARGURA} ${ALTURA}`, role: 'img', 'aria-label': rotulo });
  const mundo = s('g', { transform: `translate(${LARGURA / 2} ${CHAO}) scale(${k.toFixed(3)}) translate(${(-cx).toFixed(1)} ${-CHAO})` });
  svg.append(s('line', { class: 'fig-chao', x1: 0, y1: CHAO + 1, x2: LARGURA, y2: CHAO + 1 }), mundo);
  mundo.append(...desenharCena(mov.cena));
  return { svg, mundo, preparadas, esqueletos };
}

// Desenho parado e pequeno (para listas). 'quadro' escolhe a pose; padrão é a capa.
export function miniFigura(anim, rotulo = '', quadro = null) {
  const mov = montarMovimento(anim);
  if (!mov) return null;
  const { svg, mundo, esqueletos } = base(mov, rotulo);
  svg.classList.add('fig-mini');
  if (!rotulo) svg.setAttribute('aria-hidden', 'true');
  const boneco = criarBoneco();
  mundo.append(boneco);
  boneco.atualizar(esqueletos[quadro ?? mov.capa ?? 0]);
  return svg;
}

const reduzirMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function figuraExercicio(anim, { rotulo = 'Ilustração do exercício', compacta = false } = {}) {
  const mov = montarMovimento(anim);
  if (!mov) return null;
  const { svg, mundo, preparadas, esqueletos } = base(mov, rotulo);
  const tempo = linhaDoTempo(mov.quadros);
  const capa = mov.capa ?? 0;
  const outro = mov.quadros.length > 1 ? (capa === 0 ? 1 : 0) : null;

  const fantasma = criarBoneco('fig-fantasma');
  const boneco = criarBoneco();
  mundo.append(fantasma, boneco);
  if (outro != null) fantasma.atualizar(esqueletos[outro]);

  let tocando = !reduzirMovimento();
  let visivel = false;
  let quadroId = null;
  let inicio = null;
  let acumulado = 0;

  const botao = h('button', { type: 'button', class: 'fig-botao', 'aria-pressed': 'false' });
  const desenharBotao = () => {
    botao.replaceChildren(icone(tocando ? 'pausa' : 'play', { tamanho: 16 }));
    botao.setAttribute('aria-label', tocando ? 'Pausar animação' : 'Animar');
    botao.setAttribute('aria-pressed', String(tocando));
    fantasma.setAttribute('visibility', tocando ? 'hidden' : 'visible');
  };

  const passo = (agora) => {
    if (!svg.isConnected) {
      parar();
      return;
    }
    if (inicio == null) inicio = agora - acumulado * 1000;
    acumulado = (agora - inicio) / 1000;
    boneco.atualizar(esqueleto(poseNoTempo(preparadas, tempo, acumulado)));
    quadroId = requestAnimationFrame(passo);
  };
  const rodar = () => {
    if (quadroId == null && tocando && visivel) {
      inicio = null;
      quadroId = requestAnimationFrame(passo);
    }
  };
  function parar() {
    if (quadroId != null) cancelAnimationFrame(quadroId);
    quadroId = null;
  }

  botao.addEventListener('click', () => {
    tocando = !tocando;
    desenharBotao();
    if (tocando) rodar();
    else {
      parar();
      acumulado = 0;
      boneco.atualizar(esqueletos[capa]);
    }
  });

  boneco.atualizar(esqueletos[capa]);
  desenharBotao();

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      visivel = entradas.some((en) => en.isIntersecting);
      if (visivel) rodar();
      else parar();
      if (!svg.isConnected && !document.contains(svg)) obs.disconnect();
    });
    obs.observe(svg);
  } else {
    visivel = true;
    setTimeout(rodar, 0);
  }

  return h(
    'figure',
    { class: `fig ${compacta ? 'fig-compacta' : ''}`.trim() },
    svg,
    botao,
    mov.legenda ? h('figcaption', { class: 'fig-legenda' }, mov.legenda) : null,
  );
}
