import ProfessionalTable from './ProffesionalTable';
import { Person} from './../../Types/Person';
import { useEffect, useState } from 'react';
import ProfessionalHeader from '../Profesional/ProfessionalHeader';
import { Phone } from '../../Types/Phone';
import { apiGet } from '../../api/client';
import Spinner from '../../components/Spinner';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() =>{
    fetchProfesssionals();
  }, [])

  const fetchProfesssionals = async() =>{
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <ProfessionalHeader/>
      {isLoading ? (
        <Spinner label="Cargando profesionales..." />
      ) : (
        <ProfessionalTable data = {proffesionals}/>
      )}
    </div>
  );
};

export default Proffesionals;