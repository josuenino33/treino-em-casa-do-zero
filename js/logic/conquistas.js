// Conquistas: marcos que aparecem conforme o progresso. Cada uma tem um valor
// atual e um alvo; é desbloqueada quando valor >= alvo.

import { hojeISO } from '../core/datas.js';
import { nivelDe } from '../data/trilhas.js';
import { totalPausas } from './pausas.js';
import { trilhaDesbloqueada, niveisConquistados } from './progressao.js';
import {
  kgPerdidos,
  pesoAtual,
  sequenciaHabitos,
  sequenciaSemanas,
  totais,
  treinosPorSemana,
  variacaoMedida,
} from './estatisticas.js';

function maiorSeriePrancha(estado) {
  let melhor = 0;
  for (const t of estado.treinos) {
    for (const ex of t.exercicios || []) {
      if (ex.trilha !== 'prancha' || ex.pulado) continue;
      if (nivelDe('prancha', ex.nivel)?.metrica !== 'segundos') continue;
      for (const v of ex.series || []) melhor = Math.max(melhor, v);
    }
  }
  for (const teste of estado.testes) melhor = Math.max(melhor, Number(teste.prancha) || 0);
  return melhor;
}

function testeComRecorde(estado) {
  const testes = [...estado.testes].sort((a, b) => (a.data < b.data ? -1 : 1));
  for (let i = 1; i < testes.length; i += 1) {
    for (const campo of ['flexoes', 'sentar30', 'prancha']) {
      const antes = Math.max(...testes.slice(0, i).map((t) => Number(t[campo]) || 0));
      if ((Number(testes[i][campo]) || 0) > antes) return 1;
    }
  }
  return 0;
}

export function contexto(estado, hoje = hojeISO()) {
  const tot = totais(estado);
  const cintura = variacaoMedida(estado, 'cintura');
  const atual = pesoAtual(estado);
  return {
    estado,
    totais: tot,
    maxTreinosSemana: Math.max(0, ...treinosPorSemana(estado).values()),
    semanasSeguidas: sequenciaSemanas(estado, hoje),
    niveisSubidos: niveisConquistados(estado),
    kg: kgPerdidos(estado),
    cm: cintura ? -cintura.diferenca : 0,
    metaAtingida: atual != null && estado.perfil.pesoMeta > 0 && atual <= estado.perfil.pesoMeta ? 1 : 0,
    habitosSeguidos: sequenciaHabitos(estado, hoje),
    prancha: maiorSeriePrancha(estado),
    recordeTeste: testeComRecorde(estado),
    pausas: totalPausas(estado),
  };
}

const c = (id, grupo, nome, descricao, alvo, valor, unidade = '') => ({ id, grupo, nome, descricao, alvo, valor, unidade });
const nivel = (ctx, trilha) => ctx.estado.niveis[trilha] || 1;

