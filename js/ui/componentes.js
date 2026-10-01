// Peças de interface reutilizadas pelas telas.

import { anexar, h, lerNumero, num, numCurto } from './dom.js';
import { icone } from './icones.js';

export function botao({ texto, icone: ic, variante = 'primario', tamanho = '', bloco = false, aoClicar, tipo = 'button', desabilitado = false, rotulo, classe = '' }) {
  const classes = ['btn', `btn-${variante}`, tamanho && `btn-${tamanho}`, bloco && 'btn-bloco', !texto && 'btn-icone', classe].filter(Boolean).join(' ');
  return h(
    'button',
    { type: tipo, class: classes, onClick: aoClicar, disabled: desabilitado, 'aria-label': rotulo || null, title: !texto && rotulo ? rotulo : null },
    ic && ic !== 'direita' ? icone(ic, { tamanho: tamanho === 'lg' ? 22 : 18 }) : null,
    texto ? h('span', null, texto) : null,
    // Seta de "avançar" fica depois do texto.
    ic === 'direita' ? icone(ic, { tamanho: tamanho === 'lg' ? 22 : 18 }) : null,
  );
}

export function link({ href, texto, icone: ic, variante = 'secundario', bloco = false, tamanho = '' }) {
  const classes = ['btn', `btn-${variante}`, tamanho && `btn-${tamanho}`, bloco && 'btn-bloco'].filter(Boolean).join(' ');
  return h('a', { href, class: classes }, ic ? icone(ic, { tamanho: 18 }) : null, h('span', null, texto));
}

export function cartao(props, ...filhos) {
  const { classe = '', titulo, subtitulo, acao, ...resto } = props || {};
  const cabeca = titulo || acao
    ? h('div', { class: 'card-cabeca' },
        h('div', null, titulo ? h('h2', { class: 'card-titulo' }, titulo) : null, subtitulo ? h('p', { class: 'card-sub' }, subtitulo) : null),
        acao || null)
    : null;
  return h('section', { class: `card ${classe}`.trim(), ...resto }, cabeca, ...filhos);
}

export function aviso({ tipo = 'info', icone: ic, titulo, texto, acao }) {
  const icones = { info: 'info', sucesso: 'check', aviso: 'alerta', perigo: 'alerta' };
  return h(
    'div',
    { class: `aviso aviso-${tipo}`, role: tipo === 'perigo' ? 'alert' : null },
    h('span', { class: 'aviso-icone' }, icone(ic || icones[tipo], { tamanho: 20 })),
    h('div', { class: 'aviso-corpo' }, titulo ? h('strong', null, titulo) : null, texto ? h('p', null, texto) : null, acao || null),
  );
}

