// Bipes, vibração e tela ligada durante o treino.

import { obter } from '../core/armazem.js';

let audio = null;

// Navegadores só liberam som depois de um toque do usuário.
export function liberarSom() {
  if (audio) {
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (Ctx) audio = new Ctx();
}

function tom(freq, inicio, duracao, volume = 0.18) {
  const osc = audio.createOscillator();
  const ganho = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  ganho.gain.setValueAtTime(0.0001, audio.currentTime + inicio);
  ganho.gain.exponentialRampToValueAtTime(volume, audio.currentTime + inicio + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + inicio + duracao);
  osc.connect(ganho).connect(audio.destination);
  osc.start(audio.currentTime + inicio);
  osc.stop(audio.currentTime + inicio + duracao + 0.05);
}

export function bipe(tipo = 'curto') {
  const cfg = obter()?.config;
  if (cfg && !cfg.som) return;
  if (!audio) return;
  try {
    if (tipo === 'fim') {
      tom(660, 0, 0.18);
      tom(880, 0.22, 0.32);
    } else if (tipo === 'aviso') {
      tom(520, 0, 0.12, 0.12);
    } else {
      tom(740, 0, 0.15);
    }
  } catch {
    /* sem áudio: segue em silêncio */
  }
}

export function vibrar(padrao = [200]) {
  const cfg = obter()?.config;
  if (cfg && !cfg.vibrar) return;
  try {
    navigator.vibrate?.(padrao);
  } catch {
    /* ignora */
  }
}

let trava = null;

export async function manterTelaLigada() {
  const cfg = obter()?.config;
  if (cfg && !cfg.manterTela) return;
  try {
    if ('wakeLock' in navigator && !trava) {
      trava = await navigator.wakeLock.request('screen');
      trava.addEventListener('release', () => {
        trava = null;
      });
    }
  } catch {
    trava = null;
  }
}

export function liberarTela() {
  trava?.release().catch(() => {});
  trava = null;
}

