import { useState } from "react";
import { FaFileDownload, FaTrash } from "react-icons/fa";
import { HCEFile } from "../../../Types/HCEFile";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { apiGetBlob } from "../../../api/client";
import logger, { describeError } from "../../../lib/logger";

interface Props{
    files : HCEFile[]
    onClose : () => void;
    /** Borra el archivo en el backend. Tira si falla, para poder avisar acá. */
    onDeleteFile : (fileId : string) => Promise<void>;
}

const FilesCollection : React.FC<Props> = ({files, onClose, onDeleteFile}) => {

    // El archivo pendiente de confirmación. Se guarda entero (y no solo el id) porque el
    // diálogo muestra el nombre: borrar un adjunto de una historia clínica no se pregunta
    // con un "¿estás seguro?" genérico.
    const [fileToDelete, setFileToDelete] = useState<HCEFile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string>('');
    // Evita el doble click mientras el archivo baja del servidor.
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // El contenido ya no viene en el JSON de la HCE: se pide a demanda, y el backend
    // valida ahí la pertenencia al consultorio antes de servirlo.
    const handleDownload = async (file: HCEFile) => {
        if (downloadingId) return;

        setDownloadingId(file.id);
        setError('');
        try {
            const blob = await apiGetBlob(`/api/Hce/DownloadFile/${file.id}`);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            logger.error('No se pudo descargar el archivo', describeError(e));
            setError('No se pudo descargar el archivo. Intente nuevamente.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete || isDeleting) return;

        setIsDeleting(true);
        setError('');
        try {
            await onDeleteFile(fileToDelete.id);
            setFileToDelete(null);
        } catch {
            // El detalle ya lo loguea HistoriaClinica; acá solo hace falta que el médico
            // vea que el archivo sigue estando.
            setError('No se pudo borrar el archivo. Intente nuevamente.');
        } finally {
            setIsDeleting(false);
        }
    };

    return(
        <div className="hce-files">
            <div className="hce-files-header">
                <h3>Archivos</h3>
                <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
            {error && <div className="hce-files-error" role="alert">{error}</div>}
            {files.length === 0 ? (
                <p className="text-secondary mb-0">No hay archivos cargados.</p>
            ) : (
                <ul className="hce-files-list">
                    {files.map((file) => (
                        <li key={file.id}>
                            <a href="#" onClick={(e) =>{
                                e.preventDefault();
                                handleDownload(file)
                            }}>
                                <FaFileDownload aria-hidden="true" />
                                <span className="text-truncate">{file.fileName}</span>
                            </a>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm hce-files-delete"
                                aria-label={`Borrar ${file.fileName}`}
                                onClick={() => { setError(''); setFileToDelete(file); }}
                            >
                                <FaTrash aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {fileToDelete && (
                <ConfirmDialog
                    title="Borrar archivo"
                    message={`Se va a borrar "${fileToDelete.fileName}" de la historia clínica. Esta acción no se puede deshacer.`}
                    confirmLabel={isDeleting ? 'Borrando...' : 'Borrar'}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => { if (!isDeleting) setFileToDelete(null); }}
                />
            )}
        </div>
    );
}

export default FilesCollection;
