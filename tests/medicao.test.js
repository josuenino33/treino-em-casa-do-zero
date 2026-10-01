// Testes do contador de passos e do GPS com sinais simulados.
// A ideia é provar que a contagem é honesta: conta caminhada de verdade e
// não conta chacoalhada, batidas soltas nem a tremida do GPS parado.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarContadorPassos } from '../js/logic/passos.js';
import { criarRastreador, distanciaMetros, formatarRitmo, qualidadeSinal, ritmoMinKm } from '../js/logic/gps.js';

const G = 9.81;
// Gerador pseudoaleatório fixo, para o teste dar sempre o mesmo resultado.
function aleatorio(semente = 42) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Simula o celular no bolso: gravidade + um "tranco" por passo + ruído.
function caminhar(contador, { segundos, hz = 1.8, amplitude = 2.5, ruido = 0.4, taxa = 50, inicio = 0, semente = 7 }) {
  const rnd = aleatorio(semente);
  const passos = Math.floor(segundos * hz);
  for (let i = 0; i < segundos * taxa; i += 1) {
    const t = inicio + (i * 1000) / taxa;
    const fase = (t / 1000) * hz * 2 * Math.PI;
    const tranco = amplitude * Math.max(0, Math.sin(fase)) ** 2 - amplitude * 0.25;
    const z = G + tranco + (rnd() - 0.5) * ruido * 2;
    contador.amostra((rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, z, t);
  }
  return passos;
}

test('conta uma caminhada normal com erro menor que 3%', () => {
  for (const hz of [1.5, 1.8, 2.1]) {
    const c = criarContadorPassos();
    const reais = caminhar(c, { segundos: 120, hz });
    const erro = Math.abs(c.passos - reais) / reais;
    assert.ok(erro < 0.03, `ritmo ${hz} Hz: contou ${c.passos} de ${reais}`);
  }
});

test('caminhada lenta e fraca (passo arrastado) também conta', () => {
  const c = criarContadorPassos();
  const reais = caminhar(c, { segundos: 120, hz: 1.3, amplitude: 1.4, ruido: 0.25 });
  assert.ok(Math.abs(c.passos - reais) / reais < 0.05, `contou ${c.passos} de ${reais}`);
});

test('chacoalhar o celular não vira passo', () => {
  const c = criarContadorPassos();
  const rnd = aleatorio(3);
  for (let i = 0; i < 60 * 50; i += 1) {
    const t = i * 20;
    const z = G + 9 * Math.sin((t / 1000) * 7 * 2 * Math.PI) + (rnd() - 0.5) * 2;
    c.amostra(rnd() * 4, rnd() * 4, z, t);
  }
  assert.ok(c.passos < 5, `chacoalhada virou ${c.passos} passos`);
});

test('batidas soltas (celular na mesa, sentar) não viram passos', () => {
  const c = criarContadorPassos();
  const rnd = aleatorio(9);
  for (let i = 0; i < 300 * 50; i += 1) {
    const t = i * 20;
    // Uma batida a cada ~7 s, sem ritmo.
    const batida = i % 347 === 0 ? 6 : 0;
    c.amostra(0, 0, G + batida + (rnd() - 0.5) * 0.2, t);
  }
  assert.equal(c.passos, 0);
});

test('celular parado em cima da mesa: zero passos', () => {
  const c = criarContadorPassos();
  const rnd = aleatorio(11);
  for (let i = 0; i < 120 * 50; i += 1) c.amostra(0, 0, G + (rnd() - 0.5) * 0.15, i * 20);
  assert.equal(c.passos, 0);
});

test('cadência em passos por minuto', () => {
  const c = criarContadorPassos();
  caminhar(c, { segundos: 60, hz: 1.8 });
  const cad = c.cadencia(60000);
  assert.ok(cad > 100 && cad < 116, `cadência ${cad}`);
});

// GPS: anda em linha reta para o norte, com erro aleatório de alguns metros.
const LAT0 = -23.55;
const LON0 = -46.63;
const METRO_LAT = 1 / 111320;

function andarGPS(r, { segundos, velocidade = 1.4, erro = 4, precisao = 8, semente = 5, inicio = 0 }) {
  const rnd = aleatorio(semente);
  for (let s = 0; s <= segundos; s += 1) {
    const norte = velocidade * s + (rnd() - 0.5) * 2 * erro;
    const leste = (rnd() - 0.5) * 2 * erro;
    r.adicionar({ lat: LAT0 + norte * METRO_LAT, lon: LON0 + (leste * METRO_LAT) / Math.cos((LAT0 * Math.PI) / 180), precisao, t: inicio + s * 1000 });
  }
  return velocidade * segundos;
}

test('distância do GPS fica perto do real (erro < 6%)', () => {
  const r = criarRastreador();
  const real = andarGPS(r, { segundos: 600 });
  const erro = Math.abs(r.metros - real) / real;
  assert.ok(erro < 0.06, `mediu ${r.metros.toFixed(0)} m de ${real} m`);
  const kmh = r.velocidade(600000);
  assert.ok(kmh > 4.2 && kmh < 5.9, `velocidade ${kmh.toFixed(2)} km/h`);
});

test('caminhada lenta (3 km/h) também é medida', () => {
  const r = criarRastreador();
  const real = andarGPS(r, { segundos: 600, velocidade: 0.83, erro: 4, precisao: 8, semente: 8 });
  const erro = Math.abs(r.metros - real) / real;
  assert.ok(erro < 0.08, `mediu ${r.metros.toFixed(0)} m de ${real.toFixed(0)} m`);
});

test('parado com GPS tremendo: quase nada de distância', () => {
  const r = criarRastreador();
  andarGPS(r, { segundos: 600, velocidade: 0, erro: 6, precisao: 10 });
  assert.ok(r.metros < 25, `parado acumulou ${r.metros.toFixed(1)} m`);
});

test('leituras imprecisas e saltos impossíveis são descartados', () => {
  const r = criarRastreador();
  r.adicionar({ lat: LAT0, lon: LON0, precisao: 8, t: 0 });
  r.adicionar({ lat: LAT0 + 50 * METRO_LAT, lon: LON0, precisao: 60, t: 10000 }); // ruim
  r.adicionar({ lat: LAT0 + 400 * METRO_LAT, lon: LON0, precisao: 8, t: 12000 }); // 400 m em 12 s
  assert.equal(r.metros, 0);
  assert.equal(r.resumo.descartados, 2);
  // Anda 20 m em 15 s (uma leitura por segundo) e para: a distância chega perto
  // de 20 m. A média das leituras pode atrasar alguns metros, nunca adianta.
  for (let s = 13; s <= 28; s += 1) r.adicionar({ lat: LAT0 + 1.33 * (s - 13) * METRO_LAT, lon: LON0, precisao: 8, t: s * 1000 });
  for (let s = 29; s <= 40; s += 1) r.adicionar({ lat: LAT0 + 20 * METRO_LAT, lon: LON0, precisao: 8, t: s * 1000 });
  assert.ok(r.metros > 13 && r.metros <= 20.5, `mediu ${r.metros}`);
});

test('com o contador de passos parado, o GPS não soma distância', () => {
  const r = criarRastreador();
  const rnd = aleatorio(2);
  for (let s = 0; s < 120; s += 1) {
    // Deslocando 1,4 m/s, mas o sensor diz que a pessoa não está andando (ex.: dentro de um carro devagar).
    r.adicionar({ lat: LAT0 + (1.4 * s + rnd()) * METRO_LAT, lon: LON0, precisao: 6, t: s * 1000 }, { andando: false });
  }
  assert.equal(r.metros, 0);
});

test('trecho durante a pausa não conta', () => {
  const r = criarRastreador();
  r.adicionar({ lat: LAT0, lon: LON0, precisao: 5, t: 0 });
  r.adicionar({ lat: LAT0 + 20 * METRO_LAT, lon: LON0, precisao: 5, t: 15000 });
  r.pausar();
  r.adicionar({ lat: LAT0 + 300 * METRO_LAT, lon: LON0, precisao: 5, t: 300000 }); // foi de carro?
  r.adicionar({ lat: LAT0 + 310 * METRO_LAT, lon: LON0, precisao: 5, t: 308000 });
  // Os 280 m entre a pausa e a volta não entram; só os trechos andados.
  assert.ok(r.metros > 5 && r.metros < 31, `mediu ${r.metros}`);
});

test('fórmulas: haversine, ritmo e qualidade do sinal', () => {
  const d = distanciaMetros({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  assert.ok(Math.abs(d - 111195) < 50);
  assert.equal(formatarRitmo(ritmoMinKm(1000, 600)), '10:00');
  assert.equal(formatarRitmo(ritmoMinKm(2000, 1500)), '12:30');
  assert.equal(ritmoMinKm(20, 60), null);
  assert.equal(qualidadeSinal(5).nivel, 'otimo');
  assert.equal(qualidadeSinal(40).nivel, 'ruim');
});
