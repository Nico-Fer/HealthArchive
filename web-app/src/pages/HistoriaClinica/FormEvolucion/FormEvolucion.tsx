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
}

interface EvolutionFormData {
    Notes: string,
    ModifiedBy: EvolutionInfo
    DateAdded: Date,
}

const EvolutionForm: React.FC<EvolutionFormProps> = ({ onAddEvolution, onClose, patientDni }) => {

  const todaysDate = new Date;

    // Arrancamos desde el borrador guardado para este paciente (si existe).
    const [formData, setFormData] = useState<EvolutionFormData>({
        DateAdded: new Date,
        ModifiedBy: {modifiedBy: '', tuition: ''},
        Notes: readHceDraft(patientDni) ?? '',
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

        setFormData({
            DateAdded: new Date,
            ModifiedBy: {modifiedBy: '', tuition: ''},
            Notes: '',
        });
    };

    const handleTextChange = (notes : string) =>{
        setFormData({...formData, Notes: notes})
        saveHceDraft(patientDni, notes);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Fecha: {formatDate(todaysDate)}</label>
            </div>
            <div>
                <RichEditorExample handleTextChange={handleTextChange} notes = {formData.Notes}/>
            </div>
            <button type="submit" className="submit-btn">Agregar Evolución</button>
            <button type="button" className="close-btn" onClick={onClose}>Cerrar</button>
        </form>
    );
};

export default EvolutionForm;
