// Borrador temporal de la evolución en curso, por paciente (clave = DNI).
// Usamos sessionStorage: sobrevive navegar atrás/adelante y recargar la pestaña,
// pero se borra al cerrar la pestaña/navegador, para no dejar notas clínicas en disco
// en máquinas compartidas de consultorio.

const keyFor = (dni: string): string => `hce-draft:${dni}`;

export const readHceDraft = (dni: string): string | null => {
  try {
    return sessionStorage.getItem(keyFor(dni));
  } catch {
    return null;
  }
};

export const saveHceDraft = (dni: string, notes: string): void => {
  try {
    // `notes` es el rawContentState de draft-js serializado. No persistimos
    // borradores sin texto real (p. ej. solo mover el cursor dispara onChange).
    const raw = JSON.parse(notes);
    const hasText =
      Array.isArray(raw?.blocks) &&
      raw.blocks.some((b: { text?: string }) => b.text?.trim());

    if (hasText) sessionStorage.setItem(keyFor(dni), notes);
    else sessionStorage.removeItem(keyFor(dni));
  } catch {
    // notes no es JSON válido de draft-js; no persistimos nada.
  }
};

export const clearHceDraft = (dni: string): void => {
  try {
    sessionStorage.removeItem(keyFor(dni));
  } catch {
    // sessionStorage no disponible; nada que limpiar.
  }
};
