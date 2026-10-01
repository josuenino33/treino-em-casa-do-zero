// Progresso: peso, cintura, constância, volume, medidas e fotos.

import { atualizar, gravarLocal, lerLocal, obter } from '../core/armazem.js';
import { addDias, diffDias, formatarData, hojeISO, inicioSemana } from '../core/datas.js';
import {
  CAMPOS_MEDIDA,
  NIVEIS_ATIVIDADE_MAPA,
  mapaAtividade,
  mediaMovel,
  minutosPorSemana,
  kmPorSemana,
  pesoAtual,
  pesoInicial,
  serieMedida,
  seriesPorSemana,
  tendencia,
} from '../logic/estatisticas.js';
import { avaliarRitmo } from '../logic/nutricao.js';
import { botao, cartao, confirmar, estatistica, segmentado, toast, vazio } from '../ui/componentes.js';
import { comSinal, h, numCurto } from '../ui/dom.js';
import { graficoColunas, graficoLinha, mapaAtividade as desenharMapa } from '../ui/graficos.js';
import { folhaMedidas } from './acoes.js';
import { secaoFotos } from './fotos.js';

const PERIODOS = [
  { id: '30', nome: '30 dias', dias: 30 },
  { id: '90', nome: '90 dias', dias: 90 },
  { id: 'tudo', nome: 'Tudo', dias: null },
];

function filtrar(pontos, desde) {
  return desde ? pontos.filter((p) => p.data >= desde) : pontos;
}

