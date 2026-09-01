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
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '../../api/client';
import { clearHceDraft, readHceDraft } from '../../Functions/hceDraft';
import { parseApiTimestamp } from '../../Functions/DateUtils';
import Spinner from '../../components/Spinner';
import logger, { describeError } from '../../lib/logger';


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
  const [evolutionError, setEvolutionError] = useState<string>('');

  const stateRedux = useSelector((store: store) => store.Professional);

  const handleShowEvolutionForm = () => setShowEvolutionForm(true);

  /**
   * Solo el autor puede editar su evolución. Es únicamente para no ofrecer un botón que
   * va a dar 403: la regla la impone el backend, que es donde no se puede esquivar.
   * Sin id del doctor (sesión vieja en localStorage) no se ofrece editar nada.
   */
  const puedeEditar = (evolucion: Evolution) =>
    Boolean(evolucion.Id && stateRedux.id && evolucion.CreatedByDoctorId === stateRedux.id);

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
        Evolutions: (data.evolutions as EvolutionFromApi[])
          .map((evolution : EvolutionFromApi) : Evolution => ({
            Id: evolution.id,
            Notes: convertJsonToHtml(evolution.notes),
            NotesRaw: evolution.notes,
            CreatedByDoctorId: evolution.createdByDoctorId,
            DateAdded: parseApiTimestamp(evolution.createdDate),
            // El backend crea las dos fechas con el mismo valor, así que mientras sean
            // iguales la evolución nunca se editó y no hay nada que mostrar.
            EditedDate: evolution.modifiedDate !== evolution.createdDate
              ? parseApiTimestamp(evolution.modifiedDate)
              : null,
            ModifiedBy: {modifiedBy: evolution.evolutionInfo.modifiedBy, tuition: evolution.evolutionInfo.tuition}
          }))
          // Orden explícito: ahora que la fecha de alta y la de edición son distintas, el
          // orden en que EF devuelve las filas deja de alcanzar para leerlas cronológicamente.
          .sort((a: Evolution, b: Evolution) => a.DateAdded.getTime() - b.DateAdded.getTime()),
        Files: data.files.map((file : HCEFile) => ({
          id: file.id,
          fileName: file.fileName,
          hceId: file.hceId,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes
        }))
      };

      setHce(mappedHce);

      setFormularios(mappedHce.Evolutions);
    }catch (error){
      logger.error('No se pudo cargar la historia clínica', describeError(error));
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
      logger.error('No se pudo crear la evolución', describeError(error));
      throw error; // que el llamador sepa que falló y NO limpie el borrador
    }
  }

  const fetchUpdateEvolution = async(evolutionId : string, notes : string) => {
    try{
      await apiPatch(`/api/Evolution/UpdateEvolution/${evolutionId}`, { Notes: notes });
    }catch(error){
      logger.error('No se pudo editar la evolución', describeError(error));
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
        // El autor tiene que venir del backend: sin esto, el médico que la acaba de
        // escribir no vería el botón de editar hasta recargar la página.
        CreatedByDoctorId: creada?.createdByDoctorId ?? stateRedux.id,
        DateAdded: creada?.createdDate ? parseApiTimestamp(creada.createdDate) : formData.DateAdded,
        EditedDate: null,
      };

      setHce(prevHce => ({
        ...prevHce,
        Evolutions: [...prevHce.Evolutions, nuevaEnLista],
      }));
      setFormularios(prev => [...prev, nuevaEnLista]);

      clearHceDraft(patient.DNI);
    } catch (error) {
      logger.error('No se pudo agregar la evolución', describeError(error));
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
        // La firma y la fecha de alta NO se tocan: son del autor original y editar no las
        // cambia. Lo único que avanza es la fecha de edición.
        EditedDate: new Date(),
      };

      const reemplazar = (lista: Evolution[]) =>
        lista.map(e => (e.Id === editingEvolution.Id ? actualizada : e));

      setHce(prevHce => ({ ...prevHce, Evolutions: reemplazar(prevHce.Evolutions) }));
      setFormularios(reemplazar);
      setEditingEvolution(null);
      setEvolutionError('');
    } catch (error) {
      // El backend responde 403 con slug cuando el que edita no es el autor. Sin esto el
      // médico veía que "no pasaba nada" y el motivo quedaba solo en la consola.
      const esDeOtroAutor = error instanceof ApiError && error.slug === 'not_evolution_author';
      setEvolutionError(esDeOtroAutor
        ? 'Solo el profesional que creó la evolución puede modificarla.'
        : 'No se pudo guardar la evolución. Intente nuevamente.');
      logger.error('No se pudo guardar la evolución editada', describeError(error));
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await apiDelete(`/api/Hce/DeleteFile/${fileId}`);
      setHce(prevHce => ({
        ...prevHce,
        Files: prevHce.Files.filter(f => f.id !== fileId),
      }));
    } catch (error) {
      logger.error('No se pudo borrar el archivo', describeError(error));
      throw error; // que FilesCollection sepa que falló y avise
    }
  };


  return (
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
        {/* Columna principal de lectura: la ficha del paciente y, debajo, sus evoluciones. */}
        <div className="hce-aside">
          <PersonalInfo patient={patient} />

          <div className="hce-evolutions ha-card">
            <h2 className="hce-evolutions-title">Evoluciones Clínicas</h2>

            {evolutionError && (
              <div className="hce-evolution-error" role="alert">{evolutionError}</div>
            )}

            {isLoading ? (
              <Spinner label="Cargando historia clínica..." />
            ) : formularios.length === 0 ? (
              <p className="text-secondary mb-0">Todavía no hay evoluciones cargadas.</p>
            ) : (
              formularios.map((formulario, index) => (
              <div key={formulario.Id ?? index} className="hce-evolution">
                <div className="hce-evolution-meta">
                  <span className="hce-evolution-dates">
                    <span className="hce-evolution-date">Creada: {formatDate(formulario.DateAdded)}</span>
                    {formulario.EditedDate && (
                      <span className="hce-evolution-edited">Editada: {formatDate(formulario.EditedDate)}</span>
                    )}
                  </span>
                  <span className="hce-evolution-doctor">
                    <span>Médico: {formulario.ModifiedBy.modifiedBy}</span>
                    <span>Matrícula: {formulario.ModifiedBy.tuition}</span>
                  </span>
                </div>
                {/* translate="no": el auto-traductor del browser reescribe siglas médicas
                    (BIRD -> "pájaro"). Ver también el meta notranslate de index.html. */}
                <div
                  className="hce-evolution-note notranslate"
                  translate="no"
                  dangerouslySetInnerHTML={{ __html: formulario.Notes }}
                />
                {puedeEditar(formulario) && (
                  <div className="hce-evolution-actions d-print-none">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEvolutionError(''); setEditingEvolution(formulario); }}
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

        {/* Columna de trabajo: el editor y los paneles de archivos/impresión. */}
        <div className="hce-main">
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
          {showFiles && <FilesCollection files={hce.Files} onClose={() => setShowFiles(false)} onDeleteFile={handleDeleteFile} />}
          {showPrintView && <PrintHCE evoluciones={hce.Evolutions} patient={patient} onClose={() => setShowPrintView(false)} />}

          {!showEvolutionForm && !editingEvolution && !showFiles && !showPrintView && (
            <p className="hce-main-empty text-secondary">
              Usá los botones de arriba para agregar una evolución, subir un archivo o imprimir la historia.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoriaClinica;
