import { Patient } from "./Person";
import { Evolution } from "./Evolution";
import { HCEFile } from "./HCEFile";

export interface HCE{
    Id : string;
    PatientId: string;
    Evolutions: Evolution[]
    Files: HCEFile[]
}