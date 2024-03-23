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
import { useSelector } from 'react-redux';
import { store } from '../../Redux/Store';
import { EvolutionInfo } from '../../Types/EvolutionInfo';
import PrintHCE from './PrintHCE/PrintHCE';
import AddHceFile from './AddHCEFile/AddHCEFile';
import { HCEFile } from '../../Types/HCEFile';
import FilesCollection from './FilesCollection/FilesCollection';
import convertJsonToHtml from '../../Functions/ConvertJsonToHTML';


interface EvolutionFormData {
  Notes: string,
  ModifiedBy: EvolutionInfo,
  DateAdded: Date,
}

const HistoriaClinica = () => {

  useEffect (() => {
    fetchClinicHistory();
  }
  , []);

  const [showEvolutionForm, setShowEvolutionForm] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const [formularios, setFormularios] = useState<EvolutionFormData[]>([]);

  const stateRedux = useSelector((store: store) => store.Professional);

  const handleShowEvolutionForm = () => setShowEvolutionForm(true);

  const location = useLocation();
  const patient = location.state.patient;

  const[hce, setHce] = useState<HCE>({
    Id: '',
    PatientId: '',
    Evolutions: [],
    Files: [],
  });

  const addNewFileToHce = (newFile: HCEFile) => {
    setHce(prevHce => ({
      ...prevHce,
      Files: [...prevHce.Files, newFile],
    }));
  };

  const fetchClinicHistory = async () =>{
    try{
      const response = await fetch(`http://192.168.0.122:44392/api/Patient/GetClinicHistory/${patient.DNI}`);
      if (!response.ok) {
        throw new Error('Error al obtener la historia clinica');
      }
      const data = await response.json();
      console.log(data);

      const mappedHce ={
        Id: data.id,
        PatientId: data.patientId,
        Evolutions: data.evolutions.map((evolution : EvolutionFromApi) => ({
          Notes: convertJsonToHtml(evolution.notes),
          DateAdded: new Date(evolution.modifiedDate),
          ModifiedBy: {modifiedBy: evolution.evolutionInfo.modifiedBy, tuition: evolution.evolutionInfo.tuition}
        })),
        Files: data.files.map((file : HCEFile) => ({
          id: file.id,
          content: file.content,
          fileName: file.fileName,
          hceId: file.hceId
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
      const response = await fetch(`http://192.168.0.122:44392/api/Evolution/CreateEvolution/${hce.Id}`,{
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
      ModifiedBy:{modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
      DateAdded: new Date(),
    };

    const newEvolutionToHtml: Evolution = {
      Notes: convertJsonToHtml(formData.Notes),
      ModifiedBy:{modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
      DateAdded: new Date(),
    };

    setHce(prevHce => ({
      ...prevHce,
      Evolutions: [...prevHce.Evolutions, newEvolutionToHtml],
    }));

    const newFormulario = {
      ModifiedBy: {modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
      Notes: convertJsonToHtml(formData.Notes),
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
              <div className='d-flex justify-content-between align-items-center'>
                <h3>Evolución</h3>
                <p className="text-secondary mb-0 fs-6">Nro. Matricula: {formulario.ModifiedBy.tuition}</p>
              </div>
              <p><strong>Nombre del Médico:</strong> {formulario.ModifiedBy.modifiedBy}</p>
              <p><strong>Fecha:</strong> {formatDate(formulario.DateAdded)}</p>
              <div dangerouslySetInnerHTML={{ __html: formulario.Notes }} />
            </div>
          ))}
        </div>
      </div>
      <div className="main-content">
        <div className="buttons-container d-flex align-items-center">
          <button className="agregar-btn" onClick={handleShowEvolutionForm}>Agregar Evolución</button>
          <AddHceFile HceId={hce.Id} onFileAdded={addNewFileToHce}/>
          <button className="agregar-btn" onClick={() => setShowPrintView(true)}>Imprimir HCE</button>
          <button className="btn text-secondary opacity-75" onClick={() => setShowFiles(true)}>VerArchivos</button>
        </div>
        {showEvolutionForm && <EvolutionForm onAddEvolution={handleAddEvolution} onClose={() => setShowEvolutionForm(false)} />}
        {showPrintView && <PrintHCE evoluciones={hce.Evolutions} patient={patient} onClose={() => setShowPrintView(false)} />}
        {showFiles && <FilesCollection files={hce.Files} onClose={() => setShowFiles(false)} />}
      </div>
    </div>
  );
};

export default HistoriaClinica;
