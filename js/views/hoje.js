// Tela inicial: o que fazer hoje, a semana, alertas e hábitos.

import { atualizar, lerLocal, obter } from '../core/armazem.js';
import { NOMES_DIAS, diaSemana, hojeISO } from '../core/datas.js';
import { HABITOS } from '../core/esquema.js';
import { dicaDoDia } from '../data/guia.js';
import { nivelDe, trilha } from '../data/trilhas.js';
import { proximaConquista } from '../logic/conquistas.js';
import { kgPerdidos, pesoAtual, sequenciaSemanas, totais } from '../logic/estatisticas.js';
import {
  TIPOS_CAMINHADA,
  agendaDaSemana,
  diasSemPesar,
  faseDaSemana,
  planoDoDia,
  semanaLeve,
  statusTeste,
  treinosPendentes,
  treinouOntem,
} from '../logic/plano.js';
import { estimarMinutos, montarTreino, statusTrilha } from '../logic/progressao.js';
import { TRILHAS } from '../data/trilhas.js';
import { aviso, barraProgresso, botao, cartao, estatistica, link } from '../ui/componentes.js';
import { comSinal, h, numCurto } from '../ui/dom.js';
import { icone } from '../ui/icones.js';
import { folhaCaminhada, folhaMedidas, verificarConquistas } from './acoes.js';

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function cartaoForca(e, plano, ctx) {
  const rascunho = lerLocal('rascunho');
  const leve = semanaLeve(plano.semana);
  const exercicios = montarTreino(e, leve ? 'curto' : 'completo');
  const minutos = estimarMinutos(exercicios, e.config.descanso);

  if (plano.feitoForca && !rascunho) {
    return cartao(
      { classe: 'card-hoje feito', titulo: 'Treino de hoje feito', subtitulo: 'Agora é recuperar: água, proteína e sono.' },
      h('div', { class: 'feito-selo' }, icone('check', { tamanho: 28 })),
      h('div', { class: 'acoes' }, botao({ texto: 'Registrar caminhada', icone: 'caminhada', variante: 'secundario', aoClicar: () => folhaCaminhada({ aoSalvar: ctx.redesenhar }) })),
    );
  }

  return cartao(
    {
      classe: 'card-hoje',
      titulo: rascunho ? 'Treino em andamento' : 'Treino de força',
      subtitulo: `${exercicios.length} exercícios · cerca de ${minutos} min`,
    },
    h(
      'ol',
      { class: 'lista-exercicios' },
      exercicios.map((ex) => {
        const nv = nivelDe(ex.trilha, ex.nivel);
        return h('li', null, h('span', { class: 'nivel-bolha' }, String(ex.nivel)), h('span', null, h('strong', null, nv.nome), h('small', null, trilha(ex.trilha).nome)));
      }),
    ),
    link({ href: '#/treino', texto: rascunho ? 'Continuar treino' : 'Começar treino', icone: 'play', variante: 'primario', bloco: true, tamanho: 'lg' }),
  );
}

function cartaoCaminhada(e, plano, ctx) {
  const tipo = TIPOS_CAMINHADA[plano.tipoCaminhada];
  if (plano.feitoCaminhada) {
    return cartao(
      { classe: 'card-hoje feito', titulo: 'Caminhada de hoje feita', subtitulo: 'Fôlego novo a cada semana.' },
      h('div', { class: 'feito-selo' }, icone('check', { tamanho: 28 })),
    );
  }
  return cartao(
    { classe: 'card-hoje', titulo: `Caminhada · ${plano.metaMin} min`, subtitulo: `${tipo.nome}. ${tipo.descricao}` },
    h(
      'div',
      { class: 'acoes' },
      link({ href: '#/caminhada', texto: 'Iniciar cronômetro', icone: 'play', variante: 'primario', tamanho: 'lg' }),
      botao({ texto: 'Já caminhei', variante: 'secundario', tamanho: 'lg', aoClicar: () => folhaCaminhada({ minutos: plano.metaMin, tipo: plano.tipoCaminhada, aoSalvar: ctx.redesenhar }) }),
    ),
  );
}

function cartaoDescanso(e, ctx) {
  const pend = treinosPendentes(e);
  const ontem = treinouOntem(e);
  return cartao(
    { classe: 'card-hoje', titulo: 'Dia de descanso', subtitulo: 'O músculo cresce enquanto você descansa. Uma caminhada leve é opcional.' },
    pend.pendentes > 0
      ? aviso({
          tipo: 'info',
          titulo: pend.pendentes === 1 ? 'Ficou 1 treino para trás nesta semana' : `Ficaram ${pend.pendentes} treinos para trás nesta semana`,
          texto: ontem ? 'Você treinou ontem. Se puder, deixe para amanhã: 48 h entre treinos de força é o ideal.' : 'Dá para recuperar hoje.',
        })
      : null,
    h(
      'div',
      { class: 'acoes' },
      link({ href: '#/treino', texto: pend.pendentes > 0 ? 'Fazer treino perdido' : 'Treinar mesmo assim', icone: 'forca', variante: 'secundario' }),
      botao({ texto: 'Registrar caminhada', icone: 'caminhada', variante: 'fantasma', aoClicar: () => folhaCaminhada({ aoSalvar: ctx.redesenhar }) }),
    ),
  );
}

