// Coreografia das ilustrações: para cada tipo de exercício, as poses-chave do
// boneco, os objetos da cena (cadeira, mesa, sofá...) e o tempo de cada fase.
//
// Cada gerador devolve { cena, quadros, legenda, capa }:
//   cena    lista de objetos estáticos
//   quadros [{ p: pose, ir: segundos para chegar, segurar: segundos parado }]
//   capa    índice do quadro que melhor resume o exercício (desenho parado)

import { BRACO, CHAO, CORPO, PERNA, angulo, distancia, ponto } from '../logic/boneco.js';

const T = CHAO - 7; // altura do tornozelo com o pé no chão
const ASSENTO = CHAO - 45; // assento de cadeira/sofá

// ---------- Objetos da cena ----------
const ret = (x, y, w, h, extra = {}) => ({ tipo: 'ret', x, y, w, h, ...extra });
const linha = (x1, y1, x2, y2, extra = {}) => ({ tipo: 'linha', x1, y1, x2, y2, ...extra });
const circulo = (cx, cy, r, extra = {}) => ({ tipo: 'circulo', cx, cy, r, ...extra });

function cadeira(x, encosto = 'esq') {
  const xe = encosto === 'esq' ? x : x + 38;
  return [
    ret(x, ASSENTO, 42, 6, { r: 2 }),
    linha(x + 4, ASSENTO + 6, x + 4, CHAO),
    linha(x + 38, ASSENTO + 6, x + 38, CHAO),
    ret(xe, ASSENTO - 46, 5, 46, { r: 2 }),
  ];
}

function mesa(x, largura, altura) {
  const topo = CHAO - altura;
  return [ret(x, topo, largura, 6, { r: 2 }), linha(x + 6, topo + 6, x + 6, CHAO), linha(x + largura - 6, topo + 6, x + largura - 6, CHAO)];
}

const caixa = (x, largura, altura) => [ret(x, CHAO - altura, largura, altura, { r: 3 })];

function sofa(x, largura, encosto = 'esq') {
  const xe = encosto === 'esq' ? x : x + largura - 14;
  return [ret(x, ASSENTO, largura, CHAO - ASSENTO, { r: 6 }), ret(xe, ASSENTO - 44, 14, 50, { r: 6 })];
}

const parede = (x) => [ret(x, 8, 8, CHAO - 8)];
const batente = (x) => [ret(x, 14, 6, CHAO - 14)];

// ---------- Ajudas de pose ----------
const pePlano = (t, frente = 1) => [t[0] + 15 * frente, t[1] + 6];
const pePonta = (t) => [t[0] + 4, t[1] + 12]; // dedos no chão, calcanhar para cima
const peParaCima = (t) => [t[0] + 4, t[1] - 15];
const deOmbro = (o, dx, dy) => [o[0] + dx, o[1] + dy];
const soltos = (o) => [deOmbro(o, 6, 53), deOmbro(o, 2, 53)];

// Ponto no referencial do tronco: 'a' ao longo do tronco (negativo = para o
// quadril), 'b' para a frente do peito.
function noTronco(q, o, a, b) {
  const len = distancia(q, o);
  const u = [(o[0] - q[0]) / len, (o[1] - q[1]) / len];
  const n = [-u[1], u[0]];
  return [o[0] + u[0] * a + n[0] * b, o[1] + u[1] * a + n[1] * b];
}

function emPe(x, extra = {}) {
  const q = [x, T - PERNA + 1];
  const o = [x + 1, q[1] - CORPO.tronco];
  const [mp, ml] = soltos(o);
  const pp = [x + 3, T];
  const pl = [x - 2, T];
  return { q, o, mp, ml, pp, pl, dp: pePlano(pp), dl: pePlano(pl), ...extra };
}

// Corpo reto a partir do tornozelo A, no ângulo θ.
const linhaCorpo = (A, theta) => {
  const q = ponto(A, theta, PERNA - 0.5);
  return { q, o: ponto(q, theta, CORPO.tronco) };
};

// Anda de 'de' até 'ate' e devolve o primeiro ângulo θ em que f(θ) troca de
// sinal (a primeira solução no caminho do movimento). Sem troca, devolve o
// ponto em que |f| foi menor.
function resolver(f, de, ate, passo = 0.1) {
  const dir = de < ate ? 1 : -1;
  let anterior = f(de);
  let melhor = de;
  let menor = Math.abs(anterior);
  for (let th = de + dir * passo; dir > 0 ? th <= ate : th >= ate; th += dir * passo) {
    const v = f(th);
    if (Math.sign(v) !== Math.sign(anterior) || v === 0) return th;
    if (Math.abs(v) < menor) {
      menor = Math.abs(v);
      melhor = th;
    }
    anterior = v;
  }
  return melhor;
}

