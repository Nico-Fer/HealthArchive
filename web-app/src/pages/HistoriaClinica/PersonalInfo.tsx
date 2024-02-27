import React from 'react';
import { Patient} from './../../Types/Person';
import './PersonalInfo.scss';

interface PersonalInfoProps {
  patient: Patient;
  onNameClick: () => void;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({ patient, onNameClick }) => {
  return (
    <div className="personal-info-container" onClick={onNameClick}>
      <h2>Personal Information</h2>
      <h2 className="name">
        {patient.name} {patient.lastName} Nombre y Apellido
        {/* Aca va el nombre y apellido, borrar Nombre y Apellido */}
      </h2>
      <div className="details">
        <p>Cobertura: {patient.medicalCoverage.Coverage}</p>
        <p>Número de Cobertura: {patient.medicalCoverage.Number}</p>
        <p>DNI: {patient.dni}</p>
        <p>Email: {patient.email}</p>
        <p>Phone: {patient.phoneNumber.PhoneNumber}</p>
      </div>
    </div>
  );
};

export default PersonalInfo;

