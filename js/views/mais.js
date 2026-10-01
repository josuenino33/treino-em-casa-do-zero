// Menu "Mais", conquistas, histórico, biblioteca e guia.

import { atualizar, obter } from '../core/armazem.js';
import { duracaoMin, formatarData, formatarMes } from '../core/datas.js';
import { ARTIGOS } from '../data/guia.js';
import { TRILHAS, linkVideo, nivelDe, rotuloFaixa, trilha } from '../data/trilhas.js';
import { avaliarConquistas } from '../logic/conquistas.js';
import { TIPOS_CAMINHADA, statusTeste } from '../logic/plano.js';
import { aviso, barraProgresso, botao, cartao, confirmar, itemLink, toast, vazio } from '../ui/componentes.js';
import { h, num, numCurto } from '../ui/dom.js';
import { icone } from '../ui/icones.js';
import { folhaCaminhada } from './acoes.js';
import { VERSAO_APP, URL_REPOSITORIO } from '../versao.js';

function telaMenu() {
  const e = obter();
  const cqs = avaliarConquistas(e);
  const feitas = cqs.filter((c) => c.desbloqueada).length;
  const teste = statusTeste(e);
  const alerta = ARTIGOS.find((a) => a.alerta);
  return {
    titulo: 'Mais',
    aba: 'mais',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Mais')),
      h(
        'nav',
        { class: 'card menu', 'aria-label': 'Mais opções' },
        itemLink({ href: '#/testes', icone: 'alvo', titulo: 'Testes de evolução', detalhe: teste.devido ? 'Teste disponível agora' : `Próximo em ${formatarData(teste.proximo)}` }),
        itemLink({ href: '#/conquistas', icone: 'trofeu', titulo: 'Conquistas', detalhe: `${feitas} de ${cqs.length}` }),
        itemLink({ href: '#/historico', icone: 'historico', titulo: 'Histórico', detalhe: `${e.treinos.length} treinos · ${e.caminhadas.length} caminhadas` }),
        itemLink({ href: '#/biblioteca', icone: 'livro', titulo: 'Biblioteca de exercícios', detalhe: 'Todos os níveis com execução' }),
        itemLink({ href: '#/guia', icone: 'info', titulo: 'Guia', detalhe: 'Como funciona, alimentação, pele, dor' }),
        itemLink({ href: '#/config', icone: 'ajustes', titulo: 'Ajustes e backup', detalhe: 'Perfil, agenda, dados' }),
      ),
      cartao({ classe: 'card-alerta', titulo: alerta.titulo }, ...alerta.paragrafos.map((p) => h('p', { class: 'texto-2' }, p))),
      h(
        'footer',
        { class: 'rodape-app' },
        h('p', null, `Trilha ${VERSAO_APP} · seus dados ficam só neste aparelho.`),
        URL_REPOSITORIO ? h('p', null, h('a', { href: URL_REPOSITORIO, target: '_blank', rel: 'noopener noreferrer' }, 'Código aberto no GitHub')) : null,
      ),
    ),
  };
}

function telaConquistas() {
  const e = obter();
  const cqs = avaliarConquistas(e);
  const grupos = [...new Set(cqs.map((c) => c.grupo))];
  const feitas = cqs.filter((c) => c.desbloqueada).length;
  return {
    titulo: 'Conquistas',
    voltar: '#/mais',
    aba: 'mais',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Conquistas'), h('p', { class: 'texto-2' }, `${feitas} de ${cqs.length} desbloqueadas`)),
      barraProgresso(feitas / cqs.length, 'Conquistas desbloqueadas'),
      ...grupos.map((g) =>
        h(
          'section',
          { class: 'secao' },
          h('h2', { class: 'secao-titulo' }, g),
          h(
            'ul',
            { class: 'grade-conquistas' },
            cqs
              .filter((c) => c.grupo === g)
              .map((c) =>
                h(
                  'li',
                  { class: `conquista ${c.desbloqueada ? 'ok' : ''}`.trim() },
                  h('span', { class: 'conquista-icone' }, icone(c.desbloqueada ? 'trofeu' : 'cadeado', { tamanho: 20 })),
                  h('strong', null, c.nome),
                  h('small', null, c.descricao),
                  c.desbloqueada
                    ? h('span', { class: 'conquista-data' }, `Em ${formatarData(c.data, { ano: true })}`)
                    : c.alvo > 1
                      ? h('div', { class: 'conquista-progresso' }, barraProgresso(c.progresso, c.nome), h('span', null, `${numCurto(Math.min(c.atual, c.alvo))} de ${num(c.alvo)}${c.unidade && c.unidade !== 'nível' ? ` ${c.unidade}` : ''}`))
                      : null,
                ),
              ),
          ),
        ),
      ),
    ),
  };
}

