import React, { useEffect, useState } from 'react';
import { Appointment, DoctorOption } from '../../Types/Appointment';
import { apiGet, apiPatch, apiPost, ApiError } from '../../api/client';
import { PagedResult } from '../../Types/Paged';
import { combineDateTime, formatTime } from '../../Functions/appointments';
import { toLocalDate, today } from '../../Functions/DateUtils';
import DateField from '../../components/DateField';
import ConfirmDialog from '../../components/ConfirmDialog';
import WhatsAppOptIn from '../../components/WhatsAppOptIn';
import logger, { describeError } from '../../lib/logger';

interface PatientOption {
  id: string;
  name: string;
  lastName: string;
  dni: string;
}

interface NewPerson {
  Name: string;
  LastName: string;
  DNI: string;
  BirthDate: Date | null;
  Email: string;
  Phone: string;
  WhatsAppOptIn: boolean;
}

interface Props {
  /** El turno a editar; sin él, es un alta. */
  appointment?: Appointment;
  defaultDay: Date;
  defaultDoctorId: string;
  doctors: DoctorOption[];
  onClose: () => void;
  onSaved: () => void;
}

const DURATIONS = [15, 20, 30, 45, 60, 90];
// Mismas reglas que validateForm para el alta de pacientes.
const LETTERS = /^[A-Za-zñÑáéíóúÁÉÍÓÚüÜ\s]+$/;
const DNI = /^\d{8}$/;

const emptyPerson: NewPerson = {
  Name: '', LastName: '', DNI: '', BirthDate: null, Email: '', Phone: '', WhatsAppOptIn: false,
};