const quadro = (p, ir, segurar = 0.3) => ({ p, ir, segurar });

// ---------- Geradores por tipo ----------

function sentar({ maos = 'cruzadas' }) {
  const pe = [142, T];
  const base = { pp: pe, pl: [138, T], dp: pePlano(pe), dl: pePlano([138, T]) };
  const poseCom = (q, troncoAng, maosNoJoelho) => {
    const o = ponto(q, troncoAng, CORPO.tronco);
    let mp;
    let ml;
    if (maos === 'joelhos' && maosNoJoelho) {
      mp = [q[0] + 40, q[1] + 2];
      ml = [q[0] + 37, q[1] + 2];
    } else if (maos === 'joelhos') {
      [mp, ml] = soltos(o);
    } else {
      mp = noTronco(q, o, -16, 12);
      ml = noTronco(q, o, -12, 10);
    }
    return { q, o, mp, ml, ...base, cp: [0, 1] };
  };
  const emPePose = poseCom([138, T - PERNA + 1], 88, false);
  const inclinado = poseCom([108, 127], 45, true);
  const sentado = poseCom([99, 132], 80, true);
  return {
    cena: cadeira(62),
    quadros: [quadro(emPePose, 0.7, 0.7), quadro(inclinado, 1.5, 0), quadro(sentado, 1.4, 0.4), quadro(inclinado, 0.6, 0)],
    capa: 2,
  };
}

function agachamento({ cadeira: comCadeira = false, apoio = false, mochila = false, pausa = 0, descida = 1.4, profundidade = 1 }) {
  const pe = [134, T];
  const pes = { pp: pe, pl: [130, T], dp: pePlano(pe), dl: pePlano([130, T]) };
  const topoQ = [130, T - PERNA + 1];
  const fundoQ = [130 + (102 - 130) * profundidade, topoQ[1] + ((comCadeira ? 135 : 138) - topoQ[1]) * profundidade];
  const angFundo = apoio ? 70 : mochila ? 64 : 58;
  const poseCom = (q, ang, fundo) => {
    const o = ponto(q, ang, CORPO.tronco);
    let mp;
    let ml;
    let cp = [0, 1];
    if (apoio) {
      mp = [167, 84];
      ml = [165, 86];
      cp = [0, 1];
    } else if (mochila) {
      mp = noTronco(q, o, -16, 16);
      ml = noTronco(q, o, -14, 14);
    } else if (fundo) {
      mp = deOmbro(o, 50, 2);
      ml = deOmbro(o, 48, 4);
    } else {
      [mp, ml] = soltos(o);
    }
    return { q, o, mp, ml, ...pes, cp, mochila: mochila ? 'peito' : null };
  };
  const cena = [];
  if (comCadeira) cena.push(...cadeira(66));
  if (apoio) cena.push(...batente(170));
  return {
    cena,
    quadros: [quadro(poseCom(topoQ, 89, false), 1.0, 0.6), quadro(poseCom(fundoQ, angFundo, true), descida, pausa || 0.2)],
    capa: 1,
  };
}

