// Pausa ativa guiada: 4 movimentos leves de 30 segundos.

import { atualizar, gravarLocal } from '../core/armazem.js';
import { hojeISO, relogio } from '../core/datas.js';
import { ROTINA_PAUSA } from '../logic/pausas.js';
import { barraProgresso, botao, toast } from '../ui/componentes.js';
import { h, limpar } from '../ui/dom.js';
import { figuraExercicio } from '../ui/figura.js';
import { bipe, liberarSom, liberarTela, manterTelaLigada, vibrar } from '../ui/som.js';
import { verificarConquistas } from './acoes.js';

export function registrarPausa() {
  const hoje = hojeISO();
  atualizar((st) => {
    st.pausas[hoje] = (Number(st.pausas[hoje]) || 0) + 1;
  });
  gravarLocal('ultimaPausa', Date.now());
  verificarConquistas();
}

export default function telaPausa(ctx) {
  const raiz = h('div', { class: 'treino' });
  let passo = -1;
  let fim = null;
  let tick = null;

  const parar = () => {
    clearInterval(tick);
    tick = null;
  };

  function concluir() {
    parar();
    liberarTela();
    registrarPausa();
    bipe('fim');
    vibrar([200, 100, 200]);
    toast('Pausa ativa feita! Seu corpo agradece.', { tipo: 'sucesso' });
    ctx.navegar('#/hoje');
  }

  function avancar() {
    passo += 1;
    if (passo >= ROTINA_PAUSA.length) {
      concluir();
      return;
    }
    fim = Date.now() + ROTINA_PAUSA[passo].segundos * 1000;
    if (passo > 0) bipe('curto');
    desenhar();
  }

  function desenhar() {
    parar();
    limpar(raiz);
    const topo = h(
      'div',
      { class: 'treino-topo' },
      botao({ icone: 'x', variante: 'fantasma', rotulo: 'Sair', aoClicar: () => { parar(); liberarTela(); ctx.navegar('#/hoje'); } }),
      h('div', { class: 'treino-topo-meio' }, h('span', null, 'Pausa ativa'), barraProgresso(Math.max(0, passo) / ROTINA_PAUSA.length, 'Progresso da pausa')),
      h('span'),
    );
    if (passo < 0) {
      raiz.append(
        h(
          'div',
          { class: 'pilha' },
          topo,
          h('h1', null, 'Pausa ativa · 2 minutos'),
          h('p', { class: 'texto-2' }, 'Quatro movimentos leves de 30 segundos para tirar o corpo da cadeira. Nada de cansar: é só para circular o sangue e soltar as articulações.'),
          h('ol', { class: 'lista-exercicios' }, ROTINA_PAUSA.map((m) => h('li', null, h('span', null, h('strong', null, m.nome), h('small', null, m.detalhe))))),
          botao({ texto: 'Começar', icone: 'play', tamanho: 'lg', bloco: true, aoClicar: () => { liberarSom(); manterTelaLigada(); avancar(); } }),
        ),
      );
      return;
    }
    const m = ROTINA_PAUSA[passo];
    const visor = h('span', { class: 'crono-visor' }, relogio(m.segundos));
    raiz.append(
      h(
        'div',
        { class: 'pilha' },
        topo,
        h('p', { class: 'sobretitulo' }, `Movimento ${passo + 1} de ${ROTINA_PAUSA.length}`),
        h('h1', null, m.nome),
        h('p', { class: 'texto-2' }, m.detalhe),
        figuraExercicio(m.anim, { rotulo: m.nome, compacta: true }),
        h('div', { class: 'crono' }, visor),
        botao({ texto: passo < ROTINA_PAUSA.length - 1 ? 'Próximo' : 'Terminar', icone: 'direita', variante: 'secundario', tamanho: 'lg', bloco: true, aoClicar: avancar }),
      ),
    );
    tick = setInterval(() => {
      const resta = Math.max(0, (fim - Date.now()) / 1000);
      visor.textContent = relogio(Math.ceil(resta));
      if (resta <= 0) avancar();
    }, 250);
  }

  desenhar();
  return { titulo: 'Pausa ativa', telaCheia: true, conteudo: raiz, aoSair: () => { parar(); liberarTela(); }, telaAtiva: () => passo >= 0 };
}
