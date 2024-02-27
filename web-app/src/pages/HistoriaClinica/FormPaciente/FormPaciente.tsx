import React, { useState } from 'react';
import './FormPaciente.scss'; 
import { Patient } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';

interface FormProps {
    patient: Patient | null; 
    onClose: () => void;
  }

  interface FormData {
    nombre: string;
    apellido: string;
    fechaNacimiento: string;
    email: string;
    prefijo: string;
    telefono: string;
    coberturaParte1: string;
    coberturaParte2: string;
  }
  const MyForm: React.FC<FormProps> = ({ patient, onClose }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<FormData>({
      nombre: '',
      apellido: '',
      fechaNacimiento: '',
      email: '',
      prefijo: '+54', // Prefijo predeterminado para Argentina
      telefono: '',
      coberturaParte1: '',
        coberturaParte2: '',
    });
    
    const [originalFormData, setOriginalFormData] = useState<FormData>({ ...formData });
    const [errors, setErrors] = useState<Partial<FormData>>({});
 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      console.log(formData);
      setOriginalFormData({ ...formData });
    }
  };

  

  const validateForm = (): boolean => {
    let valid = true;
    const newErrors: Partial<FormData> = {};

    // Validación de campos...

    setErrors(newErrors);
    return valid;
  };

  const isFormChanged = (): boolean => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="page-container">
      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre:</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={errors.nombre ? 'error' : ''}
            />
            {errors.nombre && <span className="error-msg">{errors.nombre}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido:</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              className={errors.apellido ? 'error' : ''}
            />
            {errors.apellido && <span className="error-msg">{errors.apellido}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="fechaNacimiento">Fecha de Nacimiento:</label>
            <input
              type="date"
              id="fechaNacimiento"
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              className={errors.fechaNacimiento ? 'error' : ''}
            />
            {errors.fechaNacimiento && <span className="error-msg">{errors.fechaNacimiento}</span>}
          </div>

          <div className="form-group">
          <label htmlFor="coberturaParte1">Cobertura (Parte 1):</label>
          <input
            type="text"
            id="coberturaParte1"
            name="coberturaParte1"
            value={formData.coberturaParte1}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="coberturaParte2">Cobertura (Parte 2):</label>
          <input
            type="text"
            id="coberturaParte2"
            name="coberturaParte2"
            value={formData.coberturaParte2}
            onChange={handleChange}
          />
        </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono:</label>
            <div className="phone-input">
              <span>{formData.prefijo}</span>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className={errors.telefono ? 'error' : ''}
              />
              {errors.telefono && <span className="error-msg">{errors.telefono}</span>}
            </div>
          </div>

          <div className="form-group">
            <div className="buttons-container">
            <button type="submit" className="submit-btn" disabled={!isFormChanged()}>Guardar</button>
              
              
              
              <button className="close-btn" onClick={handleClose}>
                Cerrar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyForm;