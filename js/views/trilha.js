// A trilha de evolução: fases do programa, cada padrão de movimento com seus
// níveis, e o detalhe de uma trilha com histórico e ajuste manual.

import { atualizar, obter } from '../core/armazem.js';
import { formatarData, hojeISO } from '../core/datas.js';
import { ORDEM_TREINO, linkVideo, rotuloFaixa, trilha } from '../data/trilhas.js';
import { historicoTrilha } from '../logic/estatisticas.js';
import { FASES, faseDaSemana, semanaDoPrograma } from '../logic/plano.js';
import { TREINOS_NO_TOPO, entradasDaTrilha, mudarNivel, progressoGeral, statusTrilha } from '../logic/progressao.js';
import { abrirFolha, aviso, barraProgresso, botao, cartao, toast } from '../ui/componentes.js';
import { h, num } from '../ui/dom.js';
import { graficoLinha } from '../ui/graficos.js';
import { icone } from '../ui/icones.js';
import { verificarConquistas } from './acoes.js';

function escada(t, numero, { compacta = false } = {}) {
  return h(
    'ol',
    { class: `escada ${compacta ? 'compacta' : ''}`.trim(), 'aria-label': `Nível ${numero} de ${t.niveis.length}` },
    t.niveis.map((nv, i) => {
      const n = i + 1;
      const classe = n < numero ? 'feito' : n === numero ? 'atual' : '';
      return h('li', { class: `degrau ${classe}`.trim(), title: `${n}. ${nv.nome}` }, compacta ? null : h('span', null, String(n)));
    }),
  );
}

function chipStatus(st) {
  const t = st.trilha;
  if (!st.desbloqueada) {
    const req = trilha(t.desbloqueio.trilha);
    return h('span', { class: 'chip' }, icone('cadeado', { tamanho: 14 }), `Libera no nível ${t.desbloqueio.nivel} de ${req.nome.toLowerCase()}`);
  }
  if (st.podeSubir) return h('span', { class: 'chip chip-sucesso' }, icone('subir', { tamanho: 14 }), 'Hora de subir');
  if (st.sugerirDescer) return h('span', { class: 'chip chip-aviso' }, icone('alerta', { tamanho: 14 }), 'Revisar nível');
  if (st.noMaximo && st.topoSeguidos >= TREINOS_NO_TOPO) return h('span', { class: 'chip chip-sucesso' }, icone('estrela', { tamanho: 14 }), 'Trilha dominada');
  if (st.topoSeguidos > 0) return h('span', { class: 'chip' }, `Topo ${st.topoSeguidos}/${TREINOS_NO_TOPO}`);
  return h('span', { class: 'chip' }, `Meta ${rotuloFaixa(st.nivel)}`);
}

function linhaDoTempoFases(semana) {
  const atual = faseDaSemana(semana);
  return h(
    'ol',
    { class: 'fases' },
    FASES.map((f) =>
      h(
        'li',
        { class: `fase ${f.numero < atual.numero ? 'feita' : f.numero === atual.numero ? 'atual' : ''}`.trim(), 'aria-current': f.numero === atual.numero ? 'step' : null },
        h('span', { class: 'fase-barra' }),
        h('strong', null, f.nome),
        h('small', null, f.ate === Infinity ? `sem. ${f.de}+` : `sem. ${f.de}–${f.ate}`),
      ),
    ),
  );
}

