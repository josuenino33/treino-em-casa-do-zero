// Cronômetro de caminhada, com avisos de troca de ritmo na intervalada.

import { gravarLocal, lerLocal, obter, removerLocal } from '../core/armazem.js';
import { relogio } from '../core/datas.js';
import { INTERVALO_SEG, TIPOS_CAMINHADA, planoDoDia } from '../logic/plano.js';
import { barraProgresso, botao, cartao, confirmar, segmentado, toast } from '../ui/componentes.js';
import { h, limpar } from '../ui/dom.js';
import { bipe, liberarSom, liberarTela, manterTelaLigada, vibrar } from '../ui/som.js';
import { folhaCaminhada } from './acoes.js';

const CHAVE = 'caminhada';
const AQUECIMENTO_SEG = 5 * 60;

export function faseIntervalo(segundos) {
  if (segundos < AQUECIMENTO_SEG) return { nome: 'Aquecimento', detalhe: 'Ritmo normal', resta: AQUECIMENTO_SEG - segundos, rapido: false };
  const dentro = segundos - AQUECIMENTO_SEG;
  const bloco = Math.floor(dentro / INTERVALO_SEG);
  const rapido = bloco % 2 === 0;
  return { nome: rapido ? 'Rápido' : 'Normal', detalhe: rapido ? 'Passo acelerado, fôlego curto' : 'Recupere o fôlego', resta: INTERVALO_SEG - (dentro % INTERVALO_SEG), rapido, bloco };
}

