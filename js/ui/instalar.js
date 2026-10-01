// Guarda o convite de instalação do navegador (Android/desktop) para usar
// num botão "Instalar". No iPhone, a instalação é pelo menu Compartilhar.

let convite = null;

export function escutarInstalacao() {
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    convite = ev;
  });
  window.addEventListener('appinstalled', () => {
    convite = null;
  });
}

export function podeInstalar() {
  return Boolean(convite);
}

export async function instalar() {
  if (!convite) return false;
  convite.prompt();
  const { outcome } = await convite.userChoice;
  convite = null;
  return outcome === 'accepted';
}

export function jaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
