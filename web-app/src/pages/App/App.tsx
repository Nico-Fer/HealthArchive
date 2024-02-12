import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "../Login/Login";
import Register from "../Register/Register";
import Patients from "../Pacients";
import NavBar from "./NavBar/NavBar";

import "./App.scss";
import Proffesionals from "../Professionals";

const App = () => {
  return (
    <div>
      <Router>
          <NavBar />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/Register" element={<Register />} />
            <Route path="/Pacientes" element={<Patients />} />
            <Route path="/Profesionales" element={<Proffesionals />} />
          </Routes>
      </Router>
    </div>
  );
};

export default App;