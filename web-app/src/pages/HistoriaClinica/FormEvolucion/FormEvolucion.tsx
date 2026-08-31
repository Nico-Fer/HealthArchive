import React, { useState } from 'react';
import './FormEvolucion.scss';

import formatDate from '../../../Functions/FormatDate';
import { EvolutionInfo } from '../../../Types/EvolutionInfo';
import RichEditorExample from './TextEditor/TextEditor';
import { readHceDraft, saveHceDraft } from '../../../Functions/hceDraft';
import { isPageTranslated } from '../../../Functions/isPageTranslated';
import logger from '../../../lib/logger';
interface EvolutionFormProps {
    onAddEvolution: (formData: EvolutionFormData) => void;
    onClose: () => void;
    patientDni: string;
    /** Notas iniciales (JSON de draft-js). Al venir definido, el formulario pasa a
     *  modo edición: no toca el borrador y cambia los textos. */
    initialNotes?: string;
}

interface EvolutionFormData {
    Notes: string,
    ModifiedBy: EvolutionInfo
    DateAdded: Date,
}

const EvolutionForm: React.FC<EvolutionFormProps> = ({ onAddEvolution, onClose, patientDni, initialNotes }) => {

  const todaysDate = new Date;
  const isEditing = initialNotes !== undefined;

  const [translationWarning, setTranslationWarning] = useState<string>('');

    // Al crear se arranca desde el borrador guardado para este paciente (si existe);
    // al editar, desde el texto que ya tiene la evolución.
    const [formData, setFormData] = useState<EvolutionFormData>({
        DateAdded: new Date,
        ModifiedBy: {modifiedBy: '', tuition: ''},
        Notes: isEditing ? initialNotes! : (readHceDraft(patientDni) ?? ''),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddEvolution();
    };
    const handleAddEvolution = () => {
        // Verificación al guardar: si el navegador tradujo la página, el texto que
        // draft-js serializó ya es el traducido ("BIRD" -> "pajaro"), así que guardarlo
        // metería la traducción en la historia clínica. Mejor cortar y avisar.
        // El fix de fondo son los notranslate; esto es la red de seguridad.
        if (isPageTranslated()) {
            setTranslationWarning(
                'El navegador está traduciendo la página y eso altera el texto de la evolución. ' +
                'Desactivá la traducción (clic derecho → "Mostrar siempre en español") y volvé a guardar.'
            );
            logger.warn('Guardado de evolución bloqueado: la página está traducida por el navegador');
            return;
        }
        setTranslationWarning('');

        // El borrador NO se limpia acá: lo hace HistoriaClinica solo si el POST
        // al backend fue exitoso. Si falla, el borrador sigue en sessionStorage
        // y se recupera al reabrir el formulario.
        onAddEvolution(formData);

        if (!isEditing) {
            setFormData({
                DateAdded: new Date,
                ModifiedBy: {modifiedBy: '', tuition: ''},
                Notes: '',
            });
        }
    };

    const handleTextChange = (notes : string) =>{
        setFormData({...formData, Notes: notes})
        // Editando no se guarda borrador: el borrador es del "alta en curso" de ese
        // paciente y pisarlo haría perder una evolución a medio escribir.
        if (!isEditing) {
            saveHceDraft(patientDni, notes);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="evolution-form">
            <div className="evolution-form-header">
                <h3 className="evolution-form-title">{isEditing ? 'Editar Evolución' : 'Nueva Evolución'}</h3>
                <span className="evolution-form-date">Fecha: {formatDate(todaysDate)}</span>
            </div>
            {translationWarning && (
                <div className="evolution-form-warning" role="alert">{translationWarning}</div>
            )}
            <RichEditorExample handleTextChange={handleTextChange} notes = {formData.Notes}/>
            <div className="evolution-form-actions">
                <button type="submit" className="btn btn-primary">
                    {isEditing ? 'Guardar cambios' : 'Agregar Evolución'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
        </form>
    );
};

export default EvolutionForm;
