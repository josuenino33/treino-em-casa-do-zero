// Regras de progressão (funções puras, testadas em tests/progressao.test.js).
//
// Dupla progressão: dentro de um nível, aumente as repetições até o topo da
// faixa. Quando fizer o topo em todas as séries, sem chegar à falha, em 2
// treinos seguidos, o app sugere subir de nível.

import { TRILHAS, ORDEM_TREINO, trilha, nivelDe } from '../data/trilhas.js';
import { niveisPadrao } from '../core/esquema.js';
import { hojeISO } from '../core/datas.js';

export const PASSO = { reps: 1, segundos: 5 };
export const TREINOS_NO_TOPO = 2;

export const ESFORCOS = [
  { id: 'folga', nome: 'Sobrou bastante', detalhe: 'Faria 3 ou mais' },
  { id: 'medida', nome: 'Na medida', detalhe: 'Sobraram 1 ou 2' },
  { id: 'falha', nome: 'Fui ao limite', detalhe: 'Não sobrou nada' },
];

const limitar = (v, min, max) => Math.min(Math.max(v, min), max);

export function momentoTreino(t) {
  return t.fim || t.inicio || `${t.data}T23:59:59.999Z`;
}

function porMomento(a, b) {
  return momentoTreino(a) < momentoTreino(b) ? -1 : momentoTreino(a) > momentoTreino(b) ? 1 : 0;
}

export function ultimaMudanca(estado, trilhaId) {
  let ultima = null;
  for (const h of estado.historicoNiveis) {
    if (h.trilha === trilhaId && h.para !== h.de && (!ultima || h.em > ultima)) ultima = h.em;
  }
  return ultima;
}

// Exercícios registrados de uma trilha num nível, em ordem cronológica,
// contando só os feitos depois da última mudança de nível dessa trilha.
export function entradasNoNivel(estado, trilhaId, numero) {
  const corte = ultimaMudanca(estado, trilhaId);
  const saida = [];
  for (const t of [...estado.treinos].sort(porMomento)) {
    if (corte && momentoTreino(t) <= corte) continue;
    for (const ex of t.exercicios || []) {
      if (ex.trilha === trilhaId && ex.nivel === numero && !ex.pulado && ex.series?.length) {
        saida.push({ ...ex, data: t.data, treinoId: t.id });
      }
    }
  }
  return saida;
}

// Todas as entradas de uma trilha (qualquer nível), em ordem cronológica.
export function entradasDaTrilha(estado, trilhaId) {
  const saida = [];
  for (const t of [...estado.treinos].sort(porMomento)) {
    for (const ex of t.exercicios || []) {
      if (ex.trilha === trilhaId && !ex.pulado && ex.series?.length) {
        saida.push({ ...ex, data: t.data, treinoId: t.id });
      }
    }
  }
  return saida;
}

export function avaliarEntrada(nv, entrada) {
  const series = entrada?.series || [];
  const completa = series.length >= nv.series;
  const todasNoTopo = completa && series.slice(0, nv.series).every((v) => v >= nv.max);
  return {
    completa,
    noTopo: todasNoTopo && entrada.esforco !== 'falha',
    topoNoLimite: todasNoTopo && entrada.esforco === 'falha',
    abaixo: series.length > 0 && series[0] < nv.min,
  };
}

export function trilhaDesbloqueada(estado, trilhaId) {
  const t = trilha(trilhaId);
  if (!t) return false;
  if (!t.desbloqueio) return true;
  const { trilha: requisito, nivel: minimo } = t.desbloqueio;
  if ((estado.niveis[requisito] || 1) >= minimo) return true;
  if ((estado.niveis[trilhaId] || 1) > 1) return true;
  if (estado.historicoNiveis.some((h) => h.trilha === trilhaId)) return true;
  return entradasDaTrilha(estado, trilhaId).length > 0;
}

export function statusTrilha(estado, trilhaId) {
  const t = trilha(trilhaId);
  const numero = limitar(estado.niveis[trilhaId] || 1, 1, t.niveis.length);
  const nv = t.niveis[numero - 1];
  const entradas = entradasNoNivel(estado, trilhaId, numero);
  const completas = entradas.filter((e) => avaliarEntrada(nv, e).completa);

  let topoSeguidos = 0;
  for (let i = completas.length - 1; i >= 0; i -= 1) {
    if (!avaliarEntrada(nv, completas[i]).noTopo) break;
    topoSeguidos += 1;
  }

  const ultimas = completas.slice(-2);
  const dificuldade = ultimas.length === 2 && ultimas.every((e) => avaliarEntrada(nv, e).abaixo);
  const ultima = entradas.at(-1) || null;
  const comDor = Boolean(ultima?.dor);
  const proximo = numero < t.niveis.length ? t.niveis[numero] : null;
  const bloqueioEquipamento = Boolean(proximo?.equipamento === 'barra' && !estado.config.barra);

  return {
    trilha: t,
    numero,
    nivel: nv,
    total: t.niveis.length,
    proximo,
    entradas: entradas.length,
    topoSeguidos: Math.min(topoSeguidos, TREINOS_NO_TOPO),
    podeSubir: topoSeguidos >= TREINOS_NO_TOPO && Boolean(proximo) && !bloqueioEquipamento,
    noTopoSemProximo: topoSeguidos >= TREINOS_NO_TOPO && (!proximo || bloqueioEquipamento),
    noMaximo: !proximo,
    bloqueioEquipamento,
    sugerirDescer: numero > 1 && (comDor || dificuldade),
    motivoDescer: comDor ? 'dor' : dificuldade ? 'dificuldade' : null,
    topoNoLimite: ultima ? avaliarEntrada(nv, ultima).topoNoLimite : false,
    desbloqueada: trilhaDesbloqueada(estado, trilhaId),
    ultima,
  };
}

