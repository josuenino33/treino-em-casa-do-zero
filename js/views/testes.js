// Teste de evolução (a cada 4 semanas) e o fluxo usado no primeiro acesso.

import { atualizar, obter } from '../core/armazem.js';
import { formatarData, hojeISO, relogio } from '../core/datas.js';
import { novoId } from '../core/esquema.js';
import { statusTeste } from '../logic/plano.js';
import { botao, cartao, confirmar, contador, link, toast, vazio } from '../ui/componentes.js';
import { anexar, comSinal, h, limpar, num } from '../ui/dom.js';
import { graficoLinha } from '../ui/graficos.js';
import { figuraExercicio } from '../ui/figura.js';
import { icone } from '../ui/icones.js';
import { bipe, liberarSom, vibrar } from '../ui/som.js';
import { verificarConquistas } from './acoes.js';

export const TESTES = [
  {
    id: 'flexoes',
    nome: 'Flexões no chão',
    anim: { tipo: 'flexao' },
    unidade: 'reps',
    passo: 1,
    como: [
      'Mãos no chão um pouco mais abertas que os ombros, corpo reto.',
      'Faça quantas flexões conseguir com boa forma, sem parar para descansar.',
      'Conta só a repetição em que o peito chega a um palmo do chão.',
      'Se não conseguir nenhuma no chão, registre 0. Tudo bem: é só o ponto de partida.',
    ],
  },
  {
    id: 'sentar30',
    nome: 'Sentar e levantar em 30 segundos',
    anim: { tipo: 'sentar', maos: 'cruzadas' },
    unidade: 'reps',
    passo: 1,
    cronometro: 30,
    como: [
      'Cadeira firme encostada na parede, braços cruzados no peito.',
      'Ao sinal, sente e levante o máximo de vezes em 30 segundos.',
      'Conta cada vez que você fica totalmente em pé.',
      'Se precisar das mãos para levantar, tudo bem: use e conte normalmente.',
    ],
  },
  {
    id: 'prancha',
    nome: 'Prancha máxima',
    anim: { tipo: 'prancha' },
    unidade: 's',
    passo: 5,
    cronometroLivre: true,
    como: [
      'Antebraços no chão, cotovelos embaixo dos ombros, pernas esticadas.',
      'Segure o máximo que conseguir com o corpo reto.',
      'Pare quando o quadril cair ou subir demais.',
      'Se não conseguir ficar na posição, registre 0.',
    ],
  },
];

