// Nutrição: metas estimadas, IMC, marcos de peso e hábitos.

import { obter } from '../core/armazem.js';
import { hojeISO } from '../core/datas.js';
import { HABITOS } from '../core/esquema.js';
import { aderenciaHabitos, pesoAtual, pesoInicial, sequenciaHabitos } from '../logic/estatisticas.js';
import { classeImc, faixaPesoSaudavel, imc, metaAgua, metaCalorias, metaProteina, ritmoSaudavel, semanasAteMeta } from '../logic/nutricao.js';
import { aviso, barraProgresso, cartao, estatistica, link } from '../ui/componentes.js';
import { h, num, numCurto } from '../ui/dom.js';
import { icone } from '../ui/icones.js';
import { cartaoHabitos } from './hoje.js';

const PROTEINAS = [
  ['Peito de frango (100 g cozido)', '≈ 30 g'],
  ['Carne moída magra (100 g cozida)', '≈ 26 g'],
  ['Atum em lata (1 lata drenada)', '≈ 25 g'],
  ['Ovo (1 unidade)', '≈ 6 g'],
  ['Iogurte natural (1 pote, 170 g)', '≈ 6–10 g'],
  ['Feijão ou lentilha (1 concha, 100 g)', '≈ 6 g'],
  ['Leite (1 copo, 200 ml)', '≈ 6 g'],
  ['Queijo branco (2 fatias, 60 g)', '≈ 10 g'],
];

const TROCAS = [
  ['Refrigerante ou suco', 'Água com gás e limão, chá gelado sem açúcar'],
  ['Pão branco com margarina', 'Ovos mexidos com uma fatia de pão'],
  ['Salgadinho no fim da tarde', 'Iogurte natural com fruta'],
  ['Prato cheio de arroz e massa', 'Metade do prato com salada e legumes'],
  ['Sobremesa todo dia', 'Fruta no dia a dia, doce no fim de semana'],
];

