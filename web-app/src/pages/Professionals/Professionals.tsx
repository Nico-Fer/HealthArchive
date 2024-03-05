import ProfessionalTable from './ProffesionalTable';
import { Person} from './../../Types/Person';
import { useEffect, useState } from 'react';


const Proffesionals  = () => {
  const [proffesionals, setProffesionals] = useState<Person[]>([]);

  useEffect(() =>{
    fetchProfesssionals();
  }, [])

  const fetchProfesssionals = async() =>{
    try {
      const response = await fetch('https://localhost:44393/api/Doctor/GetDoctors');
      if (!response.ok) {
        throw new Error('Error al obtener los doctores');
      }
      const data = await response.json();
      console.log(data);
      
      const mappedProfessionals = data.map((professional: any) => ({
        Name: professional.name,
        LastName: professional.lastName,
        PhoneNumber: {
          CountryCode: professional.phoneNumber.countryCode,
          PhoneNumber: professional.phoneNumber.phoneNumber,
        },
        Email: professional.email,
      }));

      setProffesionals(mappedProfessionals);

    } catch (error) {
      console.error('Error:', error);
    }

    console.log('Lista de pacientes: ',proffesionals)
  }

  return (
    <div>
      <h1>Profesinales</h1>
      <ProfessionalTable data = {proffesionals}/>
    </div>
  );
};

export default Proffesionals;