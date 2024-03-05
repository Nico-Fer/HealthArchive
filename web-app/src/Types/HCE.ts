import { Patient } from "./Person";
import { Evolution } from "./Evolution";

export interface HCE{
    Id : string;
    PatientId: string;
    Evolutions: Evolution[]
}