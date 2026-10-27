import React, { useState } from 'react';
import { Appointment } from '../../Types/Appointment';
import DateField from '../../components/DateField';
import { today } from '../../Functions/DateUtils';

interface Props {
  appointment: Appointment;
  onConfirm: (birthDate: Date) => void;
  onCancel: () => void;
}

/**
 * Al confirmar la asistencia de alguien que todavía no es paciente, el API lo crea con los
 * datos del turno. Si falta la fecha de nacimiento (obligatoria en la ficha) responde
 * birthdate_required y se pide solo eso, para seguir directo a la HCE.
 */
const CheckInDialog: React.FC<Props> = ({ appointment, onConfirm, onCancel }) => {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!birthDate) {
      setError('La fecha de nacimiento es obligatoria.');
      return;
    }
    onConfirm(birthDate);
  };

  return (
    <div className="ha-modal-backdrop" onClick={onCancel}>
      <div className="ha-modal turnos-checkin" role="dialog" aria-modal="true" aria-labelledby="checkin-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="checkin-title" className="ha-modal-title">Completar datos del paciente</h2>
        <p>
          {appointment.name} {appointment.lastName} todavía no es paciente. Para crear su historia
          clínica falta la fecha de nacimiento.
        </p>
        <form className="ha-form" onSubmit={handleSubmit}>
          <DateField id="checkin-birthdate" label="Fecha de nacimiento" value={birthDate} onChange={setBirthDate} maxDate={today()} error={error} />
          <div className="ha-form-actions">
            <button type="submit" className="btn btn-primary">Confirmar y abrir HCE</button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckInDialog;
