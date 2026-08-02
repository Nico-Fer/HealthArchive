import React, { useState } from 'react';
import './FormEvolucion.scss';

import formatDate from '../../../Functions/FormatDate';
import { EvolutionInfo } from '../../../Types/EvolutionInfo';
import RichEditorExample from './TextEditor/TextEditor';
import { readHceDraft, saveHceDraft } from '../../../Functions/hceDraft';
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
