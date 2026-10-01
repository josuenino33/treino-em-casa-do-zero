// Distância e velocidade pelo GPS, com filtros contra "pulos" do sinal.
//
// Regras (para não inflar a distância):
// - Leituras com precisão pior que 25 m são ignoradas.
// - Saltos impossíveis a pé (mais de 18 km/h) são descartados.
// - A posição usada é a média das últimas 8 leituras (pesada pela precisão),
//   o que corta o "zigue-zague" do sinal.
// - Parado, o GPS "treme": só conta deslocamento de pelo menos 5 m e numa
//   velocidade de caminhada (acima de 1,6 km/h). Mais devagar que isso é deriva.
// - Se o contador de passos diz que você está parado, a distância não sobe.
// - Ao pausar, o próximo ponto vira um novo começo (o trecho da pausa não conta).

const RAIO_TERRA = 6371000;
const rad = (g) => (g * Math.PI) / 180;

export function distanciaMetros(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const LIMITES = {
  precisaoMax: 25, // m
  movimentoMin: 5, // m
  fatorPrecisao: 0.6, // fração da incerteza que precisa ser vencida
  velocidadeMax: 5, // m/s (18 km/h)
  velocidadeMin: 0.45, // m/s (1,6 km/h): abaixo disso é deriva do GPS
  janela: 8, // leituras na média
  janelaVelocidade: 30000, // ms
  maxPontosRota: 400,
};

export function qualidadeSinal(precisao) {
  if (precisao == null) return { nivel: 'sem', texto: 'Sem sinal' };
  if (precisao <= 10) return { nivel: 'otimo', texto: 'Ótimo' };
  if (precisao <= 18) return { nivel: 'bom', texto: 'Bom' };
  if (precisao <= LIMITES.precisaoMax) return { nivel: 'fraco', texto: 'Fraco' };
  return { nivel: 'ruim', texto: 'Ruim (ignorado)' };
}

export function criarRastreador(opcoes = {}) {
  const L = { ...LIMITES, ...opcoes };
  let ancora = null;
  let ultimoBruto = null;
  let janela = [];
  let historico = []; // médias dos últimos segundos, para medir a velocidade real
  let distancia = 0;
  let aceitos = 0;
  let descartados = 0;
  let somaPrecisao = 0;
  let ultimaPrecisao = null;
  const trechos = []; // { t, d } para a velocidade recente
  let rota = [];

  function guardarRota(p) {
    rota.push([Number(p.lat.toFixed(6)), Number(p.lon.toFixed(6))]);
    if (rota.length > L.maxPontosRota) rota = rota.filter((_, i) => i % 2 === 0);
  }

  return {
    // 'andando' vem do contador de passos (null quando não há sensor).
    adicionar(p, { andando = null } = {}) {
      ultimaPrecisao = p.precisao;
      if (!(p.precisao <= L.precisaoMax)) {
        descartados += 1;
        return false;
      }
      if (ultimoBruto) {
        const dtBruto = (p.t - ultimoBruto.t) / 1000;
        if (dtBruto <= 0) return false;
        // Salto impossível: mesmo descontando a incerteza das duas leituras,
        // o deslocamento exigiria mais de 18 km/h.
        const folga = p.precisao + ultimoBruto.precisao;
        if (distanciaMetros(ultimoBruto, p) - folga > L.velocidadeMax * dtBruto) {
          descartados += 1;
          return false;
        }
      }
      ultimoBruto = p;
      somaPrecisao += p.precisao;
      aceitos += 1;
      janela.push(p);
      if (janela.length > L.janela) janela.shift();

      // Média ponderada pela precisão (leitura mais precisa pesa mais).
      let pesos = 0;
      let lat = 0;
      let lon = 0;
      for (const q of janela) {
        const w = 1 / (q.precisao * q.precisao);
        pesos += w;
        lat += q.lat * w;
        lon += q.lon * w;
      }
      // O tempo da média é o tempo médio das leituras: assim a velocidade entre
      // médias continua certa mesmo quando a média "atrasa" em relação ao último ponto.
      const tMedio = janela.reduce((a, q) => a + q.t, 0) / janela.length;
      const media = { lat: lat / pesos, lon: lon / pesos, t: tMedio, precisao: Math.sqrt(1 / pesos) };

      historico.push(media);
      while (historico.length && media.t - historico[0].t > 10000) historico.shift();

      if (!ancora) {
        ancora = media;
        guardarRota(media);
        return true;
      }
      const d = distanciaMetros(ancora, media);
      const minimo = Math.max(L.movimentoMin, L.fatorPrecisao * Math.max(ancora.precisao, media.precisao));
      if (d < minimo) return false;
      // Velocidade da posição média nos últimos ~10 s: deriva do GPS é lenta.
      const ref = historico[0];
      const dtRef = (media.t - ref.t) / 1000;
      const velocidade = dtRef >= 2 ? distanciaMetros(ref, media) / dtRef : Infinity;
      if (andando === false || velocidade < L.velocidadeMin) {
        // Deriva do sinal ou parado: muda a referência sem somar distância.
        ancora = media;
        return false;
      }
      distancia += d;
      trechos.push({ t: media.t, d });
      while (trechos.length && media.t - trechos[0].t > L.janelaVelocidade) trechos.shift();
      ancora = media;
      guardarRota(media);
      return true;
    },
    // Depois de uma pausa: recomeça do próximo ponto.
    pausar() {
      ancora = null;
      ultimoBruto = null;
      janela = [];
      historico = [];
      trechos.length = 0;
    },
    get metros() {
      return distancia;
    },
    // km/h nos últimos 30 s.
    velocidade(agora) {
      const recentes = trechos.filter((x) => agora - x.t <= L.janelaVelocidade);
      if (recentes.length < 2) return 0;
      const metros = recentes.reduce((a, x) => a + x.d, 0);
      const segundos = Math.max(5, (agora - recentes[0].t) / 1000);
      return (metros / segundos) * 3.6;
    },
    get precisao() {
      return ultimaPrecisao;
    },
    get resumo() {
      return { aceitos, descartados, precisaoMedia: aceitos ? Math.round(somaPrecisao / aceitos) : null };
    },
    get rota() {
      return rota;
    },
    restaurar({ metros = 0, rota: r = [] } = {}) {
      distancia = metros;
      rota = [...r];
    },
  };
}

// Ritmo em min/km a partir de metros e segundos em movimento.
export function ritmoMinKm(metros, segundos) {
  if (!(metros > 50) || !(segundos > 0)) return null;
  return segundos / 60 / (metros / 1000);
}

export function formatarRitmo(minKm) {
  if (minKm == null || !Number.isFinite(minKm)) return '—';
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}
