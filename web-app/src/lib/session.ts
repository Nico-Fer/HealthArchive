// Ciclo de vida de la sesión del lado del navegador: cierre por inactividad y cierre al
// cerrar la última pestaña. La autoridad es el backend (el refresh token vence a los
// Session:IdleTimeoutMinutes sin /Refresh ni /KeepAlive); esto es la UX: avisar antes,
// cerrar a tiempo y que todas las pestañas se enteren.
//
// Todo el acceso a storage va con try/catch: en modo privado o con storage bloqueado
// puede tirar, y eso nunca debe romper la app (a lo sumo se pierde la coordinación).

import type { SessionEndReason } from '../Redux/States/session';

/** Tiene que coincidir con Session__IdleTimeoutMinutes del API. */
export const IDLE_TIMEOUT_MS = (Number(import.meta.env.VITE_SESSION_IDLE_MINUTES) || 120) * 60_000;

/** Cuánto antes del cierre aparece el aviso. */
export const IDLE_WARNING_MS = 2 * 60_000;

/**
 * Cada cuánto, como mucho, la actividad del usuario se informa al server con /KeepAlive.
 * El cierre se mide desde el último KeepAlive enviado, no desde el último movimiento: así
 * el reloj del front coincide con el ExpiresAt del server y "Seguir conectado" nunca
 * llega tarde. El costo es la resolución: se cierra entre 115 y 120 minutos sin actividad.
 */
export const KEEPALIVE_INTERVAL_MS = 5 * 60_000;

// ---- Último toque (localStorage: lo comparten todas las pestañas) -------------------

const TOUCHED_KEY = 'ha-session-touched-at';

export const touchSession = (): void => {
  try {
    localStorage.setItem(TOUCHED_KEY, String(Date.now()));
  } catch {
    // Sin storage cada pestaña se queda con su propio reloj en memoria (IdleWatcher).
  }
};

export const getTouchedAt = (): number | null => {
  try {
    const value = Number(localStorage.getItem(TOUCHED_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const clearSessionTouch = (): void => {
  try {
    localStorage.removeItem(TOUCHED_KEY);
  } catch {
    // Nada que limpiar.
  }
};

// ---- Flag de pestaña (sessionStorage: muere al cerrar la pestaña) --------------------

// sessionStorage sobrevive a recargar pero no a cerrar la pestaña. Si la app arranca sin
// este flag y con un perfil en localStorage, la pestaña es nueva: o hay otra pestaña con
// la sesión abierta (y se adopta) o se cerraron todas (y se cierra la sesión).
const TAB_FLAG = 'ha-tab-session';

export const markTabSession = (): void => {
  try {
    sessionStorage.setItem(TAB_FLAG, '1');
  } catch {
    // Sin sessionStorage la pestaña nunca se reconoce: al recargar se cierra la sesión.
  }
};

export const clearTabSession = (): void => {
  try {
    sessionStorage.removeItem(TAB_FLAG);
  } catch {
    // Nada que limpiar.
  }
};

export const hasTabSession = (): boolean => {
  try {
    return sessionStorage.getItem(TAB_FLAG) === '1';
  } catch {
    return false;
  }
};

// ---- Coordinación entre pestañas -----------------------------------------------------

type SessionMessage =
  | { type: 'ping'; id: string }
  | { type: 'pong'; id: string }
  | { type: 'logout'; reason: SessionEndReason | null };

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ha-session') : null;

type LogoutListener = (reason: SessionEndReason | null) => void;
const logoutListeners = new Set<LogoutListener>();
const pongWaiters = new Map<string, () => void>();

if (channel) {
  channel.onmessage = (event: MessageEvent<SessionMessage>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;

    switch (message.type) {
      case 'ping':
        // Solo contesta una pestaña que tiene la sesión abierta.
        if (hasTabSession()) channel.postMessage({ type: 'pong', id: message.id } satisfies SessionMessage);
        break;
      case 'pong':
        pongWaiters.get(message.id)?.();
        break;
      case 'logout':
        logoutListeners.forEach((listener) => listener(message.reason));
        break;
    }
  };
}

/**
 * ¿Hay otra pestaña de la app con la sesión abierta? Pregunta por BroadcastChannel y
 * espera una respuesta un rato corto. Una pestaña congelada por el navegador no contesta:
 * en ese caso se cierra la sesión y esa pestaña cae al Login en su próximo request.
 */
export const anotherTabHasSession = (timeoutMs = 400): Promise<boolean> => {
  if (!channel) return Promise.resolve(false);

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      pongWaiters.delete(id);
      resolve(false);
    }, timeoutMs);

    pongWaiters.set(id, () => {
      window.clearTimeout(timer);
      pongWaiters.delete(id);
      resolve(true);
    });

    channel.postMessage({ type: 'ping', id } satisfies SessionMessage);
  });
};

/** Avisa a las otras pestañas que la sesión se cerró (el mensaje no vuelve a esta). */
export const broadcastLogout = (reason: SessionEndReason | null): void => {
  channel?.postMessage({ type: 'logout', reason } satisfies SessionMessage);
};

export const onSessionLogout = (listener: LogoutListener): (() => void) => {
  logoutListeners.add(listener);
  return () => {
    logoutListeners.delete(listener);
  };
};
