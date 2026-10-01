import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoBase, addTreino } from './auxiliar.js';
import {
  semanaDoPrograma,
  faseDaSemana,
  metaCaminhada,
  semanaLeve,
  planoDoDia,
  tipoCaminhada,
  treinosPendentes,
  statusTeste,
  agendaDaSemana,
} from '../js/logic/plano.js';
import { addDias, diffDias, inicioSemana, diaSemana, idadeEm } from '../js/core/datas.js';

test('datas: semana começa na segunda e contas atravessam meses', () => {
  assert.equal(inicioSemana('2026-10-01'), '2026-09-28'); // quinta -> segunda
  assert.equal(inicioSemana('2026-10-04'), '2026-09-28'); // domingo -> segunda anterior
  assert.equal(inicioSemana('2026-09-28'), '2026-09-28');
  assert.equal(addDias('2026-12-30', 3), '2027-01-02');
  assert.equal(diffDias('2026-02-27', '2026-03-01'), 2);
  assert.equal(diaSemana('2026-10-01'), 4);
  assert.equal(idadeEm('2002-10-02', '2026-10-01'), 23);
  assert.equal(idadeEm('2002-10-01', '2026-10-01'), 24);
});

test('semanas e fases do programa', () => {
  assert.equal(semanaDoPrograma('2026-09-07', '2026-09-07'), 1);
  assert.equal(semanaDoPrograma('2026-09-07', '2026-09-13'), 1);
  assert.equal(semanaDoPrograma('2026-09-07', '2026-09-14'), 2);
  // Começar numa quinta: a semana 1 vai até domingo.
  assert.equal(semanaDoPrograma('2026-10-01', '2026-10-04'), 1);
  assert.equal(semanaDoPrograma('2026-10-01', '2026-10-05'), 2);
  assert.equal(semanaDoPrograma(null, '2026-10-05'), 1);
  assert.equal(faseDaSemana(1).nome, 'Adaptação');
  assert.equal(faseDaSemana(5).nome, 'Construção');
  assert.equal(faseDaSemana(16).nome, 'Evolução');
  assert.equal(faseDaSemana(40).nome, 'Domínio');
});

test('meta de caminhada cresce 5 min por semana até 60', () => {
  assert.equal(metaCaminhada(1, 'devagar'), 10);
  assert.equal(metaCaminhada(3, 'devagar'), 20);
  assert.equal(metaCaminhada(20, 'devagar'), 60);
  assert.equal(metaCaminhada(1), 20);
  assert.equal(metaCaminhada(4), 35);
  assert.equal(metaCaminhada(9), 60);
  assert.equal(metaCaminhada(30), 60);
  assert.equal(semanaLeve(8), true);
  assert.equal(semanaLeve(7), false);
});

test('plano do dia segue os dias configurados', () => {
  const e = estadoBase(); // treino seg/qua/sex, caminhada ter/qui/sáb
  assert.equal(planoDoDia(e, '2026-09-28').tipo, 'forca'); // segunda
  assert.equal(planoDoDia(e, '2026-09-29').tipo, 'caminhada'); // terça
  assert.equal(planoDoDia(e, '2026-10-04').tipo, 'descanso'); // domingo
  addTreino(e, '2026-09-28', 'empurrar', 1, [10, 10, 10]);
  assert.equal(planoDoDia(e, '2026-09-28').feitoForca, true);
});

test('caminhada intervalada a partir da fase 2 e subidas na fase 3', () => {
  const e = estadoBase(); // início 2026-09-07
  assert.equal(tipoCaminhada(e, '2026-09-08'), 'continua'); // semana 1
  assert.equal(tipoCaminhada(e, '2026-10-06'), 'intervalada'); // semana 5, terça
  assert.equal(tipoCaminhada(e, '2026-10-08'), 'continua'); // semana 5, quinta
  assert.equal(tipoCaminhada(e, '2026-11-05'), 'subidas'); // semana 9, quinta
});

test('conta treinos pendentes da semana', () => {
  const e = estadoBase();
  // Quinta 2026-10-01: segunda e quarta já passaram.
  let p = treinosPendentes(e, '2026-10-01');
  assert.equal(p.pendentes, 2);
  assert.equal(p.planejados, 3);
  addTreino(e, '2026-09-29', 'empurrar', 1, [10, 10, 10]); // feito na terça
  p = treinosPendentes(e, '2026-10-01');
  assert.equal(p.pendentes, 1);
  assert.equal(p.feitos, 1);
  assert.equal(agendaDaSemana(e, '2026-10-01').length, 7);
});

test('dias antes do início do programa não contam como treino perdido', () => {
  const e = estadoBase();
  e.perfil.inicio = '2026-10-01'; // quinta
  const p = treinosPendentes(e, '2026-10-01');
  assert.equal(p.pendentes, 0);
  assert.equal(p.planejados, 1); // só a sexta
  assert.equal(agendaDaSemana(e, '2026-10-01')[0].antesDoInicio, true);
});

test('teste de evolução a cada 28 dias', () => {
  const e = estadoBase();
  assert.equal(statusTeste(e, '2026-10-01').devido, true);
  e.testes.push({ id: 'x', data: '2026-09-10', flexoes: 10 });
  assert.equal(statusTeste(e, '2026-10-01').devido, false);
  assert.equal(statusTeste(e, '2026-10-08').devido, true);
  assert.equal(statusTeste(e, '2026-10-01').proximo, '2026-10-08');
});
