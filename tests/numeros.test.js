import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoBase, addTreino } from './auxiliar.js';
import {
  serieMedida,
  mediaMovel,
  tendencia,
  pesoAtual,
  kgPerdidos,
  sequenciaSemanas,
  mapaAtividade,
  sequenciaHabitos,
  aderenciaHabitos,
  seriesPorSemana,
  totais,
} from '../js/logic/estatisticas.js';
import { taxaBasal, metaCalorias, metaProteina, metaAgua, imc, avaliarRitmo, semanasAteMeta } from '../js/logic/nutricao.js';
import { registrarConquistas, avaliarConquistas, proximaConquista } from '../js/logic/conquistas.js';
import { addDias } from '../js/core/datas.js';
import { gerarICS } from '../js/logic/calendario.js';
import { migrar, lerBackup, montarBackup, estadoPadrao } from '../js/core/esquema.js';

const pesar = (e, data, peso, extra = {}) => e.medidas.push({ id: data, data, peso, ...extra });

test('média móvel de 7 dias e tendência semanal', () => {
  const e = estadoBase();
  for (let i = 0; i < 21; i += 1) pesar(e, addDias('2026-09-07', i), 110 - i * 0.1);
  const pontos = serieMedida(e, 'peso');
  assert.equal(pontos.length, 21);
  const mm = mediaMovel(pontos);
  assert.ok(Math.abs(mm[6].media - (110 - 0.3)) < 1e-9);
  const t = tendencia(pontos, '2026-09-27');
  assert.ok(Math.abs(t - -0.7) < 1e-9, `tendência ${t}`);
  assert.ok(Math.abs(pesoAtual(e) - (110 - 1.7)) < 1e-9);
  assert.ok(kgPerdidos(e) > 1.6);
});

test('tendência precisa de pelo menos 3 pesagens em 7+ dias', () => {
  const e = estadoBase();
  pesar(e, '2026-09-07', 110);
  pesar(e, '2026-09-08', 109.8);
  assert.equal(tendencia(serieMedida(e, 'peso'), '2026-09-08'), null);
});

test('várias pesagens no mesmo dia: vale a última', () => {
  const e = estadoBase();
  pesar(e, '2026-09-07', 110);
  pesar(e, '2026-09-07', 109);
  assert.deepEqual(serieMedida(e, 'peso'), [{ data: '2026-09-07', valor: 109 }]);
});

test('sequência de semanas com 2+ treinos', () => {
  const e = estadoBase();
  for (const d of ['2026-09-14', '2026-09-16', '2026-09-21', '2026-09-23', '2026-09-28']) addTreino(e, d, 'empurrar', 1, [10]);
  // Semana de 28/09 tem só 1 treino até agora: conta a partir da anterior.
  assert.equal(sequenciaSemanas(e, '2026-10-01'), 2);
  addTreino(e, '2026-09-30', 'empurrar', 1, [10]);
  assert.equal(sequenciaSemanas(e, '2026-10-01'), 3);
});

test('mapa de atividade marca força, caminhada e os dois', () => {
  const e = estadoBase();
  addTreino(e, '2026-09-28', 'empurrar', 1, [10]);
  e.caminhadas.push({ id: 'c1', data: '2026-09-28', minutos: 30 });
  e.caminhadas.push({ id: 'c2', data: '2026-09-29', minutos: 30 });
  const mapa = mapaAtividade(e, '2026-10-01', 2);
  assert.equal(mapa.length, 2);
  const semana = mapa[1];
  assert.equal(semana[0].nivel, 3);
  assert.equal(semana[1].nivel, 1);
  assert.equal(semana[2].nivel, 0);
  assert.equal(semana[6].futuro, true);
});

test('totais e séries por semana', () => {
  const e = estadoBase();
  addTreino(e, '2026-09-28', 'empurrar', 1, [10, 11, 12]);
  e.treinos[0].exercicios.push({ trilha: 'puxar', nivel: 1, series: [5, 5], pulado: true });
  const tot = totais(e);
  assert.equal(tot.series, 3);
  assert.equal(tot.reps, 33);
  const porSemana = seriesPorSemana(e, '2026-10-01', 2);
  assert.deepEqual(porSemana.map((s) => s.valor), [0, 3]);
});

