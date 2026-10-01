// Ponto de entrada: carrega os dados, desenha a casca do app e cuida das rotas.

import { carregar, definirErroSalvar, falhaNaCarga, obter } from './core/armazem.js';
import { toast } from './ui/componentes.js';
import { h } from './ui/dom.js';
import { icone } from './ui/icones.js';
import { escutarInstalacao } from './ui/instalar.js';
import { manterTelaLigada } from './ui/som.js';
import { aplicarTema, observarTemaDoSistema } from './ui/tema.js';
import telaBoasVindas from './views/boasvindas.js';
import telaCaminhada from './views/caminhada.js';
import telaConfig from './views/config.js';
import telaHoje from './views/hoje.js';
import telaMais from './views/mais.js';
import telaNutricao from './views/nutricao.js';
import telaProgresso from './views/progresso.js';
import telaTestes from './views/testes.js';
import telaTreino from './views/treino.js';
import telaTrilha from './views/trilha.js';

const ROTAS = {
  hoje: telaHoje,
  trilha: telaTrilha,
  treino: telaTreino,
  caminhada: telaCaminhada,
  progresso: telaProgresso,
  nutricao: telaNutricao,
  mais: telaMais,
  conquistas: telaMais,
  historico: telaMais,
  biblioteca: telaMais,
  guia: telaMais,
  testes: telaTestes,
  teste: telaTestes,
  config: telaConfig,
  'boas-vindas': telaBoasVindas,
};

const ABAS = [
  { id: 'hoje', nome: 'Hoje', icone: 'inicio' },
  { id: 'trilha', nome: 'Trilha', icone: 'trilha' },
  { id: 'progresso', nome: 'Progresso', icone: 'progresso' },
  { id: 'nutricao', nome: 'Nutrição', icone: 'nutricao' },
  { id: 'mais', nome: 'Mais', icone: 'mais' },
];

const app = document.getElementById('app');
const barraTopo = h('header', { class: 'barra-topo', hidden: true });
const principal = document.getElementById('conteudo');
const abas = h(
  'nav',
  { class: 'abas', 'aria-label': 'Navegação principal' },
  h('div', { class: 'abas-lista' }, ABAS.map((a) => h('a', { href: `#/${a.id}`, class: 'aba', dataset: { aba: a.id } }, h('span', { class: 'aba-icone' }, icone(a.icone, { tamanho: 22 })), h('span', null, a.nome)))),
);
app.prepend(barraTopo);
app.append(abas);

let atual = null;

function lerRota() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { rota: partes[0] || 'hoje', params: partes.slice(1) };
}

function telaErro(erro) {
  console.error(erro);
  return {
    titulo: 'Erro',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('h1', null, 'Algo deu errado nesta tela'),
      h('p', { class: 'texto-2' }, 'Seus dados continuam salvos. Tente voltar para o início.'),
      h('pre', { class: 'erro-detalhe' }, String(erro?.message || erro)),
      h('a', { href: '#/hoje', class: 'btn btn-primario' }, 'Ir para o início'),
    ),
  };
}

function navegar(href) {
  if (location.hash === href) mostrar();
  else location.hash = href;
}

function mostrar({ manterRolagem = false } = {}) {
  const e = obter();
  const { rota, params } = lerRota();
  if (!e.onboardingFeito && rota !== 'boas-vindas') {
    location.replace('#/boas-vindas');
    return;
  }
  if (e.onboardingFeito && rota === 'boas-vindas') {
    location.replace('#/hoje');
    return;
  }

  const rolagem = manterRolagem ? window.scrollY : 0;
  const mesmaRota = atual?.rota === rota && atual?.chave === location.hash;
  try {
    atual?.tela?.aoSair?.();
  } catch (err) {
    console.error(err);
  }

  const ctx = { rota, params, navegar, redesenhar: () => mostrar({ manterRolagem: true }) };
  let tela;
  try {
    tela = (ROTAS[rota] || telaHoje)(ctx);
  } catch (err) {
    tela = telaErro(err);
  }
  atual = { rota, chave: location.hash, tela };

  document.title = `${tela.titulo} · Trilha`;
  app.classList.toggle('tela-cheia', Boolean(tela.telaCheia));
  abas.hidden = Boolean(tela.telaCheia);
  for (const a of abas.querySelectorAll('.aba')) {
    if (a.dataset.aba === tela.aba) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  barraTopo.replaceChildren();
  barraTopo.hidden = !tela.voltar;
  if (tela.voltar) {
    barraTopo.append(h('a', { href: tela.voltar, class: 'btn btn-fantasma voltar' }, icone('esquerda', { tamanho: 20 }), h('span', null, 'Voltar')));
  }

  principal.replaceChildren(tela.conteudo);
  window.scrollTo(0, rolagem);
  if (!manterRolagem && !mesmaRota) principal.focus({ preventScroll: true });
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      reg.addEventListener('updatefound', () => {
        const novo = reg.installing;
        novo?.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Nova versão disponível.', { duracao: 15000, acao: { rotulo: 'Atualizar', fn: () => novo.postMessage({ tipo: 'pular-espera' }) } });
          }
        });
      });
    })
    .catch((err) => console.warn('Service worker não registrado:', err));
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregando) return;
    recarregando = true;
    location.reload();
  });
}

function iniciar() {
  carregar();
  aplicarTema(obter().config.tema);
  observarTemaDoSistema();
  escutarInstalacao();
  definirErroSalvar(() => toast('Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado. Faça um backup.', { tipo: 'erro', duracao: 8000 }));
  if (falhaNaCarga()) toast('Os dados salvos estavam corrompidos. Guardamos uma cópia e começamos do zero; restaure um backup em Ajustes.', { tipo: 'erro', duracao: 10000 });

  window.addEventListener('hashchange', () => mostrar());
  // Outra aba mudou os dados: recarrega, a não ser que esta esteja no meio de um treino.
  window.addEventListener('storage', (ev) => {
    if (ev.key !== 'trilha:estado') return;
    carregar();
    if (!atual?.tela?.telaCheia) mostrar({ manterRolagem: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && atual?.tela?.telaAtiva?.()) manterTelaLigada();
  });

  mostrar();
  registrarServiceWorker();
}

iniciar();
