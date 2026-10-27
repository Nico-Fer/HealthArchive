import { Appointment, AppointmentStatus, ReminderState } from '../Types/Appointment';
import { parseApiTimestamp } from './DateUtils';

/**
 * Evento de ventana que avisa que la agenda cambió (alta, cancelación, asistencia…).
 * Lo escuchan la campanita y los avisos de turnos para recargar sin esperar al próximo poll.
 */
export const APPOINTMENTS_CHANGED_EVENT = 'ha-appointments-changed';

export const notifyAppointmentsChanged = () => {
  window.dispatchEvent(new Event(APPOINTMENTS_CHANGED_EVENT));
};

// Las fechas del API vienen en UTC sin la Z: siempre por parseApiTimestamp.
export const appointmentFromApi = (raw: any): Appointment => ({
  ...raw,
  startsAt: parseApiTimestamp(raw.startsAt),
  reminder: {
    state: raw.reminder?.state ?? 'none',
    sentAt: raw.reminder?.sentAt ? parseApiTimestamp(raw.reminder.sentAt) : null,
  },
});

/** Medianoche local a medianoche local, en ISO (UTC) para el API. */
export const dayRange = (day: Date): { from: string; to: string } => {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
};

/** Día del calendario + "HH:mm", en hora local. */
export const combineDateTime = (day: Date, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
};

export const formatTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  Pendiente: 'Pendiente',
  Atendido: 'Atendido',
  Ausente: 'Ausente',
  Cancelado: 'Cancelado',
};

export const REMINDER_LABELS: Record<ReminderState, string> = {
  sent: 'Recordatorio enviado por WhatsApp',
  failed: 'No se pudo enviar el recordatorio por WhatsApp',
  scheduled: 'Se le enviará un recordatorio por WhatsApp 24 h antes',
  no_phone: 'Sin celular: no recibe recordatorio',
  invalid_phone: 'El celular no tiene un formato válido para WhatsApp',
  no_consent: 'No aceptó recordatorios por WhatsApp',
  disabled: 'Los recordatorios por WhatsApp no están activos',
  none: '',
};
