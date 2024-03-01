import React, { useState } from 'react';
import Table from './Table';
import PatientHeader from './PersonaHeader';
import MyForm from './FormPaciente/FormPaciente';
import { Person, Patient } from "./../../Types/Person";

const Patients = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const patients: Patient[] = [

  ];
  
  
  /*const showPatientForm = (patient: Patient | Person) => {
    if ('medicalCoverage' in patient && 'dni' in patient) {
      setSelectedPatient(patient as Patient);
      setShowForm(true);
    }
  };

  --En el return
  <Table data={patients} type="patients" onNameClick={showPatientForm} />
*/
  return (
    <div>
      <PatientHeader/>
      <Table data = {patients} type = 'patients'/>
    </div>
  );
};

export default Patients;
