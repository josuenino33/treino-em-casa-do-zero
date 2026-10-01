// Pausas ativas: para quem passa o dia sentado. Funções puras de contagem e de
// quando lembrar.

import { addDias, hojeISO } from '../core/datas.js';

export const ROTINA_PAUSA = [
  { nome: 'Levante e marche no lugar', detalhe: 'Joelhos na altura confortável, braços balançando.', segundos: 30, anim: { tipo: 'marcha' } },
  { nome: 'Sentar e levantar da cadeira', detalhe: 'Devagar, quantas vezes for confortável. Pode usar as mãos.', segundos: 30, anim: { tipo: 'sentar', maos: 'joelhos' } },
  { nome: 'Flexão na parede, bem leve', detalhe: 'Pés perto da parede. Pare antes de cansar.', segundos: 30, anim: { tipo: 'flexao', parede: true } },
  { nome: 'Braços para cima e respire', detalhe: 'Suba os braços puxando o ar, desça soltando. Gire os ombros.', segundos: 30, anim: { tipo: 'alongar' } },
];

export function pausasDoDia(estado, iso = hojeISO()) {
  return Number(estado.pausas?.[iso]) || 0;
}

export function totalPausas(estado) {
  return Object.values(estado.pausas || {}).reduce((a, n) => a + (Number(n) || 0), 0);
}

export function diasComMetaDePausa(estado, hoje = hojeISO(), dias = 7) {
  const meta = estado.config.pausas?.meta || 4;
  let n = 0;
  for (let i = 0; i < dias; i += 1) if (pausasDoDia(estado, addDias(hoje, -i)) >= meta) n += 1;
  return n;
}

// Lembrete só entre 7h e 21h, e só se já passou o intervalo desde a última
// pausa (ou desde que o app abriu).
export function hora(ms) {
  const d = new Date(ms);
  return d.getHours() + d.getMinutes() / 60;
}

export function deveLembrar({ agora, referencia, intervaloMin, ativo }) {
  if (!ativo || !referencia) return false;
  const h = hora(agora);
  if (h < 7 || h >= 21) return false;
  return agora - referencia >= intervaloMin * 60000;
}
