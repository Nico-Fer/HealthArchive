import { MedicalCoverage } from "./MedicalCoverage";
import { Phone } from "./Phone";

export interface Person {
    Name: string;
    LastName: string;
    PhoneNumber: Phone;
    Email: string;
}

export interface Patient extends Person {
    MedicalCoverage: MedicalCoverage;
    DNI: string;
    Country: string;
    Ocupation: string;
    HomeAddress: string;
    // null mientras el formulario todavía no tiene una fecha cargada. Antes se
    // inicializaba con new Date(), lo que prellenaba "hoy" como fecha de nacimiento.
    BirthDate: Date | null;
    Note: string;
}