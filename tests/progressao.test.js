import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoBase, addTreino } from './auxiliar.js';
import {
  metasDoDia,
  montarTreino,
  mudarNivel,
  niveisIniciais,
  statusTrilha,
  trilhaDesbloqueada,
  estimarMinutos,
  melhorSerie,
} from '../js/logic/progressao.js';
import { nivelDe, TRILHAS, ORDEM_TREINO } from '../js/data/trilhas.js';

test('todas as trilhas têm níveis coerentes', () => {
  for (const t of TRILHAS) {
    assert.ok(t.niveis.length >= 5, `${t.id} tem poucos níveis`);
    for (const nv of t.niveis) {
      assert.ok(nv.min < nv.max, `${nv.nome}: faixa invertida`);
      assert.ok(['reps', 'segundos'].includes(nv.metrica));
      assert.ok(nv.como.length >= 2, `${nv.nome}: faltam passos de execução`);
    }
  }
  assert.deepEqual([...ORDEM_TREINO].sort(), TRILHAS.map((t) => t.id).sort());
});

test('sobe de nível só depois de 2 treinos seguidos no topo', () => {
  const e = estadoBase();
  e.niveis.empurrar = 4; // flexão no sofá: 8–12
  addTreino(e, '2026-09-07', 'empurrar', 4, [12, 12, 12]);
  assert.equal(statusTrilha(e, 'empurrar').topoSeguidos, 1);
  assert.equal(statusTrilha(e, 'empurrar').podeSubir, false);
  addTreino(e, '2026-09-09', 'empurrar', 4, [12, 12, 12]);
  assert.equal(statusTrilha(e, 'empurrar').podeSubir, true);
});

test('um treino fora do topo zera a contagem', () => {
  const e = estadoBase();
  e.niveis.empurrar = 4;
  addTreino(e, '2026-09-07', 'empurrar', 4, [12, 12, 12]);
  addTreino(e, '2026-09-09', 'empurrar', 4, [12, 11, 10]);
  addTreino(e, '2026-09-11', 'empurrar', 4, [12, 12, 12]);
  const st = statusTrilha(e, 'empurrar');
  assert.equal(st.topoSeguidos, 1);
  assert.equal(st.podeSubir, false);
});

test('chegar no topo indo à falha não conta', () => {
  const e = estadoBase();
  e.niveis.empurrar = 4;
  addTreino(e, '2026-09-07', 'empurrar', 4, [12, 12, 12], { esforco: 'falha' });
  addTreino(e, '2026-09-09', 'empurrar', 4, [12, 12, 12], { esforco: 'falha' });
  const st = statusTrilha(e, 'empurrar');
  assert.equal(st.podeSubir, false);
  assert.equal(st.topoNoLimite, true);
});

test('treino curto (2 séries) não conta para subir nem quebra a sequência', () => {
  const e = estadoBase();
  e.niveis.empurrar = 4;
  addTreino(e, '2026-09-07', 'empurrar', 4, [12, 12, 12]);
  addTreino(e, '2026-09-09', 'empurrar', 4, [12, 12]);
  assert.equal(statusTrilha(e, 'empurrar').topoSeguidos, 1);
  addTreino(e, '2026-09-11', 'empurrar', 4, [12, 12, 12]);
  assert.equal(statusTrilha(e, 'empurrar').podeSubir, true);
});

test('depois de subir, treinos do nível antigo não contam', () => {
  const e = estadoBase();
  e.niveis.empurrar = 4;
  addTreino(e, '2026-09-07', 'empurrar', 4, [12, 12, 12]);
  addTreino(e, '2026-09-09', 'empurrar', 4, [12, 12, 12]);
  mudarNivel(e, 'empurrar', 5, 'subiu', '2026-09-09T23:00:00.000Z');
  const st = statusTrilha(e, 'empurrar');
  assert.equal(st.numero, 5);
  assert.equal(st.entradas, 0);
  assert.equal(st.podeSubir, false);
});

test('sugere descer com dor ou com 2 treinos abaixo do mínimo', () => {
  const e = estadoBase();
  e.niveis.agachamento = 3; // 10–15
  addTreino(e, '2026-09-07', 'agachamento', 3, [8, 7, 6]);
  assert.equal(statusTrilha(e, 'agachamento').sugerirDescer, false);
  addTreino(e, '2026-09-09', 'agachamento', 3, [9, 8, 8]);
  assert.equal(statusTrilha(e, 'agachamento').motivoDescer, 'dificuldade');

  const e2 = estadoBase();
  e2.niveis.agachamento = 3;
  addTreino(e2, '2026-09-07', 'agachamento', 3, [12, 12, 12], { dor: true });
  assert.equal(statusTrilha(e2, 'agachamento').motivoDescer, 'dor');

  const e3 = estadoBase();
  addTreino(e3, '2026-09-07', 'agachamento', 1, [8, 8, 8], { dor: true });
  assert.equal(statusTrilha(e3, 'agachamento').sugerirDescer, false, 'no nível 1 não há para onde descer');
});

test('próximo nível com barra fica bloqueado sem barra', () => {
  const e = estadoBase();
  e.niveis.puxar = 3;
  addTreino(e, '2026-09-07', 'puxar', 3, [12, 12, 12]);
  addTreino(e, '2026-09-09', 'puxar', 3, [12, 12, 12]);
  let st = statusTrilha(e, 'puxar');
  assert.equal(st.bloqueioEquipamento, true);
  assert.equal(st.podeSubir, false);
  assert.equal(st.noTopoSemProximo, true);
  e.config.barra = true;
  st = statusTrilha(e, 'puxar');
  assert.equal(st.podeSubir, true);
});

