import React, { Component } from 'react';
import { Editor, EditorState, RichUtils, DraftHandleValue, getDefaultKeyBinding, KeyBindingUtil, ContentBlock, Modifier  } from 'draft-js';
import { convertToRaw, convertFromRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import './styles.scss'

type State = {
  editorState: EditorState;
};

type Props = {
  handleTextChange : (notes : string) => void;
  notes: string;
};

const styleMap = {
  CODE: {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
      fontSize: 16,
      padding: 2,
  },
};

// Rehidrata el editor desde el borrador serializado (rawContentState). Si viene
// vacío o corrupto, arranca en blanco en lugar de romper.
function hydrateEditorState(notes: string): EditorState {
  if (notes) {
    try {
      return EditorState.createWithContent(convertFromRaw(JSON.parse(notes)));
    } catch {
      // notes inválido; caemos a editor vacío.
    }
  }
  return EditorState.createEmpty();
}

function getBlockStyle(block: ContentBlock): string {
  switch (block.getType()) {
      case 'blockquote': return 'RichEditor-blockquote';
      default: return '';
  }
}

interface StyleButtonProps {
  onToggle: (style: string) => void;
  style: string;
  active: boolean;
  label: string;
}

class StyleButton extends React.Component<StyleButtonProps> {
  onToggle = (e: React.MouseEvent): void => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
  };

  render() {
      let className = 'RichEditor-styleButton';
      if (this.props.active) {
          className += ' RichEditor-activeButton';
      }

      return (
          <span className={className} onMouseDown={this.onToggle}>
              {this.props.label}
          </span>
      );
  }
}

interface StyleControlsProps {
  editorState: EditorState;
  onToggle: (style: string) => void;
}

const BLOCK_TYPES = [
  { label: 'H1', style: 'header-one' },
  { label: 'H2', style: 'header-two' },
  { label: 'H3', style: 'header-three' },
  { label: 'H4', style: 'header-four' },
  { label: 'H5', style: 'header-five' },
  { label: 'H6', style: 'header-six' },
  { label: 'Blockquote', style: 'blockquote' },
  { label: 'UL', style: 'unordered-list-item' },
  { label: 'OL', style: 'ordered-list-item' },
  { label: 'Code Block', style: 'code-block' },
];

const BlockStyleControls: React.FC<StyleControlsProps> = (props) => {
  const { editorState } = props;
  const selection = editorState.getSelection();
  const blockType = editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();

  return (
      <div className="RichEditor-controls">
          {BLOCK_TYPES.map((type) =>
              <StyleButton
                  key={type.label}
                  active={type.style === blockType}
                  label={type.label}
                  onToggle={props.onToggle}
                  style={type.style}
              />
          )}
      </div>
  );
}

const INLINE_STYLES = [
  { label: 'Bold', style: 'BOLD' },
  { label: 'Italic', style: 'ITALIC' },
  { label: 'Underline', style: 'UNDERLINE' },
  { label: 'Monospace', style: 'CODE' },
];

const InlineStyleControls: React.FC<StyleControlsProps> = (props) => {
  const currentStyle = props.editorState.getCurrentInlineStyle();

  return (
      <div className="RichEditor-controls">
          {INLINE_STYLES.map((type) =>
              <StyleButton
                  key={type.label}
                  active={currentStyle.has(type.style)}
                  label={type.label}
                  onToggle={props.onToggle}
                  style={type.style}
              />
          )}
      </div>
  );
};

const colorStyleMap = {
  Rojo: { backgroundColor: 'rgba(255, 0, 0, 0.3)' },
  Verde: { backgroundColor: 'rgba(0, 255, 0, 0.3)' },
  Azul: { backgroundColor: 'rgba(0, 0, 255, 0.3)' },
  Amarillo: { backgroundColor: 'rgba(245, 243, 39, 0.8)' },
};

const ColorControls: React.FC<StyleControlsProps> = (props) => {
  const currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <div className="RichEditor-controls">
      {Object.keys(colorStyleMap).map((color) => (
        <StyleButton
          key={color}
          active={currentStyle.has(color)}
          label={color}
          onToggle={props.onToggle}
          style={color}
        />
      ))}
    </div>
  );
};

class RichEditorExample extends Component<Props, State> {
  state: State = { editorState: hydrateEditorState(this.props.notes) };

