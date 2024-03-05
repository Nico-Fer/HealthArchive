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
    BirthDate: Date;
    Note: string;
}