export default function telaCaminhada(ctx) {
  const plano = planoDoDia(obter());
  let c = lerLocal(CHAVE) || { inicio: null, pausadoEm: null, pausas: 0, tipo: plano.tipoCaminhada, meta: plano.metaMin, avisouMeta: false };
  const raiz = h('div', { class: 'treino' });
  let tick = null;
  let refs = {};
  let ultimaFase = null;

  const salvar = () => gravarLocal(CHAVE, c);
  const decorrido = () => {
    if (!c.inicio) return 0;
    const fim = c.pausadoEm || Date.now();
    return Math.max(0, (fim - c.inicio - c.pausas) / 1000);
  };

  function atualizarVisor() {
    const seg = decorrido();
    if (refs.visor) refs.visor.textContent = relogio(seg);
    if (refs.barra) {
      const fr = Math.min(1, seg / (c.meta * 60));
      refs.barra.firstChild.style.width = `${Math.round(fr * 100)}%`;
      refs.barra.setAttribute('aria-valuenow', String(Math.round(fr * 100)));
    }
    if (c.tipo === 'intervalada' && refs.fase) {
      const f = faseIntervalo(seg);
      refs.fase.textContent = f.nome;
      refs.faseDetalhe.textContent = `${f.detalhe} · troca em ${relogio(f.resta)}`;
      refs.faseCaixa.classList.toggle('rapido', f.rapido);
      const chave = `${f.nome}-${f.bloco ?? 'a'}`;
      if (ultimaFase && ultimaFase !== chave && !c.pausadoEm) {
        bipe('fim');
        vibrar([200, 100, 200]);
      }
      ultimaFase = chave;
    }
    if (!c.avisouMeta && seg >= c.meta * 60 && c.inicio) {
      c.avisouMeta = true;
      salvar();
      bipe('fim');
      vibrar([300, 120, 300]);
      toast('Meta de tempo batida!', { tipo: 'sucesso' });
    }
  }

  function iniciarTick() {
    clearInterval(tick);
    tick = setInterval(atualizarVisor, 500);
    atualizarVisor();
  }

  async function sair() {
    if (c.inicio) {
      const mensagem = c.pausadoEm ? 'O cronômetro fica pausado. Você volta a ele pela tela Hoje.' : 'O tempo continua contando. Você volta a ele pela tela Hoje.';
      const ok = await confirmar({ titulo: 'Sair do cronômetro?', mensagem, ok: 'Sair' });
      if (!ok) return;
      salvar();
    } else {
      removerLocal(CHAVE);
    }
    ctx.navegar('#/hoje');
  }

  async function descartar() {
    const ok = await confirmar({ titulo: 'Descartar caminhada?', mensagem: 'O tempo marcado será apagado.', ok: 'Descartar', perigo: true });
    if (!ok) return;
    removerLocal(CHAVE);
    liberarTela();
    ctx.navegar('#/hoje');
  }

  function finalizar() {
    const minutos = Math.max(1, Math.round(decorrido() / 60));
    if (!c.pausadoEm) {
      c.pausadoEm = Date.now();
      salvar();
      desenhar();
    }
    folhaCaminhada({
      minutos,
      tipo: c.tipo,
      aoSalvar: () => {
        removerLocal(CHAVE);
        liberarTela();
        ctx.navegar('#/hoje');
      },
    });
  }

  function desenhar() {
    limpar(raiz);
    clearInterval(tick);
    refs = {};
    const tipo = TIPOS_CAMINHADA[c.tipo];
    const rodando = c.inicio && !c.pausadoEm;

    const visor = h('span', { class: 'crono-visor grande' }, relogio(decorrido()));
    const barra = barraProgresso(Math.min(1, decorrido() / (c.meta * 60)), 'Progresso da meta');
    refs = { visor, barra };

    let faseCaixa = null;
    if (c.tipo === 'intervalada') {
      const fase = h('strong', null, '');
      const faseDetalhe = h('span', null, '');
      faseCaixa = h('div', { class: 'fase-caminhada', 'aria-live': 'polite' }, fase, faseDetalhe);
      Object.assign(refs, { fase, faseDetalhe, faseCaixa });
    }

    raiz.append(
      h(
        'div',
        { class: 'pilha' },
        h('div', { class: 'treino-topo' }, botao({ icone: 'x', variante: 'fantasma', rotulo: 'Sair', aoClicar: sair }), h('div', { class: 'treino-topo-meio' }, h('span', null, 'Caminhada')), h('span')),
        h('h1', null, `Caminhada ${tipo.nome.toLowerCase()}`),
        h('p', { class: 'texto-2' }, tipo.descricao),
        c.inicio
          ? null
          : cartao(
              { titulo: 'Tipo de hoje' },
              segmentado({
                rotulo: 'Tipo de caminhada',
                opcoes: Object.entries(TIPOS_CAMINHADA).map(([id, t]) => ({ id, nome: t.nome })),
                valor: c.tipo,
                aoMudar: (v) => {
                  c.tipo = v;
                  salvar();
                  desenhar();
                },
              }),
            ),
        cartao(
          { classe: 'centro' },
          visor,
          h('p', { class: 'texto-3' }, `Meta da semana: ${c.meta} min`),
          barra,
          faseCaixa,
        ),
        h(
          'div',
          { class: 'acoes centro' },
          !c.inicio
            ? botao({
                texto: 'Iniciar',
                icone: 'play',
                tamanho: 'lg',
                aoClicar: () => {
                  liberarSom();
                  manterTelaLigada();
                  c.inicio = Date.now();
                  salvar();
                  bipe('curto');
                  desenhar();
                },
              })
            : rodando
              ? botao({
                  texto: 'Pausar',
                  icone: 'pausa',
                  variante: 'secundario',
                  tamanho: 'lg',
                  aoClicar: () => {
                    c.pausadoEm = Date.now();
                    salvar();
                    desenhar();
                  },
                })
              : botao({
                  texto: 'Continuar',
                  icone: 'play',
                  variante: 'secundario',
                  tamanho: 'lg',
                  aoClicar: () => {
                    liberarSom();
                    manterTelaLigada();
                    c.pausas += Date.now() - c.pausadoEm;
                    c.pausadoEm = null;
                    salvar();
                    desenhar();
                  },
                }),
          c.inicio ? botao({ texto: 'Finalizar', icone: 'check', tamanho: 'lg', aoClicar: finalizar }) : null,
        ),
        c.tipo === 'subidas' ? h('p', { class: 'texto-3 centro' }, 'Na subida, passos curtos e tronco levemente à frente. Na descida, devagar.') : null,
        c.inicio ? botao({ texto: 'Descartar cronômetro', icone: 'lixeira', variante: 'perigo-fantasma', bloco: true, aoClicar: descartar }) : null,
        h('p', { class: 'texto-3 centro' }, 'Deixe o app aberto para ouvir os avisos. Se o celular bloquear, o tempo continua contando.'),
      ),
    );
    atualizarVisor();
    if (rodando) iniciarTick();
  }

  if (c.inicio && !c.pausadoEm) manterTelaLigada();
  desenhar();

  return {
    titulo: 'Caminhada',
    telaCheia: true,
    conteudo: raiz,
    aoSair: () => {
      clearInterval(tick);
      liberarTela();
    },
    telaAtiva: () => Boolean(c.inicio && !c.pausadoEm),
  };
}
