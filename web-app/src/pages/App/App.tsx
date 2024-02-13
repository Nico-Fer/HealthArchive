import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "../Login/Login";
import Register from "../Register/Register";
import Pacients from "../Pacients";
import Profesional from "../Profesional";

import "./App.scss";
import Proffesionals from "../Professionals";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Pacientes" element={<Pacients />} />
        <Route path="/Profesionales" element={<Proffesionals />} />
        <Route path="/Profesional" element={<Profesional />} />
      </Routes>
    </Router>
  );
};

export default App;