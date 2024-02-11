import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Form.scss";

import InputComponent from "../Input/InputComponent";

const Form = () => {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
      };
    
      const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
      };
    
      const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
          const response = await fetch(
            "http://localhost:5189/api/AuthService/Login",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, password }),
            }
          );
    
          if (!response.ok) {
            throw new Error("Sign In Error");
          }
    
          const userData = await response.json();
    
          localStorage.setItem("userData", JSON.stringify(userData));
          navigate("/homePage");
    
          console.log("Respuesta de la API:", userData);
        } catch (error) {
          console.error("Error al iniciar sesión:", error);
        }
      };

    return(
        <div className="container w-100">
        <form onSubmit={handleSubmit} className="d-flex flex-column align-items-center">
          <InputComponent
             type="text" 
             id="email"
             value={email}
             onChange={handleUsernameChange}
             placeholder="Email"             
          />
          <InputComponent
            type="text" 
            id="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Password"
          />
          <button className="btn btn-primary  rounded w-100 mb-2 mt-2" style={{backgroundColor: '#004EB8', color:'white', height:'50px'}} type="submit">Log in</button>
        </form>
      </div>
    );
};

export default Form;