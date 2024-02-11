import React, { useState } from "react";

import InputComponent from "../../Login/Components/Input/InputComponent";

const RegisterForm = () =>{

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
      };
    
      const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
      };
    
      const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {};

      return(<div className="container w-100">
        <form onSubmit={handleSubmit} className="d-flex flex-column align-items-center">
          <InputComponent
            type="text" 
            id="user"
            value={password}
            onChange={handlePasswordChange}
            placeholder="UserName"
          />
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
          <button className="btn btn-primary  rounded w-100 mb-2 mt-2" style={{backgroundColor: '#004EB8', color:'white', height:'50px'}} type="submit">Register</button>
        </form>
      </div>
      );
}

export default RegisterForm;