function telaVisaoGeral() {
  const e = obter();
  const semana = semanaDoPrograma(e.perfil.inicio, hojeISO());
  const fase = faseDaSemana(semana);
  const geral = progressoGeral(e);

  const cartoes = ORDEM_TREINO.map((id) => {
    const st = statusTrilha(e, id);
    const t = st.trilha;
    return h(
      'a',
      { href: `#/trilha/${id}`, class: `card trilha-card ${st.desbloqueada ? '' : 'bloqueada'}`.trim() },
      h('div', { class: 'trilha-card-topo' }, h('span', { class: 'nivel-bolha grande' }, st.desbloqueada ? String(st.numero) : icone('cadeado', { tamanho: 16 })), h('div', null, h('strong', null, t.nome), h('small', null, st.desbloqueada ? st.nivel.nome : t.grupo)), icone('direita', { tamanho: 18, classe: 'item-seta' })),
      escada(t, st.desbloqueada ? st.numero : 0, { compacta: true }),
      h('div', { class: 'trilha-card-rodape' }, h('small', null, `Nível ${st.desbloqueada ? st.numero : 0} de ${t.niveis.length}`), chipStatus(st)),
    );
  });

  return {
    titulo: 'Trilha',
    aba: 'trilha',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Sua trilha'), h('p', { class: 'texto-2' }, `Semana ${semana} do programa`)),
      cartao(
        { titulo: `Fase ${fase.numero}: ${fase.nome}`, subtitulo: fase.resumo },
        linhaDoTempoFases(semana),
        h('ul', { class: 'lista-foco' }, fase.foco.map((f) => h('li', null, icone('check', { tamanho: 16 }), f))),
      ),
      cartao(
        { titulo: 'Progresso geral', subtitulo: `${Math.round(geral * 100)}% de todos os níveis` },
        barraProgresso(geral, 'Progresso geral nas trilhas'),
        h('p', { class: 'texto-3' }, 'Cada trilha anda no seu ritmo. Para subir: topo da faixa em todas as séries, sem chegar ao limite, em 2 treinos seguidos.'),
      ),
      h('div', { class: 'pilha-p' }, cartoes),
      h('p', { class: 'centro' }, h('a', { href: '#/biblioteca', class: 'link-externo' }, 'Ver todos os exercícios')),
    ),
  };
}

function folhaAjuste(t, atual, ctx) {
  abrirFolha({
    titulo: `Ajustar nível: ${t.nome}`,
    corpo: (fechar) =>
      h(
        'div',
        { class: 'pilha-p' },
        h('p', { class: 'texto-2' }, 'Use se o nível atual estiver fácil ou difícil demais. O histórico continua salvo.'),
        h(
          'ol',
          { class: 'opcoes-nivel' },
          t.niveis.map((nv, i) =>
            h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: `opcao-nivel ${i + 1 === atual ? 'atual' : ''}`.trim(),
                  'aria-current': i + 1 === atual ? 'true' : null,
                  onClick: () => {
                    if (i + 1 !== atual) {
                      atualizar((st) => mudarNivel(st, t.id, i + 1, 'ajuste'));
                      toast(`${t.nome}: nível ${i + 1}`, { tipo: 'sucesso' });
                      verificarConquistas();
                    }
                    fechar();
                    ctx.redesenhar();
                  },
                },
                h('span', { class: 'nivel-bolha' }, String(i + 1)),
                h('span', null, h('strong', null, nv.nome), h('small', null, rotuloFaixa(nv), nv.equipamento === 'barra' ? ' · precisa de barra' : '')),
              ),
            ),
          ),
        ),
      ),
  });
}

