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
    /** Id del doctor que la creó: el único que la puede editar. null/undefined en las
     *  evoluciones viejas, que quedan bloqueadas para todos. */
    CreatedByDoctorId?: string | null;
    /** Fecha de creación. Es la fecha "de la consulta" y no cambia nunca. */
    DateAdded: Date;
    /** Fecha de la última edición, o null si nunca se editó. */
    EditedDate?: Date | null;
}
