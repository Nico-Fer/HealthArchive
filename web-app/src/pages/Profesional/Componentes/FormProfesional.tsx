import React, { useState } from 'react';
import './FormProfesional.scss'; // Importamos el archivo SCSS

interface FormData {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  especialidad: string;
  email: string;
  prefijo: string;
  telefono: string;
}

const MyForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    especialidad: '',
    email: '',
    prefijo: '+54', // Prefijo predeterminado para Argentina
    telefono: '',
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

  const handleReset = () => {
    setFormData({ ...originalFormData });
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

  return (
    
      
        
      
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
              <label htmlFor="especialidad">Especialidad:</label>
              <input
                type="text"
                id="especialidad"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                className={errors.especialidad ? 'error' : ''}
              />
              {errors.especialidad && <span className="error-msg">{errors.especialidad}</span>}
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
                <button type="button" className="delete-btn" onClick={handleReset}>Borrar</button>
                <button type="submit" className="submit-btn" disabled={!isFormChanged()}>Guardar</button>
              </div>
            </div>
          </form>
        </div>
      
  );
};

export default MyForm;
