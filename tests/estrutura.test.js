// Confere que o service worker guarda todos os arquivos do app (senão o
// modo offline quebra quando alguém cria um arquivo novo e esquece de listar).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

function listar(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? listar(caminho) : [caminho];
  });
}

const doServiceWorker = () => {
  const sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8');
  return new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]));
};

test('o service worker guarda todos os arquivos do app', () => {
  const lista = doServiceWorker();
  const arquivos = ['js', 'css', 'icons'].flatMap((p) => listar(join(RAIZ, p))).map((f) => relative(RAIZ, f).split(sep).join('/'));
  const faltando = arquivos.filter((f) => !lista.has(f));
  assert.deepEqual(faltando, [], `Adicione ao ARQUIVOS do sw.js: ${faltando.join(', ')}`);
  for (const f of ['', 'index.html', 'manifest.webmanifest']) assert.ok(lista.has(f), `sw.js deveria guardar ./${f}`);
});

test('todo arquivo listado no service worker existe', () => {
  for (const f of doServiceWorker()) {
    if (!f) continue;
    assert.ok(statSync(join(RAIZ, f), { throwIfNoEntry: false }), `sw.js lista ./${f}, que não existe`);
  }
});

test('imports relativos apontam para arquivos que existem', () => {
  for (const arquivo of listar(join(RAIZ, 'js'))) {
    const codigo = readFileSync(arquivo, 'utf8');
    for (const m of codigo.matchAll(/from\s+'(\.[^']+)'/g)) {
      const alvo = join(arquivo, '..', m[1]);
      assert.ok(statSync(alvo, { throwIfNoEntry: false }), `${relative(RAIZ, arquivo)} importa ${m[1]}, que não existe`);
    }
  }
});

test('manifesto aponta para ícones existentes', () => {
  const manifesto = JSON.parse(readFileSync(join(RAIZ, 'manifest.webmanifest'), 'utf8'));
  for (const icone of manifesto.icons) {
    assert.ok(statSync(join(RAIZ, icone.src), { throwIfNoEntry: false }), `ícone ${icone.src} não existe`);
  }
});
