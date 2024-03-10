import React, { useState } from "react";
import InputComponent from "../../Login/Components/Input/InputComponent";
import { Phone } from "../../../Types/Phone";
import { useNavigate } from 'react-router-dom';

interface FormData {
  Name: string;
  LastName: string;
  PhoneNumber: Phone;
  Password: string;
  Email: string;
  ConsultoryCode: string;
}

const RegisterForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    Name: '',
    LastName: '',
    PhoneNumber: { CountryCode: '+54', PhoneNumber: '' },
    Password: '',
    Email: '',
    ConsultoryCode: '',
  });

  const createUser = async() =>{
    try{
      const response = await fetch( `https://localhost:44393/api/Doctor/CreateDoctor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return true;
    }catch(error){
      console.error('Error al crear el profesional:', error)
      return false;
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(await createUser()){
      navigate('/Pacientes');
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if(id === "PhoneNumber.PhoneNumber") {
      setFormData({
        ...formData,
        PhoneNumber: { ...formData.PhoneNumber, PhoneNumber: value }
      });
    } else {
      setFormData({ ...formData, [id]: value });
    }
  };

  return (
    <div className="container w-100">
      <form onSubmit={handleSubmit} className="d-flex flex-column align-items-center">
            <InputComponent
              type="text" 
              id="Name"
              value={formData.Name}
              onChange={handleChange}
              placeholder="Nombre"
            />

            <InputComponent
              type="text" 
              id="LastName"
              value={formData.LastName}
              onChange={handleChange}
              placeholder="Apellido"
            />

          <InputComponent
             type="text" 
             id="Email"
             value={formData.Email}
             onChange={handleChange}
             placeholder="Email"             
          />

          <InputComponent
            type="text" 
            id="Password"
            value={formData.Password}
            onChange={handleChange}
            placeholder="Contraseña"
          />

        <div className="mb-3" style={{ width: '25rem', display: 'flex' }}>
          <div className="input-group">
            <span className="input-group-text" id="basic-addon1" style={{ height: '50px', border: '1px solid #EAEAEA' }}>
              {formData.PhoneNumber.CountryCode}
            </span>
            <input
              className="form-control rounded shadow"
              type="tel"
              id="PhoneNumber.PhoneNumber"
              value={formData.PhoneNumber.PhoneNumber}
              onChange={handleChange}
              style={{ border: '1px solid #EAEAEA', height: '50px' }}
              placeholder="Teléfono"
            />
          </div>
        </div>
        
        <InputComponent
            type="text" 
            id="ConsultoryCode"
            value={formData.ConsultoryCode}
            onChange={handleChange}
            placeholder="Codigo del Consultorio"
          />

        <button className="btn btn-primary rounded w-100 mb-2 mt-2" style={{ backgroundColor: '#004EB8', color: 'white', height: '50px' }} type="submit">Registrarse</button>
      </form>
    </div>
  );
};

export default RegisterForm;
