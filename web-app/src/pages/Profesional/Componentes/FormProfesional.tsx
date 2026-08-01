import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { Phone } from '../../../Types/Phone';
import { FormErrors } from '../../../Types/FormErrors';

import validateForm from '../../../Functions/validateForm';
import { apiGet, apiPatch, apiDelete } from '../../../api/client';
import Spinner from '../../../components/Spinner';
import ConfirmDialog from '../../../components/ConfirmDialog';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="profesional-form ha-card">
        <Spinner label="Cargando datos del profesional..." />
      </div>
    );
  }

  return (
    <div className="profesional-form ha-card">
      <h1 className="profesional-form-title">Profesional</h1>
      <form onSubmit={handleSubmit} className="ha-form">
        <div className="ha-form-row">
          <div className="ha-form-field">
            <label htmlFor="Name">Nombre</label>
            <input
              type="text"
              className="form-control"
              id="Name"
              name="Name"
              value={formData.Name}
              onChange={handleChange}
            />
            {errors.Name && <div className="ha-form-error">{errors.Name}</div>}
          </div>

          <div className="ha-form-field">
            <label htmlFor="LastName">Apellido</label>
            <input
              type="text"
              className="form-control"
              id="LastName"
              name="LastName"
              value={formData.LastName}
              onChange={handleChange}
            />
            {errors.LastName && <div className="ha-form-error">{errors.LastName}</div>}
          </div>
        </div>

        <div className="ha-form-field">
          <label htmlFor="PhoneNumber.PhoneNumber">Teléfono</label>
          <div className="phone-input">
            <span>{formData.PhoneNumber.CountryCode}</span>
            <input
              type="tel"
              className="form-control"
              id="PhoneNumber.PhoneNumber"
              name="PhoneNumber.PhoneNumber"
              value={formData.PhoneNumber.PhoneNumber}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="ha-form-field">
          <label htmlFor="Email">Email</label>
          <input
            type="text"
            className="form-control"
            id="Email"
            name="Email"
            value={formData.Email}
            onChange={handleChange}
          />
          {errors.Email && <div className="ha-form-error">{errors.Email}</div>}
        </div>

        <div className="ha-form-field">
          <label htmlFor="Description">Descripción</label>
          <input
            type="text"
            className="form-control"
            id="Description"
            name="Description"
            value={formData.Description}
            onChange={handleChange}
          />
        </div>

        <div className="ha-form-actions">
          <button type="submit" className="btn btn-primary" disabled={!isFormChanged()}>
            Guardar
          </button>
          <button type="button" className="btn btn-danger ms-auto" onClick={() => setShowDeleteConfirm(true)}>
            Borrar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onClose()}>Cerrar</button>
        </div>
      </form>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Borrar profesional"
          message={`¿Borrar al profesional ${formData.Name} ${formData.LastName}? Esta acción no se puede deshacer.`}
          onConfirm={() => { setShowDeleteConfirm(false); handleReset(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

export default MyForm;
