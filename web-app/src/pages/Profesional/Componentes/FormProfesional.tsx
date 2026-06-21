import React, { useEffect, useState } from 'react';
import './FormProfesional.scss'; 
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { Phone } from '../../../Types/Phone';
import { FormErrors } from '../../../Types/FormErrors';

import validateForm from '../../../Functions/validateForm';
import { apiGet, apiPatch, apiDelete } from '../../../api/client';
import { useSelector } from 'react-redux';
import { store } from '../../../Redux/Store';

interface FormData {
  Name: string;
  LastName: string;
  PhoneNumber: Phone;
  Description: string;
  Email: string;
  Tuition: string;
}

const MyForm: React.FC = () => {
  const navigate = useNavigate();
  const [Id, setId] = useState('');
  
  useEffect(()=>{
    fetchProfessional();
  }, [])

  const location = useLocation();
  const professinonalEmail = location.state.email;

  const [formData, setFormData] = useState<FormData>({
    Name: '',
    LastName: '',
    PhoneNumber:{CountryCode:'+54', PhoneNumber:''},
    Description: '',
    Email:'',
    Tuition: '',
  });

  const [originalFormData, setOriginalFormData] = useState<FormData>({ ...formData });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validateForm(formData)
    setErrors(newErrors);

    if(Object.keys(newErrors).length === 0){
      updateProfessional();
      navigate('/Profesionales')
    }   
  };

  const handleReset = () => {
    deleteProfessional();
    navigate('/Profesionales');
  };

  const isFormChanged = (): boolean => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const fetchProfessional = async() =>{
      try {
        const data = await apiGet<any>(`/api/Doctor/GetDoctorByEmail/${professinonalEmail}`);
        console.log(data);
        
        const mappedProfessional ={
          Name: data.name,
          LastName: data.lastName,
          PhoneNumber: {
            CountryCode: data.phoneNumber? data.phoneNumber.countryCode : '+54',
            PhoneNumber: data.phoneNumber? data.phoneNumber.phoneNumber : '',
          },
          Email: data.email,
          Description: data.description,
          Tuition: data.tuition,
        };
  
        setId(data.id);

        setFormData(mappedProfessional);
  
      } catch (error) {
        console.error('Error:', error);
      }
  
      console.log('Doctor: ', formData)
  }

  const updateProfessional = async() =>{
    try{
      await apiPatch(`/api/Doctor/UpdateDoctorById/${Id}`, formData);
    }catch(error){
      console.error('Error al actualizar el profesional:', error)
    }
  }

  const deleteProfessional = async() =>{
    try{
      await apiDelete(`/api/Doctor/DeleteDoctorById/${Id}`);
    }catch(error){
      console.error('Error al eliminar el profesional:', error)
    }
  }

  const onClose = () =>{
    navigate('/Profesionales')
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="Name">Nombre:</label>
          <input
            type="text"
            id="Name"
            name="Name"
            value={formData.Name}
            onChange={handleChange}
          />{errors.Name && <div className="alert alert-danger p-1">
          {errors.Name}
        </div>}
        </div>

        <div className="form-group">
          <label htmlFor="LastName">Apellido:</label>
          <input
            type="text"
            id="LastName"
            name="LastName"
            value={formData.LastName}
            onChange={handleChange}
          />
          {errors.LastName && <div className="alert alert-danger p-1">
                  {errors.LastName}
                </div>}
        </div>

        <div className="form-group">
          <label htmlFor="telefono">Teléfono:</label>
          <div className="phone-input">
            <span>{formData.PhoneNumber.CountryCode}</span>
            <input
              type="tel"
              id="PhoneNumber.PhoneNumber"
              name="PhoneNumber.PhoneNumber"
              value={formData.PhoneNumber.PhoneNumber}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="Email">Email:</label>
          <input
            type="text"
            id="Email"
            name="Email"
            value={formData.Email}
            onChange={handleChange}
          />
          {errors.Email && <div className="alert alert-danger p-1">
                  {errors.Email}
                </div>}
          </div>

        <div className="form-group">
          <label htmlFor="Description">Descripcion:</label>
          <input
            type="text"
            id="Description"
            name="Description"
            value={formData.Description}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <div className="buttons-container">
            <button type="button" className="delete-btn" onClick={handleReset}>
              Borrar
            </button>
            <button type="submit" className="submit-btn" disabled={!isFormChanged()}>
              Guardar
            </button>
            <button className="close-btn d-flex flex-column mb-4" onClick={() => onClose()} style={{color: 'red', background: 'none'}}>Cerrar</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyForm;