function flexao({ altura = 0, parede: naParede = false, pes = 0, descida = 1.3, maosJuntas = false }) {
  const cena = [];
  let A;
  let dedo;
  let thetaTopo;
  let mao;
  const maoDir = naParede ? 90 : 0;

  if (naParede) {
    A = [70, T];
    dedo = pePlano(A);
    thetaTopo = 74;
    const { o } = linhaCorpo(A, thetaTopo);
    mao = [o[0] + 51, o[1] + 8];
    cena.push(...parede(mao[0] + 3));
  } else {
    const yApoio = CHAO - pes;
    A = [36, yApoio - 13];
    dedo = pePonta(A);
    if (pes) cena.push(...caixa(4, 56, pes));
    const alvoY = CHAO - altura - 3;
    const perp = (th) => [Math.sin((th * Math.PI) / 180), Math.cos((th * Math.PI) / 180)];
    thetaTopo = resolver((th) => {
      const { o } = linhaCorpo(A, th);
      return o[1] + BRACO * 0.97 * perp(th)[1] - alvoY;
    }, -30, 85);
    const { o } = linhaCorpo(A, thetaTopo);
    const p = perp(thetaTopo);
    mao = [o[0] + BRACO * 0.97 * p[0], alvoY];
    if (altura >= 80) cena.push(...caixa(mao[0] - 10, 70, altura));
    else if (altura >= 60) cena.push(...mesa(mao[0] - 12, 84, altura));
    else if (altura >= 35) cena.push(...sofa(mao[0] - 10, 70, 'dir'));
    else if (altura > 0) cena.push(...caixa(mao[0] - 12, 52, altura));
  }

  // Mãos juntas (diamante): embaixo do peito, mais perto dos pés.
  if (maosJuntas) mao = [mao[0] - 9, mao[1]];
  const fundo = naParede ? 30 : 24;
  const thetaFundo = resolver((th) => distancia(linhaCorpo(A, th).o, mao) - fundo, thetaTopo, thetaTopo - 60);
  const cotovelo = naParede ? [-0.5, 1] : [-1, -0.7];
  const pose = (th) => {
    const { q, o } = linhaCorpo(A, th);
    // Braço e perna de trás ficam exatamente atrás dos da frente.
    return { q, o, c: naParede ? th + 12 : th, mp: mao, ml: mao, pp: A, pl: A, dp: dedo, dl: dedo, cp: cotovelo, maoDir };
  };
  return { cena, quadros: [quadro(pose(thetaTopo), 1.0, 0.5), quadro(pose(thetaFundo), descida, 0.25)], capa: 1 };
}

function remada({ pesada = false, pausa = 0 }) {
  const cena = [ret(100, ASSENTO, 112, 7, { r: 2 }), linha(106, ASSENTO + 7, 106, CHAO), linha(206, ASSENTO + 7, 206, CHAO)];
  const q = [128, 104];
  const o = ponto(q, 14, CORPO.tronco);
  const base = {
    q,
    o,
    c: -10,
    ml: [201, ASSENTO - 3],
    pp: [98, T],
    dp: pePlano([98, T]),
    pl: [114, ASSENTO - 6],
    dl: [101, ASSENTO - 3],
    kl: [156, ASSENTO - 5],
    cl: [-1, -0.3],
    mochila: 'mp',
    mochilaTam: pesada ? 1.25 : 0.9,
  };
  const baixo = { ...base, mp: [180, 146], cp: [-0.3, 1] };
  const alto = { ...base, mp: [151, 112], cp: [-0.2, -1] };
  return { cena, quadros: [quadro(baixo, 1.4, 0.4), quadro(alto, 0.9, pausa || 0.3)], capa: 1 };
}

function invertida({ barra = 120 }) {
  const barraY = CHAO - barra;
  const phi = barra >= 110 ? 58 : barra >= 85 ? 38 : 14;
  const A = [34, CHAO - 8];
  const dedo = peParaCima(A);
  const cosPhi = Math.cos((phi * Math.PI) / 180);
  const sinTheta = (A[1] - BRACO * 0.98 * cosPhi - barraY) / (PERNA + CORPO.tronco);
  const theta = (Math.asin(Math.max(-1, Math.min(1, sinTheta))) * 180) / Math.PI;
  const { o } = linhaCorpo(A, theta);
  const mao = [o[0] + BRACO * 0.98 * Math.sin((phi * Math.PI) / 180), barraY];
  const thetaTopo = resolver((th) => distancia(linhaCorpo(A, th).o, mao) - 20, theta, theta + 45);
  const pose = (th) => {
    const c = linhaCorpo(A, th);
    return { ...c, mp: mao, ml: mao, pp: A, pl: A, dp: dedo, dl: dedo, cp: [-0.6, 1], maoDir: 90 };
  };
  const cena = [linha(mao[0] + 8, barraY, mao[0] + 8, CHAO, { classe: 'fino' }), circulo(mao[0], barraY, 4)];
  return { cena, quadros: [quadro(pose(theta), 1.4, 0.4), quadro(pose(thetaTopo), 1.0, 0.3)], capa: 1 };
}

