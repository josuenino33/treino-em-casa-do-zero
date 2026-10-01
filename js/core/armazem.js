// Estado do app guardado no localStorage do aparelho. Nada sai do aparelho.

import { estadoPadrao, migrar } from './esquema.js';

const CHAVE = 'trilha:estado';
let estado = null;
let erroCarga = null;
let aoFalharSalvar = () => {};

export function carregar() {
  erroCarga = null;
  try {
    const bruto = localStorage.getItem(CHAVE);
    estado = bruto ? migrar(JSON.parse(bruto)) : estadoPadrao();
  } catch (e) {
    // Dados corrompidos: guarda uma cópia para não perder nada e começa limpo.
    erroCarga = e;
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) localStorage.setItem(`${CHAVE}:corrompido:${Date.now()}`, bruto);
    } catch {
      /* sem espaço: segue sem a cópia */
    }
    estado = estadoPadrao();
  }
  return estado;
}

export function falhaNaCarga() {
  return erroCarga;
}

export function obter() {
  return estado;
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch (e) {
    aoFalharSalvar(e);
    return false;
  }
}

// Recebe uma função que altera uma cópia do estado; a cópia vira o estado
// novo e é salva. Se a função lançar erro, nada muda.
export function atualizar(fn) {
  const rascunho = structuredClone(estado);
  fn(rascunho);
  estado = rascunho;
  return salvar();
}

export function substituir(novo) {
  estado = migrar(novo);
  salvar();
}

export function apagarTudo() {
  localStorage.removeItem(CHAVE);
  for (const chave of Object.keys(localStorage)) {
    if (chave.startsWith('trilha:')) localStorage.removeItem(chave);
  }
  estado = estadoPadrao();
}

export function definirErroSalvar(fn) {
  aoFalharSalvar = fn;
}

// Valores avulsos (rascunho do treino, cronômetro da caminhada).
export function lerLocal(chave, padrao = null) {
  try {
    const v = localStorage.getItem(`trilha:${chave}`);
    return v ? JSON.parse(v) : padrao;
  } catch {
    return padrao;
  }
}

export function gravarLocal(chave, valor) {
  try {
    localStorage.setItem(`trilha:${chave}`, JSON.stringify(valor));
  } catch (e) {
    aoFalharSalvar(e);
  }
}

export function removerLocal(chave) {
  try {
    localStorage.removeItem(`trilha:${chave}`);
  } catch {
    /* ignora */
  }
}

export function espacoUsado() {
  let bytes = 0;
  try {
    for (const chave of Object.keys(localStorage)) {
      if (chave.startsWith('trilha:')) bytes += (localStorage.getItem(chave) || '').length * 2;
    }
  } catch {
    /* ignora */
  }
  return bytes;
}
