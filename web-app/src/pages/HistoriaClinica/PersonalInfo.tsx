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

  return (
    <div className="personal-info ha-card">
      <div className="personal-info-header">
        <Avatar name={patient.Name} lastName={patient.LastName} size="lg" />
        <h2 className="personal-info-name">
          {patient.Name} {patient.LastName}
        </h2>
      </div>
      <dl className="personal-info-details">
        <div className="personal-info-row">
          <dt>Obra Social</dt>
          <dd>{patient?.MedicalCoverage.Coverage}</dd>
        </div>
        <div className="personal-info-row">
          <dt>Nro. Cobertura</dt>
          <dd>{patient?.MedicalCoverage.Number}</dd>
        </div>
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