test('metas sobem 1 rep (ou 5 s) por série, dentro da faixa', () => {
  const sofa = nivelDe('empurrar', 4); // 8–12
  assert.deepEqual(metasDoDia(sofa, null), [8, 8, 8]);
  assert.deepEqual(metasDoDia(sofa, { series: [10, 9, 7], esforco: 'medida' }), [11, 10, 8]);
  assert.deepEqual(metasDoDia(sofa, { series: [12, 12, 11], esforco: 'medida' }), [12, 12, 12]);
  assert.deepEqual(metasDoDia(sofa, { series: [10, 9, 8], esforco: 'falha' }), [10, 9, 8]);
  assert.deepEqual(metasDoDia(sofa, { series: [10], esforco: 'medida' }, 2), [11, 11]);
  const prancha = nivelDe('prancha', 3); // 20–40 s
  assert.deepEqual(metasDoDia(prancha, { series: [25, 20, 38], esforco: 'medida' }), [30, 25, 40]);
});

test('teste inicial define os níveis de partida', () => {
  const n = niveisIniciais({ flexoes: 10, sentar30: 11, prancha: 20 });
  assert.equal(n.empurrar, 4);
  assert.equal(n.agachamento, 2);
  assert.equal(n.prancha, 2);
  assert.equal(n.puxar, 1);
  assert.equal(niveisIniciais({ flexoes: 0 }).empurrar, 1);
  assert.equal(niveisIniciais({ flexoes: 25 }).empurrar, 6);
  assert.equal(niveisIniciais({}).agachamento, 1);
});

test('afundo só entra no treino quando o agachamento chega ao nível 4', () => {
  const e = estadoBase();
  assert.equal(trilhaDesbloqueada(e, 'afundo'), false);
  assert.ok(!montarTreino(e).some((x) => x.trilha === 'afundo'));
  e.niveis.agachamento = 4;
  assert.equal(trilhaDesbloqueada(e, 'afundo'), true);
  const treino = montarTreino(e);
  assert.ok(treino.some((x) => x.trilha === 'afundo'));
  assert.equal(treino[0].trilha, 'agachamento');
});

test('treino curto usa 2 séries e a estimativa de tempo é razoável', () => {
  const e = estadoBase();
  e.config.ritmo = 'normal';
  const completo = montarTreino(e, 'completo', '2026-10-01');
  const curto = montarTreino(e, 'curto', '2026-10-01');
  assert.ok(completo.every((x) => x.metas.length === 3));
  assert.ok(curto.every((x) => x.metas.length === 2));
  const min = estimarMinutos(completo, 75);
  assert.ok(min >= 20 && min <= 50, `estimativa fora do esperado: ${min}`);
  assert.ok(estimarMinutos(curto, 75) < min);
});

test('ritmo devagar: 2 séries nas 4 primeiras semanas, depois 3', () => {
  const e = estadoBase(); // início 2026-09-07, ritmo devagar (padrão)
  assert.equal(e.config.ritmo, 'devagar');
  assert.ok(montarTreino(e, 'completo', '2026-09-07').every((x) => x.metas.length === 2 && x.alvoSeries === 2));
  assert.ok(montarTreino(e, 'completo', '2026-10-04').every((x) => x.metas.length === 2)); // semana 4
  assert.ok(montarTreino(e, 'completo', '2026-10-05').every((x) => x.metas.length === 3)); // semana 5
  assert.ok(montarTreino(e, 'curto', '2026-09-07').every((x) => x.metas.length === 1));
});

test('na adaptação, 2 séries completas no topo contam para subir', () => {
  const e = estadoBase();
  e.niveis.empurrar = 1; // parede: 10–15
  addTreino(e, '2026-09-07', 'empurrar', 1, [15, 15], { alvoSeries: 2 });
  addTreino(e, '2026-09-09', 'empurrar', 1, [15, 15], { alvoSeries: 2 });
  assert.equal(statusTrilha(e, 'empurrar').podeSubir, true);
  // Treino curto na adaptação (1 série de 2 previstas) não conta.
  const e2 = estadoBase();
  addTreino(e2, '2026-09-07', 'empurrar', 1, [15], { alvoSeries: 2 });
  addTreino(e2, '2026-09-09', 'empurrar', 1, [15], { alvoSeries: 2 });
  assert.equal(statusTrilha(e2, 'empurrar').podeSubir, false);
});

test('ritmo devagar começa um nível abaixo do teste', () => {
  const n = niveisIniciais({ flexoes: 10, sentar30: 11, prancha: 20 }, { devagar: true });
  assert.equal(n.empurrar, 3);
  assert.equal(n.agachamento, 1);
  assert.equal(n.prancha, 1);
  assert.equal(niveisIniciais({ flexoes: 0 }, { devagar: true }).empurrar, 1);
});

test('ordem do treino alterna braço e perna', () => {
  const e = estadoBase();
  e.niveis.agachamento = 4; // libera o afundo
  const ordem = montarTreino(e, 'completo', '2026-10-01').map((x) => x.trilha);
  const bracos = new Set(['empurrar', 'puxar']);
  for (let i = 1; i < ordem.length; i += 1) {
    assert.ok(!(bracos.has(ordem[i]) && bracos.has(ordem[i - 1])), `dois de braço seguidos: ${ordem.join(', ')}`);
  }
});

test('melhor série considera só o nível pedido', () => {
  const e = estadoBase();
  addTreino(e, '2026-09-07', 'empurrar', 4, [10, 9, 8]);
  addTreino(e, '2026-09-09', 'empurrar', 5, [6, 6, 5]);
  assert.equal(melhorSerie(e, 'empurrar', 4), 10);
  assert.equal(melhorSerie(e, 'empurrar', 5), 6);
});