export function barraProgresso(fracao, rotulo) {
  const pct = Math.round(Math.min(1, Math.max(0, fracao)) * 100);
  return h(
    'div',
    { class: 'barra', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': rotulo || null },
    h('div', { class: 'barra-preenchida', style: { width: `${pct}%` } }),
  );
}

export function vazio({ icone: ic = 'info', titulo, texto, acao }) {
  return h('div', { class: 'vazio' }, h('span', { class: 'vazio-icone' }, icone(ic, { tamanho: 28 })), h('strong', null, titulo), texto ? h('p', null, texto) : null, acao || null);
}

export function estatistica({ rotulo, valor, unidade, detalhe, destaque = false }) {
  return h(
    'div',
    { class: `stat${destaque ? ' stat-destaque' : ''}` },
    h('span', { class: 'stat-rotulo' }, rotulo),
    h('span', { class: 'stat-valor' }, valor, unidade ? h('small', null, ` ${unidade}`) : null),
    detalhe ? h('span', { class: 'stat-detalhe' }, detalhe) : null,
  );
}

let contadorIds = 0;
export function idUnico(prefixo = 'campo') {
  contadorIds += 1;
  return `${prefixo}-${contadorIds}`;
}

export function campo({ rotulo, dica, entrada }) {
  const alvo = entrada.entrada || entrada;
  if (!alvo.id) alvo.id = idUnico();
  return h('div', { class: 'campo' }, h('label', { for: alvo.id }, rotulo), entrada, dica ? h('p', { class: 'campo-dica' }, dica) : null);
}

export function entradaNumero({ valor, min, max, passo = 1, sufixo, placeholder, aoMudar, id, decimal = false }) {
  const entrada = h('input', {
    type: 'text',
    inputmode: decimal ? 'decimal' : 'numeric',
    id: id || idUnico('num'),
    value: valor == null ? '' : decimal ? numCurto(valor, 1) : String(valor),
    placeholder: placeholder || '',
    autocomplete: 'off',
    'data-min': min,
    'data-max': max,
    'data-passo': passo,
  });
  entrada.addEventListener('change', () => {
    let v = lerNumero(entrada.value);
    if (v != null) {
      if (min != null) v = Math.max(min, v);
      if (max != null) v = Math.min(max, v);
      entrada.value = decimal ? numCurto(v, 1) : String(Math.round(v));
      if (!decimal) v = Math.round(v);
    }
    aoMudar?.(v);
  });
  if (!sufixo) return entrada;
  const caixa = h('div', { class: 'entrada-sufixo' }, entrada, h('span', { 'aria-hidden': 'true' }, sufixo));
  caixa.entrada = entrada;
  return caixa;
}

// Contador com botões − e + grandes, bom para usar com a mão suada.
export function contador({ valor, min = 0, max = 999, passo = 1, sufixo = '', rotulo, aoMudar }) {
  let atual = valor;
  const mostrador = h('output', { class: 'contador-valor', 'aria-live': 'polite' });
  const desenhar = () => {
    mostrador.textContent = `${num(atual)}${sufixo}`;
    menos.disabled = atual <= min;
    mais.disabled = atual >= max;
  };
  const mudar = (delta) => {
    atual = Math.min(max, Math.max(min, atual + delta));
    desenhar();
    aoMudar?.(atual);
  };
  const menos = botao({ icone: 'subtrair', variante: 'secundario', tamanho: 'lg', rotulo: `Diminuir ${rotulo || ''}`.trim(), aoClicar: () => mudar(-passo) });
  const mais = botao({ icone: 'somar', variante: 'secundario', tamanho: 'lg', rotulo: `Aumentar ${rotulo || ''}`.trim(), aoClicar: () => mudar(passo) });
  const el = h('div', { class: 'contador', role: 'group', 'aria-label': rotulo || null }, menos, mostrador, mais);
  el.definir = (v) => {
    atual = v;
    desenhar();
  };
  el.valor = () => atual;
  desenhar();
  return el;
}

export function segmentado({ opcoes, valor, aoMudar, rotulo, classe = '' }) {
  let atual = valor;
  const grupo = h('div', { class: `segmentado ${classe}`.trim(), role: 'radiogroup', 'aria-label': rotulo || null });
  const botoes = opcoes.map((op) => {
    const b = h(
      'button',
      { type: 'button', role: 'radio', class: 'segmento', 'aria-checked': String(op.id === atual), dataset: { id: String(op.id) } },
      op.icone ? icone(op.icone, { tamanho: 18 }) : null,
      h('span', null, op.nome),
      op.detalhe ? h('small', null, op.detalhe) : null,
    );
    b.addEventListener('click', () => {
      atual = op.id;
      for (const x of botoes) x.setAttribute('aria-checked', String(x === b));
      aoMudar?.(op.id);
    });
    return b;
  });
  grupo.addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(ev.key)) return;
    ev.preventDefault();
    const i = botoes.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const dir = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1;
    const prox = botoes[(i + dir + botoes.length) % botoes.length];
    prox.click();
    prox.focus();
  });
  grupo.append(...botoes);
  return grupo;
}

