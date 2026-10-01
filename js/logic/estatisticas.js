// Números do progresso: médias, tendências, totais e sequências.

import { addDias, diffDias, hojeISO, inicioSemana } from '../core/datas.js';

export const CAMPOS_MEDIDA = [
  { id: 'peso', nome: 'Peso', unidade: 'kg', passo: 0.1 },
  { id: 'cintura', nome: 'Cintura', unidade: 'cm', passo: 0.5, dica: 'Na altura do umbigo, sem apertar' },
  { id: 'quadril', nome: 'Quadril', unidade: 'cm', passo: 0.5, dica: 'Na parte mais larga do bumbum' },
  { id: 'peito', nome: 'Peito', unidade: 'cm', passo: 0.5, dica: 'Na linha dos mamilos, ar solto' },
  { id: 'braco', nome: 'Braço', unidade: 'cm', passo: 0.5, dica: 'No meio do braço, relaxado' },
  { id: 'coxa', nome: 'Coxa', unidade: 'cm', passo: 0.5, dica: 'No meio da coxa, em pé' },
];

// Um valor por data (o último registrado no dia), em ordem cronológica.
export function serieMedida(estado, campo) {
  const porData = new Map();
  for (const m of estado.medidas) {
    if (Number.isFinite(m[campo])) porData.set(m.data, m[campo]);
  }
  return [...porData.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([data, valor]) => ({ data, valor }));
}

export function mediaMovel(pontos, janela = 7) {
  return pontos.map((p, i) => {
    let soma = 0;
    let n = 0;
    for (let j = i; j >= 0; j -= 1) {
      const dif = diffDias(pontos[j].data, p.data);
      if (dif > janela - 1) break;
      soma += pontos[j].valor;
      n += 1;
    }
    return { ...p, media: soma / n };
  });
}

// Inclinação em kg por semana nos últimos 'dias' (regressão linear simples).
export function tendencia(pontos, hoje = hojeISO(), dias = 28) {
  const janela = pontos.filter((p) => {
    const d = diffDias(p.data, hoje);
    return d >= 0 && d < dias;
  });
  if (janela.length < 3) return null;
  if (diffDias(janela[0].data, janela.at(-1).data) < 7) return null;
  const xs = janela.map((p) => diffDias(janela[0].data, p.data));
  const ys = janela.map((p) => p.valor);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den ? (num / den) * 7 : null;
}

export function pesoAtual(estado) {
  const pontos = mediaMovel(serieMedida(estado, 'peso'));
  return pontos.length ? pontos.at(-1).media : null;
}

export function pesoInicial(estado) {
  if (Number.isFinite(estado.perfil.pesoInicial)) return estado.perfil.pesoInicial;
  const pontos = serieMedida(estado, 'peso');
  return pontos.length ? pontos[0].valor : null;
}

export function kgPerdidos(estado) {
  const ini = pesoInicial(estado);
  const atual = pesoAtual(estado);
  if (ini == null || atual == null) return 0;
  return ini - atual;
}

export function variacaoMedida(estado, campo) {
  const pontos = serieMedida(estado, campo);
  if (pontos.length < 1) return null;
  return { inicial: pontos[0].valor, atual: pontos.at(-1).valor, diferenca: pontos.at(-1).valor - pontos[0].valor };
}

function inicioDasSemanas(hoje, n) {
  const atual = inicioSemana(hoje);
  return Array.from({ length: n }, (_, i) => addDias(atual, -7 * (n - 1 - i)));
}

function seriesDoTreino(t) {
  return (t.exercicios || []).reduce((s, ex) => s + (ex.pulado ? 0 : (ex.series || []).length), 0);
}

export function seriesPorSemana(estado, hoje = hojeISO(), n = 12) {
  const semanas = inicioDasSemanas(hoje, n);
  const mapa = new Map(semanas.map((s) => [s, 0]));
  for (const t of estado.treinos) {
    const s = inicioSemana(t.data);
    if (mapa.has(s)) mapa.set(s, mapa.get(s) + seriesDoTreino(t));
  }
  return semanas.map((inicio) => ({ inicio, valor: mapa.get(inicio) }));
}

export function minutosPorSemana(estado, hoje = hojeISO(), n = 12) {
  const semanas = inicioDasSemanas(hoje, n);
  const mapa = new Map(semanas.map((s) => [s, 0]));
  for (const c of estado.caminhadas) {
    const s = inicioSemana(c.data);
    if (mapa.has(s)) mapa.set(s, mapa.get(s) + (Number(c.minutos) || 0));
  }
  return semanas.map((inicio) => ({ inicio, valor: mapa.get(inicio) }));
}

