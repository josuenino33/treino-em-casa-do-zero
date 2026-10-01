// Esqueleto 2D do boneco das ilustrações (vista de lado, olhando para a direita).
// Funções puras: recebem uma pose e devolvem a posição de cada articulação.
//
// Coordenadas em "centímetros" de tela: x para a direita, y para baixo, chão em y = CHAO.
// Uma pose diz onde ficam o quadril, o ombro, as mãos e os pés; cotovelos e
// joelhos são calculados por cinemática inversa de 2 segmentos, o que mantém o
// tamanho dos membros constante durante a animação.

export const CHAO = 186;
export const LARGURA = 260;
export const ALTURA = 200;

export const CORPO = {
  coxa: 44,
  canela: 42,
  tronco: 50,
  pescoco: 6,
  cabeca: 11,
  braco: 29,
  antebraco: 26,
  mao: 7,
};

export const PERNA = CORPO.coxa + CORPO.canela;
export const BRACO = CORPO.braco + CORPO.antebraco;

const rad = (g) => (g * Math.PI) / 180;
const graus = (r) => (r * 180) / Math.PI;

// Ponto a partir de 'origem', no ângulo 'ang' (0 = direita, 90 = para cima).
export function ponto(origem, ang, comprimento) {
  return [origem[0] + Math.cos(rad(ang)) * comprimento, origem[1] - Math.sin(rad(ang)) * comprimento];
}

export function angulo(de, para) {
  return graus(Math.atan2(de[1] - para[1], para[0] - de[0]));
}