function faixaSemana(e) {
  const dias = agendaDaSemana(e);
  const icones = { forca: 'forca', caminhada: 'caminhada', descanso: 'sono' };
  const nomes = { forca: 'Força', caminhada: 'Caminhada', descanso: 'Descanso' };
  return h(
    'ol',
    { class: 'semana', 'aria-label': 'Sua semana' },
    dias.map((d) => {
      const feito = d.feitoForca || d.feitoCaminhada;
      const estado = feito ? 'feito' : d.passado && !d.antesDoInicio && d.tipo !== 'descanso' ? 'perdido' : '';
      const descricao = `${NOMES_DIAS[diaSemana(d.iso)]}: ${nomes[d.tipo]}${feito ? ', feito' : estado === 'perdido' ? ', não feito' : ''}`;
      return h(
        'li',
        { class: `dia ${d.hoje ? 'hoje' : ''} ${estado}`.trim(), 'aria-label': descricao, 'aria-current': d.hoje ? 'date' : null },
        h('span', { class: 'dia-nome' }, NOMES_DIAS[diaSemana(d.iso)]),
        h('span', { class: 'dia-icone' }, icone(feito ? 'check' : icones[d.tipo], { tamanho: 18 })),
      );
    }),
  );
}

function alertas(e, ctx) {
  const lista = [];
  const caminhada = lerLocal('caminhada');
  if (caminhada?.inicio) {
    lista.push(aviso({ tipo: 'info', icone: 'caminhada', titulo: caminhada.pausadoEm ? 'Caminhada pausada' : 'Caminhada em andamento', texto: 'O cronômetro está esperando por você.', acao: link({ href: '#/caminhada', texto: 'Voltar ao cronômetro', variante: 'fantasma' }) }));
  }
  const status = TRILHAS.map((t) => statusTrilha(e, t.id)).filter((st) => st.desbloqueada);
  const subir = status.filter((st) => st.podeSubir);
  if (subir.length === 1) {
    const [st] = subir;
    lista.push(aviso({ tipo: 'sucesso', icone: 'subir', titulo: `Hora de subir em ${st.trilha.nome}`, texto: `Próximo nível: ${st.proximo.nome}.`, acao: link({ href: `#/trilha/${st.trilha.id}`, texto: 'Subir de nível', variante: 'fantasma' }) }));
  } else if (subir.length > 1) {
    lista.push(aviso({ tipo: 'sucesso', icone: 'subir', titulo: `Hora de subir em ${subir.length} trilhas`, texto: subir.map((st) => `${st.trilha.nome} → ${st.proximo.nome}`).join(' · '), acao: link({ href: '#/trilha', texto: 'Ver trilhas', variante: 'fantasma' }) }));
  }
  for (const st of status.filter((x) => x.sugerirDescer)) {
    lista.push(aviso({ tipo: 'aviso', titulo: `${st.trilha.nome}: que tal voltar um nível?`, texto: st.motivoDescer === 'dor' ? 'Você marcou dor no último treino. Voltar um nível protege a articulação.' : 'As duas últimas sessões ficaram abaixo da faixa. Voltar um pouco ajuda a ganhar base.', acao: link({ href: `#/trilha/${st.trilha.id}`, texto: 'Ajustar', variante: 'fantasma' }) }));
  }
  const teste = statusTeste(e);
  if (teste.devido && e.testes.length) {
    lista.push(aviso({ tipo: 'info', icone: 'alvo', titulo: 'Hora do teste de evolução', texto: 'Já faz 4 semanas. Leva uns 10 minutos e mostra o quanto você evoluiu.', acao: link({ href: '#/teste', texto: 'Fazer teste', variante: 'fantasma' }) }));
  }
  const semPesar = diasSemPesar(e);
  if (semPesar == null || semPesar >= 4) {
    lista.push(aviso({ tipo: 'info', icone: 'balanca', titulo: semPesar == null ? 'Registre seu peso' : `${semPesar} dias sem pesar`, texto: 'Pese-se 2 a 3 vezes por semana, pela manhã. O app usa a média de 7 dias.', acao: botao({ texto: 'Registrar', variante: 'fantasma', aoClicar: () => folhaMedidas({ aoSalvar: ctx.redesenhar }) }) }));
  }
  return lista;
}