// Metas do treino de hoje, série a série: um pouco mais que da última vez,
// dentro da faixa do nível. Se a última foi até a falha, repete as mesmas.
export function metasDoDia(nv, ultima, numSeries = nv.series) {
  const anteriores = ultima?.series || [];
  if (!anteriores.length) return Array(numSeries).fill(nv.min);
  const passo = ultima.esforco === 'falha' ? 0 : PASSO[nv.metrica];
  return Array.from({ length: numSeries }, (_, i) => {
    const base = anteriores[Math.min(i, anteriores.length - 1)];
    return limitar(base + passo, nv.min, nv.max);
  });
}

export function numSeries(nv, modo) {
  return modo === 'curto' ? Math.min(2, nv.series) : nv.series;
}

// Monta a lista de exercícios de um treino novo.
export function montarTreino(estado, modo = 'completo') {
  return ORDEM_TREINO.filter((id) => trilhaDesbloqueada(estado, id)).map((id) => {
    const st = statusTrilha(estado, id);
    return {
      trilha: id,
      nivel: st.numero,
      metas: metasDoDia(st.nivel, st.ultima, numSeries(st.nivel, modo)),
      series: [],
      esforco: null,
      dor: false,
      pulado: false,
    };
  });
}

// Estimativa em minutos: aquecimento + séries + descansos.
export function estimarMinutos(exercicios, descansoSeg = 75) {
  let seg = 5 * 60;
  for (const ex of exercicios) {
    const nv = nivelDe(ex.trilha, ex.nivel);
    const lados = nv.porLado ? 2 : 1;
    for (const meta of ex.metas) {
      const trabalho = nv.metrica === 'segundos' ? meta : meta * 3;
      seg += trabalho * lados + descansoSeg + (lados === 2 ? 10 : 0);
    }
  }
  return Math.round(seg / 60);
}

// Nível inicial a partir do teste de entrada.
const faixa = (valor, degraus) => {
  for (const [minimo, nivel] of degraus) if (valor >= minimo) return nivel;
  return 1;
};

export function niveisIniciais({ flexoes, sentar30, prancha } = {}) {
  const niveis = niveisPadrao();
  if (Number.isFinite(flexoes)) {
    niveis.empurrar = faixa(flexoes, [[20, 6], [15, 5], [10, 4], [5, 3], [1, 2]]);
  }
  if (Number.isFinite(sentar30)) {
    niveis.agachamento = faixa(sentar30, [[18, 5], [15, 4], [12, 3], [8, 2]]);
  }
  if (Number.isFinite(prancha)) {
    niveis.prancha = faixa(prancha, [[60, 4], [30, 3], [15, 2]]);
  }
  return niveis;
}

export function melhorSerie(estado, trilhaId, numero) {
  let melhor = 0;
  for (const t of estado.treinos) {
    for (const ex of t.exercicios || []) {
      if (ex.trilha === trilhaId && ex.nivel === numero && !ex.pulado) {
        for (const v of ex.series || []) melhor = Math.max(melhor, v);
      }
    }
  }
  return melhor;
}

// Aplica uma mudança de nível e registra no histórico. Muta o estado recebido.
export function mudarNivel(estado, trilhaId, para, motivo, em = new Date().toISOString(), data = hojeISO(new Date(em))) {
  const t = trilha(trilhaId);
  const de = estado.niveis[trilhaId] || 1;
  const destino = limitar(para, 1, t.niveis.length);
  estado.niveis[trilhaId] = destino;
  estado.historicoNiveis.push({ em, data, trilha: trilhaId, de, para: destino, motivo });
  return estado;
}

export function niveisConquistados(estado) {
  return estado.historicoNiveis.filter((h) => h.motivo === 'subiu' && h.para > h.de).length;
}

export function progressoGeral(estado) {
  let feitos = 0;
  let total = 0;
  for (const t of TRILHAS) {
    feitos += (estado.niveis[t.id] || 1) - 1;
    total += t.niveis.length - 1;
  }
  return total ? feitos / total : 0;
}