function barraFixa({ negativa = false }) {
  const barraY = 24;
  const mao = [130, barraY + 2];
  const pose = (oy, dobra) => {
    const o = [128, oy];
    const q = [127, oy + CORPO.tronco];
    const pp = [100, q[1] + 48];
    return { q, o, c: dobra ? 100 : 92, mp: mao, ml: [mao[0] - 3, mao[1]], pp, pl: [104, pp[1] - 3], dp: [92, pp[1] - 10], dl: [96, pp[1] - 13], jp: [1, 0.2], cp: [0.7, 1], maoDir: 90 };
  };
  const baixo = pose(barraY + 2 + BRACO - 1, false);
  const alto = pose(barraY + 8, true);
  const cena = [linha(60, barraY, 200, barraY, { classe: 'barra' }), linha(60, barraY, 60, CHAO, { classe: 'fino' }), linha(200, barraY, 200, CHAO, { classe: 'fino' })];
  const quadros = negativa ? [quadro(alto, 0.8, 0.5), quadro(baixo, 4.0, 0.5)] : [quadro(baixo, 1.6, 0.5), quadro(alto, 1.2, 0.4)];
  return { cena, quadros, capa: negativa ? 0 : 1 };
}

function degrau({ altura = 18 }) {
  const topo = CHAO - altura;
  const cena = caixa(128, 76, altura);
  const peDegrau = [148, topo - 7];
  const comum = { pp: peDegrau, dp: pePlano(peDegrau) };
  const preparo = (() => {
    const q = [113, 97];
    const o = ponto(q, 82, CORPO.tronco);
    const [mp, ml] = soltos(o);
    return { ...comum, q, o, mp, ml, pl: [104, T], dl: pePlano([104, T]) };
  })();
  const meio = (() => {
    const q = [138, 94 - altura + 8];
    const o = ponto(q, 86, CORPO.tronco);
    const [mp, ml] = soltos(o);
    return { ...comum, q, o, mp, ml, pl: [124, topo - 18], dl: [136, topo - 14], jl: [1, 0] };
  })();
  const emCima = (() => {
    const q = [147, T - PERNA + 1 - altura];
    const o = ponto(q, 90, CORPO.tronco);
    const [mp, ml] = soltos(o);
    return { ...comum, q, o, mp, ml, pl: [143, topo - 7], dl: pePlano([143, topo - 7]) };
  })();
  return { cena, quadros: [quadro(preparo, 0.8, 0.4), quadro(meio, 0.9, 0), quadro(emCima, 0.5, 0.5), quadro(meio, 0.7, 0)], capa: 0 };
}

function afundo({ apoio = false, frente = false }) {
  const cena = apoio ? cadeira(150, 'esq') : [];
  const poseCom = (q, pp, pl, dl, extra = {}) => {
    const o = ponto(q, 86, CORPO.tronco);
    let mp;
    let ml;
    if (apoio) {
      ml = [151, ASSENTO - 44];
      mp = noTronco(q, o, -30, 8);
    } else {
      mp = noTronco(q, o, -36, 4);
      ml = noTronco(q, o, -34, 2);
    }
    return { q, o, mp, ml, pp, pl, dp: pePlano(pp), dl, jl: [0, 1], ...extra };
  };
  if (frente) {
    const tras = [92, T];
    const emPePose = poseCom([96, T - PERNA + 1], [100, T], tras, pePlano(tras));
    const fundo = poseCom([120, 136], [166, T], [94, T - 6], [106, CHAO - 1]);
    return { cena, quadros: [quadro(emPePose, 0.9, 0.5), quadro(fundo, 1.3, 0.3)], capa: 1 };
  }
  const frenteP = [140, T];
  const emPePose = poseCom([136, T - PERNA + 1], frenteP, [132, T], pePlano([132, T]));
  const meio = poseCom([126, 112], frenteP, [98, T - 12], [110, T - 2]);
  const fundo = poseCom([112, 136], frenteP, [66, T - 8], [78, CHAO - 1]);
  return { cena, quadros: [quadro(emPePose, 0.6, 0.5), quadro(meio, 0.6, 0), quadro(fundo, 0.8, 0.3), quadro(meio, 0.7, 0)], capa: 2 };
}

