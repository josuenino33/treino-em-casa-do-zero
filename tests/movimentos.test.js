// Toda ilustração precisa existir, ter números válidos e caber no desenho.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRILHAS } from '../js/data/trilhas.js';
import { montarMovimento } from '../js/data/movimentos.js';
import { ALTURA, CHAO, CORPO, LARGURA, aplicarEnquadro, distancia, enquadrar, esqueleto, interpolar, pontosDoEsqueleto, preparar } from '../js/logic/boneco.js';

const niveis = TRILHAS.flatMap((t) => t.niveis.map((nv, i) => ({ t, nv, n: i + 1 })));

test('todo nível tem uma ilustração', () => {
  for (const { t, nv, n } of niveis) {
    const mov = montarMovimento(nv.anim);
    assert.ok(mov, `${t.id} nível ${n} sem ilustração`);
    assert.ok(mov.quadros.length >= 2, `${t.id} nível ${n}: precisa de 2+ quadros`);
    assert.ok(mov.quadros.every((q) => q.ir > 0), `${t.id} nível ${n}: transição sem duração`);
  }
});

test('poses têm números válidos, membros do tamanho certo e cabem na tela', () => {
  for (const { t, nv, n } of niveis) {
    const mov = montarMovimento(nv.anim);
    const prontas = mov.quadros.map((q) => preparar(q.p));
    // Confere os quadros e o meio de cada transição.
    const amostras = [...prontas, ...prontas.map((p, i) => interpolar(p, prontas[(i + 1) % prontas.length], 0.5))];
    const enquadro = enquadrar(prontas.map(esqueleto), mov.cena);
    assert.ok(enquadro.k > 0.6, `${t.id} nível ${n}: desenho encolhido demais (${enquadro.k.toFixed(2)})`);
    for (const p of amostras) {
      const e = esqueleto(p);
      for (const ponto of pontosDoEsqueleto(e)) {
        const [x, y] = aplicarEnquadro(enquadro, ponto);
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `${t.id} nível ${n}: coordenada inválida`);
        assert.ok(y > 0 && y < ALTURA, `${t.id} nível ${n}: fora da altura (${y.toFixed(1)})`);
        assert.ok(x > 0 && x < LARGURA, `${t.id} nível ${n}: fora da largura (${x.toFixed(1)})`);
        assert.ok(ponto[1] <= CHAO + 4, `${t.id} nível ${n}: parte do corpo abaixo do chão (${ponto[1].toFixed(1)})`);
      }
      for (const membro of [e.bracoPerto, e.bracoLonge]) {
        assert.ok(Math.abs(distancia(e.ombro, membro.cotovelo) - CORPO.braco) < 0.5, `${t.id} nível ${n}: braço mudou de tamanho`);
      }
    }
  }
});