const AppointmentForm: React.FC<Props> = ({ appointment, defaultDay, defaultDoctorId, doctors, onClose, onSaved }) => {
  const isEdit = Boolean(appointment);

  const [doctorId, setDoctorId] = useState(appointment?.doctorId ?? defaultDoctorId ?? doctors[0]?.id ?? '');
  const [day, setDay] = useState<Date | null>(appointment ? toLocalDate(appointment.startsAt) : defaultDay);
  const [time, setTime] = useState(appointment ? formatTime(appointment.startsAt) : '09:00');
  const [duration, setDuration] = useState(appointment?.durationMinutes ?? 30);
  const [reason, setReason] = useState(appointment?.reason ?? '');

  // Paciente existente o alguien nuevo. Un turno ya vinculado se edita como existente.
  const [mode, setMode] = useState<'existing' | 'new'>(appointment && appointment.isNewPatient ? 'new' : 'existing');
  const [selected, setSelected] = useState<PatientOption | null>(
    appointment && appointment.patientId
      ? { id: appointment.patientId, name: appointment.name, lastName: appointment.lastName, dni: appointment.dni ?? '' }
      : null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PatientOption[]>([]);
  const [person, setPerson] = useState<NewPerson>(appointment && appointment.isNewPatient ? {
    Name: appointment.name,
    LastName: appointment.lastName,
    DNI: appointment.dni ?? '',
    BirthDate: toLocalDate(appointment.birthDate),
    Email: appointment.email ?? '',
    Phone: appointment.phoneNumber?.phoneNumber ?? '',
    WhatsAppOptIn: appointment.whatsAppOptIn,
  } : emptyPerson);
  // Si el DNI que se tipea ya es de un paciente, se ofrece usarlo en vez de duplicarlo.
  const [dniMatch, setDniMatch] = useState<PatientOption | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [askOverlap, setAskOverlap] = useState(false);
  const [saving, setSaving] = useState(false);

  const findPatients = async (term: string): Promise<PatientOption[]> => {
    const params = new URLSearchParams({ pageNumber: '1', pageSize: '8', search: term });
    const data = await apiGet<PagedResult<any>>(`/api/Patient/GetPatients?${params}`);
    return data.items.map((p: any) => ({ id: p.id, name: p.name, lastName: p.lastName, dni: p.dni }));
  };

  // Búsqueda con debounce, igual que el listado de pacientes.
  useEffect(() => {
    if (mode !== 'existing' || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      findPatients(search.trim())
        .then(setResults)
        .catch((error) => logger.warn('No se pudo buscar pacientes', describeError(error)));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, mode]);

  const checkDni = async () => {
    setDniMatch(null);
    if (!DNI.test(person.DNI.trim())) return;
    try {
      const found = await findPatients(person.DNI.trim());
      setDniMatch(found.find((p) => p.dni === person.DNI.trim()) ?? null);
    } catch (error) {
      logger.warn('No se pudo verificar el DNI', describeError(error));
    }
  };

  const useMatch = () => {
    if (!dniMatch) return;
    setSelected(dniMatch);
    setMode('existing');
    setDniMatch(null);
  };

  const setPersonField = <K extends keyof NewPerson>(key: K, value: NewPerson[K]) =>
    setPerson((prev) => ({ ...prev, [key]: value }));

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!doctorId) e.doctor = 'Elegí el profesional.';
    if (!day) e.day = 'Elegí la fecha.';
    if (!time) e.time = 'Elegí la hora.';
    if (mode === 'existing') {
      if (!selected) e.patient = 'Buscá y elegí un paciente, o cargá uno nuevo.';
    } else {
      if (!person.Name.trim()) e.Name = 'El nombre es obligatorio.';
      else if (!LETTERS.test(person.Name)) e.Name = 'El nombre solo puede contener letras o espacios';
      if (!person.LastName.trim()) e.LastName = 'El apellido es obligatorio.';
      else if (!LETTERS.test(person.LastName)) e.LastName = 'El apellido solo puede contener letras o espacios';
      if (!DNI.test(person.DNI.trim())) e.DNI = 'El DNI debe contener 8 números';
      if (person.Email.trim() && !person.Email.includes('@')) e.Email = 'Email no válido';
    }
    return e;
  };

  const buildBody = (allowOverlap: boolean) => ({
    DoctorId: doctorId,
    PatientId: mode === 'existing' ? selected?.id : null,
    StartsAt: combineDateTime(day as Date, time).toISOString(),
    DurationMinutes: duration,
    Reason: reason.trim() || null,
    NewPatient: mode === 'new' ? {
      Name: person.Name.trim(),
      LastName: person.LastName.trim(),
      DNI: person.DNI.trim(),
      // Igual que el alta de pacientes: medianoche local, así se guarda el día elegido.
      BirthDate: toLocalDate(person.BirthDate)?.toISOString() ?? null,
      Email: person.Email.trim() || null,
      PhoneNumber: person.Phone.trim() ? { CountryCode: '+54', PhoneNumber: person.Phone.trim() } : null,
      WhatsAppOptIn: person.WhatsAppOptIn && person.Phone.trim() !== '',
    } : null,
    AllowOverlap: allowOverlap,
  });

  const save = async (allowOverlap: boolean) => {
    setSaveError('');
    setSaving(true);
    try {
      if (appointment) {
        await apiPatch(`/api/Appointment/UpdateAppointment/${appointment.id}`, buildBody(allowOverlap));
      } else {
        await apiPost('/api/Appointment/CreateAppointment', buildBody(allowOverlap));
      }
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.slug === 'appointment_overlap') {
        setAskOverlap(true);
      } else {
        logger.error('No se pudo guardar el turno', describeError(error));
        setSaveError('No se pudo guardar el turno. Probá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) save(false);
  };

  return (
    <div className="ha-modal-backdrop" onClick={onClose}>
      <div className="ha-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="appointment-form-title" className="ha-modal-title">{isEdit ? 'Editar turno' : 'Nuevo turno'}</h2>
        <form className="ha-form" onSubmit={handleSubmit}>
          <div className="ha-form-field">
            <label htmlFor="appointment-doctor">Profesional</label>
            <select id="appointment-doctor" className="form-select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} {d.lastName}</option>)}
            </select>
            {errors.doctor && <div className="ha-form-error">{errors.doctor}</div>}
          </div>

          <div className="ha-form-row">
            <div className="ha-form-field">
              <DateField id="appointment-day" label="Fecha" value={day} onChange={setDay} error={errors.day} />
            </div>
            <div className="ha-form-field">
              <label htmlFor="appointment-time">Hora</label>
              <input id="appointment-time" type="time" step={300} className="form-control" value={time} onChange={(e) => setTime(e.target.value)} />
              {errors.time && <div className="ha-form-error">{errors.time}</div>}
            </div>
            <div className="ha-form-field">
              <label htmlFor="appointment-duration">Duración</label>
              <select id="appointment-duration" className="form-select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          <div className="turnos-mode" role="tablist" aria-label="Paciente">
            <button type="button" role="tab" aria-selected={mode === 'existing'} className={`btn btn-sm ${mode === 'existing' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('existing')}>
              Paciente existente
            </button>
            <button type="button" role="tab" aria-selected={mode === 'new'} className={`btn btn-sm ${mode === 'new' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMode('new')}>
              Paciente nuevo
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="ha-form-field">
              {selected ? (
                <div className="turnos-selected">
                  <span><strong>{selected.name} {selected.lastName}</strong> · DNI {selected.dni}</span>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>Cambiar</button>
                </div>
              ) : (
                <>
                  <label htmlFor="appointment-search">Buscar paciente</label>
                  <input id="appointment-search" type="search" className="form-control" placeholder="Nombre, apellido o DNI" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
                  {results.length > 0 && (
                    <ul className="turnos-results">
                      {results.map((p) => (
                        <li key={p.id}>
                          <button type="button" onClick={() => { setSelected(p); setSearch(''); }}>
                            {p.name} {p.lastName} <span className="ha-row-sub">DNI {p.dni}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {errors.patient && <div className="ha-form-error">{errors.patient}</div>}
            </div>
          ) : (
            <>
              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="appointment-name">Nombre</label>
                  <input id="appointment-name" className="form-control" value={person.Name} onChange={(e) => setPersonField('Name', e.target.value)} />
                  {errors.Name && <div className="ha-form-error">{errors.Name}</div>}
                </div>
                <div className="ha-form-field">
                  <label htmlFor="appointment-lastname">Apellido</label>
                  <input id="appointment-lastname" className="form-control" value={person.LastName} onChange={(e) => setPersonField('LastName', e.target.value)} />
                  {errors.LastName && <div className="ha-form-error">{errors.LastName}</div>}
                </div>
              </div>
              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="appointment-dni">DNI</label>
                  <input id="appointment-dni" className="form-control" inputMode="numeric" value={person.DNI} onChange={(e) => setPersonField('DNI', e.target.value)} onBlur={checkDni} />
                  {errors.DNI && <div className="ha-form-error">{errors.DNI}</div>}
                </div>
                <div className="ha-form-field">
                  <DateField id="appointment-birthdate" label="Fecha de nacimiento (opcional)" value={person.BirthDate} onChange={(d) => setPersonField('BirthDate', d)} maxDate={today()} />
                </div>
              </div>
              {dniMatch && (
                <div className="turnos-dni-match" role="status">
                  Ya hay un paciente con ese DNI: <strong>{dniMatch.name} {dniMatch.lastName}</strong>.{' '}
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={useMatch}>Usar este paciente</button>
                </div>
              )}
              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="appointment-phone">Celular (opcional)</label>
                  <div className="phone-input">
                    <span>+54</span>
                    <input id="appointment-phone" type="tel" className="form-control" placeholder="11 5000 0000 (sin 0 ni 15)" value={person.Phone} onChange={(e) => setPersonField('Phone', e.target.value)} />
                  </div>
                </div>
                <div className="ha-form-field">
                  <label htmlFor="appointment-email">Email (opcional)</label>
                  <input id="appointment-email" className="form-control" value={person.Email} onChange={(e) => setPersonField('Email', e.target.value)} />
                  {errors.Email && <div className="ha-form-error">{errors.Email}</div>}
                </div>
              </div>
              <WhatsAppOptIn
                id="appointment-optin"
                checked={person.WhatsAppOptIn}
                hasPhone={person.Phone.trim() !== ''}
                onChange={(checked) => setPersonField('WhatsAppOptIn', checked)}
              />
            </>
          )}

          <div className="ha-form-field">
            <label htmlFor="appointment-reason">Motivo (opcional, no se envía por WhatsApp)</label>
            <input id="appointment-reason" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {saveError && <div className="ha-form-error" role="alert">{saveError}</div>}

          <div className="ha-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{isEdit ? 'Guardar' : 'Dar turno'}</button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </form>
      </div>

      {askOverlap && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Horario ocupado"
            message="El profesional ya tiene un turno que se superpone con este horario. ¿Querés darlo igual como sobreturno?"
            confirmLabel="Dar sobreturno"
            cancelLabel="Elegir otro horario"
            tone="primary"
            onConfirm={() => { setAskOverlap(false); save(true); }}
            onCancel={() => setAskOverlap(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;
