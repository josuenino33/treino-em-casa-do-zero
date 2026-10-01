// Criação de elementos sem innerHTML: todo texto entra como textContent.

const PROPRIEDADES = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'open', 'indeterminate', 'multiple', 'required']);

function aplicar(el, props, svg = false) {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') {
      if (svg) el.setAttribute('class', v);
      else el.className = v;
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (!svg && PROPRIEDADES.has(k)) {
      el[k] = v;
    } else if (k === 'ref' && typeof v === 'function') {
      v(el);
    } else {
      el.setAttribute(k, v === true ? '' : String(v));
    }
  }
}

// Anexa filhos ignorando null/false (o append nativo escreveria "null").
export function anexar(el, ...filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false || f === true) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

export function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  aplicar(el, props);
  anexar(el, filhos);
  return el;
}

const NS = 'http://www.w3.org/2000/svg';

export function s(tag, props, ...filhos) {
  const el = document.createElementNS(NS, tag);
  aplicar(el, props, true);
  anexar(el, filhos);
  return el;
}

export function limpar(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

const formatadores = new Map();
function formatador(casas) {
  if (!formatadores.has(casas)) {
    formatadores.set(casas, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));
  }
  return formatadores.get(casas);
}

export function num(v, casas = 0) {
  if (v == null || !Number.isFinite(v)) return '—';
  return formatador(casas).format(v);
}

// Número com casas só quando precisa: 104 / 104,5
export function numCurto(v, casasMax = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  const arred = Number(v.toFixed(casasMax));
  return Number.isInteger(arred) ? num(arred, 0) : num(arred, casasMax);
}

export function comSinal(v, casas = 1, unidade = '') {
  if (v == null || !Number.isFinite(v)) return '—';
  const txt = numCurto(Math.abs(v), casas);
  const sinal = v > 0.0001 ? '+' : v < -0.0001 ? '−' : '';
  return `${sinal}${txt}${unidade ? ` ${unidade}` : ''}`;
}

export function lerNumero(texto) {
  if (texto == null) return null;
  const limpo = String(texto).trim().replace(/\s/g, '').replace(',', '.');
  if (limpo === '') return null;
  const v = Number(limpo);
  return Number.isFinite(v) ? v : null;
}

export function baixarArquivo(nome, conteudo, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function lerArquivoTexto(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(arquivo);
  });
}
