// Formato do estado salvo e migrações entre versões.
// Sempre que mudar o formato: aumente VERSAO e adicione um passo em MIGRACOES.

import { TRILHAS } from '../data/trilhas.js';
import { ehISO } from './datas.js';

export const VERSAO = 1;
export const APP_ID = 'trilha-treino';

export const HABITOS = [
  { id: 'proteina', nome: 'Proteína em todas as refeições', dica: 'Carne, frango, ovo, peixe, feijão, iogurte' },
  { id: 'bebidas', nome: 'Sem bebidas com açúcar ou álcool', dica: 'Refrigerante, suco, cerveja' },
  { id: 'vegetais', nome: 'Verdura ou legume em 2 refeições', dica: 'Metade do prato' },
  { id: 'agua', nome: 'Bebi a meta de água', dica: 'Veja sua meta em Nutrição' },
  { id: 'sono', nome: 'Dormi 7 horas ou mais', dica: 'Sono regula a fome' },
  { id: 'passos', nome: 'Me movimentei hoje', dica: 'Treino, caminhada ou escada' },
];

export function niveisPadrao() {
  return Object.fromEntries(TRILHAS.map((t) => [t.id, 1]));
}

export function estadoPadrao() {
  return {
    app: APP_ID,
    versao: VERSAO,
    onboardingFeito: false,
    perfil: {
      nome: '',
      anoNascimento: null,
      alturaCm: null,
      sexo: null,
      pesoInicial: null,
      pesoMeta: null,
      inicio: null,
      atividade: 1.375,
    },
    config: {
      diasTreino: [1, 3, 5],
      diasCaminhada: [2, 4, 6],
      horario: '07:00',
      ritmo: 'devagar',
      descanso: 90,
      som: true,
      vibrar: true,
      tema: 'auto',
      barra: false,
      manterTela: true,
      habitos: HABITOS.map((h) => h.id),
      pausas: { mostrar: true, lembrete: false, intervalo: 50, meta: 4 },
    },
    niveis: niveisPadrao(),
    historicoNiveis: [],
    treinos: [],
    caminhadas: [],
    medidas: [],
    testes: [],
    habitos: {},
    pausas: {},
    conquistas: {},
  };
}

// Passos de migração: MIGRACOES[n] leva um estado da versão n para n + 1.
const MIGRACOES = {};

const lista = (v) => (Array.isArray(v) ? v : []);
const objeto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function migrar(bruto) {
  if (!bruto || typeof bruto !== 'object') throw new Error('Dados inválidos');
  let dados = { ...bruto };
  let versao = Number(dados.versao) || 1;
  if (versao > VERSAO) {
    throw new Error('Este backup foi feito numa versão mais nova do app. Atualize a página e tente de novo.');
  }
  while (versao < VERSAO) {
    const passo = MIGRACOES[versao];
    if (!passo) throw new Error(`Sem migração da versão ${versao}`);
    dados = passo(dados);
    versao += 1;
  }
  return completar(dados);
}

// Preenche campos que faltam e descarta lixo, sem perder o que já existe.
function completar(dados) {
  const base = estadoPadrao();
  const niveis = { ...base.niveis };
  for (const t of TRILHAS) {
    const n = Number(objeto(dados.niveis)[t.id]);
    if (Number.isInteger(n) && n >= 1) niveis[t.id] = Math.min(n, t.niveis.length);
  }
  const config = { ...base.config, ...objeto(dados.config) };
  config.diasTreino = lista(config.diasTreino).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  config.diasCaminhada = lista(config.diasCaminhada).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  config.habitos = lista(config.habitos).filter((id) => HABITOS.some((h) => h.id === id));
  config.pausas = { ...base.config.pausas, ...objeto(config.pausas) };
  if (!['devagar', 'normal'].includes(config.ritmo)) config.ritmo = base.config.ritmo;

  return {
    ...base,
    onboardingFeito: Boolean(dados.onboardingFeito),
    perfil: { ...base.perfil, ...objeto(dados.perfil) },
    config,
    niveis,
    historicoNiveis: lista(dados.historicoNiveis),
    treinos: lista(dados.treinos).filter((t) => t && ehISO(t.data)),
    caminhadas: lista(dados.caminhadas).filter((c) => c && ehISO(c.data)),
    medidas: lista(dados.medidas).filter((m) => m && ehISO(m.data)),
    testes: lista(dados.testes).filter((t) => t && ehISO(t.data)),
    habitos: objeto(dados.habitos),
    pausas: objeto(dados.pausas),
    conquistas: objeto(dados.conquistas),
    app: APP_ID,
    versao: VERSAO,
  };
}

// Valida um arquivo de backup importado. Devolve { estado, fotos } ou lança erro.
export function lerBackup(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um backup válido (JSON corrompido).');
  }
  if (!obj || obj.app !== APP_ID || !obj.estado) {
    throw new Error('Este arquivo não é um backup do Trilha.');
  }
  return { estado: migrar(obj.estado), fotos: lista(obj.fotos) };
}

export function montarBackup(estado, fotos = []) {
  return {
    app: APP_ID,
    versao: VERSAO,
    exportadoEm: new Date().toISOString(),
    estado,
    fotos,
  };
}

export function novoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
