import React, { useState } from 'react';
import Table from './Table';
import PatientHeader from './PersonaHeader';
import MyForm from './FormPaciente/FormPaciente';
import { Person, Patient } from "./../../Types/Person";

const Patients = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const patients: Patient[] = [
    { name: 'Paciente 1', lastName: 'Apellido1', phoneNumber: { CountryCode: '+54', PhoneNumber: '1120987634' }, email: 'paciente1@example.com', medicalCoverage: { Number: '1', Coverage: 'Obra Social 1' }, dni: '20996173' },
    { name: 'Paciente 2', lastName: 'Apellido2', phoneNumber: { CountryCode: '+54', PhoneNumber: '' }, email: 'paciente2@example.com', medicalCoverage: { Number: '2', Coverage: 'Obra Social 2' }, dni: '20996173' },
    { name: 'Paciente 3', lastName: 'Apellido3', phoneNumber: { CountryCode: '+54', PhoneNumber: '1534678954' }, email: '', medicalCoverage: { Number: '', Coverage: '' }, dni: '20996173' },
  ];
  
  
  const showPatientForm = (patient: Patient | Person) => {
    if ('medicalCoverage' in patient && 'dni' in patient) {
      setSelectedPatient(patient as Patient);
      setShowForm(true);
    }
  };

  return (
    <div>
      <PatientHeader />
      <Table data={patients} type="patients" onNameClick={showPatientForm} />
      {showForm && <MyForm patient={selectedPatient} onClose={() => setShowForm(false)} />}
    </div>
  );
};

export default Patients;
