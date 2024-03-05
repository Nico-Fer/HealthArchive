import React, { useState } from 'react';
import './FormEvolucion.scss'; 

import formatDate from '../../../Functions/FormatDate';
interface EvolutionFormProps {
    onAddEvolution: (formData: EvolutionFormData) => void;
    onClose: () => void;
}

interface EvolutionFormData {
    Notes: string,
    ModifiedBy: string,
    DateAdded: Date,
}

const EvolutionForm: React.FC<EvolutionFormProps> = ({ onAddEvolution, onClose }) => {

  const todaysDate = new Date;

    const [formData, setFormData] = useState<EvolutionFormData>({
        DateAdded: new Date,
        ModifiedBy: '',
        Notes: ''
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
            ModifiedBy:'',
            Notes: ''
        });
    };
    

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Fecha: {formatDate(todaysDate)}</label>
            </div>
            <div>
                <label>Texto:</label>
                <textarea name="Notes" value={formData.Notes} onChange={handleChange} />
            </div>
            <button type="submit" className="submit-btn">Agregar Evolución</button>
            <button type="button" className="close-btn" onClick={onClose}>Cerrar</button>
        </form>
    );
};

export default EvolutionForm;
