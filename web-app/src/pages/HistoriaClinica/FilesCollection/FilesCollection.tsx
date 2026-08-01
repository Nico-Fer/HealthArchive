import { FaFileDownload } from "react-icons/fa";
import { HCEFile } from "../../../Types/HCEFile";

interface Props{
    files : HCEFile[]
    onClose : () => void;
}

const FilesCollection : React.FC<Props> = ({files, onClose}) => {

    const handleDownload = (content : string , fileName : string) => {
        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return(
        <div className="hce-files">
            <div className="hce-files-header">
                <h3>Archivos</h3>
                <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
            </div>
            {files.length === 0 ? (
                <p className="text-secondary mb-0">No hay archivos cargados.</p>
            ) : (
                <ul className="hce-files-list">
                    {files.map((file) => (
                        <li key={file.id}>
                            <a href="#" onClick={(e) =>{
                                e.preventDefault();
                                handleDownload(file.content, file.fileName)
                            }}>
                                <FaFileDownload aria-hidden="true" />
                                <span className="text-truncate">{file.fileName}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default FilesCollection;