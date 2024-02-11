export interface Person {
    name: string;
    lastName: string;
    phoneNumber: string;
    email: string;
}

export interface Pacient extends Person {
    medicalCoverage: string;
}