import React, { useState } from 'react';
import PersonalInfo from './PersonalInfo';
import EvolutionForm from './FormEvolucion/FormEvolucion';
import PrescriptionForm from './FormReceta/FormReceta';
import TreatmentForm from './FormTratamiento/FormTratamiento';
import MyForm from './FormPaciente/FormPaciente';

import './HistoriaClinica.scss';

interface PacienteData {
  name: string;
  lastName: string;
  email: string;
  phoneNumber: {
    CountryCode: string;
    PhoneNumber: string;
  };
  medicalCoverage: {
    Number: string;
    Coverage: string;
  };
  dni: string;
}

interface EvolutionFormData {
  fecha: string;
  nombreMedico: {
    nombreDoctor: string;
    apellidoDoctor: string;
  };
  matriculaDoctor: string;
  texto: string;
}

interface PrescriptionFormData {
  fecha: string;
  nombreMedico: {
    nombreDoctor: string;
    apellidoDoctor: string;
  };
  matriculaDoctor: string;
  texto: string;
}

interface TreatmentFormData {
  fecha: string;
  nombreMedico: {
    nombreDoctor: string;
    apellidoDoctor: string;
  };
  matriculaDoctor: string;
  texto: string;
}

const HistoriaClinica = () => {
  const [showForm, setShowForm] = useState(false);
  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [formularios, setFormularios] = useState<any[]>([]);

  const handleShowEvolutionForm = () => setShowEvolutionForm(true);
  const handleShowPrescriptionForm = () => setShowPrescriptionForm(true);
  const handleShowTreatmentForm = () => setShowTreatmentForm(true);

  const handleAddEvolution = (formData: EvolutionFormData) => {
    const newFormulario = {
      tipo: 'Evolución',
      nombreMedico: formData.nombreMedico,
      fecha: formData.fecha,
      texto: formData.texto,
    };
    setFormularios([...formularios, newFormulario]);
  };

  const handleAddPrescription = (formData: PrescriptionFormData) => {
    const newFormulario = {
      tipo: 'Receta',
      nombreMedico: formData.nombreMedico,
      fecha: formData.fecha,
      texto: formData.texto,
    };
    setFormularios([...formularios, newFormulario]);
  };

  const handleAddTreatment = (formData: TreatmentFormData) => {
    const newFormulario = {
      tipo: 'Tratamiento',
      nombreMedico: formData.nombreMedico,
      fecha: formData.fecha,
      texto: formData.texto,
    };
    setFormularios([...formularios, newFormulario]);
  };

  const [patient, setPatient] = useState<PacienteData>({
    name: '',
    lastName: '',
    email: '',
    phoneNumber: {
      CountryCode: ' ',
      PhoneNumber: ' ',
    },
    medicalCoverage: {
      Number: '',
      Coverage: '',
    },
    dni: '',
  });

  const handleShowForm = () => {
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  return (
    <div className="historia-clinica-container">
      <div className="sidebar">
        <PersonalInfo patient={patient} onNameClick={handleShowForm} />
        <div className="formularios-agregados">
          {formularios.map((formulario, index) => (
            <div key={index} className="formulario-agregado">
              <h3>{formulario.tipo}</h3>
              <p><strong>Nombre del Médico:</strong> {formulario.nombreMedico.nombreDoctor} {formulario.nombreMedico.apellidoDoctor}</p>
              <p><strong>Fecha:</strong> {formulario.fecha}</p>
              <p><strong>Texto del Formulario:</strong> {formulario.texto}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="main-content">
        {showForm && <MyForm patient={patient} onClose={handleCloseForm} />}
        <div className="buttons-container">
          <button className="agregar-btn" onClick={handleShowEvolutionForm}>Agregar Evolución</button>
          <button className="agregar-btn" onClick={handleShowPrescriptionForm}>Agregar Receta</button>
          <button className="agregar-btn" onClick={handleShowTreatmentForm}>Agregar Tratamiento</button>
          <button className="agregar-btn" onClick={() => setShowFileUploader(true)}>Agregar Archivo</button>
        </div>
        {showEvolutionForm && <EvolutionForm onAddEvolution={handleAddEvolution} onClose={() => setShowEvolutionForm(false)} />}
        {showPrescriptionForm && <PrescriptionForm onAddReceta={handleAddPrescription} onClose={() => setShowPrescriptionForm(false)} />}
        {showTreatmentForm && <TreatmentForm onAddTratamiento={handleAddTreatment} onClose={() => setShowTreatmentForm(false)} />}
      </div>
    </div>
  );
};

export default HistoriaClinica;
