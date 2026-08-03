import React, { useState } from "react";
import { FaEnvelope, FaLock, FaUser, FaIdCard, FaHospital } from "react-icons/fa";
import InputComponent from "../../../components/Input";
import { useNavigate } from 'react-router-dom';
import { ProfessionalForRedux } from "../../../Types/ProfessionalForRedux";
import { useDispatch } from "react-redux";
import { createProfessionalRed } from "../../../Redux/States/professional";
import { sessionAuthenticated } from "../../../Redux/States/session";
import { ApiError, apiFetch } from '../../../api/client';
import logger, { describeError } from '../../../lib/logger';

interface FormData {
  Name: string;
  LastName: string;
  Password: string;
  Email: string;
  ConsultoryCode: string;
  Tuition: string;
}

// Mensajes por slug del ModelState del backend. El genérico "email o código" de antes
// obligaba al usuario a adivinar cuál de los dos estaba mal.
const ERROR_BY_SLUG: Record<string, string> = {
  doctor_exists: 'Ese email ya está registrado.',
  incorrect_code: 'El código del consultorio es incorrecto.',
  ambiguous_code: 'Ese código corresponde a más de un consultorio. Contactá al administrador.',
};

const RegisterForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<FormData>({
    Name: '',
    LastName: '',
    Password: '',
    Email: '',
    ConsultoryCode: '',
    Tuition: '',
  });

  const createUser = async() =>{
    try{
      // El backend identifica el consultorio verificando el código contra todos los
      // consultorios: el código solo alcanza, no hace falta elegir uno.
      const response = await apiFetch('/api/Doctor/CreateDoctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        const slug = new ApiError(response.status, body).slug;
        setErrorMessage(
          (slug && ERROR_BY_SLUG[slug]) || 'No se pudo crear el usuario. Intentá de nuevo.'
        );
        setError(true);
        throw new Error(slug ?? `HTTP ${response.status}`);
      }

      // El registro no setea cookies: iniciamos sesión con las credenciales nuevas
      // para establecer la sesión (cookies httpOnly) y obtener el AuthUserDto canónico.
      const loginRes = await apiFetch('/api/AuthService/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: formData.Email, Password: formData.Password }),
      });

      if (!loginRes.ok) {
        setErrorMessage('Usuario creado, pero falló el inicio de sesión automático. Iniciá sesión manualmente.');
        setError(true);
        throw new Error('login-after-register-failed');
      }

      const userData : ProfessionalForRedux = await loginRes.json();
      dispatch(createProfessionalRed(userData));
      dispatch(sessionAuthenticated());

      return true;
    }catch(error){
      logger.error('Error al crear el profesional', describeError(error))
      return false;
    }
  }

  const validateForm= () => {
    if(formData.ConsultoryCode === '' || formData.Email=== '' || formData.Name=== '' || formData.LastName=== '' || formData.Password=== '' || formData.Tuition=== ''){
      setErrorMessage('Todos los campos son obligatorios');
      setError(true);
      return false;
    }
    return true;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(validateForm()){
      if(await createUser()){
        navigate('/Pacientes');
      };
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError(false);
    const { id, value } = e.target;
      setFormData({ ...formData, [id]: value });
  };

  return (
      <form onSubmit={handleSubmit} className="ha-form">
        <div className="ha-form-row">
            <InputComponent
              type="text"
              id="Name"
              value={formData.Name}
              onChange={handleChange}
              placeholder="Ej: Carlos"
              label="Nombre"
              icon={<FaUser />}
            />

            <InputComponent
              type="text"
              id="LastName"
              value={formData.LastName}
              onChange={handleChange}
              placeholder="Ej: Rodríguez"
              label="Apellido"
              icon={<FaUser />}
            />
        </div>

          <InputComponent
             type="email"
             id="Email"
             value={formData.Email}
             onChange={handleChange}
             placeholder="doctor@clinica.com"
             label="Correo Electrónico"
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

        <div className="ha-form-row">
          <InputComponent
            type="text"
            id="Tuition"
            value={formData.Tuition}
            onChange={handleChange}
            placeholder="123456"
            label="Nro. Matrícula"
            icon={<FaIdCard />}
          />

          <InputComponent
              type="text"
              id="ConsultoryCode"
              value={formData.ConsultoryCode}
              onChange={handleChange}
              placeholder="CLIN-99"
              label="Código del Consultorio"
              icon={<FaHospital />}
            />
        </div>

            {error && <div className="alert alert-danger" role="alert">
                  {errorMessage}
                </div>}

        <button className="btn btn-primary w-100 mt-2" type="submit">Registrarse</button>
      </form>
  );
};

export default RegisterForm;
