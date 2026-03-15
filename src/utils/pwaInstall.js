let isInitialized = false;
let deferredPrompt = null;
const listeners = new Set();

function getNavigator() {
  if (typeof window === 'undefined') return null;
  return window.navigator || null;
}

export function isIOSDevice() {
  const nav = getNavigator();
  if (!nav) return false;

  const ua = nav.userAgent || '';
  const platform = nav.platform || '';
  const touchPoints = Number(nav.maxTouchPoints || 0);

  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

export function isAndroidDevice() {
  const nav = getNavigator();
  if (!nav) return false;
  return /Android/i.test(nav.userAgent || '');
}

export function isSafariBrowser() {
  const nav = getNavigator();
  if (!nav) return false;

  const ua = nav.userAgent || '';
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
}

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false;

  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;

  const iosStandalone =
    window.navigator && window.navigator.standalone === true;

  const twaReferrer =
    typeof document !== 'undefined' &&
    typeof document.referrer === 'string' &&
    document.referrer.indexOf('android-app://') === 0;

  return Boolean(mediaStandalone || iosStandalone || twaReferrer);
}

function getState() {
  return {
    canPrompt: Boolean(deferredPrompt),
    isInstalled: isStandaloneMode(),
    isIOS: isIOSDevice(),
    isAndroid: isAndroidDevice(),
    isSafari: isSafariBrowser(),
  };
}

function emit() {
  const next = getState();
  listeners.forEach((listener) => {
    try {
      listener(next);
    } catch (_) {}
  });
}

function onBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredPrompt = event;
  emit();
}

function onAppInstalled() {
  deferredPrompt = null;
  emit();
}

export function initPwaInstallTracking() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);

  if (typeof window.matchMedia === 'function') {
    const media = window.matchMedia('(display-mode: standalone)');
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', emit);
    } else if (typeof media.addListener === 'function') {
      media.addListener(emit);
    }
  }

  setTimeout(() => {
    emit();
  }, 0);
}

export function subscribeToPwaInstall(listener) {
  initPwaInstallTracking();
  listeners.add(listener);
  listener(getState());

  return () => {
    listeners.delete(listener);
  };
}

export async function promptPwaInstall() {
  if (!deferredPrompt) {
    return { outcome: 'unavailable' };
  }

  const installEvent = deferredPrompt;
  deferredPrompt = null;
  emit();

  try {
    const result = await installEvent.prompt();
    emit();
    return result || { outcome: 'unknown' };
  } catch (error) {
    emit();
    throw error;
  }
}
