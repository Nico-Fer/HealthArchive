import { useState } from 'react';
import { Patient } from '../../Types/Person';
import { useNavigate } from 'react-router-dom';
import { FormErrors } from '../../Types/FormErrors';

import validateForm from '../../Functions/validateForm';
import { toLocalDate, today } from '../../Functions/DateUtils';
import { apiPost } from '../../api/client';
import DateField from '../../components/DateField';
import logger, { describeError } from '../../lib/logger';


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
      BirthDate: null,
      Note: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setPatientData(prevData => ({
          ...prevData,
          [name]: value,
      }));
  };

  const handleDateChange = (date: Date | null) => {
    setPatientData(prevData => ({
      ...prevData,
      BirthDate: date
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
      // toLocalDate normaliza a medianoche local antes de serializar, así el día que
      // eligió el usuario es el que se guarda.
      BirthDate: toLocalDate(patientData.BirthDate)?.toISOString() ?? null
    };

    await apiPost('/api/Patient/CreatePatient', formattedPatientData);
    navigate('/Pacientes');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newErrors = validateForm(patientData)
    setErrors(newErrors);

    if(Object.keys(newErrors).length === 0){
      try {
        await createPatient(patientData);
      } catch (error) {
        logger.error('Error al crear el paciente', describeError(error));
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
                  <DateField
                    id="BirthDate"
                    label="Fecha de Nacimiento"
                    value={patientData.BirthDate}
                    onChange={handleDateChange}
                    maxDate={today()}
                    error={errors.BirthDate}
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