/**
 * ¿El navegador está traduciendo la página en este momento?
 *
 * Importa porque el editor de evoluciones es un contentEditable: cuando el traductor
 * reescribe sus text nodes, draft-js lo interpreta como texto tipeado por el usuario y lo
 * serializa. Así fue como la sigla BIRD (bloqueo incompleto de rama derecha) terminó
 * guardada en la base como "pajaro".
 *
 * La detección es best-effort: se apoya en las marcas que Chrome y Google Translate dejan
 * en el <html>, y un navegador podría cambiarlas. Por eso NO es el arreglo — el arreglo es
 * el `<meta name="google" content="notranslate">` de index.html más los `translate="no"`
 * del editor y de las vistas. Esto es la red de seguridad por si algo se filtra igual.
 */
export const isPageTranslated = (): boolean => {
    try {
        const html = document.documentElement;

        // Chrome/Google Translate marcan el <html> con la dirección del texto traducido.
        if (html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl')) {
            return true;
        }

        // Y le cambian el lang al idioma destino. Si dejó de ser español, hay traducción:
        // la app se sirve siempre con lang="es".
        const lang = html.getAttribute('lang');
        return Boolean(lang) && !lang!.toLowerCase().startsWith('es');
    } catch {
        // Nunca bloquear un guardado por un problema al leer el DOM.
        return false;
    }
};

export default isPageTranslated;