export function distancia(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const lerpPonto = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function lerpAngulo(a, b, t) {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return a + d * t;
}

// Cinemática inversa de 2 segmentos: devolve a articulação do meio (joelho ou
// cotovelo). 'dica' é um vetor que indica para que lado o membro dobra.
export function articulacao(raiz, alvo, l1, l2, dica) {
  const d = Math.min(Math.max(distancia(raiz, alvo), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base = Math.atan2(alvo[1] - raiz[1], alvo[0] - raiz[0]);
  const alfa = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const a = [raiz[0] + Math.cos(base + alfa) * l1, raiz[1] + Math.sin(base + alfa) * l1];
  const b = [raiz[0] + Math.cos(base - alfa) * l1, raiz[1] + Math.sin(base - alfa) * l1];
  const meio = [(raiz[0] + alvo[0]) / 2, (raiz[1] + alvo[1]) / 2];
  const pontuar = (p) => (p[0] - meio[0]) * dica[0] + (p[1] - meio[1]) * dica[1];
  return pontuar(a) >= pontuar(b) ? a : b;
}

// Extremidade de um membro: se o alvo estiver longe demais, para no limite.
function extremidade(raiz, meio, alvo, l2) {
  if (Math.abs(distancia(meio, alvo) - l2) < 0.5) return alvo;
  return ponto(meio, angulo(meio, alvo), l2);
}

const DICAS = { joelho: [1, 0], cotovelo: [-1, 0.2] };

// Converte a pose de autor para uma forma que interpola bem: o ombro e a ponta
// dos pés viram ângulo + distância (assim não "encolhem" no meio do movimento).
export function preparar(pose) {
  const p = {
    q: pose.q,
    oAng: angulo(pose.q, pose.o),
    oLen: distancia(pose.q, pose.o),
    c: pose.c ?? null,
    mp: pose.mp,
    ml: pose.ml,
    pp: pose.pp,
    pl: pose.pl,
    dpAng: angulo(pose.pp, pose.dp),
    dpLen: distancia(pose.pp, pose.dp),
    dlAng: angulo(pose.pl, pose.dl),
    dlLen: distancia(pose.pl, pose.dl),
    jp: pose.jp || DICAS.joelho,
    jl: pose.jl || pose.jp || DICAS.joelho,
    cp: pose.cp || DICAS.cotovelo,
    cl: pose.cl || pose.cp || DICAS.cotovelo,
    kp: pose.kp || null,
    kl: pose.kl || null,
    maoDir: pose.maoDir ?? null,
    mochila: pose.mochila || null,
    mochilaTam: pose.mochilaTam || 1,
  };
  return p;
}

export function interpolar(a, b, t) {
  const opcional = (x, y) => (x && y ? lerpPonto(x, y, t) : t < 0.5 ? x : y);
  return {
    ...a,
    q: lerpPonto(a.q, b.q, t),
    oAng: lerpAngulo(a.oAng, b.oAng, t),
    oLen: lerp(a.oLen, b.oLen, t),
    c: a.c != null && b.c != null ? lerpAngulo(a.c, b.c, t) : t < 0.5 ? a.c : b.c,
    mp: lerpPonto(a.mp, b.mp, t),
    ml: lerpPonto(a.ml, b.ml, t),
    pp: lerpPonto(a.pp, b.pp, t),
    pl: lerpPonto(a.pl, b.pl, t),
    dpAng: lerpAngulo(a.dpAng, b.dpAng, t),
    dpLen: lerp(a.dpLen, b.dpLen, t),
    dlAng: lerpAngulo(a.dlAng, b.dlAng, t),
    dlLen: lerp(a.dlLen, b.dlLen, t),
    kp: opcional(a.kp, b.kp),
    kl: opcional(a.kl, b.kl),
    maoDir: a.maoDir != null && b.maoDir != null ? lerpAngulo(a.maoDir, b.maoDir, t) : a.maoDir ?? b.maoDir,
  };
}

// Posição de todas as articulações de uma pose preparada.
export function esqueleto(p) {
  const C = CORPO;
  const o = ponto(p.q, p.oAng, p.oLen);
  const angTronco = p.oAng;
  const angCabeca = p.c ?? angTronco;
  const pescoco = ponto(o, angCabeca, C.pescoco);
  const cabeca = ponto(pescoco, angCabeca, C.cabeca);

  const perna = (tornozelo, dica, joelhoFixo, dedoAng, dedoLen) => {
    const joelho = joelhoFixo || articulacao(p.q, tornozelo, C.coxa, C.canela, dica);
    const fim = joelhoFixo ? tornozelo : extremidade(p.q, joelho, tornozelo, C.canela);
    return { joelho, tornozelo: fim, dedo: ponto(fim, dedoAng, dedoLen) };
  };
  const braco = (mao, dica) => {
    const cotovelo = articulacao(o, mao, C.braco, C.antebraco, dica);
    const pulso = extremidade(o, cotovelo, mao, C.antebraco);
    const dir = p.maoDir ?? angulo(cotovelo, pulso);
    return { cotovelo, pulso, ponta: ponto(pulso, dir, C.mao) };
  };

  return {
    quadril: p.q,
    ombro: o,
    pescoco,
    cabeca,
    pernaPerto: perna(p.pp, p.jp, p.kp, p.dpAng, p.dpLen),
    pernaLonge: perna(p.pl, p.jl, p.kl, p.dlAng, p.dlLen),
    bracoPerto: braco(p.mp, p.cp),
    bracoLonge: braco(p.ml, p.cl),
    mochila: p.mochila,
    mochilaTam: p.mochilaTam,
    angTronco,
  };
}

// Enquadra a cena: centraliza na horizontal e, se o boneco subir demais
// (ex.: em cima de um degrau), diminui tudo a partir do chão para caber.
// Um ponto p vai para ((p.x - cx) * k + LARGURA / 2, (p.y - CHAO) * k + CHAO).
export function enquadrar(esqueletos, cena = []) {
  const pts = esqueletos.flatMap(pontosDoEsqueleto);
  for (const o of cena) {
    if (o.tipo === 'ret') pts.push([o.x, o.y], [o.x + o.w, o.y + o.h]);
    else if (o.tipo === 'circulo') pts.push([o.cx - o.r, o.cy - o.r], [o.cx + o.r, o.cy + o.r]);
    else pts.push([o.x1, o.y1], [o.x2, o.y2]);
  }
  const xs = pts.map((p) => p[0]);
  const topo = Math.min(...pts.map((p) => p[1])) - 4;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const kAltura = topo < 4 ? (CHAO - 4) / (CHAO - topo) : 1;
  const kLargura = Math.min(1, (LARGURA - 12) / (Math.max(...xs) - Math.min(...xs)));
  return { cx, k: Math.min(kAltura, kLargura) };
}

export function aplicarEnquadro({ cx, k }, p) {
  return [(p[0] - cx) * k + LARGURA / 2, (p[1] - CHAO) * k + CHAO];
}

// Todos os pontos que o boneco ocupa (para centralizar o desenho).
export function pontosDoEsqueleto(e) {
  const r = CORPO.cabeca;
  return [
    e.quadril, e.ombro,
    [e.cabeca[0] - r, e.cabeca[1] - r], [e.cabeca[0] + r, e.cabeca[1] + r],
    e.pernaPerto.joelho, e.pernaPerto.tornozelo, e.pernaPerto.dedo,
    e.pernaLonge.joelho, e.pernaLonge.tornozelo, e.pernaLonge.dedo,
    e.bracoPerto.cotovelo, e.bracoPerto.ponta, e.bracoLonge.cotovelo, e.bracoLonge.ponta,
  ];
}
