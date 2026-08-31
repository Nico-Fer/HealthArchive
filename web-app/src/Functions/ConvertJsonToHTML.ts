import { convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import logger from '../lib/logger';

const options = {
    inlineStyles: {
        'Verde': {style: {backgroundColor: 'rgba(0, 255, 0, 0.3)'}},
        'Rojo': {style: {backgroundColor: 'rgba(255, 0, 0, 0.3)'}},
        'Azul': {style: {backgroundColor: 'rgba(0, 0, 255, 0.3)'}},
        'Amarillo': {style: {backgroundColor: 'rgba(245, 243, 39, 0.8)'}}
    }
}

// El resultado se inyecta con dangerouslySetInnerHTML, así que el texto plano del
// fallback tiene que ir escapado: si no, una nota vieja con "<script>" se ejecutaría.
const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

/**
 * Convierte el rawContentState de draft-js (que es como se guardan las notas) al HTML
 * que se muestra en pantalla.
 *
 * Tolera notas que NO sean JSON de draft-js: las hay en datos migrados y en los seeds
 * viejos, que guardaban texto plano. Antes esto tiraba y, como el .map() de
 * fetchClinicHistory no lo atrapaba, una sola evolución mal formada dejaba la historia
 * clínica entera en blanco. Ahora esa evolución se muestra como texto y el resto carga.
 */
const convertJsonToHtml = (serializedDraftJsContent: string): string => {
  if (!serializedDraftJsContent) return '';

  try {
    const contentState = convertFromRaw(JSON.parse(serializedDraftJsContent));
    return stateToHTML(contentState, options);
  } catch {
    logger.warn('Evolución sin formato draft-js válido; se muestra como texto plano');
    return `<p>${escapeHtml(serializedDraftJsContent)}</p>`;
  }
}

export default convertJsonToHtml;