function bulgaro({ mochila = false }) {
  const cena = sofa(4, 72, 'esq');
  const tras = [68, ASSENTO - 8];
  const base = { pl: tras, dl: [53, ASSENTO - 2], jl: [0, 1], pp: [152, T], dp: pePlano([152, T]), mochila: mochila ? 'peito' : null };
  const poseCom = (q) => {
    const o = ponto(q, 82, CORPO.tronco);
    const mp = mochila ? noTronco(q, o, -16, 16) : noTronco(q, o, -36, 6);
    const ml = mochila ? noTronco(q, o, -14, 14) : noTronco(q, o, -34, 4);
    return { ...base, q, o, mp, ml };
  };
  return { cena, quadros: [quadro(poseCom([126, 98]), 1.0, 0.5), quadro(poseCom([112, 136]), 1.4, 0.3)], capa: 1 };
}

function unilateralCadeira() {
  const cena = cadeira(56);
  const pe = [140, T];
  const poseCom = (q, ang, perna) => {
    const o = ponto(q, ang, CORPO.tronco);
    return { q, o, mp: deOmbro(o, 50, 4), ml: deOmbro(o, 48, 6), pp: pe, dp: pePlano(pe), pl: perna, dl: peParaCima(perna), jl: [0, -1] };
  };
  const emPePose = poseCom([136, T - PERNA + 1], 84, [200, 150]);
  const inclinado = poseCom([108, 127], 52, [190, 122]);
  const sentado = poseCom([98, 132], 72, [182, 122]);
  return { cena, quadros: [quadro(emPePose, 0.8, 0.5), quadro(inclinado, 1.4, 0), quadro(sentado, 0.8, 0.3), quadro(inclinado, 0.6, 0)], capa: 2 };
}

function ponte({ unilateral = false, pausa = 0 }) {
  const o = [64, CHAO - 11];
  const baixo = [114, CHAO - 11];
  const alto = ponto(o, -36, CORPO.tronco).map((v, i) => (i === 1 ? o[1] - (v - o[1]) : v));
  const poseCom = (q) => {
    const pl = [164, T];
    const dir = angulo(o, q);
    const pp = unilateral ? ponto(q, dir + (q === baixo ? 38 : 4), PERNA - 2) : [160, T];
    return {
      q,
      o,
      c: 180,
      mp: [118, CHAO - 3],
      ml: [121, CHAO - 3],
      pp,
      pl,
      dp: unilateral ? peParaCima(pp) : pePlano(pp),
      dl: pePlano(pl),
      jp: [0, -1],
      jl: [0, -1],
      cp: [0, -1],
      maoDir: 0,
    };
  };
  return { cena: [], quadros: [quadro(poseCom(baixo), 1.4, 0.4), quadro(poseCom(alto), 1.0, pausa || 0.6)], capa: 1 };
}

function elevacao({ unilateral = false, mochila = false }) {
  const cena = sofa(0, 72, 'esq');
  const o = [72, ASSENTO - 10];
  const baixo = [92, CHAO - 9];
  const alto = [121, ASSENTO - 6];
  const poseCom = (q, cima) => {
    const pl = [156, T];
    const pp = unilateral ? ponto(q, cima ? 2 : 34, PERNA - 2) : [152, T];
    const maos = mochila ? [[q[0] + 4, q[1] - 16], [q[0] + 1, q[1] - 16]] : [[34, ASSENTO - 2], [38, ASSENTO - 2]];
    return {
      q,
      o,
      c: cima ? 160 : 120,
      mp: maos[0],
      ml: maos[1],
      pp,
      pl,
      dp: unilateral ? peParaCima(pp) : pePlano(pp),
      dl: pePlano(pl),
      jp: [0, -1],
      jl: [0, -1],
      cp: [0, -1],
      mochila: mochila ? 'quadril' : null,
    };
  };
  return { cena, quadros: [quadro(poseCom(baixo, false), 1.4, 0.4), quadro(poseCom(alto, true), 1.0, 0.6)], capa: 1 };
}

