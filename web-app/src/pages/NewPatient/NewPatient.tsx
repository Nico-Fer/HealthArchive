import { useState } from 'react';
import { Patient } from '../../Types/Person';
import { useNavigate } from 'react-router-dom';
import { FormErrors } from '../../Types/FormErrors';

import formatDate from '../../Functions/FormatDate';
import validateForm from '../../Functions/validateForm';
import { apiPost } from '../../api/client';


import './NewPatient.scss'


const NewPatient = () => {
    const navigate = useNavigate();

    const [errors, setErrors] = useState<FormErrors>({});

    const [patientData, setPatientData] = useState<Patient>({
      Name: '',
      LastName: '',
      PhoneNumber: { CountryCode: '+54', PhoneNumber: '' }, 
      Email: '',
      MedicalCoverage: {Number: '', Coverage: ''},
      DNI: '',
      Country: '',
      Ocupation: '',
      HomeAddress: '',
      BirthDate: new Date(),
      Note: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPatientData(prevData => ({
          ...prevData,
          [name]: value,
      }));

      console.log(patientData);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    const adjustedDateString = dateString + 'T00:00:00';
    const dateObject = new Date(adjustedDateString);
  
    setPatientData(prevData => ({
      ...prevData,
      BirthDate: dateObject
    }));
  };

  const handleCoverageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const coverage = e.target.value;
  
    setPatientData(prevData => ({
      ...prevData,
      MedicalCoverage: {
        ...prevData.MedicalCoverage, 
        Coverage: coverage, 
      }
    }));
  };
  
  const handleCoverageNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value;
  
    setPatientData(prevData => ({
      ...prevData,
      MedicalCoverage: {
        ...prevData.MedicalCoverage,
        Number: number,
      }
    }));
  };

  const handleChangePhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
  
    setPatientData(prevData => ({
      ...prevData,
      PhoneNumber: {
        ...prevData.PhoneNumber,
        PhoneNumber: phoneNumber,
      }
    }));
  };

  const createPatient = async (patientData : Patient) => {
    const formattedPatientData = {
      ...patientData,
      BirthDate: patientData.BirthDate.toISOString()
    };

    try {
      await apiPost('/api/Patient/CreatePatient', formattedPatientData);
      navigate('/Pacientes');
    } catch (error) {
      console.error('Error al crear el paciente:', error);
    }
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors = validateForm(patientData)
    setErrors(newErrors);

    if(Object.keys(newErrors).length === 0){
      try {
        const result = await createPatient(patientData);
        console.log(result); 
      } catch (error) {
        console.error('Error en la solicitud:', error);
        if (error instanceof Response) {
          const responseBody = await error.text();
          console.error('Respuesta del servidor:', responseBody); 
        }
      }
    }
  }

  const handleClose = () => {
    navigate(-1); 
  };

    return (
        <div className="page-container" style={{backgroundColor: '#EAEAEA'}}>
          <div className="form-container">
            <form  className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label >Nombre:</label>
                <input
                  type="text"
                  id="Name"
                  name="Name"
                  value={patientData.Name}
                  onChange={handleChange}
                />
                {errors.Name && <div className="alert alert-danger p-1">
                  {errors.Name}
                </div>}
              </div>
    
              <div className="form-group">
                <label htmlFor="LastName">Apellido:</label>
                <input
                  type="text"
                  id="LastName"
                  name="LastName"
                  value={patientData.LastName}
                  onChange={handleChange}
                />
                {errors.LastName && <div className="alert alert-danger p-1">
                  {errors.LastName}
                </div>}
              </div>

              <div className="form-group">
                <label htmlFor="DNI">DNI:</label>
                <input
                  type="text"
                  id="DNI"
                  name="DNI"
                  value={patientData.DNI}
                  onChange={handleChange}
                />
                {errors.DNI && <div className="alert alert-danger p-1">
                  {errors.DNI}
                </div>}
              </div>
    
              <div className="form-group">
                <label htmlFor="BirthDate">Fecha de Nacimiento:</label>
                <input
                  type="date"
                  id="BirthDate"
                  name="BirthDate"
                  value={formatDate(patientData.BirthDate)}
                  onChange={handleDateChange}
                />
              </div>

              <div className="form-group"> 
                <label htmlFor="Country">Pais:</label>
                <input
                  type="text"
                  id="Country"
                  name="Country"
                  placeholder='Escriba el pais'
                  value={patientData.Country}
                  onChange={handleChange}
                />
              </div> 

              <div className = "mb-3">
                <div className='d-flex align-items-center form-label'>
                  <label>Cobertura</label>
                </div>
                <div className='d-flex mb-2'>
                    <div className='flex-fill'>
                      <input
                        type="text"
                        id="MedicalCoverage.Coverage"
                        name="MedicalCoverage.Coverage"
                        placeholder='Escribir cobertura y plan'
                        value={patientData.MedicalCoverage.Coverage}
                        onChange={handleCoverageChange}
                      />
                    </div>
                    <div className='flex-md-fill ms-2 position-relative'>
                      <input
                        type="text"
                        id="MedicalCoverage.Number"
                        name="MedicalCoverage.Number"
                        placeholder='Escribir el número'
                        value={patientData.MedicalCoverage.Number}
                        onChange={handleCoverageNumberChange}
                      />
                    </div>
                </div>
              </div>
              
    
              <div className="form-group">
                <label htmlFor="Email">Email:</label>
                <input
                  type="text"
                  id="Email"
                  name="Email"
                  placeholder='Direccion de Email'
                  value={patientData.Email}
                  onChange={handleChange}
                />
                {errors.Email && <div className="alert alert-danger p-1">
                  {errors.Email}
                </div>}
              </div>
    
              <div className='mb-3'>
                <div className="position-relative">
                  <div className='d-flex mb-2'>
                    <div className='flex-fill'>
                      <select className='PhoneCountry'>
                        <option value = 'AR'> Argentina </option>
                      </select>
                    </div>
                     <input
                        type="text"
                        id="phone"
                        name="phone"
                        placeholder='+54 '
                        value={patientData.PhoneNumber.PhoneNumber}
                        onChange={handleChangePhoneNumber}
                      />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="Ocupation">Ocupacion:</label>
                <input
                  type="text"
                  id="Ocupation"
                  name="Ocupation"
                  value={patientData.Ocupation}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="HomeAddress">Direccion:</label>
                <input
                  type="text"
                  id="HomeAddress"
                  name="HomeAddress"
                  value={patientData.HomeAddress}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="Note">Notas:</label>
                <input
                  type="text"
                  id="Note"
                  name="Note"
                  value={patientData.Note}
                  onChange={handleChange}
                />
              </div>
    
              <div className="form-group">
                <div className="buttons-container">
                <button type="submit" className="submit-btn">Guardar</button>
                  
                  <button type="button" className="close-btn" onClick={handleClose}>
                    Cerrar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
    );
}

export default NewPatient;