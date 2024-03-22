import ProfessionalTable from './ProffesionalTable';
import { Person} from './../../Types/Person';
import { useEffect, useState } from 'react';
import ProfessionalHeader from '../Profesional/ProfessionalHeader';
import { Phone } from '../../Types/Phone';

interface FormData {
  Name: string;
  LastName: string;
  PhoneNumber: Phone;
  Description: string;
  Email: string;
  Tuition: string;
}

const Proffesionals  = () => {
  const [proffesionals, setProffesionals] = useState<FormData[]>([]);

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
          CountryCode: professional.phoneNumber ? professional.phoneNumber.countryCode : '',
          PhoneNumber: professional.phoneNumber ? professional.phoneNumber.phoneNumber : '',
        },
        Email: professional.email,
        Tuition: professional.tuition,
      }));

      setProffesionals(mappedProfessionals);

    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div>
      <ProfessionalHeader/>
      <ProfessionalTable data = {proffesionals}/>
    </div>
  );
};

export default Proffesionals;