import React, { useState } from "react";
import InputComponent from "../../Login/Components/Input/InputComponent";
import { Phone } from "../../../Types/Phone";
import { useNavigate } from 'react-router-dom';
import { ProfessionalForRedux } from "../../../Types/ProfessionalForRedux";
import { useDispatch } from "react-redux";
import { createProfessionalRed } from "../../../Redux/States/professional";

interface FormData {
  Name: string;
  LastName: string;
  PhoneNumber: Phone;
  Password: string;
  Email: string;
  ConsultoryCode: string;
  Tuition: string;
}

const RegisterForm = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState<FormData>({
    Name: '',
    LastName: '',
    PhoneNumber: { CountryCode: '+54', PhoneNumber: '' },
    Password: '',
    Email: '',
    ConsultoryCode: '',
    Tuition: '',
  });

  const createProfessional = (data : any) : ProfessionalForRedux => {
    const p : ProfessionalForRedux = {
      name: data.name,
      lastName: data.lastName,
      email: data.email,
      tuition: data.tuition,
    }

    return p;
  }

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

      const data = await response.json();
      const professional = createProfessional(data);
      dispatch(createProfessionalRed(professional));

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

          <InputComponent
            type="text" 
            id="Tuition"
            value={formData.Tuition}
            onChange={handleChange}
            placeholder="Nro. Matricula"
          />
        
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
