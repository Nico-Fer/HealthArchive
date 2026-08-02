import { EvolutionInfo } from "./EvolutionInfo";

export interface EvolutionFromApi {
  id: string;
  notes: string;
  evolutionInfo: EvolutionInfo;
  modifiedDate: string;
}