import React, { useState } from 'react';
import './FormReceta.scss'; 

interface PrescriptionnFormProps {
  onAddReceta: (formData: RecetaFormData) => void;
    onClose: () => void;
  }

  interface RecetaFormData {
    fecha: string;
    nombreMedico: {
      nombreDoctor: string;
      apellidoDoctor: string;
    } ;
    matriculaDoctor: string;
    texto: string;
    
  }
  const PrescriptionForm: React.FC<PrescriptionnFormProps> = ({ onAddReceta, onClose  }) => {
    const [formData, setFormData] = useState<RecetaFormData>({
      fecha: '',
      nombreMedico: {
        nombreDoctor: ' ',
        apellidoDoctor: '' ,
      } ,
      matriculaDoctor: '',
      texto: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (name === 'nombreDoctor' || name === 'apellidoDoctor') {
        setFormData({
          ...formData,
          nombreMedico: {
            ...formData.nombreMedico,
            [name]: value,
          },
        });
      } else {
        setFormData({ ...formData, [name]: value });
      }
    };


      const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleAddReceta();
    };
    const handleAddReceta = () => {
        // Llama a la función proporcionada por el padre para agregar la evolución
        onAddReceta(formData);
    
        // Limpia el formulario después de agregar la evolución
        setFormData({
            fecha: '',
            nombreMedico: {
              nombreDoctor: ' ',
              apellidoDoctor: '' ,
            } ,
            matriculaDoctor: '',
            texto: ''
        });
    };



  

  

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Fecha:</label>
        <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} />
      </div>
      <div>
        <label>Nombre del Doctor:</label>
        <input type="text" name="nombreDoctor" value={formData.nombreMedico.nombreDoctor} onChange={handleChange} />
      </div>
      <div>
        <label>Apellido del Doctor:</label>
        <input type="text" name="apellidoDoctor" value={formData.nombreMedico.apellidoDoctor} onChange={handleChange} />
      </div>
      <div>
        <label>Matrícula del Doctor:</label>
        <input type="text" name="matriculaDoctor" value={formData.matriculaDoctor} onChange={handleChange} />
      </div>
      <div>
        <label>Texto:</label>
        <textarea name="texto" value={formData.texto} onChange={handleChange} />
      </div>
      <button type="submit" className="submit-btn">Agregar Receta</button>
      <button type="button" className="close-btn" onClick={onClose}>Cerrar</button>
    </form>
  );
};

export default PrescriptionForm;
