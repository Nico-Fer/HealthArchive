import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaChevronLeft, FaChevronRight, FaWhatsapp } from 'react-icons/fa';

import PageHeader from '../../components/PageHeader';
import Spinner from '../../components/Spinner';
import Chip from '../../components/Chip';
import ConfirmDialog from '../../components/ConfirmDialog';
import DateField from '../../components/DateField';
import AppointmentForm from './AppointmentForm';
import CheckInDialog from './CheckInDialog';
import { apiGet, apiPatch, apiPost, ApiError } from '../../api/client';
import { Appointment, AppointmentStatus, DoctorOption } from '../../Types/Appointment';
import {
  addDays, appointmentFromApi, dayRange, formatTime, notifyAppointmentsChanged, REMINDER_LABELS, STATUS_LABELS,
} from '../../Functions/appointments';
import { isSameDay, toDisplay, toLocalDate, today } from '../../Functions/DateUtils';
import mapPatientFromApi from '../../Functions/mapPatientFromApi';
import { store } from '../../Redux/Store';
import logger, { describeError } from '../../lib/logger';

import './Turnos.scss';

const ALL_DOCTORS = 'all';

const Turnos = () => {
  const navigate = useNavigate();
  const me = useSelector((state: store) => state.Professional);

  const [day, setDay] = useState<Date>(today());
  // Por defecto, mi agenda. "Todos" muestra la del consultorio entero (modelo de equipo).
  const [doctorFilter, setDoctorFilter] = useState<string>(me.id || ALL_DOCTORS);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [formFor, setFormFor] = useState<Appointment | 'new' | null>(null);
  const [cancelFor, setCancelFor] = useState<Appointment | null>(null);
  const [birthDateFor, setBirthDateFor] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<any[]>('/api/Doctor/GetDoctors')
      .then((data) => setDoctors(data.map((d) => ({ id: d.id, name: d.name, lastName: d.lastName }))))
      .catch((err) => logger.error('No se pudo cargar la lista de profesionales', describeError(err)));
  }, []);

  const fetchDay = async () => {
    try {
      setIsLoading(true);
      setError('');
      const { from, to } = dayRange(day);
      const params = new URLSearchParams({ from, to });
      if (doctorFilter !== ALL_DOCTORS) params.set('doctorId', doctorFilter);
      const data = await apiGet<any[]>(`/api/Appointment/GetAppointments?${params}`);
      setAppointments(data.map(appointmentFromApi));
    } catch (err) {
      logger.error('No se pudo cargar la agenda', describeError(err));
      setError('No se pudo cargar la agenda.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDay();
  }, [day, doctorFilter]);

  const afterChange = async () => {
    notifyAppointmentsChanged();
    await fetchDay();
  };

  /**
   * Confirma la asistencia y abre la HCE. El API devuelve el paciente (lo crea si el turno
   * era de alguien nuevo) y se navega con el mismo objeto que usa el listado de pacientes.
   */
  const checkIn = async (appointment: Appointment, birthDate?: Date) => {
    setBusyId(appointment.id);
    setError('');
    try {
      const body = birthDate ? { BirthDate: toLocalDate(birthDate)?.toISOString() } : {};
      const patient = await apiPost<any>(`/api/Appointment/CheckIn/${appointment.id}`, body);
      notifyAppointmentsChanged();
      navigate('/Pacientes/HistoriaClinica', { state: { patient: mapPatientFromApi(patient) } });
    } catch (err) {
      if (err instanceof ApiError && err.slug === 'birthdate_required') {
        setBirthDateFor(appointment);
      } else {
        logger.error('No se pudo confirmar la asistencia', describeError(err));
        setError(err instanceof ApiError && err.slug === 'appointment_cancelled'
          ? 'El turno está cancelado: reactivalo antes de confirmar la asistencia.'
          : 'No se pudo confirmar la asistencia.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (appointment: Appointment, status: AppointmentStatus) => {
    setBusyId(appointment.id);
    setError('');
    try {
      await apiPatch(`/api/Appointment/UpdateAppointmentStatus/${appointment.id}`, { Status: status });
      await afterChange();
    } catch (err) {
      logger.error('No se pudo cambiar el estado del turno', describeError(err));
      setError('No se pudo actualizar el turno.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = appointments.filter((a) => a.status === 'Pendiente').length;
  const active = appointments.filter((a) => a.status !== 'Cancelado').length;
  const showDoctor = doctorFilter === ALL_DOCTORS;

  return (
    <div className="ha-page turnos">
      <PageHeader title="Turnos" actionLabel="Nuevo turno" onAction={() => setFormFor('new')} />

      <div className="turnos-toolbar ha-card">
        <div className="turnos-day-nav">
          <button type="button" className="btn btn-outline-secondary" aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))}>
            <FaChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={isSameDay(day, today())} onClick={() => setDay(today())}>
            Hoy
          </button>
          <button type="button" className="btn btn-outline-secondary" aria-label="Día siguiente" onClick={() => setDay(addDays(day, 1))}>
            <FaChevronRight aria-hidden="true" />
          </button>
          <div className="turnos-day-field">
            <DateField id="turnos-day" value={day} onChange={(d) => d && setDay(d)} />
          </div>
        </div>
        <div className="turnos-doctor">
          <label htmlFor="turnos-doctor" className="visually-hidden">Profesional</label>
          <select id="turnos-doctor" className="form-select" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
            <option value={ALL_DOCTORS}>Todos los profesionales</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.id === me.id ? 'Mi agenda' : `${d.name} ${d.lastName}`}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="turnos-summary">
        {toDisplay(day)} · {active} {active === 1 ? 'turno' : 'turnos'} · {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
      </p>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {isLoading ? (
        <Spinner label="Cargando agenda..." />
      ) : appointments.length === 0 ? (
        <div className="ha-card turnos-empty">No hay turnos para este día.</div>
      ) : (
        <ul className="turnos-list">
          {appointments.map((a) => (
            <li key={a.id} className={`ha-card turnos-item turnos-item-${a.status.toLowerCase()}`}>
              <div className="turnos-time">
                <span className="turnos-hour">{formatTime(a.startsAt)}</span>
                <span className="ha-row-sub">{a.durationMinutes} min</span>
              </div>

              <div className="turnos-person">
                <div className="turnos-name">
                  <span className="ha-row-strong">{a.name} {a.lastName}</span>
                  {a.isNewPatient && <Chip label="Nuevo" tone="blue" />}
                  <span className={`turnos-status turnos-status-${a.status.toLowerCase()}`}>{STATUS_LABELS[a.status]}</span>
                  {a.reminder.state !== 'none' && (
                    <span className={`turnos-reminder turnos-reminder-${a.reminder.state}`} title={REMINDER_LABELS[a.reminder.state]}>
                      <FaWhatsapp aria-label={REMINDER_LABELS[a.reminder.state]} />
                    </span>
                  )}
                </div>
                <div className="ha-row-sub">
                  {a.dni && <>DNI {a.dni}</>}
                  {a.phoneNumber?.phoneNumber && <> · {a.phoneNumber.countryCode} {a.phoneNumber.phoneNumber}</>}
                  {showDoctor && <> · {a.doctorName}</>}
                </div>
                {a.reason && <div className="turnos-reason">{a.reason}</div>}
              </div>

              <div className="turnos-actions">
                {a.status === 'Pendiente' && (
                  <>
                    <button type="button" className="btn btn-primary" disabled={busyId === a.id} onClick={() => checkIn(a)}>
                      Confirmar asistencia
                    </button>
                    <button type="button" className="btn btn-outline-secondary" disabled={busyId === a.id} onClick={() => setStatus(a, 'Ausente')}>
                      Ausente
                    </button>
                    <button type="button" className="btn btn-outline-secondary" disabled={busyId === a.id} onClick={() => setFormFor(a)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn-ghost text-danger" disabled={busyId === a.id} onClick={() => setCancelFor(a)}>
                      Cancelar
                    </button>
                  </>
                )}
                {a.status === 'Atendido' && (
                  <button type="button" className="btn btn-outline-primary" disabled={busyId === a.id} onClick={() => checkIn(a)}>
                    Ver HCE
                  </button>
                )}
                {(a.status === 'Ausente' || a.status === 'Cancelado') && (
                  <button type="button" className="btn btn-outline-secondary" disabled={busyId === a.id} onClick={() => setStatus(a, 'Pendiente')}>
                    Reactivar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {formFor && (
        <AppointmentForm
          appointment={formFor === 'new' ? undefined : formFor}
          defaultDay={day}
          defaultDoctorId={doctorFilter !== ALL_DOCTORS ? doctorFilter : me.id}
          doctors={doctors}
          onClose={() => setFormFor(null)}
          onSaved={() => { setFormFor(null); afterChange(); }}
        />
      )}

      {cancelFor && (
        <ConfirmDialog
          title="Cancelar turno"
          message={`¿Cancelar el turno de ${cancelFor.name} ${cancelFor.lastName} de las ${formatTime(cancelFor.startsAt)}?`}
          confirmLabel="Cancelar turno"
          cancelLabel="Volver"
          onConfirm={() => { const a = cancelFor; setCancelFor(null); setStatus(a, 'Cancelado'); }}
          onCancel={() => setCancelFor(null)}
        />
      )}

      {birthDateFor && (
        <CheckInDialog
          appointment={birthDateFor}
          onCancel={() => setBirthDateFor(null)}
          onConfirm={(birthDate) => { const a = birthDateFor; setBirthDateFor(null); checkIn(a, birthDate); }}
        />
      )}
    </div>
  );
};

export default Turnos;
