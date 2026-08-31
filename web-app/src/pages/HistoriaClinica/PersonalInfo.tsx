import React from 'react';
import { Patient} from './../../Types/Person';
import './PersonalInfo.scss';
import CalculateAge from '../../Functions/CalculateAge';
import Spinner from '../../components/Spinner';
import Avatar from '../../components/Avatar';

interface PersonalInfoProps {
  patient: Patient;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({patient}) => {

  if (!patient) {
    return <Spinner />;
  }

  // Puede venir undefined si el paciente llegó por router state desde una pantalla que
  // todavía no lo mapeó; con [] la card se dibuja igual en vez de romper.
  const coberturas = patient.MedicalCoverages ?? [];

  return (
    <div className="personal-info ha-card">
      <div className="personal-info-header">
        <Avatar name={patient.Name} lastName={patient.LastName} size="lg" />
        <h2 className="personal-info-name">
          {patient.Name} {patient.LastName}
        </h2>
      </div>
      <dl className="personal-info-details">
        {coberturas.length === 0 ? (
          <div className="personal-info-row">
            <dt>Obra Social</dt>
            <dd>—</dd>
          </div>
        ) : (
          coberturas.map((cobertura, index) => (
            <div className="personal-info-row" key={index}>
              {/* La primera es la principal: se rotula distinto solo cuando hay más de
                  una, para no ensuciar el caso habitual de una sola cobertura. */}
              <dt>{coberturas.length > 1 && index === 0 ? 'Obra Social (principal)' : 'Obra Social'}</dt>
              <dd>
                {cobertura.Coverage || '—'}
                {cobertura.Number && <span className="personal-info-coverage-number">N.º {cobertura.Number}</span>}
              </dd>
            </div>
          ))
        )}
        <div className="personal-info-row">
          <dt>DNI</dt>
          <dd>{patient.DNI}</dd>
        </div>
        <div className="personal-info-row">
          <dt>Email</dt>
          <dd>{patient?.Email}</dd>
        </div>
        <div className="personal-info-row">
          <dt>Teléfono</dt>
          <dd>{patient?.PhoneNumber.PhoneNumber}</dd>
        </div>
        <div className="personal-info-row">
          <dt>Edad</dt>
          <dd>{CalculateAge(patient.BirthDate) ?? '—'} años</dd>
        </div>
      </dl>
    </div>
  );
};

export default PersonalInfo;