export function treinosPorSemana(estado) {
  const mapa = new Map();
  for (const t of estado.treinos) {
    const s = inicioSemana(t.data);
    mapa.set(s, (mapa.get(s) || 0) + 1);
  }
  return mapa;
}

// Sequência de semanas seguidas com pelo menos 'minimo' treinos de força.
// A semana atual conta se já bateu o mínimo; senão a contagem começa na anterior.
export function sequenciaSemanas(estado, hoje = hojeISO(), minimo = 2) {
  const mapa = treinosPorSemana(estado);
  let semana = inicioSemana(hoje);
  if ((mapa.get(semana) || 0) < minimo) semana = addDias(semana, -7);
  let n = 0;
  while ((mapa.get(semana) || 0) >= minimo) {
    n += 1;
    semana = addDias(semana, -7);
  }
  return n;
}

// Grade de atividade: 0 nada, 1 caminhada, 2 força, 3 força + caminhada.
export const NIVEIS_ATIVIDADE_MAPA = ['Sem atividade', 'Caminhada', 'Treino de força', 'Força + caminhada'];

export function mapaAtividade(estado, hoje = hojeISO(), semanas = 16) {
  const forca = new Set(estado.treinos.map((t) => t.data));
  const caminhada = new Set(estado.caminhadas.map((c) => c.data));
  return inicioDasSemanas(hoje, semanas).map((inicio) =>
    Array.from({ length: 7 }, (_, i) => {
      const data = addDias(inicio, i);
      const nivel = (forca.has(data) ? 2 : 0) + (caminhada.has(data) ? 1 : 0);
      return { data, nivel, futuro: data > hoje };
    }),
  );
}

export function totais(estado) {
  let series = 0;
  let reps = 0;
  for (const t of estado.treinos) {
    for (const ex of t.exercicios || []) {
      if (ex.pulado) continue;
      series += (ex.series || []).length;
      reps += (ex.series || []).reduce((a, b) => a + b, 0);
    }
  }
  const minutos = estado.caminhadas.reduce((s, c) => s + (Number(c.minutos) || 0), 0);
  return { treinos: estado.treinos.length, caminhadas: estado.caminhadas.length, minutos, series, reps };
}

// Melhor série e volume de uma trilha em cada treino, para o gráfico da trilha.
export function historicoTrilha(estado, trilhaId) {
  const saida = [];
  const treinos = [...estado.treinos].sort((a, b) => ((a.fim || a.data) < (b.fim || b.data) ? -1 : 1));
  for (const t of treinos) {
    const ex = (t.exercicios || []).find((e) => e.trilha === trilhaId && !e.pulado && e.series?.length);
    if (ex) saida.push({ data: t.data, nivel: ex.nivel, melhor: Math.max(...ex.series), total: ex.series.reduce((a, b) => a + b, 0) });
  }
  return saida;
}

export function habitosAtivos(estado) {
  return estado.config.habitos;
}

export function diaCompleto(estado, iso) {
  const ativos = habitosAtivos(estado);
  if (!ativos.length) return false;
  const feitos = new Set(estado.habitos[iso] || []);
  return ativos.every((id) => feitos.has(id));
}

export function sequenciaHabitos(estado, hoje = hojeISO()) {
  let dia = diaCompleto(estado, hoje) ? hoje : addDias(hoje, -1);
  let n = 0;
  while (diaCompleto(estado, dia)) {
    n += 1;
    dia = addDias(dia, -1);
  }
  return n;
}

export function aderenciaHabitos(estado, hoje = hojeISO(), dias = 28) {
  const datas = Object.keys(estado.habitos).filter((d) => (estado.habitos[d] || []).length).sort();
  const primeiro = datas[0];
  const janela = primeiro ? Math.min(dias, diffDias(primeiro, hoje) + 1) : 0;
  const resultado = {};
  for (const id of habitosAtivos(estado)) {
    let feitos = 0;
    for (let i = 0; i < janela; i += 1) {
      if ((estado.habitos[addDias(hoje, -i)] || []).includes(id)) feitos += 1;
    }
    resultado[id] = janela ? feitos / janela : 0;
  }
  return { dias: janela, porHabito: resultado };
}
