// Datas sempre como texto 'AAAA-MM-DD' no fuso local. Contas de dias usam UTC
// para não sofrer com horário de verão.

export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const dois = (n) => String(n).padStart(2, '0');

export function hojeISO(d = new Date()) {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

export function partes(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return { a, m, d };
}

function utc(iso) {
  const { a, m, d } = partes(iso);
  return Date.UTC(a, m - 1, d);
}

export function deUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${dois(d.getUTCMonth() + 1)}-${dois(d.getUTCDate())}`;
}

export function addDias(iso, n) {
  return deUTC(utc(iso) + n * 86400000);
}

// Dias de 'a' até 'b' (positivo se b é depois de a).
export function diffDias(a, b) {
  return Math.round((utc(b) - utc(a)) / 86400000);
}

// 0 = domingo ... 6 = sábado
export function diaSemana(iso) {
  return new Date(utc(iso)).getUTCDay();
}

// Semanas começam na segunda-feira.
export function inicioSemana(iso) {
  const dia = diaSemana(iso);
  const recuo = dia === 0 ? 6 : dia - 1;
  return addDias(iso, -recuo);
}

export function diasDaSemana(iso) {
  const ini = inicioSemana(iso);
  return Array.from({ length: 7 }, (_, i) => addDias(ini, i));
}

export function ehISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function formatarData(iso, { ano = false, diaSemana: comDia = false } = {}) {
  if (!ehISO(iso)) return '';
  const { a, m, d } = partes(iso);
  let txt = `${d} ${MESES[m - 1]}`;
  if (ano) txt += ` ${a}`;
  if (comDia) txt = `${NOMES_DIAS[diaSemana(iso)]}, ${txt}`;
  return txt;
}

export function formatarMes(iso) {
  const { a, m } = partes(iso);
  return `${MESES_LONGOS[m - 1]} de ${a}`;
}

export function mesCurto(iso) {
  return MESES[partes(iso).m - 1];
}

export function idadeEm(nascimentoISO, hoje = hojeISO()) {
  if (!ehISO(nascimentoISO)) return null;
  const n = partes(nascimentoISO);
  const h = partes(hoje);
  let idade = h.a - n.a;
  if (h.m < n.m || (h.m === n.m && h.d < n.d)) idade -= 1;
  return idade;
}

export function duracaoMin(ms) {
  return Math.max(0, Math.round(ms / 60000));
}

export function relogio(segundos) {
  const s = Math.max(0, Math.round(segundos));
  const m = Math.floor(s / 60);
  return `${m}:${dois(s % 60)}`;
}
