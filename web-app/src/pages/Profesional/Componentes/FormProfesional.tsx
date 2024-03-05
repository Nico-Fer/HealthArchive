import React, { useEffect, useState } from 'react';
import './FormProfesional.scss'; 
import { useLocation } from 'react-router-dom';

import { Phone } from '../../../Types/Phone';

interface FormData {
  Name: string;
  LastName: string;
  BirthDate: string;
  PhoneNumber: Phone;
  Description: string;
  Email: string;
}

const MyForm: React.FC = () => {
  
  useEffect(()=>{
    fetchProfessional();
  }, [])

  const [formData, setFormData] = useState<FormData>({
    Name: '',
    LastName: '',
    BirthDate: '',
    PhoneNumber:{CountryCode:'+54', PhoneNumber:''},
    Description: '',
    Email:''
  });

  const location = useLocation();
  const professinonalEmail = location.state.email;

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

  const fetchProfessional = async() =>{
      try {
        const response = await fetch(`https://localhost:44393/api/Doctor/GetDoctorByEmail/${professinonalEmail}`);
        if (!response.ok) {
          throw new Error('Error al obtener el doctor');
        }
        const data = await response.json();
        console.log(data);
        
        const mappedProfessional ={
          Name: data.name,
          LastName: data.lastName,
          PhoneNumber: {
            CountryCode: data.phoneNumber.countryCode,
            PhoneNumber: data.phoneNumber.phoneNumber,
          },
          Email: data.email,
          Description: data.description,
          BirthDate: data.birthDate
        };
  
        setFormData(mappedProfessional);
  
      } catch (error) {
        console.error('Error:', error);
      }
  
      console.log('Doctor: ', formData)
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="nombre">Nombre:</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.Name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="apellido">Apellido:</label>
          <input
            type="text"
            id="apellido"
            name="apellido"
            value={formData.LastName}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaNacimiento">Fecha de Nacimiento:</label>
          <input
            type="date"
            id="fechaNacimiento"
            name="fechaNacimiento"
            value={formData.BirthDate}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefono">Teléfono:</label>
          <div className="phone-input">
            <span>{formData.PhoneNumber.CountryCode}</span>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.PhoneNumber.PhoneNumber}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <div className="buttons-container">
            <button type="button" className="delete-btn" onClick={handleReset}>
              Borrar
            </button>
            <button type="submit" className="submit-btn" disabled={!isFormChanged()}>
              Guardar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyForm;