function telaDetalhe(id, ctx) {
  const e = obter();
  const t = trilha(id);
  if (!t) return null;
  const st = statusTrilha(e, id);
  const historico = historicoTrilha(e, id);
  const recentes = entradasDaTrilha(e, id).slice(-5).reverse();

  const acoes = [];
  if (!st.desbloqueada) {
    const req = trilha(t.desbloqueio.trilha);
    acoes.push(
      aviso({
        tipo: 'info',
        icone: 'cadeado',
        titulo: 'Trilha bloqueada',
        texto: `Ela entra no treino quando você chegar ao nível ${t.desbloqueio.nivel} de ${req.nome.toLowerCase()} (${req.niveis[t.desbloqueio.nivel - 1].nome}). Assim as pernas ganham base antes de trabalhar uma de cada vez.`,
        acao: botao({
          texto: 'Liberar agora',
          variante: 'fantasma',
          aoClicar: () => {
            atualizar((s) => {
              s.historicoNiveis.push({ em: new Date().toISOString(), data: hojeISO(), trilha: id, de: 1, para: 1, motivo: 'desbloqueio' });
            });
            toast(`${t.nome} entra nos próximos treinos`, { tipo: 'sucesso' });
            verificarConquistas();
            ctx.redesenhar();
          },
        }),
      }),
    );
  } else if (st.podeSubir) {
    acoes.push(
      aviso({
        tipo: 'sucesso',
        icone: 'subir',
        titulo: 'Hora de subir!',
        texto: `Você fez o topo em ${TREINOS_NO_TOPO} treinos seguidos. Próximo: ${st.proximo.nome}.`,
        acao: botao({
          texto: `Subir para o nível ${st.numero + 1}`,
          aoClicar: () => {
            atualizar((s) => mudarNivel(s, id, st.numero + 1, 'subiu'));
            toast(`${t.nome}: nível ${st.numero + 1}!`, { tipo: 'sucesso' });
            verificarConquistas();
            ctx.redesenhar();
          },
        }),
      }),
    );
  } else if (st.sugerirDescer) {
    acoes.push(
      aviso({
        tipo: 'aviso',
        titulo: 'Que tal voltar um nível?',
        texto: st.motivoDescer === 'dor' ? 'Você marcou dor no último treino. Voltar um nível costuma resolver; se a dor continuar, procure um profissional.' : 'As duas últimas sessões ficaram abaixo da faixa. Ganhar base no nível anterior acelera a volta.',
        acao: botao({
          texto: `Voltar para o nível ${st.numero - 1}`,
          variante: 'secundario',
          aoClicar: () => {
            atualizar((s) => mudarNivel(s, id, st.numero - 1, 'desceu'));
            toast(`${t.nome}: nível ${st.numero - 1}`);
            ctx.redesenhar();
          },
        }),
      }),
    );
  } else if (st.noTopoSemProximo && st.bloqueioEquipamento) {
    acoes.push(aviso({ tipo: 'info', titulo: 'Próximo nível precisa de barra', texto: 'Continue aqui aumentando o peso da mochila. Se tiver acesso a uma barra (praça ou academia ao ar livre), ative em Ajustes.' }));
  }

  const statusCard = cartao(
    { classe: 'status-trilha' },
    h('div', { class: 'trilha-card-topo' }, h('span', { class: 'nivel-bolha grande' }, String(st.numero)), h('div', null, h('strong', null, st.nivel.nome), h('small', null, `Nível ${st.numero} de ${st.total} · ${rotuloFaixa(st.nivel)}`))),
    escada(t, st.desbloqueada ? st.numero : 0),
    st.desbloqueada
      ? h(
          'div',
          { class: 'topo-contagem' },
          h('span', null, 'Treinos seguidos no topo'),
          h('span', { class: 'pontinhos', 'aria-label': `${st.topoSeguidos} de ${TREINOS_NO_TOPO}` }, Array.from({ length: TREINOS_NO_TOPO }, (_, i) => h('span', { class: i < st.topoSeguidos ? 'cheio' : '' }))),
        )
      : null,
    st.topoNoLimite ? h('p', { class: 'texto-3' }, 'No último treino você bateu o topo, mas no limite. Para contar, precisa sobrar 1 ou 2 repetições.') : null,
  );

  // Melhor série de cada treino, só dos níveis medidos do mesmo jeito que o atual.
  const mesmaMetrica = historico.filter((x) => t.niveis[x.nivel - 1]?.metrica === st.nivel.metrica);
  const emSegundos = st.nivel.metrica === 'segundos';
  const grafico = mesmaMetrica.length >= 2
    ? cartao(
        { titulo: 'Melhor série em cada treino', subtitulo: 'Cai um pouco quando você sobe de nível: é normal, o exercício ficou mais difícil.' },
        graficoLinha({
          series: [{ nome: emSegundos ? 'Segundos' : 'Repetições', tipo: 'linha', classe: 'serie-1', pontos: mesmaMetrica.map((x) => ({ data: x.data, valor: x.melhor })) }],
          formatar: (v) => num(v),
          unidade: emSegundos ? 's' : 'reps',
          altura: 170,
          descricao: `Melhor série de ${t.nome} em cada treino`,
        }),
      )
    : null;

  const mudancas = e.historicoNiveis.filter((x) => x.trilha === id && x.para !== x.de).slice(-6).reverse();
  const MOTIVOS = { subiu: 'Subiu', desceu: 'Voltou', ajuste: 'Ajuste manual' };
  const linhaTempo = mudancas.length
    ? cartao(
        { titulo: 'Mudanças de nível' },
        h(
          'ul',
          { class: 'resumo-lista' },
          mudancas.map((x) => h('li', null, h('span', null, h('strong', null, `${MOTIVOS[x.motivo] || 'Mudança'}: nível ${x.de} → ${x.para}`), h('small', null, t.niveis[x.para - 1]?.nome || '')), h('span', { class: 'texto-3' }, formatarData(x.data, { ano: true })))),
        ),
      )
    : null;

  const ultimos = recentes.length
    ? cartao(
        { titulo: 'Últimos treinos' },
        h(
          'ul',
          { class: 'resumo-lista' },
          recentes.map((r) => {
            const nv = t.niveis[r.nivel - 1];
            return h('li', null, h('span', null, h('strong', null, formatarData(r.data, { diaSemana: true })), h('small', null, `Nível ${r.nivel} · ${nv.nome}`)), h('span', { class: 'mono' }, `${r.series.map((v) => num(v)).join(' · ')}${nv.metrica === 'segundos' ? ' s' : ''}`));
          }),
        ),
      )
    : null;

  const niveis = cartao(
    { titulo: 'Todos os níveis', acao: botao({ texto: 'Ajustar', icone: 'editar', variante: 'fantasma', aoClicar: () => folhaAjuste(t, st.numero, ctx) }) },
    h(
      'ol',
      { class: 'niveis-lista' },
      t.niveis.map((nv, i) => {
        const n = i + 1;
        const estado = !st.desbloqueada ? '' : n < st.numero ? 'feito' : n === st.numero ? 'atual' : '';
        const semBarra = nv.equipamento === 'barra' && !e.config.barra;
        return h(
          'li',
          { class: `nivel-item ${estado}`.trim() },
          h(
            'details',
            { open: n === st.numero && st.desbloqueada },
            h(
              'summary',
              null,
              h('span', { class: 'nivel-bolha' }, estado === 'feito' ? icone('check', { tamanho: 14 }) : String(n)),
              h('span', { class: 'nivel-nome' }, h('strong', null, nv.nome), h('small', null, rotuloFaixa(nv), semBarra ? ' · precisa de barra' : '')),
              semBarra ? icone('cadeado', { tamanho: 16, classe: 'texto-3' }) : null,
            ),
            h(
              'div',
              { class: 'nivel-corpo' },
              h('ol', null, nv.como.map((p) => h('li', null, p))),
              nv.dicas.length ? h('p', null, h('strong', null, 'Dica: '), nv.dicas.join(' ')) : null,
              nv.erros.length ? h('p', null, h('strong', null, 'Evite: '), nv.erros.join(' ')) : null,
              h('a', { href: linkVideo(nv), target: '_blank', rel: 'noopener noreferrer', class: 'link-externo' }, 'Ver vídeos de exemplo'),
            ),
          ),
        );
      }),
    ),
  );

  return {
    titulo: t.nome,
    aba: 'trilha',
    voltar: '#/trilha',
    conteudo: h('div', { class: 'pilha' }, h('header', { class: 'ola' }, h('h1', null, t.nome), h('p', { class: 'texto-2' }, t.grupo)), ...acoes, statusCard, grafico, linhaTempo, ultimos, niveis),
  };
}

export default function telaTrilha(ctx) {
  const id = ctx.params[0];
  if (id) return telaDetalhe(id, ctx) || telaVisaoGeral();
  return telaVisaoGeral();
}
