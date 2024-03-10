import React, { useState } from 'react';
import './FormPaciente.scss'; 
import { Patient } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';
import { FormErrors } from '../../../Types/FormErrors';
import validateForm from '../../../Functions/validateForm';

import formatDate from '../../../Functions/FormatDate';

interface FormProps {
    patient: Patient; 
    onClose: () => void;
    onPatientUpdated: () => void;
  }

  const MyForm: React.FC<FormProps> = ({ patient, onClose, onPatientUpdated }) => {
    const navigate = useNavigate();
    const [errors, setErrors] = useState<FormErrors>({});
    let dateChanged = false;

    const [patientData, setFormData] = useState<Patient>({
      Name: patient.Name,
      LastName: patient.LastName,
      BirthDate: patient.BirthDate,
      Email: patient.Email,
      PhoneNumber:{CountryCode: patient.PhoneNumber.CountryCode, PhoneNumber: patient.PhoneNumber.PhoneNumber}, 
      MedicalCoverage:{Coverage: patient.MedicalCoverage.Coverage, Number: patient.MedicalCoverage.Number},
      DNI:patient.DNI,
      Country:patient.Country,
      Ocupation:patient.Ocupation,
      HomeAddress:patient.HomeAddress,
      Note:patient.Note,
    });

    const handleHistory = () => {
      // Lógica para redirigir a la página de Historia Clínica
      console.log('Navegando a Historia Clínica');
      navigate('/Pacientes/HistoriaClinica', {state: {patient}})
  };

    const [originalPatientData, setOriginalFormData] = useState<Patient>({ ...patientData });
 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...patientData, [name]: value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    const dateObject = new Date(dateString);
  
    setFormData(prevData => ({
      ...prevData,
      BirthDate: dateObject
    }));

    dateChanged = true;
  };

  const handleCoverageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const coverage = e.target.value;
  
    setFormData(prevData => ({
      ...prevData,
      MedicalCoverage: {
        ...prevData.MedicalCoverage, 
        Coverage: coverage, 
      }
    }));
  };
  
  const handleCoverageNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value;
  
    setFormData(prevData => ({
      ...prevData,
      MedicalCoverage: {
        ...prevData.MedicalCoverage,
        Number: number,
      }
    }));
  };

  const handleChangePhoneNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;
  
    setFormData(prevData => ({
      ...prevData,
      PhoneNumber: {
        ...prevData.PhoneNumber,
        PhoneNumber: phoneNumber,
      }
    }));
  };

  const updatePatient = async(patientData : Patient) =>{
    let formattedPatientData;
    if(dateChanged){
      formattedPatientData = {
        ...patientData,
        BirthDate: patientData.BirthDate.toISOString()
      };
    }else{
      formattedPatientData = {
        ...patientData,
      };
    }

    try{
      const response = await fetch( `https://localhost:44393/api/Patient/UpdatePatientByDni/${formattedPatientData.DNI}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(formattedPatientData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    }catch(error){
      console.error('Error al actualizar el paciente:', error)
    }  
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOriginalFormData({ ...patientData });
    const newErrors = validateForm(patientData)
    setErrors(newErrors);

    if(Object.keys(newErrors).length === 0){
      try {
        const result = await updatePatient(patientData);
        console.log(result);
        onPatientUpdated();
        handleClose();
      } catch (error) {
        console.error('Error en la solicitud:', error);
        if (error instanceof Response) {
          const responseBody = await error.text();
          console.error('Respuesta del servidor:', responseBody); 
        }
      }
    }
  };

  const deletePatient = async (dni : string) =>{
    try{
      const response = await fetch( `https://localhost:44393/api/Patient/DeletePatientByDni/${dni}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

    }catch(error){
      console.error('Error al crear el paciente:', error)
    }  
}

  const handleReset = async() => {
    try{
      const result = await deletePatient(patientData.DNI);
      console.log(result);
      onPatientUpdated();
      handleClose();
    }catch(error){
      console.error('Error en la solicitud:', error);
      if (error instanceof Response) {
        const responseBody = await error.text();
        console.error('Respuesta del servidor:', responseBody); 
      }
    }
  };

  const isFormChanged = (): boolean => {
    return JSON.stringify(patientData) !== JSON.stringify(originalPatientData);
  };

  

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="page-container">
      <div className="form-container">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="Name">Nombre:</label>
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
          <label htmlFor="MedicalCoverage.Coverage">Cobertura y Plan:</label>
          <input
            type="text"
            id="MedicalCoverage.Coverage"
            name="MedicalCoverage.Coverage"
            value={patientData.MedicalCoverage.Coverage}
            onChange={handleCoverageChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="MedicalCoverage.Number"></label>
          <input
            type="text"
            id="MedicalCoverage.Number"
            name="MedicalCoverage.Number"
            value={patientData.MedicalCoverage.Number}
            onChange={handleCoverageNumberChange}
          />
        </div>

          <div className="form-group">
            <label htmlFor="Email">Email:</label>
            <input
              type="email"
              id="Email"
              name="Email"
              value={patientData.Email}
              onChange={handleChange}
            />
            {errors.Email && <div className="alert alert-danger p-1">
                  {errors.Email}
                </div>}
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono:</label>
            <div className="phone-input">
              <span>{patientData.PhoneNumber.CountryCode}</span>
              <input
                type="tel"
                id="PhoneNumber.PhoneNumber"
                name="PhoneNumber.PhoneNumber"
                value={patientData.PhoneNumber.PhoneNumber}
                onChange={handleChangePhoneNumber}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="buttons-container">
            <button type="submit" className="submit-btn" disabled={!isFormChanged()}>Guardar</button>
              <button type="button" className="delete-btn" onClick={handleReset}>Borrar</button>
              
              <button className="history-btn" onClick={handleHistory}>Historia Clínica</button>
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
