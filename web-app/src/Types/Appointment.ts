export type AppointmentStatus = 'Pendiente' | 'Atendido' | 'Ausente' | 'Cancelado';

/** Estado del WhatsApp al paciente, tal como lo calcula el API. */
export type ReminderState =
  | 'sent'
  | 'failed'
  | 'scheduled'
  | 'no_phone'
  | 'invalid_phone'
  | 'no_consent'
  | 'disabled'
  | 'none';

/**
 * Un turno de la agenda. Los datos de la persona ya vienen resueltos por el API: los del
 * paciente si está vinculado (`patientId`), los cargados en el turno si todavía no es
 * paciente (`isNewPatient`).
 */
export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string | null;
  isNewPatient: boolean;
  name: string;
  lastName: string;
  dni: string | null;
  birthDate: string | null;
  email: string | null;
  phoneNumber: { countryCode: string; phoneNumber: string } | null;
  whatsAppOptIn: boolean;
  startsAt: Date;
  durationMinutes: number;
  reason: string | null;
  status: AppointmentStatus;
  reminder: { state: ReminderState; sentAt: Date | null };
}

export interface DoctorOption {
  id: string;
  name: string;
  lastName: string;
}
