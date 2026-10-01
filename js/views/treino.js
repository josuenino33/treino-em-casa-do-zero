// Treino guiado: check-in, aquecimento, séries com descanso cronometrado e
// resumo com as decisões de nível. O rascunho fica salvo a cada passo, então
// dá para fechar o app no meio e continuar depois.

import { atualizar, gravarLocal, lerLocal, obter, removerLocal } from '../core/armazem.js';
import { hojeISO, relogio } from '../core/datas.js';
import { novoId } from '../core/esquema.js';
import { linkVideo, nivelDe, rotuloFaixa, trilha } from '../data/trilhas.js';
import { semanaDoPrograma, semanaLeve } from '../logic/plano.js';
import {
  ESFORCOS,
  avaliarEntrada,
  estimarMinutos,
  melhorSerie,
  montarTreino,
  mudarNivel,
  statusTrilha,
} from '../logic/progressao.js';
import { abrirFolha, alternador, aviso, barraProgresso, botao, cartao, confirmar, contador, segmentado, toast } from '../ui/componentes.js';
import { h, limpar, num, s } from '../ui/dom.js';
import { icone } from '../ui/icones.js';
import { bipe, liberarSom, liberarTela, manterTelaLigada, vibrar } from '../ui/som.js';
import { verificarConquistas } from './acoes.js';

const CHAVE = 'rascunho';

export const AQUECIMENTO = [
  { nome: 'Marcha no lugar', detalhe: '1 minuto, joelhos na altura confortável' },
  { nome: 'Círculos com os braços', detalhe: '30 segundos para frente e 30 para trás' },
  { nome: 'Círculos com o quadril', detalhe: '10 para cada lado' },
  { nome: 'Meio agachamento', detalhe: '10 repetições, descendo só até a metade' },
  { nome: 'Flexão na parede', detalhe: '10 repetições bem leves' },
];

function novoRascunho(e) {
  const semana = semanaDoPrograma(e.perfil.inicio, hojeISO());
  const modo = semanaLeve(semana) ? 'curto' : 'completo';
  return {
    id: novoId(),
    data: hojeISO(),
    inicio: new Date().toISOString(),
    modo,
    etapa: 'checkin',
    dorInicial: false,
    idx: 0,
    exercicios: montarTreino(e, modo),
    aquecimento: AQUECIMENTO.map(() => false),
    descansoAte: null,
    cronometroDesde: null,
    fim: null,
    rpe: null,
    notas: '',
    decisoes: {},
  };
}

