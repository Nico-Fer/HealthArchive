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
import { apiGet, apiPost } from '../../api/client';
import { clearHceDraft, readHceDraft } from '../../Functions/hceDraft';
import Spinner from '../../components/Spinner';


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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const stateRedux = useSelector((store: store) => store.Professional);

  const handleShowEvolutionForm = () => setShowEvolutionForm(true);

  const location = useLocation();
  const patient = location.state.patient;

  // Si el paciente elegido tiene un borrador sin guardar, abrimos el editor
  // automáticamente para que el médico vea el texto sin tener que clickear.
  useEffect(() => {
    if (readHceDraft(patient.DNI)) {
      setShowEvolutionForm(true);
    }
  }, [patient.DNI]);

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
      setIsLoading(true);
      const data = await apiGet<any>(`/api/Patient/GetClinicHistory/${patient.DNI}`);
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
    }finally{
      setIsLoading(false);
    }
  }

  const fetchCreateEvolution = async(evolution : Evolution) => {
    try{
      const data = await apiPost<any>(`/api/Evolution/CreateEvolution/${hce.Id}`, evolution);
      console.log(data);
    }catch(error){
      console.error('Error:', error);
      throw error; // que el llamador sepa que falló y NO limpie el borrador
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

    const newFormulario = {
      ModifiedBy: {modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
      Notes: convertJsonToHtml(formData.Notes),
      DateAdded: formData.DateAdded,
    };

    try {
      // Recién tras confirmar el guardado en el backend agregamos la evolución
      // a la vista y limpiamos el borrador. Así lista y borrador quedan
      // consistentes: nada de evoluciones "fantasma" si el POST falla.
      await fetchCreateEvolution(newEvolution);

      setHce(prevHce => ({
        ...prevHce,
        Evolutions: [...prevHce.Evolutions, newEvolutionToHtml],
      }));
      setFormularios(prev => [...prev, newFormulario]);

      clearHceDraft(patient.DNI);
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
          {isLoading ? (
            <Spinner label="Cargando historia clínica..." />
          ) : (
            formularios.map((formulario, index) => (
            <div key={index} className="formulario-agregado">
              <div className='d-flex justify-content-between align-items-center'>
                <h3>Evolución</h3>
                <p className="text-secondary mb-0 fs-6">Nro. Matricula: {formulario.ModifiedBy.tuition}</p>
              </div>
              <p><strong>Nombre del Médico:</strong> {formulario.ModifiedBy.modifiedBy}</p>
              <p><strong>Fecha:</strong> {formatDate(formulario.DateAdded)}</p>
              <div dangerouslySetInnerHTML={{ __html: formulario.Notes }} />
            </div>
            ))
          )}
        </div>
      </div>
      <div className="main-content">
        <div className="buttons-container d-flex align-items-center">
          <button className="agregar-btn" onClick={handleShowEvolutionForm}>Agregar Evolución</button>
          <AddHceFile HceId={hce.Id} onFileAdded={addNewFileToHce}/>
          <button className="agregar-btn" onClick={() => setShowPrintView(true)}>Imprimir HCE</button>
          <button className="btn text-secondary opacity-75" onClick={() => setShowFiles(true)}>VerArchivos</button>
        </div>
        {showEvolutionForm && <EvolutionForm key={patient.DNI} onAddEvolution={handleAddEvolution} onClose={() => setShowEvolutionForm(false)} patientDni={patient.DNI} />}
        {showPrintView && <PrintHCE evoluciones={hce.Evolutions} patient={patient} onClose={() => setShowPrintView(false)} />}
        {showFiles && <FilesCollection files={hce.Files} onClose={() => setShowFiles(false)} />}
      </div>
    </div>
  );
};

export default HistoriaClinica;