function telaHistorico(ctx) {
  const e = obter();
  const itens = [
    ...e.treinos.map((t) => ({ tipo: 'treino', data: t.data, ordem: t.fim || t.data, item: t })),
    ...e.caminhadas.map((c) => ({ tipo: 'caminhada', data: c.data, ordem: `${c.data}T12`, item: c })),
  ].sort((a, b) => (a.ordem < b.ordem ? 1 : -1));

  const apagar = async (tipo, item) => {
    const ok = await confirmar({ titulo: tipo === 'treino' ? 'Apagar treino?' : 'Apagar caminhada?', mensagem: `Registro de ${formatarData(item.data, { ano: true })}. Isso não muda seus níveis atuais.`, ok: 'Apagar', perigo: true });
    if (!ok) return;
    atualizar((st) => {
      if (tipo === 'treino') st.treinos = st.treinos.filter((x) => x.id !== item.id);
      else st.caminhadas = st.caminhadas.filter((x) => x.id !== item.id);
    });
    toast('Registro apagado');
    ctx.redesenhar();
  };

  const porMes = new Map();
  for (const it of itens) {
    const mes = it.data.slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(it);
  }

  const blocos = [...porMes].map(([mes, lista]) =>
    h(
      'section',
      { class: 'secao' },
      h('h2', { class: 'secao-titulo' }, formatarMes(`${mes}-01`)),
      h(
        'ul',
        { class: 'card historico' },
        lista.map(({ tipo, item }) => {
          if (tipo === 'caminhada') {
            return h(
              'li',
              { class: 'historico-item' },
              h('span', { class: 'item-icone' }, icone('caminhada', { tamanho: 18 })),
              h('span', { class: 'item-texto' }, h('strong', null, `Caminhada · ${num(item.minutos)} min`), h('small', null, `${formatarData(item.data, { diaSemana: true })} · ${TIPOS_CAMINHADA[item.tipo]?.nome || 'Contínua'}${item.passos ? ` · ${num(item.passos)} passos` : ''}`)),
              h(
                'span',
                { class: 'acoes-linha' },
                botao({ icone: 'editar', variante: 'fantasma', rotulo: 'Editar caminhada', aoClicar: () => folhaCaminhada({ caminhada: item, aoSalvar: ctx.redesenhar }) }),
                botao({ icone: 'lixeira', variante: 'fantasma', rotulo: 'Apagar caminhada', aoClicar: () => apagar('caminhada', item) }),
              ),
            );
          }
          const feitos = item.exercicios.filter((x) => !x.pulado);
          const series = feitos.reduce((a, x) => a + x.series.length, 0);
          const dur = item.inicio && item.fim ? duracaoMin(Date.parse(item.fim) - Date.parse(item.inicio)) : null;
          return h(
            'li',
            { class: 'historico-item' },
            h('span', { class: 'item-icone' }, icone('forca', { tamanho: 18 })),
            h(
              'details',
              { class: 'item-texto' },
              h('summary', null, h('strong', null, `Treino de força${item.modo === 'curto' ? ' (curto)' : ''}`), h('small', null, `${formatarData(item.data, { diaSemana: true })} · ${series} séries${dur ? ` · ${dur} min` : ''}`)),
              h(
                'ul',
                { class: 'historico-exercicios' },
                item.exercicios.map((x) => {
                  const nv = nivelDe(x.trilha, x.nivel);
                  return h('li', null, h('span', null, `${trilha(x.trilha)?.nome || x.trilha} · ${nv?.nome || ''}`), h('span', { class: 'mono' }, x.pulado ? 'pulado' : `${x.series.map((v) => num(v)).join(' · ')}${nv?.metrica === 'segundos' ? ' s' : ''}${x.dor ? ' · dor' : ''}`));
                }),
              ),
              item.notas ? h('p', { class: 'texto-3' }, `“${item.notas}”`) : null,
            ),
            botao({ icone: 'lixeira', variante: 'fantasma', rotulo: 'Apagar treino', aoClicar: () => apagar('treino', item) }),
          );
        }),
      ),
    ),
  );

  return {
    titulo: 'Histórico',
    voltar: '#/mais',
    aba: 'mais',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Histórico')),
      botao({ texto: 'Registrar caminhada', icone: 'somar', variante: 'secundario', aoClicar: () => folhaCaminhada({ aoSalvar: ctx.redesenhar }) }),
      ...(blocos.length ? blocos : [vazio({ icone: 'historico', titulo: 'Nada por aqui ainda', texto: 'Seus treinos e caminhadas aparecem aqui.' })]),
    ),
  };
}