// Prancha nos antebraços (ou inclinada, de joelhos, com pés elevados).
function prancha({ altura = 0, joelhos = false, pes = 0, perna = false }) {
  const cena = [];
  const apoioY = CHAO - altura;
  const cotovelo = [152, apoioY - 4];
  const o = [152, cotovelo[1] - CORPO.braco];
  const maoP = [178, apoioY - 3];
  if (altura) cena.push(...mesa(140, 100, altura));
  if (pes) cena.push(...caixa(0, 50, pes));
  const pose = (dq = 0, ergue = null) => {
    let A;
    let q;
    let kp = null;
    let kl = null;
    if (joelhos) {
      const K = [60, CHAO - 6];
      const dir = angulo(K, o);
      q = ponto(K, dir, CORPO.coxa);
      A = [K[0] - 38, CHAO - 15];
      kp = K;
      kl = K;
    } else {
      const ay = pes ? CHAO - pes - 13 : CHAO - 13;
      const dy = ay - o[1];
      A = [o[0] - Math.sqrt((PERNA + CORPO.tronco) ** 2 - dy * dy), ay];
      q = ponto(A, angulo(A, o), PERNA - 0.5);
    }
    q = [q[0], q[1] + dq];
    let pp = A;
    let pl = A;
    if (ergue === 'perto') pp = ponto(q, angulo(q, A) - 12, PERNA - 1);
    if (ergue === 'longe') pl = ponto(q, angulo(q, A) - 12, PERNA - 1);
    const dedo = (t) => (joelhos ? [t[0] - 12, t[1] + 4] : pePonta(t));
    return { q, o, c: angulo(q, o) - 12, mp: maoP, ml: maoP, pp, pl, dp: dedo(pp), dl: dedo(pl), kp, kl, cp: [-0.4, 1], maoDir: 0 };
  };
  if (perna) {
    return { cena, quadros: [quadro(pose(), 0.6, 0.3), quadro(pose(0, 'perto'), 0.6, 1.2), quadro(pose(), 0.6, 0.3), quadro(pose(0, 'longe'), 0.6, 1.2)], capa: 1, legenda: 'Segure' };
  }
  return { cena, quadros: [quadro(pose(0), 1.6, 0), quadro(pose(1.5), 1.6, 0)], capa: 0, legenda: 'Segure' };
}

// Prancha alta (braços esticados) com toque no ombro.
function pranchaAlta() {
  const mao = [152, CHAO - 3];
  const o = [152, mao[1] - BRACO + 1];
  const ay = CHAO - 13;
  const dy = ay - o[1];
  const A = [o[0] - Math.sqrt((PERNA + CORPO.tronco) ** 2 - dy * dy), ay];
  const q = ponto(A, angulo(A, o), PERNA - 0.5);
  const base = { q, o, c: angulo(q, o) - 12, pp: A, pl: A, dp: pePonta(A), dl: pePonta(A), maoDir: 0, cp: [-0.5, 1] };
  const toque = [o[0] + 4, o[1] + 8];
  return {
    cena: [],
    quadros: [
      quadro({ ...base, mp: mao, ml: mao }, 0.6, 0.3),
      quadro({ ...base, mp: toque, ml: mao, cp: [0, 1], cl: [-0.5, 1] }, 0.6, 0.3),
      quadro({ ...base, mp: mao, ml: mao }, 0.6, 0.3),
      quadro({ ...base, mp: mao, ml: toque, cl: [0, 1] }, 0.6, 0.3),
    ],
    capa: 1,
  };
}

function deadBug({ bracos = false, pausa = 0 }) {
  const o = [64, CHAO - 11];
  const q = [114, CHAO - 11];
  const maoCima = [66, o[1] - BRACO + 1];
  const joelhoAlto = [156, q[1] - 43];
  const base = { q, o, c: 180, jp: [-0.4, -1], jl: [-0.4, -1], cp: [0, -1], cl: [0, -1] };
  const pernaEsticada = [194, CHAO - 9];
  const maoAtras = [14, CHAO - 13];
  const pose = (pernaBaixa, bracoAtras) => ({
    ...base,
    pp: pernaBaixa === 'perto' ? pernaEsticada : joelhoAlto,
    pl: pernaBaixa === 'longe' ? [pernaEsticada[0] + 3, pernaEsticada[1]] : [joelhoAlto[0] + 3, joelhoAlto[1]],
    dp: pernaBaixa === 'perto' ? [pernaEsticada[0] + 5, pernaEsticada[1] - 14] : peParaCima(joelhoAlto),
    dl: pernaBaixa === 'longe' ? [pernaEsticada[0] + 8, pernaEsticada[1] - 14] : peParaCima([joelhoAlto[0] + 3, joelhoAlto[1]]),
    mp: bracoAtras === 'perto' ? maoAtras : maoCima,
    ml: bracoAtras === 'longe' ? [maoAtras[0] + 2, maoAtras[1]] : [maoCima[0] + 2, maoCima[1]],
  });
  return {
    cena: [],
    quadros: [
      quadro(pose(null, null), 1.0, 0.4),
      quadro(pose('perto', bracos ? 'longe' : null), 1.4, pausa || 0.3),
      quadro(pose(null, null), 1.0, 0.4),
      quadro(pose('longe', bracos ? 'perto' : null), 1.4, pausa || 0.3),
    ],
    capa: 1,
  };
}

