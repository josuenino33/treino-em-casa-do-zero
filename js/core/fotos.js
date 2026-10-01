// Fotos de progresso no IndexedDB do aparelho. Elas nunca são enviadas para
// lugar nenhum; só entram no backup se você marcar essa opção.

import { novoId } from './esquema.js';

const BANCO = 'trilha-fotos';
const LOJA = 'fotos';
const LADO_MAX = 1080;

let conexao = null;

function abrir() {
  if (conexao) return conexao;
  conexao = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Este navegador não permite guardar fotos.'));
      return;
    }
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Não foi possível abrir o banco de fotos.'));
  });
  conexao.catch(() => {
    conexao = null;
  });
  return conexao;
}

async function transacao(modo, fn) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOJA, modo);
    const loja = tx.objectStore(LOJA);
    let resultado;
    Promise.resolve(fn(loja)).then((r) => {
      resultado = r;
    });
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operação cancelada.'));
  });
}

const pedido = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

// Reduz a foto para no máximo 1080 px no maior lado, em JPEG.
export async function comprimir(arquivo) {
  const bitmap = await createImageBitmap(arquivo).catch(() => null);
  if (!bitmap) throw new Error('Não consegui ler essa imagem.');
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao comprimir a foto.'))), 'image/jpeg', 0.82);
  });
}

export async function salvarFoto(arquivo, data, pose) {
  const blob = await comprimir(arquivo);
  const foto = { id: novoId(), data, pose, blob, criadoEm: new Date().toISOString() };
  await transacao('readwrite', (loja) => loja.put(foto));
  return foto;
}

export async function listarFotos() {
  try {
    const fotos = await transacao('readonly', (loja) => pedido(loja.getAll()));
    return (fotos || []).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  } catch {
    return [];
  }
}

export async function removerFoto(id) {
  await transacao('readwrite', (loja) => loja.delete(id));
}

export async function apagarFotos() {
  await transacao('readwrite', (loja) => loja.clear()).catch(() => {});
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(',')[1]);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

function base64ParaBlob(b64, tipo = 'image/jpeg') {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

export async function exportarFotos() {
  const fotos = await listarFotos();
  return Promise.all(
    fotos.map(async (f) => ({ id: f.id, data: f.data, pose: f.pose, criadoEm: f.criadoEm, base64: await blobParaBase64(f.blob) })),
  );
}

export async function importarFotos(lista) {
  let n = 0;
  for (const f of lista) {
    if (!f || typeof f.base64 !== 'string' || !f.data) continue;
    const foto = { id: f.id || novoId(), data: f.data, pose: f.pose || 'frente', criadoEm: f.criadoEm || new Date().toISOString(), blob: base64ParaBlob(f.base64) };
    await transacao('readwrite', (loja) => loja.put(foto));
    n += 1;
  }
  return n;
}