export default function telaTreino(ctx) {
  const e = obter();
  let r = lerLocal(CHAVE);
  // Rascunho de outro dia sem nenhuma série feita: começa um treino novo.
  // Se já tinha séries, o treino fica registrado na data em que começou.
  if (!r || (r.data !== hojeISO() && !r.exercicios.some((x) => x.series.length))) r = novoRascunho(e);
  const raiz = h('div', { class: 'treino' });
  let relogioTick = null;
  let avisouMeta = false;
  let refsTimer = {};

  const salvar = () => gravarLocal(CHAVE, r);
  const exAtual = () => r.exercicios[r.idx];

  function pararTick() {
    if (relogioTick) clearInterval(relogioTick);
    relogioTick = null;
  }

  function iniciarTick() {
    pararTick();
    relogioTick = setInterval(tick, 250);
    tick();
  }

  function tick() {
    const agora = Date.now();
    if (r.descansoAte) {
      const resta = Math.max(0, (r.descansoAte - agora) / 1000);
      if (refsTimer.descanso) {
        refsTimer.descanso.textContent = relogio(Math.ceil(resta));
        const total = r.descansoTotal || obter().config.descanso;
        const fracao = Math.min(1, Math.max(0, 1 - resta / total));
        refsTimer.anel?.setAttribute('stroke-dashoffset', String(refsTimer.circ * fracao));
      }
      if (resta <= 3 && resta > 0 && Math.ceil(resta) !== refsTimer.ultimoBipe) {
        refsTimer.ultimoBipe = Math.ceil(resta);
        bipe('aviso');
      }
      if (resta <= 0) {
        r.descansoAte = null;
        salvar();
        bipe('fim');
        vibrar([180, 80, 180]);
        desenhar();
      }
      return;
    }
    if (r.cronometroDesde) {
      const dec = (agora - r.cronometroDesde) / 1000;
      if (refsTimer.cronometro) {
        if (dec < 0) {
          refsTimer.cronometro.textContent = String(Math.ceil(-dec));
          refsTimer.cronoRotulo.textContent = 'Prepare-se';
          if (Math.ceil(-dec) !== refsTimer.ultimoBipe) {
            refsTimer.ultimoBipe = Math.ceil(-dec);
            bipe('aviso');
          }
        } else {
          if (refsTimer.ultimoBipe !== 0) {
            refsTimer.ultimoBipe = 0;
            bipe('curto');
          }
          refsTimer.cronometro.textContent = relogio(Math.floor(dec));
          refsTimer.cronoRotulo.textContent = `Meta: ${relogio(refsTimer.meta)}`;
          if (!avisouMeta && dec >= refsTimer.meta) {
            avisouMeta = true;
            bipe('fim');
            vibrar([250]);
            refsTimer.cronometro.classList.add('meta-batida');
          }
        }
      }
    }
  }

  async function sair() {
    if (r.etapa === 'checkin' && !r.exercicios.some((x) => x.series.length)) {
      removerLocal(CHAVE);
      ctx.navegar('#/hoje');
      return;
    }
    salvar();
    ctx.navegar('#/hoje');
    toast('Treino salvo. Continue quando quiser pela tela Hoje.');
  }

  async function descartar() {
    const ok = await confirmar({ titulo: 'Descartar treino?', mensagem: 'As séries registradas neste treino serão apagadas.', ok: 'Descartar', perigo: true });
    if (!ok) return;
    removerLocal(CHAVE);
    liberarTela();
    ctx.navegar('#/hoje');
  }

  function topo(titulo, progresso) {
    return h(
      'div',
      { class: 'treino-topo' },
      botao({ icone: 'x', variante: 'fantasma', rotulo: 'Sair do treino', aoClicar: sair }),
      h('div', { class: 'treino-topo-meio' }, h('span', null, titulo), progresso != null ? barraProgresso(progresso, titulo) : null),
      botao({ icone: 'lixeira', variante: 'fantasma', rotulo: 'Descartar treino', aoClicar: descartar }),
    );
  }

  // ---------- Etapa 1: check-in ----------
  function telaCheckin() {
    const est = obter();
    const minutos = (modo) => estimarMinutos(montarTreino(est, modo), est.config.descanso);
    const leve = semanaLeve(semanaDoPrograma(est.perfil.inicio, hojeISO()));
    const avisoDor = h('div', { hidden: !r.dorInicial }, aviso({ tipo: 'aviso', titulo: 'Treine só o que não dói', texto: 'Pule os exercícios que incomodam a articulação. Se a dor for forte, troque o treino por uma caminhada leve hoje.' }));

    return h(
      'div',
      { class: 'pilha' },
      topo('Antes de começar', null),
      h('h1', null, 'Como você está hoje?'),
      cartao(
        { titulo: 'Duração' },
        segmentado({
          rotulo: 'Duração do treino',
          classe: 'segmentado-grande',
          opcoes: [
            { id: 'completo', nome: 'Completo', detalhe: `3 séries · ~${minutos('completo')} min` },
            { id: 'curto', nome: 'Curto', detalhe: `2 séries · ~${minutos('curto')} min` },
          ],
          valor: r.modo,
          aoMudar: (modo) => {
            r.modo = modo;
            r.exercicios = montarTreino(obter(), modo);
            salvar();
          },
        }),
        leve ? h('p', { class: 'texto-3' }, 'Esta é uma semana leve: o treino curto é o recomendado.') : h('p', { class: 'texto-3' }, 'Dia corrido? O curto conta como treino, mas não conta para subir de nível.'),
      ),
      cartao(
        { titulo: 'Alguma articulação doendo?', subtitulo: 'Joelho, ombro, lombar, punho…' },
        segmentado({
          rotulo: 'Dor articular',
          opcoes: [
            { id: false, nome: 'Não' },
            { id: true, nome: 'Sim' },
          ],
          valor: r.dorInicial,
          aoMudar: (v) => {
            r.dorInicial = v;
            avisoDor.hidden = !v;
            salvar();
          },
        }),
        avisoDor,
      ),
      h('p', { class: 'texto-3 alerta-texto' }, icone('coracao', { tamanho: 16 }), ' Dor no peito, tontura ou falta de ar fora do normal: pare e procure atendimento.'),
      botao({
        texto: 'Ir para o aquecimento',
        icone: 'direita',
        tamanho: 'lg',
        bloco: true,
        aoClicar: () => {
          liberarSom();
          manterTelaLigada();
          r.etapa = 'aquecimento';
          salvar();
          desenhar();
        },
      }),
    );
  }

  // ---------- Etapa 2: aquecimento ----------
  function telaAquecimento() {
    const itens = AQUECIMENTO.map((a, i) => {
      const entrada = h('input', { type: 'checkbox', checked: r.aquecimento[i] });
      entrada.addEventListener('change', () => {
        r.aquecimento[i] = entrada.checked;
        salvar();
      });
      return h('li', null, h('label', { class: 'habito' }, entrada, h('span', { class: 'habito-caixa', 'aria-hidden': 'true' }, icone('check', { tamanho: 16 })), h('span', null, h('strong', null, a.nome), h('small', null, a.detalhe))));
    });
    return h(
      'div',
      { class: 'pilha' },
      topo('Aquecimento', 0),
      h('h1', null, 'Aquecimento · 5 min'),
      h('p', { class: 'texto-2' }, 'Prepara articulações e músculos e diminui o risco de lesão. Marque conforme for fazendo.'),
      cartao(null, h('ul', { class: 'habitos' }, itens)),
      botao({
        texto: 'Começar os exercícios',
        icone: 'play',
        tamanho: 'lg',
        bloco: true,
        aoClicar: () => {
          liberarSom();
          r.etapa = 'exercicio';
          r.idx = 0;
          salvar();
          desenhar();
        },
      }),
    );
  }

  // ---------- Etapa 3: exercícios ----------
  function editarSerie(ex, nv, k) {
    let valor = ex.series[k];
    abrirFolha({
      titulo: `Corrigir série ${k + 1}`,
      classe: 'folha-pequena',
      corpo: contador({ valor, min: 0, max: nv.max * 3, passo: nv.metrica === 'segundos' ? 5 : 1, sufixo: nv.metrica === 'segundos' ? ' s' : '', rotulo: 'valor da série', aoMudar: (v) => (valor = v) }),
      rodape: (fechar) => [
        botao({
          texto: 'Remover série',
          variante: 'secundario',
          aoClicar: () => {
            ex.series.splice(k, 1);
            r.descansoAte = null;
            salvar();
            fechar();
            desenhar();
          },
        }),
        botao({
          texto: 'Salvar',
          aoClicar: () => {
            ex.series[k] = valor;
            salvar();
            fechar();
            desenhar();
          },
        }),
      ],
    });
  }

  function proximo() {
    r.descansoAte = null;
    r.cronometroDesde = null;
    if (r.idx < r.exercicios.length - 1) {
      r.idx += 1;
    } else {
      r.etapa = 'resumo';
      r.fim = new Date().toISOString();
      liberarTela();
    }
    salvar();
    desenhar();
    window.scrollTo({ top: 0 });
  }

  function telaExercicio() {
    const est = obter();
    const ex = exAtual();
    // Voltou para um exercício pulado: permite fazer agora.
    if (ex.pulado && !ex.series.length) ex.pulado = false;
    const t = trilha(ex.trilha);
    const nv = nivelDe(ex.trilha, ex.nivel);
    const st = statusTrilha(est, ex.trilha);
    const total = r.exercicios.length;
    const feitas = ex.series.length;
    const nSeries = ex.metas.length;
    const terminou = feitas >= nSeries;
    const segundos = nv.metrica === 'segundos';
    const sufixo = segundos ? ' s' : '';
    refsTimer = {};

    const cabeca = h(
      'div',
      { class: 'exercicio-cabeca' },
      h('span', { class: 'sobretitulo' }, `${t.nome} · nível ${ex.nivel} de ${t.niveis.length}`),
      h('h1', null, nv.nome),
      h('p', { class: 'texto-2' }, rotuloFaixa(nv), nv.porLado ? ' · registre o número de um lado' : ''),
    );

    const como = h(
      'details',
      { class: 'como-fazer', open: st.entradas === 0 },
      h('summary', null, 'Como fazer'),
      h('ol', null, nv.como.map((p) => h('li', null, p))),
      nv.dicas.length ? h('p', null, h('strong', null, 'Dica: '), nv.dicas.join(' ')) : null,
      nv.erros.length ? h('p', null, h('strong', null, 'Evite: '), nv.erros.join(' ')) : null,
      h('a', { href: linkVideo(nv), target: '_blank', rel: 'noopener noreferrer', class: 'link-externo' }, 'Ver vídeos de exemplo no YouTube'),
    );

    const ultimaVez = st.ultima ? h('p', { class: 'ultima-vez' }, `Última vez: ${st.ultima.series.map((v) => num(v)).join(' · ')}${sufixo}`) : h('p', { class: 'ultima-vez' }, 'Primeira vez neste nível: comece pela meta mínima.');

    const listaSeries = h(
      'ol',
      { class: 'series' },
      ex.metas.map((meta, k) => {
        const feito = k < feitas;
        const atual = k === feitas && !terminou;
        const classe = feito ? 'feita' : atual ? 'atual' : '';
        return h(
          'li',
          { class: `serie ${classe}`.trim() },
          h('span', { class: 'serie-n' }, `Série ${k + 1}`),
          feito
            ? h('button', { type: 'button', class: 'serie-valor', 'aria-label': `Série ${k + 1}: ${ex.series[k]}${sufixo}. Toque para corrigir`, onClick: () => editarSerie(ex, nv, k) }, icone('check', { tamanho: 16 }), `${num(ex.series[k])}${sufixo}`)
            : h('span', { class: 'serie-valor vazio' }, `${num(meta)}${sufixo}`),
          h('span', { class: 'serie-meta' }, feito ? `meta ${num(meta)}` : 'meta'),
        );
      }),
    );

    let painel;
    if (r.descansoAte && !terminou) {
      const raio = 54;
      const circ = 2 * Math.PI * raio;
      const anel = s('circle', { class: 'anel-progresso', cx: 64, cy: 64, r: raio, 'stroke-dasharray': circ, 'stroke-dashoffset': 0 });
      const texto = h('span', { class: 'descanso-tempo', 'aria-live': 'off' }, '');
      refsTimer = { descanso: texto, anel, circ };
      painel = cartao(
        { classe: 'descanso' },
        h('p', { class: 'sobretitulo' }, `Descanso · depois vem a série ${feitas + 1}`),
        h('div', { class: 'anel' }, s('svg', { viewBox: '0 0 128 128', width: 128, height: 128, 'aria-hidden': 'true' }, s('circle', { class: 'anel-trilho', cx: 64, cy: 64, r: raio }), anel), texto),
        h(
          'div',
          { class: 'acoes centro' },
          botao({ texto: '+15 s', variante: 'secundario', aoClicar: () => { r.descansoAte += 15000; r.descansoTotal = (r.descansoTotal || obter().config.descanso) + 15; salvar(); tick(); } }),
          botao({ texto: 'Pular descanso', icone: 'pular', variante: 'secundario', aoClicar: () => { r.descansoAte = null; salvar(); desenhar(); } }),
        ),
      );
    } else if (!terminou) {
      const meta = ex.metas[feitas];
      const cont = contador({ valor: meta, min: 0, max: Math.max(nv.max * 3, meta + 20), passo: segundos ? 5 : 1, sufixo, rotulo: segundos ? 'segundos' : 'repetições' });
      let crono = null;
      if (segundos) {
        const visor = h('span', { class: 'crono-visor' }, r.cronometroDesde ? '' : relogio(0));
        const rotulo = h('span', { class: 'crono-rotulo' }, `Meta: ${relogio(meta)}`);
        refsTimer = { cronometro: visor, cronoRotulo: rotulo, meta };
        avisouMeta = false;
        crono = h(
          'div',
          { class: 'crono' },
          visor,
          rotulo,
          r.cronometroDesde
            ? botao({
                texto: 'Parar',
                icone: 'pausa',
                variante: 'primario',
                tamanho: 'lg',
                aoClicar: () => {
                  const dec = Math.max(0, Math.floor((Date.now() - r.cronometroDesde) / 1000));
                  r.cronometroDesde = null;
                  ex.rascunhoValor = dec;
                  salvar();
                  desenhar();
                },
              })
            : botao({
                texto: 'Iniciar cronômetro',
                icone: 'relogio',
                variante: 'secundario',
                tamanho: 'lg',
                aoClicar: () => {
                  liberarSom();
                  r.cronometroDesde = Date.now() + 3000;
                  salvar();
                  desenhar();
                },
              }),
        );
        if (ex.rascunhoValor != null) cont.definir(ex.rascunhoValor);
      }
      painel = cartao(
        { classe: 'registro' },
        h('p', { class: 'sobretitulo' }, `Série ${feitas + 1} de ${nSeries}`),
        crono,
        r.cronometroDesde ? null : h('p', { class: 'texto-3 centro' }, segundos ? 'Ajuste o tempo que você segurou com boa postura:' : 'Quantas repetições bem feitas?'),
        r.cronometroDesde ? null : cont,
        r.cronometroDesde
          ? null
          : botao({
              texto: 'Concluir série',
              icone: 'check',
              tamanho: 'lg',
              bloco: true,
              aoClicar: () => {
                liberarSom();
                ex.series.push(cont.valor());
                delete ex.rascunhoValor;
                if (ex.series.length < nSeries) {
                  r.descansoTotal = obter().config.descanso;
                  r.descansoAte = Date.now() + r.descansoTotal * 1000;
                }
                salvar();
                desenhar();
              },
            }),
      );
    } else {
      const avaliacao = avaliarEntrada(nv, { series: ex.series, esforco: ex.esforco });
      painel = cartao(
        { classe: 'registro', titulo: 'Como foi?' },
        segmentado({
          rotulo: 'Quanto sobrou no fim das séries',
          classe: 'segmentado-vertical',
          opcoes: ESFORCOS.map((op) => ({ id: op.id, nome: op.nome, detalhe: op.detalhe })),
          valor: ex.esforco,
          aoMudar: (v) => {
            ex.esforco = v;
            salvar();
            desenhar();
          },
        }),
        alternador({
          rotulo: 'Senti dor em alguma articulação',
          detalhe: 'O app vai sugerir voltar um nível',
          marcado: ex.dor,
          aoMudar: (v) => {
            ex.dor = v;
            salvar();
          },
        }),
        avaliacao.completa && ex.series.every((v) => v >= nv.max) && ex.esforco === 'falha'
          ? aviso({ tipo: 'info', texto: 'Você bateu o topo, mas no limite. Repita até sobrar 1 ou 2 repetições para contar para a subida.' })
          : null,
        botao({
          texto: r.idx < total - 1 ? 'Próximo exercício' : 'Finalizar treino',
          icone: r.idx < total - 1 ? 'direita' : 'check',
          tamanho: 'lg',
          bloco: true,
          desabilitado: !ex.esforco,
          aoClicar: proximo,
        }),
        !ex.esforco ? h('p', { class: 'texto-3 centro' }, 'Escolha uma opção para continuar.') : null,
      );
    }

    const rodape = h(
      'div',
      { class: 'acoes entre' },
      r.idx > 0
        ? botao({ texto: 'Anterior', icone: 'esquerda', variante: 'fantasma', aoClicar: () => { r.idx -= 1; r.descansoAte = null; r.cronometroDesde = null; salvar(); desenhar(); } })
        : h('span'),
      !terminou
        ? botao({
            texto: feitas ? 'Encerrar aqui' : 'Pular exercício',
            icone: 'pular',
            variante: 'fantasma',
            aoClicar: () => {
              if (feitas) {
                ex.metas = ex.metas.slice(0, feitas);
                r.descansoAte = null;
              } else {
                ex.pulado = true;
                ex.esforco = null;
                proximo();
                return;
              }
              salvar();
              desenhar();
            },
          })
        : null,
    );

    // O controle da série vem logo depois do nome: é o que se usa a cada minuto.
    return h('div', { class: 'pilha' }, topo(`Exercício ${r.idx + 1} de ${total}`, r.idx / total), cabeca, listaSeries, painel, ultimaVez, como, rodape);
  }

  // ---------- Etapa 4: resumo ----------
  function decisoesDeNivel() {
    const est = structuredClone(obter());
    est.treinos.push(montarRegistro());
    const lista = [];
    for (const ex of r.exercicios) {
      if (ex.pulado || !ex.series.length) continue;
      const st = statusTrilha(est, ex.trilha);
      if (st.numero !== ex.nivel) continue;
      if (st.podeSubir) lista.push({ tipo: 'subir', ex, st });
      else if (st.sugerirDescer) lista.push({ tipo: 'descer', ex, st });
      else if (st.noTopoSemProximo && st.bloqueioEquipamento) lista.push({ tipo: 'equipamento', ex, st });
    }
    return lista;
  }

  function montarRegistro() {
    return {
      id: r.id,
      data: r.data,
      inicio: r.inicio,
      fim: r.fim || new Date().toISOString(),
      modo: r.modo,
      dorInicial: r.dorInicial,
      exercicios: r.exercicios.map((x) => ({
        trilha: x.trilha,
        nivel: x.nivel,
        metas: x.metas,
        series: x.series,
        esforco: x.esforco,
        dor: x.dor,
        pulado: x.pulado || !x.series.length,
      })),
      rpe: r.rpe,
      notas: r.notas,
    };
  }

  function telaResumo() {
    const est = obter();
    const reg = montarRegistro();
    const feitos = reg.exercicios.filter((x) => !x.pulado);
    const duracao = Math.max(1, Math.round((Date.parse(reg.fim) - Date.parse(reg.inicio)) / 60000));
    const series = feitos.reduce((a, x) => a + x.series.length, 0);
    const decisoes = decisoesDeNivel();
    for (const d of decisoes) {
      if (!(d.ex.trilha in r.decisoes)) r.decisoes[d.ex.trilha] = d.tipo === 'subir' ? 'subir' : 'manter';
    }

    const linhas = feitos.map((x) => {
      const nv = nivelDe(x.trilha, x.nivel);
      const recorde = Math.max(...x.series) > melhorSerie(est, x.trilha, x.nivel) && melhorSerie(est, x.trilha, x.nivel) > 0;
      const noTopo = avaliarEntrada(nv, x).noTopo;
      return h(
        'li',
        null,
        h('span', null, h('strong', null, nv.nome), h('small', null, `${x.series.map((v) => num(v)).join(' · ')}${nv.metrica === 'segundos' ? ' s' : ''}`)),
        h('span', { class: 'selos' }, noTopo ? h('span', { class: 'selo selo-sucesso' }, 'Topo') : null, recorde ? h('span', { class: 'selo' }, 'Recorde') : null),
      );
    });

    const cartoesDecisao = decisoes.map((d) => {
      const t = trilha(d.ex.trilha);
      if (d.tipo === 'equipamento') {
        return aviso({ tipo: 'info', titulo: `${t.nome}: topo do nível sem barra`, texto: 'O próximo nível precisa de uma barra (praça ou academia ao ar livre). Até lá, coloque mais peso na mochila. Se tiver acesso a uma barra, ative em Ajustes.' });
      }
      const subir = d.tipo === 'subir';
      const alvo = subir ? d.st.proximo : t.niveis[d.st.numero - 2];
      return cartao(
        { classe: subir ? 'decisao subir' : 'decisao', titulo: subir ? `Subir em ${t.nome}!` : `${t.nome}: voltar um nível?`, subtitulo: subir ? `2 treinos seguidos no topo. Próximo: ${alvo.nome}.` : d.st.motivoDescer === 'dor' ? `Você marcou dor. Sugestão: ${alvo.nome}.` : `Duas sessões abaixo da faixa. Sugestão: ${alvo.nome}.` },
        segmentado({
          rotulo: `Decisão para ${t.nome}`,
          opcoes: subir ? [{ id: 'subir', nome: 'Subir agora' }, { id: 'manter', nome: 'Ainda não' }] : [{ id: 'descer', nome: 'Voltar um nível' }, { id: 'manter', nome: 'Manter' }],
          valor: r.decisoes[d.ex.trilha],
          aoMudar: (v) => {
            r.decisoes[d.ex.trilha] = v;
            salvar();
          },
        }),
      );
    });

    const notas = h('textarea', { rows: 3, maxlength: 1000, placeholder: 'Como se sentiu, o que doeu, o que foi fácil…' }, r.notas);
    notas.addEventListener('input', () => {
      r.notas = notas.value;
      salvar();
    });

    return h(
      'div',
      { class: 'pilha' },
      topo('Resumo', 1),
      h('div', { class: 'celebracao' }, h('span', { class: 'celebracao-icone' }, icone('trofeu', { tamanho: 36 })), h('h1', null, 'Treino concluído!'), h('p', { class: 'texto-2' }, 'Cada treino é um tijolo. Hoje você colocou mais um.')),
      h(
        'div',
        { class: 'grade-stats compacta' },
        h('div', { class: 'stat' }, h('span', { class: 'stat-rotulo' }, 'Duração'), h('span', { class: 'stat-valor' }, String(duracao), h('small', null, ' min'))),
        h('div', { class: 'stat' }, h('span', { class: 'stat-rotulo' }, 'Séries'), h('span', { class: 'stat-valor' }, String(series))),
        h('div', { class: 'stat' }, h('span', { class: 'stat-rotulo' }, 'Exercícios'), h('span', { class: 'stat-valor' }, `${feitos.length}/${reg.exercicios.length}`)),
      ),
      ...cartoesDecisao,
      cartao({ titulo: 'Exercícios' }, h('ul', { class: 'resumo-lista' }, linhas)),
      cartao(
        { titulo: 'Quão puxado foi o treino?' },
        segmentado({
          rotulo: 'Intensidade do treino',
          opcoes: [
            { id: 3, nome: 'Leve' },
            { id: 5, nome: 'Moderado' },
            { id: 7, nome: 'Puxado' },
            { id: 9, nome: 'Muito puxado' },
          ],
          valor: r.rpe,
          aoMudar: (v) => {
            r.rpe = v;
            salvar();
          },
        }),
        h('label', { class: 'rotulo', for: 'notas-treino' }, 'Anotações'),
        Object.assign(notas, { id: 'notas-treino' }),
      ),
      botao({ texto: 'Salvar treino', icone: 'check', tamanho: 'lg', bloco: true, aoClicar: () => finalizar(decisoes) }),
      botao({ texto: 'Voltar aos exercícios', variante: 'fantasma', bloco: true, aoClicar: () => { r.etapa = 'exercicio'; r.fim = null; salvar(); desenhar(); } }),
    );
  }

  function finalizar(decisoes) {
    const reg = montarRegistro();
    const mudancas = [];
    atualizar((st) => {
      st.treinos.push(reg);
      const em = new Date(Math.max(Date.now(), Date.parse(reg.fim) + 1)).toISOString();
      for (const d of decisoes) {
        const escolha = r.decisoes[d.ex.trilha];
        if (d.tipo === 'subir' && escolha === 'subir') {
          mudarNivel(st, d.ex.trilha, d.st.numero + 1, 'subiu', em);
          mudancas.push(`${trilha(d.ex.trilha).nome}: nível ${d.st.numero + 1}`);
        } else if (d.tipo === 'descer' && escolha === 'descer') {
          mudarNivel(st, d.ex.trilha, d.st.numero - 1, 'desceu', em);
        }
      }
    });
    removerLocal(CHAVE);
    liberarTela();
    toast(mudancas.length ? `Treino salvo! Subiu: ${mudancas.join(', ')}` : 'Treino salvo!', { tipo: 'sucesso', duracao: 5000 });
    verificarConquistas();
    ctx.navegar('#/hoje');
  }

  function desenhar() {
    salvar();
    limpar(raiz);
    pararTick();
    const telas = { checkin: telaCheckin, aquecimento: telaAquecimento, exercicio: telaExercicio, resumo: telaResumo };
    raiz.append((telas[r.etapa] || telaCheckin)());
    if (r.descansoAte || r.cronometroDesde) iniciarTick();
  }

  // Se o treino já tinha começado, mantém a tela ligada ao voltar.
  if (r.etapa === 'exercicio') manterTelaLigada();
  desenhar();

  return {
    titulo: 'Treino',
    telaCheia: true,
    conteudo: raiz,
    aoSair: () => {
      pararTick();
      liberarTela();
    },
    telaAtiva: () => r.etapa === 'exercicio',
  };
}
