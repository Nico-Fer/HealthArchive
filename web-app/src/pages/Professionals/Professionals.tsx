import Table from '../Pacients/Table';

const Proffesionals = () => {
  const proffesionals = [
    { name: 'Profesional 1', lastName:'Apellido1', phoneNumber:{CountryCode:'+54', PhoneNumber: 'Numero1'}, email: 'profesional1@example.com'},
    { name: 'Profesional 2', lastName:'Apellido2', phoneNumber:{CountryCode:'+54', PhoneNumber: 'Numero2'}, email: 'profesional2@example.com'},
  ];

  return (
    <div>
      <h1>Profesinales</h1>
      <Table data={proffesionals} type="professionals" />
    </div>
  );
};

export default Proffesionals;