
import Table from './Table';

const Pacients = () => {
  const pacients = [
    { name: 'Paciente 1', lastName:'Apellido1', phoneNumber:'Numero1', email: 'paciente1@example.com', medicalCoverage: 'Obra Social 1' },
    { name: 'Paciente 2', lastName:'Apellido2', phoneNumber:'Numero2', email: 'paciente2@example.com', medicalCoverage: 'Obra Social 2' },
  ];

  return (
    <div>
      <h1>Pacientes</h1>
      <Table data={pacients} type="pacients" />
    </div>
  );
};

export default Pacients;