// Fluxo guiado: um teste por vez. Chama aoConcluir({ flexoes, sentar30, prancha, fcRepouso }).
export function fluxoTeste({ aoConcluir, textoFinal = 'Salvar resultado', aoCancelar }) {
  const raiz = h('div', { class: 'pilha' });
  const resultado = { flexoes: 0, sentar30: 0, prancha: 0, fcRepouso: null };
  let passo = 0;
  let tick = null;

  const parar = () => {
    if (tick) clearInterval(tick);
    tick = null;
  };

  function cronometroRegressivo(segundos, aoTerminar) {
    const visor = h('span', { class: 'crono-visor' }, relogio(segundos));
    const rotulo = h('span', { class: 'crono-rotulo' }, 'Toque para começar');
    let fim = null;
    const b = botao({
      texto: 'Iniciar 30 s',
      icone: 'relogio',
      variante: 'secundario',
      tamanho: 'lg',
      aoClicar: () => {
        liberarSom();
        parar();
        fim = Date.now() + 3000 + segundos * 1000;
        b.disabled = true;
        let ultimo = null;
        tick = setInterval(() => {
          const resta = (fim - Date.now()) / 1000;
          if (resta > segundos) {
            const c = Math.ceil(resta - segundos);
            visor.textContent = String(c);
            rotulo.textContent = 'Prepare-se';
            if (c !== ultimo) bipe('aviso');
            ultimo = c;
          } else if (resta > 0) {
            if (ultimo !== 'vai') bipe('curto');
            ultimo = 'vai';
            visor.textContent = relogio(Math.ceil(resta));
            rotulo.textContent = 'Vai!';
          } else {
            parar();
            visor.textContent = relogio(0);
            rotulo.textContent = 'Tempo! Registre quantas fez.';
            bipe('fim');
            vibrar([300]);
            b.disabled = false;
            aoTerminar?.();
          }
        }, 200);
      },
    });
    return h('div', { class: 'crono' }, visor, rotulo, b);
  }

  function cronometroLivre(aoParar) {
    const visor = h('span', { class: 'crono-visor' }, relogio(0));
    const rotulo = h('span', { class: 'crono-rotulo' }, 'Inicie quando estiver em posição');
    let inicio = null;
    const b = botao({ texto: 'Iniciar', icone: 'relogio', variante: 'secundario', tamanho: 'lg' });
    b.addEventListener('click', () => {
      liberarSom();
      if (inicio) {
        const seg = Math.floor((Date.now() - inicio) / 1000);
        parar();
        inicio = null;
        b.querySelector('span').textContent = 'Iniciar de novo';
        rotulo.textContent = `Você segurou ${seg} s`;
        bipe('fim');
        aoParar(seg);
        return;
      }
      inicio = Date.now();
      b.querySelector('span').textContent = 'Parar';
      bipe('curto');
      parar();
      tick = setInterval(() => {
        visor.textContent = relogio(Math.floor((Date.now() - inicio) / 1000));
        rotulo.textContent = 'Segure firme';
      }, 250);
    });
    return h('div', { class: 'crono' }, visor, rotulo, b);
  }

  function desenhar() {
    parar();
    limpar(raiz);
    if (passo < TESTES.length) {
      const t = TESTES[passo];
      const cont = contador({ valor: resultado[t.id], min: 0, max: t.unidade === 's' ? 600 : 200, passo: t.passo, sufixo: t.unidade === 's' ? ' s' : '', rotulo: t.nome, aoMudar: (v) => (resultado[t.id] = v) });
      anexar(raiz,
        h('p', { class: 'sobretitulo' }, `Teste ${passo + 1} de ${TESTES.length}`),
        h('h2', null, t.nome),
        figuraExercicio(t.anim, { rotulo: `Como fazer: ${t.nome}`, compacta: true }),
        cartao(null, h('ol', { class: 'passos' }, t.como.map((c) => h('li', null, c)))),
        t.cronometro ? cronometroRegressivo(t.cronometro) : null,
        t.cronometroLivre ? cronometroLivre((seg) => { resultado[t.id] = seg; cont.definir(seg); }) : null,
        h('p', { class: 'texto-3 centro' }, t.unidade === 's' ? 'Tempo segurado:' : 'Quantas você fez?'),
        cont,
        h(
          'div',
          { class: 'acoes entre' },
          passo > 0 ? botao({ texto: 'Voltar', icone: 'esquerda', variante: 'fantasma', aoClicar: () => { passo -= 1; desenhar(); } }) : aoCancelar ? botao({ texto: 'Cancelar', variante: 'fantasma', aoClicar: aoCancelar }) : h('span'),
          botao({ texto: passo < TESTES.length - 1 ? 'Próximo teste' : 'Continuar', icone: 'direita', aoClicar: () => { passo += 1; desenhar(); } }),
        ),
        passo < TESTES.length - 1 ? h('p', { class: 'texto-3 centro' }, 'Descanse 1 a 2 minutos antes do próximo.') : null,
      );
      return;
    }
    // Último passo: frequência cardíaca opcional.
    const fc = h('input', { type: 'text', inputmode: 'numeric', id: 'fc-repouso', placeholder: 'Opcional', value: resultado.fcRepouso ?? '' });
    anexar(raiz,
      h('p', { class: 'sobretitulo' }, 'Opcional'),
      h('h2', null, 'Batimentos em repouso'),
      h('p', { class: 'texto-2' }, 'Em repouso (de preferência ao acordar), conte os batimentos no pulso por 30 segundos e multiplique por 2. Com o treino, esse número costuma cair.'),
      h('div', { class: 'campo' }, h('label', { for: 'fc-repouso' }, 'Batimentos por minuto'), fc),
      cartao(
        { titulo: 'Seu resultado' },
        h(
          'ul',
          { class: 'resumo-lista' },
          TESTES.map((t) => h('li', null, h('span', null, t.nome), h('strong', null, `${num(resultado[t.id])}${t.unidade === 's' ? ' s' : ''}`))),
        ),
      ),
      h(
        'div',
        { class: 'acoes entre' },
        botao({ texto: 'Voltar', icone: 'esquerda', variante: 'fantasma', aoClicar: () => { passo -= 1; desenhar(); } }),
        botao({
          texto: textoFinal,
          icone: 'check',
          aoClicar: () => {
            const v = Number(String(fc.value).trim());
            resultado.fcRepouso = Number.isFinite(v) && v >= 30 && v <= 200 ? Math.round(v) : null;
            parar();
            aoConcluir({ ...resultado });
          },
        }),
      ),
    );
  }

  desenhar();
  raiz.parar = parar;
  return raiz;
}

function telaNovoTeste(ctx) {
  const fluxo = fluxoTeste({
    aoCancelar: () => ctx.navegar('#/testes'),
    aoConcluir: (res) => {
      atualizar((st) => {
        st.testes.push({ id: novoId(), data: hojeISO(), ...res });
      });
      toast('Teste salvo!', { tipo: 'sucesso' });
      verificarConquistas();
      ctx.navegar('#/testes');
    },
  });
  return { titulo: 'Teste de evolução', voltar: '#/testes', aba: 'mais', conteudo: h('div', { class: 'pilha' }, h('header', { class: 'ola' }, h('h1', null, 'Teste de evolução'), h('p', { class: 'texto-2' }, '3 testes rápidos, uns 10 minutos no total. Faça depois de um aquecimento leve.')), fluxo), aoSair: () => fluxo.parar() };
}

