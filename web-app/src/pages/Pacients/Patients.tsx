import { useState, useEffect } from 'react';
import Table from './Table';
import PatientHeader from './PersonaHeader';
import FormPaciente from './FormPaciente/FormPaciente';
import { Person, Patient } from "./../../Types/Person";

const Patients = () => {

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const fetchPatients = async () => {
    try {
      const response = await fetch('https://localhost:44393/api/Patient/GetPatients');
      if (!response.ok) {
        throw new Error('Error al obtener los pacientes');
      }
      const data = await response.json();
      console.log(data);
      
      const mappedPatients = data.map((patient: any) => ({
        Name: patient.name,
        LastName: patient.lastName,
        PhoneNumber: {
          CountryCode: patient.phoneNumber.countryCode,
          PhoneNumber: patient.phoneNumber.phoneNumber,
        },
        Email: patient.email,
        MedicalCoverage: {
          Number: patient.medicalCoverage.number, 
          Coverage: patient.medicalCoverage.coverage,
        },
        DNI: patient.dni,
        Country: patient.country,
        Ocupation: patient.ocupation,
        HomeAddress: patient.homeAddress,
        BirthDate: patient.birthDate, 
        Note: patient.note,
      }));

      setPatients(mappedPatients);

    } catch (error) {
      console.error('Error:', error);
    }

    console.log('Lista de pacientes: ',patients)
  };

    useEffect(() => {
      fetchPatients();
    }, []);

    const handlePatientClick = (patient: Patient) => {
      setSelectedPatient(patient);
    };
  
    const handleCloseForm = () => {
      setSelectedPatient(null);
    };

    const handlePatientUpdated = async () => {
      await fetchPatients(); 
    };
  
  return (
    <div>
      <PatientHeader/>
      <Table data = {patients}  onPatientClick={handlePatientClick}/>
      {selectedPatient && <FormPaciente patient={selectedPatient} onClose={handleCloseForm} onPatientUpdated={handlePatientUpdated}/>}
    </div>
  );
};

export default Patients;
