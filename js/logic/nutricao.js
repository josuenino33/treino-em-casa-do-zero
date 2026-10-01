// Estimativas de calorias, proteína e água. São pontos de partida, não
// prescrição: ajuste pelo que a balança e a cintura mostram ao longo das semanas.

export const NIVEIS_ATIVIDADE = [
  { fator: 1.2, nome: 'Baixa', descricao: 'Pouco movimento além do treino' },
  { fator: 1.375, nome: 'Leve', descricao: 'Treino 3× por semana e caminhadas' },
  { fator: 1.55, nome: 'Moderada', descricao: 'Trabalho em pé ou atividade quase todo dia' },
  { fator: 1.725, nome: 'Alta', descricao: 'Trabalho físico pesado ou treino intenso diário' },
];

// Arredonda para o múltiplo de 'passo' sem deixar lixo de ponto flutuante (3.9000000004).
const arred = (v, passo = 1) => Number((Math.round(v / passo) * passo).toFixed(passo < 1 ? 1 : 0));

// Mifflin-St Jeor. Sem sexo informado, usa a média das duas constantes.
export function taxaBasal({ peso, alturaCm, idade, sexo }) {
  if (!(peso > 0 && alturaCm > 0 && idade > 0)) return null;
  const constante = sexo === 'm' ? 5 : sexo === 'f' ? -161 : -78;
  return 10 * peso + 6.25 * alturaCm - 5 * idade + constante;
}

export function metaCalorias(dados) {
  const basal = taxaBasal(dados);
  if (!basal) return null;
  const manutencao = basal * (dados.fator || 1.375);
  const deficit = Math.min(500, manutencao * 0.25);
  const piso = Math.max(basal, 1200);
  const meta = Math.max(manutencao - deficit, piso);
  return {
    basal: arred(basal, 10),
    manutencao: arred(manutencao, 10),
    meta: arred(meta, 10),
    deficit: arred(manutencao - meta, 10),
  };
}

// 1,6 a 2,0 g por kg do peso-meta (para quem tem muito peso a perder, o peso
// atual superestima a necessidade).
export function metaProteina({ peso, pesoMeta }) {
  const referencia = pesoMeta > 0 ? Math.min(pesoMeta, peso || pesoMeta) : peso;
  if (!(referencia > 0)) return null;
  return { min: arred(referencia * 1.6, 5), max: arred(referencia * 2.0, 5), porRefeicao: arred((referencia * 1.6) / 4, 5) };
}

export function metaAgua(peso) {
  if (!(peso > 0)) return null;
  return Math.min(arred(peso * 0.035, 0.1), 4);
}

export function imc(peso, alturaCm) {
  if (!(peso > 0 && alturaCm > 0)) return null;
  const m = alturaCm / 100;
  return peso / (m * m);
}

export function classeImc(valor) {
  if (valor == null) return null;
  if (valor < 18.5) return 'Abaixo do peso';
  if (valor < 25) return 'Peso adequado';
  if (valor < 30) return 'Sobrepeso';
  if (valor < 35) return 'Obesidade grau 1';
  if (valor < 40) return 'Obesidade grau 2';
  return 'Obesidade grau 3';
}

// Faixa de peso com IMC entre 18,5 e 24,9.
export function faixaPesoSaudavel(alturaCm) {
  if (!(alturaCm > 0)) return null;
  const m2 = (alturaCm / 100) ** 2;
  return { min: arred(18.5 * m2), max: arred(24.9 * m2) };
}

// Ritmo saudável: 0,5% a 1% do peso por semana.
export function ritmoSaudavel(peso) {
  if (!(peso > 0)) return null;
  return { min: arred(peso * 0.005, 0.1), max: arred(peso * 0.01, 0.1) };
}

// Avalia a tendência (kg/semana, negativo = perdendo).
export function avaliarRitmo(kgSemana, peso) {
  if (kgSemana == null || !(peso > 0)) return null;
  const perda = -kgSemana;
  const faixa = ritmoSaudavel(peso);
  if (perda > faixa.max * 1.25) return { tipo: 'rapido', texto: 'Perda rápida demais: aumenta a chance de perder músculo e de sobrar pele. Coma um pouco mais.' };
  if (perda >= faixa.min * 0.8) return { tipo: 'bom', texto: 'Ritmo saudável. Continue assim.' };
  if (perda > 0) return { tipo: 'lento', texto: 'Perdendo devagar. Revise bebidas com açúcar, beliscos e porções.' };
  return { tipo: 'parado', texto: 'Peso estável ou subindo. Se a cintura também não muda há 3 semanas, ajuste a alimentação.' };
}

// Semanas estimadas até a meta, no meio da faixa saudável.
export function semanasAteMeta(pesoAtual, pesoMeta) {
  if (!(pesoAtual > 0 && pesoMeta > 0) || pesoMeta >= pesoAtual) return 0;
  let peso = pesoAtual;
  let semanas = 0;
  while (peso > pesoMeta && semanas < 520) {
    peso -= peso * 0.0075;
    semanas += 1;
  }
  return semanas;
}
