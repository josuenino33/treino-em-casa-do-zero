import { estadoPadrao } from '../js/core/esquema.js';

let contador = 0;

export function estadoBase(ajustes = {}) {
  const e = estadoPadrao();
  e.onboardingFeito = true;
  e.perfil = { ...e.perfil, nome: 'Teste', inicio: '2026-09-07', pesoInicial: 110, pesoMeta: 80, alturaCm: 178, anoNascimento: 2002 };
  return Object.assign(e, ajustes);
}

// Registra um treino com um único exercício.
export function addTreino(estado, data, trilha, nivel, series, extra = {}) {
  contador += 1;
  const hora = String(10 + (contador % 10)).padStart(2, '0');
  estado.treinos.push({
    id: `t${contador}`,
    data,
    inicio: `${data}T${hora}:00:00.000Z`,
    fim: `${data}T${hora}:40:00.000Z`,
    modo: 'completo',
    exercicios: [{ trilha, nivel, series, esforco: 'medida', dor: false, pulado: false, ...extra }],
  });
  return estado;
}
