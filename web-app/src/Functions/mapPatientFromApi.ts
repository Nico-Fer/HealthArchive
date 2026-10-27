import { Patient } from '../Types/Person';

/**
 * Paciente del API (camelCase) al tipo del front. Lo usan el listado de pacientes y la
 * agenda (al confirmar asistencia, para abrir la HCE con el mismo objeto que manda el listado).
 */
const mapPatientFromApi = (patient: any): Patient => ({
  Name: patient.name,
  LastName: patient.lastName,
  PhoneNumber: {
    CountryCode: patient.phoneNumber?.countryCode ?? '+54',
    PhoneNumber: patient.phoneNumber?.phoneNumber ?? '',
  },
  Email: patient.email,
  // Se ordena por `order` y no se confía en el orden del JSON: la primera es la
  // cobertura principal y es la que muestra la tabla.
  MedicalCoverages: [...(patient.medicalCoverages ?? [])]
    .sort((a: any, b: any) => a.order - b.order)
    .map((coverage: any) => ({
      Number: coverage.number,
      Coverage: coverage.coverage,
      Order: coverage.order,
    })),
  DNI: patient.dni,
  Country: patient.country,
  Ocupation: patient.ocupation,
  HomeAddress: patient.homeAddress,
  BirthDate: patient.birthDate,
  Note: patient.note,
  WhatsAppOptIn: patient.whatsAppOptIn ?? false,
});

export default mapPatientFromApi;
