import React, { useState, useRef } from "react";
import { apiPostFile } from '../../../api/client';
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
        const result = await apiPostFile<HCEFile>(`/api/Hce/AddFile/${HceId}`, formData);
        console.log("Archivo cargado con éxito:", result);
        onFileAdded(result);
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