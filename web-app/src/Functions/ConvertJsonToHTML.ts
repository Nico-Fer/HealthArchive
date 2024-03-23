import { convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';

const  convertJsonToHtml = (serializedDraftJsContent: string): string => {
  const contentState = convertFromRaw(JSON.parse(serializedDraftJsContent));

    const options = {
        inlineStyles: {
            'Verde': {style: {backgroundColor: 'rgba(0, 255, 0, 0.3)'}},
            'Rojo': {style: {backgroundColor: 'rgba(255, 0, 0, 0.3)'}},
            'Azul': {style: {backgroundColor: 'rgba(0, 0, 255, 0.3)'}},
            'Amarillo': {style: {backgroundColor: 'rgba(245, 243, 39, 0.8)'}}
        }
    }

  const html = stateToHTML(contentState, options);
  console.log(html);
  return html;
}

export default convertJsonToHtml;