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
import { apiGet, apiPost, apiPatch } from '../../api/client';
import { clearHceDraft, readHceDraft } from '../../Functions/hceDraft';
import Spinner from '../../components/Spinner';
import SideNav from './SideNav';


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

  // Tipado como Evolution (y no EvolutionFormData) porque necesita el Id y el JSON
  // crudo para poder editar cada entrada.
  const [formularios, setFormularios] = useState<Evolution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingEvolution, setEditingEvolution] = useState<Evolution | null>(null);

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

      const mappedHce ={
        Id: data.id,
        PatientId: data.patientId,
        Evolutions: data.evolutions.map((evolution : EvolutionFromApi) => ({
          Id: evolution.id,
          Notes: convertJsonToHtml(evolution.notes),
          NotesRaw: evolution.notes,
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

      setFormularios(mappedHce.Evolutions);
    }catch (error){
      console.error('Error:', error);
    }finally{
      setIsLoading(false);
    }
  }

  // Devuelve la evolución creada tal cual la persistió el backend: de ahí sale el Id,
  // que hace falta para poder editarla sin recargar la página.
  const fetchCreateEvolution = async(evolution : Evolution) => {
    try{
      return await apiPost<any>(`/api/Evolution/CreateEvolution/${hce.Id}`, evolution);
    }catch(error){
      console.error('Error:', error);
      throw error; // que el llamador sepa que falló y NO limpie el borrador
    }
  }

  const fetchUpdateEvolution = async(evolutionId : string, notes : string) => {
    try{
      await apiPatch(`/api/Evolution/UpdateEvolution/${evolutionId}`, { Notes: notes });
    }catch(error){
      console.error('Error al editar la evolución:', error);
      throw error;
    }
  }

  const handleAddEvolution = async (formData: EvolutionFormData) => {

    const newEvolution: Evolution = {
      Notes: formData.Notes,
      ModifiedBy:{modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
      DateAdded: new Date(),
    };

    try {
      // Recién tras confirmar el guardado en el backend agregamos la evolución
      // a la vista y limpiamos el borrador. Así lista y borrador quedan
      // consistentes: nada de evoluciones "fantasma" si el POST falla.
      const creada = await fetchCreateEvolution(newEvolution);

      const nuevaEnLista: Evolution = {
        Id: creada?.id,
        Notes: convertJsonToHtml(formData.Notes),
        NotesRaw: formData.Notes,
        // La firma la pone el backend con el doctor autenticado; acá se replica solo
        // para mostrarla sin tener que recargar.
        ModifiedBy: {modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
        DateAdded: formData.DateAdded,
      };

      setHce(prevHce => ({
        ...prevHce,
        Evolutions: [...prevHce.Evolutions, nuevaEnLista],
      }));
      setFormularios(prev => [...prev, nuevaEnLista]);

      clearHceDraft(patient.DNI);
    } catch (error) {
      console.error('Error al agregar la evolución:', error);
    }
  };

  const handleUpdateEvolution = async (formData: EvolutionFormData) => {
    if (!editingEvolution?.Id) return;

    try {
      await fetchUpdateEvolution(editingEvolution.Id, formData.Notes);

      const actualizada: Evolution = {
        ...editingEvolution,
        Notes: convertJsonToHtml(formData.Notes),
        NotesRaw: formData.Notes,
        ModifiedBy: {modifiedBy: stateRedux.name + ' ' + stateRedux.lastName, tuition: stateRedux.tuition},
        DateAdded: new Date(),
      };

      const reemplazar = (lista: Evolution[]) =>
        lista.map(e => (e.Id === editingEvolution.Id ? actualizada : e));

      setHce(prevHce => ({ ...prevHce, Evolutions: reemplazar(prevHce.Evolutions) }));
      setFormularios(reemplazar);
      setEditingEvolution(null);
    } catch (error) {
      console.error('Error al editar la evolución:', error);
    }
  };


  return (
    <div className="hce-layout">
      <SideNav />
      <div className="hce-content">
        <div className="hce-header">
          <h1 className="ha-page-title">Historia Clínica</h1>
          <div className="hce-actions d-print-none">
            <button className="btn btn-primary" onClick={handleShowEvolutionForm}>Agregar Evolución</button>
            <AddHceFile HceId={hce.Id} onFileAdded={addNewFileToHce}/>
            <button className="btn btn-soft-primary" onClick={() => setShowPrintView(true)}>Imprimir HCE</button>
            <button className="btn btn-soft-primary" onClick={() => setShowFiles(true)}>Ver Archivos</button>
          </div>
        </div>

        <div className="hce-grid">
          <PersonalInfo patient={patient} />

          <div className="hce-evolutions ha-card">
            <h2 className="hce-evolutions-title">Evoluciones Clínicas</h2>

            {showEvolutionForm && <EvolutionForm key={patient.DNI} onAddEvolution={handleAddEvolution} onClose={() => setShowEvolutionForm(false)} patientDni={patient.DNI} />}
            {editingEvolution && (
              <EvolutionForm
                key={`edit-${editingEvolution.Id}`}
                onAddEvolution={handleUpdateEvolution}
                onClose={() => setEditingEvolution(null)}
                patientDni={patient.DNI}
                initialNotes={editingEvolution.NotesRaw ?? ''}
              />
            )}
            {showFiles && <FilesCollection files={hce.Files} onClose={() => setShowFiles(false)} />}
            {showPrintView && <PrintHCE evoluciones={hce.Evolutions} patient={patient} onClose={() => setShowPrintView(false)} />}

            {isLoading ? (
              <Spinner label="Cargando historia clínica..." />
            ) : formularios.length === 0 ? (
              <p className="text-secondary mb-0">Todavía no hay evoluciones cargadas.</p>
            ) : (
              formularios.map((formulario, index) => (
              <div key={formulario.Id ?? index} className="hce-evolution">
                <div className="hce-evolution-meta">
                  <span className="hce-evolution-date">Fecha: {formatDate(formulario.DateAdded)}</span>
                  <span className="hce-evolution-doctor">
                    <span>Médico: {formulario.ModifiedBy.modifiedBy}</span>
                    <span>Matrícula: {formulario.ModifiedBy.tuition}</span>
                  </span>
                </div>
                <div className="hce-evolution-note" dangerouslySetInnerHTML={{ __html: formulario.Notes }} />
                {formulario.Id && (
                  <div className="hce-evolution-actions d-print-none">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingEvolution(formulario)}
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoriaClinica;
