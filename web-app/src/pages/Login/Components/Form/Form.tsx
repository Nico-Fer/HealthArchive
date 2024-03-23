import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Form.scss";

import InputComponent from "../Input/InputComponent";
import { useDispatch } from "react-redux";
import { createProfessionalRed } from "../../../../Redux/States/professional";

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
        const response = await fetch("http://192.168.0.122:44392/api/AuthService/Login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );
  
        if (!response.ok) {
          const errorMsg = 'Email o contraseña incorrectos'
          setErrorMessage('Email o contraseña incorrectos');
          setError(true);
          throw new Error(errorMsg);
        }
  
        const userData = await response.json();

        dispatch(createProfessionalRed(userData));

        return true;
      } catch (error) {
        console.error("Error al iniciar sesión:", error);
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
        <div className="container w-100">
        <form onSubmit={handleSubmit} className="d-flex flex-column align-items-center">
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
          {error && <div className="alert alert-danger p-1">
                  {errorMessage}
                </div>}
          <button className="btn btn-primary  rounded w-100 mb-2 mt-2" style={{backgroundColor: '#004EB8', color:'white', height:'50px'}} type="submit">Iniciar Sesion</button>
        </form>
      </div>
    );
};

export default Form;