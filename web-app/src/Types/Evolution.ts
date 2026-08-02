import { EvolutionInfo } from "./EvolutionInfo";

export interface Evolution{
    /** Id del backend. Opcional porque una evolución recién armada en memoria todavía
     *  no lo tiene hasta que responde el POST. Sin él no se puede editar. */
    Id? : string;
    /** HTML listo para mostrar (ya pasado por convertJsonToHtml). */
    Notes : string;
    /** El JSON crudo de draft-js tal cual vino del backend. Es lo que hay que cargar en
     *  el editor al editar: el HTML renderizado no se puede volver a editar. */
    NotesRaw? : string;
    ModifiedBy: EvolutionInfo;
    DateAdded: Date;
}
