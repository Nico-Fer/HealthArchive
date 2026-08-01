import ProfessionalTable from './ProffesionalTable';
import { useEffect, useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { Phone } from '../../Types/Phone';
import { apiGet } from '../../api/client';
import Spinner from '../../components/Spinner';

interface FormData {
  Name: string;
  LastName: string;
  PhoneNumber: Phone;
  Description?: string;
  Email: string;
  Tuition: string;
}

// Normaliza para búsqueda: minúsculas y sin acentos ("María" matchea "maria")
const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const Proffesionals  = () => {
  const [proffesionals, setProffesionals] = useState<FormData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() =>{
    fetchProfesssionals();
  }, [])

  const fetchProfesssionals = async() =>{
    try {
      setIsLoading(true);
      const data = await apiGet<any[]>('/api/Doctor/GetDoctors');

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

  // Filtrado client-side: GetDoctors ya devuelve la lista completa
  const filteredProfessionals = proffesionals.filter((professional) =>
    normalize(`${professional.Name} ${professional.LastName}`).includes(normalize(searchTerm.trim()))
  );

  return (
    <div className="ha-page">
      <PageHeader
        title="Profesionales"
        searchPlaceholder="Buscar por nombre o apellido..."
        onSearchChange={(e) => setSearchTerm(e.target.value)}
      />
      {isLoading ? (
        <Spinner label="Cargando profesionales..." />
      ) : (
        <>
          <div className="ha-card d-inline-block px-4 py-3 mb-3">
            <div className="text-secondary text-uppercase fw-semibold small">Total de profesionales</div>
            <div className="fs-3 fw-bold">{proffesionals.length}</div>
          </div>
          <ProfessionalTable data={filteredProfessionals}/>
        </>
      )}
    </div>
  );
};

export default Proffesionals;
