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
        <div className="bg-light">
            <div className="px-3 text-center bg-light border-top">
                <small className="font-small-caps fw-bold">Archivos Anteriores</small>
            </div>
            <div className="d-flex flex-column">
                <div className="position-relative border-top">
                    <div className="d-flex justify-content-between align-items-center gap-2 p-3 bg-white">
                        <div className="d-flex align-items-center gap-2">
                            <ul>
                                {files.map((file) => (
                                    <li key={file.id}>
                                        <a href="#" className="text-truncate" onClick={(e) =>{
                                            e.preventDefault();
                                            handleDownload(file.content, file.fileName)
                                        }}>{file.fileName}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <button className="close-btn d-flex flex-column mb-4" onClick={onClose} style={{color: 'red', background: 'none'}}>Cerrar</button>
        </div>
    );
}

export default FilesCollection;