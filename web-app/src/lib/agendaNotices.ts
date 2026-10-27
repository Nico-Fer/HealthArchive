import { formatTime } from '../Functions/appointments';

/**
 * Estado de la campanita, compartido entre pestañas por localStorage: qué turnos ya se
 * avisaron (para no avisar dos veces si hay varias pestañas abiertas), los avisos del día y
 * hasta cuándo se vieron. Vive en una sola clave que se reinicia sola al cambiar el día.
 */
const KEY = 'ha-agenda';

/** Minutos antes del turno en que sale el aviso en la app. */
export const NOTICE_LEAD_MINUTES = 10;

export interface AgendaNotice {
  appointmentId: string;
  text: string;
  /** Epoch ms del momento en que se generó el aviso. */
  at: number;
}

interface AgendaStore {
  date: string;
  notified: string[];
  notices: AgendaNotice[];
  /** Epoch ms de la última vez que se abrió la campanita hoy; null si todavía no. */
  seenAt: number | null;
}

export const localDateKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const empty = (): AgendaStore => ({ date: localDateKey(), notified: [], notices: [], seenAt: null });

// Con try/catch: en modo privado o con el storage lleno, la campanita tiene que seguir
// funcionando (sin compartir entre pestañas), no romper el navbar.
export const readAgenda = (): AgendaStore => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AgendaStore | null;
    return stored && stored.date === localDateKey() ? stored : empty();
  } catch {
    return empty();
  }
};

const write = (store: AgendaStore) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Sin storage no hay deduplicación entre pestañas; no es grave.
  }
};

/** Registra el aviso de un turno. Devuelve false si otra pestaña ya lo había avisado. */
export const claimNotice = (appointmentId: string, name: string, startsAt: Date): AgendaNotice | null => {
  const store = readAgenda();
  if (store.notified.includes(appointmentId)) return null;

  const minutes = Math.max(1, Math.round((startsAt.getTime() - Date.now()) / 60_000));
  const notice: AgendaNotice = {
    appointmentId,
    text: `En ${minutes} min: ${name} (${formatTime(startsAt)})`,
    at: Date.now(),
  };
  write({ ...store, notified: [...store.notified, appointmentId], notices: [notice, ...store.notices] });
  return notice;
};

export const markAgendaSeen = () => write({ ...readAgenda(), seenAt: Date.now() });

/** El resumen del día cuenta como no visto hasta abrir la campanita, más los avisos nuevos. */
export const unseenCount = (store: AgendaStore, hasAppointments: boolean): number => {
  const summary = hasAppointments && store.seenAt === null ? 1 : 0;
  const notices = store.notices.filter((n) => store.seenAt === null || n.at > store.seenAt).length;
  return summary + notices;
};

export const AGENDA_STORAGE_KEY = KEY;
