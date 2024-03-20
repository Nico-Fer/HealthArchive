import React, { useState } from 'react';
import './FormEvolucion.scss'; 

import formatDate from '../../../Functions/FormatDate';
import { EvolutionInfo } from '../../../Types/EvolutionInfo';
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;       
          setFormData({ ...formData, [name]: value });
      };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddEvolution();
    };
    const handleAddEvolution = () => {
        // Llama a la función proporcionada por el padre para agregar la evolución
        onAddEvolution(formData);
    
        // Limpia el formulario después de agregar la evolución
        setFormData({
            DateAdded: new Date,
            ModifiedBy: {modifiedBy: '', tuition: ''},
            Notes: '',
        });
    };
    

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Fecha: {formatDate(todaysDate)}</label>
            </div>
            <div>
                <label>Texto:</label>
                <textarea className='form-control w-100' name="Notes" value={formData.Notes} onChange={handleChange} style={{height: 300}}/>
            </div>
            <button type="submit" className="submit-btn">Agregar Evolución</button>
            <button type="button" className="close-btn" onClick={onClose}>Cerrar</button>
        </form>
    );
};

export default EvolutionForm;
