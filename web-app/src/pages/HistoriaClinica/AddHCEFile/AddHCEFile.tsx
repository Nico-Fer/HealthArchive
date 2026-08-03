import React, { useState, useRef } from "react";
import { apiPostFile } from '../../../api/client';
import { HCEFile } from "../../../Types/HCEFile";
import logger, { describeError } from '../../../lib/logger';

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
        onFileAdded(result);
    }catch(error){
        logger.error('No se pudo subir el archivo', describeError(error));
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
            <button className="btn btn-soft-primary" onClick={handleButtonClick}>Agregar Archivo</button>
        </div>
    );
}

export default AddHceFile;