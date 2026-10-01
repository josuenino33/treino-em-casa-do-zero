// Fases do programa, agenda da semana e metas de caminhada.

import { addDias, diaSemana, diasDaSemana, diffDias, hojeISO, inicioSemana } from '../core/datas.js';

export const FASES = [
  {
    numero: 1,
    nome: 'Adaptação',
    de: 1,
    ate: 4,
    resumo: 'Acostumar articulações e músculos com o peso do corpo.',
    foco: ['Aprender a execução de cada exercício', 'Caminhada contínua, aumentando 5 min por semana', 'Parar cada série com 2 repetições sobrando'],
  },
  {
    numero: 2,
    nome: 'Construção',
    de: 5,
    ate: 8,
    resumo: 'Ganhar força e fôlego. Entra a caminhada intervalada.',
    foco: ['Subir de nível nas trilhas', 'Uma caminhada intervalada por semana', 'Afundo liberado quando o agachamento evoluir'],
  },
  {
    numero: 3,
    nome: 'Evolução',
    de: 9,
    ate: 16,
    resumo: 'Exercícios mais difíceis e caminhadas longas com subidas.',
    foco: ['Flexão no chão e agachamento com carga', 'Caminhada de 45–60 min', 'Uma caminhada intervalada e uma com subidas'],
  },
  {
    numero: 4,
    nome: 'Domínio',
    de: 17,
    ate: Infinity,
    resumo: 'Manter o ritmo e buscar os níveis avançados.',
    foco: ['Níveis avançados das trilhas', 'Considerar trote leve se os joelhos estiverem bem', 'Manter a constância'],
  },
];

export const TIPOS_CAMINHADA = {
  continua: { nome: 'Contínua', descricao: 'Ritmo constante: dá para conversar, mas não para cantar.' },
  intervalada: { nome: 'Intervalada', descricao: 'Alterne 2 min em ritmo rápido e 2 min em ritmo normal.' },
  subidas: { nome: 'Com subidas', descricao: 'Inclua ladeiras ou escadas. Desça devagar para poupar os joelhos.' },
};

export const INTERVALO_SEG = 120;

export function semanaDoPrograma(inicio, hoje = hojeISO()) {
  if (!inicio) return 1;
  const dias = diffDias(inicioSemana(inicio), hoje);
  return Math.max(1, Math.floor(dias / 7) + 1);
}

export function faseDaSemana(semana) {
  return FASES.find((f) => semana >= f.de && semana <= f.ate) || FASES[0];
}

export function metaCaminhada(semana) {
  return Math.min(20 + 5 * (semana - 1), 60);
}

// A cada 8 semanas, uma semana mais leve para o corpo se recuperar.
export function semanaLeve(semana) {
  return semana > 0 && semana % 8 === 0;
}

export function tipoCaminhada(estado, iso) {
  const semana = semanaDoPrograma(estado.perfil.inicio, iso);
  const fase = faseDaSemana(semana).numero;
  const dias = [...estado.config.diasCaminhada].sort((a, b) => ordemSemana(a) - ordemSemana(b));
  const posicao = dias.indexOf(diaSemana(iso));
  if (fase >= 2 && posicao === 0) return 'intervalada';
  if (fase >= 3 && posicao === 1) return 'subidas';
  return 'continua';
}

// Segunda = 0 ... domingo = 6, para ordenar dias na semana brasileira.
export function ordemSemana(dia) {
  return (dia + 6) % 7;
}

export function treinosDoDia(estado, iso) {
  return estado.treinos.filter((t) => t.data === iso);
}

export function caminhadasDoDia(estado, iso) {
  return estado.caminhadas.filter((c) => c.data === iso);
}

export function planoDoDia(estado, iso = hojeISO()) {
  const dia = diaSemana(iso);
  const semana = semanaDoPrograma(estado.perfil.inicio, iso);
  let tipo = 'descanso';
  if (estado.config.diasTreino.includes(dia)) tipo = 'forca';
  else if (estado.config.diasCaminhada.includes(dia)) tipo = 'caminhada';
  return {
    iso,
    tipo,
    semana,
    feitoForca: treinosDoDia(estado, iso).length > 0,
    feitoCaminhada: caminhadasDoDia(estado, iso).length > 0,
    metaMin: metaCaminhada(semana),
    tipoCaminhada: tipo === 'caminhada' ? tipoCaminhada(estado, iso) : 'continua',
  };
}

export function agendaDaSemana(estado, hoje = hojeISO()) {
  const inicio = estado.perfil.inicio;
  return diasDaSemana(hoje).map((iso) => ({
    ...planoDoDia(estado, iso),
    passado: iso < hoje,
    hoje: iso === hoje,
    antesDoInicio: Boolean(inicio) && iso < inicio,
  }));
}

// Treinos de força planejados nesta semana até ontem que não foram feitos.
export function treinosPendentes(estado, hoje = hojeISO()) {
  const semana = agendaDaSemana(estado, hoje);
  // Dias antes do início do programa não contam como treino perdido.
  const planejadosAteOntem = semana.filter((d) => d.passado && !d.antesDoInicio && d.tipo === 'forca').length;
  const feitosNaSemana = semana.reduce((s, d) => s + treinosDoDia(estado, d.iso).length, 0);
  const feitosAteOntem = semana.filter((d) => d.passado).reduce((s, d) => s + treinosDoDia(estado, d.iso).length, 0);
  const planejadosTotal = semana.filter((d) => !d.antesDoInicio && d.tipo === 'forca').length;
  return {
    pendentes: Math.max(0, planejadosAteOntem - feitosAteOntem),
    feitos: feitosNaSemana,
    planejados: planejadosTotal,
  };
}

export function treinouOntem(estado, hoje = hojeISO()) {
  return treinosDoDia(estado, addDias(hoje, -1)).length > 0;
}

export const INTERVALO_TESTE_DIAS = 28;

export function statusTeste(estado, hoje = hojeISO()) {
  const datas = estado.testes.map((t) => t.data).sort();
  const ultimo = datas.at(-1) || null;
  if (!ultimo) return { devido: true, ultimo: null, dias: null, proximo: hoje };
  const dias = diffDias(ultimo, hoje);
  return {
    devido: dias >= INTERVALO_TESTE_DIAS,
    ultimo,
    dias,
    proximo: addDias(ultimo, INTERVALO_TESTE_DIAS),
  };
}

export function diasSemPesar(estado, hoje = hojeISO()) {
  const datas = estado.medidas.filter((m) => Number.isFinite(m.peso)).map((m) => m.data).sort();
  const ultima = datas.at(-1);
  return ultima ? diffDias(ultima, hoje) : null;
}
