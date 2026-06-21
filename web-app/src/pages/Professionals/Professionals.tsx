import ProfessionalTable from './ProffesionalTable';
import { Person} from './../../Types/Person';
import { useEffect, useState } from 'react';
import ProfessionalHeader from '../Profesional/ProfessionalHeader';
import { Phone } from '../../Types/Phone';
import { apiGet } from '../../api/client';

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
      const data = await apiGet<any[]>('/api/Doctor/GetDoctors');
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