export default function telaNutricao(ctx) {
  const e = obter();
  const p = e.perfil;
  const peso = pesoAtual(e) ?? pesoInicial(e);
  const idade = p.anoNascimento ? new Date().getFullYear() - p.anoNascimento : null;
  const faltando = [!peso && 'peso', !p.alturaCm && 'altura', !idade && 'ano de nascimento'].filter(Boolean);
  const cal = metaCalorias({ peso, alturaCm: p.alturaCm, idade, sexo: p.sexo, fator: p.atividade });
  const prot = metaProteina({ peso, pesoMeta: p.pesoMeta });
  const agua = metaAgua(peso);
  const valorImc = imc(peso, p.alturaCm);
  const faixa = faixaPesoSaudavel(p.alturaCm);
  const ritmo = ritmoSaudavel(peso);
  const semanas = semanasAteMeta(peso, p.pesoMeta);
  const ini = pesoInicial(e);

  const metas = cartao(
    { titulo: 'Metas diárias', subtitulo: 'Estimativas para começar. Ajuste pelo resultado.' },
    faltando.length ? aviso({ tipo: 'info', titulo: 'Complete seu perfil', texto: `Falta: ${faltando.join(', ')}.`, acao: link({ href: '#/config', texto: 'Abrir ajustes', variante: 'fantasma' }) }) : null,
    h(
      'div',
      { class: 'grade-stats compacta' },
      estatistica({ rotulo: 'Calorias', valor: cal ? num(cal.meta) : '—', unidade: cal ? 'kcal' : '', detalhe: cal ? `Gasto estimado ${num(cal.manutencao)} kcal` : null }),
      estatistica({ rotulo: 'Proteína', valor: prot ? `${prot.min}–${prot.max}` : '—', unidade: prot ? 'g' : '', detalhe: prot ? `≈ ${prot.porRefeicao} g em 4 refeições` : null }),
      estatistica({ rotulo: 'Água', valor: agua ? numCurto(agua) : '—', unidade: agua ? 'litros' : '', detalhe: 'Mais em dia quente ou de treino' }),
    ),
    h('p', { class: 'texto-3' }, cal ? `Déficit de cerca de ${num(cal.deficit)} kcal por dia (fórmula Mifflin-St Jeor). Se a média de peso não cair em 3 semanas, reduza um pouco as porções. Se estiver caindo mais de ${ritmo ? numCurto(ritmo.max) : 1} kg por semana, coma um pouco mais.` : 'Preencha peso, altura e ano de nascimento para calcular.'),
  );

  // Marcos a cada 5 kg perdidos, até a meta.
  const marcos = [];
  if (ini && p.pesoMeta && ini > p.pesoMeta) {
    for (let perda = 5; ini - perda > p.pesoMeta; perda += 5) marcos.push(ini - perda);
    marcos.push(p.pesoMeta);
  }
  const corpo = cartao(
    { titulo: 'Seu corpo' },
    h(
      'div',
      { class: 'grade-stats compacta' },
      estatistica({ rotulo: 'IMC', valor: valorImc ? numCurto(valorImc) : '—', detalhe: classeImc(valorImc) }),
      estatistica({ rotulo: 'Meta', valor: p.pesoMeta ? numCurto(p.pesoMeta) : '—', unidade: p.pesoMeta ? 'kg' : '', detalhe: faixa ? `Faixa de IMC saudável: ${faixa.min}–${faixa.max} kg` : null }),
      estatistica({ rotulo: 'Ritmo saudável', valor: ritmo ? `${numCurto(ritmo.min)}–${numCurto(ritmo.max)}` : '—', unidade: ritmo ? 'kg/sem' : '', detalhe: '0,5% a 1% do peso' }),
    ),
    semanas > 0 ? h('p', { class: 'texto-2' }, `No ritmo médio (0,75% por semana), a meta chega em cerca de ${semanas} semanas (${Math.round(semanas / 4.35)} meses). Sem pressa: devagar preserva músculo e pele.`) : null,
    marcos.length
      ? h(
          'ol',
          { class: 'marcos' },
          marcos.map((alvo) => {
            const ok = peso != null && peso <= alvo;
            return h('li', { class: ok ? 'feito' : '' }, h('span', { class: 'marco-icone' }, icone(ok ? 'check' : 'alvo', { tamanho: 16 })), `−${numCurto(ini - alvo)} kg`, h('small', null, ` (${numCurto(alvo)} kg)`));
          }),
        )
      : null,
    h('p', { class: 'texto-3' }, 'IMC não diferencia músculo de gordura. A cintura é um bom complemento: abaixo de metade da sua altura é um bom sinal.'),
  );

  const ad = aderenciaHabitos(e, hojeISO());
  const seq = sequenciaHabitos(e, hojeISO());
  const ativos = HABITOS.filter((x) => e.config.habitos.includes(x.id));
  const aderencia = ad.dias
    ? cartao(
        { titulo: 'Constância nos hábitos', subtitulo: `Últimos ${ad.dias} dias · sequência atual: ${seq} ${seq === 1 ? 'dia' : 'dias'} com todos` },
        h(
          'ul',
          { class: 'medidores' },
          ativos.map((hab) => {
            const v = ad.porHabito[hab.id] || 0;
            return h('li', null, h('div', { class: 'medidor-topo' }, h('span', null, hab.nome), h('strong', null, `${Math.round(v * 100)}%`)), barraProgresso(v, hab.nome));
          }),
        ),
      )
    : null;

  const prato = cartao(
    { titulo: 'Montando o prato' },
    h(
      'div',
      { class: 'prato' },
      h('div', { class: 'prato-desenho', 'aria-hidden': 'true' }),
      h(
        'ul',
        { class: 'prato-legenda' },
        h('li', null, h('span', { class: 'chave-prato metade' }), h('span', null, h('strong', null, 'Metade: '), 'verduras e legumes')),
        h('li', null, h('span', { class: 'chave-prato a' }), h('span', null, h('strong', null, 'Um quarto: '), 'proteína (carne, frango, ovo, peixe)')),
        h('li', null, h('span', { class: 'chave-prato b' }), h('span', null, h('strong', null, 'Um quarto: '), 'arroz, feijão, batata ou massa')),
      ),
    ),
  );

  const tabela = (cab, linhas) =>
    h(
      'div',
      { class: 'tabela-rolagem' },
      h('table', { class: 'tabela' }, h('thead', null, h('tr', null, cab.map((c) => h('th', { scope: 'col' }, c)))), h('tbody', null, linhas.map(([a, b]) => h('tr', null, h('th', { scope: 'row' }, a), h('td', null, b))))),
    );

  return {
    titulo: 'Nutrição',
    aba: 'nutricao',
    conteudo: h(
      'div',
      { class: 'pilha' },
      h('header', { class: 'ola' }, h('h1', null, 'Nutrição'), h('p', { class: 'texto-2' }, 'A maior parte da perda de gordura vem do prato. O treino garante que o que sai é gordura, não músculo.')),
      metas,
      cartaoHabitos(e, ctx, { comLink: false }),
      aderencia,
      corpo,
      prato,
      cartao({ titulo: 'Proteína: quanto tem em cada alimento' }, tabela(['Alimento', 'Proteína'], PROTEINAS), h('p', { class: 'texto-3' }, 'Valores aproximados.')),
      cartao({ titulo: 'Trocas que ajudam' }, tabela(['Em vez de', 'Experimente'], TROCAS)),
      aviso({ tipo: 'info', texto: 'Estas são orientações gerais. Para um plano alimentar sob medida, especialmente se você tem diabetes, pressão alta ou outra condição, procure um nutricionista.' }),
    ),
  };
}
