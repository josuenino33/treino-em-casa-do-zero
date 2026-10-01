// Primeiro acesso: apresentação, perfil, agenda, teste inicial e níveis de partida.

import { atualizar } from '../core/armazem.js';
import { NOMES_DIAS, hojeISO } from '../core/datas.js';
import { novoId } from '../core/esquema.js';
import { ORDEM_TREINO, rotuloFaixa, trilha } from '../data/trilhas.js';
import { faixaPesoSaudavel } from '../logic/nutricao.js';
import { niveisIniciais, trilhaDesbloqueada } from '../logic/progressao.js';
import { alternador, aviso, botao, campo, cartao, entradaNumero, segmentado } from '../ui/componentes.js';
import { h, limpar, numCurto } from '../ui/dom.js';
import { icone } from '../ui/icones.js';
import { fluxoTeste } from './testes.js';

const PADROES = [
  { id: 'smw', nome: 'Seg · Qua · Sex', treino: [1, 3, 5], caminhada: [2, 4, 6] },
  { id: 'tqs', nome: 'Ter · Qui · Sáb', treino: [2, 4, 6], caminhada: [1, 3, 5] },
  { id: 'dts', nome: 'Dom · Ter · Qui', treino: [0, 2, 4], caminhada: [1, 3, 6] },
];

export default function telaBoasVindas(ctx) {
  const raiz = h('div', { class: 'boas-vindas' });
  const dados = { nome: '', anoNascimento: null, alturaCm: null, peso: null, pesoMeta: null, sexo: null, padrao: 'smw', barra: false, teste: null };
  let passo = 0;
  let fluxo = null;

  const pontos = (n) => h('ol', { class: 'passos-topo', 'aria-label': `Passo ${n + 1} de 5` }, [0, 1, 2, 3, 4].map((i) => h('li', { class: i <= n ? 'feito' : '' })));

  function navegacao({ voltar = true, avancar = 'Continuar', aoAvancar, desabilitado = false }) {
    return h(
      'div',
      { class: 'acoes entre' },
      voltar ? botao({ texto: 'Voltar', icone: 'esquerda', variante: 'fantasma', aoClicar: () => { passo -= 1; desenhar(); } }) : h('span'),
      botao({ texto: avancar, icone: 'direita', tamanho: 'lg', desabilitado, aoClicar: aoAvancar || (() => { passo += 1; desenhar(); }) }),
    );
  }

  function passoApresentacao() {
    return h(
      'div',
      { class: 'pilha' },
      h('div', { class: 'marca' }, h('img', { src: 'icons/icon.svg', alt: '', width: 72, height: 72 }), h('h1', null, 'Trilha'), h('p', { class: 'texto-2' }, 'Treino com o peso do corpo, começando do zero.')),
      cartao(
        null,
        h(
          'ul',
          { class: 'lista-foco' },
          h('li', null, icone('trilha', { tamanho: 18 }), 'Exercícios em trilhas: do mais fácil ao mais difícil. Você sobe quando domina o nível.'),
          h('li', null, icone('relogio', { tamanho: 18 }), 'Treino guiado com séries, metas e descanso cronometrado.'),
          h('li', null, icone('caminhada', { tamanho: 18 }), 'Caminhadas que crescem 5 minutos por semana.'),
          h('li', null, icone('progresso', { tamanho: 18 }), 'Peso, cintura, fotos, testes e conquistas para ver a evolução.'),
          h('li', null, icone('escudo', { tamanho: 18 }), 'Funciona sem internet. Seus dados ficam só no seu aparelho.'),
        ),
      ),
      aviso({ tipo: 'info', icone: 'coracao', titulo: 'Antes de começar', texto: 'Se possível, faça um check-up. Se você tem pressão alta, diabetes, problema no coração ou nas articulações, converse com seu médico. O app não substitui acompanhamento profissional.' }),
      navegacao({ voltar: false, avancar: 'Começar' }),
    );
  }

  function passoPerfil() {
    const ano = new Date().getFullYear();
    const nome = h('input', { type: 'text', value: dados.nome, maxlength: 40, autocomplete: 'given-name', placeholder: 'Opcional' });
    nome.addEventListener('input', () => (dados.nome = nome.value.trim()));
    const dicaMeta = h('p', { class: 'campo-dica' });
    const atualizarDica = () => {
      const faixa = faixaPesoSaudavel(dados.alturaCm);
      dicaMeta.textContent = faixa ? `Faixa de IMC saudável para sua altura: ${faixa.min} a ${faixa.max} kg. Uma primeira meta de −10% já traz grandes ganhos de saúde.` : 'Você pode mudar depois.';
    };
    atualizarDica();
    return h(
      'div',
      { class: 'pilha' },
      pontos(1),
      h('h1', null, 'Sobre você'),
      h('p', { class: 'texto-2' }, 'Para calcular metas de calorias, proteína e água.'),
      campo({ rotulo: 'Seu nome ou apelido', entrada: nome }),
      h(
        'div',
        { class: 'grade-2' },
        campo({ rotulo: 'Ano de nascimento', entrada: entradaNumero({ valor: dados.anoNascimento, min: ano - 100, max: ano - 12, placeholder: `ex.: ${ano - 24}`, aoMudar: (v) => (dados.anoNascimento = v) }) }),
        campo({ rotulo: 'Altura (cm)', entrada: entradaNumero({ valor: dados.alturaCm, min: 120, max: 230, sufixo: 'cm', placeholder: 'ex.: 175', aoMudar: (v) => { dados.alturaCm = v; atualizarDica(); } }) }),
        campo({ rotulo: 'Peso atual (kg)', entrada: entradaNumero({ valor: dados.peso, min: 30, max: 350, decimal: true, sufixo: 'kg', placeholder: 'ex.: 110', aoMudar: (v) => (dados.peso = v) }) }),
        campo({ rotulo: 'Peso-meta (kg)', entrada: entradaNumero({ valor: dados.pesoMeta, min: 30, max: 350, decimal: true, sufixo: 'kg', placeholder: 'ex.: 80', aoMudar: (v) => (dados.pesoMeta = v) }) }),
      ),
      dicaMeta,
      h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Sexo biológico (só para a fórmula de calorias)'), segmentado({ rotulo: 'Sexo biológico', opcoes: [{ id: 'm', nome: 'Masculino' }, { id: 'f', nome: 'Feminino' }, { id: null, nome: 'Não informar' }], valor: dados.sexo, aoMudar: (v) => (dados.sexo = v) })),
      navegacao({}),
    );
  }

  function passoAgenda() {
    return h(
      'div',
      { class: 'pilha' },
      pontos(2),
      h('h1', null, 'Sua semana'),
      h('p', { class: 'texto-2' }, '3 treinos de força com um dia de folga entre eles, e caminhada nos outros dias. Dá para mudar tudo depois em Ajustes.'),
      cartao(
        { titulo: 'Dias de treino de força' },
        segmentado({ rotulo: 'Dias de treino', classe: 'segmentado-vertical', opcoes: PADROES.map((p) => ({ id: p.id, nome: p.nome, detalhe: `Caminhada: ${p.caminhada.map((d) => NOMES_DIAS[d]).join(', ')}` })), valor: dados.padrao, aoMudar: (v) => (dados.padrao = v) }),
      ),
      cartao(null, alternador({ rotulo: 'Tenho acesso a uma barra', detalhe: 'Praça, academia ao ar livre ou barra de porta. Sem barra, a remada é feita com mochila.', marcado: dados.barra, aoMudar: (v) => (dados.barra = v) })),
      navegacao({}),
    );
  }

  function passoTeste() {
    fluxo = fluxoTeste({
      textoFinal: 'Ver meus níveis',
      aoCancelar: () => { passo -= 1; desenhar(); },
      aoConcluir: (res) => {
        dados.teste = res;
        passo += 1;
        desenhar();
      },
    });
    return h(
      'div',
      { class: 'pilha' },
      pontos(3),
      h('h1', null, 'Teste de partida'),
      h('p', { class: 'texto-2' }, 'Três testes rápidos para o app escolher o nível certo de cada exercício. Faça no seu ritmo; zero também é resposta.'),
      fluxo,
      botao({ texto: 'Pular teste e começar do nível 1', variante: 'fantasma', bloco: true, aoClicar: () => { dados.teste = null; passo += 1; desenhar(); } }),
    );
  }

  function passoResultado() {
    const niveis = niveisIniciais(dados.teste || {});
    const estadoFake = { niveis, historicoNiveis: [], treinos: [], config: { barra: dados.barra } };
    return h(
      'div',
      { class: 'pilha' },
      pontos(4),
      h('h1', null, 'Seu ponto de partida'),
      h('p', { class: 'texto-2' }, dados.teste ? 'Pelos testes, você começa assim. Se algum ficar fácil ou difícil, ajuste na tela Trilha.' : 'Começando todos do nível 1. Vai rápido: quando ficar fácil, o app sobe você.'),
      cartao(
        null,
        h(
          'ul',
          { class: 'resumo-lista' },
          ORDEM_TREINO.map((id) => {
            const t = trilha(id);
            const n = niveis[id];
            const liberada = trilhaDesbloqueada(estadoFake, id);
            return h('li', null, h('span', { class: 'nivel-bolha' }, liberada ? String(n) : icone('cadeado', { tamanho: 14 })), h('span', null, h('strong', null, t.nome), h('small', null, liberada ? `${t.niveis[n - 1].nome} · ${rotuloFaixa(t.niveis[n - 1])}` : `Libera no nível ${t.desbloqueio.nivel} de ${trilha(t.desbloqueio.trilha).nome.toLowerCase()}`)));
          }),
        ),
      ),
      dados.peso ? h('p', { class: 'texto-3' }, `Peso inicial registrado: ${numCurto(dados.peso)} kg.`) : null,
      h(
        'div',
        { class: 'acoes entre' },
        botao({ texto: 'Voltar', icone: 'esquerda', variante: 'fantasma', aoClicar: () => { passo -= 1; desenhar(); } }),
        botao({ texto: 'Começar o programa', icone: 'check', tamanho: 'lg', aoClicar: () => concluir(niveis) }),
      ),
    );
  }

  function concluir(niveis) {
    const padrao = PADROES.find((p) => p.id === dados.padrao) || PADROES[0];
    const hoje = hojeISO();
    atualizar((st) => {
      st.onboardingFeito = true;
      st.perfil = { ...st.perfil, nome: dados.nome, anoNascimento: dados.anoNascimento, alturaCm: dados.alturaCm, sexo: dados.sexo, pesoInicial: dados.peso, pesoMeta: dados.pesoMeta, inicio: hoje };
      st.config.diasTreino = padrao.treino;
      st.config.diasCaminhada = padrao.caminhada;
      st.config.barra = dados.barra;
      st.niveis = { ...st.niveis, ...niveis };
      if (dados.peso) st.medidas.push({ id: novoId(), data: hoje, peso: dados.peso });
      if (dados.teste) st.testes.push({ id: novoId(), data: hoje, ...dados.teste });
    });
    ctx.navegar('#/hoje');
  }

  function desenhar() {
    fluxo?.parar?.();
    fluxo = null;
    limpar(raiz);
    const passos = [passoApresentacao, passoPerfil, passoAgenda, passoTeste, passoResultado];
    raiz.append(passos[passo]());
    window.scrollTo({ top: 0 });
  }

  desenhar();
  return { titulo: 'Boas-vindas', telaCheia: true, conteudo: raiz, aoSair: () => fluxo?.parar?.() };
}