export function alternador({ rotulo, detalhe, marcado, aoMudar }) {
  const entrada = h('input', { type: 'checkbox', class: 'alternador-entrada', checked: Boolean(marcado), role: 'switch' });
  entrada.addEventListener('change', () => aoMudar?.(entrada.checked));
  return h('label', { class: 'alternador' }, h('span', { class: 'alternador-texto' }, h('span', null, rotulo), detalhe ? h('small', null, detalhe) : null), entrada, h('span', { class: 'alternador-trilho', 'aria-hidden': 'true' }));
}

// ------- Folha (modal) -------

export function abrirFolha({ titulo, corpo, rodape, aoFechar, classe = '' }) {
  const dialogo = h('dialog', { class: `folha ${classe}`.trim(), 'aria-label': titulo });
  let fechado = false;
  const fechar = (valor) => {
    if (fechado) return;
    fechado = true;
    dialogo.close();
    dialogo.remove();
    aoFechar?.(valor);
  };
  const conteudo = typeof corpo === 'function' ? corpo(fechar) : corpo;
  const acoes = typeof rodape === 'function' ? rodape(fechar) : rodape;
  anexar(dialogo,
    h('div', { class: 'folha-cabeca' }, h('h2', null, titulo), botao({ icone: 'x', variante: 'fantasma', rotulo: 'Fechar', aoClicar: () => fechar(null) })),
    h('div', { class: 'folha-corpo' }, conteudo),
    acoes ? h('div', { class: 'folha-rodape' }, acoes) : null,
  );
  dialogo.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    fechar(null);
  });
  dialogo.addEventListener('click', (ev) => {
    if (ev.target === dialogo) fechar(null);
  });
  document.body.append(dialogo);
  dialogo.showModal();
  return { fechar, dialogo };
}

export function confirmar({ titulo, mensagem, ok = 'Confirmar', cancelar = 'Cancelar', perigo = false }) {
  return new Promise((resolve) => {
    abrirFolha({
      titulo,
      classe: 'folha-pequena',
      corpo: h('p', { class: 'texto-2' }, mensagem),
      rodape: (fechar) => [
        botao({ texto: cancelar, variante: 'secundario', aoClicar: () => fechar(false) }),
        botao({ texto: ok, variante: perigo ? 'perigo' : 'primario', aoClicar: () => fechar(true) }),
      ],
      aoFechar: (v) => resolve(v === true),
    });
  });
}

// ------- Avisos rápidos -------

let pilha = null;
export function toast(mensagem, { tipo = 'info', icone: ic, duracao = 3800, acao } = {}) {
  if (!pilha) {
    pilha = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(pilha);
  }
  const icones = { info: 'info', sucesso: 'check', aviso: 'alerta', erro: 'alerta', conquista: 'trofeu' };
  const el = h(
    'div',
    { class: `toast toast-${tipo}` },
    icone(ic || icones[tipo] || 'info', { tamanho: 20 }),
    h('span', null, mensagem),
    acao ? h('button', { type: 'button', class: 'toast-acao', onClick: () => { acao.fn(); sumir(); } }, acao.rotulo) : null,
  );
  const sumir = () => {
    el.classList.add('saindo');
    setTimeout(() => el.remove(), 250);
  };
  pilha.append(el);
  // No máximo 3 avisos na tela: o mais antigo sai.
  while (pilha.children.length > 3) pilha.firstElementChild.remove();
  setTimeout(sumir, duracao);
}

export function itemLink({ href, icone: ic, titulo, detalhe, extra }) {
  return h(
    'a',
    { href, class: 'item-link' },
    ic ? h('span', { class: 'item-icone' }, icone(ic, { tamanho: 20 })) : null,
    h('span', { class: 'item-texto' }, h('strong', null, titulo), detalhe ? h('small', null, detalhe) : null),
    extra || null,
    icone('direita', { tamanho: 18, classe: 'item-seta' }),
  );
}
