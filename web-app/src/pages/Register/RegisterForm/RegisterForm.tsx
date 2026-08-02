import React, { useEffect, useState } from "react";
import { FaEnvelope, FaLock, FaUser, FaIdCard, FaHospital } from "react-icons/fa";
import InputComponent from "../../../components/Input";
import { Phone } from "../../../Types/Phone";
import { useNavigate } from 'react-router-dom';
import { ProfessionalForRedux } from "../../../Types/ProfessionalForRedux";
import { useDispatch } from "react-redux";
import { createProfessionalRed } from "../../../Redux/States/professional";
import { apiFetch, apiGet } from '../../../api/client';

interface FormData {
  Name: string;
  LastName: string;
  Password: string;
  Email: string;
  ConsultoryCode: string;
  ConsultorioId: string;
  Tuition: string;
}

interface Consultorio {
  id: string;
  name: string;
}

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
    ConsultorioId: '',
    Tuition: '',
  });

  // El código está hasheado en la base, así que no se puede deducir a qué consultorio
  // pertenece: hay que elegirlo y el backend verifica el código contra ese.
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);

  useEffect(() => {
    apiGet<Consultorio[]>('/api/Consultorio/GetConsultorios')
      .then(setConsultorios)
      .catch(() => {
        setErrorMessage('No se pudieron cargar los consultorios. Recargá la página.');
        setError(true);
      });
  }, []);

  const createUser = async() =>{
    try{
      const response = await apiFetch('/api/Doctor/CreateDoctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorMsg = 'El email ya se encuentra registrado'
          setErrorMessage('Error al crear usuario: El email ya se encuentra registrado o el código del consultorio es incorrecto');
          setError(true);
          throw new Error(errorMsg);
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

      return true;
    }catch(error){
      console.error('Error al crear el profesional:', error)
      return false;
    }
  }

  const validateForm= () => {
    if(formData.ConsultoryCode === '' || formData.ConsultorioId === '' || formData.Email=== '' || formData.Name=== '' || formData.LastName=== '' || formData.Password=== '' || formData.Tuition=== ''){
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

        <div className="ha-form-field">
          <label htmlFor="ConsultorioId">Consultorio</label>
          <select
            className="form-select"
            id="ConsultorioId"
            value={formData.ConsultorioId}
            onChange={handleChange}
          >
            <option value="">Elegí un consultorio…</option>
            {consultorios.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

            {error && <div className="alert alert-danger" role="alert">
                  {errorMessage}
                </div>}

        <button className="btn btn-primary w-100 mt-2" type="submit">Registrarse</button>
      </form>
  );
};

export default RegisterForm;