function telaBiblioteca() {
  const e = obter();
  const busca = h('input', { type: 'search', placeholder: 'Buscar exercício', 'aria-label': 'Buscar exercício', class: 'busca' });
  const corpo = h('div', { class: 'pilha' });
  const desenhar = () => {
    const termo = busca.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    corpo.replaceChildren(
      ...TRILHAS.map((t) => {
        const niveis = t.niveis.map((nv, i) => ({ nv, n: i + 1 })).filter(({ nv }) => !termo || norm(nv.nome).includes(termo) || norm(t.nome).includes(termo));
        if (!niveis.length) return null;
        return cartao(
          { titulo: t.nome, subtitulo: t.grupo, acao: h('a', { href: `#/trilha/${t.id}`, class: 'btn btn-fantasma' }, 'Trilha') },
          h(
            'ol',
            { class: 'niveis-lista' },
            niveis.map(({ nv, n }) =>
              h(
                'li',
                { class: `nivel-item ${n === e.niveis[t.id] ? 'atual' : ''}`.trim() },
                h(
                  'details',
                  null,
                  h('summary', null, h('span', { class: 'nivel-bolha' }, String(n)), h('span', { class: 'nivel-nome' }, h('strong', null, nv.nome), h('small', null, rotuloFaixa(nv), nv.equipamento === 'barra' ? ' · precisa de barra' : ''))),
                  h(
                    'div',
                    { class: 'nivel-corpo' },
                    h('ol', null, nv.como.map((p) => h('li', null, p))),
                    nv.dicas.length ? h('p', null, h('strong', null, 'Dica: '), nv.dicas.join(' ')) : null,
                    nv.erros.length ? h('p', null, h('strong', null, 'Evite: '), nv.erros.join(' ')) : null,
                    h('a', { href: linkVideo(nv), target: '_blank', rel: 'noopener noreferrer', class: 'link-externo' }, 'Ver vídeos de exemplo'),
                  ),
                ),
              ),
            ),
          ),
        );
      }).filter(Boolean),
    );
    if (!corpo.children.length) corpo.append(vazio({ icone: 'livro', titulo: 'Nenhum exercício encontrado' }));
  };
  busca.addEventListener('input', desenhar);
  desenhar();
  return {
    titulo: 'Biblioteca',
    voltar: '#/mais',
    aba: 'mais',
    conteudo: h('div', { class: 'pilha' }, h('header', { class: 'ola' }, h('h1', null, 'Biblioteca'), h('p', { class: 'texto-2' }, 'Todos os exercícios, do mais fácil ao mais difícil, em cada trilha.')), busca, corpo),
  };
}

function telaGuia() {
  return {
    titulo: 'Guia',
    voltar: '#/mais',
    aba: 'mais',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Guia'), h('p', { class: 'texto-2' }, 'O essencial para treinar com segurança e ver resultado.')),
      ...ARTIGOS.map((a) =>
        h(
          'details',
          { class: `card artigo ${a.alerta ? 'card-alerta' : ''}`.trim(), open: a.id === 'como-funciona' },
          h('summary', null, h('span', { class: 'item-icone' }, icone(a.icone, { tamanho: 20 })), h('strong', null, a.titulo)),
          ...a.paragrafos.map((p) => h('p', null, p)),
        ),
      ),
      aviso({ tipo: 'info', texto: 'Este app é uma ferramenta de apoio e não substitui acompanhamento profissional.' }),
    ),
  };
}

export default function telaMais(ctx) {
  switch (ctx.rota) {
    case 'conquistas':
      return telaConquistas(ctx);
    case 'historico':
      return telaHistorico(ctx);
    case 'biblioteca':
      return telaBiblioteca(ctx);
    case 'guia':
      return telaGuia(ctx);
    default:
      return telaMenu(ctx);
  }
}

