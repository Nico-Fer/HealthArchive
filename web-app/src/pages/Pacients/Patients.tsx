
import Table from './Table';
import PatientHeader from './PersonaHeader';

const Patients = () => {
  const patients = [
    { name: 'Paciente 1', lastName:'Apellido1', phoneNumber:{CountryCode:'+54', PhoneNumber: '1120987634'}, email: 'paciente1@example.com', medicalCoverage: {Number: '1', Coverage: 'Obra Social 1'}, dni: '20996173' },
    { name: 'Paciente 2', lastName:'Apellido2', phoneNumber:{CountryCode:'+54', PhoneNumber: ''}, email: 'paciente2@example.com', medicalCoverage: {Number: '2', Coverage: 'Obra Social 2'}, dni: '20996173' },
    { name: 'Paciente 3', lastName:'Apellido3', phoneNumber:{CountryCode:'+54', PhoneNumber: '1534678954'}, email: '', medicalCoverage: {Number: '', Coverage: ''}, dni: '20996173' },
  ];

  return (
    <div>
      <PatientHeader />
      <Table data={patients} type="patients" />
    </div>
  );
};

export default Patients;