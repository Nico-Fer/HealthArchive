import { useState } from "react";
import { useRef } from "react";
import { HCEFile } from "../../../Types/HCEFile";

interface AddFileProps {
    HceId: string;
    onFileAdded: (newFile : HCEFile) => void
}

const AddHceFile: React.FC<AddFileProps> = ({ HceId, onFileAdded }) => {

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (file) {
      await handleUpload(file);
    }
  }

  const handleUpload = async (file : File) => {
    if (!file) {
      alert('Por favor, seleccione un archivo primero.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try{
        const response = await fetch(`http://192.168.0.122:44392/api/Hce/AddFile/${HceId}`, {
        method: 'POST',
        body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            console.log("Archivo cargado con éxito:", result);
            onFileAdded(result);
        } else {
            throw new Error('No se pudo cargar el archivo');
        }

    }catch(error){
        console.error("Error al cargar el archivo:", error);
    }
    
  }

    return(
        <div>
            <input
                type="file"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileSelect}
            />
            <button className="agregar-btn" onClick={handleButtonClick}>Agregar Archivo</button>
        </div>
    );
}

export default AddHceFile;