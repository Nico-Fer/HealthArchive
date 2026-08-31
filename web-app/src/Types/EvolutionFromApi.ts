import { EvolutionInfo } from "./EvolutionInfo";

export interface EvolutionFromApi {
  id: string;
  notes: string;
  evolutionInfo: EvolutionInfo;
  /** Autor. null en las evoluciones anteriores a la regla de autoría y en las migradas
   *  de SQL Server: esas no las puede editar nadie. */
  createdByDoctorId: string | null;
  createdDate: string;
  /** Última edición. Igual a createdDate mientras la evolución nunca se haya editado. */
  modifiedDate: string;
}
