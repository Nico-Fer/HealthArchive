import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";

import InputComponent from "../../../../components/Input";
import { useDispatch } from "react-redux";
import { createProfessionalRed } from "../../../../Redux/States/professional";
import { sessionAuthenticated } from "../../../../Redux/States/session";
import { apiFetch } from '../../../../api/client';
import logger, { describeError } from '../../../../lib/logger';

interface FormData {
  Password: string;
  Email: string;
}

const Form = () => {

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const[formData, setFormData] = useState<FormData>({
      Password: '',
      Email: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setFormData({ ...formData, [id]: value });
    };
    
    const createProffesional = async() =>{
      try {
        const response = await apiFetch('/api/AuthService/Login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
  
        if (!response.ok) {
          const errorMsg = 'Email o contraseña incorrectos'
          setErrorMessage('Email o contraseña incorrectos');
          setError(true);
          throw new Error(errorMsg);
        }
  
        const userData = await response.json();

        dispatch(createProfessionalRed(userData));
        dispatch(sessionAuthenticated());

        return true;
      } catch (error) {
        logger.error("Error al iniciar sesión", describeError(error));
        return false;
      }
    }

      const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if(await createProffesional()){
          navigate("/Pacientes");
        }
      };

    return(
        <form onSubmit={handleSubmit} className="ha-form">
          <InputComponent
             type="email"
             id="Email"
             value={formData.Email}
             onChange={handleChange}
             placeholder="nombre@clinica.com"
             label="Email"
             icon={<FaEnvelope />}
          />
          <InputComponent
            type="password"
            id="Password"
            value={formData.Password}
            onChange={handleChange}
            placeholder="Contraseña"
            label="Contraseña"
            icon={<FaLock />}
          />
          {error && <div className="alert alert-danger" role="alert">
                  {errorMessage}
                </div>}
          <button className="btn btn-primary w-100 mt-2" type="submit">Iniciar Sesión</button>
        </form>
    );
};

export default Form;