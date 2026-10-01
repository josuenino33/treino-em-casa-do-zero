// Gera um arquivo .ics com lembretes semanais de treino e caminhada,
// para importar no Google Agenda, Outlook ou no calendário do celular.

import { addDias, diaSemana, hojeISO } from '../core/datas.js';

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function primeiraData(dias, hoje) {
  for (let i = 0; i < 7; i += 1) {
    const iso = addDias(hoje, i);
    if (dias.includes(diaSemana(iso))) return iso;
  }
  return hoje;
}

function escapar(txt) {
  return String(txt).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function evento({ uid, dias, horario, duracaoMin, titulo, descricao, hoje, carimbo }) {
  const inicio = primeiraData(dias, hoje).replace(/-/g, '');
  const hora = horario.replace(':', '') + '00';
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${carimbo}`,
    `DTSTART:${inicio}T${hora}`,
    `DURATION:PT${duracaoMin}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${dias.map((d) => BYDAY[d]).join(',')}`,
    `SUMMARY:${escapar(titulo)}`,
    `DESCRIPTION:${escapar(descricao)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(titulo)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

export function gerarICS(config, { hoje = hojeISO(), agora = new Date() } = {}) {
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trilha//Treino//PT-BR', 'CALSCALE:GREGORIAN'];
  if (config.diasTreino.length) {
    linhas.push(...evento({
      uid: 'forca@trilha-treino',
      dias: config.diasTreino,
      horario: config.horario,
      duracaoMin: 40,
      titulo: 'Treino de força (Trilha)',
      descricao: 'Abra o app Trilha e comece o treino do dia.',
      hoje,
      carimbo,
    }));
  }
  if (config.diasCaminhada.length) {
    linhas.push(...evento({
      uid: 'caminhada@trilha-treino',
      dias: config.diasCaminhada,
      horario: config.horario,
      duracaoMin: 45,
      titulo: 'Caminhada (Trilha)',
      descricao: 'Veja no app a meta de minutos da semana.',
      hoje,
      carimbo,
    }));
  }
  linhas.push('END:VCALENDAR');
  return linhas.join('\r\n') + '\r\n';
}
