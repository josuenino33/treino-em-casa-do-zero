// Contador de passos a partir do acelerômetro do celular.
//
// Como funciona (e por que não "infla" a contagem):
// 1. Tira a gravidade do sinal com uma média lenta e suaviza o resto.
// 2. Cada pico acima de um limite (que se adapta à força do seu passo) e
//    seguido de vale é um passo candidato.
// 3. Picos fortes demais (chacoalhar) ou rápidos demais (mais de ~3,6 passos
//    por segundo) são descartados.
// 4. Um passo só é contado depois de um ritmo regular de pelo menos 6 passos
//    seguidos. Batidas soltas, como pôr o celular na mesa, nunca viram passos.
// 5. Agitação rápida (mais de 9 oscilações por segundo, típico de chacoalhar)
//    zera o ritmo e bloqueia a contagem até o sinal acalmar.
//
// Funções puras: recebem amostras (x, y, z em m/s², tempo em ms) e devolvem números.

export const PARAMETROS = {
  alfaGravidade: 0.02, // média lenta (~1 s) que estima a gravidade
  alfaSuave: 0.35, // filtro rápido contra tremidas
  limiarMin: 0.7, // m/s²: pico mínimo para ser passo
  limiarRelativo: 0.45, // fração da média dos últimos picos
  picoMax: 14, // m/s²: acima disso é chacoalhada, não passo
  intervaloMin: 280, // ms entre passos (≈ 214 passos/min)
  intervaloMax: 2000, // ms: pausa maior que isso quebra o ritmo
  confirmar: 6, // passos seguidos para começar a contar
  tolerancia: 0.45, // variação aceita entre um passo e o ritmo médio
  histerese: 0.5, // m/s²: o sinal precisa passar de +h a -h para contar oscilação
  oscilacoesMax: 9, // por segundo; caminhar dá ~4, correr ~6
};

export function criarContadorPassos(opcoes = {}) {
  const P = { ...PARAMETROS, ...opcoes };
  let gravidade = null;
  let suave = 0;
  let subindo = false;
  let picoValor = 0;
  let picoTempo = 0;
  let armado = true;
  let ultimoPasso = null;
  const picosRecentes = [];
  let pendentes = []; // tempos de passos ainda não confirmados
  let emRitmo = false;
  const intervalos = [];
  let total = 0;
  let descartados = 0;
  const tempos = []; // passos contados nos últimos segundos (cadência)
  let ladoBruto = 0; // -1 abaixo de -h, +1 acima de +h
  const oscilacoes = []; // tempos das trocas de lado
  let agitadoAte = 0;

  const media = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const mediana = (xs) => {
    const o = [...xs].sort((a, b) => a - b);
    return o.length ? o[Math.floor(o.length / 2)] : 0;
  };

  function quebrarRitmo() {
    if (!emRitmo) descartados += pendentes.length;
    pendentes = [];
    emRitmo = false;
    intervalos.length = 0;
  }

  function registrarPasso(t) {
    if (ultimoPasso != null) {
      const dt = t - ultimoPasso;
      if (dt < P.intervaloMin) {
        descartados += 1;
        return;
      }
      if (dt > P.intervaloMax) quebrarRitmo();
      else {
        const ritmo = mediana(intervalos);
        if (intervalos.length >= 2 && Math.abs(dt - ritmo) > ritmo * P.tolerancia) {
          // Fora do ritmo: recomeça a confirmação a partir deste passo.
          quebrarRitmo();
        } else {
          intervalos.push(dt);
          if (intervalos.length > 8) intervalos.shift();
        }
      }
    }
    ultimoPasso = t;
    if (emRitmo) {
      contar(t);
      return;
    }
    pendentes.push(t);
    if (pendentes.length >= P.confirmar) {
      emRitmo = true;
      for (const tp of pendentes) contar(tp);
      pendentes = [];
    }
  }

  function contar(t) {
    total += 1;
    tempos.push(t);
    while (tempos.length && t - tempos[0] > 15000) tempos.shift();
  }

  return {
    amostra(x, y, z, t) {
      const m = Math.hypot(x, y, z);
      if (!Number.isFinite(m)) return;
      if (gravidade == null) gravidade = m;
      gravidade += P.alfaGravidade * (m - gravidade);
      const d = m - gravidade;
      const anterior = suave;
      suave += P.alfaSuave * (d - suave);

      // Detector de agitação: conta trocas de lado do sinal bruto no último segundo.
      const lado = d > P.histerese ? 1 : d < -P.histerese ? -1 : 0;
      if (lado && lado !== ladoBruto) {
        if (ladoBruto) oscilacoes.push(t);
        ladoBruto = lado;
      }
      while (oscilacoes.length && t - oscilacoes[0] > 1000) oscilacoes.shift();
      if (oscilacoes.length > P.oscilacoesMax) {
        if (t >= agitadoAte) quebrarRitmo();
        agitadoAte = t + 1500;
        ultimoPasso = null;
      }
      if (t < agitadoAte) {
        subindo = false;
        armado = suave < 0.3 * P.limiarMin;
        return;
      }

      const limiar = Math.max(P.limiarMin, P.limiarRelativo * (media(picosRecentes) || P.limiarMin));
      if (suave > anterior) {
        subindo = true;
      } else if (subindo) {
        // Acabou de passar por um pico local.
        subindo = false;
        if (armado && anterior > limiar) {
          picoValor = anterior;
          picoTempo = t;
          armado = false;
          if (picoValor > P.picoMax) {
            descartados += 1;
          } else {
            picosRecentes.push(picoValor);
            if (picosRecentes.length > 6) picosRecentes.shift();
            registrarPasso(picoTempo);
          }
        }
      }
      // Precisa voltar para perto de zero (vale) antes de aceitar outro pico.
      if (suave < limiar * 0.3) armado = true;
    },
    // Passos confirmados até agora.
    get passos() {
      return total;
    },
    get descartados() {
      return descartados;
    },
    // Passos por minuto nos últimos ~15 s.
    cadencia(agora) {
      const recentes = tempos.filter((tp) => agora - tp <= 15000);
      if (recentes.length < 4) return 0;
      const janela = Math.max(1, (agora - recentes[0]) / 1000);
      return Math.round((recentes.length / janela) * 60);
    },
    // Ao pausar a caminhada: descarta o que não foi confirmado.
    pausar() {
      quebrarRitmo();
      ultimoPasso = null;
      gravidade = null;
      suave = 0;
    },
  };
}