export default function telaProgresso(ctx) {
  const e = obter();
  const hoje = hojeISO();
  const periodo = PERIODOS.find((p) => p.id === lerLocal('periodo')) || PERIODOS[1];
  const primeiraData = [e.perfil.inicio, ...e.medidas.map((m) => m.data), ...e.treinos.map((t) => t.data), ...e.caminhadas.map((c) => c.data)].filter(Boolean).sort()[0] || hoje;
  const desde = periodo.dias ? addDias(hoje, -(periodo.dias - 1)) : null;
  const inicioReal = desde && desde > primeiraData ? desde : primeiraData;
  const semanas = Math.min(52, Math.max(4, Math.floor(diffDias(inicioSemana(inicioReal), hoje) / 7) + 1));

  const limpezas = [];
  const pesos = serieMedida(e, 'peso');
  const comMedia = mediaMovel(pesos);
  const pesosPeriodo = filtrar(comMedia, desde);
  const atual = pesoAtual(e);
  const ini = pesoInicial(e);
  const ritmo = tendencia(pesos, hoje);
  const avaliacao = avaliarRitmo(ritmo, atual);
  const cintura = serieMedida(e, 'cintura');
  const cinturaPeriodo = filtrar(cintura, desde);
  const deltaPeriodo = pesosPeriodo.length >= 2 ? pesosPeriodo.at(-1).media - pesosPeriodo[0].media : null;

  const filtro = h(
    'div',
    { class: 'filtros' },
    segmentado({
      rotulo: 'Período',
      opcoes: PERIODOS.map((p) => ({ id: p.id, nome: p.nome })),
      valor: periodo.id,
      aoMudar: (v) => {
        gravarLocal('periodo', v);
        ctx.redesenhar();
      },
    }),
  );

  const stats = h(
    'div',
    { class: 'grade-stats' },
    estatistica({ rotulo: 'Peso (média 7 dias)', valor: atual != null ? numCurto(atual) : '—', unidade: atual != null ? 'kg' : '', detalhe: deltaPeriodo != null ? `${comSinal(deltaPeriodo, 1, 'kg')} no período` : null }),
    estatistica({ rotulo: 'Desde o início', valor: atual != null && ini != null ? comSinal(atual - ini, 1) : '—', unidade: atual != null && ini != null ? 'kg' : '', detalhe: ini != null ? `Começou com ${numCurto(ini)} kg` : null }),
    estatistica({ rotulo: 'Ritmo (4 semanas)', valor: ritmo != null ? comSinal(ritmo, 1) : '—', unidade: ritmo != null ? 'kg/sem' : '', detalhe: ritmo == null ? 'Precisa de 3+ pesagens' : null }),
    estatistica({ rotulo: 'Cintura', valor: cintura.length ? numCurto(cintura.at(-1).valor) : '—', unidade: cintura.length ? 'cm' : '', detalhe: cintura.length >= 2 ? `${comSinal(cintura.at(-1).valor - cintura[0].valor, 1, 'cm')} desde o início` : null }),
  );

  const graficoPeso = cartao(
    { titulo: 'Peso', subtitulo: 'Pontos: pesagens · Linha: média de 7 dias', acao: botao({ texto: 'Registrar', icone: 'somar', variante: 'fantasma', aoClicar: () => folhaMedidas({ aoSalvar: ctx.redesenhar }) }) },
    pesosPeriodo.length
      ? graficoLinha({
          series: [
            { nome: 'Pesagem', tipo: 'pontos', classe: 'serie-muda', pontos: pesosPeriodo.map((p) => ({ data: p.data, valor: p.valor })) },
            { nome: 'Média 7 dias', tipo: 'linha', classe: 'serie-1', pontos: pesosPeriodo.map((p) => ({ data: p.data, valor: Number(p.media.toFixed(2)) })) },
          ],
          referencia: e.perfil.pesoMeta > 0 && atual != null && atual - e.perfil.pesoMeta < 15 ? { valor: e.perfil.pesoMeta, rotulo: 'Meta' } : null,
          unidade: 'kg',
          altura: 220,
          descricao: 'Peso ao longo do tempo',
        })
      : vazio({ icone: 'balanca', titulo: 'Nenhuma pesagem no período', texto: 'Pese-se 2 a 3 vezes por semana, pela manhã, em jejum.' }),
    avaliacao ? h('p', { class: `ritmo ritmo-${avaliacao.tipo}` }, avaliacao.texto) : null,
  );

  const graficoCintura = cartao(
    { titulo: 'Cintura', subtitulo: 'Na altura do umbigo, a cada 2 semanas' },
    graficoLinha({
      series: [{ nome: 'Cintura', tipo: 'linha', classe: 'serie-1', pontos: cinturaPeriodo }],
      unidade: 'cm',
      altura: 180,
      vazio: 'Sem medidas de cintura no período.',
      descricao: 'Cintura ao longo do tempo',
    }),
  );

  const semanasSeries = seriesPorSemana(e, hoje, Math.min(semanas, 26));
  const semanasMin = minutosPorSemana(e, hoje, Math.min(semanas, 26));
  const rotuloSemana = (inicio) => formatarData(inicio);
  const constancia = cartao(
    { titulo: 'Constância', subtitulo: 'Cada quadrado é um dia' },
    desenharMapa({ semanas: mapaAtividade(e, hoje, Math.min(semanas, 26)), rotulos: NIVEIS_ATIVIDADE_MAPA }),
  );
  const volume = cartao(
    { titulo: 'Séries de força por semana' },
    graficoColunas({
      barras: semanasSeries.map((s) => ({ rotulo: rotuloSemana(s.inicio), rotuloLongo: `Semana de ${formatarData(s.inicio, { ano: true })}`, valor: s.valor })),
      nomeSerie: 'Séries',
      vazio: 'Nenhum treino de força no período.',
      descricao: 'Séries de força por semana',
    }),
  );
  const semanasKm = kmPorSemana(e, hoje, Math.min(semanas, 26));
  const distanciaSemanal = semanasKm.some((s) => s.valor > 0)
    ? cartao(
        { titulo: 'Quilômetros por semana' },
        graficoColunas({
          barras: semanasKm.map((s) => ({ rotulo: rotuloSemana(s.inicio), rotuloLongo: `Semana de ${formatarData(s.inicio, { ano: true })}`, valor: s.valor })),
          unidade: 'km',
          nomeSerie: 'Quilômetros',
          formatar: (v) => numCurto(v, 1),
          descricao: 'Quilômetros caminhados por semana',
        }),
      )
    : null;
  const caminhadas = cartao(
    { titulo: 'Minutos de caminhada por semana' },
    graficoColunas({
      barras: semanasMin.map((s) => ({ rotulo: rotuloSemana(s.inicio), rotuloLongo: `Semana de ${formatarData(s.inicio, { ano: true })}`, valor: s.valor })),
      unidade: 'min',
      nomeSerie: 'Minutos',
      vazio: 'Nenhuma caminhada no período.',
      descricao: 'Minutos de caminhada por semana',
    }),
  );

  const outras = CAMPOS_MEDIDA.slice(2).map((c) => ({ c, pontos: serieMedida(e, c.id) })).filter((x) => x.pontos.length);
  const medidasCorpo = outras.length
    ? cartao(
        { titulo: 'Outras medidas' },
        h(
          'div',
          { class: 'tabela-rolagem' },
          h(
            'table',
            { class: 'tabela' },
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Medida'), h('th', { scope: 'col' }, 'Início'), h('th', { scope: 'col' }, 'Atual'), h('th', { scope: 'col' }, 'Diferença'))),
            h(
              'tbody',
              null,
              outras.map(({ c, pontos }) => h('tr', null, h('th', { scope: 'row' }, c.nome), h('td', null, `${numCurto(pontos[0].valor)} cm`), h('td', null, `${numCurto(pontos.at(-1).valor)} cm`), h('td', null, comSinal(pontos.at(-1).valor - pontos[0].valor, 1, 'cm')))),
            ),
          ),
        ),
      )
    : null;

  const registros = [...e.medidas].sort((a, b) => (a.data < b.data ? 1 : -1));
  const historicoMedidas = cartao(
    { titulo: 'Registros de medidas', subtitulo: registros.length ? `${registros.length} no total` : null },
    registros.length
      ? h(
          'ul',
          { class: 'resumo-lista' },
          registros.slice(0, 12).map((m) => {
            const partes = CAMPOS_MEDIDA.filter((c) => Number.isFinite(m[c.id])).map((c) => `${c.nome} ${numCurto(m[c.id])} ${c.unidade}`);
            return h(
              'li',
              null,
              h('span', null, h('strong', null, formatarData(m.data, { ano: true, diaSemana: true })), h('small', null, partes.join(' · '))),
              h(
                'span',
                { class: 'acoes-linha' },
                botao({ icone: 'editar', variante: 'fantasma', rotulo: 'Editar registro', aoClicar: () => folhaMedidas({ medida: m, aoSalvar: ctx.redesenhar }) }),
                botao({
                  icone: 'lixeira',
                  variante: 'fantasma',
                  rotulo: 'Apagar registro',
                  aoClicar: async () => {
                    if (!(await confirmar({ titulo: 'Apagar registro?', mensagem: `Medidas de ${formatarData(m.data, { ano: true })}.`, ok: 'Apagar', perigo: true }))) return;
                    atualizar((st) => {
                      st.medidas = st.medidas.filter((x) => x.id !== m.id);
                    });
                    toast('Registro apagado');
                    ctx.redesenhar();
                  },
                }),
              ),
            );
          }),
        )
      : vazio({ icone: 'balanca', titulo: 'Nada registrado ainda', acao: botao({ texto: 'Registrar medidas', aoClicar: () => folhaMedidas({ aoSalvar: ctx.redesenhar }) }) }),
  );

  const fotos = secaoFotos(ctx, (fn) => limpezas.push(fn));

  return {
    titulo: 'Progresso',
    aba: 'progresso',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Progresso')),
      filtro,
      stats,
      graficoPeso,
      graficoCintura,
      constancia,
      volume,
      caminhadas,
      distanciaSemanal,
      medidasCorpo,
      historicoMedidas,
      fotos,
      h('p', { class: 'centro' }, h('a', { href: '#/testes', class: 'link-externo' }, 'Ver testes de evolução')),
    ),
    aoSair: () => limpezas.forEach((fn) => fn()),
  };
}