export function cartaoHabitos(e, ctx, { comLink = true } = {}) {
  const hoje = hojeISO();
  const ativos = HABITOS.filter((x) => e.config.habitos.includes(x.id));
  if (!ativos.length) return null;
  const feitos = new Set(e.habitos[hoje] || []);
  return cartao(
    { titulo: 'Hábitos de hoje', subtitulo: `${[...feitos].filter((id) => e.config.habitos.includes(id)).length} de ${ativos.length}`, acao: comLink ? link({ href: '#/nutricao', texto: 'Metas', variante: 'fantasma' }) : null },
    h(
      'ul',
      { class: 'habitos' },
      ativos.map((hab) => {
        const entrada = h('input', { type: 'checkbox', checked: feitos.has(hab.id) });
        entrada.addEventListener('change', () => {
          atualizar((st) => {
            const set = new Set(st.habitos[hoje] || []);
            if (entrada.checked) set.add(hab.id);
            else set.delete(hab.id);
            st.habitos[hoje] = [...set];
          });
          verificarConquistas();
          ctx.redesenhar();
        });
        return h('li', null, h('label', { class: 'habito' }, entrada, h('span', { class: 'habito-caixa', 'aria-hidden': 'true' }, icone('check', { tamanho: 16 })), h('span', null, h('strong', null, hab.nome), h('small', null, hab.dica))));
      }),
    ),
  );
}

export default function telaHoje(ctx) {
  const e = obter();
  const plano = planoDoDia(e);
  const fase = faseDaSemana(plano.semana);
  const tot = totais(e);
  const peso = pesoAtual(e);
  const perdidos = kgPerdidos(e);
  const seq = sequenciaSemanas(e);
  const prox = proximaConquista(e);

  const principal = plano.tipo === 'forca' ? cartaoForca(e, plano, ctx) : plano.tipo === 'caminhada' ? cartaoCaminhada(e, plano, ctx) : cartaoDescanso(e, ctx);

  const conteudo = h(
    'div',
    { class: 'pilha' },
    h(
      'header',
      { class: 'ola' },
      h('h1', null, e.perfil.nome ? `${saudacao()}, ${e.perfil.nome}` : saudacao()),
      h('p', null, h('a', { href: '#/trilha', class: 'fase-chip' }, `Semana ${plano.semana} · Fase ${fase.numero}: ${fase.nome}`)),
    ),
    semanaLeve(plano.semana) ? aviso({ tipo: 'info', titulo: 'Semana leve', texto: 'A cada 8 semanas, 2 séries por exercício para o corpo assimilar o progresso. Volta ao normal na semana que vem.' }) : null,
    principal,
    faixaSemana(e),
    ...alertas(e, ctx),
    h(
      'div',
      { class: 'grade-stats compacta' },
      estatistica({ rotulo: 'Peso (7 dias)', valor: peso != null ? numCurto(peso) : '—', unidade: peso != null ? 'kg' : '', detalhe: peso == null ? 'Registre' : Math.abs(perdidos) >= 0.1 ? `${comSinal(-perdidos, 1, 'kg')} total` : 'Ponto de partida' }),
      estatistica({ rotulo: 'Treinos', valor: String(tot.treinos), detalhe: `${tot.caminhadas} ${tot.caminhadas === 1 ? 'caminhada' : 'caminhadas'}` }),
      estatistica({ rotulo: 'Semanas', valor: String(seq), detalhe: 'seguidas com 2+ treinos' }),
    ),
    cartaoHabitos(e, ctx),
    prox
      ? cartao(
          { titulo: 'Próxima conquista', acao: link({ href: '#/conquistas', texto: 'Ver todas', variante: 'fantasma' }) },
          h('div', { class: 'conquista-mini' }, h('span', { class: 'conquista-icone' }, icone('trofeu', { tamanho: 22 })), h('div', null, h('strong', null, prox.nome), h('small', null, prox.descricao))),
          barraProgresso(prox.progresso, `Progresso: ${Math.round(prox.progresso * 100)}%`),
          h('p', { class: 'texto-3' }, prox.unidade === 'nível' ? `Nível ${numCurto(prox.atual)} de ${numCurto(prox.alvo)}` : `${numCurto(Math.min(prox.atual, prox.alvo))} de ${numCurto(prox.alvo)}${prox.unidade ? ` ${prox.unidade}` : ''}`),
        )
      : null,
    h('aside', { class: 'dica' }, icone('info', { tamanho: 18 }), h('p', null, h('strong', null, 'Dica: '), dicaDoDia(hojeISO()))),
  );

  return { titulo: 'Hoje', aba: 'hoje', conteudo };
}
