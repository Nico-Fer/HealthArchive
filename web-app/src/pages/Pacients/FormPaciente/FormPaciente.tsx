import React, { useState } from 'react';
import { Patient } from '../../../Types/Person';
import { useNavigate } from 'react-router-dom';
import { FormErrors } from '../../../Types/FormErrors';
import validateForm from '../../../Functions/validateForm';

import formatDate from '../../../Functions/FormatDate';
import { apiPatch, apiDelete } from '../../../api/client';
import ConfirmDialog from '../../../components/ConfirmDialog';

interface FormProps {
    patient: Patient; 
    onClose: () => void;
    onPatientUpdated: () => void;
  }

  const MyForm: React.FC<FormProps> = ({ patient, onClose, onPatientUpdated }) => {
    const navigate = useNavigate();
    const [errors, setErrors] = useState<FormErrors>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [actionError, setActionError] = useState<string>('');
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
      navigate('/Pacientes/HistoriaClinica', {state: {patient}})
  };

    const [originalPatientData, setOriginalFormData] = useState<Patient>({ ...patientData });
 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...patientData, [name]: value });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    const adjustedDateString = dateString + 'T00:00:00';
    const dateObject = new Date(adjustedDateString);
  
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
      // La ruta va con el DNI ORIGINAL (el del prop), no con el del formulario: si se
      // usara el editado, al cambiar el DNI se buscaría un paciente que todavía no
      // existe y el update fallaba con 404.
      await apiPatch(`/api/Patient/UpdatePatientByDni/${patient.DNI}`, formattedPatientData);
    }catch(error){
      console.error('Error al actualizar el paciente:', error)
      throw error;
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActionError('');
    setOriginalFormData({ ...patientData });
    const newErrors = validateForm(patientData)
    setErrors(newErrors);

    if(Object.keys(newErrors).length === 0){
      try {
        await updatePatient(patientData);
        onPatientUpdated();
        handleClose();
      } catch (error) {
        console.error('Error en la solicitud:', error);
        // El caso más habitual es un DNI que ya tiene otro paciente del consultorio.
        // Sin este mensaje el guardado fallaría en silencio.
        setActionError('No se pudo guardar. Revisá que el DNI no pertenezca ya a otro paciente.');
      }
    }
  };

  const deletePatient = async (dni : string) =>{
    try{
      await apiDelete(`/api/Patient/DeletePatientByDni/${dni}`);
    }catch(error){
      console.error('Error al crear el paciente:', error)
    }
}

  const handleReset = async() => {
    try{
      // El DNI original, por lo mismo que el update: si se editó el campo sin guardar,
      // patientData.DNI apunta a un paciente que no existe.
      await deletePatient(patient.DNI);
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
    <div className="ha-modal-backdrop" onClick={handleClose}>
      <div className="ha-modal" role="dialog" aria-modal="true" aria-labelledby="form-paciente-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="form-paciente-title" className="ha-modal-title">Editar Paciente</h2>
        <form onSubmit={handleSubmit} className="ha-form">
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

          <div className="ha-form-row">
            <div className="ha-form-field">
              <label htmlFor="MedicalCoverage.Coverage">Cobertura y Plan</label>
              <input
                type="text"
                className="form-control"
                id="MedicalCoverage.Coverage"
                name="MedicalCoverage.Coverage"
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
                value={patientData.MedicalCoverage.Number}
                onChange={handleCoverageNumberChange}
              />
            </div>
          </div>

          <div className="ha-form-field">
            <label htmlFor="Email">Email</label>
            <input
              type="email"
              className="form-control"
              id="Email"
              name="Email"
              value={patientData.Email}
              onChange={handleChange}
            />
            {errors.Email && <div className="ha-form-error">{errors.Email}</div>}
          </div>

          <div className="ha-form-field">
            <label htmlFor="PhoneNumber.PhoneNumber">Teléfono</label>
            <div className="phone-input">
              <span>{patientData.PhoneNumber.CountryCode}</span>
              <input
                type="tel"
                className="form-control"
                id="PhoneNumber.PhoneNumber"
                name="PhoneNumber.PhoneNumber"
                value={patientData.PhoneNumber.PhoneNumber}
                onChange={handleChangePhoneNumber}
              />
            </div>
          </div>

          {actionError && (
            <div className="ha-form-error" role="alert">{actionError}</div>
          )}

          <div className="ha-form-actions">
            <button type="submit" className="btn btn-primary" disabled={!isFormChanged()}>Guardar</button>
            <button type="button" className="btn btn-outline-primary" onClick={handleHistory}>Historia Clínica</button>
            <button type="button" className="btn btn-danger ms-auto" onClick={() => setShowDeleteConfirm(true)}>Borrar</button>
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cerrar</button>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Borrar paciente"
          message={`¿Borrar al paciente ${patientData.Name} ${patientData.LastName}? Esta acción no se puede deshacer.`}
          onConfirm={() => { setShowDeleteConfirm(false); handleReset(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};

export default MyForm;
