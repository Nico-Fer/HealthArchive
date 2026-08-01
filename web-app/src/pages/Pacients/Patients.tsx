import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Table from './Table';
import PageHeader from '../../components/PageHeader';
import PaginationControls from './Pagination/PaginationControls';
import FormPaciente from './FormPaciente/FormPaciente';
import { Person, Patient } from "./../../Types/Person";
import { PagedResult } from "./../../Types/Paged";
import { apiGet } from '../../api/client';
import Spinner from '../../components/Spinner';

const PAGE_SIZE = 30;

const Patients = () => {

  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        pageNumber: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const data = await apiGet<PagedResult<any>>(`/api/Patient/GetPatients?${params}`);

      const mappedPatients = data.items.map((patient: any) => ({
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
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Recarga la página actual cada vez que cambia el número de página.
  useEffect(() => {
    fetchPatients();
  }, [page]);

  // Búsqueda server-side con debounce: al tipear, se espera ~350ms antes de
  // consultar la API y siempre se reinicia a la página 1.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (page !== 1) {
        setPage(1); // dispara el fetch vía el effect de `page`
      } else {
        fetchPatients();
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
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
    <div className="ha-page">
      <PageHeader
        title="Pacientes"
        searchPlaceholder="Buscar por nombre o DNI..."
        onSearchChange={handleSearchChange}
        actionLabel="Nuevo Paciente"
        onAction={() => navigate('/Pacientes/Nuevo')}
      />
      {isLoading ? (
        <Spinner label="Cargando pacientes..." />
      ) : (
        <Table data={patients} onPatientClick={handlePatientClick} />
      )}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        shownCount={patients.length}
        totalCount={totalCount}
        itemsLabel="pacientes"
      />
      {selectedPatient && <FormPaciente patient={selectedPatient} onClose={handleCloseForm} onPatientUpdated={handlePatientUpdated} />}
    </div>
  );
};

export default Patients;
