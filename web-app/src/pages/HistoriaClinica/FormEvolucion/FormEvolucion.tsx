import React, { useState } from 'react';
import './FormEvolucion.scss'; 

import formatDate from '../../../Functions/FormatDate';
import { EvolutionInfo } from '../../../Types/EvolutionInfo';
import RichEditorExample from './TextEditor/TextEditor';
interface EvolutionFormProps {
    onAddEvolution: (formData: EvolutionFormData) => void;
    onClose: () => void;
}

interface EvolutionFormData {
    Notes: string,
    ModifiedBy: EvolutionInfo
    DateAdded: Date,
}

const EvolutionForm: React.FC<EvolutionFormProps> = ({ onAddEvolution, onClose }) => {

  const todaysDate = new Date;

    const [formData, setFormData] = useState<EvolutionFormData>({
        DateAdded: new Date,
        ModifiedBy: {modifiedBy: '', tuition: ''},
        Notes: '',
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddEvolution();
    };
    const handleAddEvolution = () => {
        onAddEvolution(formData);
    
        setFormData({
            DateAdded: new Date,
            ModifiedBy: {modifiedBy: '', tuition: ''},
            Notes: '',
        });
    };
    
    const handleTextChange = (notes : string) =>{
        setFormData({...formData, Notes: notes})
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