export const CONQUISTAS = [
  c('primeiro-treino', 'Constância', 'Primeiro passo', 'Complete seu primeiro treino de força.', 1, (x) => x.totais.treinos),
  c('semana-completa', 'Constância', 'Semana completa', 'Faça 3 treinos de força na mesma semana.', 3, (x) => x.maxTreinosSemana),
  c('sequencia-4', 'Constância', 'Um mês firme', '4 semanas seguidas com 2 ou mais treinos.', 4, (x) => x.semanasSeguidas, 'semanas'),
  c('sequencia-12', 'Constância', 'Hábito formado', '12 semanas seguidas com 2 ou mais treinos.', 12, (x) => x.semanasSeguidas, 'semanas'),
  c('treinos-10', 'Constância', '10 treinos', 'Complete 10 treinos de força.', 10, (x) => x.totais.treinos, 'treinos'),
  c('treinos-25', 'Constância', '25 treinos', 'Complete 25 treinos de força.', 25, (x) => x.totais.treinos, 'treinos'),
  c('treinos-50', 'Constância', '50 treinos', 'Complete 50 treinos de força.', 50, (x) => x.totais.treinos, 'treinos'),
  c('treinos-100', 'Constância', '100 treinos', 'Complete 100 treinos de força.', 100, (x) => x.totais.treinos, 'treinos'),

  c('subiu-nivel', 'Força', 'Subindo a trilha', 'Suba de nível pela primeira vez.', 1, (x) => x.niveisSubidos),
  c('niveis-10', 'Força', '10 níveis', 'Conquiste 10 níveis somando todas as trilhas.', 10, (x) => x.niveisSubidos, 'níveis'),
  c('niveis-25', 'Força', '25 níveis', 'Conquiste 25 níveis somando todas as trilhas.', 25, (x) => x.niveisSubidos, 'níveis'),
  c('afundo', 'Força', 'Nova trilha', 'Desbloqueie a trilha do afundo.', 1, (x) => (trilhaDesbloqueada(x.estado, 'afundo') ? 1 : 0)),
  c('agachamento-livre', 'Força', 'Agachamento livre', 'Chegue ao agachamento livre, sem cadeira.', 5, (x) => nivel(x, 'agachamento'), 'nível'),
  c('flexao-chao', 'Força', 'Flexão no chão', 'Chegue ao nível da flexão no chão.', 6, (x) => nivel(x, 'empurrar'), 'nível'),
  c('prancha-60', 'Força', 'Um minuto de prancha', 'Segure 60 segundos numa série ou teste de prancha.', 60, (x) => x.prancha, 's'),
  c('bulgaro', 'Força', 'Búlgaro', 'Chegue ao agachamento búlgaro.', 6, (x) => nivel(x, 'afundo'), 'nível'),
  c('barra-fixa', 'Força', 'Barra fixa', 'Chegue ao nível da barra fixa.', 8, (x) => nivel(x, 'puxar'), 'nível'),
  c('recorde-teste', 'Força', 'Recorde pessoal', 'Supere um resultado anterior no teste de evolução.', 1, (x) => x.recordeTeste),

  c('kg-5', 'Corpo', '−5 kg', 'Perca 5 kg desde o início.', 5, (x) => x.kg, 'kg'),
  c('kg-10', 'Corpo', '−10 kg', 'Perca 10 kg desde o início.', 10, (x) => x.kg, 'kg'),
  c('kg-15', 'Corpo', '−15 kg', 'Perca 15 kg desde o início.', 15, (x) => x.kg, 'kg'),
  c('kg-20', 'Corpo', '−20 kg', 'Perca 20 kg desde o início.', 20, (x) => x.kg, 'kg'),
  c('kg-30', 'Corpo', '−30 kg', 'Perca 30 kg desde o início.', 30, (x) => x.kg, 'kg'),
  c('meta-peso', 'Corpo', 'Meta alcançada', 'Chegue ao seu peso-meta (média de 7 dias).', 1, (x) => x.metaAtingida),
  c('cintura-5', 'Corpo', '−5 cm de cintura', 'Diminua 5 cm de cintura.', 5, (x) => x.cm, 'cm'),
  c('cintura-10', 'Corpo', '−10 cm de cintura', 'Diminua 10 cm de cintura.', 10, (x) => x.cm, 'cm'),

  c('caminhadas-10', 'Fôlego', '10 caminhadas', 'Registre 10 caminhadas.', 10, (x) => x.totais.caminhadas, 'caminhadas'),
  c('caminhadas-50', 'Fôlego', '50 caminhadas', 'Registre 50 caminhadas.', 50, (x) => x.totais.caminhadas, 'caminhadas'),
  c('km-10', 'Fôlego', '10 km', 'Some 10 km de caminhada medida ou registrada.', 10, (x) => x.totais.km, 'km'),
  c('km-100', 'Fôlego', '100 km', 'Some 100 km de caminhada.', 100, (x) => x.totais.km, 'km'),
  c('passos-100mil', 'Fôlego', '100 mil passos', 'Some 100 mil passos nas caminhadas.', 100000, (x) => x.totais.passos, 'passos'),
  c('minutos-1000', 'Fôlego', '1.000 minutos', 'Some 1.000 minutos de caminhada.', 1000, (x) => x.totais.minutos, 'min'),
  c('minutos-5000', 'Fôlego', '5.000 minutos', 'Some 5.000 minutos de caminhada.', 5000, (x) => x.totais.minutos, 'min'),

  c('pausas-10', 'Hábitos', '10 pausas ativas', 'Levante da cadeira para 10 pausas ativas.', 10, (x) => x.pausas, 'pausas'),
  c('pausas-100', 'Hábitos', '100 pausas ativas', 'Some 100 pausas ativas.', 100, (x) => x.pausas, 'pausas'),
  c('habitos-7', 'Hábitos', 'Semana redonda', '7 dias seguidos cumprindo todos os hábitos.', 7, (x) => x.habitosSeguidos, 'dias'),
  c('habitos-30', 'Hábitos', 'Mês redondo', '30 dias seguidos cumprindo todos os hábitos.', 30, (x) => x.habitosSeguidos, 'dias'),
];

export function avaliarConquistas(estado, hoje = hojeISO()) {
  const ctx = contexto(estado, hoje);
  return CONQUISTAS.map((cq) => {
    const valor = Math.max(0, cq.valor(ctx));
    return {
      ...cq,
      atual: valor,
      progresso: Math.min(1, valor / cq.alvo),
      desbloqueada: Boolean(estado.conquistas[cq.id]),
      atingida: valor >= cq.alvo,
      data: estado.conquistas[cq.id] || null,
    };
  });
}

// Marca no estado as conquistas novas e devolve a lista delas. Muta o estado.
export function registrarConquistas(estado, hoje = hojeISO()) {
  const novas = [];
  for (const cq of avaliarConquistas(estado, hoje)) {
    if (cq.atingida && !estado.conquistas[cq.id]) {
      estado.conquistas[cq.id] = hoje;
      novas.push(cq);
    }
  }
  return novas;
}

// A próxima conquista mais perto de sair, para mostrar na tela inicial.
export function proximaConquista(estado, hoje = hojeISO()) {
  return avaliarConquistas(estado, hoje)
    .filter((cq) => !cq.desbloqueada && !cq.atingida && cq.alvo > 1)
    .sort((a, b) => b.progresso - a.progresso)[0] || null;
}