function telaLista(ctx) {
  const e = obter();
  const testes = [...e.testes].sort((a, b) => (a.data < b.data ? -1 : 1));
  const status = statusTeste(e);
  const primeiro = testes[0];
  const ultimo = testes.at(-1);

  const comparativo = testes.length
    ? cartao(
        { titulo: testes.length > 1 ? 'Primeiro × último' : 'Seu ponto de partida', subtitulo: testes.length > 1 ? `${formatarData(primeiro.data, { ano: true })} → ${formatarData(ultimo.data, { ano: true })}` : formatarData(primeiro.data, { ano: true }) },
        h(
          'div',
          { class: 'grade-stats' },
          [...TESTES, { id: 'fcRepouso', nome: 'Batimentos em repouso', unidade: 'bpm' }].map((t) => {
            const a = Number(primeiro[t.id]);
            const b = Number(ultimo[t.id]);
            if (!Number.isFinite(b) || (t.id === 'fcRepouso' && !ultimo[t.id])) return null;
            const dif = testes.length > 1 && Number.isFinite(a) ? b - a : null;
            return h(
              'div',
              { class: 'stat' },
              h('span', { class: 'stat-rotulo' }, t.nome),
              h('span', { class: 'stat-valor' }, num(b), h('small', null, ` ${t.unidade === 'reps' ? '' : t.unidade}`)),
              dif != null && dif !== 0 ? h('span', { class: 'stat-detalhe' }, `${comSinal(dif, 0)} desde o primeiro`) : null,
            );
          }),
        ),
      )
    : null;

  const graficos = testes.length >= 2
    ? TESTES.map((t) =>
        cartao(
          { titulo: t.nome },
          graficoLinha({ series: [{ nome: t.nome, tipo: 'linha', classe: 'serie-1', pontos: testes.map((x) => ({ data: x.data, valor: Number(x[t.id]) || 0 })) }], unidade: t.unidade === 's' ? 's' : '', altura: 150, formatar: (v) => num(v), descricao: t.nome }),
        ),
      )
    : [];

  const historico = testes.length
    ? cartao(
        { titulo: 'Todos os testes' },
        h(
          'ul',
          { class: 'resumo-lista' },
          [...testes].reverse().map((t) =>
            h(
              'li',
              null,
              h('span', null, h('strong', null, formatarData(t.data, { ano: true })), h('small', null, `Flexões ${num(t.flexoes)} · Sentar ${num(t.sentar30)} · Prancha ${num(t.prancha)} s${t.fcRepouso ? ` · FC ${t.fcRepouso}` : ''}`)),
              botao({
                icone: 'lixeira',
                variante: 'fantasma',
                rotulo: 'Apagar teste',
                aoClicar: async () => {
                  if (!(await confirmar({ titulo: 'Apagar teste?', mensagem: `Teste de ${formatarData(t.data, { ano: true })}.`, ok: 'Apagar', perigo: true }))) return;
                  atualizar((st) => {
                    st.testes = st.testes.filter((x) => x.id !== t.id);
                  });
                  ctx.redesenhar();
                },
              }),
            ),
          ),
        ),
      )
    : null;

  return {
    titulo: 'Testes',
    voltar: '#/mais',
    aba: 'mais',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Testes de evolução'), h('p', { class: 'texto-2' }, 'A cada 4 semanas, os mesmos 3 testes mostram sua força e resistência subindo.')),
      cartao(
        { classe: 'card-hoje', titulo: status.devido ? 'Teste disponível' : 'Próximo teste', subtitulo: status.devido ? 'Leva uns 10 minutos.' : `A partir de ${formatarData(status.proximo, { diaSemana: true })}` },
        link({ href: '#/teste', texto: status.devido ? 'Fazer teste agora' : 'Fazer mesmo assim', icone: 'alvo', variante: status.devido ? 'primario' : 'secundario', bloco: true }),
      ),
      comparativo,
      ...graficos,
      historico,
      !testes.length ? vazio({ icone: 'alvo', titulo: 'Nenhum teste ainda', texto: 'Faça o primeiro para ter um ponto de partida.' }) : null,
      h('p', { class: 'texto-3' }, icone('info', { tamanho: 14 }), ' O teste de sentar e levantar em 30 segundos é usado por profissionais de saúde para medir força de pernas.'),
    ),
  };
}

export default function telaTestes(ctx) {
  return ctx.rota === 'teste' ? telaNovoTeste(ctx) : telaLista(ctx);
}
