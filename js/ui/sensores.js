// Acesso aos sensores do aparelho: acelerômetro (passos) e GPS (distância).
// Os dados ficam só no aparelho; nada é enviado para servidor nenhum.

export function temGPS() {
  return 'geolocation' in navigator;
}

export function temSensorMovimento() {
  return 'DeviceMotionEvent' in window;
}

// No iPhone (iOS 13+), o acesso ao movimento precisa de permissão, pedida
// dentro de um toque do usuário.
export async function pedirPermissaoMovimento() {
  try {
    if (typeof window.DeviceMotionEvent?.requestPermission === 'function') {
      return (await window.DeviceMotionEvent.requestPermission()) === 'granted';
    }
    return temSensorMovimento();
  } catch {
    return false;
  }
}

// Chama aoAmostrar(x, y, z, tempoMs) ~50 vezes por segundo. Devolve a função
// para parar. 'aoSemSensor' é chamado se nada chegar em 3 segundos.
export function ouvirMovimento(aoAmostrar, aoSemSensor) {
  let recebeu = false;
  const fn = (ev) => {
    const a = ev.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    recebeu = true;
    aoAmostrar(a.x, a.y, a.z, performance.now());
  };
  window.addEventListener('devicemotion', fn);
  const espera = setTimeout(() => {
    if (!recebeu) aoSemSensor?.();
  }, 3000);
  return () => {
    clearTimeout(espera);
    window.removeEventListener('devicemotion', fn);
  };
}

export const ERROS_GPS = {
  1: 'Permissão de localização negada. Libere nas configurações do navegador para medir a distância.',
  2: 'Não foi possível obter a localização. Ao ar livre o sinal costuma melhorar.',
  3: 'O GPS demorou para responder. Continuando a tentar…',
};

export function ouvirGPS(aoPosicao, aoErro) {
  if (!temGPS()) {
    aoErro?.({ code: 2, message: 'Sem GPS' });
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => aoPosicao({ lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy, t: p.timestamp || Date.now() }),
    (e) => aoErro?.(e),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
