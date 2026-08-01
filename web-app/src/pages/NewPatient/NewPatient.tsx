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
        await createPatient(patientData);
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
        <div className="ha-page">
          <div className="new-patient ha-card">
            <h1 className="new-patient-title">Nuevo Paciente</h1>
            <form className="ha-form" onSubmit={handleSubmit}>
              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="Name">Nombre</label>
                  <input
                    type="text"
                    className="form-control"
                    id="Name"
                    name="Name"
                    value={patientData.Name}
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
                    value={patientData.LastName}
                    onChange={handleChange}
                  />
                  {errors.LastName && <div className="ha-form-error">{errors.LastName}</div>}
                </div>
              </div>

              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="DNI">DNI</label>
                  <input
                    type="text"
                    className="form-control"
                    id="DNI"
                    name="DNI"
                    value={patientData.DNI}
                    onChange={handleChange}
                  />
                  {errors.DNI && <div className="ha-form-error">{errors.DNI}</div>}
                </div>

                <div className="ha-form-field">
                  <label htmlFor="BirthDate">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    className="form-control"
                    id="BirthDate"
                    name="BirthDate"
                    value={formatDate(patientData.BirthDate)}
                    onChange={handleDateChange}
                  />
                </div>
              </div>

              <div className="ha-form-field">
                <label htmlFor="Country">País</label>
                <input
                  type="text"
                  className="form-control"
                  id="Country"
                  name="Country"
                  placeholder='Escriba el país'
                  value={patientData.Country}
                  onChange={handleChange}
                />
              </div>

              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="MedicalCoverage.Coverage">Cobertura y Plan</label>
                  <input
                    type="text"
                    className="form-control"
                    id="MedicalCoverage.Coverage"
                    name="MedicalCoverage.Coverage"
                    placeholder='Escribir cobertura y plan'
                    value={patientData.MedicalCoverage.Coverage}
                    onChange={handleCoverageChange}
                  />
                </div>
                <div className="ha-form-field">
                  <label htmlFor="MedicalCoverage.Number">Nro. de Cobertura</label>
                  <input
                    type="text"
                    className="form-control"
                    id="MedicalCoverage.Number"
                    name="MedicalCoverage.Number"
                    placeholder='Escribir el número'
                    value={patientData.MedicalCoverage.Number}
                    onChange={handleCoverageNumberChange}
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
                  placeholder='Dirección de Email'
                  value={patientData.Email}
                  onChange={handleChange}
                />
                {errors.Email && <div className="ha-form-error">{errors.Email}</div>}
              </div>

              <div className="ha-form-field">
                <label htmlFor="phone">Teléfono</label>
                <div className="phone-input">
                  <select className="form-select flex-grow-0 w-auto" aria-label="País del teléfono">
                    <option value='AR'>Argentina (+54)</option>
                  </select>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    placeholder='11 5000 0000'
                    value={patientData.PhoneNumber.PhoneNumber}
                    onChange={handleChangePhoneNumber}
                  />
                </div>
              </div>

              <div className="ha-form-row">
                <div className="ha-form-field">
                  <label htmlFor="Ocupation">Ocupación</label>
                  <input
                    type="text"
                    className="form-control"
                    id="Ocupation"
                    name="Ocupation"
                    value={patientData.Ocupation}
                    onChange={handleChange}
                  />
                </div>

                <div className="ha-form-field">
                  <label htmlFor="HomeAddress">Dirección</label>
                  <input
                    type="text"
                    className="form-control"
                    id="HomeAddress"
                    name="HomeAddress"
                    value={patientData.HomeAddress}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="ha-form-field">
                <label htmlFor="Note">Notas</label>
                <input
                  type="text"
                  className="form-control"
                  id="Note"
                  name="Note"
                  value={patientData.Note}
                  onChange={handleChange}
                />
              </div>

              <div className="ha-form-actions">
                <button type="submit" className="btn btn-primary">Guardar</button>
                <button type="button" className="btn btn-ghost" onClick={handleClose}>
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
    );
}

export default NewPatient;