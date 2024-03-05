import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import PersonalInfo from './PersonalInfo';
import EvolutionForm from './FormEvolucion/FormEvolucion';
import {Patient } from '../../Types/Person';
import { HCE } from '../../Types/HCE';

import './HistoriaClinica.scss';
import { Evolution } from '../../Types/Evolution';
import { EvolutionFromApi } from '../../Types/EvolutionFromApi';

import formatDate from '../../Functions/FormatDate';


interface EvolutionFormData {
  Notes: string,
  ModifiedBy: string,
  DateAdded: Date,
}

const HistoriaClinica = () => {

  useEffect (() => {
    fetchClinicHistory();
  }
  , []);

  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [formularios, setFormularios] = useState<EvolutionFormData[]>([]);

  const handleShowEvolutionForm = () => setShowEvolutionForm(true);

  const location = useLocation();
  const patient = location.state.patient;

  //const[evolutions, setEvolutions] = useState<Evolution[]>([]);

  const[hce, setHce] = useState<HCE>({
    Id: '',
    PatientId: '',
    Evolutions: []
  });

  const fetchClinicHistory = async () =>{
    try{
      const response = await fetch(`https://localhost:44393/api/Patient/GetClinicHistory/${patient.DNI}`);
      if (!response.ok) {
        throw new Error('Error al obtener la historia clinica');
      }
      const data = await response.json();
      console.log(data);

      const mappedHce ={
        Id: data.id,
        PatientId: data.patientId,
        Evolutions: data.evolutions.map((evolution : EvolutionFromApi) => ({
          Notes: evolution.notes,
          ModifiedBy: evolution.modifiedBy,
          DateAdded: new Date(evolution.modifiedDate),
        }))
      };

      setHce(mappedHce);
      console.log(mappedHce);

      setFormularios(mappedHce.Evolutions);
    }catch (error){
      console.error('Error:', error);
    }
  }

  const fetchCreateEvolution = async(evolution : Evolution) => {
    try{
      const response = await fetch(`https://localhost:44393/api/Evolution/CreateEvolution/${hce.Id}`,{
      method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(evolution),
      })
      if (!response.ok) {
        throw new Error('Error al obtener las evoluciones');
      }

      const data = await response.json();
      console.log(data);

    }catch(error){
      console.error('Error:', error);
    }
  }

  const handleAddEvolution = async (formData: EvolutionFormData) => {
    const newEvolution: Evolution = {
      Notes: formData.Notes,
      ModifiedBy: formData.ModifiedBy,
    };

    const newFormulario = {
      ModifiedBy: formData.ModifiedBy,
      Notes: formData.Notes,
      DateAdded: formData.DateAdded,
    };
    setFormularios([...formularios, newFormulario]);

    try {
      await fetchCreateEvolution(newEvolution);
      console.log('Evolución agregada exitosamente');
    } catch (error) {
      console.error('Error al agregar la evolución:', error);
    }
  };


  return (
    <div className="historia-clinica-container">
      <div className="sidebar">
        <PersonalInfo patient={patient} />
        <div className="formularios-agregados">
          {formularios.map((formulario, index) => (
            <div key={index} className="formulario-agregado">
              <h3>Evolución</h3>
              <p><strong>Nombre del Médico:</strong> {formulario.ModifiedBy}</p>
              <p><strong>Fecha:</strong> {formatDate(formulario.DateAdded)}</p>
              <p><strong>Texto del Formulario:</strong> {formulario.Notes}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="main-content">
        <div className="buttons-container">
          <button className="agregar-btn" onClick={handleShowEvolutionForm}>Agregar Evolución</button>
          <button className="agregar-btn" onClick={() => setShowFileUploader(true)}>Agregar Archivo</button>
        </div>
        {showEvolutionForm && <EvolutionForm onAddEvolution={handleAddEvolution} onClose={() => setShowEvolutionForm(false)} />}
      </div>
    </div>
  );
};

export default HistoriaClinica;