// Prancha lateral, vista de frente: corpo em diagonal, antebraço no chão.
function lateral({ joelhos = false, elevacao: comElevacao = false }) {
  const cotovelo = [152, CHAO - 4];
  const o = [152, cotovelo[1] - CORPO.braco];
  const pose = (descer = 0) => {
    let A;
    let q;
    let kp = null;
    if (joelhos) {
      const K = [62, CHAO - 6];
      q = ponto(K, angulo(K, o), CORPO.coxa);
      A = [K[0] - 14, K[1] - 4];
      kp = K;
    } else {
      const ay = CHAO - 8;
      const dy = ay - o[1];
      A = [o[0] - Math.sqrt((PERNA + CORPO.tronco) ** 2 - dy * dy), ay];
      q = ponto(A, angulo(A, o), PERNA - 0.5);
    }
    if (descer) q = ponto(o, angulo(o, q) + descer, CORPO.tronco);
    return {
      q,
      o,
      c: 80,
      mp: [cotovelo[0] + 12, CHAO - 3],
      ml: [q[0] + 6, q[1] - 8],
      pp: A,
      pl: [A[0] - 1, A[1] - 2],
      dp: joelhos ? [A[0] - 6, A[1] - 2] : [A[0] + 8, CHAO - 1],
      dl: joelhos ? [A[0] - 7, A[1] - 4] : [A[0] + 7, CHAO - 3],
      kp,
      kl: kp ? [kp[0] - 1, kp[1] - 2] : null,
      jp: [0, -1],
      cp: [0.2, 1],
      cl: [0, -1],
      maoDir: 0,
    };
  };
  if (comElevacao) return { cena: [], quadros: [quadro(pose(0), 1.0, 0.4), quadro(pose(14), 1.0, 0.2)], capa: 0, legenda: 'Vista de frente' };
  return { cena: [], quadros: [quadro(pose(0), 1.6, 0), quadro(pose(1.5), 1.6, 0)], capa: 0, legenda: 'Vista de frente · segure' };
}

// Marcha no lugar: levanta um joelho de cada vez, braços balançando.
function marcha() {
  const base = emPe(130);
  const joelhoAlto = (lado) => {
    const pe = [base.q[0] + 14, base.q[1] + 52];
    const p = { ...base, jp: [1, 0], jl: [1, 0] };
    if (lado === 'perto') {
      p.pp = pe;
      p.dp = [pe[0] + 14, pe[1] + 4];
      p.mp = deOmbro(base.o, -16, 50);
      p.ml = deOmbro(base.o, 22, 44);
    } else {
      p.pl = pe;
      p.dl = [pe[0] + 14, pe[1] + 4];
      p.ml = deOmbro(base.o, -16, 50);
      p.mp = deOmbro(base.o, 22, 44);
    }
    return p;
  };
  return { cena: [], quadros: [quadro(base, 0.35, 0), quadro(joelhoAlto('perto'), 0.35, 0.1), quadro(base, 0.35, 0), quadro(joelhoAlto('longe'), 0.35, 0.1)], capa: 1 };
}

// Alongamento: braços sobem acima da cabeça e descem.
function alongar() {
  const base = emPe(130);
  const cima = { ...base, mp: deOmbro(base.o, 6, -53), ml: deOmbro(base.o, 2, -53), cp: [1, 0], cl: [1, 0] };
  return { cena: [], quadros: [quadro(base, 1.2, 0.5), quadro(cima, 1.4, 1.2)], capa: 1 };
}

const GERADORES = {
  marcha,
  alongar,
  sentar,
  agachamento,
  flexao,
  remada,
  invertida,
  barra: barraFixa,
  degrau,
  afundo,
  bulgaro,
  unilateralCadeira,
  ponte,
  elevacao,
  prancha,
  pranchaAlta,
  deadBug,
  lateral,
};

export function montarMovimento(anim) {
  const gerar = GERADORES[anim?.tipo];
  if (!gerar) return null;
  const mov = gerar(anim);
  return { legenda: null, ...mov, ...(anim.legenda ? { legenda: anim.legenda } : {}) };
}

export const TIPOS_MOVIMENTO = Object.keys(GERADORES);
