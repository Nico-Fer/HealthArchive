import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaBell, FaTimes } from 'react-icons/fa';

import { apiGet } from '../../../api/client';
import { Appointment } from '../../../Types/Appointment';
import { APPOINTMENTS_CHANGED_EVENT, appointmentFromApi, dayRange, formatTime } from '../../../Functions/appointments';
import {
  AGENDA_STORAGE_KEY, AgendaNotice, claimNotice, localDateKey, markAgendaSeen, NOTICE_LEAD_MINUTES, readAgenda, unseenCount,
} from '../../../lib/agendaNotices';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { store } from '../../../Redux/Store';
import logger, { describeError } from '../../../lib/logger';

import './NotificationBell.scss';

const REFRESH_EVERY_MS = 10 * 60_000;
const TOAST_MS = 15_000;
const MAX_LISTED = 6;
// Los timers de más de ~24 días desbordan setTimeout; acá nunca hay más de un día.
const MAX_TIMER_MS = 24 * 60 * 60_000;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

/**
 * Campanita del navbar: resumen de la agenda de hoy del doctor logueado y un aviso
 * NOTICE_LEAD_MINUTES antes de cada turno pendiente (toast y, si dio permiso, notificación
 * del navegador). Vive en el NavBar, que solo se monta con la sesión abierta, así que al
 * cerrar sesión se desmonta y se cancelan los timers.
 *
 * Los requests van con refreshOnUnauthorized:false: un poll que refrescara el token
 * correría la ventana de inactividad del server y la sesión no se cerraría nunca.
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const doctorId = useSelector((state: store) => state.Professional.id);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [agenda, setAgenda] = useState(readAgenda);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<AgendaNotice[]>([]);
  const [permission, setPermission] = useState(canNotify() ? Notification.permission : 'denied');
  const dayRef = useRef(localDateKey());

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useClickOutside([buttonRef, panelRef], () => setOpen(false), open);

  const load = useCallback(async () => {
    if (!doctorId) return;
    try {
      const { from, to } = dayRange(new Date());
      const params = new URLSearchParams({ from, to, doctorId });
      const data = await apiGet<any[]>(`/api/Appointment/GetAppointments?${params}`, { refreshOnUnauthorized: false });
      setAppointments(data.map(appointmentFromApi));
    } catch (error) {
      // Un 401 acá es esperable (access token vencido con el usuario inactivo): se
      // conserva lo que había y el próximo request del usuario renueva la sesión.
      logger.debug('No se pudo actualizar la agenda de la campanita', describeError(error));
    }
  }, [doctorId]);

  // Carga inicial, recarga periódica con la pestaña visible, al cambiar la agenda desde
  // Turnos y al cambiar el día (medianoche).
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      const today = localDateKey();
      if (today !== dayRef.current) {
        dayRef.current = today;
        setAgenda(readAgenda());
        load();
      } else if (document.visibilityState === 'visible') {
        load();
      }
    }, REFRESH_EVERY_MS);
    const onChanged = () => load();
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, onChanged);
    };
  }, [load]);

  // Otra pestaña avisó o abrió la campanita: se refleja acá también.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === AGENDA_STORAGE_KEY) setAgenda(readAgenda());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const fire = useCallback((appointment: Appointment) => {
    const notice = claimNotice(appointment.id, `${appointment.name} ${appointment.lastName}`, appointment.startsAt);
    if (!notice) return; // ya lo avisó otra pestaña

    setAgenda(readAgenda());
    setToasts((prev) => [...prev, notice]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t !== notice)), TOAST_MS);

    if (canNotify() && Notification.permission === 'granted') {
      try {
        new Notification('Próximo turno', { body: notice.text, tag: `ha-turno-${appointment.id}` });
      } catch (error) {
        logger.debug('No se pudo mostrar la notificación del navegador', describeError(error));
      }
    }
  }, []);

  // Un timer por turno pendiente. Si la app se abre dentro de la ventana del aviso (por
  // ejemplo 5 min antes), avisa enseguida.
  useEffect(() => {
    const now = Date.now();
    const timers = appointments
      .filter((a) => a.status === 'Pendiente' && a.startsAt.getTime() > now)
      .map((a) => {
        const delay = a.startsAt.getTime() - NOTICE_LEAD_MINUTES * 60_000 - now;
        if (delay > MAX_TIMER_MS) return null;
        return setTimeout(() => fire(a), Math.max(0, delay));
      });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [appointments, fire]);

  const active = appointments.filter((a) => a.status !== 'Cancelado');
  const pending = active.filter((a) => a.status === 'Pendiente');
  const attended = active.filter((a) => a.status === 'Atendido').length;
  const absent = active.filter((a) => a.status === 'Ausente').length;
  const next = pending.find((a) => a.startsAt.getTime() > Date.now());
  const badge = unseenCount(agenda, active.length > 0);

  const toggle = () => {
    if (!open) {
      markAgendaSeen();
      setAgenda(readAgenda());
    }
    setOpen(!open);
  };

  const askPermission = async () => {
    if (!canNotify()) return;
    setPermission(await Notification.requestPermission());
  };

  const goToAgenda = () => {
    setOpen(false);
    navigate('/Turnos');
  };

  return (
    <div className="ha-bell">
      <button
        ref={buttonRef}
        type="button"
        className="ha-bell-button"
        aria-label={badge > 0 ? `Agenda de hoy, ${badge} sin ver` : 'Agenda de hoy'}
        aria-expanded={open}
        onClick={toggle}
      >
        <FaBell aria-hidden="true" />
        {badge > 0 && <span className="ha-bell-badge">{badge}</span>}
      </button>

      {open && (
        <div ref={panelRef} className="ha-bell-panel" role="dialog" aria-label="Agenda de hoy">
          <div className="ha-bell-section">
            <h2 className="ha-bell-title">Resumen de hoy</h2>
            {active.length === 0 ? (
              <p className="ha-bell-muted">No tenés turnos hoy.</p>
            ) : (
              <>
                <p className="ha-bell-counts">
                  {plural(active.length, 'turno')} · {plural(pending.length, 'pendiente')} · {plural(attended, 'atendido')}
                  {absent > 0 && <> · {plural(absent, 'ausente')}</>}
                </p>
                {next && (
                  <p className="ha-bell-next">
                    Próximo: <strong>{formatTime(next.startsAt)}</strong> {next.name} {next.lastName}
                  </p>
                )}
                {pending.length > 0 && (
                  <ul className="ha-bell-list">
                    {pending.slice(0, MAX_LISTED).map((a) => (
                      <li key={a.id}>
                        <span className="ha-bell-time">{formatTime(a.startsAt)}</span> {a.name} {a.lastName}
                      </li>
                    ))}
                    {pending.length > MAX_LISTED && <li className="ha-bell-muted">y {pending.length - MAX_LISTED} más</li>}
                  </ul>
                )}
              </>
            )}
          </div>

          {agenda.notices.length > 0 && (
            <div className="ha-bell-section">
              <h2 className="ha-bell-title">Avisos</h2>
              <ul className="ha-bell-list">
                {agenda.notices.map((n) => (
                  <li key={n.appointmentId}>
                    <span className="ha-bell-time">{formatTime(new Date(n.at))}</span> {n.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ha-bell-footer">
            <button type="button" className="btn btn-sm btn-primary" onClick={goToAgenda}>Ver agenda</button>
            {permission === 'default' && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={askPermission}>
                Activar avisos del navegador
              </button>
            )}
          </div>
        </div>
      )}

      {toasts.length > 0 && createPortal(
        <div className="ha-toast-stack" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.appointmentId} className="ha-toast">
              <FaBell aria-hidden="true" className="ha-toast-icon" />
              <span className="ha-toast-text">{t.text}</span>
              <Link to="/Turnos" className="ha-toast-link" onClick={() => setToasts((prev) => prev.filter((x) => x !== t))}>
                Ver
              </Link>
              <button type="button" className="ha-toast-close" aria-label="Cerrar aviso" onClick={() => setToasts((prev) => prev.filter((x) => x !== t))}>
                <FaTimes aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default NotificationBell;
