import { convertFromRaw } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';

const  convertJsonToHtml = (serializedDraftJsContent: string): string => {
  const contentState = convertFromRaw(JSON.parse(serializedDraftJsContent));

    const options = {
        inlineStyles: {
            'Verde': {style: {backgroundColor: 'rgba(0, 255, 0, 0.3)'}}
        }
    }

  const html = stateToHTML(contentState, options);
  console.log(html);
  return html;
}

export default convertJsonToHtml;