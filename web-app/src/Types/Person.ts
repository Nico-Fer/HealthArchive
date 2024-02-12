import { MedicalCoverage } from "./MedicalCoverage";
import { Phone } from "./Phone";

export interface Person {
    name: string;
    lastName: string;
    phoneNumber: Phone;
    email: string;
}

export interface Patient extends Person {
    medicalCoverage: MedicalCoverage;
    dni: string;
}