import React from 'react';
import Table from '../Pacients/Table';
import { Person, Patient } from './../../Types/Person';
import { useNavigate } from 'react-router-dom';


const Proffesionals  = () => {
  const proffesionals = [
    { name: 'Profesional 1', lastName:'Apellido1', phoneNumber:{CountryCode:'+54', PhoneNumber: 'Numero1'}, email: 'profesional1@example.com'},
    { name: 'Profesional 2', lastName:'Apellido2', phoneNumber:{CountryCode:'+54', PhoneNumber: 'Numero2'}, email: 'profesional2@example.com'},
  ];
  const navigate = useNavigate();

  const handleNameClick = (item: Patient | Person) => {
    // Redirigir a la página Profe.tsx
    navigate('/Profesional');
  };

  const handleRowClick = () => {};

  return (
    <div>
      <h1>Profesinales</h1>
      <Table data={proffesionals} type="professionals"  onNameClick={handleNameClick}/>
    </div>
  );
};

export default Proffesionals;