test('hábitos: sequência e aderência', () => {
  const e = estadoBase();
  e.config.habitos = ['proteina', 'agua'];
  e.habitos['2026-09-29'] = ['proteina', 'agua'];
  e.habitos['2026-09-30'] = ['proteina', 'agua'];
  e.habitos['2026-10-01'] = ['proteina'];
  assert.equal(sequenciaHabitos(e, '2026-10-01'), 2);
  const ad = aderenciaHabitos(e, '2026-10-01');
  assert.equal(ad.dias, 3);
  assert.equal(ad.porHabito.proteina, 1);
  assert.ok(Math.abs(ad.porHabito.agua - 2 / 3) < 1e-9);
});

test('nutrição: Mifflin-St Jeor, metas e ritmo', () => {
  const basal = taxaBasal({ peso: 110, alturaCm: 178, idade: 24, sexo: 'm' });
  assert.equal(Math.round(basal), 2098);
  const cal = metaCalorias({ peso: 110, alturaCm: 178, idade: 24, sexo: 'm', fator: 1.375 });
  assert.equal(cal.manutencao, 2880);
  assert.equal(cal.meta, 2380);
  assert.ok(cal.meta >= cal.basal);
  assert.equal(taxaBasal({ peso: 0, alturaCm: 178, idade: 24 }), null);
  const prot = metaProteina({ peso: 110, pesoMeta: 80 });
  assert.equal(prot.min, 130);
  assert.equal(prot.max, 160);
  assert.equal(metaAgua(110), 3.9);
  assert.equal(metaAgua(140), 4);
  assert.ok(Math.abs(imc(110, 178) - 34.72) < 0.01);
  assert.equal(avaliarRitmo(-0.8, 110).tipo, 'bom');
  assert.equal(avaliarRitmo(-2, 110).tipo, 'rapido');
  assert.equal(avaliarRitmo(0.1, 110).tipo, 'parado');
  assert.ok(semanasAteMeta(110, 80) > 30);
  assert.equal(semanasAteMeta(80, 85), 0);
});

test('conquistas são registradas uma vez só', () => {
  const e = estadoBase();
  addTreino(e, '2026-09-28', 'empurrar', 1, [10, 10, 10]);
  const novas = registrarConquistas(e, '2026-09-28');
  assert.ok(novas.some((c) => c.id === 'primeiro-treino'));
  assert.equal(registrarConquistas(e, '2026-09-28').length, 0);
  const lista = avaliarConquistas(e, '2026-09-28');
  assert.equal(lista.find((c) => c.id === 'primeiro-treino').desbloqueada, true);
  assert.ok(proximaConquista(e, '2026-09-28'));
});

test('conquista de peso usa a média de 7 dias', () => {
  const e = estadoBase(); // peso inicial 110
  pesar(e, '2026-09-28', 104.5);
  const novas = registrarConquistas(e, '2026-09-28').map((c) => c.id);
  assert.ok(novas.includes('kg-5'));
  assert.ok(!novas.includes('kg-10'));
});

test('arquivo .ics tem recorrência semanal e alarme', () => {
  const e = estadoPadrao();
  const ics = gerarICS(e.config, { hoje: '2026-10-01', agora: new Date('2026-10-01T12:00:00Z') });
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  assert.match(ics, /DTSTART:20261002T070000/); // próxima sexta
  assert.match(ics, /BEGIN:VALARM/);
  assert.ok(ics.includes('\r\n'));
});

test('migração completa campos e o backup faz ida e volta', () => {
  const parcial = { versao: 1, perfil: { nome: 'Ana' }, niveis: { empurrar: 99, puxar: 'x' }, treinos: [{ data: 'ruim' }, { data: '2026-09-01', exercicios: [] }] };
  const e = migrar(parcial);
  assert.equal(e.perfil.nome, 'Ana');
  assert.equal(e.niveis.empurrar, 10, 'nível limitado ao máximo da trilha');
  assert.equal(e.niveis.puxar, 1);
  assert.equal(e.treinos.length, 1);
  assert.deepEqual(e.config.diasTreino, [1, 3, 5]);

  const texto = JSON.stringify(montarBackup(e, [{ id: 'f1' }]));
  const lido = lerBackup(texto);
  assert.equal(lido.estado.perfil.nome, 'Ana');
  assert.equal(lido.fotos.length, 1);
  assert.throws(() => lerBackup('{"app":"outro"}'), /não é um backup/);
  assert.throws(() => lerBackup('nada'), /JSON/);
  assert.throws(() => migrar({ versao: 999 }), /versão mais nova/);
});
