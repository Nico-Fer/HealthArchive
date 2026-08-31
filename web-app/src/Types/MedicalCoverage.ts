export interface MedicalCoverage{
    Number: string,
    Coverage: string,
    /** Posición dentro del paciente: la 0 es la principal. La reasigna el backend según
     *  el orden en que viajan, así que en el front alcanza con respetar el orden del array. */
    Order: number,
}
