import { useState, useEffect } from 'react';
import Table from './Table';
import PatientHeader from './PersonaHeader';
import FormPaciente from './FormPaciente/FormPaciente';
import { Person, Patient } from "./../../Types/Person";
import { apiGet } from '../../api/client';

const Patients = () => {

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchPatients = async () => {
    try {
      const data = await apiGet<any[]>('/api/Patient/GetPatients');
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

    useEffect(() => {
      const filtered = patients.filter(patient =>{
          const fullName = patient.Name + ' ' + patient.LastName;
          return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.DNI.toLowerCase().includes(searchTerm.toLowerCase())
        }
      );
      setFilteredPatients(filtered);
    }, [searchTerm, patients]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

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
      <PatientHeader onSearchChange={handleSearchChange} />
      <Table data = {filteredPatients}  onPatientClick={handlePatientClick}/>
      {selectedPatient && <FormPaciente patient={selectedPatient} onClose={handleCloseForm} onPatientUpdated={handlePatientUpdated}/>}
    </div>
  );
};

export default Patients;
