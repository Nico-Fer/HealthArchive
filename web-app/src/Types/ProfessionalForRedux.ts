export interface ProfessionalForRedux{
    /** Id del doctor. Lo usa la HCE para saber si el doctor logueado es el autor de una
     *  evolución y puede editarla. Puede venir vacío en una sesión vieja persistida en
     *  localStorage antes de que el backend lo mandara: en ese caso no se ofrece editar
     *  (fail-closed) hasta que /Me rehidrate el store. */
    id: string;
    name: string;
    lastName: string;
    email: string;
    tuition: string;
    role: string;
}
