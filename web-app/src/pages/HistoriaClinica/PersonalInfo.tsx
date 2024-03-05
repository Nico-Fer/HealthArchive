import React from 'react';
import { Patient} from './../../Types/Person';
import './PersonalInfo.scss';

interface PersonalInfoProps {
  patient: Patient;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({patient}) => {

  if (!patient) {
    return <div>Loading...</div>; 
  }

  return (
    <div className="personal-info-container">
      <h2 className="name">
        {patient.Name} {patient.LastName} 
      </h2>
      <div className="details">
        <p>Cobertura: {patient?.MedicalCoverage.Coverage}</p>
        <p>Número de Cobertura: {patient?.MedicalCoverage.Number}</p>
        <p>DNI: {patient.DNI}</p>
        <p>Email: {patient?.Email}</p>
        <p>Teléfono: {patient?.PhoneNumber.PhoneNumber}</p>
      </div>
    </div>
  );
};

export default PersonalInfo;