  editor: React.RefObject<Editor> = React.createRef();

  // El editor mantiene su propio estado interno, pero `notes` es la fuente de
  // verdad externa (borrador restaurado / reset a '' tras guardar). Cuando cambia
  // por afuera, resincronizamos. El chequeo evita re-hidratar en cada tecla
  // (ahí `notes` ya coincide con lo tipeado) y así no rompe el cursor.
  componentDidUpdate(prevProps: Props) {
    if (prevProps.notes === this.props.notes) return;

    const current = JSON.stringify(
      convertToRaw(this.state.editorState.getCurrentContent())
    );
    if (current !== this.props.notes) {
      this.setState({ editorState: hydrateEditorState(this.props.notes) });
    }
  }

  focus = () => {
    if (this.editor.current) {
      this.editor.current.focus();
    }
  };

  onChange = (editorState: EditorState) =>{
    this.setState({ editorState });
    const contentState = editorState.getCurrentContent();
    const rawContentState = convertToRaw(contentState);
    const notesStringified = JSON.stringify(rawContentState);
    this.props.handleTextChange(notesStringified);
  } 

  handleKeyCommand = (command: string, editorState: EditorState): DraftHandleValue => {
      const newState = RichUtils.handleKeyCommand(editorState, command);
      if (newState) {
          this.onChange(newState);
          return 'handled';
      }
      return 'not-handled';
  };

  mapKeyToEditorCommand = (e: React.KeyboardEvent): string | null => {
      if (e.keyCode === 9 /* TAB */) {
          const newEditorState = RichUtils.onTab(
              e,
              this.state.editorState,
              4, /* maxDepth */
          );
          if (newEditorState !== this.state.editorState) {
            this.onChange(newEditorState);
        }
        return null;
        }
        return getDefaultKeyBinding(e);
  }

  toggleBlockType = (blockType: string): void => {
    this.onChange(
    RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
    )
    );
  };
  
  toggleInlineStyle = (inlineStyle: string): void => {
    this.onChange(
    RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
    )
    );
  };

  toggleColor = (colorKey: string): void => {
    const selection = this.state.editorState.getSelection();
    const nextContentState = Object.keys(colorStyleMap)
      .reduce((contentState, color) => {
        
        return Modifier.removeInlineStyle(contentState, selection, color);
      }, this.state.editorState.getCurrentContent());
    
    let nextEditorState = EditorState.push(
      this.state.editorState,
      nextContentState,
      'change-inline-style'
    );
  
    const currentStyle = this.state.editorState.getCurrentInlineStyle();
  
    // Si el estilo actual no incluye el color, aplícalo
    if (!currentStyle.has(colorKey)) {
      nextEditorState = RichUtils.toggleInlineStyle(
        nextEditorState,
        colorKey
      );
    }
  
    this.onChange(nextEditorState);
  };

  render() {
      const { editorState } = this.state;
  
      let className = 'RichEditor-editor';
      const contentState = editorState.getCurrentContent();
      if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
          className += ' RichEditor-hidePlaceholder';
      }
      }
  
      return (
      // translate="no" + notranslate: es el punto crítico del fix de traducción. El
      // <Editor> de draft-js es un contentEditable y no reenvía atributos DOM arbitrarios,
      // así que el atributo va en el wrapper, de donde lo heredan los descendientes. Si el
      // navegador traduce acá, draft-js serializa el texto traducido y se guarda así.
      <div className="RichEditor-root notranslate" translate="no">
          <BlockStyleControls
          editorState={editorState}
          onToggle={this.toggleBlockType}
          />
          <InlineStyleControls
          editorState={editorState}
          onToggle={this.toggleInlineStyle}
          />
          <ColorControls
            editorState={this.state.editorState}
            onToggle={this.toggleColor}
          />
          <div className={className} onClick={this.focus}>
          <Editor
              blockStyleFn={getBlockStyle}
              customStyleMap={{...styleMap, ...colorStyleMap}}
              editorState={editorState}
              handleKeyCommand={this.handleKeyCommand}
              keyBindingFn={this.mapKeyToEditorCommand}
              onChange={this.onChange}
              placeholder="Escriba aquí..."
              ref={this.editor}
              spellCheck={true}
          />
          </div>
      </div>
      );
    }
  }
  
  export default RichEditorExample;

